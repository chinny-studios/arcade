// Visit planets of different archetypes across a few systems and look around
FH.mute();
const seen = {}; out.list = [];
for (let si = 0; si < 40 && Object.keys(seen).length < 8; si++) {
  const star = FH.GALAXY.stars[5 + si * 9];
  const S = F.arriveSystem(star);
  for (const pl of S.planets) if (!seen[pl.type]) { seen[pl.type] = 1; out.list.push({ star: star.i, idx: pl.idx, type: pl.type }); }
}
out.i = 0;
return { workers: FH.POOL.async, list: out.list };
//--- shot pt_0
{ const e = out.list[0]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
//--- shot pt_1
{ const e = out.list[1]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
//--- shot pt_2
{ const e = out.list[2]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
//--- shot pt_3
{ const e = out.list[3]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
//--- shot pt_4
{ const e = out.list[4]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
//--- shot pt_5
{ const e = out.list[5]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
//--- shot pt_6
{ const e = out.list[6]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
//--- shot pt_7
{ const e = out.list[7]; if (e) { F.arriveSystem(FH.GALAXY.stars[e.star]); const pl = FH.SYS.cur.planets[e.idx];
  // find a daylit spot: point toward the star
  const toStar = pl.pos.clone().negate().normalize(); const q = pl.group.quaternion.clone().invert(); const d = toStar.clone().applyQuaternion(q).add(new THREE.Vector3(0.3, 0.25, 0.1)).normalize();
  let dd = d; for (let k = 0; k < 20 && pl.P.sea != null && F.surfaceH(pl, dd) < pl.P.sea + 2; k++) dd = d.clone().add(new THREE.Vector3(Math.sin(k), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.15)).normalize();
  FH.P.inShip = false; F.placePlayer ? 0 : 0;
  const lat = Math.asin(dd.y), lon = Math.atan2(dd.z, dd.x); FH.tpPlanet(e.idx, lat, lon); FH.sim(0.6); FH.stream(20);
  const up = P.pos.clone().normalize(); const t = new THREE.Vector3(0, 1, 0).cross(up).normalize();
  FH.aimAt(P.pos.clone().addScaledVector(t, 60).addScaledVector(up, 4)); FH.sim(0.2);
  return { type: pl.type, name: pl.name, temp: Math.round(FH.ENV.temp), sea: pl.P.sea, flora: pl.flora.toFixed(2), fauna: FH.FAUNA.live.length }; } return 'none'; }
