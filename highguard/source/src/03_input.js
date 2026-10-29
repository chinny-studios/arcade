// ---- 03_input: keyboard and mouse (pointer lock) ----
// Input.down(code) is held; Input.hit(code) is true for one frame after a press, Input.up(code) for one frame after
// a release. Input.heldFor(code) is how long a key has been down, in seconds. Mouse buttons are 'M0', 'M2'.
const Input = (() => {
  const held = new Map(), hits = new Set(), ups = new Set();
  const I = {
    mdx: 0, mdy: 0, wheel: 0, locked: false,
    down: (c) => held.has(c),
    hit: (c) => hits.has(c),
    up: (c) => ups.has(c),
    heldFor: (c) => held.has(c) ? (performance.now() - held.get(c)) / 1000 : 0,
    shift: () => held.has('ShiftLeft') || held.has('ShiftRight'),
    endFrame() { hits.clear(); ups.clear(); I.mdx = 0; I.mdy = 0; I.wheel = 0; },
    clear() { held.clear(); hits.clear(); ups.clear(); },
    press(c) { if (!held.has(c)) { hits.add(c); held.set(c, performance.now()); } }, release(c) { if (held.delete(c)) ups.add(c); },
  };
  const gameKeys = new Set(['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (G.state === 'play' && gameKeys.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    I.press(e.code);
  });
  addEventListener('keyup', (e) => I.release(e.code));
  addEventListener('blur', () => { for (const c of held.keys()) ups.add(c); held.clear(); });
  addEventListener('mousedown', (e) => I.press('M' + e.button));
  addEventListener('mouseup', (e) => I.release('M' + e.button));
  addEventListener('contextmenu', (e) => { if (G.state === 'play') e.preventDefault(); });
  addEventListener('mousemove', (e) => {
    if (I.locked || G.state === 'play') { I.mdx += e.movementX || 0; I.mdy += e.movementY || 0; }
  });
  addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { I.locked = !!document.pointerLockElement; });
  I.lock = () => { const c = $('c'); if (c && c.requestPointerLock && !I.locked) { try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed now */ } } };
  I.unlock = () => { if (document.exitPointerLock && I.locked) document.exitPointerLock(); };
  return I;
})();
