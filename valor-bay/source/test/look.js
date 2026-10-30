// screenshots: the hero on the plaza, then a view down a street, then from up high
VB.hideHUD(false);
VB.sim(1);
return VB.stats();
//--- shot look1
VB.face(Math.PI * 0.75, 0.15); VB.sim(0.5);
return VB.stats();
//--- shot look2
VB.tp(0, 30, 120); VB.face(0, 0.4); VB.sim(0.3);
return VB.stats();
//--- shot look3
