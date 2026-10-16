// 10_weapons: weapon and gadget definitions, the player's shooting (hitscan against the grid and every body part),
// the first-person view model, pickups lying in the world, and limpet charges you throw and set off with F.
const WEAPONS = {
  chop: { name: 'Hand', melee: true, rate: 0.42, dmg: 30, range: 1.8, noise: 0, snd: 'chop' },
  pk9: { name: 'PK-9 (silenced)', ammo: '9mm', mag: 7, rate: 0.26, dmg: 34, spread: 0.01, noise: 5, snd: 'silenced', reload: 1.2, npcAcc: 0.5, npcDmg: 7 },
  tk33: { name: 'TK-33 pistol', ammo: '9mm', mag: 8, rate: 0.28, dmg: 36, spread: 0.014, noise: 30, snd: 'pistol', reload: 1.2, npcAcc: 0.5, npcDmg: 7 },
  vektor: { name: 'Vektor SMG', ammo: '9mm', mag: 24, rate: 0.085, auto: true, dmg: 20, spread: 0.045, noise: 30, snd: 'smg', reload: 1.4, npcAcc: 0.32, npcDmg: 5 },
  ar62: { name: 'AR-62 rifle', ammo: 'rifle', mag: 30, rate: 0.11, auto: true, dmg: 30, spread: 0.02, noise: 34, snd: 'rifle', reload: 1.6, zoom: 2.2, npcAcc: 0.42, npcDmg: 8 },
  sturm: { name: 'Sturm 12 shotgun', ammo: 'shell', mag: 5, rate: 0.85, pellets: 7, dmg: 15, spread: 0.075, noise: 34, snd: 'shotgun', reload: 2.0, npcAcc: 0.5, npcDmg: 5 },
  zeus: { name: 'Zeus ray rifle', ammo: 'cell', mag: 12, rate: 0.3, dmg: 70, spread: 0.004, noise: 18, snd: 'ray', reload: 1.8, beam: true, beamCol: [0.5, 1, 1], zoom: 2.6, npcAcc: 0.55, npcDmg: 12 },
  camera: { name: 'Camera', gadget: true, rate: 0.8 },
  bug: { name: 'Tracker bug', gadget: true, rate: 0.6 },
  mines: { name: 'Limpet charges', ammo: 'mines', rate: 0.6, gadget: true, thrown: true },
};
for (const k in WEAPONS) WEAPONS[k].id = k;
const AMMO = { '9mm': { name: '9mm', max: 140 }, rifle: { name: 'rifle', max: 180 }, shell: { name: 'shells', max: 40 }, cell: { name: 'energy cells', max: 60 }, mines: { name: 'limpet charges', max: 10 } };
const ITEMS = {
  keycard: { name: 'Command keycard', model: 'keycard' }, officekey: { name: "Kessler's key", model: 'keycard' },
  tape: { name: 'HELIOS master tape', model: 'tape' }, datakey: { name: 'Data key', model: 'device' },
};
const WEAPON_ORDER = ['chop', 'pk9', 'tk33', 'vektor', 'ar62', 'sturm', 'zeus', 'mines', 'camera', 'bug'];

// ---------------------------------------------------------------- inventory
function giveWeapon(id, ammo) {
  const p = G.player, W = WEAPONS[id];
  let isNew = false;
  if (!p.weapons.includes(id)) { p.weapons.push(id); p.weapons.sort((a, b) => WEAPON_ORDER.indexOf(a) - WEAPON_ORDER.indexOf(b)); isNew = true; if (W.mag) p.mag[id] = 0; }
  if (W.ammo && ammo) {
    if (W.mag && isNew) { const m = Math.min(W.mag, ammo); p.mag[id] = m; ammo -= m; }
    p.ammo[W.ammo] = Math.min(AMMO[W.ammo].max, (p.ammo[W.ammo] || 0) + ammo);
  }
  return isNew;
}
function curWeapon() { const p = G.player; return WEAPONS[p.weapons[p.cur]] || WEAPONS.chop; }
function selectWeapon(idx) {
  const p = G.player;
  if (idx < 0 || idx >= p.weapons.length || idx === p.cur && !p.switchT) return;
  p.next = idx; p.switchT = 0.45; p.reloadT = 0;
  sfx('switch');
}
function cycleWeapon(dir) {
  const p = G.player, n = p.weapons.length;
  let i = (p.next !== null && p.next !== undefined ? p.next : p.cur);
  for (let k = 0; k < n; k++) {
    i = (i + dir + n) % n;
    const W = WEAPONS[p.weapons[i]];
    if (W.ammo && W.thrown && !p.ammo.mines) continue;
    if (p.weapons[i] === 'bug' && !p.bugs) continue;
    break;
  }
  selectWeapon(i);
}
function canReload(p, W) { return W.mag && p.mag[W.id] < W.mag && (p.ammo[W.ammo] || 0) > 0; }
function startReload() {
  const p = G.player, W = curWeapon();
  if (p.reloadT > 0 || p.switchT > 0 || !canReload(p, W)) return;
  p.reloadT = W.reload; sfx('reload');
}

// ---------------------------------------------------------------- firing
const _ray = new THREE.Raycaster(), _v2 = new THREE.Vector2(), _dir = new THREE.Vector3();
function aimRay(spread) {
  const p = G.player;
  // where the crosshair is (classic aim mode moves it), as a ray from the camera
  _v2.set(p.aimMode ? p.aimX : 0, p.aimMode ? p.aimY : 0);
  _ray.setFromCamera(_v2, camera);
  _dir.copy(_ray.ray.direction);
  let target = null;
  if (p.autoAim && !p.aimMode) target = autoAimTarget(_dir);
  if (target) {
    _dir.set(target.x - camera.position.x, target.y - camera.position.y, target.z - camera.position.z).normalize();
  }
  if (spread) {
    _dir.x += rand(-spread, spread); _dir.y += rand(-spread, spread) * 0.8; _dir.z += rand(-spread, spread);
    _dir.normalize();
  }
  return { ox: camera.position.x, oy: camera.position.y, oz: camera.position.z, dx: _dir.x, dy: _dir.y, dz: _dir.z };
}
function autoAimTarget(dir) {
  let best = null, bs = 1e9;
  const cp = camera.position, yaw0 = Math.atan2(-dir.x, -dir.z), pitch0 = Math.asin(clamp(dir.y, -1, 1));
  for (const a of G.actors) {
    if (a.dead || (a.civilian && a.state === 'surrender')) continue;
    const ty = a.y + (a.kneel ? 0.85 : 1.25);
    const dx = a.x - cp.x, dy = ty - cp.y, dz = a.z - cp.z, d = Math.hypot(dx, dz);
    if (d > 28 || d < 0.5) continue;
    const dyaw = Math.abs(angDiff(yaw0, Math.atan2(-dx, -dz))), dp = Math.abs(Math.atan2(dy, d) - pitch0);
    const lim = Math.max(0.14, 1.0 / d);
    if (dyaw > lim || dp > 0.35) continue;
    if (!losClear(cp.x, cp.y, cp.z, a.x, ty, a.z)) continue;
    const s = dyaw * 3 + dp;
    if (s < bs) { bs = s; best = { x: a.x, y: ty, z: a.z }; }
  }
  return best;
}
function traceShot(r, W, opts = {}) {
  const { ox, oy, oz, dx, dy, dz } = r;
  const wh = rayWorld(ox, oy, oz, dx, dy, dz, 220);
  const maxT = wh ? wh.t : 220;
  let ah = null, aa = null;
  for (const a of G.actors) {
    if (a.dead) continue;
    const cx = a.x - ox, cy = a.y + 1 - oy, cz = a.z - oz, t = cx * dx + cy * dy + cz * dz;
    if (t < 0 || t > maxT + 1) continue;
    const qx = cx - dx * t, qy = cy - dy * t, qz = cz - dz * t;
    if (qx * qx + qy * qy + qz * qz > 1.6) continue;
    a.P.root.updateMatrixWorld(true);
    const h = rayPerson(a.P, ox, oy, oz, dx, dy, dz, maxT);
    if (h && (!ah || h.t < ah.t)) { ah = h; aa = a; }
  }
  if (ah) {
    if (W.beam) beamFx(ox + dx * 0.8, oy + dy * 0.8 - 0.15, oz + dz * 0.8, ah.x, ah.y, ah.z, W.beamCol);
    damageActor(aa, W.dmg * (opts.mul || 1), ah.part, 'player', { hitPos: ah, fromX: ox, fromZ: oz, dir: [dx, dy, dz], bullet: true });
    return true;
  }
  if (wh) {
    if (W.beam) beamFx(ox + dx * 0.8, oy + dy * 0.8 - 0.15, oz + dz * 0.8, wh.x, wh.y, wh.z, W.beamCol);
    impactFx(wh);
    if (wh.kind === 'glass') shatterWindow(wh.win, wh.x, wh.y, wh.z);
    else if (wh.prop) damageProp(wh.prop, W.dmg, false, wh);
    else if (Math.random() < 0.25) sfx('ric', wh);
  }
  return false;
}
function playerFire() {
  const p = G.player, W = curWeapon();
  if (p.fireT > 0 || p.switchT > 0 || p.reloadT > 0) return;
  if (W.melee) return chop(W);
  if (W.id === 'camera') return snapPhoto();
  if (W.id === 'bug') return plantBug();
  if (W.thrown) return throwMine();
  if (p.mag[W.id] <= 0) {
    if ((p.ammo[W.ammo] || 0) > 0) startReload(); else { sfx('empty'); p.fireT = 0.3; if (!W.auto || !p.trigHeld) hudMsg('Out of ammo'); }
    return;
  }
  p.mag[W.id]--;
  p.fireT = W.rate;
  G.stats.shots++; G.stats.shotId = (G.stats.shotId || 0) + 1;
  VM.kick = 1; VM.flashT = W.beam ? 0.08 : 0.05;
  sfx(W.snd);
  if (W.noise) noiseEvent(p.x, p.z, W.noise, null);
  const aiming = p.aiming || p.aimMode;
  const spread = W.spread * (aiming ? 0.45 : 1) * (p.crouch ? 0.8 : 1) * (1 + Math.min(1, Math.hypot(p.vx, p.vz) / 4) * 0.6);
  for (let k = 0; k < (W.pellets || 1); k++) traceShot(aimRay(spread), W);
  if (p.mag[W.id] === 0 && (p.ammo[W.ammo] || 0) > 0) later(0.25, () => { if (curWeapon() === W) startReload(); });
}
function chop(W) {
  const p = G.player;
  p.fireT = W.rate; VM.chopT = 0.35; sfx('swish');
  const fx = fwdX(p.yaw), fz = fwdZ(p.yaw);
  let best = null, bd = 1e9;
  for (const a of G.actors) {
    if (a.dead) continue;
    const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz);
    if (d > W.range || (dx * fx + dz * fz) / (d || 1) < 0.6) continue;
    if (d < bd) { bd = d; best = a; }
  }
  if (!best) return;
  later(0.12, () => {
    if (best.dead) return;
    G.stats.shots++; G.stats.shotId = (G.stats.shotId || 0) + 1;
    // an unaware guard struck from behind goes down at once
    const behind = Math.abs(angDiff(best.yaw, p.yaw)) < 1.0 && !best.sees && best.state !== 'combat';
    sfx('chopHit', best);
    damageActor(best, behind ? 400 : W.dmg, behind ? 'torso' : pick(['torso', 'torso', 'head', 'armL', 'armR']), 'player', { fromX: p.x, fromZ: p.z, hitPos: { x: best.x, y: best.y + 1.4, z: best.z }, bullet: true });
  });
}
function snapPhoto() {
  const p = G.player;
  p.fireT = WEAPONS.camera.rate;
  sfx('shutter'); HUD.flash = 0.35;
  const cp = camera.position;
  camera.getWorldDirection(_dir);
  let got = null;
  for (const pr of L.props) {
    if (!pr.id || !pr.center) continue;
    const [x, y, z] = pr.center, dx = x - cp.x, dy = y - cp.y, dz = z - cp.z, d = Math.hypot(dx, dy, dz);
    const ang = Math.acos(clamp((dx * _dir.x + dy * _dir.y + dz * _dir.z) / d, -1, 1));
    if (d < 22 && ang < 0.3 && losClearIgnoring(cp.x, cp.y, cp.z, x, y, z, pr)) got = pr;
  }
  if (got && objectiveEvent('photo', got)) hudMsg('Photograph taken: ' + (got.label || 'target'));
  else hudMsg('Photograph taken');
}
function losClearIgnoring(x0, y0, z0, x1, y1, z1, prop) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, d = Math.hypot(dx, dy, dz);
  const h = rayWorld(x0, y0, z0, dx / d, dy / d, dz / d, d, { sight: true, ignore: prop });
  return !h || h.t >= d - 0.3;
}
function plantBug() {
  const p = G.player;
  if (!p.bugs) return;
  p.fireT = WEAPONS.bug.rate;
  const r = aimRay(0);
  const h = rayWorld(r.ox, r.oy, r.oz, r.dx, r.dy, r.dz, 2.6);
  if (!h) { hudMsg('Too far away'); return; }
  if (h.prop && h.prop.id && objectiveEvent('bug', h.prop)) {
    p.bugs--; sfx('plant');
    hudMsg('Tracker bug planted');
    if (!p.bugs) cycleWeapon(-1);
  } else hudMsg('That is no use to anyone');
}

// ---------------------------------------------------------------- limpet charges
const MINES = { list: [] };
function throwMine() {
  const p = G.player;
  if (!p.ammo.mines) { cycleWeapon(-1); return; }
  p.ammo.mines--; p.fireT = WEAPONS.mines.rate; VM.chopT = 0.3;
  sfx('throw');
  const r = aimRay(0);
  const g = new Geo(); gunGeo(g, 'mines');
  const mesh = new THREE.Mesh(g.build(), VM.mat || makeMat({ dyn: true }));
  scene.add(mesh);
  const m = { x: r.ox + r.dx * 0.5, y: r.oy + r.dy * 0.5 - 0.1, z: r.oz + r.dz * 0.5, vx: r.dx * 11 + (p.vx || 0), vy: r.dy * 11 + 2.5, vz: r.dz * 11 + (p.vz || 0), stuck: false, mesh, t: 0 };
  mesh.position.set(m.x, m.y, m.z);
  MINES.list.push(m);
  if (!p.ammo.mines) later(0.5, () => { if (curWeapon().id === 'mines' && !p.ammo.mines) cycleWeapon(-1); });
}
function updateMines(dt) {
  for (const m of MINES.list) {
    m.t += dt;
    if (m.stuck) continue;
    m.vy -= 14 * dt;
    const sx = m.vx * dt, sy = m.vy * dt, sz = m.vz * dt, len = Math.hypot(sx, sy, sz);
    if (len > 0) {
      const h = rayWorld(m.x, m.y, m.z, sx / len, sy / len, sz / len, len + 0.05);
      if (h && h.kind !== 'glass') {
        m.x = h.x + h.nx * 0.03; m.y = h.y + h.ny * 0.03; m.z = h.z + h.nz * 0.03; m.stuck = true; m.prop = h.prop || null; m.door = h.door || null;
        m.mesh.position.set(m.x, m.y, m.z);
        m.mesh.lookAt(m.x + h.nx, m.y + h.ny, m.z + h.nz); m.mesh.rotateX(Math.PI / 2);
        sfx('stick', m);
        continue;
      }
      if (h && h.kind === 'glass') { shatterWindow(h.win); }
    }
    m.x += sx; m.y += sy; m.z += sz;
    m.mesh.position.set(m.x, m.y, m.z); m.mesh.rotation.x += dt * 10;
    if (m.t > 8) m.stuck = true;
  }
}
function detonateMines() {
  if (!MINES.list.length) { sfx('empty'); return; }
  sfx('beep');
  MINES.list.forEach((m, k) => { if (!m.boom) { m.boom = true; later(0.15 + k * 0.14, () => detonateMine(m)); } });
}
function detonateMine(m) {
  const k = MINES.list.indexOf(m);
  if (k < 0) return;
  MINES.list.splice(k, 1);
  scene.remove(m.mesh); m.mesh.geometry.dispose();
  if (m.prop && !m.prop.dead) damageProp(m.prop, 500, true, null);
  explode(m.x, m.y, m.z, 4.5, 210, 'player');
}

// ---------------------------------------------------------------- pickups
const PICKUPS = [];
function spawnPickup(what, x, y, z) {
  const g = new Geo();
  if (what.weapon) gunGeo(g, what.weapon);
  else if (what.item === 'armor') g.box(-0.25, 0, -0.18, 0.25, 0.1, 0.18, { top: TILE.armor, side: TILE.armor }, 0);
  else if (what.item === 'ammo') g.box(-0.3, 0, -0.2, 0.3, 0.3, 0.2, { side: TILE.ammo_box, top: TILE.crate_mil }, 0);
  else if (what.item === 'tape') g.cyl(0, 0, 0, 0.17, 0.05, 10, TILE.tapereel, TILE.tapereel, 1);
  else if (what.item === 'keycard' || what.item === 'officekey') g.box(-0.08, 0, -0.05, 0.08, 0.012, 0.05, TILE.keycard, 0);
  else g.box(-0.08, 0, -0.08, 0.08, 0.1, 0.08, TILE.device, 0);
  const mat = makeMat({ dyn: true });
  const mesh = new THREE.Mesh(g.build(), mat);
  if (what.weapon) { mesh.rotation.set(Math.PI / 2, 0, rand(0, TAU)); mesh.rotation.order = 'YXZ'; mesh.rotation.y = rand(0, TAU); mesh.rotation.x = 0; mesh.rotation.z = Math.PI / 2; }
  else mesh.rotation.y = rand(0, TAU);
  const gy = groundUnder(x, z, 0.1, y + 0.3);
  mesh.position.set(x, gy + (what.weapon ? 0.05 : 0.01), z);
  setDynLight(mat, x, z);
  scene.add(mesh);
  const pk = Object.assign({ x, y: gy, z, mesh, t: 0 }, what);
  PICKUPS.push(pk);
  return pk;
}
function updatePickups(dt) {
  const p = G.player;
  if (!p || p.dead) return;
  for (let k = PICKUPS.length - 1; k >= 0; k--) {
    const pk = PICKUPS[k];
    pk.t += dt;
    if (pk.t < 0.4) continue;
    if (Math.hypot(pk.x - p.x, pk.z - p.z) > 1.0 || Math.abs(pk.y - p.y) > 1.2) continue;
    if (collectPickup(pk)) { scene.remove(pk.mesh); pk.mesh.geometry.dispose(); pk.mesh.material.dispose(); PICKUPS.splice(k, 1); }
  }
}
function collectPickup(pk) {
  const p = G.player;
  if (pk.weapon) {
    const W = WEAPONS[pk.weapon];
    if (p.weapons.includes(pk.weapon) && (p.ammo[W.ammo] || 0) >= AMMO[W.ammo].max) return false;
    const isNew = giveWeapon(pk.weapon, pk.ammo);
    hudMsg(isNew ? 'Picked up ' + article(W.name) : 'Picked up ' + AMMO[W.ammo].name + ' ammo');
    sfx('pickup');
    if (isNew && WEAPON_ORDER.indexOf(pk.weapon) > WEAPON_ORDER.indexOf(curWeapon().id) && !curWeapon().gadget) selectWeapon(p.weapons.indexOf(pk.weapon));
    return true;
  }
  if (pk.item === 'armor') {
    if (p.armor >= 100) return false;
    p.armor = 100; hudMsg('Picked up body armour'); sfx('pickup'); HUD.showBars = 3; return true;
  }
  if (pk.item === 'ammo') {
    const gave = [];
    for (const id of p.weapons) { const W = WEAPONS[id]; if (W.ammo && W.ammo !== 'mines' && !gave.includes(W.ammo)) { gave.push(W.ammo); p.ammo[W.ammo] = Math.min(AMMO[W.ammo].max, (p.ammo[W.ammo] || 0) + Math.round((W.mag || 8) * 2 * DIFF.ammoMul[G.diff])); } }
    if (p.weapons.includes('mines')) p.ammo.mines = Math.min(AMMO.mines.max, (p.ammo.mines || 0) + 1);
    hudMsg('Picked up ammunition'); sfx('pickup'); return true;
  }
  if (ITEMS[pk.item]) {
    p.items[pk.item] = true; hudMsg('Picked up ' + ITEMS[pk.item].name); sfx('pickupKey');
    objectiveEvent('item', pk.item);
    return true;
  }
  return false;
}
function article(name) { return (/^[AEIOU]/i.test(name) ? 'an ' : 'a ') + name; }

// ---------------------------------------------------------------- the view model
const VM = { group: null, id: null, kick: 0, flashT: 0, chopT: 0, bob: 0, swayX: 0, swayY: 0, lower: 0, mat: null, flash: null };
function buildViewmodel(id) {
  clearScene(vmScene);
  VM.id = id;
  if (!VM.mat) VM.mat = makeMat({ dyn: true });
  VM.mat.userData.shared = true;
  const root = new THREE.Group();
  const g = new Geo();
  // sleeve and hand: dark suit cloth with a white cuff
  g.tint = [0.2, 0.21, 0.26]; g.box(-0.036, -0.09, 0.07, 0.036, 0.01, 0.5, TILE.cloth, 0);
  g.tint = [1, 1, 1]; g.box(-0.034, -0.095, -0.015, 0.034, 0.02, 0.075, TILE.hand, 0);
  if (id === 'chop') { g.box(-0.035, -0.02, -0.12, 0.035, 0.0, -0.02, TILE.hand, 0); }
  else gunGeo(g, id, true);
  const mesh = new THREE.Mesh(g.build(), VM.mat);
  root.add(mesh);
  // muzzle flash sprite
  const fg = new Geo();
  fg.quad([-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 0.999, 0.999, 0.999, 0.999, 0, 0, 0], TILE.flash, [0, 0, 1]);
  VM.flash = new THREE.Mesh(fg.build(), MAT.addNoFog);
  VM.flash.scale.setScalar(W_FLASH[id] || 0.09);
  VM.flash.position.set(0, 0.05, { pk9: -0.36, tk33: -0.24, vektor: -0.42, ar62: -0.86, sturm: -0.84, zeus: -0.78 }[id] || -0.3);
  VM.flash.visible = false;
  root.add(VM.flash);
  VM.base = { pk9: [0.115, -0.105, -0.38], tk33: [0.115, -0.105, -0.36], vektor: [0.11, -0.115, -0.4], ar62: [0.11, -0.12, -0.44], sturm: [0.11, -0.12, -0.44], zeus: [0.11, -0.12, -0.44], camera: [0.1, -0.1, -0.3], bug: [0.11, -0.1, -0.3], mines: [0.1, -0.12, -0.42], chop: [0.14, -0.15, -0.34] }[id] || [0.115, -0.105, -0.38];
  VM.group = root;
  vmScene.add(root);
}
const W_FLASH = { pk9: 0.05, tk33: 0.09, vektor: 0.1, ar62: 0.13, sturm: 0.16, zeus: 0.12 };
function updateViewmodel(dt) {
  const p = G.player;
  const W = curWeapon();
  if (VM.id !== W.id && !p.switchT) buildViewmodel(W.id);
  if (!VM.group) return;
  VM.kick = Math.max(0, VM.kick - dt * 9);
  VM.flashT -= dt; VM.chopT -= dt;
  const sp = Math.hypot(p.vx, p.vz);
  VM.bob += dt * sp * 2.2;
  const bobA = Math.min(1, sp / 4);
  // lowering while switching or reloading
  let lower = 0;
  if (p.switchT > 0) lower = p.switchT > 0.225 ? 1 - (p.switchT - 0.225) / 0.225 : p.switchT / 0.225;
  if (p.reloadT > 0) { const t = 1 - p.reloadT / W.reload; lower = Math.sin(t * Math.PI) * 0.6; }
  VM.lower = lower;
  VM.swayX = lerp(VM.swayX, clamp(-p.lookDX * 0.004, -0.04, 0.04), Math.min(1, dt * 10));
  VM.swayY = lerp(VM.swayY, clamp(p.lookDY * 0.004, -0.04, 0.04), Math.min(1, dt * 10));
  const b = VM.base;
  const zoom = p.aiming && W.zoom ? 1 : 0;
  const x = b[0] + Math.sin(VM.bob) * 0.012 * bobA + VM.swayX - zoom * 0.08 * (p.aiming ? 1 : 0);
  const y = b[1] - Math.abs(Math.cos(VM.bob)) * 0.01 * bobA + VM.swayY - lower * 0.3 + (p.crouch ? 0.01 : 0);
  const z = b[2] + VM.kick * 0.05;
  VM.group.position.set(x, y, z);
  VM.group.rotation.set(VM.kick * 0.12 + lower * -0.6 + 0.03, 0.12, -0.06);
  if (VM.chopT > 0) { const t = 1 - VM.chopT / 0.35; VM.group.position.x -= Math.sin(t * Math.PI) * 0.15; VM.group.position.z -= Math.sin(t * Math.PI) * 0.12; VM.group.rotation.z = Math.sin(t * Math.PI) * 0.5; }
  // classic aim mode: the gun follows the crosshair
  if (p.aimMode) { VM.group.rotation.y = -p.aimX * 0.5; VM.group.rotation.x += p.aimY * 0.4; }
  VM.flash.visible = VM.flashT > 0;
  if (VM.flash.visible) VM.flash.rotation.z = Math.random() * TAU;
  setDynLight(VM.mat, p.x, p.z);
}
