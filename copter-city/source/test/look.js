// first look: the home pad, a flight over town, the cockpit
CC.render();
//--- shot 01_pad
CC.tp(CC.HELI.x, CC.HELI.z, 0);
CC.f.setTimeOfDay(11, true);
CC.sim(0.5); CC.render();
return CC.stats();
//--- shot 02_pad2
CC.tp(CC.CITY.size / 2, CC.CITY.size / 2, 60, 0.8);
CC.sim(1); CC.render();
return CC.stats();
//--- shot 03_air
CC.CAM.mode = 'far'; CC.CAM.snap = true; CC.sim(0.2); CC.render();
//--- shot 04_far
CC.CAM.mode = 'cockpit'; CC.sim(0.2); CC.render();
//--- shot 05_cockpit
CC.CAM.mode = 'chase'; CC.f.setTimeOfDay(22, true); CC.G.hour = 22; CC.sim(0.2); CC.render();
//--- shot 06_night
