// The Time Apprentice — shared helpers: math, seeded RNG, events, input (keyboard, mouse, touch, gamepad)

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (s) => document.querySelector(s);
const DEBUG = location.hash.startsWith('#debug');
const V3 = THREE.Vector3;
const D2R = Math.PI / 180;
function angWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// *word* → <em>word</em>, after escaping
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const plain = (s) => String(s).replace(/\*/g, '');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// Sets are built the same way every time: each set reseeds the build RNG with its own name.
let RNG = mulberry32(1);
const rseed = (s) => { RNG = mulberry32(strSeed(s)); };
const rnd = (a = 0, b = 1) => a + (b - a) * RNG();
const rint = (a, b) => Math.floor(a + (b - a + 1) * RNG());
const rpick = (arr) => arr[Math.floor(RNG() * arr.length)];
const frand = (a, b) => a + (b - a) * Math.random();
const fpick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr, r = Math.random) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// smooth 2D value noise for terrain
function vnoise(x, z, s = 0) {
  const h = (i, j) => { let k = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(h(i, j), h(i + 1, j), u), lerp(h(i, j + 1), h(i + 1, j + 1), u), v) * 2 - 1;
}
function fbm(x, z, oct = 3, s = 0) { let a = 1, f = 1, n = 0, t = 0; for (let i = 0; i < oct; i++) { t += vnoise(x * f, z * f, s + i) * a; n += a; a *= 0.5; f *= 2.03; } return t / n; }

// ---------- events ----------
const bus = (() => {
  const m = {};
  return {
    on(n, f) { (m[n] = m[n] || []).push(f); },
    emit(n, ...a) { const l = m[n]; if (l) for (const f of l) f(...a); },
  };
})();

// ---------- input ----------
// Keyboard and mouse, plus touch (left-side stick, right-side look drag) and gamepads (standard mapping),
// which feed the same pseudo key codes so the rest of the game only asks Input.hit('KeyE') and friends.
const Input = (() => {
  const down = {}, hit = new Set(), up = new Set();
  const m = { dx: 0, dy: 0, b: [false, false, false], hit: [false, false, false] };
  const an = { mx: 0, mz: 0, lx: 0, ly: 0, run: false };
  let locked = false;
  const canvas = () => document.getElementById('c');
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (!down[e.code]) hit.add(e.code);
    down[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { down[e.code] = false; up.add(e.code); });
  addEventListener('blur', () => { for (const k in down) down[k] = false; m.b[0] = m.b[1] = m.b[2] = false; });
  addEventListener('mousemove', (e) => { if (locked) { m.dx += e.movementX; m.dy += e.movementY; } });
  addEventListener('mousedown', (e) => { if (!locked) return; m.b[e.button] = true; m.hit[e.button] = true; e.preventDefault(); });
  addEventListener('mouseup', (e) => { m.b[e.button] = false; });
  addEventListener('contextmenu', (e) => { if (locked || e.target === canvas()) e.preventDefault(); });
  document.addEventListener('pointerlockchange', () => {
    const was = locked; locked = document.pointerLockElement === canvas();
    if (!locked) m.b[0] = m.b[1] = m.b[2] = false;
    bus.emit('lock', locked, was);
  });

  // ----- touch -----
  const touch = { on: false, stick: null, look: null };
  const isUI = (t) => t.closest && t.closest('.ui, button, .tbtn');
  function touchStart(e) {
    for (const t of e.changedTouches) {
      if (isUI(t.target)) continue;
      if (t.clientX < innerWidth * 0.42 && !touch.stick) { touch.stick = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY }; bus.emit('stick', touch.stick); }
      else if (!touch.look) touch.look = { id: t.identifier, x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY, t0: performance.now() };
      e.preventDefault();
    }
  }
  function touchMove(e) {
    for (const t of e.changedTouches) {
      if (touch.stick && t.identifier === touch.stick.id) {
        touch.stick.x = t.clientX; touch.stick.y = t.clientY;
        const dx = t.clientX - touch.stick.x0, dy = t.clientY - touch.stick.y0, l = Math.hypot(dx, dy), R = 56;
        const k = l > R ? R / l : 1;
        an.mx = (dx * k) / R; an.mz = (dy * k) / R; an.run = l > R * 1.3;
        bus.emit('stick', touch.stick); e.preventDefault();
      } else if (touch.look && t.identifier === touch.look.id) {
        an.lx += (t.clientX - touch.look.x) * 0.006; an.ly += (t.clientY - touch.look.y) * 0.006;
        touch.look.x = t.clientX; touch.look.y = t.clientY; e.preventDefault();
      }
    }
  }
  function touchEnd(e) {
    for (const t of e.changedTouches) {
      if (touch.stick && t.identifier === touch.stick.id) { touch.stick = null; an.mx = an.mz = 0; an.run = false; bus.emit('stick', null); }
      if (touch.look && t.identifier === touch.look.id) {
        // a quick tap on the right side acts like the interact button
        const tap = performance.now() - touch.look.t0 < 260 && Math.hypot(t.clientX - touch.look.x0, t.clientY - touch.look.y0) < 12;
        touch.look = null;
        if (tap) bus.emit('tap');
      }
    }
  }
  addEventListener('touchstart', (e) => {
    if (!touch.on) { touch.on = true; bus.emit('touchmode'); }
    touchStart(e);
  }, { passive: false });
  addEventListener('touchmove', touchMove, { passive: false });
  addEventListener('touchend', touchEnd); addEventListener('touchcancel', touchEnd);

  // ----- gamepad -----
  const pad = { on: false, prev: [] };
  // A = interact, B = back, X = second action, Y = journal, Start = pause, d-pad = arrows, bumpers = A/D lanes
  const PADMAP = { 0: 'KeyE', 1: 'KeyQ', 2: 'KeyF', 3: 'KeyJ', 9: 'Escape', 4: 'KeyZ', 5: 'KeyX', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) { if (pad.on) { pad.on = false; an.mx = an.mz = 0; } return; }
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    const ax = gp.axes;
    if (!pad.on) { pad.on = true; bus.emit('padmode'); }
    if (!touch.stick) { an.mx = dz(ax[0] || 0); an.mz = dz(ax[1] || 0); }
    an.lx += dz(ax[2] || 0) * 0.045; an.ly += dz(ax[3] || 0) * 0.035;
    const b = gp.buttons;
    if (!touch.stick) an.run = !!((b[10] && b[10].pressed) || (b[6] && b[6].value > 0.4) || (b[7] && b[7].value > 0.4));
    for (const k in PADMAP) {
      const p = !!(b[k] && b[k].pressed), was = !!pad.prev[k];
      if (p && !was) { hit.add(PADMAP[k]); down[PADMAP[k]] = true; }
      if (!p && was) { down[PADMAP[k]] = false; up.add(PADMAP[k]); }
      pad.prev[k] = p;
    }
  }
  const anyDown = (codes) => codes.some((c) => down[c]);
  const anyHit = (codes) => codes.some((c) => hit.has(c));
  return {
    m, an, touch, pad, pollPad, anyDown, anyHit,
    down: (c) => !!down[c],
    hit: (c) => hit.has(c),
    up: (c) => up.has(c),
    // the "do it" button: E, Space, Enter, gamepad A, or a left click while the pointer is locked
    action: () => anyHit(['KeyE', 'Space', 'Enter', 'NumpadEnter']) || m.hit[0],
    // -1..1 from arrows, WASD and the left stick
    axisX: () => clamp((anyDown(['ArrowRight', 'KeyD']) ? 1 : 0) - (anyDown(['ArrowLeft', 'KeyA']) ? 1 : 0) + an.mx, -1, 1),
    axisY: () => clamp((anyDown(['ArrowUp', 'KeyW']) ? 1 : 0) - (anyDown(['ArrowDown', 'KeyS']) ? 1 : 0) - an.mz, -1, 1),
    get locked() { return locked; },
    lock() {
      const c = canvas(); if (touch.on || DEBUG) return;
      if (c && c.requestPointerLock) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } }
    },
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
    endFrame() { hit.clear(); up.clear(); m.dx = m.dy = 0; m.hit[0] = m.hit[1] = m.hit[2] = false; an.lx = an.ly = 0; },
    press(c) { hit.add(c); down[c] = true; },
    release(c) { down[c] = false; up.add(c); },
    clear() { for (const k in down) down[k] = false; hit.clear(); up.clear(); },
  };
})();

// Game-time timers: promises that resolve after `sec` seconds of simulated time (so #debug sim() skips them too).
const Timers = {
  list: [],
  wait(sec) { return new Promise((res) => this.list.push({ t: sec, res })); },
  update(dt) {
    if (!this.list.length) return;
    const done = [];
    this.list = this.list.filter((w) => { w.t -= dt; if (w.t <= 0) { done.push(w.res); return false; } return true; });
    for (const r of done) r();
  },
  clear() { this.list = []; },
};
const wait = (sec) => Timers.wait(sec);
