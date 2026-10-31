// Renderer, the studio environment, lights, the workbench and the turntable.
const canvas = $('#c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
} catch (e) { renderer = null; }
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.004, 30);
const R = {};

function initRenderer() {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, G.quality ? 2 : 1));
  LAYER.noise.value = makeNoise3D(64);
  buildStudio();
  buildLights();
  buildBench();
  resize();
  window.addEventListener('resize', resize);
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // keep the piece framed on tall phone screens
  camera.fov = w / h < 0.8 ? 46 : w / h < 1.2 ? 36 : 30;
  camera.updateProjectionMatrix();
}

// A dim workshop around a photo studio: two big softboxes, a strip light for rims, a mullioned window, a warm
// work lamp and shelves of clutter to break up reflections. It is rendered once into a PMREM for reflections and
// blurred for the background, so the bench reads like a product shot taken in a real room.
function buildStudio() {
  const es = new THREE.Scene();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mat = (hex, k) => new THREE.MeshBasicMaterial({ color: srgb(hex).multiplyScalar(k) });
  const add = (m, p, s, ry = 0, rx = 0) => { const o = new THREE.Mesh(box, m); o.position.set(...p); o.scale.set(...s); o.rotation.set(rx, ry, 0); es.add(o); return o; };
  // room: walls in warm grey plaster, darker floor, vertex-coloured so it is not flat
  const rg = new THREE.BoxGeometry(26, 12, 26, 26, 12, 26);
  const P = rg.attributes.position, cols = [];
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i), x = P.getX(i), z = P.getZ(i);
    let k = y < -5.9 ? 0.05 : y > 5.9 ? 0.07 : 0.09 + 0.07 * smoothstep(-6, 4, y);
    k *= 0.75 + 0.5 * fbm(x * 0.3, y * 0.3, z * 0.3, 3, 3);
    cols.push(k * 1.15, k * 0.98, k * 0.82);
  }
  rg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const room = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }));
  room.position.y = 3; es.add(room);
  // key softbox, front left and high; fill softbox right; strip light behind right for rims
  add(mat('#fff4e6', 16), [-6.5, 6.5, 6], [0.2, 4.2, 3.4], -0.75);
  add(mat('#fffaf2', 5), [7.5, 3.5, 5.5], [0.2, 3.6, 2.6], 0.6);
  add(mat('#eef3ff', 11), [6.5, 4, -6.5], [0.25, 7, 1.0], -0.8);
  // overhead
  add(mat('#fff6ec', 4), [0, 8.9, 0], [5, 0.1, 2.2]);
  // white scrims behind the camera, as in a product studio: polished metal facing you mirrors something bright,
  // with a dark gap between them so it still has contrast
  add(mat('#fffaf3', 3.2), [-3.4, 3.4, 10.5], [5.6, 6.5, 0.1]);
  add(mat('#fff8ee', 2.2), [3.4, 2.4, 10.5], [4.6, 5, 0.1]);
  add(mat('#fffaf3', 1.0), [0, -3.6, 9], [12, 0.1, 5]);
  // window on the back wall: four panes and mullions (the mullions read as crosses in polished metal)
  for (const [x, y] of [[-2.3, 2.6], [-0.5, 2.6], [-2.3, 4.6], [-0.5, 4.6]]) add(mat('#cfe0ff', 3.2), [x, y, -12.9], [1.7, 1.9, 0.1]);
  add(mat('#2a241d', 1), [-1.4, 3.6, -12.8], [4.1, 4.4, 0.05]);
  // warm work lamp and its pool of light
  add(mat('#ffb36a', 30), [3.4, 0.6, -6.5], [0.5, 0.35, 0.5]);
  add(mat('#5a3a20', 0.6), [3.4, -2.2, -6.5], [5, 0.05, 3]);
  // shelves with jars, tins and boxes along the back and side walls
  const r = mulberry(31);
  const shelfMat = mat('#3a2a1c', 0.35);
  for (const [z, x0, x1, ry] of [[-12.6, -12, 12, 0], [12.6, -12, 12, 0]]) {
    for (const y of [-0.5, 2.0, 4.6]) {
      add(shelfMat, [0, y, z], [24, 0.12, 0.8], ry);
      for (let x = x0 + 0.5; x < x1; x += 0.35 + r() * 0.9) {
        const h = 0.3 + r() * 1.2, w = 0.2 + r() * 0.6;
        const tint = ['#6b5038', '#2f3b33', '#7a6a50', '#3b2d26', '#9a8a70', '#2c2c30'][(r() * 6) | 0];
        add(mat(tint, 0.15 + r() * 0.35), [x, y + h / 2 + 0.06, z + (z < 0 ? 0.1 : -0.1)], [w, h, 0.5]);
      }
    }
  }
  for (const y of [0.5, 3.2]) {
    add(shelfMat, [-12.6, y, 0], [0.8, 0.12, 20]);
    for (let z = -9; z < 9; z += 0.4 + r() * 1.1) add(mat(['#5b4632', '#3d4a3c', '#7d6a52'][(r() * 3) | 0], 0.2 + r() * 0.3), [-12.4, y + 0.5, z], [0.5, 0.4 + r() * 1.1, 0.3 + r() * 0.5]);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(es, 0.03, 0.1, 60);
  pm.dispose();
  R.env = rt.texture;
  scene.environment = R.env;
  scene.background = R.env;
  scene.backgroundBlurriness = 0.42;
  scene.backgroundIntensity = 0.32;
}

function buildLights() {
  // key light matches the big softbox; it is the only shadow caster
  const key = new THREE.SpotLight(0xfff0de, 2.2, 0, 0.42, 0.85, 2);
  key.position.set(-0.42, 0.62, 0.46);
  key.target.position.set(0, 0.03, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.3; key.shadow.camera.far = 1.6;
  key.shadow.bias = -0.00015; key.shadow.normalBias = 0.0004;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  R.keyI = key.intensity;
  const rim = new THREE.DirectionalLight(0xe4ecff, 1.1);
  rim.position.set(0.5, 0.45, -0.6);
  scene.add(rim);
  R.key = key; R.rim = rim;
}

// The workbench is oiled oak; the turntable is a black lacquered drum with a brass-ringed felt platter.
function buildBench() {
  const oak = layerMat({ kind: 'wood', col: lin(0.30, 0.17, 0.08), col2: lin(0.16, 0.08, 0.035), rough: 0.55, scale: 9,
    pat: 'wood', axis: V3(1, 0, 0.08).normalize(), origin: V3(0, -0.5, -0.9), patP: [55, 1.4, 0, 0.00004], fin: 'oil', finT: lin(0.8, 0.62, 0.45) });
  const bg = tess(new THREE.BoxGeometry(1.8, 0.05, 1.0), 0.06);
  fixedMasks(bg, 0.12, 1, 1, 0.5);
  const bench = new THREE.Mesh(bg, oak);
  bench.position.y = -0.055; bench.receiveShadow = true;
  scene.add(bench);
  R.bench = bench;

  buildTurntable(0.08);
}

// The turntable is sized to the piece: r is the platter radius.
function buildTurntable(r) {
  if (R.tt && R.ttR === r) return;
  // anything riding on the old platter (a piece) moves to the new one
  const keep = R.tt ? [...R.platter.children].filter((c) => !R.platterParts.includes(c)) : [];
  if (R.tt) {
    for (const k of keep) R.platter.remove(k);
    scene.remove(R.tt);
    R.tt.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
  R.ttR = r;
  const s = r / 0.08, h = Math.min(1.6, Math.sqrt(s));
  const tt = new THREE.Group(); scene.add(tt); R.tt = tt;
  const lac = layerMat({ kind: 'paint', col: lin(0.012, 0.011, 0.01), rough: 0.25, cc: 1, scale: 60 });
  const baseG = fixedMasks(lathe([[0, -0.03], [0.088 * s, -0.03, 0.002], [0.086 * s, -0.008, 0.003 * h], [0.0, -0.008]], 0.002 * s, Math.round(160 + 40 * h)), 0.06);
  const base = new THREE.Mesh(baseG, lac); base.castShadow = true; base.receiveShadow = true; tt.add(base);
  // the rotating platter
  const plat = new THREE.Group(); tt.add(plat); R.platter = plat;
  const brass = layerMat({ kind: 'metal', col: lin(0.92, 0.72, 0.38), rough: 0.25, roughPol: 0.12, scale: 80, corr: 'tarnish' });
  const ro = 0.08 * s;
  const ringG = fixedMasks(lathe([[ro - 0.006, -0.008], [ro, -0.008, 0.001], [ro, -0.001, 0.0015], [ro - 0.0055, 0.0015, 0.001], [ro - 0.0065, -0.002]], 0.0008, Math.round(220 * h)), 0.05, 0, 0.8, 0.3, 0.25);
  const ring = new THREE.Mesh(ringG, brass); ring.castShadow = true; ring.receiveShadow = true; plat.add(ring);
  const felt = layerMat({ kind: 'felt', col: lin(0.025, 0.06, 0.04), col2: lin(0.18, 0.32, 0.24), scale: 70 });
  const feltG = fixedMasks(lathe([[0, -0.006], [ro - 0.0055, -0.006], [ro - 0.0055, 0, 0.001], [0, 0]], 0.003 * s, Math.round(160 * h)), 0.04);
  const fm = new THREE.Mesh(feltG, felt); fm.receiveShadow = true; plat.add(fm);
  R.platterParts = [ring, fm];
  for (const k of keep) plat.add(k);
}

// The light rig scales with the piece so a radio is lit like a watch, only from further away.
const KEY_POS = V3(-0.42, 0.62, 0.46);
function setRig(k, focus) {
  R.rig = k;
  R.key.intensity = R.keyI * k * k;
  R.key.target.position.set(0, focus ? focus.y * 0.6 : 0.03, 0);
  R.key.shadow.camera.near = 0.3 * k; R.key.shadow.camera.far = 1.6 * k;
  R.key.shadow.camera.updateProjectionMatrix();
}
