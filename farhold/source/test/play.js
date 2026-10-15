// The crash: look around, then the opening scene
FH.mute();
FH.sim(1);
return { state: FH.G.state, frame: P.frame && P.frame.kind, pl: P.frame && P.frame.pl.type, pos: P.pos.length(), ship: S.state, quest: FH.QUEST.step, stats: FH.stats() };
//--- shot crash
FH.sim(2);
return { onGround: P.onGround, life: P.stats.life, haz: P.stats.haz, temp: FH.ENV.temp };
