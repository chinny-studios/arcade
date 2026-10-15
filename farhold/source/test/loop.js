// Core loop: mine → repair scanner → scan → harvest → recharge → reach the ship → repairs → take off
FH.mute(); FH.sim(0.5);
const rock = FH.nearest('rock') || FH.nearest('boulder');
if (!rock) return 'no rock';
// stand next to it and aim
const up = rock.pos.clone().normalize();
P.pos.copy(rock.pos).addScaledVector(F.planetFrame ? up : up, 0).add(new THREE.Vector3(1, 0, 0).cross(up).normalize().multiplyScalar(3.5));
P.pos.setLength(P.pos.length() + 0.5);
FH.sim(0.3);
FH.aimAt(rock.pos.clone().addScaledVector(up, 0.4));
const before = FH.INV.count('ferrite');
const hit = F.toolRaycast(22);
FH.click(0, 2.5);
out.rock = rock;
return { hitKind: hit.kind, ferriteGain: FH.INV.count('ferrite') - before, rockAlive: rock.alive, heat: FH.TOOL.heat };
//--- shot mining
FH.give('ferrite', 40);
const ok = F.repairTech('scanner');
FH.press('KeyC');
FH.sim(1);
return { repaired: ok, quest: FH.QUEST.step, markers: FH.TOOL.markers.length };
//--- shot scan
// harvest an oxygen plant
let oxy = FH.nearest('oxy');
if (!oxy) { for (const c of FH.NAT.cells.values()) for (const o of c.objs) if (o.alive && o.sp.kind === 'oxy' && (!oxy || o.pos.distanceTo(P.pos) < oxy.pos.distanceTo(P.pos))) oxy = o; }
if (!oxy) return 'no oxy';
const u2 = oxy.pos.clone().normalize();
P.pos.copy(oxy.pos).add(new THREE.Vector3(0, 0, 1).cross(u2).normalize().multiplyScalar(1.8)); P.pos.setLength(P.pos.length() + 0.3);
FH.sim(0.4); FH.NAT.nearT = 0; FH.sim(0.2);
FH.aimAt(oxy.pos.clone().addScaledVector(u2, 0.8));
FH.sim(0.1);
const tgt = FH.f && window.FH.P && null;
const o2b = FH.INV.count('oxygen');
FH.press('KeyE');
const got = FH.INV.count('oxygen') - o2b;
F.recharge('life');
return { gotOxygen: got, life: Math.round(P.stats.life), quest: FH.QUEST.step };
//--- shot harvest
// go to the ship
const sUp = S.pos.clone().normalize();
P.pos.copy(S.pos).add(new THREE.Vector3(1, 0, 0).applyQuaternion(S.q).multiplyScalar(9)); P.pos.setLength(P.pos.length() + 1);
FH.sim(1);
FH.aimAt(S.pos.clone().addScaledVector(sUp, 2));
FH.sim(0.2);
return { quest: FH.QUEST.step, text: FH.QUEST.text() };
//--- shot atship
FH.give('ferrite', 250); FH.give('carbon', 60); FH.give('dihydro', 200);
F.craft('plate', 3); F.craft('seal', 1); F.craft('jelly', 1);
const r1 = F.repairTech('thrusters'); FH.sim(0.2);
F.recharge('lift'); FH.sim(0.2);
const r2 = F.repairTech('pulse'); FH.sim(0.2);
return { r1, r2, lift: S.cur.lift, quest: FH.QUEST.step, text: FH.QUEST.text() };
