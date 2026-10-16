// Mission 3 on Orbital Agent: four servos, the computer, Kessler, his key, the tape, the ascent stage.
AP.freeze(); AP.god(); AP.peace(); AP.all();
const G = AP.f.G, L = AP.f.L;
AP.select('mines');
for (const id of ['servo1', 'servo2', 'servo3', 'servo4']) {
  const s = L.props.find((p) => p.id === id);
  AP.tpXZ(s.center[0] - 3, s.center[2] + 0.2); AP.aimAt(s.center[0], 1.2, s.center[2]); AP.fire(1); AP.sim(0.8);
  AP.tpXZ(s.center[0] - 3, s.center[2] + 0.2);
}
AP.tp(23, 3 + 9, 0);
AP.press('KeyF'); AP.sim(2);
out.servos = L.props.filter((p) => /servo/.test(p.id || '')).map((p) => p.dead);
const comp = L.props.find((p) => p.id === 'computer');
const cc = [(comp.box[0] + comp.box[3]) / 2, (comp.box[2] + comp.box[5]) / 2];
AP.tpXZ(cc[0], comp.box[5] + 1.0); AP.aimAt(cc[0], 1.0, cc[1]);
out.use = AP.useNow(); AP.sim(3.5);
const k = G.actors.find((a) => a.id === 'kessler');
AP.select('zeus');
AP.tpXZ(k.x + 4, k.z); AP.aimAt(k.x, k.y + 1.2, k.z);
for (let i = 0; i < 20 && !k.dead; i++) { AP.aimAt(k.x, k.y + 1.2, k.z); AP.fire(1); AP.sim(0.2); }
out.kessler = [k.dead, Math.round(k.hp)];
AP.sim(1);
AP.tpXZ(k.x, k.z); AP.sim(1);
delete G.player.items.officekey; AP.tpXZ(k.x, k.z); AP.sim(0.5);
out.items = Object.keys(G.player.items).filter((x) => G.player.items[x]);
AP.render();
//--- shot p3_kessler
AP.tp(34, 17, -Math.PI / 2); AP.press('KeyE'); AP.sim(1.5);
AP.tp(44, 18, 0); AP.sim(1);
out.objs = AP.objectives().map((o) => o.letter + ':' + o.status);
AP.tp(7, 14, 0); AP.sim(0.5);
return Object.assign(out, AP.state());
