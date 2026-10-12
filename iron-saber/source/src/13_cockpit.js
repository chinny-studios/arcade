// Iron Saber — cockpits, rendered as a second 3D layer over the world:
//  * panoramic: an all-round monitor sphere, the pilot's seat, sticks, arms and legs (Valiant, Swift)
//  * classic: a cramped box with one forward screen, CRT side panels and banks of switches (Bastion, Ogre)

const cockScene = new THREE.Scene();
const cockCam = new THREE.PerspectiveCamera(70, 16 / 9, 0.02, 30);
cockCam.rotation.order = 'YXZ';
cockScene.add(new THREE.AmbientLight(0x9aa6b8, 0.55));
const cockKey = new THREE.DirectionalLight(0xffffff, 0.55);
cockKey.position.set(0.3, 1, 0.6);
cockScene.add(cockKey);
const cockGlow = new THREE.PointLight(0x7dffb0, 0.3, 2.5);
cockGlow.position.set(0, -0.3, -0.6);
cockScene.add(cockGlow);

const ckMat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 20 });
const ckPanelMat = new THREE.MeshPhongMaterial({ color: 0x5a6150, flatShading: true, shininess: 10 });
const ckDarkMat = new THREE.MeshPhongMaterial({ color: 0x2b2e2c, flatShading: true, shininess: 10 });
const ckMesh = (parts, mat = ckMat) => new THREE.Mesh(mergeParts(parts.map((p) => p.k ? realize(p) : p)), mat);

// ---------- displays (canvas textures shared by both cockpits) ----------
const DISP = [];
function makeDisplay(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  const d = { cv, ctx: cv.getContext('2d'), tex, mat: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) };
  DISP.push(d);
  return d;
}
const dispRadar = makeDisplay(256, 256), dispStatus = makeDisplay(256, 256), dispSys = makeDisplay(256, 128);

// pilot body in a white normal suit
function pilotBody(parts, suitCol, gloveCol) {
  for (const sg of [1, -1]) {
    // legs to the pedals
    parts.push({ geo: chamferBox(0.15, 0.15, 0.5, 0.04), p: [sg * 0.13, -0.58, -0.18], r: [0.08, 0, 0], c: suitCol });
    parts.push({ geo: chamferBox(0.13, 0.46, 0.14, 0.04), p: [sg * 0.15, -0.84, -0.45], r: [0.35, 0, 0], c: suitCol });
    parts.push({ geo: chamferBox(0.13, 0.1, 0.28, 0.03), p: [sg * 0.15, -1.08, -0.58], c: [0.2, 0.2, 0.22] });
    // arms to the grips
    parts.push({ geo: chamferBox(0.11, 0.11, 0.3, 0.03), p: [sg * 0.29, -0.3, -0.02], r: [0.55, 0, sg * 0.15], c: suitCol });
    parts.push({ geo: chamferBox(0.1, 0.1, 0.3, 0.03), p: [sg * 0.35, -0.38, -0.24], r: [-0.25, 0, 0], c: suitCol });
    parts.push({ geo: chamferBox(0.1, 0.09, 0.12, 0.03), p: [sg * 0.36, -0.33, -0.39], c: gloveCol });
  }
  parts.push({ geo: chamferBox(0.36, 0.2, 0.3, 0.06), p: [0, -0.52, 0.06], c: suitCol });
}

// ---------- panoramic cockpit ----------
const pano = new THREE.Group();
(function () {
  const W = [0.68, 0.7, 0.74], B = [0.2, 0.32, 0.62], G = [0.33, 0.35, 0.39], D = [0.15, 0.16, 0.18], GL = [0.26, 0.27, 0.3];
  const parts = [];
  // seat and armrests
  parts.push({ geo: chamferBox(0.56, 0.12, 0.55, 0.04), p: [0, -0.66, 0.05], c: D }, { geo: chamferBox(0.56, 0.9, 0.14, 0.05), p: [0, -0.2, 0.36], r: [-0.12, 0, 0], c: D });
  for (const sg of [1, -1]) {
    parts.push({ geo: chamferBox(0.14, 0.1, 0.62, 0.03), p: [sg * 0.38, -0.47, -0.08], c: G });
    parts.push({ geo: chamferBox(0.16, 0.24, 0.5, 0.03), p: [sg * 0.38, -0.6, -0.08], c: D });
    // control stick and grip
    parts.push({ geo: new THREE.CylinderGeometry(0.02, 0.025, 0.12, 6), p: [sg * 0.37, -0.39, -0.34], c: G });
    parts.push({ geo: chamferBox(0.07, 0.13, 0.08, 0.02), p: [sg * 0.37, -0.31, -0.37], r: [0.25, 0, 0], c: D });
    parts.push({ geo: chamferBox(0.03, 0.03, 0.03, 0.005), p: [sg * 0.37, -0.24, -0.39], c: sg > 0 ? [0.9, 0.2, 0.2] : [0.95, 0.75, 0.2] });
    // side consoles
    parts.push({ geo: chamferBox(0.3, 0.05, 0.4, 0.02), p: [sg * 0.62, -0.52, -0.32], r: [0, sg * 0.4, sg * -0.25], c: G });
  }
  // the front console ring hugging the bottom of the sphere
  parts.push({ geo: chamferBox(1.3, 0.06, 0.32, 0.02), p: [0, -0.7, -0.78], r: [0.35, 0, 0], c: G });
  pilotBody(parts, W, GL);
  parts.push({ geo: chamferBox(0.12, 0.05, 0.12, 0.02), p: [0.1, -0.46, -0.05], c: B });
  pano.add(ckMesh(parts));
  // little screens on the console and side panels
  const scr = (d, w, h, x, y, z, rx, ry, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), d.mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz, 'YXZ'); pano.add(m); return m; };
  scr(dispRadar, 0.22, 0.22, 0, -0.645, -0.8, -1.22, 0, 0);
  scr(dispStatus, 0.2, 0.2, 0.3, -0.655, -0.76, -1.22, -0.12, 0);
  scr(dispSys, 0.22, 0.11, -0.3, -0.655, -0.76, -1.22, 0.12, 0);
  // seams of the all-round monitor
  const pts = [];
  const R = 1.7;
  for (let lat = -45; lat <= 45; lat += 30) {
    const y = Math.sin(lat * Math.PI / 180) * R, r = Math.cos(lat * Math.PI / 180) * R;
    for (let a = 0; a < 360; a += 6) { const a0 = a * Math.PI / 180, a1 = (a + 6) * Math.PI / 180; pts.push(new V3(Math.cos(a0) * r, y, Math.sin(a0) * r), new V3(Math.cos(a1) * r, y, Math.sin(a1) * r)); }
  }
  for (let lon = 15; lon < 360; lon += 30) {
    const a = lon * Math.PI / 180;
    for (let l = -78; l < 78; l += 6) {
      const l0 = l * Math.PI / 180, l1 = (l + 6) * Math.PI / 180;
      pts.push(new V3(Math.cos(a) * Math.cos(l0) * R, Math.sin(l0) * R, Math.sin(a) * Math.cos(l0) * R), new V3(Math.cos(a) * Math.cos(l1) * R, Math.sin(l1) * R, Math.sin(a) * Math.cos(l1) * R));
    }
  }
  const seams = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x0a0e12, transparent: true, opacity: 0.22, depthWrite: false }));
  seams.renderOrder = -1;
  pano.add(seams);
  // dark lower rim of the sphere where the hatch and floor mechanics sit
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.72, 32, 8, 0, TAU, Math.PI * 0.8, Math.PI * 0.2), new THREE.MeshBasicMaterial({ color: 0x101316, side: THREE.BackSide }));
  pano.add(rim);
  pano.position.set(0, 0.17, 0.05);
  pano.visible = false;
  cockScene.add(pano);
})();

// ---------- classic cockpit ----------
const classic = new THREE.Group();
const classicScreen = { w: 1.2, h: 0.68, y: 0.08, z: -0.95 };
const CK_LEDS = [];
(function () {
  const S = classicScreen;
  const add = (geo, x, y, z, mat = ckPanelMat, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); classic.add(m); return m; };
  // front wall with the main screen opening
  const T = 0.08;
  add(chamferBox(2.6, 0.9, T, 0.02), 0, S.y + S.h / 2 + 0.45, S.z - 0.02);
  add(chamferBox(0.6, S.h + 0.1, T, 0.02), -S.w / 2 - 0.3, S.y, S.z - 0.02);
  add(chamferBox(0.6, S.h + 0.1, T, 0.02), S.w / 2 + 0.3, S.y, S.z - 0.02);
  // screen bezel
  add(chamferBox(S.w + 0.12, 0.06, 0.1, 0.02), 0, S.y + S.h / 2 + 0.03, S.z + 0.02, ckDarkMat);
  add(chamferBox(S.w + 0.12, 0.06, 0.1, 0.02), 0, S.y - S.h / 2 - 0.03, S.z + 0.02, ckDarkMat);
  add(chamferBox(0.06, S.h + 0.12, 0.1, 0.02), -S.w / 2 - 0.03, S.y, S.z + 0.02, ckDarkMat);
  add(chamferBox(0.06, S.h + 0.12, 0.1, 0.02), S.w / 2 + 0.03, S.y, S.z + 0.02, ckDarkMat);
  // sloping main console under the screen
  add(chamferBox(2.0, 0.08, 0.75, 0.02), 0, S.y - S.h / 2 - 0.22, S.z + 0.3, ckPanelMat, 0.5);
  add(chamferBox(2.2, 0.7, 0.1, 0.02), 0, S.y - S.h / 2 - 0.62, S.z + 0.1, ckDarkMat);
  // side walls and angled side consoles
  for (const sg of [1, -1]) {
    add(chamferBox(T, 1.9, 1.6, 0.02), sg * 1.05, 0, -0.2, ckPanelMat, 0, sg * 0.25, 0);
    add(chamferBox(0.6, 0.08, 0.9, 0.02), sg * 0.72, -0.5, -0.35, ckPanelMat, 0, 0, -sg * 0.4);
    // switch banks
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const led = add(new THREE.BoxGeometry(0.035, 0.025, 0.035), sg * (0.58 + j * 0.1), -0.43 + j * 0.04, -0.6 + i * 0.12, new THREE.MeshBasicMaterial({ color: 0x33ff66 }), 0, 0, -sg * 0.4);
      CK_LEDS.push(led);
    }
  }
  // ceiling with overhead switches
  add(chamferBox(2.2, T, 1.8, 0.02), 0, 0.85, -0.2, ckPanelMat);
  for (let i = 0; i < 8; i++) CK_LEDS.push(add(new THREE.BoxGeometry(0.05, 0.03, 0.05), -0.42 + i * 0.12, 0.8, -0.6, new THREE.MeshBasicMaterial({ color: 0xffaa33 })));
  // CRT panels: radar and status left and right of the screen, system readout below
  const crt = (d, w, h, x, y, z, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), d.mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); classic.add(m); };
  crt(dispRadar, 0.36, 0.36, -S.w / 2 - 0.26, S.y - 0.06, S.z + 0.04, 0, 0.12);
  crt(dispStatus, 0.36, 0.36, S.w / 2 + 0.26, S.y - 0.06, S.z + 0.04, 0, -0.12);
  crt(dispSys, 0.5, 0.25, 0, S.y - S.h / 2 - 0.2, S.z + 0.3, -1.07, 0);
  // levers, seat, pilot
  const parts = [];
  for (const sg of [1, -1]) {
    parts.push({ geo: new THREE.CylinderGeometry(0.025, 0.03, 0.22, 6), p: [sg * 0.37, -0.43, -0.34], r: [0.3, 0, 0], c: [0.3, 0.3, 0.3] });
    parts.push({ geo: chamferBox(0.08, 0.15, 0.09, 0.02), p: [sg * 0.37, -0.31, -0.39], r: [0.3, 0, 0], c: [0.16, 0.16, 0.16] });
    parts.push({ geo: chamferBox(0.16, 0.12, 0.6, 0.03), p: [sg * 0.38, -0.55, -0.1], c: [0.22, 0.22, 0.2] });
  }
  parts.push({ geo: chamferBox(0.56, 0.12, 0.55, 0.04), p: [0, -0.66, 0.05], c: [0.22, 0.2, 0.18] });
  pilotBody(parts, [0.4, 0.44, 0.32], [0.24, 0.24, 0.24]);
  classic.add(ckMesh(parts));
  // the screen surface: scanlines over the outside view
  const sc = document.createElement('canvas'); sc.width = 4; sc.height = 256;
  const g = sc.getContext('2d');
  for (let y = 0; y < 256; y += 2) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y, 4, 1); }
  const st = new THREE.CanvasTexture(sc); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(1, 1.6);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), new THREE.MeshBasicMaterial({ map: st, transparent: true, opacity: 0.35, depthWrite: false }));
  scan.position.set(0, S.y, S.z + 0.01);
  classic.add(scan);
  classic.visible = false;
  cockScene.add(classic);
})();
const CLASSIC_TINT = { bastion: 0x8a8068, ogre: 0x55604a, grunt: 0x55604a, ace: 0x6a4a44 };

function resizeCockpit(w, h) { cockCam.aspect = w / h; cockCam.updateProjectionMatrix(); }

// Show the right cockpit and orient its camera relative to the suit's torso.
const _cq = new THREE.Quaternion(), _cq2 = new THREE.Quaternion(), ROT_Y_PI = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);
let cockpitOn = false, fpHidden = null;
const FP_HIDE = ['torso', 'head', 'hatch', 'cannon', 'torsoGlow', 'headGlow'];
// From inside the cockpit the suit's own chest and head would block the view.
function hideOwnBody(s) {
  if (fpHidden === s) return;
  if (fpHidden) for (const k of FP_HIDE) if (fpHidden.rig.meshes[k]) fpHidden.rig.meshes[k].visible = true;
  fpHidden = s;
  if (s) for (const k of FP_HIDE) if (s.rig.meshes[k]) s.rig.meshes[k].visible = false;
}
function updateCockpit(s, dt) {
  const on = !!s && camMode === 'fp' && PILOT.state === 'suit';
  cockpitOn = on;
  hideOwnBody(on ? s : null);
  pano.visible = on && s.T.cockpit === 'pano';
  classic.visible = on && s.T.cockpit === 'classic';
  if (!on) return;
  if (classic.visible) ckPanelMat.color.setHex(CLASSIC_TINT[s.type] || 0x5a6150);
  s.rig.J.torso.getWorldQuaternion(_cq).multiply(ROT_Y_PI);
  cockCam.quaternion.copy(_cq.invert()).multiply(camera.quaternion);
  cockCam.position.set(frand(-1, 1) * shake * 0.01, frand(-1, 1) * shake * 0.01 + CAM.kick * -0.02, 0);
  cockCam.fov = camera.fov; cockCam.updateProjectionMatrix();
  // blinking switches
  for (let i = 0; i < CK_LEDS.length; i++) if (Math.random() < dt * 0.8) CK_LEDS[i].visible = !CK_LEDS[i].visible;
  const boot = BOOT.t < BOOT.dur ? clamp(BOOT.t / BOOT.dur, 0, 1) : 1;
  cockGlow.intensity = 0.1 + 0.25 * boot;
  cockGlow.color.setHex(s.T.cockpit === 'pano' ? 0x7dffb0 : 0xffb347);
}
// Where the classic cockpit's forward screen sits on screen (for clipping the HUD to it).
function classicScreenRect(out) {
  const S = classicScreen;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    _v1.set(sx * S.w / 2, S.y + sy * S.h / 2, S.z);
    _v1.applyMatrix4(cockCam.matrixWorldInverse).applyMatrix4(cockCam.projectionMatrix);
    const px = (_v1.x * 0.5 + 0.5) * HUD.w, py = (-_v1.y * 0.5 + 0.5) * HUD.h;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  out.x = x0; out.y = y0; out.w = x1 - x0; out.h = y1 - y0;
  return out;
}

// ---------- boot sequence ----------
const BOOT = { t: 99, dur: 3.2, lines: [] };
function startBoot(s) {
  BOOT.t = 0;
  const dom = s.T.cockpit === 'classic';
  BOOT.lines = dom
    ? ['MAIN REACTOR ........ IGNITION', 'MONO-EYE RAIL ........ OK', 'SERVO BUS A/B ........ OK', 'FCS: ' + s.T.name, 'ALL SYSTEMS GREEN']
    : ['ALL-ROUND MONITOR .... ONLINE', 'FUSION REACTOR ........ 98%', 'LEARNING CORE ........ SYNCED', 'FCS: ' + s.T.name, 'SYSTEM ALL GREEN'];
  bootSound();
}
