// The Time Apprentice — boot, title screen, time travel, the main loop, saving, adaptive quality and the #debug hook

const G = { state: 'title', time: 0, frame: 0, autoQ: true, noPause: false };
const clock = { last: performance.now(), fpsT: 0, fpsN: 0, fps: 60, lowT: 0, startT: 0 };

// save: which events are done, which chapter you're on in the others, and the journal pages you've found
const SAVE = {
  key: 'time-apprentice.save',
  data: { v: 1, done: {}, prog: {}, facts: {}, at: 'hub', intro: false },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  load() {
    try { const d = JSON.parse(localStorage.getItem(this.key) || 'null'); if (d && d.v === 1) { this.data = Object.assign({ done: {}, prog: {}, facts: {}, at: 'hub' }, d); return true; } } catch (e) { /* ignore */ }
    return false;
  },
  wipe() { this.data = { v: 1, done: {}, prog: {}, facts: {}, at: 'hub', intro: false }; try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } },
};

function boot() {
  if (!initRender()) { $('#nogl').hidden = false; $('#title').hidden = true; return; }
  G.autoQ = SETTINGS.quality === 'auto';
  if (!G.autoQ) applyQuality(SETTINGS.quality);
  initHand();
  HUD.init(); AU.init(); Voice.init();
  const had = SAVE.load();
  $('#bContinue').hidden = !had; $('#bNew').hidden = !had;
  $('#bStart').hidden = had;
  $('#bStart').onclick = () => { AU.resume(); startGame(false); };
  $('#bContinue').onclick = () => { AU.resume(); startGame(true); };
  $('#bNew').onclick = () => { if (confirm('Start over? Your souvenirs and journal pages will be cleared.')) { SAVE.wipe(); AU.resume(); startGame(false); } };
  const vb = $('#bVoice');
  const vtext = () => { vb.textContent = 'Read aloud: ' + (SETTINGS.voice ? 'on' : 'off'); };
  vtext(); vb.onclick = () => { HUD.setVoice(!SETTINGS.voice); vtext(); if (SETTINGS.voice) Voice.say('I will read the words out loud.'); };
  $('#mgc').addEventListener('pointerdown', (e) => { e.preventDefault(); Minigames.tapAt(e.clientX, e.clientY); });
  document.body.dataset.state = 'title';
  requestAnimationFrame(frame);
  if (DEBUG) setupDebug();
}

async function startGame(cont) {
  $('#title').hidden = true;
  G.state = 'play'; document.body.dataset.state = 'play';
  clock.startT = performance.now();
  Input.lock();
  const at = cont && SAVE.data.at !== 'hub' && Scenarios.byId[SAVE.data.at];
  if (at) await enterScenario(at, SAVE.data.prog[at.id] || 0, false);
  else enterHub();
  if (DEBUG && window.TA) window.TA.ready = true;
}
function toTitle() {
  SAVE.save(); Voice.stop();
  G.state = 'title'; document.body.dataset.state = 'title';
  Input.unlock();
  $('#title').hidden = false; $('#bStart').hidden = true; $('#bContinue').hidden = false; $('#bNew').hidden = false;
}
function enterHub() {
  HUB.chapters[0].steps = hubSteps();
  Story.begin(HUB, 0);
  HUD.where("Aunt Clio's workshop", 'Today');
}
async function enterScenario(sc, ci = 0, anim = true) {
  if (anim) await warpTo(sc.year, sc.place);
  Story.begin(sc, ci);
  if (anim) warpEnd();
}
// time travel: spin through the years on a swirl, then flash into the scene
function warpTo(year, label) {
  const el = $('#warp'), yr = el.querySelector('.yr'), to = el.querySelector('.to');
  el.hidden = false; el.classList.remove('flash');
  to.textContent = label || '';
  AU.ui('warp'); Voice.stop();
  const from = Story.sc && !Story.sc.hub ? Story.sc.year : new Date().getFullYear();
  const t0 = performance.now(), dur = DEBUG ? 1 : 2600;
  return new Promise((res) => {
    const tick = () => {
      const k = clamp((performance.now() - t0) / dur, 0, 1), e = k * k * (3 - 2 * k);
      yr.textContent = fmtYear(Math.round(lerp(from, year, e)));
      if (k < 1) requestAnimationFrame(tick); else res();
    };
    tick();
  });
}
function warpEnd() { const el = $('#warp'); el.classList.add('flash'); setTimeout(() => { el.hidden = true; el.classList.remove('flash'); }, DEBUG ? 0 : 800); }
async function travel(id) {
  const sc = Scenarios.byId[id]; if (!sc) return;
  Input.lock();
  await enterScenario(sc, SAVE.data.done[id] ? 0 : (SAVE.data.prog[id] || 0), true);
}
async function goHome() {
  Input.lock();
  await warpTo(new Date().getFullYear(), "Aunt Clio's workshop");
  SAVE.data.at = 'hub'; SAVE.save();
  enterHub();
  warpEnd();
}

// ---------- main loop ----------
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - clock.last) / 1000; clock.last = now;
  if (dt > 0.1) dt = 0.1;
  clock.fpsT += dt; clock.fpsN++;
  if (clock.fpsT >= 1) {
    clock.fps = clock.fpsN / clock.fpsT; clock.fpsT = 0; clock.fpsN = 0;
    if (DEBUG || SETTINGS.fps) $('#fps').textContent = Math.round(clock.fps) + ' fps · ' + R.renderer.info.render.calls + ' calls · ' + Math.round(R.renderer.info.render.triangles / 1000) + 'k tris';
    adaptQuality();
  }
  if (G.state === 'play') step(dt, true);
  Input.endFrame();
}
function step(dt, render) {
  G.frame++; G.time += dt;
  Input.pollPad();
  const paused = HUD.open === 'pause' || HUD.open === 'journal' || HUD.open === 'eras' || HUD.open === 'souv';
  if (Minigames.g) Minigames.update(dt);
  else HUD.key();
  if (!paused) {
    updatePlayer(dt);
    Timers.update(dt);
    Stage.update(dt, G.time);
    Story.update(dt);
    if (!HUD.open) findTarget(); else PL.target = null;
  }
  updateCamera();
  updateSun(PL.x, PL.z, G.time);
  AU.update(dt);
  HUD.update(dt);
  if (render && !Minigames.g) R.renderer.render(R.scene, R.camera);
}
function adaptQuality() {
  if (!G.autoQ || G.state !== 'play' || DEBUG) return;
  if (performance.now() - clock.startT < 8000) return;
  if (clock.fps < 28) { clock.lowT++; if (clock.lowT >= 3) { clock.lowT = 0; if (R.qname === 'high') applyQuality('med'); else if (R.qname === 'med') applyQuality('low'); } }
  else clock.lowT = 0;
}
addEventListener('beforeunload', () => SAVE.save());

// ---------- debug hook ----------
function setupDebug() {
  G.noPause = true;
  const TA = window.TA = {
    G, PL, R, Stage, Story, HUD, Minigames, Scenarios, SAVE, Journal, AU, Input,
    f: { step, placePlayer, findTarget, interact, travel, goHome, enterHub, enterScenario, makePerson, posePerson, fmtYear, hubSteps },
    // start in the workshop (fresh: wipes the save first)
    async start(o = {}) { if (o.fresh !== false) SAVE.wipe(); SETTINGS.voice = false; await startGame(false); return true; },
    // jump straight into an event's chapter, no time-travel animation
    async go(id, ci = 0) { const sc = Scenarios.byId[id]; if (!sc) return 'no scenario ' + id; await enterScenario(sc, ci, false); return Story.sc.id + ':' + Story.ci; },
    sim(sec, dt = 1 / 30) { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) { step(dt, false); Input.endFrame(); } },
    render() { updateCamera(); updateSun(PL.x, PL.z, G.time); R.renderer.render(R.scene, R.camera); },
    tp(x, z, yaw) { placePlayer(x, z, yaw == null ? PL.yaw : yaw); },
    look(yaw, pitch = 0) { PL.yaw = yaw; PL.pitch = pitch; },
    lookAt(x, y, z) { const dx = x - PL.x, dy = y - (PL.y + PL.eye), dz = z - PL.z; PL.yaw = Math.atan2(-dx, -dz); PL.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
    press(code) { Input.press(code); },
    // where the story is now
    where() { const st = Story.st; return { sc: Story.sc && Story.sc.id, ch: Story.ci, si: Story.si, kind: st ? stepKind(st) : null, goal: st && st.goal, open: HUD.open, mg: Minigames.g && Minigames.g.id, set: Story.setId }; },
    // do whatever the current step needs: finish dialogue, answer right, walk to the goal, win the minigame
    async skip() {
      if (Minigames.g) { Minigames.solve(); return 'minigame'; }
      if (HUD.open === 'souv') { $('#sHome').click(); return 'souvenir'; }
      if (HUD.open === 'eras') { HUD.close(false); return 'eras'; }
      if (HUD.open && HUD.open !== 'dlg') { HUD.close(false); return 'closed ' + HUD.open; }
      if (HUD.dlg && HUD.dlg.mode === 'ask') { const i = HUD.dlg.opts.findIndex((o) => o.ok); HUD.askPick(i); return 'ask'; }
      if (HUD.dlg) { HUD.dlg.full = true; HUD.dlgNext(); return 'say'; }
      const st = Story.st; if (!st || !('goal' in st)) return 'wait';
      const g = Story.open()[0]; if (!g) return 'wait';
      if (g.to) { const s = Stage.spots[g.to]; placePlayer(s.x, s.z, PL.yaw); return 'to ' + g.to; }
      if (g.talk) { const a = Stage.actors[g.talk]; Story.interact('actor', a); return 'talk ' + g.talk; }
      if (g.take) { Story.interact('item', Stage.items[g.take]); return 'take ' + g.take; }
      if (g.bring && !Story.carrying(g)) { const it = Object.values(Stage.items).find((q) => !q.taken && !q.gone && Story.matches(g, q)); if (!it) return 'no item for ' + g.bring; Story.interact('item', it); return 'take ' + it.id; }
      if (g.use) { Story.interact('spot', Stage.spots[g.use]); return 'use ' + g.use; }
      return 'stuck';
    },
    // keep skipping until the event is over (or n steps); returns a log
    async auto(n = 400, sec = 0.4) {
      const log = [];
      for (let i = 0; i < n; i++) {
        const r = await TA.skip(); log.push(r);
        TA.sim(sec); await new Promise((res) => setTimeout(res, r === 'wait' || r === 'souvenir' ? 30 : 0));
        if (Story.sc && Story.sc.hub && log.includes('souvenir')) break;
      }
      return log;
    },
    solve() { return Minigames.solve(); },
    facts() { const o = {}; for (const sc of Scenarios.sorted()) o[sc.id] = Journal.count(sc.id) + '/' + Object.keys(sc.facts).length; return o; },
    check() { const o = {}; for (const sc of Scenarios.list) o[sc.id] = Scenarios.check(sc); return o; },
    stats() { return { tris: R.renderer.info.render.triangles, calls: R.renderer.info.render.calls, solids: Stage.solids.length, actors: Stage.actorList().length, pos: [PL.x, PL.y, PL.z] }; },
  };
}

boot();
