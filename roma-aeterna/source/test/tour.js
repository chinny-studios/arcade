// a screenshot tour; HUD text hidden so the views are clear
document.querySelector('#banner').style.visibility = 'hidden';
RA.time(9.2); RA.go('domus'); RA.sim(1.5); RA.render();
//--- shot t_domus
RA.go('pantheon'); const pp = RA.W.places.find((p) => p.id === 'pantheon'); RA.tp(pp.x, pp.z + 12); RA.lookAt(pp.x, 35, pp.z - 5); RA.sim(0.5); RA.render();
//--- shot t_pantheon_in
const co = RA.W.colosseum.F; RA.tp(co.x - 10, co.z + 4); RA.lookAt(co.x + 40, 12, co.z - 10); RA.sim(0.5); RA.render();
//--- shot t_arena
RA.go('metella'); RA.sim(1); RA.render();
//--- shot t_appia
RA.go('bovforum'); RA.sim(1.5); RA.render();
//--- shot t_bovillae
RA.time(9.5); RA.tp(RA.f.FFw(-50, 0)[0], RA.f.FFw(-50, 0)[1]); RA.lookAt(RA.f.FFw(-82, 0)[0], 3, RA.f.FFw(-82, 0)[1]); RA.sim(2); RA.render();
//--- shot t_orator
RA.time(13); const c = RA.W.circus.F; RA.tp(c.wx(0, -30), c.wz(0, -30)); RA.sim(3); const ch = RA.NPC.race[0]; const [x, z] = RA.NPC.racePos(ch); RA.lookAt(x, 1, z); RA.render();
//--- shot t_race
RA.time(22.5); RA.go('suburastreet'); RA.sim(3); RA.render();
//--- shot t_night
RA.time(16.5); RA.go('island'); RA.sim(1); RA.render();
//--- shot t_island
