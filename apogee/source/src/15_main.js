// 15_main: boot, the frame loop (optionally locked to 20 fps like the cartridge), the title scene and the #debug
// test hook window.AP.

// The mission intro: the camera starts behind and above the agent and glides down to their eyes.
function startIntro() {
  const p = G.player, ex = p.x, ey = p.y + p.eye, ez = p.z;
  const bx = -fwdX(p.yaw), bz = -fwdZ(p.yaw), d = new THREE.Vector3(bx * 0.75, 0.55, bz * 0.75).normalize();
  const h = rayWorld(ex, ey, ez, d.x, d.y, d.z, 16);
  const dist = Math.max(1.5, Math.min(14, (h ? h.t : 16) - 0.6));
  G.intro = { t: 0, len: 2.2 + dist * 0.12, from: new THREE.Vector3(ex + d.x * dist, ey + d.y * dist, ez + d.z * dist) };
}
function updateIntro(dt) {
  const I = G.intro, p = G.player;
  I.t += dt;
  const pad = pollPad();
  const skip = INPUT.pressed.size || INPUT.lmb || (pad && pad.b.some((x) => x));
  if (I.t >= I.len || (skip && I.t > 0.3)) { G.intro = null; INPUT.lmb = false; updateCamera(0); return; }
  const s = smooth(clamp(I.t / I.len, 0, 1)), eye = new THREE.Vector3(p.x, p.y + p.eye, p.z);
  camera.position.lerpVectors(I.from, eye, s);
  const look = new THREE.Vector3(p.x + fwdX(p.yaw) * 6 * s, p.y + 1.2 + (p.eye - 1.2) * s, p.z + fwdZ(p.yaw) * 6 * s);
  camera.lookAt(look);
  camera.updateMatrixWorld(true);
}
function step(dt) {
  G.time += dt;
  runTimers();
  if (G.intro) { updateIntro(dt); updateActors(dt); updateDoors(dt); updateFx(dt); updateSky(dt); INPUT.pressed.clear(); return; }
  updatePlayer(dt);
  updateActors(dt);
  updateDoors(dt);
  updateMines(dt);
  updatePickups(dt);
  updateDebris(dt);
  updateFx(dt);
  updateCamera(dt);
  updateSky(dt);
  updateViewmodel(dt);
  INPUT.pressed.clear();
}
function draw(dt) {
  drawFx();
  renderFrame(G.state === 'play' && !G.player.dead && !G.intro);
  drawHud(dt);
}

// ---------------------------------------------------------------- title scene: HELIOS turning over the Earth
const TITLE = { on: false, sat: null, t: 0 };
function showTitleScene() {
  if (TITLE.on) return;
  TITLE.on = true;
  clearScene(scene); clearScene(skyScene); clearScene(vmScene); stopAllLoops();
  G.player = null; G.actors = [];
  UNI.uFogCol.value.setRGB(0, 0, 0); UNI.uFogNear.value = 200; UNI.uFogFar.value = 900; UNI.uAlarm.value = 0;
  buildSky('space');
  const g = new Geo(), T = TILE;
  g.cyl(0, -1.2, 0, 0.95, 2.4, 8, T.gold, T.metal, 2);
  g.cyl(0, 1.2, 0, 0.95, 0.5, 8, T.metal, null, 2, false, 0.4);
  g.cyl(0, 1.7, 0, 0.08, 0.9, 4, T.chrome, T.chrome, 1);
  for (let k = 0; k < 6; k++) {
    const a0 = k / 6 * TAU, a1 = (k + 1) / 6 * TAU, r0 = 0.95, r1 = 3.2;
    g.quad([Math.sin(a0) * r0, 1.1, Math.cos(a0) * r0], [Math.sin(a1) * r0, 1.1, Math.cos(a1) * r0], [Math.sin(a1) * r1, 1.9, Math.cos(a1) * r1], [Math.sin(a0) * r1, 1.9, Math.cos(a0) * r1], [0, 1, 1, 1, 1, 0, 0, 0], T.mirror, [0, 1, 0]);
    g.quad([Math.sin(a0) * r1, 1.9, Math.cos(a0) * r1], [Math.sin(a1) * r1, 1.9, Math.cos(a1) * r1], [Math.sin(a1) * r0, 1.1, Math.cos(a1) * r0], [Math.sin(a0) * r0, 1.1, Math.cos(a0) * r0], [0, 1, 1, 1, 1, 0, 0, 0], T.solar, [0, -1, 0]);
  }
  g.box(-3.6, -0.4, -0.04, -0.95, 0.2, 0.04, T.solar, 0);
  g.box(0.95, -0.4, -0.04, 3.6, 0.2, 0.04, T.solar, 0);
  const mat = makeMat({ dyn: true });
  mat.uniforms.uAmb.value.setRGB(0.25, 0.25, 0.3); mat.uniforms.uSunDir.value.set(0.7, 0.3, 0.6).normalize(); mat.uniforms.uSunCol.value.setRGB(1.2, 1.15, 1.0);
  TITLE.sat = new THREE.Mesh(g.build(), mat);
  TITLE.sat.position.set(1.8, 0.5, -9);
  scene.add(TITLE.sat);
  camera.position.set(0, 0, 0); camera.rotation.set(-0.05, 0, 0); camera.fov = VIEW.fov; camera.updateProjectionMatrix();
}
function animateTitle(dt) {
  TITLE.t += dt;
  if (TITLE.sat) { TITLE.sat.rotation.y += dt * 0.25; TITLE.sat.rotation.z = Math.sin(TITLE.t * 0.3) * 0.25; TITLE.sat.rotation.x = 0.35 + Math.sin(TITLE.t * 0.2) * 0.1; }
  camera.rotation.set(-0.05 + Math.sin(TITLE.t * 0.1) * 0.03, Math.sin(TITLE.t * 0.07) * 0.08, 0);
  camera.updateMatrixWorld(true);
  updateSky(dt);
}

// ---------------------------------------------------------------- loop
let lastT = 0, accT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  let dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (G.state === 'play') {
    TITLE.on = false;
    if (G.frozen) { draw(0); return; }
    if (SET.fps === 'n64') { accT += dt; if (accT < 1 / 20) return; dt = Math.min(accT, 0.1); accT = 0; }
    step(dt);
    draw(dt);
  } else if (G.state !== 'boot') {
    pollMenuPad();
    if (TITLE.on) { animateTitle(dt); renderFrame(false); }
    else if (G.player) { renderFrame(false); }
  }
}

function boot() {
  buildAtlas();
  initRenderer();
  initMaterials();
  initInput();
  $('title').onclick = () => { initAudio(); toSelect(); };
  setState('title');
  showTitleScene();
  requestAnimationFrame(frame);
  if (DEBUG) installDebug();
  // the first click or key unlocks audio; start the title music then
  const kick = () => { initAudio(); if (AU.pending && AU.ctx) { const n = AU.pending; AU.pending = null; playMusic(n); } };
  window.addEventListener('pointerdown', kick); window.addEventListener('keydown', kick);
  playMusic('title');
}

// ---------------------------------------------------------------- debug hook (#debug)
function installDebug() {
  const AP = {
    start(m = 0, d = 1) { TITLE.on = false; const r = startMission(m, d); setState('play'); return r; },
    sim(s, fps = 30) { const n = Math.round(s * fps); for (let k = 0; k < n; k++) { if (G.state !== 'play') break; step(1 / fps); } return AP.state(); },
    tp(c, r, yaw) { const p = G.player; p.x = cx2(c); p.z = cx2(r); const i = idxAt(p.x, p.z); p.y = i >= 0 ? L.fh[i] : 0; if (yaw !== undefined) p.yaw = yaw; p.vx = p.vz = 0; updateCamera(0); return [p.x, p.y, p.z]; },
    tpXZ(x, z, yaw) { const p = G.player; p.x = x; p.z = z; const i = idxAt(x, z); p.y = i >= 0 ? L.fh[i] : 0; if (yaw !== undefined) p.yaw = yaw; updateCamera(0); },
    look(yaw, pitch = 0) { G.player.yaw = yaw; G.player.pitch = pitch; updateCamera(0); },
    aimAt(x, y, z) { const p = G.player; p.yaw = yawTo(x - p.x, z - p.z); p.pitch = Math.atan2(y - (p.y + p.eye), Math.hypot(x - p.x, z - p.z)); updateCamera(0); },
    press(code) { INPUT.pressed.add(code); INPUT.keys[code] = true; step(1 / 30); INPUT.keys[code] = false; },
    hold(code, s) { INPUT.keys[code] = true; AP.sim(s); INPUT.keys[code] = false; },
    fire(n = 1) { for (let k = 0; k < n; k++) { G.player.fireT = 0; G.player.switchT = 0; G.player.reloadT = 0; playerFire(); step(1 / 30); } return G.stats; },
    give(id, n) { if (WEAPONS[id]) giveWeapon(id, n || 60); else G.player.items[id] = true; if (id === 'bug') G.player.bugs = 1; return G.player.weapons; },
    select(id) { const p = G.player; const k = p.weapons.indexOf(id); if (k >= 0) { p.cur = k; p.next = null; p.switchT = 0; buildViewmodel(id); } return curWeapon().id; },
    all() { for (const id of ['tk33', 'vektor', 'ar62', 'sturm', 'zeus', 'mines', 'camera', 'bug']) giveWeapon(id, 200); G.player.bugs = 1; G.player.ammo.mines = 10; for (const k in ITEMS) G.player.items[k] = true; G.player.armor = 100; return G.player.weapons; },
    god(on = true) { G.god = on; return on; },
    freeze(on = true) { G.frozen = on; return on; },
    peace(on = true) { G.peace = on; for (const a of G.actors) if (on) { a.state = a.patrol ? 'patrol' : 'idle'; a.sees = false; } return on; },
    killAll(civ = false) { for (const a of G.actors) if (!a.dead && (civ || !a.civilian)) damageActor(a, 1e4, 'torso', 'player', {}); return G.actors.filter((a) => !a.dead).length; },
    spawn(type, c, r) { return makeActor(type, cx2(c), cx2(r), irand(1, 999), {}).id; },
    alarm() { triggerAlarm(null); return G.alarm; },
    render() { updateCamera(0); updateSky(0); updateViewmodel(0); draw(0); return true; },
    shot() { return AP.render(); },
    state() {
      const p = G.player;
      return { state: G.state, t: +G.time.toFixed(2), hp: p && Math.round(p.hp), armor: p && Math.round(p.armor), pos: p && [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], weapon: p && curWeapon().id,
        alive: G.actors.filter((a) => !a.dead).length, alerted: G.actors.filter((a) => !a.dead && !['idle', 'patrol'].includes(a.state)).length, alarm: !!(G.alarm && G.alarm.on),
        objectives: OBJ.list.map((o) => o.letter + ':' + o.status), ended: G.ended };
    },
    objectives() { return OBJ.list.map((o) => ({ letter: o.letter, type: o.type, status: o.status, text: o.text })); },
    complete() { for (const o of OBJ.list) if (o.status === 'open' && o.type !== 'exit') completeObjective(o); return AP.objectives(); },
    useNow() { useAction(); step(1 / 30); return G.player.use ? G.player.use.ob.id : null; },
    // Breadth-first check that every objective target, item and exit can be reached on foot from the start
    // (doors count as open; locked doors count as open only if their key exists somewhere in the level).
    reach() {
      const keys = new Set();
      for (const it of L.items) keys.add(it.item);
      for (const s of L.spawns) if (s.drops) keys.add(s.drops);
      const seen = new Uint8Array(L.W * L.H), q = [idxAt(L.start.x, L.start.z)];
      seen[q[0]] = 1;
      while (q.length) {
        const i = q.shift(), c = i % L.W, r = (i / L.W) | 0;
        for (const [dc, dr] of N4) {
          if (!inMap(c + dc, r + dr)) continue;
          const j = cellIdx(c + dc, r + dr), t = L.type[j];
          if (seen[j]) continue;
          if (t !== T_FLOOR && t !== T_DOOR) continue;
          if (t === T_DOOR && L.doorAt.get(j).locked && !keys.has(L.doorAt.get(j).locked)) continue;
          if (L.blocked[j] && !L.exits.has(j)) continue;
          if (Math.abs(L.fh[j] - L.fh[i]) > 0.6) continue;
          seen[j] = 1; q.push(j);
        }
      }
      const near = (b) => { const c0 = cellOf(b[0]) - 1, c1 = cellOf(b[3]) + 1, r0 = cellOf(b[2]) - 1, r1 = cellOf(b[5]) + 1; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (inMap(c, r) && seen[cellIdx(c, r)]) return true; return false; };
      const bad = [];
      for (const pr of L.props) if (pr.id && pr.box && !near(pr.box)) bad.push('prop ' + pr.id);
      for (const it of L.items) if (!seen[it.i]) bad.push('item ' + it.item + ' at ' + it.c + ',' + it.r);
      for (const s of L.spawns) if (s.id && !seen[s.i]) bad.push('actor ' + s.id);
      let exitOk = false; for (const e of L.exits) if (seen[e]) exitOk = true;
      if (!exitOk) bad.push('exit');
      for (const a of L.alarms) if (!seen[idxAt(a.front[0], a.front[1])]) bad.push('alarm at ' + a.front.map((v) => v.toFixed(0)));
      return { mission: MISSIONS[G.mission].id, reachable: seen.reduce((s, v) => s + v, 0), bad };
    },
    unlockAll() { G.unlockAll = true; return true; },
    audio() { initAudio(); const names = Object.keys(SFX); for (const n of names) sfx(n); for (const s of Object.keys(SONGS)) { stopMusic(); playMusic(s); scheduleMusic(); } playMusic('steppe'); return { ctx: !!AU.ctx, state: AU.ctx && AU.ctx.state, sfx: names.length, songs: Object.keys(SONGS).length }; },
    f: { startIntro, applyVideoSettings, actorFire, muzzleFlashAt, G, L, OBJ, WEAPONS, MISSIONS, SET, SAVE, PROPS, TILE, camera, scene, renderer, rayWorld, findPath, damageActor, openDoor, explode, setState, toSelect, openWatch, closeWatch, showEnd, startMission, VIEW, UNI, MINES, PICKUPS, AU },
  };
  window.AP = AP;
}

try { boot(); }
catch (e) { console.error(e); const b = $('boot'); if (b) { document.body.dataset.state = 'boot'; b.textContent = 'This game needs WebGL. ' + e.message; } }
