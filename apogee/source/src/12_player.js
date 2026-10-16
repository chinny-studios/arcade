// 12_player: input and the player. Two control schemes:
//   modern  - WASD + mouse look, right mouse zooms the sights, no auto-aim (a little on a gamepad).
//   classic - the cartridge feel: auto-aim, the view re-centres as you walk, and holding right mouse (or the left
//             trigger) freezes the view and moves a crosshair around the screen instead. Arrow keys turn.
const INPUT = { keys: {}, pressed: new Set(), mdx: 0, mdy: 0, lmb: false, rmb: false, wheel: 0, locked: false, padPrev: [], padIdx: -1, lastPad: 0 };
const BIND = { fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA'], right: ['KeyD'], turnL: ['ArrowLeft'], turnR: ['ArrowRight'],
  fire: ['ControlRight'], reload: ['KeyR'], use: ['KeyE', 'Space'], prev: ['KeyQ'], next: [], det: ['KeyF'], crouch: ['KeyC', 'ControlLeft'], watch: ['Tab', 'Escape', 'Enter', 'KeyP'], aimKey: ['ShiftLeft'] };
const held = (a) => BIND[a].some((k) => INPUT.keys[k]);
const tapped = (a) => BIND[a].some((k) => INPUT.pressed.has(k));

function initInput() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.repeat) INPUT.pressed.add(e.code);
    INPUT.keys[e.code] = true;
    initAudio();
    uiKey(e);
  });
  window.addEventListener('keyup', (e) => { INPUT.keys[e.code] = false; });
  window.addEventListener('blur', () => { INPUT.keys = {}; INPUT.lmb = INPUT.rmb = false; });
  window.addEventListener('mousemove', (e) => { if (INPUT.locked) { INPUT.mdx += e.movementX || 0; INPUT.mdy += e.movementY || 0; } });
  canvasEl.addEventListener('mousedown', (e) => {
    initAudio();
    if (G.state === 'play' && !INPUT.locked) { requestLock(); return; }
    if (e.button === 0) INPUT.lmb = true; if (e.button === 2) INPUT.rmb = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) INPUT.lmb = false; if (e.button === 2) INPUT.rmb = false; });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => { if (G.state === 'play') INPUT.wheel += Math.sign(e.deltaY); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    INPUT.locked = document.pointerLockElement === canvasEl;
    if (!INPUT.locked && G.state === 'play' && !DEBUG && !G.player.dead) openWatch();
  });
}
function requestLock() { try { const r = canvasEl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not allowed */ } }

// ---------------------------------------------------------------- gamepad
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad = null;
  for (const p of pads) if (p && p.connected && p.mapping === 'standard') { pad = p; break; }
  if (!pad) for (const p of pads) if (p && p.connected) { pad = p; break; }
  if (!pad) return null;
  const b = pad.buttons.map((x) => x.pressed || x.value > 0.5), prev = INPUT.padPrev;
  const ax = (i) => { const v = pad.axes[i] || 0; return Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82; };
  const st = { lx: ax(0), ly: ax(1), rx: ax(2), ry: ax(3), b, tap: (i) => b[i] && !prev[i], lt: pad.buttons[6] ? pad.buttons[6].value : 0, rt: pad.buttons[7] ? pad.buttons[7].value : 0 };
  if (b.some((x) => x) || Math.abs(st.lx) + Math.abs(st.ly) + Math.abs(st.rx) + Math.abs(st.ry) > 0) INPUT.lastPad = performance.now();
  INPUT.padPrev = b;
  return st;
}

// ---------------------------------------------------------------- player
function newPlayer(start, yaw) {
  return {
    x: start.x, y: start.y, z: start.z, yaw, pitch: 0, vx: 0, vz: 0, vy: 0, hp: 100, armor: 0, eye: 1.62, crouch: false,
    weapons: [], cur: 0, next: null, switchT: 0, reloadT: 0, fireT: 0, mag: {}, ammo: {}, items: {}, bugs: 0,
    aiming: false, aimMode: false, aimX: 0, aimY: 0, autoAim: false, lookDX: 0, lookDY: 0, dead: false, deadT: 0, hurtT: 0,
    trigHeld: false, bob: 0, use: null, stepT: 0,
  };
}
function updatePlayer(dt) {
  const p = G.player;
  const pad = pollPad();
  const classic = SET.controls === 'classic';
  const usingPad = pad && performance.now() - INPUT.lastPad < 4000;
  p.autoAim = classic || !!usingPad;
  if (p.dead) {
    p.deadT += dt;
    INPUT.mdx = INPUT.mdy = 0; INPUT.pressed.clear();
    return;
  }
  // ---- look and aim
  const sens = 0.0022 * SET.sens, inv = SET.invert ? -1 : 1;
  const W = curWeapon();
  const aimHeld = INPUT.rmb || held('aimKey') || (pad && pad.lt > 0.4);
  p.lookDX = INPUT.mdx; p.lookDY = INPUT.mdy;
  let turn = 0, look = 0;
  if (held('turnL')) turn += 1; if (held('turnR')) turn -= 1;
  if (classic && aimHeld) {
    // aim mode: the crosshair moves, the view only drifts near the edges
    p.aimMode = true; p.aiming = false;
    p.aimX = clamp(p.aimX + INPUT.mdx * sens * 0.9, -0.85, 0.85);
    p.aimY = clamp(p.aimY - INPUT.mdy * sens * 0.9 * inv, -0.8, 0.8);
    if (pad) { p.aimX = clamp(p.aimX + pad.lx * dt * 1.6, -0.85, 0.85); p.aimY = clamp(p.aimY - pad.ly * dt * 1.6, -0.8, 0.8); }
    if (Math.abs(p.aimX) > 0.7) p.yaw -= Math.sign(p.aimX) * (Math.abs(p.aimX) - 0.7) * 6 * dt;
    if (Math.abs(p.aimY) > 0.65) p.pitch += Math.sign(p.aimY) * (Math.abs(p.aimY) - 0.65) * 5 * dt;
  } else {
    p.aimMode = false; p.aimX *= 0.5; p.aimY *= 0.5;
    p.aiming = !classic && aimHeld;
    const z = p.aiming ? 1 / (W.zoom || 1.35) : 1;
    p.yaw -= INPUT.mdx * sens * z;
    p.pitch -= INPUT.mdy * sens * z * inv;
    if (pad) {
      if (classic) { turn -= pad.lx; look -= pad.ry * inv; }
      else { p.yaw -= pad.rx * dt * 2.8 * SET.sens * z; p.pitch -= pad.ry * dt * 2.0 * SET.sens * z * inv; }
    }
  }
  p.yaw += turn * dt * 2.3;
  p.pitch += look * dt * 1.6;
  p.pitch = clamp(p.pitch, -1.3, 1.3);
  INPUT.mdx = INPUT.mdy = 0;
  // ---- movement
  let f = 0, s = 0;
  if (held('fwd')) f += 1; if (held('back')) f -= 1;
  if (held('right')) s += 1; if (held('left')) s -= 1;
  if (pad && !(classic && p.aimMode)) {
    if (classic) { f -= pad.ly; s += pad.rx; }
    else { f -= pad.ly; s += pad.lx; }
  }
  if (tapped('crouch') || (pad && pad.tap(1))) p.crouch = !p.crouch;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  let speed = p.crouch ? 1.9 : (f < 0 ? 3.4 : 4.4);
  if (p.aiming || p.aimMode) speed *= 0.6;
  const fx = fwdX(p.yaw), fz = fwdZ(p.yaw), rx = -fz, rz = fx;
  const tvx = (fx * f + rx * s * 0.85) * speed, tvz = (fz * f + rz * s * 0.85) * speed;
  const acc = Math.min(1, dt * 10);
  p.vx = lerp(p.vx, tvx, acc); p.vz = lerp(p.vz, tvz, acc);
  // classic: the view drifts back to level while walking
  if (classic && !p.aimMode && Math.abs(f) > 0.3 && !look && Math.abs(p.lookDY) < 1) p.pitch *= Math.max(0, 1 - dt * 2.5);
  const o = { x: p.x + p.vx * dt, z: p.z + p.vz * dt };
  collideCircle(o, 0.33, p.y, 0.55, p.crouch ? 1.1 : 1.75);
  const bumped = Math.hypot(o.x - (p.x + p.vx * dt), o.z - (p.z + p.vz * dt)) > 0.001;
  p.x = o.x; p.z = o.z;
  if (bumped) bumpDoor(p);
  const gy = groundUnder(p.x, p.z, 0.33, p.y);
  if (gy > p.y) p.y = Math.min(gy, p.y + dt * 5);
  else if (gy < p.y) { p.vy -= 18 * dt; p.y = Math.max(gy, p.y + p.vy * dt); }
  if (p.y <= gy + 1e-4) p.vy = 0;
  p.eye = lerp(p.eye, p.crouch ? 1.0 : 1.62, Math.min(1, dt * 10));
  const sp = Math.hypot(p.vx, p.vz);
  p.bob += dt * sp * 2.0;
  // ---- weapons
  p.fireT -= dt; p.hurtT -= dt;
  if (p.switchT > 0) {
    const before = p.switchT;
    p.switchT -= dt;
    if (before > 0.225 && p.switchT <= 0.225 && p.next !== null) { p.cur = p.next; p.next = null; buildViewmodel(curWeapon().id); }
    if (p.switchT <= 0) p.switchT = 0;
  }
  if (p.reloadT > 0) {
    p.reloadT -= dt;
    if (p.reloadT <= 0) {
      p.reloadT = 0;
      const R = curWeapon(), need = R.mag - p.mag[R.id], take = Math.min(need, p.ammo[R.ammo] || 0);
      p.mag[R.id] += take; p.ammo[R.ammo] -= take;
    }
  }
  const trig = INPUT.lmb || held('fire') || (pad && pad.rt > 0.4);
  const Wc = curWeapon();
  if (trig && (!p.trigHeld || Wc.auto || Wc.melee)) playerFire();
  p.trigHeld = trig;
  if (tapped('reload') || (pad && pad.tap(2))) startReload();
  if (tapped('prev') || (pad && pad.tap(4))) cycleWeapon(-1);
  if (tapped('next') || (pad && pad.tap(3))) cycleWeapon(1);
  if (INPUT.wheel) { cycleWeapon(INPUT.wheel > 0 ? 1 : -1); INPUT.wheel = 0; }
  for (let k = 1; k <= 9; k++) if (INPUT.pressed.has('Digit' + k)) selectWeapon(k - 1);
  if (tapped('det') || (pad && pad.tap(5))) detonateMines();
  if (tapped('use') || (pad && pad.tap(0))) useAction();
  if (pad && pad.tap(9)) openWatch();
  updateUse(dt);
  // ---- exits
  const ci = idxAt(p.x, p.z);
  if (ci >= 0 && L.exits.has(ci)) tryExit();
  // footsteps
  p.stepT -= dt * sp;
  if (p.stepT <= 0 && sp > 1) { p.stepT = 2.2; }
}
function bumpDoor(p) {
  const fx = fwdX(p.yaw), fz = fwdZ(p.yaw);
  for (const d of [1.0, 0.6]) {
    const i = idxAt(p.x + fx * d, p.z + fz * d);
    if (i >= 0 && L.type[i] === T_DOOR) {
      const door = L.doorAt.get(i);
      if (door.locked && !G.player.items[door.locked]) { if (G.time - (p.lockNag || -9) > 3) { p.lockNag = G.time; hudMsg((L.def.lockMsg && L.def.lockMsg[door.locked]) || 'Door is locked'); sfx('deny'); } }
      else if (door.open < 0.5 && door.target === 0) openDoor(door, 'player');
      return;
    }
  }
}
// What's in front of the player that E would act on?
function useTarget() {
  const p = G.player;
  const ox = p.x, oy = p.y + p.eye, oz = p.z;
  const dx = fwdX(p.yaw) * Math.cos(p.pitch), dy = Math.sin(p.pitch), dz = fwdZ(p.yaw) * Math.cos(p.pitch);
  const h = rayWorld(ox, oy, oz, dx, dy, dz, 2.6);
  if (h && h.door) return { kind: 'door', door: h.door, text: h.door.locked ? 'Locked' : 'Open door' };
  // look for a door cell just ahead (ray may slip under a raised slab)
  for (const d of [0.9, 1.6]) { const i = idxAt(ox + fwdX(p.yaw) * d, oz + fwdZ(p.yaw) * d); if (i >= 0 && L.type[i] === T_DOOR && L.doorAt.get(i).open < 0.5) { const door = L.doorAt.get(i); return { kind: 'door', door, text: door.locked ? 'Locked' : 'Open door' }; } }
  let best = null, bd = 3.0;
  for (const pr of L.props) {
    if (!pr.box || pr.dead) continue;
    const u = usableProp(pr);
    if (!u) continue;
    const cx = (pr.box[0] + pr.box[3]) / 2, cz = (pr.box[2] + pr.box[5]) / 2;
    const d = Math.max(Math.abs(cx - p.x) - (pr.box[3] - pr.box[0]) / 2, Math.abs(cz - p.z) - (pr.box[5] - pr.box[2]) / 2);
    const facing = (cx - p.x) * fwdX(p.yaw) + (cz - p.z) * fwdZ(p.yaw);
    if (d < bd && facing > 0) { bd = d; best = Object.assign({ kind: 'prop', prop: pr }, u); }
  }
  return best;
}
function usableProp(pr) {
  if (pr.kind === 'alarm' && G.alarm && G.alarm.on) return { text: 'Shut off alarm' };
  const ob = OBJ.list.find((o) => (o.type === 'download' || o.type === 'use') && o.target === pr.id && o.status === 'open');
  if (ob) return { text: ob.type === 'download' ? (G.player.items.datakey ? 'Download data' : 'Needs data key') : (ob.prompt || 'Use'), ob };
  return null;
}
function useAction() {
  const t = useTarget();
  if (!t) { sfx('empty'); return; }
  if (t.kind === 'door') { openDoor(t.door, 'player'); return; }
  if (t.prop.kind === 'alarm') { stopAlarm('Alarm deactivated'); sfx('beep'); return; }
  if (t.ob) {
    if (t.ob.type === 'download' && !G.player.items.datakey) { hudMsg('You need the data key'); sfx('deny'); return; }
    G.player.use = { ob: t.ob, prop: t.prop, t: 0, len: t.ob.time || 4.5 };
    sfx('plant');
  }
}
function updateUse(dt) {
  const p = G.player, u = p.use;
  if (!u) return;
  const b = u.prop.box, cx = (b[0] + b[3]) / 2, cz = (b[2] + b[5]) / 2;
  if (Math.hypot(cx - p.x, cz - p.z) > 4) { hudMsg(u.ob.type === 'download' ? 'Download interrupted' : 'Interrupted'); p.use = null; sfx('deny'); return; }
  u.t += dt;
  if (u.t >= u.len) { p.use = null; completeObjective(u.ob); sfx('pickupKey'); }
}

// ---------------------------------------------------------------- damage
function damagePlayer(amount, fromX, fromZ, explosive) {
  const p = G.player;
  if (!p || p.dead || G.god || G.state !== 'play') return;
  let a = amount;
  if (p.armor > 0) { const took = Math.min(p.armor, a); p.armor -= took; a -= took; }
  p.hp -= a;
  p.hurtT = 0.3; HUD.hurt = Math.min(1, HUD.hurt + 0.35 + amount / 60); HUD.showBars = 2.5;
  HUD.hurtDir = fromX !== undefined ? angDiff(p.yaw, yawTo(fromX - p.x, fromZ - p.z)) : null;
  p.flinch = Math.min(0.12, (p.flinch || 0) + (explosive ? 0.1 : 0.035));
  sfx('hurt');
  if (p.hp <= 0) { p.hp = 0; p.dead = true; p.deadT = 0; sfx('die'); missionFailed('You were killed'); }
}
function updateCamera(dt) {
  const p = G.player;
  let y = p.y + p.eye + Math.abs(Math.sin(p.bob)) * 0.03 * Math.min(1, Math.hypot(p.vx, p.vz) / 4);
  let roll = 0;
  if (p.dead) { const t = Math.min(1, p.deadT / 1.2); y = lerp(p.y + p.eye, p.y + 0.3, t * t); roll = t * 1.2; }
  const sh = FX.shake * 0.08;
  camera.position.set(p.x + rand(-sh, sh), y + rand(-sh, sh), p.z + rand(-sh, sh));
  p.flinch = Math.max(0, (p.flinch || 0) - dt * 0.6);
  camera.rotation.set(p.pitch + (p.flinch || 0), p.yaw, roll);
  const W = curWeapon();
  const zoom = p.aiming ? (W.zoom || 1.35) : (p.aimMode && W.zoom ? 1.3 : 1);
  const fov = VIEW.fov / zoom;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = lerp(camera.fov, fov, Math.min(1, dt * 14)); camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
}
