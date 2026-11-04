// ---- input: keyboard, gamepad and touch merged into one set of actions ----
// Actions: action (mode action), throw, use (talk / interact), mode1..4, modeNext, modePrev, pause, map, tonic,
// up/down/left/right (menus), ok, back. Movement is Input.mx/Input.my in screen space (x right, y up), length <= 1.
const Input = {
  keys: new Set(),
  held: {},
  pressed: {},
  _queued: {},
  mx: 0, my: 0,
  lastDevice: 'kbm',
  touch: { active: false, jx: 0, jy: 0, btn: {} },
  pad: null,
  _padPrev: {},
  KEYMAP: {
    action: ['Space'], throw: ['KeyF', 'KeyK'], use: ['KeyE', 'Enter'],
    mode1: ['Digit1'], mode2: ['Digit2'], mode3: ['Digit3'], mode4: ['Digit4'],
    modeNext: ['Tab', 'KeyQ'], modePrev: [], pause: ['Escape', 'KeyP'], map: ['KeyM'], tonic: ['KeyH'],
    up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    ok: ['Space', 'Enter', 'KeyE'], back: ['Escape', 'Backspace'],
  },
  init() {
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.press(e.code);
      this.keys.add(e.code); this.lastDevice = 'kbm';
      Audio2.unlock();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousedown', (e) => {
      Audio2.unlock();
      if (e.button === 0 && G.state === 'play' && e.target && e.target.id === 'c') this._queued.throw = true;
      if (e.button === 2 && G.state === 'play') this._queued.action = true;
    });
    addEventListener('contextmenu', (e) => { if (e.target && e.target.id === 'c') e.preventDefault(); });
  },
  // queue an edge for every action bound to this key code
  press(code) { for (const a in this.KEYMAP) if (this.KEYMAP[a].includes(code)) this._queued[a] = true; },
  tap(action) { this._queued[action] = true; },
  // called once per rendered frame; edges stay set until consume()
  poll() {
    const k = this.keys, has = (a) => this.KEYMAP[a].some((c) => k.has(c));
    let mx = 0, my = 0;
    if (has('left')) mx -= 1; if (has('right')) mx += 1; if (has('up')) my += 1; if (has('down')) my -= 1;
    const held = { action: has('action'), throw: has('throw'), use: has('use') };
    // gamepad (standard mapping)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
    this.pad = gp;
    if (gp) {
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, dz = 0.22;
      if (Math.hypot(ax, ay) > dz) { mx = ax; my = -ay; this.lastDevice = 'pad'; }
      const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      if (b(12)) my = 1; if (b(13)) my = -1; if (b(14)) mx = -1; if (b(15)) mx = 1;
      const map = { 0: 'action', 2: 'throw', 1: 'use', 3: 'modeNext', 5: 'modeNext', 4: 'modePrev', 9: 'pause', 8: 'map', 7: 'throw', 6: 'tonic' };
      for (const i in map) {
        const now = b(+i), was = this._padPrev[i];
        if (now && !was) { this._queued[map[i]] = true; this.lastDevice = 'pad'; if (map[i] === 'action' || map[i] === 'use') this._queued.ok = true; if (+i === 1) this._queued.back = true; }
        this._padPrev[i] = now;
        if (now) held[map[i]] = true;
      }
      // menus: stick/dpad edges
      const dirs = { up: my > 0.6, down: my < -0.6, left: mx < -0.6, right: mx > 0.6 };
      for (const d in dirs) { if (dirs[d] && !this._padPrev[d]) this._queued[d] = true; this._padPrev[d] = dirs[d]; }
    }
    // touch joystick
    const t = this.touch;
    if (t.active) { mx = t.jx; my = t.jy; }
    for (const b in t.btn) if (t.btn[b]) held[b] = true;
    const l = Math.hypot(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    this.mx = mx; this.my = my; this.held = held;
    for (const a in this._queued) this.pressed[a] = true;
    this._queued = {};
  },
  consume() { this.pressed = {}; },
  any() { for (const a in this.pressed) return true; return false; },
};
