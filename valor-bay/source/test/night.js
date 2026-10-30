VB.start({ hero: 'skylark', at: { x: 2, z: 100 }, tod: 22 });
VB.face(0, -0.1); VB.press('travel'); VB.hold(['travel'], 2.5, { x: 0, y: -1 });
return VB.stats();
//--- shot night
VB.tp(6.5, 60); VB.face(0.3, 0.15); VB.sim(0.5);
return VB.stats();
//--- shot night2
VB.tod(18.4); VB.tp(2, 100); VB.face(0, -0.1); VB.press('travel'); VB.hold([], 1.5, { x: 0, y: -0.6 }); VB.hold(['jump'], 2, { x: 0, y: -1 });
return VB.stats();
//--- shot sunset
