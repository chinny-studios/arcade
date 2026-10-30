VB.tp(2, 150); VB.face(0, 0.1);
const log = [];
for (let i = 0; i < 40; i++) { VB.hold(['travel'], 0.15, { x: 0, y: -1 }); const s = VB.P; log.push(s.mode[0] + ' y' + s.y.toFixed(0) + ' z' + s.z.toFixed(0) + ' v' + Math.hypot(s.vx, s.vy, s.vz).toFixed(0) + (s.pivot && s.mode === 'swing' ? ' ay' + s.pivot.y.toFixed(0) + ' L' + s.ropeL.toFixed(0) : '')); }
return log.join(' | ');
