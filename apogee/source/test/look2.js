AP.god(); AP.peace();
AP.tp(4, 20, -Math.PI / 2 + 0.5); AP.sim(0.2); AP.render();
//--- shot m2_bay
AP.tp(20, 16, -Math.PI / 2); AP.sim(0.2); AP.render();
//--- shot m2_spine
AP.tp(29, 10, 0); AP.sim(0.2); AP.render();
//--- shot m2_mainframe
AP.tp(20, 4, 0.3); AP.look(0.3, 0.1); AP.sim(0.2); AP.render();
//--- shot m2_corridor
AP.tp(18, 22, -Math.PI / 2); AP.sim(0.2); AP.render();
//--- shot m2_hydro
return AP.reach();
