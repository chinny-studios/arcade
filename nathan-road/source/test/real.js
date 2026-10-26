const d = NR.W.LP.miltonDoor; NR.tp(d[0] - 3, d[1] - 18, Math.PI); NR.sim(2); NR.look(Math.PI * 0.85, 0.1); NR.render();
return { signs: NR.W.signSpots.length };
//--- shot real_nathan
NR.time(20.5); NR.sim(1); NR.render();
//--- shot real_nathan_night
NR.time(15); NR.enterMilton('G'); NR.tp; NR.PL.x = 25; NR.PL.z = -1.5; NR.look(0, 0); NR.render();
return NR.focus();
//--- shot real_directory
NR.enterMilton('4'); NR.PL.x = 7; NR.PL.z = 0; NR.look(Math.PI / 2, 0); NR.sim(0.1); NR.render();
return NR.focus();
//--- shot real_floor4
NR.tp(NR.NPC.baker.x + 4, NR.NPC.baker.z + 4); NR.lookAt(NR.NPC.baker.x, 1.8, NR.NPC.baker.z); NR.sim(0.2); NR.render();
//--- shot real_stall
