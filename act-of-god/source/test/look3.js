// a river city, a lake city and a town street with its cars and people
const find = (size, water) => { for (let s = 1; s < 80; s++) { AG.start({ size, seed: s * 7331 + 17 }); if (AG.W.gen.water === water) return s; } };
find('city', 'lake');
let c = AG.centre(); AG.G.hour = 11;
AG.look(c.x, c.z, 1700, 0.75); AG.sim(0.3); AG.render();
return AG.W.name;
//--- shot lake_city
const find = (size, water) => { for (let s = 1; s < 80; s++) { AG.start({ size, seed: s * 7331 + 17 }); if (AG.W.gen.water === water) return s; } };
find('city', 'river');
const c = AG.centre(); AG.G.hour = 11;
AG.look(c.x, c.z, 1700, 0.75); AG.sim(0.3); AG.render();
return AG.W.name;
//--- shot river_city
AG.start({ size: 'town', seed: 4242 });
const c = AG.centre(); AG.G.hour = 10;
AG.look(c.x, c.z, 520, 0.55); AG.sim(4); AG.render();
return { cars: AG.TR.cars.filter((q) => q.on).length, peds: AG.TR.peds.filter((p) => p.on).length };
//--- shot town_street
