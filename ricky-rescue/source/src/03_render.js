// Ricky Rescue — renderer, scene, lights, day/night, materials, canvas textures, geometry merging, cameras

const R = {
  renderer: null, scene: null, camera: null, hemi: null, sun: null, head: null, eLights: [], sky: null, stars: null,
  quality: 1, shadows: false, night: 0, dusk: 0, hour: 9, env: 'city',
};
const CAM = { mode: 'chase', yaw: 0, pitch: 0.32, dist: 11, tx: 0, ty: 0, tz: 0, x: 0, y: 30, z: 30, shake: 0, orbitT: 0, far: false, userYaw: 0, userPitch: 0 };

function initRender() {
  const canvas = $('#c');
  let renderer = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
  if (!renderer) { $('#nogl').hidden = false; throw new Error('WebGL unavailable'); }
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 1400);
  R.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x50483c, 0.7);
  R.sun = new THREE.DirectionalLight(0xffffff, 0.9);
  R.sun.shadow.mapSize.set(1024, 1024);
  const sc = R.sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 260;
  R.sun.shadow.bias = -0.0006; R.sun.shadow.normalBias = 0.02;
  R.scene.add(R.hemi, R.sun, R.sun.target);
  // the rig's headlights and two emergency lights: always present so shaders never recompile
  R.head = new THREE.SpotLight(0xfff2d8, 0, 70, 0.55, 0.5, 1.4);
  R.scene.add(R.head, R.head.target);
  for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xff2020, 0, 18, 2); R.eLights.push(l); R.scene.add(l); }
  R.ptLight = new THREE.PointLight(0xfff0dc, 0, 16, 1.5); R.scene.add(R.ptLight); // interiors
  makeSky();
  addEventListener('resize', resize);
  resize();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  const pr = Math.min(devicePixelRatio || 1, R.quality >= 2 ? 2 : R.quality === 1 ? 1.25 : 0.85);
  R.renderer.setPixelRatio(pr);
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h;
  R.camera.fov = w / h < 1 ? 70 : 55;
  R.camera.updateProjectionMatrix();
  bus.emit('resize', w, h);
}

function setQuality(q) {
  R.quality = q;
  R.shadows = q >= 1;
  R.renderer.shadowMap.enabled = R.shadows;
  R.sun.castShadow = R.shadows;
  const ms = q >= 2 ? 2048 : 1024;
  R.sun.shadow.mapSize.set(ms, ms);
  if (R.sun.shadow.map) { R.sun.shadow.map.dispose(); R.sun.shadow.map = null; }
  R.scene.traverse((o) => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach((x) => { x.needsUpdate = true; }); } });
  R.camera.far = q === 0 ? 700 : 1400; R.camera.updateProjectionMatrix();
  resize();
}

// ---------- materials ----------
const MATS = new Map();
function mat(color, o = {}) {
  const k = [color, o.e || 0, o.ei || 0, o.t ? o.o : 1, o.flat ? 1 : 0, o.basic ? 1 : 0, o.add ? 1 : 0, o.ds ? 1 : 0, o.vc ? 1 : 0, o.map ? o.map.uuid : '', o.emap ? o.emap.uuid : '', o.fog === false ? 0 : 1, o.dt === false ? 0 : 1].join('|');
  let m = MATS.get(k);
  if (m) return m;
  const common = { color, transparent: !!o.t, opacity: o.t ? o.o : 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide, vertexColors: !!o.vc };
  if (o.map) common.map = o.map;
  if (o.basic) m = new THREE.MeshBasicMaterial(Object.assign(common, { blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.t, fog: o.fog !== false && !o.add, depthTest: o.dt !== false }));
  else m = new THREE.MeshLambertMaterial(Object.assign(common, { emissive: o.e || 0, emissiveIntensity: o.ei === undefined ? 1 : o.ei, flatShading: !!o.flat, emissiveMap: o.emap || null }));
  MATS.set(k, m);
  return m;
}
const glowMat = (color, o = 0.9) => mat(color, { basic: true, t: true, o, add: true });

// ---------- geometry cache ----------
const GEO = {};
function geo(k, make) { return GEO[k] || (GEO[k] = make()); }
const GM = {
  box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  boxB: () => geo('boxB', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), // origin at the bottom
  sph: () => geo('sph', () => new THREE.SphereGeometry(0.5, 12, 9)),
  sphLo: () => geo('sphLo', () => new THREE.IcosahedronGeometry(0.5, 1)),
  cyl: () => geo('cyl', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12)),
  cyl8: () => geo('cyl8', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
  cylB: () => geo('cylB', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0)),
  cone: () => geo('cone', () => new THREE.ConeGeometry(0.5, 1, 8)),
  wheel: () => geo('wheel', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateZ(Math.PI / 2)),
  plane: () => geo('plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), // flat on the ground
  planeV: () => geo('planeV', () => new THREE.PlaneGeometry(1, 1)),
  disc: () => geo('disc', () => new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2)),
  ring: () => geo('ring', () => new THREE.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2)),
  caps: () => geo('caps', () => new THREE.CylinderGeometry(0.5, 0.42, 1, 10)),
};
function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; }
function shadowy(o, cast = true, recv = true) { o.traverse((c) => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; }

// ---------- geometry merging ----------
// Collects transformed geometry into one BufferGeometry with position, normal, uv and color.
class Merger {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; this.vc = 0; }
  // add a THREE geometry with a matrix and a colour
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
  // a flat rectangle facing up (road markings): two triangles instead of a box's twelve
  flat(x, y, z, w, d, color) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yy = y + 0.006;
    this.quad([x0, yy, z1], [x1, yy, z1], [x1, yy, z0], [x0, yy, z0], [0, 0, 1, 0, 1, 1, 0, 1], color, [0, 1, 0]);
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
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _sc = new V3(), _up = new V3(0, 1, 0);

// Wall box with facade UVs in metres (u: bayW per texture column, v: floorH per row) and a separate roof.
// walls → wm, roof → rm. Faces: four sides and the top.
function facadeBox(wm, rm, x0, z0, x1, z1, y0, y1, color, roofColor, bayW, floorH, texBays = 8) {
  const U = (m) => m / (bayW * texBays), V = (m) => m / (floorH * texBays);
  const w = x1 - x0, d = z1 - z0, h = y1 - y0;
  const vo = V(y0) * 0; // keep ground floor at row 0
  // south (+z)
  wm.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, vo, U(w), vo, U(w), V(h), 0, V(h)], color, [0, 0, 1]);
  // north (-z)
  wm.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0.37, vo, 0.37 + U(w), vo, 0.37 + U(w), V(h), 0.37, V(h)], color, [0, 0, -1]);
  // east (+x)
  wm.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [0.61, vo, 0.61 + U(d), vo, 0.61 + U(d), V(h), 0.61, V(h)], color, [1, 0, 0]);
  // west (-x)
  wm.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [0.13, vo, 0.13 + U(d), vo, 0.13 + U(d), V(h), 0.13, V(h)], color, [-1, 0, 0]);
  if (rm) rm.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 0, w / 8, 0, w / 8, d / 8, 0, d / 8], roofColor, [0, 1, 0]);
}

// ---------- canvas textures ----------
function canvasTex(w, h, draw, o = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (o.nearest) { t.magFilter = THREE.NearestFilter; }
  return t;
}
function noiseFill(g, w, h, base, amt, n = 2000, size = 2) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = Math.random(); g.fillStyle = `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${Math.random() * amt})`; g.fillRect(Math.random() * w, Math.random() * h, size, size); }
}
const TEX = {};
function makeTextures() {
  // facades: 8 bays × 8 floors per texture. The "lit" emissive maps light a random set of windows.
  const facade = (name, drawBay) => {
    const S = 64;
    TEX[name] = canvasTex(S * 8, S * 8, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.save(); g.translate(i * S, j * S); drawBay(g, S, false, i, j); g.restore(); } });
    TEX[name + 'Lit'] = canvasTex(S * 8, S * 8, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S * 8, S * 8);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { if (Math.random() < 0.42) { g.save(); g.translate(i * S, j * S); drawBay(g, S, true, i, j); g.restore(); } }
    });
  };
  const litCol = () => pick(['#ffd890', '#ffe6b0', '#fff2d0', '#c8e0ff', '#ffc070']);
  facade('office', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#d8dce0'; g.fillRect(0, 0, S, S); g.fillStyle = '#3a4a5c'; g.fillRect(2, 8, S - 4, S - 16); g.fillStyle = 'rgba(160,200,230,.35)'; g.fillRect(2, 8, S - 4, 10); g.fillStyle = '#9aa4ae'; g.fillRect(S / 2 - 1, 8, 2, S - 16); }
    else { g.fillStyle = litCol(); g.fillRect(2, 8, S - 4, S - 16); }
  });
  facade('apt', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#e8e2d8'; g.fillRect(0, 0, S, S); g.fillStyle = '#2e3a48'; g.fillRect(14, 14, S - 28, S - 24); g.fillStyle = '#f8f4ec'; g.fillRect(11, S - 11, S - 22, 4); g.fillStyle = 'rgba(180,210,240,.3)'; g.fillRect(14, 14, S - 28, 8); }
    else { g.fillStyle = litCol(); g.fillRect(14, 14, S - 28, S - 24); }
  });
  facade('brick', (g, S, lit) => {
    if (!lit) {
      g.fillStyle = '#d0c4bc'; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < S; y += 6) g.fillRect(0, y, S, 1);
      for (let y = 0; y < S; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < S; x += 12) g.fillRect(x, y, 1, 6);
      g.fillStyle = '#28323c'; g.fillRect(18, 12, S - 36, S - 22); g.fillStyle = '#e8e0d0'; g.fillRect(16, S - 10, S - 32, 3); g.fillRect(16, 9, S - 32, 3);
    } else { g.fillStyle = litCol(); g.fillRect(18, 12, S - 36, S - 22); }
  });
  facade('ware', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#d8d8d4'; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < S; x += 8) g.fillRect(x, 0, 2, S); g.fillStyle = '#4a5560'; g.fillRect(6, 6, S - 12, 10); }
    else if (Math.random() < 0.4) { g.fillStyle = '#ffe0a0'; g.fillRect(6, 6, S - 12, 10); }
  });
  facade('house', (g, S, lit) => {
    if (!lit) { g.fillStyle = '#eeeae4'; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(0,0,0,.07)'; for (let y = 0; y < S; y += 5) g.fillRect(0, y, S, 1); g.fillStyle = '#34404c'; g.fillRect(20, 16, S - 40, S - 30); g.fillStyle = '#fafafa'; g.fillRect(18, 14, S - 36, 2); g.fillRect(18, S - 14, S - 36, 2); g.fillRect(S / 2 - 1, 16, 2, S - 30); }
    else { g.fillStyle = litCol(); g.fillRect(20, 16, S - 40, S - 30); }
  });
  facade('shop', (g, S, lit, i, j) => {
    if (!lit) {
      g.fillStyle = '#ece6dc'; g.fillRect(0, 0, S, S);
      if (j === 7) { g.fillStyle = '#3a4a58'; g.fillRect(3, 10, S - 6, S - 12); g.fillStyle = 'rgba(200,230,255,.3)'; g.fillRect(3, 10, S - 6, 12); }
      else { g.fillStyle = '#34404c'; g.fillRect(16, 14, S - 32, S - 26); }
    } else { g.fillStyle = litCol(); if (j === 7) g.fillRect(3, 10, S - 6, S - 12); else g.fillRect(16, 14, S - 32, S - 26); }
  });
  TEX.roof = canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, '#8a8c90', 0.08, 900, 2); g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(0.5, 0.5, w - 1, h - 1); });
  TEX.asphalt = canvasTex(256, 256, (g, w, h) => noiseFill(g, w, h, '#3e4044', 0.07, 5000, 2));
  // road strips: u across the road (0..1 = full width), v along it (1 repeat = 12 m)
  const road = (lanes) => canvasTex(256, 512, (g, w, h) => {
    noiseFill(g, w, h, '#3c3e42', 0.07, 6000, 2);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(w * 0.18, 0, w * 0.12, h); g.fillRect(w * 0.7, 0, w * 0.12, h);
    g.fillStyle = '#e8c23a'; g.fillRect(w / 2 - 7, 0, 4, h); g.fillRect(w / 2 + 3, 0, 4, h);
    g.fillStyle = '#e8e8e8';
    const edge = lanes === 2 ? 0.07 : 0.06;
    g.fillRect(w * edge, 0, 3, h); g.fillRect(w * (1 - edge) - 3, 0, 3, h);
    if (lanes === 4) for (const f of [0.28, 0.72]) for (let y = 0; y < h; y += h / 2) g.fillRect(w * f - 2, y, 4, h * 0.25);
  });
  TEX.road2 = road(2); TEX.road4 = road(4);
  TEX.walk = canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, '#b4b0a8', 0.06, 1500, 2); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); });
  TEX.grass = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#5f8a42', 0.1, 6000, 3);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${40 + Math.random() * 40},${90 + Math.random() * 50},30,.25)`; g.fillRect(Math.random() * w, Math.random() * h, 6, 6); }
  });
  TEX.water = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a5a7a'); gr.addColorStop(1, '#1e4a68'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 220; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 20, 1); } });
  TEX.lot = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#55575a', 0.06, 4000, 2); g.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 8; x < w; x += 32) g.fillRect(x, 0, 2, 60); });
  TEX.glow = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true });
  TEX.cone = canvasTex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true });
  TEX.arrow = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 8, h - 18); g.lineTo(w / 2, h - 30); g.lineTo(8, h - 18); g.closePath(); g.fill(); }, { clamp: true });
  TEX.floorWood = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#a07850', 0.08, 2000, 2); g.fillStyle = 'rgba(60,30,10,.25)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2); for (let y = 0; y < h; y += 32) g.fillRect(((y / 32) * 97) % w, y, 2, 32); });
  TEX.floorTile = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#d8d8d2', 0.05, 1000, 2); g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < w; i += 64) { g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 2); } });
  TEX.carpet = canvasTex(128, 128, (g, w, h) => noiseFill(g, w, h, '#7a6a5a', 0.12, 3000, 2));
}

// ---------- sky and time of day ----------
function makeSky() {
  const g = new THREE.SphereGeometry(1, 24, 12);
  const cols = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  R.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  R.sky.scale.setScalar(1100); R.sky.renderOrder = -10; R.sky.frustumCulled = false;
  R.scene.add(R.sky);
  const sp = []; for (let i = 0; i < 700; i++) { const a = Math.random() * TAU, e = Math.random() * 1.3 + 0.08; sp.push(Math.cos(a) * Math.cos(e) * 1000, Math.sin(e) * 1000, Math.sin(a) * Math.cos(e) * 1000); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  R.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  R.stars.frustumCulled = false; R.scene.add(R.stars);
  R.sunDisc = new THREE.Mesh(GM.planeV(), new THREE.MeshBasicMaterial({ map: null, color: 0xfff4d0, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  R.sunDisc.frustumCulled = false; R.scene.add(R.sunDisc);
}
const SKY_KEYS = [ // hour, zenith, horizon, fog, hemi sky, hemi ground, hemi I, sun colour, sun I
  [0, 0x050812, 0x0f1828, 0x0e1626, 0x30406a, 0x101418, 0.32, 0x8090c0, 0.18],
  [5, 0x080c1a, 0x1c2438, 0x1a2234, 0x3a4a70, 0x141820, 0.34, 0x8090c0, 0.16],
  [6.2, 0x2a3a6a, 0xe89a70, 0xb08878, 0x8a90b8, 0x403830, 0.5, 0xffb080, 0.5],
  [7.5, 0x4a7ac8, 0xbcd4ec, 0xb4c8dc, 0xb8d0f0, 0x585040, 0.68, 0xfff0d8, 0.85],
  [12, 0x3a72d0, 0xc4dcf4, 0xbcd0e4, 0xc4dcff, 0x5a5444, 0.72, 0xffffff, 1.0],
  [16.5, 0x4070c4, 0xc8d8ec, 0xc0cce0, 0xc0d4f4, 0x585040, 0.7, 0xfff4e0, 0.9],
  [18.6, 0x34508e, 0xf0a060, 0xc89070, 0xa098b8, 0x403428, 0.56, 0xffa060, 0.6],
  [19.6, 0x141c3c, 0x7a4a58, 0x4a3a4a, 0x50587a, 0x201c20, 0.42, 0xd07060, 0.3],
  [20.6, 0x060a18, 0x141c30, 0x121a2c, 0x34446c, 0x101418, 0.34, 0x8090c0, 0.18],
  [24, 0x050812, 0x0f1828, 0x0e1626, 0x30406a, 0x101418, 0.32, 0x8090c0, 0.18],
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function lerpHex(a, b, t) { return _c1.setHex(a).lerp(_c2.setHex(b), t).getHex(); }
function skyAt(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= h) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]);
  return { zen: lerpHex(a[1], b[1], t), hor: lerpHex(a[2], b[2], t), fog: lerpHex(a[3], b[3], t), hs: lerpHex(a[4], b[4], t), hg: lerpHex(a[5], b[5], t), hi: lerp(a[6], b[6], t), sc: lerpHex(a[7], b[7], t), si: lerp(a[8], b[8], t) };
}
// 0 by day, 1 at night: drives window lights, street lamps and headlights
function nightFactor(h) { h = ((h % 24) + 24) % 24; if (h < 5.6) return 1; if (h < 7.2) return 1 - smooth(5.6, 7.2, h); if (h < 18.4) return 0; if (h < 20) return smooth(18.4, 20, h); return 1; }
function setTimeOfDay(h) {
  R.hour = h; const s = skyAt(h); R.night = nightFactor(h);
  if (R.env !== 'city') return;
  const cols = R.sky.geometry.attributes.color, pos = R.sky.geometry.attributes.position;
  const zen = new THREE.Color(s.zen), hor = new THREE.Color(s.hor), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); c.copy(hor).lerp(zen, clamp(y * 1.6, 0, 1)); if (y < 0) c.copy(hor).multiplyScalar(0.8); cols.setXYZ(i, c.r, c.g, c.b); }
  cols.needsUpdate = true;
  R.scene.background = new THREE.Color(s.hor);
  if (!R.scene.fog) R.scene.fog = new THREE.Fog(s.fog, 120, 640);
  R.scene.fog.color.setHex(s.fog);
  R.scene.fog.near = R.quality === 0 ? 80 : 140; R.scene.fog.far = R.quality === 0 ? 480 : 700;
  R.hemi.color.setHex(s.hs); R.hemi.groundColor.setHex(s.hg); R.hemi.intensity = s.hi;
  R.sun.color.setHex(s.sc); R.sun.intensity = s.si;
  R.stars.material.opacity = R.night * 0.9;
  // sun (or moon) direction: rises in the east (+x), sets in the west
  const day = h >= 6 && h <= 19.6;
  const a = day ? ((h - 6) / 13.6) * Math.PI : (((h + 24 - 19.6) % 24) / 10.4) * Math.PI;
  R.sunDir = new V3(Math.cos(a) * 0.8, Math.max(0.25, Math.sin(a)), 0.45).normalize();
  R.sunDisc.material.color.setHex(day ? 0xfff0c8 : 0xc8d4ff);
  R.sunDisc.material.opacity = day ? 0.9 : 0.6;
  bus.emit('tod', h, R.night);
}
// interiors (a building, the back of the rig) use their own fixed lighting
function setEnv(env) {
  R.env = env;
  const city = env === 'city';
  R.sky.visible = R.stars.visible = R.sunDisc.visible = city;
  if (city) { R.ptLight.intensity = 0; setTimeOfDay(R.hour); return; }
  R.scene.background = new THREE.Color(0x101216);
  R.scene.fog.color.setHex(0x101216); R.scene.fog.near = 40; R.scene.fog.far = 90;
  R.hemi.color.setHex(0xfff4e8); R.hemi.groundColor.setHex(0x5a5048); R.hemi.intensity = env === 'rig' ? 0.75 : 0.62;
  R.sun.intensity = env === 'rig' ? 0.05 : 0.35; R.sun.color.setHex(0xfff0e0);
  R.ptLight.intensity = env === 'rig' ? 1.1 : 0.9;
}
function updateSunFollow(x, z) {
  if (!R.sunDir) return;
  const d = R.sunDir;
  R.sun.position.set(x + d.x * 150, d.y * 150, z + d.z * 150);
  R.sun.target.position.set(x, 0, z);
  R.sun.target.updateMatrixWorld();
  R.sky.position.copy(R.camera.position); R.stars.position.copy(R.camera.position);
  R.sunDisc.position.set(R.camera.position.x + d.x * 900, R.camera.position.y + d.y * 900, R.camera.position.z + d.z * 900);
  R.sunDisc.scale.setScalar(R.night > 0.5 ? 40 : 70); R.sunDisc.lookAt(R.camera.position);
}

// ---------- cameras ----------
// chase: behind and above a vehicle; foot: an orbit around Ricky; fixed: set by a scene (care view, rig interior)
function camChase(dt, x, z, yaw, speed, len) {
  const far = CAM.far;
  const dist = (far ? 17 : 10.5) + Math.min(5, Math.abs(speed) * 0.12) + len * 0.4;
  const hgt = far ? 7.5 : 4.4;
  CAM.orbitT = Math.max(0, CAM.orbitT - dt);
  if (CAM.orbitT <= 0) { CAM.userYaw = lerp(CAM.userYaw, 0, 1 - Math.exp(-dt * 2.5)); CAM.userPitch = lerp(CAM.userPitch, 0, 1 - Math.exp(-dt * 2.5)); }
  const back = speed < -1 ? yaw : yaw + Math.PI; // reversing: look forward over the bonnet
  CAM.yaw = angTo(CAM.yaw, back, dt * (2.5 + Math.abs(angWrap(back - CAM.yaw)) * 2.5));
  const ya = CAM.yaw + CAM.userYaw;
  const p = clamp(0.32 + CAM.userPitch, 0.05, 1.2);
  const cx = x + Math.sin(ya) * Math.cos(p) * dist, cz = z + Math.cos(ya) * Math.cos(p) * dist, cy = hgt + Math.sin(p) * dist * 0.55;
  const k = CAM.snap ? 1 : 1 - Math.exp(-dt * 8);
  const c = camBlock(x, z, cx, cy, cz);
  CAM.x = lerp(CAM.x, c.x, k); CAM.y = lerp(CAM.y, c.y, k); CAM.z = lerp(CAM.z, c.z, k);
  placeCam(CAM.x, CAM.y, CAM.z, x - Math.sin(yaw) * 2.5, 1.8, z - Math.cos(yaw) * 2.5);
}
function camOrbit(dt, x, y, z, dist, pitchBase = 0.42) {
  CAM.orbitT = Math.max(0, CAM.orbitT - dt);
  const p = clamp(pitchBase + CAM.userPitch, 0.08, 1.35);
  const ya = CAM.userYaw;
  const cx = x + Math.sin(ya) * Math.cos(p) * dist, cz = z + Math.cos(ya) * Math.cos(p) * dist, cy = y + Math.sin(p) * dist;
  const k = CAM.snap ? 1 : 1 - Math.exp(-dt * 10);
  const c = camBlock(x, z, cx, cy, cz, y);
  CAM.x = lerp(CAM.x, c.x, k); CAM.y = lerp(CAM.y, c.y, k); CAM.z = lerp(CAM.z, c.z, k);
  placeCam(CAM.x, CAM.y, CAM.z, x, y + 0.9, z);
}
function snapCam() { CAM.snap = true; }
// pull the camera in front of any building between it and the target
function camBlock(tx, tz, cx, cy, cz, ty = 0) {
  const d = Math.hypot(cx - tx, cz - tz), n = Math.ceil(d / 0.8);
  for (let i = 2; i <= n; i++) {
    const u = i / n, x = lerp(tx, cx, u), z = lerp(tz, cz, u), y = lerp(ty + 1.5, cy, u);
    const s = insideSolid(x, z, 0.4);
    if (s && !s.r && s.tag !== 'water' && s.h > y - 0.5 && (s.tag !== undefined || s.h > 2.5)) { const v = Math.max(0.15, (i - 1.5) / n); return { x: lerp(tx, cx, v), y: lerp(ty + 1.5, cy, v) + (1 - v) * 1.5, z: lerp(tz, cz, v) }; }
  }
  return { x: cx, y: cy, z: cz };
}
function placeCam(x, y, z, lx, ly, lz) {
  if (CAM.snap) { CAM.snap = false; }
  let sx = 0, sy = 0;
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - 0.05); const s = CAM.shake * CAM.shake * 0.4 * (OPTS.shake ? 1 : 0); sx = (Math.random() - 0.5) * s; sy = (Math.random() - 0.5) * s; }
  R.camera.position.set(x + sx, y + sy, z);
  R.camera.lookAt(lx + sx, ly + sy, lz);
}
const _proj = new V3();
function worldToScreen(x, y, z) {
  _proj.set(x, y, z).project(R.camera);
  return { x: (_proj.x + 1) * 0.5 * innerWidth, y: (1 - _proj.y) * 0.5 * innerHeight, vis: _proj.z < 1 && _proj.z > -1 };
}
