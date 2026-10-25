const c = out.c = AG.centre();
out.t0 = performance.now();
let tw = 0, hs = 0; for (const b of AG.W.buildings) { if (b.kind === 'tower') tw += b.pop; if (b.kind === 'house') hs += b.pop; }
AG.look(c.x - 400, c.z + 200, 700, 0.35);
AG.cast('tornado', c.x - 400, c.z + 200, 0.7);
AG.sim(8);
AG.render();
return { towers: tw, houses: hs, s: AG.stats() };
//--- shot tornado
const c = out.c; AG.look(c.x + 300, c.z, 1100, 0.6);
AG.cast('meteor', c.x + 300, c.z, 0.35);
AG.sim(6);
AG.render();
return AG.stats();
//--- shot meteor_after
const c = out.c; AG.look(c.x, c.z - 500, 1400, 0.45);
AG.cast('volcano', c.x, c.z - 500, 0.3);
AG.sim(14);
AG.render();
return AG.stats();
//--- shot volcano
AG.sim(20);
AG.render();
return { s: AG.stats(), news: AG.news(), ms: performance.now() - out.t0 };
//--- shot volcano2
