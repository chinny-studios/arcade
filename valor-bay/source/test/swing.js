// Spindle swings north up the avenue at x = 0, then crawls up a wall
VB.tp(2, 150); VB.face(0, 0.1);
const log = [];
for (let i = 0; i < 16; i++) { VB.hold(['travel'], 0.4, { x: 0, y: -1 }); const s = VB.P; log.push([s.mode, +s.x.toFixed(0), +s.y.toFixed(0), +s.z.toFixed(0), +Math.hypot(s.vx, s.vy, s.vz).toFixed(0)]); }
return log;
//--- shot swing1
VB.hold(['travel'], 0.5, { x: 0, y: -1 });
return VB.stats();
//--- shot swing2
// walk into a building wall from the sidewalk
VB.tp(6.8, 30); VB.face(-Math.PI / 2, 0.2);
const l2 = [];
for (let i = 0; i < 8; i++) { VB.hold([], 0.5, { x: 0, y: -1 }); l2.push([VB.P.mode, +VB.P.x.toFixed(1), +VB.P.y.toFixed(1), +VB.P.z.toFixed(1)]); }
return l2;
//--- shot crawl
