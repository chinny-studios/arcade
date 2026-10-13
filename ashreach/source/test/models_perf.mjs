// CPU cost of rig animation: 60 mixed rigs (40 humanoids, 20 creatures) stepped for 600 frames.
import { load } from './load.mjs';
const M = load(['07_models.js'], ['makeHumanoid', 'makeCreature', 'MD_CREATURE_KINDS', 'md_tpls']);
const rigs = [], B = ['baseline', 'bulwark', 'kestrel', 'savant'], W = ['pistol', 'rifle', 'smg', 'shotgun', 'heavy', 'melee1h', 'melee2h', 'fists', 'none'];
let t0 = performance.now();
for (let i = 0; i < 40; i++) { const r = M.makeHumanoid({ breed: B[i % 4], sex: i % 3 ? 'm' : 'f', armorTier: i % 4, hairStyle: i % 6, helmet: i % 7 === 0 }); r.setWeapon(W[i % W.length]); rigs.push(r); }
for (let i = 0; i < 20; i++) rigs.push(M.makeCreature(M.MD_CREATURE_KINDS[i % 8], { scale: 1 + (i % 3) * 0.2 }));
console.log('build 60 rigs', (performance.now() - t0).toFixed(1), 'ms; cached templates', M.md_tpls.size);
const S = ['idle', 'walk', 'run', 'combat', 'sit', 'dead'];
t0 = performance.now();
for (let f = 0; f < 600; f++) rigs.forEach((r, i) => { const st = S[(i + (f / 120 | 0)) % 6]; r.anim(1 / 60, st, st === 'run' ? 6 : st === 'walk' ? 2 : 0); if (f % 50 === i % 50) r.play('attack'); });
const ms = (performance.now() - t0) / 600;
console.log('anim: ' + ms.toFixed(3) + ' ms/frame for 60 rigs (' + (ms / 60 * 1000).toFixed(1) + ' us/rig)');
rigs.forEach((r) => r.dispose());
