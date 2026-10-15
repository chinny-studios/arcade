FH.mute(); FH.sim(0.5);
const pl = FH.SYS.cur.planets[0];
// night: spin the planet half a turn
pl.spin += Math.PI; FH.sim(0.3);
return { day: FH.ENV.day.toFixed(2), temp: Math.round(FH.ENV.temp) };
//--- shot night
P.torch = true; FH.sim(0.2); return 1;
//--- shot night_torch
const pl = FH.SYS.cur.planets[0];
P.torch = false; pl.spin -= Math.PI; FH.sim(0.2);
F.WEATHER.force(pl, true); FH.sim(2);
return { storm: F.WEATHER.get(pl).name, haz: Math.round(P.stats.haz), temp: Math.round(FH.ENV.temp) };
//--- shot storm
const pl = FH.SYS.cur.planets[0];
F.WEATHER.force(pl, false); FH.sim(0.5);
// lush ocean world in the start system
const lush = FH.SYS.cur.planets.find((p) => p.type === 'lush');
out.lush = lush.idx;
const toStar = lush.pos.clone().negate().normalize().applyQuaternion(lush.group.quaternion.clone().invert());
let best = null;
for (let k = 0; k < 400; k++) { const d = toStar.clone().add(new THREE.Vector3(Math.sin(k * 1.7), Math.cos(k * 2.3), Math.sin(k * 0.9)).multiplyScalar(0.5)).normalize(); const h = F.surfaceH(lush, d); if (lush.P.sea != null && h > lush.P.sea + 1 && h < lush.P.sea + 6) { best = d; break; } }
best = best || toStar;
FH.tpPlanet(lush.idx, Math.asin(best.y), Math.atan2(best.z, best.x)); FH.sim(0.5); FH.stream(20);
// face the lowest nearby direction (toward the sea)
const up = P.pos.clone().normalize(); let bd = null, bh = 1e9;
for (let a = 0; a < 16; a++) { const t = new THREE.Vector3(0, 1, 0).cross(up).normalize().applyAxisAngle(up, a / 16 * Math.PI * 2); const d = up.clone().addScaledVector(t, 80 / lush.R).normalize(); const h = F.surfaceH(lush, d); if (h < bh) { bh = h; bd = t; } }
FH.aimAt(P.pos.clone().addScaledVector(bd, 60).addScaledVector(up, -2)); FH.sim(0.2);
return { type: lush.type, sea: lush.P.sea, fauna: FH.FAUNA.live.length, flora: lush.flora.toFixed(2) };
//--- shot lush
// fly over it: put the ship 120 m up heading along the terrain
F.boardShip(); S.state = 'flight'; F.shipChangeFrame(FH.P.frame);
const u2 = P.pos.clone().normalize();
S.pos.copy(P.pos).addScaledVector(u2, 120);
const t2 = new THREE.Vector3(0, 1, 0).cross(u2).normalize();
const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), t2.clone(), u2); S.q.setFromRotationMatrix(m);
S.camQ.copy(S.q); S.speed = 140; S.vel.copy(t2).multiplyScalar(-140);
FH.sim(3); FH.stream(10); FH.sim(0.5);
return { alt: Math.round(S.alt), speed: Math.round(S.speed) };
//--- shot fly_low
// high altitude
S.pos.multiplyScalar((S.pos.length() + 1500) / S.pos.length()); S.camQ.copy(S.q); FH.sim(1);
return { alt: Math.round(S.alt) };
//--- shot fly_high
