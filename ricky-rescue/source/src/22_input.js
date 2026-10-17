// Ricky Rescue — input: keyboard & mouse, gamepad (standard mapping) and touch, mapped to actions

const BIND = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  hand: ['Space'], ls: ['KeyQ'], tone: ['KeyR'], horn: ['KeyH'], cam: ['KeyC'], exit: ['KeyF'], use: ['KeyE'], cycle: ['Tab'],
  run: ['ShiftLeft', 'ShiftRight'], menu: ['Escape'], map: ['KeyM'], skip: ['KeyT'], enter: ['Enter', 'NumpadEnter'], cprTap: ['Space'],
};
const Input = (() => {
  const keys = new Set(), acts = new Set(), touchHeld = new Set();
  const mouse = { x: 0, y: 0, down: false, dx: 0, dy: 0, wheel: 0, drag: false };
  const pad = { idx: -1, btn: [], prev: [], ax: [0, 0, 0, 0], lt: 0, rt: 0, prevAx: [0, 0] };
  const stick = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
  const look = { id: null, x: 0, y: 0 };
  let mode = 'kbm';
  const keyToAct = {};
  for (const [a, ks] of Object.entries(BIND)) for (const k of ks) (keyToAct[k] = keyToAct[k] || []).push(a);
  function setMode(m) { if (mode === m) return; mode = m; document.body.dataset.input = m; }
  function init() {
    document.body.dataset.input = mode;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      // in play, Enter and Space are game keys, not 'click the focused button'
      if (document.body.dataset.state === 'play' && (e.code === 'Enter' || e.code === 'Space') && e.target && e.target.tagName === 'BUTTON') { e.preventDefault(); e.target.blur(); }
      AUDIO.init(); setMode('kbm');
      if (!keys.has(e.code)) for (const a of keyToAct[e.code] || []) acts.add(a);
      keys.add(e.code);
    });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => { keys.clear(); mouse.down = false; });
    const c = $('#c');
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      AUDIO.init();
      if (e.pointerType === 'touch') { setMode('touch'); if (look.id === null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; } return; }
      setMode('kbm'); mouse.down = true; mouse.x = e.clientX; mouse.y = e.clientY;
    });
    addEventListener('pointermove', (e) => {
      if (e.pointerId === look.id) { mouse.dx += e.clientX - look.x; mouse.dy += e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; return; }
      if (e.pointerType === 'touch') return;
      if (mouse.down) { mouse.dx += e.clientX - mouse.x; mouse.dy += e.clientY - mouse.y; }
      mouse.x = e.clientX; mouse.y = e.clientY;
    });
    addEventListener('pointerup', (e) => { if (e.pointerId === look.id) look.id = null; if (e.pointerType !== 'touch') mouse.down = false; });
    addEventListener('pointercancel', (e) => { if (e.pointerId === look.id) look.id = null; });
    c.addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    addEventListener('gamepadconnected', (e) => { pad.idx = e.gamepad.index; });
    // touch: held buttons (steering, pedals), tap buttons, the stick
    for (const b of $$('[data-t]')) {
      b.addEventListener('pointerdown', (e) => { AUDIO.init(); setMode('touch'); touchHeld.add(b.dataset.t); b.classList.add('on'); e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } });
      const up = () => { touchHeld.delete(b.dataset.t); b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    }
    for (const b of $$('[data-tap]')) b.addEventListener('pointerdown', (e) => { AUDIO.init(); setMode('touch'); acts.add('t_' + b.dataset.tap); if (b.dataset.tap === 'horn') touchHeld.add('horn'); e.preventDefault(); });
    for (const b of $$('[data-tap="horn"]')) { const up = () => touchHeld.delete('horn'); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); }
    const tz = $('#tStick');
    tz.addEventListener('pointerdown', (e) => { AUDIO.init(); setMode('touch'); stick.id = e.pointerId; stick.x0 = e.clientX; stick.y0 = e.clientY; stick.x = stick.y = 0; try { tz.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } showStick(true); e.preventDefault(); });
    tz.addEventListener('pointermove', (e) => { if (e.pointerId !== stick.id) return; const dx = e.clientX - stick.x0, dy = e.clientY - stick.y0, l = Math.hypot(dx, dy), m = 50; stick.x = dx / Math.max(m, l); stick.y = dy / Math.max(m, l); showStick(true); });
    const endStick = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; showStick(false); };
    tz.addEventListener('pointerup', endStick); tz.addEventListener('pointercancel', endStick);
    addEventListener('touchstart', () => { AUDIO.init(); setMode('touch'); }, { passive: true });
  }
  function showStick(on) {
    const k = $('#tStickKnob'), b = $('#tStickBase');
    if (!on) { b.style.opacity = 0.35; k.style.transform = 'translate(-50%,-50%)'; b.style.left = ''; b.style.top = ''; b.style.bottom = ''; return; }
    b.style.opacity = 0.85; b.style.left = stick.x0 + 'px'; b.style.top = stick.y0 + 'px'; b.style.bottom = 'auto';
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
    pad.ax = [0, 1, 2, 3].map((i) => { const v = p.axes[i] || 0; return Math.abs(v) < 0.15 ? 0 : v; });
    if (pad.btn.some((b, i) => b && !pad.prev[i]) || pad.ax.some((v) => Math.abs(v) > 0.5)) { setMode('pad'); AUDIO.init(); }
  }
  const pb = (i) => !!pad.btn[i] && !pad.prev[i];
  const ph = (i) => !!pad.btn[i];
  function update() {
    pollPad();
    if (mode === 'pad') {
      if (pb(0)) acts.add('use'); if (pb(1)) acts.add('back'); if (pb(2)) acts.add('ls'); if (pb(3)) acts.add('exit');
      if (pb(5)) acts.add('tone'); if (pb(9)) acts.add('menu'); if (pb(8)) acts.add('map'); if (pb(11)) acts.add('cam');
      if (pb(14) || pb(15)) acts.add('cycle'); if (pb(13)) acts.add('skip'); if (pb(12)) acts.add('enter');
    }
  }
  function endFrame() { acts.clear(); mouse.dx = mouse.dy = 0; mouse.wheel = 0; pad.prevAx = [pad.ax[0], pad.ax[1]]; }
  function held(a) {
    if (BIND[a] && BIND[a].some((k) => keys.has(k))) return true;
    if (touchHeld.has(a)) return true;
    if (mode === 'pad') { if (a === 'horn') return ph(4); if (a === 'run') return ph(10); if (a === 'hand') return ph(2) && false; }
    return false;
  }
  const pressed = (a) => acts.has(a);
  function move() {
    let x = 0, y = 0;
    if (held('left')) x -= 1; if (held('right')) x += 1; if (held('up')) y -= 1; if (held('down')) y += 1;
    if (mode === 'pad') { x += pad.ax[0]; y += pad.ax[1]; }
    if (stick.id !== null) { x += stick.x; y += stick.y; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  // driving: steer +1 = left
  function drive() {
    let thr = 0, brk = 0, steer = 0;
    if (held('up') || touchHeld.has('gas')) thr = 1;
    if (held('down') || touchHeld.has('brake')) brk = 1;
    if (held('left')) steer += 1; if (held('right')) steer -= 1;
    if (mode === 'pad') { thr = Math.max(thr, pad.rt); brk = Math.max(brk, pad.lt); steer -= pad.ax[0]; }
    return { thr, brk, steer: clamp(steer, -1, 1), hand: held('hand') || (mode === 'pad' && ph(1)) };
  }
  function lookDelta() {
    let x = mouse.dx * 0.005, y = mouse.dy * 0.004;
    if (mode === 'pad') { x += pad.ax[2] * 0.045; y += pad.ax[3] * 0.035; }
    return { x, y };
  }
  function navPad() {
    if (mode !== 'pad') return {};
    const out = {};
    if (pb(12) || (pad.ax[1] < -0.6 && !(pad.prevAx[1] < -0.6))) out.up = true;
    if (pb(13) || (pad.ax[1] > 0.6 && !(pad.prevAx[1] > 0.6))) out.down = true;
    if (pb(14) || (pad.ax[0] < -0.6 && !(pad.prevAx[0] < -0.6))) out.left = true;
    if (pb(15) || (pad.ax[0] > 0.6 && !(pad.prevAx[0] > 0.6))) out.right = true;
    if (pb(0)) out.ok = true; if (pb(1)) out.back = true;
    return out;
  }
  return { init, update, endFrame, held, pressed, move, drive, lookDelta, navPad, mouse, keys, acts, get mode() { return mode; }, setMode };
})();
