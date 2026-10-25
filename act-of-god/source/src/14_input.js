// Act of God — the god's-eye camera (orbit, pan, zoom toward the cursor, shake) and input: mouse, touch and keyboard.
// Picking marches the cursor ray over the terrain, the water and the buildings.

const CAM = { tx: 0, tz: 0, ty: 0, dist: 900, yaw: 0.6, pitch: 0.75, vx: 0, vz: 0, minD: 40, maxD: 6000, orbit: false };
const INP = { keys: new Set(), mx: 0, my: 0, down: false, btn: -1, dragging: false, sx: 0, sy: 0, last: 0, touches: new Map(), pinch: null, lineA: null, holdT: 0, moved: 0, castedThisDown: false };

function camReset() {
  const c = W.gen.centers[0];
  CAM.tx = c.x; CAM.tz = c.z; CAM.ty = heightAt(c.x, c.z);
  CAM.dist = clamp(W.M * 0.42, 500, 2600); CAM.pitch = 0.72; CAM.yaw = rr(0, TAU);
  CAM.maxD = Math.max(2000, W.M * 1.5);
}
function camUpdate(dt) {
  if (CAM.orbit) CAM.yaw += dt * 0.05;
  // keyboard pan and rotate
  const k = INP.keys, sp = CAM.dist * 0.9;
  let fx = 0, fz = 0;
  if (k.has('KeyW') || k.has('ArrowUp')) fz -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) fz += 1;
  if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
  if (fx || fz) panBy(fx * sp * dt, fz * sp * dt);
  if (k.has('KeyQ')) CAM.yaw -= dt * 1.2;
  if (k.has('KeyE')) CAM.yaw += dt * 1.2;
  if (k.has('KeyR') || k.has('Equal')) zoomBy(Math.exp(-dt * 1.5));
  if (k.has('KeyF') || k.has('Minus')) zoomBy(Math.exp(dt * 1.5));
  CAM.tx = clamp(CAM.tx, 0, W.M); CAM.tz = clamp(CAM.tz, 0, W.M);
  const gy = Math.max(heightAt(CAM.tx, CAM.tz), waterSurface(CAM.tx, CAM.tz), 0);
  CAM.ty = damp(CAM.ty, gy, 4, dt);
  const cp = Math.cos(CAM.pitch), sp2 = Math.sin(CAM.pitch);
  let x = CAM.tx + Math.sin(CAM.yaw) * cp * CAM.dist, z = CAM.tz + Math.cos(CAM.yaw) * cp * CAM.dist, y = CAM.ty + sp2 * CAM.dist;
  let floor = Math.max(heightAt(x, z), waterSurface(x, z)) + 12;
  // never inside a building: stay above the roof under the camera
  const under = buildingAt(x, z);
  if (under) floor = Math.max(floor, under.y + under.h * (1 - under.c * 0.94) + 6);
  if (y < floor) y = floor;
  // shake
  const sh = G.shake || 0;
  let ox = 0, oy = 0, oz = 0;
  if (sh > 0.001) { const a = Math.min(CAM.dist * 0.012, 30) * sh; ox = rr(-a, a); oy = rr(-a, a) * 0.6; oz = rr(-a, a); }
  G.shake = Math.max(0, sh - dt * 1.2);
  R.camera.position.set(x + ox, y + oy, z + oz);
  R.camera.lookAt(CAM.tx + ox * 0.5, CAM.ty + oy * 0.5, CAM.tz + oz * 0.5);
  R.camera.near = clamp(CAM.dist * 0.01, 1, 20); R.camera.far = 30000; R.camera.updateProjectionMatrix();
  // fog: further when high up
  U.uFogN.value = 300 + CAM.dist * 0.9; U.uFogF.value = 2500 + CAM.dist * 2.4 + W.M * 0.6;
}
function panBy(dx, dz) {
  const c = Math.cos(CAM.yaw), s = Math.sin(CAM.yaw);
  CAM.tx += dx * c + dz * s; CAM.tz += -dx * s + dz * c;
}
function zoomBy(f, sx, sy) {
  const nd = clamp(CAM.dist * f, CAM.minD, CAM.maxD);
  // keep the point under the cursor in place
  if (sx !== undefined) {
    const p = pickGround(sx, sy);
    if (p) { const k = 1 - nd / CAM.dist; CAM.tx += (p.x - CAM.tx) * k; CAM.tz += (p.z - CAM.tz) * k; }
  }
  CAM.dist = nd;
}

// ---------- picking ----------
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
function pickRay(sx, sy) { _ndc.set(sx / R.w * 2 - 1, -(sy / R.h) * 2 + 1); _ray.setFromCamera(_ndc, R.camera); return _ray.ray; }
function pickGround(sx, sy, withBuildings = false) {
  const ray = pickRay(sx, sy), o = ray.origin, d = ray.direction;
  const maxT = 30000;
  let t = 0, step = Math.max(2, CAM.dist * 0.004);
  const topH = W.def ? W.def.hmax * 1.6 + 60 : 600;
  let prevT = 0;
  for (let i = 0; i < 2500 && t < maxT; i++) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    const g = inWorld(x, z) ? Math.max(heightAt(x, z), waterSurface(x, z)) : 0;
    if (withBuildings && y < topH && inWorld(x, z)) {
      const b = buildingAt(x, z);
      if (b && y < b.y + b.h * (1 - b.c * 0.9)) return { x, z, y, b };
    }
    if (y <= g) {
      // refine
      let a = prevT, bT = t;
      for (let k = 0; k < 10; k++) { const m = (a + bT) / 2, mx = o.x + d.x * m, my = o.y + d.y * m, mz = o.z + d.z * m; const mg = inWorld(mx, mz) ? Math.max(heightAt(mx, mz), waterSurface(mx, mz)) : 0; if (my <= mg) bT = m; else a = m; }
      const x2 = o.x + d.x * bT, z2 = o.z + d.z * bT;
      return { x: x2, z: z2, y: o.y + d.y * bT, b: null, out: !inWorld(x2, z2) };
    }
    prevT = t;
    const above = y - g;
    t += clamp(above * 0.5, step, 200);
  }
  return null;
}
function updateCursorPick() {
  if (INP.overUI || !INP.hasMouse && !INP.touches.size) { G.cursor.ok = false; return; }
  const p = pickGround(INP.mx, INP.my, true);
  if (!p || p.out) { G.cursor.ok = false; return; }
  G.cursor.ok = true; G.cursor.x = p.x; G.cursor.z = p.z; G.cursor.b = p.b;
}

// ---------- casting ----------
let HOLD_N = 0;
function beginCast() {
  const p = G.power && PW[G.power];
  if (!p || !G.cursor.ok || G.state !== 'play') return false;
  AUDIO.init();
  G.holding = true; G.holdId = ++HOLD_N;
  INP.castedThisDown = true;
  if (p.mode === 'line') { INP.lineA = { x: G.cursor.x, z: G.cursor.z }; return true; }
  doCast(p, G.cursor.x, G.cursor.z);
  INP.holdT = 0;
  return true;
}
function doCast(p, x, z, o) {
  const r = brushR(p);
  p.cast(x, z, r, o || {});
  G.casts = (G.casts || 0) + 1;
  bus.emit('cast', p);
}
function holdCast(dt) {
  const p = G.power && PW[G.power];
  if (!G.holding || !p || p.mode !== 'hold' || !G.cursor.ok) return;
  INP.holdT += dt;
  while (INP.holdT >= p.every) { INP.holdT -= p.every; doCast(p, G.cursor.x, G.cursor.z, { dt: p.every }); }
}
function endCast() {
  const p = G.power && PW[G.power];
  if (p && p.mode === 'line' && INP.lineA && G.cursor.ok) doCast(p, INP.lineA.x, INP.lineA.z, { bx: G.cursor.x, bz: G.cursor.z });
  INP.lineA = null;
  G.holding = false;
}

// ---------- mouse ----------
function initInput() {
  const cv = $('#c');
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    AUDIO.init();
    cv.setPointerCapture(e.pointerId);
    INP.hasMouse = true; INP.mx = e.clientX; INP.my = e.clientY;
    INP.down = true; INP.btn = e.button; INP.sx = e.clientX; INP.sy = e.clientY; INP.moved = 0; INP.castedThisDown = false;
    updateCursorPick();
    if (e.button === 0 && !e.shiftKey && G.power && G.state === 'play') beginCast();
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const dx = e.clientX - INP.mx, dy = e.clientY - INP.my;
    INP.hasMouse = true; INP.mx = e.clientX; INP.my = e.clientY; INP.overUI = false;
    if (!INP.down) return;
    INP.moved += Math.abs(dx) + Math.abs(dy);
    if (INP.btn === 2 || (INP.btn === 0 && e.altKey)) { CAM.yaw -= dx * 0.005; CAM.pitch = clamp(CAM.pitch + dy * 0.004, 0.18, 1.5); }
    else if (INP.btn === 1 || (INP.btn === 0 && (!G.power || e.shiftKey || G.state !== 'play'))) dragPan(dx, dy);
  });
  const up = (e) => { if (e.pointerType === 'touch') return; if (INP.down && INP.btn === 0) endCast(); INP.down = false; INP.btn = -1; };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  // only a mouse leaving the canvas means it is over the interface; a lifted finger fires this too
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') INP.overUI = true; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (e.ctrlKey && G.power) { setSize(G.size - Math.sign(e.deltaY) * 0.05); return; } zoomBy(Math.exp(clamp(e.deltaY, -200, 200) * 0.0012), e.clientX, e.clientY); }, { passive: false });
  // touch: one finger casts (or pans with no power), two fingers pan, pinch and twist
  cv.addEventListener('touchstart', (e) => {
    e.preventDefault(); AUDIO.init();
    document.body.classList.add('touch');
    INP.overUI = false;
    for (const t of e.changedTouches) INP.touches.set(t.identifier, { x: t.clientX, y: t.clientY, x0: t.clientX, y0: t.clientY });
    if (INP.touches.size === 1) {
      const t = [...INP.touches.values()][0];
      INP.mx = t.x; INP.my = t.y; INP.castedThisDown = false;
      updateCursorPick();
      if (G.power && G.state === 'play' && !G.handMode) beginCast();
    } else { if (G.holding) endCast(); G.holding = false; INP.lineA = null; INP.pinch = pinchState(); }
  }, { passive: false });
  cv.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) { const o = INP.touches.get(t.identifier); if (o) { o.px = o.x; o.py = o.y; o.x = t.clientX; o.y = t.clientY; } }
    if (INP.touches.size === 1) {
      const t = [...INP.touches.values()][0];
      if (G.power && G.state === 'play' && !G.handMode) { INP.mx = t.x; INP.my = t.y; }
      else dragPan(t.x - (t.px ?? t.x), t.y - (t.py ?? t.y));
    } else if (INP.touches.size >= 2 && INP.pinch) {
      const p = pinchState(), q = INP.pinch;
      zoomBy(q.d / Math.max(10, p.d));
      CAM.yaw -= angWrap(p.a - q.a);
      dragPan(p.cx - q.cx, p.cy - q.cy);
      CAM.pitch = clamp(CAM.pitch + (p.cy - q.cy) * 0.0 , 0.18, 1.5);
      INP.pinch = p;
    }
  }, { passive: false });
  const tend = (e) => {
    for (const t of e.changedTouches) INP.touches.delete(t.identifier);
    if (INP.touches.size === 0) { if (G.holding) endCast(); INP.pinch = null; G.cursor.ok = false; }
    else if (INP.touches.size === 1) INP.pinch = null;
    else INP.pinch = pinchState();
  };
  cv.addEventListener('touchend', tend); cv.addEventListener('touchcancel', tend);
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    INP.keys.add(e.code);
    onKey(e);
  });
  addEventListener('keyup', (e) => INP.keys.delete(e.code));
  addEventListener('blur', () => { INP.keys.clear(); if (G.holding) endCast(); INP.down = false; });
}
function pinchState() {
  const [a, b] = [...INP.touches.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
}
// drags the ground under the pointer
function dragPan(dx, dy) {
  const k = CAM.dist * 0.0016 * (R.camera.fov / 50);
  panBy(-dx * k, -dy * k / Math.max(0.35, Math.sin(CAM.pitch)));
}
const POWER_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'];
const keyLabel = (i) => (POWER_KEYS[i] || '').replace('Digit', '').replace('Key', '');
function onKey(e) {
  if (G.state !== 'play') { if (e.code === 'Escape' && G.state === 'menu') closeMenu(); return; }
  const i = POWER_KEYS.indexOf(e.code);
  if (i >= 0) { const list = POWERS.filter((p) => p.side === G.side); if (list[i]) selectPower(G.power === list[i].id ? null : list[i].id); e.preventDefault(); return; }
  switch (e.code) {
    case 'Tab': e.preventDefault(); setSide(G.side === 'wrath' ? 'grace' : 'wrath'); break;
    case 'Escape': if (G.power) selectPower(null); else openMenu(); break;
    case 'BracketLeft': setSize(G.size - 0.08); break;
    case 'BracketRight': setSize(G.size + 0.08); break;
    case 'Space': e.preventDefault(); togglePause(); break;
    case 'KeyH': document.body.classList.toggle('nohud'); break;
    case 'KeyN': cycleHour(); break;
    case 'KeyT': cycleSpeed(); break;
    case 'KeyM': UI.toggleSound(); break;
  }
}
