RP.god(); RP.peace();
out.reach = RP.reach();
RP.tp(5, 41, 0); RP.sim(0.3);
return { reach: { exit: out.reach.exit, un: out.reach.unreachable, keys: out.reach.keys, opened: out.reach.opened, reached: out.reach.reached, open: out.reach.open, unseen: out.reach.unseen.slice(0, 30) }, st: RP.state().pos };
//--- shot m1_start
RP.tp(15, 15, Math.PI / 2 + 0.3); RP.sim(0.2);
//--- shot m1_court
RP.tp(32, 15, -Math.PI / 2 + 0.2); RP.look(-Math.PI / 2 + 0.2, 0.05); RP.sim(0.2);
//--- shot m1_hub
RP.tp(46, 40, Math.PI * 0.85); RP.sim(0.2);
//--- shot m1_hangar
RP.tp(37, 12, 0); RP.sim(0.1);
const e = RP.ENEMIES.find(e => e.type === 'officer'); RP.tp(Math.floor(e.x/2), Math.floor(e.z/2) + 2, 0); RP.sim(0.1);
//--- shot m1_officer
