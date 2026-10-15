// Tokoyo — points of interest, boss summoning, spawners, haunted shrine loot, night parades (raids), the crow guide, discovery

const TARGETS = [];   // breakable world objects: { x, y, z, r, h, hp, hit(dmg) }
const EVENTS = (() => {
  const S = { pois: [], flags: {}, hints: new Set(), looted: new Set(), broken: new Set(), offered: {}, revealed: new Set(), discovered: new Set(), raid: null, boss: null, biome: -1, biomeT: 0, lastNight: -1, pins: [] };
  let crow = null;
  // ---------- setup ----------
  function init() {
    S.pois = [];
    TARGETS.length = 0;
    for (const p of W.pois) {
      const yaw = p.rot || (p.type === 'altar1' || p.type === 'altar2' ? Math.atan2(-p.x, -p.z) : p.type === 'ema' ? Math.random() * TAU : 0);
      p.yaw = yaw;
      const sink = p.type === 'shrine' ? -0.28 : p.type === 'altar1' || p.type === 'altar2' ? -0.22 : 0;
      const mesh = new THREE.Mesh(poiGeo(p.type, Math.floor(Math.abs(p.x * 7 + p.z * 13)) % 1000 + 1), R.mat.vc);
      mesh.position.set(p.x, p.y + sink, p.z); mesh.rotation.y = yaw; mesh.castShadow = true; mesh.receiveShadow = true;
      R.scene.add(mesh);
      const o = { p, mesh, yaw, sink };
      S.pois.push(o);
      addColliders(o);
      if (p.type === 'shrine') setupShrine(o);
      if (p.type === 'haunted') setupHaunted(o);
      if (p.type === 'nest') setupNest(o);
      if (p.type === 'ruin') setupRuin(o);
      if (p.type === 'ema') o.glyph = glowMesh(p.x, p.y + 1.5, p.z, 0xffd27a, 0.08);
    }
    S.discovered.add('shrine');
  }
  function glowMesh(x, y, z, c, r) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(r), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); R.scene.add(m); return m; }
  // derive simple box colliders from the structure's larger parts
  function addColliders(o) {
    const parts = poiParts(o.p.type, Math.floor(Math.abs(o.p.x * 7 + o.p.z * 13)) % 1000 + 1);
    const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), obbs = [];
    for (const pt of parts) {
      let hx, hy, hz;
      if (pt.g === 'box') { [hx, hy, hz] = pt.a.map((v) => v / 2); }
      else if (pt.g === 'cyl') { hx = hz = Math.max(pt.a[0], pt.a[1]) * 0.8; hy = pt.a[2] / 2; }
      else if (pt.g === 'tbox') { hx = Math.max(pt.a[0], pt.a[2]) / 2; hz = Math.max(pt.a[1], pt.a[3]) / 2; hy = pt.a[4] / 2; }
      else continue;
      const s = pt.s || [1, 1, 1]; hx *= s[0]; hy *= s[1]; hz *= s[2];
      if (hy < 0.3 || Math.max(hx, hz) < 0.1) continue;
      if (pt.g === 'cyl' && hx > 3) continue; // platforms are walked on as terrain
      const r = pt.r || [0, 0, 0];
      if (Math.abs(r[0]) > 0.5 || Math.abs(r[2]) > 0.5) continue; // toppled bits are decoration
      const [lx, ly, lz] = pt.p || [0, 0, 0];
      const wx = o.p.x + lx * cy + lz * sy, wz = o.p.z - lx * sy + lz * cy;
      obbs.push(makeOBB(wx, o.p.y + o.sink + ly, wz, hx, hy, hz, o.yaw + (r[1] || 0)));
    }
    if (obbs.length) BUILD.addStatic(obbs, o);
  }
  function local(o, lx, ly, lz) { const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw); return new V3(o.p.x + lx * cy + lz * sy, o.p.y + o.sink + ly, o.p.z - lx * sy + lz * cy); }
  function setupShrine(o) {
    o.pedestals = [];
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i - 2) * 0.42 - Math.PI / 2;
      const pos = local(o, Math.cos(a) * 6.5, 1.6, Math.sin(a) * 6.5);
      const id = i === 0 ? 'shirokiba' : i === 1 ? 'osugi' : null;
      o.pedestals.push({ pos, boss: id, mesh: null });
    }
    refreshShrine(o);
  }
  function refreshShrine(o) {
    for (const pd of o.pedestals) {
      if (pd.boss && S.offered[pd.boss] && !pd.mesh) {
        pd.mesh = new THREE.Mesh(itemGeo(BLESSINGS[pd.boss].trophy), R.mat.vc);
        pd.mesh.position.copy(pd.pos); pd.mesh.scale.setScalar(1.6); R.scene.add(pd.mesh);
      }
    }
  }
  function setupHaunted(o) {
    o.spawners = [];
    const spots = [[5, 0, 5], [-6, 0, 5], [0, 0, -6]];
    spots.forEach(([x, , z], i) => {
      const key = keyOf(o, 'pile' + i);
      if (S.broken.has(key)) return;
      const pos = local(o, x, 0, z);
      const mesh = new THREE.Mesh(model('bonepile', () => buildModel([P_.dod(0.6, 0x4a4238, [0, 0.2, 0], 0, [1.3, 0.5, 1.3]), ...[0, 1, 2, 3, 4, 5].map((k) => P_.cyl(0.04, 0.04, 0.6, 4, COL.bone, [Math.cos(k) * 0.4, 0.4, Math.sin(k) * 0.4], [k, k * 2, 1])), P_.sph(0.14, 6, 4, COL.bone, [0.1, 0.6, 0])])), R.mat.vc);
      mesh.position.copy(pos); R.scene.add(mesh);
      const sp = { o, key, pos, mesh, alive: 0, t: 3 + i * 4, types: ['ochimusha', 'ochimusha', 'ochimusha_archer'], max: 2, range: 32 };
      o.spawners.push(sp);
      addTarget(sp, 60, 0.7, 0.8, () => { R.scene.remove(mesh); dropItems('bone_fragments', 3, pos.x, pos.y + 0.5, pos.z); o.spawners.splice(o.spawners.indexOf(sp), 1); S.broken.add(key); });
    });
    // urns hold hi-no-tama
    o.urns = [];
    const urnSpots = [[3, -3], [-2, -3.5], [6.5, -1], [-6.5, -2], [2, 6.5], [-3.5, 6.5]];
    urnSpots.forEach(([x, z], i) => {
      const key = keyOf(o, 'urn' + i);
      if (S.broken.has(key)) return;
      const pos = local(o, x, 0, z);
      pos.y = groundY(pos.x, pos.z, pos.y + 3);
      const mesh = new THREE.Mesh(model('urn', () => buildModel([P_.cyl(0.22, 0.18, 0.5, 8, 0x6a4a36, [0, 0.25, 0]), P_.cyl(0.12, 0.22, 0.18, 8, 0x5a3e2c, [0, 0.59, 0]), P_.cyl(0.13, 0.13, 0.06, 8, 0x4a3224, [0, 0.7, 0])])), R.mat.vc);
      mesh.position.copy(pos); mesh.castShadow = true; R.scene.add(mesh);
      const u = { pos, mesh, key };
      o.urns.push(u);
      addTarget(u, 1, 0.3, 0.75, () => breakUrn(o, u));
    });
    // the inner chest
    const ck = keyOf(o, 'chest');
    o.chestPos = local(o, -3, 0.4, 1.4);
    o.chest = new THREE.Mesh(pieceGeo('chest'), R.mat.vc);
    o.chest.position.copy(o.chestPos); o.chest.rotation.y = o.yaw + Math.PI / 2; R.scene.add(o.chest);
    o.chestKey = ck;
    o.flames = [local(o, 4, 1.32, 4), local(o, 4, 1.32, -4), local(o, -7, 1.32, 4), local(o, -7, 1.32, -4)];
  }
  function breakUrn(o, u) {
    R.scene.remove(u.mesh); S.broken.add(u.key); o.urns.splice(o.urns.indexOf(u), 1);
    AU.play('destroy', u.pos.x, u.pos.y, u.pos.z, 0.7); FX.chips(u.pos.x, u.pos.y + 0.4, u.pos.z, 0x6a4a36, 10);
    const r = Math.random();
    if (r < 0.55) { dropItems('fire_orb', 1, u.pos.x, u.pos.y + 0.5, u.pos.z); FX.magic(u.pos.x, u.pos.y + 0.5, u.pos.z, [0.5, 0.85, 1], 10); }
    else if (r < 0.8) dropItems('bone_fragments', 1 + Math.floor(Math.random() * 2), u.pos.x, u.pos.y + 0.5, u.pos.z);
    else dropItems('resin', 2, u.pos.x, u.pos.y + 0.5, u.pos.z);
  }
  function setupNest(o) {
    const key = keyOf(o, 'nest');
    if (S.broken.has(key)) { o.mesh.visible = false; o.dead = true; return; }
    const sp = { o, key, pos: new V3(o.p.x, o.p.y, o.p.z), alive: 0, t: 2, types: ['gaki_f', 'gaki_f', 'gaki_f', 'gaki_brute', 'gaki_shaman'], max: 3, range: 40 };
    o.spawners = [sp];
    o.glow = glowMesh(o.p.x, o.p.y + 0.9, o.p.z + 0.5, 0xa070ff, 0.07);
    addTarget(sp, 100, 1.0, 2.0, () => {
      o.mesh.visible = false; o.dead = true; R.scene.remove(o.glow); S.broken.add(key); o.spawners.length = 0;
      FX.dust(o.p.x, o.p.y, o.p.z, 16); AU.play('destroy', o.p.x, o.p.y, o.p.z);
      dropItems('kami_seed', 1 + Math.floor(Math.random() * 2), o.p.x, o.p.y + 1, o.p.z);
      dropItems('resin', 2, o.p.x, o.p.y + 1, o.p.z);
      BUILD.removeStatic(o);
    });
  }
  function setupRuin(o) { o.chestKey = keyOf(o, 'chest'); o.chestPos = local(o, 1, 0, -2); o.chestPos.y = groundY(o.chestPos.x, o.chestPos.z, o.chestPos.y + 3); o.chest = new THREE.Mesh(pieceGeo('chest'), R.mat.vc); o.chest.position.copy(o.chestPos); o.chest.rotation.y = o.yaw; R.scene.add(o.chest); }
  function keyOf(o, s) { return Math.round(o.p.x) + ',' + Math.round(o.p.z) + ':' + s; }
  function addTarget(owner, hp, r, h, onDestroy) {
    const t = { x: owner.pos.x, y: owner.pos.y, z: owner.pos.z, r, h, hp, owner, hit(d) { this.hp -= d; FX.chips(this.x, this.y + h * 0.6, this.z, 0x7a6a5a, 5); AU.play('hit', this.x, this.y, this.z, 0.6); if (this.hp <= 0) { TARGETS.splice(TARGETS.indexOf(this), 1); onDestroy(); } } };
    TARGETS.push(t);
    return t;
  }

  // ---------- interaction ----------
  function interactables(x, z) {
    const out = [];
    for (const o of S.pois) {
      if (dist2(o.p.x, o.p.z, x, z) > 30 * 30) continue;
      if (o.p.type === 'shrine') for (const pd of o.pedestals) out.push({ pos: pd.pos, r: 1.6, prompt: () => pedestalPrompt(pd), use: () => usePedestal(o, pd) });
      if (o.p.type === 'altar1' || o.p.type === 'altar2') out.push({ pos: local(o, 0, 1.4, o.p.type === 'altar2' ? 4.6 : 0), r: 2.2, prompt: () => altarPrompt(o), use: () => useAltar(o) });
      if (o.p.type === 'ema') out.push({ pos: new V3(o.p.x, o.p.y + 1.4, o.p.z), r: 1.8, prompt: () => '[E] Read the ema plaque', use: () => readEma(o) });
      if (o.chest && !S.looted.has(o.chestKey)) out.push({ pos: o.chestPos.clone().setY(o.chestPos.y + 0.5), r: 1.4, prompt: () => '[E] Search the old chest', use: () => lootChest(o) });
      if (o.urns) for (const u of o.urns) out.push({ pos: u.pos.clone().setY(u.pos.y + 0.4), r: 1.0, prompt: () => '[E] Break the urn', use: () => { const t = TARGETS.find((t) => t.owner === u); if (t) t.hit(5); } });
    }
    for (const g of GRAVES) if (dist2(g.x, g.z, x, z) < 100) out.push({ pos: new V3(g.x, g.y + 0.8, g.z), r: 1.6, prompt: () => '[E] Recover your belongings', use: () => SURV.takeGrave(g) });
    if (crow && crow.state === 'perched') out.push({ pos: crow.root.position.clone().setY(crow.root.position.y + 0.3), r: 1.6, prompt: () => '[E] Shoo the crow', use: () => crowLeave() });
    return out;
  }
  function pedestalPrompt(pd) {
    if (!pd.boss) return 'An empty pedestal. Mist curls around it.';
    const b = BLESSINGS[pd.boss];
    if (S.offered[pd.boss]) return PLAYER.blessing === pd.boss ? b.name + ' is with you. Press F to call on it.' : '[E] Receive ' + b.name;
    return PLAYER.inv.count(b.trophy) ? '[E] Offer the ' + ITEMS[b.trophy].name : 'A pedestal for a great kami\'s trophy.';
  }
  function usePedestal(o, pd) {
    if (!pd.boss) { HUD.msg('Its kami still sleeps beyond the mist.'); return; }
    const b = BLESSINGS[pd.boss], P = PLAYER;
    if (!S.offered[pd.boss]) {
      if (!P.inv.count(b.trophy)) { HUD.msg('You need the ' + ITEMS[b.trophy].name + '.'); return; }
      P.inv.remove(b.trophy, 1); S.offered[pd.boss] = true; refreshShrine(o);
      FX.magic(pd.pos.x, pd.pos.y + 0.5, pd.pos.z, [0.7, 0.95, 1], 40, 3);
    }
    P.blessing = pd.boss;
    AU.play('bell');
    HUD.msg(b.name + ' is with you. Press F to call on it.', 'good');
  }
  function altarPrompt(o) {
    const boss = o.p.boss, need = boss === 'shirokiba' ? ['boar_tusk', 2] : ['kami_seed', 3];
    if (S.boss && !S.boss.dead) return MOBS[boss].name + ' is awake.';
    return '[E] Offer ' + need[1] + ' ' + ITEMS[need[0]].name.toLowerCase() + (need[1] > 1 ? 's' : '') + ' (' + PLAYER.inv.count(need[0]) + '/' + need[1] + ')';
  }
  function useAltar(o) {
    const boss = o.p.boss, need = boss === 'shirokiba' ? ['boar_tusk', 2] : ['kami_seed', 3];
    if (S.boss && !S.boss.dead) return;
    if (PLAYER.inv.count(need[0]) < need[1]) { HUD.msg('You need ' + need[1] + ' ' + ITEMS[need[0]].name.toLowerCase() + 's.'); return; }
    PLAYER.inv.remove(need[0], need[1]);
    summonBoss(o);
  }
  function summonBoss(o) {
    const boss = o.p.boss;
    HUD.banner(MOBS[boss].name + ' awakens', 'warn');
    AU.play('roar', o.p.x, o.p.y, o.p.z, 1);
    SKY.flash = 1; CAM.shake = 1;
    const pos = local(o, 0, 0, boss === 'osugi' ? -9 : -7);
    FX.magic(pos.x, pos.y + 2, pos.z, boss === 'osugi' ? [0.6, 1, 0.6] : [0.7, 0.95, 1], 60, 6);
    setTimeout(() => { S.boss = spawnMob(boss, pos.x, pos.z, { aware: true, stars: 0 }); S.boss.home = { x: o.p.x, z: o.p.z }; }, 1200);
    S.revealed.add(o.p.type);
  }
  function bossDefeated(m) {
    const key = m.type === 'shirokiba' ? 'boss1' : 'boss2';
    const first = !S.flags[key];
    S.flags[key] = true;
    HUD.banner(m.def.name + ' is calmed', 'win');
    AU.play('bell');
    if (first) setTimeout(() => hint(key), 3500);
    if (m.type === 'osugi' && first) setTimeout(() => UI.victory(), 9000);
    S.boss = null;
    SAVE.save();
  }
  function bossLeft(m) { if (S.boss === m) S.boss = null; HUD.msg(m.def.name + ' has returned to its slumber.'); }
  function readEma(o) {
    const which = o.p.reveals, target = W.pois.find((q) => q.type === which);
    S.revealed.add(which);
    const txt = which === 'altar1' ? 'The plaques are carved with boars and a white tusk. Someone has written: "When the herd is thinned, Shirokiba answers two tusks." The way to its shrine is marked on your map.'
      : 'The plaques show a great cedar with a rope about its trunk. "Ōsugi sleeps across the water. Three seeds of the hokora wake it." The grove is marked on your map.';
    UI.note('Ema plaque', txt);
    AU.play('bell');
    void target;
  }
  function lootChest(o) {
    S.looted.add(o.chestKey);
    const x = o.chestPos.x, y = o.chestPos.y + 0.8, z = o.chestPos.z;
    if (o.p.type === 'haunted') { dropItems('fire_orb', 2 + Math.floor(Math.random() * 2), x, y, z); dropItems('bone_fragments', 2, x, y, z); dropItems('arrow_flint', 10 + Math.floor(Math.random() * 10), x, y, z); if (Math.random() < 0.5) dropItems('tonic', 1, x, y, z); }
    else { dropItems('flint', 3, x, y, z); dropItems('leather_scraps', 3, x, y, z); dropItems('arrow_bamboo', 10, x, y, z); dropItems('strawberry', 4, x, y, z); if (Math.random() < 0.5) dropItems('straw', 6, x, y, z); }
    AU.play('door', x, y, z);
    HUD.msg('You search the chest.');
  }

  // ---------- per frame ----------
  function update(dt) {
    const P = PLAYER;
    // spawners
    for (const o of S.pois) {
      if (!o.spawners) continue;
      const d2 = dist2(o.p.x, o.p.z, P.pos.x, P.pos.z);
      if (d2 < 45 * 45 && !S.discovered.has(o.p.type + o.p.x) && o.p.type === 'haunted') { S.discovered.add(o.p.type + o.p.x); S.pins.push({ x: o.p.x, z: o.p.z, type: 'haunted' }); HUD.msg('You found a haunted shrine.'); }
      for (const sp of o.spawners) {
        if (d2 > sp.range * sp.range || !P.alive) continue;
        sp.t -= dt;
        if (sp.t > 0 || sp.alive >= sp.max) continue;
        sp.t = o.p.type === 'nest' ? 22 : 18;
        const type = fpick(sp.types);
        const a = Math.random() * TAU;
        const m = spawnMob(type, sp.pos.x + Math.cos(a) * 2, sp.pos.z + Math.sin(a) * 2, { spawner: sp });
        m.home = { x: sp.pos.x, z: sp.pos.z };
        sp.alive++;
        FX.magic(m.pos.x, m.pos.y + 0.5, m.pos.z, o.p.type === 'nest' ? [0.6, 0.4, 1] : [0.5, 0.85, 1], 12, 2);
      }
    }
    for (const o of S.pois) if (o.glyph) { o.glyph.rotation.y += dt; o.glyph.visible = !S.revealed.has(o.p.reveals) || true; }
    // biome banners
    const b = biomeAt(P.pos.x, P.pos.z);
    if (b !== S.biome) { S.biomeT += dt; if (S.biomeT > 2.5) { S.biome = b; S.biomeT = 0; if (P.alive) HUD.banner(['Unabara · the open sea', 'Satoyama · the meadows', 'Sugi no Mori · the cedar forest'][b]); if (b === 2) hint('forest'); } } else S.biomeT = 0;
    // nightfall
    if (SKY.isNight && S.lastNight !== SKY.day) {
      S.lastNight = SKY.day;
      if (G.time > 60) { HUD.banner('Night falls'); hint('night'); }
      maybeRaid();
    }
    updateRaid(dt);
    updateCrow(dt);
    // the haunted shrine lanterns burn with ghost fire
    for (const o of S.pois) if (o.flames && dist2(o.p.x, o.p.z, P.pos.x, P.pos.z) < 70 * 70) for (const f of o.flames) if (Math.random() < 0.35) FX.emit(f.x + (Math.random() - 0.5) * 0.1, f.y, f.z + (Math.random() - 0.5) * 0.1, 0, 0.5, 0, [0.4, 0.8, 1], 0.18, 0.5, -0.4, -0.2, 1);
  }
  function lights(list) {
    const P = PLAYER;
    for (const o of S.pois) {
      if (dist2(o.p.x, o.p.z, P.pos.x, P.pos.z) > 80 * 80) continue;
      if (o.flames) list.push({ x: o.p.x, y: o.p.y + 2, z: o.p.z, i: 1.2, c: 0x6fc8ff, r: 18 });
      if (o.p.type === 'shrine' && SKY.night > 0.3) list.push({ x: o.p.x, y: o.p.y + 2.2, z: o.p.z, i: 1.0, c: 0xffc070, r: 18 });
      if (o.p.type === 'nest' && !o.dead) list.push({ x: o.p.x, y: o.p.y + 1, z: o.p.z + 0.6, i: 0.6, c: 0xa070ff, r: 6 });
      if (o.p.type === 'altar2' && S.boss && S.boss.type === 'osugi') list.push({ x: o.p.x, y: o.p.y + 3, z: o.p.z, i: 1.0, c: 0x9cff9a, r: 25 });
    }
  }

  // ---------- night parades ----------
  function maybeRaid() {
    if (!S.flags.boss1 || S.raid || G.peaceful) return;
    const P = PLAYER;
    let n = 0, wb = false;
    BUILD.near(P.pos.x, P.pos.z, 30, (p) => { n++; if (p.def.station === 'workbench') wb = true; });
    if (n < 12 || !wb) return;
    if (Math.random() > (S.flags.boss2 ? 0.45 : 0.3)) return;
    startRaid();
  }
  function startRaid(force) {
    const P = PLAYER;
    const a = Math.random() * TAU;
    S.raid = { x: P.pos.x, z: P.pos.z, t: 100, wave: 0, nextWave: 3, from: a, mobs: [] };
    HUD.banner('The Night Parade approaches', 'warn');
    HUD.msg('Hyakki Yagyō: the night parade of a hundred demons is coming for your home.', 'bad');
    AU.play('roar', P.pos.x, P.pos.y, P.pos.z, 0.5);
    void force;
  }
  function updateRaid(dt) {
    const r = S.raid; if (!r) return;
    const P = PLAYER;
    r.t -= dt; r.nextWave -= dt;
    if (r.nextWave <= 0 && r.wave < 4) {
      r.wave++; r.nextWave = 22;
      const a = r.from + (Math.random() - 0.5) * 0.8, d = 38;
      const x = r.x + Math.cos(a) * d, z = r.z + Math.sin(a) * d;
      const late = S.flags.boss2;
      const comp = r.wave === 4 ? (late ? [['oni', 1, 1], ['gaki_f', 2, 3]] : [['gaki_brute', 1, 1], ['gaki_f', 2, 3]])
        : late ? [['gaki_f', 2, 3], ['ochimusha', 1, 2], ['gaki_shaman', 0, 1]] : [['gaki', 2, 3], ['gaki_f', 1, 2]];
      for (const [type, a1, b1] of comp) r.mobs.push(...spawnGroup(type, x, z, a1, b1, { raid: true, aware: true }));
      FX.magic(x, heightAt(x, z) + 1, z, [0.6, 0.4, 1], 30, 3);
    }
    r.mobs = r.mobs.filter((m) => !m.dead && MOBS_LIVE.includes(m));
    const away = dist2(P.pos.x, P.pos.z, r.x, r.z) > 80 * 80;
    if ((r.t <= 0 && !r.mobs.length) || away || (r.wave >= 4 && !r.mobs.length) || r.t < -90) {
      if (!away) { HUD.banner('The parade has passed', 'win'); AU.play('bell'); }
      for (const m of r.mobs) m.raid = false;
      S.raid = null;
    }
  }

  // ---------- Yatagarasu, the guide ----------
  function hint(key) {
    if (S.hints.has(key) || !HINTS[key] || SETTINGS.hints === false) return;
    S.hints.add(key);
    HUD.crowSay(HINTS[key]);
    crowArrive();
  }
  function crowArrive() {
    const P = PLAYER;
    if (!crow) { crow = makeCrow(); crow.root.traverse((c) => { if (c.isMesh) c.castShadow = true; }); R.scene.add(crow.root); }
    const a = CAM.yaw + 0.9;
    const tx = P.pos.x + Math.sin(a) * 2.6, tz = P.pos.z + Math.cos(a) * 2.6;
    crow.target = new V3(tx, groundY(tx, tz, P.pos.y + 2), tz);
    crow.root.position.set(tx + 30, crow.target.y + 25, tz + 10);
    crow.state = 'arriving'; crow.t = 0; crow.root.visible = true;
    AU.play('crow', tx, crow.target.y + 3, tz);
  }
  function crowLeave() { if (!crow) return; crow.state = 'leaving'; crow.t = 0; HUD.crowSay(null); AU.play('crow', crow.root.position.x, crow.root.position.y, crow.root.position.z, 0.6); }
  function updateCrow(dt) {
    if (!crow || !crow.root.visible) return;
    crow.t += dt;
    const r = crow.root;
    if (crow.state === 'arriving') {
      const d = r.position.distanceTo(crow.target);
      _v1.copy(crow.target).sub(r.position).normalize();
      r.position.addScaledVector(_v1, Math.min(d, dt * 12));
      r.rotation.y = Math.atan2(_v1.x, _v1.z);
      crow.wl.rotation.z = Math.sin(crow.t * 18) * 0.8; crow.wr.rotation.z = -crow.wl.rotation.z;
      if (d < 0.05) { crow.state = 'perched'; crow.t = 0; }
    } else if (crow.state === 'perched') {
      crow.wl.rotation.z = 0.15; crow.wr.rotation.z = -0.15;
      r.rotation.y = angTo(r.rotation.y, Math.atan2(PLAYER.pos.x - r.position.x, PLAYER.pos.z - r.position.z), dt * 3);
      crow.body.rotation.x = Math.sin(crow.t * 2) * 0.05;
      if (Math.random() < dt * 0.15) AU.play('crow', r.position.x, r.position.y + 0.4, r.position.z, 0.5);
      if (crow.t > 16 || dist2(r.position.x, r.position.z, PLAYER.pos.x, PLAYER.pos.z) > 40 * 40) crowLeave();
    } else if (crow.state === 'leaving') {
      r.position.y += dt * 8; r.position.x += Math.sin(r.rotation.y) * dt * 10; r.position.z += Math.cos(r.rotation.y) * dt * 10;
      crow.wl.rotation.z = Math.sin(crow.t * 18) * 0.8; crow.wr.rotation.z = -crow.wl.rotation.z;
      if (crow.t > 5) r.visible = false;
    }
  }
  // hint triggers
  bus.on('got', (id) => {
    const inv = PLAYER.inv;
    if ((id === 'wood' || id === 'stone') && inv.count('wood') >= 3 && inv.count('stone') >= 2) hint('wood');
    if (id === 'boar_tusk') hint('tusk');
    if (id === 'copper_ore') hint('copper');
    if (id === 'kami_seed') { hint('seed'); if (S.flags.boss1) setTimeout(() => hint('raft'), 20000); }
  });
  bus.on('crafted', (id) => { if (id === 'hammer') hint('hammer'); });
  bus.on('placed', (p) => { if (p.id === 'workbench') hint('workbench'); if (p.def.fire) hint('rested'); });
  bus.on('wet', () => hint('wet'));
  bus.on('respawn', () => hint('death'));

  function save() { return { flags: S.flags, hints: [...S.hints], looted: [...S.looted], broken: [...S.broken], offered: S.offered, revealed: [...S.revealed], discovered: [...S.discovered], pins: S.pins, lastNight: S.lastNight }; }
  function load(o) {
    if (!o) return;
    S.flags = o.flags || {}; S.hints = new Set(o.hints || []); S.looted = new Set(o.looted || []); S.broken = new Set(o.broken || []);
    S.offered = o.offered || {}; S.revealed = new Set(o.revealed || []); S.discovered = new Set(o.discovered || []); S.pins = o.pins || []; S.lastNight = o.lastNight == null ? -1 : o.lastNight;
  }
  function reset() { S.flags = {}; S.hints = new Set(); S.looted = new Set(); S.broken = new Set(); S.offered = {}; S.revealed = new Set(); S.discovered = new Set(); S.pins = []; S.raid = null; S.boss = null; S.lastNight = -1; S.biome = -1; }
  return { init, update, lights, interactables, hint, bossDefeated, bossLeft, save, load, reset, S, startRaid, summonBoss, local, crowLeave };
})();
