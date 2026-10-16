// Nullwake — the run: starting, the wave director, scripted events (swarms, rings, elites, bosses) and the end.
let PLAYER_SPR = null;

function startRun(o = {}) {
  const stage = STAGE[o.stage] || STAGES[0], pilot = PILOTS[o.pilot] ? o.pilot : 'ryn';
  G.seed = o.seed != null ? String(o.seed) : String(Date.now()); seedRng(G.seed);
  for (const a of [E, EB, HZ, GEMS, ITEMS, PR, POOLS, LOBS]) a.length = 0;
  FX.clear();
  Object.assign(G, { t: 0, stage, stageId: stage.id, pilotId: pilot, kills: 0, gold: 0, shake: 0, hurtFlash: 0, empFlash: 0,
    spawnT: 0.5, evIdx: 0, boss: null, finalBoss: null, won: false, overT: 0, winT: 0, pendingLv: 0, chestQ: [], implode: [],
    bigGem: null, gemChain: 0, gemChainT: 0, alive: 0, aliveAll: 0, podT: 0, nextId: 1, invDirty: true, ended: false, quit: false });
  Object.assign(P, { x: 0, y: 0, fx: 1, fy: 0, side: 1, mvx: 0, mvy: 0, lvl: 1, xp: 0, next: xpFor(1), weapons: [], passives: [], st: null, dead: false, hurtT: 0, anim: 0, dmgTaken: 0 });
  recomputeStats();
  P.hp = P.st.maxHp; P.revives = P.st.revival; P.rerolls = P.st.rerolls; P.skips = P.st.skips;
  addWeapon(PILOTS[pilot].weapon);
  PLAYER_SPR = buildPlayerSprite(pilot);
  buildTiles(stage.look);
  for (let i = 0; i < 6; i++) { const a = rr(0, TAU), d = rr(250, 1100); spawnEnemy('pod', Math.cos(a) * d, Math.sin(a) * d); }
  G.cam.x = 0; G.cam.y = 0;
  SAVE.totals.runs++; writeSave();
  UI.close(); setState('play');
  AUDIO.level(0); AUDIO.music(stage.music);
  banner(stage.name.toUpperCase(), stage.sub, 'info', 2.6);
}
function setState(s) { G.state = s; document.body.dataset.state = s; AUDIO.setDuck(s === 'play' ? 1 : s === 'title' ? 1 : 0.4); }

const POOLS_CACHE = {};
function directorStep(dt) {
  const st = G.stage, m = Math.min(14, Math.floor(G.t / 60)), wv = st.waves[m];
  const pool = POOLS_CACHE[st.id + m] || (POOLS_CACHE[st.id + m] = wv[3].split(' '));
  const mult = G.finalBoss ? 0.45 : 1;
  G.spawnT -= dt;
  if (G.spawnT <= 0) { // steady trickle, held back once the field is already crowded
    G.spawnT += wv[1];
    if (G.alive < wv[0] * 2) { const n = Math.round(wv[2] * mult); for (let i = 0; i < n; i++) spawnAtEdge(pick(pool)); }
  }
  const need = wv[0] * mult - G.alive;
  for (let i = 0; i < Math.min(4, need); i++) { spawnAtEdge(pick(pool)); G.alive++; }
  while (G.evIdx < EVENTS.length && EVENTS[G.evIdx][0] <= G.t) runEvent(EVENTS[G.evIdx++]);
  AUDIO.level(G.finalBoss || G.boss ? 2 : G.t > 300 ? 1 : 0);
}
function runEvent(ev) {
  const cast = G.stage.ev, kind = ev[1];
  if (kind === 'swarm') { // a flock streams straight across the screen
    const type = cast.swarm, n = ev[2], a = rr(0, TAU), dx = Math.cos(a), dy = Math.sin(a), D = spawnRing(60);
    const cx = P.x - dx * D, cy = P.y - dy * D;
    for (let i = 0; i < n; i++) {
      const off = (i - n / 2) * 20 + rr(-6, 6), back = rr(0, 120);
      const e = spawnEnemy(type, cx - dy * off - dx * back, cy + dx * off - dy * back, { ai: 'swarm', force: true });
      if (e) { e.dx = dx; e.dy = dy; e.spd *= 1.15; }
    }
  } else if (kind === 'ringA' || kind === 'ringB') { // an encirclement
    const type = cast[kind], n = ev[2], D = spawnRing(10);
    for (let i = 0; i < n; i++) { const a = i / n * TAU; spawnEnemy(type, P.x + Math.cos(a) * D, P.y + Math.sin(a) * D, { force: true }); }
    banner('', 'Surrounded!', 'warn', 1.5);
  } else if (kind === 'elite') {
    spawnAtEdge(cast.elites[ev[2]], { elite: true, force: true });
  } else if (kind === 'mid') {
    const e = spawnAtEdge(cast.mid, { force: true }); G.boss = e;
    banner('WARNING', ENEMIES[cast.mid].name + ' approaches', 'warn', 3); sfx('warn');
  } else if (kind === 'final') {
    const e = spawnAtEdge(cast.final, { force: true }); G.boss = e; G.finalBoss = e;
    banner('WARNING', ENEMIES[cast.final].name + ' has found you', 'warn', 3.5); sfx('warn');
  }
}
function bossDied(e) {
  G.shake = Math.max(G.shake, 12);
  FX.explode(e.x, e.y, e.r * 2, e.def.c3); FX.burst(e.x, e.y, e.def.c1, 40, 300, 1, 4);
  if (G.boss === e) G.boss = null;
  if (e === G.finalBoss) {
    G.won = true; G.winT = 3.2;
    for (const o of E) if (!o.dead && o !== e && !o.prop) { o.dead = true; FX.burst(o.x, o.y, o.def.c1 || '#fff', 4, 90, 0.4, 2); }
    EB.length = 0; HZ.length = 0;
    banner('STAGE CLEAR', G.stage.name + ' is quiet again', 'info', 3); sfx('win');
  } else {
    dropItem(e.x, e.y, 'chest', 'boss'); dropItem(e.x + 18, e.y + 10, 'bag'); dropItem(e.x - 18, e.y + 10, 'bag');
  }
}

function stepGame(dt) {
  G.t += dt; G.frame++;
  playerUpdate(dt);
  if (!G.won) directorStep(dt);
  updateEnemies(dt);
  buildGrid(); separate();
  if (!P.dead) updateWeapons(dt);
  updateProjectiles(dt); updatePools(dt); updateEnemyBullets(dt); updateHazards(dt);
  updatePickups(dt); updatePods(dt); FX.update(dt);
  cleanup();
  G.shake = Math.max(0, G.shake - dt * 30); G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2.2); G.empFlash = Math.max(0, G.empFlash - dt * 2);
  if (P.dead) { G.overT -= dt; if (G.overT <= 0) endRun(false); }
  else if (G.won) { G.winT -= dt; for (const g of GEMS) g.mag = true; if (G.winT <= 0) endRun(true); }
  else if (G.chestQ.length) UI.chest(G.chestQ.shift());
  else if (G.pendingLv > 0) UI.levelUp();
}

function endRun(won) {
  if (G.ended) return;
  G.ended = true;
  const st = G.stage, bonus = won ? Math.round(300 * st.goldMul) : 0;
  G.bonus = bonus;
  SAVE.gold += G.gold + bonus; SAVE.totals.gold += G.gold + bonus; SAVE.totals.kills += G.kills;
  const b = SAVE.best[st.id] || { t: 0, kills: 0, lvl: 0 };
  SAVE.best[st.id] = { t: Math.max(b.t, G.t), kills: Math.max(b.kills, G.kills), lvl: Math.max(b.lvl, P.lvl) };
  if (won) { SAVE.cleared[st.id] = (SAVE.cleared[st.id] || 0) + 1; SAVE.totals.wins++; }
  writeSave();
  UI.results(won);
}

let bannerT = 0;
function banner(t, s, cls, dur) {
  const b = $('#banner'); b.className = 'on ' + (cls || 'info');
  b.firstElementChild.textContent = t; b.lastElementChild.textContent = s || '';
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('on'), (dur || 2) * 1000);
}
