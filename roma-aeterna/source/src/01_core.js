// Roma Aeterna — shared helpers: math, seeded RNG, noise, events, local frames, input (keyboard, mouse, touch, gamepad)

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s) => document.querySelector(s);
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3;
const _v1 = new V3(), _v2 = new V3();
const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
function angTo(a, b, step) { const d = angWrap(b - a); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; }
const D2R = Math.PI / 180;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// The city is the same every time: one world RNG, reseeded per area so editing one area doesn't reshuffle the rest.
let RNG = mulberry32(125);
const rseed = (s) => { RNG = mulberry32(strSeed(s)); };
const rnd = (a = 0, b = 1) => a + (b - a) * RNG();
const rint = (a, b) => Math.floor(a + (b - a + 1) * RNG());
const rpick = (arr) => arr[Math.floor(RNG() * arr.length)];
const chance = (p) => RNG() < p;
const frand = (a, b) => a + (b - a) * Math.random();
const fpick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function hash2(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// pick from weighted [[w, value], ...]
function wpick(list, r = RNG()) {
  let s = 0; for (const e of list) s += e[0];
  let t = r * s; for (const e of list) { t -= e[0]; if (t <= 0) return e[1]; }
  return list[list.length - 1][1];
}

// ---------- 2D simplex noise ----------
const Noise = (() => {
  const perm = new Uint8Array(512), grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  (function seed(s) {
    const r = mulberry32(s), p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })(753);
  function s2(xin, yin) {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, tt;
    tt = 0.5 - x0 * x0 - y0 * y0; if (tt > 0) { const g = grad[perm[ii + perm[jj]] & 7]; tt *= tt; n += tt * tt * (g[0] * x0 + g[1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1; if (tt > 0) { const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x1 + g[1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2; if (tt > 0) { const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  }
  function fbm(x, z, oct, lac = 2.03, gain = 0.5) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += s2(x * f + i * 19.1, z * f - i * 7.7) * a; n += a; a *= gain; f *= lac; }
    return s / n;
  }
  return { s2, fbm };
})();

// ---------- events ----------
const bus = (() => {
  const m = {};
  return {
    on(n, f) { (m[n] = m[n] || []).push(f); },
    emit(n, ...a) { const l = m[n]; if (l) for (const f of l) f(...a); },
  };
})();

// ---------- local frames ----------
// A frame maps local (u, v) to world (x, z): u runs along the frame's angle, v 90° clockwise from it (seen from above,
// with north = -z). Every building is authored in its own frame, so "the long axis of the Forum" is just +u.
class Frame {
  constructor(x, z, ang = 0, y = 0) { this.x = x; this.z = z; this.y = y; this.set(ang); }
  set(ang) { this.ang = ang; this.c = Math.cos(ang); this.s = Math.sin(ang); return this; }
  wx(u, v) { return this.x + u * this.c - v * this.s; }
  wz(u, v) { return this.z + u * this.s + v * this.c; }
  lu(x, z) { const dx = x - this.x, dz = z - this.z; return dx * this.c + dz * this.s; }
  lv(x, z) { const dx = x - this.x, dz = z - this.z; return -dx * this.s + dz * this.c; }
  sub(u, v, ang = 0, y = this.y) { return new Frame(this.wx(u, v), this.wz(u, v), this.ang + ang, y); }
  // yaw (three.js rotation.y) that makes a model's +z axis point along local +v ... used for instanced props
  get yaw() { return -this.ang; }
  // model yaw (forward +z) that faces the local direction (a, b)
  yawOf(a, b) { return Math.atan2(a * this.c - b * this.s, a * this.s + b * this.c); }
}
// yaw for a model whose forward is +z, to face world direction (dx, dz)
const yawTo = (dx, dz) => Math.atan2(dx, dz);

// ---------- input ----------
const Input = (() => {
  const down = {}, hit = new Set(), up = new Set();
  const m = { dx: 0, dy: 0, wheel: 0, b: [false, false, false], hit: [false, false, false], x: 0, y: 0 };
  // analogue state shared by touch and gamepad: move (-1..1), look delta (radians-ish), buttons as pseudo key codes
  const an = { mx: 0, mz: 0, lx: 0, ly: 0, run: false };
  let locked = false, typing = false;
  const canvas = () => document.getElementById('c');
  addEventListener('keydown', (e) => {
    if (typing || (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT'))) return;
    if (!down[e.code]) hit.add(e.code);
    down[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'AltLeft', 'AltRight'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { down[e.code] = false; up.add(e.code); });
  addEventListener('blur', () => { for (const k in down) down[k] = false; m.b[0] = m.b[1] = m.b[2] = false; });
  addEventListener('mousemove', (e) => { if (locked) { m.dx += e.movementX; m.dy += e.movementY; } m.x = e.clientX; m.y = e.clientY; });
  addEventListener('mousedown', (e) => { if (!locked) return; m.b[e.button] = true; m.hit[e.button] = true; e.preventDefault(); });
  addEventListener('mouseup', (e) => { m.b[e.button] = false; });
  addEventListener('wheel', (e) => { if (locked) { m.wheel += Math.sign(e.deltaY); } }, { passive: true });
  addEventListener('contextmenu', (e) => { if (locked || e.target === canvas()) e.preventDefault(); });
  document.addEventListener('pointerlockchange', () => {
    const was = locked; locked = document.pointerLockElement === canvas();
    if (!locked) { m.b[0] = m.b[1] = m.b[2] = false; }
    bus.emit('lock', locked, was);
  });

  // ----- touch: left half = movement stick, right half = look drag, plus on-screen buttons (wired in the HUD) -----
  const touch = { on: false, stick: null, look: null };
  function touchStart(e) {
    if (!touch.on) return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('.tbtn, .panel, button, #dlg, #placard, #mapView')) continue;
      if (t.clientX < innerWidth * 0.42 && !touch.stick) { touch.stick = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY }; bus.emit('stick', touch.stick); }
      else if (!touch.look) touch.look = { id: t.identifier, x: t.clientX, y: t.clientY };
      e.preventDefault();
    }
  }
  function touchMove(e) {
    if (!touch.on) return;
    for (const t of e.changedTouches) {
      if (touch.stick && t.identifier === touch.stick.id) {
        touch.stick.x = t.clientX; touch.stick.y = t.clientY;
        const dx = t.clientX - touch.stick.x0, dy = t.clientY - touch.stick.y0, l = Math.hypot(dx, dy), R = 56;
        const k = l > R ? R / l : 1;
        an.mx = (dx * k) / R; an.mz = (dy * k) / R; an.run = l > R * 1.25;
        bus.emit('stick', touch.stick); e.preventDefault();
      } else if (touch.look && t.identifier === touch.look.id) {
        an.lx += (t.clientX - touch.look.x) * 0.0055; an.ly += (t.clientY - touch.look.y) * 0.0055;
        touch.look.x = t.clientX; touch.look.y = t.clientY; e.preventDefault();
      }
    }
  }
  function touchEnd(e) {
    for (const t of e.changedTouches) {
      if (touch.stick && t.identifier === touch.stick.id) { touch.stick = null; an.mx = an.mz = 0; an.run = false; bus.emit('stick', null); }
      if (touch.look && t.identifier === touch.look.id) touch.look = null;
    }
  }
  addEventListener('touchstart', (e) => {
    if (!touch.on) { touch.on = true; bus.emit('touchmode'); }
    touchStart(e);
  }, { passive: false });
  addEventListener('touchmove', touchMove, { passive: false });
  addEventListener('touchend', touchEnd); addEventListener('touchcancel', touchEnd);

  // ----- gamepad (standard mapping) -----
  const pad = { on: false, prev: [] };
  const PADMAP = { 0: 'KeyE', 1: 'Escape', 2: 'KeyT', 3: 'KeyM', 9: 'Escape', 8: 'Tab', 12: 'ArrowUp', 13: 'ArrowDown' };
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) { if (pad.on) { pad.on = false; an.mx = an.mz = 0; } return; }
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
    const ax = gp.axes;
    if (!pad.on) { pad.on = true; bus.emit('padmode'); }
    if (!touch.stick) { an.mx = dz(ax[0] || 0); an.mz = dz(ax[1] || 0); }
    an.lx += dz(ax[2] || 0) * 0.045; an.ly += dz(ax[3] || 0) * 0.035;
    const b = gp.buttons;
    an.run = an.run && touch.stick ? true : !!((b[10] && b[10].pressed) || (b[6] && b[6].value > 0.4) || (b[7] && b[7].value > 0.4));
    for (const k in PADMAP) {
      const p = !!(b[k] && b[k].pressed), was = !!pad.prev[k];
      if (p && !was) { hit.add(PADMAP[k]); down[PADMAP[k]] = true; }
      if (!p && was) { down[PADMAP[k]] = false; up.add(PADMAP[k]); }
      pad.prev[k] = p;
    }
  }
  return {
    m, an, touch, pad, pollPad,
    down: (c) => !!down[c],
    hit: (c) => hit.has(c),
    up: (c) => up.has(c),
    get locked() { return locked; },
    lock() { const c = canvas(); if (touch.on) return; if (c && c.requestPointerLock) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } } },
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
    setTyping(v) { typing = v; },
    endFrame() { hit.clear(); up.clear(); m.dx = m.dy = 0; m.wheel = 0; m.hit[0] = m.hit[1] = m.hit[2] = false; an.lx = an.ly = 0; },
    press(c) { hit.add(c); down[c] = true; },
    release(c) { down[c] = false; up.add(c); },
  };
})();
