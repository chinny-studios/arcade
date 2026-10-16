// Nullwake — drawing. One 2D canvas; world units are scaled so the shorter screen side shows about 540 units
// (400 in portrait), whatever the resolution.
const CV = $('#c'), CTX = CV.getContext('2d');
function resize() {
  const w = innerWidth, h = innerHeight; let dpr = Math.min(devicePixelRatio || 1, 2);
  if (w * h * dpr * dpr > 3.6e6) dpr = Math.sqrt(3.6e6 / (w * h));
  CV.width = Math.round(w * dpr); CV.height = Math.round(h * dpr);
  const s = Math.min(w, h) / (w < h ? 400 : 540);
  Object.assign(G.view, { s, dpr, k: s * dpr, w: w / s, h: h / s, W: CV.width, H: CV.height });
}

function drawFar(c, cx, cy) {
  const img = WORLD.far; if (!img) return;
  const S = img.width * G.view.dpr * 0.9, ox = -((cx * 0.25 * G.view.k) % S + S) % S, oy = -((cy * 0.25 * G.view.k) % S + S) % S;
  for (let y = oy; y < G.view.H; y += S) for (let x = ox; x < G.view.W; x += S) c.drawImage(img, x, y, S + 1, S + 1);
}

const attract = { x: 0, y: 0 };
function renderAttract(dt) {
  const c = CTX, v = G.view;
  attract.x += dt * 14; attract.y += dt * 6;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = LOOKS.drift.bg; c.fillRect(0, 0, v.W, v.H);
  buildTiles('drift'); drawFar(c, attract.x, attract.y);
  c.setTransform(v.k, 0, 0, v.k, v.W / 2 - attract.x * v.k, v.H / 2 - attract.y * v.k);
  const tiles = WORLD.tiles.drift, x0 = attract.x - v.w / 2, y0 = attract.y - v.h / 2;
  for (let cy = Math.floor(y0 / CH); cy * CH < y0 + v.h; cy++) for (let cx = Math.floor(x0 / CH); cx * CH < x0 + v.w; cx++) c.drawImage(tiles[Math.floor(hash2(cx, cy, 1) * 4)], cx * CH, cy * CH, CH + 0.6, CH + 0.6);
  c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createRadialGradient(v.W / 2, v.H / 2, Math.min(v.W, v.H) * 0.2, v.W / 2, v.H / 2, Math.max(v.W, v.H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)'); c.fillStyle = g; c.fillRect(0, 0, v.W, v.H);
}

function render() {
  const c = CTX, v = G.view, k = v.k;
  if (!G.stage) return;
  let cx = P.x, cy = P.y;
  if (G.shake > 0.3 && SAVE.opts.shake) { cx += (Math.random() - 0.5) * G.shake; cy += (Math.random() - 0.5) * G.shake; }
  G.cam.x = cx; G.cam.y = cy;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = LOOKS[G.stage.look].bg; c.fillRect(0, 0, v.W, v.H);
  if (G.stage.look === 'drift') drawFar(c, cx, cy);
  c.setTransform(k, 0, 0, k, v.W / 2 - cx * k, v.H / 2 - cy * k);
  const x0 = cx - v.w / 2 - 70, x1 = cx + v.w / 2 + 70, y0 = cy - v.h / 2 - 70, y1 = cy + v.h / 2 + 70;
  const vis = (x, y, r) => x + r > x0 && x - r < x1 && y + r > y0 && y - r < y1;
  drawWorld(c, x0, y0, x1, y1);

  // ground layer: pools, auras, hazards
  for (const p of POOLS) { if (!vis(p.x, p.y, p.r)) continue; c.globalAlpha = Math.min(1, p.life / 0.4, (p.max - p.life) / 0.15 + 0.3) * (0.75 + 0.15 * Math.sin(G.t * 9 + p.x)); c.drawImage(softDisc(p.col, 0.32), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
  c.globalCompositeOperation = 'lighter';
  for (const w of P.weapons) if ((w.id === 'gravity' || w.id === 'horizon') && !P.dead) {
    const R0 = 58 * w.st.area, col = WEAPONS[w.id].color;
    c.globalAlpha = 0.55; c.drawImage(softDisc(col, 0.28), P.x - R0, P.y - R0, R0 * 2, R0 * 2);
    c.globalAlpha = 0.5; c.strokeStyle = col; c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = G.t * (w.id === 'horizon' ? -1.4 : 1) + i * TAU / 3; c.beginPath(); c.arc(P.x, P.y, R0 * 0.92, a, a + 1.2); c.stroke(); }
  }
  c.globalCompositeOperation = 'source-over';
  for (const h of HZ) {
    if (h.kind === 'blast' && h.delay > 0) {
      const p = 1 - h.delay / h.max; c.globalAlpha = 0.18 + 0.12 * Math.sin(G.t * 20);
      c.fillStyle = h.col; circ(c, h.x, h.y, h.r * p); c.fill();
      c.globalAlpha = 0.85; c.strokeStyle = h.col; c.lineWidth = 2; circ(c, h.x, h.y, h.r); c.stroke();
    } else if (h.kind === 'pool') {
      c.globalAlpha = Math.min(1, h.life) * 0.8; c.drawImage(softDisc(h.col, 0.5), h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
    } else if (h.kind === 'beam' && h.delay > 0) {
      const p = 1 - h.delay / h.max; c.globalAlpha = 0.35 + 0.4 * (Math.sin(G.t * 30) > 0 ? 1 : 0) * p;
      c.strokeStyle = h.col; c.lineWidth = 2 + h.w * p * 0.5; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + Math.cos(h.a) * h.len, h.y + Math.sin(h.a) * h.len); c.stroke();
    }
  }
  c.globalAlpha = 1;

  // pickups
  for (const g of GEMS) { if (!vis(g.x, g.y, 10)) continue; const s = PICK['gem' + g.tier]; c.drawImage(s.img, g.x - s.half, g.y - s.half, s.half * 2, s.half * 2); }
  for (const it of ITEMS) {
    if (!vis(it.x, it.y, 20)) continue;
    const s = PICK[it.kind], bob = Math.sin(it.t * 4 + it.x) * 2;
    if (it.kind === 'chest') { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 + 0.3 * Math.sin(G.t * 5); c.drawImage(glow('#ffd25e'), it.x - 34, it.y - 34 + bob, 68, 68); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    c.drawImage(s.img, it.x - s.half, it.y - s.half + bob, s.half * 2, s.half * 2);
  }

  // enemies
  for (const e of E) {
    if (e.dead || !vis(e.x, e.y, e.r * 2)) continue;
    if (e.prop) { const s = PICK.pod; c.drawImage(s.img, e.x - s.half, e.y - s.half, s.half * 2, s.half * 2); continue; }
    if (e.boss) { drawBoss(c, e); continue; }
    if (e.elite) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45; c.drawImage(glow('#ffd25e'), e.x - e.r * 2, e.y - e.r * 2, e.r * 4, e.r * 4); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    if (e.ai === 'dash' && e.st === 1) { c.globalAlpha = 0.5; c.strokeStyle = '#ff3d3d'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * 150, e.y + e.dy * 150); c.stroke(); c.globalAlpha = 1; }
    const spr = enemySprite(e.type, e.elite), fr = spr.frames[(e.anim | 0) & 1];
    c.drawImage(e.face < 0 ? fr.f : fr.n, e.x - spr.half, e.y - spr.half, spr.half * 2, spr.half * 2);
    if (e.flash > 0) { c.globalAlpha = 0.6; c.drawImage(e.face < 0 ? fr.wf : fr.w, e.x - spr.half, e.y - spr.half, spr.half * 2, spr.half * 2); c.globalAlpha = 1; }
    if (e.elite) { const w = e.r * 2; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2, e.y - e.r - 10, w, 4); c.fillStyle = '#ffd25e'; c.fillRect(e.x - w / 2, e.y - e.r - 10, w * Math.max(0, e.hp / e.maxHp), 4); }
  }

  // player
  if (!P.dead) {
    c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, P.x, P.y + 12, 11, 4); c.fill();
    const fr = PLAYER_SPR.frames[P.moving ? (P.anim | 0) & 1 : 0], red = P.hurtT > 0;
    const img = P.side < 0 ? (red ? fr.wf : fr.f) : (red ? fr.w : fr.n), h = PLAYER_SPR.half;
    c.drawImage(img, P.x - h, P.y - h - 2, h * 2, h * 2);
    const hw = 16; c.fillStyle = 'rgba(0,0,0,.65)'; c.fillRect(P.x - hw - 1, P.y + 17, hw * 2 + 2, 5);
    c.fillStyle = P.hp / P.st.maxHp < 0.3 ? '#ff5e6c' : '#ff3d5a'; c.fillRect(P.x - hw, P.y + 18, hw * 2 * Math.max(0, P.hp / P.st.maxHp), 3);
  }

  // weapons and effects (additive)
  c.globalCompositeOperation = 'lighter';
  for (const w of P.weapons) if ((w.id === 'drones' && w.on > 0) || w.id === 'halo') {
    const s = w.st, n = Math.max(1, s.amount), R0 = 70 * s.area, dr = 11 * Math.sqrt(s.area), col = WEAPONS[w.id].color;
    for (let i = 0; i < n; i++) {
      const a = w.ang + i * TAU / n, x = P.x + Math.cos(a) * R0, y = P.y + Math.sin(a) * R0;
      c.globalAlpha = 0.7; c.drawImage(glow(col), x - dr * 2.2, y - dr * 2.2, dr * 4.4, dr * 4.4);
      c.globalAlpha = 1; c.fillStyle = '#e8fff0'; circ(c, x, y, dr * 0.45); c.fill();
      c.strokeStyle = col; c.lineWidth = 2; circ(c, x, y, dr * 0.8); c.stroke();
    }
  }
  for (const p of PR) {
    if (!vis(p.x, p.y, 20)) continue;
    if (p.kind === 'bolt') {
      c.globalAlpha = 0.9; c.drawImage(glow(p.col), p.x - 12, p.y - 12, 24, 24);
      c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); c.lineTo(p.x, p.y); c.stroke();
    } else {
      c.globalAlpha = 0.8; c.drawImage(glow('#ff9a5e'), p.x - Math.cos(p.a) * 8 - 9, p.y - Math.sin(p.a) * 8 - 9, 18, 18);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      const s = PICK.missile; c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.drawImage(s.img, -s.half, -s.half, s.half * 2, s.half * 2); c.restore();
      c.globalCompositeOperation = 'lighter';
    }
  }
  c.globalAlpha = 1;
  for (const m of LOBS) { const t = m.t / m.T, x = lerp(m.x0, m.x1, t), y = lerp(m.y0, m.y1, t) - Math.sin(t * Math.PI) * 40, s = PICK.mine; c.drawImage(s.img, x - s.half, y - s.half, s.half * 2, s.half * 2); }
  for (const s of FX.slashes) {
    const p = 1 - s.life / s.max; c.save(); c.translate(s.x, s.y); c.scale(s.side, 1); c.globalAlpha = (1 - p) * 0.95;
    c.beginPath(); c.ellipse(0, 0, s.w / 2, s.h / 2, 0, Math.PI, 0); c.ellipse(0, s.h * 0.22, s.w / 2 * 0.92, s.h * 0.3, 0, 0, Math.PI, true); c.closePath();
    const g = c.createLinearGradient(-s.w / 2, 0, s.w / 2, 0); g.addColorStop(0, rgba(s.col, 0)); g.addColorStop(Math.min(0.95, 0.3 + p * 0.6), s.col); g.addColorStop(1, '#ffffff');
    c.fillStyle = g; c.fill(); c.restore();
  }
  c.lineCap = 'round';
  for (const b of FX.beams) {
    const a = b.life / b.max; c.globalAlpha = a * 0.6; c.strokeStyle = b.col; c.lineWidth = b.w * (0.6 + 0.4 * a);
    c.beginPath(); c.moveTo(b.x1, b.y1); c.lineTo(b.x2, b.y2); c.stroke();
    c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = b.w * 0.3 * a + 1; c.stroke();
  }
  for (const b of FX.bolts) {
    const a = b.life / b.max; c.beginPath(); c.moveTo(b.pts[0], b.pts[1]); for (let i = 2; i < b.pts.length; i += 2) c.lineTo(b.pts[i], b.pts[i + 1]);
    c.globalAlpha = a * 0.6; c.strokeStyle = b.col; c.lineWidth = 6; c.stroke(); c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 1.8; c.stroke();
  }
  for (const b of EB) { if (!vis(b.x, b.y, 10)) continue; c.globalAlpha = 0.9; c.drawImage(glow(b.col), b.x - 13, b.y - 13, 26, 26); c.globalAlpha = 1; c.fillStyle = '#ffffff'; circ(c, b.x, b.y, 3); c.fill(); }
  for (const r of FX.rings) {
    const p = 1 - r.life / r.max;
    if (r.flash) { c.globalAlpha = (1 - p) * 0.45; c.drawImage(glow(r.col), r.x - r.r * 1.6, r.y - r.r * 1.6, r.r * 3.2, r.r * 3.2); continue; }
    c.globalAlpha = (1 - p) * 0.9; c.strokeStyle = r.col; c.lineWidth = r.w * (1 - p) + 0.5; circ(c, r.x, r.y, r.r * (0.35 + 0.65 * p)); c.stroke();
  }
  for (const p of FX.parts) {
    if (!vis(p.x, p.y, 4)) continue;
    c.globalAlpha = p.smoke ? p.life / p.max * 0.25 : p.life / p.max; c.fillStyle = p.col; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;

  // numbers and text
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '700 10px "Chakra Petch", sans-serif';
  for (const n of FX.nums) { c.globalAlpha = Math.min(1, n.life * 3); c.fillStyle = '#000'; c.fillText(n.v, n.x + 0.8, n.y + 0.8); c.fillStyle = '#fff'; c.fillText(n.v, n.x, n.y); }
  c.font = '700 13px "Chakra Petch", sans-serif';
  for (const t of FX.texts) { c.globalAlpha = Math.min(1, t.life * 2); c.fillStyle = '#000'; c.fillText(t.s, t.x + 1, t.y + 1); c.fillStyle = t.col; c.fillText(t.s, t.x, t.y); }
  c.globalAlpha = 1;

  // screen space: arrows to off-screen chests and bosses, EMP flash
  c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
  const sw = v.W / v.dpr, sh = v.H / v.dpr;
  const arrow = (x, y, col, size) => {
    const sx = (x - cx) * v.s + sw / 2, sy = (y - cy) * v.s + sh / 2;
    if (sx > 0 && sx < sw && sy > 0 && sy < sh) return;
    const m = 26, ax = clamp(sx, m, sw - m), ay = clamp(sy, m + 40, sh - m), a = Math.atan2(sy - sh / 2, sx - sw / 2);
    c.save(); c.translate(ax, ay); c.rotate(a); c.fillStyle = col; c.globalAlpha = 0.6 + 0.4 * Math.sin(G.t * 6);
    poly(c, [size, 0, -size * 0.7, -size * 0.7, -size * 0.3, 0, -size * 0.7, size * 0.7]); c.fill(); c.restore();
  };
  for (const it of ITEMS) if (it.kind === 'chest') arrow(it.x, it.y, '#ffd25e', 12);
  for (const e of E) if (e.boss && !e.dead) arrow(e.x, e.y, '#ff5e6c', 16);
  c.globalAlpha = 1;
  if (G.empFlash > 0) { c.fillStyle = `rgba(190,230,255,${G.empFlash * 0.5})`; c.fillRect(0, 0, sw, sh); }
}

function drawBoss(c, e) {
  c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, e.x, e.y + e.r * 0.85, e.r * 0.9, e.r * 0.3); c.fill();
  if (e.busy === 'wind') { c.globalAlpha = 0.25 + 0.2 * Math.sin(G.t * 30); c.strokeStyle = '#ff3d3d'; c.lineWidth = e.r * 1.4; c.lineCap = 'butt'; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * 420, e.y + e.dy * 420); c.stroke(); c.globalAlpha = 1; }
  const draw = BOSS_DRAW[e.def.shape];
  if (draw) {
    c.save(); c.translate(e.x, e.y); draw(c, e.r, G.t, e.def, e.a); c.restore();
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.drawImage(glow('#ffffff'), e.x - e.r, e.y - e.r, e.r * 2, e.r * 2); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  } else {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.4; c.drawImage(glow(e.def.c3), e.x - e.r * 2.2, e.y - e.r * 2.2, e.r * 4.4, e.r * 4.4); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    const spr = enemySprite(e.type), fr = spr.frames[(e.anim | 0) & 1];
    c.drawImage(e.face < 0 ? fr.f : fr.n, e.x - spr.half, e.y - spr.half, spr.half * 2, spr.half * 2);
    if (e.flash > 0) { c.globalAlpha = 0.5; c.drawImage(e.face < 0 ? fr.wf : fr.w, e.x - spr.half, e.y - spr.half, spr.half * 2, spr.half * 2); c.globalAlpha = 1; }
  }
}
