// the necromancer: death grip, raising the dead (zombies hunt on their own), the curse and blasting a door open
const r = {};
CF.start({ monster: 'lich' }); CF.god();
CF.tp(-20, 0); CF.face(Math.PI / 2);
// death grip: lifted by the throat and drained
let v = CF.spawn('greaser', CF.P.x + 1.4, CF.P.z - 1.2);
CF.aimAt(v); CF.press('atk'); CF.sim(0.5);
r.gripAct = CF.P.act; r.gripY = +(v.y - CF.P.y).toFixed(2);
CF.sim(1); r.grip = v.state; r.gripScore = CF.G.score;
CF.P.cd.a1 = 0;
// two more bodies, then raise all three
const b1 = CF.spawn('jock', CF.P.x - 2, CF.P.z + 1), b2 = CF.spawn('housewife', CF.P.x + 3, CF.P.z + 3);
CF.f.killPerson(b1, 'wither', 1, 0); CF.f.killPerson(b2, 'wither', 0, 1);
CF.sim(0.6);
CF.press('a1'); CF.sim(0.6);
r.raised = CF.MINIONS.length; r.raiseCd = +CF.P.cd.a1.toFixed(1);
CF.sim(1.4);
r.risen = CF.MINIONS.map((z) => +z.rise.toFixed(1));
// people down the street: the zombies go after them
const prey = [];
for (let i = 0; i < 4; i++) prey.push(CF.spawn(null, CF.P.x + 9 + i * 1.5, CF.P.z + (i % 2 ? 1.5 : -1.5)));
for (const p of prey) p.state = 'idle';
const k0 = CF.G.kills;
CF.sim(6);
r.zombieKills = CF.G.kills - k0;
r.prey = prey.map((p) => p.state);
r.zKills = CF.MINIONS.map((z) => z.kills);
out.zpos = CF.MINIONS.map((z) => [z.x, z.z]);
return r;
//--- shot lich_zombies
{
  const z = CF.MINIONS[0];
  if (z) { CF.tp(z.x - 4, z.z + 4); CF.aimAt(z); }
  CF.sim(0.1); CF.render();
  return { minions: CF.MINIONS.length, life: CF.MINIONS.map((z) => +z.life.toFixed(1)) };
}
//--- shot lich_zombies2
{
  // the curse from 20 m
  const r2 = {};
  CF.tp(60, 2); CF.face(-Math.PI / 2);
  const c = CF.spawn('deputy', 80, 2); c.state = 'idle';
  CF.aimAt(c); CF.press('a2'); CF.sim(0.1);
  r2.state = c.state; r2.cd = +CF.P.cd.a2.toFixed(1);
  CF.sim(1.6); r2.lift = +(c.y - c.curseY).toFixed(2);
  CF.aimAt({ x: c.x, z: c.z, y: c.y - 0.6 }); CF.sim(0.05); CF.render();
  out.c = c;
  return r2;
}
//--- shot lich_curse
{
  const c = out.c;
  CF.sim(1.5);
  const r3 = { curse: c.state, label: 'curse' };
  // zombies crumble when their time is up
  CF.sim(30);
  r3.minionsAfter = CF.MINIONS.length;
  // a bolted door blasts open in one go
  const h = CF.TOWN.refuges.find((q) => q.kind === 'house' && !q.broken);
  const p1 = CF.spawn('housewife', h.x, h.z), p2 = CF.spawn('grandpa', h.x, h.z);
  for (const p of [p1, p2]) { p.state = 'inside'; p.inside = h; h.occ.push(p); p.M.root.visible = false; p.hidden = true; }
  CF.tp(h.ax, h.az); CF.tp(h.x + h.nx * 1.6, h.z + h.nz * 1.6); CF.aimAt({ x: h.x, z: h.z, y: 0 });
  r3.near = CF.P.near && CF.P.near.label;
  CF.press('use'); CF.sim(1);
  r3.door = { broken: h.broken, states: [p1.state, p2.state] };
  r3.stats = CF.stats();
  return r3;
}
