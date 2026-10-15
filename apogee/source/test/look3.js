AP.god(); AP.peace();
AP.tp(9, 30, -0.8); AP.sim(0.2); AP.render();
//--- shot m3_garage
AP.tp(24, 6, 0); AP.look(0, 0.15); AP.sim(0.2); AP.render();
//--- shot m3_window
AP.tp(23, 24, 0); AP.sim(0.2); AP.render();
//--- shot m3_hall
AP.tp(7, 9, 0); AP.sim(0.2); AP.render();
//--- shot m3_servo
return AP.reach();
