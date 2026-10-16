AP.freeze(); AP.god(); AP.peace();
const G = AP.f.G;
const ids = [];
for (let k = 0; k < 5; k++) ids.push(AP.spawn('soldier', 6 + k * 2, 25));
const A = ids.map((id) => G.actors.find((a) => a.id === id));
for (const a of A) { a.yaw = 0 + Math.PI; a.homeYaw = a.yaw; a.state = 'idle'; }
AP.tpXZ(16, 57.5, 0); AP.look(0, -0.08); AP.sim(0.2);
const parts = ['legL', 'armR', 'torso', 'head', 'groin'];
A.forEach((a, k) => AP.f.damageActor(a, 1, parts[k], null, {}));
AP.sim(0.18); AP.render();
//--- shot anim_hits
const G2 = AP.f.G; const A2 = G2.actors.slice(-5);
A2.forEach((a, k) => { a.hp = 1; AP.f.damageActor(a, 50, ['legL', 'armR', 'torso', 'head', 'groin'][k], 'player', { fromX: a.x, fromZ: a.z + 5 }); });
AP.sim(0.35); AP.render();
//--- shot anim_falling
AP.sim(2); AP.render();
//--- shot anim_dead
return AP.f.G.actors.slice(-5).map((a) => a.deathKind);
