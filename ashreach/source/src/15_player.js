// Ashreach — player control: MMO-style orbit camera, movement, click/tab targeting, interaction, zone travel

const CAM = { yaw: 0, pitch: 0.32, dist: 7, distT: 7, orbit: false, look: false };
const PC = { autorun: false, dragX: 0, dragY: 0, downX: 0, downY: 0, downT: 0, exitLock: true, travelT: 0 };

function setTarget(t) {
  if (!PLAYER) return;
  if (t && (t.removed || (t.kind === 'npc' && t.rig && t.rig.prop && t.role === 'pylon'))) t = t.removed ? null : t;
  if (PLAYER.target === t) return;
  if (PLAYER.target && PLAYER.target.rig && PLAYER.target.rig.setGlow) PLAYER.target.rig.setGlow(null);
  PLAYER.target = t;
  if (!t || !canAttack(PLAYER, t)) PLAYER.attacking = false;
  if (t && t.rig && t.rig.setGlow) t.rig.setGlow(isHostile(PLAYER, t) ? 0xff5040 : 0x50d0ff);
  EV.emit('target', t);
}
// Tab: nearest living hostile in front of the camera, cycling on repeat presses.
let tabList = [], tabI = 0, tabT = 0;
function tabTarget() {
  const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw);
  if (clock - tabT > 2 || !tabList.length) {
    tabList = entsNear(PLAYER.pos.x, PLAYER.pos.z, 45, (e) => canAttack(PLAYER, e) && e.kind !== 'npc')
      .map((e) => { const dx = e.pos.x - PLAYER.pos.x, dz = e.pos.z - PLAYER.pos.z, d = Math.hypot(dx, dz); return { e, s: d * (1.6 - (dx * fx + dz * fz) / Math.max(d, 0.1)) }; })
      .sort((a, b) => a.s - b.s).map((o) => o.e);
    tabI = 0;
  } else tabI = (tabI + 1) % tabList.length;
  tabT = clock;
  const t = tabList[tabI];
  if (t) setTarget(t);
}
const _pp = new V3(), _pq = new V3();
function pickEntity(cx, cy) {
  const W = innerWidth, H = innerHeight;
  let best = null, bd = 1e9;
  for (const e of ENTS) {
    if (e === PLAYER || e.removed || !e.rig) continue;
    const d = e.pos.distanceTo(camera.position);
    if (d > 120) continue;
    const h = e.rig.height || 1.8, r = Math.max(0.45, e.rig.radius || 0.5);
    _pp.set(e.pos.x, e.pos.y + (e.dead ? 0.3 : 0), e.pos.z).project(camera);
    _pq.set(e.pos.x, e.pos.y + (e.dead ? 0.8 : h), e.pos.z).project(camera);
    if (_pp.z > 1 || _pq.z > 1) continue;
    const x0 = (_pp.x + 1) / 2 * W, y0 = (1 - _pp.y) / 2 * H, y1 = (1 - _pq.y) / 2 * H;
    const half = Math.max(10, Math.abs(y0 - y1) * (r / h) * 1.1 + 6);
    if (cx < x0 - half || cx > x0 + half || cy > y0 + 6 || cy < y1 - 8) continue;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---------- interaction ----------
function nearestInteractable(r = 5) {
  let best = null, bd = r;
  for (const e of ENTS) if (e.kind === 'npc' && !e.removed) { const d = reachDist(PLAYER, e); if (d < bd) { bd = d; best = e; } }
  return best;
}
function interact(target) {
  if (!PLAYER || PLAYER.dead) return;
  let t = target || PLAYER.target;
  if (!t || t.kind !== 'npc' || reachDist(PLAYER, t) > 5) t = nearestInteractable();
  if (!t) { EV.emit('log', 'There is nothing to use here.', 'warn'); return; }
  if (reachDist(PLAYER, t) > 5) { EV.emit('log', 'You are too far away.', 'warn'); return; }
  if (PLAYER.sitting) standUp(PLAYER);
  setTarget(t);
  if (t.role === 'door') {
    const d = t.poi && t.poi.data;
    if (d && d.to) travel({ zone: d.to, poi: d.poi });
    else if (typeof missionDoor === 'function') missionDoor(t);
    return;
  }
  if (t.role === 'vendor') {
    const lvl = PLAYER.level;
    if (!t.stock || t.stockLvl !== lvl) {
      const kind = t.stockKind === 'nanos' ? 'nanos:' + PLAYER.char.prof : t.stockKind;
      try { t.stock = typeof vendorStock === 'function' ? vendorStock(kind, lvl, makeRng(strSeed(t.name) + lvl * 13)) : []; } catch (err) { console.error(err); t.stock = []; }
      t.stockLvl = lvl;
    }
  }
  if (typeof sfx === 'function') sfx('ui_open');
  EV.emit('interact', t);
}
function buyItem(npc, item) {
  const c = PLAYER.char, price = itemPrice(item, true);
  if (c.credits < price) { EV.emit('log', 'You cannot afford ' + item.name + '.', 'warn'); if (typeof sfx === 'function') sfx('error'); return false; }
  const copy = JSON.parse(JSON.stringify(item)); copy.uid = uid();
  if (!addItem(PLAYER, copy)) return false;
  c.credits -= price;
  EV.emit('log', 'You bought ' + item.name + ' for ' + fmtInt(price) + ' credits.', 'loot');
  if (typeof sfx === 'function') sfx('coin');
  EV.emit('inv', PLAYER);
  return true;
}
function sellItem(npc, item) {
  const price = itemPrice(item, false) * (item.stack || 1);
  if (!removeItem(PLAYER, item)) return false;
  PLAYER.char.credits += price;
  EV.emit('log', 'You sold ' + item.name + ' for ' + fmtInt(price) + ' credits.', 'loot');
  if (typeof sfx === 'function') sfx('coin');
  EV.emit('inv', PLAYER);
  return true;
}
function setClonePoint(npc) {
  const c = PLAYER.char;
  c.flags.clone = { zone: ZONE.id, poi: npc.poi ? npc.poi.id : null, x: npc.pos.x, z: npc.pos.z };
  EV.emit('log', 'Your clone insurance is now registered at ' + ZONE.def.name + '.', 'info');
  if (typeof sfx === 'function') sfx('buff');
  if (typeof saveGame === 'function') saveGame();
}
// Hopper/shuttle/Lattice travel and zone exits all go through here.
function travel(dest) {
  if (!dest || !ZONE_DEFS[dest.zone]) { EV.emit('log', 'That destination is unavailable.', 'warn'); return; }
  if (dest.cost && PLAYER.char.credits < dest.cost) { EV.emit('log', 'You need ' + dest.cost + ' credits for the trip.', 'warn'); return; }
  if (dest.cost) PLAYER.char.credits -= dest.cost;
  changeZone(dest.zone, dest.poi || dest.at || null);
  if (typeof sfx === 'function') sfx(dest.sound || 'zone');
}
function checkExits() {
  const def = ZONE.def;
  let inside = false;
  for (const x of def.exits || []) {
    if (Math.hypot(PLAYER.pos.x - x.x, PLAYER.pos.z - x.z) < (x.r || 6)) {
      inside = true;
      if (!PC.exitLock) { travel({ zone: x.to, poi: x.poi }); return; }
    }
  }
  if (!inside) PC.exitLock = false;
}

// ---------- input ----------
function playerKeyDown(code, e) {
  if (!PLAYER || state !== 'play') return;
  switch (code) {
    case 'Tab': tabTarget(); break;
    case 'Backquote': if (PLAYER.attacking) stopAttack(PLAYER); else startAttack(PLAYER, PLAYER.target); break;
    case 'KeyX': if (!PLAYER.dead) { PLAYER.sitting = !PLAYER.sitting; if (PLAYER.sitting) { PLAYER.attacking = false; EV.emit('log', 'You sit down.', 'info'); } } break;
    case 'KeyR': PC.autorun = !PC.autorun; break;
    case 'KeyF': interact(); break;
    case 'Space': if (PLAYER.onGround && !PLAYER.dead && !PLAYER.rooted) { if (PLAYER.sitting) standUp(PLAYER); PLAYER.vy = 7.5; PLAYER.onGround = false; if (PLAYER.rig.play) PLAYER.rig.play('jump'); } break;
  }
}
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'play') return;
  PC.downX = e.clientX; PC.downY = e.clientY; PC.downT = performance.now(); PC.dragX = PC.dragY = 0;
  if (e.button === 0) { mouse.l = true; CAM.orbit = true; }
  if (e.button === 2) { mouse.r = true; CAM.look = true; }
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    mouse.l = false; CAM.orbit = false;
    if (state === 'play' && PC.dragX + PC.dragY < 6 && performance.now() - PC.downT < 500 && !(typeof uiHit === 'function' && uiHit(e.clientX, e.clientY))) {
      const t = pickEntity(e.clientX, e.clientY);
      if (t) {
        if (t === PLAYER.target && t.kind === 'npc' && reachDist(PLAYER, t) < 5) interact(t);
        setTarget(t);
      } else setTarget(null);
    }
  }
  if (e.button === 2) {
    mouse.r = false; CAM.look = false;
    if (state === 'play' && PC.dragX + PC.dragY < 6 && !(typeof uiHit === 'function' && uiHit(e.clientX, e.clientY))) {
      // right-click: use the thing under the cursor (talk, or attack a hostile)
      const t = pickEntity(e.clientX, e.clientY);
      if (t) { setTarget(t); if (t.kind === 'npc') interact(t); else if (canAttack(PLAYER, t)) startAttack(PLAYER, t); }
    }
  }
});
addEventListener('mousemove', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (mouse.l || mouse.r) { mouse.dx += e.movementX; mouse.dy += e.movementY; PC.dragX += Math.abs(e.movementX); PC.dragY += Math.abs(e.movementY); }
});
canvas.addEventListener('wheel', (e) => { if (state === 'play') { CAM.distT = clamp(CAM.distT * (e.deltaY > 0 ? 1.12 : 0.89), 1.2, 22); e.preventDefault(); } }, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- per-frame ----------
function updatePlayer(dt) {
  const P = PLAYER;
  if (!P) return;
  const typing = typeof uiIsTyping === 'function' && uiIsTyping();
  const k = (c) => !typing && !!keys[c];
  // mouse: RMB steers the character, LMB orbits the camera only
  const sens = 0.0042;
  if (CAM.look || CAM.orbit) { CAM.yaw -= mouse.dx * sens; CAM.pitch = clamp(CAM.pitch + mouse.dy * sens, -0.6, 1.35); }
  mouse.dx = mouse.dy = 0;
  let f = 0, s = 0, turn = 0;
  if (k('KeyW') || k('ArrowUp') || PC.autorun || (mouse.l && mouse.r)) f += 1;
  if (k('KeyS') || k('ArrowDown')) { f -= 1; PC.autorun = false; }
  if (k('KeyW')) PC.autorun = PC.autorun && !k('KeyS');
  if (k('KeyQ')) s -= 1;
  if (k('KeyE')) s += 1;
  if (k('KeyA') || k('ArrowLeft')) { if (CAM.look) s -= 1; else turn += 1; }
  if (k('KeyD') || k('ArrowRight')) { if (CAM.look) s += 1; else turn -= 1; }
  if (P.dead || P.stunned > 0) { f = s = turn = 0; PC.autorun = false; }
  if (turn) { P.yaw += turn * 2.6 * dt; if (!CAM.orbit) CAM.yaw = P.yaw; }
  if (CAM.look) P.yaw = CAM.yaw;
  else if ((f || s) && CAM.orbit) { /* moving while orbiting keeps the character's own heading */ }
  else if (!turn && !CAM.orbit && (f || s)) CAM.yaw = angTo(CAM.yaw, P.yaw, dt * 3);
  P.moving = !!(f || s);
  if (P.moving && P.sitting) standUp(P);
  if (P.moving && P.cast && (nanoDef(P.cast.nano).cast || 0) > 0 && false) P.cast = null;
  let vx = 0, vz = 0;
  if ((f || s) && !P.rooted && !P.sitting) {
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    let mx = fx * f - fz * s, mz = fz * f + fx * s;
    const l = Math.hypot(mx, mz); mx /= l; mz /= l;
    let sp = (P.S.runSpeed || 5) * (1 + (P.S.runSpeedPct || 0) / 100) * (1 - (P.snared || 0) / 100);
    if (f < 0) sp *= 0.6;
    if (P.stealth) sp *= 0.7;
    vx = mx * sp; vz = mz * sp;
    P.speedNow = f < 0 ? -sp : sp;
  } else P.speedNow = 0;
  moveEnt(P, vx, vz, dt);
  if (P.attacking && P.target && !P.moving && !P.cast) faceTo(P, P.target.pos.x, P.target.pos.z, dt, 6);
  if (!P.dead) checkExits();
}
const _ct = new V3(), _cb = new V3();
function updateCamera(dt) {
  const P = PLAYER;
  CAM.dist = lerp(CAM.dist, CAM.distT, 1 - Math.exp(-dt * 10));
  const h = P.rig ? P.rig.height : 1.8;
  _ct.set(P.pos.x, P.pos.y + h * 0.92, P.pos.z);
  _cb.set(-Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), -Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
  // pull in when terrain or a wall gets between the camera and the character
  let d = CAM.dist;
  for (let i = 1; i <= 12; i++) {
    const t = d * i / 12;
    const x = _ct.x + _cb.x * t, y = _ct.y + _cb.y * t, z = _ct.z + _cb.z * t;
    if (y < groundY(x, z) + 0.35 || !losClear(_ct.x, _ct.y, _ct.z, x, y, z)) { d = Math.max(0.8, t - d / 12 - 0.35); break; }
  }
  CAM.cur = CAM.cur === undefined || d < CAM.cur ? d : lerp(CAM.cur, d, 1 - Math.exp(-dt * 5));
  camera.position.copy(_ct).addScaledVector(_cb, CAM.cur);
  const gy = groundY(camera.position.x, camera.position.z) + 0.3;
  if (camera.position.y < gy) camera.position.y = gy;
  camera.lookAt(_ct);
  if (P.rig) P.rig.root.visible = CAM.cur > 0.9 && !P.stealthHidden;
  camera.updateMatrixWorld();
}
