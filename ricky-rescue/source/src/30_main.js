// Ricky Rescue — boot, the frame loop, reactions to game events, and the #debug hook (window.RR)

let lastT = 0;
const TONES = ['wail', 'yelp', 'hilo'];
function boot() {
  loadOpts();
  try { initRender(); } catch (e) { console.error(e); return; }
  makeTextures(); R.sunDisc.material.map = TEX.glow;
  buildCity(); initTraffic(); initResponders(); buildMinimap(); initPosts();
  Input.init(); wireUI();
  setQuality(OPTS.quality); AUDIO.setVolume(OPTS.volume);
  G.live = true;
  if (hasSave()) loadGame();
  showTitle();
  if (DEBUG) installDebug();
  lastT = performance.now();
  requestAnimationFrame(loop);
}
function loop(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
  try { frame(dt, true); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}

function frame(dt, draw) {
  Input.update();
  const state = document.body.dataset.state;
  if (Input.mode === 'pad' && (UI.top() || state !== 'play')) UI.update();
  if (state !== 'play') { menuFrame(dt, draw); Input.endFrame(); return; }
  handleGlobalKeys();
  const paused = UI.paused();
  const C = G.call;
  // fast-forward in the back, or while waiting between calls
  let sdt = paused ? 0 : dt * (OPTS.ff && G.where === 'back' ? 3 : 1);
  if (!paused) {
    if (G.where === 'cab') cabControls(sdt);
    else if (G.where === 'foot') footControls(sdt);
    else if (G.where === 'back') { const inp = RIG.auto ? autopilot(sdt) : { park: true }; driveRig(sdt, inp); }
    if (G.where === 'foot' && PARTNER.task === 'drive' && RIG.auto) driveRig(sdt, autopilot(sdt));
    if (G.where === 'foot' && !RIG.auto && !(PARTNER.task === 'drive')) driveRig(sdt, { park: true });
    if (G.where === 'cab' && PARTNER.task === 'back' && C && C.stage === 'transport') C.roughSum = (C.roughSum || 0) + RIG.rough * sdt;
    updateGame(sdt);
    updateTraffic(sdt, focusX(), focusZ());
    updateResponders(sdt);
    updateRoute(sdt);
    if (G.where === 'foot' || G.where === 'cab') updatePartner(sdt);
    updateMCI(sdt);
    updateScenePeople(sdt);
    if (C && C.mci) for (const P of C.patients) if (P.model && P.person) P.person.pose = patientPose(P);
  }
  updateRigLights(dt);
  // cameras
  const look = Input.lookDelta();
  if (Math.abs(look.x) + Math.abs(look.y) > 0.0001) { CAM.userYaw -= look.x; CAM.userPitch = clamp(CAM.userPitch + look.y, -0.3, 0.9); CAM.orbitT = 1.6; }
  if (Input.mouse.wheel) CAM.zoom = clamp((CAM.zoom || 1) + Input.mouse.wheel * 0.08, 0.6, 1.6);
  if (G.where === 'cab') camChase(dt, RIG.x, RIG.z, RIG.yaw, RIG.v, RIG.len);
  else if (G.where === 'foot') { const inside = PLAYER.sp === 'int'; camOrbit(dt, PLAYER.x, PLAYER.y, PLAYER.z, (inside ? 5.6 : 6.8) * (CAM.zoom || 1), inside ? 0.95 : 0.38); }
  else if (G.where === 'back') camRigBack(dt);
  updateSunFollow(G.where === 'foot' ? PLAYER.x : RIG.x, G.where === 'foot' ? PLAYER.z : RIG.z);
  if (R.env === 'interior') R.ptLight.position.set(PLAYER.x, 2.4, PLAYER.z);
  updateHUD(dt);
  updateCarePanel(dt);
  AUDIO.update(dt);
  if (draw) R.renderer.render(R.scene, R.camera);
  Input.endFrame();
}
const focusX = () => (G.where === 'foot' && PLAYER.sp === 'city' ? PLAYER.x : RIG.x);
const focusZ = () => (G.where === 'foot' && PLAYER.sp === 'city' ? PLAYER.z : RIG.z);

function handleGlobalKeys() {
  if (Input.pressed('menu') || Input.pressed('back')) {
    const top = ['options', 'help', 'mapBig', 'rigcheck', 'rear', 'triage'].find((id) => UI.isOpen(id));
    if (top) UI.hide(top);
    else if (UI.isOpen('transport') && TP.midway) UI.hide('transport');
    else if (UI.isOpen('pause')) UI.hide('pause');
    else if (CARE.open && G.where !== 'back') closeCare();
    else if (Input.pressed('menu')) openPause();
  }
  if (UI.paused()) return;
  if (Input.pressed('map')) { if (HUD.mapBig) UI.hide('mapBig'); else UI.show('mapBig'); }
  if (Input.pressed('enter') && G.call && G.call.stage === 'pending') respond();
  if ((Input.pressed('skip') || Input.pressed('t_wait')) && !G.call) toggleWait();
  if (Input.pressed('cprTap') && WORK.ricky && WORK.ricky.id === 'cpr') cprTap();
  if (Input.pressed('t_ls')) setSiren(!RIG.siren);
  if (Input.pressed('t_cam')) CAM.far = !CAM.far;
}
function cabControls(dt) {
  const A = RIG;
  const blocked = UI.blocking();
  const inp = blocked ? (Math.abs(A.v) > 0.5 ? { thr: 0, brk: 0.4, steer: 0 } : { park: true }) : Input.drive();
  A.thr = inp.thr;
  driveRig(dt, A.auto ? autopilot(dt) : inp);
  A.horn = !blocked && Input.held('horn');
  if (blocked) return;
  if (Input.pressed('ls')) setSiren(!A.siren);
  if (Input.pressed('tone')) A.tone = TONES[(TONES.indexOf(A.tone) + 1) % 3];
  if (Input.pressed('cam')) CAM.far = !CAM.far;
  if ((Input.pressed('exit') || Input.pressed('t_exit')) && !exitCab()) toast('Stop first.', 'bad');
  if (Input.pressed('use') && G.call && G.call.stage === 'pending') respond();
}
function footControls(dt) {
  updatePlayer(dt);
  if (UI.blocking()) return;
  if (Input.pressed('cycle') || Input.pressed('t_cycle')) HUD.promptIdx++;
  if (Input.pressed('use') || Input.pressed('t_use')) usePrompt();
  if (Input.pressed('exit') || Input.pressed('t_exit')) { const d = rigDriverDoor(); if (dist(PLAYER.x, PLAYER.z, d.x, d.z) < 3) enterCab(); else toast('Walk to the driver\'s door to get in.'); }
  if (Input.pressed('ls')) { const p = HUD.prompts.find((q) => q.key === 'Q'); if (p) p.fn(); }
  if (Input.pressed('tone')) { const p = HUD.prompts.find((q) => q.key === 'R'); if (p) p.fn(); }
}
// title and station: the rig at Station 12 with an orbiting camera
function menuFrame(dt, draw) {
  G.titleT = (G.titleT || 0) + dt;
  const st = CITY.station;
  updateTraffic(dt, st.x, st.z);
  if (RIG) { driveRig(dt, { park: true }); updateRigLights(dt); }
  const title = document.body.dataset.state === 'title';
  const a = G.titleT * 0.06 + (title ? 0.6 : 2.4), r = title ? 17 : 13;
  const cx = st.x + (title ? 4 : 0), cz = st.z + 2;
  R.camera.position.set(cx + Math.sin(a) * r, title ? 5 : 4.2, cz + Math.cos(a) * r);
  R.camera.lookAt(cx, title ? 2.2 : 1.6, cz);
  updateSunFollow(st.x, st.z);
  AUDIO.update(dt);
  if (draw) R.renderer.render(R.scene, R.camera);
}

// ---------- reactions ----------
bus.on('crash', (k, car) => {
  AUDIO.crash(k);
  const C = G.call;
  if (C && RIG.loaded) { RIG.loaded.painBump = Math.min(4, (RIG.loaded.painBump || 0) + k * 0.15); }
  if (car && k > 3) radio('Driver', pick(['Hey! Watch it!', 'Are you kidding me?!', 'My car!']), 'other');
});
bus.on('arrest', (P) => {
  const C = G.call; if (!C || P !== C.P || C.stage === 'pending') return;
  AUDIO.alarm();
  if (C.times.contact !== undefined) { toast(`${P.first} has no pulse! Start CPR!`, 'bad'); if (P.where && P.where.scene === 'rig' && PARTNER.task === 'drive') partnerSay('Do you need me back there? Say the word and I\'ll pull over.'); }
});
bus.on('rosc', (P) => { if (G.call && P === G.call.P) { toast('Pulse is back! ROSC!', 'good'); AUDIO.chime('A'); partnerSay('I\'ve got a pulse! Good work.'); } });
bus.on('aedShock', () => { AUDIO.speak('Shock advised. Stand clear.'); AUDIO.alarm(); });
bus.on('shock', () => AUDIO.shock());
bus.on('vomit', (P) => { if (G.call && P === G.call.P && G.call.times.contact !== undefined) { toast(`${P.first} is vomiting: suction the airway!`, 'bad'); } });
bus.on('patientWoke', (P) => { if (G.call && P === G.call.P) toast(`${P.first} is waking up and breathing better.`, 'good'); });
bus.on('seizureStop', (P) => { if (G.call && P === G.call.P) toast('The seizure has stopped.', 'good'); });
bus.on('birth', (P) => { AUDIO.chime('A'); toast('The baby is here! Dry, warm and stimulate.', 'good'); });
bus.on('harm', (t) => toast('✗ ' + t, 'bad'));
bus.on('enterCab', () => { if (G.call && G.call.stage === 'onscene' && RIG.loaded) openTransportPanel(); });

// ---------- #debug hook: window.RR ----------
function installDebug() {
  const step = 1 / 30;
  const RR = {
    G, R, CAM, CITY, TRAFFIC, ROUTE, SCENE, EQ, PLAYER, PARTNER, WORK, CARE, UI, HUD, Input, CALL, ACT, OPTS, RESP, MEDIC, SSM, DT, RIG_CHECK,
    get C() { return G.call; }, get P() { return G.call && G.call.P; }, get RIG() { return RIG; },
    f: { buildRoute, autopilot, driveRig, startCall, dispatchCall, respond, setSiren, arriveOnScene, exitCab, enterCab, goInside, goOutside, takeFromRig, partnerFetch, startMove, transferToStretcher, loadPatient, unloadPatient, confirmTransport, openTransportPanel, openHandoff, finishCall, backInService, scoreCall, tickPatient, makePatient, startArrest, deliverShock, openCare, closeCare, doAction, stopWorker, careContext, interactions, usePrompt, setTimeOfDay, setQuality, showStation, showTitle, startMCI, tagPatient, startTag, sendMCIReport, openTriage, saveGame, loadGame, newCareer, skipToCall, pickCall, CALLS, startShift, collideCircle, roadPlaces, MOVES, setEnv,
      toggleWait, startRestock, openRigCheck, rigCheckItem, rigFixItem, grabCoffee, coffeeSpot, replan, assignPost, unitBusy, coverPlan, systemCoverage, callZoneWeight, equipDelay, resetDowntime, missingStock, fullStock, buildRig, RIGS },
    // start({ rank, rig, hour, hours, xp, money, faults }) — a throwaway career (never saved) and a shift, no calls until
    // asked. The rig comes clean unless faults: true (then the rig check has whatever the last crew left)
    start(o = {}) {
      G.noSave = true;
      G.career = newCareer();
      if (o.rank) { G.career.xp = RANKS[o.rank].xp; }
      if (o.xp) G.career.xp = o.xp;
      updateUnlocks(G.career);
      if (o.rig) { G.career.rig = o.rig; G.career.rigs.push(o.rig); }
      if (o.money) G.career.money = o.money;
      OPTS.tips = false; OPTS.voice = false;
      G.live = false;
      startShift({ hour: o.hour !== undefined ? o.hour : 10, hours: o.hours || 12, firstCall: 99999 });
      if (!o.faults) { for (const it of Object.values(G.shift.check.items)) it.bad = false; RIG.stock = fullStock(RIGS[RIG.type].cap); }
      setState('play');
      return Promise.resolve(true);
    },
    sim(sec, s = step) { const n = Math.round(sec / s); for (let i = 0; i < n; i++) frame(s, false); return RR.stats(); },
    render() { R.renderer.render(R.scene, R.camera); },
    // a call of a given type (and optionally district / place filter); responds right away unless respond: false
    call(type, o = {}) {
      const c = type === 'mci' ? startMCI(o) : dispatchCall(Object.assign({ type }, o));
      if (c && o.respond !== false) respond();
      return c && { type: c.type, addr: c.addr, text: c.dispatchText, indoor: c.indoor, floor: c.floor, hazard: c.hazard };
    },
    // put the rig at the curb (or staging) and arrive
    toScene(o = {}) {
      const C = G.call; if (!C) return null;
      const t = C.hazard && !C.pdCleared && !o.ignoreHazard ? stagingPoint(C) : C.place.curb;
      RIG.x = t.x; RIG.z = t.z; RIG.yaw = t.yaw; RIG.v = 0; RIG.auto = null; placeRigModel(0); snapCam();
      frame(step, false); frame(step, false);
      if (C.hazard && o.waitPD) { while (!C.pdCleared) frame(0.5, false); RIG.x = C.place.curb.x; RIG.z = C.place.curb.z; RIG.yaw = C.place.curb.yaw; frame(step, false); }
      return C.stage;
    },
    // Ricky (and Marisol) right next to the patient, inside if need be
    toPatient() {
      const C = G.call, P = C.P;
      if (G.where === 'cab') exitCab();
      if (P.where.scene === 'interior' && PLAYER.sp !== 'int') goInside();
      PLAYER.x = P.where.x + 1.2; PLAYER.z = P.where.z + 0.6; PLAYER.yaw = Math.atan2(P.where.x - PLAYER.x, P.where.z - PLAYER.z);
      PARTNER.sp = PLAYER.sp; PARTNER.x = P.where.x - 1; PARTNER.z = P.where.z + 0.4; PARTNER.task = 'kneel'; PARTNER.gear = true;
      frame(step, false);
      openCare(P);
      return { where: G.where, sp: PLAYER.sp, d: dist(PLAYER.x, PLAYER.z, P.where.x, P.where.z) };
    },
    // do one action and wait (in game time) for it to finish; returns the log line
    act(id, who = 'ricky', wait = true) {
      for (let i = 0; i < 3000 && WORK[who] && !WORK[who].cont; i++) frame(step, false);
      const ok = doAction(id, who); if (!ok) return 'BLOCKED: ' + actionBlock(ACT[id], G.call.P, who);
      if (!wait || ACT[id].cont) { frame(step, false); return 'started'; }
      for (let i = 0; i < 4000 && WORK[who] && WORK[who].id === id; i++) frame(step, false);
      const L = G.call.log.filter((l) => !l.radio); return L.length ? L[L.length - 1].text : '';
    },
    // package with a device that's brought from the rig, carry to the rig and load (skips the walking)
    pack(dev = 'stretcher') {
      const C = G.call, P = C.P, e = EQ[dev];
      e.at = 'ground'; e.sp = P.where.scene === 'interior' ? 'int' : 'city'; e.x = P.where.x + 1.2; e.z = P.where.z; e.model.g.visible = true;
      PARTNER.task = 'kneel'; PARTNER.sp = e.sp; PARTNER.x = P.where.x - 1; PARTNER.z = P.where.z;
      startMove(P, dev === 'stretcher' ? 'stretcher' : dev);
      for (let i = 0; i < 3000 && WORK.ricky; i++) frame(step, false);
      if (P.carried !== 'stretcher') {
        if (PLAYER.sp === 'int') goOutside();
        const s = EQ.stretcher; s.at = 'ground'; s.sp = 'city'; s.x = PLAYER.x + 1.5; s.z = PLAYER.z; s.model.g.visible = true;
        transferToStretcher(); for (let i = 0; i < 2000 && WORK.ricky; i++) frame(step, false);
      }
      if (PLAYER.sp === 'int') goOutside();
      const r = rigRear(); PLAYER.x = r.x - Math.sin(RIG.yaw) * 1.6; PLAYER.z = r.z - Math.cos(RIG.yaw) * 1.6; PLAYER.yaw = RIG.yaw;
      frame(step, false);
      loadPatient(); for (let i = 0; i < 2000 && WORK.ricky; i++) frame(step, false);
      return { carried: P.carried, loaded: !!RIG.loaded, transportOpen: UI.isOpen('transport') };
    },
    transport(dest, driver = 'partner', alert = 'none', ls = false, medic) {
      if (!UI.isOpen('transport')) openTransportPanel();
      TP.dest = dest; TP.driver = driver; TP.alert = alert; TP.ls = ls; if (medic !== undefined) TP.medic = medic; confirmTransport();
      return { stage: G.call.stage, where: G.where, len: Math.round(ROUTE.length) };
    },
    // jump the rig into the hospital bay
    arrive() {
      const C = G.call, H = CITY.hospitals[C.dest];
      RIG.x = H.bay.x; RIG.z = H.bay.z; RIG.yaw = H.bay.yaw; RIG.v = 0; placeRigModel(0);
      for (let i = 0; i < 10 && C.stage !== 'hospital'; i++) frame(step, false);
      if (G.where === 'cab') { exitCab(); unloadPatient(); }
      PLAYER.x = H.door.x; PLAYER.z = H.door.z + 1; frame(step, false);
      return C.stage;
    },
    handoff(allRight = true) {
      openHandoff();
      while (UI.isOpen('handoff')) { const q = HQ.qs[HQ.i]; const want = allRight ? q.ans : q.opts.find((o) => o !== q.ans) || q.ans; const b = $$('#hoOpts button').find((x) => x.textContent === want) || $$('#hoOpts button')[0]; b.click(); }
      return G.lastCall && { grade: G.lastCall.grade, total: G.lastCall.total, outcome: G.lastCall.out.text, harms: G.lastCall.harms.map((h) => h.text), missed: G.lastCall.items.filter((i) => i.kind !== 'good').map((i) => i.text) };
    },
    // every responding unit for the current call arrives now; crews walk to their spots
    respArrive() {
      const C = G.call; if (!C || !C.units) return [];
      for (const u of C.units) if (u.state === 'enroute') { u.s = u.route.len; u.v = 0; const p = u.route.pts[u.route.pts.length - 1]; u.x = p.x; u.z = p.z; arriveUnit(u); }
      for (let i = 0; i < 300; i++) frame(step, false);
      return C.units.map((u) => ({ name: u.name, state: u.state, crew: (u.crew || []).map((p) => p.role + (p.atGoal ? '@' : '')) }));
    },
    units() { return RESP.units.filter((u) => u.state !== 'home').map((u) => ({ name: u.name, kind: u.kind, state: u.state, x: Math.round(u.x), z: Math.round(u.z), v: +u.v.toFixed(1), left: u.route ? Math.round(u.route.len - u.s) : 0 })); },
    press(a) { Input.acts.add(a); frame(step, false); },
    // posting: where Medic 12 is told to be, the board, and a jump onto the post
    post() { const m = SSM.m12, p = m && m.post; return p && { id: p.id, n: p.n, name: p.name, district: p.district, reached: m.reached, onPost: m.onPost, due: Math.round(m.deadline - G.clockT), x: Math.round(p.x), z: Math.round(p.z) }; },
    posts() { return SSM.posts.map((p) => ({ id: p.id, n: p.n, name: p.name, district: p.district, kind: p.kind, coffee: !!p.coffee, x: Math.round(p.x), z: Math.round(p.z) })); },
    board() { return SSM.units.map((u) => ({ name: u.name, state: u.state, post: u.post && u.post.id, left: u.state === 'busy' ? Math.round(u.until - G.clockT) : 0 })); },
    toPost() { const p = SSM.m12 && SSM.m12.post; if (!p) return null; if (G.where !== 'cab') { PLAYER.sp = 'city'; enterCab(); } RIG.x = p.x; RIG.z = p.z; RIG.yaw = p.yaw; RIG.v = 0; RIG.auto = null; placeRigModel(0); snapCam(); frame(step, false); frame(step, false); return RR.post(); },
    // run the clock (game seconds) through whatever activity is going, in big steps
    chores(max = 3600) { let n = 0; while (DT.act && n < max) { frame(0.25, false); n += 0.25 * TIME_SCALE * ACT_WARP; } return !DT.act; },
    tp(x, z) { if (G.where === 'cab') { RIG.x = x; RIG.z = z; placeRigModel(0); } else { PLAYER.x = x; PLAYER.z = z; } snapCam(); frame(step, false); },
    time(h) { G.clockT = h * 3600; setTimeOfDay(h); },
    hideHUD(on = true) { for (const id of ['#radio', '#toasts', '#prompt', '#dispatch', '#actBar']) $(id).style.visibility = on ? 'hidden' : ''; },
    stats() {
      const C = G.call, P = C && C.P;
      return { state: document.body.dataset.state, where: G.where, clock: fmtClock(G.clockT), stage: C && C.stage, rig: RIG && { x: Math.round(RIG.x), z: Math.round(RIG.z), v: +RIG.v.toFixed(1), siren: RIG.siren, dmg: Math.round(RIG.damage) },
        P: P && { hr: Math.round(P.v.hr), sbp: Math.round(P.v.sbp), rr: Math.round(P.v.rr), spo2: Math.round(P.v.spo2), gcs: P.v.gcs, avpu: P.avpu, arrest: P.arrest && P.arrest.rhythm, loss: Math.round(P.loss), pain: Math.round(P.v.pain), where: P.where && P.where.scene },
        cars: TRAFFIC.cars.length, harms: C ? C.harms.length : 0 };
    },
  };
  window.RR = RR;
}
boot();
