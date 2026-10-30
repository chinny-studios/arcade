// A screenshot gallery of every rig model and the fire engine, six views each, on the station apron:
//   node test/smoke.mjs --steps test/rigs.js   (writes test/out/rig_<type>_<view>.png)
// The live loop keeps rendering, so the page's render is pointed at a camera of our own.
RR.time(11); RR.sim(0.5);
for (const el of document.querySelectorAll('body > *')) el.style.visibility = 'hidden';
document.getElementById('c').style.visibility = 'visible';
const R = RR.R, draw = R.renderer.render.bind(R.renderer), cam = R.camera.clone();
cam.fov = 40; cam.updateProjectionMatrix();
R.renderer.render = (s, c) => draw(s, c === R.camera ? cam : c);
RR.RIG.model.root.visible = false;
// view: [name, across (+ = driver side), along (+ = ahead), distance, camera height, look-at height]
const VIEWS = [['front34', 1, 0.8, 12, 2.4, 1.4], ['curb34', -1, 0.8, 12, 2.4, 1.4], ['side', 1, 0, 14, 1.7, 1.5],
  ['front', 0, 1, 10, 1.9, 1.5], ['rear34', -1, -0.7, 12, 2.8, 1.4], ['cab', 1, 1.3, 7, 2.9, 1.7]];
const y = RR.RIG.yaw, fx = Math.sin(y), fz = Math.cos(y), lx = Math.cos(y), lz = -Math.sin(y);
const x0 = RR.RIG.x + fx * 5, z0 = RR.RIG.z + fz * 5;
let m = null;
for (const type of [...Object.keys(RR.f.RIGS), 'engine']) {
  if (m) R.scene.remove(m.root);
  m = type === 'engine' ? { root: RR.f.buildFireEngine(12) } : RR.f.buildRig(type); m.root.position.set(x0, 0, z0); m.root.rotation.y = y; R.scene.add(m.root);
  for (const [name, a, b, d, h, ly] of VIEWS) {
    const n = Math.hypot(a, b);
    cam.position.set(x0 + (a * lx + b * fx) / n * d, h, z0 + (a * lz + b * fz) / n * d); cam.lookAt(x0, ly, z0);
    draw(R.scene, cam); await wait(1500);
    await window.__shot(`rig_${type}_${name}`);
  }
}
