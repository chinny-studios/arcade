// Skylark flies, Blitz runs up a wall and over water, Bulwark leaps
const r = out.r = {};
VB.hero('skylark'); VB.tp(2, 100); VB.face(0, -0.2);
VB.press('travel'); VB.hold([], 1, { x: 0, y: -1 }); VB.hold(['travel'], 2.5, { x: 0, y: -1 });
r.fly = VB.stats(); 
VB.render();
return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, JSON.stringify(v).replace(/"(foes|crimes|combo|arrests|wave|score|meter|hp|cars|calls|tris)":[^,]*,?/g, "")]));
//--- shot t_fly
const r = out.r; VB.hero('blitz'); VB.tp(2, 150); VB.face(0, 0.15);
VB.hold(['travel'], 2, { x: 0, y: -1 });
r.speed = VB.stats();
return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, JSON.stringify(v).replace(/"(foes|crimes|combo|arrests|wave|score|meter|hp|cars|calls|tris)":[^,]*,?/g, "")]));
//--- shot t_speed
const r = out.r;
VB.tp(6.5, 100); VB.face(-Math.PI / 2, 0.1);
VB.hold(['travel'], 1.2, { x: 0, y: -1 });
r.wallrun = VB.stats();
VB.tp(0, 395); VB.face(Math.PI, 0.1);
VB.hold(['travel'], 2.5, { x: 0, y: -1 });
r.water = VB.stats();
VB.hero('bulwark'); VB.tp(2, 150); VB.face(0, 0.3);
VB.hold(['travel'], 1.0); VB.sim(0.1);
const t0 = VB.stats(); VB.sim(1.4);
r.leap = [t0, VB.stats()];
return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, JSON.stringify(v).replace(/"(foes|crimes|combo|arrests|wave|score|meter|hp|cars|calls|tris)":[^,]*,?/g, "")]));
//--- shot t_leap
const r = out.r; VB.sim(3); r.land = VB.stats();
return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, JSON.stringify(v).replace(/"(foes|crimes|combo|arrests|wave|score|meter|hp|cars|calls|tris)":[^,]*,?/g, "")]));
