// Creature Feature — the rules of the hunt: kills and their score, the combo, hunger (the only thing that ends a
// run), the town's panic, new people arriving through the night, and starting and ending a run

const HUNGER_MAX = 100;
// hunger drained per second: it creeps up as the night wears on
const drainRate = () => 1.05 + Math.min(1.6, G.t / 60 * 0.065);

function killPerson(v, how, dx, dz, o = {}) {
  if (!v || v.state === 'dead' || v.state === 'gone') return;
  if (v.state === 'incar') pullFromCar(v);
  if (v.inside) { const r = v.inside; r.occ.splice(r.occ.indexOf(v), 1); v.inside = null; }
  setHidden(v, false);
  v.M.root.rotation.set(0, v.yaw, 0);
  makeCorpse(v, how, dx, dz);
  if (!P || G.over) return;
  const F = FOLK[v.type], bonus = new Set(o.bonus || []);
  if (G.t - G.lastKillT < 0.8) bonus.add('multi');
  G.lastKillT = G.t;
  if (v.type === 'scientist') bonus.add('rare');
  let pts = F.pts;
  for (const b of bonus) pts += BONUS[b] ? BONUS[b].pts : 0;
  G.combo = G.comboT > 0 ? Math.min(COMBO_MAX, G.combo + 1) : 1;
  G.comboT = COMBO_TIME;
  G.bestCombo = Math.max(G.bestCombo, G.combo);
  const gain = pts * G.combo;
  G.score += gain; G.kills++; P.kills++;
  G.hunger = Math.min(HUNGER_MAX, G.hunger + P.D.killGain);
  G.panic = Math.min(100, G.panic + 7);
  witness(v.x, v.z);
  AUDIO.sfx(how === 'strangle' ? 'crunch' : 'splat', v.x, v.z);
  AUDIO.scream(v.x, v.z, v.look.f, 0.9, true);
  const near = dist(v.x, v.z, R.camera.position.x, R.camera.position.z);
  if (near < 7 && how !== 'thrown') screenSplat(how === 'smash' || how === 'claw' ? 1 : 0.5);
  G.slow = Math.max(G.slow, 0.1);
  HUD.kill(v, gain, [...bonus].map((b) => BONUS[b] && BONUS[b].label).filter(Boolean), how);
  bus.emit('kill', v, how);
}

bus.on('fed', (v) => {
  if (!P) return;
  G.hunger = Math.min(HUNGER_MAX, G.hunger + P.D.feedGain);
  const g = BONUS.feed.pts * G.combo; G.score += g;
  HUD.toast('Fed  +' + fmtNum(g), 'feed');
  G.fed++;
});
bus.on('escaped', (v) => {
  if (!P || G.over) return;
  G.escaped++;
  if (dist(v.x, v.z, P.x, P.z) < 160) HUD.toast(FOLK[v.type].name + ' got away', 'bad');
});
bus.on('broke', (r, n) => { if (n) HUD.toast(n === 1 ? 'Home invasion!' : `Home invasion! ${n} inside`, 'good'); G.panic = Math.min(100, G.panic + 5); });
bus.on('hid', (v, r) => { if (P && dist(v.x, v.z, P.x, P.z) < 40) HUD.toast(`Someone ran into ${r.name}`, 'info'); });
bus.on('scream', () => { G.panic = Math.min(100, G.panic + 1.5); });
bus.on('howl', (n) => { G.panic = Math.min(100, G.panic + 10); if (n) HUD.toast(n + ' frozen with terror', 'info'); });

function updateRules(dt) {
  if (!P || G.over) return;
  if (P.rise <= 0) G.t += dt;
  G.comboT = Math.max(0, G.comboT - dt);
  if (G.comboT <= 0) G.combo = 1;
  if (!G.god && P.rise <= 0 && P.act !== 'feed' && !(P.act === 'grab' && P.id === 'vampire')) G.hunger -= drainRate() * dt;
  G.panic = Math.max(0, G.panic - dt * 0.7);
  if (G.hunger <= 0) { G.hunger = 0; endRun(); }
  director(dt);
}
// keeps the streets populated: people come out of their houses or drive into town
function director(dt) {
  G.dirT -= dt;
  if (G.dirT > 0) return;
  G.dirT = 3;
  let active = 0;
  for (const v of PEOPLE.list) if (v.state !== 'dead' && v.state !== 'gone') active++;
  for (const c of CARS.list) if (c.arriving) active += c.want;
  const target = 34 + Math.min(10, Math.floor(G.t / 90));
  if (active >= target) return;
  const far = (x, z) => dist(x, z, P.x, P.z) > 55;
  if (chance(0.55)) {
    const homes = TOWN.refuges.filter((r) => r.kind === 'house' && !r.broken && far(r.x, r.z));
    if (homes.length && G.panic < 75) {
      const r = pick(homes), v = spawnPerson(null, r.x + r.nx, r.z + r.nz, { face: yawOf(r.nx, r.nz) });
      if (G.panic > 40 && chance(0.5)) { v.state = 'walk'; goTo(v, { kind: 'look', x: r.ax + r.nx * 3, z: r.az + r.nz * 3 }); say(v, pick(['What was that racket?', 'Hello? Anybody out here?'])); }
      else goTo(v, randomPoi(v, 200));
      return;
    }
  }
  const dests = TOWN.pois.filter((p) => far(p.x, p.z) && p.kind !== 'grave' && p.kind !== 'porch');
  if (!dests.length) return;
  const k = Math.floor(Math.random() * TOWN.arrive.length);
  if (dist(TOWN.arrive[k].x, TOWN.arrive[k].z, P.x, P.z) < 50) return;
  arriveCar(k, pick(dests), Math.floor(rr(1, 3.99)));
}

// ---------- runs ----------
function resetTown() {
  clearPeople(); clearCars(); clearFX();
  for (const s of TOWN.carSpecs) parkCar(...s);
  const o = new THREE.Object3D();
  for (const L of TOWN.lamps) {
    L.on = true; L.light.on = true;
    o.position.set(L.hx, L.y, L.hz); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); TOWN.headIM.setMatrixAt(L.i, o.matrix);
    const p = L.light.pool; if (p) { o.position.set(p.x, p.y, p.z); o.scale.set(p.r, 1, p.r); o.updateMatrix(); TOWN.poolIM.setMatrixAt(p.i, o.matrix); }
  }
  for (const s of LIGHTS.src) if (s.pool && !TOWN.lamps.some((L) => L.light === s)) s.on = true;
  TOWN.headIM.instanceMatrix.needsUpdate = true; TOWN.poolIM.instanceMatrix.needsUpdate = true;
  for (const p of TOWN.props) {
    if (!p.alive) { p.alive = true; p.col = addCircle(p.x, p.z, { can: 0.4, bench: 0.7, mailbox: 0.3, dumpster: 1.1 }[p.kind], p.kind === 'dumpster' ? 1.4 : 1.0, 'prop'); }
    const im = TOWN.propIM[p.kind]; o.position.set(p.x, p.y, p.z); o.rotation.set(0, p.ry, 0); o.scale.set(1, 1, 1); o.updateMatrix(); im.setMatrixAt(p.i, o.matrix); im.instanceMatrix.needsUpdate = true;
  }
  for (const m of THROWN_REST) R.scene.remove(m);
  THROWN_REST.length = 0;
  for (const t of THROWN) if (t.m) R.scene.remove(t.m);
  THROWN.length = 0;
  for (const r of TOWN.refuges) r.hits = 0;
}
function startRun(id, o = {}) {
  resetTown();
  Object.assign(G, { monster: id, t: 0, score: 0, hunger: HUNGER_MAX, combo: 1, comboT: 0, bestCombo: 1, kills: 0, escaped: 0, panic: 0, over: false, lastKillT: -9, dirT: 6, fed: 0, slow: 0, overT: 0 });
  spawnMonster(id);
  if (o.noRise) P.rise = 0;
  if (!o.empty) populate();
  hidePreview();
  document.body.dataset.state = 'play';
  HUD.reset();
  AUDIO.music(true);
  if (!o.quiet) UI.intro(id);
}
function endRun() {
  if (G.over) return;
  G.over = true; P.dead = true; P.act = null; P.actT = 0;
  if (P.form === 'bat') { P.form = 'normal'; setBatVisible(false); }
  AUDIO.sfx(P.D.voice === 'growl' ? 'howl' : 'roar', P.x, P.z);
  const prev = SAVE.best[G.monster] || 0, best = G.score > prev;
  if (best) SAVE.best[G.monster] = G.score;
  SAVE.kills[G.monster] = (SAVE.kills[G.monster] || 0) + G.kills;
  SAVE.nights++;
  writeSave();
  G.newBest = best && G.score > 0;
  setTimeout(() => { if (G.over && document.body.dataset.state === 'play') UI.gameOver(); }, DEBUG ? 0 : 2600);
}
const panicName = () => { let n = PANIC_NAMES[0][1]; for (const [v, s] of PANIC_NAMES) if (G.panic >= v) n = s; return n; };

// ---------- the monster preview in the graveyard ----------
const PREVIEW = { M: null, id: null };
function showPreview(id) {
  if (PREVIEW.id !== id) {
    if (PREVIEW.M) R.scene.remove(PREVIEW.M.root);
    PREVIEW.M = buildMonster(id); PREVIEW.id = id;
    R.scene.add(PREVIEW.M.root);
  }
  const s = TOWN.spawn;
  PREVIEW.M.root.visible = true;
  PREVIEW.M.root.position.set(s.x, terrainH(s.x, s.z), s.z - 1);
  PREVIEW.t = 0;
}
function hidePreview() { if (PREVIEW.M) PREVIEW.M.root.visible = false; }
