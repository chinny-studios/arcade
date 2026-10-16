AP.freeze(); AP.god(); AP.peace();
AP.tp(21, 4, 0); AP.look(0.2, -0.25); AP.sim(0.1); AP.render();
//--- shot v_m2_window
AP.start(2, 1); AP.freeze(); AP.god(); AP.peace();
AP.tp(23, 7, 0); AP.look(0.1, 0.25); AP.sim(0.1); AP.render();
//--- shot v_m3_window
AP.tp(5, 15, Math.PI / 2 - 0.3); AP.look(Math.PI / 2 - 0.2, 0.05); AP.sim(0.1); AP.render();
//--- shot v_m3_lander
AP.start(0, 1); AP.freeze(); AP.god(); AP.peace();
AP.tp(27, 14, -0.6); AP.look(-0.6, 0.3); AP.sim(0.1); AP.render();
//--- shot v_m1_rocket
AP.tp(27, 26, -Math.PI / 2); AP.sim(0.1); AP.render();
//--- shot v_m1_hangar
