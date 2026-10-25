// Shot Heard — the player: input (keyboard and mouse, gamepad), first-person camera, aiming and the spyglass, gadgets,
// spotting and squad orders, interaction (revive, repair, crew a gun, mount a horse, take a helm) and the viewmodel.

const PL = {
  s: null, firstPerson: true, yaw: 0, pitch: 0, suppress: 0, volley: 0, recoil: 0, recoilYaw: 0, hurt: 0, bobT: 0,
  inter: null, interT: 0, oob: 0, spyT: 0, spotCd: 0, cls: 'line', primary: {}, deadT: 0, msgT: 0, autoT: 0, zoom: 1, lastPadAim: 0,
  view: 'fp', camPos: new V3(), stepPh: 0,
};
// ---------- input ----------
function readInput(dt = 1 / 60) {
  pollPad();
  const I = { mx: 0, mz: 0, look: [0, 0], fire: false, fireHeld: false, aim: false, reload: false, melee: false, jump: false, crouch: false, sprint: false,
    use: false, useHeld: false, spot: false, slot: -1, next: 0, giveUp: false };
  if (keys.KeyW || keys.ArrowUp) I.mz += 1; if (keys.KeyS || keys.ArrowDown) I.mz -= 1;
  if (keys.KeyA || keys.ArrowLeft) I.mx -= 1; if (keys.KeyD || keys.ArrowRight) I.mx += 1;
  const sens = 0.0022 * SET.sens / PL.zoom;
  I.look[0] = mouse.dx * sens; I.look[1] = mouse.dy * sens * (SET.invert ? -1 : 1);
  I.fire = mPressed.has('L'); I.fireHeld = mouse.l; I.aim = mouse.r;
  I.reload = pressed.has('KeyR'); I.melee = pressed.has('KeyF') || mPressed.has('M'); I.jump = pressed.has('Space');
  I.crouch = pressed.has('KeyC') || pressed.has('ControlLeft'); I.sprint = keys.ShiftLeft || keys.ShiftRight;
  I.use = pressed.has('KeyE'); I.useHeld = !!keys.KeyE; I.spot = pressed.has('KeyQ');
  for (let k = 1; k <= 4; k++) if (pressed.has('Digit' + k)) I.slot = k - 1;
  if (mouse.wheel) I.next = Math.sign(mouse.wheel);
  I.giveUp = pressed.has('Space');
  if (PAD.on) {
    const ps = 2.6 * SET.padSens / PL.zoom;
    if (Math.abs(PAD.lx) + Math.abs(PAD.ly) > 0) { I.mx += PAD.lx; I.mz -= PAD.ly; }
    const ax = PAD.rx * Math.abs(PAD.rx), ay = PAD.ry * Math.abs(PAD.ry);
    I.look[0] += ax * ps * dt * 1.6; I.look[1] += ay * ps * dt * (SET.invert ? -1 : 1) * 1.2;
    if (PAD.rt > 0.5 && !PL.padRT) I.fire = true;
    PL.padRT = PAD.rt > 0.5; I.fireHeld = I.fireHeld || PAD.rt > 0.5;
    I.aim = I.aim || PAD.lt > 0.4;
    if (PAD.pressed.has(2)) I.reload = true;
    if (PAD.pressed.has(5)) I.melee = true;
    if (PAD.pressed.has(0)) { I.jump = true; I.giveUp = true; }
    if (PAD.pressed.has(1)) I.crouch = true;
    if (PAD.pressed.has(10)) PL.padSprint = !PL.padSprint;
    if (Math.abs(PAD.lx) + Math.abs(PAD.ly) < 0.2) PL.padSprint = false;
    I.sprint = I.sprint || PL.padSprint;
    if (PAD.pressed.has(12)) I.use = true;
    I.useHeld = I.useHeld || !!PAD.b[12];
    if (PAD.pressed.has(4)) I.spot = true;
    if (PAD.pressed.has(3)) I.slot = PL.s && PL.s.hand === 'primary' ? 1 : 0;
    if (PAD.pressed.has(14)) I.slot = 2;
    if (PAD.pressed.has(15)) I.slot = 3;
  }
  const l = Math.hypot(I.mx, I.mz); if (l > 1) { I.mx /= l; I.mz /= l; }
  return I;
}

// ---------- control ----------
function controlPlayer(dt, I) {
  const s = PL.s;
  PL.suppress = Math.max(0, PL.suppress - dt * 0.6); PL.volley = Math.max(0, PL.volley - dt); PL.hurt = Math.max(0, PL.hurt - dt * 1.5);
  PL.spotCd -= dt;
  if (!s) return;
  if (s.state === 'down') {
    if (I.giveUp && s.downT < 10.5) killSoldier(s, s.downBy, '', false);
    PL.yaw += I.look[0] * 0.3; PL.pitch = clamp(PL.pitch - I.look[1] * 0.3, -0.6, 0.6);
    return;
  }
  if (s.state === 'dead') return;
  // look
  PL.yaw -= I.look[0]; PL.pitch = clamp(PL.pitch - I.look[1], -1.45, 1.45);
  if (s.mount && s.mount.type === 'cannon') { controlCannon(s.mount.c, s, dt, I); return; }
  if (s.mount && s.mount.type === 'ship') { controlShip(s.mount.s, s, dt, I); return; }
  // aim assist for the pad: slow the stick over an enemy
  if (PAD.on && lastInput === 'pad' && I.aim) padAssist(dt);
  s.yaw = PL.yaw; s.pitch = PL.pitch;
  // weapon slots: 0 primary, 1 melee, 2-3 gadgets
  if (I.next) I.slot = ((slotIndex(s) + I.next) % 4 + 4) % 4;
  if (I.slot >= 0) selectSlot(s, I.slot);
  if (I.crouch) s.crouching = !s.crouching;
  if (s.mount && s.mount.type === 'horse') { controlHorse(s.mount.h, s, dt, I); }
  else {
    const f = I.mz, r = I.mx;
    const fx = Math.sin(PL.yaw), fz = Math.cos(PL.yaw);
    // right of facing is (-cos, +sin) in this yaw convention
    let wx = fx * f - fz * r, wz = fz * f + fx * r;
    const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
    s.sprint = I.sprint && f > 0.3 && s.stamina > 0.05 && !s.crouching && s.aimT < 0.2;
    let speed = s.sprint ? SPEED.run : s.crouching ? SPEED.crouch : SPEED.walk;
    if (s.wp.reloading) speed = Math.min(speed, s.sprint ? SPEED.run : SPEED.reload);
    if (s.aimT > 0.4) speed = Math.min(speed, SPEED.aim);
    if (s.sprint && s.wp.reloading) hudReloadPaused = 0.3;
    moveSoldier(s, wx, wz, speed * (wl > 0.05 ? 1 : 0), I.jump, dt);
    // footsteps
    const sp = Math.hypot(s.vel.x, s.vel.z);
    PL.bobT += sp * dt * 2.4;
    const ph = Math.floor(PL.bobT / Math.PI);
    if (ph !== PL.stepPh && sp > 1 && s.onGround) { PL.stepPh = ph; sStep(null, waterDepth(s.pos.x, s.pos.z) > 0.1 ? 'water' : roadAt(s.pos.x, s.pos.z) > 0.3 ? 'road' : 'grass', s.sprint); }
  }
  // actions
  s.wantAim = I.aim;
  const g = currentGadget(s);
  if (g === 'spyglass') { s.wantAim = false; PL.spyT = clamp(PL.spyT + (I.aim ? dt * 4 : -dt * 5), 0, 1); if (PL.spyT > 0.8) spyglassSpot(s, dt); }
  else PL.spyT = Math.max(0, PL.spyT - dt * 5);
  if (I.reload) { if (s.hand !== 'primary') selectSlot(s, 0); if (!startReload(s) && s.wp.ammo <= 0) hudMsg('No cartridges. Find an ammunition box or a surgeon.', 'bad'); }
  if (I.melee) { if (s.mount && s.mount.type === 'horse') horseSlash(s); else startMelee(s); }
  if (I.fire) {
    if (s.hand === 'primary') {
      if (canFire(s)) playerFire(s);
      else if (s.wp.reloading) hudMsg(drillOf(s)[drillStage(s)][1] + '…');
      else if (s.wp.loaded <= 0) { sClick(null); if (s.wp.ammo > 0) { hudMsg('Not loaded. Press R to load.', 'bad'); startReload(s); } }
    } else if (s.hand === 'melee') { if (s.mount && s.mount.type === 'horse') horseSlash(s); else startMelee(s); }
    else useGadget(s, g);
  }
  if (I.spot) spotOrOrder(s);
  // interaction
  PL.inter = findInteraction(s);
  if (PL.inter) {
    const it = PL.inter;
    if (it.hold) {
      if (I.useHeld) { PL.interT += dt; if (it.kind === 'repair') repairCannon(it.c, s, dt); if (PL.interT >= it.hold) { it.act(); PL.interT = 0; } }
      else PL.interT = 0;
    } else if (I.use) it.act();
  } else PL.interT = 0;
  if (I.use && s.mount && s.mount.type === 'horse' && !PL.inter) dismountPlayer();
  // out of bounds
  const lim = TER.half;
  if (Math.abs(s.pos.x) > lim || Math.abs(s.pos.z) > lim) { PL.oob += dt; if (PL.oob > 10) { PL.oob = 0; killSoldier(s, null, 'Deserted', false); } }
  else PL.oob = 0;
}
function slotIndex(s) { return s.hand === 'primary' ? 0 : s.hand === 'melee' ? 1 : s.hand === 'g0' ? 2 : 3; }
function currentGadget(s) { return s.hand === 'g0' ? s.load.gadgets[0] : s.hand === 'g1' ? s.load.gadgets[1] : null; }
function selectSlot(s, k) {
  const h = ['primary', 'melee', 'g0', 'g1'][k];
  if (!h || (k >= 2 && !s.load.gadgets[k - 2])) return;
  if (s.hand === h) return;
  s.hand = h; s.aimT = 0;
  VM.swap = 0.35;
  sDrill('cast');
}
function playerFire(s) {
  const dir = camDir(_v5);
  const eye = camera.position;
  VM.root.updateMatrixWorld(true);
  const m = vmMuzzleWorld(_v6);
  const spreadMul = 1 + PL.suppress * 0.6 + (PAD.on && lastInput === 'pad' ? -0.1 : 0);
  if (fireWeapon(s, eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, m.x, m.y, m.z, spreadMul)) {
    PL.recoil += s.wp.def.model === 'pistol' ? 0.05 : s.wp.def.model === 'blunder' ? 0.12 : 0.085;
    PL.recoilYaw += frand(-0.015, 0.015);
    SHAKE.a = Math.max(SHAKE.a, 0.18);
    if (PL.volley > 0) hudPop('Volley', '');
    if (s.wp.loaded <= 0 && s.wp.ammo > 0 && SET.hints) PL.autoT = 0.6;
  }
}
function camDir(out) {
  const p = PL.pitch + PL.recoil, y = PL.yaw + PL.recoilYaw;
  return out.set(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
}
function padAssist(dt) {
  const d = camDir(_v4);
  for (const o of SOLDIERS) {
    if (!o.alive || o.state !== 'up' || o.team === PL.s.team) continue;
    _v3.set(o.hb.nx, o.hb.ny - 0.1, o.hb.nz).sub(camera.position);
    const L = _v3.length(); if (L > 120) continue;
    const a = Math.acos(clamp(_v3.dot(d) / L, -1, 1));
    if (a < 0.05) {
      const ty = Math.atan2(_v3.x, _v3.z), tp = Math.asin(_v3.y / L);
      PL.yaw += angWrap(ty - PL.yaw) * Math.min(1, dt * 3); PL.pitch += (tp - PL.pitch) * Math.min(1, dt * 3);
      return;
    }
  }
}

// ---------- gadgets ----------
function useGadget(s, g) {
  const gi = s.hand === 'g0' ? 0 : 1, def = GADGETS[g];
  if (!g) return;
  if (def.n && s.gad[gi] <= 0) { hudMsg('No ' + def.name.toLowerCase() + ' left.', 'bad'); return; }
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  if (g === 'grenade') {
    const d = camDir(_v5);
    throwGrenade(s, camera.position.x + d.x * 0.5, camera.position.y - 0.1, camera.position.z + d.z * 0.5, d.x, d.y + 0.15, d.z);
    s.gad[gi]--; VM.throwT = 0.5;
  } else if (g === 'keg') {
    placeKeg(s, s.pos.x + fx * 1.0, s.pos.z + fz * 1.0); s.gad[gi]--; hudMsg('Fuse lit! Five seconds.', 'gold');
  } else if (g === 'gabion') {
    const x = s.pos.x + fx * 1.6, z = s.pos.z + fz * 1.6;
    queryCols(x, z, 0.8, _cq);
    if (_cq.some((C) => C.alive && (C.f & CF_MOVE) && colContains(C, x, z, 0.5)) || waterDepth(x, z) > -0.1) { hudMsg('No room for a gabion here.', 'bad'); return; }
    addGabion(x, z); s.gad[gi]--; sDrill('cast', null); addScore(s, 10, 'Gabion');
  } else if (g === 'colours') {
    plantColours(s, s.pos.x + fx * 0.8, s.pos.z + fz * 0.8); s.gad[gi] = 1; hudMsg('Colours planted: your side can deploy on them.', 'gold');
  } else if (g === 'bandage') {
    if (s.healCd > 0) return;
    const t = friendInFront(s, 2.6, (o) => o.state === 'up' && o.hp < 100);
    if (t) { t.hp = Math.min(100, t.hp + 50); addScore(s, 20, 'Bandaged ' + shortName(t)); if (t.bot) t.bot.thank = 2; }
    else if (s.hp < 100) { s.hp = Math.min(100, s.hp + 40); hudMsg('You bind the wound.', 'good'); }
    else return;
    s.healCd = 5; VM.throwT = 0.4; sDrill('charge');
  } else if (g === 'pouch') {
    AMMO_POINTS.push({ x: s.pos.x + fx, z: s.pos.z + fz, team: s.team, flag: null, ttl: 25 });
    for (const o of SOLDIERS) if (o.alive && o.team === s.team && o !== s && o.pos.distanceTo(s.pos) < 6 && o.wp.ammo < o.wp.def.ammo) { o.wp.ammo = Math.min(o.wp.def.ammo, o.wp.ammo + 8); addScore(s, 10, 'Resupply'); }
    s.gad[gi]--; VM.throwT = 0.4; hudMsg('Cartridges dropped.', 'good');
  }
}
function friendInFront(s, r, pred) {
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  let best = null, bd = r;
  for (const o of SOLDIERS) {
    if (o === s || o.team !== s.team || (o.state === 'dead')) continue;
    const dx = o.pos.x - s.pos.x, dz = o.pos.z - s.pos.z, d = Math.hypot(dx, dz);
    if (d > bd || (dx * fx + dz * fz) / (d || 1) < 0.3) continue;
    if (pred && !pred(o)) continue;
    best = o; bd = d;
  }
  return best;
}
function spyglassSpot(s, dt) {
  PL.spyAcc = (PL.spyAcc || 0) + dt;
  if (PL.spyAcc < 0.3) return;
  PL.spyAcc = 0;
  const d = camDir(_v4);
  for (const o of SOLDIERS) {
    if (!o.alive || o.state !== 'up' || o.team === s.team) continue;
    _v3.set(o.hb.nx, o.hb.ny, o.hb.nz).sub(camera.position);
    const L = _v3.length(); if (L > 420) continue;
    if (_v3.dot(d) / L < Math.cos(0.06)) continue;
    if (!losClear(camera.position.x, camera.position.y, camera.position.z, o.hb.nx, o.hb.ny, o.hb.nz)) continue;
    if (o.spotT < 1) addScore(s, 5, 'Spotted');
    o.spotT = 14;
  }
}
// Q: spot the enemy under the crosshair, or order your squad to the flag you look at.
function spotOrOrder(s) {
  if (PL.spotCd > 0) return;
  PL.spotCd = 0.5;
  const d = camDir(_v4);
  let best = null, ba = 0.1;
  for (const o of SOLDIERS) {
    if (!o.alive || o.state !== 'up' || o.team === s.team) continue;
    _v3.set(o.hb.nx, o.hb.ny, o.hb.nz).sub(camera.position);
    const L = _v3.length(); if (L > 300) continue;
    const a = Math.acos(clamp(_v3.dot(d) / L, -1, 1));
    if (a < ba && losClear(camera.position.x, camera.position.y, camera.position.z, o.hb.nx, o.hb.ny, o.hb.nz)) { ba = a; best = o; }
  }
  if (best) {
    best.spotT = s.cls === 'officer' || s.cls === 'rifle' ? 14 : 9;
    hudMsg('Enemy spotted', 'gold'); sClick(null);
    addScore(s, 5, '');
    return;
  }
  for (const f of MATCH.flags) {
    _v3.set(f.x, heightAt(f.x, f.z) + 4, f.z).sub(camera.position);
    const L = _v3.length();
    if (Math.acos(clamp(_v3.dot(d) / L, -1, 1)) < 0.08 + 8 / Math.max(L, 30)) { orderSquad(s, f); return; }
  }
  if (s.cls === 'officer') callVolley(s);
}
// Officer: "Make ready — present — fire!" Loaded line infantry nearby with a mark fire together.
function callVolley(s) {
  let n = 0;
  for (const o of SOLDIERS) {
    if (!o.bot || o.team !== s.team || o.state !== 'up' || o.cls !== 'line' || o.mount || o.pos.distanceTo(s.pos) > 28) continue;
    if (!o.bot.target || o.wp.loaded <= 0 || o.wp.reloading) continue;
    o.bot.state = 'fight'; o.bot.aimT = o.bot.aimNeed; o.bot.volleyOrder = clock + 1.6; n++;
  }
  hudMsg(n ? 'Make ready… present… fire! (' + n + ' men)' : 'No loaded men with a mark near you.', n ? 'gold' : 'bad');
  if (n) { sHuzzah(s.pos, 3); for (const sq of SQUADS[s.team]) if (sq.members.some((m) => m.bot && m.bot.volleyOrder > clock)) sq.volleyAt = clock + 1.1; }
}

// ---------- interaction ----------
function findInteraction(s) {
  if (s.state !== 'up') return null;
  if (s.mount && s.mount.type === 'horse') return null;
  if (s.cls === 'surgeon') {
    const t = friendInFront(s, 2.4, (o) => o.state === 'down');
    if (t) return { kind: 'revive', text: 'Hold <b>E</b> to revive ' + shortName(t), hold: 1.4, act: () => reviveSoldier(t, s) };
  }
  for (const c of CANNONS) {
    if (!c.alive) continue;
    const d = Math.hypot(c.pos.x - s.pos.x, c.pos.z - s.pos.z);
    if (d > 2.6) continue;
    if (s.cls === 'arty' && c.hp < c.max) return { kind: 'repair', c, text: 'Hold <b>E</b> to repair the gun', hold: 99, act: () => {} };
    const owner = cannonOwner(c);
    if (owner !== -1 && owner !== s.team) continue;
    if (c.crew && c.crew.bot && c.crew.team === s.team) return { kind: 'crew', text: '<b>E</b> take over the gun', act: () => { const b = c.crew; dismount(b); b.bot.state = 'move'; crewCannon(c, s); } };
    if (c.crew) continue;
    return { kind: 'crew', text: '<b>E</b> crew the gun', act: () => crewCannon(c, s) };
  }
  for (const h of HORSES) {
    if (!h.alive || h.rider || h.team !== s.team) continue;
    if (Math.hypot(h.pos.x - s.pos.x, h.pos.z - s.pos.z) < 2.6) return { kind: 'horse', text: '<b>E</b> mount the horse', act: () => mountHorse(h, s) };
  }
  for (const sh of SHIPS) {
    if (!sh.alive || sh.crew || sh.team !== s.team) continue;
    if (Math.hypot(sh.pos.x - s.pos.x, sh.pos.z - s.pos.z) < 9) return { kind: 'ship', text: '<b>E</b> take the helm', act: () => boardShip(sh, s) };
  }
  for (const a of AMMO_POINTS) {
    if (Math.abs(a.x - s.pos.x) < 3.5 && Math.abs(a.z - s.pos.z) < 3.5 && s.wp.ammo < s.wp.def.ammo) {
      const own = a.flag ? flagOwner(a.flag) === s.team : a.team === s.team;
      if (own) return { kind: 'ammo', text: 'Refilling cartridges… <b>' + s.wp.ammo + '</b>', act: () => {} };
    }
  }
  return null;
}
function dismountPlayer() {
  const s = PL.s; if (!s || !s.mount) return;
  dismount(s);
  PL.yaw = s.yaw;
}

// ---------- camera ----------
function updatePlayerCamera(dt) {
  const s = PL.s;
  PL.recoil = Math.max(0, PL.recoil - dt * 0.22 - PL.recoil * dt * 3.5); PL.recoilYaw *= Math.exp(-dt * 5);
  let fov = SET.fov;
  PL.firstPerson = true;
  if (!s) return;
  if (s.state === 'down' || s.state === 'dead') {
    const k = ease(Math.min(1, s.anim.fall));
    camera.position.set(s.pos.x, s.pos.y + lerp(1.6, 0.35, k), s.pos.z);
    camera.rotation.set(lerp(PL.pitch, 0.9, k), PL.yaw + Math.PI, 0.25 * k);
    camera.fov = fov; camera.updateProjectionMatrix();
    PL.zoom = 1;
    return;
  }
  if (s.mount && (s.mount.type === 'cannon' || s.mount.type === 'ship')) { PL.firstPerson = false; return; }
  soldierEye(s, camera.position);
  const sp = Math.hypot(s.vel.x, s.vel.z);
  const bobA = s.onGround ? clamp(sp / 6, 0, 1) * (s.sprint ? 0.055 : 0.03) * (1 - s.aimT * 0.8) : 0;
  camera.position.y += Math.abs(Math.sin(PL.bobT)) * bobA - bobA * 0.5;
  camera.position.x += Math.cos(PL.yaw) * Math.sin(PL.bobT) * bobA * 0.5;
  camera.position.z -= Math.sin(PL.yaw) * Math.sin(PL.bobT) * bobA * 0.5;
  // aim sway (breathing), stronger standing and when blown
  const sway = s.aimT * (0.0025 + (1 - s.stamina) * 0.004) * (s.crouch > 0.5 ? 0.6 : 1);
  const swx = Math.sin(clock * 1.1) * sway, swy = Math.sin(clock * 0.7 + 1) * sway * 0.8;
  const sh = SHAKE.a * 0.02;
  camera.rotation.set(PL.pitch + PL.recoil + swy + Math.sin(SHAKE.t * 37) * sh, PL.yaw + PL.recoilYaw + swx + Math.PI + Math.sin(SHAKE.t * 29) * sh, Math.sin(SHAKE.t * 23) * sh * 0.5);
  const z = s.hand === 'primary' ? lerp(1, s.wp.def.zoom, s.aimT) : 1;
  PL.zoom = lerp(z, 4.5, PL.spyT);
  camera.fov = fov / PL.zoom;
  camera.updateProjectionMatrix();
}

// ---------- viewmodel ----------
const VM = { root: null, armR: null, armL: null, weapons: {}, cur: null, ramrod: null, item: {}, pos: new V3(0.17, -0.25, -0.42), q: new THREE.Quaternion(), swap: 0, throwT: 0, dress: null, ramPos: new V3(), ramVis: false };
const VM_BASE = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);
const VMA = { u: 0.4, f: 0.38 };   // first-person arms are drawn a little long so the hands reach the forestock
function initViewmodel() {
  VM.root = new THREE.Group();
  vmCamera.add(VM.root);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mkArm = () => {
    const u = new THREE.Mesh(mergeParts([part(GEO.cyl(0.058, 0.05, VMA.u + 0.05, 7), [1, 1, 1], [0, -VMA.u / 2, 0])]), new THREE.MeshLambertMaterial({ vertexColors: true }));
    const f = new THREE.Mesh(mergeParts([part(GEO.cyl(0.05, 0.043, VMA.f - 0.04, 7), [1, 1, 1], [0, -VMA.f / 2 + 0.03, 0]), part(GEO.cyl(0.06, 0.056, 0.085, 7), [0.8, 0.8, 0.8], [0, -VMA.f + 0.05, 0])]), u.material);
    const h = new THREE.Mesh(mergeParts([part(GEO.box(0.065, 0.085, 0.04), [1, 1, 1], [0, -0.04, 0.008]), part(GEO.box(0.022, 0.05, 0.022), [1, 1, 1], [0.032, -0.02, 0.028]), part(GEO.box(0.05, 0.03, 0.02), [0.95, 0.95, 0.95], [0, -0.09, 0.02], [0.6, 0, 0])]), new THREE.MeshLambertMaterial({ vertexColors: true }));
    for (const m of [u, f, h]) { m.matrixAutoUpdate = false; VM.root.add(m); }
    return { u, f, h };
  };
  VM.armR = mkArm(); VM.armL = mkArm();
  for (const wm of ['musket', 'fowler', 'carbine', 'rifle', 'jaeger', 'blunder', 'pistol', 'sword', 'hatchet', 'knife', 'grenade', 'spyglass', 'keg']) {
    const W = weaponGeo(wm, true);
    let m, stock = null;
    if (W.stock) { m = new THREE.Group(); m.add(new THREE.Mesh(W.front, mat)); stock = new THREE.Mesh(W.stock, mat); m.add(stock); }
    else m = new THREE.Mesh(W.geo, mat);
    m.visible = false; VM.root.add(m);
    VM.weapons[wm] = { m, info: W, stock };
  }
  VM.ramrod = new THREE.Mesh(mergeParts([part(GEO.cyl(0.005, 0.005, 1.0, 5), IRON, [0, 0.5, 0]), part(GEO.cyl(0.008, 0.008, 0.03, 5), IRON, [0, 0.99, 0])]), mat);
  VM.ramrod.visible = false; VM.root.add(VM.ramrod);
  const flag = new THREE.Mesh(mergeParts([part(GEO.cyl(0.015, 0.015, 1.4, 5), WOOD2, [0, 0.4, 0]), part(GEO.box(0.02, 0.32, 0.45), [0.9, 0.85, 0.8], [0, 0.95, 0.24])]), mat);
  flag.visible = false; VM.root.add(flag); VM.item.colours = flag;
  const bag = new THREE.Mesh(mergeParts([part(GEO.box(0.12, 0.08, 0.14), col(0xd8d0b8))]), mat); bag.visible = false; VM.root.add(bag); VM.item.bandage = bag;
  const pouch = new THREE.Mesh(mergeParts([part(GEO.box(0.14, 0.1, 0.06), col(0x3a2a1c))]), mat); pouch.visible = false; VM.root.add(pouch); VM.item.pouch = pouch;
  const gab = new THREE.Mesh(mergeParts([part(GEO.cyl(0.18, 0.18, 0.3, 9), col(0x8a6a42))]), mat); gab.visible = false; VM.root.add(gab); VM.item.gabion = gab;
}
function dressViewmodel(d) {
  for (const a of [VM.armR, VM.armL]) {
    a.u.material.color.setRGB(d.coat[0], d.coat[1], d.coat[2]);
    a.h.material.color.setRGB(d.skin[0], d.skin[1], d.skin[2]);
  }
}
const _vp = new V3(), _vq = new THREE.Quaternion(), _ve = new THREE.Euler(), _vS = new V3(), _vT = new V3(), _vPole = new V3(), _vU = new THREE.Matrix4(), _vF = new THREE.Matrix4();
function vmTarget(s, pos, q) {
  const w = s.wp.def, sp = Math.hypot(s.vel.x, s.vel.z);
  const g = currentGadget(s);
  const bob = Math.sin(PL.bobT) * clamp(sp / 6, 0, 1) * 0.012 * (1 - s.aimT);
  const set = (x, y, z, p, yw, r) => { pos.set(x, y + bob, z); _ve.set(p, yw, r, 'XYZ'); q.setFromEuler(_ve); };
  if (g) {
    if (g === 'spyglass') return set(0.06, -0.12 + (1 - PL.spyT) * -0.15, -0.3 + PL.spyT * 0.22, 0, 0, 0);
    if (g === 'keg') return set(0.15, -0.38, -0.45, 0.2, 0.3, 0);
    const t = VM.throwT > 0 ? 1 - VM.throwT / 0.5 : 0;
    return set(0.2, -0.24 + Math.sin(t * Math.PI) * 0.15, -0.36 - t * 0.25, -0.3 - t * 1.2, 0.2, 0);
  }
  if (s.hand === 'melee') {
    const m = s.meleeT >= 0 ? s.meleeT / (s.meleeDef.cd * 0.85) : -1;
    if (m >= 0) { const a = smooth(0.1, 0.5, m), b = m < 0.1 ? m / 0.1 : 1 - smooth(0.55, 1, m); return set(lerp(0.3, -0.12, a), lerp(-0.12, -0.32, a), -0.42 - b * 0.12, lerp(1.35, -0.25, a), lerp(-0.35, 0.65, a), lerp(-0.5, 0.7, a)); }
    return set(0.26, -0.26, -0.48, 1.0, 0.25, 0.3);
  }
  const model = w.model;
  if (model === 'pistol') {
    if (s.wp.reloading && !reloadPaused(s)) { const ph = Math.sin(s.wp.rt * 6) * 0.04; return set(0.08, -0.32 + ph * 0.2, -0.38, 1.25, 0.3, 0); }
    if (s.aimT > 0.01) return set(lerp(0.18, 0.0, s.aimT), lerp(-0.2, -0.062, s.aimT), lerp(-0.36, -0.42, s.aimT), 0, 0, 0);
    return set(0.18, -0.21, -0.36, -0.08, 0.05, 0.05);
  }
  if (s.meleeT >= 0 && s.hand === 'primary') {
    const k = Math.sin(clamp(s.meleeT / (s.meleeDef.cd * 0.85) * 1.3, 0, 1) * Math.PI);
    return set(0.12 - k * 0.06, -0.26 + k * 0.04, -0.4 - k * 0.42, 0.06, 0.04, 0.1);
  }
  if (s.wp.reloading && !reloadPaused(s)) {
    const st = drillOf(s)[drillStage(s)][0];
    if (st === 'half' || st === 'bite' || st === 'prime' || st === 'shut' || st === 'open' || st === 'close') return set(0.1, -0.34, -0.4, 0.4, 0.55, 0.85);
    if (st === 'ready') return set(0.16, -0.3, -0.42, 0.25, 0.15, 0.25);
    if (w.drill === 'breech') return set(0.1, -0.34, -0.4, 0.4, 0.55, 0.85);
    return set(0.06, -1.32, -0.62, 1.47, 0.0, 0.25);
  }
  if (s.sprint) return set(0.2, -0.33, -0.36, 0.55, 0.65, 0.55);
  if (s.aimT > 0.01) {
    const a = ease(s.aimT);
    // the butt stops just short of the eye; the wrist sits a hand's breadth below the line of sight
    return set(lerp(0.15, 0.0, a), lerp(-0.26, -0.052, a), lerp(-0.38, -0.3, a), lerp(0.04, 0.0, a), lerp(0.05, 0, a), lerp(0.12, 0, a));
  }
  return set(0.15, -0.26, -0.38, 0.04, 0.05, 0.12);
}
function updateViewmodel(dt) {
  const s = PL.s;
  const show = s && s.state === 'up' && PL.firstPerson && !(s.mount && s.mount.type !== 'horse');
  VM.root.visible = !!show;
  if (!show) return;
  VM.swap = Math.max(0, VM.swap - dt); VM.throwT = Math.max(0, VM.throwT - dt);
  vmTarget(s, _vp, _vq);
  const k = 1 - Math.exp(-dt * (s.aimT > 0.5 ? 22 : 12));
  VM.pos.lerp(_vp, k); VM.q.slerp(_vq, k);
  // recoil kick and the lowering when switching
  const rec = Math.max(0, 1 - s.fireT * 6);
  const pos = _v3.copy(VM.pos).add(_v4.set(0, -VM.swap * 0.6 + rec * 0.012, rec * 0.07));
  const q = _q2.copy(VM_BASE).premultiply(VM.q);
  if (rec > 0) q.premultiply(_q1.setFromAxisAngle(_v4.set(1, 0, 0), rec * 0.12));
  const g = currentGadget(s);
  const model = g ? (VM.weapons[g] ? g : null) : s.hand === 'melee' ? (MELEE[s.load.melee].model === 'hanger' ? 'sword' : MELEE[s.load.melee].model) : s.wp.def.model;
  for (const n in VM.weapons) { VM.weapons[n].m.visible = n === model; if (VM.weapons[n].stock) VM.weapons[n].stock.visible = s.aimT < 0.55 || s.hand !== 'primary'; }
  for (const n in VM.item) VM.item[n].visible = g === n;
  let rh, lh = null;
  const W = model ? VM.weapons[model] : null;
  const holder = W ? W.m : VM.item[g];
  if (holder) { holder.position.copy(pos); holder.quaternion.copy(q); if (g === 'bandage' || g === 'pouch' || g === 'gabion' || g === 'colours') holder.quaternion.copy(VM.q); }
  rh = _vT.copy(pos);
  const info = W ? W.info : null;
  const long = info && info.left > 0 && model !== 'spyglass';
  VM.ramVis = false;
  if (long && !g) {
    lh = _v7.set(0, -0.02, info.left).applyQuaternion(q).add(pos);
    if (s.wp.reloading && !reloadPaused(s) && s.hand === 'primary') {
      const st = drillOf(s)[drillStage(s)][0], muz = info.muzzle;
      const D = drillOf(s), f0 = stageStart(s), f1 = f0 + D[drillStage(s)][2] * s.wp.def.reload, u = clamp((s.wp.rt - f0) / (f1 - f0), 0, 1);
      lh = _v7.set(0, -0.02, ['cast', 'charge', 'patch', 'draw', 'ram', 'return'].includes(st) ? 0.62 : info.left).applyQuaternion(q).add(pos);
      if (st === 'bite') rh = _vT.set(0.03, -0.11 + Math.sin(u * Math.PI) * 0.02, -0.18);
      else if (st === 'prime') rh = _vT.set(0, 0.02 + Math.sin(u * 30) * 0.004, 0.1).applyQuaternion(q).add(pos);
      else if (st === 'charge' || st === 'patch') rh = _vT.set(0, 0.04, muz + 0.08 + Math.sin(u * Math.PI) * 0.05).applyQuaternion(q).add(pos);
      else if (st === 'draw' || st === 'ram' || st === 'return') {
        // ramrod: drawn up out of the pipes, rammed, and returned
        let bottom;
        if (st === 'draw') bottom = lerp(muz - 0.95, muz + 0.02, ease(u));
        else if (st === 'return') bottom = lerp(muz + 0.02, muz - 0.95, ease(u));
        else bottom = muz - 0.75 + Math.abs(Math.sin(u * Math.PI * 3)) * 0.4;
        VM.ramPos.set(0, -0.02, bottom).applyQuaternion(q).add(pos);
        VM.ramVis = true;
        rh = _vT.set(0, -0.02, bottom + 0.97).applyQuaternion(q).add(pos);
        if (st === 'draw' && u < 0.3) rh = _vT.set(0, -0.03, lerp(0.5, muz - 0.02, u / 0.3)).applyQuaternion(q).add(pos);
      } else if (st === 'cast') rh = _vT.set(0.02, 0.0, 0.25).applyQuaternion(q).add(pos);
    }
  }
  VM.ramrod.visible = VM.ramVis;
  if (VM.ramVis) { VM.ramrod.position.copy(VM.ramPos); VM.ramrod.quaternion.copy(q).multiply(_q1.setFromAxisAngle(_v4.set(1, 0, 0), Math.PI / 2)); }
  // arms by IK from the shoulders
  // hands close around the stock and forestock, hanging below them, rather than carrying on the line of the forearm
  const grip = holder && !g && W && W.info.left > 0 ? q : null;
  solveIK(_vS.set(0.24, -0.36, 0.12), rh, VMA.u, VMA.f, _vPole.set(1, -1.2, 0.3), _vU, _vF, grip ? 0.02 : 0.06);
  setArm(VM.armR, grip);
  if (lh) {
    solveIK(_vS.set(-0.16, -0.36, -0.18), lh, VMA.u, VMA.f, _vPole.set(-1, -1.2, 0.3), _vU, _vF, grip ? 0.02 : 0.05);
    setArm(VM.armL, grip);
    VM.armL.f.visible = VM.armL.h.visible = true;
  } else VM.armL.f.visible = VM.armL.h.visible = PL.spyT > 0.3 || g === 'keg';
  VM.armL.u.visible = VM.armR.u.visible = false;   // upper arms sit too close to the lens to look right
  if (!lh && (PL.spyT > 0.3 || g === 'keg')) { solveIK(_vS.set(-0.16, -0.36, -0.18), _v7.copy(pos).add(_v4.set(-0.06, 0, -0.12)), VMA.u, VMA.f, _vPole.set(-1, -1.2, 0.3), _vU, _vF); setArm(VM.armL, null); }
}
const _hp = new V3(), _hq = new THREE.Quaternion();
function setArm(a, gripQ) {
  a.u.matrix.copy(_vU); a.f.matrix.copy(_vF);
  a.h.matrix.copy(_vF).multiply(_m2.makeTranslation(0, -VMA.f, 0));
  if (gripQ) {
    // keep the wrist where the forearm ends, but turn the hand to the weapon (palm under, fingers round)
    _hp.setFromMatrixPosition(a.h.matrix);
    a.h.matrix.compose(_hp, _hq.copy(gripQ), _v2.set(1, 1, 1));
  }
}
function stageStart(s) {
  const D = drillOf(s), st = drillStage(s);
  let acc = 0; for (let i = 0; i < st; i++) acc += D[i][2];
  return acc * s.wp.def.reload;
}
function vmMuzzleWorld(out) {
  const s = PL.s, W = VM.weapons[s.wp.def.model];
  out.set(0, 0.03, W ? W.info.muzzle : 1).applyQuaternion(_q2.copy(VM_BASE).premultiply(VM.q)).add(VM.pos);
  vmCamera.updateMatrixWorld(true);
  // view space → world: same orientation as the main camera
  out.applyQuaternion(camera.quaternion).add(camera.position);
  return out;
}
