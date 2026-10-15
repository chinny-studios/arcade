// Tokoyo — the player: state, third-person camera, movement & collision, swimming, stamina, animation, input dispatch

const CAM = { yaw: 0, pitch: -0.25, dist: 4.2, wantDist: 4.2, shake: 0, fp: false };
const PLAYER = {
  pos: new V3(), vel: new V3(), yaw: 0, alive: true, hp: BASE_HP, st: BASE_ST, stDelay: 0,
  inv: new Inventory(8, 4), eq: { right: null, left: null, head: null, chest: null, legs: null, cape: null, ammo: null },
  food: [], skills: {}, status: {}, spawn: null, name: 'Wanderer', look: { skin: 1, hair: 0, hairCol: 0, build: 0, beard: false },
  grounded: true, swim: false, crouch: false, walk: false, sit: false, act: null, block: 0, blockT: 0, draw: 0, roll: null,
  fallFrom: 0, phase: 0, rig: null, potionCd: 0, powerCd: 0, power: null, onRaft: null, steer: null, stagger: 0, invuln: 0,
  lastHit: 0, deaths: 0, noise: 0, inWater: 0, stepT: 0, sitT: 0,
};
function resetPlayer() {
  const P = PLAYER;
  P.inv = new Inventory(8, 4);
  for (const k in P.eq) P.eq[k] = null;
  P.food = []; P.skills = {}; P.status = {}; P.hp = BASE_HP; P.st = BASE_ST; P.alive = true; P.act = null; P.roll = null;
  P.spawn = null; P.potionCd = 0; P.powerCd = 0; P.power = null; P.deaths = 0; P.onRaft = null; P.steer = null; P.sit = false;
}
function makePlayerModel() {
  const P = PLAYER;
  if (P.rig) R.scene.remove(P.rig.root);
  P.rig = makePlayerRig(P.look);
  P.rig.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  R.scene.add(P.rig.root);
  P.held = {};
  refreshHeld();
}
// show equipped items on the rig
function refreshHeld() {
  const P = PLAYER, rig = P.rig; if (!rig) return;
  const set = (key, hand, st) => {
    const cur = P.held[key];
    if (cur && cur.st === st) return;
    if (cur) hand.remove(cur.o);
    P.held[key] = null;
    if (!st) return;
    const parts = ITEMS[st.id].type === 'shield' ? shieldParts(st.id) : heldParts(st.id);
    const o = attachHeld(hand, parts);
    if (ITEMS[st.id].type === 'shield') { o.rotation.set(0, Math.PI / 2, 0); o.position.set(-0.06, -0.05, 0); }
    if (ITEMS[st.id].anim === 'bow') { o.rotation.set(Math.PI / 2, 0, 0); }
    P.held[key] = { st, o };
  };
  set('right', rig.handR, P.eq.right);
  set('left', rig.handL, P.eq.left);
  dressRig(rig, P.eq);
}
bus.on('equip', refreshHeld);

// ---------- stamina ----------
function useStamina(v) {
  const P = PLAYER;
  if (DEBUG && G.god) return true;
  if (P.st < v * 0.5 && v > 0) { HUD.flashStamina(); return false; }
  P.st = Math.max(0, P.st - v); P.stDelay = 1.0;
  return true;
}
function hasStatus(n) { return !!PLAYER.status[n]; }
function addStatus(n, t, data = {}) { PLAYER.status[n] = Object.assign({ t }, data); }
function delStatus(n) { delete PLAYER.status[n]; }

// ---------- armour & movement modifiers ----------
function playerArmor() { let a = 0; for (const k of ['head', 'chest', 'legs', 'cape']) { const s = PLAYER.eq[k]; if (s) a += itemArmor(s); } return a; }
function moveMod() { let m = 1; for (const k of ['head', 'chest', 'legs', 'cape', 'right', 'left']) { const s = PLAYER.eq[k]; if (s && ITEMS[s.id].move) m += ITEMS[s.id].move; } return m; }
function sneakMod() { let m = 0; for (const k of ['head', 'chest', 'legs']) { const s = PLAYER.eq[k]; if (s && ITEMS[s.id].sneak) m += ITEMS[s.id].sneak; } return m; }
const MAX_WEIGHT = 300;

// ---------- update ----------
function updatePlayer(dt) {
  const P = PLAYER;
  if (!P.rig) return;
  P.potionCd = Math.max(0, P.potionCd - dt); P.powerCd = Math.max(0, P.powerCd - dt);
  P.invuln = Math.max(0, P.invuln - dt); P.stagger = Math.max(0, P.stagger - dt);
  if (!P.alive) { animPlayer(dt); return; }
  const uiOpen = UI.blocking();
  // steering a raft takes over movement
  if (P.steer) { steerRaft(dt, uiOpen); animPlayer(dt); updateCamera(dt); return; }

  // --- input → wish direction (camera relative) ---
  let mx = 0, mz = 0;
  if (!uiOpen) {
    if (Input.down('KeyW')) mz += 1; if (Input.down('KeyS')) mz -= 1;
    if (Input.down('KeyA')) mx += 1; if (Input.down('KeyD')) mx -= 1;
  }
  const ml = Math.hypot(mx, mz); if (ml > 0) { mx /= ml; mz /= ml; }
  const sy = Math.sin(CAM.yaw), cy = Math.cos(CAM.yaw);
  let wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy;
  if (P.sit && ml > 0) P.sit = false;
  if (P.sit) { wx = wz = 0; }
  if (P.stagger > 0) { wx *= 0.2; wz *= 0.2; }
  const over = P.inv.weight() > MAX_WEIGHT;
  // --- speed ---
  const runSk = skillF('running');
  const wantRun = !uiOpen && Input.down('ShiftLeft') && ml > 0 && !P.crouch && !over && P.block <= 0 && P.draw <= 0;
  let speed = P.walk ? 2.0 : 4.4;
  let running = false;
  if (wantRun && P.st > 0 && P.grounded) {
    const drain = 7.5 * (1 - runSk * 0.35) * (P.power === 'shirokiba' ? 0.4 : 1);
    if (useStaminaTick(drain * dt)) { speed = 6.9 * (1 + runSk * 0.1); running = true; raiseSkill('running', dt * 0.12); }
  }
  if (P.crouch) speed = 2.2;
  if (over) { speed = 1.6; if (ml > 0 && Math.random() < dt) HUD.msg('You are carrying too much.'); }
  if (P.block > 0) speed = Math.min(speed, 2.4);
  if (P.draw > 0) speed = Math.min(speed, 2.6);
  if (P.act && P.act.slow) speed *= P.act.slow;
  speed *= moveMod();
  P.running = running;
  // --- water ---
  const water = waveH(P.pos.x, P.pos.z);
  const depth = water - P.pos.y;
  const wasSwim = P.swim;
  P.inWater = clamp(depth, 0, 2);
  P.swim = depth > 1.25 && !P.onRaft;
  if (P.swim) {
    speed = 2.4 * (1 + skillF('swimming') * 0.5);
    if (ml > 0) { if (!useStaminaTick(5 * (1 - skillF('swimming') * 0.5) * dt)) { damagePlayer({ true: 6 * dt }, null, true); } raiseSkill('swimming', dt * 0.1); }
    if (!wasSwim) { FX.splash(P.pos.x, P.pos.z); AU.play('splash', P.pos.x, 0, P.pos.z); if (P.act && P.act.kind !== 'roll') P.act = null; P.draw = 0; }
  } else if (depth > 0.4) speed *= 0.75;
  // --- horizontal velocity ---
  const acc = P.grounded || P.swim ? 14 : 3;
  const tvx = wx * speed, tvz = wz * speed;
  if (P.roll) {
    P.roll.t += dt;
    const k = P.roll.t / P.roll.dur;
    const rs = 7.5 * (1 - k * 0.6);
    P.vel.x = P.roll.dx * rs; P.vel.z = P.roll.dz * rs;
    P.invuln = k > 0.1 && k < 0.7 ? 0.05 : P.invuln;
    if (k >= 1) P.roll = null;
  } else {
    P.vel.x = lerp(P.vel.x, tvx, Math.min(1, acc * dt));
    P.vel.z = lerp(P.vel.z, tvz, Math.min(1, acc * dt));
  }
  // --- facing ---
  const aiming = P.block > 0 || P.draw > 0 || (P.act && P.act.face) || BUILD.active();
  if (aiming) P.yaw = angTo(P.yaw, CAM.yaw, dt * 14);
  else if (ml > 0 && !P.roll) P.yaw = angTo(P.yaw, Math.atan2(wx, wz), dt * 10);
  // --- jump ---
  if (!uiOpen && Input.hit('Space') && !P.sit) {
    if (Input.m.b[2] && P.grounded && !P.roll && !P.swim && eqLeftShieldOrWeapon()) startRoll(ml > 0 ? wx : -Math.sin(P.yaw), ml > 0 ? wz : -Math.cos(P.yaw));
    else if (P.grounded && !P.swim && !P.roll && (!P.act || P.act.cancel)) {
      const jc = 10 * (1 - skillF('jumping') * 0.3) * (P.power === 'shirokiba' ? 0.4 : 1);
      if (useStamina(jc)) { P.vel.y = 7.4 * (1 + skillF('jumping') * 0.15); P.grounded = false; AU.play('jump', P.pos.x, P.pos.y, P.pos.z); raiseSkill('jumping', 0.3); P.act = null; }
    }
  }
  // --- integrate ---
  P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
  collidePlayerHorizontal();
  P.pos.x = clamp(P.pos.x, -WORLD.half + 2, WORLD.half - 2); P.pos.z = clamp(P.pos.z, -WORLD.half + 2, WORLD.half - 2);
  if (P.swim) {
    const target = water - 1.35;
    P.vel.y = lerp(P.vel.y, (target - P.pos.y) * 4, Math.min(1, dt * 6));
    P.pos.y += P.vel.y * dt;
    const gy = groundY(P.pos.x, P.pos.z, P.pos.y + 0.6);
    if (P.pos.y < gy) P.pos.y = gy;
    P.grounded = false; P.fallFrom = P.pos.y;
  } else {
    P.vel.y -= 20 * dt;
    if (P.vel.y < -40) P.vel.y = -40;
    P.pos.y += P.vel.y * dt;
    const gy = groundY(P.pos.x, P.pos.z, P.pos.y + 0.55);
    if (P.pos.y <= gy) {
      if (!P.grounded) landed(P.fallFrom - gy);
      P.pos.y = gy; P.vel.y = 0; P.grounded = true; P.fallFrom = gy;
    } else if (P.grounded && P.vel.y <= 0 && P.pos.y - gy < 0.45) {
      P.pos.y = gy; P.vel.y = 0; P.fallFrom = gy;
    } else {
      if (P.grounded) P.fallFrom = P.pos.y;
      P.grounded = false;
      P.fallFrom = Math.max(P.fallFrom, P.pos.y);
    }
    // steep terrain slides
    if (P.grounded && Math.abs(gy - heightAt(P.pos.x, P.pos.z)) < 0.05) {
      const n = normalAt(P.pos.x, P.pos.z, _v1);
      if (n.y < 0.62) { P.vel.x += n.x * 20 * dt; P.vel.z += n.z * 20 * dt; P.pos.x += n.x * dt * 2; P.pos.z += n.z * dt * 2; }
    }
  }
  // carried by a raft deck
  if (P.onRaft && !P.swim) { /* handled in the raft update */ }
  // --- stamina regen ---
  P.stDelay -= dt;
  if (P.stDelay <= 0 && !running && !(P.swim && ml > 0) && P.draw <= 0) {
    let rg = 7 * (hasStatus('rested') ? 1.5 : 1) * (hasStatus('wet') ? 0.85 : 1) * (hasStatus('cold') ? 0.75 : 1) * (P.block > 0 ? 0.5 : 1);
    if (P.sit) rg *= 1.5;
    P.st = Math.min(maxSt(), P.st + rg * dt);
  }
  P.st = Math.min(P.st, maxSt()); P.hp = Math.min(P.hp, maxHp());
  // noise for creature hearing
  P.noise = ml === 0 ? 2 : P.crouch ? 3 * (1 - skillF('sneak') * 0.5) * (1 - sneakMod()) : running ? 22 : P.walk ? 6 : 12;
  if (P.crouch && ml > 0) raiseSkill('sneak', dt * 0.05);
  // footsteps
  if (P.grounded && ml > 0) {
    P.stepT -= dt * speed;
    if (P.stepT <= 0) { P.stepT = 1.6; const onPiece = Math.abs(P.pos.y - heightAt(P.pos.x, P.pos.z)) > 0.1; AU.play(P.inWater > 0.1 ? 'stepWater' : onPiece ? 'stepWood' : 'step', P.pos.x, P.pos.y, P.pos.z, P.crouch ? 0.3 : 0.7); }
  }
  // --- actions ---
  if (!uiOpen) playerActions(dt);
  else { P.block = 0; if (P.draw > 0 && !Input.m.b[0]) P.draw = 0; }
  updateAct(dt);
  animPlayer(dt);
  updateCamera(dt);
}
function useStaminaTick(v) {
  const P = PLAYER;
  if (DEBUG && G.god) return true;
  if (P.st <= 0) return false;
  P.st = Math.max(0, P.st - v); P.stDelay = 1.0;
  return true;
}
function eqLeftShieldOrWeapon() { return true; }
function startRoll(dx, dz) {
  const P = PLAYER;
  if (!useStamina(15)) return;
  const l = Math.hypot(dx, dz) || 1;
  P.roll = { t: 0, dur: 0.6, dx: dx / l, dz: dz / l };
  P.yaw = Math.atan2(dx, dz);
  P.act = null; P.draw = 0;
  AU.play('jump', P.pos.x, P.pos.y, P.pos.z);
}
function landed(h) {
  const P = PLAYER;
  AU.play('land', P.pos.x, P.pos.y, P.pos.z, clamp(h / 3, 0.3, 1));
  if (h > 4 && !P.swim) {
    const d = (h - 4) * 8;
    damagePlayer({ true: d }, null, true);
    HUD.msg('You took ' + Math.round(d) + ' fall damage.');
  }
}
// horizontal collision with pieces, trees, rocks and big creatures
function collidePlayerHorizontal() {
  const P = PLAYER, r = 0.38, p = P.pos;
  for (let it = 0; it < 2; it++) {
    natQuery(p.x, p.z, 2, (o, kind) => {
      let rad, top;
      if (kind === 'tree') { rad = treeRadius(o); top = o.stump ? o.y + 0.7 : o.y + 50; }
      else { rad = rockRadius(o) * 0.85; top = o.y + ROCK_TYPES[o.type].h * o.s * 0.8; }
      if (p.y > top - 0.3) return;
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = rad + r;
      if (d < m && d > 1e-4) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; }
    });
    for (const l of NAT.logs) {
      // logs: capsule along their axis
      if (p.y > l.y + l.r - 0.2) continue;
      const ax = Math.cos(l.rot), az = -Math.sin(l.rot);
      const t = clamp((p.x - l.x) * ax + (p.z - l.z) * az, -l.len / 2, l.len / 2);
      const cx = l.x + ax * t, cz = l.z + az * t, dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), m = l.r + r;
      if (d < m && d > 1e-4) { p.x = cx + dx / d * m; p.z = cz + dz / d * m; }
    }
    BUILD.pushOut(p, r, 1.75, true);
    for (const m of MOBS_LIVE) {
      if (m.dead || m.def.r < 0.6) continue;
      const dx = p.x - m.pos.x, dz = p.z - m.pos.z, d = Math.hypot(dx, dz), mm = m.def.r * m.scale + r;
      if (d < mm && d > 1e-4 && Math.abs(p.y - m.pos.y) < m.def.h) { p.x = m.pos.x + dx / d * mm; p.z = m.pos.z + dz / d * mm; }
    }
  }
}

// ---------- actions: attack, block, build, interact, hotbar ----------
function playerActions(dt) {
  const P = PLAYER, m = Input.m;
  const right = P.eq.right, left = P.eq.left, rd = right ? ITEMS[right.id] : null;
  // hotbar
  for (let i = 0; i < 8; i++) if (Input.hit('Digit' + (i + 1))) { const s = P.inv.slots[i]; if (s) useItem(s); }
  if (Input.hit('KeyE')) interact();
  if (Input.hit('KeyX')) toggleSit();
  if (Input.hit('ControlLeft') || Input.hit('KeyC')) { P.crouch = !P.crouch; if (P.sit) P.sit = false; }
  if (Input.hit('KeyF')) usePower();
  if (Input.hit('KeyR') && !BUILD.active()) { /* reserved */ }
  if (P.swim) { P.block = 0; P.draw = 0; return; }
  // building tools
  if (rd && rd.build) { BUILD.toolInput(rd.build, dt); P.block = 0; return; }
  // block
  const canBlock = !P.roll && (!P.act || P.act.cancel) && !(rd && rd.anim === 'bow');
  if (m.b[2] && canBlock) { if (P.block <= 0) P.blockT = 0; P.block = 1; P.blockT += dt; }
  else P.block = 0;
  // bow
  if (rd && rd.anim === 'bow') {
    if (m.b[0] && !P.act && !P.roll) {
      if (P.draw === 0) { if (!findAmmo()) { if (m.hit[0]) HUD.msg('You have no arrows.'); return; } AU.play('draw', P.pos.x, P.pos.y, P.pos.z); }
      const drawT = rd.draw * (1 - skillF('bows') * 0.5);
      if (P.draw < 1) { if (useStaminaTick(rd.stam / drawT * dt)) P.draw = Math.min(1, P.draw + dt / drawT); }
      else useStaminaTick(1.5 * dt);
    } else if (P.draw > 0) { shootArrow(right, P.draw); P.draw = 0; }
    return;
  }
  // melee
  if (m.hit[0] && P.block <= 0 && !P.roll) startAttack(false);
  if (m.hit[1] && P.block <= 0 && !P.roll) startAttack(true);
}
function findAmmo() {
  const P = PLAYER;
  if (P.eq.ammo && P.eq.ammo.n > 0 && P.inv.slots.includes(P.eq.ammo)) return P.eq.ammo;
  return P.inv.slots.find((s) => s && ITEMS[s.id].type === 'ammo') || null;
}
const ATTACKS = {
  swing: { dur: 0.72, hit: 0.36, combo: 3 },
  stab: { dur: 0.45, hit: 0.2, combo: 3 },
  thrust: { dur: 0.7, hit: 0.32, combo: 1 },
  unarmed: { dur: 0.55, hit: 0.25, combo: 2 },
};
function startAttack(secondary) {
  const P = PLAYER, st = P.eq.right;
  const d = st ? ITEMS[st.id] : null;
  if (st && broken(st)) { HUD.msg(ITEMS[st.id].name + ' is broken. Repair it at a workbench.'); return; }
  if (P.act && !P.act.cancel) { if (P.act.kind === 'melee' && P.act.t > P.act.hitT) P.act.queued = !secondary; return; }
  const anim = d ? d.anim || 'swing' : 'unarmed';
  if (secondary) {
    if (!d) return;
    if (d.throwable) { if (!useStamina(d.stam * 2)) return; P.act = { kind: 'throw', t: 0, dur: 0.75, hitT: 0.35, face: true, st, slow: 0.4 }; AU.play('swing'); return; }
    const c = { swords: 'lunge', axes: 'heavy', clubs: 'heavy', knives: 'heavy', pickaxes: null, spears: null }[d.skill];
    if (!c) return startAttack(false);
    if (!useStamina(d.stam * 2.2)) return;
    P.act = { kind: 'melee', anim: c, t: 0, dur: c === 'lunge' ? 0.9 : 1.05, hitT: c === 'lunge' ? 0.42 : 0.6, combo: 0, mult: 2.2, face: true, st, slow: 0.3, lunge: c === 'lunge', secondary: true };
    AU.play('swing', P.pos.x, P.pos.y, P.pos.z, 0.8);
    return;
  }
  const A = ATTACKS[anim] || ATTACKS.swing;
  const stam = d ? d.stam : 4;
  if (!useStamina(stam)) return;
  const combo = P.comboN != null && G.time - P.comboT < 0.5 ? (P.comboN + 1) % A.combo : 0;
  P.comboN = combo; P.comboT = G.time;
  const sp = d && d.speed ? d.speed : 1;
  P.act = { kind: 'melee', anim, t: 0, dur: A.dur / sp, hitT: A.hit / sp, combo, mult: combo === 2 ? 1.6 : 1, face: true, st, slow: 0.45 };
  AU.play('swing', P.pos.x, P.pos.y, P.pos.z, 0.7);
}
function updateAct(dt) {
  const P = PLAYER, a = P.act;
  if (!a) return;
  a.t += dt;
  if (!a.done && a.t >= a.hitT) {
    a.done = true;
    if (a.kind === 'melee') { playerMeleeHit(a); if (a.lunge) { P.vel.x += Math.sin(P.yaw) * 6; P.vel.z += Math.cos(P.yaw) * 6; } }
    else if (a.kind === 'throw') throwSpear(a.st);
  }
  if (a.t > a.dur * 0.8) a.cancel = true;
  if (a.t >= a.dur) {
    P.act = null;
    if (a.queued) { P.comboT = G.time; startAttack(false); }
  }
}
function toggleSit() {
  const P = PLAYER;
  if (P.sit) { P.sit = false; return; }
  if (!P.grounded || P.swim) return;
  P.sit = true; P.sitT = 0; P.vel.set(0, 0, 0);
}

// ---------- camera ----------
function updateCamera(dt) {
  const P = PLAYER;
  if (Input.locked && !UI.blocking()) {
    const s = 0.0024 * SETTINGS.sens;
    CAM.yaw -= Input.m.dx * s;
    CAM.pitch -= Input.m.dy * s * (SETTINGS.invertY ? -1 : 1);
    CAM.pitch = clamp(CAM.pitch, -1.35, 1.2);
    if (Input.m.wheel && !BUILD.wantsWheel()) CAM.wantDist = clamp(CAM.wantDist + Input.m.wheel * 0.6, 1.6, 9);
  }
  let dist = CAM.wantDist;
  if (P.draw > 0) dist = lerp(dist, 2.4, P.draw);
  if (P.steer) dist = Math.max(dist, 7);
  CAM.dist = lerp(CAM.dist, dist, Math.min(1, dt * 8));
  const head = _v1.set(P.pos.x, P.pos.y + (P.crouch ? 1.25 : P.sit ? 1.1 : P.swim ? 1.55 : 1.62), P.pos.z);
  if (!P.alive) head.y = P.pos.y + 0.6;
  const cp = Math.cos(CAM.pitch), dir = _v2.set(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp).normalize();
  // over the right shoulder
  const right = _v3.set(-Math.cos(CAM.yaw), 0, Math.sin(CAM.yaw));
  const piv = head.clone().addScaledVector(right, 0.45 * Math.min(1, CAM.dist / 3));
  // pull in so walls and hills don't come between camera and player
  const back = dir.clone().multiplyScalar(-1);
  let d = CAM.dist;
  const tt = rayTerrain(piv, back, d + 0.3); if (tt >= 0) d = Math.min(d, tt - 0.3);
  const tb = BUILD.raycast(piv, back, d + 0.3, true); if (tb) d = Math.min(d, tb.t - 0.25);
  // tree trunks: 2D ray against circles
  natQuery(piv.x, piv.z, d + 1, (o, kind) => {
    if (kind !== 'tree' || o.stump) return;
    const rad = treeRadius(o) + 0.25, bl = Math.hypot(back.x, back.z); if (bl < 1e-4) return;
    const dx = back.x / bl, dz = back.z / bl, ox = o.x - piv.x, oz = o.z - piv.z;
    const t = ox * dx + oz * dz; if (t < 0) return;
    const px = ox - dx * t, pz = oz - dz * t, q = rad * rad - (px * px + pz * pz); if (q < 0) return;
    const hitT = (t - Math.sqrt(q)) / bl;
    if (hitT > 0 && hitT < d) d = Math.max(0.3, hitT - 0.1);
  });
  d = Math.max(0.3, d);
  const cam = R.camera;
  cam.position.copy(piv).addScaledVector(back, d);
  const wy = waveH(cam.position.x, cam.position.z);
  if (cam.position.y < wy + 0.25 && cam.position.y > wy - 1) cam.position.y = wy + 0.25;
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - dt * 2); cam.position.x += (Math.random() - 0.5) * CAM.shake * 0.3; cam.position.y += (Math.random() - 0.5) * CAM.shake * 0.3; }
  cam.lookAt(_v4.copy(piv).addScaledVector(dir, 10));
  if (cam.fov !== SETTINGS.fov) { cam.fov = SETTINGS.fov; cam.updateProjectionMatrix(); }
  // hide the player model when the camera is inside it
  P.rig.root.visible = d > 0.6;
}
// world ray from the camera through the crosshair
function aimRay(out = { o: new V3(), d: new V3() }) {
  out.o.copy(R.camera.position);
  R.camera.getWorldDirection(out.d);
  return out;
}

// ---------- animation ----------
function animPlayer(dt) {
  const P = PLAYER, rig = P.rig;
  rig.root.position.copy(P.pos);
  rig.root.rotation.y = P.yaw;
  const hs = Math.hypot(P.vel.x, P.vel.z);
  P.phase += dt * hs * 1.9;
  animBiped(rig, dt, {
    phase: P.phase, speed: hs, run: P.running, crouch: P.crouch, swim: P.swim, air: !P.grounded && !P.swim, sit: P.sit, dead: !P.alive,
    act: P.act, block: P.block > 0, draw: P.draw, roll: P.roll, bow: P.eq.right && ITEMS[P.eq.right.id].anim === 'bow', torch: P.eq.left && P.eq.left.id === 'torch', steer: !!P.steer,
    building: BUILD.active(), pitch: CAM.pitch, stagger: P.stagger,
  });
}
// shared humanoid animation
function animBiped(rig, dt, s) {
  const ph = s.phase, sp = clamp(s.speed / 7, 0, 1);
  const sw = Math.sin(ph) * (0.25 + sp * 0.6), sw2 = Math.sin(ph + Math.PI) * (0.25 + sp * 0.6);
  const moving = s.speed > 0.3;
  let hipY = rig.hipY, hipRx = 0, torsoRx = 0, torsoRy = 0, headRx = 0;
  let aLx = moving ? -sw * 0.8 : 0, aRx = moving ? -sw2 * 0.8 : 0, aLz = 0.08, aRz = -0.08, fLx = -0.25, fRx = -0.25;
  let lLx = moving ? sw : 0, lRx = moving ? sw2 : 0, sLx = moving ? Math.max(0, -Math.sin(ph)) * 0.9 * (0.4 + sp) : 0, sRx = moving ? Math.max(0, Math.sin(ph)) * 0.9 * (0.4 + sp) : 0;
  let rootRx = 0, rootY = moving ? Math.abs(Math.sin(ph)) * 0.05 * (0.5 + sp) : Math.sin(G.time * 1.6) * 0.008;
  if (s.run) torsoRx = 0.18;
  if (s.crouch) { hipY *= 0.72; torsoRx = 0.45; lLx -= 0.7; lRx -= 0.7; sLx += 1.1; sRx += 1.1; headRx = -0.35; }
  if (s.air) { lLx = -0.5; lRx = 0.25; sLx = 0.9; sRx = 0.5; aLz = 0.5; aRz = -0.5; }
  if (s.swim) { rootRx = 1.1; aLx = -2.6 + Math.sin(ph * 0.6) * 0.8; aRx = -2.6 + Math.sin(ph * 0.6 + Math.PI) * 0.8; lLx = Math.sin(ph * 1.2) * 0.5; lRx = -Math.sin(ph * 1.2) * 0.5; headRx = -0.9; rootY = -0.5; }
  if (s.sit) { hipY *= 0.35; lLx = -1.5; lRx = -1.5; sLx = 1.5; sRx = 1.5; aLx = -0.4; aRx = -0.4; fLx = -0.8; fRx = -0.8; }
  if (s.steer) { aLx = -1.0; aRx = -1.0; fLx = -0.6; fRx = -0.6; }
  if (s.torch && !s.act) { aLx = -0.9; fLx = -0.9; aLz = 0.2; }
  if (s.building) { aRx = -0.9; fRx = -0.6; }
  if (s.block) { aLx = -1.2; fLx = -1.0; aLz = -0.25; aRx = -1.0; fRx = -1.4; aRz = 0.3; torsoRy = 0.2; }
  if (s.bow) {
    aLx = -1.45 + Math.min(0, s.pitch) * -0.4 - Math.max(0, s.pitch) * 0.6; aLz = -0.15; fLx = -0.05;
    if (s.draw > 0) { aRx = -1.45; aRz = 0.2; fRx = -1.9 * (0.4 + s.draw * 0.6); torsoRy = -0.25; }
  }
  const a = s.act;
  if (a) {
    const p = clamp(a.t / a.dur, 0, 1), hp = a.hitT / a.dur;
    const k = p < hp ? smooth(0, hp, p) : 1 + smooth(hp, 1, p) * 0;
    const back = p < hp ? Math.sin((p / hp) * Math.PI * 0.5) : 1 - smooth(hp, 1, p);
    const anim = a.anim || a.kind;
    if (anim === 'swing' || anim === 'heavy') {
      const style = anim === 'heavy' ? 0 : a.combo || 0;
      if (style === 0) { // overhead
        aRx = p < hp ? lerp(-0.5, -2.9, smooth(0, hp * 0.8, p)) : lerp(-2.9, -0.4, smooth(hp, hp + 0.15, p)) + smooth(hp + 0.2, 1, p) * 0;
        if (p > hp + 0.15) aRx = lerp(-0.4, -0.3, smooth(hp + 0.15, 1, p));
        fRx = p < hp ? -0.6 : -0.2; torsoRx = p < hp ? -0.15 : 0.35 * (1 - smooth(hp, 1, p)); torsoRy = p < hp ? 0.3 : -0.2;
      } else { // side slashes
        const dir = style === 1 ? 1 : -1;
        aRx = -1.4; aRz = p < hp ? lerp(-0.2, dir > 0 ? -1.3 : 0.2, smooth(0, hp, p)) : lerp(dir > 0 ? -1.3 : 0.2, dir > 0 ? 0.6 : -1.2, smooth(hp - 0.05, hp + 0.15, p));
        torsoRy = p < hp ? dir * 0.6 * smooth(0, hp, p) : lerp(dir * 0.6, -dir * 0.6, smooth(hp - 0.05, hp + 0.2, p));
        fRx = -0.4;
      }
      if (!s.block) { aLx = -0.4; }
    } else if (anim === 'stab' || anim === 'thrust' || anim === 'lunge') {
      aRx = p < hp ? lerp(-0.6, -0.9, smooth(0, hp, p)) : lerp(-0.9, -1.55, smooth(hp - 0.05, hp + 0.05, p)); fRx = p < hp ? -1.4 : lerp(-1.4, 0, smooth(hp - 0.05, hp + 0.08, p));
      torsoRy = p < hp ? 0.4 : -0.2; if (anim === 'lunge') { lLx = -0.8; lRx = 0.5; torsoRx = 0.3; }
      if (p > 0.75) { aRx = lerp(aRx, -0.4, smooth(0.75, 1, p)); fRx = lerp(fRx, -0.3, smooth(0.75, 1, p)); }
    } else if (anim === 'unarmed') {
      const side = a.combo % 2 === 0;
      if (side) { aRx = -1.5 * back; fRx = -1.6 * (1 - k * 0.9); torsoRy = -0.4 * back; } else { aLx = -1.5 * back; fLx = -1.6 * (1 - k * 0.9); torsoRy = 0.4 * back; }
    } else if (anim === 'throw') {
      aRx = p < hp ? lerp(-0.5, -3.0, smooth(0, hp, p)) : lerp(-3.0, -0.8, smooth(hp, hp + 0.2, p)); fRx = -0.3; torsoRy = p < hp ? 0.5 : -0.4;
    } else if (anim === 'claw') {
      aRx = -2.2 * back + (p > hp ? -0.3 : 0); aLx = -2.0 * back; fRx = -0.6; fLx = -0.6; torsoRx = p > hp ? 0.5 * (1 - smooth(hp, 1, p)) : -0.2 * k;
    } else if (anim === 'smash') {
      aRx = p < hp ? lerp(-0.4, -3.0, smooth(0, hp, p)) : lerp(-3.0, -0.6, smooth(hp, hp + 0.12, p)); aLx = aRx; aRz = 0.2; aLz = -0.2; fRx = fLx = -0.4;
      torsoRx = p < hp ? -0.3 * k : 0.6 * (1 - smooth(hp + 0.1, 1, p));
    } else if (anim === 'sweep') {
      aRx = -1.4; aRz = p < hp ? lerp(0, -1.4, k) : lerp(-1.4, 1.0, smooth(hp - 0.05, hp + 0.2, p)); torsoRy = p < hp ? 0.8 * k : lerp(0.8, -0.8, smooth(hp - 0.05, hp + 0.25, p));
    } else if (anim === 'cut') {
      aRx = p < hp ? lerp(-0.4, -2.7, k) : lerp(-2.7, -0.4, smooth(hp, hp + 0.15, p)); fRx = -0.3; torsoRy = p < hp ? 0.4 : -0.3;
    } else if (anim === 'bow') {
      aLx = -1.5; fLx = 0; aRx = -1.5; fRx = -2.0 * Math.min(1, p / hp); torsoRy = -0.3;
    } else if (anim === 'heal' || anim === 'roar') {
      aLx = aRx = -2.6 * back; aLz = 0.4 * back; aRz = -0.4 * back; headRx = -0.5 * back; torsoRx = -0.2 * back;
    }
  }
  if (s.roll) { const k = s.roll.t / s.roll.dur; rootRx = k * TAU; hipY *= 0.6; lLx = lRx = -1.2; sLx = sRx = 1.6; aLx = aRx = -1.0; rootY = Math.sin(k * Math.PI) * 0.3; }
  if (s.stagger > 0) { torsoRx = -0.35; headRx = -0.3; aLz = 0.6; aRz = -0.6; }
  if (s.dead) { rootRx = -Math.PI / 2; rootY = 0.15; aLx = aRx = -0.3; lLx = lRx = 0; sLx = sRx = 0; }
  // apply with smoothing
  const k = Math.min(1, dt * 16);
  const L = (o, ax, v) => { o.rotation[ax] = lerp(o.rotation[ax], v, k); };
  rig.hips.position.y = lerp(rig.hips.position.y, hipY + rootY, k);
  L(rig.hips, 'x', rootRx); L(rig.torso, 'x', torsoRx); L(rig.torso, 'y', torsoRy); L(rig.head, 'x', headRx);
  L(rig.armL, 'x', aLx); L(rig.armR, 'x', aRx); L(rig.armL, 'z', aLz); L(rig.armR, 'z', aRz); L(rig.foreL, 'x', fLx); L(rig.foreR, 'x', fRx);
  L(rig.legL, 'x', lLx); L(rig.legR, 'x', lRx); L(rig.shinL, 'x', sLx); L(rig.shinR, 'x', sRx);
  if (s.roll || s.swim || s.dead) rig.hips.rotation.x = rootRx; // no smoothing through the flip
}
