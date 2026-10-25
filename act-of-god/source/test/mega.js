AG.start({ size: 'mega', seed: 777 });
const c = AG.centre();
AG.look(c.x, c.z, 1800, 0.6);
AG.G.hour = 16;
AG.sim(0.5);
AG.render();
//--- shot mega
AG.G.hour = 21.5;
AG.sim(0.5);
AG.render();
//--- shot mega_night
