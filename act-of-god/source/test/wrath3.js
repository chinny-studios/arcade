const info = AG.start({ size: 'town', seed: 4242 });
const c = out.c = AG.centre();
AG.G.hour = 15;
AG.look(c.x, c.z, 700, 0.55);
for (let i = 0; i < 8; i++) { AG.cast('lightning', c.x + (i - 4) * 40, c.z, 0.4); AG.sim(0.3); }
AG.cast('wildfire', c.x - 350, c.z + 300, 0.6);
AG.cast('wildfire', c.x - 330, c.z + 260, 0.6);
AG.cast('locusts', c.x + 300, c.z - 300, 0.6);
AG.sim(6);
AG.render();
return { info, s: AG.stats() };
//--- shot lightning_fire_locusts
const c = out.c;
AG.sim(20);
AG.look(c.x - 300, c.z + 250, 700, 0.6);
AG.render();
return AG.stats();
//--- shot wildfire_later
const c = out.c;
AG.cast('blizzard', c.x, c.z, 0.5);
AG.cast('plague', c.x + 100, c.z + 100, 0.5);
AG.sim(25);
AG.look(c.x, c.z, 600, 0.5);
AG.render();
return AG.stats();
//--- shot blizzard
const c = out.c;
AG.G.hour = 23;
AG.cast('blackout', c.x + 200, c.z, 0.3);
AG.sim(2);
AG.look(c.x, c.z, 900, 0.45);
AG.render();
return AG.stats();
//--- shot blackout_night
const c = out.c;
AG.G.hour = 12;
AG.cast('hurricane', c.x, c.z, 0.5);
for (let i = 0; i < 40; i++) { AG.cast('deluge', c.x + 200, c.z - 200, 0.5, { dt: 0.25 }); AG.sim(0.25); }
AG.look(c.x + 200, c.z - 200, 800, 0.5);
AG.render();
return { s: AG.stats(), news: AG.news().slice(0, 6) };
//--- shot hurricane_deluge
