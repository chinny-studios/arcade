// each hero against a crew on the plaza: melee combos, ranged, both powers and the ultimate
const res = {};
const heroes = ['spindle', 'skylark', 'blitz', 'bulwark', 'equinox'];
for (const h of heroes) {
  VB.hero(h); VB.tp(-26, 18); VB.face(Math.PI); VB.god();
  for (const f of VB.FOES.list.slice()) VB.f.damageFoe(f, 999);
  VB.sim(0.2);
  const crew = [];
  for (let i = 0; i < 5; i++) crew.push(VB.spawn(i === 4 ? 'gunman' : i === 3 ? 'brute' : 'thug', 'jackals', -26 + Math.cos(i) * 6, 18 + 6 + Math.sin(i) * 3));
  for (const f of crew) f.aggro = true;
  VB.sim(1);
  const r = { start: VB.counts() };
  for (let i = 0; i < 8; i++) { VB.press('atk'); VB.sim(0.25); }
  r.afterMelee = VB.counts(); r.combo = VB.G.combo;
  VB.aimAt(crew[4]); VB.press('rmb'); VB.sim(0.4); VB.press('rmb'); VB.sim(0.4);
  r.afterRanged = VB.counts();
  VB.aimAt(crew[3]); VB.press('q'); VB.sim(1.2);
  VB.press('e'); VB.sim(1.5);
  r.afterPowers = VB.counts();
  VB.P.meter = 100; VB.press('ult'); VB.sim(2.5);
  r.end = VB.counts(); r.score = VB.G.score; r.hp = VB.P.hp;
  res[h] = r;
}
return res;
