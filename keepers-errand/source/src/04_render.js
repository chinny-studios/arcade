// ---- render: renderer, scene, lights, weather tint, and the camera rig ----
// Outdoors: a fixed-angle isometric follow camera. Indoors: fixed camera positions per zone that cut as you move.
const R = {
  renderer: null, scene: null, camera: null, hemi: null, sun: null, flash: 0,
  ok: true,
};
const CAM = {
  mode: 'iso',          // iso | fixed | cine
  yaw: Math.PI / 4, pitch: 0.66, dist: 40, fov: 30,
  tx: 0, ty: 0, tz: 0,  // smoothed target
  zones: null, zone: -1,
  look: new THREE.Vector3(), cineFrom: null, cineTo: null,
  shake: 0,
  basis: { fx: 0, fz: -1, rx: 1, rz: 0 },   // input basis (kept while the stick is held through a cut)
  holdBasis: false,
};
function initRender() {
  const canvas = $('#c');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { R.ok = false; return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  R.renderer = renderer;
  const scene = new THREE.Scene();
  R.scene = scene;
  R.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 600);
  R.hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a5a3a, 0.9); scene.add(R.hemi);
  R.sun = new THREE.DirectionalLight(0xfff0d8, 0.7); R.sun.position.set(-40, 80, 30); scene.add(R.sun);
  scene.add(R.sun.target);
  R.amb = new THREE.AmbientLight(0xffffff, 0.12); scene.add(R.amb);
  scene.fog = new THREE.Fog(0x5d6b7c, 60, 170);
  scene.background = new THREE.Color(0x5d6b7c);
  addEventListener('resize', resize); resize();
  return true;
}
function resize() {
  if (!R.renderer) return;
  const w = innerWidth, h = innerHeight;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h;
  // keep the iso view a similar width on tall phone screens
  R.portrait = h > w;
  R.camera.updateProjectionMatrix();
}
// weather and indoor lighting presets
const SKIES = {
  storm: { bg: 0x4d5865, fog: [50, 150], hemi: [0xa8b8d0, 0x34402f, 0.74], sun: [0xc8d4f0, 0.34], amb: 0.1 },
  sun: { bg: 0x86bfe0, fog: [90, 260], hemi: [0xd4e6f8, 0x5a6a3e, 0.62], sun: [0xfff0d2, 0.72], amb: 0.06 },
  indoor: { bg: 0x17120e, fog: [30, 70], hemi: [0xffe2b8, 0x3b2d22, 0.42], sun: [0xffe0b0, 0.22], amb: 0.12 },
  lighthouse: { bg: 0x0d1418, fog: [24, 60], hemi: [0x9fb6c8, 0x22201a, 0.5], sun: [0xb0c8ff, 0.25], amb: 0.16 },
  lamp: { bg: 0x10141c, fog: [30, 80], hemi: [0xc0d0ff, 0x30283a, 0.6], sun: [0xffd8a0, 0.4], amb: 0.18 },
};
function applySky(name) {
  const s = SKIES[name] || SKIES.storm;
  R.skyName = name; R.skyBase = s;
  R.scene.background.setHex(s.bg); R.scene.fog.color.setHex(s.bg);
  R.scene.fog.near = s.fog[0]; R.scene.fog.far = s.fog[1];
  R.hemi.color.setHex(s.hemi[0]); R.hemi.groundColor.setHex(s.hemi[1]); R.hemi.intensity = s.hemi[2];
  R.sun.color.setHex(s.sun[0]); R.sun.intensity = s.sun[1]; R.amb.intensity = s.amb;
}
function lightning(strength = 1) { R.flash = Math.max(R.flash, strength); }

// set the camera for the current area. zones: [{ box: [x0, z0, x1, z1], pos: [x, y, z], fov }]
function camIso(snap) { CAM.mode = 'iso'; CAM.zones = null; CAM.zone = -1; if (snap) CAM.snap = true; }
function camFixed(zones) { CAM.mode = 'fixed'; CAM.zones = zones; CAM.zone = -1; CAM.snap = true; }
function camCine(pos, look, dur = 0) {
  CAM.mode = 'cine';
  CAM.cineFrom = { pos: R.camera.position.clone(), look: CAM.look.clone(), t: 0, dur };
  CAM.cineTo = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) };
  if (!dur) CAM.cineFrom.t = 1;
}
function updateCamera(dt, hero) {
  const cam = R.camera;
  const hx = hero.x, hy = hero.y, hz = hero.z;
  if (CAM.mode === 'iso') {
    const k = CAM.snap ? 1 : 1 - Math.exp(-dt * 4.5);
    // lead the camera a little in the direction of travel
    CAM.tx = lerp(CAM.tx, hx + hero.vx * 0.35, k); CAM.tz = lerp(CAM.tz, hz + hero.vz * 0.35, k);
    CAM.ty = lerp(CAM.ty, hy, CAM.snap ? 1 : 1 - Math.exp(-dt * 2.5));
    const d = CAM.dist * (R.portrait ? 1.35 : 1);
    const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
    cam.position.set(CAM.tx + Math.sin(CAM.yaw) * cp * d, CAM.ty + 1 + sp * d, CAM.tz + Math.cos(CAM.yaw) * cp * d);
    CAM.look.set(CAM.tx, CAM.ty + 1, CAM.tz);
    cam.fov = CAM.fov;
    CAM.snap = false;
  } else if (CAM.mode === 'fixed') {
    let zi = CAM.zone;
    const zs = CAM.zones;
    const inZone = (z) => hx >= z.box[0] && hx <= z.box[2] && hz >= z.box[1] && hz <= z.box[3];
    if (zi < 0 || !inZone(zs[zi])) { for (let i = 0; i < zs.length; i++) if (inZone(zs[i])) { zi = i; break; } }
    if (zi < 0) zi = 0;
    const cut = zi !== CAM.zone;
    CAM.zone = zi;
    const z = zs[zi];
    cam.position.set(z.pos[0], z.pos[1], z.pos[2]);
    const tx = z.lockLook ? z.lockLook[0] : hx, ty = z.lockLook ? z.lockLook[1] : hy + 1, tz = z.lockLook ? z.lockLook[2] : hz;
    const k = cut || CAM.snap ? 1 : 1 - Math.exp(-dt * 3);
    CAM.look.set(lerp(CAM.look.x, tx, k), lerp(CAM.look.y, ty, k), lerp(CAM.look.z, tz, k));
    cam.fov = z.fov || 50;
    CAM.snap = false;
  } else if (CAM.mode === 'cine') {
    const f = CAM.cineFrom, to = CAM.cineTo;
    if (f.dur) f.t = Math.min(1, f.t + dt / f.dur);
    const e = f.t < 1 ? f.t * f.t * (3 - 2 * f.t) : 1;
    cam.position.lerpVectors(f.pos, to.pos, e);
    CAM.look.lerpVectors(f.look, to.look, e);
  }
  if (CAM.shake > 0 && OPTS.shake) {
    CAM.shake = Math.max(0, CAM.shake - dt);
    const s = CAM.shake * 0.6;
    cam.position.x += rnd(-s, s); cam.position.y += rnd(-s, s); cam.position.z += rnd(-s, s);
  }
  cam.lookAt(CAM.look);
  cam.updateProjectionMatrix();
  // input basis: forward is the camera's view direction on the ground
  if (!CAM.holdBasis) {
    let fx = CAM.look.x - cam.position.x, fz = CAM.look.z - cam.position.z;
    const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
    CAM.basis = { fx, fz, rx: -fz, rz: fx };
  }
}

// buildings that hide the hero fade out. Each entry: { mats: [Material], box: THREE.Box3, op }
const Fader = {
  list: [],
  add(obj) {
    const mats = [];
    obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    this.list.push({ obj, mats, box, op: 1 });
  },
  clear() { this.list.length = 0; },
  _ray: new THREE.Ray(), _v: new THREE.Vector3(),
  update(dt, hero) {
    if (CAM.mode !== 'iso') return;
    const cam = R.camera.position;
    const tgt = this._v.set(hero.x, hero.y + 1, hero.z);
    const dir = tgt.clone().sub(cam); const len = dir.length(); dir.normalize();
    this._ray.set(cam, dir);
    for (const f of this.list) {
      if (!f.obj.visible) continue;
      const hit = this._ray.intersectBox(f.box, this._v.clone());
      const hide = hit && hit.distanceTo(cam) < len - 0.8 && !(hero.y > f.box.max.y - 0.3);
      const want = hide ? 0.22 : 1;
      if (Math.abs(f.op - want) > 0.01) {
        f.op = approach(f.op, want, dt * 3);
        for (const m of f.mats) { m.opacity = f.op; m.depthWrite = f.op > 0.95; }
      }
    }
  },
};

function renderFrame(dt) {
  // lightning flash decays in real time
  if (R.flash > 0) {
    R.flash = Math.max(0, R.flash - dt * 3.2);
    const b = R.skyBase, f = R.flash;
    R.hemi.intensity = b.hemi[2] + f * 1.6;
    R.scene.background.setHex(b.bg).lerp(new THREE.Color(0xdde6ff), f * 0.5);
    R.scene.fog.color.copy(R.scene.background);
  }
  R.renderer.render(R.scene, R.camera);
}
