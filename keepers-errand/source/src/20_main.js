// ---- main: boot, the fixed-step loop, title/pause flow and the #debug hook ----
const STEP = 1 / 60;
const Main = {
  acc: 0, last: 0, seaT: 0,
  boot() {
    if (!initRender()) { $('#nogl').hidden = false; return; }
    MAT.init(); initGeo(); SHADOW.init();
    FX.init(); Hero.build(); Pebble.build();
    Input.init(); HUD.init();
    addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !DEBUG) this.pause(); });
    this.toTitle();
    requestAnimationFrame((t) => this.frame(t));
    if (DEBUG) installDebug();
  },
  toTitle() {
    Timers.clear(); G.lockInput = 0; G.bossActive = false; G.peace = false; Dialog.open && Dialog.close();
    HUD.boss(null); HUD.letterbox(false);
    const s = readSave();
    G.weather = s && s.flags.bossDone ? 'sun' : 'storm';
    if (!G.titleBuilt) { G.save = freshSave(); G.titleBuilt = true; }
    enterArea('isle', [-74, 16, Math.PI], { quiet: true, nosave: true, title: true });
    Hero.obj.visible = false;
    const [lx, lz] = ISLE.P.lighthouse;
    camCine([lx + 26, 16, lz + 30], [lx + 2, 9, lz]);
    HUD.setState('title'); HUD.show('title');
    $('#bContinue').hidden = !s;
    HUD.menuSel = 0; HUD.menuHi();
    HUD.fade(0, 0.6);
    Audio2.music('title');
  },
  newGame() {
    clearSave();
    G.save = freshSave(); G.weather = 'storm'; G.t0 = G.t;
    HUD.show(null); HUD.setState('play');
    Hero.setMode('normal', true);
    enterArea('cottage', [-1.6, -0.2, -Math.PI / 2], { quiet: true });
    HUD.refresh();
    Story.intro();
  },
  continueGame() {
    const s = readSave(); if (!s) return this.newGame();
    G.save = s; G.weather = F('bossDone') ? 'sun' : 'storm';
    HUD.show(null); HUD.setState('play');
    Hero.setMode(s.mode || 'normal', true);
    let area = s.area;
    if (area === 'records' || area === 'lh3') area = area === 'records' ? 'office' : 'lh2';
    if (!AREAS[area]) area = 'isle';
    const a = AREAS[area];
    enterArea(area, area === s.area ? [s.x, s.z, s.ry] : [a.spawn[0], a.spawn[1], a.spawn[2]]);
    HUD.refresh();
    HUD.banner(W.area.title);
  },
  pause() { if (G.state !== 'play') return; HUD.setState('pause'); HUD.prevScreen = 'pause'; HUD.show('pause'); Audio2.sfx('menu'); },
  resume() { HUD.show(null); HUD.setState('play'); Input.consume(); },
  togglePause() { if (G.state === 'play') this.pause(); else if (G.state === 'pause') this.resume(); else if (G.state === 'map') HUD.closeMap(); },
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000); this.last = now;
    Input.poll();
    this.handleGlobal();
    if (!(DEBUG && G.manual)) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 5) { this.step(STEP); this.acc -= STEP; n++; }
      if (n === 5) this.acc = 0;
    }
    this.draw(dt);
  },
  handleGlobal() {
    const I = Input.pressed;
    if (G.state === 'play' && !G.lockInput) { if (I.pause) { this.pause(); Input.consume(); } else if (I.map) { HUD.openMap(); Input.consume(); } }
    else if (G.state === 'pause') { if (I.pause || I.back) { this.resume(); } else HUD.menuInput(); Input.consume(); }
    else if (G.state === 'map') { if (I.map || I.pause || I.back || I.ok) HUD.closeMap(); else HUD.drawMap(); Input.consume(); }
    else if (G.state === 'title' || G.state === 'end') {
      if ((I.back || I.pause) && (HUD.screen === 'help' || HUD.screen === 'opts')) HUD.show(HUD.prevScreen || 'title');
      else HUD.menuInput();
      Input.consume();
    }
  },
  step(dt) {
    G.t += dt;
    Timers.update();
    const s = G.state;
    if (s === 'play' || s === 'dialog' || s === 'cutscene') {
      if (s === 'play') G.save.played += dt;
      Dialog.update(dt);
      if (W.area) {
        Hero.update(dt);
        Actors.update(dt);
        Pebble.update(dt);
        Story.update(dt);
        if (s === 'play') checkDoors();
      }
    } else if (s === 'title' || s === 'end') {
      if (W.area) { Story.update(dt); Actors.update(dt); }
    }
    FX.update(dt);
    Input.consume();
  },
  draw(dt) {
    if (document.body.dataset.state !== G.state) document.body.dataset.state = G.state;
    if (!W.area) return;
    updateCamera(dt, Hero);
    INT.cutaway(W.area);
    Fader.update(dt, Hero);
    FX.frame(dt);
    this.seaT += dt;
    if (W.area.kind === 'outdoor' && (this.seaFrame = (this.seaFrame || 0) + 1) % 2 === 0) OUT.animateSea(this.seaT);
    // interaction prompt
    if (G.state === 'play' && !G.lockInput && Hero.state === 'free') { const it = nearestInteract(); HUD.prompt(it ? it.label : null); }
    else HUD.prompt(null);
    renderFrame(dt);
  },
};

// enterArea is shared; the title screen skips populating actors
const _enterArea = enterArea;
enterArea = function (id, at, opt = {}) {
  const a = AREAS[id];
  if (Pebble.obj) Pebble.reset();
  if (opt.title && a) { const pop = a.populate, en = a.onEnter; a.populate = null; a.onEnter = null; try { _enterArea(id, at, opt); } finally { a.populate = pop; a.onEnter = en; } OUT.setWeather(); }
  else _enterArea(id, at, opt);
  if (!opt.title) { G.checkpoint = [id, Hero.x, Hero.z, Hero.ry]; HUD.goal(); }
};

// ---------- the #debug hook: window.KE ----------
function installDebug() {
  G.noSave = false;
  const KE = {
    ready: true,
    async start(o = {}) {
      Audio2.mute(true); window.__mute = true;
      if (!o.keepSave) clearSave();
      Timers.clear(); Dialog.open && Dialog.close(); G.lockInput = 0; G.peace = false; G.bossActive = false;
      G.save = freshSave();
      Object.assign(G.save.flags, o.flags || {});
      Object.assign(G.save.items, o.items || {});
      if (o.clams) G.save.clams = o.clams;
      G.weather = G.save.flags.bossDone ? 'sun' : 'storm';
      HUD.show(null); HUD.setState('play');
      Hero.setMode(o.mode || 'normal', true);
      if (o.intro) { Main.newGame(); }
      else enterArea(o.area || 'isle', o.at || null, { quiet: true });
      Hero.obj.visible = true;
      HUD.refresh();
      return this.state();
    },
    sim(sec) { const n = Math.round(sec / STEP); for (let i = 0; i < n; i++) { Input.poll(); Main.handleGlobal(); Main.step(STEP); } return this.state(); },
    render() { CAM.snap = true; updateCamera(STEP, Hero); INT.cutaway(W.area); Fader.update(1, Hero); if (W.area.kind === 'outdoor') OUT.animateSea(Main.seaT); FX.frame(STEP); renderFrame(STEP); return true; },
    tp(area, x, z, ry = 0) { if (area !== G.area) enterArea(area, [x, z, ry], { quiet: true }); else Hero.place(x, z, ry); CAM.snap = true; return this.state(); },
    give(k, n = 1) { if (k === 'clams') { G.save.clams += n; HUD.clams(); } else { giveItem(k, n); HUD.items(); } },
    flag(k, v = true) { setFlag(k, v); HUD.goal(); },
    mode(m) { Hero.setMode(m, true); },
    press(a) { Input.tap(a); },
    // walk toward a point (world coords of the current area) with the hero's own controller
    walkTo(x, z, maxSec = 20, near = 0.5) {
      let t = 0; const area = G.area;
      while (t < maxSec) {
        const dx = x - Hero.x, dz = z - Hero.z, d = Math.hypot(dx, dz);
        if (d < near || G.area !== area || G.lockInput) break;
        G.autoMove = [dx / d, dz / d];
        this.sim(STEP * 6); t += STEP * 6;
      }
      G.autoMove = null; this.sim(STEP * 2);
      return Math.hypot(x - Hero.x, z - Hero.z);
    },
    // jump onto a ledge or pillar whose top is near (x, z): choose the run speed that lands on it
    jumpTo(x, z) {
      const top = groundAt(x, z, 50, 0.1);
      const dx = x - Hero.x, dz = z - Hero.z, d = Math.hypot(dx, dz);
      const v0 = 7.6, g = 22, dh = top - Hero.y;
      const tAir = (v0 + Math.sqrt(Math.max(0, v0 * v0 - 2 * g * dh))) / g;
      const im = clamp(d / tAir / MODE_INFO.sporty.speed * 1.12, 0.15, 1);
      Hero.ry = Math.atan2(dx, dz);
      G.autoMove = [dx / d * im, dz / d * im]; this.sim(STEP * 3); Input.tap('action');
      let t = 0; while (t < 2) { this.sim(STEP * 2); t += STEP * 2; if (Hero.onGround && t > 0.2) break; }
      G.autoMove = null; this.sim(0.25);
      return { x: Hero.x, y: Hero.y, z: Hero.z, ground: Hero.onGround };
    },
    face(x, z) { Hero.ry = Math.atan2(x - Hero.x, z - Hero.z); },
    use() { Input.tap('use'); this.sim(STEP * 3); },
    // talk to someone and click through everything they say (choices take option 0 unless given)
    async talk(id, choice = 0) {
      const e = W.ents.find((q) => q.id === id && !q.dead); if (!e) return 'no ' + id;
      Hero.mode !== 'aggressive' || Hero.setMode('normal', true);
      const p = Story.talk(e);
      await this.finishDialog(choice);
      await p;
      return this.state();
    },
    // click through dialog until none has been open for `idle` seconds of game time
    async finishDialog(choice = 0, idle = 1.0, max = 400) {
      const said = [];
      let quiet = 0;
      for (let i = 0; i < max; i++) {
        await Promise.resolve();
        if (!Dialog.open) { this.sim(0.05); quiet += 0.05; await Promise.resolve(); if (quiet >= idle && !Dialog.open && !G.lockInput) break; continue; }
        quiet = 0;
        if (Dialog.choice) { said.push('[choice] ' + Dialog.cur.text); Dialog.sel = choice; Input.tap('ok'); }
        else if (Dialog.cur) { if (Dialog.shown >= Dialog.cur.text.length) { said.push((Dialog.cur.who ? Dialog.cur.who + ': ' : '') + Dialog.cur.text); Input.tap('ok'); } else Dialog.shown = Dialog.cur.text.length; }
        this.sim(0.05);
      }
      return said;
    },
    dialogText() { return Dialog.open && Dialog.cur ? Dialog.cur.text : null; },
    ents() { return W.ents.filter((e) => !e.dead).map((e) => ({ kind: e.kind, id: e.id, sub: e.sub, state: e.state, x: +e.x.toFixed(2), z: +e.z.toFixed(2), hp: e.hp })); },
    state() {
      return { area: G.area, g: G.state, x: +Hero.x.toFixed(2), y: +Hero.y.toFixed(2), z: +Hero.z.toFixed(2), hs: Hero.state, life: G.save.life, clams: G.save.clams, mode: Hero.mode,
        flags: Object.keys(G.save.flags).filter((k) => G.save.flags[k]), items: Object.keys(G.save.items).filter((k) => G.save.items[k] > 0), dialog: this.dialogText(), lock: G.lockInput };
    },
    god(v = true) { G.god = v; },
    peace(v = true) { G.peace = v; },
    mute() { Audio2.mute(true); },
    f: { W, Hero, Story, Boss, Actors, ISLE, OUT, AREAS, Dialog, HUD, Input, CAM, R, G, Pebble, FX, Timers, Main, nearestInteract, groundAt },
  };
  window.KE = KE;
}

Main.boot();
