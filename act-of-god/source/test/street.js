// close to the streets: people on the sidewalks, cars on the roads, camera never inside a building
AG.start({ size: 'town', seed: 4242 });
const c = AG.centre(); AG.G.hour = 11;
AG.look(c.x, c.z, 60, 0.35);
AG.sim(5); AG.render();
const p = AG.R.camera.position, b = AG.W.buildings.find((q) => q.state === 0 && Math.abs(p.x - q.x) < q.w / 2 && Math.abs(p.z - q.z) < q.d / 2 && p.y < q.y + q.h);
return { peds: AG.TR.peds.filter((q) => q.on).length, cars: AG.TR.cars.filter((q) => q.on).length, camInside: !!b };
//--- shot street
const c = AG.centre();
AG.look(c.x + 40, c.z + 30, 110, 0.75);
AG.sim(2); AG.render();
//--- shot street_mid
