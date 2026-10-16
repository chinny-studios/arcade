// Nullwake — boot, the frame loop and the #debug test hook (window.NW).
let lastTs = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (ts - lastTs) / 1000)); lastTs = ts;
  INPUT.poll(dt);
  if (G.state === 'play') { let rem = dt; while (rem > 1e-4 && G.state === 'play') { const h = Math.min(rem, 1 / 30); stepGame(h); rem -= h; } }
  if (G.state === 'title' || G.state === 'boot') renderAttract(dt); else render();
  HUD.update();
}

function boot() {
  resize(); addEventListener('resize', resize);
  buildPickups(); HUD.init(); INPUT.init();
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !DEBUG) UI.pause(); });
  if (SAVE.lastPilot && SAVE.pilots[SAVE.lastPilot]) UI.sel.pilot = SAVE.lastPilot;
  UI.title();
  requestAnimationFrame(frame);
}

if (DEBUG) {
  // Test hook. NW.start({ stage, pilot, seed }), NW.sim(seconds, { still }) steps the game without rendering, driven by
  // the autopilot unless `still`; level-ups and chests are resolved with the bot's picks. NW.bot(true) drives live play.
  window.NW = {
    G, P, E, GEMS, ITEMS, EB, HZ, PR, POOLS, SAVE: () => SAVE, WEAPONS, PASSIVES, ENEMIES, STAGES, PILOTS, META, UI, FX,
    start(o = {}) { startRun(o); return { stage: G.stageId, pilot: G.pilotId, hp: P.hp }; },
    sim(sec, o = {}) {
      const was = G.bot, n = Math.round(sec / STEP); G.bot = !o.still;
      for (let i = 0; i < n && !G.ended; i++) {
        if (G.state !== 'play') { if (G.state === 'levelup') UI.pick(botPick(UI.choices)); else if (G.state === 'chest' || G.state === 'pause') UI.resume(); else break; }
        stepGame(STEP);
      }
      G.bot = was;
      return this.stats();
    },
    bot(on = true) { G.bot = on; return on; },
    god(on = true) { G.god = on; return on; },
    render() { render(); HUD.update(); },
    time(sec) { G.t = sec; while (G.evIdx < EVENTS.length && EVENTS[G.evIdx][0] < sec) G.evIdx++; return G.t; },
    give(id, lvl = 1) {
      if (WEAPONS[id]) { let w = P.weapons.find((x) => x.id === id); if (!w) w = addWeapon(id); w.lvl = Math.min(lvl, WEAPONS[id].from ? 1 : MAX_WLV); calcWeapon(w); }
      else if (PASSIVES[id]) { let p = passiveOf(id); if (!p) P.passives.push(p = { id, lvl: 1 }); p.lvl = Math.min(lvl, PASSIVES[id].max); recomputeStats(); }
      G.invDirty = true; return P.weapons.map((w) => w.id + ':' + w.lvl).concat(P.passives.map((p) => p.id + ':' + p.lvl));
    },
    spawn(type, n = 1, o = {}) { const out = []; for (let i = 0; i < n; i++) { const e = o.at ? spawnEnemy(type, P.x + o.at[0] + i * 4, P.y + o.at[1], Object.assign({ force: true }, o)) : spawnAtEdge(type, Object.assign({ force: true }, o)); out.push(e); } return out.length; },
    item(kind, dx = 30, dy = 0, arg) { dropItem(P.x + dx, P.y + dy, kind, arg); },
    event(kind, arg) { runEvent([G.t, kind, arg]); },
    killAll() { for (const e of E) if (!e.dead && !e.prop) killEnemy(e, null); cleanup(); },
    levelUp() { G.pendingLv++; UI.levelUp(); return UI.choices.map((c) => c.kind + ':' + c.id); },
    chest(kind = 'elite') { UI.chest(kind); return $('#menu').innerText; },
    pause() { UI.pause(); }, resume() { UI.resume(); },
    end(won) { endRun(won); },
    mute() { SAVE.opts.sfx = 0; SAVE.opts.music = 0; AUDIO.setVol(); },
    stats() {
      return { t: Math.round(G.t), state: G.state, hp: Math.round(P.hp), maxHp: P.st && P.st.maxHp, lvl: P.lvl, kills: G.kills, gold: G.gold, enemies: E.filter((e) => !e.dead && !e.prop).length,
        gems: GEMS.length, dead: P.dead, won: G.won, ended: G.ended, boss: G.boss ? G.boss.def.name + ' ' + Math.round(G.boss.hp) : null,
        weapons: P.weapons.map((w) => w.id + ':' + w.lvl), passives: P.passives.map((p) => p.id + ':' + p.lvl) };
    },
  };
}
boot();
