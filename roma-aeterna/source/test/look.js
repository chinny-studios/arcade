// a quick look around: Forum, Colosseum, Pantheon, Circus (screenshots between segments)
RA.go('forum'); RA.sim(0.5); RA.render();
return RA.stats();
//--- shot forum
RA.go('colosseum'); RA.sim(0.3); RA.render();
//--- shot colosseum
RA.go('pantheon'); RA.sim(0.3); RA.render();
//--- shot pantheon
RA.cam(FF.wx(110, 330), 70, FF.wz(110, 330), FF.wx(110, 480), 0, FF.wz(110, 480)); RA.render();
//--- shot circus
RA.cam(FF.wx(300, -260), 160, FF.wz(300, -260), FF.wx(0, 50), 0, FF.wz(0, 50)); RA.render();
//--- shot overview
