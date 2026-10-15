// From repaired ship to orbit, the station, trade and a warp
FH.mute();
FH.give('ferrite', 250); FH.give('carbon', 60); FH.give('dihydro', 200);
F.repairTech('scanner'); F.craft('plate', 3); F.craft('seal', 1); F.craft('jelly', 1);
F.repairTech('thrusters'); F.recharge('lift'); F.repairTech('pulse');
FH.QUEST.step = 8;
// look at the ship from outside
const up = S.pos.clone().normalize();
P.pos.copy(S.pos).add(new THREE.Vector3(-1, 0, -1).normalize().applyQuaternion(S.q).multiplyScalar(14)); P.pos.setLength(P.pos.length() + 2);
FH.sim(0.5); FH.aimAt(S.pos.clone().addScaledVector(up, 2.5)); FH.sim(0.1);
return { ship: S.state, quest: FH.QUEST.step };
//--- shot ship
F.boardShip(); FH.sim(0.5);
FH.press('Space'); FH.sim(1.0);
return { state: S.state, lift: S.cur.lift, alt: S.pos.length() - S.frame.pl.R };
//--- shot takeoff
FH.sim(2);
// climb: pitch up, boost
const t0 = performance.now();
let frames = 0;
FH.Input.press('ShiftLeft');
while (S.frame && frames < 30 * 60) { const upv = S.pos.clone().normalize(); const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(S.q); const e = 0.8 - fwd.dot(upv); S.stick.set(0, -Math.max(-1, Math.min(1, e * 3))); FH.sim(1 / 30); frames++; if (frames === 150) out.alt150 = S.alt; }
FH.Input.release('ShiftLeft'); FH.sim(0.1);
return { frame: S.frame ? 'planet' : 'space', frames, alt150: out.alt150, quest: FH.QUEST.step, speed: S.speed, ms: performance.now() - t0 };
//--- shot orbit
// turn back to look at the planet
const pl = FH.SYS.cur.planets[0];
const toPl = pl.pos.clone().sub(S.pos).normalize();
S.q.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), toPl)); S.camQ.copy(S.q);
FH.sim(0.3);
return { dist: Math.round(S.pos.distanceTo(pl.pos)) };
//--- shot space
// pulse toward the station
const st = FH.STATION;
const mouthW = st.obj.localToWorld(new THREE.Vector3(0, 18, -400));
S.pos.copy(mouthW); const inward = st.obj.localToWorld(new THREE.Vector3(0, 18, 0)).sub(mouthW).normalize();
S.q.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), inward)); S.camQ.copy(S.q); S.speed = 120; S.vel.copy(inward).multiplyScalar(120);
FH.sim(0.5);
return { d: Math.round(S.pos.distanceTo(st.pos)) };
//--- shot station
let n = 0; while (S.state !== 'landed' && n < 30 * 40) { FH.sim(1 / 30); n++; }
FH.sim(0.5);
return { state: S.state, frame: S.frame && S.frame.kind, quest: FH.QUEST.step, secs: n / 30 };
//--- shot docked
F.exitShip(); FH.sim(0.5);
P.pos.set(-14, 3.1, 41.5); FH.sim(0.5);
FH.aimAt(new THREE.Vector3(-14, 4.4, 44)); FH.sim(0.2);
FH.press('KeyE'); FH.sim(0.2);
return { ui: FH.UI.cur, frame: P.frame && P.frame.kind, onGround: P.onGround, y: P.pos.y };
//--- shot trade
document.querySelector('[data-act="sell"][data-n="all"]').click();
FH.UI.close(); FH.sim(0.2);
return { quest: FH.QUEST.step, units: P.units };
//--- shot hangar
FH.give('plate', 3); FH.give('chromatic', 100); FH.give('weave', 2); FH.give('warpcell', 2);
const built = F.buildTech('warpdrive');
FH.UI.open('map'); FH.sim(0.1);
const target = F.bestHopToward(FH.GALAXY.core);
FH.GALAXY.target = target;
FH.UI.render(); FH.UI.mapInit(); FH.UI.mapDraw(0.016);
return { built, target: target && target.name, check: F.warpCheck(target) };
//--- shot map
FH.UI.close();
F.boardShip(); FH.press('Space'); FH.sim(8);
const inSpace = !S.frame;
FH.Input.press('KeyH'); FH.sim(1.5); FH.Input.release('KeyH');
FH.sim(2.5);
return { inSpace, warp: FH.f.WEATHER && window.FH.SHIP.state, sys: FH.SYS.cur.name, active: true };
//--- shot tunnel
FH.sim(4);
return { sys: FH.SYS.cur.name, quest: FH.QUEST.step, state: S.state, frame: S.frame };
//--- shot arrived
