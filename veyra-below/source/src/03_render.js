// Veyra Below — renderer, scene, isometric camera, lights, shared materials

const R = {
  renderer: null, scene: null, camera: null, hemi: null, key: null, plight: null, flashes: [],
  root: null,        // everything of the current level lives under this group
  quality: 1,        // 0 low, 1 medium, 2 high
  shadows: false,
};
const CAM = { yaw: Math.PI / 4, pitch: 0.92, dist: 19, zoom: 1, x: 0, z: 0, shake: 0, lookX: 0, lookZ: 0 };

function initRender() {
  const canvas = $('#c');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { renderer = null; }
  if (!renderer) { $('#nogl').hidden = false; throw new Error('WebGL unavailable'); }
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 140);
  R.hemi = new THREE.HemisphereLight(0xa0c0ff, 0x302820, 0.6);
  R.key = new THREE.DirectionalLight(0xffffff, 0.9);
  R.key.position.set(-8, 18, -4);
  R.key.shadow.mapSize.set(1024, 1024);
  const sc = R.key.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 60;
  R.key.shadow.bias = -0.0008;
  R.scene.add(R.hemi, R.key, R.key.target);
  // the player's lantern and a few flash lights for explosions: a fixed count so shaders never recompile
  R.plight = new THREE.PointLight(0xffe0b0, 1.2, 14, 1.6);
  R.scene.add(R.plight);
  for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffffff, 0, 9, 2); l.userData.t = 0; R.flashes.push(l); R.scene.add(l); }
  R.root = new THREE.Group(); R.scene.add(R.root);
  window.addEventListener('resize', resize);
  resize();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, R.quality >= 2 ? 2 : R.quality === 1 ? 1.5 : 1);
  R.renderer.setPixelRatio(pr);
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h;
  // keep a similar view width on narrow (portrait) screens
  R.camera.fov = w / h < 1 ? 52 : 36;
  R.camera.updateProjectionMatrix();
  const hud = $('#hud2d'); hud.width = Math.round(w * Math.min(window.devicePixelRatio || 1, 2)); hud.height = Math.round(h * Math.min(window.devicePixelRatio || 1, 2));
  bus.emit('resize', w, h);
}

function setQuality(q) {
  R.quality = q;
  R.shadows = q >= 1;
  R.renderer.shadowMap.enabled = R.shadows;
  R.key.castShadow = R.shadows;
  R.key.shadow.mapSize.set(q >= 2 ? 2048 : 1024, q >= 2 ? 2048 : 1024);
  if (R.key.shadow.map) { R.key.shadow.map.dispose(); R.key.shadow.map = null; }
  R.scene.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.needsUpdate = true; }); } });
  resize();
}

// Area lighting and fog
function applyPalette(pal) {
  R.scene.background = new THREE.Color(pal.bg);
  R.scene.fog = new THREE.Fog(pal.fog, 22, 52);
  R.hemi.color.setHex(pal.hemiSky); R.hemi.groundColor.setHex(pal.hemiGnd); R.hemi.intensity = pal.hemiI;
  R.key.color.setHex(pal.key); R.key.intensity = pal.keyI;
  R.plight.color.setHex(pal.pl);
}

// ---------- materials ----------
const MATS = new Map();
function mat(color, opts = {}) {
  const k = color + '|' + (opts.e || 0) + '|' + (opts.ei || 0) + '|' + (opts.t ? opts.o : 1) + '|' + (opts.flat ? 1 : 0) + '|' + (opts.basic ? 1 : 0) + '|' + (opts.add ? 1 : 0) + '|' + (opts.ds ? 1 : 0);
  let m = MATS.get(k);
  if (m) return m;
  if (opts.basic) m = new THREE.MeshBasicMaterial({ color, transparent: !!opts.t, opacity: opts.t ? opts.o : 1, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !opts.t, side: opts.ds ? THREE.DoubleSide : THREE.FrontSide, fog: !opts.add });
  else m = new THREE.MeshLambertMaterial({ color, emissive: opts.e || 0, emissiveIntensity: opts.ei === undefined ? 1 : opts.ei, transparent: !!opts.t, opacity: opts.t ? opts.o : 1, flatShading: !!opts.flat, side: opts.ds ? THREE.DoubleSide : THREE.FrontSide });
  MATS.set(k, m);
  return m;
}
const glowMat = (color, o = 0.9) => mat(color, { basic: true, t: true, o, add: true });

// ---------- geometry cache ----------
const GEO = {};
function geo(k, make) { return GEO[k] || (GEO[k] = make()); }
const GM = {
  box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  sph: () => geo('sph', () => new THREE.SphereGeometry(0.5, 12, 9)),
  sphLo: () => geo('sphLo', () => new THREE.IcosahedronGeometry(0.5, 0)),
  sphMid: () => geo('sphMid', () => new THREE.IcosahedronGeometry(0.5, 1)),
  cyl: () => geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10)),
  cyl6: () => geo('cyl6', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
  cone: () => geo('cone', () => new THREE.ConeGeometry(0.5, 1, 8)),
  cone4: () => geo('cone4', () => new THREE.ConeGeometry(0.5, 1, 4)),
  tor: () => geo('tor', () => new THREE.TorusGeometry(0.5, 0.08, 6, 20)),
  ring: () => geo('ring', () => new THREE.RingGeometry(0.85, 1, 40)),
  disc: () => geo('disc', () => new THREE.CircleGeometry(1, 32)),
  plane: () => geo('plane', () => new THREE.PlaneGeometry(1, 1)),
  oct: () => geo('oct', () => new THREE.OctahedronGeometry(0.5, 0)),
  dodec: () => geo('dodec', () => new THREE.DodecahedronGeometry(0.5, 0)),
  caps: () => geo('caps', () => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 10); return g; }),
};
function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o;
}

// ---------- camera ----------
function updateCamera(dt, tx, tz, aimX, aimZ) {
  const z = CAM.dist * CAM.zoom;
  // ease toward the target and lean slightly toward where the player aims
  const lk = 1 - Math.exp(-dt * 6);
  CAM.lookX = lerp(CAM.lookX, aimX || 0, lk); CAM.lookZ = lerp(CAM.lookZ, aimZ || 0, lk);
  const k = 1 - Math.exp(-dt * 10);
  CAM.x = lerp(CAM.x, tx + CAM.lookX, k); CAM.z = lerp(CAM.z, tz + CAM.lookZ, k);
  let sx = 0, sy = 0;
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - dt * 2.5); const s = CAM.shake * CAM.shake * 0.6 * (OPTS.shake ? 1 : 0); sx = (Math.random() - 0.5) * s; sy = (Math.random() - 0.5) * s; }
  const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
  R.camera.position.set(CAM.x + Math.sin(CAM.yaw) * cp * z + sx, sp * z + sy, CAM.z + Math.cos(CAM.yaw) * cp * z);
  R.camera.lookAt(CAM.x + sx, 0.6, CAM.z);
  R.key.position.set(CAM.x - 9, 22, CAM.z - 5);
  R.key.target.position.set(CAM.x, 0, CAM.z);
}
function snapCamera(x, z) { CAM.x = x; CAM.z = z; CAM.lookX = 0; CAM.lookZ = 0; }
// camera-relative movement: screen up = away from the camera
function camBasis() {
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw); // forward on the ground
  return { fx, fz, rx: -fz, rz: fx };
}
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
// screen pixel → point on the ground plane y = h
function screenToGround(px, py, h = 0) {
  _ndc.set((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
  _ray.setFromCamera(_ndc, R.camera);
  const o = _ray.ray.origin, d = _ray.ray.direction;
  if (Math.abs(d.y) < 1e-4) return null;
  const t = (h - o.y) / d.y;
  if (t < 0) return null;
  return { x: o.x + d.x * t, z: o.z + d.z * t };
}
const _proj = new V3();
function worldToScreen(x, y, z) {
  _proj.set(x, y, z).project(R.camera);
  return { x: (_proj.x + 1) * 0.5 * window.innerWidth, y: (1 - _proj.y) * 0.5 * window.innerHeight, vis: _proj.z < 1 && _proj.z > -1 };
}

function flash(x, y, z, color, intensity = 3, dur = 0.25) {
  let l = R.flashes.find((f) => f.userData.t <= 0) || R.flashes.reduce((a, b) => (a.userData.t < b.userData.t ? a : b));
  l.position.set(x, y, z); l.color.setHex(color); l.userData.t = dur; l.userData.d = dur; l.userData.i = intensity; l.intensity = intensity;
}
function updateFlashes(dt) {
  for (const l of R.flashes) { if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = Math.max(0, l.userData.t / l.userData.d) * l.userData.i; } else l.intensity = 0; }
}

function clearRoot() {
  // dispose of per-level geometry (shared cached geometry and materials are kept)
  const shared = new Set(Object.values(GEO));
  R.root.traverse((o) => {
    if (o.geometry && !shared.has(o.geometry) && !o.userData.keepGeo) o.geometry.dispose();
    if (o.isInstancedMesh) o.dispose && o.dispose();
  });
  R.scene.remove(R.root);
  R.root = new THREE.Group(); R.scene.add(R.root);
}
