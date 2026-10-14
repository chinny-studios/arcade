// Rules checks, evaluated in the page by test/smoke.mjs. Returns a list of failures.
const R = SF.rules, fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const fresh = (o = {}) => { const S = R.newGame({ map: 'crossfire', coP: 'kade', coE: 'volsk', ...o }); S.units = []; S.sides.forEach((s) => { s.funds = 0; s.ever = true; }); R.bump(S); return S; };
const put = (S, t, s, x, y, hp = 100) => { const u = R.mkUnit(S, t, s, x, y); u.hp = hp; S.units.push(u); R.bump(S); return u; };

{ // movement costs: a Crawler (3 move) can cross 3 plains but not 4
  const S = fresh(); const u = put(S, 'crawler', 0, 0, 4);
  const r = R.reach(S, u);
  ok(r.dist[4 * S.w + 3] === 3, 'crawler reaches 3 tiles');
  ok(r.dist[4 * S.w + 4] === -1, 'crawler cannot reach 4 tiles');
  const m = put(S, 'moray', 0, 6, 6); // wheels: forest costs 3
  ok(R.reach(S, m).dist[6 * S.w + 5] !== 0, 'moray reach computed');
}
{ // enemy units block, hidden ones trap
  const S = fresh({ fog: true });
  const u = put(S, 'strider', 0, 3, 7), e = put(S, 'rifle', 1, 3, 8);
  const vis = R.canSee(S, 0, e);
  ok(vis, 'adjacent enemy visible in fog');
  const S2 = fresh({ fog: true });
  const a = put(S2, 'razorwing', 0, 0, 10); const hid = put(S2, 'rifle', 1, 5, 10);
  ok(!R.canSee(S2, 0, hid), 'distant enemy hidden in fog');
  const path = [{ x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 6, y: 10 }];
  const tc = R.trapCheck(S2, a, path);
  ok(tc.trapped && tc.path.length === 5, 'trap stops before hidden enemy');
  void u;
}
{ // combat: counters, ammo, kamikaze, indirect cannot counter
  const S = fresh();
  const t = put(S, 'tank', 1, 5, 5), s = put(S, 'strider', 0, 4, 5);
  const before = s.ammo;
  const r = R.strike(S, s, t);
  ok(r.dmg > 0 && s.ammo === before - 1, 'strider uses missile ammo vs tank');
  const k = put(S, 'kite', 1, 8, 2), c = put(S, 'crawler', 0, 9, 2);
  R.strike(S, k, c);
  ok(k.hp <= 0, 'kite destroyed by its own strike');
  R.removeDead(S);
  ok(!S.units.includes(k), 'dead kite removed');
  const t2 = put(S, 'tank', 1, 5, 7), s2 = put(S, 'crawler', 0, 4, 7);
  const f = R.forecast(S, s2, 4, 7, t2);
  ok(f.counter && f.lo < 10, 'tank shrugs off a crawler and counters');
  const sp = put(S, 'spark', 0, 2, 9), e = put(S, 'rifle', 1, 4, 9);
  const f2 = R.forecast(S, sp, 2, 9, e);
  ok(!f2.counter && f2.lo > 0, 'artillery takes no counter');
  ok(R.targetsFrom(S, sp, 2, 8, true).length === 0, 'artillery cannot move and fire');
  const fpv = put(S, 'fpv', 1, 12, 9), wr = put(S, 'wraith', 0, 12, 8);
  ok(R.targetsFrom(S, fpv, 12, 9, false).every((x) => x !== wr), 'fpv cannot hit aircraft');
}
{ // capture and HQ victory
  const S = fresh();
  const hqi = S.tiles.findIndex((t) => t.k === 'hq' && t.o === 1);
  const x = hqi % S.w, y = (hqi / S.w) | 0;
  const c = put(S, 'crawler', 0, x, y);
  put(S, 'rifle', 1, 0, 0);
  R.doCapture(S, c); ok(S.tiles[hqi].cp === 10, 'capture removes HP');
  c.hp = 50; R.doCapture(S, c); ok(S.tiles[hqi].cp === 5, 'damaged unit captures less');
  c.hp = 100; R.doCapture(S, c);
  ok(S.tiles[hqi].o === 0, 'HQ captured');
  ok(R.checkVictory(S) === 0 && S.how === 'hq', 'HQ capture wins');
}
{ // rout victory
  const S = fresh(); put(S, 'crawler', 0, 1, 1); ok(R.checkVictory(S) === 0, 'no enemy units = rout');
}
{ // join refunds, load/drop
  const S = fresh();
  const a = put(S, 'tank', 1, 5, 5, 70), b = put(S, 'tank', 1, 5, 6, 60);
  S.sides[1].funds = 0;
  ok(R.stopKind(S, a, 5, 6) === 'join', 'same type joins');
  R.commitMove(S, a, [{ x: 5, y: 5 }, { x: 5, y: 6 }]);
  R.doJoin(S, a, b);
  ok(b.hp === 100 && S.sides[1].funds === 2100, 'join caps HP and refunds excess: ' + S.sides[1].funds);
  const n = put(S, 'nexus', 0, 2, 2), cr = put(S, 'crawler', 0, 2, 3);
  ok(R.stopKind(S, cr, 2, 2) === 'load', 'crawler loads into nexus');
  R.commitMove(S, cr, [{ x: 2, y: 3 }, { x: 2, y: 2 }]); R.doLoad(S, cr, n);
  ok(n.cargo.length === 1 && !S.units.includes(cr), 'cargo aboard');
  const dt = R.dropTiles(S, n);
  ok(dt.length > 0, 'drop tiles exist');
  R.doDrop(S, n, dt[0].x, dt[0].y);
  ok(S.units.includes(cr) && cr.done, 'dropped unit waits');
}
{ // turn start: income, repair, fuel burn and crash, jamming
  const S = fresh();
  S.turn = 1;
  const own = S.tiles.findIndex((t) => t.k === 'city' && t.o === 1);
  const r = put(S, 'rifle', 1, own % S.w, (own / S.w) | 0, 50);
  const g = put(S, 'gunship', 1, 8, 5); g.fuel = 2;
  const f = put(S, 'fpv', 1, 3, 3); put(S, 'static', 0, 3, 5);
  const ev = R.startTurn(S);
  ok(ev.find((e) => e.kind === 'income').amount === 4000, 'income 4 props');
  ok(r.hp === 70, 'repair 2 HP on city: ' + r.hp);
  ok(!S.units.includes(g), 'gunship crashed out of fuel');
  ok(f.hp === 100, 'jamming waits for the jammer side');
  S.turn = 0; R.startTurn(S);
  ok(f.hp === 90, 'static jams fpv at the start of its turn');
}
{ // powers
  const S = fresh({ coE: 'volsk' });
  put(S, 'crawler', 0, 4, 4); put(S, 'strider', 0, 4, 5); put(S, 'rifle', 1, 12, 8);
  S.sides[1].meter = R.powerCost(S, 1, 2);
  ok(R.canPower(S, 1, 2), 'super ready');
  const res = R.activatePower(S, 1, 2);
  ok(res && res.kind === 'strike' && res.units.length === 2, 'firestorm hits cluster');
  ok(S.units.filter((u) => u.s === 0).every((u) => u.hp === 70), 'firestorm 3 HP');
  ok(S.sides[1].meter === 0 && S.sides[1].pw === 2, 'meter spent');
}
{ // stealth sub
  const S = fresh({ map: 'saltmarsh' });
  const sea = S.tiles.findIndex((t, i) => t.k === 'sea' && S.tiles[i + 1] && S.tiles[i + 1].k === 'sea');
  const d = put(S, 'deepfin', 0, sea % S.w, (sea / S.w) | 0);
  ok(!R.canSee(S, 1, d), 'deepfin hidden');
  put(S, 'corvette', 1, d.x + 1, d.y);
  R.bump(S);
  ok(R.canSee(S, 1, d), 'deepfin seen when adjacent');
}
return fails;
