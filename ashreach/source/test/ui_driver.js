// Ashreach UI viewer — builds a small scene with a player, mobs, sims and NPCs and exposes window.UIV
// so test/ui_shots.mjs (or a person at the console) can open every screen and window.

(function () {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xb59a72 }));
  ground.receiveShadow = true;
  scene.add(ground);
  for (let i = 0; i < 40; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(rr(0.5, 2.5), 0), new THREE.MeshLambertMaterial({ color: 0x8a7458 }));
    const a = rr(0, TAU), d = rr(12, 90);
    r.position.set(Math.sin(a) * d, 0.3, Math.cos(a) * d); scene.add(r);
  }
  setAtmosphere({ fog: 0xd8c7a8, near: 60, far: 400 });
  resize();
  addEventListener('resize', resize);
  let last = performance.now(), camYaw = 0.5;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    clock += dt;
    if (PLAYER && UI.state === 'play') {
      for (const e of ENTS) { if (typeof updateCast === 'function') updateCast(e, dt); if (typeof updateCooldowns === 'function') updateCooldowns(e, dt); if (typeof updateBuffs === 'function' && e.buffs.length) { try { updateBuffs(e, dt); } catch (err) { /* ok */ } } syncRig(e, dt); }
      const P = PLAYER.pos;
      camera.position.set(P.x - Math.sin(camYaw) * 7.5, P.y + 3.4, P.z - Math.cos(camYaw) * 7.5);
      camera.lookAt(P.x, P.y + 1.6, P.z + 0);
    } else {
      camYaw += dt * 0.05;
      camera.position.set(Math.sin(camYaw) * 30, 9, Math.cos(camYaw) * 30); camera.lookAt(0, 2, 0);
    }
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    uiUpdate(dt);
  }

  function mkSim(name, prof, breed, faction, lvl, x, z) {
    const ch = newCharacter({ name, prof, breed, faction, sex: Math.random() < 0.5 ? 'm' : 'f' });
    ch.level = lvl;
    const e = makeEnt('sim', { name, level: lvl, char: ch, faction, x, z, yaw: rr(0, TAU) });
    return addEnt(e);
  }
  function play(ch) {
    for (const e of ENTS.slice()) removeEnt(e);
    ch = ch || newCharacter({ name: 'Kestra', breed: 'kestrel', prof: 'trooper', faction: 'freehold', sex: 'f' });
    const P = makeEnt('player', { name: ch.name, level: ch.level, char: ch, faction: ch.faction, x: 0, z: 0, yaw: 0.5 });
    PLAYER = P; addEnt(P);
    TEAM.members = [P]; TEAM.leader = P; P.team = TEAM;
    hideTitle();
    EV.emit('zone', 'landfall');
    EV.emit('chat', 'system', '', 'Welcome to Ashreach, ' + ch.name + '. The Concord shuttle has set you down on Landfall Isle.');
    EV.emit('stats', P); EV.emit('inv', P);
    return P;
  }
  // A mid-game character with gear, nanos, buffs, a team and a fight going on.
  function rich() {
    const ch = newCharacter({ name: 'Kestra', breed: 'kestrel', prof: 'trooper', faction: 'freehold', sex: 'f' });
    ch.level = 14; ch.ip = 237; ch.xp = Math.round(xpToNext(14) * 0.62); ch.credits = 18450;
    for (let i = 0; i < 40; i++) raiseSkill(ch, 'assault_rifle'); for (let i = 0; i < 25; i++) raiseSkill(ch, 'body_dev');
    for (let i = 0; i < 12; i++) raiseAbility(ch, 'agi');
    ch.nanos = nanosForProf('trooper', true).filter((id) => NANOS[id].lvl <= 16).slice(0, 14);
    const add = (id, ql, n) => { const it = makeItem(id, ql); if (it) { if (n) it.stack = n; ch.inv.push(it); } return it; };
    ch.equip.rhand = makeItem('ar_kessler', 30) || makeItem('ar_basic', 20);
    ch.equip.head = makeItem('armor_basic_head', 12);
    ch.equip.util1 = makeItem('util_goggles', 15);
    ch.implants.eye = makeImplant ? makeImplant('eye', 20) : null;
    ch.implants.head = makeItem('implant_head', 18);
    add('health_kit', 20, 12); add('nano_kit', 20, 6); add('stim_reflex', 15, 2);
    add('ar_ironhide', 40); add('pistol_hale', 18); add('smg_kessler', 25); add('rifle_sable', 35);
    add('armor_basic_chest', 15); add('armor_basic_legs', 14); add('armor_basic_lshoulder', 12); add('util_harness', 20);
    add('implant_chest', 15); add('implant_rhand', 30); add('cluster_shiny_agi', 15); add('cluster_bright_str', 12); add('cluster_faded_sta', 10);
    add('nano:trooper_rifle_calibration', 1); add('nano:trooper_killer_focus', 1);
    add('misc_hound_pelt', 8, 3); add('misc_cracked_fang', 6); add('key_card', 10);
    ch.missions = [];
    const P = play(ch);
    refreshStats(P); P.hp = Math.round(P.S.maxHp * 0.71); P.np = Math.round(P.S.maxNp * 0.45);
    const hb = ch.hotbar;
    ch.nanos.slice(0, 5).forEach((id, i) => { hb[i] = { type: 'nano', id }; });
    hb[5] = { type: 'item', uid: ch.inv[0].uid, t: ch.inv[0].t }; hb[6] = { type: 'item', uid: ch.inv[1].uid, t: ch.inv[1].t };
    hb[7] = { type: 'special', id: 'burst' }; hb[8] = { type: 'special', id: 'fullauto' }; hb[9] = { type: 'action', id: 'attack' };
    hb[10] = { type: 'action', id: 'sit' }; hb[11] = { type: 'nano', id: ch.nanos[6] }; hb[12] = { type: 'action', id: 'assist' };
    // buffs (real program effects where possible)
    for (const id of ch.nanos.filter((id) => NANOS[id].target === 'self' && NANOS[id].dur > 0).slice(0, 4)) applyNano(P, P, NANOS[id], id);
    if (P.buffs[0]) P.buffs[0].t = 7;
    applyBuffRaw(null, P, { id: 'clone_sickness', name: 'Clone Sickness', line: 'cs', str: 1, dur: 120, mods: { str: -10, agi: -10 }, icon: { glyph: '☣', color: '#9fd06a' }, hostile: true });
    P.cds['n:' + ch.nanos[1]] = 6; P.cdMax['n:' + ch.nanos[1]] = 10;
    P.cds.fullauto = 31; P.cdMax.fullauto = 45; P.cds['item:hp'] = 9; P.cdMax['item:hp'] = 15;
    // world
    const hound = spawnMob('rust_hound', 15, 3, 9);
    spawnMob('rust_hound', 13, -4, 14); spawnMob('scav_drone', 18, 8, 16); spawnMob('chitterling', 2, -8, 6);
    const s1 = mkSim('Vexra', 'medic', 'savant', 'freehold', 15, -3, -2), s2 = mkSim('Tormund', 'bruiser', 'bulwark', 'unaligned', 16, 2.5, 4);
    mkSim('Ilyana', 'runner', 'kestrel', 'meridian', 22, -10, 8);
    for (const s of [s1, s2]) { TEAM.members.push(s); s.team = TEAM; }
    s1.hp = Math.round(s1.S.maxHp * 0.4); s2.np = s2.S.maxNp * 0.2;
    s2.target = hound; hound.target = s2;
    spawnNpc(ZONE_DEFS.landfall.pois[2]);
    const v = spawnNpc(ZONE_DEFS.landfall.pois[3]);
    v.stock = vendorStock('weapons', 14);
    P.target = null; setTarget(hound);
    hound.hp = Math.round(hound.S.maxHp * 0.58);
    hound.cast = null;
    P.attacking = true;
    P.cast = { nano: ch.nanos[2], t: 0.9, total: 1.5, target: P };
    EV.emit('cast', P, NANOS[ch.nanos[2]], P);
    // chat backlog
    EV.emit('chat', 'ooc', 'Zephyrine', 'LFT 12 medic, Dustbowl, anyone?');
    EV.emit('chat', 'vicinity', 'Tormund', 'pull the hounds to the rocks, I got aggro');
    EV.emit('chat', 'team', 'Vexra', 'heals up, watch my nano');
    EV.emit('chat', 'tell', 'Ilyana', 'wts QL40 Ironhide AR, cheap');
    EV.emit('dmg', P, hound, 87, 'proj', { crit: true, special: 'burst' });
    EV.emit('dmg', hound, P, 23, 'melee', {});
    EV.emit('heal', s1, P, 140, { nano: 'Mend' });
    EV.emit('log', 'You gained 412 experience.', 'xp');
    EV.emit('log', 'You received Hound Pelt (QL 8).', 'loot');
    // a mission
    if (typeof requestMissions === 'function') {
      const offers = requestMissions(null, { easy_hard: 0.2 });
      if (offers && offers[0] && typeof acceptMission === 'function') acceptMission(null, offers[0]);
    }
    EV.emit('stats', P);
    return P;
  }
  window.UIV = {
    ready: false, play, rich, title: () => showTitle(), chargen: () => showChargen(),
    open: (id) => uiOpen(id), close: (id) => uiClose(id), closeAll: () => { for (const id in UI.wins) uiClose(id); },
    tab: (id, tab) => { const w = UI.wins[id]; w.tab = tab; uiOpen(id); ui_refreshWin(w, true); },
    interact: (i) => { const npc = ENTS.find((e) => e.kind === 'npc' && e.poi === ZONE_DEFS.landfall.pois[i]) || spawnNpc(ZONE_DEFS.landfall.pois[i]); if (npc.role === 'vendor' && !npc.stock) npc.stock = vendorStock('weapons', 14); PLAYER.pos.set(npc.pos.x + 2, 0, npc.pos.z - 3); EV.emit('interact', npc); return npc.role; },
    hover: (sel) => { const el = document.querySelector(sel); if (!el) return false; el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    UI, HUD,
  };
  uiInit();
  showTitle();
  requestAnimationFrame(frame);
  window.UIV.ready = true;
})();
