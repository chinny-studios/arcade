// ---- 12_mission: setting up a battle, scripted arrivals, objectives, tips, win and loss ----
const Mission = { def: null, time: 0, phase: 'none', result: null, objs: [], queue: [], log: [], tipsShown: {}, dock: 0, demo: false };
const _mv = new V3(), _mw = new V3();

Mission.clear = function () {
  for (const s of G.ships) s.remove();
  G.ships = []; G.craft = []; G.player = null; Combat.clear(); Fx.clear(); Damage.clear();
  Craft.byTeam = [[], []];
};
function spawnShip(e, team, o) {
  const x = e[5] || {};
  const s = new Ship(e[0], team, { name: x.name, tag: x.tag });
  s.place(e[1], e[2], e[3], e[4]);
  if (x.throttle != null) { s.thr = x.throttle; s.speed = s.C.speed * x.throttle; s.vel.copy(s.fwd).multiplyScalar(s.speed); }
  const squads = x.squads || s.C.hangar;
  squads.forEach((type, i) => s.squads.push(new Squadron(s, type, i)));
  if (!o.player) s.ai = new ShipAI(s, { throttle: x.throttle });
  if (x.tag === 'flagship') s.noAllyFire = true;
  if (x.hull) { s.maxHull = s.hull = s.C.hull * x.hull; for (const k in s.subs) { s.subs[k].max *= x.hull; s.subs[k].hp = s.subs[k].max; } }
  if (x.jump != null) { s.arrived = false; s.root.visible = false; Mission.queue.push({ t: x.jump, s }); }
  G.ships.push(s);
  return s;
}
Mission.start = function (idx, o) {
  o = o || {};
  Mission.clear();
  const def = Mission.def = MISSIONS[idx]; Mission.idx = idx;
  rand = mulberry32(o.seed != null ? o.seed : (Date.now() & 0xffff));
  Mission.time = 0; Mission.phase = 'play'; Mission.result = null; Mission.reason = ''; Mission.queue = []; Mission.log = [];
  Mission.tipsShown = {}; Mission.dock = 0; Mission.shuttleCraft = null; Mission.shuttleT = 0; Mission.shuttles = 0; Mission.demo = !!o.demo;
  Mission.doneT = 0; Mission.saved = 0; Mission.outT = 0; Mission.waveT = -99; Mission.timers = []; Mission.escaped = false;
  const p = spawnShip(def.player, 0, { player: !o.noPlayer });
  if (!o.noPlayer) {
    p.isPlayer = true; G.player = p;
    // The captain's own strike fighter, flown by remote. It never launches on its own.
    const q = new Squadron(p, 'strike', p.squads.length, 'Kite'); q.order = { kind: 'recall', target: p }; p.squads.push(q);
  } else p.ai = p.ai || new ShipAI(p);
  for (const e of def.allies) spawnShip(e, 0, {});
  for (const e of def.enemies) spawnShip(e, 1, {});
  for (const s of G.ships) if (s.tag === 'convoy') { s.ai.goto = s.pos.clone().add(new V3(rnd(-300, 300), -400, -3500)); s.ai.cruise = 0.85; }
  Mission.setupObjectives();
  Mission.alliesStart = G.ships.filter((s) => s.team === 0 && !s.isPlayer).length;
  return { mission: def.id, ships: G.ships.length };
};
Mission.setupObjectives = function () {
  const d = Mission.def, ob = d.obj;
  const name = (tag) => (G.ships.find((s) => s.tag === tag) || {}).name;
  if (ob.kind === 'destroyAll') Mission.objs = [{ id: 'main', text: 'Destroy every enemy warship', state: 'open' }];
  else if (ob.kind === 'carrier') Mission.objs = [{ id: 'main', text: 'Destroy the carrier ' + name('target'), state: 'open' }, { id: 'convoy', text: 'Protect the tenders', state: 'open' }];
  else if (ob.kind === 'survive') Mission.objs = [{ id: 'main', text: 'Hold until the clock runs out', state: 'open' }, { id: 'protect', text: 'Keep ' + name('protect') + ' alive', state: 'open' }];
  else if (ob.kind === 'destroyTag') {
    const n = G.ships.filter((s) => s.tag === 'target').map((s) => s.name);
    Mission.objs = [{ id: 'main', text: 'Destroy ' + n.join(' and '), state: 'open' }];
  } else if (ob.kind === 'board') Mission.objs = [{ id: 'disable', text: 'Knock out the ' + name('flagship') + '\'s engines and shield generator', state: 'open' },
    { id: 'spare', text: 'Do not destroy the ' + name('flagship'), state: 'open' }, { id: 'board', text: 'Protect the boarding shuttle', state: 'wait' }];
};
Mission.enemiesLeft = () => G.ships.filter((s) => s.team === 1 && (s.alive || !s.arrived) && !s.escaped).length;
Mission.update = function (dt) {
  if (Mission.phase === 'none') return;
  Mission.time += dt;
  for (let i = Mission.queue.length - 1; i >= 0; i--) {
    const q = Mission.queue[i];
    if (Mission.time >= q.t) {
      Mission.queue.splice(i, 1); q.s.startJump();
      if (!Mission.demo && q.s.team === 1 && Mission.time - Mission.waveT > 5) { Mission.waveT = Mission.time; Hud.banner('Enemy ships jumping in', q.s.className + ' ' + q.s.name + (Mission.queue.some((o) => o.s.team === 1 && o.t - q.t < 3) ? ' and escorts' : '')); }
    }
  }
  for (let i = Mission.timers.length - 1; i >= 0; i--) if (Mission.time >= Mission.timers[i].t) { const f = Mission.timers[i].f; Mission.timers.splice(i, 1); f(); }
  for (const s of G.ships) { if (s.ai && s.alive && s.arrived) s.ai.update(dt); s.update(dt); }
  Craft.updateAll(dt);
  Combat.update(dt);
  Mission.collide(dt);
  // Wrecks are cleared once they have drifted for a while.
  for (let i = G.ships.length - 1; i >= 0; i--) {
    const s = G.ships[i];
    if ((s.dying > 45 || s.escaped) && s !== G.player) { s.remove(); G.ships.splice(i, 1); }
  }
  if (!Mission.demo) { Mission.objectives(dt); Mission.tips(); }
  else Mission.demoUpdate(dt);
};
// Hulls that touch are pushed apart and grind against each other.
Mission.collide = function (dt) {
  const S = G.ships;
  for (let i = 0; i < S.length; i++) {
    const a = S[i]; if (!a.alive || !a.arrived || a.jumpAnim != null) continue;
    for (let j = i + 1; j < S.length; j++) {
      const b = S[j]; if (!b.alive || !b.arrived || b.jumpAnim != null) continue;
      const lim = (a.radius + b.radius) * 0.8; if (a.pos.distanceToSquared(b.pos) > lim * lim) continue;
      let hit = null;
      for (const cl of a.model.colliders) { a.toWorld(cl.c, _mv); if (b.inside(_mv, Math.min(cl.h.x, cl.h.y) * 0.8)) { hit = _mv; break; } }
      if (!hit) continue;
      _mw.subVectors(a.pos, b.pos).normalize();
      const ka = b.C.hull / (a.C.hull + b.C.hull), push = 60 * dt;
      if (a.C.speed) a.pos.addScaledVector(_mw, push * ka * 2); if (b.C.speed) b.pos.addScaledVector(_mw, -push * (1 - ka) * 2);
      a.speed *= 1 - dt * 0.8; b.speed *= 1 - dt * 0.8;
      const dmg = dt * 90;
      a.damage(dmg * (1 - ka) * 2, a.toLocal(hit, new V3()), b, 'ram'); b.damage(dmg * ka * 2, b.toLocal(hit, new V3()), a, 'ram');
      if (!G.simming && rand() < dt * 10) { Fx.impact(hit, _mw, false, BOLT_COL[0], 3); Sfx.hit(hit, false, true); }
      if ((a.isPlayer || b.isPlayer) && !G.simming) { R.shake = Math.max(R.shake, 0.6); Hud.warn('Collision!'); }
    }
  }
};
Mission.event = function (kind, s, info, by) {
  if (Mission.phase !== 'play' || Mission.demo) return;
  const mine = by && (by === G.player || (by.squad && by.squad.ship === G.player));
  if (kind === 'kill') {
    const t = s.team === 0 ? 'a' : 'e';
    Hud.feed((s.team ? 'Enemy ' : '') + s.className + ' <b>' + s.name + '</b> destroyed' + (mine ? ' · by you' : ''), t);
    if (mine) Hud.ribbon('Destroyed ' + s.name, 'kill');
    if (s === G.player) Mission.finish('lose', 'Your ship has been destroyed.');
    Mission.log.push({ t: Mission.time, name: s.name, team: s.team, mine });
  } else if (kind === 'sub') {
    const n = SUBSYS[info].name;
    if (s === G.player) { Hud.ribbon(n + ' knocked out', 'bad'); Sfx.alarm(); }
    else if (mine) Hud.ribbon(s.name + ' · ' + n.toLowerCase() + ' destroyed', 'good');
    else if (s.team === 0 && s.tag) Hud.feed(s.name + ': ' + n.toLowerCase() + ' knocked out', 'a');
  } else if (kind === 'escape') {
    if (s.tag === 'convoy') { Mission.saved++; Hud.feed(s.name + ' has jumped to safety', 'a'); }
  } else if (kind === 'hit' && s === G.player && info !== 'shield') { if (!G.simming) R.shake = Math.max(R.shake, 0.25); }
  else if (kind === 'torp' && s === G.player && !G.simming) R.shake = Math.max(R.shake, 0.7);
  else if (kind === 'craft' && s.type === 'shuttle' && s.team === 0) { Hud.ribbon('The boarding shuttle is down', 'bad'); Mission.shuttleCraft = null; Mission.shuttleT = 10; }
};
Mission.later = function (sec, f) { Mission.timers.push({ t: Mission.time + sec, f }); };
Mission.setObj = function (id, state) { const o = Mission.objs.find((x) => x.id === id); if (o && o.state !== state) { o.state = state; Hud.objectives(); if (state === 'done') Sfx.lock(); } };
Mission.objectives = function (dt) {
  if (Mission.phase !== 'play') {
    if (Mission.phase === 'done' && (Mission.doneT += dt) > 4.5 && G.state === 'play') Ui.results();
    return;
  }
  const d = Mission.def, ob = d.obj, T = Mission.time;
  const tagged = (tag) => G.ships.filter((s) => s.tag === tag);
  if (ob.kind === 'destroyAll') { if (!Mission.enemiesLeft()) { Mission.setObj('main', 'done'); Mission.finish('win', 'The raiding group is destroyed.'); } }
  else if (ob.kind === 'carrier') {
    const conv = tagged('convoy'), alive = conv.filter((s) => s.alive).length;
    Mission.objs[1].text = 'Protect the tenders · ' + (alive + Mission.saved) + ' of 3 ' + (T < ob.escapeAt ? 'alive · jump in ' + fmtTime(ob.escapeAt - T) : 'safe');
    if (T >= ob.escapeAt && !Mission.escaped) { Mission.escaped = true; for (const s of conv) if (s.alive) s.jumpOut(); Mission.setObj('convoy', alive ? 'done' : 'failed'); if (alive) Hud.banner('The tenders are jumping out', alive + ' of 3 made it'); }
    if (!alive && !Mission.saved && !conv.some((s) => s.escaping)) { Mission.setObj('convoy', 'failed'); Mission.finish('lose', 'Every tender has been destroyed.'); return; }
    if (!tagged('target').some((s) => s.alive)) { Mission.setObj('main', 'done'); Mission.finish('win', 'The Brood Mother is destroyed. The lane is clear.'); }
  } else if (ob.kind === 'survive') {
    Mission.objs[0].text = 'Hold until the clock runs out · ' + fmtTime(ob.time - T);
    if (!tagged('protect').some((s) => s.alive)) { Mission.setObj('protect', 'failed'); Mission.finish('lose', 'Platform Seven has been destroyed.'); return; }
    if (T >= ob.time || (!Mission.queue.length && !Mission.enemiesLeft())) { Mission.setObj('main', 'done'); Mission.setObj('protect', 'done'); Mission.finish('win', T >= ob.time ? 'Platform Seven held. The relief fleet is here.' : 'Every attacker is destroyed. Platform Seven held.'); }
  } else if (ob.kind === 'destroyTag') {
    const left = tagged('target').filter((s) => s.alive || !s.arrived).length;
    if (!left) {
      Mission.setObj('main', 'done'); Mission.finish('win', d.id === 'aster' ? 'Both dreadnoughts are gone. The Hegemony fleet is breaking up.' : 'The Ashen Oath is broken. The enemy line is falling back.');
      for (const s of G.ships) if (s.team === 1 && s.alive && s.arrived && s.ok('engines')) Mission.later(1.5 + rand() * 3, () => s.jumpOut());
    }
  } else if (ob.kind === 'board') Mission.boarding(dt);
  // Leaving the battle area.
  const p = G.player;
  if (p && p.alive) { if (p.pos.length() > ARENA_R) Mission.outT += dt; else Mission.outT = 0; }
};
Mission.boarding = function (dt) {
  const ob = Mission.def.obj, F = G.ships.find((s) => s.tag === 'flagship');
  if (!F || !F.alive) { Mission.setObj('spare', 'failed'); Mission.finish('lose', 'The Iron Mandate is destroyed, and Admiral Varga with it.'); return; }
  const dis = F.disabled;
  Mission.objs[0].text = 'Knock out the ' + F.name + '\'s engines ' + (F.ok('engines') ? '☐' : '☑') + ' and shield generator ' + (F.ok('shields') ? '☐' : '☑');
  if (dis && Mission.objs[0].state !== 'done') {
    Mission.setObj('disable', 'done'); Mission.setObj('board', 'open'); F.ai.passive = true; Mission.shuttleT = 2;
    Hud.banner('The Iron Mandate is dead in space', 'Boarding shuttle launching. Cover it, and stop shooting the Mandate.');
  }
  if (Mission.objs[2].state !== 'open') return;
  if (!Mission.shuttleCraft && (Mission.shuttleT -= dt) <= 0) {
    const p = G.player; if (!p || !p.alive) return;
    const sq = new Squadron(p, 'shuttle', 9, 'Shuttle'), c = new Craft('shuttle', 0, sq);
    sq.ready = 0; sq.order = { kind: 'escort', target: p };
    p.toWorld(p.model.hangar ? p.model.hangar.p : p.model.centre, c.pos); c.fwd.copy(p.fwd); c.want.copy(p.fwd);
    c.mode = 'board'; c.target = F; c.radius = 40; sq.out.push(c); G.craft.push(c);
    Mission.shuttleCraft = c; Mission.shuttles++;
    for (const q of p.squads) if (q.type === 'int') q.command('escort', c);
    Hud.ribbon('Shuttle away · your interceptors are escorting it', 'info');
  }
  const c = Mission.shuttleCraft;
  if (c && c.mode === 'docked') {
    Mission.dock += dt;
    Mission.objs[2].text = 'Protect the boarding party · ' + fmtTime(ob.dockTime - Mission.dock);
    if (Mission.dock >= ob.dockTime) {
      Mission.setObj('board', 'done'); Mission.setObj('spare', 'done');
      Mission.finish('win', 'Admiral Varga is aboard the shuttle. All ships, jump out!');
      c.mode = 'board'; c.target = null;
    }
  } else if (c) Mission.objs[2].text = 'Protect the boarding shuttle · ' + Math.max(0, Math.round(c.hp / c.T.hp * 100)) + '%';
};
// Boarding shuttle flight: to the target's hangar, then docked and carried along with it.
Mission.shuttle = function (c, dt) {
  const t = c.target;
  if (!t || !t.alive) { c.mode = 'order'; c.wantSpeed = c.T.speed; return; }
  const h = t.model.hangar ? t.model.hangar.p : t.model.centre, wp = t.toWorld(h, _mw);
  if (c.mode === 'board') {
    const d = wp.distanceTo(c.pos); c.steerTo(wp, d < 500 ? 0.6 : 1);
    if (d < 90) { c.mode = 'docked'; Hud.ribbon('Shuttle docked · boarding party is in', 'good'); Sfx.lock(); }
  } else { c.pos.copy(wp); c.want.copy(t.fwd); c.wantSpeed = 0; c.speed = 0; }
};
Mission.finish = function (result, reason) {
  if (Mission.phase !== 'play') return;
  Mission.phase = 'done'; Mission.result = result; Mission.reason = reason; Mission.doneT = 0;
  const p = G.player, d = Mission.def;
  if (result === 'win') {
    const hull = p ? p.hull / p.maxHull : 0;
    const allies = G.ships.filter((s) => s.team === 0 && !s.isPlayer && s.tag !== 'protect');
    const alliesOk = Mission.alliesStart ? allies.filter((s) => s.alive || s.escaped).length / Mission.alliesStart : 1;
    const timeK = clamp(d.par / Math.max(1, Mission.time), 0, 1.2);
    const score = 40 + hull * 35 + Math.min(1, timeK) * 15 + alliesOk * 10;
    Mission.grade = score >= 92 ? 'S' : score >= 80 ? 'A' : score >= 65 ? 'B' : 'C';
    Mission.score = Math.round(score);
    const order = 'CBAS', prev = progress.best[d.id];
    if (!prev || order.indexOf(Mission.grade) > order.indexOf(prev)) progress.best[d.id] = Mission.grade;
    progress.open = Math.max(progress.open, Math.min(MISSIONS.length, Mission.idx + 2));
    saveProgress();
    Hud.banner('Victory', reason);
    if (d.obj.kind === 'board') for (const s of G.ships) if (s.team === 0 && s.alive && !s.isPlayer) Mission.later(1 + rand() * 2.5, () => s.jumpOut());
  } else { Mission.grade = '–'; Hud.banner('Defeat', reason); }
  Sfx.alarm();
};

// ---- Tips, shown once each ----
Mission.tip = function (id, html) { if (Mission.tipsShown[id]) return; Mission.tipsShown[id] = true; Hud.tip(html); };
Mission.tips = function () {
  const T = Mission.time, p = G.player, d = Mission.def;
  if (!p || !p.alive || Mission.phase !== 'play') return;
  if (d.tutorial) {
    if (T > 1.5) Mission.tip('fly', '<kbd>W</kbd> <kbd>S</kbd> throttle · <kbd>A</kbd> <kbd>D</kbd> turn · <kbd>R</kbd> <kbd>F</kbd> climb and dive. Move the mouse to look around, wheel to zoom out.');
    if (T > 13 && Mission.tipsShown.fly) Mission.tip('target', 'Enemy frigates ahead. <kbd>Tab</kbd> picks the next warship, <kbd>T</kbd> the one under your sight.');
    if (PC.target && Mission.tipsShown.target && T > 18) Mission.tip('fire', 'Your batteries fire from the <b>port</b> and <b>starboard</b> sides. Turn side-on, put your sight on the <b>diamond</b> (it leads the target) and click. The side markers light up when a battery bears.');
    if (p.stats.hits > 6) Mission.tip('subs', '<kbd>Q</kbd> <kbd>E</kbd> pick a subsystem on your target: engines, shields, batteries, hangar or bridge. Knock out its shield generator and its shields stop recharging.');
    if (Mission.tipsShown.subs && FACINGS.some((f) => p.shield[f] < p.shieldCap(f) * 0.6)) Mission.tip('shields', '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> reinforce your fore, aft, port or starboard shields (press again to even them out). Keep your strongest side toward the enemy.');
    if (Craft.byTeam[1].some((c) => c.pos.distanceTo(p.pos) < 2500)) Mission.tip('fighters', 'Enemy fighters! <kbd>Z</kbd> launches your interceptors. Tap again to send them at your target, <kbd>Shift</kbd>+<kbd>Z</kbd> keeps them close, hold <kbd>Z</kbd> to recall them.');
  }
  if (T > (d.tutorial ? 75 : 20)) Mission.tip('kite', '<kbd>G</kbd> launches <b>Kite</b>, your own strike fighter, and lets you fly it by remote. Your first officer fights the ship while you\'re out. <kbd>G</kbd> again brings you back to the bridge.');
  if (d.id === 'carrier' && T > 3) Mission.tip('bombers', '<kbd>X</kbd> is your bomber squadron. Target the carrier (<kbd>Tab</kbd>) and tap <kbd>X</kbd> to send them in. <kbd>V</kbd> sends every squadron at your target.');
  if (p.torpMax && T > 3) Mission.tip('torps', '<kbd>Space</kbd> fires your bow torpedo tubes at the target, if it is roughly ahead. Torpedoes cut through half the shield.');
  if (d.id === 'admiral' && T > 3) Mission.tip('board', 'Pick the Iron Mandate\'s <b>engines</b> and <b>shield generator</b> with <kbd>Q</kbd> <kbd>E</kbd> and shoot only those. Your bombers aim for the system you have picked.');
};
// Title backdrop: an endless battle with no player; ships that die are replaced.
Mission.demoUpdate = function (dt) {
  for (const T of [0, 1]) {
    const n = G.ships.filter((s) => s.team === T && s.alive).length;
    if (n < 4 && rand() < dt * 0.3) {
      const cls = pick(['cruiser', 'frigate', 'heavy', 'battleship', 'corvette']), s = new Ship(cls, T, {});
      const z = T ? 2200 : -2200;
      s.place(rnd(-1500, 1500), rnd(-400, 400), z, T ? 180 : 0); s.ai = new ShipAI(s, {}); s.C.hangar.forEach((t, i) => s.squads.push(new Squadron(s, t, i)));
      G.ships.push(s); s.startJump();
    }
  }
};
