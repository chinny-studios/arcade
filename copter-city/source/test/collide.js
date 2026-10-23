// collisions: walls stop the rotor tips, fast flight can't tunnel, cars block the helicopter, the pilot and the
// bucket, the bucket and ladder stay out of walls, the ship and crash wrecks are solid
const H = CC.HELI, G = CC.G, r = {};
const B = CC.CITY.buildings.filter((b) => b.h > 30 && !b.gable).sort((a, b) => b.h - a.h)[0];
const zc = (B.z0 + B.z1) / 2;
// head-on into a tower in every helicopter: how close does the nearest part get?
r.walls = {};
for (const id of ['sparrow', 'firehawk', 'hauler', 'raptor']) {
  F.switchHeli(id); H.hp = 1e6;
  CC.tp(B.x1 + 60, zc, 0); CC.tp(B.x1 + 60, zc, 25, Math.PI / 2); CC.hold({ fwd: 1 }, 5);
  let minX = 1e9; H.model.group.updateMatrixWorld(true);
  H.model.group.traverse((o) => { if (o.isMesh && o.geometry.boundingSphere !== undefined) { const p = new THREE.Vector3(); o.getWorldPosition(p); minX = Math.min(minX, p.x); } });
  r.walls[id] = { gap: +(minX - B.x1).toFixed(1), inside: minX < B.x1 - 0.5 };
}
// fast flight: 64 m/s Raptor at a thin stand or a short building, then a 200 km/h dive at a roof
F.switchHeli('raptor'); H.hp = 1e6;
const thin = CC.CITY.buildings.filter((b) => !b.gable && b.h > 8 && b.x1 - b.x0 < 12).sort((a, b) => (a.x1 - a.x0) - (b.x1 - b.x0))[0] || B;
CC.tp(thin.x1 + 120, (thin.z0 + thin.z1) / 2, 0); CC.tp(thin.x1 + 120, (thin.z0 + thin.z1) / 2, Math.min(thin.h * 0.5, 20), Math.PI / 2);
H.vx = -64; CC.hold({ fwd: 1 }, 3);
r.tunnel = { width: +(thin.x1 - thin.x0).toFixed(1), x: Math.round(H.x), wall: Math.round(thin.x1), through: H.x < thin.x0 };
// cars: hover low over a busy road and let traffic come
const car = CC.TRAFFIC.cars.find((c) => !c.big && !c.dead); car.stop = 99; car.vmax = 0; car.v = 0; CC.sim(0.2);
CC.tp(car.x, car.z, 6); H.hp = 1e6; CC.hold({ lift: -1 }, 3);
r.car = { y: +H.y.toFixed(2), above: H.y > 1.5, hit: G.lastHit && G.lastHit.car };
// the pilot walks into a stopped car
CC.tp(B.x1 + 60, zc, 0); F.exitHeli();
const c2 = CC.TRAFFIC.cars.find((c) => !c.dead); c2.vmax = 0; c2.v = 0; c2.stop = 99; CC.sim(0.1);
Object.assign(CC.PILOT, { x: c2.x + 4 * Math.cos(c2.yaw), z: c2.z - 4 * Math.sin(c2.yaw), y: 0.03 });
const pyaw = Math.atan2(c2.x - CC.PILOT.x, c2.z - CC.PILOT.z);
CC.CAM.yaw = pyaw + Math.PI; CC.CAM.userYaw = 0; CC.G.inp = null;
CC.Input.keys.add('KeyW'); CC.sim(2); CC.Input.keys.delete('KeyW');
r.pilot = { gap: +Math.hypot(CC.PILOT.x - c2.x, CC.PILOT.z - c2.z).toFixed(2) };
Object.assign(CC.PILOT, { x: H.x + 2, z: H.z + 2, y: H.y }); CC.press('use');
// the bucket swings into a wall: fly past a tower just low enough for the bucket to hit it
F.switchHeli('firehawk'); H.hp = 1e6; F.selectEquip('bucket');
CC.tp(B.x1 + 20, zc - 40, 0); CC.tp(B.x1 + 9, zc - 40, 22, 0); CC.sim(2);
let deepest = 0;
for (let i = 0; i < 40; i++) { CC.hold({ fwd: 0.6 }, 0.1); const b = H.bucket; if (b.z > B.z0 && b.z < B.z1 && b.y < B.h) deepest = Math.max(deepest, B.x1 - b.x); }
r.bucket = { deepest: +deepest.toFixed(2), clear: deepest < 0.3 };
// the ladder hanging beside a wall
F.selectEquip('ladder'); CC.tp(B.x1 + 5, zc, 25, Math.PI / 2); CC.sim(3);
const L = H.ladder;
r.ladder = { len: +L.len.toFixed(1), gap: +(L.x - B.x1).toFixed(2), clear: L.x > B.x1 };
// the ship: you can't fly through her
CC.f.startCity({ city: 'halley', heli: 'sparrow', free: true, hour: 12, quiet: true, dispatch: false });
const s = CC.call('ship'); H.hp = 1e6;
// head for her bridge at a height below its roof
const yaw = s.ship.rotation.y, bx = s.x + Math.sin(yaw) * 8, bz = s.z + Math.cos(yaw) * 8;
CC.tp(bx, bz + 40, 3.2, 0); G.lastHit = null; CC.hold({ fwd: 1 }, 4);
r.ship = { gap: +Math.hypot(H.x - bx, H.z - bz).toFixed(1), stopped: Math.hypot(H.x - bx, H.z - bz) > 3, hit: !!G.lastHit };
return r;
