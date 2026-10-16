// core loop: walk, talk, read, map, carts by the clock
const res = {};
RA.go('suburastreet'); RA.sim(1);
const x0 = P.x, z0 = P.z;
await RA.hold('KeyW', 3);
res.walked = Math.hypot(P.x - x0, P.z - z0).toFixed(1);
// talk to the nearest person standing at a shop
const people = RA.NPC.agents.filter((a) => a.type === 'spot' && a.who);
people.sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
const t = people[0];
res.target = t && t.who.title;
if (t) {
  RA.tp(t.x + Math.sin(t.yaw) * 1.8, t.z + Math.cos(t.yaw) * 1.8); RA.sim(0.1);
  RA.lookAt(t.x, t.y + 1.5, t.z); RA.sim(0.1);
  res.prompt = document.querySelector('#prompt').textContent;
  RA.press('KeyE'); RA.sim(0.1);
  res.open = RA.HUD.open; res.say = document.querySelector('#dlg .say').textContent;
  for (let i = 0; i < 6 && RA.HUD.open; i++) { RA.press('KeyE'); RA.sim(0.1); }
  res.closed = RA.HUD.open;
}
// read the nearest placard
const pl = RA.W.placards.slice().sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
RA.tp(pl.x + 1.5, pl.z + 1.5); RA.sim(0.2); RA.lookAt(pl.x, pl.y, pl.z); RA.sim(0.1);
RA.press('KeyE'); RA.sim(0.1); res.placard = RA.HUD.open + ': ' + document.querySelector('#placard .t').textContent;
RA.press('Escape'); RA.sim(0.1);
RA.press('KeyM'); RA.sim(0.1); res.map = RA.HUD.open; RA.press('KeyM'); RA.sim(0.1);
// carts: none in the city at noon, some after the tenth hour
RA.time(12); RA.go('suburastreet'); RA.sim(3); res.cartsNoon = RA.NPC.agents.filter((a) => a.type === 'cart').length;
RA.time(21); RA.go('suburastreet'); RA.sim(3); res.cartsNight = RA.NPC.agents.filter((a) => a.type === 'cart').length;
res.patrol = RA.NPC.agents.filter((a) => a.who && a.who.job === 'vigil').length;
RA.time(10); RA.go('appia'); RA.sim(3); res.appia = RA.NPC.agents.map((a) => a.type).reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
RA.go('forum'); RA.sim(4); res.forum = RA.NPC.agents.filter((a) => a.who && (a.who.job === 'lictor' || a.who.job === 'magistrate')).length;
return res;
