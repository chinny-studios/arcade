// Farhold — the multitool: mining beam, bolt caster, scanner pulse, analysis visor, melee; on-foot projectiles

const TOOL = {
  mode: 'mine', heat: 0, over: 0, ammo: 24, clip: 24, fireT: 0, reloadT: 0, aiming: false,
  scanT: 0, visor: false, vTarget: null, vProg: 0, markers: [], beam: null, model: null, kick: 0, mineT: 0, meleeT: 0,
};
function initTool() {
  TOOL.model = new THREE.Mesh(multitoolGeo(77), R.mat.vc);
  TOOL.model.position.set(0.2, -0.17, -0.4);
  TOOL.model.scale.setScalar(0.6);
  TOOL.model.visible = false;
  TOOL.model.renderOrder = 10;
  TOOL.model.castShadow = false;
  R.camera.add(TOOL.model);
  const bg = new THREE.CylinderGeometry(0.03, 0.06, 1, 6, 1, true); bg.translate(0, 0.5, 0); bg.rotateX(-Math.PI / 2);
  TOOL.beam = new THREE.Mesh(bg, R.mat.beam); TOOL.beam.visible = false; TOOL.beam.frustumCulled = false;
  R.scene.add(TOOL.beam);
  TOOL.beamGlow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), R.mat.beam); TOOL.beamGlow.visible = false; R.scene.add(TOOL.beamGlow);
}
// What the camera ray hits on foot: { kind: 'nat'|'fauna'|'sentinel'|'terrain'|'box', t, o }
function toolRaycast(maxD) {
  const P = PLAYER, f = P.frame;
  const { o, d } = camRayLocal();
  let best = { kind: null, t: maxD };
  if (f && f.kind === 'planet') {
    const n = natRaycast(o, d, best.t); if (n) best = { kind: 'nat', t: n.t, o: n.o };
    const c = faunaRaycast(o, d, best.t); if (c) best = { kind: 'fauna', t: c.t, o: c.c };
    const t = terrainRaycast(f.pl, o, d, best.t); if (t < best.t) best = { kind: 'terrain', t };
  }
  if (f) {
    const s = sentinelRaycast(f, o, d, best.t); if (s) best = { kind: 'sentinel', t: s.t, o: s.s };
    const b = COLL.raycast(f, o, d, best.t); if (b < best.t) best = { kind: 'box', t: b, o: COLL.lastHit };
  }
  best.o3 = o; best.d = d;
  best.point = o.clone().addScaledVector(d, best.t);
  return best;
}
function terrainRaycast(pl, o, d, maxD) {
  let t = 0, prev = 0;
  const p = new V3();
  const above = (tt) => { p.copy(o).addScaledVector(d, tt); return p.length() - (pl.R + surfaceH(pl, _v5.copy(p).normalize())); };
  let a0 = above(0);
  if (a0 < 0) return 0;
  const step = 1.2;
  for (t = step; t <= maxD; t += step) {
    const a = above(t);
    if (a < 0) { let lo = prev, hi = t; for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (above(m) < 0) hi = m; else lo = m; } return hi; }
    prev = t;
  }
  return Infinity;
}

function updateTool(dt) {
  const P = PLAYER;
  const onFoot = !P.inShip && P.alive && P.frame;
  TOOL.model.visible = onFoot && !P.tp && !TOOL.visor && !BUILD.active;
  TOOL.beam.visible = false; TOOL.beamGlow.visible = false;
  TOOL.heat = Math.max(0, TOOL.heat - dt * (TOOL.over > 0 ? 28 : 16) * techFx('cool'));
  if (TOOL.over > 0) TOOL.over = Math.max(0, TOOL.over - dt);
  TOOL.fireT = Math.max(0, TOOL.fireT - dt); TOOL.meleeT = Math.max(0, TOOL.meleeT - dt);
  TOOL.scanT = Math.max(0, TOOL.scanT - dt);
  TOOL.kick = Math.max(0, TOOL.kick - dt * 6);
  for (const m of TOOL.markers) m.t -= dt;
  TOOL.markers = TOOL.markers.filter((m) => m.t > 0 && (!m.o || m.o.alive !== false));
  updateProjectiles(dt);
  if (!onFoot || UI.blocking() || BUILD.active) { TOOL.aiming = false; if (AU.loopOn) AU.loop('beam', 0); return; }
  TOOL.aiming = Act.down('aim') && !TOOL.visor;
  if (Act.hit('mode')) { TOOL.mode = TOOL.mode === 'mine' ? 'bolt' : 'mine'; HUD.msg(TOOL.mode === 'mine' ? 'Mining Beam' : 'Bolt Caster'); AU.sfx('click'); }
  if (Act.hit('visor')) { TOOL.visor = !TOOL.visor; TOOL.vProg = 0; AU.sfx(TOOL.visor ? 'visorOn' : 'visorOff'); bus.emit('visor', TOOL.visor); }
  if (Act.hit('scan')) doScan();
  if (Act.hit('reload')) reloadBolt();
  if (Act.hit('melee') && TOOL.meleeT <= 0) doMelee();
  // tool model sway / kick
  TOOL.model.position.set(0.2, -0.17 + Math.sin(P.bob * 2) * 0.008, -0.4 + TOOL.kick * 0.05);
  TOOL.model.rotation.set(TOOL.kick * 0.3, 0.06, 0);
  if (TOOL.reloadT > 0) { TOOL.reloadT -= dt; TOOL.model.rotation.x = -0.6; if (TOOL.reloadT <= 0) TOOL.ammo = TOOL.clip; }
  if (TOOL.visor) { updateVisor(dt); AU.loop('beam', 0); return; }
  const firing = Act.down('fire');
  if (TOOL.mode === 'mine') {
    if (firing && TOOL.over <= 0 && hasTech('mining')) mineBeam(dt);
    else { AU.loop('beam', 0); TOOL.mineT = 0; }
  } else {
    AU.loop('beam', 0);
    if (firing && TOOL.fireT <= 0 && TOOL.reloadT <= 0) {
      if (TOOL.ammo <= 0) { reloadBolt(); }
      else fireBolt();
    }
  }
}
function muzzleWorld() { TOOL.model.updateMatrixWorld(); return TOOL.model.localToWorld(new V3(0, 0.02, -0.42)); }
function mineBeam(dt) {
  const hit = toolRaycast(22);
  TOOL.heat += dt * 20;
  if (TOOL.heat >= 100) { TOOL.heat = 100; TOOL.over = 3; AU.sfx('overheat'); HUD.msg('Mining beam overheated.', 'bad'); }
  AU.loop('beam', 0.5);
  const f = PLAYER.frame;
  const end = toWorld(f, hit.point);
  const start = muzzleWorld();
  const len = start.distanceTo(end);
  TOOL.beam.visible = true;
  TOOL.beam.position.copy(start); TOOL.beam.lookAt(end); TOOL.beam.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.3, len);
  TOOL.beam.rotateY(Math.PI);
  TOOL.beamGlow.visible = hit.kind != null; TOOL.beamGlow.position.copy(end); TOOL.beamGlow.scale.setScalar(0.8 + Math.random() * 0.6);
  TOOL.mineT += dt;
  const dmg = 30 * dt * techFx('mine');
  if (hit.kind === 'nat') {
    const res = natDamage(hit.o, dmg);
    if (res) for (const y of res) giveItem(y.item, y.n);
    if (Math.random() < dt * 14) FX.sparks(end, ITEMS[hit.o.sp.yield.item].col, 2);
    bus.emit('mining', hit.o, end);
  } else if (hit.kind === 'fauna') { damageCreature(hit.o, dmg * 0.5); }
  else if (hit.kind === 'sentinel') { damageSentinel(hit.o, dmg * 0.6); }
  else if (hit.kind === 'terrain' && Math.random() < dt * 10) FX.sparks(end, 0xffc080, 1);
}
function fireBolt() {
  const rate = 0.16 / techFx('bolt');
  TOOL.fireT = rate; TOOL.ammo--; TOOL.kick = 1;
  const f = PLAYER.frame;
  const { o, d } = camRayLocal();
  // spread
  d.x += (Math.random() - 0.5) * 0.012; d.y += (Math.random() - 0.5) * 0.012; d.z += (Math.random() - 0.5) * 0.012; d.normalize();
  // bolts travel along the eye ray so what the crosshair sees is what gets hit
  const start = o.clone().addScaledVector(d, 0.8);
  const dir = d.clone();
  spawnProjectile(f, start, dir.multiplyScalar(220), 14 * techFx('bolt'), 'player');
  AU.sfx('bolt', 0.5);
  FX.flash(muzzleWorld(), 0xffd080);
}
function reloadBolt() {
  if (TOOL.reloadT > 0 || TOOL.ammo >= TOOL.clip) return;
  if (!INV.has('ferrite', 8)) { HUD.msg('Reloading needs 8 Ferrite Dust.', 'bad'); AU.sfx('deny'); return; }
  INV.take('ferrite', 8);
  TOOL.reloadT = 1.2; AU.sfx('reload');
}
function doMelee() {
  TOOL.meleeT = 0.6; TOOL.kick = 1.5;
  const hit = toolRaycast(2.8);
  AU.sfx('melee', 0.5);
  if (hit.kind === 'fauna') damageCreature(hit.o, 25);
  else if (hit.kind === 'sentinel') damageSentinel(hit.o, 30);
  else if (hit.kind === 'nat') { const r = natDamage(hit.o, 12); if (r) for (const y of r) giveItem(y.item, y.n); }
}
function doScan() {
  if (!hasTech('scanner')) { HUD.msg('The scanner is damaged. Repair it from the inventory.', 'bad'); AU.sfx('deny'); return; }
  if (TOOL.scanT > 0) { AU.sfx('deny'); return; }
  TOOL.scanT = 7;
  AU.sfx('scan');
  FX.scanPulse();
  const P = PLAYER, f = P.frame;
  bus.emit('scanned');
  if (!f || f.kind !== 'planet') return;
  const range = 150 * techFx('scan');
  // nearest object of each resource kind within range
  const best = {};
  for (const c of NAT.cells.values()) for (const o of c.objs) {
    if (!o.alive) continue;
    const k = o.sp.kind;
    if (k === 'tree' || k === 'bush' || k === 'rock') continue;
    const d = o.pos.distanceTo(P.pos);
    if (d > range) continue;
    const key = o.sp.id;
    if (!best[key] || best[key].d > d) best[key] = { o, d };
  }
  for (const k in best) { const o = best[k].o; const item = o.sp.pick ? o.sp.pick.item : o.sp.yield.item; TOOL.markers.push({ o, item, t: 30, pos: o.pos }); }
  // structures
  const pl = f.pl;
  for (const poi of pl.pois) {
    const d = poi.dir.distanceTo(P.pos.clone().normalize()) * pl.R;
    if (d < 700 * techFx('scan')) { poi.known = true; }
  }
}
function updateVisor(dt) {
  const hit = toolRaycast(60);
  let tgt = null;
  if (hit.kind === 'fauna') tgt = { kind: 'fauna', sp: hit.o.sp, ref: hit.o };
  else if (hit.kind === 'nat') tgt = { kind: hit.o.sp.cat || 'flora', sp: hit.o.sp, ref: hit.o };
  else if (hit.kind === 'sentinel') tgt = { kind: 'sentinel', sp: { name: hit.o.type === 'quad' ? 'Sentinel Quad' : 'Sentinel Drone' }, ref: hit.o };
  else if (hit.kind === 'box' && hit.o && hit.o.data && hit.o.data.poi) tgt = { kind: 'poi', sp: { name: POI_TYPES[hit.o.data.poi.type].name }, ref: hit.o.data.poi };
  if (!tgt || !TOOL.vTarget || tgt.sp !== TOOL.vTarget.sp) TOOL.vProg = 0;
  TOOL.vTarget = tgt;
  if (tgt && (tgt.kind === 'fauna' || tgt.kind === 'flora' || tgt.kind === 'mineral')) {
    if (isDiscovered(PLAYER.frame.pl, tgt.sp)) { TOOL.vProg = 1; return; }
    TOOL.vProg += dt / 1.3;
    if (Math.random() < dt * 8) AU.sfx('visorTick', 0.2);
    if (TOOL.vProg >= 1) { TOOL.vProg = 1; discover(PLAYER.frame.pl, tgt.sp); }
  }
}

// ---------- on-foot projectiles (player bolts and sentinel shots) ----------
const PROJ = [];
const _pd = new V3(), _pp = new V3(), _pq = new V3();
const _projGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 5); _projGeo.rotateX(Math.PI / 2);
function spawnProjectile(f, pos, vel, dmg, owner, color) {
  const m = new THREE.Mesh(_projGeo, owner === 'player' ? R.mat.bolt : R.mat.red);
  m.frustumCulled = false;
  (frameGroup(f) || R.scene).add(m);
  m.position.copy(pos); m.lookAt(_v1.copy(pos).add(vel));
  PROJ.push({ f, pos: pos.clone(), vel: vel.clone(), dmg, owner, life: 2.5, m });
}
function updateProjectiles(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i];
    p.life -= dt;
    const step = p.vel.length() * dt;
    const d = _pd.copy(p.vel).normalize();
    let hitT = step, what = null;
    if (p.f && p.f.kind === 'planet') {
      if (p.owner === 'player') {
        const c = faunaRaycast(p.pos, d, hitT); if (c) { hitT = c.t; what = { k: 'fauna', o: c.c }; }
        const n = natRaycast(p.pos, d, hitT); if (n && n.o.solid) { hitT = n.t; what = { k: 'nat', o: n.o }; }
      }
      const gr = groundHeightAt(p.f, _pp.copy(p.pos).addScaledVector(d, step));
      if (_pp.length() < gr) { hitT = Math.min(hitT, step * 0.9); what = what || { k: 'ground' }; }
    }
    if (p.f) {
      if (p.owner === 'player') { const s = sentinelRaycast(p.f, p.pos, d, hitT); if (s) { hitT = s.t; what = { k: 'sentinel', o: s.s }; } }
      const b = COLL.raycast(p.f, p.pos, d, hitT); if (b < hitT) { hitT = b; what = { k: 'box' }; }
      if (p.owner !== 'player' && !PLAYER.inShip && PLAYER.frame === p.f) {
        _pq.copy(PLAYER.pos).addScaledVector(playerUp(new V3()), 1.1).sub(p.pos);
        const tc = _pq.dot(d);
        if (tc > 0 && tc < hitT && _pq.lengthSq() - tc * tc < 0.6 * 0.6) { hitT = tc; what = { k: 'player' }; }
      }
    }
    p.pos.addScaledVector(d, Math.min(step, hitT));
    p.m.position.copy(p.pos);
    if (what) {
      if (what.k === 'fauna') damageCreature(what.o, p.dmg);
      else if (what.k === 'sentinel') damageSentinel(what.o, p.dmg);
      else if (what.k === 'player') damagePlayer(p.dmg, 'sentinel');
      FX.sparks(toWorld(p.f, p.pos), p.owner === 'player' ? 0xffd080 : 0xff4030, 3);
      p.life = 0; PROJ.lastHit = what.k;
    }
    if (p.life <= 0) { p.m.parent && p.m.parent.remove(p.m); PROJ.splice(i, 1); }
  }
}
function clearProjectiles() { for (const p of PROJ) p.m.parent && p.m.parent.remove(p.m); PROJ.length = 0; }
