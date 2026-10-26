// The MTR, headless: down a street exit at Tsim Sha Tsui, buy an Octopus, through the gates, down the escalator, ride
// to Jordan, up and out; the Mody Road subway to East TST; Octopus at a stall; closed at night. Run from source/:
//   node test/smoke.mjs --hour 10 --steps test/metro.js
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
window.__f = fails;
const S = NR.STATIONS, ex = (st, id) => NR.EXITS.find((X) => X.st === st && X.id === id);
// ---- the street exit
const A1 = ex('TST', 'A1');
NR.tp(A1.door[0] - A1.ax * 1.5, A1.door[1] - A1.az * 1.5, Math.atan2(-A1.ax, -A1.az));
ok(NR.focus() === 'MTR Tsim Sha Tsui, exit A1', 'exit prompt: ' + NR.focus());
const at0 = NR.state();
NR.tp(A1.door[0] - A1.ax * 6 + A1.az * 2.5, A1.door[1] - A1.az * 6 - A1.ax * 2.5); NR.lookAt(A1.sx, 1.0, A1.sz); NR.render();
NR.tp(at0.x, at0.z, at0.yaw);
return { fails, at: at0 };
//--- shot metro_exit_canopy
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
const S = NR.STATIONS;
NR.use(); await wait(800);
ok(NR.state().space === 'metro', 'underground: ' + NR.state().space);
// ---- Customer Service Centre: buy an Octopus
const T = S.TST;
NR.PL.x = T.csc[0]; NR.PL.z = T.csc[1]; NR.PL.y = -10; NR.look(-Math.PI / 2, 0);
ok(NR.focus() === 'Customer Service Centre', 'csc prompt: ' + NR.focus());
NR.use(); const d = NR.choose(0); NR.close();
ok(NR.ST.octopus && NR.ST.octopus.balance === 100 && NR.ST.money === 150, 'bought octopus: ' + JSON.stringify([NR.ST.octopus, NR.ST.money]));
// ---- the gates
NR.PL.x = T.cx + 2; NR.PL.z = T.gates[0] - 1.2; NR.look(Math.PI, 0);
ok(NR.focus() === 'Tap Octopus to enter', 'gate prompt: ' + NR.focus());
NR.render();
return { fails };
//--- shot metro_concourse
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
const T = NR.STATIONS.TST;
NR.use();
ok(NR.PL.z > T.gates[0] && NR.ST.metroIn && NR.ST.metroIn.st === 'TST', 'through the gate: ' + NR.PL.z);
// ---- down the escalator
NR.PL.x = T.cx - 1.2; NR.PL.z = T.ramp.z0 - 1; NR.look(Math.PI, 0);
NR.hold('KeyW', 9);
ok(NR.MET.level === 'p' && Math.abs(NR.PL.y + 20) < 0.3, 'on the platform: ' + JSON.stringify([NR.MET.level, NR.PL.y, NR.PL.z]));
NR.trainIn('TST', 0, 6); NR.sim(4);
NR.PL.x = T.cx + 4.5; NR.PL.z = T.cz + 40; NR.look(0.35, 0.02);
NR.render();
return { fails, trains: NR.trains().filter((t) => t[0] === 'TST') };
//--- shot metro_platform_arrival
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
const T = NR.STATIONS.TST;
NR.sim(5);
// ---- board the Tsuen Wan train
const dz = T.doorZ.reduce((a, b) => (Math.abs(b - (T.cz + 20)) < Math.abs(a - (T.cz + 20)) ? b : a));
NR.PL.x = T.cx - 5.0; NR.PL.z = dz; NR.look(Math.PI / 2, 0);
ok(/^Board: 往荃灣 To Tsuen Wan/.test(NR.focus() || ''), 'board prompt: ' + NR.focus() + ' ' + JSON.stringify(NR.trains().filter((t) => t[0] === 'TST')));
NR.render();
return { fails };
//--- shot metro_doors_open
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
NR.use();
ok(NR.state().space === 'ride', 'riding: ' + NR.state().space);
NR.sim(8); NR.PL.z = NR.MET.ride ? 18 : NR.PL.z; NR.look(0, -0.05);
NR.render();
return { fails, ride: NR.ride() };
//--- shot metro_carriage
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
NR.sim(40); await wait(900);
ok(NR.state().space === 'metro' && NR.MET.station === 'JOR' && NR.MET.level === 'p', 'at Jordan: ' + JSON.stringify([NR.state(), NR.MET.station]));
// ---- up the escalator and out through the gates
const J = NR.STATIONS.JOR;
NR.PL.x = J.cx - 1.2; NR.PL.z = J.ramp.z1 + 2; NR.look(0, 0);
NR.hold('KeyW', 10);
ok(NR.MET.level === 'c' && Math.abs(NR.PL.y + 10) < 0.3, 'up at Jordan concourse: ' + JSON.stringify([NR.MET.level, NR.PL.y, NR.PL.z]));
NR.PL.x = J.cx + 1; NR.PL.z = J.gates[0] + 1.2; NR.look(0, 0);
ok(NR.focus() === 'Tap Octopus to exit', 'exit gate prompt: ' + NR.focus());
NR.use();
ok(NR.ST.octopus.balance === 94.6 && !NR.ST.metroIn, 'fare TST-JOR: ' + NR.ST.octopus.balance);
const C1 = NR.EXITS.find((X) => X.st === 'JOR' && X.id === 'C1');
NR.PL.x = C1.cs[0]; NR.PL.z = C1.cs[1]; NR.look(C1.portalYaw + Math.PI, 0);
ok(NR.focus() === 'Exit C1: Nathan Road', 'jordan exit prompt: ' + NR.focus());
NR.use(); await wait(800);
ok(NR.state().space === 'street', 'back on the street: ' + JSON.stringify(NR.state()));
NR.render();
return { fails, at: NR.state() };
//--- shot metro_out_at_jordan
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- the Mody Road subway from TST to East TST, on foot
NR.metro('TST', 'D2');
const P = NR.MET.subway.path, T = NR.STATIONS.TST;
NR.PL.x = T.cx + 8; NR.PL.z = P[0][1]; NR.look(-Math.PI / 2, 0);
const walkTo = (x, z) => { const dx = x - NR.PL.x, dz = z - NR.PL.z; NR.look(Math.atan2(-dx, -dz), 0); NR.hold('KeyW', Math.hypot(dx, dz) / 2.94 + 0.2); };
for (const p of P) walkTo(p[0], p[1]);
walkTo(NR.STATIONS.ETS.cx, P[P.length - 1][1]);
ok(NR.state().space === 'metro' && Math.abs(NR.PL.x - NR.STATIONS.ETS.cx) < 4, 'walked to East TST: ' + JSON.stringify(NR.state()));
NR.look(-Math.PI / 2, 0); NR.PL.x = 120; NR.PL.z = 298; NR.look(-Math.PI / 2 - 0.25, 0);
NR.render();
return { fails };
//--- shot metro_subway
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- Octopus at a stall, and closed at night
NR.toNPC('news'); const b0 = NR.ST.octopus.balance, m0 = NR.ST.money;
const t = NR.talk('news'); if (t) { NR.choose(t.opts.length - 2 >= 0 ? 0 : 0); NR.close(); }
ok(NR.ST.octopus.balance === +(b0 - 10).toFixed(1) && NR.ST.money === m0, 'paper by octopus: ' + [b0, NR.ST.octopus.balance, m0, NR.ST.money]);
NR.time(1.5); NR.sim(0.1);
const A1 = NR.EXITS.find((X) => X.st === 'TST' && X.id === 'A1');
NR.tp(A1.door[0] - A1.ax * 1.5, A1.door[1] - A1.az * 1.5, Math.atan2(-A1.ax, -A1.az));
NR.use(); await wait(800);
ok(NR.state().space === 'street', 'closed at night');
ok(NR.trains().every((q) => q[2] === 'away'), 'no trains at night');
// ---- the Tuen Ma Line: East TST to Austin, and a ride off the map and back
NR.time(18); NR.metro('ETS', 'platform', 0); NR.trainIn('ETS', 0, 0); NR.sim(2);
const E = NR.STATIONS.ETS, dz = E.doorZ.reduce((a, b) => (Math.abs(b - (E.cz + 20)) < Math.abs(a - (E.cz + 20)) ? b : a));
NR.PL.x = E.cx - 5; NR.PL.z = dz; NR.look(Math.PI / 2, 0);
ok(/To Tuen Mun/.test(NR.focus() || ''), 'tml board prompt: ' + NR.focus());
NR.use(); NR.sim(72); await wait(900);
ok(NR.MET.station === 'AUS' && NR.state().space === 'metro', 'at Austin: ' + NR.MET.station);
const A = NR.STATIONS.AUS; NR.MET.level = 'c'; NR.PL.y = -10; NR.PL.x = A.cx; NR.PL.z = A.gates[0] + 1.2; NR.look(0, 0);
const b1 = NR.ST.octopus.balance; NR.use();
ok(Math.abs(b1 - NR.ST.octopus.balance - 5.9) < 0.01, 'fare ETS-AUS: ' + [b1, NR.ST.octopus.balance]);
NR.metro('TST', 'platform', 1); NR.trainIn('TST', 1, 0); NR.sim(2);
const T = NR.STATIONS.TST, dz2 = T.doorZ.reduce((a, b) => (Math.abs(b - (T.cz + 20)) < Math.abs(a - (T.cz + 20)) ? b : a));
NR.PL.x = T.cx + 5; NR.PL.z = dz2; NR.look(-Math.PI / 2, 0);
ok(/To Central/.test(NR.focus() || ''), 'central board prompt: ' + NR.focus());
const h0 = NR.CLOCK.t; NR.use(); NR.sim(32); await wait(900);
ok(NR.MET.station === 'TST' && NR.CLOCK.t - h0 > 0.1, 'back from Admiralty: ' + [NR.MET.station, NR.CLOCK.t - h0]);
NR.closePanels(); NR.tp(-20, 200); NR.map();
return { fails };
//--- shot metro_map
NR.closePanels();
return { fails: window.__f };
