// down at the street: a low close-up of the street nearest the city centre
AG.start({ size: 'city', seed: 39595 });
const c = AG.centre(); AG.G.hour = 13;
const e = AG.W.edges.slice().sort((a, b) => Math.hypot((a.a.x + a.b.x) / 2 - c.x, (a.a.z + a.b.z) / 2 - c.z) - Math.hypot((b.a.x + b.b.x) / 2 - c.x, (b.a.z + b.b.z) / 2 - c.z))[0];
const x = (e.a.x + e.b.x) / 2, z = (e.a.z + e.b.z) / 2;
AG.look(x, z, 45, 0.55, e.axis === 'x' ? 0.5 : 2.0);
AG.sim(3); AG.render();
return { near: AG.TR.peds.filter((p) => p.on && Math.hypot(p.x - x, p.z - z) < 50).length, cars: AG.TR.cars.filter((q) => q.on && Math.hypot(q.x - x, q.z - z) < 50).length };
//--- shot street3
