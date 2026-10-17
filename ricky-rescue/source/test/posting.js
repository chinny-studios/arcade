// Posting between calls: the post list and the other units, a post order with a GPS route, reaching the post,
// waiting on post with the fast clock until the pager goes, the pager card and acknowledging it, turnout time in
// the review, move-ups when another unit gets busy, the rig check finding a fault, restocking and coffee.
// Run with --start '{"rank":3,"faults":true}' so all four districts are covered and the rig has problems to find.
const L = {};
L.posts = RR.posts().map((p) => `${p.n} ${p.name} (${p.district})`);
L.board = RR.board();
L.post = RR.post();
L.route = RR.ROUTE.label;
L.status = document.querySelector('#status').textContent;
L.atPost = RR.toPost();
L.statusOnPost = document.querySelector('#status').textContent;
L.coverage = Math.round(RR.f.systemCoverage() * 100) + '%';
return L;
//--- shot q1_on_post
// wait on post: the clock runs fast until the page
const W = { clock0: RR.stats().clock };
RR.G.shift.nextCallT = RR.G.clockT + 600;
RR.press('skip');
W.waiting = RR.DT.waiting;
for (let k = 0; k < 400 && !RR.C; k++) RR.sim(0.25);
W.clock1 = RR.stats().clock;
W.paged = !!RR.C && RR.C.stage;
W.waitingAfter = RR.DT.waiting;
W.pagerShown = !document.querySelector('#dispatch').hidden;
W.pager = ['#pgL1', '#pgL2', '#pgL3', '#pgAckT'].map((s) => document.querySelector(s).textContent);
W.m12Post = RR.post();
RR.render();
return W;
//--- shot q2_pager
// let the ack timer run out once, then acknowledge and roll
const A = {};
for (let k = 0; k < 60 && RR.C.t < 70; k++) RR.sim(0.5);
A.retone = !!RR.C.retone; A.late = document.querySelector('#dispatch').classList.contains('late');
RR.f.respond();
A.stage = RR.C.stage;
RR.RIG.v = 8; RR.sim(0.5);
A.roll = RR.C.times.roll !== undefined ? Math.round(RR.C.times.roll) : null;
RR.toScene({ waitPD: true }); RR.toPatient();
for (const a of ['ppe', 'impression', 'abc', 'pulse', 'bp', 'spo2', 'sample']) RR.act(a);
const res = RR.f.scoreCall(RR.C);
A.responseItems = res.items.filter((i) => i.cat === 'Response' || i.cat === 'Readiness').map((i) => `${i.text} [${i.got}/${i.max}]`);
RR.G.call.stage = 'done'; RR.G.call = null; RR.f.backInService();
A.newPost = RR.post();
return A;
//--- shot q3_after_call
// a move-up: knock out the units around Medic 12's post until dispatch moves it
const M = { before: RR.post() && RR.post().name };
RR.toPost();
RR.SSM.m12.lastOrderT = -1e9;
const sorted = RR.SSM.units.filter((u) => u.state === 'post').sort((a, b) => Math.hypot(a.x - RR.RIG.x, a.z - RR.RIG.z) - Math.hypot(b.x - RR.RIG.x, b.z - RR.RIG.z));
let moved = false;
for (const u of sorted.reverse()) { RR.f.unitBusy(u); RR.SSM.m12.lastOrderT = RR.SSM.m12.post && RR.SSM.m12.post.name !== M.before ? RR.SSM.m12.lastOrderT : -1e9; if (RR.post().name !== M.before) { moved = true; break; } }
M.moved = moved; M.after = RR.post();
M.radio = RR.HUD.radio.slice(-3).map((m) => m.who + ': ' + m.text);
M.board = RR.board();
return M;
//--- shot q4_moveup
// rig check: walk to the back, check everything, fix what's broken
const K = {};
RR.G.shift.nextCallT = 1e9;
RR.G.shift.check.items.suction.bad = true; RR.G.shift.check.items.suction.state = 'todo';
RR.toPost();
RR.f.exitCab();
RR.f.openRigCheck();
for (const c of RR.RIG_CHECK) { RR.f.rigCheckItem(c.id); RR.chores(); }
K.found = RR.RIG_CHECK.filter((c) => RR.G.shift.check.items[c.id].state === 'fault').map((c) => c.name);
for (const c of RR.RIG_CHECK) if (RR.G.shift.check.items[c.id].state === 'fault') { RR.f.rigFixItem(c.id); RR.chores(); }
K.states = Object.fromEntries(RR.RIG_CHECK.map((c) => [c.id, RR.G.shift.check.items[c.id].state]));
K.done = RR.G.shift.check.done;
K.summary = document.querySelector('#rcSum').textContent;
RR.sim(0.5); RR.render();
return K;
//--- shot q5_rigcheck
// coffee at the nearest spot, restock at the station
const Q = {};
RR.UI.hide('rigcheck');
RR.G.shift.energy = 30;
const spot = RR.SSM.posts.find((p) => p.coffee && p.coffee.cost);
RR.tp(spot.coffee.x + 0.5, spot.coffee.z + 0.5);
Q.prompt = RR.f.interactions().map((p) => p.label);
RR.f.grabCoffee(RR.f.coffeeSpot());
Q.hiddenInside = !RR.PLAYER.model.root.visible;
RR.chores();
Q.energy = Math.round(RR.G.shift.energy);
Q.visibleAgain = RR.PLAYER.model.root.visible;
RR.RIG.stock.dressing = 0; RR.RIG.stock.o2 = 40;
RR.RIG.x = RR.CITY.station.x; RR.RIG.z = RR.CITY.station.z; RR.RIG.yaw = RR.CITY.station.yaw;
Q.missing = RR.f.missingStock();
RR.f.startRestock(); RR.chores();
Q.missingAfter = RR.f.missingStock();
Q.fatigue = RR.G.shift.energy;
return Q;
