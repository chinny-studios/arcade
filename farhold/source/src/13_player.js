// Farhold — the player on foot: walking on spheres and station decks, jetpack, swimming, collisions,
// first/third person camera, interaction targets, damage, death and respawn.

Object.assign(PLAYER, {
  frame: null, pos: new V3(), vel: new V3(), q: new Q4(), pitch: 0, onGround: false, swim: false, inShip: false,
  tp: false, bob: 0, jetT: 0, fallV: 0, hurtT: 0, sinceHit: 10, rig: null, eye: 1.65, sprintLock: false, torch: false,
  graves: [], respawn: null,
});
const CAM = { pos: new V3(), q: new Q4(), shake: 0, fov: 72, worldPos: new V3(), mode: 'foot', lag: new V3(), shipBack: 26 };

function playerUp(out = new V3()) { return frameUp(PLAYER.frame, PLAYER.pos, out); }
function playerGravity() { const f = PLAYER.frame; if (!f) return 0; return f.kind === 'planet' ? f.pl.gravity : 9.8; }
function groundHeightAt(f, local) {
  if (!f || f.kind !== 'planet') return -Infinity;
  const pl = f.pl;
  const d = _v5.copy(local).normalize();
  return pl.R + surfaceH(pl, d);
}
// Rotate q so its +Y matches up (minimal twist)
function alignUp(q, up, k = 1) {
  const cur = _v4.set(0, 1, 0).applyQuaternion(q);
  _q2.setFromUnitVectors(cur, up);
  if (k < 1) _q2.slerp(_q1.identity(), 1 - k);
  q.premultiply(_q2).normalize();
}

function placePlayer(f, local, yawDir) {
  PLAYER.frame = f; PLAYER.pos.copy(local); PLAYER.vel.set(0, 0, 0);
  const up = playerUp();
  basisQuat(up, yawDir || perpOf(up), PLAYER.q);
  PLAYER.pitch = 0;
}

function updatePlayer(dt) {
  const P = PLAYER;
  if (P.inShip || !P.alive) return;
  const f = P.frame;
  const up = playerUp(new V3());
  alignUp(P.q, up);
  // look
  if (!UI.blocking()) {
    const lk = Act.look(dt);
    const aimK = TOOL.aiming ? 0.45 : 1;
    _q1.setFromAxisAngle(up, -lk.x * aimK);
    P.q.premultiply(_q1).normalize();
    P.pitch = clamp(P.pitch - lk.y * aimK, -1.5, 1.5);
  }
  const fwd = _v1.set(0, 0, -1).applyQuaternion(P.q), right = _v2.set(1, 0, 0).applyQuaternion(P.q);
  const mv = UI.blocking() || BUILD.active && BUILD.menuOpen ? { x: 0, y: 0 } : Act.move();
  const g = playerGravity();
  // water
  let swim = false, seaR = Infinity;
  if (f && f.kind === 'planet' && f.pl.P.sea != null) { seaR = f.pl.R + f.pl.P.sea; swim = P.pos.length() < seaR - 0.9; }
  P.swim = swim;
  // stamina & speed
  const sprinting = Act.down('sprint') && (mv.x || mv.y) && P.stats.stam > 1 && !P.sprintLock && !swim;
  if (sprinting) { P.stats.stam = Math.max(0, P.stats.stam - dt * 18 / techFx('stam')); if (P.stats.stam <= 0) P.sprintLock = true; }
  else { P.stats.stam = Math.min(100, P.stats.stam + dt * 22); if (P.stats.stam > 30) P.sprintLock = false; }
  const speed = swim ? 3.2 : sprinting ? 8.5 : 4.6;
  const want = new V3().addScaledVector(fwd, mv.y * speed).addScaledVector(right, mv.x * speed);
  want.addScaledVector(up, -want.dot(up));
  const vUp = P.vel.dot(up);
  const horiz = _v3.copy(P.vel).addScaledVector(up, -vUp);
  const ctl = P.onGround || swim ? 12 : 2.2;
  horiz.lerp(want, Math.min(1, dt * ctl));
  let vy = vUp;
  // jump / jetpack
  const jetOK = hasTech('jetpack') && P.stats.jet > 0;
  P.jetting = false;
  if (Act.hit('jump') && P.onGround && !swim) { vy = 6; P.onGround = false; P.jetT = 0; AU.sfx('jump', 0.4); }
  if (Act.down('jump') && !P.onGround && !swim && jetOK && !UI.blocking()) {
    P.jetT += dt;
    if (P.jetT > 0.18 || vy < 0) {
      P.jetting = true;
      vy += dt * (g + 9 * Math.sqrt(techFx('jet')));
      vy = Math.min(vy, 9 * Math.sqrt(techFx('jet')));
      horiz.addScaledVector(fwd, dt * 4 * mv.y);
      P.stats.jet = Math.max(0, P.stats.jet - dt * 30 / techFx('jet'));
    }
  } else if (Act.up('jump')) P.jetT = 0;
  if (swim) {
    // float to the surface, dive with crouch-free simplicity
    const depth = seaR - P.pos.length();
    vy = lerp(vy, clamp(depth - 1.0, -2, 2.5), Math.min(1, dt * 3));
    if (Act.down('jump')) vy = Math.max(vy, 2.5);
  } else if (f) vy -= g * dt;
  if (P.onGround) P.stats.jet = Math.min(100, P.stats.jet + dt * 45);
  P.vel.copy(horiz).addScaledVector(up, vy);
  // integrate
  const prevVy = vy;
  P.pos.addScaledVector(P.vel, dt);
  P.onGround = false;
  // terrain
  if (f && f.kind === 'planet') {
    const gr = groundHeightAt(f, P.pos);
    const r = P.pos.length();
    if (r < gr + 0.02) {
      P.pos.multiplyScalar((gr) / r);
      if (prevVy < -16) damagePlayer((-prevVy - 16) * 4, 'fall');
      if (vy < 0) P.vel.addScaledVector(up, -P.vel.dot(up));
      P.onGround = true;
    } else if (r < gr + 0.25 && vy <= 0.5) { P.onGround = true; P.pos.multiplyScalar((gr + 0.01) / r); P.vel.addScaledVector(up, -Math.min(0, P.vel.dot(up))); }
    natCollide(P.pos, 0.45, up);
  }
  // boxes (two spheres: feet and chest)
  if (f) {
    const feet = _v4.copy(P.pos).addScaledVector(up, 0.42);
    const g1 = COLL.collideSphere(f, feet, 0.42, up);
    P.pos.copy(feet).addScaledVector(up, -0.42);
    const chest = _v4.copy(P.pos).addScaledVector(up, 1.3);
    COLL.collideSphere(f, chest, 0.4, null);
    P.pos.copy(chest).addScaledVector(up, -1.3);
    if (g1) { P.onGround = true; const vu = P.vel.dot(up); if (vu < 0) { if (vu < -16) damagePlayer((-vu - 16) * 4, 'fall'); P.vel.addScaledVector(up, -vu); } }
  }
  // the landed ship is solid too
  if (SHIP.cur && SHIP.frame === f && !P.inShip) shipCollidePlayer();
  // station: fall out of the world safety
  if (f && f.kind === 'station' && P.pos.y < -20) { P.pos.set(0, 2, 20); P.vel.set(0, 0, 0); }
  P.bob += dt * (P.onGround ? horiz.length() : 0) * 1.9;
  P.speedNow = horiz.length();
  // third-person rig
  if (P.rig) {
    P.rig.root.visible = P.tp;
    if (P.tp) {
      if (P.rig.root.parent !== frameGroup(f)) { (frameGroup(f) || R.scene).add(P.rig.root); }
      P.rig.root.position.copy(P.pos); P.rig.root.quaternion.copy(P.q);
      animSuit(P.rig, P.bob / 1.9, P.speedNow, !P.onGround && !swim);
      P.rig.flame.visible = P.jetting;
    }
  }
  if (Act.hit('view') && !UI.blocking()) { P.tp = !P.tp; }
  if (Act.hit('torch') && !UI.blocking()) { P.torch = !P.torch; AU.sfx('click'); }
}

// camera for the on-foot player
function updateFootCamera(dt) {
  const P = PLAYER, f = P.frame;
  if (SHIP.dash) { SHIP.dash.visible = false; if (SHIP.obj) SHIP.obj.body.visible = true; }
  const up = playerUp(new V3());
  _q1.setFromAxisAngle(_v1.set(1, 0, 0), P.pitch);
  const camQ = P.q.clone().multiply(_q1);
  const bob = SETTINGS.fpv ? Math.sin(P.bob * 2) * 0.04 * Math.min(1, P.speedNow / 5) : 0;
  let local = P.pos.clone().addScaledVector(up, P.eye + bob);
  if (P.tp) {
    const back = new V3(0.6, 0.4, 3.6).applyQuaternion(camQ);
    const want = local.clone().add(back);
    if (f && f.kind === 'planet') { const gr = groundHeightAt(f, want); const r = want.length(); if (r < gr + 0.4) want.multiplyScalar((gr + 0.4) / r); }
    if (f) { const d = back.clone().normalize(); const t = COLL.raycast(f, local, d, back.length()); if (t < back.length()) want.copy(local).addScaledVector(d, Math.max(0.3, t - 0.3)); }
    local = want;
  }
  CAM.pos.copy(local); CAM.q.copy(camQ);
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - dt); CAM.pos.addScaledVector(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), CAM.shake * 0.4); }
  toWorld(f, CAM.pos, R.camera.position);
  quatToWorld(f, CAM.q, R.camera.quaternion);
  const fov = TOOL.aiming ? SETTINGS.fov * 0.7 : SETTINGS.fov;
  if (Math.abs(R.camera.fov - fov) > 0.1) { R.camera.fov = lerp(R.camera.fov, fov, Math.min(1, dt * 10)); R.camera.updateProjectionMatrix(); }
}
// camera ray in the player's frame
function camRayLocal() {
  const o = CAM.pos.clone();
  const d = new V3(0, 0, -1).applyQuaternion(CAM.q).normalize();
  return { o, d };
}

// ---------- interaction ----------
// Candidates come from providers: each returns [{ pos (local to PLAYER.frame), r, prompt, act, hold }]
const INTERACT = { providers: [], cur: null, holdT: 0 };
function addInteractProvider(fn) { INTERACT.providers.push(fn); }
function findInteract() {
  const P = PLAYER;
  if (P.inShip || !P.alive) return null;
  const { o, d } = camRayLocal();
  let best = null, bs = Infinity;
  for (const prov of INTERACT.providers) {
    const list = prov(P.frame, P.pos);
    if (!list) continue;
    for (const c of list) {
      const to = _v1.copy(c.pos).sub(o);
      const dist = to.length();
      if (dist > (c.r || 2.5) + 2.6) continue;
      const along = to.dot(d);
      if (along < -0.3 && dist > 1.2) continue;
      const off = Math.sqrt(Math.max(0, dist * dist - along * along));
      if (off > (c.r || 2.5) * 0.9 + 0.6) continue;
      const score = off + dist * 0.3;
      if (score < bs) { bs = score; best = c; }
    }
  }
  return best;
}
function updateInteract(dt) {
  if (UI.blocking() || BUILD.active) { INTERACT.cur = null; INTERACT.holdT = 0; return; }
  const c = findInteract();
  if (c !== INTERACT.cur && (!c || !INTERACT.cur || c.key !== INTERACT.cur.key)) INTERACT.holdT = 0;
  INTERACT.cur = c;
  if (!c) return;
  if (c.hold) {
    if (Act.down('interact')) { INTERACT.holdT += dt; if (INTERACT.holdT >= c.hold) { INTERACT.holdT = 0; c.act(); } }
    else INTERACT.holdT = 0;
  } else if (Act.hit('interact')) c.act();
}

// ---------- damage, death and respawn ----------
function damagePlayer(amount, src) {
  const P = PLAYER;
  if (!P.alive || G.god) return;
  if (P.inShip) { damageShip(amount, src); return; }
  P.sinceHit = 0;
  const s = Math.min(P.stats.shield, amount);
  P.stats.shield -= s; amount -= s;
  if (amount > 0) P.stats.hp = Math.max(0, P.stats.hp - amount);
  CAM.shake = Math.max(CAM.shake, 0.25);
  HUD.hurt(s > 0 && amount <= 0 ? 'shield' : 'hp');
  AU.sfx(s > 0 && amount <= 0 ? 'shieldhit' : 'hit', 0.6);
  if (P.stats.hp <= 0) killPlayer(src);
}
function killPlayer(src) {
  const P = PLAYER;
  P.alive = false;
  HUD.banner('You died', 'warn');
  AU.sfx('death');
  // leave a grave with the exosuit's contents
  if (P.frame && P.frame.kind === 'planet') {
    const items = P.suit.slots.filter(Boolean).map((s) => ({ ...s }));
    if (items.length) {
      const g = { pl: P.frame.pl.id, pos: P.pos.clone(), items };
      P.graves.push(g);
      P.suit.slots.fill(null);
      spawnGraveMarker(g);
    }
  }
  setTimeout(respawnPlayer, 3500);
}
function respawnPlayer() {
  const P = PLAYER;
  P.alive = true; P.stats.hp = 100; P.stats.shield = maxShield(); P.stats.life = Math.max(P.stats.life, 50); P.stats.haz = Math.max(P.stats.haz, 50); P.stats.jet = 100;
  WANTED.clear();
  // beside the ship if it shares our planet, else at the last base or the station
  if (SHIP.cur && SHIP.state === 'landed' && SHIP.frame) {
    const up = frameUp(SHIP.frame, SHIP.pos, new V3());
    const side = new V3(1, 0, 0).applyQuaternion(SHIP.q);
    const p = SHIP.pos.clone().addScaledVector(side, 7).addScaledVector(up, 1);
    placePlayer(SHIP.frame, p, new V3(0, 0, -1).applyQuaternion(SHIP.q));
    if (SHIP.frame.kind === 'planet') snapToGround(P);
  } else if (STATION.frame) {
    placePlayer(STATION.frame, new V3(0, 3.2, 34), new V3(0, 0, -1));
  }
  HUD.msg('Your grave marks where you fell. Recover your items there.', 'good');
}
function snapToGround(P) {
  if (P.frame && P.frame.kind === 'planet') { const gr = groundHeightAt(P.frame, P.pos); const r = P.pos.length(); if (r < gr + 0.5) P.pos.multiplyScalar((gr + 0.05) / r); }
}
const GRAVES = { markers: [] };
function spawnGraveMarker(g) {
  const pl = PLANETS.list.find((p) => p.id === g.pl);
  if (!pl) return;
  const m = meshOf(buildModel([P_.cyl(0.08, 0.1, 1.6, 6, 0x404850, [0, 0.8, 0]), glowPart(P_.oct(0.35, 0xff60a0, [0, 1.9, 0]), 1.5)]));
  m.position.copy(g.pos); basisQuat(g.pos.clone().normalize(), perpOf(g.pos.clone().normalize()), m.quaternion);
  pl.group.add(m);
  GRAVES.markers.push({ g, m, pl });
}
addInteractProvider((f, p) => {
  if (!f || f.kind !== 'planet') return null;
  const out = [];
  for (const gm of GRAVES.markers) {
    if (gm.pl !== f.pl) continue;
    out.push({ key: 'grave', pos: gm.g.pos.clone().addScaledVector(gm.g.pos.clone().normalize(), 1), r: 2, prompt: '[interact] Recover your belongings', act: () => {
      for (const it of gm.g.items) giveItem(it.id, it.n, true);
      HUD.msg('Belongings recovered.', 'good'); AU.sfx('pickup');
      gm.m.parent.remove(gm.m); GRAVES.markers = GRAVES.markers.filter((x) => x !== gm); PLAYER.graves = PLAYER.graves.filter((x) => x !== gm.g);
    } });
  }
  return out;
});
