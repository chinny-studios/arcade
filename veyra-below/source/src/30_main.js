// Veyra Below — boot, main loop and the #debug hook

let lastT = 0, autoSaveT = 0;
function boot() {
  loadOpts();
  try { initRender(); } catch (e) { console.error(e); return; }
  FX.init(); Input.init(); HUD.init(); UI.init();
  setQuality(OPTS.quality); AUDIO.setVolume(OPTS.music, OPTS.sfx); CAM.zoom = OPTS.zoom;
  UI.showTitle();
  if (DEBUG) installDebug();
  lastT = performance.now();
  requestAnimationFrame(loop);
}
function loop(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
  try { frame(dt, true); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function simRunning() { return (GAME.mode === 'hub' || GAME.mode === 'field') && !UI.isOpen() && !UI.blocking() && !!PL; }
function frame(dt, draw) {
  Input.update();
  if (UI.blocking() || UI.cur) UI.update();
  if (Input.mouse.wheel && !UI.isOpen()) { OPTS.zoom = clamp(OPTS.zoom + Input.mouse.wheel * 0.06, 0.7, 1.35); CAM.zoom = OPTS.zoom; }
  let sdt = dt;
  if (GAME.hitStop > 0) { GAME.hitStop -= dt; sdt = dt * 0.15; }
  if (simRunning()) {
    updateGame(sdt);
    if (Input.pressed('menu') && !UI.cur && Input.mode === 'pad') UI.openMenu('gear');
    autoSaveT += dt; if (GAME.mode === 'hub' && autoSaveT > 60) { autoSaveT = 0; SAVE.save(); }
  } else if (PL && (GAME.mode === 'hub' || GAME.mode === 'field')) {
    // paused behind a menu: keep animations still but the camera alive
    updateCutaway(LV, PL.x, PL.z, dt);
  }
  // camera
  if (GAME.titleCam) {
    GAME.previewT = (GAME.previewT || 0) + dt;
    const tele = LV && LV.objects.find((o) => o.kind === 'tele');
    if (GAME.preview && document.body.dataset.state === 'create' && tele) {
      const rig = GAME.preview; rig.g.rotation.y = GAME.previewT * 0.6;
      animHumanoid(rig, { t: GAME.previewT, move: 0, state: 'idle' }, dt);
      const ox = innerWidth > 760 ? -3.2 : 0;
      R.camera.position.set(tele.x + 5.5 + ox * 0.5, 3.0, tele.z + 5.5 - ox * 0.5); R.camera.lookAt(tele.x + ox * 0.5 * 0.7, 1.1, tele.z - ox * 0.5 * 0.7);
    } else if (tele) {
      const a = performance.now() / 1000 * 0.08, r = 22;
      R.camera.position.set(tele.x + Math.sin(a) * r, 13, tele.z + Math.cos(a) * r); R.camera.lookAt(tele.x, 1, tele.z);
    }
    if (LV && LV.npcs) updateHub(LV, dt, performance.now() / 1000);
  } else if (PL) {
    let ax = 0, az = 0;
    if (PL.aimPt && Input.mode === 'kbm') { ax = clamp((PL.aimPt.x - PL.x) * 0.18, -2.5, 2.5); az = clamp((PL.aimPt.z - PL.z) * 0.18, -2.5, 2.5); }
    updateCamera(dt, PL.x, PL.z, ax, az);
    R.plight.position.set(PL.x, 3.6, PL.z);
  }
  FX.update(simRunning() || GAME.titleCam ? sdt : 0);
  updateFlashes(dt);
  if (draw) R.renderer.render(R.scene, R.camera);
  if (PL && GAME.char && document.body.dataset.state === 'play') HUD.update(dt);
  Input.endFrame();
}

// ---------- #debug hook: window.VB ----------
function installDebug() {
  const VB = {
    GAME, ENTS, R, CAM, UI, HUD, Input, FX, get PL() { return PL; }, get LV() { return LV; }, get ALLIES() { return ALLIES; },
    f: { spawnEnemy, spawnBoss, makeEquip, makeTool, makeDisc, makeGem, makeRelic, rollDrop, computeStats, gainXP, buildFloor, enterHub, descend, roomAt, tileCenter, feedSprite, partyHit, dealDamage, startTech, startSkill, useSlot, usePB, GROUND, ZONES, PROJ, interact, nearestInteract, restoreField, stashField, genQuest, equipItem },
    // start({ role, race, name, level, allies: n, area, floor, diff })
    start(o = {}) {
      const c = newCharacter(o.name || 'Tester', o.role || 'vanguard', o.race || 'human', { suit: SUIT_COLORS[o.suit || 1], suit2: 0x2a2e38, hair: HAIR_COLORS[2], build: 0, glow: 0x60e0ff });
      if (o.level) { c.level = o.level; c.skillPts = o.level; }
      GAME.char = c; GAME.slot = -1; GAME.titleCam = false;
      UI.close(true);
      for (let k = 0; k < (o.allies || 0); k++) c.allies.push(genAllyCandidate(c.level, RNG('ally' + k)));
      c.prog.introDone = true; c.prog.seenIntro = true;
      enterHub();
      if (o.area) buildFloor(o.area, o.floor || 0, o.diff || 0, o.seed);
      return Promise.resolve(true);
    },
    sim(sec, step = 1 / 30) { const n = Math.round(sec / step); for (let i = 0; i < n; i++) frame(step, false); return VB.stats(); },
    render() { R.renderer.render(R.scene, R.camera); },
    tp(x, z) { PL.x = x; PL.z = z; snapCamera(x, z); frame(1 / 30, false); },
    toRoom(i) { const rm = LV.rooms[i]; VB.tp(tileCenter(rm.ci), tileCenter(rm.cj)); return rm.type; },
    give(kind, a, b) { const c = GAME.char; let it; if (kind === 'tool') it = makeTool(a, b || 1); else if (kind === 'disc') it = makeDisc(a, b || 1); else if (kind === 'gem') it = makeGem(a, b || 0); else if (kind === 'relic') it = makeRelic(RELICS.find((r) => r.id === a), b || 10); else it = makeEquip(kind, b || c.level, 2, rnd, { base: a }); it.unid = false; invAdd(c.inv, it); return it; },
    spawn(id, dx = 4, dz = 0, o = {}) { return spawnEnemy(id, PL.x + dx, PL.z + dz, Object.assign({ lvl: GAME.floorLevel() }, o)); },
    god(on = true) { VB._god = on; if (on && !VB._godHooked) { VB._godHooked = true; bus.on('down', (a) => { if (VB._god && a === PL) reviveActor(PL, 1); }); } if (PL) PL.inv = on ? 1e9 : 0; },
    killAll() { for (const e of [...ENTS]) if (e.team === 1 && !e.dead) killActor(e, PL); },
    press(act) { Input.acts.add(act); frame(1 / 30, false); },
    stats() { return { mode: GAME.mode, area: GAME.area, floor: GAME.floorIdx, lvl: GAME.char && GAME.char.level, hp: PL && Math.round(PL.hp), maxHp: PL && PL.maxHp, tp: PL && Math.round(PL.tp), enemies: ENTS.filter((e) => e.team === 1 && !e.dead && !e.box).length, allies: ALLIES.length, ground: GROUND.length, credits: GAME.char && GAME.char.credits, room: GAME.curRoom && GAME.curRoom.type }; },
  };
  Object.assign(window, { ROLES_: ROLES, RACES_: RACES, TECHS_: TECHS, SKILLS_: SKILLS, WTYPES_: WTYPES, STAR_SIGNS_: STAR_SIGNS, techLevelCap_: techLevelCap, refreshPartyActor_: refreshPartyActor, tooltipHTML_: tooltipHTML, itemName_: itemName, invAdd_: invAdd, spriteLevel_: spriteLevel, SAVE_: SAVE, weaponDamage_: weaponDamage, techPower_: techPower, LCURVE_: LCURVE, ECURVE_: ECURVE });
  window.VB = VB;
}
boot();
