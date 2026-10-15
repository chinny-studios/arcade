// Classic controls: auto-aim pulls a near-miss onto a guard; aim mode moves the crosshair instead of the view.
AP.freeze(); AP.god(); AP.peace();
const G = AP.f.G, SET = AP.f.SET;
SET.controls = 'classic';
AP.tp(10, 33, 0); AP.sim(0.1);
const p = G.player;
const id = AP.spawn('soldier', 6, 27); const g = G.actors.find((a) => a.id === id);
g.x = p.x + 0.9; g.z = p.z - 8; g.yaw = Math.PI; g.hp = 1e6; AP.sim(0.05);
AP.look(0, 0);
// auto-aim: aiming straight ahead, the guard is ~6 degrees to the right
let before = G.stats.hits; AP.fire(1); out.autoAimHit = G.stats.hits > before;
// aim mode: guard 30 degrees to the right, crosshair moved onto him without turning
g.x = p.x + 4.6; g.z = p.z - 8; AP.sim(0.05); AP.look(0, 0);
const v = new THREE.Vector3(g.x, g.y + 1.2, g.z).project(AP.f.camera);
p.aimMode = true; p.aimX = v.x; p.aimY = v.y;
before = G.stats.hits;
G.player.fireT = 0; AP.f.G.player.switchT = 0;
AP.f.playerFire(); out.aimModeHit = G.stats.hits > before; out.yawAfter = +p.yaw.toFixed(3);
SET.controls = 'modern';
return out;
