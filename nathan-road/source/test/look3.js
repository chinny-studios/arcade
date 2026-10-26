NR.time(20.6); const d = NR.W.LP.miltonDoor; NR.tp(d[0] - 2, d[1] + 3, Math.PI); NR.sim(4); NR.look(Math.PI, 0.08); NR.render();
return NR.stats();
//--- shot l3_nathan_night_s
NR.look(0, 0.08); NR.render();
//--- shot l3_nathan_night_n
NR.roof(); NR.sim(0.5); NR.render();
return NR.vps();
//--- shot l3_roof
NR.time(20.04); NR.go('avenue'); NR.look(Math.PI, 0.05); NR.sim(3); NR.render();
return NR.vps();
//--- shot l3_show
NR.time(17.3); NR.go('clocktower'); NR.tp(NR.W.LP.clocktower[0] + 40, NR.W.LP.clocktower[1] - 30); NR.lookAt(NR.W.LP.clocktower[0], 22, NR.W.LP.clocktower[1]); NR.sim(1); NR.render();
return NR.vps();
//--- shot l3_clock
NR.time(12); NR.go('chungking'); NR.sim(2); NR.render();
//--- shot l3_chungking
NR.go('mosque'); NR.sim(1); NR.render();
//--- shot l3_mosque
NR.go('brucelee'); NR.sim(1); NR.render();
//--- shot l3_brucelee
NR.go('birdlake'); NR.sim(1); NR.render();
return { vps: NR.vps(), n: NR.W.flamingoCount };
//--- shot l3_flamingo
