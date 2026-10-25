AG.start({ size: 'town', seed: 4242 });
const c = AG.centre(); AG.G.hour = 11;
AG.look(c.x, c.z, 60, 0.35);
AG.sim(3);
// park every car so only people remain, then make people ten times bigger
for (const q of AG.TR.cars) q.on = false;
const cam = AG.R.camera; cam.updateMatrixWorld();
const p = AG.TR.peds.filter((p) => p.on).sort((a, b) => Math.hypot(a.x - AG.CAM.tx, a.z - AG.CAM.tz) - Math.hypot(b.x - AG.CAM.tx, b.z - AG.CAM.tz))[0];
const v = new THREE.Vector3(p.x, p.y + 1, p.z).project(cam);
const m = new THREE.Matrix4(); AG.TR.ped.mesh.getMatrixAt(p.pi, m);
const e = m.elements;
out.p = p;
return { screen: [((v.x + 1) / 2 * innerWidth) | 0, ((1 - v.y) / 2 * innerHeight) | 0, v.z.toFixed(3)], pos: [p.x.toFixed(1), p.y.toFixed(1), p.z.toFixed(1)], mat: [e[0], e[5], e[10], e[12], e[13], e[14]].map((x) => +x.toFixed(2)), col: Array.from(AG.TR.ped.aCol.array.slice(p.pi * 3, p.pi * 3 + 3)).map((x) => +x.toFixed(2)), st2: Array.from(AG.TR.ped.aSt2.array.slice(p.pi * 4, p.pi * 4 + 4)) };
//--- shot street2
const p = out.p;
const b = AG.pick ? null : null;
let inside = [];
for (const q of AG.W.buildings) { const c = Math.cos(q.rot), s = Math.sin(q.rot), dx = p.x - q.x, dz = p.z - q.z; const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) <= q.w / 2 && Math.abs(lz) <= q.d / 2) inside.push([q.kind, q.x | 0, q.z | 0, q.w | 0, q.d | 0, q.rot.toFixed(2)]); }
const e = p.e;
return { inside, edge: { ax: e.a.x, az: e.a.z, bx: e.b.x, bz: e.b.z, w: e.w, cls: e.cls, axis: e.axis }, side: p.side };
