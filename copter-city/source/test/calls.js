// Dover call types played with the autopilot: medevac, passenger, traffic jam
const H = CC.HELI, r = {};
const land = (x, z) => { CC.fly(x, z, 45, { land: true, max: 100 }); CC.sim(1.5); return CC.stats(); };
const brief = (s) => ({ x: s.x, z: s.z, agl: s.agl, landed: s.landed, pad: s.pad, hp: s.hp, seats: s.seats, calls: s.calls, stage: s.stage, money: s.money });
// medevac
let c = CC.call('medevac');
r.med0 = { x: Math.round(c.x), z: Math.round(c.z), n: c.patients.length };
r.med1 = brief(land(c.x + 9, c.z + 9));
CC.sim(8);
r.med2 = brief(CC.stats());
const hp = F.nearestPad(H.x, H.z, ['hospital']);
r.med3 = brief(land(hp.x, hp.z));
CC.sim(1);
r.med4 = { state: c.state, paid: c.paid, money: CC.G.career.money, dmg: CC.G.dmgLog.slice(-5) };
// passenger
c = CC.call('taxi');
r.taxi0 = { x: Math.round(c.x), y: c.y, z: Math.round(c.z), dest: c.dest.name };
r.taxi1 = brief(land(c.x + 8, c.z + 8));
CC.sim(7);
r.taxi2 = brief(CC.stats());
r.taxi3 = brief(land(c.dest.x + 6, c.dest.z + 6));
CC.sim(1);
r.taxi4 = { state: c.state, comfort: Math.round(c.comfort), money: CC.G.career.money };
// traffic jam
c = CC.call('jam');
CC.sim(20);
r.jam0 = { stuck: CC.TRAFFIC.cars.filter((k) => k.v < 0.5).length };
CC.fly(c.n.x, c.n.z, 25, { max: 80 });
F.selectEquip('mega'); F.useEquip(); CC.sim(1);
r.jam1 = { state: c.state, money: CC.G.career.money };
r.dmg = CC.G.dmgLog;
return r;
//--- shot calls_end
