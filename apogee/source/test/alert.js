// A guard that has given up searching ('alert') must still fight when he sees you again.
AP.freeze(); AP.god();
const G = AP.f.G;
AP.tp(10, 33, 0); AP.sim(0.1);
const p = G.player;
const id = AP.spawn('soldier', 10, 29); const g = G.actors.find((a) => a.id === id);
g.state = 'alert'; g.yaw = Math.PI; g.homeYaw = Math.PI; g.home = { x: g.x, z: g.z };
AP.sim(1.5);
out.state = g.state; out.shots = g.fireT !== 0;
if (g.state !== 'combat' && g.state !== 'alarm') throw new Error('alert guard ignored the player: ' + g.state);
return out;
