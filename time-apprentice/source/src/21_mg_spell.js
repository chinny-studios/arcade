// Minigame "spell": fill the slots in order by picking tiles: hieroglyphs for a cartouche, or metal letters for a line of type.
// params: { target: ['kh','w','f','w'], tiles: { id: { label, glyph, sound } }, decoys: [...], mirror: bool,
//           frame: 'cartouche' | 'stick' | 'sign', prompt, wrong: (picked, wanted) => text }
// 'sign' paints Chinese characters in gold on a red shop board: tiles are { label: '九', sound: 'gau', mean: 'nine' }

// Egyptian signs that each stand for one sound (the "alphabet" signs), drawn with a few strokes
const GLYPHS = {
  kh(c) { c.beginPath(); c.arc(0, 0, 0.36, 0, TAU); c.stroke(); c.save(); c.beginPath(); c.arc(0, 0, 0.34, 0, TAU); c.clip(); for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 0.12 - 0.5, -0.5); c.lineTo(i * 0.12 + 0.5, 0.5); c.stroke(); c.beginPath(); c.moveTo(i * 0.12 + 0.5, -0.5); c.lineTo(i * 0.12 - 0.5, 0.5); c.stroke(); } c.restore(); },
  w(c) { // quail chick
    c.beginPath(); c.ellipse(0.02, 0.05, 0.22, 0.17, -0.2, 0, TAU); c.fill();
    c.beginPath(); c.arc(-0.2, -0.17, 0.1, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-0.3, -0.18); c.lineTo(-0.4, -0.14); c.lineTo(-0.3, -0.12); c.fill();
    c.beginPath(); c.moveTo(0, 0.2); c.lineTo(-0.05, 0.38); c.moveTo(0.08, 0.2); c.lineTo(0.12, 0.38); c.stroke();
  },
  f(c) { // horned viper
    c.beginPath(); c.moveTo(-0.42, 0.12); c.quadraticCurveTo(-0.1, 0.02, 0.05, 0.12); c.quadraticCurveTo(0.2, 0.2, 0.32, 0.05); c.quadraticCurveTo(0.38, -0.08, 0.3, -0.12); c.stroke();
    c.beginPath(); c.ellipse(0.32, -0.13, 0.09, 0.06, 0.3, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0.3, -0.18); c.lineTo(0.26, -0.3); c.moveTo(0.36, -0.18); c.lineTo(0.38, -0.3); c.stroke();
    c.beginPath(); c.moveTo(-0.42, 0.12); c.lineTo(-0.48, 0.2); c.stroke();
  },
  m(c) { // owl
    c.beginPath(); c.ellipse(0, 0.08, 0.17, 0.27, 0, 0, TAU); c.fill();
    c.beginPath(); c.arc(-0.03, -0.22, 0.13, 0, TAU); c.fill();
    c.fillStyle = '#efe4c8'; c.beginPath(); c.arc(-0.08, -0.23, 0.035, 0, TAU); c.arc(0.03, -0.23, 0.035, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-0.08, 0.34); c.lineTo(-0.1, 0.42); c.moveTo(0.06, 0.34); c.lineTo(0.08, 0.42); c.stroke();
  },
  n(c) { c.beginPath(); c.moveTo(-0.42, 0); for (let i = 0; i < 8; i++) c.lineTo(-0.42 + (i + 0.5) * 0.105, i % 2 ? 0.07 : -0.07); c.lineTo(0.42, 0); c.stroke(); },
  r(c) { c.beginPath(); c.moveTo(-0.38, 0); c.quadraticCurveTo(0, -0.22, 0.38, 0); c.quadraticCurveTo(0, 0.22, -0.38, 0); c.fill(); },
  p(c) { c.fillRect(-0.3, -0.14, 0.6, 0.28); },
  t(c) { c.beginPath(); c.moveTo(-0.3, 0.12); c.arc(0, 0.12, 0.3, Math.PI, 0); c.closePath(); c.fill(); },
  b(c) { c.beginPath(); c.moveTo(-0.05, -0.38); c.lineTo(-0.05, 0.18); c.lineTo(-0.35, 0.2); c.lineTo(-0.35, 0.3); c.lineTo(0.12, 0.3); c.lineTo(0.12, -0.38); c.closePath(); c.fill(); },
  i(c) { c.beginPath(); c.moveTo(0, 0.4); c.quadraticCurveTo(-0.2, 0, 0, -0.42); c.quadraticCurveTo(0.14, 0, 0, 0.4); c.fill(); c.beginPath(); c.moveTo(0, 0.4); c.lineTo(0.08, 0.2); c.stroke(); },
  s(c) { c.beginPath(); c.moveTo(-0.08, 0.4); c.lineTo(-0.08, -0.2); c.quadraticCurveTo(-0.08, -0.4, 0.1, -0.36); c.lineTo(0.1, -0.15); c.moveTo(0.04, -0.15); c.lineTo(0.04, 0.4); c.stroke(); },
  k(c) { c.beginPath(); c.moveTo(-0.32, -0.06); c.lineTo(0.32, -0.06); c.quadraticCurveTo(0.3, 0.26, 0, 0.26); c.quadraticCurveTo(-0.3, 0.26, -0.32, -0.06); c.fill(); c.beginPath(); c.moveTo(0.3, 0); c.quadraticCurveTo(0.48, 0.06, 0.34, 0.16); c.stroke(); },
  h(c) { c.beginPath(); c.moveTo(-0.3, 0.3); c.lineTo(-0.3, -0.2); c.quadraticCurveTo(0, -0.42, 0.3, -0.2); c.lineTo(0.3, 0.3); c.stroke(); c.beginPath(); c.moveTo(-0.15, 0.3); c.lineTo(-0.15, -0.12); c.quadraticCurveTo(0, -0.24, 0.15, -0.12); c.lineTo(0.15, 0.3); c.stroke(); },
};

Minigames.add('spell', {
  title: 'Spell it out',
  how: 'Pick the tiles in the right order.',
  init(g, p) {
    g.target = p.target;
    g.slots = p.target.map((id) => (id === ' ' ? ' ' : null));
    g.cur = g.slots.findIndex((s) => s === null);
    const ids = [...new Set(p.target.filter((x) => x !== ' ').concat(p.decoys || []))].sort();
    g.pal = [];
    for (const id of ids) {
      // letters that look the same in a mirror (I, O, A …) only need one tile
      if (p.mirror && !'AHIMOTUVWXY'.includes(id)) { g.pal.push({ id, mir: true }); g.pal.push({ id, mir: false }); }
      else if (p.mirror) g.pal.push({ id, mir: true });
      else g.pal.push({ id, mir: false });
    }
    if (p.mirror) g.pal = shuffle(g.pal, mulberry32(7 + g.tries));
    g.sel = 0; g.shake = 0; g.shakeI = -1; g.pop = []; g.doneT = 0;
    const n = g.pal.length, cols = Math.min(n, n > 10 ? Math.ceil(n / 2) : n), rows = Math.ceil(n / cols);
    const tw = Math.min(100, 900 / cols - 10);
    g.cols = cols; g.tw = tw;
    g.pal.forEach((t, i) => { const r = Math.floor(i / cols), cI = i % cols, rowN = Math.min(cols, n - r * cols); t.x = 480 - (rowN * (tw + 10) - 10) / 2 + cI * (tw + 10); t.y = 300 + r * (tw + 14) + (rows === 1 ? 50 : 0); });
  },
  pick(g, i) {
    const t = g.pal[i]; if (!t || g.cur < 0) return;
    const want = g.target[g.cur], p = g.p;
    const ok = t.id === want && (!p.mirror || t.mir);
    if (ok) {
      g.slots[g.cur] = t; g.pop.push({ i: g.cur, t: 0 }); AU.ui('ok');
      g.cur = g.slots.findIndex((s) => s === null);
      if (g.cur < 0) { g.doneT = 0.01; }
    } else {
      AU.ui('bad'); g.shake = 0.4; g.shakeI = i;
      let msg;
      if (p.wrong) msg = p.wrong(t, want);
      if (!msg && p.mirror && t.id === want) msg = "That's the right letter, but it reads the normal way. Type has to be *backwards* so it prints the right way round!";
      if (!msg) { const tile = (p.tiles && p.tiles[t.id]) || {}; const w = (p.tiles && p.tiles[want]) || {}; msg = tile.sound ? `That sign says *${tile.sound}*. We need the sign for *${w.sound || want}*.` : `Not that one. Look for *${(w.label || want)}*.`; }
      g.tip(msg, 3.5);
    }
  },
  update(g, dt) {
    g.shake = Math.max(0, g.shake - dt);
    for (const pp of g.pop) pp.t += dt;
    const n = g.pal.length;
    if (Input.anyHit(['ArrowRight', 'KeyD', 'ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'])) g.kb = true;
    if (Input.hit('ArrowRight') || Input.hit('KeyD')) g.sel = (g.sel + 1) % n;
    if (Input.hit('ArrowLeft') || Input.hit('KeyA')) g.sel = (g.sel + n - 1) % n;
    if (Input.hit('ArrowDown') || Input.hit('KeyS')) g.sel = Math.min(n - 1, g.sel + g.cols);
    if (Input.hit('ArrowUp') || Input.hit('KeyW')) g.sel = Math.max(0, g.sel - g.cols);
    if (Input.hit('KeyE') || Input.hit('Space') || Input.hit('Enter')) this.pick(g, g.sel);
    if (g.doneT > 0) { g.doneT += dt; if (g.doneT > 0.9) g.win(g.p.winText); }
  },
  tap(g, x, y) {
    const i = g.pal.findIndex((t) => x >= t.x && x <= t.x + g.tw && y >= t.y && y <= t.y + g.tw);
    if (i >= 0) { g.sel = i; this.pick(g, i); }
  },
  drawTile(g, c, t, x, y, s, hl) {
    const p = g.p, tile = (p.tiles && p.tiles[t.id]) || { label: t.id };
    if (p.frame === 'sign') {
      D.rr(c, x, y, s, s, 10); c.fillStyle = hl ? '#c8302a' : '#a8221e'; c.fill(); c.strokeStyle = '#e8b84a'; c.lineWidth = 3; c.stroke();
      D.text(c, tile.label || t.id, x + s / 2, y + s * 0.6, { size: s * 0.52, align: 'center', color: '#ffd76a', font: CJK, w: 700 });
      if (tile.sound) D.text(c, tile.sound, x + s / 2, y + s - 7, { size: Math.max(11, s * 0.15), align: 'center', color: '#f8e2b0', w: 700 });
    } else if (p.frame === 'stick') {
      // a piece of metal type seen from the end: a grey block with a raised letter
      D.rr(c, x, y, s, s, 8); c.fillStyle = hl ? '#9aa4b0' : '#7d8794'; c.fill();
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x + 4, y + 4, s - 8, 6);
      c.save(); c.translate(x + s / 2, y + s / 2 + s * 0.18); if (t.mir) c.scale(-1, 1);
      D.text(c, tile.label || t.id, 0, 0, { size: s * 0.6, align: 'center', color: '#e8ecf0', font: 'Georgia, "Times New Roman", serif', w: 700 });
      c.restore();
    } else {
      D.rr(c, x, y, s, s, 10); c.fillStyle = hl ? '#fff4d0' : '#efe4c8'; c.fill(); c.strokeStyle = '#b8945a'; c.lineWidth = 2; c.stroke();
      const gl = GLYPHS[tile.glyph || t.id];
      c.save(); c.translate(x + s / 2, y + s / 2 - 6); c.scale(s * 0.85, s * 0.85); c.fillStyle = '#2a2018'; c.strokeStyle = '#2a2018'; c.lineWidth = 0.05; c.lineCap = 'round';
      if (gl) gl(c); else { c.restore(); c.save(); D.text(c, tile.label || t.id, x + s / 2, y + s / 2 + 8, { size: 28, align: 'center', color: '#2a2018' }); }
      c.restore();
      if (tile.sound) D.text(c, tile.sound, x + s / 2, y + s - 8, { size: 15, align: 'center', color: '#7a5a30', w: 700 });
    }
  },
  draw(g, c) {
    const p = g.p;
    D.sky(c, p.frame === 'stick' ? '#3a2a1e' : p.frame === 'sign' ? '#3a3640' : '#d9b77a', p.frame === 'stick' ? '#241810' : p.frame === 'sign' ? '#22202a' : '#c9a060');
    D.text(c, p.prompt || '', 480, 44, { size: 24, align: 'center', color: '#fff8e8', stroke: 'rgba(0,0,0,.35)' });
    // the slots
    const n = g.slots.length, s = Math.min(78, 860 / n - 6), w = n * (s + 6) - 6, x0 = 480 - w / 2, y0 = 110;
    if (p.frame === 'cartouche') {
      D.rr(c, x0 - 34, y0 - 26, w + 68, s + 52, (s + 52) / 2); c.fillStyle = '#efe4c8'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#7a4a1e'; c.stroke();
      c.fillStyle = '#7a4a1e'; c.fillRect(x0 + w + 34, y0 - 30, 10, s + 60);
    } else if (p.frame === 'sign') {
      D.rr(c, x0 - 30, y0 - 20, w + 60, s + 40, 8); c.fillStyle = '#8a1a16'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#e8b84a'; c.stroke();
      c.fillStyle = '#5a4a3a'; c.fillRect(x0 - 10, y0 - 46, 6, 26); c.fillRect(x0 + w + 4, y0 - 46, 6, 26);
    } else {
      c.fillStyle = '#5a4030'; D.rr(c, x0 - 24, y0 - 14, w + 48, s + 28, 6); c.fill(); c.fillStyle = '#8a8a90'; c.fillRect(x0 - 24, y0 + s + 6, w + 48, 8);
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (s + 6);
      if (g.slots[i] === ' ') continue;
      const pop = g.pop.find((q) => q.i === i), k = pop ? Math.min(1, pop.t * 5) : 1, sc = pop ? 1 + Math.sin(Math.min(1, pop.t * 4) * Math.PI) * 0.15 : 1;
      if (g.slots[i]) { c.save(); c.translate(x + s / 2, y0 + s / 2); c.scale(sc, sc); c.globalAlpha = k; this.drawTile(g, c, g.slots[i], -s / 2, -s / 2, s, false); c.restore(); }
      else { D.rr(c, x, y0, s, s, 8); c.fillStyle = 'rgba(0,0,0,.12)'; c.fill(); if (i === g.cur) { c.strokeStyle = '#fff'; c.lineWidth = 3 + Math.sin(g.t * 6) * 1.5; c.stroke(); } }
    }
    if (p.mirror) D.text(c, 'Tip: the letters you need are the backwards ones', 480, 280, { size: 17, align: 'center', color: '#e8d8b8' });
    // the palette
    g.pal.forEach((t, i) => {
      const dx = i === g.shakeI && g.shake > 0 ? Math.sin(g.shake * 60) * 6 : 0;
      this.drawTile(g, c, t, t.x + dx, t.y, g.tw, i === g.sel);
      const tl = p.tiles && p.tiles[t.id];
      if (p.frame === 'sign' && tl && tl.mean) D.text(c, tl.mean, t.x + g.tw / 2 + dx, t.y + g.tw + 12, { size: 12, align: 'center', color: '#d8d0e0', w: 700 });
      if (i === g.sel && (Input.pad.on || g.kb)) { D.rr(c, t.x - 4, t.y - 4, g.tw + 8, g.tw + 8, 12); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); }
    });
  },
});
