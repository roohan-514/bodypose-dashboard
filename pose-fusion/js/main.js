/* ─── STATE ─── */
const S = {
  mode:'dual',
  paused:false,
  fps:0, frames:0, fpsTime:0,
  camReady:false,
  poseLandmarker:null,
  webcam:document.getElementById('webcam'),
  lastVideoTime:-1,
  landmarks:[],
  peopleCount:0,
  confidence:0.3,
  videoConf:0,
  csiConf:0,
  fusedConf:0,
  crossModal:0,
  rssi:-50,
  rssiHistory:new Array(50).fill(-50),
  demoTime:0
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const D = {
  modeLabel:$('#mode-label'), promptModeLabel:$('#prompt-mode-label'),
  camPrompt:$('#camera-prompt'), startBtn:$('#start-camera-btn'),
  skeletonCanvas:$('#skeleton-canvas'), canvas:$('#webcam'),
  statusDot:$('#status-dot'), statusLabel:$('#status-label'),
  fpsDisplay:$('#fps-display'), modeSelect:$('#mode-select'),
  videoBar:$('#video-bar'), videoBarVal:$('#video-bar-val'),
  csiBar:$('#csi-bar'), csiBarVal:$('#csi-bar-val'),
  fusedBar:$('#fused-bar'), fusedBarVal:$('#fused-bar-val'),
  crossModal:$('#cross-modal-sim'),
  csiCanvas:$('#csi-canvas'), rssiBar:$('#rssi-bar'),
  rssiValue:$('#rssi-value'), rssiQuality:$('#rssi-quality'),
  rssiSparkline:$('#rssi-sparkline'),
  embeddingCanvas:$('#embedding-canvas'),
  latVideo:$('#lat-video'), latCsi:$('#lat-csi'),
  latFusion:$('#lat-fusion'), latTotal:$('#lat-total'),
  confidenceSlider:$('#confidence-slider'), confidenceValue:$('#confidence-value'),
  pauseBtn:$('#pause-btn')
};

/* ─── SKELETON RENDERING ─── */
const EDGES = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [15,17],[15,19],[15,21],[16,18],[16,20],[16,22],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[27,29],[29,31],
  [24,26],[26,28],[28,30],[30,32]
];

const EDGE_COLORS = {
  0:0x00e5ff,1:0x00e5ff,2:0x00e5ff,3:0x00e5ff,4:0x00e5ff,5:0x00e5ff,6:0x00e5ff,7:0x00e5ff,8:0x00e5ff,
  9:0xff88cc,10:0xff88cc,
  11:0x00ff88,12:0x00ff88,13:0x00ff88,14:0x00ff88,15:0x00ff88,16:0x00ff88,
  17:0xffb020,18:0xffb020,19:0xffb020,20:0xffb020,21:0xffb020,22:0xffb020,
  23:0x00e5ff,24:0x00e5ff,23:0x00e5ff,24:0x00e5ff,
  25:0x00ff88,26:0x00ff88,27:0x00ff88,28:0x00ff88,29:0x00ff88,30:0x00ff88,
  31:0xffb020,32:0xffb020
};

let skeletonCtx = null;

function initSkeletonCanvas() {
  const c = D.skeletonCanvas;
  c.width = D.skeletonCanvas.clientWidth * devicePixelRatio;
  c.height = D.skeletonCanvas.clientHeight * devicePixelRatio;
  skeletonCtx = c.getContext('2d');
}

function drawSkeleton(landmarks) {
  const ctx = skeletonCtx;
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!landmarks || landmarks.length === 0) return;

  const pad = 0.05;
  const scale = (p) => ({
    x: p.x * w,
    y: p.y * h
  });

  landmarks.forEach(pose => {
    if (!pose || pose.length < 33) return;

    // Bones
    EDGES.forEach(([a,b]) => {
      const p0 = pose[a], p1 = pose[b];
      if (!p0||!p1||(p0.visibility||1)<0.3||(p1.visibility||1)<0.3) return;
      const s0 = scale(p0), s1 = scale(p1);
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.strokeStyle = 'rgba(0,229,255,0.7)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });

    // Joints
    pose.forEach((p, i) => {
      if ((p.visibility||1) < 0.3) return;
      const s = scale(p);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI*2);
      ctx.fillStyle = i < 11 ? '#00e5ff' : i < 23 ? '#00ff88' : '#ffb020';
      ctx.fill();
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
    });
    ctx.shadowBlur = 0;
  });
}

/* ─── POSE DETECTION ─── */
async function initPose() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/'
    );
    S.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 6,
      minPoseDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    return true;
  } catch(e) { console.error('Pose init:', e); return false; }
}

async function initCamera() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video:{width:{ideal:640},height:{ideal:480},facingMode:'user'}
    });
    S.webcam.srcObject = s;
    await S.webcam.play();
    S.camReady = true;
    D.camPrompt.classList.add('hidden');
    D.statusDot.className = 'status-dot online';
    D.statusLabel.textContent = 'CAMERA LIVE';
    return true;
  } catch(e) { console.error('Camera:', e); return false; }
}

function detectPose() {
  if (!S.poseLandmarker || !S.camReady || S.webcam.readyState < 2) return;
  if (S.webcam.currentTime === S.lastVideoTime) return;
  S.lastVideoTime = S.webcam.currentTime;
  try {
    const r = S.poseLandmarker.detectForVideo(S.webcam, performance.now());
    S.landmarks = r.landmarks || [];
    S.peopleCount = S.landmarks.length;
  } catch(e) { S.landmarks = []; S.peopleCount = 0; }
}

/* ─── DEMO DATA ─── */
let demoLandmarks = [];

function generateDemo() {
  S.demoTime += 0.03;
  const count = 1;
  const poses = [];
  for (let p = 0; p < count; p++) {
    const lms = [];
    for (let i = 0; i < 33; i++) {
      const baseY = i < 11 ? 0.25 : i < 23 ? 0.5 : 0.75;
      lms.push({
        x: 0.5 + Math.sin(S.demoTime*0.6 + i*0.2 + p)*0.15,
        y: 0.8 - baseY*0.7 + Math.sin(S.demoTime*0.8 + i*0.3)*0.05,
        z: 0.5,
        visibility: 0.9
      });
    }
    poses.push(lms);
  }
  demoLandmarks = poses;
  S.peopleCount = count;
}

/* ─── CONFIDENCE & METRICS ─── */
function updateMetrics() {
  S.confidence = parseFloat(D.confidenceSlider.value);
  D.confidenceValue.textContent = S.confidence.toFixed(2);

  // Simulated metrics
  const hasPose = (S.landmarks.length > 0 || demoLandmarks.length > 0) && !S.paused;
  const lm = S.landmarks.length > 0 ? S.landmarks : demoLandmarks;

  if (hasPose && lm.length > 0) {
    if (S.mode === 'dual' || S.mode === 'video') {
      S.videoConf = Math.min(0.95, 0.5 + Math.random()*0.4 + S.peopleCount * 0.05);
    } else {
      S.videoConf = Math.max(0, S.videoConf - 0.02);
    }
    if (S.mode === 'dual' || S.mode === 'csi') {
      S.csiConf = Math.min(0.92, 0.4 + Math.random()*0.45);
    } else {
      S.csiConf = Math.max(0, S.csiConf - 0.02);
    }
    S.fusedConf = (S.videoConf + S.csiConf) / 2;
    S.crossModal = 0.7 + Math.random()*0.25;
    S.rssi = Math.min(-30, Math.max(-80, S.rssi + (Math.random()-0.5)*5));
  } else {
    S.videoConf = Math.max(0, S.videoConf - 0.01);
    S.csiConf = Math.max(0, S.csiConf - 0.01);
    S.fusedConf = Math.max(0, S.fusedConf - 0.01);
    S.crossModal = Math.max(0, S.crossModal - 0.01);
    S.rssi = Math.max(-90, S.rssi + (Math.random()-0.5)*1);
  }

  S.rssiHistory.push(S.rssi);
  if (S.rssiHistory.length > 50) S.rssiHistory.shift();

  // Display
  const vp = Math.round(S.videoConf*100);
  const cp = Math.round(S.csiConf*100);
  const fp = Math.round(S.fusedConf*100);

  D.videoBar.style.width = vp+'%';
  D.videoBarVal.textContent = vp+'%';
  D.csiBar.style.width = cp+'%';
  D.csiBarVal.textContent = cp+'%';
  D.fusedBar.style.width = fp+'%';
  D.fusedBarVal.textContent = fp+'%';
  D.crossModal.textContent = S.crossModal.toFixed(3);

  // RSSI
  const rssiNorm = Math.min(100, Math.max(0, (S.rssi + 90) / 60 * 100));
  D.rssiBar.style.width = rssiNorm+'%';
  D.rssiValue.textContent = Math.round(S.rssi)+' dBm';
  const qual = S.rssi > -50 ? 'Excellent' : S.rssi > -65 ? 'Good' : S.rssi > -75 ? 'Fair' : 'Poor';
  D.rssiQuality.textContent = qual;

  // Latency
  const lv = (12 + Math.random()*8).toFixed(1);
  const lc = (18 + Math.random()*12).toFixed(1);
  const lf = (4 + Math.random()*4).toFixed(1);
  D.latVideo.textContent = lv+'ms';
  D.latCsi.textContent = lc+'ms';
  D.latFusion.textContent = lf+'ms';
  D.latTotal.textContent = (parseFloat(lv)+parseFloat(lc)+parseFloat(lf)).toFixed(1)+'ms';
}

/* ─── CANVAS RENDERING ─── */
function drawCSIHeatmap() {
  const c = D.csiCanvas, ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  const imgData = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = (x/w + Math.sin(S.demoTime*2 + y/h*10)*0.2) * 0.5 + 0.5;
      const v = S.fusedConf * (0.3 + 0.7 * Math.sin(x*0.1 + S.demoTime*1.5) * Math.cos(y*0.15 + S.demoTime)) * t;
      const idx = (y*w + x)*4;
      if (v > 0.4) { imgData.data[idx]=0; imgData.data[idx+1]=255; imgData.data[idx+2]=136; }
      else if (v > 0.2) { imgData.data[idx]=0; imgData.data[idx+1]=229; imgData.data[idx+2]=255; }
      else if (v > 0.1) { imgData.data[idx]=255; imgData.data[idx+1]=176; imgData.data[idx+2]=32; }
      else { imgData.data[idx]=60; imgData.data[idx+1]=80; imgData.data[idx+2]=100; }
      imgData.data[idx+3]=255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function drawRSSISparkline() {
  const c = D.rssiSparkline, ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const data = S.rssiHistory;
  for (let i = 0; i < data.length; i++) {
    const x = (i/(data.length-1))*w;
    const y = h - ((data[i] + 90)/60)*h;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  }
  ctx.stroke();
}

function drawEmbedding() {
  const c = D.embeddingCanvas, ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = 'rgba(0,229,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const x = (i/10)*w, y = (i/10)*h;
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }

  // Simulated embedding points
  for (let i = 0; i < 20; i++) {
    const x = w/2 + Math.sin(S.demoTime*0.5 + i*0.8)*(w*0.35) + Math.sin(S.demoTime*1.3 + i*0.4)*10;
    const y = h/2 + Math.cos(S.demoTime*0.6 + i*0.5)*(h*0.35) + Math.cos(S.demoTime*0.9 + i*0.3)*10;
    const size = 3 + Math.sin(S.demoTime + i)*2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    const alpha = 0.3 + 0.5 * Math.sin(S.demoTime*0.7 + i*0.6);
    ctx.fillStyle = `rgba(0,229,255,${alpha})`;
    ctx.fill();
  }
}

/* ─── MODE ─── */
function setMode(mode) {
  S.mode = mode;
  const labels = { dual:'DUAL FUSION', video:'VIDEO ONLY', csi:'SIMULATED ONLY' };
  D.modeLabel.textContent = labels[mode];
  D.promptModeLabel.textContent = labels[mode];
}

/* ─── UI ─── */
function updateUI() {
  D.fpsDisplay.textContent = S.fps + ' FPS';
  if (S.landmarks.length > 0 || demoLandmarks.length > 0) {
    drawSkeleton(S.landmarks.length > 0 ? S.landmarks : demoLandmarks);
  }
  drawCSIHeatmap();
  drawRSSISparkline();
  drawEmbedding();
}

/* ─── EVENTS ─── */
D.startBtn.addEventListener('click', initCamera);
D.modeSelect.addEventListener('change', () => setMode(D.modeSelect.value));
D.confidenceSlider.addEventListener('input', () => {
  D.confidenceValue.textContent = parseFloat(D.confidenceSlider.value).toFixed(2);
});
D.pauseBtn.addEventListener('click', () => { S.paused = !S.paused; D.pauseBtn.textContent = S.paused ? '\u25B6 Resume' : '\u23F8 Pause'; });

/* ─── LOOP ─── */
function loop(time) {
  requestAnimationFrame(loop);

  S.frames++;
  if (time - S.fpsTime > 1000) { S.fps = S.frames; S.frames = 0; S.fpsTime = time; }

  if (!S.paused) {
    if (S.camReady) detectPose();
    else generateDemo();
    updateMetrics();
    updateUI();
  }
}

/* ─── INIT ─── */
async function init() {
  initSkeletonCanvas();
  setMode('dual');
  const poseOk = await initPose();
  setTimeout(() => {
    if (!S.camReady) {
      D.statusDot.className = 'status-dot offline';
      D.statusLabel.textContent = 'SIMULATED';
    }
  }, 3000);
  loop(0);
}

init();
window.addEventListener('resize', initSkeletonCanvas);
