// crime, rooftop rescue and ship on fire, flown in the Raptor with the autopilot
const H = CC.HELI, G = CC.G, r = {};
const land = (x, z) => { CC.fly(x, z, 45, { land: true, max: 100 }); CC.sim(1.5); return CC.stats(); };
const dropAtPad = () => { const p = F.nearestPad(H.x, H.z, ['home', 'hospital', 'police']); return land(p.x, p.z); };
// ladder rescue: hover so the ladder's tip is a metre over each person
const d0 = (P) => Math.hypot(H.x - P.x, H.z - P.z);
function ladderRescue(c, list) {
  F.selectEquip('ladder');
  for (let i = 0; i < 400; i++) {
    const P = list.find((q) => !q.state);
    if (!P || CC.HELI.seats.length >= H.st.seats) break;
    G.ap = { x: P.x, z: P.z, alt: P.baseY + 12.3, exact: d0(P) < 25 }; CC.sim(0.5);
  }
  G.ap = null;
}
// crime
let c = CC.call('crime');
for (let i = 0; i < 400 && c.state === 'open'; i++) {
  const car = c.car, lead = 1.6;
  const fx = car.x - Math.sin(car.yaw) * car.v * lead, fz = car.z - Math.cos(car.yaw) * car.v * lead;
  G.ap = { x: fx, z: fz, alt: 32 }; CC.sim(0.5);
  if (Math.hypot(H.x - fx, H.z - fz) < 10 && H.gas > 0 && !CC.GEAR.cans.length) { F.selectEquip('gas'); F.useEquip(); }
}
G.ap = null;
r.crime = { state: c.state, seen: Math.round(c.seen), lost: Math.round(c.lost), gas: H.gas, money: G.career.money, hp: Math.round(H.hp) };
// rooftop rescue
c = CC.call('roof');
r.roof0 = { h: Math.round(c.y), n: c.victims.length };
ladderRescue(c, c.victims);
r.roof1 = CC.stats().seats;
dropAtPad(); CC.sim(1);
r.roof2 = { state: c.state, saved: c.saved, calls: CC.stats().calls, money: G.career.money, hp: Math.round(H.hp) };
// ship
F.switchHeli('raptor');
c = CC.call('ship');
r.ship0 = { x: Math.round(c.x), z: Math.round(c.z) };
F.selectEquip('bucket');
for (let trip = 0; trip < 6 && CC.FIRE.list.includes(c.fire); trip++) {
  CC.fly(c.x + 40, c.z + 40, 30, { max: 60 });
  G.ap = { x: c.x + 40, z: c.z + 40, alt: 9 }; CC.sim(6);
  CC.fly(c.fire.x, c.fire.z, 20, { max: 30 }); G.ap = { x: c.fire.x, z: c.fire.z, alt: 20 }; CC.sim(1.5); F.useEquip(); CC.sim(3); G.ap = null;
}
r.ship1 = { fire: CC.FIRE.list.includes(c.fire) };
ladderRescue(c, c.victims);
r.ship2 = CC.stats().seats;
dropAtPad(); CC.sim(1);
r.ship3 = { state: c.state, saved: c.saved, money: G.career.money };
r.dmg = G.dmgLog.slice(-8);
return r;
//--- shot calls2_end
