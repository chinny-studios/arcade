// Creature Feature — you: the monster. Movement (walk, run, stalk, jump, roofs), the third-person camera, the
// attack, the two powers of each monster, feeding, breaking in, and things thrown

let P = null;
const CAM = { yaw: 0, pitch: 0.28, zoom: 1, x: 0, y: 5, z: 5, snap: true, tx: 0, ty: 0, tz: 0 };
const THROWN = [];
function spawnMonster(id) {
  if (P) R.scene.remove(P.M.root);
  const D = MONSTERS[id], M = buildMonster(id);
  const s = TOWN.spawn;
  P = {
    id, D, M, x: s.x, z: s.z, y: terrainH(s.x, s.z), vx: 0, vy: 0, vz: 0, yaw: s.yaw, onGround: true, running: false, stalk: false,
    act: null, actT: 0, actK: 0, cd: { atk: 0, a1: 0, a2: 0 }, form: 'normal', batT: 0, storm: 0, held: null, grab: null, door: null,
    dead: false, airT: 0, phase: 0, near: null, doorHits: 0, lash: null, stepT: 0, rise: 1.6, kills: 0,
  };
  M.root.position.set(P.x, P.y, P.z);
  R.scene.add(M.root);
  CAM.yaw = s.yaw; CAM.pitch = 0.25; CAM.snap = true;
  return P;
}
const camFwd = () => [fwdX(CAM.yaw), fwdZ(CAM.yaw)];
// ---------- per-frame control ----------
function updateMonster(dt) {
  if (!P) return;
  const D = P.D, M = P.M;
  for (const k in P.cd) P.cd[k] = Math.max(0, P.cd[k] - dt);
  if (P.dead) { P.actT += dt; poseMonster(M, 'dead', 0, 0, G.t); M.root.position.set(P.x, P.y + Math.max(0, 0.6 - P.actT) * 0, P.z); return; }
  // rising from the crypt at the start
  if (P.rise > 0) {
    P.rise -= dt;
    const k = 1 - clamp(P.rise / 1.6, 0, 1);
    M.root.position.set(P.x, P.y - (1 - k) * 2.2, P.z); M.root.rotation.y = P.yaw;
    poseMonster(M, 'cast', 0, 0, G.t);
    if (G.frame % 3 === 0) puff(P.x + rr(-1, 1), P.y + 0.3, P.z + rr(-1, 1), { col: 0x6a8a6a, size: 1.4, life: 1.4, op: 0.4 });
    return;
  }
  const mv = Input.move();
  const [fx, fz] = camFwd(), rx = -fz, rz = fx;
  let wx = fx * -mv.y + rx * mv.x, wz = fz * -mv.y + rz * mv.x;
  const wl = Math.hypot(wx, wz);
  const locked = P.act && ['grab', 'feed', 'howl', 'stomp', 'lift', 'stare', 'beckon', 'lash', 'smashDoor', 'cast'].includes(P.act);
  P.stalk = !locked && Input.held('stalk') && P.form !== 'bat' && !P.held;
  P.running = !locked && wl > 0.1 && Input.held('run') && !P.stalk && !P.held && P.form !== 'bat';
  let speed = P.form === 'bat' ? 15 : P.stalk ? D.stalk : P.running ? D.run : D.walk;
  if (P.held) speed *= 0.8;
  if (locked) speed = 0;
  if (P.act === 'attack' && D.attack.kind !== 'claw') speed *= 0.3;
  const tvx = wx * speed, tvz = wz * speed;
  const acc = P.onGround || P.form === 'bat' ? 14 : 2.5;
  if (P.act !== 'pounce') { P.vx = damp(P.vx, tvx, acc, dt); P.vz = damp(P.vz, tvz, acc, dt); }
  // facing: the way you move, or the camera when aiming
  if (wl > 0.1 && !locked && P.act !== 'pounce') P.yaw = angTo(P.yaw, yawOf(wx, wz), dt * (P.running ? 9 : 12));
  if (P.form === 'bat') batFlight(dt);
  else {
    if (Input.pressed('jump') && P.onGround && !locked) { P.vy = D.jump; P.onGround = false; AUDIO.sfx('jump', P.x, P.z); }
    P.vy -= 22 * dt;
  }
  // move with collisions
  const nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
  const r = collide(nx, nz, D.radius, P.y);
  P.x = clamp(r.x, -470, 470); P.z = clamp(r.z, -470, 470);
  P.y += P.vy * dt;
  const gy = supportY(P.x, P.z, P.y, D.radius);
  if (P.y <= gy) {
    if (!P.onGround && P.airT > 0.5) { FX.shake = Math.max(FX.shake, P.id === 'frank' ? 0.5 : 0.2); AUDIO.sfx('land', P.x, P.z); if (P.id === 'frank') dustRing(P.x, P.z, 3, 8); }
    if (P.act === 'pounce') endPounce();
    P.y = gy; P.vy = Math.max(0, P.vy); P.onGround = P.form !== 'bat'; P.airT = 0;
  } else if (P.y > gy + 0.25 && P.form !== 'bat') { P.onGround = false; P.airT += dt; }
  else if (P.form !== 'bat') { P.y = gy; P.onGround = true; P.airT = 0; }
  // footsteps
  const hs = Math.hypot(P.vx, P.vz);
  P.phase += dt * hs * (P.running && P.id === 'werewolf' ? 1.5 : 2.3) / (P.id === 'frank' ? 1.4 : 1);
  if (P.onGround && hs > 1) { P.stepT -= dt * hs; if (P.stepT <= 0) { P.stepT = P.id === 'frank' ? 2.4 : 1.6; AUDIO.step(P.id, P.running); if (P.id === 'frank') FX.shake = Math.max(FX.shake, 0.12); } }
  // actions
  updateAct(dt);
  if (!P.act || P.act === 'attack' || P.act === 'pounce') {
    if (Input.pressed('atk')) doAttack();
    else if (Input.pressed('a1')) doPower1();
    else if (Input.pressed('a2')) doPower2();
  }
  findNear();
  if (Input.pressed('use') && !P.act) doUse();
  if (P.storm > 0) stormStep(dt);
  if (P.held) carryHeld();
  // pose
  const mode = P.form === 'bat' ? 'bat' : P.act === 'attack' ? 'attack' : P.act === 'grab' || P.act === 'swoopGrab' ? (P.id === 'mummy' ? 'grab' : 'grab') : P.act === 'feed' ? 'feed' : P.act === 'howl' ? 'howl' : P.act === 'stomp' ? 'stomp' : P.act === 'throw' ? 'throw' : P.act === 'lash' ? 'lash' : P.act === 'stare' || P.act === 'beckon' ? 'stare' : P.act === 'cast' ? 'cast' : P.act === 'smashDoor' ? 'attack' : P.held ? 'hold' : !P.onGround ? 'air' : hs > 0.5 ? (P.running ? 'run' : P.stalk ? 'stalk' : 'walk') : 'idle';
  if (mode === 'bat') {
    for (const w of M.wings) w.rotation.z = (w.position.x < 0 ? 1 : -1) * Math.sin(G.t * 16) * 0.8;
    M.bat.rotation.x = clamp(-P.vy * 0.04, -0.5, 0.5);
  } else poseMonster(M, mode, P.phase, hs, G.t, P.actK);
  M.root.position.set(P.x, P.y, P.z); M.root.rotation.y = P.yaw;
  M.root.rotation.x = P.act === 'pounce' ? -0.5 : 0;
}
function batFlight(dt) {
  P.batT -= dt;
  const up = (Input.held('jump') ? 1 : 0) - (Input.held('stalk') ? 1 : 0);
  const gy = terrainH(P.x, P.z);
  // hold altitude, climb and dive on the buttons, sink gently toward 9 m when idle
  const want = up !== 0 ? up * 9 : (P.y - gy < 5 ? 3 : 0);
  P.vy = damp(P.vy, want, 4, dt);
  if (P.y > gy + 48) P.vy = Math.min(P.vy, 0);
  if (P.batT <= 0) endBat();
}
function endBat() {
  if (P.form !== 'bat') return;
  P.form = 'normal'; P.cd.a2 = P.D.a2.cd;
  setBatVisible(false);
  batPuff();
  AUDIO.sfx('bats', P.x, P.z);
}
function setBatVisible(on) { const M = P.M; M.bat.visible = on; M.hips.visible = M.legL.visible = M.legR.visible = !on; }
function batPuff() { spray(P.x, P.y + 1.2, P.z, 26, { kind: 'debris', col: [0x1a1418, 0x2a1a20], speed: 6, up: 0.6, spread: 1, size: 0.18, life: 0.9, g: -2 }); puff(P.x, P.y + 1, P.z, { col: 0x3a3a48, size: 2.4, grow: 2, life: 1.2, op: 0.5 }); }

// ---------- actions ----------
function setAct(name, t, extra) { P.act = name; P.actT = 0; P.actDur = t; P.actK = 0; P.actFired = false; Object.assign(P, extra || {}); }
function updateAct(dt) {
  if (!P.act) return;
  P.actT += dt; P.actK = clamp(P.actT / P.actDur, 0, 1);
  const a = P.act;
  if (a === 'attack' && !P.actFired && P.actK > (P.id === 'frank' ? 0.5 : 0.35)) { P.actFired = true; strike(); }
  if (a === 'grab') {
    // hold the victim in front and finish them
    const v = P.grab;
    if (v && v.state === 'held') {
      const [fx, fz] = [fwdX(P.yaw), fwdZ(P.yaw)];
      v.x = P.x + fx * 0.7; v.z = P.z + fz * 0.7; v.y = P.y + (P.id === 'vampire' ? 0.1 : 0.25); v.yaw = P.yaw + Math.PI;
      if (G.frame % 4 === 0 && P.id === 'vampire' && OPTS.gore === 'full') spray(v.x, v.y + 1.45, v.z, 2, { speed: 1.5, up: 0.8, spread: 0.5, size: 0.05 });
    }
    if (P.actK >= 1) { P.act = null; if (v && v.state === 'held') killPerson(v, P.D.attack.kind, fwdX(P.yaw), fwdZ(P.yaw), { bonus: P.grabBonus || [] }); P.grab = null; }
    return;
  }
  if (a === 'feed') {
    if (G.frame % 3 === 0 && P.feedOn) spray(P.feedOn.x, P.feedOn.y + 0.3, P.feedOn.z, 2, { speed: 2, up: 1, spread: 0.6, decal: true });
    if (P.actK >= 1) { P.act = null; finishFeed(P.feedOn); }
    return;
  }
  if (a === 'howl' && !P.actFired && P.actT > 0.35) { P.actFired = true; howl(); }
  if (a === 'stomp' && !P.actFired && P.actK > 0.5) { P.actFired = true; stomp(); }
  if (a === 'lift' && P.actK >= 1) { P.act = null; }
  if (a === 'throw' && !P.actFired && P.actK > 0.35) { P.actFired = true; release(); }
  if (a === 'lash') lashStep(dt);
  if (a === 'beckon' && P.actK >= 1) { P.act = null; const r = P.door; if (r && r.occ.length) { const v = r.occ[0]; leaveRefuge(v, false); v.state = 'trance'; v.tranceT = 6; say(v, pick(LINES.trance)); bus.emit('beckon', v); } }
  if (a === 'smashDoor' && !P.actFired && P.actK > 0.45) { P.actFired = true; hitDoor(P.doorTarget); }
  if (a === 'stare' && P.actK >= 1) P.act = null;
  if (a === 'cast' && P.actK >= 1) P.act = null;
  if (a === 'swoop') swoopStep(dt);
  if (P.act && P.actK >= 1 && ['attack', 'smashDoor', 'throw', 'stomp', 'howl'].includes(a)) P.act = null;
}
// nearby people and cars that an attack from here could reach
function targetsInArc(reach, arc, yaw) {
  const out = [], [fx, fz] = [fwdX(yaw), fwdZ(yaw)];
  for (const v of PEOPLE.list) {
    if (v.hidden || v.state === 'dead' || v.state === 'gone' || v.state === 'thrown') continue;
    const dx = v.x - P.x, dz = v.z - P.z, d = Math.hypot(dx, dz);
    if (d > reach + 0.3 || Math.abs(v.y - P.y) > 2.2) continue;
    const a = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
    if (d > 0.9 && a > arc / 2) continue;
    out.push({ v, d });
  }
  out.sort((a, b) => a.d - b.d);
  return out;
}
function carsInArc(reach, arc, yaw) {
  const out = [], [fx, fz] = [fwdX(yaw), fwdZ(yaw)];
  for (const c of CARS.list) {
    if (c.dead || c.state === 'held' || c.state === 'flying') continue;
    // nearest point of the car to the monster
    const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
    const lx = clamp((P.x - c.x) * cs - (P.z - c.z) * sn, -1, 1), lz = clamp((P.x - c.x) * sn + (P.z - c.z) * cs, -2.6, 2.6);
    const qx = c.x + lx * cs + lz * sn, qz = c.z - lx * sn + lz * cs;
    const dx = qx - P.x, dz = qz - P.z, d = Math.hypot(dx, dz);
    if (d > reach + 0.4 || Math.abs(c.y - P.y) > 2.5) continue;
    const a = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
    if (d > 1 && a > arc / 2 + 0.3) continue;
    out.push({ c, d });
  }
  out.sort((a, b) => a.d - b.d);
  return out;
}
// turn toward the best victim near where you're looking (soft lock)
function assistYaw(range) {
  let best = null, bs = 1e9;
  const cy = Input.move().y !== 0 || Input.move().x !== 0 ? P.yaw : CAM.yaw;
  for (const v of PEOPLE.list) {
    if (v.hidden || v.state === 'dead' || v.state === 'gone') continue;
    const d = dist(v.x, v.z, P.x, P.z); if (d > range || Math.abs(v.y - P.y) > 2.2) continue;
    const a = Math.abs(angWrap(yawOf(v.x - P.x, v.z - P.z) - cy));
    if (a > 1.4) continue;
    const s = d + a * 2;
    if (s < bs) { bs = s; best = v; }
  }
  if (best) P.yaw = yawOf(best.x - P.x, best.z - P.z);
  return best;
}
function doAttack() {
  const D = P.D;
  if (P.cd.atk > 0) return;
  if (P.form === 'bat') return startSwoop();
  if (P.held) return startThrow();
  if (P.act === 'pounce') return;
  P.cd.atk = D.attack.cd + D.attack.lock * 0.5;
  assistYaw(D.attack.reach + 1.6);
  // a door right in front with people behind it
  if (D.door >= 0 && P.near && P.near.kind === 'door' && !targetsInArc(D.attack.reach, D.attack.arc, P.yaw).length) { startDoor(P.near.r); return; }
  if (D.attack.multi) { setAct('attack', D.attack.lock); AUDIO.sfx(P.id === 'frank' ? 'swingBig' : 'swipe', P.x, P.z); return; }
  // grabbers: vampire and mummy take hold of one victim
  const t = targetsInArc(D.attack.reach, D.attack.arc, P.yaw);
  if (t.length) return grabVictim(t[0].v, []);
  const cars = carsInArc(D.attack.reach, D.attack.arc, P.yaw).filter((x) => x.c.occ.length);
  if (cars.length) { const c = cars[0].c, out = smashCar(c, 1); const v = out[0]; if (v) { pullFromCar(v); grabVictim(v, ['car']); bail(c); } return; }
  setAct('attack', 0.45); AUDIO.sfx('swipe', P.x, P.z);
}
function grabVictim(v, bonus) {
  const b = bonus.slice();
  if (v.state === 'trance') b.push('trance');
  if (v.state === 'down') b.push(v.tripped ? 'tripped' : 'flat');
  if (v.state === 'cower') b.push('frozen');
  if (v.state === 'blind' || v.blind > 0) b.push('blind');
  if (v.alert < 0.5 && CALM[v.state]) b.push('silent');
  if (G.t - v.flushedT < 8) b.push('flushed');
  v.state = 'held'; v.by = P; setHidden(v, false);
  v.M.root.rotation.set(0, v.yaw, 0);
  P.grab = v; P.grabBonus = b;
  setAct('grab', P.D.attack.lock);
  P.yaw = yawOf(v.x - P.x, v.z - P.z);
  AUDIO.scream(v.x, v.z, v.look.f, 1);
  say(v, pick(LINES.hurt), 1.4);
  witness(v.x, v.z);
  if (P.id === 'vampire') AUDIO.sfx('bite', P.x, P.z); else AUDIO.sfx('choke', P.x, P.z);
}
function pullFromCar(v) {
  const c = v.car; if (c) { const i = c.occ.indexOf(v); if (i >= 0) c.occ.splice(i, 1); }
  v.car = null; v.x = c ? c.x + Math.cos(c.yaw) * 1.4 : v.x; v.z = c ? c.z - Math.sin(c.yaw) * 1.4 : v.z; v.y = supportY(v.x, v.z, 3); setHidden(v, false);
}
// everyone left in a stopped car jumps out and runs
function bail(c) {
  for (const o of c.occ.slice()) { pullFromCar(o); o.x += rr(-1, 1); startle(o, P.x, P.z); }
  c.occ.length = 0;
}
// the moment a claw or a fist lands
function strike() {
  const D = P.D, yaw = P.yaw, [fx, fz] = [fwdX(yaw), fwdZ(yaw)];
  const t = targetsInArc(D.attack.reach, D.attack.arc, yaw);
  const air = !P.onGround && P.airT > 0.25;
  let n = 0;
  for (const { v } of t) {
    const b = air ? ['air'] : [];
    if (v.state === 'down') b.push(v.tripped ? 'tripped' : 'flat'); if (v.state === 'cower') b.push('frozen');
    if (v.state === 'trance') b.push('trance'); if (v.alert < 0.5 && CALM[v.state]) b.push('silent'); if (G.t - v.flushedT < 8) b.push('flushed');
    killPerson(v, D.attack.kind, v.x - P.x || fx, v.z - P.z || fz, { bonus: b });
    n++;
  }
  for (const { c } of carsInArc(D.attack.reach, D.attack.arc, yaw)) {
    const out = smashCar(c, P.id === 'frank' ? 2 : 1);
    if (P.id === 'frank') { for (const v of out) { pullFromCar(v); killPerson(v, 'smash', fx, fz, { bonus: ['car'] }); n++; } c.occ.length = 0; c.vy = 2; }
    else if (out.length) { const v = out[0]; pullFromCar(v); killPerson(v, 'claw', fx, fz, { bonus: ['car'] }); n++; bail(c); }
  }
  // lamp posts and props in the way
  if (P.id === 'frank' || P.id === 'werewolf') for (const L of TOWN.lamps) if (L.on && dist(L.x, L.z, P.x + fx * 1.5, P.z + fz * 1.5) < 2.2) smashLamp(L);
  for (const p of TOWN.props) if (p.alive && P.id === 'frank' && dist(p.x, p.z, P.x + fx * 1.5, P.z + fz * 1.5) < 2) { const m = takeProp(p); THROWN.push({ kind: 'mesh', m, x: p.x, y: p.y + 0.6, z: p.z, vx: fx * 11, vy: 5, vz: fz * 11, spin: 7, rest: false }); }
  if (D.door >= 0 && P.near && P.near.kind === 'door' && !n) hitDoor(P.near.r);
  if (n) { FX.shake = Math.max(FX.shake, 0.35 + n * 0.1); G.slow = 0.12; }
  else FX.shake = Math.max(FX.shake, P.id === 'frank' ? 0.3 : 0.1);
}
function smashLamp(L) {
  L.on = false; L.light.on = false;
  const o = new THREE.Object3D(); o.scale.set(0.001, 0.001, 0.001); o.updateMatrix();
  TOWN.headIM.setMatrixAt(L.i, o.matrix); TOWN.headIM.instanceMatrix.needsUpdate = true;
  if (L.light.pool) { TOWN.poolIM.setMatrixAt(L.light.pool.i, o.matrix); TOWN.poolIM.instanceMatrix.needsUpdate = true; }
  spray(L.hx, L.y, L.hz, 14, { kind: 'debris', col: [0xfff0c0, 0xffd080, 0xffffff], speed: 4, up: 0.2, spread: 1, size: 0.05, life: 1.2 });
  AUDIO.sfx('glass', L.x, L.z);
  bus.emit('lamp', L);
}
// ---------- doors ----------
function startDoor(r) {
  const D = P.D;
  if (!r || r.broken) return;
  P.yaw = yawOf(r.x - P.x, r.z - P.z);
  if (D.door < 0) { setAct('beckon', 1.4, { door: r }); AUDIO.sfx('beckon', P.x, P.z); return; }
  setAct('smashDoor', P.id === 'frank' ? 0.55 : 0.5, { doorTarget: r });
  AUDIO.sfx('swipe', P.x, P.z);
}
function hitDoor(r) {
  if (!r || r.broken) return;
  r.hits = (r.hits || 0) + 1;
  FX.shake = Math.max(FX.shake, 0.25);
  if (r.hits >= Math.max(1, P.D.door)) breakRefuge(r);
  else { AUDIO.sfx('knock', r.x, r.z); spray(r.x, 1.4, r.z, 6, { kind: 'debris', col: [0x6a4a2e], speed: 3, size: 0.08, life: 2 }); for (const v of r.occ) if (chance(0.5)) { AUDIO.scream(r.x, r.z, v.look.f, 0.4); break; } }
}
// ---------- the use button: feed, break in, beckon ----------
function findNear() {
  P.near = null;
  if (P.form === 'bat' || P.held) return;
  let best = null, bd = 1e9;
  for (const v of PEOPLE.corpses) {
    if (v.fed || v.state !== 'dead' || v.deadT > 120 || v.fly) continue;
    const d = dist(v.x, v.z, P.x, P.z); if (d < 2.6 && d < bd && Math.abs(v.y - P.y) < 1.5) { bd = d; best = { kind: 'corpse', v, label: 'Feed' }; }
  }
  for (const r of TOWN.refuges) {
    if (r.broken) continue;
    const d = dist(r.x, r.z, P.x, P.z); if (d > 3 || Math.abs(P.y - terrainH(r.x, r.z)) > 2) continue;
    if (d < bd + 0.5) { bd = d; best = { kind: 'door', r, label: r.occ.length ? P.D.doorVerb + ' (' + r.occ.length + ' inside)' : 'Nobody home', empty: !r.occ.length }; }
  }
  P.near = best;
}
function doUse() {
  const n = P.near; if (!n) return;
  if (n.kind === 'corpse') { setAct('feed', 1.5, { feedOn: n.v }); P.yaw = yawOf(n.v.x - P.x, n.v.z - P.z); AUDIO.sfx('feed', P.x, P.z); }
  else if (n.kind === 'door' && !n.empty) startDoor(n.r);
}
function finishFeed(v) {
  if (!v || v.fed) return;
  v.fed = true;
  bloodPool(v.x, v.z, 1.5, v.y);
  bus.emit('fed', v);
}
// ---------- powers ----------
function doPower1() {
  if (P.cd.a1 > 0 || P.act === 'pounce') return;
  if (P.id === 'vampire') { if (P.form === 'bat') return; const v = aimTarget(32); setAct('stare', 0.55); AUDIO.sfx('hypno', P.x, P.z); if (v) hypnotise(v); P.cd.a1 = v ? P.D.a1.cd : 1; }
  else if (P.id === 'werewolf') startPounce();
  else if (P.id === 'frank') { if (P.held) startThrow(); else liftNearest(); }
  else if (P.id === 'mummy') startLash();
}
function doPower2() {
  if (P.id === 'vampire') { if (P.form === 'bat') { endBat(); return; } }
  if (P.cd.a2 > 0 || P.act) return;
  if (P.id === 'vampire') { P.form = 'bat'; P.batT = P.D.a2.dur; P.vy = 6; P.onGround = false; setBatVisible(true); batPuff(); AUDIO.sfx('bats', P.x, P.z); P.cd.a2 = 0.5; }
  else if (P.id === 'werewolf') { setAct('howl', 1.4); P.cd.a2 = P.D.a2.cd; }
  else if (P.id === 'frank') { setAct('stomp', 0.9); P.cd.a2 = P.D.a2.cd; AUDIO.sfx('roar', P.x, P.z); }
  else if (P.id === 'mummy') { setAct('cast', 0.6); P.storm = P.D.a2.dur; P.cd.a2 = P.D.a2.cd + P.D.a2.dur; AUDIO.sfx('sand', P.x, P.z); }
}
// whoever is closest to the middle of the screen, within range and in sight
function aimTarget(range, cone = 0.22) {
  const cp = R.camera.position;
  R.camera.getWorldDirection(_v2);
  let best = null, ba = 1e9;
  const wide = Input.mode === 'touch' || Input.mode === 'pad' ? 2 : 1;
  for (const v of PEOPLE.list) {
    if (v.state === 'dead' || v.state === 'gone' || v.state === 'held' || v.state === 'thrown' || v.state === 'inside') continue;
    if (v.hidden && v.state !== 'incar') continue;
    const d = dist(v.x, v.z, P.x, P.z); if (d > range) continue;
    _v1.set(v.x - cp.x, v.y + 1.1 - cp.y, v.z - cp.z);
    const l = _v1.length(); _v1.divideScalar(l);
    const a = Math.acos(clamp(_v1.dot(_v2), -1, 1));
    if (a > cone * wide) continue;
    const s = a + d * 0.004;
    if (s < ba && losClear(P.x, P.y + 1.5, P.z, v.x, v.y + 1.2, v.z)) { ba = s; best = v; }
  }
  return best;
}
function hypnotise(v) {
  if (v.state === 'incar') { const c = v.car; pullFromCar(v); if (c) { if (c.state === 'drive') { c.state = 'stopped'; c.speed = 0; } } }
  if (v.state === 'inside') return;
  v.state = 'trance'; v.tranceT = 5.5; v.sit = false;
  say(v, pick(LINES.trance), 2);
  P.yaw = yawOf(v.x - P.x, v.z - P.z);
  // a thread of red sparks between you
  const n = 14;
  for (let i = 0; i < n; i++) { const k = i / n; spray(lerp(P.x, v.x, k), lerp(P.y + 1.75, v.y + 1.6, k), lerp(P.z, v.z, k), 1, { kind: 'debris', col: [0xff2030, 0xff6060], speed: 0.3, up: 1, size: 0.06, life: 0.6, g: -1 }); }
  bus.emit('hypno', v);
}
// --- werewolf
function startPounce() {
  if (!P.onGround) return;
  const v = aimTarget(18, 0.3);
  let vx, vz, vy = 7.5;
  R.camera.getWorldDirection(_v2);
  if (v) { const dx = v.x - P.x, dz = v.z - P.z, d = Math.hypot(dx, dz), t = clamp(d / 15, 0.35, 1.1); vx = dx / t; vz = dz / t; vy = 11 * t * 0.5 + (v.y - P.y) / t; P.yaw = yawOf(dx, dz); }
  else { const l = Math.hypot(_v2.x, _v2.z) || 1; vx = _v2.x / l * 15; vz = _v2.z / l * 15; vy = 7 + clamp(_v2.y * 10, -2, 6); P.yaw = yawOf(vx, vz); }
  P.vx = vx; P.vy = vy; P.vz = vz; P.onGround = false; P.airT = 0.01;
  setAct('pounce', 3); P.pounceHit = new Set();
  P.cd.a1 = P.D.a1.cd;
  AUDIO.sfx('snarl', P.x, P.z);
}
function endPounce() {
  P.act = null;
  for (const { v } of targetsInArc(2.4, TAU, P.yaw)) if (!P.pounceHit.has(v)) { P.pounceHit.add(v); killPerson(v, 'pounce', v.x - P.x, v.z - P.z, { bonus: ['pounce'] }); }
  for (const { c } of carsInArc(2.2, TAU, P.yaw)) { const out = smashCar(c, 1); if (out.length) { const v = out[0]; pullFromCar(v); killPerson(v, 'pounce', c.x - P.x, c.z - P.z, { bonus: ['pounce', 'car'] }); bail(c); } }
  P.vx *= 0.3; P.vz *= 0.3;
  dustRing(P.x, P.z, 2.5, 8);
}
function howl() {
  AUDIO.sfx('howl', P.x, P.z);
  FX.shake = Math.max(FX.shake, 0.3);
  let n = 0;
  for (const v of PEOPLE.list) {
    if (v.hidden || v.state === 'dead' || v.state === 'gone' || v.state === 'held' || v.state === 'thrown') continue;
    const d = dist(v.x, v.z, P.x, P.z); if (d > 40) continue;
    v.state = 'cower'; v.cowerT = 4.2 - d / 18; v.sit = false; v.alert = 1; v.lastMx = P.x; v.lastMz = P.z; n++;
    if (chance(0.4)) say(v, pick(['W-wolf...', 'Oh God, oh God', 'Mama...', '(whimpering)']));
  }
  bus.emit('howl', n);
}
// --- frank
function liftNearest() {
  // a live victim first, then a body, a car, a prop, and failing all else a slab of the road
  let best = null, bd = 3.6;
  for (const v of PEOPLE.list) { if (v.hidden || v.state === 'gone' || v.state === 'held' || v.state === 'thrown' || (v.state === 'dead' && v.fly)) continue; const d = dist(v.x, v.z, P.x, P.z); if (d < bd + (v.state === 'dead' ? -0.6 : 0)) { bd = d; best = { kind: v.state === 'dead' ? 'corpse' : 'victim', v }; } }
  if (!best) for (const c of CARS.list) { if (c.dead || c.state === 'flying') continue; const d = dist(c.x, c.z, P.x, P.z) - 1.8; if (d < bd) { bd = d; best = { kind: 'car', c }; } }
  if (!best) for (const p of TOWN.props) { if (!p.alive) continue; const d = dist(p.x, p.z, P.x, P.z); if (d < bd) { bd = d; best = { kind: 'prop', p }; } }
  if (!best) best = { kind: 'chunk' };
  setAct('lift', 0.45);
  const h = { kind: best.kind };
  if (best.kind === 'victim') { const v = best.v; if (v.state === 'incar') pullFromCar(v); v.state = 'held'; v.by = P; setHidden(v, false); h.v = v; AUDIO.scream(v.x, v.z, v.look.f, 1); say(v, pick(LINES.hurt)); witness(v.x, v.z); h.bonus = v.alert < 0.5 ? ['silent'] : []; }
  else if (best.kind === 'corpse') { const v = best.v; h.v = v; v.state = 'held'; v.fly = null; const i = PEOPLE.corpses.indexOf(v); if (i >= 0) PEOPLE.corpses.splice(i, 1); }
  else if (best.kind === 'car') { const c = best.c; h.c = c; const out = c.occ.slice(); if (c.state === 'drive') c.speed = 0; c.state = 'held'; for (const v of out) { pullFromCar(v); v.state = 'held'; h.riders = (h.riders || []).concat([v]); setHidden(v, true); } AUDIO.sfx('crash', c.x, c.z); if (c.light) { c.light.on = false; } }
  else if (best.kind === 'prop') { h.mesh = takeProp(best.p); }
  else { const m = new THREE.Mesh(cachedGeo('chunk', () => { const k = new Mesher(); k.box(0, 0, 0, 1.6, 0.35, 1.2, C.asphalt); k.box(0, -0.25, 0, 1.5, 0.2, 1.1, 0x5a4a3a); return k.build(); }), MATS.vc); R.scene.add(m); h.mesh = m; dustRing(P.x + fwdX(P.yaw), P.z + fwdZ(P.yaw), 2, 8); bloodPool(P.x + fwdX(P.yaw) * 1.2, P.z + fwdZ(P.yaw) * 1.2, 0.01); AUDIO.sfx('crunch', P.x, P.z); }
  P.held = h;
  P.cd.a1 = 0.4;
}
function takeProp(p) {
  p.alive = false; removeCollider(p.col);
  const im = TOWN.propIM[p.kind], o = new THREE.Object3D(); o.scale.set(0.001, 0.001, 0.001); o.updateMatrix(); im.setMatrixAt(p.i, o.matrix); im.instanceMatrix.needsUpdate = true;
  const m = new THREE.Mesh(propGeo(p.kind), MATS.vc); m.position.set(p.x, p.y, p.z); m.rotation.y = p.ry; R.scene.add(m);
  return m;
}
function carryHeld() {
  const h = P.held, [fx, fz] = [fwdX(P.yaw), fwdZ(P.yaw)], top = P.y + 3.0;
  const k = P.act === 'lift' ? P.actK : 1;
  if (h.v) { const v = h.v; v.x = lerp(v.x, P.x + fx * 0.2, k); v.z = lerp(v.z, P.z + fz * 0.2, k); v.y = lerp(v.y, top - 0.6, k); v.M.root.position.set(v.x, v.y, v.z); v.M.root.rotation.set(Math.PI / 2, P.yaw + Math.PI / 2, 0); if (v.state === 'held') poseHuman(v.M, 'held', 0, 0, G.t); }
  if (h.c) { const c = h.c; c.x = lerp(c.x, P.x, k); c.z = lerp(c.z, P.z, k); c.y = lerp(c.y, top - 0.2, k); c.yaw = P.yaw + Math.PI / 2; c.mesh.position.set(c.x, c.y, c.z); c.mesh.rotation.set(0, c.yaw, 0); for (const v of h.riders || []) { v.x = c.x; v.z = c.z; v.y = c.y; } }
  if (h.mesh) { h.mesh.position.set(P.x + fx * 0.1, top - 0.3, P.z + fz * 0.1); h.mesh.rotation.set(0, P.yaw, 0); }
}
function startThrow() { if (P.act === 'throw') return; setAct('throw', 0.6); AUDIO.sfx('swingBig', P.x, P.z); }
function release() {
  const h = P.held; if (!h) return;
  P.held = null; P.cd.a1 = P.D.a1.cd;
  R.camera.getWorldDirection(_v2);
  const l = Math.hypot(_v2.x, _v2.z) || 1, dx = _v2.x / l, dz = _v2.z / l;
  P.yaw = yawOf(dx, dz);
  const sp = h.kind === 'car' ? 17 : 24, vy = (h.kind === 'car' ? 5 : 5) + clamp(_v2.y * 12, -3, 8);
  const target = aimTarget(40, 0.3);
  let vx = dx * sp, vz = dz * sp, vyy = vy;
  if (target) { const tx = target.x - P.x, tz = target.z - P.z, d = Math.hypot(tx, tz), t = d / sp; vx = tx / t; vz = tz / t; vyy = (target.y + 0.8 - (P.y + 2.8)) / t + 7.5 * t; }
  if (h.v) {
    const v = h.v; v.fly = { vx, vy: vyy, vz, spin: rr(5, 9), lethal: true, by: P }; v.yaw = P.yaw;
    if (v.state === 'held') { v.state = 'thrown'; }
    else { v.state = 'dead'; PEOPLE.corpses.push(v); v.flyLethal = true; THROWN.push({ kind: 'corpse', v }); }
  } else if (h.c) {
    const c = h.c; c.state = 'flying'; c.vx = vx * 0.85; c.vy = vyy * 0.9; c.vz = vz * 0.85; c.spin = rr(-3, 3);
    for (const v of h.riders || []) { v.state = 'held'; THROWN.push({ kind: 'rider', v, c }); }
  } else if (h.mesh) THROWN.push({ kind: 'mesh', m: h.mesh, x: h.mesh.position.x, y: h.mesh.position.y, z: h.mesh.position.z, vx, vy: vyy, vz, spin: rr(4, 8), rest: false });
  FX.shake = Math.max(FX.shake, 0.2);
}
function updateThrown(dt) {
  for (let i = THROWN.length - 1; i >= 0; i--) {
    const t = THROWN[i];
    if (t.kind === 'mesh') {
      if (t.rest) continue;
      t.vy -= 16 * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt;
      t.m.position.set(t.x, t.y, t.z); t.m.rotation.x += t.spin * dt; t.m.rotation.z += t.spin * 0.5 * dt;
      hitByThrown(t.x, t.y, t.z, 1.8, { kind: 'mesh', vx: t.vx, vz: t.vz });
      const r = collide(t.x, t.z, 0.4, t.y, true);
      const gy = supportY(t.x, t.z, t.y + 0.3);
      if (t.y <= gy + 0.2 || r.hit) {
        t.rest = true; t.y = gy + 0.3; t.m.position.y = t.y; t.m.rotation.x = 0; t.m.rotation.z = 0.3;
        dustRing(t.x, t.z, 2, 8); FX.shake = Math.max(FX.shake, 0.3); AUDIO.sfx('crash', t.x, t.z);
        hitByThrown(t.x, t.y, t.z, 2.2, { kind: 'mesh', vx: t.vx, vz: t.vz, land: true });
        THROWN.splice(i, 1); THROWN_REST.push(t.m);
      }
    } else if (t.kind === 'rider') {
      const c = t.c; t.v.x = c.x; t.v.z = c.z; t.v.y = c.y;
      if (c.state !== 'flying') { THROWN.splice(i, 1); const v = t.v; setHidden(v, false); v.state = 'idle'; killPerson(v, 'car', c.vx || 1, c.vz || 0, { bonus: ['thrown', 'car'] }); }
    } else if (t.kind === 'corpse') {
      const v = t.v;
      if (!v.fly) { THROWN.splice(i, 1); continue; }
      hitByThrown(v.x, v.y + 0.5, v.z, 1.6, { kind: 'body', vx: v.fly.vx, vz: v.fly.vz, except: v });
    }
  }
}
const THROWN_REST = [];
// something heavy and fast went through here: anyone in the way dies
function hitByThrown(x, y, z, r, o) {
  for (const v of PEOPLE.list) {
    if (v === o.except || v.hidden || v.state === 'dead' || v.state === 'gone' || v.state === 'held' || v.state === 'thrown' || v.state === 'snared') continue;
    if (Math.abs(v.y + 0.9 - y) > r + 0.8) continue;
    if (dist2(v.x, v.z, x, z) > r * r) continue;
    killPerson(v, 'thrown', o.vx || 1, o.vz || 0, { bonus: ['thrown'] });
  }
  if (o.kind !== 'car') for (const c of CARS.list) {
    if (c.dead || c.state === 'flying' || c.state === 'held' || !c.occ.length) continue;
    if (dist2(c.x, c.z, x, z) > (r + 1.2) * (r + 1.2) || Math.abs(c.y + 0.8 - y) > 2) continue;
    const out = smashCar(c, 2);
    for (const v of out) { pullFromCar(v); killPerson(v, 'smash', o.vx || 1, o.vz || 0, { bonus: ['thrown', 'car'] }); }
    c.occ.length = 0;
  }
}
function stomp() {
  FX.shake = 1.1; dustRing(P.x, P.z, 9, 22); AUDIO.sfx('stomp', P.x, P.z);
  let n = 0;
  for (const v of PEOPLE.list) {
    if (v.hidden || v.state === 'dead' || v.state === 'gone' || v.state === 'held' || v.state === 'thrown') continue;
    const d = dist(v.x, v.z, P.x, P.z); if (d > 15 || Math.abs(v.y - P.y) > 3) continue;
    knockDown(v, 3.4 - d / 9, false); v.alert = 1; v.lastMx = P.x; v.lastMz = P.z; n++;
  }
  for (const c of CARS.list) if (!c.dead && dist(c.x, c.z, P.x, P.z) < 15 && c.state === 'drive') { c.state = 'stopped'; c.speed = 0; bail(c); }
  for (const L of TOWN.lamps) if (L.on && dist(L.x, L.z, P.x, P.z) < 9 && chance(0.4)) smashLamp(L);
  bus.emit('stomp', n);
}
// --- mummy
function startLash() {
  const v = aimTarget(24, 0.26);
  setAct('lash', 0.75, { lash: { v, k: 0 } });
  P.cd.a1 = v ? P.D.a1.cd : 1.2;
  if (v) P.yaw = yawOf(v.x - P.x, v.z - P.z);
  AUDIO.sfx('lash', P.x, P.z);
  if (!P.lashMesh) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 1).translate(0, 0, -0.5), new THREE.MeshLambertMaterial({ color: 0xd6c8a0 }));
    R.scene.add(m); P.lashMesh = m;
  }
}
function lashStep() {
  const L = P.lash, m = P.lashMesh, v = L.v;
  const [fx, fz] = [fwdX(P.yaw), fwdZ(P.yaw)];
  const hx = P.x + fx * 0.4 + fz * 0.3, hy = P.y + 1.4, hz = P.z + fz * 0.4 - fx * 0.3;
  let tx, ty, tz;
  const out = Math.min(1, P.actT / 0.22);
  if (v && v.state !== 'dead' && v.state !== 'gone') { tx = v.x; ty = v.y + 1.1; tz = v.z; }
  else { R.camera.getWorldDirection(_v2); tx = hx + _v2.x * 24; ty = hy + _v2.y * 24; tz = hz + _v2.z * 24; }
  const d = dist(hx, hz, tx, tz), dd = Math.hypot(d, ty - hy);
  const len = v && P.actT > 0.22 ? dd : dd * (P.actT < 0.22 ? out : Math.max(0, 1 - (P.actT - 0.22) / 0.3));
  m.visible = len > 0.1;
  m.position.set(hx, hy, hz); m.lookAt(tx, ty, tz); m.rotateY(Math.PI); m.scale.set(1, 1, Math.max(0.01, len));
  if (v && P.actT >= 0.22 && !L.caught) {
    L.caught = true;
    if (v.state === 'incar') pullFromCar(v);
    if (v.state === 'inside') { L.v = null; return; }
    L.bonus = ['range']; if (v.alert < 0.5 && CALM[v.state]) L.bonus.push('silent'); if (v.state === 'blind' || v.blind > 0) L.bonus.push('blind');
    v.state = 'snared'; setHidden(v, false); v.M.root.rotation.set(0, v.yaw, 0);
    say(v, pick(LINES.hurt)); AUDIO.scream(v.x, v.z, v.look.f, 1); witness(v.x, v.z);
    P.actDur = 3;
  }
  if (L.caught && v.state === 'held') { m.visible = false; P.act = null; grabVictim(v, L.bonus); P.grab = v; return; }
  if (L.caught && (v.state === 'dead' || v.state === 'gone')) { m.visible = false; P.act = null; }
  if (P.actK >= 1) { m.visible = false; P.act = null; if (v && v.state === 'snared') { v.state = 'flee'; v.plan = 0; } }
}
function stormStep(dt) {
  P.storm -= dt;
  if (G.frame % 2 === 0) for (let i = 0; i < 2; i++) { const a = rr(0, TAU), r = rr(2, 15); puff(P.x + Math.cos(a) * r, P.y + rr(0.3, 3), P.z + Math.sin(a) * r, { col: 0xc8a870, size: rr(2, 4), grow: 1.2, life: 1.6, vx: -Math.sin(a) * 6, vz: Math.cos(a) * 6, vy: 0.3, op: 0.42 }); }
  for (const v of PEOPLE.list) {
    if (v.hidden || !(CALM[v.state] || v.state === 'flee' || v.state === 'blind')) continue;
    if (dist2(v.x, v.z, P.x, P.z) > 16 * 16) continue;
    if (v.state !== 'blind') { if (chance(0.3)) say(v, pick(["I can't see!", 'My eyes!', 'Sand? Where from?'])); v.alert = 1; }
    v.state = 'blind'; v.blind = 1; v.blindT = 1.8; v.sit = false;
  }
  if (P.storm <= 0) P.storm = 0;
}
// --- vampire swoop out of bat form
function startSwoop() {
  let best = null, bd = 1e9;
  const [fx, fz] = [fwdX(CAM.yaw), fwdZ(CAM.yaw)];
  for (const v of PEOPLE.list) {
    if (v.hidden || v.state === 'dead' || v.state === 'gone' || v.state === 'held') continue;
    const dx = v.x - P.x, dz = v.z - P.z, d = Math.hypot(dx, dz);
    if (d > 22 || P.y - v.y > 40) continue;
    const a = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
    if (a > 1.0 && d > 4) continue;
    if (d + a * 6 < bd) { bd = d + a * 6; best = v; }
  }
  if (!best) { endBat(); return; }
  setAct('swoop', 2, { swoopV: best });
  AUDIO.sfx('swoop', P.x, P.z);
}
function swoopStep(dt) {
  const v = P.swoopV;
  if (!v || v.state === 'dead' || v.state === 'gone' || v.hidden) { P.act = null; endBat(); return; }
  const dx = v.x - P.x, dy = v.y + 1.2 - P.y, dz = v.z - P.z, d = Math.hypot(dx, dy, dz);
  const sp = 26;
  P.vx = dx / d * sp; P.vy = dy / d * sp; P.vz = dz / d * sp; P.yaw = yawOf(dx, dz);
  if (d < 1.6) {
    P.act = null; endBat(); P.cd.a2 = P.D.a2.cd;
    P.vx = P.vy = P.vz = 0;
    grabVictim(v, ['air']);
  }
}
