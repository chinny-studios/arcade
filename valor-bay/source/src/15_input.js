// Valor Bay — input: keyboard and mouse (pointer lock) and gamepad (standard mapping), mapped to the same actions

const BIND = {
  fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], down: ['KeyC'], travel: ['ShiftLeft', 'ShiftRight'],
  q: ['KeyQ'], e: ['KeyE'], ult: ['KeyR'], map: ['KeyM', 'Tab'], menu: ['Escape', 'KeyP'], help: ['F1'], hero: ['KeyH'],
};
// pad buttons: A jump, B dodge / down, X attack, Y ranged, LB power 1, RB power 2, LT ultimate, RT travel, Back map, Start menu
const PAD = { jump: 0, down: 1, atk: 2, rmb: 3, q: 4, e: 5, ult: 6, travel: 7, map: 8, menu: 9, travel2: 10 };
const Input = (() => {
  const keys = new Set(), acts = new Set(), held2 = new Set();
  const mouse = { dx: 0, dy: 0, wheel: 0, l: false, r: false };
  const pad = { idx: -1, btn: [], prev: [], ax: [0, 0, 0, 0], prevAx: [0, 0] };
  let mode = 'kbm';
  const keyToAct = {};
  for (const [a, ks] of Object.entries(BIND)) for (const k of ks) (keyToAct[k] = keyToAct[k] || []).push(a);
  function setMode(m) { if (mode === m) return; mode = m; document.body.dataset.input = m; }
  const locked = () => document.pointerLockElement === $('#c');
  function lock() { if (!locked() && $('#c').requestPointerLock) try { const p = $('#c').requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed */ } }
  function init() {
    document.body.dataset.input = mode;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1'].includes(e.code)) e.preventDefault();
      if (document.body.dataset.state === 'play' && e.target && e.target.tagName === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); e.target.blur(); }
      AUDIO.init(); setMode('kbm');
      if (!keys.has(e.code)) for (const a of keyToAct[e.code] || []) acts.add(a);
      keys.add(e.code);
    });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => { keys.clear(); mouse.l = mouse.r = false; });
    const c = $('#c');
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('mousedown', (e) => {
      AUDIO.init(); setMode('kbm');
      if (document.body.dataset.state !== 'play') return;
      if (!locked() && !DEBUG) { lock(); return; }
      if (e.button === 0) { mouse.l = true; acts.add('atk'); }
      if (e.button === 2) { mouse.r = true; acts.add('rmb'); }
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
    addEventListener('mousemove', (e) => {
      if (locked()) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
      else if (DEBUG && (mouse.l || mouse.r)) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
    });
    c.addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => bus.emit('lock', locked()));
    addEventListener('gamepadconnected', (e) => { pad.idx = e.gamepad.index; });
  }
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = pads[pad.idx];
    if (!p) for (const q of pads) if (q && q.connected) { p = q; pad.idx = q.index; break; }
    pad.prev = pad.btn;
    if (!p) { pad.btn = []; pad.ax = [0, 0, 0, 0]; return; }
    pad.btn = p.buttons.map((b) => b.pressed || b.value > 0.4);
    pad.ax = [0, 1, 2, 3].map((i) => { const v = p.axes[i] || 0; return Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85; });
    if (pad.btn.some((b, i) => b && !pad.prev[i]) || pad.ax.some((v) => Math.abs(v) > 0.5)) { setMode('pad'); AUDIO.init(); }
  }
  const pb = (i) => !!pad.btn[i] && !pad.prev[i];
  const ph = (i) => !!pad.btn[i];
  function update() {
    pollPad();
    if (mode === 'pad') {
      for (const [a, i] of Object.entries(PAD)) if (pb(i)) acts.add(a === 'travel2' ? 'travel' : a);
      if (pb(12)) acts.add('hero');
    }
  }
  function endFrame() { acts.clear(); mouse.dx = mouse.dy = 0; mouse.wheel = 0; pad.prevAx = [pad.ax[0], pad.ax[1]]; }
  function held(a) {
    if (BIND[a] && BIND[a].some((k) => keys.has(k))) return true;
    if (held2.has(a)) return true;
    if (a === 'atk' && mouse.l) return true;
    if (a === 'rmb' && mouse.r) return true;
    if (mode === 'pad') {
      if (PAD[a] !== undefined && ph(PAD[a])) return true;
      if (a === 'travel' && ph(PAD.travel2)) return true;
    }
    return false;
  }
  const pressed = (a) => acts.has(a);
  // x right, y forward-negative like a screen stick
  function move() {
    let x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), y = (held('back') ? 1 : 0) - (held('fwd') ? 1 : 0);
    if (mode === 'pad') { x += pad.ax[0]; y += pad.ax[1]; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  function lookDelta() {
    let x = mouse.dx * 0.0024 * OPTS.sens, y = mouse.dy * 0.002 * OPTS.sens;
    if (mode === 'pad') { x += pad.ax[2] * 0.055 * OPTS.sens; y += pad.ax[3] * 0.04 * OPTS.sens; }
    if (OPTS.invert) y = -y;
    return { x, y };
  }
  function navPad() {
    if (mode !== 'pad') return {};
    const o = {};
    if (pb(12) || (pad.ax[1] < -0.6 && !(pad.prevAx[1] < -0.6))) o.up = true;
    if (pb(13) || (pad.ax[1] > 0.6 && !(pad.prevAx[1] > 0.6))) o.down = true;
    if (pb(14) || (pad.ax[0] < -0.6 && !(pad.prevAx[0] < -0.6))) o.left = true;
    if (pb(15) || (pad.ax[0] > 0.6 && !(pad.prevAx[0] > 0.6))) o.right = true;
    if (pb(0)) o.ok = true; if (pb(1) || pb(9)) o.back = true;
    return o;
  }
  return { init, update, endFrame, held, pressed, move, lookDelta, navPad, mouse, keys, acts, held2, lock, locked, get mode() { return mode; }, setMode };
})();
