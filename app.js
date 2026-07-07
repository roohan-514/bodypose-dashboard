/* ============================================================
   BodyPose Observatory — Main Application
   ============================================================ */

// ─── CONFIGURATION ────────────────────────────────────────────
const POSE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [15,17],[15,19],[15,21],[16,18],[16,20],[16,22],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[27,29],[29,31],
  [24,26],[26,28],[28,30],[30,32]
];

const SCENARIOS = [
  { id:'idle', label:'Auto-Cycle' },
  { id:'empty', label:'Empty Room' },
  { id:'vitals', label:'Vital Signs' },
  { id:'multiperson', label:'Multi-Person' },
  { id:'falldetect', label:'Fall Detect' },
  { id:'sleep', label:'Sleep Monitor' },
  { id:'intrusion', label:'Intrusion' },
  { id:'gesture', label:'Gesture Ctrl' },
  { id:'crowd', label:'Crowd (4 ppl)' },
  { id:'fitness', label:'Fitness' },
  { id:'security', label:'Security Patrol' }
];

const STYLE_PRESETS = {
  default:{ bg:0x0a0a0f, bone:0x00d4ff, joint:0x00ffaa, glow:0.6, bloom:0.8, exposure:0.9 },
  cinematic:{ bg:0x08080a, bone:0xff6644, joint:0xffaa44, glow:0.4, bloom:1.2, exposure:0.7 },
  minimal:{ bg:0x111115, bone:0x40e0d0, joint:0x80f0e8, glow:0.3, bloom:0.2, exposure:1.0 },
  neon:{ bg:0x05000a, bone:0xff00ff, joint:0x00ffff, glow:1.2, bloom:1.5, exposure:0.8 },
  tactical:{ bg:0x0a0a05, bone:0x44ff44, joint:0x88ff44, glow:0.5, bloom:0.4, exposure:0.85 },
  medical:{ bg:0x000810, bone:0x00ff88, joint:0x00ffcc, glow:0.7, bloom:0.6, exposure:0.9 }
};

// ─── STATE ────────────────────────────────────────────────────
const state = {
  mode:'idle',
  peopleCount:0,
  poses:[],           // array of landmarks arrays
  confidence:0,
  heartRate:72,
  respiration:16,
  fallDetected:false,
  isPresent:false,
  autoCycleTimer:0,
  autoCycleIndex:0,
  fps:0,
  frameCount:0,
  fpsTimer:0,
  settingsOpen:false,
  demoMode:false,
  demoPose:null
};

// ─── DOM REFS ─────────────────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const dom = {
  viewport:$('#viewport'),
  loading:$('#loadingOverlay'),
  fps:$('#fpsDisplay'),
  peopleCount:$('#peopleCount'),
  heartRate:$('#heartRate'),
  respiration:$('#respiration'),
  confidence:$('#confidence'),
  statusText:$('#statusText'),
  fallAlert:$('#fallAlert'),
  modeLabel:$('#modeLabel'),
  webcam:$('#webcam'),
  // settings
  settingsOverlay:$('#settingsOverlay'),
  btnSettings:$('#btnSettings'),
  closeSettings:$('#closeSettings'),
  chkWireframe:$('#chkWireframe'),
  chkGrid:$('#chkGrid'),
  chkRoom:$('#chkRoom'),
  chkData:$('#chkData'),
  bloomStrength:$('#bloomStrength'),
  exposure:$('#exposure'),
  boneThickness:$('#boneThickness'),
  glowIntensity:$('#glowIntensity'),
  fov:$('#fov'),
  orbitSpeed:$('#orbitSpeed'),
  stylePreset:$('#stylePreset'),
  dataSource:$('#dataSource'),
  resetCamera:$('#resetCamera'),
  resetDefaults:$('#resetDefaults')
};

// ─── THREE.JS SETUP ──────────────────────────────────────────
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(STYLE_PRESETS.default.bg);

const camera = new THREE.PerspectiveCamera(50, dom.viewport.clientWidth / dom.viewport.clientHeight, 0.1, 100);
camera.position.set(3, 2, 5);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(dom.viewport.clientWidth, dom.viewport.clientHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = STYLE_PRESETS.default.exposure;
dom.viewport.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(dom.viewport.clientWidth, dom.viewport.clientHeight),
  STYLE_PRESETS.default.bloom, 0.5, 0.25
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI / 2.1;
controls.rotateSpeed = 0.3;

// ─── SCENE OBJECTS ────────────────────────────────────────────
let skeletonGroups = [];
let roomGroup = new THREE.Group();
let gridHelper = null;

function buildRoom() {
  if (roomGroup) { scene.remove(roomGroup); roomGroup = new THREE.Group(); }

  const wallMat = new THREE.MeshBasicMaterial({ color:0x1a2a3a, transparent:true, opacity:0.08, side:THREE.DoubleSide, wireframe:false });
  const floorMat = new THREE.MeshBasicMaterial({ color:0x0a1a2a, transparent:true, opacity:0.15, side:THREE.DoubleSide });

  const d = [0,0,0];
  const hw = 3, hh = 1.8, hd = 3;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(hw*2, hd*2), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(0, 0, 0);
  roomGroup.add(floor);

  // Walls (wireframe edges for cleaner look)
  const edgeMat = new THREE.LineBasicMaterial({ color:0x2a4a6a, transparent:true, opacity:0.25 });
  const corners = [
    [-hw,0,-hd], [ hw,0,-hd], [ hw,0, hd], [-hw,0, hd],
    [-hw,hh*2,-hd], [ hw,hh*2,-hd], [ hw,hh*2, hd], [-hw,hh*2, hd]
  ];
  const edges = [
    [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7]
  ];
  const geo = new THREE.BufferGeometry();
  const pts = [];
  edges.forEach(([a,b]) => { pts.push(...corners[a], ...corners[b]); });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  roomGroup.add(new THREE.Line(geo, edgeMat));

  scene.add(roomGroup);
}

function buildGrid() {
  if (gridHelper) scene.remove(gridHelper);
  gridHelper = new THREE.GridHelper(8, 16, 0x1a3a5a, 0x0a1a2a);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

buildRoom();
buildGrid();

// Lighting
const ambient = new THREE.AmbientLight(0x446688, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0x88bbff, 1.2);
dirLight.position.set(5, 8, 5);
scene.add(dirLight);
const dirLight2 = new THREE.DirectionalLight(0x4488cc, 0.4);
dirLight2.position.set(-3, 4, -3);
scene.add(dirLight2);

// ─── SKELETON RENDERING ──────────────────────────────────────
function createSkeleton() {
  const group = new THREE.Group();

  const boneMat = new THREE.MeshBasicMaterial({ color:STYLE_PRESETS.default.bone, transparent:true, opacity:0.9 });
  const jointMat = new THREE.MeshBasicMaterial({ color:STYLE_PRESETS.default.joint, transparent:true, opacity:0.9 });
  const glowMat = new THREE.MeshBasicMaterial({ color:STYLE_PRESETS.default.bone, transparent:true, opacity:0.15 });

  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), boneMat);
  bone.frustumCulled = false;

  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), jointMat);
  joint.frustumCulled = false;

  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), glowMat);
  glow.frustumCulled = false;

  group.userData = { boneMat, jointMat, glowMat, bone, joint, glow, bones:[], joints:[], glows:[] };
  return group;
}

function updateSkeleton(group, landmarks, thickness) {
  const { bone, joint, glow, boneMat, jointMat, glowMat } = group.userData;

  // Remove old meshes
  while (group.children.length) group.remove(group.children[0]);
  group.userData.bones = [];
  group.userData.joints = [];
  group.userData.glows = [];

  if (!landmarks) return;

  const t = thickness * 0.01;
  const positions = landmarks.map(l => new THREE.Vector3(
    (l.x - 0.5) * 4,
    l.y * 3.2,
    -(l.z - 0.5) * 4
  ));

  // Joints
  positions.forEach((pos, i) => {
    const j = joint.clone();
    j.position.copy(pos);
    j.scale.setScalar(1 + landmarks[i].z * 0.3);
    group.add(j);
    group.userData.joints.push(j);

    const g = glow.clone();
    g.position.copy(pos);
    group.add(g);
    group.userData.glows.push(g);
  });

  // Bones
  POSE_CONNECTIONS.forEach(([a,b]) => {
    if (!positions[a] || !positions[b]) return;
    const start = positions[a];
    const end = positions[b];
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    if (len < 0.001) return;
    dir.normalize();

    const bMesh = bone.clone();
    bMesh.position.copy(mid);
    bMesh.scale.set(1, len, 1);
    bMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    group.add(bMesh);
    group.userData.bones.push(bMesh);
  });
}

function updateSkeletonColors(group, preset) {
  const s = STYLE_PRESETS[preset] || STYLE_PRESETS.default;
  group.userData.boneMat.color.setHex(s.bone);
  group.userData.jointMat.color.setHex(s.joint);
  group.userData.glowMat.color.setHex(s.bone);

  group.children.forEach(child => {
    if (child.type === 'Line' || child.isLine) return;
    if (child.material) {
      if (group.userData.glows.includes(child)) {
        child.material.color.setHex(s.bone);
      }
    }
  });
}

function clearSkeletons() {
  skeletonGroups.forEach(g => scene.remove(g));
  skeletonGroups = [];
}

// ─── POSE DETECTION ──────────────────────────────────────────
let poseLandmarker = null;
let videoReady = false;
let lastVideoTime = -1;

async function initPoseDetector() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/'
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
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
  } catch (e) {
    console.error('PoseLandmarker init failed:', e);
    return false;
  }
}

async function initWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    });
    dom.webcam.srcObject = stream;
    await dom.webcam.play();
    videoReady = true;
    dom.loading.querySelector('p').textContent = 'Loading pose model…';
    return true;
  } catch (e) {
    console.error('Webcam error:', e);
    dom.loading.querySelector('p').textContent = 'Camera access denied. Enable camera permission and reload.';
    dom.loading.querySelector('p').style.color = '#ff6644';
    return false;
  }
}

let detectedPoses = [];

function detectPose() {
  if (!poseLandmarker || !videoReady || dom.webcam.readyState < 2) return;

  if (dom.webcam.currentTime === lastVideoTime) return;
  lastVideoTime = dom.webcam.currentTime;

  if (state.demoMode) {
    generateDemoPose();
    return;
  }

  const result = poseLandmarker.detectForVideo(dom.webcam, performance.now());
  detectedPoses = result.landmarks || [];
  state.poses = detectedPoses;
  state.peopleCount = detectedPoses.length;
  state.isPresent = detectedPoses.length > 0;

  if (detectedPoses.length > 0) {
    let totalConf = 0;
    detectedPoses.forEach(p => {
      p.forEach(l => { totalConf += l.visibility || 0; });
    });
    state.confidence = Math.round((totalConf / (detectedPoses.length * 33)) * 100);
  } else {
    state.confidence = 0;
  }
}

// ─── DEMO MODE ───────────────────────────────────────────────
let demoTime = 0;
function generateDemoPose() {
  demoTime += 0.03;
  const personCount = state.mode === 'crowd' ? 4 :
    state.mode === 'empty' ? 0 :
    state.mode === 'multiperson' ? 3 : 1;

  const poses = [];
  for (let p = 0; p < personCount; p++) {
    const offsetX = (p - (personCount-1)/2) * 1.2;
    const offsetZ = Math.sin(demoTime * 0.5 + p) * 0.3;
    const landmarks = [];
    for (let i = 0; i < 33; i++) {
      const baseY = i < 11 ? 1.6 : i < 23 ? 1.2 : 0.6;
      const wave = Math.sin(demoTime * 1.5 + i * 0.5 + p) * 0.2;
      landmarks.push({
        x: 0.5 + offsetX * 0.1 + Math.sin(demoTime + i) * 0.02,
        y: baseY + wave * 0.05,
        z: 0.5 + offsetZ,
        visibility: 0.9 + Math.random() * 0.1
      });
    }
    poses.push(landmarks);
  }
  state.poses = poses;
  state.peopleCount = personCount;
  state.isPresent = personCount > 0;
  state.confidence = Math.round(85 + Math.random() * 10);
  detectedPoses = poses;
}

// ─── VITAL SIGNS ─────────────────────────────────────────────
function updateVitals() {
  if (state.isPresent) {
    const targetHR = 65 + Math.random() * 20;
    const targetRR = 14 + Math.random() * 6;
    state.heartRate += (targetHR - state.heartRate) * 0.05;
    state.respiration += (targetRR - state.respiration) * 0.05;
  } else {
    state.heartRate += (0 - state.heartRate) * 0.02;
    state.respiration += (0 - state.respiration) * 0.02;
  }

  // Fall detection
  if (state.fallDetected) {
    state.heartRate = Math.max(40, state.heartRate - 0.5);
    state.respiration = Math.max(6, state.respiration - 0.2);
  }

  dom.heartRate.textContent = Math.round(state.heartRate) + ' BPM';
  dom.respiration.textContent = Math.round(state.respiration) + ' RPM';
  dom.confidence.textContent = state.confidence + '%';

  const statusEl = dom.statusText;
  if (state.fallDetected) {
    statusEl.textContent = 'FALL DETECTED';
    statusEl.className = 'vital-value fall';
  } else if (state.isPresent) {
    statusEl.textContent = 'PRESENT';
    statusEl.className = 'vital-value present';
  } else {
    statusEl.textContent = 'ABSENT';
    statusEl.className = 'vital-value';
  }
}

// ─── FALL DETECTION ──────────────────────────────────────────
function checkFall(landmarks) {
  if (!landmarks || landmarks.length === 0) { state.fallDetected = false; return; }
  for (const pose of landmarks) {
    if (pose.length < 25) continue;
    const hipL = pose[23], hipR = pose[24];
    const nose = pose[0];
    if (!hipL || !hipR || !nose) continue;
    const hipY = (hipL.y + hipR.y) / 2;
    const noseY = nose.y;
    const height = Math.abs(noseY - hipY);
    // If nose is low relative to hips and person is near floor
    if (height < 0.15 && hipY > 0.65) {
      state.fallDetected = true;
      return;
    }
  }
  state.fallDetected = false;
}

// ─── UI UPDATES ──────────────────────────────────────────────
function updateUI() {
  dom.peopleCount.textContent = '\u{1F465} ' + state.peopleCount;
  dom.fallAlert.classList.toggle('hidden', !state.fallDetected);
}

// ─── SCENARIO MANAGEMENT ─────────────────────────────────────
function setScenario(modeId) {
  state.mode = modeId;
  const label = SCENARIOS.find(s => s.id === modeId)?.label || modeId;
  dom.modeLabel.textContent = `Scenario: ${label}`;
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === modeId);
  });
}

// ─── SETTINGS ────────────────────────────────────────────────
function applySettings() {
  const preset = dom.stylePreset.value;
  const p = STYLE_PRESETS[preset] || STYLE_PRESETS.default;

  scene.background = new THREE.Color(p.bg);
  bloomPass.strength = dom.bloomStrength.valueAsNumber;
  renderer.toneMappingExposure = dom.exposure.valueAsNumber;
  controls.rotateSpeed = dom.orbitSpeed.valueAsNumber;
  camera.fov = dom.fov.valueAsNumber;
  camera.updateProjectionMatrix();

  skeletonGroups.forEach(g => updateSkeletonColors(g, preset));

  if (roomGroup) roomGroup.visible = dom.chkRoom.checked;
  if (gridHelper) gridHelper.visible = dom.chkGrid.checked;
}

function resetCameraView() {
  camera.position.set(3, 2, 5);
  controls.target.set(0, 1.2, 0);
  controls.update();
}

function resetDefaults() {
  dom.chkWireframe.checked = false;
  dom.chkGrid.checked = true;
  dom.chkRoom.checked = true;
  dom.chkData.checked = true;
  dom.bloomStrength.value = '0.8';
  dom.exposure.value = '0.9';
  dom.boneThickness.value = '3';
  dom.glowIntensity.value = '0.6';
  dom.fov.value = '50';
  dom.orbitSpeed.value = '0.3';
  dom.stylePreset.value = 'default';
  dom.dataSource.value = 'camera';
  state.demoMode = false;
  applySettings();
}

// ─── EVENT BINDING ───────────────────────────────────────────
function bindEvents() {
  // Scenario buttons
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setScenario(btn.dataset.mode);
      // Reset auto-cycle when manually selecting
      state.autoCycleIndex = SCENARIOS.findIndex(s => s.id === btn.dataset.mode);
      state.autoCycleTimer = 0;
    });
  });

  // Settings
  dom.btnSettings.addEventListener('click', () => {
    dom.settingsOverlay.classList.remove('hidden');
  });
  dom.closeSettings.addEventListener('click', () => {
    dom.settingsOverlay.classList.add('hidden');
    applySettings();
  });
  dom.settingsOverlay.addEventListener('click', (e) => {
    if (e.target === dom.settingsOverlay) {
      dom.settingsOverlay.classList.add('hidden');
      applySettings();
    }
  });

  // Live settings apply
  [dom.bloomStrength, dom.exposure, dom.boneThickness, dom.glowIntensity,
   dom.fov, dom.orbitSpeed, dom.chkWireframe, dom.chkGrid, dom.chkRoom,
   dom.chkData, dom.stylePreset].forEach(el => {
    el.addEventListener('input', applySettings);
  });

  dom.dataSource.addEventListener('change', () => {
    state.demoMode = dom.dataSource.value === 'demo';
  });

  dom.resetCamera.addEventListener('click', resetCameraView);
  dom.resetDefaults.addEventListener('click', resetDefaults);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') {
      dom.settingsOverlay.classList.toggle('hidden');
    }
    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
    }
    if (e.key === 'f' || e.key === 'F') {
      const idx = (state.autoCycleIndex + 1) % SCENARIOS.length;
      setScenario(SCENARIOS[idx].id);
      state.autoCycleIndex = idx;
    }
  });

  // Resize
  window.addEventListener('resize', () => {
    const w = dom.viewport.clientWidth, h = dom.viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });
}

// ─── MAIN LOOP ───────────────────────────────────────────────
function animate(time) {
  requestAnimationFrame(animate);

  // FPS
  state.frameCount++;
  if (time - state.fpsTimer > 1000) {
    state.fps = state.frameCount;
    state.frameCount = 0;
    state.fpsTimer = time;
    dom.fps.textContent = state.fps + ' FPS';
  }

  // Detect pose
  detectPose();

  // Fall detection
  checkFall(detectedPoses);

  // Update vitals
  updateVitals();

  // Update UI
  updateUI();

  // Auto-cycle
  if (state.mode === 'idle') {
    state.autoCycleTimer += 16;
    if (state.autoCycleTimer > 30000) {
      state.autoCycleTimer = 0;
      state.autoCycleIndex = (state.autoCycleIndex + 1) % SCENARIOS.length;
      setScenario(SCENARIOS[state.autoCycleIndex].id);
    }
  }

  // 3D visualization
  clearSkeletons();
  const thickness = dom.boneThickness.valueAsNumber || 3;

  if (state.poses.length > 0) {
    state.poses.forEach(landmarks => {
      const group = createSkeleton();
      updateSkeleton(group, landmarks, thickness);
      const preset = dom.stylePreset.value;
      updateSkeletonColors(group, preset);
      scene.add(group);
      skeletonGroups.push(group);

      // Wireframe
      if (dom.chkWireframe && dom.chkWireframe.checked) {
        group.userData.boneMat.wireframe = true;
      }
    });
  }

  // Fog based on presence
  scene.fog = state.isPresent
    ? new THREE.Fog(0x0a0a0f, 8, 18)
    : new THREE.Fog(0x0a0a0f, 4, 12);

  // Render
  controls.update();
  composer.render();
}

// ─── INIT ─────────────────────────────────────────────────────
async function init() {
  bindEvents();

  const webcamOk = await initWebcam();
  const poseOk = await initPoseDetector();

  if (!poseOk && !webcamOk) {
    // Fall back to demo mode
    state.demoMode = true;
    dom.dataSource.value = 'demo';
    dom.loading.querySelector('p').textContent = 'Using demo mode — enable camera for live capture.';
    dom.loading.querySelector('p').style.color = '#ffaa44';
    setTimeout(() => dom.loading.classList.add('hidden'), 2000);
    animate(0);
    return;
  }

  if (webcamOk && poseOk) {
    dom.loading.classList.add('hidden');
    animate(0);
  } else if (webcamOk && !poseOk) {
    dom.loading.querySelector('p').textContent = 'Pose model failed, using demo mode.';
    dom.loading.style.background = 'rgba(10,10,20,0.85)';
    state.demoMode = true;
    dom.dataSource.value = 'demo';
    setTimeout(() => dom.loading.classList.add('hidden'), 2000);
    animate(0);
  }
}

init();
