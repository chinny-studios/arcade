// Evening and night lighting, plus the walls-up view
WL.time(1, 19.2); WL.sim(2);
WL.cam(13, 12, 24, Math.PI / 4);
WL.render();
//--- shot dusk
WL.time(1, 22.5); WL.sim(2);
WL.render();
//--- shot night
G.walls = 'up'; WL.render();
//--- shot wallsup
G.walls = 'down'; WL.time(2, 12); WL.sim(1); WL.render();
//--- shot wallsdown
