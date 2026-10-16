// Veyra Below — game flow: the ship, descending, rooms and encounters, bosses, quests, story, portals, death

const GAME = {
  mode: 'title', char: null, slot: 0, diff: 0, area: null, floorIdx: 0, time: 0, hitStop: 0, inCombat: false, timers: [],
  curRoom: null, portal: null, stash: null, lastStandUsed: false, playT: 0, saveT: 0, combatT: 0, banners: [],
  later(t, fn) { this.timers.push({ t, fn }); },
  floorLevel() { return AREAS[this.area] ? AREAS[this.area].lvl + this.floorIdx * 2 + DIFFS[this.diff].lvl : 1; },
};

// ---------- level lifecycle ----------
function resetLevelState() {
  clearCombat(); clearGround(); FX.clear(); WAVES.length = 0;
  for (const e of [...ENTS]) removeActor(e);
  ENTS.length = 0; ALLIES.length = 0; PL = null;
  GAME.timers.length = 0; GAME.curRoom = null; GAME.inCombat = false;
}
function spawnParty(x, z, yaw = 0) {
  PL = makePartyActor(GAME.char, x, z, true);
  PL.yaw = yaw;
  spawnAllies(x, z);
  snapCamera(x, z);
  GAME.spriteObj = makeSprite(GAME.char.sprite.form); R.root.add(GAME.spriteObj);
  GAME.spriteObj.position.set(x, 2, z);
}
function enterHub(o = {}) {
  GAME.mode = 'hub';
  if (!o.keepStash) GAME.stash = null;
  resetLevelState(); clearRoot();
  LV = genHub();
  buildHubMeshes(LV);
  applyPalette(HUB_PAL);
  const tele = LV.objects.find((q) => q.kind === 'tele');
  spawnParty(tele.x, tele.z + 3, Math.PI);
  if (GAME.stash) {
    // a portal back to where the beacon was opened
    const pm = makePortalMesh(); pm.position.set(tele.x + 5, 0, tele.z + 1.5); LV.group.add(pm);
    LV.objects.push({ kind: 'return', x: pm.position.x, z: pm.position.z, r: 1.8, obj: pm, label: `Portal: return to ${AREAS[GAME.stash.area].name}` });
  }
  setBodyState('play');
  AUDIO.music('hub');
  HUD.banner('Meridian', 'Wardens\' deck');
  // heal up on board
  if (PL) { PL.hp = PL.maxHp; PL.tp = PL.maxTp; }
  GAME.char.prog.lastHub = Date.now();
  GAME.hubVisit = (GAME.hubVisit || 0) + 1;
  const pr = GAME.char.prog;
  if (!pr.seenIntro) { pr.seenIntro = true; GAME.later(0.8, () => UI.dialog(NPCS.commander.name, STORY.commander, () => {})); }
  else if ((pr.storySeen || 0) < pr.story) {
    // the commander has something to say after each boss; the last one ends the story
    const area = AREA_ORDER[pr.story - 1]; pr.storySeen = pr.story;
    GAME.later(0.8, () => UI.dialog(NPCS.commander.name, [STORY.after[area]], () => { if (area === 'ruins') UI.ending(); }));
  }
  ensureQuestOffers();
  SAVE.save();
}
function makePortalMesh() {
  const g = new THREE.Group();
  const ring = mesh(GM.tor(), glowMat(0x60c0ff, 0.9), 0, 1.3, 0, 2.2, 2.6, 2.2); g.add(ring);
  const disc = mesh(GM.disc(), mat(0x80e0ff, { basic: true, t: true, o: 0.45, add: true, ds: true }), 0, 1.3, 0, 1.0, 1.25, 1); g.add(disc);
  g.add(mesh(GM.cyl(), mat(0x30343a), 0, 0.06, 0, 1.6, 0.12, 1.6));
  g.userData.spin = disc; g.userData.ring = ring;
  return g;
}

// Descend to Veyra
function descend(area, floorIdx, diff) {
  GAME.diff = diff; GAME.area = area; GAME.floorIdx = floorIdx;
  UI.loading(AREAS[area].name + (floorIdx === 2 ? ' — Depths' : ' ' + (floorIdx + 1)), rnd.pick(LOADING_TIPS));
  AUDIO.sfx('tele');
  requestAnimationFrame(() => requestAnimationFrame(() => { buildFloor(area, floorIdx, diff); UI.loading(null); }));
}
function buildFloor(area, floorIdx, diff, seed) {
  GAME.mode = 'field'; GAME.stash = null; GAME.lastStandUsed = false; GAME.area = area; GAME.floorIdx = floorIdx; GAME.diff = diff; GAME.boss = null;
  resetLevelState(); clearRoot();
  const A = AREAS[area];
  seed = seed || area + ':' + floorIdx + ':' + Date.now() + ':' + Math.random();
  const c = GAME.char, q = c.quest.active;
  const questHere = q && !q.done && q.area === area && q.diff === diff && q.floor === Math.min(floorIdx, 1) && floorIdx < 2;
  let L, rng;
  if (floorIdx === 2) ({ L, rng } = genBossLayout(area, seed));
  else {
    ({ L, rng } = genFloorLayout(area, seed, 10 + floorIdx + rnd.int(0, 2)));
    const capKey = area + floorIdx;
    const capIdx = (c.prog.capsules[capKey] || 0);
    planFloor(L, rng, { capsule: capIdx < 2 || rng() < 0.4 ? Math.min(2, floorIdx + (capIdx ? 1 : 0)) : undefined, questObject: questHere && (q.type === 'retrieve' || q.type === 'rescue') ? q.type : null });
  }
  LV = L;
  buildLevelMeshes(L, A.pal);
  applyPalette(A.pal);
  for (const rm of L.rooms) buildFences(L, rm, area === 'ruins' ? 0xc040ff : area === 'caves' ? 0xff6020 : 0xff3040);
  // the start room has a pad home; the exit room a teleporter onward
  const start = L.rooms[0];
  spawnParty(L.start.x, L.start.z, Math.PI);
  const homePad = makeTeleporter(0x60d8ff); homePad.scale.setScalar(0.6);
  const hp = { x: tileCenter(start.ci) + 2.2, z: tileCenter(start.cj) - 2.2 };
  if (solidAt(hp.x, hp.z)) { hp.x = tileCenter(start.ci) - 2.2; }
  homePad.position.set(hp.x, 0, hp.z); L.group.add(homePad);
  L.objects.push({ kind: 'home', x: hp.x, z: hp.z, r: 1.4, obj: homePad, label: 'Return to the ship' });
  if (floorIdx < 2) {
    const ex = L.exitRoom, tp = makeTeleporter(floorIdx === 1 ? 0xff5050 : 0xc060ff);
    tp.position.set(tileCenter(ex.ci), 0, tileCenter(ex.cj)); L.group.add(tp);
    const o = { kind: 'next', x: tp.position.x, z: tp.position.z, r: 2, obj: tp, label: floorIdx === 1 ? 'Teleporter: descend to the depths' : 'Teleporter: next area', locked: true };
    L.objects.push(o); ex.exitObj = o; tp.visible = true; tp.userData.beam.visible = false;
    populateFloor(L, rng, questHere ? q : null);
  } else {
    L.bossRoom = L.rooms[1];
    L.bossCenter = { x: tileCenter(L.rooms[1].ci) + 1, z: (L.rooms[1].y0 + L.rooms[1].y1 + 1) / 2 * T };
    // a few crates in the antechamber
    for (let k = 0; k < 3; k++) { const p = randomRoomPoint(L, start, rng, 1.4); if (dist2(p.x, p.z, L.start.x, L.start.z) > 6) spawnBox(p.x, p.z, A.pal); }
  }
  // remember how deep you've been, for the teleporter
  const way = c.prog.way[diff]; way[area] = Math.max(way[area] || 0, floorIdx);
  setBodyState('play');
  AUDIO.music(['forest', 'caves', 'mines', 'ruins'][A.music]);
  HUD.banner(A.name, floorIdx === 2 ? 'The Depths' : `${A.sub} ${floorIdx + 1} · ${DIFFS[diff].name}`);
  GAME.later(1.2, () => allyChatter('start', 0.7));
  markSeen(L, PL.x, PL.z);
}

// What lives where
function pickMonster(list, rng) { return rng.wpick(list, (id) => (ENEMIES[id].hp > 5 ? 0.6 : 1)); }
function packFor(id, rng) { const d = ENEMIES[id]; return d.pack ? rng.int(3, 5) : d.hp > 5 ? rng.int(1, 2) : d.hp < 2 ? rng.int(4, 6) : rng.int(2, 3); }
function populateFloor(L, rng, quest) {
  const A = AREAS[L.area], list = A.floors[Math.min(1, GAME.floorIdx)], D = DIFFS[GAME.diff], lvl = GAME.floorLevel();
  let bountyPlaced = false;
  for (const rm of L.rooms) {
    rm.cleared = false;
    if (rm.type === 'pack' || rm.type === 'treasure') {
      const packs = rm.type === 'treasure' ? 1 : rm.tiles > 60 ? 2 : 1;
      for (let p = 0; p < packs; p++) {
        const id = pickMonster(list, rng), n = packFor(id, rng);
        const center = randomRoomPoint(L, rm, rng, 1.5);
        const roll = rng();
        const unique = roll < 0.05 || (quest && quest.type === 'bounty' && !bountyPlaced);
        const elite = !unique && (roll < 0.05 + D.elite || rm.type === 'treasure');
        const mods = elite || unique ? rng.shuffle(Object.keys(ELITE_MODS)).slice(0, unique ? 2 : rng.int(1, 2)) : null;
        if (unique) {
          bountyPlaced = bountyPlaced || !!(quest && quest.type === 'bounty');
          const nm = quest && quest.type === 'bounty' && !quest.placed ? quest.targetName : rng.pick(UNIQUE_PREFIX) + ' ' + rng.pick(UNIQUE_TITLE);
          const u = spawnEnemy(quest && quest.type === 'bounty' && !quest.placed ? quest.target : id, center.x, center.z, { lvl: lvl + 2, unique: nm, elite: mods, room: rm, sleep: true });
          if (quest && quest.type === 'bounty' && !quest.placed) { u.questTarget = true; quest.placed = true; }
          for (let k = 0; k < 3; k++) { const p2 = randomRoomPoint(L, rm, rng, 1); spawnEnemy(id, p2.x, p2.z, { lvl, room: rm, sleep: true }); }
        } else {
          for (let k = 0; k < n; k++) {
            const a = rng() * TAU, r = rng.range(0.5, 2.2); let x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
            if (solidAt(x, z) || clearance(L, x, z) < 0.6) { x = center.x; z = center.z; }
            const variant = rng() < (GAME.diff === 3 ? 1 / 60 : 1 / 400);
            spawnEnemy(id, x, z, { lvl: lvl + rng.int(0, 1), elite: elite ? mods : null, room: rm, sleep: true, variant });
          }
        }
      }
      if (rm.type === 'treasure') for (let k = 0; k < rng.int(3, 5); k++) { const p = randomRoomPoint(L, rm, rng, 1.2); spawnBox(p.x, p.z, A.pal); }
    }
    if (rm.type !== 'start' && rm.type !== 'treasure' && rng() < 0.45) for (let k = 0; k < rng.int(1, 2); k++) { const p = randomRoomPoint(L, rm, rng, 1.2); spawnBox(p.x, p.z, A.pal); }
    // lore capsules
    if (rm.capsule !== undefined) {
      const p = randomRoomPoint(L, rm, rng, 1.6), cap = makeCapsule(); cap.position.set(p.x, 0, p.z); L.group.add(cap);
      L.objects.push({ kind: 'capsule', x: p.x, z: p.z, r: 1.6, obj: cap, idx: rm.capsule, label: 'Message capsule' });
      L.colliders.push({ x: p.x, z: p.z, r: 0.5 });
    }
    if (rm.quest === 'retrieve') { const p = randomRoomPoint(L, rm, rng, 1.6); dropItem({ uid: newUid(), kind: 'quest', name: quest.itemName, base: 'quest' }, p.x, p.z, 0); }
    if (rm.quest === 'rescue') {
      const p = randomRoomPoint(L, rm, rng, 1.6);
      const rig = makeHumanoid({ suit: 0xd0d0d8, suit2: 0x4a4a52, hair: 0x7a4a28, race: 'human', role: 'none' }); rig.g.position.set(p.x, 0, p.z); L.group.add(rig.g);
      L.objects.push({ kind: 'rescue', x: p.x, z: p.z, r: 1.8, obj: rig.g, rig, label: `Talk to ${quest.npcName}` });
    }
  }
  // the rare golden bird
  if (L.area === 'forest' && rng() < 0.06 + GAME.diff * 0.02) { const rm = rng.pick(L.rooms.filter((r) => r.type === 'pack')); if (rm) { const p = randomRoomPoint(L, rm, rng, 1.5); spawnEnemy('skylark', p.x, p.z, { lvl, room: rm, sleep: true }); } }
}

// ---------- rooms ----------
function onEnterRoom(rm) {
  if (!rm || rm.cleared || rm.active) return;
  if (rm.type === 'lock' || (rm.type === 'exit' && rm.guard)) startEncounter(rm);
  if (rm.type === 'boss') startBoss(rm);
  if (rm.type === 'pack' || rm.type === 'treasure') {
    // waking the room's sleepers is left to their own eyes; mark it cleared once empty
    rm.watch = true;
  }
}
function startEncounter(rm) {
  rm.active = true; rm.wave = 0;
  const lvl = GAME.floorLevel();
  const n = rm.type === 'exit' ? 3 : rnd() < 0.4 ? 3 : 2;
  rm.waves = n;
  // everyone in the party must be inside before the fences go up: pull stragglers in
  for (const a of ALLIES) if (!alive(a) || roomAt(a.x, a.z) !== rm) { a.x = PL.x + rnd.range(-1, 1); a.z = PL.z + rnd.range(-1, 1); pushOut(a, a.r); }
  setFences(LV, rm, true); AUDIO.sfx('door');
  spawnWave(rm, lvl);
}
function spawnWave(rm, lvl) {
  const A = AREAS[LV.area], list = A.floors[Math.min(1, GAME.floorIdx)], D = DIFFS[GAME.diff];
  const rng = rnd;
  rm.wave++;
  const kinds = [pickMonster(list, rng), pickMonster(list, rng)];
  const count = Math.round(clamp(rm.tiles / 14, 3, 7) + rm.wave - 1);
  const eliteWave = rm.wave === rm.waves && rng() < D.elite + 0.08;
  const mods = eliteWave ? rng.shuffle(Object.keys(ELITE_MODS)).slice(0, rng.int(1, 2)) : null;
  for (let k = 0; k < count; k++) {
    let p = null;
    for (let t = 0; t < 12; t++) { const q = randomRoomPoint(LV, rm, rng, 1.0); if (dist2(q.x, q.z, PL.x, PL.z) > 16) { p = q; break; } }
    if (!p) p = randomRoomPoint(LV, rm, rng, 1.0);
    const id = kinds[k % 2];
    rm.pending = (rm.pending || 0) + 1;
    GAME.later(k * 0.12, () => { rm.pending--; if (GAME.mode !== 'field' || LV.rooms[rm.id] !== rm) return; const e = spawnEnemy(id, p.x, p.z, { lvl: lvl + rnd.int(0, 1), room: rm, teleIn: true, elite: eliteWave && k < 3 ? mods : null }); e.wave = true; });
  }
}
function roomEnemies(rm) { return ENTS.filter((e) => e.team === 1 && !e.dead && !e.box && (e.room === rm || (e.summoner && e.summoner.room === rm))); }
function updateRooms(dt) {
  const L = LV;
  for (const rm of L.rooms) {
    if (rm.active && rm.type !== 'boss') {
      if (rm.pending > 0 || roomEnemies(rm).length > 0) continue;
      if (rm.wave < rm.waves) { spawnWave(rm, GAME.floorLevel()); continue; }
      rm.active = false; rm.cleared = true; setFences(L, rm, false); AUDIO.sfx('open');
      HUD.toast('Room clear', '#a0ffb0'); allyChatter('clear', 0.5);
      if (rm.exitObj) { rm.exitObj.locked = false; rm.exitObj.obj.userData.beam.visible = true; HUD.toast('The teleporter is active.', '#c0a0ff'); }
      GAME.char.stats.roomsCleared = (GAME.char.stats.roomsCleared || 0) + 1;
      checkClearQuest();
    }
    if (rm.watch && !rm.cleared && roomEnemies(rm).length === 0) { rm.cleared = true; rm.watch = false; checkClearQuest(); }
  }
  // the exit teleporter also wakes when its room's fight is done
  if (L.exitRoom && L.exitRoom.cleared && L.exitRoom.exitObj && L.exitRoom.exitObj.locked) { L.exitRoom.exitObj.locked = false; L.exitRoom.exitObj.obj.userData.beam.visible = true; }
}

// ---------- bosses ----------
function startBoss(rm) {
  rm.active = true;
  setFences(LV, rm, true); AUDIO.sfx('door');
  for (const a of ALLIES) if (roomAt(a.x, a.z) !== rm) { a.x = PL.x + rnd.range(-1, 1); a.z = PL.z + rnd.range(-1, 1); pushOut(a, a.r); }
  const id = AREAS[LV.area].boss, B = BOSSES[id], c = LV.bossCenter;
  const lvl = AREAS[LV.area].lvl + 5 + DIFFS[GAME.diff].lvl;
  const b = spawnBoss(id, c.x + 3, c.z, lvl);
  GAME.boss = b;
  AUDIO.music('boss');
  HUD.banner(B.name, B.title, true);
  AUDIO.sfx('roar'); CAM.shake = 1;
  allyChatter('boss', 0.9);
  GAME.later(2.2, () => { b.awake = true; });
}
function onBossDead(b) {
  const c = GAME.char, area = LV.area, rm = LV.bossRoom;
  rm.active = false; rm.cleared = true; setFences(LV, rm, false);
  AUDIO.music('victory');
  HUD.banner('Victory', BOSSES[b.bossId].name + ' has fallen', true);
  const first = !c.prog.bosses[GAME.diff][area];
  c.prog.bosses[GAME.diff][area] = true; c.stats.bosses++;
  if (area === 'ruins' && GAME.diff === c.prog.maxDiff && c.prog.maxDiff < 3) { c.prog.maxDiff++; GAME.later(4, () => HUD.toast(`${DIFFS[c.prog.maxDiff].name} difficulty unlocked!`, DIFFS[c.prog.maxDiff].color)); }
  if (first && GAME.diff === 0) c.prog.story = Math.max(c.prog.story, AREA_ORDER.indexOf(area) + 1);
  GAME.later(3, () => {
    const tp = makeTeleporter(0x60d8ff); tp.position.set(LV.bossCenter.x, 0, LV.bossCenter.z); LV.group.add(tp);
    LV.objects.push({ kind: 'home', x: tp.position.x, z: tp.position.z, r: 2, obj: tp, label: 'Teleporter: return to the ship', after: area });
    FX.teleIn(tp.position.x, tp.position.z, 0x60d8ff);
  });
  SAVE.save();
}

// ---------- kills, levels, death ----------
bus.on('kill', (e, src) => {
  if (e.box) { FX.burst(e.x, 0.5, e.z, 0xc0a040, 14, 4, 0.5, 0.3, { grav: 9, up: 3 }); AUDIO.sfx('hit', e.x, e.z, 0.5); lootFor(e); removeActor(e); return; }
  if (e.team !== 1) return;
  const c = GAME.char;
  AUDIO.sfx('die', e.x, e.z, 0.6);
  FX.burst(e.x, (e.h || 1.5) * 0.5, e.z, e.def.color2 || 0xffffff, 14, 4, 0.6, 0.4, { drag: 2 });
  if (e.selfDestruct) { e.deadT = 1.3; }
  if (!e.noXp && PL) {
    const ups = gainXP(c, e.xp * (1 + (PL.S.xpPct || 0)));
    if (ups) onLevelUp(ups);
  }
  c.stats.kills++;
  if (src && src.rec && Math.random() < 0.12) say(src, 'kill');
  if (e.boss) { lootFor(e); onBossDead(e); return; }
  if (e.pod) return;
  lootFor(e);
  questKill(e);
  if (e.def.split) for (let k = 0; k < 2; k++) { const a = rnd() * TAU; const m = spawnEnemy(e.def.split, e.x + Math.cos(a) * 0.8, e.z + Math.sin(a) * 0.8, { lvl: e.lvl, room: e.room }); m.aggro = e.aggro; }
  if (e.elite && e.elite.includes('fire')) addZone({ x: e.x, z: e.z, r: 2.4, delay: 0.6, team: 1, owner: e, tele: true, fx: (z) => FX.explode(z.x, z.z, 2.4, 0xff7020), onHit: (p) => enemyHit(e, p, { dmg: e.atk * 0.8, elem: 'fire', sure: true }) });
});
function onLevelUp(ups) {
  const c = GAME.char;
  AUDIO.sfx('levelup'); FX.pillar(PL.x, PL.z, 1, 6, 0xffe080, 1); FX.burst(PL.x, 1, PL.z, 0xffe080, 30, 3, 1, 0.5, { up: 3 });
  HUD.banner('Level up!', `Level ${c.level} · +${ups} skill point${ups > 1 ? 's' : ''}`);
  refreshPartyActor(PL, false); PL.hp = PL.maxHp; PL.tp = PL.maxTp;
  for (const a of ALLIES) { a.rec.level = Math.max(1, c.level + (a.rec.lvOff || 0)); a.char = allyChar(a.rec); refreshPartyActor(a, false); }
  allyChatter('level', 0.4);
}
bus.on('down', (a) => {
  if (a === PL) {
    GAME.char.stats.deaths++;
    HUD.toast('You are down!', '#ff6060');
    UI.downed(true);
  } else { say(a, 'down', true); }
});
bus.on('revive', (a) => { if (a === PL) UI.downed(false); else say(a, 'revive'); });
function returnToShipDefeated() {
  const c = GAME.char, lost = Math.floor(c.credits * 0.1);
  c.credits -= lost;
  UI.downed(false);
  enterHub();
  if (lost) HUD.toast(`You were carried back to the ship. Lost ${fmtNum(lost)} credits.`, '#ff9090');
}

// ---------- portals (beacon / Recall) ----------
GAME.openPortal = function () {
  if (GAME.mode !== 'field') return;
  const old = LV.objects.find((o) => o.kind === 'portal'); if (old) { LV.group.remove(old.obj); LV.objects.splice(LV.objects.indexOf(old), 1); }
  const x = PL.x + Math.sin(PL.yaw) * 1.8, z = PL.z + Math.cos(PL.yaw) * 1.8;
  const pm = makePortalMesh(); pm.position.set(solidAt(x, z) ? PL.x : x, 0, solidAt(x, z) ? PL.z : z); LV.group.add(pm);
  LV.objects.push({ kind: 'portal', x: pm.position.x, z: pm.position.z, r: 1.6, obj: pm, label: 'Portal: return to the ship' });
  FX.teleIn(pm.position.x, pm.position.z, 0x60c0ff); AUDIO.sfx('tele');
};
// keep the field (level, monsters, loot) aside while visiting the ship
function stashField() {
  const enemies = ENTS.filter((e) => e.team === 1);
  for (const e of enemies) { const i = ENTS.indexOf(e); if (i >= 0) ENTS.splice(i, 1); }
  for (const a of [PL, ...ALLIES]) if (a) removeActor(a);
  for (const s of ENTS.filter((e) => e.summon)) removeActor(s);
  if (GAME.spriteObj) R.root.remove(GAME.spriteObj);
  clearCombat(); FX.clear(); WAVES.length = 0;
  GAME.stash = { L: LV, root: R.root, enemies, ground: GROUND.slice(), area: GAME.area, floorIdx: GAME.floorIdx, diff: GAME.diff, room: GAME.curRoom, boss: GAME.boss };
  GROUND.length = 0; ENTS.length = 0; ALLIES.length = 0; PL = null;
  R.scene.remove(R.root); R.root = new THREE.Group(); R.scene.add(R.root);
}
function restoreField() {
  const s = GAME.stash; if (!s) return;
  resetLevelState(); clearRoot();
  R.scene.remove(R.root); R.root = s.root; R.scene.add(R.root);
  LV = s.L; GAME.area = s.area; GAME.floorIdx = s.floorIdx; GAME.diff = s.diff; GAME.boss = s.boss; GAME.mode = 'field';
  for (const e of s.enemies) ENTS.push(e);
  for (const rm of LV.rooms) rm.pending = 0;
  for (const d of s.ground) GROUND.push(d);
  const portal = LV.objects.find((o) => o.kind === 'portal');
  const px = portal ? portal.x : LV.start.x, pz = portal ? portal.z : LV.start.z;
  if (portal) { LV.group.remove(portal.obj); LV.objects.splice(LV.objects.indexOf(portal), 1); }
  spawnParty(px, pz + 1, Math.PI);
  GAME.curRoom = roomAt(PL.x, PL.z);
  applyPalette(AREAS[GAME.area].pal);
  AUDIO.music(GAME.boss && !GAME.boss.dead ? 'boss' : ['forest', 'caves', 'mines', 'ruins'][AREAS[GAME.area].music]);
  HUD.banner(AREAS[GAME.area].name, 'Back through the portal');
  GAME.stash = null;
  setBodyState('play');
}

// ---------- interaction ----------
function nearestInteract() {
  if (!PL || !LV) return null;
  let best = null, bd = Infinity;
  for (const o of LV.objects) { const d = dist2(PL.x, PL.z, o.x, o.z); if (d < o.r * o.r && d < bd) { bd = d; best = o; } }
  // fallen allies
  for (const a of ALLIES) if (a.downed && dist2(PL.x, PL.z, a.x, a.z) < 2.2 * 2.2) { const d = dist2(PL.x, PL.z, a.x, a.z); if (d < bd) { bd = d; best = { kind: 'ally', a, label: `Revive ${a.name}${invCount(GAME.char.inv, 'reviveShot') ? ' (Revive Shot)' : ' (hold)'}` }; } }
  const g = nearestGround(PL.x, PL.z, 1.8);
  if (g && (!best || dist2(PL.x, PL.z, g.x, g.z) < bd)) best = { kind: 'ground', g, label: `Pick up ${itemName(g.item)}` };
  return best;
}
function interact(o) {
  if (!o) return;
  switch (o.kind) {
    case 'ground': pickUp(o.g); break;
    case 'npc': AUDIO.sfx('uiok'); UI.openNpc(o.id); break;
    case 'tele': AUDIO.sfx('uiok'); UI.openTeleporter(); break;
    case 'return': AUDIO.sfx('tele'); restoreField(); break;
    case 'portal': AUDIO.sfx('tele'); stashField(); enterHub({ keepStash: true }); break;
    case 'home': AUDIO.sfx('tele'); enterHub(); break;
    case 'next':
      if (o.locked) { HUD.toast('The teleporter is sealed. Defeat the monsters guarding this room.', '#ff9090'); AUDIO.sfx('error'); break; }
      descend(GAME.area, GAME.floorIdx + 1, GAME.diff); break;
    case 'capsule': {
      const c = GAME.char, key = LV.area + GAME.floorIdx, lines = STORY.capsules[LV.area];
      const idx = Math.min(lines.length - 1, o.idx);
      c.prog.capsules[key] = Math.max(c.prog.capsules[key] || 0, idx + 1);
      AUDIO.sfx('capsule'); UI.dialog('Message capsule', [lines[idx]]);
      o.obj.userData.core.material.opacity = 0.4;
      break;
    }
    case 'rescue': {
      const q = GAME.char.quest.active;
      if (q && q.type === 'rescue' && !q.done) { UI.dialog(q.npcName, [rnd.pick(['Oh thank goodness, a warden! I\'ll teleport up right away.', 'I thought nobody was coming. Thank you!', 'Tell the Bureau I\'m alive. And tell them to send more of you.'])]); questDone(q); FX.teleIn(o.x, o.z, 0x60d8ff); LV.group.remove(o.obj); LV.objects.splice(LV.objects.indexOf(o), 1); }
      break;
    }
    case 'ally': {
      if (invCount(GAME.char.inv, 'reviveShot')) { invTake(GAME.char.inv, 'reviveShot', 1); reviveActor(o.a, 0.5); }
      else { GAME.holdRevive = o.a; HUD.toast(`Hold to revive ${o.a.name}...`, '#a0ffc0'); }
      break;
    }
  }
}

// ---------- quests ----------
function unlockedAreas(c, diff) { const out = []; for (let i = 0; i < AREA_ORDER.length; i++) { if (i === 0 || c.prog.bosses[diff][AREA_ORDER[i - 1]]) out.push(AREA_ORDER[i]); } return out; }
const QUEST_GIVERS = ['the colony survey office', 'a worried family', 'Dr. Pell', 'the security chief', 'an anonymous client', 'the mining bureau', 'the ship\'s chaplain'];
function genQuest(c, rng = rnd) {
  const diff = c.prog.diff, areas = unlockedAreas(c, diff), area = rng.pick(areas.slice(-2));
  const A = AREAS[area], floor = rng.int(0, 1), lvl = A.lvl + floor * 2 + DIFFS[diff].lvl;
  const type = rng.pick(['hunt', 'hunt', 'bounty', 'retrieve', 'rescue', 'clear']);
  const q = { id: newUid(), type, area, floor, diff, got: 0, done: false, giver: rng.pick(QUEST_GIVERS), lvl };
  const where = `${A.name} ${floor + 1}`;
  const base = Math.round((80 + lvl * lvl * 3 + lvl * 30));
  if (type === 'hunt') { const t = rng.pick(A.floors[floor]); q.target = t; q.n = rng.int(8, 14); q.title = `Cull the ${ENEMIES[t].name}s`; q.desc = `Defeat ${q.n} ${ENEMIES[t].name}s in ${A.name}. They've been wandering too close to the landing zones.`; q.reward = base * 2; }
  if (type === 'bounty') { const t = rng.pick(A.floors[floor].filter((id) => !ENEMIES[id].rare)); q.target = t; q.targetName = rng.pick(UNIQUE_PREFIX) + ' ' + rng.pick(UNIQUE_TITLE); q.title = `Bounty: ${q.targetName}`; q.desc = `A monstrous ${ENEMIES[t].name} called ${q.targetName} prowls ${where}. Bring it down.`; q.reward = base * 3; }
  if (type === 'retrieve') { q.itemName = rng.pick(['Survey Data Core', 'Colonist\'s Locket', 'Sealed Sample Case', 'Encrypted Log Drive', 'Field Medkit Prototype']); q.title = `Recover the ${q.itemName}`; q.desc = `${q.giver[0].toUpperCase() + q.giver.slice(1)} lost a ${q.itemName} somewhere in ${where}. Find it.`; q.reward = base * 2.5; }
  if (type === 'rescue') { q.npcName = rng.pick(['Tomas Reyes', 'Ada Kell', 'Yuri Brandt', 'Noor Hadi', 'Pia Lund', 'Elias Mott']); q.title = `Rescue ${q.npcName}`; q.desc = `A survivor's beacon was picked up in ${where}: ${q.npcName}, alive but trapped. Get to them.`; q.reward = base * 2.5; }
  if (type === 'clear') { q.title = `Sweep ${where}`; q.desc = `Clear every room on ${where} so the survey drones can get through.`; q.reward = base * 3; }
  q.reward = Math.round(q.reward); q.xp = Math.round(xpToNext(Math.max(1, lvl)) * 0.35);
  return q;
}
function ensureQuestOffers() { const c = GAME.char; while (c.quest.offers.length < 3) c.quest.offers.push(genQuest(c)); }
function questKill(e) {
  const q = GAME.char.quest.active; if (!q || q.done || LV.area !== q.area || GAME.diff !== q.diff) return;
  if (q.type === 'hunt' && e.defId === q.target) { q.got++; HUD.toast(`${q.title}: ${q.got}/${q.n}`, '#ffd080'); if (q.got >= q.n) questDone(q); }
  if (q.type === 'bounty' && e.questTarget) questDone(q);
}
GAME.questPickup = function (it) { const q = GAME.char.quest.active; if (q && q.type === 'retrieve' && !q.done) { AUDIO.sfx('rare'); questDone(q); } };
function checkClearQuest() {
  const q = GAME.char.quest.active; if (!q || q.done || q.type !== 'clear' || LV.area !== q.area || GAME.floorIdx !== q.floor || GAME.diff !== q.diff) return;
  const left = LV.rooms.filter((r) => r.type !== 'start' && !r.cleared).length;
  if (left === 0) questDone(q); else if (left <= 3) HUD.toast(`${left} room${left > 1 ? 's' : ''} left to clear`, '#ffd080');
}
function questDone(q) { q.done = true; AUDIO.sfx('levelup'); HUD.banner('Quest complete', q.title + ' · return to the Bureau'); }
GAME.autoAssign = function (it) {
  // put the first medgels or psi cells you find on an empty hotbar slot
  const c = GAME.char; if (it.kind !== 'tool') return;
  if (['medgel1', 'medgel2', 'medgel3', 'psicell1', 'psicell2', 'psicell3'].includes(it.base) && !c.hotbar.some((h) => h && h.t === 'item' && h.id === it.base)) {
    const i = c.hotbar.findIndex((h) => !h); if (i >= 0 && invCount(c.inv, it.base) === it.n) c.hotbar[i] = { t: 'item', id: it.base };
  }
};

// ---------- sprites ----------
function feedSprite(c, toolId) {
  const m = c.sprite, g = SPRITE_FEED[toolId];
  if (!g) return 'Your sprite won\'t eat that.';
  if (m.feedT > 0) return `Your sprite isn't hungry yet (${Math.ceil(m.feedT)}s).`;
  if (!invTake(c.inv, toolId, 1)) return 'You have none.';
  const lvBefore = spriteLevel(m);
  m.def += g[0]; m.pow += g[1]; m.dex += g[2]; m.mind += g[3];
  m.syn = clamp(m.syn + g[4], 0, 120); m.iq = clamp(m.iq + g[5], 0, 200);
  m.feedT = SPRITE_FEED_CD;
  // sprites level up to 200
  const tot = Math.floor(m.def) + Math.floor(m.pow) + Math.floor(m.dex) + Math.floor(m.mind);
  if (tot > 200) { const k = 200 / tot; m.def *= k; m.pow *= k; m.dex *= k; m.mind *= k; }
  const lv = spriteLevel(m);
  let msg = `Your sprite ate the ${TOOLS[toolId].name}.`;
  const evo = spriteEvolve(c, lvBefore, lv);
  if (evo) msg += ` It evolved into ${SPRITE_FORMS[m.form].name}!`;
  else if (lv > lvBefore) msg += ` Level ${lv}.`;
  if (PL) refreshPartyActor(PL, false);
  return msg;
}
const spriteLevel = (m) => Math.floor(m.def) + Math.floor(m.pow) + Math.floor(m.dex) + Math.floor(m.mind);
function spriteEvolve(c, before, after) {
  const m = c.sprite;
  let changed = false;
  if (before < SPRITE_EVOLVE[0] && after >= SPRITE_EVOLVE[0]) { m.form = { vanguard: 'flint', marksman: 'glint', psion: 'murmur' }[c.role]; changed = true; }
  if (before < SPRITE_EVOLVE[1] && after >= SPRITE_EVOLVE[1]) { const top = ['def', 'pow', 'dex', 'mind'].sort((a, b) => m[b] - m[a])[0]; m.form = { def: 'bastion', pow: 'fury', dex: 'zephyr', mind: 'oracle' }[top]; changed = true; }
  if (before < SPRITE_EVOLVE[2] && after >= SPRITE_EVOLVE[2]) { m.form = { vanguard: 'paragon', marksman: 'polaris', psion: 'nimbus' }[c.role]; changed = true; }
  if (changed) {
    const pb = SPRITE_FORMS[m.form].pb; if (pb && !m.pbs.includes(pb) && m.pbs.length < 3) m.pbs.push(pb);
    AUDIO.sfx('levelup');
    if (GAME.spriteObj && PL) { R.root.remove(GAME.spriteObj); GAME.spriteObj = makeSprite(m.form); R.root.add(GAME.spriteObj); FX.burst(PL.x, 2, PL.z, SPRITE_FORMS[m.form].color, 30, 3, 1, 0.5); }
  }
  return changed;
}

// ---------- per-frame field logic ----------
function updateGame(dt) {
  GAME.time += dt;
  for (let i = GAME.timers.length - 1; i >= 0; i--) { const t = GAME.timers[i]; t.t -= dt; if (t.t <= 0) { GAME.timers.splice(i, 1); t.fn(); } }
  const c = GAME.char;
  c.playTime += dt;
  if (c.sprite.feedT > 0) c.sprite.feedT -= dt;
  if (!PL) return;
  // player
  updatePlayer(dt);
  for (const a of [...ALLIES]) updateAlly(a, dt);
  for (const e of [...ENTS]) {
    if (e.kind === 'enemy') e.boss ? updateBoss(e, dt) : updateEnemy(e, dt);
    else if (e.kind === 'summon') updateSummon(e, dt);
  }
  separateActors(dt);
  for (const e of ENTS) if (e.kind !== 'box' && !e.static && !e.burrowed) pushOut(e, e.r);
  updateProjectiles(dt); updateZones(dt); updateTraps(dt); updateWaves(dt); updateGround(dt);
  // sprite floats over the shoulder
  if (GAME.spriteObj) {
    const mx = PL.x - Math.sin(PL.yaw) * 0.6 + Math.cos(PL.yaw) * 0.55, mz = PL.z - Math.cos(PL.yaw) * 0.6 - Math.sin(PL.yaw) * 0.55;
    const k = 1 - Math.exp(-dt * 6), o = GAME.spriteObj;
    o.position.x = lerp(o.position.x, mx, k); o.position.z = lerp(o.position.z, mz, k); o.position.y = 2.2 + Math.sin(GAME.time * 2) * 0.12;
    o.rotation.y += dt * 1.5;
  }
  if (GAME.mode === 'field') {
    const rm = roomAt(PL.x, PL.z);
    if (rm !== GAME.curRoom) { GAME.curRoom = rm; if (rm && alive(PL)) onEnterRoom(rm); }
    updateRooms(dt);
    GAME.seenT = (GAME.seenT || 0) - dt; if (GAME.seenT <= 0) { GAME.seenT = 0.2; markSeen(LV, PL.x, PL.z); }
    // combat intensity for the music
    const fighting = ENTS.some((e) => e.team === 1 && !e.dead && !e.box && e.aggro && dist2(e.x, e.z, PL.x, PL.z) < 20 * 20);
    GAME.inCombat = fighting;
    AUDIO.setIntensity(fighting ? 1 : 0);
    // all down: carried home
    const party = [PL, ...ALLIES];
    if (party.every((p) => p.downed)) { GAME.wipeT = (GAME.wipeT || 0) + dt; if (GAME.wipeT > 3) { GAME.wipeT = 0; returnToShipDefeated(); return; } } else GAME.wipeT = 0;
    // reviving a fallen ally by holding interact
    if (GAME.holdRevive && GAME.holdRevive.downed && alive(PL) && dist2(PL.x, PL.z, GAME.holdRevive.x, GAME.holdRevive.z) < 2.4 * 2.4 && Input.held('interact')) {
      GAME.reviveT = (GAME.reviveT || 0) + dt; if (GAME.reviveT > 2) { reviveActor(GAME.holdRevive, 0.35); GAME.holdRevive = null; GAME.reviveT = 0; }
    } else { GAME.reviveT = 0; if (!Input.held('interact')) GAME.holdRevive = null; }
  } else if (GAME.mode === 'hub') {
    updateHub(LV, dt, GAME.time);
    GAME.inCombat = false; AUDIO.setIntensity(0);
  }
  for (const o of LV.objects) {
    if (o.obj && o.obj.userData.spin) { o.obj.userData.spin.rotation.z += dt * 2; o.obj.userData.ring.rotation.y += dt; }
    if (o.obj && o.obj.userData.ring && o.kind !== 'portal' && o.kind !== 'return') o.obj.userData.ring.rotation.z += dt;
    if (o.obj && o.obj.userData.core) o.obj.userData.core.rotation.y += dt;
    if (o.rig) animHumanoid(o.rig, { t: GAME.time, move: 0, state: 'talk' }, dt);
  }
  updateCutaway(LV, PL.x, PL.z, dt);
}
function setBodyState(s) { document.body.dataset.state = s; }
