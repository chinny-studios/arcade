// Nullwake — input: keyboard, a floating touch/drag stick, the Gamepad API, and spatial focus for menus.
const INPUT = (() => {
  const keys = new Set();
  const stick = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
  const pad = { prev: [], ax: [0, 0], navT: 0, lastDir: '' };
  const mv = { x: 0, y: 0 };
  let mode = 'kbm';
  const setMode = (m) => { if (mode !== m) { mode = m; document.body.dataset.input = m; } };
  const menuOpen = () => $('#menu').childElementCount > 0;

  function init() {
    document.body.dataset.input = mode;
    addEventListener('keydown', onKey);
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => { keys.clear(); endStick(); });
    const c = $('#c');
    c.addEventListener('pointerdown', (e) => {
      AUDIO.init();
      if (e.pointerType === 'touch') setMode('touch');
      if (G.state !== 'play' || stick.id !== null) return;
      stick.id = e.pointerId; stick.x0 = e.clientX; stick.y0 = e.clientY; stick.x = stick.y = 0;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ }
      showStick(); e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stick.id) return;
      const R0 = 48, dx = e.clientX - stick.x0, dy = e.clientY - stick.y0, l = Math.hypot(dx, dy);
      if (l > R0 * 1.5) { stick.x0 = e.clientX - dx / l * R0 * 1.5; stick.y0 = e.clientY - dy / l * R0 * 1.5; }
      const k = Math.min(1, l / R0) / (l || 1); stick.x = dx * k; stick.y = dy * k;
      showStick();
    });
    const up = (e) => { if (e.pointerId === stick.id) endStick(); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    $('#pausebtn').addEventListener('click', () => { AUDIO.init(); if (G.state === 'play') UI.pause(); });
    addEventListener('touchstart', () => { AUDIO.init(); setMode('touch'); }, { passive: true });
    addEventListener('pointerdown', () => AUDIO.init());
  }
  function endStick() { stick.id = null; stick.x = stick.y = 0; $('#stick').classList.remove('on'); }
  function showStick() {
    const s = $('#stick'); s.classList.add('on'); s.style.left = stick.x0 + 'px'; s.style.top = stick.y0 + 'px';
    s.firstElementChild.style.transform = `translate(${stick.x * 34}px, ${stick.y * 34}px)`;
  }

  function onKey(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    AUDIO.init(); setMode('kbm');
    keys.add(e.code);
    if (menuOpen()) {
      if (UI.key(e.code)) { e.preventDefault(); return; }
      const d = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] }[e.code];
      if (d) { nav(d[0], d[1]); return; }
      if (e.code === 'Tab') { nav(0, e.shiftKey ? -1 : 1, true); return; }
      if ((e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') && !e.repeat) { e.preventDefault(); activate(); return; }
      if ((e.code === 'Escape' || e.code === 'Backspace') && !e.repeat) { back(); return; }
      return;
    }
    if (G.state === 'play' && (e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) UI.pause();
  }

  // ---- menu focus ----
  const navItems = () => $$('#menu [data-nav]').filter((b) => !b.disabled && b.offsetParent !== null);
  function focusEl(b) {
    for (const x of $$('#menu .focus')) x.classList.remove('focus');
    if (!b) return;
    b.classList.add('focus'); try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
    b.scrollIntoView({ block: 'nearest' });
  }
  function current() { const items = navItems(), a = document.activeElement; return items.includes(a) ? a : items.find((b) => b.classList.contains('focus')); }
  function nav(dx, dy, linear) {
    const items = navItems(); if (!items.length) return;
    const cur = current();
    if (!cur) { focusEl(items[0]); return; }
    if (linear) { focusEl(items[(items.indexOf(cur) + (dy > 0 ? 1 : items.length - 1)) % items.length]); return; }
    const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = Infinity;
    for (const b of items) {
      if (b === cur) continue;
      const r = b.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy, along = x * dx + y * dy;
      if (along <= 4) continue;
      const sc = along + Math.abs(x * dy - y * dx) * 2.5; if (sc < bs) { bs = sc; best = b; }
    }
    if (best) { focusEl(best); sfx('ui', 0, 0.02); }
  }
  function activate() { const b = current(); if (b) b.click(); else nav(0, 1); }
  function back() { const b = $('#menu [data-back]'); if (b) b.click(); }

  // ---- gamepad (polled every frame) ----
  function poll(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null; for (const q of pads) if (q && q.connected) { p = q; break; }
    if (!p) { pad.ax[0] = pad.ax[1] = 0; return; }
    const btn = p.buttons.map((b) => b.pressed), pressed = (i) => btn[i] && !pad.prev[i];
    let ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (btn[14]) ax = -1; if (btn[15]) ax = 1; if (btn[12]) ay = -1; if (btn[13]) ay = 1;
    const l = Math.hypot(ax, ay);
    if (l < 0.2) ax = ay = 0; else { const k = Math.min(1, (l - 0.2) / 0.75) / l; ax *= k; ay *= k; }
    if (btn.some(Boolean) || l > 0.5) { setMode('pad'); AUDIO.init(); }
    pad.ax[0] = ax; pad.ax[1] = ay;
    if (menuOpen()) {
      const dir = Math.abs(ax) > 0.55 || Math.abs(ay) > 0.55 ? (Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'r' : 'l') : (ay > 0 ? 'd' : 'u')) : '';
      pad.navT -= dt;
      if (dir && (dir !== pad.lastDir || pad.navT <= 0)) { nav(dir === 'r' ? 1 : dir === 'l' ? -1 : 0, dir === 'd' ? 1 : dir === 'u' ? -1 : 0); pad.navT = dir === pad.lastDir ? 0.13 : 0.38; }
      pad.lastDir = dir;
      if (pressed(0)) activate();
      if (pressed(1)) back();
      if (pressed(2)) UI.key('KeyR');
      if (pressed(3)) UI.key('KeyK');
      if (pressed(9) && G.state === 'pause') UI.resume();
    } else if (G.state === 'play' && (pressed(9) || pressed(8))) UI.pause();
    pad.prev = btn;
  }

  function move() {
    let x = 0, y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    if (stick.id !== null && Math.hypot(stick.x, stick.y) > Math.hypot(x, y)) { x = stick.x; y = stick.y; }
    if (Math.hypot(pad.ax[0], pad.ax[1]) > Math.hypot(x, y)) { x = pad.ax[0]; y = pad.ax[1]; }
    mv.x = x; mv.y = y; return mv;
  }
  return { init, poll, move, focusEl, navItems, endStick, keys, get mode() { return mode; } };
})();
