const res = {};
for (const size of ['small', 'town', 'mega']) {
  const t0 = performance.now();
  const info = AG.start({ size, seed: 777 });
  const t1 = performance.now();
  AG.sim(1);
  const t2 = performance.now();
  for (let i = 0; i < 30; i++) AG.sim(1 / 30);
  const t3 = performance.now();
  res[size] = { gen: Math.round(t1 - t0), stepMs: +((t3 - t2) / 30).toFixed(1), b: info.buildings, trees: info.trees, pop: info.pop, edges: info.edges };
}
const c = AG.centre();
AG.look(c.x, c.z, 1800, 0.6);
AG.render();
return res;
//--- shot mega
const c = AG.centre();
const t0 = performance.now();
AG.cast('quake', c.x, c.z, 0.7);
AG.cast('meteor', c.x + 800, c.z + 300, 0.6);
AG.sim(10);
res2 = { ms: Math.round(performance.now() - t0), s: AG.stats() };
AG.look(c.x + 400, c.z + 200, 2500, 0.6);
AG.render();
return res2;
//--- shot mega_disaster
