// Signal Front — map renderer: camera, terrain layers, units, range overlays, cursor and effects

const R = {
  cv: null, ctx: null, dpr: 1, W: 0, H: 0, zoom: 3, cam: { x: 0, y: 0 }, camTo: null,
  frame: 0, seaFrame: 0, t: 0, shake: 0,
  over: null,      // { tiles: Uint8Array, kind: 'move'|'attack'|'threat' }
  over2: null,     // secondary overlay (attack fringe while moving)
  path: null,      // [{x,y}]
  cursor: null,    // {x,y}
  targets: null,   // [{x,y}]
  hideUnit: null,  // unit id hidden while it animates
  insets: { top: 56, bottom: 52, left: 0, right: 0 },
};
const FX = [];

function renderInit() {
  R.cv = $('#c');
  R.ctx = R.cv.getContext('2d');
  window.addEventListener('resize', resize);
  resize();
}
function resize() {
  R.dpr = Math.min(window.devicePixelRatio || 1, 3);
  R.W = Math.round(innerWidth * R.dpr); R.H = Math.round(innerHeight * R.dpr);
  R.cv.width = R.W; R.cv.height = R.H;
  if (S) fitZoom(false);
}
// Choose a zoom so tiles are comfortably big; integer device pixels per art pixel keeps it crisp.
function fitZoom(reset) {
  const target = (isTouch ? 34 : 44) * R.dpr;
  let z = Math.max(1, Math.round(target / T));
  // grow to fill the screen when the whole map fits, up to two steps past the comfortable size
  if (S) {
    const fw = viewW() / ((S.w + 0.4) * T), fh = viewH() / ((S.h + 0.35) * T);
    // phones in portrait: fill the height and pan sideways
    const fit = Math.floor(isTouch && viewH() > viewW() ? fh : Math.min(fw, fh));
    if (fit > z) z = Math.min(fit, z + 2);
  }
  if (reset || !R.userZoom) R.zoom = z;
  clampCam();
}
function setZoom(dz, cx, cy) {
  const old = R.zoom;
  const nz = clamp(old + dz, Math.max(1, Math.round(16 * R.dpr / T)), Math.round(96 * R.dpr / T));
  if (nz === old) return;
  // keep the point under (cx,cy) fixed
  const wx = R.cam.x + (cx - viewOX()) / old, wy = R.cam.y + (cy - viewOY()) / old;
  R.zoom = nz; R.userZoom = true;
  R.cam.x = wx - (cx - viewOX()) / nz; R.cam.y = wy - (cy - viewOY()) / nz;
  R.camTo = null;
  clampCam();
}
const viewOX = () => R.insets.left * R.dpr;
const viewOY = () => R.insets.top * R.dpr;
const viewW = () => R.W - (R.insets.left + R.insets.right) * R.dpr;
const viewH = () => R.H - (R.insets.top + R.insets.bottom) * R.dpr;

function clampCam() {
  if (!S) return;
  const mw = S.w * T, mh = S.h * T, vw = viewW() / R.zoom, vh = viewH() / R.zoom;
  const pad = 8;
  if (mw <= vw) R.cam.x = (mw - vw) / 2; else R.cam.x = clamp(R.cam.x, -pad, mw - vw + pad);
  if (mh + 4 <= vh) R.cam.y = (mh - vh) / 2 - 2; else R.cam.y = clamp(R.cam.y, -pad - 4, mh - vh + pad);
}
function centerOn(x, y, instant) {
  const vw = viewW() / R.zoom, vh = viewH() / R.zoom;
  const tx = x * T + T / 2 - vw / 2, ty = y * T + T / 2 - vh / 2;
  const save = { x: R.cam.x, y: R.cam.y };
  R.cam.x = tx; R.cam.y = ty; clampCam();
  const dest = { x: R.cam.x, y: R.cam.y };
  if (!instant && !TIME.fast) { R.cam.x = save.x; R.cam.y = save.y; R.camTo = dest; }
  else R.camTo = null;
}
// Pan only if the tile is near or beyond the view edge.
function ensureVisible(x, y, margin = 2) {
  const vw = viewW() / R.zoom, vh = viewH() / R.zoom;
  const px0 = x * T, py0 = y * T, m = margin * T;
  const c = R.camTo || R.cam;
  if (px0 - m < c.x || px0 + T + m > c.x + vw || py0 - m < c.y || py0 + T + m > c.y + vh) centerOn(x, y);
}
function screenToTile(sx, sy) {
  const ax = (sx * R.dpr - viewOX() - Math.round(-R.cam.x * R.zoom)) / R.zoom;
  const ay = (sy * R.dpr - viewOY() - Math.round(-R.cam.y * R.zoom)) / R.zoom;
  return { x: Math.floor(ax / T), y: Math.floor(ay / T) };
}
function tileToScreen(x, y) {
  return {
    x: (viewOX() + Math.round(-R.cam.x * R.zoom) + x * T * R.zoom) / R.dpr,
    y: (viewOY() + Math.round(-R.cam.y * R.zoom) + y * T * R.zoom) / R.dpr,
    s: T * R.zoom / R.dpr,
  };
}

function maskOf(S, x, y, test) {
  let m = 0;
  const t = (dx, dy) => { const nx = x + dx, ny = y + dy; return inb(S, nx, ny) ? test(tileAt(S, nx, ny).k) : null; };
  if (t(1, 0)) m |= 1; if (t(-1, 0)) m |= 2; if (t(0, 1)) m |= 4; if (t(0, -1)) m |= 8;
  return m;
}
const isLandK = (k) => k !== 'sea' && k !== 'reef' && k !== 'shoal';
const roadish = (k) => k === 'road' || k === 'bridge' || k === 'hq' || k === 'base';
const riverish = (k) => k === 'river' || k === 'bridge' || k === 'sea';

function tileImage(S, x, y) {
  const k = tileAt(S, x, y).k;
  let mask = 0;
  if (k === 'sea' || k === 'reef') mask = maskOf(S, x, y, (n) => isLandK(n) && n !== 'port');
  else if (k === 'shoal') mask = maskOf(S, x, y, (n) => n === 'sea' || n === 'reef');
  else if (k === 'road') mask = maskOf(S, x, y, roadish);
  else if (k === 'river') mask = maskOf(S, x, y, riverish);
  else if (k === 'bridge') mask = maskOf(S, x, y, roadish) | (maskOf(S, x, y, riverish) << 4);
  const anim = k === 'sea' || k === 'reef' || k === 'river' || k === 'bridge' || k === 'shoal';
  return terrainTile(k === 'port' ? 'plain' : k, x, y, mask, anim ? R.seaFrame : 0);
}

// ---------------- pixel digits for HP ----------------
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
function drawDigit(c, n, x, y, col) {
  const g = DIG[n];
  c.fillStyle = '#000';
  c.fillRect(x - 1, y - 1, 5, 7);
  c.fillStyle = col;
  for (let i = 0; i < 15; i++) if (g[i] === '1') c.fillRect(x + (i % 3), y + ((i / 3) | 0), 1, 1);
}

function unitVisual(u) {
  const a = u.anim;
  return a ? { x: a.x, y: a.y } : { x: u.x, y: u.y };
}

function render(dt) {
  R.t += dt;
  R.frame = Math.floor(R.t * 3.2) % 2;
  R.seaFrame = Math.floor(R.t * 1.6) % 4;
  const c = R.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#10141c'; c.fillRect(0, 0, R.W, R.H);
  if (!S) return;
  if (R.camTo) {
    const k = 1 - Math.pow(0.0005, dt);
    R.cam.x = lerp(R.cam.x, R.camTo.x, k); R.cam.y = lerp(R.cam.y, R.camTo.y, k);
    if (Math.abs(R.cam.x - R.camTo.x) < 0.3 && Math.abs(R.cam.y - R.camTo.y) < 0.3) { R.cam.x = R.camTo.x; R.cam.y = R.camTo.y; R.camTo = null; }
  }
  let sx = 0, sy = 0;
  if (R.shake > 0) { R.shake = Math.max(0, R.shake - dt * 30); sx = (Math.random() - 0.5) * R.shake; sy = (Math.random() - 0.5) * R.shake; }
  const z = R.zoom;
  const ox = viewOX() + Math.round((-R.cam.x + sx) * z), oy = viewOY() + Math.round((-R.cam.y + sy) * z);
  c.setTransform(z, 0, 0, z, ox, oy);
  const x0 = Math.max(0, Math.floor(R.cam.x / T) - 1), y0 = Math.max(0, Math.floor(R.cam.y / T) - 1);
  const x1 = Math.min(S.w - 1, Math.ceil((R.cam.x + viewW() / z) / T) + 1), y1 = Math.min(S.h - 1, Math.ceil((R.cam.y + viewH() / z) / T) + 2);
  // map border
  c.fillStyle = '#0a0d12'; c.fillRect(-3, -3, S.w * T + 6, S.h * T + 6);
  const viewer = viewSide();
  const vis = visMap(S, viewer);
  // base terrain
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    c.drawImage(tileImage(S, x, y), x * T, y * T);
    const k = tileAt(S, x, y).k;
    if (k === 'port') { // port sits on a quay: draw water edge
      c.fillStyle = TC.water; c.fillRect(x * T, y * T + 12, T, 4);
      c.fillStyle = TC.foam; c.fillRect(x * T, y * T + 12, T, 1);
    }
  }
  // tall layer: forests, mountains, properties, row by row
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = tileAt(S, x, y);
    if (t.k === 'forest' || t.k === 'mount') c.drawImage(tallTile(t.k, x, y), x * T, y * T - 4);
    else if (TER[t.k].prop) c.drawImage(propSprite(t.k, t.o), x * T, y * T - 4);
  }
  // fog
  if (S.fog) {
    c.fillStyle = 'rgba(8,10,24,0.42)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!vis[y * S.w + x]) c.fillRect(x * T, y * T, T, T);
  }
  // overlays
  drawOverlay(c, R.over2, x0, y0, x1, y1);
  drawOverlay(c, R.over, x0, y0, x1, y1);
  if (R.path) drawPath(c, R.path);
  // capture progress markers
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = tileAt(S, x, y);
    if (TER[t.k].prop && t.cp < 20) {
      c.fillStyle = '#000'; c.fillRect(x * T + 1, y * T - 5, 14, 3);
      c.fillStyle = '#ffd23a'; c.fillRect(x * T + 2, y * T - 4, Math.round(12 * (20 - t.cp) / 20), 1);
    }
  }
  // units sorted by row
  const list = S.units.filter((u) => u.id !== R.hideUnit && canSee(S, viewer, u))
    .sort((a, b) => unitVisual(a).y - unitVisual(b).y);
  for (const u of list) drawUnit(c, u);
  // cursor & targets
  if (R.targets) for (const t of R.targets) drawBrackets(c, t.x, t.y, '#ff5a4a', 1 + Math.round(Math.sin(R.t * 8)));
  if (R.cursor && !isTouch) drawBrackets(c, R.cursor.x, R.cursor.y, '#fff6c8', Math.round(Math.sin(R.t * 6) + 1));
  if (R.cursor && isTouch && R.showCursor) drawBrackets(c, R.cursor.x, R.cursor.y, '#fff6c8', 1);
  // effects
  drawFX(c, dt);
}

function drawOverlay(c, o, x0, y0, x1, y1) {
  if (!o) return;
  const col = o.kind === 'move' ? 'rgba(90,170,255,0.42)' : o.kind === 'threat' ? 'rgba(255,150,40,0.36)' : 'rgba(255,70,60,0.42)';
  const edge = o.kind === 'move' ? 'rgba(200,236,255,0.7)' : o.kind === 'threat' ? 'rgba(255,220,140,0.6)' : 'rgba(255,190,180,0.7)';
  const pulse = 0.85 + Math.sin(R.t * 4) * 0.15;
  c.globalAlpha = pulse;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!o.tiles[y * S.w + x]) continue;
    c.fillStyle = col; c.fillRect(x * T, y * T, T, T);
    c.fillStyle = edge;
    const on = (dx, dy) => inb(S, x + dx, y + dy) && o.tiles[(y + dy) * S.w + x + dx];
    if (!on(0, -1)) c.fillRect(x * T, y * T, T, 1);
    if (!on(0, 1)) c.fillRect(x * T, y * T + T - 1, T, 1);
    if (!on(-1, 0)) c.fillRect(x * T, y * T, 1, T);
    if (!on(1, 0)) c.fillRect(x * T + T - 1, y * T, 1, T);
  }
  c.globalAlpha = 1;
}

function drawPath(c, p) {
  if (p.length < 2) return;
  c.fillStyle = '#ffffff';
  const sh = '#1b4a8a';
  for (let pass = 0; pass < 2; pass++) {
    c.fillStyle = pass ? '#fff4c0' : sh;
    const w = pass ? 4 : 6, o = (T - w) / 2;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      const xA = Math.min(a.x, b.x) * T + o, yA = Math.min(a.y, b.y) * T + o;
      const ww = a.x !== b.x ? T + w : w, hh = a.y !== b.y ? T + w : w;
      c.fillRect(xA, yA, ww, hh);
    }
  }
  // arrow head
  const L = p[p.length - 1], P = p[p.length - 2];
  const dx = L.x - P.x, dy = L.y - P.y, cx = L.x * T + 8, cy = L.y * T + 8;
  c.fillStyle = '#fff4c0';
  for (let i = 0; i < 4; i++) {
    if (dx) c.fillRect(cx + dx * (2 - i) - (dx < 0 ? 1 : 0), cy - i - 1, 1, i * 2 + 2);
    else c.fillRect(cx - i - 1, cy + dy * (2 - i) - (dy < 0 ? 1 : 0), i * 2 + 2, 1);
  }
}

function drawBrackets(c, x, y, col, o) {
  const X0 = x * T - o, Y0 = y * T - o, X1 = x * T + T - 1 + o, Y1 = y * T + T - 1 + o, L = 4;
  const corner = (cx, cy, sx, sy) => {
    const hx = sx > 0 ? cx : cx - L + 1, vy = sy > 0 ? cy : cy - L + 1;
    c.fillStyle = '#000'; c.fillRect(hx - 1, cy - 1, L + 2, 3); c.fillRect(cx - 1, vy - 1, 3, L + 2);
    c.fillStyle = col; c.fillRect(hx, cy, L, 1); c.fillRect(cx, vy, 1, L);
  };
  corner(X0, Y0, 1, 1); corner(X1, Y0, -1, 1); corner(X0, Y1, 1, -1); corner(X1, Y1, -1, -1);
}

function drawUnit(c, u) {
  const v = unitVisual(u);
  const airU = isAir(u.t), naval = isNaval(u.t);
  const bob = airU ? (Math.sin(R.t * 3 + u.id) > 0 ? 1 : 0) : 0;
  const X = Math.round(v.x * T), Y = Math.round(v.y * T);
  if (airU) { c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(X + 4, Y + 13, 8, 2); c.fillRect(X + 5, Y + 12, 6, 1); }
  const grey = u.done && u.s === S.turn && !u.anim;
  const frame = (R.frame + (u.id % 2)) % 2;
  const spr = unitSprite(u.t, u.s, frame, grey);
  const flash = u.flash && u.flash > R.t;
  c.drawImage(spr, X, Y - (airU ? 4 : 0) - bob + (naval ? 1 : 0));
  if (flash) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7; c.drawImage(spr, X, Y - (airU ? 4 : 0) - bob); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  if (naval) { c.fillStyle = TC.foam; c.fillRect(X + 1 + R.frame, Y + 12, 13, 1); }
  const hp = disp(u.vhp != null ? u.vhp : u.hp);
  if (hp < 10 && hp > 0) drawDigit(c, hp, X + 12, Y + 10, '#ffffff');
  // status pips (bottom-left): capture, low supply, cargo
  let px0 = X + 1;
  const pip = (col, ch) => {
    c.fillStyle = '#000'; c.fillRect(px0 - 1, Y + 9, 6, 7);
    c.fillStyle = col; c.fillRect(px0, Y + 10, 4, 5);
    if (ch === 'c') { c.fillStyle = '#000'; c.fillRect(px0 + 1, Y + 11, 1, 3); c.fillRect(px0 + 2, Y + 11, 1, 1); }
    px0 += 6;
  };
  if (u.cap) pip('#ffd23a', 'c');
  const U = UNITS[u.t];
  if ((u.fuel <= U.fuel * 0.25 || (U.w1 && u.ammo === 0 && !U.w2)) && R.frame) pip('#ff5040');
  if (u.cargo && u.cargo.length) pip('#6ff3ff');
}

// ---------------- effects ----------------
function fxAdd(e) { if (TIME.fast) return e; e.t0 = R.t; FX.push(e); return e; }
function drawFX(c, dt) {
  void dt;
  for (let i = FX.length - 1; i >= 0; i--) {
    const e = FX[i], k = (R.t - e.t0) / e.dur;
    if (k >= 1) { FX.splice(i, 1); continue; }
    FXDRAW[e.type](c, e, k);
  }
}
const FXDRAW = {
  boom(c, e, k) {
    const r = 2 + k * (e.big ? 10 : 7);
    const cols = ['#fff7d0', '#ffd23a', '#ff8a30', '#d04020', '#5a5a5a'];
    const col = cols[Math.min(4, Math.floor(k * 5))];
    c.fillStyle = col;
    pixelCircle(c, e.x, e.y, r * (k < 0.6 ? 1 : 1 - (k - 0.6)), true);
    if (k > 0.3) { c.fillStyle = 'rgba(70,70,70,' + (1 - k) + ')'; pixelCircle(c, e.x + 3, e.y - k * 8, r * 0.5, true); }
  },
  flash(c, e, k) { c.fillStyle = k < 0.5 ? '#fff7c0' : '#ffb040'; const s = Math.round(4 - k * 3); c.fillRect(Math.round(e.x - s / 2), Math.round(e.y - s / 2), s, s); },
  shot(c, e, k) {
    const x = lerp(e.x0, e.x1, k), y = lerp(e.y0, e.y1, k) - Math.sin(k * Math.PI) * (e.arc || 0);
    c.fillStyle = e.col || '#fff4b0'; c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    if (e.trail) { c.fillStyle = 'rgba(220,220,220,0.6)'; const x2 = lerp(e.x0, e.x1, Math.max(0, k - 0.08)), y2 = lerp(e.y0, e.y1, Math.max(0, k - 0.08)) - Math.sin(Math.max(0, k - 0.08) * Math.PI) * (e.arc || 0); c.fillRect(Math.round(x2) - 1, Math.round(y2) - 1, 2, 2); }
  },
  text(c, e, k) {
    c.save();
    c.font = '8px "Press Start 2P", monospace'; c.textAlign = 'center';
    const y = e.y - k * 10;
    c.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
    c.fillStyle = '#000'; c.fillText(e.s, e.x + 1, y + 1);
    c.fillStyle = e.col || '#fff'; c.fillText(e.s, e.x, y);
    c.restore();
  },
  ring(c, e, k) {
    c.strokeStyle = e.col || '#6ff3ff'; c.globalAlpha = 1 - k; c.lineWidth = 1;
    const r = Math.round(2 + k * (e.r || 14));
    pixelCircle(c, e.x, e.y, r, false);
    c.globalAlpha = 1;
  },
  spark(c, e, k) {
    c.fillStyle = e.col || '#7dffb0';
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + e.x; c.fillRect(Math.round(e.x + Math.cos(a) * 6), Math.round(e.y + Math.sin(a) * 4 - k * 10), 1, 2); }
  },
  beam(c, e, k) {
    c.fillStyle = 'rgba(255,240,170,' + (1 - k) + ')';
    c.fillRect(e.x - 3 + k * 2, -200, 6 - k * 4, e.y + 200);
  },
};
function pixelCircle(c, cx, cy, r, fill) {
  r = Math.max(1, Math.round(r));
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    if (fill) c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    else { c.fillRect(Math.round(cx - w), Math.round(cy + y), 1, 1); c.fillRect(Math.round(cx + w), Math.round(cy + y), 1, 1); }
  }
}
const tileCenter = (x, y) => ({ x: x * T + 8, y: y * T + 8 });
