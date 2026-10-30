VB.tp(-26, 18); VB.face(Math.PI, 0.25);
const crew = out.crew = [];
for (let i = 0; i < 5; i++) crew.push(VB.spawn(i === 4 ? 'gunman' : i === 3 ? 'brute' : 'thug', ['jackals', 'gearheads', 'suits'][i % 3], -26 + (i - 2) * 2.2, 26 + (i % 2) * 2));
for (const f of crew) f.aggro = true;
VB.god(); VB.sim(1.2);
VB.press('atk'); VB.sim(0.2); VB.press('atk'); VB.sim(0.2); VB.press('atk'); VB.sim(0.2); VB.press('atk'); VB.sim(0.12);
return VB.counts();
//--- shot f_spindle
VB.hero('skylark'); VB.tp(-26, 14); VB.face(Math.PI, 0.1); VB.aimAt(out.crew[3]);
VB.hold(['q'], 0.5);
VB.Input.held2.add('q'); VB.sim(0.3);
return VB.counts();
//--- shot f_skylark
VB.Input.held2.delete('q'); VB.sim(1);
VB.hero('bulwark'); VB.tp(-6, 12); VB.face(-Math.PI / 2, 0.15);
const car = VB.f.placeCar(VB.CARS.list[3], -2, 12, 0, 30, true);
VB.press('rmb'); VB.sim(0.6);
return { held: !!VB.P.held };
//--- shot f_bulwark
VB.hero('equinox'); VB.tp(-26, 14); VB.face(Math.PI, 0.2);
for (let i = 0; i < 4; i++) { const f = VB.spawn('thug', 'suits', -26 + (i - 1.5) * 2, 24); f.aggro = true; }
VB.sim(0.5); VB.press('q'); VB.sim(0.2); VB.press('rmb'); VB.sim(0.3);
return VB.counts();
//--- shot f_equinox
