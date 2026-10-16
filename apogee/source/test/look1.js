AP.god(); AP.peace();
AP.tp(10, 24, 0); AP.sim(0.2); AP.render();
//--- shot m1_yard
AP.tp(13, 7, -Math.PI / 2); AP.sim(0.2); AP.render();
//--- shot m1_control
AP.tp(29, 13, -0.75); AP.look(-0.75, 0.25); AP.sim(0.2); AP.render();
//--- shot m1_pad
AP.tp(28, 25, -Math.PI / 2 - 0.1); AP.sim(0.2); AP.render();
//--- shot m1_hangar
AP.tp(31, 13, 0); AP.look(0, -0.05); AP.sim(0.1); AP.render();
//--- shot m1_guard
return AP.state();
