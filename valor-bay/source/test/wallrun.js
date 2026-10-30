VB.start({ hero: 'blitz', at: { x: -6, z: 100 } });
VB.face(-Math.PI / 2, 0.1);
const log = [];
for (let i = 0; i < 14; i++) { VB.hold(['travel'], 0.25, { x: 0, y: -1 }); log.push(VB.P.mode[0] + ' x' + VB.P.x.toFixed(0) + ' y' + VB.P.y.toFixed(0) + ' v' + Math.hypot(VB.P.vx, VB.P.vy, VB.P.vz).toFixed(0)); }
return log.join(' | ');
//--- shot wallrun
