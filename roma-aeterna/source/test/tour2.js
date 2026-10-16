document.querySelector('#banner').style.visibility = 'hidden';
RA.time(9.2); RA.tp(RA.f.FFw(-50, 0)[0], RA.f.FFw(-50, 0)[1]); RA.lookAt(RA.f.FFw(-82, 0)[0], 4, RA.f.FFw(-82, 0)[1]); RA.sim(2); RA.render();
//--- shot t_orator
RA.go('domus'); RA.sim(1); RA.render();
//--- shot t_domus
RA.time(23); RA.go('forum'); RA.sim(2); RA.render();
//--- shot t_night_forum
RA.time(9.5); RA.go('suburastreet'); RA.sim(1); RA.press('KeyM'); RA.sim(0.1); RA.HUD.zoomMap(1.6); RA.render();
//--- shot t_map
RA.press('Escape'); RA.sim(0.1); RA.press('Escape'); RA.HUD.openPause(); RA.render();
//--- shot t_pause
