// ---- 03_input: keyboard, mouse (pointer lock), gamepad ----
// Input.down(code) is held; Input.hit(code) is true for one frame after a press. Mouse buttons are 'M0', 'M2'.
// Gamepad buttons use the standard mapping and appear as 'P0'..'P16'; sticks in Input.pad.
const Input = (() => {
  const held = new Set(), hits = new Set();
  const I = {
    mdx: 0, mdy: 0, wheel: 0, locked: false, usingPad: false,
    pad: { lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, connected: false },
    down: (c) => held.has(c),
    hit: (c) => hits.has(c),
    any: (...cs) => cs.some((c) => hits.has(c)),
    endFrame() { hits.clear(); I.mdx = 0; I.mdy = 0; I.wheel = 0; },
    clear() { held.clear(); hits.clear(); },
    press(c) { held.add(c); hits.add(c); }, release(c) { held.delete(c); },
  };
  const gameKeys = new Set(['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (G.state === 'play' && gameKeys.has(e.code)) e.preventDefault();
    if (!held.has(e.code)) hits.add(e.code);
    held.add(e.code); I.usingPad = false;
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());
  addEventListener('mousedown', (e) => { const c = 'M' + e.button; if (!held.has(c)) hits.add(c); held.add(c); I.usingPad = false; });
  addEventListener('mouseup', (e) => held.delete('M' + e.button));
  addEventListener('contextmenu', (e) => { if (G.state === 'play') e.preventDefault(); });
  addEventListener('mousemove', (e) => {
    if (I.locked || G.state === 'play') { I.mdx += e.movementX || 0; I.mdy += e.movementY || 0; }
  });
  addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { I.locked = !!document.pointerLockElement; });
  I.lock = () => { const c = $('c'); if (c && c.requestPointerLock && !I.locked) { try { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed now */ } } };
  I.unlock = () => { if (document.exitPointerLock && I.locked) document.exitPointerLock(); };

  const prevPad = [];
  const dz = (v) => Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85;
  I.pollPad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    I.pad.connected = !!gp;
    if (!gp) return;
    const a = gp.axes;
    I.pad.lx = dz(a[0] || 0); I.pad.ly = dz(a[1] || 0); I.pad.rx = dz(a[2] || 0); I.pad.ry = dz(a[3] || 0);
    gp.buttons.forEach((b, i) => {
      const on = b.pressed || b.value > 0.5, c = 'P' + i;
      if (on && !prevPad[i]) { hits.add(c); I.usingPad = true; }
      if (on) held.add(c); else held.delete(c);
      prevPad[i] = on;
    });
    I.pad.lt = gp.buttons[6] ? gp.buttons[6].value : 0; I.pad.rt = gp.buttons[7] ? gp.buttons[7].value : 0;
    if (Math.abs(I.pad.lx) + Math.abs(I.pad.ly) + Math.abs(I.pad.rx) + Math.abs(I.pad.ry) > 0.3) I.usingPad = true;
  };
  return I;
})();
