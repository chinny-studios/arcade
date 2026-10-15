// Farhold — base building: a base computer claims land; snapped floors, walls, roofs and ramps; portable devices
// (storage, refiner, landing pad, save beacon, teleporter, planter, lights). Bases persist per planet.

ACT.dismantle = { k: ['KeyZ', 'Delete'], b: [2] };
const BASE_R = 160, STOREY = 3.25;
const BASES = { list: [], meshes: [] };
const BUILD = { active: false, menuOpen: false, part: null, rot: 0, ghost: null, valid: false, place: null, target: null };
const STRUCT = new Set(['floor', 'wall', 'door', 'window', 'roof', 'ramp']);

function baseAt(pl, local, r = BASE_R) { for (const b of BASES.list) if (b.pl === pl.id && b.center.distanceTo(local) < r) return b; return null; }
function curPlanetBases() { const pl = PLAYER.frame && PLAYER.frame.kind === 'planet' ? PLAYER.frame.pl : null; return pl ? BASES.list.filter((b) => b.pl === pl.id) : []; }
// create meshes/colliders for every base in the loaded system
BASES.rebuild = function () {
  for (const m of this.meshes) m.parent && m.parent.remove(m);
  this.meshes = [];
  COLL.removeOwner('base');
  for (const b of this.list) for (const pt of b.parts) spawnPartVisual(b, pt);
};
function partPlanet(b) { return PLANETS.list.find((p) => p.id === b.pl); }
function spawnPartVisual(b, pt) {
  const pl = partPlanet(b);
  if (!pl) return;
  const m = meshOf(partGeo(pt.id));
  m.position.copy(pt.pos); m.quaternion.copy(pt.q);
  if (pt.id === 'window') { const gl = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 0.06), R.mat.glass); gl.position.set(0, 1.75, 0); m.add(gl); }
  pl.group.add(m);
  pt.mesh = m;
  this_meshes_push(m);
  pt.colls = addBoxColliders(PART_BOXES[pt.id] || [], { f: planetFrame(pl), pos: pt.pos, q: pt.q }, 'base');
  for (const c of pt.colls) c.data = { part: pt, base: b };
}
function this_meshes_push(m) { BASES.meshes.push(m); }
function removePartVisual(pt) { if (pt.mesh) { pt.mesh.parent && pt.mesh.parent.remove(pt.mesh); BASES.meshes = BASES.meshes.filter((m) => m !== pt.mesh); } if (pt.colls) for (const c of pt.colls) COLL.remove(c); }

// ---------- build mode ----------
function openBuildMenu() {
  if (!PLAYER.frame || PLAYER.frame.kind !== 'planet' || PLAYER.inShip) { HUD.msg('You can only build on a planet’s surface.', 'bad'); return; }
  UI.open('build');
}
function startPlacing(id) {
  BUILD.active = true; BUILD.part = id; BUILD.rot = 0;
  if (BUILD.ghost) BUILD.ghost.parent && BUILD.ghost.parent.remove(BUILD.ghost);
  BUILD.ghost = new THREE.Mesh(partGeo(id), R.mat.ghost);
  BUILD.ghost.renderOrder = 20;
  PLAYER.frame.group.add(BUILD.ghost);
}
function stopPlacing() { BUILD.active = false; if (BUILD.ghost) { BUILD.ghost.parent && BUILD.ghost.parent.remove(BUILD.ghost); BUILD.ghost = null; } }
function updateBuild(dt) {
  if (!BUILD.active) return;
  const P = PLAYER;
  if (!P.frame || P.frame.kind !== 'planet' || P.inShip || !P.alive) { stopPlacing(); return; }
  if (UI.blocking()) return;
  if (Act.hit('cancel') || Act.hit('build')) { stopPlacing(); return; }
  if (Act.hit('rotate')) { BUILD.rot = (BUILD.rot + 1) % 8; AU.sfx('click', 0.3); }
  const pl = P.frame.pl, f = P.frame;
  const { o, d } = camRayLocal();
  let t = terrainRaycast(pl, o, d, 14);
  const tb = COLL.raycast(f, o, d, 14);
  const boxHit = tb < t ? COLL.lastHit : null;
  if (tb < t) t = tb;
  if (!isFinite(t)) t = 7;
  const hit = o.clone().addScaledVector(d, t);
  const id = BUILD.part, def = PARTS[id];
  const up = hit.clone().normalize();
  let pos = hit.clone(), q;
  const camFwd = d.clone().addScaledVector(up, -d.dot(up)).normalize();
  // snap structural parts to a nearby structure's grid
  let anchor = null;
  if (STRUCT.has(id)) {
    let bd = 9;
    for (const b of curPlanetBases()) for (const pt of b.parts) if (STRUCT.has(pt.id)) { const dd = pt.pos.distanceTo(hit); if (dd < bd) { bd = dd; anchor = pt; } }
  }
  if (anchor && anchor.g) {
    const g = anchor.g, qi = g.q.clone().invert();
    const l = hit.clone().sub(g.o).applyQuaternion(qi);
    const ix = Math.round(l.x / 4), iz = Math.round(l.z / 4);
    let lp, lr = (BUILD.rot % 4) * Math.PI / 2;
    if (id === 'roof') { const lv = Math.max(0, Math.round((l.y - STOREY + 0.3) / STOREY)); lp = new V3(ix * 4, lv * STOREY + STOREY + 0.125, iz * 4); }
    else {
      const lv = Math.max(0, Math.round((l.y - 0.8) / STOREY));
      if (id === 'floor' || id === 'ramp') lp = new V3(ix * 4, lv * STOREY, iz * 4);
      else {
        // walls sit on the cell edge nearest the aim point
        const ex = l.x - ix * 4, ez = l.z - iz * 4;
        if (Math.abs(ex) > Math.abs(ez)) { lp = new V3(ix * 4 + Math.sign(ex || 1) * 2, lv * STOREY + 0.25, iz * 4); lr = Math.PI / 2; }
        else { lp = new V3(ix * 4, lv * STOREY + 0.25, iz * 4 + Math.sign(ez || 1) * 2); lr = 0; }
      }
    }
    pos = lp.applyQuaternion(g.q).add(g.o);
    q = g.q.clone().multiply(new Q4().setFromAxisAngle(UP, lr));
    BUILD.g = g;
  } else {
    q = basisQuat(up, camFwd.applyAxisAngle(up, BUILD.rot * Math.PI / 4), new Q4());
    BUILD.g = STRUCT.has(id) ? { o: pos.clone(), q: q.clone() } : null;
  }
  BUILD.ghost.position.copy(pos); BUILD.ghost.quaternion.copy(q);
  // validity
  let why = '';
  const myBase = baseAt(pl, pos);
  if (id === 'basecomp') { if (myBase) why = 'Another base is too close.'; }
  else if (!myBase) why = 'Must be within ' + BASE_R + ' m of a Base Computer.';
  if (!G.free && !INV.hasAll(def.cost)) why = why || 'Not enough materials.';
  if (pl.P.sea != null && surfaceH(pl, up) < pl.P.sea - 0.5 && !anchor) why = why || 'Cannot build underwater.';
  BUILD.valid = !why; BUILD.why = why;
  BUILD.ghost.material = BUILD.valid ? R.mat.ghost : R.mat.ghostBad;
  BUILD.place = { pos, q };
  // dismantle the part under the crosshair
  BUILD.target = boxHit && boxHit.data && boxHit.data.part ? boxHit.data : null;
  if (Act.hit('dismantle') && BUILD.target) dismantle(BUILD.target);
  if (Act.hit('fire') && BUILD.valid) placePart(pl, id, pos, q, BUILD.g);
}
function placePart(pl, id, pos, q, g) {
  const def = PARTS[id];
  if (!G.free && !INV.takeAll(def.cost)) return;
  let b = baseAt(pl, pos);
  if (id === 'basecomp') {
    b = { id: 'b' + Date.now().toString(36), pl: pl.id, star: SYS.star.i, center: pos.clone(), name: pl.name + ' Base', parts: [] };
    BASES.list.push(b);
    HUD.banner('Base claimed', 'win');
  }
  const pt = { id, pos: pos.clone(), q: q.clone() };
  if (g) pt.g = { o: g.o.clone(), q: g.q.clone() };
  if (id === 'crate') pt.inv = new Inv(10, 1, 'Storage');
  if (id === 'refiner') pt.ref = makeRefiner(0.4);
  if (id === 'planter') pt.grow = 0;
  b.parts.push(pt);
  spawnPartVisual(b, pt);
  AU.sfx('place');
  bus.emit('built', id, b);
}
function dismantle(data) {
  const { part, base } = data;
  if (part.id === 'basecomp' && base.parts.length > 1) { HUD.msg('Dismantle the rest of the base first.', 'bad'); return; }
  if (part.inv && part.inv.slots.some(Boolean)) { HUD.msg('Empty the storage first.', 'bad'); return; }
  removePartVisual(part);
  base.parts = base.parts.filter((p) => p !== part);
  if (!base.parts.length) BASES.list = BASES.list.filter((b) => b !== base);
  for (const k in PARTS[part.id].cost) giveItem(k, Math.floor(PARTS[part.id].cost[k] / 2), true);
  AU.sfx('dismantle');
  HUD.msg(PARTS[part.id].name + ' dismantled (half the materials returned).');
}

// ---------- device interactions ----------
addInteractProvider((f) => {
  if (!f || f.kind !== 'planet' || BUILD.active) return null;
  const out = [];
  for (const b of BASES.list) {
    if (b.pl !== f.pl.id) continue;
    for (const pt of b.parts) {
      const up = pt.pos.clone().normalize();
      const pos = pt.pos.clone().addScaledVector(up, 1.2);
      switch (pt.id) {
        case 'basecomp': out.push({ key: 'bc' + b.id, pos, r: 2, prompt: '[interact] ' + esc(b.name) + ' · Save', act: () => { SAVE.save('manual'); HUD.msg('Progress saved at ' + b.name + '.', 'good'); AU.sfx('save'); PLAYER.respawn = { base: b.id }; } }); break;
        case 'beacon': out.push({ key: 'be' + pt.pos.x, pos, r: 2, prompt: '[interact] Save Beacon', act: () => { SAVE.save('manual'); HUD.msg('Progress saved.', 'good'); AU.sfx('save'); } }); break;
        case 'crate': out.push({ key: 'cr' + pt.pos.x, pos, r: 2, prompt: '[interact] Open storage', act: () => UI.open('storage', { inv: pt.inv }) }); break;
        case 'refiner': out.push({ key: 'rf' + pt.pos.x, pos, r: 2, prompt: '[interact] Use refiner', act: () => UI.open('refiner', { refiner: pt.ref, name: 'Refiner' }) }); break;
        case 'teleport': out.push({ key: 'tp' + pt.pos.x, pos, r: 2.4, prompt: '[interact] Teleporter', act: () => UI.open('teleport', { from: pt }) }); break;
        case 'planter': out.push({ key: 'pl' + pt.pos.x, pos, r: 2, prompt: pt.grow >= 1 ? '[interact] Harvest the tray' : 'Hydroponic tray · growing ' + Math.round(pt.grow * 100) + '%', act: () => { if (pt.grow >= 1) { pt.grow = 0; giveItem('oxygen', 30); giveItem('sodium', 30); AU.sfx('pickup'); } } }); break;
      }
    }
  }
  return out;
});
// time-based processing for every base (refiners, planters)
function updateBases(dt) {
  for (const b of BASES.list) for (const pt of b.parts) {
    if (pt.ref) refinerTick(pt.ref, dt);
    if (pt.id === 'planter') pt.grow = Math.min(1, (pt.grow || 0) + dt / 300);
  }
}
function baseLightSources() {
  const out = [];
  for (const b of BASES.list) { const pl = partPlanet(b); if (!pl) continue; for (const pt of b.parts) if (pt.id === 'light' || pt.id === 'teleport' || pt.id === 'basecomp') out.push({ local: pt.pos.clone().addScaledVector(pt.pos.clone().normalize(), pt.id === 'light' ? 2.7 : 1.5), pl, c: pt.id === 'teleport' ? 0x9a7aff : pt.id === 'basecomp' ? 0x60d0ff : 0xffd8a0, i: pt.id === 'light' ? 1.6 : 0.6 }); }
  return out;
}
// ---------- teleport ----------
function teleportDestinations() {
  const out = [];
  for (const b of BASES.list) { const tp = b.parts.find((p) => p.id === 'teleport'); if (tp) out.push({ kind: 'base', name: b.name, star: b.star, base: b, part: tp }); }
  for (const i of GALAXY.stationsVisited) out.push({ kind: 'station', name: GALAXY.stars[i].name + ' Station', star: i });
  return out;
}
function teleportTo(dest) {
  UI.close();
  HUD.flash(1);
  AU.sfx('teleport');
  setTimeout(() => {
    const star = GALAXY.stars[dest.star];
    if (!SYS.star || SYS.star.i !== dest.star) arriveSystem(star);
    if (dest.kind === 'station') {
      dockInstant();
      PLAYER.inShip = false;
      placePlayer(STATION.frame, new V3(0, 3.2, 30), new V3(0, 0, -1));
    } else {
      const b = dest.base, pl = partPlanet(b), f = planetFrame(pl);
      const up = dest.part.pos.clone().normalize();
      const fw = new V3(0, 0, -1).applyQuaternion(dest.part.q);
      PLAYER.inShip = false;
      placePlayer(f, dest.part.pos.clone().addScaledVector(fw, 3).addScaledVector(up, 0.5), fw);
      snapToGround(PLAYER);
      // bring the ship along: onto a base pad if there is one, else beside the teleporter
      const pad = b.parts.find((p) => p.id === 'pad');
      const sp = pad ? pad.pos.clone().addScaledVector(pad.pos.clone().normalize(), 0.45) : dest.part.pos.clone().addScaledVector(new V3(1, 0, 0).applyQuaternion(dest.part.q), 14);
      const su = sp.clone().normalize();
      if (!pad) sp.copy(su).multiplyScalar(pl.R + surfaceH(pl, su));
      placeShip(f, sp, basisQuat(su, fw, new Q4()), 'landed');
      SHIP.onPad = !!pad;
      for (let i = 0; i < 300; i++) { if (!updatePlanetLOD(pl, PLAYER.pos, 50)) break; }
    }
    HUD.flash(0);
    bus.emit('teleported', dest);
  }, 400);
}
