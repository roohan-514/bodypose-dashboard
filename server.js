const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const RECORDINGS_DIR = path.join(__dirname, 'recordings');

if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

let activeRecordings = new Map();
let liveClients = new Set();
let poseHistory = [];

wss.on('connection', (ws, req) => {
  liveClients.add(ws);
  console.log(`WS client connected (${liveClients.size} total)`);

  ws.send(JSON.stringify({ type: 'connected', clientCount: liveClients.size }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handleWSMessage(ws, msg);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    liveClients.delete(ws);
    console.log(`WS client disconnected (${liveClients.size} left)`);
  });
});

function handleWSMessage(ws, msg) {
  switch (msg.type) {
    case 'pose_data':
      const frame = {
        timestamp: Date.now(),
        peopleCount: msg.peopleCount || 0,
        landmarks: msg.landmarks || [],
        vitals: msg.vitals || { hr: 0, br: 0, conf: 0 },
        scenario: msg.scenario || 'unknown',
        fallDetected: msg.fallDetected || false,
        motion: msg.motion || 0
      };
      poseHistory.push(frame);
      if (poseHistory.length > 10000) poseHistory.shift();

      if (activeRecordings.has(ws._recordingId)) {
        const rec = activeRecordings.get(ws._recordingId);
        rec.frames.push(frame);
        rec.duration = frame.timestamp - rec.startedAt;
      }

      broadcastPose(frame, ws);
      break;

    case 'start_recording':
      const recId = uuidv4();
      ws._recordingId = recId;
      activeRecordings.set(recId, {
        id: recId,
        name: msg.name || `Recording ${new Date().toLocaleString()}`,
        startedAt: Date.now(),
        duration: 0,
        frames: [],
        metadata: msg.metadata || {}
      });
      ws.send(JSON.stringify({ type: 'recording_started', id: recId }));
      console.log(`Recording started: ${recId}`);
      break;

    case 'stop_recording':
      if (ws._recordingId && activeRecordings.has(ws._recordingId)) {
        const rec = activeRecordings.get(ws._recordingId);
        rec.duration = Date.now() - rec.startedAt;
        saveRecording(rec);
        activeRecordings.delete(ws._recordingId);
        ws.send(JSON.stringify({ type: 'recording_stopped', id: rec.id, frames: rec.frames.length }));
        console.log(`Recording saved: ${rec.id} (${rec.frames.length} frames)`);
      }
      break;

    case 'get_recordings':
      listRecordings(ws);
      break;

    case 'get_pose_history':
      ws.send(JSON.stringify({ type: 'pose_history', data: poseHistory.slice(-500) }));
      break;

    case 'get_live_status':
      ws.send(JSON.stringify({
        type: 'live_status',
        clientCount: liveClients.size,
        activeRecordings: activeRecordings.size,
        historySize: poseHistory.length
      }));
      break;
  }
}

function broadcastPose(frame, sender) {
  const msg = JSON.stringify({ type: 'pose_frame', data: frame });
  liveClients.forEach(client => {
    if (client !== sender && client.readyState === 1) {
      try { client.send(msg); } catch (e) {}
    }
  });
}

function saveRecording(rec) {
  const filename = `recording-${rec.id}.json`;
  const filepath = path.join(RECORDINGS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(rec, null, 2));
}

function listRecordings(ws) {
  try {
    const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.json'));
    const recordings = files.map(f => {
      const filepath = path.join(RECORDINGS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return {
          id: data.id,
          name: data.name,
          startedAt: data.startedAt,
          duration: data.duration,
          frameCount: data.frames ? data.frames.length : 0,
          metadata: data.metadata || {}
        };
      } catch { return null; }
    }).filter(Boolean);
    ws.send(JSON.stringify({ type: 'recordings_list', recordings }));
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to list recordings' }));
  }
}

app.get('/api/status', (req, res) => {
  res.json({
    uptime: process.uptime(),
    clients: liveClients.size,
    recordings: activeRecordings.size,
    historySize: poseHistory.length,
    version: '2.0.0'
  });
});

app.get('/api/pose-history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 5000);
  res.json({ frames: poseHistory.slice(-limit) });
});

app.get('/api/recordings', (req, res) => {
  try {
    const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.json'));
    const recordings = files.map(f => {
      const fp = path.join(RECORDINGS_DIR, f);
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      return {
        id: data.id,
        name: data.name,
        startedAt: data.startedAt,
        duration: data.duration,
        frameCount: data.frames ? data.frames.length : 0,
        fileSize: fs.statSync(fp).size
      };
    }).sort((a, b) => b.startedAt - a.startedAt);
    res.json({ recordings });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

app.get('/api/recordings/:id', (req, res) => {
  const filepath = path.join(RECORDINGS_DIR, `recording-${req.params.id}.json`);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Recording not found' });
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  res.json(data);
});

app.delete('/api/recordings/:id', (req, res) => {
  const filepath = path.join(RECORDINGS_DIR, `recording-${req.params.id}.json`);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Recording not found' });
  fs.unlinkSync(filepath);
  res.json({ success: true });
});

app.get('/api/export/:id/:format', (req, res) => {
  const filepath = path.join(RECORDINGS_DIR, `recording-${req.params.id}.json`);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Recording not found' });
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

  if (req.params.format === 'csv') {
    let csv = 'timestamp,peopleCount,hr,br,confidence,fallDetected,motion,landmarkCount\n';
    data.frames.forEach(f => {
      csv += `${f.timestamp},${f.peopleCount},${f.vitals.hr},${f.vitals.br},${f.vitals.conf},${f.fallDetected},${f.motion},${f.landmarks.length}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${data.name || 'pose-data'}.csv"`);
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${data.name || 'pose-data'}.json"`);
    res.json(data);
  }
});

app.post('/api/pose-data', (req, res) => {
  const frame = { timestamp: Date.now(), ...req.body };
  poseHistory.push(frame);
  if (poseHistory.length > 10000) poseHistory.shift();
  const msg = JSON.stringify({ type: 'pose_frame', data: frame });
  liveClients.forEach(client => {
    if (client.readyState === 1) { try { client.send(msg); } catch {} }
  });
  res.json({ success: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  π BodyPose Observatory v2.0.0`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Server:     http://localhost:${PORT}`);
  console.log(`  WebSocket:  ws://localhost:${PORT}`);
  console.log(`  API:        http://localhost:${PORT}/api/status`);
  console.log(`  Recordings: ${RECORDINGS_DIR}\n`);
});
