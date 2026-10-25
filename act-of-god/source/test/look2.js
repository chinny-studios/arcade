AG.start({ size: 'metro', seed: 1013 });
AG.look(AG.W.M / 2, AG.W.M / 2, 4200, 0.75);
AG.sim(0.3); AG.render();
return AG.W.gen.water;
//--- shot island
AG.start({ size: 'mega', seed: 2026 });
AG.look(AG.W.M / 2, AG.W.M / 2, 5200, 0.8);
AG.sim(0.3); AG.render();
return AG.W.gen.water;
//--- shot delta
AG.start({ size: 'town', seed: 6078 });
const c = AG.centre();
AG.look(c.x, c.z, 900, 0.5);
AG.sim(0.3); AG.render();
return [AG.W.gen.water, AG.W.gen.relief];
//--- shot town
