// Tidebound: core. Canvas, RNG, input (keyboard, gamepad, touch), the scene stack, timers, fades,
// game state G, save/load and the debug registry. Every other file builds on these names.

const W = 320, H = 180, TILE = 16;
const DEBUG = location.hash.startsWith('#debug');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Offscreen canvas helper: makeCanvas(w, h, (c, g) => draw) returns the canvas
function makeCanvas(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (fn) fn(c, g);
  return c;
}

// ---------- RNG ----------
// Math.random by default; R.seed(n) switches to a seeded generator (tests use it).
const R = (() => {
  let f = Math.random;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  return {
    seed(n) { f = n == null ? Math.random : mulberry32(n); },
    float() { return f(); },
    int(a, b) { return a + Math.floor(f() * (b - a + 1)); },   // inclusive
    chance(p) { return f() < p; },
    pick(arr) { return arr[Math.floor(f() * arr.length)]; },
    weighted(list, wkey = 'w') {   // list of objects with a weight, or [item, weight] pairs
      const wt = (e) => (Array.isArray(e) ? e[e.length - 1] : e[wkey]);
      let tot = 0; for (const e of list) tot += wt(e);
      let r = f() * tot;
      for (const e of list) { r -= wt(e); if (r < 0) return e; }
      return list[list.length - 1];
    },
  };
})();

// ---------- input ----------
// Buttons: up down left right a b start select. Keyboard, gamepad and touch all feed the same set.
const Input = (() => {
  const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Space: 'a', KeyJ: 'a', Enter: 'a', NumpadEnter: 'a',
    KeyX: 'b', Backspace: 'b', KeyK: 'b', ShiftLeft: 'b', ShiftRight: 'b',
    Escape: 'start', Tab: 'start', KeyM: 'start', KeyP: 'start',
    KeyQ: 'select', KeyE: 'select',
  };
  const src = { key: {}, pad: {}, touch: {}, fake: {} };   // held state per source
  const held = {}, pressed = {}, rep = {};
  const order = [];   // direction press order: last one wins
  let anyPress = false;
  addEventListener('keydown', (e) => {
    const b = KEYS[e.code]; if (!b) return;
    e.preventDefault();
    src.key[b] = true;
    Audio_unlock();
  });
  addEventListener('keyup', (e) => { const b = KEYS[e.code]; if (b) { src.key[b] = false; e.preventDefault(); } });
  addEventListener('blur', () => { src.key = {}; src.touch = {}; });

  // touch: buttons with data-k and a 4-way dpad
  const touchRoot = document.getElementById('touch');
  function enableTouch() { document.body.classList.add('touch'); }
  addEventListener('touchstart', () => { enableTouch(); Audio_unlock(); }, { passive: true });
  if (matchMedia('(pointer: coarse)').matches) enableTouch();
  const ptr = new Map();   // pointerId -> button
  function setTouch(id, b) {
    const old = ptr.get(id);
    if (old === b) return;
    if (old) ptr.delete(id);
    if (b) ptr.set(id, b);
    for (const k of BTN) src.touch[k] = false;
    for (const v of ptr.values()) src.touch[v] = true;
    for (const el of touchRoot.querySelectorAll('[data-k], #dpad i')) {
      const k = el.dataset.k || { u: 'up', d: 'down', l: 'left', r: 'right' }[el.className.split(' ')[0]];
      el.classList.toggle('on', !!src.touch[k]);
    }
  }
  function dpadDir(e) {
    const r = document.getElementById('dpad').getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 12) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  touchRoot.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('[data-k], #dpad');
    if (!t) return;
    e.preventDefault();
    try { e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    setTouch(e.pointerId, t.id === 'dpad' ? dpadDir(e) : t.dataset.k);
    Audio_unlock();
  });
  addEventListener('pointermove', (e) => {
    if (!ptr.has(e.pointerId)) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const t = el && el.closest('[data-k], #dpad');
    setTouch(e.pointerId, !t ? null : t.id === 'dpad' ? dpadDir(e) : t.dataset.k);
  });
  const lift = (e) => setTouch(e.pointerId, null);
  addEventListener('pointerup', lift); addEventListener('pointercancel', lift);

  function pollPad() {
    src.pad = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const bt = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes || [];
      if (bt(12) || ax[1] < -0.5) src.pad.up = true;
      if (bt(13) || ax[1] > 0.5) src.pad.down = true;
      if (bt(14) || ax[0] < -0.5) src.pad.left = true;
      if (bt(15) || ax[0] > 0.5) src.pad.right = true;
      if (bt(0)) src.pad.a = true;
      if (bt(1) || bt(2)) src.pad.b = true;
      if (bt(9) || bt(3)) src.pad.start = true;
      if (bt(8)) src.pad.select = true;
    }
  }

  return {
    BTN,
    // called once per fixed step, before scene update
    update(dt) {
      pollPad();
      anyPress = false;
      for (const b of BTN) {
        const h = !!(src.key[b] || src.pad[b] || src.touch[b] || src.fake[b]);
        pressed[b] = h && !held[b];
        if (pressed[b]) { anyPress = true; rep[b] = 0; if (DIRS[b]) { const i = order.indexOf(b); if (i >= 0) order.splice(i, 1); order.push(b); } }
        if (h) rep[b] = (rep[b] || 0) + dt;
        held[b] = h;
        if (!h && DIRS[b]) { const i = order.indexOf(b); if (i >= 0) order.splice(i, 1); }
      }
      // one-frame fake presses from tests
      for (const b in src.fake) if (src.fake[b] === 1) src.fake[b] = false;
    },
    held: (b) => !!held[b],
    pressed: (b) => !!pressed[b],
    // pressed, plus auto-repeat while held (after 0.3 s, every 0.09 s): for menu cursors
    repeat(b) {
      if (pressed[b]) return true;
      const t = rep[b] || 0;
      if (!held[b] || t < 0.3) return false;
      const k = Math.floor((t - 0.3) / 0.09), k0 = Math.floor((t - 0.3 - 1 / 60) / 0.09);
      return k !== k0;
    },
    any: () => anyPress,
    // the held direction (last pressed wins), or null
    dir() { for (let i = order.length - 1; i >= 0; i--) if (held[order[i]]) return order[i]; return null; },
    // swallow presses for the rest of this step (call after acting on a press when pushing scenes in the same frame)
    clear() { for (const b of BTN) pressed[b] = false; anyPress = false; },
    // tests: tap(b) presses for one step; hold(b, true/false)
    tap(b) { src.fake[b] = 1; },
    hold(b, on = true) { src.fake[b] = on; },
  };
})();

// ---------- scenes ----------
// A scene is an object { update(dt), draw(g), opaque?: bool, name?: string }.
// Only the top scene updates; drawing starts at the topmost opaque scene and goes up.
const Scenes = {
  stack: [],
  push(s) { this.stack.push(s); if (s.enter) s.enter(); return s; },
  pop(s) {
    const i = s ? this.stack.lastIndexOf(s) : this.stack.length - 1;
    if (i < 0) return;
    const [x] = this.stack.splice(i, 1);
    if (x.exit) x.exit();
    return x;
  },
  top() { return this.stack[this.stack.length - 1]; },
  has(s) { return this.stack.includes(s); },
  update(dt) { const t = this.top(); if (t && t.update) t.update(dt); },
  draw(g) {
    let i = this.stack.length - 1;
    while (i > 0 && !this.stack[i].opaque) i--;
    for (; i < this.stack.length; i++) if (this.stack[i].draw) this.stack[i].draw(g);
  },
};

// ---------- timers ----------
// wait(seconds) → Promise, ticked in game time (so it works under DBG.sim). tween(sec, fn(t 0..1)) → Promise.
const Timers = {
  list: [],
  time: 0,
  update(dt) {
    this.time += dt;
    const l = this.list; this.list = [];
    for (const t of l) {
      t.t += dt;
      if (t.fn) t.fn(Math.min(1, t.t / t.d));
      if (t.t >= t.d) t.res(); else this.list.push(t);
    }
  },
};
function wait(sec) { return new Promise((res) => Timers.list.push({ t: 0, d: Math.max(0, sec), res })); }
function tween(sec, fn) { fn(0); return new Promise((res) => Timers.list.push({ t: 0, d: Math.max(1e-6, sec), fn, res })); }

// ---------- fade ----------
// Fade.a is drawn as a full-screen overlay on top of every scene. fadeOut/fadeIn → Promise.
const Fade = { a: 0, color: '#000' };
function fadeOut(sec = 0.3, color = '#000') { Fade.color = color; const a0 = Fade.a; return tween(DBG.fast ? 0 : sec, (t) => { Fade.a = lerp(a0, 1, t); }); }
function fadeIn(sec = 0.3) { const a0 = Fade.a; return tween(DBG.fast ? 0 : sec, (t) => { Fade.a = lerp(a0, 0, t); }); }

// ---------- game state ----------
const SAVE_KEY = 'tidebound-save-v1';
let G = null;
function newGame() {
  G = {
    name: 'KAI', rival: 'MAREN',
    map: 'player_house_2f', x: 4, y: 4, dir: 'down',
    money: 3000, badges: [], flags: {}, vars: {},
    party: [], box: [], bag: {},
    dex: { seen: {}, caught: {} },
    starter: null,
    lastHeal: { map: 'player_house_1f', x: 5, y: 5 },
    repel: 0, steps: 0, time: 0,
    options: { text: 'mid', music: true, sfx: true },
  };
  return G;
}
newGame();
const flag = (n) => !!G.flags[n];
const setFlag = (n, v = true) => { G.flags[n] = v; };
const bagCount = (id) => G.bag[id] || 0;
function bagAdd(id, n = 1) { G.bag[id] = (G.bag[id] || 0) + n; if (G.bag[id] <= 0) delete G.bag[id]; }

const Save = {
  exists() { try { return !!localStorage.getItem(SAVE_KEY); } catch (_) { return false; } },
  write() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); return true; } catch (_) { return false; }
  },
  read() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return false;
      newGame();
      Object.assign(G, JSON.parse(s));
      return true;
    } catch (_) { return false; }
  },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (_) {} },
};

// ---------- debug registry ----------
// Every module may add helpers here. Under #debug it is window.TB.
const DBG = { fast: false, autoText: false };
if (DEBUG) window.TB = DBG;

// Audio files register the real unlock; input calls it on the first gesture.
let Audio_unlock = () => {};

// ---------- main loop ----------
const Loop = {
  running: true, acc: 0, last: 0, frame: 0,
  step(dt) {
    Input.update(dt);
    Timers.update(dt);
    Scenes.update(dt);
    if (G) G.time += dt;
    this.frame++;
  },
  render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    Scenes.draw(ctx);
    if (Fade.a > 0) { ctx.globalAlpha = clamp(Fade.a, 0, 1); ctx.fillStyle = Fade.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  },
  tick(now) {
    requestAnimationFrame((t) => Loop.tick(t));
    if (!Loop.running) { Loop.last = now; return; }
    const dt = Math.min(0.1, (now - (Loop.last || now)) / 1000);
    Loop.last = now;
    Loop.acc += dt;
    let n = 0;
    while (Loop.acc >= 1 / 60 && n < 6) { Loop.step(1 / 60); Loop.acc -= 1 / 60; n++; }
    if (n === 6) Loop.acc = 0;
    try { Loop.render(); } catch (e) { showError(e); }
  },
};
function showError(e) {
  console.error(e);
  const el = document.getElementById('err');
  if (el && !el.textContent) el.textContent = String(e && e.stack || e).slice(0, 600);
}
addEventListener('error', (e) => showError(e.error || e.message));
addEventListener('unhandledrejection', (e) => showError(e.reason));

// Fit the 320x180 canvas to the window (integer scale when it fits, else fractional).
function fitCanvas() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  const k = s >= 2 ? Math.floor(s) : s;
  canvas.style.width = W * k + 'px';
  canvas.style.height = H * k + 'px';
}
addEventListener('resize', fitCanvas);
fitCanvas();

// sim(seconds): fast-forward without rendering. Async so promise-driven scripts keep running between steps.
DBG.sim = async (sec) => {
  Loop.running = false;
  const n = Math.round(sec * 60);
  for (let i = 0; i < n; i++) {
    Loop.step(1 / 60);
    await null; await null;
  }
  Loop.running = true;
};
DBG.render = () => Loop.render();
DBG.tap = async (b, sec = 0.15) => { Input.tap(b); await DBG.sim(sec); };
DBG.scenes = () => Scenes.stack.map((s) => s.name || '?');
