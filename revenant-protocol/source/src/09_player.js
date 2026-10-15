// Revenant Protocol — the player: movement, hazards, gear, damage, using things, first-person weapon view

const P = {
  x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, r: 0.32, h: 1.75, step: 0.62, onGround: false, yaw: 0, pitch: 0,
  eyeY: 0, eyeH: 1.6, crouch: false, health: 100, shield: 0, lives: 3, ammo: {}, weapons: new Set(), cur: 'fists',
  keys: new Set(), gear: new Set(), battery: 100, lampOn: false, maskOn: false, cleatsOn: false, boostW: 0, boostS: 0,
  dead: false, deadT: 0, bob: 0, bobAmt: 0, kick: 0, shake: 0, hurtT: 0, spawn: null, lastCell: null, inLiquid: false, stepT: 0,
};

function resetPlayer(loadout, keepLives) {
  P.health = 100; P.shield = loadout.shield || 0; if (!keepLives) P.lives = 3;
  P.ammo = {}; for (const k in AMMO_MAX) P.ammo[k] = 0;
  Object.assign(P.ammo, loadout.ammo || {});
  P.weapons = new Set(loadout.weapons);
  P.cur = ['carbine', 'pistol', 'fists'].find((w) => loadout.weapons.includes(w));
  P.keys = new Set(); P.gear = new Set(); P.battery = 100; P.lampOn = P.maskOn = P.cleatsOn = false; P.boostW = P.boostS = 0;
  P.dead = false; P.vx = P.vz = P.vy = 0; P.crouch = false; P.h = 1.75;
}
function placePlayer(x, z, yaw) {
  P.x = x; P.z = z; P.yaw = yaw || 0; P.pitch = 0;
  const c = cellAt(x, z); P.y = bodyFloor(c); P.eyeY = P.y + P.eyeH; P.onGround = true; P.vy = 0;
}

function playerForward() { return [-Math.sin(P.yaw), -Math.cos(P.yaw)]; }

function updatePlayer(dt) {
  if (P.dead) {
    P.deadT += dt;
    P.eyeY = lerp(P.eyeY, P.y + 0.3, dt * 3);
    P.pitch = lerp(P.pitch, 0.3, dt * 2);
    if (P.deadT > 1.6 && G.state === 'play') showDeath();
    return;
  }
  // look
  const sens = 0.0022 * SETTINGS.sens;
  P.yaw -= mouse.dx * sens; P.pitch -= mouse.dy * sens * (SETTINGS.invert ? -1 : 1);
  mouse.dx = mouse.dy = 0;
  if (keys.ArrowLeft) P.yaw += dt * 2.4;
  if (keys.ArrowRight) P.yaw -= dt * 2.4;
  P.pitch = clamp(P.pitch, -1.45, 1.45);

  // crouch / stand
  const wantCrouch = keys.KeyC || keys.ControlLeft || VI.crouch;
  if (wantCrouch) P.crouch = true;
  else if (P.crouch && ceilOver(P) - P.y >= 1.78) P.crouch = false;
  P.h = P.crouch ? 1.05 : 1.75;

  const cell = cellAt(P.x, P.z);
  const inLiquid = !!cell.d.liq && P.y <= floorOf(cell) - 0.1;
  if (inLiquid && !P.inLiquid) sfx('splash', 0.6);
  P.inLiquid = inLiquid;

  // movement
  let fx = 0, fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz += 1;
  if (keys.KeyS || keys.ArrowDown) fz -= 1;
  if (keys.KeyD) fx += 1;
  if (keys.KeyA) fx -= 1;
  fx += VI.mx; fz += VI.mz;
  const l = Math.hypot(fx, fz); if (l > 1) { fx /= l; fz /= l; }
  let speed = keys.ShiftLeft || keys.ShiftRight ? 3.4 : 7.2;
  if (P.crouch) speed = 2.6;
  if (inLiquid) speed *= cell.d.liq === 'water' ? 0.6 : 0.5;
  const s = Math.sin(P.yaw), c = Math.cos(P.yaw);
  const tx = (-s * fz + c * fx) * speed, tz = (-c * fz - s * fx) * speed;
  const icy = cell.d.ice && !P.cleatsOn && P.onGround;
  const acc = !P.onGround ? 6 : icy ? 1.2 : 16;
  const k = 1 - Math.exp(-acc * dt);
  P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k;
  const yBefore = P.y;
  moveBody(P, P.vx * dt, P.vz * dt);
  // jump
  if ((take('Space') || VI.jump) && P.onGround && !P.crouch) { P.vy = inLiquid ? 4.6 : 6.3; P.onGround = false; sfx('jump', 0.5); }
  VI.jump = false;
  const wasAir = !P.onGround;
  fallBody(P, dt);
  if (wasAir && P.onGround && P.landV < -4) sfx('land', clamp(-P.landV / 12, 0.2, 0.8));
  // eye: smooth out stair steps
  const target = P.y + (P.crouch ? 0.9 : 1.6);
  P.eyeY = P.y > yBefore + 0.05 && P.onGround ? Math.max(P.eyeY, target - 0.5) : P.eyeY;
  P.eyeY = lerp(P.eyeY, target, 1 - Math.exp(-dt * 16));
  if (Math.abs(P.eyeY - target) > 0.6) P.eyeY = target - Math.sign(target - P.eyeY) * 0.6;
  // bob
  const moving = Math.hypot(P.vx, P.vz);
  P.bobAmt = lerp(P.bobAmt, P.onGround ? clamp(moving / 7, 0, 1) : 0, dt * 8);
  P.bob += dt * (6 + moving * 0.6);
  if (P.onGround && moving > 2) { P.stepT -= dt * moving; if (P.stepT < 0) { P.stepT = 3.6; sfx(inLiquid ? 'splash' : 'step', inLiquid ? 0.12 : 0.35); } }

  // hazards and sector effects
  const here = cellAt(P.x, P.z);
  if (here.d.kill && P.y <= floorOf(here) + 0.3) { hurtPlayer(999, null, 'fall'); return; }
  if (here.d.dmg && !here.d.gas && P.y <= bodyFloor(here) + 0.15) hurtPlayer(here.d.dmg * dt, null, 'hazard', true);
  if (here.d.gas) { if (P.maskOn) P.battery -= dt * 0.6; else { P.gasT = (P.gasT || 0) + dt; if (P.gasT > 0.5) { P.gasT = 0; hurtPlayer(5, null, 'gas', true); } } }
  if (here !== P.lastCell) {
    P.lastCell = here;
    if (here.d.secret && !here.d.door && !here.found) { for (const c of LV.cells) if (c.ch === here.ch) c.found = true; G.stats.secrets++; msg('SECRET AREA FOUND'); sfx('secret', 0.8); }
    if (here.d.check) P.spawn = { x: (here.x + 0.5) * CELL, z: (here.z + 0.5) * CELL, yaw: P.yaw };
    if (here.d.tag) levelEvent('enter:' + here.d.tag, here);
  }
  // gear
  if (take('KeyF')) toggleLamp();
  if (take('KeyG')) toggleGear('mask');
  if (take('KeyV')) toggleGear('cleats');
  if (P.lampOn) P.battery -= dt * 0.35;
  if (P.battery <= 0) { P.battery = 0; if (P.lampOn || P.maskOn) { P.lampOn = false; P.maskOn = false; msg('BATTERY DEPLETED'); } }
  U.uLamp.value = P.lampOn ? 1.1 : 0;
  if (P.boostW > 0) P.boostW -= dt;
  if (P.boostS > 0) P.boostS -= dt;
  P.hurtT = Math.max(0, P.hurtT - dt);
  P.shake = Math.max(0, P.shake - dt * 2.5);
  if (take('KeyE') || VI.use) doUse();
  VI.use = false;
  if (G.time % 0.25 < dt) markSeen(P.x, P.z);
}
function toggleLamp() {
  if (P.battery <= 0) { msg('NO BATTERY POWER'); sfx('denied', 0.5); return; }
  P.lampOn = !P.lampOn; sfx('lamp');
  msg(P.lampOn ? 'HEADLAMP ON' : 'HEADLAMP OFF');
}
function toggleGear(g) {
  if (!P.gear.has(g)) { msg(g === 'mask' ? 'YOU HAVE NO GAS MASK' : 'YOU HAVE NO ICE CLEATS'); sfx('denied', 0.4); return; }
  if (g === 'mask') { if (P.battery <= 0 && !P.maskOn) { msg('NO BATTERY POWER'); return; } P.maskOn = !P.maskOn; msg(P.maskOn ? 'GAS MASK ON' : 'GAS MASK OFF'); }
  else { P.cleatsOn = !P.cleatsOn; msg(P.cleatsOn ? 'ICE CLEATS ON' : 'ICE CLEATS OFF'); }
  sfx('lamp');
}

function updateCamera(dt) {
  const cam = R.camera;
  const bx = Math.sin(P.bob) * 0.03 * P.bobAmt, by = Math.abs(Math.cos(P.bob)) * 0.045 * P.bobAmt;
  const sh = P.shake * 0.12;
  cam.position.set(P.x + bx * Math.cos(P.yaw) + (Math.random() - 0.5) * sh, P.eyeY + by + (Math.random() - 0.5) * sh, P.z - bx * Math.sin(P.yaw));
  cam.rotation.set(P.pitch + P.kick * 0.04, P.yaw, P.dead ? 0.4 : 0);
}

function hurtPlayer(amount, src, kind, quiet) {
  if (P.dead || G.god) return;
  if (P.boostS > 0 && kind !== 'fall') return;
  amount *= kind === 'fall' ? 1 : DIFF[G.diff].dmg;
  if (kind !== 'gas' && kind !== 'fall' && P.shield > 0) {
    const a = Math.min(P.shield, amount); P.shield -= a; amount -= a;
    if (!quiet) { tint('rgba(80,170,255,.35)'); sfx('shieldhit', 0.6); }
  }
  if (amount > 0) {
    P.health -= amount;
    if (!quiet || P.hurtT <= 0) { tint('rgba(255,30,10,.4)'); sfx('hurt', 0.6); P.hurtT = 0.4; }
  }
  if (src) P.shake = Math.min(1, P.shake + 0.25);
  if (P.health <= 0) killPlayer(kind);
}
function killPlayer(kind) {
  P.health = 0; P.dead = true; P.deadT = 0; P.lampOn = false;
  sfx('diebig', 0.7);
  G.deathKind = kind;
}

// Use: switches and interactive things first, then doors and lifts along the view ray, then the lift underfoot.
function doUse() {
  const [fx, fz] = playerForward();
  let best = null, bd = 2.6;
  for (const t of USABLES) {
    if (!t.usable || t.done) continue;
    const dx = t.x - P.x, dz = t.z - P.z, d = Math.hypot(dx, dz);
    if (d > bd || Math.abs(t.y - P.eyeY) > 2.2) continue;
    if ((dx * fx + dz * fz) / (d || 1) < 0.45 && d > 0.9) continue;
    best = t; bd = d;
  }
  if (best) { best.use(); return; }
  for (let t = 0.5; t <= 2.6; t += 0.3) {
    const c = cellAt(P.x + fx * t, P.z + fz * t);
    if (c.solid) break;
    if (c.door) { useDoor(c.door); return; }
    if (c.lift && c.lift !== P.onLift && floorOf(c) - P.y > 0.5) { useLift(c.lift); return; }
  }
  if (P.onLift) { useLift(P.onLift); return; }
  // a lift next to us that is down while we stand up top (or vice versa)
  for (let t = 0.5; t <= 2.0; t += 0.3) { const c = cellAt(P.x + fx * t, P.z + fz * t); if (c.lift) { useLift(c.lift); return; } if (c.solid) break; }
  sfx('empty', 0.3);
}
function useDoor(g) {
  if (g.key && !P.keys.has(g.key)) { msg('YOU NEED THE ' + { r: 'RED', b: 'BLUE', y: 'YELLOW' }[g.key] + ' KEY'); sfx('denied', 0.6); return; }
  if (g.locked) { msg(g.d.lockMsg || 'THIS DOOR IS SEALED FROM ELSEWHERE'); sfx('denied', 0.6); return; }
  openDoor(g, true);
}
function useLift(g) {
  if (g.locked) { msg(g.d.lockMsg || 'THE LIFT HAS NO POWER'); sfx('denied', 0.6); return; }
  if (g.mode === 'cycle') return;
  activateLift(g);
}

// ---------- first-person weapon ----------
const VM = { root: null, models: {}, cur: null, swap: 0, swapTo: null, punch: 0, fistSide: 0, flashT: 0, recoil: 0, charge: 0 };
function buildViewmodels() {
  const root = (R.vmRoot = new THREE.Group());
  R.vmScene.add(root);
  VM.root = root;
  const glove = (p, x, y, z) => { const h = J(p, x, y, z); B(h, 0.09, 0.09, 0.11, 0x5a4030); B(h, 0.08, 0.04, 0.07, 0x4a3024, 0, 0.05, -0.02); B(h, 0.07, 0.09, 0.2, 0x3a3e46, 0, -0.01, 0.14); return h; };
  for (const w of WEAPONS) {
    const g = new THREE.Group();
    if (w.id === 'fists') {
      const l = glove(g, -0.17, -0.2, -0.42), r = glove(g, 0.17, -0.2, -0.42); l.scale.setScalar(0.75); r.scale.setScalar(0.75);
      g.userData.l = l; g.userData.r = r;
    } else if (w.id === 'thermal' || w.id === 'mine') {
      const h = glove(g, 0.16, -0.19, -0.42); h.scale.setScalar(0.7); const it = J(h, 0, 0.08, -0.04); GUNS[w.id](it); it.scale.setScalar(1.1);
      g.userData.item = it;
    } else {
      const m = gunModel(w.id); m.position.set(0.15, -0.15, -0.42); m.rotation.y = 0.05; m.scale.setScalar(0.6); g.add(m);
      glove(g, 0.15, -0.19, -0.41).scale.setScalar(0.65);
      const fl = Sp(g, 0.035, 0xffe0a0, 0.14, -0.13, -0.42 - (w.id === 'cannon' ? 0.4 : w.id === 'concussion' ? 0.36 : 0.3), true, 6, 4);
      fl.visible = false; g.userData.flash = fl; g.userData.gun = m;
    }
    g.visible = false;
    root.add(g);
    VM.models[w.id] = g;
  }
  VM.cur = P.cur; VM.models[P.cur].visible = true;
}
function updateViewmodel(dt) {
  if (!VM.root) return;
  VM.root.visible = !P.dead && G.state === 'play';
  if (VM.swapTo) {
    VM.swap += dt * 5;
    if (VM.swap >= 1 && VM.cur !== VM.swapTo) { VM.models[VM.cur].visible = false; VM.cur = VM.swapTo; VM.models[VM.cur].visible = true; }
    if (VM.swap >= 2) { VM.swap = 0; VM.swapTo = null; }
  } else if (VM.cur !== P.cur) { VM.models[VM.cur].visible = false; VM.cur = P.cur; VM.models[VM.cur].visible = true; }
  const lower = VM.swapTo ? (VM.swap < 1 ? VM.swap : 2 - VM.swap) : 0;
  const g = VM.models[VM.cur];
  const bx = Math.sin(P.bob) * 0.018 * P.bobAmt, by = -Math.abs(Math.cos(P.bob)) * 0.022 * P.bobAmt;
  VM.recoil = Math.max(0, VM.recoil - dt * 8);
  const wide = Math.min(1, Math.max(0, (R.vmAspect - 0.8) / 1));
  g.position.set(bx + (wide - 1) * 0.06, by - lower * 0.35 - VM.charge * 0.06, VM.recoil * 0.08);
  g.rotation.set(VM.recoil * 0.2 + VM.charge * 0.3, 0, 0);
  if (VM.cur === 'fists') {
    VM.punch = Math.max(0, VM.punch - dt * 4);
    const p = Math.sin(Math.min(1, VM.punch) * Math.PI);
    const a = VM.fistSide ? g.userData.r : g.userData.l, b = VM.fistSide ? g.userData.l : g.userData.r;
    a.position.z = -0.42 - p * 0.3; a.position.y = -0.2 + p * 0.08; b.position.z = -0.42; b.position.y = -0.2;
  }
  if (g.userData.flash) g.userData.flash.visible = VM.flashT > 0;
  VM.flashT -= dt;
  if (g.userData.item) g.userData.item.visible = (P.ammo[WEAPON[VM.cur].ammo] || 0) > 0;
  // light the weapon like the sector we stand in
  const c = cellAt(P.x, P.z), li = c.solid ? 0.8 : c.d.l;
  R.vmAmb.intensity = 0.25 + li * 0.55 + (P.lampOn ? 0.25 : 0);
  R.vmSun.intensity = 0.2 + li * 0.6;
  R.vmFlash.intensity = VM.flashT > 0 ? 2.2 : 0;
}
