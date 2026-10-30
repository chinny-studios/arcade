// each monster's powers on someone in the street
const r = {};
// vampire: hypnotise from 15 m, then bite; bat form flies and swoops
CF.start({ monster: 'vampire' }); CF.god();
CF.tp(-20, 0);
let v = CF.spawn('jock', -4, 0);
CF.aimAt(v); CF.press('a1'); CF.sim(0.2);
r.hypno = v.state; CF.sim(6); r.walked = +Math.hypot(v.x - CF.P.x, v.z - CF.P.z).toFixed(1);
CF.aimAt(v); CF.press('atk'); CF.sim(1.4); r.bite = v.state;
CF.press('a2'); CF.sim(0.2); r.bat = CF.P.form;
CF.hold(['jump'], 1.5); r.batY = CF.P.y;
const w = CF.spawn('greaser', CF.P.x + 4, CF.P.z - 8); w.state = 'idle'; CF.face(Math.PI); CF.aimAt(w);
CF.press('atk'); CF.sim(2); r.swoop = w.state + '/' + CF.P.form;
// werewolf pounce
CF.start({ monster: 'werewolf' }); CF.god(); CF.tp(-60, 2);
v = CF.spawn('milkman', -48, 2); CF.aimAt(v); CF.press('a1'); CF.sim(1.6); r.pounce = v.state;
// mummy lash
CF.start({ monster: 'mummy' }); CF.god(); CF.tp(60, 2);
v = CF.spawn('deputy', 80, 2); CF.aimAt(v); CF.press('a1'); CF.sim(3); r.lash = v.state;
// frank: grab a car and throw it at a couple of people
CF.start({ monster: 'frank' }); CF.god();
const car = CF.f.parkCar(-20, 0, Math.PI / 2, {});
CF.tp(-17, 0); CF.press('a1'); CF.sim(0.6); r.held = CF.P.held && CF.P.held.kind;
const a = CF.spawn('beatnik', car.x + 21, car.z), b = CF.spawn('housewife', car.x + 21.5, car.z + 1);
CF.aimAt(a); CF.press('a1'); CF.sim(2.5); r.thrown = [a.state, b.state, car.state];
return r;
//--- shot powers
// break into a house with people inside
CF.start({ monster: 'werewolf' }); CF.god();
const h = CF.TOWN.refuges.find((q) => q.kind === 'house');
const p1 = CF.spawn('housewife', h.x, h.z), p2 = CF.spawn('grandpa', h.x, h.z);
for (const p of [p1, p2]) { p.state = 'inside'; p.inside = h; h.occ.push(p); p.M.root.visible = false; p.hidden = true; }
CF.tp(h.ax, h.az); CF.tp(h.x + h.nx * 1.6, h.z + h.nz * 1.6); CF.aimAt({ x: h.x, z: h.z, y: 0 });
const near = CF.P.near && CF.P.near.label;
CF.press('use'); CF.sim(0.8); CF.press('use'); CF.sim(0.8);
return { near, broken: h.broken, states: [p1.state, p2.state] };
//--- shot door
// swoop from the air onto someone below
CF.start({ monster: 'vampire' }); CF.god(); CF.tp(-60, 0);
CF.press('a2'); CF.hold(['jump'], 1);
const s = CF.spawn('greaser', -60, -0.5 - 0) ; s.x = -52; s.z = 0;
CF.aimAt(s); CF.press('atk');
const tr = [];
for (let i = 0; i < 10; i++) { CF.sim(0.15); tr.push([CF.P.act, CF.P.form, s.state, +CF.P.y.toFixed(1), +Math.hypot(s.x - CF.P.x, s.z - CF.P.z).toFixed(1)].join(',')); }
return tr;
