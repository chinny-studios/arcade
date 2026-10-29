// ---- 15_main: boot, frame loop, #debug hook (window.SS) ----
function boot() {
  try { R.init(); } catch (e) { $('nogl').hidden = false; console.error(e); return; }
  Match.wind = { a: 0.8, s: 5 };
  Hud.init(); Ui.init();
  $('c').addEventListener('mousedown', () => { Sfx.init(); if (G.state === 'play' && !G.paused && !Input.locked && G.player && G.player.alive) Input.lock(); });
  addEventListener('keydown', () => Sfx.init(), { once: true });
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; G.t += dt;
    Input.pollPad();
    if (!G.manual) step(dt);
    Input.endFrame();
  }
  requestAnimationFrame(frame);
  if (DEBUG) window.SS = debugHook();
}
function step(dt) {
  const playing = G.state === 'play' && !G.paused;
  if (playing) { Match.update(dt); PC.update(dt); }
  else if (G.state !== 'play') Ui.backdrop(dt);
  if (!G.paused) { Fx.update(dt); R.update(dt); }
  if (G.state === 'play') Hud.update(dt); else drawOverlay();
  Ui.update(dt);
  const p = G.player, fire = p && p.alive && p.isPlayer ? p.fires.filter((f) => f > 0).length / 3 + (p.ignited > 0 ? 1 : 0) : 0;
  Sfx.ambient(true, G.state === 'play' ? Match.squall : 0, playing ? fire : 0);
  R.render();
}

function debugHook() {
  const P = () => G.player;
  const sum = (s) => ({ name: s.name, cls: s.cls, team: s.team, hp: Math.round(s.hp), alive: s.alive, x: Math.round(s.x), z: Math.round(s.z), crew: Math.round(s.crew), sails: +s.sails.toFixed(2), mode: s.bot ? s.bot.mode : 'player', dmg: Math.round(s.stats.dmg), kills: s.stats.kills, acc: s.stats.shots ? Math.round(s.stats.hits / s.stats.shots * 100) : 0 });
  const H = {
    start: (o) => Ui.startBattle(Object.assign({ countdown: 0 }, o || {})),
    sim(sec, dt) {
      dt = dt || 1 / 30; G.simming = true;
      try { for (let t = 0; t < sec; t += dt) { Match.update(dt); if (G.player && G.player.alive) { PC.ax = G.player.x + Math.sin(PC.yaw) * PC.aimDist; PC.az = G.player.z + Math.cos(PC.yaw) * PC.aimDist; } } }
      finally { G.simming = false; }
      return H.state();
    },
    render() { camera(0.016); R.update(0.016); if (G.state === 'play') Hud.update(0.016); R.render(); return true; },
    // Advance in real-time steps with effects (unlike sim), for screenshots.
    run(sec) { for (let t = 0; t < sec; t += 1 / 30) { Match.update(1 / 30); Fx.update(1 / 30); R.update(1 / 30); } camera(0.016); return H.state(); },
    state: () => ({ phase: Match.phase, time: Math.round(Match.time), left: Math.round(Match.left), pts: Match.pts.map(Math.round), squall: +Match.squall.toFixed(2),
      caps: Match.caps.map((c) => c.id + ':' + c.owner + (c.capTeam >= 0 ? '/' + c.capTeam + '@' + c.prog.toFixed(2) : '')), result: Match.result,
      alive: [0, 1].map((T) => G.ships.filter((s) => s.alive && s.team === T).length), balls: Combat.balls.length, rafts: Combat.rafts.length }),
    ships: () => G.ships.map(sum),
    me: () => P() && sum(P()),
    tp(x, z, h) { const p = P(); p.x = x; p.z = z; if (h != null) p.h = h; p.v = 0; return sum(p); },
    aim(yaw, dist) { PC.yaw = yaw; PC.aimDist = dist; const p = P(); PC.ax = p.x + Math.sin(yaw) * dist; PC.az = p.z + Math.cos(yaw) * dist; },
    aimAt(s) { const p = P(), [x, z] = leadPoint(p, s); PC.yaw = Math.atan2(x - p.x, z - p.z); PC.aimDist = Math.hypot(x - p.x, z - p.z); PC.ax = x; PC.az = z; return [x, z]; },
    fire: () => P().fire(PC.ax, PC.az),
    weapon: (i) => P().setWeapon(i),
    helm(tele, rudder) { const p = P(); if (tele != null) p.tele = tele; if (rudder != null) p.rudderCmd = rudder; },
    god(on) { G.god = on !== false; },
    manual(on) { G.manual = on !== false; },  // stop the real-time loop: tests own the clock and call render()
    // Fire a ship's batteries at another ship with perfect lead (bots or player).
    broadside(s, t) { const [x, z] = leadPoint(s, t); for (const b of BATTERIES) s.rl[b] = 0; return s.fire(x, z); },
    killAll(team) { for (const s of G.ships) if (s.alive && s.team === team) { s.hp = 0; s.die(null, 'test'); } },
    squall(on) { Match.squallAt = on ? Match.time - 1 : 1e9; Match.squall = on ? 1 : 0; R.setLook(Match.map, Match.squall); Match.lookQ = Match.squall; },
    // Place an enemy (or ally) ship relative to the player: bearing from the bow in radians, distance in metres.
    place(s, dist, bearing, h) { const p = P(); const a = p.h + (bearing || 0); s.x = p.x + Math.sin(a) * dist; s.z = p.z + Math.cos(a) * dist; if (h != null) s.h = h; s.v = 0; return sum(s); },
    enemy: (i) => G.ships.filter((s) => s.team !== (P() ? P().team : 0))[i || 0],
    ally: (i) => G.ships.filter((s) => s.team === (P() ? P().team : 0) && s !== P())[i || 0],
    peace() { for (const s of G.ships) if (s.bot) { s.bot.update = () => {}; s.tele = 0; s.rudderCmd = 0; s.v = 0; } },
    look(yaw, dist, zoom) { PC.yaw = yaw; if (dist) PC.aimDist = dist; if (zoom) PC.zoom = zoom; },
    input: Input, hud: Hud, match: Match, world: World, combat: Combat, pc: PC, ui: Ui, G, R, Fx, CLASSES, MAPS,
  };
  return H;
}
boot();
