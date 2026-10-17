// The Time Apprentice — the scenario registry and the story runner.
//
// Every historical event is one file that calls Scenarios.add({...}). Nothing else in the engine needs to change:
// the time dial, the journal, the souvenir shelf and the save file all read from this registry.
// See ADDING_EVENTS.md for the full format. In short, a scenario has
//   id, title, place, when, year, color, blurb, role, souvenir: { name, text, build(gb) }, note,
//   cast: { id: { name, title, look, voice, real, about, lines: [...] } },
//   facts: { id: { t: 'title', x: 'text' } },
//   sets: { id: { env, amb, surf, build(S) } },
//   chapters: [ { title, set, start: [x, z, yaw], setup(S), steps: [ ... ] } ]
// and a step is one of
//   { say: who, text | lines, fact? }        { chat: [[who, text], ...], fact? }
//   { ask: who, q, a: [[text, right?, reply], ...], fact? }
//   { goal: text, to | talk | take | use: id, each?: [{ talk | to | use | take, say?, fact? }] }
//   { play: minigameId, ...params, fact? }   { fact: id }   { banner: text, sub }
//   { look: id }   { scene: setId, at: [x, z, yaw] }   { do: (S) => promise?, wait? }   { wait: seconds }

const Scenarios = {
  list: [], byId: {},
  add(sc) {
    sc.cast = sc.cast || {}; sc.facts = sc.facts || {}; sc.sets = sc.sets || {};
    this.list.push(sc); this.byId[sc.id] = sc;
    if (DEBUG) { const p = this.check(sc); if (p.length) console.warn('Scenario ' + sc.id + ':\n  ' + p.join('\n  ')); }
    return sc;
  },
  sorted() { return this.list.filter((s) => !s.hub).sort((a, b) => a.year - b.year); },
  // problems a scenario author would want to hear about: unknown speakers, facts, sets and minigames
  check(sc) {
    const out = [], who = (w, where) => { if (w && w !== 'you' && w !== 'narrator' && !sc.cast[w] && !(sc.extraSpeakers || []).includes(w)) out.push(where + ': unknown speaker "' + w + '"'); };
    const fact = (f, where) => { if (f && !sc.facts[f]) out.push(where + ': unknown fact "' + f + '"'); };
    for (const k of ['id', 'title', 'place', 'when', 'year', 'chapters']) if (sc[k] == null) out.push('missing ' + k);
    (sc.chapters || []).forEach((ch, ci) => {
      if (!sc.sets[ch.set]) out.push('chapter ' + ci + ': unknown set "' + ch.set + '"');
      (ch.steps || []).forEach((st, si) => {
        const w = 'chapter ' + ci + ' step ' + si, k = stepKind(st);
        if (!k) out.push(w + ': no step type');
        if (k === 'say' || k === 'ask') who(st[k], w);
        if (k === 'chat') for (const l of st.chat) who(l[0], w);
        if (k === 'play' && !Minigames.defs[st.play]) out.push(w + ': unknown minigame "' + st.play + '"');
        if (k === 'scene' && !sc.sets[st.scene]) out.push(w + ': unknown set "' + st.scene + '"');
        fact(st.fact, w);
        if (st.each) for (const e of st.each) { fact(e.fact, w); if (e.say) who(e.say[0], w); }
        if (st.a) for (const a of st.a) if (a.length < 3 && !a[1]) out.push(w + ': wrong answer without a reply');
      });
    });
    const used = new Set();
    for (const ch of sc.chapters || []) for (const st of ch.steps || []) { if (st.fact) used.add(st.fact); if (st.each) for (const e of st.each) if (e.fact) used.add(e.fact); }
    for (const c of Object.values(sc.cast)) for (const l of c.lines || []) if (typeof l === 'object' && l.fact) used.add(l.fact);
    for (const f in sc.facts) if (!used.has(f)) out.push('fact "' + f + '" is never unlocked');
    return out;
  },
};
const STEP_KINDS = ['goal', 'say', 'chat', 'ask', 'play', 'scene', 'do', 'fact', 'banner', 'look', 'wait'];
const stepKind = (st) => STEP_KINDS.find((k) => k in st);

// line helpers: 'text' or ['text', 'text'] → [{ who, text }]
function linesOf(who, t) { return (Array.isArray(t) ? t : [t]).map((x) => ({ who, text: x })); }

const Story = {
  sc: null, ci: 0, si: -1, st: null, run: 0, setId: null, goalLeft: null, chatterI: {},
  // the stage API handed to scenario build/setup/do functions
  get S() { return Stage; },
  // load a set into the stage
  loadSet(sc, setId) {
    const set = sc.sets[setId];
    Stage.clear(); Stage.sc = sc; Stage.id = setId;
    Timers.clear();
    rseed(sc.id + ':' + setId);
    setEnv(set.env);
    set.build(Stage);
    Stage.finish();
    AU.setAmb(set.amb || null); AU.surf = set.surf || 'sand';
    this.setId = setId;
    try { R.renderer.compile(R.scene, R.camera); } catch (e) { /* ignore */ }
  },
  begin(sc, ci = 0) {
    this.sc = sc; this.chatterI = {};
    this.startChapter(ci);
  },
  startChapter(ci) {
    const sc = this.sc, ch = sc.chapters[ci];
    this.run++;
    this.ci = ci; this.si = -1; this.st = null; this.goalLeft = null;
    if (PL.carry) { HAND.remove(PL.carry.obj); PL.carry = null; HUD.carry(null); }
    // anything left open from a step that was cut short (a restart, or a jump from the debug hook)
    if (HUD.dlg) { HUD.dlg = null; $('#dlg').hidden = true; Voice.stop(); }
    if (Minigames.g) { Minigames.g = null; $('#mg').hidden = true; }
    if (HUD.open === 'dlg' || HUD.open === 'mg') HUD.modal(null);
    PL.cut = null; PL.frozen = false; document.body.classList.remove('tv');
    this.loadSet(sc, ch.set);
    const s = ch.start || sc.sets[ch.set].start || [0, 0, 0];
    placePlayer(s[0], s[1], typeof s[2] === 'number' ? s[2] : 0);
    if (ch.setup) ch.setup(Stage);
    if (typeof s[2] === 'string') faceThing(s[2]);
    if (!sc.hub) { SAVE.data.prog[sc.id] = ci; SAVE.data.at = sc.id; SAVE.save(); }
    HUD.goal(null); HUD.mark(null);
    HUD.where(sc.place, sc.when);
    if (!sc.hub && !ch.quiet) HUD.banner(sc.chapters.length > 1 ? 'Chapter ' + (ci + 1) : '', ch.title, ci === 0 ? sc.when : '');
    this.next();
  },
  restartChapter() { if (this.sc) this.startChapter(this.ci); },
  next() {
    const sc = this.sc, ch = sc.chapters[this.ci];
    this.si++;
    if (this.si >= ch.steps.length) {
      if (this.ci + 1 < sc.chapters.length) this.startChapter(this.ci + 1);
      else this.finish();
      return;
    }
    const st = this.st = ch.steps[this.si];
    const kind = stepKind(st), run = this.run;
    const done = () => { if (run !== this.run || this.st !== st) return; if (st.fact && kind !== 'fact') this.fact(st.fact); this.next(); };
    STEP[kind](st, done, this);
  },
  fact(id) { if (this.sc && !this.sc.hub) Journal.unlock(this.sc.id, id); },
  // speaker lookups, so dialogue can name people who aren't on stage (radio voices, the narrator)
  line(who, text, extra) {
    const c = this.sc.cast[who] || {};
    return Object.assign({ who, text, name: who === 'you' ? 'You' : who === 'narrator' ? '' : c.name, title: c.title, voice: c.voice, radio: c.radio }, extra || {});
  },
  // the parts of the current goal still open
  open() { const st = this.st; if (!st || !('goal' in st) || st.done) return []; return (this.goalLeft || [st]).filter((g) => !g.done); },
  matches(g, it) { return g.bring && (it.id === g.bring || it.kind === g.bring); },
  carrying(g) { return PL.carry && this.matches(g, PL.carry); },
  // does the current goal want this thing? (used to highlight and pick targets)
  wants(kind, id) {
    return this.open().some((g) => {
      if (kind === 'actor') return g.talk === id;
      if (kind === 'item') { const it = Stage.items[id]; return g.take === id || (!!it && !PL.carry && this.matches(g, it)); }
      if (kind === 'spot') return g.use === id && (!g.bring || this.carrying(g));
      return false;
    });
  },
  interact(kind, ref) {
    if (HUD.open) return false;
    const subs = this.open();
    if (kind === 'item') {
      const g = subs.find((q) => q.take === ref.id) || (!PL.carry && subs.find((q) => this.matches(q, ref)));
      if (!g) return false;
      carryItem(ref);
      if (g.take === ref.id) this.subDone(g); else this.goalShow();
      return true;
    }
    if (kind === 'spot') {
      const g = subs.find((q) => q.use === ref.id && (!q.bring || this.carrying(q)));
      if (!g) {
        const need = subs.find((q) => q.use === ref.id && q.bring);
        if (need) { HUD.toast('Not yet', need.hint || 'You need to bring something here first.', 'hint'); return true; }
        return false;
      }
      if (g.bring) { const it = dropItem(ref.place || ref); if (ref.onDrop) ref.onDrop(it, ref); if (g.onDrop) g.onDrop(it, ref, Stage); }
      this.subDone(g);
      return true;
    }
    if (kind === 'actor') {
      const g = subs.find((q) => q.talk === ref.id);
      if (!g) return false;
      this.subDone(g);
      return true;
    }
    return false;
  },
  subDone(g) {
    const st = this.st, run = this.run;
    if (g.done) return; g.done = true;
    const after = () => {
      if (run !== this.run || this.st !== st) return;
      if (g.fact && g !== st) this.fact(g.fact);
      if (g.then) g.then(Stage);
      if (this.goalLeft) {
        this.goalLeft = this.goalLeft.filter((q) => !q.done);
        if (this.goalLeft.length) { this.goalShow(true); AU.ui('goal'); return; }
      }
      st.done = true;
      HUD.goalDone(); HUD.mark(null);
      this.goalEnd();
    };
    if (g.say && g !== st) HUD.say([this.line(g.say[0], g.say[1])].concat(g.say[2] ? [this.line(g.say[0], g.say[2])] : []), after);
    else after();
  },
  goalEnd() {
    const st = this.st, run = this.run;
    Timers.wait(0.35).then(() => { if (run === this.run && this.st === st) { if (st.fact) this.fact(st.fact); this.next(); } });
  },
  goalShow(text = false) {
    const st = this.st, ch = this.sc.chapters[this.ci];
    const left = this.goalLeft;
    if (text) HUD.goal(ch.title, st.goal + (left && st.each ? ` *(${st.each.length - left.length} of ${st.each.length})*` : ''));
    // marker on the nearest thing still wanted
    const tgt = this.open().map((g) => this.targetPos(g)).filter(Boolean).sort((a, b) => dist2(a[0], a[2], PL.x, PL.z) - dist2(b[0], b[2], PL.x, PL.z))[0];
    HUD.mark(tgt || null);
  },
  targetPos(g) {
    if (g.talk) { const a = Stage.actors[g.talk]; return a ? [a.x, a.headY + 0.45, a.z] : null; }
    if (g.take) { const it = Stage.items[g.take]; if (!it || it.taken) return null; const p = it.obj.getWorldPosition(new V3()); return [p.x, p.y + 0.6, p.z]; }
    if (g.bring && !this.carrying(g)) {
      const its = Object.values(Stage.items).filter((it) => !it.taken && !it.gone && this.matches(g, it));
      const p = its.map((it) => it.obj.getWorldPosition(new V3())).sort((a, b) => dist2(a.x, a.z, PL.x, PL.z) - dist2(b.x, b.z, PL.x, PL.z))[0];
      return p ? [p.x, p.y + 0.6, p.z] : null;
    }
    const s = Stage.spots[g.to || g.use]; return s ? [s.x, s.y + (s.dy != null ? s.dy : 1) + 0.6, s.z] : null;
  },
  update(dt) {
    const st = this.st; if (!st || !('goal' in st)) return;
    // "to" goals complete when you arrive
    for (const g of this.goalLeft || [st]) {
      if (!g.to || g.done) continue;
      const s = Stage.spots[g.to]; if (!s) continue;
      if (dist2(s.x, s.z, PL.x, PL.z) < s.r * s.r) this.subDone(g);
    }
    // keep the marker on moving people
    if (G.frame % 10 === 0 && this.st === st && !st.done) this.goalShow(false);
  },
  // talking to someone who isn't part of the goal: their own lines, in turn
  chatter(a) {
    const c = (this.sc && this.sc.cast[a.id]) || a.def || {};
    const lines = c.lines || (a.def && a.def.lines);
    if (!lines || !lines.length) { HUD.say([{ who: a.id, name: a.name, title: a.title, text: fpick(['Busy, busy! Talk later.', 'Hello there!', 'Mind your step, young one.']) }]); return; }
    const i = (this.chatterI[a.id || a.name] || 0) % lines.length; this.chatterI[a.id || a.name] = i + 1;
    const l = lines[i], text = typeof l === 'string' ? l : l.t;
    HUD.say([{ who: a.id, name: a.name, title: a.title, text, voice: c.voice }], () => { if (typeof l === 'object' && l.fact) this.fact(l.fact); });
  },
  finish() {
    const sc = this.sc;
    this.st = null; HUD.goal(null); HUD.mark(null);
    if (sc.hub) return;
    SAVE.data.done[sc.id] = true; delete SAVE.data.prog[sc.id]; SAVE.data.at = 'hub'; SAVE.data.last = sc.id; SAVE.save();
    HUD.openSouvenir(sc, () => goHome());
  },
};

const STEP = {
  say(st, done, S) { HUD.say(linesOf(st.say, st.text || st.lines).map((l) => S.line(l.who, l.text)), done); },
  chat(st, done, S) { HUD.say(st.chat.map((l) => S.line(l[0], l[1], l[2])), done); },
  ask(st, done, S) {
    const opts = shuffle(st.a.map((a) => ({ t: a[0], ok: !!a[1], reply: a[2] })));
    HUD.ask(S.line(st.ask, st.q), opts, () => done());
  },
  goal(st, done, S) {
    for (const q of st.each || []) q.done = false;
    st.done = false;
    S.goalLeft = st.each ? st.each.slice() : null;
    S.goalShow(true);
    AU.ui('click');
    // a "to" goal you're already standing at completes on the next update
  },
  play(st, done) { Minigames.open(st.play, st, done); },
  scene(st, done, S) {
    fadeOut(() => {
      S.loadSet(S.sc, st.scene);
      const a = st.at || S.sc.sets[st.scene].start || [0, 0, 0];
      placePlayer(a[0], a[1], typeof a[2] === 'number' ? a[2] : 0);
      if (st.setup) st.setup(Stage);
      if (typeof a[2] === 'string') faceThing(a[2]);
      fadeIn(); done();
    });
  },
  do(st, done) {
    let r;
    try { r = st.do(Stage, Story); } catch (e) { console.error(e); }
    const w = st.wait != null ? wait(st.wait) : null;
    Promise.all([r && r.then ? r : null, w]).then(done);
  },
  fact(st, done, S) { S.fact(st.fact); done(); },
  banner(st, done) { HUD.banner(st.small || '', st.banner, st.sub || '', st.sec || 4); done(); },
  look(st, done) {
    const a = Stage.actors[st.look], s = Stage.spots[st.look];
    const p = a ? [a.x, a.headY - 0.1, a.z] : s ? [s.x, s.y + (s.dy != null ? s.dy : 1), s.z] : st.at;
    if (!p) { done(); return; }
    turnTo(p[0], p[1], p[2], st.sec || 0.8).then(done);
  },
  wait(st, done) { wait(st.wait).then(done); },
};

// point the view at an actor or spot straight away
function faceThing(id) {
  const a = Stage.actors[id], sp = Stage.spots[id];
  const p = a ? [a.x, a.headY - 0.1, a.z] : sp ? [sp.x, sp.y + 1, sp.z] : null;
  if (!p) return;
  const dx = p[0] - PL.x, dz = p[2] - PL.z;
  PL.yaw = Math.atan2(-dx, -dz); PL.pitch = clamp(Math.atan2(p[1] - PL.y - PL.eye, Math.hypot(dx, dz)), -0.5, 0.5);
}
// fades for set changes
function fadeOut(cb) { const f = $('#fade'); f.classList.add('on'); setTimeout(cb, DEBUG ? 0 : 450); }
function fadeIn() { setTimeout(() => $('#fade').classList.remove('on'), DEBUG ? 0 : 100); }
