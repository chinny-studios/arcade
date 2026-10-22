// Copter City — renderer (drawn at a low internal resolution and scaled up with nearest filtering), sky and
// day/night, materials, canvas textures, geometry merging, the cameras

const R = {
  renderer: null, scene: null, camera: null, hemi: null, sun: null, sky: null, stars: null, sunDisc: null,
  night: 0, hour: 10, res: 360, view: 900, sunDir: new V3(0.4, 0.8, 0.3).normalize(), spot: null, w: 640, h: 360,
};
const CAM = { mode: 'chase', yaw: 0, pitch: 0.3, dist: 22, x: 0, y: 40, z: 40, userYaw: 0, userPitch: 0, orbitT: 0, zoom: 1, shake: 0, snap: true, lx: 0, ly: 0, lz: 0 };
const CAM_MODES = ['chase', 'cockpit', 'far', 'belly'];
const CAM_NAMES = { chase: 'Chase camera', cockpit: 'Cockpit', far: 'High chase', belly: 'Belly camera' };

function initRender() {
  const canvas = $('#c');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  if (!renderer) { $('#nogl').hidden = false; throw new Error('WebGL unavailable'); }
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 1500);
  R.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x50483c, 0.7);
  R.sun = new THREE.DirectionalLight(0xffffff, 0.9);
  R.scene.add(R.hemi, R.sun, R.sun.target);
  // the helicopter's searchlight: always in the scene so shaders never recompile when it switches on
  R.spot = new THREE.SpotLight(0xfff6e0, 0, 260, 0.2, 0.5, 1.1);
  R.scene.add(R.spot, R.spot.target);
  R.fill = new THREE.PointLight(0xff8a3a, 0, 90, 1.6); // fire glow near the player
  R.scene.add(R.fill);
  R.scene.fog = new THREE.Fog(0xbcd0e4, 200, 900);
  makeSky();
  addEventListener('resize', resize);
  resize();
}

// The internal resolution: R.res lines tall (0 = native). The canvas is stretched by CSS with pixelated scaling.
function resize() {
  const w = innerWidth, h = innerHeight;
  let rh = R.res ? Math.min(R.res, h) : Math.round(h * Math.min(devicePixelRatio || 1, 2));
  let rw = Math.round(rh * w / h);
  R.renderer.setPixelRatio(1);
  R.renderer.setSize(rw, rh, false);
  R.w = rw; R.h = rh;
  $('#c').style.imageRendering = R.res ? 'pixelated' : 'auto';
  R.camera.aspect = w / h;
  R.camera.fov = w / h < 1 ? 78 : 62;
  R.camera.updateProjectionMatrix();
  bus.emit('resize', w, h);
}
function setRes(res) { R.res = res; resize(); }
function setViewDist(v) {
  R.view = v; R.camera.far = v + 400; R.camera.updateProjectionMatrix();
  R.scene.fog.near = v * 0.25; R.scene.fog.far = v;
}

// ---------- materials ----------
const MATS = new Map();
function mat(color, o = {}) {
  const k = [color, o.e || 0, o.t ? o.o : 1, o.flat ? 1 : 0, o.basic ? 1 : 0, o.add ? 1 : 0, o.ds ? 1 : 0, o.vc ? 1 : 0, o.map ? o.map.uuid : '', o.fog === false ? 0 : 1, o.dw === false ? 0 : 1].join('|');
  let m = MATS.get(k);
  if (m) return m;
  const common = { color, transparent: !!o.t, opacity: o.t ? o.o : 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, vertexColors: !!o.vc };
  if (o.map) common.map = o.map;
  if (o.basic) m = new THREE.MeshBasicMaterial(Object.assign(common, { blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: o.dw === false ? false : !o.t, fog: o.fog !== false && !o.add }));
  else m = new THREE.MeshLambertMaterial(Object.assign(common, { emissive: o.e || 0, flatShading: !!o.flat }));
  MATS.set(k, m);
  return m;
}
const glowMat = (color, o = 0.9) => mat(color, { basic: true, t: true, o, add: true });

// ---------- geometry cache ----------
const GEO = {};
function geo(k, make) { return GEO[k] || (GEO[k] = make()); }
const GM = {
  box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  boxB: () => geo('boxB', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)),
  sph: () => geo('sph', () => new THREE.SphereGeometry(0.5, 8, 6)),
  cyl: () => geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
  cylB: () => geo('cylB', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0)),
  cone: () => geo('cone', () => new THREE.ConeGeometry(0.5, 1, 6)),
  plane: () => geo('plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
  planeV: () => geo('planeV', () => new THREE.PlaneGeometry(1, 1)),
  disc: () => geo('disc', () => new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2)),
  ring: () => geo('ring', () => new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2)),
};
function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; }

// ---------- geometry merging ----------
// Collects transformed geometry into one BufferGeometry with position, normal, uv and colour.
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sc = new V3(), _up = new V3(0, 1, 0), _e = new THREE.Euler();
class Merger {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; this.vc = 0; }
  add(g, m4, color) {
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const nm = new THREE.Matrix3().getNormalMatrix(m4);
    const col = new THREE.Color(color === undefined ? 0xffffff : color);
    const base = this.vc;
    for (let k = 0; k < pos.count; k++) {
      _v1.set(pos.getX(k), pos.getY(k), pos.getZ(k)).applyMatrix4(m4);
      this.p.push(_v1.x, _v1.y, _v1.z);
      if (nor) { _v2.set(nor.getX(k), nor.getY(k), nor.getZ(k)).applyMatrix3(nm).normalize(); this.n.push(_v2.x, _v2.y, _v2.z); } else this.n.push(0, 1, 0);
      if (uv) this.u.push(uv.getX(k), uv.getY(k)); else this.u.push(0, 0);
      this.c.push(col.r, col.g, col.b);
    }
    if (g.index) for (let k = 0; k < g.index.count; k++) this.i.push(base + g.index.getX(k));
    else for (let k = 0; k < pos.count; k++) this.i.push(base + k);
    this.vc += pos.count;
  }
  // a box placed by centre-bottom with an optional yaw
  box(x, y, z, w, h, d, color, yaw = 0) {
    _m4.compose(_v3.set(x, y + h / 2, z), _q.setFromAxisAngle(_up, yaw), _sc.set(w, h, d));
    this.add(GM.box(), _m4, color);
  }
  // any cached geometry at a position, rotation (x, y, z euler) and scale
  geom(g, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) {
    _m4.compose(_v3.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _sc.set(sx, sy, sz));
    this.add(g, _m4, color);
  }
  // a quad from four corners (counter-clockwise seen from the front) with uvs
  quad(a, b, c, d, uvs, color, nrm) {
    const col = new THREE.Color(color === undefined ? 0xffffff : color);
    const base = this.vc;
    const pts = [a, b, c, d];
    let n = nrm;
    if (!n) { _v1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _v2.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); n = _v1.cross(_v2).normalize().toArray(); }
    for (let k = 0; k < 4; k++) { this.p.push(...pts[k]); this.n.push(n[0], n[1], n[2]); this.u.push(uvs[k * 2], uvs[k * 2 + 1]); this.c.push(col.r, col.g, col.b); }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.vc += 4;
  }
  // a flat rectangle facing up, uvs in metres / uvScale
  flat(x0, z0, x1, z1, y, color, uvScale = 0) {
    const s = uvScale || 1;
    const uvs = uvScale ? [x0 / s, -z1 / s, x1 / s, -z1 / s, x1 / s, -z0 / s, x0 / s, -z0 / s] : [0, 0, 1, 0, 1, 1, 0, 1];
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], uvs, color, [0, 1, 0]);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.vc > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere();
    return g;
  }
  get empty() { return this.vc === 0; }
}

// Wall box with facade uvs: one texture tile is 4 bays × 4 floors (16 m × 14 m). Walls go to wm, the roof to rm.
const BAY = 4, FLOOR = 3.5;
function facadeBox(wm, rm, x0, z0, x1, z1, y0, y1, color, roofColor, ou = 0) {
  const U = (m) => m / (BAY * 4), V = (m) => m / (FLOOR * 4);
  const w = x1 - x0, d = z1 - z0, h = y1 - y0, v0 = 0, v1 = V(h);
  wm.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [ou, v0, ou + U(w), v0, ou + U(w), v1, ou, v1], color, [0, 0, 1]);
  wm.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [ou + 0.5, v0, ou + 0.5 + U(w), v0, ou + 0.5 + U(w), v1, ou + 0.5, v1], color, [0, 0, -1]);
  wm.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [ou + 0.25, v0, ou + 0.25 + U(d), v0, ou + 0.25 + U(d), v1, ou + 0.25, v1], color, [1, 0, 0]);
  wm.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [ou + 0.75, v0, ou + 0.75 + U(d), v0, ou + 0.75 + U(d), v1, ou + 0.75, v1], color, [-1, 0, 0]);
  if (rm) rm.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [x0 / 8, -z1 / 8, x1 / 8, -z1 / 8, x1 / 8, -z0 / 8, x0 / 8, -z0 / 8], roofColor, [0, 1, 0]);
}

// ---------- canvas textures (small and point-sampled for the 1996 look) ----------
function canvasTex(w, h, draw, o = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.magFilter = o.smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapNearestFilter;
  return t;
}
function noiseFill(g, w, h, base, amt, n = 600, size = 1) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = Math.random() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${Math.random() * amt})`; g.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), size, size); }
}
const TEX = {};
function makeTextures() {
  // facades: a 64 px tile of 4 bays × 4 floors (16 px per bay). The Lit maps light some windows for the night.
  const litCol = () => pick(['#ffd890', '#ffe6a0', '#fff0c0', '#b8d8ff', '#ffc060']);
  const facade = (name, drawBay) => {
    const S = 16;
    TEX[name] = canvasTex(64, 64, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.save(); g.translate(i * S, j * S); drawBay(g, S, false, i, j); g.restore(); } });
    TEX[name + 'Lit'] = canvasTex(64, 64, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (Math.random() < 0.45) { g.save(); g.translate(i * S, j * S); drawBay(g, S, true, i, j); g.restore(); }
    });
  };
  facade('office', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#b8c0c8'; g.fillRect(0, 0, S, S); g.fillStyle = '#2c4460'; g.fillRect(1, 3, S - 2, S - 6); g.fillStyle = '#4a6a8a'; g.fillRect(1, 3, S - 2, 3); }
    else { g.fillStyle = litCol(); g.fillRect(1, 3, S - 2, S - 6); }
  });
  facade('tower', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#20303c'; g.fillRect(0, 0, S, S); g.fillStyle = '#3a5a70'; g.fillRect(0, 0, S, 2); g.fillStyle = '#4c6c84'; g.fillRect(2, 4, 5, 4); g.fillStyle = '#5a7a90'; g.fillRect(S - 1, 0, 1, S); }
    else { g.fillStyle = litCol(); g.fillRect(0, 3, S - 1, S - 4); }
  });
  facade('apt', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#d8ccb4'; g.fillRect(0, 0, S, S); g.fillStyle = '#3a4048'; g.fillRect(4, 4, S - 8, S - 7); g.fillStyle = '#f0ead8'; g.fillRect(3, S - 3, S - 6, 1); }
    else { g.fillStyle = litCol(); g.fillRect(4, 4, S - 8, S - 7); }
  });
  facade('brick', (g, S, lit) => {
    if (!lit) {
      g.fillStyle = '#9a4a34'; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < S; y += 3) g.fillRect(0, y, S, 1);
      g.fillStyle = '#28282c'; g.fillRect(4, 3, S - 8, S - 6); g.fillStyle = '#d8d0c0'; g.fillRect(3, S - 3, S - 6, 1);
    } else { g.fillStyle = litCol(); g.fillRect(4, 3, S - 8, S - 6); }
  });
  facade('ware', (g, S, lit, i, j) => {
    if (!lit) { g.fillStyle = '#a8aaa4'; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(0,0,0,.15)'; for (let x = 0; x < S; x += 3) g.fillRect(x, 0, 1, S); if (j === 0) { g.fillStyle = '#4a5054'; g.fillRect(2, 3, S - 4, 3); } }
    else if (j === 0 && Math.random() < 0.5) { g.fillStyle = '#ffe0a0'; g.fillRect(2, 3, S - 4, 3); }
  });
  facade('house', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#e4ddd0'; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < S; y += 2) g.fillRect(0, y, S, 1); g.fillStyle = '#3c4450'; g.fillRect(5, 4, 6, 7); g.fillStyle = '#ffffff'; g.fillRect(4, 3, 8, 1); }
    else { g.fillStyle = litCol(); g.fillRect(5, 4, 6, 7); }
  });
  facade('shop', (g, S, lit, i, j) => {
    if (!lit) {
      g.fillStyle = '#e0d4c0'; g.fillRect(0, 0, S, S);
      if (j === 3) { g.fillStyle = '#304050'; g.fillRect(1, 3, S - 2, S - 3); g.fillStyle = pick(['#c83a2a', '#2a7ac8', '#2a9a4a', '#e8a020']); g.fillRect(0, 0, S, 3); }
      else { g.fillStyle = '#3a4250'; g.fillRect(4, 4, S - 8, S - 8); }
    } else { g.fillStyle = litCol(); if (j === 3) g.fillRect(1, 3, S - 2, S - 3); else g.fillRect(4, 4, S - 8, S - 8); }
  });
  TEX.roof = canvasTex(32, 32, (g, w, h) => { noiseFill(g, w, h, '#8c8c88', 0.12, 300, 1); });
  TEX.asphalt = canvasTex(32, 32, (g, w, h) => noiseFill(g, w, h, '#4a4a4e', 0.1, 260, 1));
  // a road strip: u across the road (0..1), v along it (1 repeat = 12 m)
  TEX.road = canvasTex(32, 64, (g, w, h) => {
    noiseFill(g, w, h, '#4a4a4e', 0.1, 400, 1);
    g.fillStyle = '#e8c840'; g.fillRect(15, 0, 2, h * 0.55);
    g.fillStyle = '#d8d8d8'; g.fillRect(1, 0, 1, h); g.fillRect(w - 2, 0, 1, h);
  });
  TEX.inter = canvasTex(32, 32, (g, w, h) => { noiseFill(g, w, h, '#4a4a4e', 0.1, 260, 1); g.fillStyle = '#e0e0e0'; for (let i = 3; i < w - 3; i += 4) { g.fillRect(i, 0, 2, 3); g.fillRect(i, h - 3, 2, 3); g.fillRect(0, i, 3, 2); g.fillRect(w - 3, i, 3, 2); } });
  TEX.walk = canvasTex(16, 16, (g, w, h) => { noiseFill(g, w, h, '#b0aca4', 0.08, 60, 1); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); });
  TEX.grass = canvasTex(32, 32, (g, w, h) => { noiseFill(g, w, h, '#5a8a3a', 0.18, 500, 1); });
  TEX.field = canvasTex(32, 32, (g, w, h) => { noiseFill(g, w, h, '#8a7a3a', 0.12, 300, 1); g.fillStyle = 'rgba(60,90,20,.5)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2); });
  TEX.sand = canvasTex(32, 32, (g, w, h) => noiseFill(g, w, h, '#d8c890', 0.12, 300, 1));
  TEX.dirt = canvasTex(32, 32, (g, w, h) => noiseFill(g, w, h, '#7a6648', 0.15, 300, 1));
  TEX.rock = canvasTex(32, 32, (g, w, h) => noiseFill(g, w, h, '#7a7a70', 0.2, 400, 2));
  TEX.lot = canvasTex(32, 32, (g, w, h) => { noiseFill(g, w, h, '#5a5a5c', 0.1, 260, 1); g.fillStyle = 'rgba(255,255,255,.6)'; for (let x = 2; x < w; x += 8) g.fillRect(x, 0, 1, 10); });
  TEX.concrete = canvasTex(32, 32, (g, w, h) => { noiseFill(g, w, h, '#a4a29c', 0.08, 200, 1); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); });
  TEX.water = canvasTex(32, 32, (g, w, h) => { noiseFill(g, w, h, '#2a5a80', 0.1, 200, 1); g.fillStyle = 'rgba(200,230,255,.3)'; for (let i = 0; i < 14; i++) g.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 4, 1); });
  TEX.pad = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#5a5c60'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f0f0f0'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 26, 0, TAU); g.stroke();
    g.fillStyle = '#f0f0f0'; g.fillRect(20, 16, 6, 32); g.fillRect(38, 16, 6, 32); g.fillRect(20, 29, 24, 6);
  }, { clamp: true });
  TEX.padH = canvasTex(64, 64, (g, w, h) => { // hospital pad
    g.fillStyle = '#5a5c60'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d82828'; g.fillRect(22, 6, 20, 52); g.fillRect(6, 22, 52, 20);
    g.fillStyle = '#f0f0f0'; g.fillRect(25, 18, 4, 28); g.fillRect(35, 18, 4, 28); g.fillRect(25, 30, 14, 4);
  }, { clamp: true });
  TEX.padHome = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#4a4c50'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8c030'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4); g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
    g.strokeStyle = '#e8c030'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 24, 0, TAU); g.stroke();
    g.fillStyle = '#e8c030'; g.fillRect(21, 18, 5, 28); g.fillRect(38, 18, 5, 28); g.fillRect(21, 30, 22, 5);
  }, { clamp: true });
  TEX.glow = canvasTex(32, 32, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true, smooth: true });
  TEX.shadow = canvasTex(32, 32, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.7, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true, smooth: true });
  TEX.beam = canvasTex(16, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true, smooth: true });
  TEX.rotor = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(40,40,40,0)'); gr.addColorStop(0.2, 'rgba(40,40,40,.35)'); gr.addColorStop(0.95, 'rgba(40,40,40,.25)'); gr.addColorStop(1, 'rgba(40,40,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true, smooth: true });
  TEX.token = canvasTex(32, 32, (g, w, h) => { g.fillStyle = '#e8b820'; g.beginPath(); g.arc(16, 16, 15, 0, TAU); g.fill(); g.fillStyle = '#fff2a0'; g.beginPath(); g.arc(16, 16, 11, 0, TAU); g.fill(); g.fillStyle = '#c89010'; g.fillRect(6, 14, 20, 4); g.fillRect(14, 6, 4, 20); }, { clamp: true });
}

// ---------- sky and time of day ----------
function makeSky() {
  const g = new THREE.SphereGeometry(1, 16, 10);
  const cols = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  R.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  R.sky.scale.setScalar(1300); R.sky.renderOrder = -10; R.sky.frustumCulled = false;
  R.scene.add(R.sky);
  const sp = []; for (let i = 0; i < 500; i++) { const a = Math.random() * TAU, e = Math.random() * 1.3 + 0.08; sp.push(Math.cos(a) * Math.cos(e) * 1200, Math.sin(e) * 1200, Math.sin(a) * Math.cos(e) * 1200); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  R.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  R.stars.frustumCulled = false; R.scene.add(R.stars);
  R.sunDisc = new THREE.Mesh(GM.planeV(), new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  R.sunDisc.frustumCulled = false; R.scene.add(R.sunDisc);
}
const SKY_KEYS = [ // hour, zenith, horizon, fog, hemi sky, hemi ground, hemi I, sun colour, sun I
  [0, 0x050814, 0x14203a, 0x101a30, 0x34446e, 0x101418, 0.38, 0x8090c0, 0.2],
  [5, 0x080c1c, 0x202a44, 0x1c2438, 0x3a4a70, 0x141820, 0.4, 0x8090c0, 0.18],
  [6.2, 0x2a3a6a, 0xe89a70, 0xb08878, 0x8a90b8, 0x403830, 0.55, 0xffb080, 0.55],
  [7.5, 0x3a6ac0, 0xbcd4ec, 0xb4c8dc, 0xb8d0f0, 0x585040, 0.7, 0xfff0d8, 0.9],
  [12, 0x2a62c8, 0xb8d4f4, 0xb4cce4, 0xc4dcff, 0x5a5444, 0.75, 0xffffff, 1.0],
  [16.5, 0x3064c0, 0xc4d4ec, 0xbccce0, 0xc0d4f4, 0x585040, 0.72, 0xfff4e0, 0.95],
  [18.6, 0x34508e, 0xf09858, 0xc89070, 0xa098b8, 0x403428, 0.6, 0xffa060, 0.65],
  [19.6, 0x141c3c, 0x7a4a58, 0x4a3a4a, 0x50587a, 0x201c20, 0.46, 0xd07060, 0.32],
  [20.6, 0x060a1a, 0x18223a, 0x141c30, 0x34446c, 0x101418, 0.38, 0x8090c0, 0.2],
  [24, 0x050814, 0x14203a, 0x101a30, 0x34446e, 0x101418, 0.38, 0x8090c0, 0.2],
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function lerpHex(a, b, t) { return _c1.setHex(a).lerp(_c2.setHex(b), t).getHex(); }
function skyAt(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= h) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]);
  return { zen: lerpHex(a[1], b[1], t), hor: lerpHex(a[2], b[2], t), fog: lerpHex(a[3], b[3], t), hs: lerpHex(a[4], b[4], t), hg: lerpHex(a[5], b[5], t), hi: lerp(a[6], b[6], t), sc: lerpHex(a[7], b[7], t), si: lerp(a[8], b[8], t) };
}
// 0 by day, 1 at night: drives window lights, street lamps and the searchlight's usefulness
function nightFactor(h) { h = ((h % 24) + 24) % 24; if (h < 5.6) return 1; if (h < 7.2) return 1 - smooth(5.6, 7.2, h); if (h < 18.4) return 0; if (h < 20) return smooth(18.4, 20, h); return 1; }
let _lastSkyH = -99;
function setTimeOfDay(h, force) {
  R.hour = h; R.night = nightFactor(h);
  if (!force && Math.abs(h - _lastSkyH) < 0.02) return;
  _lastSkyH = h;
  const s = skyAt(h);
  const cols = R.sky.geometry.attributes.color, pos = R.sky.geometry.attributes.position;
  const zen = new THREE.Color(s.zen), hor = new THREE.Color(s.hor), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); c.copy(hor).lerp(zen, clamp(y * 1.6, 0, 1)); if (y < 0) c.copy(hor).multiplyScalar(0.8); cols.setXYZ(i, c.r, c.g, c.b); }
  cols.needsUpdate = true;
  R.scene.background = new THREE.Color(s.hor);
  R.scene.fog.color.setHex(s.fog);
  R.hemi.color.setHex(s.hs); R.hemi.groundColor.setHex(s.hg); R.hemi.intensity = s.hi;
  R.sun.color.setHex(s.sc); R.sun.intensity = s.si;
  R.stars.material.opacity = R.night * 0.9;
  const day = h >= 6 && h <= 19.6;
  const a = day ? ((h - 6) / 13.6) * Math.PI : (((h + 24 - 19.6) % 24) / 10.4) * Math.PI;
  R.sunDir = new V3(Math.cos(a) * 0.8, Math.max(0.25, Math.sin(a)), 0.45).normalize();
  R.sunDisc.material.color.setHex(day ? 0xfff0c8 : 0xc8d4ff);
  bus.emit('tod', h, R.night);
}
function updateSky() {
  const d = R.sunDir, c = R.camera.position;
  R.sun.position.set(c.x + d.x * 300, d.y * 300, c.z + d.z * 300);
  R.sun.target.position.set(c.x, 0, c.z); R.sun.target.updateMatrixWorld();
  R.sky.position.copy(c); R.stars.position.copy(c);
  R.sunDisc.position.set(c.x + d.x * 1100, c.y + d.y * 1100, c.z + d.z * 1100);
  R.sunDisc.scale.setScalar(R.night > 0.5 ? 45 : 80); R.sunDisc.lookAt(c);
}

// ---------- cameras ----------
function placeCam(x, y, z, lx, ly, lz) {
  let sx = 0, sy = 0;
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - 0.04); const s = CAM.shake * CAM.shake * 0.6 * (OPTS.shake ? 1 : 0); sx = (Math.random() - 0.5) * s; sy = (Math.random() - 0.5) * s; }
  R.camera.position.set(x + sx, y + sy, z);
  R.camera.up.set(0, 1, 0);
  R.camera.lookAt(lx + sx, ly + sy, lz);
  CAM.lx = lx; CAM.ly = ly; CAM.lz = lz;
}
const _proj = new V3();
function worldToScreen(x, y, z) {
  _proj.set(x, y, z).project(R.camera);
  return { x: (_proj.x + 1) * 0.5 * innerWidth, y: (1 - _proj.y) * 0.5 * innerHeight, vis: _proj.z < 1 && _proj.z > -1 };
}
