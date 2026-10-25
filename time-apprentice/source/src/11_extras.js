// The Time Apprentice — extras an event can opt into: a photo album (shots to find and take), odd jobs (optional little
// quests from the people in a set) and the Chinese font for signs.
//
// sc.album = { title, text, shots: { id: { t: 'what to photograph', x: 'the caption once you have it' } } }
//   In a set, S.shot(id, x, z, { dy, reach, when }) marks where the shot is taken from (see Stage.shot).
// sc.jobs = { id: { t: 'title', giver: castId, set: setId, fact, intro: [[who, text], ...], busy: 'what the giver says
//   while you are on the job', steps: [step, ...], end: [[who, text], ...] } }, where a step is
//   { goal: 'text for the HUD', talk: castId, say?: [[who, text], ...], bring?: itemIdOrKind }   talk (with something)
//   { goal, use: spotId, say?, bring? }                                                            use a spot
//   { play: minigameId, ...params }                                                                a minigame, right away
//   Any step may have then(S) to change the set. Job items are ordinary S.item()s; they can be picked up while a job
//   wants them. Jobs only run in their own set and never in the way of the main story.

// ---------- the photo album ----------
// Which shots you have is in the save (SAVE.data.shots); the little pictures live under their own key so that the
// save itself stays small.
const Album = {
  key: 'time-apprentice.album', pics: {},
  load() { try { this.pics = JSON.parse(localStorage.getItem(this.key) || '{}') || {}; } catch (e) { this.pics = {}; } },
  store() { try { localStorage.setItem(this.key, JSON.stringify(this.pics)); } catch (e) { /* full: keep them for this visit */ } },
  wipe() { this.pics = {}; try { localStorage.removeItem(this.key); } catch (e) { /* ignore */ } },
  got(scId) { return SAVE.data.shots[scId] || (SAVE.data.shots[scId] = []); },
  has(scId, id) { return this.got(scId).includes(id); },
  count(scId) { const sc = Scenarios.byId[scId]; return sc && sc.album ? this.got(scId).filter((s) => sc.album.shots[s]).length : 0; },
  total(scId) { const sc = Scenarios.byId[scId]; return sc && sc.album ? Object.keys(sc.album.shots).length : 0; },
  // render the view now and keep a small copy of it (the drawing buffer is only readable straight after a render)
  grab() {
    try {
      updateCamera(); HAND.visible = false;
      R.renderer.render(R.scene, R.camera); HAND.visible = true;
      const src = R.renderer.domElement, cv = document.createElement('canvas'); cv.width = 240; cv.height = 135;
      const c = cv.getContext('2d'), k = Math.max(240 / src.width, 135 / src.height), w = src.width * k, h = src.height * k;
      c.drawImage(src, (240 - w) / 2, (135 - h) / 2, w, h);
      return cv.toDataURL('image/jpeg', 0.72);
    } catch (e) { HAND.visible = true; return null; }
  },
  snap(scId, id) {
    const sc = Scenarios.byId[scId], def = sc && sc.album && sc.album.shots[id]; if (!def) return false;
    const pic = this.grab();
    AU.ui('shutter'); const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    if (pic) { this.pics[scId + ':' + id] = pic; this.store(); }
    const g = this.got(scId), fresh = !g.includes(id);
    if (fresh) { g.push(id); SAVE.save(); }
    HUD.toast(fresh ? (sc.album.title || 'Photo album') + ` (${this.count(scId)} of ${this.total(scId)})` : 'Another photo', def.t);
    if (fresh) AU.ui('fact');
    return true;
  },
  // the album section of the journal page
  html(sc) {
    if (!sc.album) return '';
    const got = this.got(sc.id);
    const tiles = Object.entries(sc.album.shots).map(([id, s]) => {
      const pic = this.pics[sc.id + ':' + id];
      if (!got.includes(id)) return `<div class="ash lock"><div class="aph">?</div><b>${esc(s.t)}</b></div>`;
      return `<div class="ash"><div class="aph">${pic ? `<img src="${pic}" alt="">` : '📷'}</div><b>${esc(s.t)}</b>${s.x ? `<span>${rich(s.x)}</span>` : ''}</div>`;
    }).join('');
    return `<h3>${esc(sc.album.title || 'Photo album')} · ${this.count(sc.id)} of ${this.total(sc.id)}</h3>${sc.album.text ? `<p class="atx">${rich(sc.album.text)}</p>` : ''}<div class="album">${tiles}</div>`;
  },
};

// ---------- odd jobs ----------
const Jobs = {
  // job state in the save: undefined (not offered yet), a step index, or 'done'
  st(id) { const sc = Story.sc; if (!sc || sc.hub) return undefined; const m = SAVE.data.jobs[sc.id] || (SAVE.data.jobs[sc.id] = {}); return m[id]; },
  set(id, v) { const sc = Story.sc; (SAVE.data.jobs[sc.id] || (SAVE.data.jobs[sc.id] = {}))[id] = v; SAVE.save(); },
  list() { const sc = Story.sc; return sc && sc.jobs && !sc.hub ? Object.entries(sc.jobs).filter(([, j]) => !j.set || j.set === Story.setId) : []; },
  // the jobs under way here, with their current step
  active() { return this.list().filter(([id]) => typeof this.st(id) === 'number').map(([id, j]) => ({ id, j, step: j.steps[this.st(id)] })).filter((a) => a.step); },
  matches(step, it) { return step.bring && (it.id === step.bring || it.kind === step.bring); },
  carrying(step) { return PL.carry && this.matches(step, PL.carry); },
  // does a job want this thing? (for targeting: items you may pick up, spots you may use)
  wants(kind, id) {
    if (HUD.open) return false;
    return this.active().some(({ step }) => {
      if (kind === 'item') { const it = Stage.items[id]; return !!it && !PL.carry && this.matches(step, it); }
      if (kind === 'spot') return step.use === id && (!step.bring || this.carrying(step));
      return false;
    });
  },
  // E on something: returns true if a job used it
  interact(kind, ref) {
    if (HUD.open || !Story.sc || Story.sc.hub) return false;
    const act = this.active();
    if (kind === 'item') {
      const a = act.find(({ step }) => !PL.carry && this.matches(step, ref)); if (!a) return false;
      carryItem(ref); this.show(a.id); return true;
    }
    if (kind === 'spot') {
      const a = act.find(({ step }) => step.use === ref.id); if (!a) return false;
      if (a.step.bring && !this.carrying(a.step)) { HUD.toast('Not yet', a.step.hint || 'You need to bring something here first.', 'hint'); return true; }
      if (a.step.bring) { const it = dropItem(ref.place || ref); if (ref.onDrop) ref.onDrop(it, ref); }
      this.advance(a.id); return true;
    }
    if (kind === 'actor') {
      const a = act.find(({ step }) => step.talk === ref.id && (!step.bring || this.carrying(step)));
      if (a) { if (a.step.bring) { const it = dropItem(null); if (it) it.obj.visible = false; } this.advance(a.id); return true; }
      // a job giver: offer the job, or remind you what it was
      for (const [id, j] of this.list()) {
        if (j.giver !== ref.id) continue;
        const s = this.st(id);
        if (s === undefined) { this.offer(id, j); return true; }
        if (typeof s === 'number') { const step = j.steps[s]; HUD.say([Story.line(j.giver, j.busy || (step && step.goal ? 'Remember: ' + step.goal.charAt(0).toLowerCase() + step.goal.slice(1) + '.' : 'Thank you for helping!'))]); return true; }
      }
    }
    return false;
  },
  offer(id, j) {
    HUD.say((j.intro || []).map((l) => Story.line(l[0], l[1])), () => {
      this.set(id, 0); AU.ui('goal'); HUD.toast('New odd job', j.t, 'job');
      this.begin(id);
    });
  },
  // a step just became current: minigames start straight away, other steps wait for you
  begin(id) {
    const j = Story.sc.jobs[id], s = this.st(id), step = j.steps[s], run = Story.run;
    this.show(id);
    if (step && step.play) Minigames.open(step.play, step, () => { if (run === Story.run) this.advance(id); });
  },
  advance(id) {
    const j = Story.sc.jobs[id], s = this.st(id), step = j.steps[s], run = Story.run;
    const next = () => {
      if (run !== Story.run) return;
      if (step.then) step.then(Stage);
      if (s + 1 < j.steps.length) { this.set(id, s + 1); AU.ui('goal'); this.begin(id); return; }
      const fin = () => {
        if (run !== Story.run) return;
        this.set(id, 'done'); this.show();
        HUD.toast('Odd job done!', j.t, 'job'); AU.ui('win');
        if (j.fact) Story.fact(j.fact);
        if (j.onDone) j.onDone(Stage);
      };
      if (j.end && j.end.length) HUD.say(j.end.map((l) => Story.line(l[0], l[1])), fin); else fin();
    };
    if (step.say && step.say.length) HUD.say(step.say.map((l) => Story.line(l[0], l[1])), next); else next();
  },
  // the small job line under the goal panel: the job you touched last, or any job under way here
  last: null,
  show(id) {
    if (id) this.last = id;
    const el = $('#job'); if (!el) return;
    const act = this.active(), a = act.find((q) => q.id === this.last) || act[0];
    if (!a || !a.step.goal) { el.classList.remove('on'); return; }
    el.innerHTML = '<small>Odd job · ' + esc(a.j.t) + (act.length > 1 ? ` (+${act.length - 1} more)` : '') + '</small>' + rich(a.step.goal);
    el.classList.add('on');
  },
  // a floating "!" over everyone in this set who has a job to offer
  markers() {
    for (const [id, j] of this.list()) {
      const a = Stage.actors[j.giver]; if (!a) continue;
      const o = Stage.obj(() => {}, 0, 0, 0, 0, { cast: false, glow: (gg) => { gg.cbox(0, 0.1, 0, 0.08, 0.26, 0.08, 0x3fe0c8); gg.cbox(0, -0.12, 0, 0.08, 0.08, 0.08, 0x3fe0c8); } });
      Stage.tick((dt, t) => { o.visible = this.st(id) === undefined && a.g.visible; if (o.visible) { o.position.set(a.x, a.headY + 0.6 + Math.sin(t * 3) * 0.06, a.z); o.rotation.y = t * 1.5; } });
    }
  },
  done(scId) { const m = SAVE.data.jobs[scId] || {}; return Object.keys(m).filter((k) => m[k] === 'done').length; },
  // the jobs section of the journal page
  html(sc) {
    if (!sc.jobs) return '';
    const m = SAVE.data.jobs[sc.id] || {}, list = Object.entries(sc.jobs);
    return `<h3>Odd jobs · ${this.done(sc.id)} of ${list.length}</h3><div class="jobs">` + list.map(([id, j]) => {
      const s = m[id], st = s === 'done' ? 'done' : typeof s === 'number' ? 'now' : 'new';
      const giver = sc.cast[j.giver] || {};
      return `<div class="jb ${st}"><b>${st === 'done' ? '✓ ' : ''}${esc(j.t)}</b><span>${st === 'new' ? 'Ask ' + esc(giver.name || 'around') + (giver.title ? ', ' + esc(giver.title) : '') : st === 'now' ? rich((j.steps[s] && j.steps[s].goal) || 'Under way') : 'Done'}</span></div>`;
    }).join('') + '</div>';
  },
  // for tests: finish a job from wherever it is (offers it first)
  async auto(id) {
    const j = Story.sc.jobs[id];
    for (let k = 0; k < 40 && this.st(id) !== 'done'; k++) {
      if (Minigames.g) { Minigames.solve(); continue; }
      if (HUD.dlg) { HUD.dlg.full = true; HUD.dlgNext(); continue; }
      const s = this.st(id);
      if (s === undefined) { this.interact('actor', Stage.actors[j.giver]); continue; }
      const step = j.steps[s];
      if (step.bring && !this.carrying(step)) { const it = Object.values(Stage.items).find((q) => !q.taken && !q.gone && this.matches(step, q)); if (!it) return 'no item ' + step.bring; this.interact('item', it); continue; }
      if (step.talk) this.interact('actor', Stage.actors[step.talk]);
      else if (step.use) this.interact('spot', Stage.spots[step.use]);
      await new Promise((r) => setTimeout(r, 0));
    }
    return this.st(id);
  },
};

// ---------- the Chinese font for signs, menus and mahjong tiles ----------
// build.py embeds a small subset of Noto Sans TC (only the characters the events use) as @font-face rules named
// "TA CJK"; canvases must wait for it before drawing, or they fall back to whatever the system has (or empty boxes).
const CJK = '"TA CJK", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif';
let FONTS = Promise.resolve();
function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const chars = (document.querySelector('meta[name="ta-cjk"]') || {}).content || '九';
  const all = Promise.all([document.fonts.load('700 32px "TA CJK"', chars), document.fonts.load('600 20px Fredoka'), document.fonts.load('700 20px Nunito')]).catch(() => {});
  FONTS = Promise.race([all, new Promise((r) => setTimeout(r, 4000))]);
}
