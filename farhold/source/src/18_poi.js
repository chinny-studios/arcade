// Farhold — points of interest on planets: shelters, trading posts, drop pods, machinery, waystones, wrecks, caches

const POIS = { live: [], done: new Set(), t: 0 };
function POIS_reset() { for (const p of POIS.live) disposePOI(p); POIS.live = []; }
function poiKey(pl, poi) { return pl.id + ':' + poi.id; }
function poiPlace(pl, poi) {
  const up = poi.dir.clone();
  const pos = up.clone().multiplyScalar(pl.R + poi.h);
  const q = basisQuat(up, perpOf(up).applyAxisAngle(up, poi.yaw), new Q4());
  return { pos, q, up };
}
function buildPOI(pl, poi) {
  const M = poiModel(poi.type, poi.seed);
  const { pos, q, up } = poiPlace(pl, poi);
  const group = new THREE.Group(); group.position.copy(pos); group.quaternion.copy(q);
  if (M.geo) group.add(meshOf(M.geo));
  const f = planetFrame(pl);
  const live = { pl, poi, group, pos, q, up, spots: [], lights: [], owner: 'poi' + poi.id + pl.id };
  addBoxColliders(M.boxes.map((b) => { const o = Object.assign({}, b[6] || {}, { data: { poi } }); return [b[0], b[1], b[2], b[3], b[4], b[5], o]; }), { f, pos, q }, live.owner);
  for (const s of M.spots) live.spots.push(Object.assign({}, s, { world: s.pos.clone().applyQuaternion(q).add(pos) }));
  for (const l of M.lights) live.lights.push(l.clone().applyQuaternion(q).add(pos));
  // furniture
  for (const s of live.spots) {
    if (s.kind === 'terminal') { const m = meshOf(terminalGeo(poi.type === 'post' ? 'post' : 'shelter')); m.position.copy(s.pos); m.rotation.y = Math.PI; group.add(m); }
    if (s.kind === 'npc') { const sp = RNG(poi.seed).pick(Object.keys(SPECIES)); const m = meshOf(alienGeo(sp, poi.seed % 50)); m.position.copy(s.pos); m.rotation.y = Math.PI; group.add(m); s.sp = sp; s.name = NAMEGEN.person(poi.seed); }
  }
  if (poi.type === 'wreck') {
    const r = RNG(poi.seed);
    const type = r.pick(['fighter', 'explorer', 'hauler', 'shuttle']);
    const so = makeShipObject(type, poi.seed, { wreck: true });
    so.root.position.set(0, 0.6, 0); so.root.rotation.set(r.range(-0.2, 0.2), 0, r.range(0.15, 0.4));
    group.add(so.root);
    live.wreck = { type, seed: poi.seed };
    addBoxColliders([[0, 2.2, 0, 2.6, 1.6, so.S.len / 2 - 0.5]], { f, pos, q }, live.owner);
  }
  if (POIS.done.has(poiKey(pl, poi)) && (poi.type === 'cache' || poi.type === 'pod')) live.opened = true;
  pl.group.add(group);
  POIS.live.push(live);
  return live;
}
function disposePOI(p) { p.group.parent && p.group.parent.remove(p.group); COLL.removeOwner(p.owner); }
function updatePOIs(dt, pl, focusLocal) {
  POIS.t -= dt;
  if (POIS.t > 0) return;
  POIS.t = 1;
  for (let i = POIS.live.length - 1; i >= 0; i--) { const p = POIS.live[i]; if (p.pl !== pl || p.pos.distanceTo(focusLocal) > 1900) { disposePOI(p); POIS.live.splice(i, 1); } }
  if (!pl) return;
  const fd = focusLocal.clone().normalize();
  for (const poi of pl.pois) {
    if (poi.type === 'crash') continue;
    if (poi.dir.distanceTo(fd) * pl.R > 1500) continue;
    if (POIS.live.some((p) => p.poi === poi && p.pl === pl)) continue;
    buildPOI(pl, poi);
  }
}
function poiLightSources() { const out = []; for (const p of POIS.live) for (const l of p.lights) out.push({ local: l, pl: p.pl }); return out; }

// ---------- interactions ----------
addInteractProvider((f) => {
  if (!f || f.kind !== 'planet') return null;
  const out = [];
  for (const L of POIS.live) {
    if (L.pl !== f.pl) continue;
    const poi = L.poi, done = POIS.done.has(poiKey(L.pl, poi));
    for (const s of L.spots) {
      const pos = s.world.clone().addScaledVector(L.up, 1.2);
      switch (s.kind) {
        case 'terminal':
          if (poi.type === 'post') out.push({ key: 'pt' + poi.id, pos, r: 2.2, prompt: '[interact] Trade Terminal', act: () => UI.open('trade') });
          else out.push({ key: 'st' + poi.id, pos, r: 2.2, prompt: done ? 'Shelter terminal · [interact] Read log' : '[interact] Access terminal', act: () => shelterTerminal(L) });
          break;
        case 'npc': out.push({ key: 'pn' + poi.id, pos: pos.addScaledVector(L.up, 0.4), r: 1.8, prompt: '[interact] Talk to ' + s.name, act: () => { UI.dialog(s.name + ' · ' + SPECIES[s.sp].name, fpick(SPECIES[s.sp].greet) + ' ' + fpick(['Ships land here often. The terminal buys and sells.', 'A storm rolled through yesterday. Bad for business.', 'The Sentinels leave this post alone. Mostly.', 'I heard there is a waystone not far from here.'])); AU.sfx('talk'); } }); break;
        case 'pod': if (!done) out.push({ key: 'pod' + poi.id, pos, r: 2.4, prompt: '[interact] Open drop pod (+1 exosuit slot)', hold: 0.6, act: () => { POIS.done.add(poiKey(L.pl, poi)); PLAYER.suit.grow(1); HUD.banner('Exosuit expanded', 'win'); HUD.msg('Exosuit inventory: ' + PLAYER.suit.size + ' slots.', 'good'); AU.sfx('unlock'); bus.emit('poiDone', poi); } }); break;
        case 'machine': if (!done) out.push({ key: 'mc' + poi.id, pos, r: 2.4, prompt: '[interact] Salvage machinery', hold: 0.8, act: () => { POIS.done.add(poiKey(L.pl, poi)); const r = RNG(poi.seed); giveItem('nanites', r.int(20, 55)); if (r() < 0.5) giveItem('datapad', 1); if (r() < 0.4) giveItem('circuit', 1); AU.sfx('unlock'); bus.emit('poiDone', poi); } }); break;
        case 'cache': if (!done) out.push({ key: 'ca' + poi.id, pos, r: 2.2, prompt: '[interact] Open supply cache', act: () => { POIS.done.add(poiKey(L.pl, poi)); const r = RNG(poi.seed); for (let i = 0; i < 2; i++) giveItem(r.pick(['carbon', 'ferrite', 'sodium', 'oxygen', 'dihydro', 'plate', 'seal', 'jelly', 'ioncell', 'lifegel']), r.pick([1, 2, 40, 60])); if (r() < 0.3) giveItem('units', r.int(5, 20) * 100); AU.sfx('unlock'); bus.emit('poiDone', poi); } }); break;
        case 'ruin': out.push({ key: 'ru' + poi.id, pos, r: 2.6, prompt: done ? '[interact] Read the waystone' : '[interact] Touch the waystone', act: () => ruinInteract(L) }); break;
        case 'wreck': out.push({ key: 'wr' + poi.id, pos, r: 5, prompt: done ? 'Salvaged wreck' : '[interact] Inspect crashed ship', act: () => { if (!done) UI.open('wreck', { live: L }); } }); break;
      }
    }
  }
  return out;
});
function shelterTerminal(L) {
  const key = poiKey(L.pl, L.poi);
  const r = RNG(L.poi.seed);
  if (POIS.done.has(key)) { UI.dialog('Shelter Log', r.pick(['…day 41. The storms are worse. I have stopped counting the drones.', 'Supplies cached under the floor plates. Took them with me. Sorry.', 'If you are reading this, the shelter held. Stay until the weather passes.', 'The waystones hum at night. I am certain of it now.'])); return; }
  POIS.done.add(key);
  const unknown = Object.keys(TECH).filter((id) => TECH[id].nan && !PLAYER.known.has(id) && !TECH[id].req);
  if (unknown.length && r() < 0.7) {
    const id = r.pick(unknown);
    PLAYER.known.add(id);
    UI.dialog('Blueprint recovered', 'The terminal still holds an engineering schematic: <b>' + TECH[id].name + '</b>. ' + TECH[id].desc + '<br><br>You can now build it from the technology panel.');
  } else { const n = r.int(40, 90); giveItem('nanites', n); UI.dialog('Data recovered', 'You download a cache of research data worth <b>' + n + ' nanites</b>.'); }
  AU.sfx('unlock');
  bus.emit('poiDone', L.poi);
}
function ruinInteract(L) {
  const key = poiKey(L.pl, L.poi);
  const first = !POIS.done.has(key);
  POIS.done.add(key);
  const idx = PLAYER.lore.length % LORE.length;
  let text;
  if (first) { text = LORE[idx]; PLAYER.lore.push(idx); giveItem('relic', 1); giveItem('nanites', 30); }
  else text = LORE[(PLAYER.lore.length + 3) % LORE.length];
  UI.dialog('Ancient Waystone', text + (first ? '<br><br><i>A fragment of the stone comes away in your hand.</i>' : ''));
  AU.sfx('ruin');
  if (first) bus.emit('poiDone', L.poi);
}
function claimWreck(L) {
  const old = SHIP.cur;
  const data = makeShipData(L.wreck.type, L.wreck.seed);
  // move cargo across as far as it fits
  for (const s of old.cargo.slots) if (s) data.cargo.add(s.id, s.n);
  data.lift = 0;
  POIS.done.add(poiKey(L.pl, L.poi));
  const landedPos = SHIP.pos.clone(), landedQ = SHIP.q.clone(), f = SHIP.frame, st = SHIP.state;
  // the claimed ship takes the wreck's place and needs its thrusters fixed
  setShip(data);
  const up = L.up.clone();
  placeShip(planetFrame(L.pl), L.pos.clone().addScaledVector(up, 0.2), L.q.clone(), 'landed');
  PLAYER.tech.thrusters.broken = true;
  L.group.children.filter((c) => c.type === 'Group').forEach((c) => L.group.remove(c));
  COLL.removeOwner(L.owner);
  HUD.banner('Starship claimed', 'win');
  HUD.msg('The ' + data.name + ' is yours. Repair its Lift Thrusters to fly it.', 'good');
  bus.emit('shipClaimed', data);
  void landedPos; void landedQ; void f; void st;
}
function salvageWreck(L) {
  POIS.done.add(poiKey(L.pl, L.poi));
  const r = RNG(L.poi.seed + 3);
  giveItem('units', r.int(15, 40) * 100); giveItem(r.pick(['plate', 'circuit', 'weave']), r.int(1, 2)); giveItem('ferrite', 60);
  AU.sfx('unlock');
}
