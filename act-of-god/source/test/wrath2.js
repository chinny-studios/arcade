// find a coastal city
let info;
for (let s = 1; s < 60; s++) { info = AG.start({ size: 'city', seed: s * 7919 }); if (AG.W.gen.water === 'coast' || AG.W.gen.water === 'bay') { info.seed = s * 7919; break; } }
const c = out.c = AG.centre();
AG.G.hour = 13;
AG.look(c.x, c.z, 900, 0.55);
AG.cast('quake', c.x, c.z, 0.55);
AG.sim(10);
AG.render();
return { info, s: AG.stats() };
//--- shot quake
const c = out.c;
AG.look(c.x + 500, c.z - 300, 500, 0.5);
AG.cast('sinkhole', c.x + 500, c.z - 300, 0.6);
AG.cast('smite', c.x + 600, c.z - 200, 0.4);
AG.sim(3.5);
AG.render();
return AG.stats();
//--- shot sinkhole_smite
// tsunami from the sea
const W = AG.W, g = W.gen;
const d = g.coastDir, M = W.M;
const sx = d === 1 ? M - g.coastPos * 0.5 : d === 3 ? g.coastPos * 0.5 : M / 2, sz = d === 0 ? g.coastPos * 0.5 : d === 2 ? M - g.coastPos * 0.5 : M / 2;
const lx = d === 1 ? M - g.coastPos - 300 : d === 3 ? g.coastPos + 300 : M / 2, lz = d === 0 ? g.coastPos + 300 : d === 2 ? M - g.coastPos - 300 : M / 2;
AG.look(lx, lz, 1300, 0.5);
AG.cast('tsunami', sx, sz, 0.7);
AG.sim(12);
AG.render();
out.l = [lx, lz];
return AG.stats();
//--- shot tsunami
AG.sim(12);
AG.render();
return AG.stats();
//--- shot tsunami2
