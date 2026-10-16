// Draw calls and triangles on typical floors. node test/smoke.mjs --steps test/perf.js
const r = {};
for (const [area, fl] of [['forest', 0], ['caves', 1], ['mines', 0], ['ruins', 1], ['ruins', 2]]) {
  VB.start({ role: 'psion', level: 20, allies: 3 }); F.buildFloor(area, fl, 0, 'perf' + area); VB.god(true);
  VB.toRoom(fl === 2 ? 1 : VB.LV.rooms.findIndex((q) => q.type === 'pack')); VB.sim(fl === 2 ? 4 : 2);
  VB.render(); const i = VB.R.renderer.info;
  r[area + fl] = { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, ents: VB.ENTS.length };
}
const t0 = performance.now(); for (let k = 0; k < 5; k++) VB.render(); r.msPerFrameSwiftShader = Math.round((performance.now() - t0) / 5);
return r;
