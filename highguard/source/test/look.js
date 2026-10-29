HG.manual(true);
HG.render();
//--- shot title
HG.start({ mission: 0, seed: 3 });
HG.run(2);
HG.render();
//--- shot start
const e = HG.enemy(0);
HG.place(e, 1100, 70, 5, 0);
HG.aimAt(e);
HG.run(0.5);
HG.fire();
HG.run(1.2);
HG.render();
return HG.state();
//--- shot fire
