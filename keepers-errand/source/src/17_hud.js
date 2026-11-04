// ---- hud: life, clams, items, modes, prompts, toasts, banners, menus, the map and touch controls ----
const MODE_ICON = { normal: '🙂', sporty: '👟', aggressive: '✊', sneaky: '🤫' };
const HUD = {
  seen: new Set(),
  init() {
    const m = $('#modes');
    m.innerHTML = MODES.map((k, i) => `<div class="md" data-m="${k}"><span class="k">${i + 1}</span><div class="ic">${MODE_ICON[k]}</div><div class="nm">${MODE_INFO[k].name}</div></div>`).join('');
    m.querySelectorAll('.md').forEach((d) => d.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (G.state === 'play') Hero.setMode(d.dataset.m); }));
    this.initMenus(); this.initTouch();
    Bus.on('flag', () => this.goal());
    Bus.on('item', () => { this.items(); this.goal(); });
  },
  refresh() { this.life(); this.clams(); this.mode(); this.items(); this.goal(); },
  life() {
    const s = G.save, el = $('#life'), n = Math.ceil(s.maxLife / 2);
    let h = '';
    for (let i = 0; i < n; i++) { const v = s.life - i * 2; h += `<div class="leaf ${v >= 2 ? 'on' : v === 1 ? 'half' : ''}"></div>`; }
    el.innerHTML = h;
  },
  hurt() {
    const el = $('#life'); el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt');
    $('#hurt').style.transition = 'none'; $('#hurt').style.opacity = 1;
    requestAnimationFrame(() => { $('#hurt').style.transition = 'opacity .6s'; $('#hurt').style.opacity = 0; });
  },
  clams() { $('#clams').textContent = G.save.clams; $('#tonics').textContent = G.save.tonics; $('#tonicS').style.display = G.save.tonics ? '' : 'none'; },
  mode() {
    document.querySelectorAll('.md').forEach((d) => d.classList.toggle('on', d.dataset.m === Hero.mode));
    $('#modeTip').textContent = MODE_INFO[Hero.mode].desc;
  },
  items() {
    const it = [];
    if (hasItem('pebble')) it.push(F('pebbleUp') ? ['☀️', 'Sun-pebble'] : ['🪨', 'Tide-pebble']);
    if (hasItem('stamp')) it.push(['🟥', 'PAID stamp']);
    if (hasItem('hat')) it.push(['🧢', "Gubbins' hat"]);
    const n = Story.shards(); if (n) it.push(['💎', 'Sky-glass', n]);
    $('#items').innerHTML = it.map(([ic, t, n]) => `<div class="it" title="${t}">${ic}${n ? `<small>${n}</small>` : ''}</div>`).join('');
    this.clams();
  },
  goal() {
    if (!G.save) return;
    const g = Story.goal();
    $('#goal').innerHTML = g.map((t, i) => `<div>${i === 0 ? '<b>Next:</b> ' : ''}${t}</div>`).join('');
  },
  prompt(label) {
    const el = $('#prompt');
    if (!label) { el.hidden = true; this._p = null; return; }
    if (this._p === label) return;
    this._p = label;
    const key = Input.lastDevice === 'pad' ? 'B' : document.body.classList.contains('touch') ? 'USE' : 'E';
    el.innerHTML = `<kbd>${key}</kbd>${label}`; el.hidden = false;
  },
  toast(text, id, dur = 3.6) {
    if (id) { if (this.seen.has(id)) return; this.seen.add(id); }
    const box = $('#toasts');
    if ([...box.children].some((c) => c.textContent === text)) return;
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = text;
    box.appendChild(d);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, dur * 1000);
  },
  banner(text, small) {
    const b = $('#banner'); b.textContent = text; b.classList.toggle('small', !!small);
    b.classList.add('on'); clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.remove('on'), 2400);
  },
  fade(v, dur) { const f = $('#fade'); f.style.transition = `opacity ${dur}s`; f.style.opacity = v; },
  flash() { const f = $('#flash'); f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 1.6s'; f.style.opacity = 0; })); },
  letterbox(on) { document.body.classList.toggle('cine', on); },
  boss(frac, name) {
    const b = $('#bossBar');
    if (frac == null) { b.hidden = true; return; }
    b.hidden = false; b.querySelector('.nm').textContent = name; b.querySelector('i').style.width = Math.max(0, frac) * 100 + '%';
  },
  setState(s) { G.state = s; document.body.dataset.state = s; },
  // ---------- screens ----------
  show(id) { for (const s of ['title', 'help', 'opts', 'pause', 'mapWin', 'end']) $('#' + s).hidden = s !== id; this.screen = id; this.menuSel = 0; this.menuHi(); },
  menuButtons() { const s = this.screen && $('#' + this.screen); return s ? [...s.querySelectorAll('button')].filter((b) => !b.hidden) : []; },
  menuHi() { const bs = this.menuButtons(); bs.forEach((b, i) => b.classList.toggle('sel', i === this.menuSel)); },
  menuInput() {
    const I = Input.pressed, bs = this.menuButtons();
    if (!bs.length) return;
    if (I.up || I.left) { this.menuSel = (this.menuSel + bs.length - 1) % bs.length; this.menuHi(); Audio2.sfx('menu'); }
    if (I.down || I.right) { this.menuSel = (this.menuSel + 1) % bs.length; this.menuHi(); Audio2.sfx('menu'); }
    if (I.ok || I.action) { Audio2.sfx('select'); bs[this.menuSel].click(); }
  },
  initMenus() {
    const back = () => this.show(this.prevScreen || 'title');
    document.querySelectorAll('.back').forEach((b) => b.onclick = back);
    $('#bContinue').onclick = () => Main.continueGame();
    $('#bNew').onclick = () => { if (hasSave() && !confirm('Start a new game? Your saved progress will be replaced.')) return; Main.newGame(); };
    $('#bHelp').onclick = () => { this.prevScreen = 'title'; this.show('help'); };
    $('#bOpts').onclick = () => { this.prevScreen = 'title'; this.show('opts'); };
    $('#pResume').onclick = () => Main.resume();
    $('#pMap').onclick = () => this.openMap();
    $('#pHelp').onclick = () => { this.prevScreen = 'pause'; this.show('help'); };
    $('#pOpts').onclick = () => { this.prevScreen = 'pause'; this.show('opts'); };
    $('#pTitle').onclick = () => { writeSave(); Main.toTitle(); };
    $('#eCont').onclick = () => { this.show(null); this.setState('play'); };
    $('#eTitle').onclick = () => Main.toTitle();
    const om = $('#oMusic'), os = $('#oSfx'), osh = $('#oShake');
    om.value = OPTS.music; os.value = OPTS.sfx; osh.checked = OPTS.shake;
    om.oninput = () => { OPTS.music = +om.value; Audio2.applyVolumes(); saveOpts(); };
    os.oninput = () => { OPTS.sfx = +os.value; Audio2.applyVolumes(); saveOpts(); Audio2.sfx('coin'); };
    osh.onchange = () => { OPTS.shake = osh.checked; saveOpts(); };
    $('#dlg').addEventListener('pointerdown', (e) => { e.stopPropagation(); Dialog.click(); });
    $('#mapWin').addEventListener('pointerdown', () => this.closeMap());
  },
  showEnd() {
    const s = G.save, mins = Math.round(s.played / 60);
    $('#endStats').innerHTML = `<span>⏱ ${mins} min</span><span>🐚 ${s.clams} clams</span><span>⚙️ ${Object.keys(s.dead).filter((k) => /^(r|q|lh|b)/.test(k)).length} bailiffs unwound</span>`;
    this.prevScreen = null;
    this.setState('end'); this.show('end');
  },
  // ---------- map ----------
  mapBase: null,
  W2M(x, z) { return [(x + 112) * 3.3, (z + 96) * 3.3]; },
  buildMapBase() {
    const c = document.createElement('canvas'); c.width = 720; c.height = 620;
    const x = c.getContext('2d'), img = x.createImageData(720, 620);
    for (let j = 0; j < 620; j += 2) for (let i = 0; i < 720; i += 2) {
      const wx = i / 3.3 - 112, wz = j / 3.3 - 96, h = ISLE.H(wx, wz);
      let col;
      if (h < -0.3) { const d = clamp(-h / 9, 0, 1); col = [40 - d * 20, 110 - d * 40, 150 - d * 30]; }
      else { const sl = Math.abs(ISLE.H(wx + 1, wz) - h) + Math.abs(ISLE.H(wx, wz + 1) - h); const k = ISLE.color(wx, wz, h, sl); const sh = 0.82 + clamp(h / 20, 0, 1) * 0.3; col = [k[0] * 255 * sh, k[1] * 255 * sh, k[2] * 255 * sh]; }
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const o = ((j + dy) * 720 + i + dx) * 4; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
    // the sea stack and its stepping stones are props, not terrain
    x.fillStyle = '#8a847a';
    for (const [px, pz] of OUT.pillars || []) { const [mx, my] = this.W2M(px, pz); x.beginPath(); x.arc(mx, my, 3, 0, TAU); x.fill(); }
    if (OUT.stackTop) { const [mx, my] = this.W2M(OUT.stackTop[0], OUT.stackTop[1]); x.beginPath(); x.arc(mx, my, 8, 0, TAU); x.fill(); x.fillStyle = '#5aa04a'; x.beginPath(); x.arc(mx, my, 5, 0, TAU); x.fill(); }
    x.font = '600 15px Fredoka, system-ui, sans-serif'; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = 'rgba(20,16,10,.7)'; x.fillStyle = '#fff4d8';
    for (const [t, wx, wz] of [['Lighthouse Point', -82, -4], ['Pottle Harbour', 48, -16], ['Thunder Hill', 10, -76], ['Old Quarry', -50, -62], ["Smuggler's Cove", 8, 70], ['The Needle', -48, 74], ['Pond', -20, -24]]) { const [mx, my] = this.W2M(wx, wz); x.strokeText(t, mx, my); x.fillText(t, mx, my); }
    this.mapBase = c;
  },
  targets() {
    const P = ISLE.P, t = [];
    if (F('bossDone')) return t;
    if (!hasItem('pebble')) return [P.cottage];
    if (!F('sawNotice')) return [P.lighthouse];
    if (!F('metMayor') && !F('metCumula')) return [P.square];
    if (!F('metCumula')) t.push(P.windmill);
    else if (!F('pebbleUp')) {
      if (this.shardsAll()) t.push(P.windmill);
      else { if (!hasItem('glass_quarry')) t.push(P.quarry); if (!hasItem('glass_stack')) t.push(P.stack); if (!hasItem('glass_cove')) t.push(P.gubbins); }
    }
    if (!F('lighthouseOpen')) t.push(hasItem('stamp') ? P.lighthouse : F('metLedgerby') ? [66, -10] : [54, -8]);
    else if (F('pebbleUp')) t.push(P.lighthouse);
    return t;
  },
  shardsAll() { return Story.shards() === 3; },
  AREA_POS: { cottage: [-74, 20], tavern: [42, 24], office: [58, -8], records: [64.5, -8.5], windmill: [10, -60], lh0: [-88, 6], lh1: [-88, 6], lh2: [-88, 6], lh3: [-88, 6] },
  drawMap() {
    if (!this.mapBase) this.buildMapBase();
    const c = $('#mapC'), x = c.getContext('2d');
    x.drawImage(this.mapBase, 0, 0);
    const tt = performance.now() / 1000;
    for (const [wx, wz] of this.targets()) {
      const [mx, my] = this.W2M(wx, wz), s = 9 + Math.sin(tt * 4) * 2;
      x.save(); x.translate(mx, my); x.fillStyle = '#ffd24a'; x.strokeStyle = '#4a2a0a'; x.lineWidth = 2; x.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s, a = i / 10 * TAU - Math.PI / 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      x.closePath(); x.fill(); x.stroke(); x.restore();
    }
    const out = W.area.kind === 'outdoor';
    const [hx, hz] = out ? [Hero.x, Hero.z] : (this.AREA_POS[W.area.id] || [0, 0]);
    const [mx, my] = this.W2M(hx, hz);
    x.save(); x.translate(mx, my); x.rotate(-(out ? Hero.ry : 0) + Math.PI);
    x.fillStyle = '#e0563e'; x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 8); x.lineTo(0, 4); x.lineTo(-8, 8); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.font = '600 14px Fredoka, system-ui'; x.fillStyle = '#fff4d8'; x.textAlign = 'left';
    x.fillText(out ? 'You are here' : 'You are in: ' + (W.area.title || ''), 14, 24);
  },
  openMap() { if (G.state !== 'play' && G.state !== 'pause') return; this.mapFrom = G.state; this.setState('map'); this.show('mapWin'); this.drawMap(); },
  closeMap() { if (G.state !== 'map') return; if (this.mapFrom === 'pause') { this.setState('pause'); this.show('pause'); } else { this.show(null); this.setState('play'); } },
  // ---------- touch ----------
  initTouch() {
    const body = document.body;
    addEventListener('touchstart', () => { if (!body.classList.contains('touch')) { body.classList.add('touch'); Input.lastDevice = 'touch'; } }, { passive: true, capture: true });
    const joy = $('#joy'), base = $('#joyBase'), knob = $('#joyKnob');
    let jid = null, ox = 0, oy = 0;
    joy.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      jid = e.pointerId; ox = e.clientX; oy = e.clientY; joy.setPointerCapture(jid);
      base.style.display = knob.style.display = 'block';
      base.style.left = knob.style.left = ox + 'px'; base.style.top = knob.style.top = oy + 'px';
      base.style.position = knob.style.position = 'fixed';
      Input.touch.active = true; Input.touch.jx = Input.touch.jy = 0; Audio2.unlock();
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== jid) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy), m = 55;
      if (l > m) { dx *= m / l; dy *= m / l; }
      knob.style.left = ox + dx + 'px'; knob.style.top = oy + dy + 'px';
      Input.touch.jx = dx / m; Input.touch.jy = -dy / m;
    });
    const end = (e) => { if (e.pointerId !== jid) return; jid = null; base.style.display = knob.style.display = 'none'; Input.touch.active = false; Input.touch.jx = Input.touch.jy = 0; };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    document.querySelectorAll('.tb').forEach((b) => {
      const k = b.dataset.b;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation(); Audio2.unlock();
        b.classList.add('down'); Input.touch.btn[k] = true;
        if (k === 'pause') Main.togglePause(); else if (k === 'map') this.openMap(); else { Input.tap(k); if (k === 'action' || k === 'use') Input.tap('ok'); }
      });
      const up = () => { b.classList.remove('down'); Input.touch.btn[k] = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  },
};
