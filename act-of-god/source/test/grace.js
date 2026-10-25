const info = AG.start({ size: 'city', seed: 39595 });
const c = out.c = AG.centre();
AG.G.hour = 12;
AG.cast('meteor', c.x + 200, c.z, 0.3);
AG.cast('plague', c.x - 300, c.z, 0.5);
AG.sim(8);
out.before = AG.stats();
AG.look(c.x + 200, c.z, 900, 0.55);
AG.render();
return { info, s: out.before };
//--- shot g_before
const c = out.c;
for (let i = 0; i < 25; i++) { AG.cast('restore', c.x + 200, c.z, 0.45); AG.cast('quench', c.x + 200, c.z, 0.6); AG.sim(0.15); }
for (let i = 0; i < 5; i++) { AG.cast('heal', c.x - 300, c.z, 0.6); AG.sim(0.3); }
AG.sim(4);
AG.render();
return AG.stats();
//--- shot g_restored
const c = out.c;
const r = AG.cast('resurrect', c.x + 200, c.z, 0.4);
AG.cast('rainbow', c.x, c.z, 0.5);
AG.cast('shield', c.x - 200, c.z + 300, 0.3);
AG.sim(2);
AG.cast('meteor', c.x - 200, c.z + 300, 0.15);
AG.sim(5);
AG.look(c.x - 100, c.z + 200, 1100, 0.4);
AG.render();
return { r, s: AG.stats(), news: AG.news().slice(0, 6) };
//--- shot g_rainbow_shield
const c = out.c;
for (let i = 0; i < 30; i++) { AG.cast('grow', c.x + 500, c.z + 400, 0.5); AG.cast('bloom', c.x + 500, c.z + 400, 0.5); AG.sim(0.15); }
AG.cast('gold', c.x + 500, c.z + 400, 0.3);
AG.sim(5);
AG.look(c.x + 500, c.z + 400, 700, 0.5);
AG.render();
return AG.stats();
//--- shot g_grow_gold
const W = AG.W, g = W.gen, d = g.coastDir, M = W.M;
const sx = d === 1 ? M - g.coastPos : d === 3 ? g.coastPos : M / 2, sz = d === 0 ? g.coastPos : d === 2 ? M - g.coastPos : M / 2;
// a line from the shore out to sea
const ox = d === 1 ? 1 : d === 3 ? -1 : 0, oz = d === 0 ? -1 : d === 2 ? 1 : 0;
AG.cast('part', sx - ox * 50, sz - oz * 50, 0.4, { bx: sx + ox * 500 + 1, bz: sz + oz * 500 + 1 });
for (let i = 0; i < 40; i++) { AG.cast('raise', sx + oz * 400 + ox * 200, sz + ox * 400 + oz * 200, 0.4, { dt: 0.1 }); AG.sim(0.1); }
AG.sim(6);
AG.look(sx + ox * 250, sz + oz * 250, 900, 0.6);
AG.render();
return AG.stats();
//--- shot g_part_raise
