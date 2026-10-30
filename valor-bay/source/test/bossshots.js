VB.start({ hero: 'spindle', god: true, at: { x: 2, z: 100 } });
const b = out.b = VB.boss('mauler', 2, 86);
for (let i = 0; i < 3; i++) { const f = VB.spawn('thug', 'gearheads', -3 + i * 3, 88); f.aggro = true; }
VB.face(0, 0.12); VB.sim(1.5);
return VB.stats();
//--- shot b_mauler
VB.start({ hero: 'equinox', god: true, at: { x: 2, z: 100 } });
const k = VB.boss('kilowatt', 2, 84); VB.face(0, 0.1); VB.sim(2.5);
k.move = 'storm'; k.t = 0; k.marks = null; k.did = false; VB.sim(1.3);
return { move: k.move };
//--- shot b_kilowatt
VB.start({ hero: 'blitz', god: true, at: { x: 2, z: 100 } });
const o = VB.boss('overclock', 2, 80); VB.face(0, -0.25); VB.sim(3);
o.move = 'laser'; o.t = 0; VB.sim(1.2);
return { move: o.move, y: o.y };
//--- shot b_overclock
VB.start({ hero: 'skylark', at: { x: 2, z: 100 }, tod: 22 });
VB.face(0, -0.1); VB.press('travel'); VB.hold(['travel'], 2.5, { x: 0, y: -1 });
return VB.stats();
//--- shot night
