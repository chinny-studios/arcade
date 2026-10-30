// Creature Feature — input: keyboard and mouse (pointer lock), gamepad (standard mapping) and touch (a stick on the
// left, drag to look on the right, buttons), all mapped to the same actions

const BIND = {
  fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], run: ['ShiftLeft', 'ShiftRight'], stalk: ['KeyC', 'ControlLeft'], use: ['KeyF', 'KeyE'],
  a2: ['KeyQ'], a1x: ['KeyR'], sense: ['KeyV', 'Tab'], menu: ['Escape', 'KeyP'], help: ['F1'],
};
const Input = (() => {
  const keys = new Set(), acts = new Set(), touchHeld = new Set(), toggles = { run: false, stalk: false };
  const mouse = { dx: 0, dy: 0, wheel: 0, l: false, r: false };
  const pad = { idx: -1, btn: [], prev: [], ax: [0, 0, 0, 0], lt: 0, rt: 0, prevAx: [0, 0] };
  const stick = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
  const look = { id: null, x: 0, y: 0 };
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
      if (e.code === 'KeyR' && !keys.has(e.code)) acts.add('a1');
      keys.add(e.code);
    });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => { keys.clear(); mouse.l = mouse.r = false; });
    const c = $('#c');
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('mousedown', (e) => {
      AUDIO.init(); setMode('kbm');
      if (document.body.dataset.state !== 'play') return;
      if (!locked() && !DEBUG_NOLOCK()) { lock(); return; }
      if (e.button === 0) { mouse.l = true; acts.add('atk'); }
      if (e.button === 2) { mouse.r = true; acts.add('a1'); }
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
    addEventListener('mousemove', (e) => {
      if (locked()) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
      else if (mouse.l || mouse.r) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
    });
    c.addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => bus.emit('lock', locked()));
    // touch: the look area is the canvas itself
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      AUDIO.init(); setMode('touch');
      if (look.id === null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
    });
    addEventListener('pointermove', (e) => { if (e.pointerId === look.id) { mouse.dx += (e.clientX - look.x) * 1.6; mouse.dy += (e.clientY - look.y) * 1.6; look.x = e.clientX; look.y = e.clientY; } });
    addEventListener('pointerup', (e) => { if (e.pointerId === look.id) look.id = null; });
    addEventListener('pointercancel', (e) => { if (e.pointerId === look.id) look.id = null; });
    addEventListener('gamepadconnected', (e) => { pad.idx = e.gamepad.index; });
    for (const b of $$('[data-t]')) {
      b.addEventListener('pointerdown', (e) => {
        AUDIO.init(); setMode('touch'); e.preventDefault(); e.stopPropagation();
        const a = b.dataset.t;
        if (a === 'run' || a === 'stalk') { toggles[a] = !toggles[a]; if (toggles[a]) toggles[a === 'run' ? 'stalk' : 'run'] = false; syncToggles(); return; }
        touchHeld.add(a); acts.add(a); b.classList.add('on');
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
      });
      const up = () => { touchHeld.delete(b.dataset.t); b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    }
    const tz = $('#tStick');
    tz.addEventListener('pointerdown', (e) => { AUDIO.init(); setMode('touch'); stick.id = e.pointerId; stick.x0 = e.clientX; stick.y0 = e.clientY; stick.x = stick.y = 0; try { tz.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } showStick(true); e.preventDefault(); e.stopPropagation(); });
    tz.addEventListener('pointermove', (e) => { if (e.pointerId !== stick.id) return; const dx = e.clientX - stick.x0, dy = e.clientY - stick.y0, l = Math.hypot(dx, dy), m = 55; stick.x = dx / Math.max(m, l); stick.y = dy / Math.max(m, l); showStick(true); });
    const endStick = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; showStick(false); };
    tz.addEventListener('pointerup', endStick); tz.addEventListener('pointercancel', endStick);
    addEventListener('touchstart', () => { AUDIO.init(); setMode('touch'); }, { passive: true });
  }
  function syncToggles() { for (const k of ['run', 'stalk']) { const b = $(`[data-t="${k}"]`); if (b) b.classList.toggle('on', toggles[k]); } }
  function showStick(on) {
    const k = $('#tKnob'), b = $('#tBase');
    if (!on) { b.style.opacity = 0.35; k.style.transform = 'translate(-50%,-50%)'; b.style.left = ''; b.style.top = ''; return; }
    b.style.opacity = 0.85; b.style.left = stick.x0 + 'px'; b.style.top = stick.y0 + 'px';
    k.style.transform = `translate(calc(-50% + ${stick.x * 40}px), calc(-50% + ${stick.y * 40}px))`;
  }
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = pads[pad.idx];
    if (!p) for (const q of pads) if (q && q.connected) { p = q; pad.idx = q.index; break; }
    pad.prev = pad.btn;
    if (!p) { pad.btn = []; pad.ax = [0, 0, 0, 0]; pad.lt = pad.rt = 0; return; }
    pad.btn = p.buttons.map((b) => b.pressed || b.value > 0.5);
    pad.lt = p.buttons[6] ? p.buttons[6].value : 0; pad.rt = p.buttons[7] ? p.buttons[7].value : 0;
    pad.ax = [0, 1, 2, 3].map((i) => { const v = p.axes[i] || 0; return Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85; });
    if (pad.btn.some((b, i) => b && !pad.prev[i]) || pad.ax.some((v) => Math.abs(v) > 0.5)) { setMode('pad'); AUDIO.init(); }
  }
  const pb = (i) => !!pad.btn[i] && !pad.prev[i];
  const ph = (i) => !!pad.btn[i];
  function update() {
    pollPad();
    if (mode === 'pad') {
      if (pb(7)) acts.add('atk'); if (pb(6)) acts.add('a1'); if (pb(5)) acts.add('a2');
      if (pb(0)) acts.add('jump'); if (pb(2)) acts.add('use'); if (pb(9)) acts.add('menu'); if (pb(8)) acts.add('help');
      if (pb(1)) acts.add('back');
    }
  }
  function endFrame() { acts.clear(); mouse.dx = mouse.dy = 0; mouse.wheel = 0; pad.prevAx = [pad.ax[0], pad.ax[1]]; }
  function held(a) {
    if (BIND[a] && BIND[a].some((k) => keys.has(k))) return true;
    if (touchHeld.has(a)) return true;
    if (a === 'run' && toggles.run) return true;
    if (a === 'stalk' && toggles.stalk) return true;
    if (mode === 'pad') {
      if (a === 'run') return ph(10) || ph(1);
      if (a === 'stalk') return ph(11) || ph(4);
      if (a === 'jump') return ph(0);
      if (a === 'sense') return ph(3);
    }
    if (a === 'atk') return mouse.l;
    return false;
  }
  const pressed = (a) => acts.has(a);
  // x right, y forward-negative like a screen stick
  function move() {
    let x = (held('right') ? 1 : 0) - (held('left') ? 1 : 0), y = (held('back') ? 1 : 0) - (held('fwd') ? 1 : 0);
    if (mode === 'pad') { x += pad.ax[0]; y += pad.ax[1]; }
    if (stick.id !== null) { x += stick.x; y += stick.y; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  function lookDelta() {
    let x = mouse.dx * 0.0026 * OPTS.sens, y = mouse.dy * 0.0022 * OPTS.sens;
    if (mode === 'pad') { x += pad.ax[2] * 0.05 * OPTS.sens; y += pad.ax[3] * 0.035 * OPTS.sens; }
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
  return { init, update, endFrame, held, pressed, move, lookDelta, navPad, mouse, keys, acts, touchHeld, toggles, lock, locked, get mode() { return mode; }, setMode };
})();
// under #debug the game never asks for pointer lock (headless tests click the canvas freely)
const DEBUG_NOLOCK = () => DEBUG;
