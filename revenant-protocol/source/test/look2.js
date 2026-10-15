RP.god(); RP.peace();
RP.tp(4, 6, -Math.PI / 2); RP.look(-Math.PI / 2 - 0.15, -0.1); RP.sim(0.2);
//--- shot m2_plaza
RP.tp(24, 12, Math.PI); RP.sim(0.3);
//--- shot m2_channel
RP.tp(12, 20, -Math.PI / 2); RP.sim(0.2); RP.press('KeyF'); RP.sim(0.2);
//--- shot m2_dark
RP.tp(32, 32, -Math.PI / 2); RP.sim(0.2);
//--- shot m2_gas
RP.tp(45, 32, -Math.PI / 2); RP.sim(0.2);
//--- shot m2_detention
RP.tp(40, 17, -0.6); RP.sim(0.3);
const m = RP.ENEMIES.filter(e => e.type === 'maw'); m.forEach(e => { e.alert = true; e.state = 'chase'; e.submerged = false; e.walkT = 1; });
RP.tp(43, 12, -0.7); RP.sim(0.1);
//--- shot m2_sump
