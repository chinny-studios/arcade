// The Time Apprentice — HUD and menus: dialogue and questions, goals and the marker, banners, toasts, the journal,
// the time dial (choosing an event), pause and settings, souvenirs, touch buttons

const ICON = {
  voice: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v5V4.5a1.5 1.5 0 0 1 3 0V11V5.5a1.5 1.5 0 0 1 3 0V13v-3.5a1.5 1.5 0 0 1 3 0V15c0 4-3 7-7 7s-5-2-7-5l-2.5-4a1.5 1.5 0 0 1 2.5-1.6z" fill="currentColor"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4.5C6.5 3.5 9.5 3.5 12 5c2.5-1.5 5.5-1.5 8-.5v15c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 5v15" stroke="currentColor" stroke-width="2"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
};

const HUD = {
  open: null, dlg: null, toastQ: [], bannerT: 0, goalState: null, markPos: null, markLabel: '', touch: false,
  init() {
    this.touch = false;
    bus.on('touchmode', () => { this.touch = true; document.body.classList.add('touch'); });
    bus.on('stick', (s) => { const el = $('#stick'); if (!s) { el.classList.remove('on'); return; } el.classList.add('on'); el.style.left = s.x0 + 'px'; el.style.top = s.y0 + 'px'; const k = el.querySelector('i'); const dx = clamp(s.x - s.x0, -56, 56), dy = clamp(s.y - s.y0, -56, 56); k.style.transform = `translate(${dx}px, ${dy}px)`; });
    bus.on('tap', () => { if (G.state !== 'play') return; if (this.open === 'dlg') this.dlgNext(); else if (!this.open) interact(); });
    $('#tAct').innerHTML = ICON.hand; $('#tJour').innerHTML = ICON.book; $('#tMenu').innerHTML = ICON.pause;
    $('#tAct').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.open === 'dlg') this.dlgNext(); else if (!this.open) interact(); });
    $('#tJour').addEventListener('touchstart', (e) => { e.preventDefault(); if (!this.open) this.openJournal(); else if (this.open === 'journal') this.close(); });
    $('#tMenu').addEventListener('touchstart', (e) => { e.preventDefault(); if (!this.open) this.openPause(); else if (this.open === 'pause') this.close(); });
    $('#dlg').addEventListener('click', (e) => { if (e.target.closest('button')) return; if (this.open === 'dlg') this.dlgNext(); });
    $('#dlgVoice').addEventListener('click', (e) => { e.stopPropagation(); this.setVoice(!SETTINGS.voice); });
    $('#bJournal').addEventListener('click', () => { if (!this.open) this.openJournal(); });
    $('#bMenu').addEventListener('click', () => { if (!this.open) this.openPause(); });
    this.setVoice(SETTINGS.voice);
    document.documentElement.style.setProperty('--ts', SETTINGS.text);
    bus.on('lock', (l, was) => {
      if (!l && was && G.state === 'play' && !this.open && !this.expectUnlock && !G.noPause && !this.touch) this.openPause();
      this.expectUnlock = false;
    });
    // clicking the game view while unlocked (no menu open) takes the mouse back
    $('#c').addEventListener('click', () => { if (G.state === 'play' && !this.open && !Input.locked) Input.lock(); });
  },
  blocking() { return !!this.open; },
  modal(name) {
    this.open = name;
    document.body.classList.toggle('modal', !!name && name !== 'dlg');
    document.body.classList.toggle('talking', name === 'dlg');
    if (name && name !== 'dlg' && Input.locked) { this.expectUnlock = true; Input.unlock(); }
  },
  close(relock = true) {
    const was = this.open;
    for (const id of ['#journal', '#eras', '#pause', '#souv']) $(id).hidden = true;
    this.modal(null);
    if (relock && was !== 'dlg' && G.state === 'play') Input.lock();
    AU.ui('click');
  },
  setVoice(on) {
    SETTINGS.voice = on; saveSettings();
    const b = $('#dlgVoice'); b.innerHTML = on ? ICON.voice : ICON.mute; b.classList.toggle('off', !on); b.title = on ? 'Reading aloud (click to turn off)' : 'Read aloud is off (click to turn on)';
    const t = $('#tVoice'); if (t) t.textContent = on ? 'Read aloud: on' : 'Read aloud: off';
    if (!on) Voice.stop();
  },

  // ---------- dialogue ----------
  // lines: [{ who: actor id or 'you' or null, name, title, text, voice }]
  say(lines, done) {
    this.dlg = { lines, i: -1, done, shown: 0, full: false, mode: 'say' };
    this.modal('dlg');
    $('#dlg').hidden = false; $('#dlg .opts').innerHTML = '';
    this.dlgNext();
  },
  dlgSpeaker(l) {
    for (const a of Stage.actorList()) a.talking = false;
    const a = l.who && Stage.actors[l.who];
    if (a) a.talking = true;
    $('#dlg .who b').textContent = l.name || (a && a.name) || (l.who === 'you' ? 'You' : '');
    $('#dlg .who i').textContent = l.title != null ? l.title : (a && a.title) || '';
    $('#dlg').classList.toggle('me', l.who === 'you');
    $('#dlg').classList.toggle('radio', !!l.radio);
    const voice = l.voice || (a && a.def.voice) || (l.who === 'you' ? { pitch: 1.3, voice: 1 } : {});
    Voice.say(l.text, voice);
    if (l.radio) AU.ui('quindar');
  },
  dlgNext() {
    const d = this.dlg; if (!d) return;
    if (d.mode === 'ask') return;
    if (d.i >= 0 && !d.full) { d.full = true; d.shown = 1e9; this.dlgRender(); return; }
    d.i++;
    if (d.i >= d.lines.length) { this.dlgEnd(); return; }
    AU.ui('next');
    const l = d.lines[d.i];
    d.shown = 0; d.full = false;
    this.dlgSpeaker(l);
    this.dlgRender();
  },
  dlgRender() {
    const d = this.dlg, l = d.lines[d.i]; if (!l) return;
    const txt = plain(l.text);
    if (d.shown >= txt.length) d.full = true;
    // show the whole rich text once typing finishes; while typing, show the plain prefix
    $('#dlg .say').innerHTML = d.full ? rich(l.text) : esc(txt.slice(0, Math.floor(d.shown)));
    $('#dlg .more').textContent = d.full ? (this.touch ? 'Tap to continue' : (Input.pad.on ? 'Ⓐ continue' : 'Click or E to continue')) : '';
  },
  dlgEnd() {
    const d = this.dlg; this.dlg = null;
    for (const a of Stage.actorList()) a.talking = false;
    $('#dlg').hidden = true; this.modal(null);
    Voice.stop();
    if (d && d.done) d.done();
  },
  // a question with answers; wrong answers get a gentle reply and you try again. cb(index of the right answer)
  ask(l, opts, cb) {
    this.dlg = { lines: [l], i: 0, mode: 'ask', opts, sel: 0, cb, full: true };
    this.modal('dlg'); this.expectUnlock = true; Input.unlock(); document.body.classList.add('modal');
    $('#dlg').hidden = false;
    this.dlgSpeaker(l);
    $('#dlg .say').innerHTML = rich(l.text);
    $('#dlg .more').textContent = this.touch ? 'Tap an answer' : 'Click an answer (or press 1–' + opts.length + ')';
    this.askRender();
  },
  askRender() {
    const d = this.dlg, box = $('#dlg .opts');
    box.innerHTML = '';
    d.opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'opt' + (o.used ? ' used' : '') + (i === d.sel ? ' sel' : '');
      b.innerHTML = '<span>' + (i + 1) + '</span>' + rich(o.t);
      b.disabled = !!o.used;
      b.onclick = (e) => { e.stopPropagation(); this.askPick(i); };
      box.appendChild(b);
    });
  },
  askPick(i) {
    const d = this.dlg; if (!d || d.mode !== 'ask') return;
    const o = d.opts[i]; if (!o || o.used) return;
    if (o.ok) {
      AU.ui('ok');
      $('#dlg .opts').innerHTML = '';
      document.body.classList.remove('modal');
      const l = d.lines[0], cb = d.cb;
      if (G.state === 'play') Input.lock();
      this.dlg = null;
      if (o.reply) this.say([{ who: l.who, name: l.name, title: l.title, text: o.reply, voice: l.voice, radio: l.radio }], () => cb(i));
      else { $('#dlg').hidden = true; this.modal(null); cb(i); }
    } else {
      AU.ui('bad'); o.used = true;
      const l = d.lines[0];
      $('#dlg .say').innerHTML = rich(o.reply || 'Hmm, not quite. Try another answer!');
      Voice.say(o.reply || 'Hmm, not quite. Try another answer!', l.voice || (Stage.actors[l.who] && Stage.actors[l.who].def.voice) || {});
      d.sel = d.opts.findIndex((q) => !q.used);
      this.askRender();
    }
  },

  // ---------- goals, marker, prompt ----------
  goal(ch, text) {
    const el = $('#goal');
    if (!text) { el.classList.remove('on'); this.goalState = null; return; }
    $('#goalCh').textContent = ch || ''; $('#goalTx').innerHTML = rich(text);
    el.classList.remove('done'); el.classList.add('on'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    this.goalState = text;
  },
  goalDone() { $('#goal').classList.add('done'); AU.ui('goal'); },
  mark(pos, label) { this.markPos = pos; this.markLabel = label || ''; },
  where(a, b) { $('#where b').textContent = a || ''; $('#where span').textContent = b || ''; },
  carry(label) { const el = $('#carry'); el.hidden = !label; el.textContent = label ? 'Carrying: ' + label : ''; },
  banner(small, big, sub, sec = 4) {
    const el = $('#banner');
    el.querySelector('.s').textContent = small || ''; el.querySelector('.l').textContent = big || ''; el.querySelector('.n').textContent = sub || '';
    el.classList.add('on'); this.bannerT = sec;
  },
  toast(title, text, kind = 'fact') {
    const el = document.createElement('div'); el.className = 'toast ' + kind;
    el.innerHTML = '<b>' + esc(title) + '</b>' + (text ? '<span>' + rich(text) + '</span>' : '');
    $('#toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 700); }, 4200);
  },

  // ---------- journal ----------
  openJournal(scId) {
    this.modal('journal');
    const el = $('#journal'); el.hidden = false;
    const list = Scenarios.sorted();
    const cur = scId || (Story.sc && !Story.sc.hub ? Story.sc.id : (this.jSel || (list[0] && list[0].id)));
    this.jSel = cur;
    const tabs = list.map((sc) => {
      const n = Journal.count(sc.id), m = Object.keys(sc.facts).length;
      return `<button class="jt${sc.id === cur ? ' on' : ''}" data-id="${sc.id}" style="--c:#${new THREE.Color(sc.color).getHexString()}"><b>${esc(sc.when)}</b><span>${esc(sc.title)}</span><em>${n} / ${m}</em></button>`;
    }).join('');
    const sc = Scenarios.byId[cur];
    let body = '';
    if (sc) {
      const got = Journal.got(sc.id);
      body += `<h2>${esc(sc.title)}</h2><div class="jsub">${esc(sc.place)} · ${esc(sc.when)}</div>`;
      body += Object.entries(sc.facts).map(([id, f]) => got.includes(id)
        ? `<div class="jf"><b>${esc(f.t)}</b><p>${rich(f.x)}</p></div>`
        : '<div class="jf lock"><b>? ? ?</b><p>A page you haven\'t found yet. Keep exploring and talking to people!</p></div>').join('');
      const people = Object.values(sc.cast || {}).filter((c) => c.real && c.about);
      if (people.length) body += '<h3>Real people in this story</h3>' + people.map((c) => `<div class="jp"><b>${esc(c.name)}</b> <span>${rich(c.about)}</span></div>`).join('');
      body += Album.html(sc) + Jobs.html(sc);
      if (sc.note) body += `<p class="jnote">${rich(sc.note)}</p>`;
    }
    const total = list.reduce((s, q) => s + Journal.count(q.id), 0), all = list.reduce((s, q) => s + Object.keys(q.facts).length, 0);
    el.innerHTML = `<div class="jbook"><div class="jside"><h1>Journal</h1><div class="jtot">${total} of ${all} pages</div>${tabs}</div><div class="jpage">${body}</div></div><button class="x" id="jClose">Close</button>`;
    el.querySelectorAll('.jt').forEach((b) => { b.onclick = () => { this.openJournal(b.dataset.id); AU.ui('click'); }; });
    $('#jClose').onclick = () => this.close();
  },

  // ---------- the time dial ----------
  openEras(onPick) {
    this.modal('eras');
    const el = $('#eras'); el.hidden = false;
    const cards = Scenarios.sorted().map((sc) => {
      const done = SAVE.data.done[sc.id], prog = SAVE.data.prog[sc.id];
      const n = Journal.count(sc.id), m = Object.keys(sc.facts).length;
      const st = done ? 'Visited ✓' : prog != null ? 'Chapter ' + (prog + 1) + ' of ' + sc.chapters.length : 'Not visited yet';
      return `<button class="era${done ? ' done' : ''}" data-id="${sc.id}" style="--c:#${new THREE.Color(sc.color).getHexString()}">
        <div class="ey">${esc(sc.when)}</div><div class="et">${esc(sc.title)}</div><div class="ep">${esc(sc.place)}</div>
        <div class="eb">${rich(sc.blurb)}</div><div class="er">${rich(sc.role)}</div>
        <div class="es"><span>${st}</span><span>${n} / ${m} journal pages</span></div></button>`;
    }).join('');
    el.innerHTML = `<h1>Where to, apprentice?</h1><p class="esub">Pick a moment in history. The machine will drop you right into it.</p><div class="eras">${cards}</div><button class="x" id="eClose">Not yet</button>`;
    el.querySelectorAll('.era').forEach((b) => { b.onclick = () => { this.close(false); onPick(b.dataset.id); }; });
    $('#eClose').onclick = () => this.close();
  },

  // ---------- pause ----------
  openPause() {
    this.modal('pause');
    const el = $('#pause'); el.hidden = false;
    const inSc = Story.sc && !Story.sc.hub;
    el.innerHTML = `<h1>Paused</h1>
      <button class="big" id="pResume">Keep playing</button>
      <div class="set">
        <button id="tVoice">${SETTINGS.voice ? 'Read aloud: on' : 'Read aloud: off'}</button>
        <label>Volume <input type="range" id="sVol" min="0" max="1" step="0.05" value="${SETTINGS.vol}"></label>
        <label>Look speed <input type="range" id="sSens" min="0.3" max="2.5" step="0.05" value="${SETTINGS.sens}"></label>
        <label>Text size <input type="range" id="sText" min="0.85" max="1.4" step="0.05" value="${SETTINGS.text}"></label>
        <label><input type="checkbox" id="sInv" ${SETTINGS.invertY ? 'checked' : ''}> Invert look up/down</label>
        <label><input type="checkbox" id="sBob" ${SETTINGS.bob ? 'checked' : ''}> Head bob</label>
        <label>Graphics <select id="sQ">${['auto', 'high', 'med', 'low'].map((q) => `<option value="${q}" ${SETTINGS.quality === q ? 'selected' : ''}>${{ auto: 'Automatic', high: 'High', med: 'Medium', low: 'Low' }[q]}</option>`).join('')}</select></label>
      </div>
      ${inSc ? '<button id="pRestart">Start this chapter again</button><button id="pHome">Go back to the workshop</button>' : ''}
      <button id="pTitle">Title screen</button>
      <p class="keys">${this.touch ? 'Left thumb: walk. Drag on the right: look. Hand button or tap: talk and use things.' : 'WASD or arrows: walk · Shift: run · Mouse: look · E or click: talk and use · J: journal · Esc: pause'}</p>`;
    $('#pResume').onclick = () => this.close();
    $('#tVoice').onclick = () => this.setVoice(!SETTINGS.voice);
    $('#sVol').oninput = (e) => { AU.vol(+e.target.value); saveSettings(); };
    $('#sSens').oninput = (e) => { SETTINGS.sens = +e.target.value; saveSettings(); };
    $('#sText').oninput = (e) => { SETTINGS.text = +e.target.value; document.documentElement.style.setProperty('--ts', SETTINGS.text); saveSettings(); };
    $('#sInv').onchange = (e) => { SETTINGS.invertY = e.target.checked; saveSettings(); };
    $('#sBob').onchange = (e) => { SETTINGS.bob = e.target.checked; saveSettings(); };
    $('#sQ').onchange = (e) => { SETTINGS.quality = e.target.value; G.autoQ = e.target.value === 'auto'; applyQuality(G.autoQ ? 'high' : e.target.value); saveSettings(); };
    if (inSc) {
      $('#pRestart').onclick = () => { this.close(); Story.restartChapter(); };
      $('#pHome').onclick = () => { this.close(false); goHome(); };
    }
    $('#pTitle').onclick = () => { this.close(false); toTitle(); };
  },

  // ---------- the end of an event ----------
  openSouvenir(sc, done) {
    this.modal('souv');
    const el = $('#souv'); el.hidden = false;
    const n = Journal.count(sc.id), m = Object.keys(sc.facts).length;
    el.innerHTML = `<div class="sv"><div class="s1">You helped make history!</div><h1>${esc(sc.title)}</h1><div class="s2">${esc(sc.place)} · ${esc(sc.when)}</div>
      <div class="s3">Souvenir for your shelf</div><h2>${esc(sc.souvenir.name)}</h2><p>${rich(sc.souvenir.text)}</p>
      <p class="s4">Journal pages found: <b>${n} of ${m}</b>${n < m ? ' (you can replay this event to find the rest)' : ''}</p>
      <button class="big" id="sHome">Back to the workshop</button></div>`;
    AU.ui('win');
    $('#sHome').onclick = () => { this.close(false); done(); };
  },

  // ---------- per frame ----------
  key() {
    if (this.open === 'dlg' && this.dlg) {
      if (this.dlg.mode === 'ask') {
        const n = this.dlg.opts.length;
        for (let i = 0; i < n; i++) if (Input.hit('Digit' + (i + 1)) || Input.hit('Numpad' + (i + 1))) this.askPick(i);
        if (this.dlg && this.dlg.mode === 'ask') {
          if (Input.hit('ArrowDown') || Input.hit('KeyS')) { this.dlg.sel = (this.dlg.sel + 1) % n; this.askRender(); }
          if (Input.hit('ArrowUp') || Input.hit('KeyW')) { this.dlg.sel = (this.dlg.sel + n - 1) % n; this.askRender(); }
          if (Input.hit('KeyE') || Input.hit('Enter') || Input.hit('Space')) this.askPick(this.dlg.sel);
        }
      } else if (Input.action()) this.dlgNext();
      return;
    }
    if (this.open === 'journal' && (Input.hit('KeyJ') || Input.hit('Escape') || Input.hit('KeyQ'))) { this.close(); return; }
    if ((this.open === 'eras' || this.open === 'pause') && (Input.hit('Escape') || Input.hit('KeyQ'))) { this.close(); return; }
    if (this.open) return;
    if (Input.hit('KeyJ')) { this.openJournal(); return; }
    if (Input.hit('Escape') && (DEBUG || this.touch || Input.pad.on)) { this.openPause(); return; }
    if (Input.action() || Input.hit('KeyF')) interact();
  },
  update(dt) {
    // typewriter
    const d = this.dlg;
    if (d && d.mode === 'say' && !d.full) { d.shown += dt * 55; this.dlgRender(); }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('#banner').classList.remove('on'); }
    // prompt
    const pr = $('#prompt');
    const t = !this.open ? PL.target : null;
    const want = t ? (this.touch ? t.label : (Input.pad.on ? 'Ⓐ ' : 'E ') + t.label) : '';
    if (pr.dataset.t !== want) { pr.dataset.t = want; pr.innerHTML = t ? (this.touch ? esc(t.label) : '<b>' + (Input.pad.on ? 'A' : 'E') + '</b>' + esc(t.label)) : ''; }
    $('#tAct').classList.toggle('hot', !!t || this.open === 'dlg');
    document.body.classList.toggle('cut', !!PL.cut);
    // marker
    const mk = $('#mark');
    if (this.markPos && !this.open && !PL.cut) {
      const p = _mk.set(this.markPos[0], this.markPos[1], this.markPos[2]);
      const dist = Math.hypot(p.x - PL.x, p.z - PL.z);
      p.project(R.camera);
      const W = innerWidth, H = innerHeight;
      let x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
      const behind = p.z > 1;
      if (behind) { x = W - x; y = H - 40; }
      const m = 46, off = behind || x < m || x > W - m || y < m || y > H - m;
      x = clamp(x, m, W - m); y = clamp(y, m + 40, H - m);
      mk.style.transform = `translate(${x}px, ${y}px)`;
      mk.classList.toggle('edge', off);
      mk.classList.add('on');
      mk.querySelector('span').textContent = dist > 4 ? Math.round(dist) + ' m' : '';
      if (off) { const a = Math.atan2(y - H / 2, x - W / 2); mk.querySelector('i').style.transform = `rotate(${a + Math.PI / 2}rad)`; } else mk.querySelector('i').style.transform = '';
    } else mk.classList.remove('on');
  },
};
const _mk = new V3();

// ---------- journal facts ----------
const Journal = {
  got(id) { return SAVE.data.facts[id] || (SAVE.data.facts[id] = []); },
  count(id) { const sc = Scenarios.byId[id]; return sc ? this.got(id).filter((f) => sc.facts[f]).length : 0; },
  unlock(scId, fid) {
    const sc = Scenarios.byId[scId]; if (!sc || !sc.facts[fid]) return false;
    const g = this.got(scId); if (g.includes(fid)) return false;
    g.push(fid); SAVE.save();
    HUD.toast('New journal page', sc.facts[fid].t);
    AU.ui('fact');
    return true;
  },
};
