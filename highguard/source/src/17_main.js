// ---- 17_main: boot, frame loop, #debug hook (window.HG) ----
function boot() {
  try { R.init(); } catch (e) { $('nogl').hidden = false; console.error(e); return; }
  Models.init(); Fx.init(); Damage.init(); Craft.init();
  Hud.init(); Ui.init();
  $('c').addEventListener('mousedown', () => { Sfx.init(); if (G.state === 'play' && !G.paused && !Input.locked && !DEBUG) Input.lock(); });
  addEventListener('keydown', () => Sfx.init(), { once: true });
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; G.t += dt;
    if (!G.manual) step(dt);
    Input.endFrame();
  }
  requestAnimationFrame(frame);
  if (DEBUG) window.HG = debugHook();
}
function step(dt) {
  const playing = G.state === 'play' && !G.paused;
  if (playing) { PC.update(dt); Mission.update(dt); }
  else if (G.state === 'title' || G.state === 'menu') Ui.backdrop(dt);
  else if (G.state === 'over') Mission.update(dt);
  if (!G.paused) { Fx.update(dt); R.update(dt); Damage.update(dt); }
  draw(G.paused ? 0 : dt);
  Ui.update(dt);
  const p = G.player;
  Sfx.engine(G.state === 'play' && !G.paused && p && p.alive, p ? p.speed / (p.C.speed || 1) : 0);
  R.render();
}
function draw(dt) {
  if (G.state === 'play' || G.state === 'over') PC.camera(dt); else Cine.update(0);
  for (const s of G.ships) s.draw(dt);
  Craft.draw(dt); Combat.draw();
  Fx.flushGlows(); Fx.flushBolts();
  if (G.state === 'play') Hud.update(dt); else Hud.overlay(null);
}

function debugHook() {
  const P = () => G.player;
  const sum = (s) => ({ name: s.name, cls: s.cls, team: s.team, tag: s.tag, alive: s.alive, arrived: s.arrived, hull: Math.round(s.hull), shields: FACINGS.map((f) => Math.round(s.shield[f])),
    reinforce: s.reinforce, pos: s.pos.toArray().map(Math.round), speed: Math.round(s.speed), subs: Object.keys(s.subs).filter((k) => s.subs[k].down),
    squads: s.squads.map((q) => q.type + ':' + q.ready + '/' + q.out.length + ':' + q.order.kind), stats: Object.assign({}, s.stats) });
  const find = (name) => G.ships.find((s) => s.name === name);
  const H = {
    start(o) {
      o = o || {};
      const idx = typeof o.mission === 'string' ? MISSIONS.findIndex((m) => m.id === o.mission) : (o.mission || 0);
      G.state = 'play'; G.paused = false;
      const r = Mission.start(idx, o); PC.reset(); Hud.reset(); Ui.show(null); document.body.dataset.state = 'play';
      for (const s of G.ships) s.draw(0);
      return r;
    },
    sim(sec, dt) {
      dt = dt || 1 / 30; G.simming = true;
      try { for (let t = 0; t < sec; t += dt) { Mission.update(dt); if (G.player) PC.camera(0); } }
      finally { G.simming = false; }
      return H.state();
    },
    // Advance with effects (unlike sim), for screenshots.
    run(sec, dt) { dt = dt || 1 / 30; for (let t = 0; t < sec; t += dt) { Mission.update(dt); Fx.update(dt); R.update(dt); Damage.update(dt); draw(dt); } return H.state(); },
    render() { draw(0.016); R.render(); return true; },
    manual(on) { G.manual = on !== false; },
    state: () => ({ mission: Mission.def && Mission.def.id, phase: Mission.phase, result: Mission.result, reason: Mission.reason, time: +Mission.time.toFixed(1), grade: Mission.grade,
      objs: Mission.objs.map((o) => o.state + ': ' + o.text), alive: [0, 1].map((T) => G.ships.filter((s) => s.alive && s.team === T).length),
      pending: Mission.queue.length, craft: [0, 1].map((T) => G.craft.filter((c) => c.alive && c.team === T).length), bolts: Combat.bolts.length, torps: Combat.torps.length }),
    ships: () => G.ships.map(sum), me: () => P() && sum(P()), sum, find,
    craft: () => G.craft.map((c) => ({ type: c.type, team: c.team, mode: c.mode, hp: Math.round(c.hp), torps: c.torps, sq: c.squad && c.squad.name })),
    enemy: (i) => G.ships.filter((s) => s.team === 1 && s.alive)[i || 0],
    ally: (i) => G.ships.filter((s) => s.team === 0 && s !== P() && s.alive)[i || 0],
    tp(x, y, z, yawDeg) { const p = P(); p.place(x, y, z, yawDeg != null ? yawDeg : p.yaw / DEG); return sum(p); },
    // Put a ship relative to the player: distance, bearing from the bow (degrees, + to port), elevation, and its heading.
    place(s, dist, bearing, elev, yawDeg) {
      const p = P(), d = dirFrom(p.yaw + (bearing || 0) * DEG, (elev || 0) * DEG);
      s.place(p.pos.x + d.x * dist, p.pos.y + d.y * dist, p.pos.z + d.z * dist, yawDeg != null ? yawDeg : s.yaw / DEG);
      if (!s.arrived) { s.arrived = true; s.root.visible = true; Mission.queue = Mission.queue.filter((q) => q.s !== s); }
      return sum(s);
    },
    look(yawDeg, pitchDeg, dist) { if (yawDeg != null) PC.yaw = yawDeg * DEG; if (pitchDeg != null) PC.pitch = pitchDeg * DEG; if (dist) PC.dist = dist; PC.camera(0); },
    // Point the camera so the sight sits on the lead point of a ship (or one of its systems).
    aimAt(s, sub) {
      const p = P(); PC.setTarget(s); PC.sub = sub || null;
      const lp = sub ? s.subs[sub].p : s.model.centre, w = leadPoint(p.pos, s.toWorld(lp), s.vel, BOLT_SPEED);
      const piv = p.pos.clone().addScaledVector(UP, p.len * 0.2), d = w.sub(piv).normalize();
      PC.yaw = yawOf(d); PC.pitch = pitchOf(d); PC.camera(0); PC.gunnery(); return Object.assign({}, PC.bears);
    },
    fire() { const p = P(); PC.camera(0); PC.gunnery(); const out = []; for (const side in p.bat) if (PC.bears[side] && p.bat[side].t <= 0 && p.fireBattery(side, PC.aim, 0.0011)) out.push(side); return out; },
    pilot() { PC.launchFighter(); return !!PC.pilot; },
    unpilot() { if (PC.pilot) PC.endPilot(); },
    reload() { for (const k in P().bat) P().bat[k].t = 0; P().torpCd = 0; },
    torp() { return P().fireTorps(PC.target); },
    target(s, sub) { PC.setTarget(s); PC.sub = sub || null; },
    shields(f) { return P().setReinforce(f); },
    squad(i, kind, target) { const q = P().squads[i]; if (!q) return null; q.command(kind, target || PC.target, PC.sub); return q.status; },
    helm(thrIdx, yawCmd, pitchCmd) { if (thrIdx != null) PC.thrIdx = thrIdx; const p = P(); p.thr = THROTTLE[PC.thrIdx]; if (yawCmd != null) p.yawCmd = yawCmd; if (pitchCmd != null) p.pitchCmd = pitchCmd; },
    // Fixed camera for screenshots: cam([x,y,z], [x,y,z]); cam() goes back to the chase view.
    cam(pos, at) { G.camOverride = pos ? [new V3(...pos), new V3(...at)] : null; },
    spawn(cls, team, x, y, z, yawDeg) { const s = new Ship(cls, team, {}); s.place(x, y, z, yawDeg || 0); s.C.hangar.forEach((t, i) => s.squads.push(new Squadron(s, t, i))); G.ships.push(s); return s; },
    god(on) { G.god = on !== false; },
    killAll(team) { for (const s of G.ships) if (s.alive && s.team === team && s.arrived) { s.hull = 0; s.die(null); } },
    peace() { for (const s of G.ships) if (s.ai) { s.ai.update = () => {}; s.thr = 0; s.yawCmd = 0; s.pitchCmd = 0; } },
    input: Input, hud: Hud, mission: Mission, combat: Combat, pc: PC, ui: Ui, G, R, Fx, Craft, Damage, CLASSES, MISSIONS, progress,
  };
  return H;
}
boot();
