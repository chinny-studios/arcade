RA.go('suburastreet'); RA.sim(0.3); RA.render();
return RA.stats();
//--- shot subura
RA.tp(RA.f.FFw(-20, -250)[0], RA.f.FFw(-20, -250)[1]); RA.cam(P.x + 60, 70, P.z + 80, P.x, 0, P.z); RA.render();
//--- shot suburaair
RA.cam(-300, 220, 600, -100, 0, -200); RA.render();
//--- shot cityair
