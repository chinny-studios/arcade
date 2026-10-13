// Foot-skate check: drive each rig forward at speed v and measure how fast the planted foot slides.
//   node test/models_skate.mjs   → per speed: mean |planted foot speed| / v (0 = perfect, 1 = moonwalk)
import { load } from './load.mjs';
const M = load(['07_models.js'], ['makeHumanoid', 'makeCreature', 'THREE']);
const V = M.THREE.Vector3;
function test(rig, feet, v, off) {
  const dt = 1 / 60, a = new V(), prev = feet.map(() => new V());
  let slip = 0, n = 0, minY = 1e9;
  for (let i = 0; i < 360; i++) {
    rig.root.position.z += v * dt;
    rig.anim(dt, Math.abs(v) > 4 ? 'run' : 'walk', v);
    rig.root.updateMatrixWorld(true);
    const ps = feet.map((b, j) => b.localToWorld(new V(0, off ? -off[j] : 0, 0)));
    let lo = 0; ps.forEach((p, j) => { if (p.y < ps[lo].y) lo = j; });
    if (i > 60) minY = Math.min(minY, ps[lo].y);
    if (i > 120 && ps[lo].y < minY + 0.015) { slip += Math.abs(ps[lo].z - prev[lo].z) / dt; n++; }
    ps.forEach((p, j) => prev[j].copy(p));
  }
  return slip / n / Math.abs(v);
}
for (const breed of ['baseline', 'bulwark', 'kestrel', 'savant']) {
  const out = [];
  for (const v of [1, 1.8, 3, 5, 7, 11, -2]) { const r = M.makeHumanoid({ breed }); out.push(v + ':' + test(r, [r.B.ftL, r.B.ftR], v).toFixed(2)); r.dispose(); }
  console.log(breed.padEnd(9), out.join('  '));
}
const legs = { beast: ['flL', 'flR', 'rlL', 'rlR'], mutant: ['ftL', 'ftR'], golem: ['ftL', 'ftR'], critter: ['legL', 'legR'] };
const offs = { beast: [0.43, 0.43, 0.49, 0.49], critter: [0.2, 0.2] };
for (const k in legs) {
  const out = [];
  for (const v of [1, 3, 6, 10]) { const r = M.makeCreature(k, {}); out.push(v + ':' + test(r, legs[k].map((b) => r.B[b]), v, offs[k]).toFixed(2)); }
  console.log(k.padEnd(9), out.join('  '));
}
