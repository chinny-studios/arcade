// 13_mission: building a mission (level, sky, people, pickups, loadout), objectives, and the end of a mission.
const OBJ = { list: [], exitNag: 0 };

function startMission(m, d) {
  G.mission = m; G.diff = d;
  const M = MISSIONS[m], def = M.level;
  clearScene(scene); clearScene(skyScene); clearScene(vmScene);
  stopAllLoops();
  PICKUPS.length = 0; MINES.list.length = 0; TIMERS.length = 0; DEBRIS.length = 0; G.actors = []; G.alarm = null; UNI.uAlarm.value = 0;
  AI.reinfAlive = 0; AI.reinfT = 0;
  parseLevel(def);
  prepLights();
  spawnProps();
  buildLightGrid();
  buildLevelGeometry();
  buildDoors();
  buildSky(def.sky);
  initFx();
  for (const it of L.items) spawnPickup({ item: it.item }, it.x, it.y, it.z);
  spawnActors();
  UNI.uFogCol.value.setRGB(...hex3(def.fog[0])); UNI.uFogNear.value = def.fog[1]; UNI.uFogFar.value = def.fog[2];
  const p = G.player = newPlayer(L.start, def.startYaw || 0);
  const lo = M.loadout(d);
  for (const id of lo.weapons) giveWeapon(id, 0);
  for (const k in lo.ammo) p.ammo[k] = Math.round(lo.ammo[k] * (k === 'mines' ? 1 : DIFF.ammoMul[d]));
  for (const id of p.weapons) { const W = WEAPONS[id]; if (W.mag) { const take = Math.min(W.mag, p.ammo[W.ammo] || 0); p.mag[id] = take; p.ammo[W.ammo] -= take; } }
  for (const it of lo.items || []) p.items[it] = true;
  p.bugs = p.weapons.includes('bug') ? 1 : 0;
  p.cur = Math.max(0, p.weapons.indexOf('pk9'));
  buildViewmodel(curWeapon().id);
  OBJ.list = M.objectives.filter((o) => o.diffs.includes(d)).map((o, k) => Object.assign({}, o, { letter: 'abcdefgh'[k], status: o.type === 'noAlarm' || o.type === 'protect' ? 'ok' : 'open' }));
  G.stats = { shots: 0, hits: 0, head: 0, body: 0, limb: 0, hat: 0, kills: 0, civKilled: 0 };
  G.time = 0; G.ended = false; G.run = (G.run || 0) + 1; G.intro = null;
  HUD.msgs = []; HUD.hurt = 0; HUD.flash = 0; HUD.showBars = 0;
  // label photo targets for the message
  for (const pr of L.props) if (pr.id === 'payload') pr.label = 'HELIOS payload';
  playMusic(M.music);
  updateCamera(0);
  return { mission: M.id, diff: DIFFS[d], actors: G.actors.length, props: L.props.length, objectives: OBJ.list.map((o) => o.letter + ' ' + o.text) };
}

// ---------------------------------------------------------------- objectives
function objectiveEvent(kind, data) {
  if (!OBJ.list.length || G.ended) return false;
  let any = false;
  for (const o of OBJ.list) {
    if (o.status !== 'open' && !(o.type === 'protect' || o.type === 'noAlarm')) continue;
    switch (o.type) {
      case 'photo': if (kind === 'photo' && data.id === o.target) { completeObjective(o); any = true; } break;
      case 'bug': if (kind === 'bug' && data.id === o.target) { completeObjective(o); any = true; } break;
      case 'destroy':
        if (kind === 'destroy' && o.targets.includes(data.id)) {
          const left = o.targets.filter((id) => { const pr = L.props.find((q) => q.id === id); return pr && !pr.dead; }).length;
          if (!left) completeObjective(o);
          else hudMsg((o.targets.length - left) + ' of ' + o.targets.length + ' destroyed');
          any = true;
        }
        break;
      case 'item': if (kind === 'item' && data === o.item) { completeObjective(o); any = true; } break;
      case 'kill': if (kind === 'kill' && data.id === o.target) { completeObjective(o); any = true; } break;
      case 'protect': if (kind === 'kill' && data.civilian && o.status === 'ok' && G.stats.civKilled > o.max) failObjective(o); break;
      case 'noAlarm': if (kind === 'alarm' && o.status === 'ok') failObjective(o); break;
    }
  }
  return any;
}
function completeObjective(o) {
  if (o.status === 'done') return;
  o.status = 'done';
  hudMsg('Objective ' + o.letter + ': completed', true);
  sfx('objective');
}
function failObjective(o) {
  o.status = 'failed';
  hudMsg('Objective ' + o.letter + ': FAILED', true);
  sfx('failed');
}
function tryExit() {
  if (G.ended) return;
  const open = OBJ.list.filter((o) => o.type !== 'exit' && o.status === 'open');
  if (open.length) {
    if (G.time - OBJ.exitNag > 4) { OBJ.exitNag = G.time; hudMsg('Objectives incomplete'); sfx('deny'); }
    return;
  }
  for (const o of OBJ.list) if (o.type === 'exit') o.status = 'done';
  missionComplete();
}
function missionComplete() {
  if (G.ended) return;
  G.ended = true;
  const failed = OBJ.list.some((o) => o.status === 'failed');
  for (const o of OBJ.list) if (o.status === 'ok') o.status = 'done';
  stopAllLoops();
  if (!failed) {
    const key = G.mission + '_' + G.diff;
    SAVE.done[key] = true;
    if (!SAVE.best[key] || G.time < SAVE.best[key]) SAVE.best[key] = G.time;
    SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(MISSIONS.length, G.mission + 2));
    writeSave();
  }
  const run = G.run;
  setTimeout(() => { if (G.run === run) showEnd(!failed, failed ? 'An objective was failed' : null); }, 600);
  playMusic(failed ? 'lose' : 'win');
}
function missionFailed(why) {
  if (G.ended) return;
  G.ended = true;
  stopAllLoops();
  playMusic('lose');
  const run = G.run;
  setTimeout(() => { if (G.run === run && G.state !== 'select' && G.state !== 'title') showEnd(false, why); }, 2600);
}

// ---------------------------------------------------------------- sky and far scenery
function buildSky(kind) {
  const add = (mesh, follow = true, order = 0) => { mesh.userData.follow = follow; mesh.renderOrder = order; mesh.frustumCulled = false; skyScene.add(mesh); return mesh; };
  if (kind === 'steppe') {
    const zen = [0.38, 0.55, 0.78], hor = hex3(0xd8cdb0);
    const g = new Geo();
    g.lit = (x, y) => { const t = clamp(y / 260, 0, 1); return mix3(hor, zen, Math.pow(t, 0.6)); };
    g.sphere(0, 0, 0, 400, 16, 10, () => TILE.white, 1, 1, true);
    add(g.mesh(MAT.sky), true, 0);
    const c = new Geo(); c.tint = [1, 0.98, 0.94];
    c.sphere(0, -40, 0, 380, 16, 5, () => TILE.clouds, 8, 2, true);
    const cm = add(c.mesh(MAT.skyAlpha), true, 1); cm.userData.spin = 0.003;
    // distant mountains: a ring of peaks fading into the haze
    const mg = new Geo(), R0 = 330, N = 36;
    mg.lit = (x, y) => mix3([0.42, 0.38, 0.33], hor, clamp(0.55 + y / 120, 0, 1));
    for (let k = 0; k < N; k++) {
      const a0 = k / N * TAU, a1 = (k + 1) / N * TAU, h0 = 30 + 40 * fbm(k * 2, 3, 5, 4), h1 = 30 + 40 * fbm(((k + 1) % N) * 2, 3, 5, 4);
      mg.quad([Math.sin(a1) * R0, -20, Math.cos(a1) * R0], [Math.sin(a0) * R0, -20, Math.cos(a0) * R0], [Math.sin(a0) * R0, h0, Math.cos(a0) * R0], [Math.sin(a1) * R0, h1, Math.cos(a1) * R0], [0, 2, 1.5, 2, 1.5, 0, 0, 0], TILE.cliff, [-Math.sin(a0), 0, -Math.cos(a0)]);
    }
    add(mg.mesh(MAT.sky), true, 2);
    addSun([0.5, 0.75, 0.35], 40);
  } else if (kind === 'space' || kind === 'moon') {
    const g = new Geo();
    g.sphere(0, 0, 0, 400, 24, 12, () => TILE.stars, 44, 22, true);
    add(g.mesh(MAT.sky), true, 0);
    if (kind === 'space') {
      const e = new Geo(); e.lit = (x, y, z, nx, ny, nz) => { const d = Math.max(0, nx * 0.6 + ny * 0.5 + nz * 0.2); return [0.15 + d * 1.1, 0.15 + d * 1.1, 0.2 + d * 1.1]; };
      e.sphere(0, 0, 0, 170, 20, 12, (i) => TILE['earth' + (i % 4)], 4, 1);
      const em = add(e.mesh(MAT.sky), true, 1);
      em.userData.offset = new THREE.Vector3(-60, -150, -280); em.userData.spin = 0.01;
      addSun([0.7, 0.3, 0.6], 60);
    } else {
      addSun([-0.4, 0.35, -0.7], 50);
      // lunar ground: lies in the world, under the base, out to the horizon
      const lg = new Geo();
      lg.lit = (x, y, z) => { const n = tnoise(x * 0.05, z * 0.05, 64, 3); return [0.55 + n * 0.3, 0.55 + n * 0.3, 0.56 + n * 0.3]; };
      const S = 24, R = 260, cx = 48, cz = 34;
      for (let j = -S / 2; j < S / 2; j++) for (let i = -S / 2; i < S / 2; i++) {
        const x0 = cx + i * R * 2 / S, z0 = cz + j * R * 2 / S, x1 = x0 + R * 2 / S, z1 = z0 + R * 2 / S;
        const hy = (x, z) => -0.25 - Math.max(0, Math.hypot(x - cx, z - cz) - 70) * 0.05 + tnoise(x * 0.02, z * 0.02, 64, 9) * 3 * clamp((Math.hypot(x - cx, z - cz) - 70) / 60, 0, 1);
        lg.quad([x0, hy(x0, z0), z0], [x0, hy(x0, z1), z1], [x1, hy(x1, z1), z1], [x1, hy(x1, z0), z0], [x0 / 8, z0 / 8, x0 / 8, z1 / 8, x1 / 8, z1 / 8, x1 / 8, z0 / 8], TILE.regolith, [0, 1, 0]);
      }
      const gm = lg.mesh(MAT.levelNoFog); scene.add(gm);
      // crater rim mountains
      const mg = new Geo(), R0 = 300, N = 40;
      mg.lit = (x, y) => [0.35 + y / 200, 0.35 + y / 200, 0.37 + y / 200];
      for (let k = 0; k < N; k++) {
        const a0 = k / N * TAU, a1 = (k + 1) / N * TAU, h0 = 10 + 35 * fbm(k * 3, 7, 9, 4), h1 = 10 + 35 * fbm(((k + 1) % N) * 3, 7, 9, 4);
        mg.quad([Math.sin(a1) * R0, -15, Math.cos(a1) * R0], [Math.sin(a0) * R0, -15, Math.cos(a0) * R0], [Math.sin(a0) * R0, h0, Math.cos(a0) * R0], [Math.sin(a1) * R0, h1, Math.cos(a1) * R0], [0, 2, 1.5, 2, 1.5, 0, 0, 0], TILE.regolith, [-Math.sin(a0), 0, -Math.cos(a0)]);
      }
      add(mg.mesh(MAT.sky), true, 2);
    }
  }
}
function addSun(dir, size) {
  const g = new Geo(), d = new THREE.Vector3(...dir).normalize().multiplyScalar(380);
  g.quad([-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 0.999, 0.999, 0.999, 0.999, 0, 0, 0], TILE.sun, [0, 0, 1]);
  const m = new THREE.Mesh(g.build(), MAT.addNoFog);
  m.scale.setScalar(size);
  m.userData.follow = true; m.userData.offset = d; m.userData.billboard = true; m.renderOrder = 3; m.frustumCulled = false;
  skyScene.add(m);
}
function updateSky(dt) {
  for (const c of skyScene.children) {
    if (c.userData.spin) c.rotation.y += c.userData.spin * dt;
    if (c.userData.offset) { c.position.copy(camera.position).add(c.userData.offset); c.userData.follow = false; }
    if (c.userData.billboard) c.quaternion.copy(camera.quaternion);
  }
}
