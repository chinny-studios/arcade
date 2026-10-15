// Scripted run through the core loop. Used by: node test/smoke.mjs --steps test/play.js
const { craft, recipeFor, natQuery, useItem, maxHp, maxSt, NAT } = F;
TK.peace(true); TK.god(true);
// --- crafting by hand ---
TK.give('wood', 40); TK.give('stone', 30); TK.give('flint', 10); TK.give('resin', 10); TK.give('straw', 20);
const hammerOk = craft(recipeFor('hammer'), {}); craft(recipeFor('stone_axe'), {}); craft(recipeFor('club'), {});
out.crafted = hammerOk && P.inv.count('hammer') === 1 && P.inv.count('stone_axe') === 1;
// --- building: ghost placement and snapping ---
const x0 = P.pos.x + 12, z0 = P.pos.z + 12;
TK.tp(x0, z0);
TK.equip('hammer');
const gy = heightAt(x0, z0 + 3);
B.select('workbench');
TK.look(0, -0.5); TK.sim(0.2);
out.ghostWorkbench = { valid: B.tool.valid, why: B.tool.why };
TK.click(0); TK.sim(0.3);
out.placedWorkbench = B.pieces.some((p) => p.id === 'workbench');
// a floor on the ground, then a wall that should snap to its edge
const fl = TK.place('wood_floor', x0 + 4, heightAt(x0 + 4, z0) + 0.25, z0, 0);
B.select('wood_wall'); TK.sim(0.1);
// aim at the floor's +x edge
const edge = new THREE.Vector3(fl.x + 1, fl.y, fl.z);
const cam = TK.R.camera.position;
TK.P.pos.set(fl.x - 2.5, fl.y, fl.z); TK.look(Math.PI / 2, -0.35); TK.sim(0.05);
const d = edge.clone().sub(TK.R.camera.position).normalize();
CAM.yaw = Math.atan2(d.x, d.z); CAM.pitch = Math.asin(d.y); P.yaw = CAM.yaw; TK.sim(0.05);
out.wallGhost = { valid: B.tool.valid, why: B.tool.why, pos: B.tool.pos.toArray().map((v) => +v.toFixed(2)), floorEdge: edge.toArray().map((v) => +v.toFixed(2)) };
// --- integrity: a pole with a chain of beams sticking out ---
const px = x0 - 8, pz = z0 - 8, ph = heightAt(px, pz);
const pole = TK.place('wood_pole', px, ph, pz, 0);
const pole2 = TK.place('wood_pole', px, ph + 2, pz, 0);
const beams = [];
for (let i = 0; i < 14; i++) beams.push(TK.place('wood_beam', px + 1 + i * 2, ph + 3.9, pz, 0));
const alive = beams.filter((b) => B.pieces.includes(b)).length;
out.integrity = { poleSupport: Math.round(pole.support), beamsStanding: alive, supports: beams.filter((b) => B.pieces.includes(b)).map((b) => Math.round(b.support)) };
// remove the pole: everything above should collapse
B.remove(pole);
out.afterPoleRemoved = { pole2: B.pieces.includes(pole2), beams: beams.filter((b) => B.pieces.includes(b)).length };
// --- chopping a tree ---
let tree = null, C0 = null;
natQuery(P.pos.x, P.pos.z, 60, (t, kind, C) => { if (kind === 'tree' && !t.stump && t.type !== 'hinoki' && !tree) { tree = t; C0 = C; } });
if (tree) {
  TK.tp(tree.x - 1.4, tree.z);
  TK.equip('stone_axe');
  TK.look(Math.PI / 2, 0); TK.sim(0.2);
  let swings = 0;
  while (!NAT.removed.has(tree.id) && swings < 40) { TK.click(0); TK.sim(0.8); P.st = 100; swings++; }
  TK.sim(4);
  out.tree = { type: tree.type, felled: NAT.removed.has(tree.id), swings, logs: NAT.logs.length };
  // chop the logs
  let n = 0;
  while (NAT.logs.length && n < 60) { const l = NAT.logs[0]; TK.tp(l.x + Math.sin(l.rot) * 1.6, l.z + Math.cos(l.rot) * 1.6); TK.look(Math.atan2(l.x - P.pos.x, l.z - P.pos.z), -0.2); TK.click(0); TK.sim(0.8); P.st = 100; n++; }
  TK.sim(2);
  out.logsLeft = NAT.logs.length; out.woodDrops = TK.DROPS.filter((d) => d.st.id === 'wood').length;
}
// --- combat: a boar ---
TK.peace(false);
TK.equip('club');
const boar = TK.spawn('boar', 0, 2.2, { stars: 0 });
TK.look(0, 0); TK.sim(0.1);
let hits = 0;
while (!boar.dead && hits < 30) { CAM.yaw = P.yaw = Math.atan2(boar.pos.x - P.pos.x, boar.pos.z - P.pos.z); TK.click(0); TK.sim(0.7); hits++; }
TK.sim(4);
out.boar = { dead: boar.dead, hits, drops: TK.DROPS.filter((d) => ['raw_boar', 'leather_scraps', 'boar_tusk'].includes(d.st.id)).map((d) => d.st.id) };
TK.peace(true);
// --- food ---
const before = maxHp();
TK.give('cooked_boar', 2); TK.give('strawberry', 5);
useItem(P.inv.slots.find((s) => s && s.id === 'cooked_boar')); useItem(P.inv.slots.find((s) => s && s.id === 'strawberry'));
useItem(P.inv.slots.find((s) => s && s.id === 'cooked_boar'));
out.food = { before, after: Math.round(maxHp()), stam: Math.round(maxSt()), slots: P.food.map((f) => f.id) };
// --- shelter, fire, rest ---
const hx = x0 + 20, hz = z0 - 10, hh = heightAt(hx, hz);
TK.tp(hx, hz);
TK.place('campfire', hx + 1.2, hh, hz, 0);
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) TK.place('wood_pole', hx + dx * 2, heightAt(hx + dx * 2, hz + dz * 2), hz + dz * 2, 0);
const top = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz]) => heightAt(hx + dx * 2, hz + dz * 2))) + 2;
for (let i = -1; i <= 0; i++) for (let j = -1; j <= 0; j++) TK.place('wood_floor', hx + i * 2 + 1, top + 0.25, hz + j * 2 + 1, 0);
TK.sim(1);
out.shelter = { roof: B.roofAt(P.pos.x, P.pos.y + 1.6, P.pos.z), shelter: +B.shelterAt(P.pos.x, P.pos.y + 1.6, P.pos.z).toFixed(2), warm: !!P.status.warm, comfort: B.comfortAt(P.pos.x, P.pos.z, P.pos.y).level };
TK.press('KeyX'); TK.sim(16);
out.rested = { rested: !!P.status.rested, resting: !!P.status.resting, status: Object.keys(P.status) };
//--- shot play_shelter
const { SAVE } = F;
// --- save ---
const json = JSON.stringify(SAVE.serialize());
out.saveKB = Math.round(json.length / 1024);
out.stats = TK.stats();
return out;
