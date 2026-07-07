/* ============================================================
   BodyPose Observatory — Main Application Module
   Visual features: WiFi waves, signal field, body mist, trails
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* ─── SHADERS ─────────────────────────────────────────────── */
const VignetteShader = {
  uniforms:{tDiffuse:{value:null},offset:{value:0.5},darkness:{value:0.5}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}`,
  fragmentShader:`uniform float offset;uniform float darkness;varying vec2 vUv;void main(){vec4 t=texture2D(tDiffuse,vUv);vec2 uv=(vUv-vec2(0.5))*vec2(offset);gl_FragColor=vec4(mix(t.rgb,vec3(1.0-darkness),dot(uv,uv)),t.a);}`
};
const GrainShader = {
  uniforms:{tDiffuse:{value:null},intensity:{value:0.03},seed:{value:0}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}`,
  fragmentShader:`uniform float intensity;uniform float seed;varying vec2 vUv;float r(vec2 n){return fract(sin(dot(n,vec2(12.9898,78.233)))*43758.5453);}void main(){vec4 c=texture2D(tDiffuse,vUv);float g=r(vUv+seed)*intensity;gl_FragColor=vec4(c.rgb+g,c.a);}`
};
const ChromaticShader = {
  uniforms:{tDiffuse:{value:null},amount:{value:0.0015}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}`,
  fragmentShader:`uniform float amount;varying vec2 vUv;void main(){vec2 o=amount*vec2(1,0);float r=texture2D(tDiffuse,vUv+o).r;float g=texture2D(tDiffuse,vUv).g;float b=texture2D(tDiffuse,vUv-o).b;gl_FragColor=vec4(r,g,b,1);}`
};

/* ─── CONSTANTS ───────────────────────────────────────────── */
const SKELETON_EDGES = [
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [15,17],[15,19],[15,21],[16,18],[16,20],[16,22],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[27,29],[29,31],
  [24,26],[26,28],[28,30],[30,32]
];

const SCENARIO_INFO = {
  auto:{label:'Auto-Cycle',desc:'Cycling through all scenarios',people:1},
  empty_room:{label:'Empty Room',desc:'No persons detected',people:0},
  single_breathing:{label:'Vital Signs',desc:'Breathing pattern',people:1},
  two_walking:{label:'Multi-Person',desc:'Two persons walking',people:2},
  fall_event:{label:'Fall Detect',desc:'Fall event monitoring',people:1},
  sleep_monitoring:{label:'Sleep Monitor',desc:'Apnea tracking',people:1},
  intrusion_detect:{label:'Intrusion',desc:'Unauthorized presence',people:1},
  gesture_control:{label:'Gesture Ctrl',desc:'Gesture recognition',people:1},
  crowd_occupancy:{label:'Crowd (4 ppl)',desc:'Occupancy counting',people:4},
  search_rescue:{label:'Search Rescue',desc:'Through-wall detection',people:1},
  elderly_care:{label:'Elderly Care',desc:'Gait analysis',people:1},
  fitness_tracking:{label:'Fitness',desc:'Exercise tracking',people:1},
  security_patrol:{label:'Security Patrol',desc:'Perimeter monitoring',people:1}
};
const SCENARIO_KEYS = Object.keys(SCENARIO_INFO);

const PRESETS = {
  custom:{bg:0x080c14,bone:'#00d4ff',joint:'#00ffaa',bloom:1.0,exp:0.9},
  foundation:{bg:0x080c14,bone:'#00d878',joint:'#ff4060',bloom:1.0,exp:0.9},
  cinematic:{bg:0x08080a,bone:'#ff6644',joint:'#ffaa44',bloom:1.2,exp:0.7},
  minimal:{bg:0x111115,bone:'#40e0d0',joint:'#80f0e8',bloom:0.2,exp:1.0},
  neon:{bg:0x05000a,bone:'#ff00ff',joint:'#00ffff',bloom:1.5,exp:0.8},
  tactical:{bg:0x0a0a05,bone:'#44ff44',joint:'#88ff44',bloom:0.4,exp:0.85},
  medical:{bg:0x000810,bone:'#00ff88',joint:'#00ffcc',bloom:0.6,exp:0.9}
};

/* ─── STATE ──────────────────────────────────────────────── */
const S = {
  scenario:'auto', scIdx:0, cycleTimer:0, cycleSpeed:30,
  peopleCount:0, isPresent:false, fallDetected:false,
  hr:72, br:16, conf:0,
  fps:0, frames:0, fpsTime:0, paused:false,
  demoMode:false, demoTime:0,
  motion:0, light:50,
  sparkData:new Array(50).fill(0),
  wireColor:'#00d4ff', jointColor:'#00ffaa'
};

/* ─── DOM ────────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const D = {
  canvas:$('#canvas'), fps:$('#fps-counter'),
  sourceLabel:$('#source-label'),
  scSelect:$('#scenario-select'), scDesc:$('#scenario-description'),
  autoplayIcon:$('#autoplay-icon'),
  hrVal:$('#hr-val'), brVal:$('#br-val'), confVal:$('#conf-val'),
  hrBar:$('#hr-bar'), brBar:$('#br-bar'), confBar:$('#conf-bar'),
  peopleVal:$('#people-val'), peopleDots:$('#people-dots'),
  motionVal:$('#motion-val'), lightVal:$('#light-val'),
  sparkline:$('#sparkline'),
  presenceLabel:$('#presence-label'), presenceEl:$('#presence-indicator'),
  fallAlert:$('#fall-alert'), edgeBar:$('#edge-bar'),
  settingsOverlay:$('#settings-overlay'), settingsBtn:$('#settings-btn'),
  settingsClose:$('#settings-close'), webcam:$('#webcam')
};

function readOpt(id, def) {
  const el = document.getElementById(`opt-${id}`);
  if (!el) return def;
  if (el.type==='checkbox') return el.checked;
  if (el.type==='range') return parseFloat(el.value);
  if (el.tagName==='SELECT') return el.value;
  if (el.type==='color') return el.value;
  return parseFloat(el.value) || def;
}

/* ─── THREE.JS SETUP ────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080c14);
scene.fog = new THREE.Fog(0x080c14, 6, 18);

const camera = new THREE.PerspectiveCamera(50, D.canvas.clientWidth/D.canvas.clientHeight, 0.1, 100);
camera.position.set(3.5, 2.5, 5.5);

const renderer = new THREE.WebGLRenderer({canvas:D.canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(D.canvas.width,D.canvas.height), 1.0, 0.5, 0.25);
composer.addPass(bloom);
const vigPass = new ShaderPass(VignetteShader); vigPass.uniforms.offset.value=0.5; vigPass.uniforms.darkness.value=0.5;
composer.addPass(vigPass);
const grainPass = new ShaderPass(GrainShader); grainPass.uniforms.intensity.value=0.03;
composer.addPass(grainPass);
const chromaPass = new ShaderPass(ChromaticShader); chromaPass.uniforms.amount.value=0.0015;
composer.addPass(chromaPass);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance=1.5; controls.maxDistance=14;
controls.maxPolarAngle=Math.PI/2.2;
controls.rotateSpeed=0.15;

/* ─── LIGHTING ──────────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0x446688, 0.5));
const hemi = new THREE.HemisphereLight(0x6688bb, 0x203040, 1.0);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffeedd, 1.2);
key.position.set(4,8,3); key.castShadow=true;
scene.add(key);
const fill = new THREE.DirectionalLight(0x8899bb, 0.6);
fill.position.set(-4,5,-2);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x6699cc, 0.4);
rim.position.set(0,6,-5);
scene.add(rim);
const over = new THREE.PointLight(0x8899aa, 0.8, 20);
over.position.set(0,3.8,0);
scene.add(over);

/* ─── ROOM ───────────────────────────────────────────────── */
let roomGroup, gridHelper;
function buildRoom() {
  if (roomGroup) scene.remove(roomGroup);
  roomGroup = new THREE.Group();
  const hw=4, hh=2, hd=3.5;
  const mat = new THREE.LineBasicMaterial({color:0x1a4a3a,transparent:true,opacity:0.15});
  const c = [[-hw,0,-hd],[hw,0,-hd],[hw,0,hd],[-hw,0,hd],[-hw,hh*2,-hd],[hw,hh*2,-hd],[hw,hh*2,hd],[-hw,hh*2,hd]];
  const e = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const pts=[]; e.forEach(([a,b])=>pts.push(...c[a],...c[b]));
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  roomGroup.add(new THREE.Line(g,mat));

  // Reflective floor
  const fMat = new THREE.MeshStandardMaterial({color:0x101810,roughness:0.4,metalness:0.2,emissive:0x020404,emissiveIntensity:0.05});
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(hw*2,hd*2), fMat);
  fl.rotation.x=-Math.PI/2; fl.position.set(0,-0.01,0);
  roomGroup.add(fl);

  scene.add(roomGroup);
}
function buildGrid() {
  if (gridHelper) scene.remove(gridHelper);
  gridHelper = new THREE.GridHelper(10,20,0x1a4830,0x0c2818);
  gridHelper.position.y=0.005;
  scene.add(gridHelper);
}
buildRoom(); buildGrid();

/* ─── ROUTER MODEL ───────────────────────────────────────── */
const routerGroup = new THREE.Group();
routerGroup.position.set(-3.5, 0.92, -2.5);
const bodyMat = new THREE.MeshStandardMaterial({color:0x505060,roughness:0.2,metalness:0.7,emissive:0x101018,emissiveIntensity:0.2});
routerGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.6,0.12,0.35),bodyMat));
[-1,0,1].forEach(i => {
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.35),new THREE.MeshStandardMaterial({color:0x606068,roughness:0.3,metalness:0.6}));
  a.position.set(i*0.2,0.24,0); a.rotation.z=i*0.15; routerGroup.add(a);
});
const routerLED = new THREE.Mesh(new THREE.SphereGeometry(0.025),new THREE.MeshBasicMaterial({color:0x00d878}));
routerLED.position.set(0.22,0.07,0.18);
routerGroup.add(routerLED);
const routerLight = new THREE.PointLight(0x2090ff, 1.0, 6);
routerLight.position.set(0,0.3,0);
routerGroup.add(routerLight);
scene.add(routerGroup);

/* ─── WIFI WAVES ─────────────────────────────────────────── */
const wifiWaves = [];
for (let i = 0; i < 5; i++) {
  const r = 0.6 + i*0.9;
  const geo = new THREE.SphereGeometry(r, 20, 12, 0, Math.PI*2, 0, Math.PI*0.5);
  const mat = new THREE.MeshBasicMaterial({color:0x2090ff,transparent:true,opacity:0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,wireframe:true});
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(routerGroup.position);
  mesh.position.y += 0.5;
  scene.add(mesh);
  wifiWaves.push({mesh, mat, phase:i*0.7});
}

/* ─── SIGNAL FIELD (floor grid dots) ────────────────────── */
const FIELD_SIZE = 16;
const fieldPositions = new Float32Array(FIELD_SIZE*FIELD_SIZE*3);
const fieldColors = new Float32Array(FIELD_SIZE*FIELD_SIZE*3);
const fieldSizes = new Float32Array(FIELD_SIZE*FIELD_SIZE);
for (let iz=0; iz<FIELD_SIZE; iz++) for (let ix=0; ix<FIELD_SIZE; ix++) {
  const idx=iz*FIELD_SIZE+ix;
  fieldPositions[idx*3]=(ix-FIELD_SIZE/2)*0.55;
  fieldPositions[idx*3+1]=0.01;
  fieldPositions[idx*3+2]=(iz-FIELD_SIZE/2)*0.45;
  fieldSizes[idx]=6;
}
const fGeo = new THREE.BufferGeometry();
fGeo.setAttribute('position',new THREE.BufferAttribute(fieldPositions,3));
fGeo.setAttribute('color',new THREE.BufferAttribute(fieldColors,3));
fGeo.setAttribute('size',new THREE.BufferAttribute(fieldSizes,1));
const fMat = new THREE.PointsMaterial({size:0.3,vertexColors:true,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
const fieldPoints = new THREE.Points(fGeo,fMat);
scene.add(fieldPoints);

/* ─── BODY MIST (dot matrix around persons) ─────────────── */
const MIST_COUNT = 600;
const mistPos = new Float32Array(MIST_COUNT*3);
const mistAlpha = new Float32Array(MIST_COUNT);
for (let i=0; i<MIST_COUNT; i++) { mistAlpha[i]=0; }
const mGeo = new THREE.BufferGeometry();
mGeo.setAttribute('position',new THREE.BufferAttribute(mistPos,3));
mGeo.setAttribute('alpha',new THREE.BufferAttribute(mistAlpha,1));
const mMat = new THREE.ShaderMaterial({
  vertexShader:`attribute float alpha;varying float vA;void main(){vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1);gl_PointSize=3.0*(180.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uColor;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;float e=smoothstep(0.5,0.15,d);gl_FragColor=vec4(uColor,e*vA);}`,
  uniforms:{uColor:{value:new THREE.Color(0x00d4ff)}},
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false
});
const mistPoints = new THREE.Points(mGeo,mMat);
scene.add(mistPoints);

/* ─── PARTICLE TRAIL ─────────────────────────────────────── */
const TRAIL_COUNT=150;
const trailPos=new Float32Array(TRAIL_COUNT*3);
const trailAge=new Float32Array(TRAIL_COUNT);
for (let i=0; i<TRAIL_COUNT; i++) trailAge[i]=1;
const tGeo=new THREE.BufferGeometry();
tGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));
tGeo.setAttribute('age',new THREE.BufferAttribute(trailAge,1));
const tMat=new THREE.ShaderMaterial({
  vertexShader:`attribute float age;varying float vA;void main(){vA=age;vec4 mv=modelViewMatrix*vec4(position,1);gl_PointSize=max(1.0,(1.0-age)*5.0*(140.0/-mv.z));gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform vec3 uColor;varying float vA;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;float a=(1.0-vA)*0.5*smoothstep(0.5,0.1,d);gl_FragColor=vec4(uColor,a);}`,
  uniforms:{uColor:{value:new THREE.Color(0x00d878)}},
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false
});
const trailPoints=new THREE.Points(tGeo,tMat);
scene.add(trailPoints);
let trailHead=0, trailTimer=0;

/* ─── SKELETON RENDERING ────────────────────────────────── */
let skeletons=[];
function createSkeleton() { return new THREE.Group(); }

function updateSkeleton(group, landmarks, opts) {
  while(group.children.length) group.remove(group.children[0]);
  if (!landmarks||landmarks.length<33) return;
  const hw=3.5, hs=2.8;
  const pts=landmarks.map(l=>new THREE.Vector3((l.x-0.5)*hw*2, l.y*hs, -(l.z-0.5)*hw*2));
  const color=new THREE.Color(opts.wireColor||0x00d4ff);
  const jColor=new THREE.Color(opts.jointColor||0x00ffaa);
  const thick=(opts.boneThick||3)*0.005;
  const bMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.8,wireframe:opts.wireframe});
  const cyl=new THREE.CylinderGeometry(thick,thick,1,4); cyl.translate(0,0.5,0);
  SKELETON_EDGES.forEach(([a,b])=>{
    const p0=pts[a],p1=pts[b]; if(!p0||!p1)return;
    const dir=new THREE.Vector3().subVectors(p1,p0);
    const len=dir.length(); if(len<0.005)return;
    const mid=new THREE.Vector3().addVectors(p0,p1).multiplyScalar(0.5);
    const m=new THREE.Mesh(cyl.clone(),bMat);
    m.position.copy(mid); m.scale.y=len;
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
    group.add(m);
  });
  const jSize=opts.jointSize||0.04;
  const jMat=new THREE.MeshBasicMaterial({color:jColor,transparent:true,opacity:0.9});
  const sp=new THREE.SphereGeometry(jSize,8,8);
  pts.forEach(p=>{const m=new THREE.Mesh(sp,jMat);m.position.copy(p);group.add(m);});
  if((opts.glow||0.6)>0.01){
    const gMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.05});
    const gSp=new THREE.SphereGeometry(jSize*2,8,8);
    pts.forEach(p=>{const m=new THREE.Mesh(gSp,gMat);m.position.copy(p);group.add(m);});
  }
}

function clearSkeletons(){skeletons.forEach(g=>scene.remove(g));skeletons=[];}

/* ─── POSE DETECTION ────────────────────────────────────── */
let poseLandmarker=null, vidReady=false, lastVTime=-1;
let detectedLandmarks=[];

async function initPose(){
  try{
    const vis=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/');
    poseLandmarker=await PoseLandmarker.createFromOptions(vis,{
      baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',delegate:'GPU'},
      runningMode:'VIDEO',numPoses:6,minPoseDetectionConfidence:0.5,minTrackingConfidence:0.5
    });
    return true;
  }catch(e){console.error('Pose init:',e);return false;}
}

async function initCam(){
  try{
    const s=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'}});
    D.webcam.srcObject=s; await D.webcam.play(); vidReady=true; return true;
  }catch(e){console.error('Cam:',e);return false;}
}

function detect(){
  if(S.demoMode||!poseLandmarker||!vidReady||D.webcam.readyState<2)return;
  if(D.webcam.currentTime===lastVTime)return;
  lastVTime=D.webcam.currentTime;
  try{const r=poseLandmarker.detectForVideo(D.webcam,performance.now());detectedLandmarks=r.landmarks||[];}
  catch(e){detectedLandmarks=[];}
}

/* ─── DEMO ──────────────────────────────────────────────── */
function genDemo(){
  S.demoTime+=0.025;
  const info=SCENARIO_INFO[S.scenario]||SCENARIO_INFO.auto;
  let count=S.scenario==='empty_room'?0:S.scenario==='crowd_occupancy'?4:S.scenario==='two_walking'?2:info.people;
  const poses=[];
  for(let p=0;p<count;p++){
    const ox=(p-(count-1)/2)*1.2,oz=Math.sin(S.demoTime*0.4+p*1.5)*0.2;
    const wave=Math.sin(S.demoTime*0.8+p*0.7);
    const lms=[];
    for(let i=0;i<33;i++){
      lms.push({
        x:0.46+ox*0.1+Math.sin(S.demoTime*1.2+i*0.3+p)*0.015,
        y:(i<11?1.6:i<23?1.2:0.3)+wave*(i<11?0.02:0.04)+(i===27||i===28?Math.sin(S.demoTime*2+p)*0.05:0),
        z:0.5+oz+Math.cos(S.demoTime*0.6+i*0.2)*0.02,
        visibility:0.85+Math.random()*0.15
      });
    }
    poses.push(lms);
  }
  detectedLandmarks=poses;
}

/* ─── FALL DETECTION ────────────────────────────────────── */
function detectFall(){
  if(!detectedLandmarks||detectedLandmarks.length===0){S.fallDetected=false;return;}
  for(const p of detectedLandmarks){
    if(!p[0]||!p[23]||!p[24])continue;
    const hipY=(p[23].y+p[24].y)/2,h=Math.abs(p[0].y-hipY);
    if(h<0.18&&hipY>0.6){S.fallDetected=true;return;}
  }
  S.fallDetected=false;
}

/* ─── VITALS ───────────────────────────────────────────── */
function updateVitals(){
  const present=detectedLandmarks.length>0&&S.scenario!=='empty_room';
  S.isPresent=present;
  if(present){
    S.hr+=(68+Math.random()*12-S.hr)*0.04;
    S.br+=(15+Math.random()*4-S.br)*0.04;
    let sum=0,c=0;
    detectedLandmarks.forEach(p=>p.forEach(l=>{sum+=l.visibility||0;c++;}));
    S.conf=c?Math.round(sum/c*100):0;
  }else{
    S.hr+=(72-S.hr)*0.02;S.br+=(16-S.br)*0.02;
    S.conf=Math.max(0,S.conf-0.5);
  }
  if(S.fallDetected){S.hr=Math.max(40,S.hr-0.3);S.br=Math.max(6,S.br-0.1);}
  S.peopleCount=detectedLandmarks.length;
  S.motion=present?0.3+Math.random()*0.3:0;
  S.light=present?55+Math.random()*25:30+Math.random()*15;
  S.sparkData.push(S.peopleCount);
  if(S.sparkData.length>50)S.sparkData.shift();
}

/* ─── UI ────────────────────────────────────────────────── */
function drawSparkline(){
  const c=D.sparkline,ctx=c.getContext('2d'),w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#00e5ff';ctx.lineWidth=1.5;ctx.beginPath();
  S.sparkData.forEach((v,i)=>{const x=i/(S.sparkData.length-1)*w,y=h-(v/4)*h;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.stroke();
}

function updateUI(){
  D.fps.textContent=S.fps+' FPS';
  D.hrVal.textContent=Math.round(S.hr);
  D.brVal.textContent=Math.round(S.br);
  D.confVal.textContent=Math.round(S.conf);
  D.hrBar.style.width=Math.min(100,S.hr)+'%';
  D.brBar.style.width=Math.min(100,S.br*4)+'%';
  D.confBar.style.width=S.conf+'%';
  D.peopleVal.textContent=S.peopleCount;
  D.motionVal.textContent=S.motion.toFixed(2);
  D.lightVal.textContent=Math.round(S.light)+' lux';

  D.peopleDots.innerHTML='';
  const dots=S.scenario==='crowd_occupancy'?4:Math.max(1,S.peopleCount,1);
  for(let i=0;i<dots;i++){const d=document.createElement('span');d.className='pdot'+(i<S.peopleCount?' active':'');D.peopleDots.appendChild(d);}

  const pi=D.presenceEl,pl=D.presenceLabel;
  if(S.fallDetected){pi.className='presence--fall';pl.textContent='FALL DETECTED';D.fallAlert.style.display='';}
  else if(S.isPresent){pi.className='presence--present';pl.textContent='PRESENT';D.fallAlert.style.display='none';}
  else{pi.className='presence--absent';pl.textContent='ABSENT';D.fallAlert.style.display='none';}

  drawSparkline();
  D.sourceLabel.textContent=S.demoMode?'DEMO':'CAMERA';
  document.querySelector('.dot').className='dot '+(S.demoMode?'dot--demo':'dot--camera');
}

function updateEdgeBar(){
  const active=S.scenario;
  const aMap={
    auto:[1,1,1,1,1],empty_room:[0,0,1,0,0],single_breathing:[1,1,1,1,0],
    two_walking:[1,0,1,1,0],fall_event:[1,1,1,1,1],sleep_monitoring:[1,1,1,1,0],
    intrusion_detect:[0,0,1,0,0],gesture_control:[1,0,1,1,0],
    crowd_occupancy:[1,0,1,1,0],search_rescue:[1,0,1,1,0],
    elderly_care:[1,1,1,1,1],fitness_tracking:[1,0,1,1,0],security_patrol:[0,0,1,0,0]
  };
  const a=aMap[active]||[1,1,1,1,1];
  const labs=['Pose Est.','Vitals','Presence','Counting','Fall'];
  D.edgeBar.innerHTML=labs.map((l,i)=>`<span class="edge-badge${a[i]?' active':''}">${l}</span>`).join('');
}

/* ─── SCENARIO ─────────────────────────────────────────── */
function setScenario(id){
  S.scenario=id;S.scIdx=SCENARIO_KEYS.indexOf(id);
  const info=SCENARIO_INFO[id]||SCENARIO_INFO.auto;
  D.scSelect.value=id;D.scDesc.textContent=info.desc;
  S.cycleTimer=0;updateEdgeBar();
}
function cycleScenario(){S.scIdx=(S.scIdx+1)%SCENARIO_KEYS.length;setScenario(SCENARIO_KEYS[S.scIdx]);}

/* ─── SETTINGS ─────────────────────────────────────────── */
function getRenderOpts(){
  return{
    wireframe:false,
    boneThick:readOpt('bone',3), jointSize:readOpt('joint',0.05),
    glow:readOpt('glow',0.6),
    wireColor:new THREE.Color(readOpt('wire-color','#00d4ff')).getHex(),
    jointColor:new THREE.Color(readOpt('joint-color','#00ffaa')).getHex()
  };
}

function applySettings(){
  const preset=readOpt('preset','custom');
  const p=PRESETS[preset]||PRESETS.custom;
  if(preset!=='custom'){
    bloom.strength=p.bloom;renderer.toneMappingExposure=p.exp;
    document.getElementById('opt-bloom').value=p.bloom;
    document.getElementById('opt-exposure').value=p.exp;
    document.getElementById('opt-wire-color').value=p.bone;
    document.getElementById('opt-joint-color').value=p.joint;
  }
  scene.background=new THREE.Color(p.bg);
  scene.fog.color.copy(scene.background);
  bloom.strength=readOpt('bloom',1.0);
  renderer.toneMappingExposure=readOpt('exposure',0.9);
  vigPass.uniforms.offset.value=readOpt('vignette',0.5);
  vigPass.uniforms.darkness.value=readOpt('vignette',0.5);
  grainPass.uniforms.intensity.value=readOpt('grain',0.03);
  chromaPass.uniforms.amount.value=readOpt('chromatic',0.0015);
  controls.rotateSpeed=readOpt('orbit',0.15);
  camera.fov=readOpt('fov',50);camera.updateProjectionMatrix();
  S.cycleSpeed=readOpt('cycle',30);
  if(roomGroup)roomGroup.visible=readOpt('room',true);
  if(gridHelper)gridHelper.visible=readOpt('grid',true);
  S.demoMode=readOpt('data-source','camera')==='demo';
  S.wireColor=readOpt('wire-color','#00d4ff');
  S.jointColor=readOpt('joint-color','#00ffaa');
  // Mist color
  mistPoints.material.uniforms.uColor.value.set(S.wireColor);
  trailPoints.material.uniforms.uColor.value.set(S.wireColor);
  // Field opacity
  fMat.opacity=readOpt('field',0.5);
  // Wave visibility
  const waveVis=readOpt('waves',0.6);
  wifiWaves.forEach(w=>{w.mat.opacity=0;w.mesh.visible=waveVis>0.01;});

  // Range value displays
  document.querySelectorAll('.s-row input[type="range"]').forEach(el=>{
    const rv=el.parentElement.querySelector('.rval');
    if(rv)rv.textContent=parseFloat(el.value).toFixed(el.step<0.01?4:el.step<0.1?2:1);
  });
}

function resetCamera(){camera.position.set(3.5,2.5,5.5);controls.target.set(0,1.2,0);controls.update();}
function resetDefaults(){
  ['bloom','bloom-radius','bloom-thresh','exposure','vignette','grain','chromatic','bone','joint','glow','trail','aura','field','waves','ambient','reflect','fov','orbit'].forEach(id=>{
    const el=document.getElementById(`opt-${id}`);if(el&&el.type==='range')el.value=el.defaultValue;
  });
  document.getElementById('opt-grid').checked=true;
  document.getElementById('opt-room').checked=true;
  document.getElementById('opt-preset').value='custom';
  document.getElementById('opt-data-source').value='camera';
  S.demoMode=false;
  applySettings();
}
function exportSettings(){
  const data={};
  document.querySelectorAll('#settings-overlay input,#settings-overlay select').forEach(el=>{data[el.id]=el.type==='checkbox'?el.checked:el.value;});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download='bodypose-settings.json';a.click();
}

/* ─── 3D EFFECTS UPDATE ────────────────────────────────── */
let fxTime=0;

function updateEffects(elapsed){
  fxTime=elapsed;

  // WiFi waves
  const waveVis=readOpt('waves',0.6);
  wifiWaves.forEach(w=>{
    const t=(elapsed*0.6+w.phase)%5;
    const life=t/5;
    w.mat.opacity=Math.max(0,waveVis*0.2*(1-life));
    const s=1+life*0.5;
    w.mesh.scale.set(s,s,s);
    w.mesh.rotation.y=elapsed*0.04;
  });

  // Router LED
  routerLED.material.opacity=0.5+0.5*Math.sin(elapsed*8);
  routerLight.intensity=0.3+0.2*Math.sin(elapsed*3);

  // Signal field update
  const fieldGrid=readOpt('field',0.5);
  if(fieldGrid>0.01&&detectedLandmarks.length>0){
    for(let i=0;i<FIELD_SIZE*FIELD_SIZE;i++){
      const ix=i%FIELD_SIZE, iz=Math.floor(i/FIELD_SIZE);
      let val=0;
      detectedLandmarks.forEach(pose=>{
        if(pose[0]){
          const px=(pose[0].x-0.5)*2, pz=-(pose[0].z-0.5)*2;
          const dx=(ix-FIELD_SIZE/2)/FIELD_SIZE*2-px, dz=(iz-FIELD_SIZE/2)/FIELD_SIZE*2-pz;
          val+=Math.max(0,1-Math.sqrt(dx*dx+dz*dz)*1.5)*0.5;
        }
      });
      val=Math.min(1,val);
      fieldColors[i*3]=val*0.3+Math.sin(elapsed*0.5+ix*0.3)*0.05;
      fieldColors[i*3+1]=val*0.7+0.1;
      fieldColors[i*3+2]=val*0.2+Math.cos(elapsed*0.4+iz*0.2)*0.05;
      fieldSizes[i]=4+val*12;
    }
    fieldPoints.geometry.attributes.color.needsUpdate=true;
    fieldPoints.geometry.attributes.size.needsUpdate=true;
    fieldPoints.material.opacity=fieldGrid;
  }else{
    fieldPoints.material.opacity=0;
  }

  // Body mist
  const mist=detectedLandmarks.length>0&&S.isPresent;
  const mPos=mistPoints.geometry.attributes.position;
  const mAlpha=mistPoints.geometry.attributes.alpha;
  if(mist){
    const p=detectedLandmarks[0];
    if(p[0]){
      const cx=(p[0].x-0.5)*2, cz=-(p[0].z-0.5)*2;
      for(let i=0;i<MIST_COUNT;i++){
        const angle=(i/MIST_COUNT)*Math.PI*2+elapsed*0.08;
        const layer=(i%30)/30;
        const r=0.15+layer*0.2+Math.sin(i*0.5+elapsed)*0.05;
        mPos.array[i*3]+=((cx+Math.cos(angle)*r)-mPos.array[i*3])*0.06;
        mPos.array[i*3+1]+=((0.05+layer*1.5)-mPos.array[i*3+1])*0.06;
        mPos.array[i*3+2]+=((cz+Math.sin(angle*0.7)*r*0.6)-mPos.array[i*3+2])*0.06;
        mAlpha.array[i]=0.1+Math.sin(elapsed*1.5+i*0.3)*0.05;
      }
    }
  }else{
    for(let i=0;i<MIST_COUNT;i++)mAlpha.array[i]*=0.95;
  }
  mPos.needsUpdate=true;mAlpha.needsUpdate=true;

  // Particle trail
  const tPos=trailPoints.geometry.attributes.position;
  const tAge=trailPoints.geometry.attributes.age;
  for(let i=0;i<TRAIL_COUNT;i++)tAge.array[i]=Math.min(1,tAge.array[i]+0.02);

  if(mist){
    trailTimer+=0.016;
    if(trailTimer>0.06){
      trailTimer=0;
      detectedLandmarks.forEach(pose=>{
        if(pose[0]){
          const idx=trailHead;
          tPos.array[idx*3]=(pose[0].x-0.5)*2+(Math.random()-0.5)*0.12;
          tPos.array[idx*3+1]=Math.random()*0.6;
          tPos.array[idx*3+2]=-(pose[0].z-0.5)*2+(Math.random()-0.5)*0.12;
          tAge.array[idx]=0;
          trailHead=(trailHead+1)%TRAIL_COUNT;
        }
      });
    }
  }
  tPos.needsUpdate=true;tAge.needsUpdate=true;
}

/* ─── EVENTS ───────────────────────────────────────────── */
function bindEvents(){
  D.settingsBtn.addEventListener('click',()=>D.settingsOverlay.style.display='');
  D.settingsClose.addEventListener('click',()=>{D.settingsOverlay.style.display='none';applySettings();});
  D.settingsOverlay.addEventListener('click',e=>{if(e.target===D.settingsOverlay){D.settingsOverlay.style.display='none';applySettings();}});

  document.querySelectorAll('.stab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.stab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  document.querySelectorAll('#settings-overlay input,#settings-overlay select').forEach(el=>{
    el.addEventListener('input',applySettings);el.addEventListener('change',applySettings);
  });

  D.scSelect.addEventListener('change',()=>setScenario(D.scSelect.value));
  document.getElementById('opt-data-source').addEventListener('change',()=>{S.demoMode=document.getElementById('opt-data-source').value==='demo';});
  document.getElementById('btn-reset-camera').addEventListener('click',resetCamera);
  document.getElementById('btn-reset-settings').addEventListener('click',resetDefaults);
  document.getElementById('btn-export').addEventListener('click',exportSettings);

  document.addEventListener('keydown',e=>{
    if(e.key==='s'||e.key==='S')D.settingsOverlay.style.display=D.settingsOverlay.style.display==='none'?'':'none';
    if(e.key==='d'||e.key==='D')cycleScenario();
    if(e.key==='f'||e.key==='F')D.fps.style.display=D.fps.style.display==='none'?'':'none';
    if(e.key==='a'||e.key==='A')resetCamera();
    if(e.key===' ')e.preventDefault();
  });

  window.addEventListener('resize',()=>{
    const w=D.canvas.clientWidth,h=D.canvas.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();
    renderer.setSize(w,h);composer.setSize(w,h);
  });
}

/* ─── MAIN LOOP ────────────────────────────────────────── */
function animate(time){
  requestAnimationFrame(animate);
  S.frames++;
  if(time-S.fpsTime>1000){S.fps=S.frames;S.frames=0;S.fpsTime=time;}
  if(S.paused){composer.render();return;}

  if(S.demoMode)genDemo();else detect();
  detectFall();
  updateVitals();
  updateUI();

  if(S.scenario==='auto'){
    S.cycleTimer+=16;
    if(S.cycleTimer>S.cycleSpeed*1000){S.cycleTimer=0;cycleScenario();}
  }

  // 3D skeletons
  clearSkeletons();
  const opts=getRenderOpts();
  detectedLandmarks.forEach(lm=>{const g=new THREE.Group();updateSkeleton(g,lm,opts);scene.add(g);skeletons.push(g);});

  // Effects
  updateEffects(time/1000);
  scene.fog=new THREE.Fog(scene.background.getHex(),S.isPresent?6:4,S.isPresent?18:13);

  controls.update();
  composer.render();
}

/* ─── INIT ──────────────────────────────────────────────── */
async function init(){
  bindEvents();setScenario('auto');
  const camOk=await initCam(),poseOk=await initPose();
  if(!camOk||!poseOk){S.demoMode=true;document.getElementById('opt-data-source').value='demo';D.sourceLabel.textContent='DEMO';document.querySelector('.dot').className='dot dot--demo';}
  animate(0);
}
init();
