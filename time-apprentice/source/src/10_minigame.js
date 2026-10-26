// The Time Apprentice — the minigame host. A minigame is a small 2D game drawn on a canvas over the scene, registered with
// Minigames.add(id, def) and started by a story step { play: id, ...params }. Minigames are generic (a rhythm haul, a pour,
// spelling with tiles, putting steps in order …) and take their words, numbers and art from the step's params, so a new
// event can reuse them. def = {
//   title, how,                       default heading and instructions (params.title / params.how override)
//   buttons(g) → [{ id, label, keys }] on-screen buttons that also answer to keys and the gamepad
//   init(g), update(g, dt), draw(g, ctx), tap(g, x, y)   x, y in the 960 × 540 canvas
// }
// and g has g.p (params), g.t (time), g.assist (0, 1, 2 … rises after each failed try), g.win(text), g.fail(text),
// g.tip(text), g.held(id), g.hit(id), plus the canvas size g.W × g.H.

const Minigames = {
  defs: {}, g: null,
  add(id, def) { this.defs[id] = def; },
  open(id, params, done) {
    const def = this.defs[id];
    if (!def) { console.error('no minigame ' + id); done(); return; }
    const g = this.g = { id, def, p: params, done, tries: 0, assist: params.assist || 0, t: 0, state: 'intro', W: 960, H: 540, btn: {}, hits: {}, tipT: 0 };
    g.win = (text) => this.result(true, text);
    g.fail = (text) => this.result(false, text);
    g.tip = (text, sec = 2.5) => { const el = $('#mgTip'); el.innerHTML = rich(text); el.classList.add('on'); g.tipT = sec; };
    g.held = (bid) => !!g.btn[bid];
    g.hit = (bid) => !!g.hits[bid];
    HUD.modal('mg');
    const el = $('#mg'); el.hidden = false;
    $('#mgTitle').textContent = params.title || def.title || '';
    $('#mgHow').innerHTML = rich(params.how || def.how || '');
    this.layout();
    this.card('intro', params.title || def.title, params.intro || params.how || def.how, 'Start');
    this.draw();
  },
  layout() {
    const cv = $('#mgc'), box = $('#mgArea').getBoundingClientRect();
    const s = Math.min(box.width / 960, box.height / 540) || 1;
    cv.style.width = Math.floor(960 * s) + 'px'; cv.style.height = Math.floor(540 * s) + 'px';
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.floor(960 * s * dpr); cv.height = Math.floor(540 * s * dpr);
    this.scale = s * dpr;
  },
  card(kind, title, text, btn, btn2) {
    const el = $('#mgCard');
    el.hidden = false; el.className = 'mgcard ' + kind;
    el.innerHTML = `<h2>${esc(title || '')}</h2><p>${rich(text || '')}</p><div class="row"><button class="big" id="mgGo">${esc(btn)}</button>${btn2 ? `<button id="mgSkip">${esc(btn2)}</button>` : ''}</div>`;
    $('#mgGo').onclick = () => this.cardGo();
    if (btn2) $('#mgSkip').onclick = () => this.finish();
    this.cardKind = kind;
  },
  cardGo() {
    const g = this.g; if (!g) return;
    AU.ui('click');
    if (this.cardKind === 'win') { this.finish(); return; }
    this.start();
  },
  start() {
    const g = this.g;
    $('#mgCard').hidden = true;
    g.state = 'play'; g.t = 0; g.btn = {}; g.hits = {};
    g.def.init(g, g.p);
    this.buttons();
  },
  buttons() {
    const g = this.g, box = $('#mgBtns');
    box.innerHTML = '';
    g.blist = g.def.buttons ? g.def.buttons(g) : [];
    for (const b of g.blist) {
      const e = document.createElement('button'); e.className = 'mgb' + (b.cls ? ' ' + b.cls : ''); e.innerHTML = `<span>${esc(b.label)}</span>${b.key ? `<small>${esc(b.key)}</small>` : ''}`;
      const on = (ev) => { ev.preventDefault(); if (!g.btn[b.id]) g.hits[b.id] = true; g.btn[b.id] = true; b.ptr = true; e.classList.add('dn'); };
      const off = (ev) => { if (ev) ev.preventDefault(); g.btn[b.id] = false; b.ptr = false; e.classList.remove('dn'); };
      e.addEventListener('pointerdown', on); e.addEventListener('pointerup', off); e.addEventListener('pointerleave', off); e.addEventListener('pointercancel', off);
      b.el = e; box.appendChild(e);
    }
    this.layout();
  },
  result(ok, text) {
    const g = this.g; if (!g || g.state !== 'play') return;
    g.state = ok ? 'won' : 'lost';
    $('#mgBtns').innerHTML = '';
    if (ok) {
      AU.ui('win');
      this.card('win', fpick(['Brilliant!', 'You did it!', 'Well done!', 'Excellent work!']), text || g.p.winText || '', 'Continue');
    } else {
      AU.ui('bad');
      g.tries++; g.assist++;
      this.card('lose', fpick(['Almost!', 'So close!', 'Not quite!', 'Good try!']), (text || 'Have another go.') + (g.tries >= 2 ? ' *It will be a little easier this time.*' : ''), 'Try again', g.tries >= 3 ? 'Skip this part' : null);
    }
  },
  finish() {
    const g = this.g; if (!g) return;
    this.g = null;
    $('#mg').hidden = true; $('#mgTip').classList.remove('on');
    HUD.modal(null);
    if (G.state === 'play') Input.lock();
    g.done();
  },
  tapAt(cx, cy) {
    const g = this.g; if (!g || g.state !== 'play' || !g.def.tap) return;
    const r = $('#mgc').getBoundingClientRect();
    g.def.tap(g, (cx - r.left) / r.width * 960, (cy - r.top) / r.height * 540);
  },
  update(dt) {
    const g = this.g; if (!g) return;
    if (g.state !== 'play') {
      if (Input.hit('KeyE') || Input.hit('Enter') || Input.hit('Space')) this.cardGo();
      this.draw(); return;
    }
    for (const b of g.blist || []) {
      const keys = b.keys || [];
      if (Input.anyHit(keys)) g.hits[b.id] = true;
      // held while a key is down or a finger/mouse is on the button
      if (keys.length) g.btn[b.id] = Input.anyDown(keys) || !!b.ptr;
      if (b.el) b.el.classList.toggle('dn', !!g.btn[b.id]);
    }
    g.t += dt;
    g.def.update(g, Math.min(dt, 0.05));
    g.hits = {};
    if (g.tipT > 0) { g.tipT -= dt; if (g.tipT <= 0) $('#mgTip').classList.remove('on'); }
    this.draw();
  },
  draw() {
    const g = this.g; if (!g) return;
    const ctx = $('#mgc').getContext('2d');
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.clearRect(0, 0, 960, 540);
    if (g.state === 'intro' && g.def.preview) g.def.preview(g, ctx);
    else if (g.state !== 'intro' || g.def.init) {
      if (g.state === 'intro' && !g.started) { g.def.init(g, g.p); g.started = true; }
      g.def.draw(g, ctx);
    }
  },
  // for tests: win the current game
  solve() { const g = this.g; if (!g) return false; if (g.state === 'intro') this.start(); this.result(true); this.finish(); return true; },
};
addEventListener('resize', () => { if (Minigames.g) Minigames.layout(); });

// ---------- drawing helpers shared by minigames ----------
const D = {
  rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); },
  sky(c, top, bot, h = 540) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, 960, h); },
  text(c, s, x, y, o = {}) {
    c.font = (o.w || 700) + ' ' + (o.size || 22) + 'px ' + (o.font || 'Fredoka, Nunito, "Trebuchet MS", sans-serif');
    c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
    if (o.stroke) { c.lineWidth = o.lw || 5; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = o.color || '#fff'; c.fillText(s, x, y);
  },
  wrap(c, s, x, y, maxW, lh, o = {}) {
    c.font = (o.w || 600) + ' ' + (o.size || 18) + 'px ' + (o.font || 'Nunito, "Trebuchet MS", sans-serif');
    const words = s.split(' '); let line = '', yy = y;
    c.fillStyle = o.color || '#fff'; c.textAlign = o.align || 'left'; c.textBaseline = 'alphabetic';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
    if (line) c.fillText(line, x, yy);
    return yy;
  },
  bar(c, x, y, w, h, k, col, back = 'rgba(0,0,0,.35)') { D.rr(c, x, y, w, h, h / 2); c.fillStyle = back; c.fill(); if (k > 0) { D.rr(c, x, y, Math.max(h, w * clamp(k, 0, 1)), h, h / 2); c.fillStyle = col; c.fill(); } },
  // a simple side-view person (for haul crews, crowds): x, y = feet, h = height, phase animates the legs
  person(c, x, y, h, col, skin, o = {}) {
    const s = h / 100, ph = o.phase || 0, lean = o.lean || 0;
    c.save(); c.translate(x, y); c.scale(o.flip ? -s : s, s);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const sw = Math.sin(ph) * 14;
    c.strokeStyle = skin; c.lineWidth = 9;
    c.beginPath(); c.moveTo(0, -48); c.lineTo(-sw, 0); c.moveTo(0, -48); c.lineTo(sw, 0); c.stroke();
    c.save(); c.rotate(lean);
    c.fillStyle = col; D.rr(c, -11, -86, 22, 42, 8); c.fill();
    c.strokeStyle = skin; c.lineWidth = 7; c.beginPath(); c.moveTo(0, -78);
    const ax = o.arms != null ? o.arms : 0.5;
    c.lineTo(Math.cos(ax) * 30, -78 + Math.sin(ax) * 30); c.stroke();
    c.fillStyle = skin; c.beginPath(); c.arc(0, -98, 12, 0, TAU); c.fill();
    if (o.hair) { c.fillStyle = o.hair; c.beginPath(); c.arc(0, -101, 12.5, Math.PI, TAU); c.fill(); }
    c.restore(); c.restore();
  },
};
