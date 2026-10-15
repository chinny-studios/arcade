// Farhold — space: the station (docking, interior, terminals, NPCs), asteroid fields, pirates, NPC traffic, warp

// ---------- the station ----------
const STATION = { obj: null, frame: null, pos: new V3(), data: null, npcs: [], parked: [], seed: 0 };
function buildStation(S) {
  clearStation();
  const seed = hashN(S.seed, 400);
  const d = makeStation(seed);
  const group = new THREE.Group();
  group.position.copy(S.station.pos);
  group.quaternion.setFromAxisAngle(UP, S.station.yaw);
  group.updateMatrixWorld(true);
  R.scene.add(group);
  const mesh = meshOf(d.geo, R.mat.phong, false); mesh.receiveShadow = false;
  group.add(mesh);
  // docking field across the mouth
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(84, 30), new THREE.MeshBasicMaterial({ color: d.lit, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  fm.position.set(0, 18, -78); group.add(fm);
  STATION.field = fm;
  STATION.obj = group; STATION.data = d; STATION.pos.copy(S.station.pos); STATION.seed = seed;
  STATION.frame = { kind: 'station', group, st: STATION };
  addBoxColliders(d.boxes, { f: STATION.frame, pos: new V3(), q: new Q4() }, 'station');
  // terminals
  for (const t of d.terminals) { const m = meshOf(terminalGeo(t.kind, d.lit)); m.position.copy(t.pos); m.rotation.y = 0; group.add(m); }
  // residents
  const r = RNG(seed + 1);
  STATION.npcs = [];
  const spKeys = Object.keys(SPECIES);
  for (let i = 0; i < 5; i++) {
    const sp = spKeys[i % 3], pos = i < 3 ? new V3(-14 + i * 14 + 5, 3, 42) : new V3(r.range(-40, 40), 3, r.range(30, 33));
    const m = meshOf(alienGeo(sp, r.int(0, 99))); m.position.copy(pos); m.rotation.y = Math.PI + r.range(-0.3, 0.3);
    group.add(m);
    STATION.npcs.push({ sp, pos, m, seed: r.int(0, 1e9), talked: false, name: NAMEGEN.person(r.int(0, 1e9)) });
  }
  // a couple of visiting ships on the far pads
  STATION.parked = [];
  for (let i = 2; i < 4; i++) if (r() < 0.75) {
    const so = makeShipObject(r.pick(['fighter', 'explorer', 'hauler', 'shuttle']), r.int(0, 1e9));
    so.root.position.copy(d.pads[i]); so.root.rotation.y = Math.PI; group.add(so.root);
    STATION.parked.push({ pad: i, obj: so });
  }
  STATION.lights = [new V3(-30, 30, -40), new V3(30, 30, -10), new V3(0, 30, 40), new V3(0, 30, -60)];
}
function clearStation() {
  if (STATION.obj) { R.scene.remove(STATION.obj); COLL.removeOwner('station'); }
  STATION.obj = null; STATION.frame = null; STATION.npcs = []; STATION.parked = [];
}
function freePad() { const used = new Set(STATION.parked.map((p) => p.pad)); for (let i = 0; i < 4; i++) if (!used.has(i)) return i; return 0; }
function checkDocking() {
  const S = SHIP;
  const wp = shipWorldPos(new V3());
  if (wp.distanceTo(STATION.pos) > 600) return;
  const l = toLocal(STATION.frame, wp);
  if (l.z > -130 && l.z < -70 && Math.abs(l.x) < 40 && l.y > 3 && l.y < 33) {
    const v = dirToLocal(STATION.frame, S.vel.clone());
    if (v.z > 2) startDock();
  }
}
function startDock() {
  const S = SHIP;
  shipChangeFrame(STATION.frame);
  const pad = STATION.data.pads[freePad()];
  const out = basisQuat(UP, new V3(0, 0, -1), new Q4());
  S.path = { pts: [S.pos.clone(), new V3(0, 18, -50), new V3(pad.x, 14, pad.z), pad.clone()], durs: [1.6, 2.2, 2.4], i: 0, t: 0, qEnd: out, done: () => { S.state = 'landed'; S.onPad = true; AU.sfx('touchdown'); bus.emit('docked'); SAVE.save('dock'); } };
  S.state = 'dock'; S.speed = 0; S.pulseK = 0;
  AU.sfx('landing');
  HUD.msg('Docking sequence engaged.');
}
function startUndock() {
  const S = SHIP;
  const p = S.pos.clone();
  S.path = { pts: [p, new V3(p.x, 14, p.z), new V3(0, 18, -60), new V3(0, 18, -300)], durs: [1.8, 2.2, 2.0], i: 0, t: 0, qEnd: basisQuat(UP, new V3(0, 0, -1), new Q4()), done: () => { shipChangeFrame(null); S.state = 'flight'; S.speed = 140; S.vel.copy(new V3(0, 0, -1).applyQuaternion(S.q).multiplyScalar(140)); bus.emit('undocked'); } };
  S.state = 'undock'; S.onPad = false;
  AU.sfx('takeoff');
}
function followPath(dt) {
  const S = SHIP, P = S.path;
  P.t += dt;
  const d = P.durs[P.i];
  const k = smooth(0, 1, P.t / d);
  const a = P.pts[P.i], b = P.pts[P.i + 1];
  S.pos.copy(a).lerp(b, k);
  const dir = b.clone().sub(a);
  const last = P.i === P.durs.length - 1;
  let tq = P.qEnd;
  if (dir.lengthSq() > 1 && !(last && S.state === 'dock')) { const fl = dir.clone().normalize(); fl.y *= 0.3; tq = basisQuat(UP, fl.lengthSq() > 0.01 ? fl : new V3(0, 0, -1), new Q4()); }
  S.q.slerp(tq, Math.min(1, dt * 2.5));
  S.speed = dir.length() / d;
  if (P.t >= d) { P.i++; P.t = 0; if (P.i >= P.durs.length) { S.q.copy(P.qEnd); S.path = null; P.done(); } }
}
function dockInstant() {
  if (!STATION.obj) return;
  const pad = STATION.data.pads[freePad()];
  placeShip(STATION.frame, pad.clone(), basisQuat(UP, new V3(0, 0, -1), new Q4()), 'landed');
  SHIP.onPad = true;
  PLAYER.inShip = true; PLAYER.frame = STATION.frame;
  SHIP.camInit = false;
}
function stationCollideShip() {
  if (!STATION.obj) return;
  const wp = shipWorldPos(new V3());
  if (wp.distanceTo(STATION.pos) > 500) return;
  const l = toLocal(STATION.frame, wp);
  const before = l.clone();
  COLL.collideSphere(STATION.frame, l, 7, null);
  if (before.distanceToSquared(l) > 1e-4) {
    toLocal(SHIP.frame, toWorld(STATION.frame, l), SHIP.pos);
    if (SHIP.speed > 80) { damageShip(6, 'station'); CAM.shake = 0.5; AU.sfx('scrape'); }
    SHIP.speed *= 0.5;
  }
}
// station terminals and residents
addInteractProvider((f) => {
  if (!f || f.kind !== 'station') return null;
  const out = [];
  for (const t of STATION.data.terminals) out.push({ key: 'term' + t.kind, pos: t.pos.clone().add(new V3(0, 1.4, 0)), r: 2.2, prompt: '[interact] ' + t.name, act: () => openTerminal(t.kind) });
  for (const n of STATION.npcs) out.push({ key: 'npc' + n.name, pos: n.pos.clone().add(new V3(0, 1.6, 0)), r: 1.8, prompt: '[interact] Talk to ' + n.name + ' (' + SPECIES[n.sp].name + ')', act: () => talkNPC(n) });
  return out;
});
function openTerminal(kind) {
  if (kind === 'save') { SAVE.save('manual'); HUD.msg('Progress saved.', 'good'); AU.sfx('save'); return; }
  if (kind === 'refine') { UI.open('refiner', { refiner: STATION.refiner || (STATION.refiner = makeRefiner(0.05)), name: 'Station Refinery' }); return; }
  UI.open(kind === 'trade' ? 'trade' : kind === 'tech' ? 'tech' : kind === 'suit' ? 'suitshop' : 'ships');
}
function talkNPC(n) {
  const sp = SPECIES[n.sp];
  const r = RNG(n.seed + (n.talked ? 7 : 0));
  let line = r.pick(sp.greet);
  let gift = null;
  if (!n.talked) {
    n.talked = true;
    const g = r();
    if (g < 0.35) gift = { id: 'units', n: r.int(2, 8) * 250 };
    else if (g < 0.55) gift = { id: 'nanites', n: r.int(5, 20) };
    else if (g < 0.75) gift = { id: r.pick(['tritium', 'sodium', 'ferrite', 'carbon', 'dihydro']), n: r.int(30, 80) };
    else line += ' ' + r.pick(['Waystones on the planets below hold old knowledge. Seek them.', 'Pirates prowl the lanes. Keep your deflector charged.', 'Storm crystals fetch a fine price — if you survive the storm.', 'Drop pods hold exosuit upgrades. Free, if you can find them.', 'Feed the creatures. They remember kindness.']);
  }
  UI.dialog(n.name + ' · ' + sp.name, line, gift);
  if (gift) giveItem(gift.id, gift.n);
  AU.sfx('talk');
}

// ---------- asteroids ----------
const ASTER = { fields: [], meshes: [] };
function buildAsteroids(S) {
  clearAsteroids();
  const geos = asteroidGeos();
  for (const fd of S.fields) {
    const r = RNG(fd.seed);
    const items = [];
    for (let i = 0; i < fd.n; i++) {
      const p = new V3(r.range(-1, 1), r.range(-0.35, 0.35), r.range(-1, 1)).multiplyScalar(fd.r).add(fd.pos);
      const s = r() < 0.08 ? r.range(30, 60) : r.range(5, 22);
      items.push({ pos: p, s, g: r.int(0, 3), rot: new THREE.Euler(r() * 3, r() * 3, r() * 3), hp: s * 4, alive: true, rich: r() < 0.1, spin: r.range(-0.1, 0.1) });
    }
    const field = { fd, items, meshes: [] };
    for (let g = 0; g < 4; g++) {
      const list = items.filter((a) => a.g === g);
      const im = new THREE.InstancedMesh(geos[g], R.mat.vc, list.length);
      list.forEach((a, k) => { a.mesh = im; a.k = k; });
      im.frustumCulled = false;
      field.meshes.push(im);
      R.scene.add(im);
    }
    for (const a of items) writeAst(a);
    for (const m of field.meshes) m.instanceMatrix.needsUpdate = true;
    ASTER.fields.push(field);
  }
}
function writeAst(a) { _mm.compose(a.pos, _mq.setFromEuler(a.rot), _ms.setScalar(a.alive ? a.s : 0)); a.mesh.setMatrixAt(a.k, _mm); }
function clearAsteroids() { for (const f of ASTER.fields) for (const m of f.meshes) R.scene.remove(m); ASTER.fields = []; }
function asteroidRaycast(o, d, maxT) {
  let best = null, bt = maxT;
  for (const f of ASTER.fields) {
    if (f.fd.pos.distanceTo(o) > f.fd.r * 1.8 + maxT) continue;
    for (const a of f.items) {
      if (!a.alive) continue;
      _v3.copy(a.pos).sub(o); const tc = _v3.dot(d);
      if (tc < 0 || tc - a.s > bt) continue;
      const d2 = _v3.lengthSq() - tc * tc;
      if (d2 > a.s * a.s * 0.8) continue;
      const t = tc - Math.sqrt(Math.max(0, a.s * a.s * 0.8 - d2));
      if (t < bt) { bt = t; best = a; }
    }
  }
  if (best) best.t = bt;
  return best;
}
function damageAsteroid(a, dmg) {
  if (!a.alive) return;
  a.hp -= dmg;
  if (a.hp <= 0) {
    a.alive = false; writeAst(a); a.mesh.instanceMatrix.needsUpdate = true;
    FX.explosion(a.pos, a.s * 0.8, 0x9a8a7a);
    AU.sfx('rockbreak', 0.7);
    const n = Math.round(15 + a.s * 2.5);
    giveItem('tritium', n);
    if (a.rich) giveItem(fpick(['gold', 'silver', 'cobalt', SYS.cur ? STAR_METAL[SYS.cur.cls] : 'copper']), Math.round(10 + a.s));
    bus.emit('asteroidMined', a);
  }
}
function asteroidCollideShip() {
  const S = SHIP;
  for (const f of ASTER.fields) {
    if (f.fd.pos.distanceTo(S.pos) > f.fd.r * 1.8 + 100) continue;
    for (const a of f.items) {
      if (!a.alive) continue;
      const d = S.pos.distanceTo(a.pos), rr = a.s * 0.9 + 5;
      if (d < rr) {
        S.pos.copy(a.pos).addScaledVector(_v1.copy(S.pos).sub(a.pos).normalize(), rr);
        if (S.speed > 60) { damageShip(Math.min(30, S.speed * 0.08), 'asteroid'); CAM.shake = 0.6; AU.sfx('scrape'); }
        S.speed *= 0.4;
      }
    }
  }
}

// ---------- pirates ----------
const PIRATES = { list: [], t: 150, warned: false, active: false };
PIRATES.clear = function () { for (const p of this.list) p.obj.root.parent && p.obj.root.parent.remove(p.obj.root); this.list = []; this.active = false; };
function spawnPirates(n) {
  const S = SHIP;
  const back = new V3(0, 0, 1).applyQuaternion(S.q);
  for (let i = 0; i < n; i++) {
    const obj = makeShipObject('fighter', 990 + i * 7 + (Math.random() * 1000 | 0));
    obj.body.material = R.mat.vc;
    const pos = S.pos.clone().addScaledVector(back, 1800 + i * 120).add(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(600));
    R.scene.add(obj.root);
    PIRATES.list.push({ obj, pos, q: S.q.clone(), vel: new V3(), speed: 300, hp: 60, shield: 50, alive: true, fireT: 2 + Math.random() * 2, burst: 0, off: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(120), t: Math.random() * 10 });
  }
  PIRATES.active = true;
  S.pulseK = 0; S.jammed = 4;
  HUD.banner('Pirates incoming', 'warn');
  AU.sfx('alarm');
  SOLA_say('pirates');
  bus.emit('pirates', n);
}
function updatePirates(dt) {
  const S = SHIP;
  const inSpace = SHIP.cur && PLAYER.inShip && !S.frame && S.state === 'flight' && !WARP.active;
  if (!PIRATES.active) {
    if (!inSpace || !QUEST.flags.station) return;
    PIRATES.t -= dt;
    if (PIRATES.t <= 0) {
      PIRATES.t = 120 + Math.random() * 150;
      const cargo = S.cur.cargo.slots.reduce((a, s) => a + (s ? ITEMS[s.id].val * s.n : 0), 0);
      const chance = 0.12 + SYS.cur.conflict * 0.12 + Math.min(0.25, cargo / 400000);
      if (STATION.obj && shipWorldPos(new V3()).distanceTo(STATION.pos) < 5000) return;
      if (Math.random() < chance) spawnPirates(clamp(1 + SYS.cur.conflict + (Math.random() < 0.4 ? 1 : 0), 1, 4));
    }
    return;
  }
  let alive = 0;
  for (const p of PIRATES.list) {
    if (!p.alive) continue;
    alive++;
    p.t += dt;
    // aim at a point offset around the player, swing in for attack runs
    const toward = S.pos.clone().add(p.off.clone().applyAxisAngle(new V3(0, 1, 0), p.t * 0.4)).sub(p.pos);
    const dist = S.pos.distanceTo(p.pos);
    const want = toward.normalize();
    const fwd = new V3(0, 0, -1).applyQuaternion(p.q);
    const tq = basisQuat(new V3(0, 1, 0).applyQuaternion(p.q), want, new Q4());
    p.q.slerp(tq, Math.min(1, dt * 1.6));
    p.speed = lerp(p.speed, dist > 800 ? 420 : dist < 150 ? 160 : 260, Math.min(1, dt));
    p.vel.copy(fwd).multiplyScalar(p.speed);
    p.pos.addScaledVector(p.vel, dt);
    p.obj.root.position.copy(p.pos); p.obj.root.quaternion.copy(p.q);
    for (const fl of p.obj.flames) fl.scale.set(1, 1, 1 + p.speed / 300);
    // fire when lined up
    p.fireT -= dt;
    const toS = S.pos.clone().sub(p.pos).normalize();
    if (dist < 900 && fwd.dot(toS) > 0.96 && p.fireT <= 0 && inSpace) {
      p.burst = 5; p.fireT = 2.4 + Math.random() * 1.5;
    }
    if (p.burst > 0 && (p.bt = (p.bt || 0) - dt) <= 0) {
      p.burst--; p.bt = 0.12;
      const start = p.pos.clone().addScaledVector(fwd, 6);
      const lead = S.pos.clone().addScaledVector(S.vel, dist / 900);
      const dir = lead.sub(start).normalize().add(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.03)).normalize();
      const m = new THREE.Mesh(_shotGeo, R.mat.red); m.frustumCulled = false; R.scene.add(m); m.position.copy(start); m.lookAt(start.clone().add(dir));
      SHOTS.push({ f: null, pos: start, vel: dir.multiplyScalar(900), life: 1.8, dmg: 5, owner: 'pirate', m });
      AU.sfx('cannon', 0.15);
    }
    if (dist < 2500) S.jammed = Math.max(S.jammed, 0.5);
    if (dist > 6000) { p.alive = false; p.obj.root.parent && p.obj.root.parent.remove(p.obj.root); }
  }
  if (!alive) {
    const killed = PIRATES.list.filter((p) => p.killed).length;
    PIRATES.clear();
    PIRATES.t = 180 + Math.random() * 200;
    if (killed) { HUD.banner('Pirates defeated', 'win'); bus.emit('piratesDefeated', killed); }
    else HUD.msg('You escaped the pirates.', 'good');
  }
}
function damagePirate(p, dmg) {
  if (!p.alive) return;
  const s = Math.min(p.shield, dmg); p.shield -= s; dmg -= s; p.hp -= dmg;
  AU.sfx('hitmark', 0.4);
  if (p.hp <= 0) {
    p.alive = false; p.killed = true;
    FX.explosion(p.pos, 18);
    AU.sfx('explode', 0.8);
    p.obj.root.parent && p.obj.root.parent.remove(p.obj.root);
    giveItem('units', 600 + Math.floor(Math.random() * 1800));
    if (Math.random() < 0.6) giveItem('nanites', 5 + Math.floor(Math.random() * 12));
    if (Math.random() < 0.4) giveItem(fpick(['tritium', 'gold', 'chromatic', 'circuit']), fpick([1, 20, 40]));
  }
}

// ---------- NPC traffic ----------
const TRAFFIC = { list: [] };
function buildTraffic(S) {
  clearTraffic();
  const r = RNG(hashN(S.seed, 500));
  const n = 4 + r.int(0, 3);
  for (let i = 0; i < n; i++) {
    const obj = makeShipObject(r.pick(['fighter', 'explorer', 'hauler', 'shuttle']), r.int(0, 1e9));
    R.scene.add(obj.root);
    const t = { obj, from: null, to: null, pos: new V3(), q: new Q4(), speed: r.range(220, 380), r };
    newTrafficLeg(t, true);
    TRAFFIC.list.push(t);
  }
}
function trafficPoint(r) {
  const S = SYS.cur;
  if (r() < 0.45 || !S.planets.length) return S.station.pos.clone().add(new V3(r.range(-1, 1), r.range(-0.2, 0.2), r.range(-1, 1)).multiplyScalar(300));
  const p = r.pick(S.planets);
  return p.pos.clone().add(new V3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize().multiplyScalar(p.soi * 1.05));
}
function newTrafficLeg(t, mid) {
  t.from = trafficPoint(t.r); t.to = trafficPoint(t.r);
  if (t.from.distanceTo(t.to) < 3000) t.to.add(new V3(5000, 0, 0));
  t.pos.copy(t.from); if (mid) t.pos.lerp(t.to, t.r());
  basisQuat(new V3(0, 1, 0), t.to.clone().sub(t.from).normalize(), t.q);
}
function updateTraffic(dt) {
  for (const t of TRAFFIC.list) {
    const d = t.to.clone().sub(t.pos), l = d.length();
    if (l < 50) { newTrafficLeg(t, false); continue; }
    t.pos.addScaledVector(d.divideScalar(l), Math.min(l, t.speed * dt * (l > 8000 ? 12 : 1)));
    t.obj.root.position.copy(t.pos); t.obj.root.quaternion.copy(t.q);
    for (const fl of t.obj.flames) fl.scale.set(1, 1, 1.4);
  }
}
function clearTraffic() { for (const t of TRAFFIC.list) R.scene.remove(t.obj.root); TRAFFIC.list = []; }

// ---------- warp ----------
const WARP = { active: false, t: 0, target: null, hold: 0, tunnel: null };
function warpRange() { return 600 * techFx('range'); }
function warpCheck(target) {
  if (!target) return 'Choose a destination on the galaxy map.';
  if (target === SYS.star) return 'You are already here.';
  if (!hasTech('warpdrive')) return 'You need a Warp Drive.';
  const need = DRIVE_FOR[target.cls];
  if (need && !target.core && !hasTech(need)) return 'Reaching a ' + STAR_CLASS[target.cls].name.toLowerCase() + ' star needs the ' + TECH[need].name + '.';
  if (starDist(SYS.star, target) > warpRange()) return 'Out of warp range.';
  if (!INV.has('warpcell', 1)) return 'You need a Warp Cell.';
  return null;
}
function updateWarpInput(dt) {
  const S = SHIP;
  if (WARP.active || !PLAYER.inShip || S.state !== 'flight' || UI.blocking()) { WARP.hold = 0; return; }
  if (Act.down('warp')) {
    const err = warpCheck(GALAXY.target);
    if (S.frame) { if (Act.hit('warp')) { HUD.msg('Leave the planet’s gravity well to warp.', 'bad'); AU.sfx('deny'); } return; }
    if (err) { if (Act.hit('warp')) { HUD.msg(err, 'bad'); AU.sfx('deny'); } return; }
    WARP.hold += dt;
    if (WARP.hold > 1.2) { WARP.hold = 0; engageWarp(GALAXY.target); }
  } else WARP.hold = 0;
}
function engageWarp(target) {
  INV.take('warpcell', 1);
  WARP.active = true; WARP.t = 0; WARP.target = target; WARP.loaded = false;
  AU.sfx('warp');
  PIRATES.clear();
  bus.emit('warpStart', target);
}
function makeTunnel() {
  const g = new THREE.CylinderGeometry(30, 30, 800, 32, 1, true); g.rotateX(Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 1 }, uC: { value: new THREE.Color(0x8060ff) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uA; uniform vec3 uC; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec2 p = vec2(vUv.x * 40.0, vUv.y * 6.0 + uT * 3.0); vec2 i = floor(p); float s = step(0.86, h(i)) * smoothstep(0.0, 0.4, fract(p.y)) * (1.0 - fract(p.y));
        float band = 0.5 + 0.5 * sin(vUv.y * 30.0 - uT * 12.0 + vUv.x * 6.283);
        vec3 c = uC * (0.25 + band * 0.35) + vec3(s) * 1.6; float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        gl_FragColor = vec4(c * edge * uA, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, transparent: true, blending: THREE.AdditiveBlending,
  });
  const t = new THREE.Mesh(g, m); t.frustumCulled = false; t.renderOrder = 100;
  return t;
}
// returns true while the warp owns the frame
function updateWarp(dt) {
  if (!WARP.active) return false;
  WARP.t += dt;
  const S = SHIP;
  if (!WARP.tunnel) { WARP.tunnel = makeTunnel(); R.camera.add(WARP.tunnel); }
  const T = WARP.tunnel;
  T.material.uniforms.uT.value = WARP.t;
  T.position.set(0, 0, -300);
  T.material.uniforms.uC.value.setHex(STAR_CLASS[WARP.target.cls].col);
  if (WARP.t < 1.6) {
    // spool: accelerate, widen the view
    T.material.uniforms.uA.value = smooth(0.6, 1.6, WARP.t);
    S.speed = lerp(S.speed, 3000, dt);
    S.pos.addScaledVector(new V3(0, 0, -1).applyQuaternion(S.q), S.speed * dt);
    syncShipModel();
    updateShipCamera(dt);
    R.camera.fov = lerp(R.camera.fov, 110, dt * 2); R.camera.updateProjectionMatrix();
    HUD.flash(smooth(1.2, 1.6, WARP.t));
  } else if (!WARP.loaded) {
    WARP.loaded = true;
    arriveSystem(WARP.target);
    T.material.uniforms.uA.value = 1;
  } else if (WARP.t < 5.2) {
    // hyperspace: only the tunnel
    T.material.uniforms.uA.value = 1;
    HUD.flash(1 - smooth(1.6, 2.2, WARP.t));
    R.camera.fov = lerp(R.camera.fov, 100, dt * 2); R.camera.updateProjectionMatrix();
    for (const p of PLANETS.list) p.group.visible = false;
    if (STATION.obj) STATION.obj.visible = false;
    R.sunMesh.visible = false;
  } else {
    // drop out
    for (const p of PLANETS.list) p.group.visible = true;
    if (STATION.obj) STATION.obj.visible = true;
    R.sunMesh.visible = true;
    R.camera.remove(T); T.geometry.dispose(); T.material.dispose(); WARP.tunnel = null;
    WARP.active = false;
    S.speed = 400;
    HUD.flash(0);
    AU.sfx('warpout');
    HUD.banner(SYS.cur.name, 'win');
    bus.emit('warped', SYS.cur);
    SAVE.save('warp');
    return false;
  }
  return true;
}
// Load a new star system and put the ship at its arrival point (used by warps and loading saves)
function arriveSystem(star) {
  clearShots(); clearProjectiles(); PIRATES.clear(); natReset(); faunaReset(); POIS_reset(); SENT.clear();
  COLL.clear();
  const S = loadSystem(star);
  buildStation(S); buildAsteroids(S); buildTraffic(S);
  BASES.rebuild();
  GALAXY.visited.add(star.i);
  const toSt = S.station.pos.clone().sub(S.arrival).normalize();
  placeShip(null, S.arrival.clone(), basisQuat(new V3(0, 1, 0), toSt, new Q4()), 'flight');
  SHIP.speed = 300; SHIP.vel.copy(toSt).multiplyScalar(300);
  SHIP.camQ.copy(SHIP.q);
  PLAYER.inShip = true; PLAYER.frame = null;
  return S;
}
