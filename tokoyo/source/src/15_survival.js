// Tokoyo — survival: status effects (rested, wet, cold, warm, sheltered), regen, food decay, death & grave markers, beds & sleep, blessings, teleport

const STATUS_INFO = {
  rested: { name: 'Rested', icon: '休', good: true, desc: 'Stamina regenerates 50% faster. Skills improve 50% faster.' },
  resting: { name: 'Resting', icon: '座', good: true, desc: 'Stay by the fire under a roof to become Rested.' },
  sheltered: { name: 'Sheltered', icon: '屋', good: true, desc: 'A roof over your head. Rain can\'t reach you.' },
  warm: { name: 'Warm', icon: '火', good: true, desc: 'Near a fire.' },
  wet: { name: 'Wet', icon: '雨', good: false, desc: 'Health regenerates 25% slower, stamina 15% slower.' },
  cold: { name: 'Cold', icon: '寒', good: false, desc: 'Health regenerates 50% slower, stamina 25% slower.' },
  poisoned: { name: 'Poisoned', icon: '毒', good: false, desc: 'Losing health.' },
  burning: { name: 'Burning', icon: '炎', good: false, desc: 'Losing health.' },
  healing: { name: 'Healing', icon: '薬', good: true, desc: 'Yomogi tonic.' },
  noSkillDrain: { name: 'No skill drain', icon: '魂', good: true, desc: 'You won\'t lose skills if you die again.' },
  corpseRun: { name: 'Corpse run', icon: '走', good: true, desc: 'Stamina regenerates faster after recovering your belongings.' },
  shirokiba: { name: 'Shirokiba\'s vigour', icon: '猪', good: true, desc: 'Running and jumping cost 60% less stamina.' },
  osugi: { name: 'Ōsugi\'s grace', icon: '杉', good: true, desc: 'Chopping wood is 60% stronger.' },
};
const BLESSINGS = {
  shirokiba: { trophy: 'shirokiba_trophy', name: 'Shirokiba\'s vigour', dur: 300, cd: 1200 },
  osugi: { trophy: 'osugi_trophy', name: 'Ōsugi\'s grace', dur: 300, cd: 1200 },
};
const GRAVES = [];

const SURV = (() => {
  let regenT = 0, envT = 0, restT = 0;
  const env = { sheltered: false, shelter: 0, warm: false, fire: 0, comfort: 1, biome: 1, inside: false, shore: 0, pond: false, height: 0, combat: false };
  function update(dt) {
    const P = PLAYER;
    // status timers
    for (const k in P.status) { const s = P.status[k]; if (s.t !== Infinity) { s.t -= dt; if (s.t <= 0) delete P.status[k]; } }
    // food
    for (let i = P.food.length - 1; i >= 0; i--) { P.food[i].t -= dt; if (P.food[i].t <= 0) { HUD.msg(ITEMS[P.food[i].id].name + ' wore off.'); P.food.splice(i, 1); } }
    if (!P.alive) return;
    // environment (a few times a second)
    envT -= dt;
    if (envT <= 0) {
      envT = 0.4;
      const hy = P.pos.y + 1.6;
      env.shelter = BUILD.shelterAt(P.pos.x, hy, P.pos.z);
      env.sheltered = env.shelter >= 0.75;
      env.inside = env.shelter > 0.5;
      const fires = BUILD.firesNear(P.pos.x, P.pos.z, P.pos.y, 5);
      env.warm = fires.length > 0 || P.eq.left && P.eq.left.id === 'torch' && false;
      env.fire = fires.length ? 1 - Math.min(1, Math.hypot(fires[0].x - P.pos.x, fires[0].z - P.pos.z) / 6) : 0;
      const c = BUILD.comfortAt(P.pos.x, P.pos.z, P.pos.y);
      env.comfort = c.level;
      env.biome = biomeAt(P.pos.x, P.pos.z);
      env.height = P.pos.y;
      // how close the sea is
      let water = 0;
      for (let a = 0; a < 8; a++) { const x = P.pos.x + Math.cos(a / 8 * TAU) * 25, z = P.pos.z + Math.sin(a / 8 * TAU) * 25; if (heightAt(x, z) < -1) water++; }
      env.shore = water / 8 * (P.pos.y < 20 ? 1 : 0.4);
      env.pond = coarse(W.pond, P.pos.x, P.pos.z) > 0.1;
      env.combat = MOBS_LIVE.some((m) => !m.dead && (m.boss || (m.aware && m.target === P && m.def.mood === 'hostile' && dist2(m.pos.x, m.pos.z, P.pos.x, P.pos.z) < 400 && (m.def.hp >= 100 || m.raid))));
      // statuses from the environment
      if (env.sheltered) addStatus('sheltered', Infinity); else delStatus('sheltered');
      if (env.warm) addStatus('warm', Infinity); else delStatus('warm');
      const rainproof = P.eq.cape && ITEMS[P.eq.cape.id].rainproof;
      if ((SKY.rain > 0.3 && !env.sheltered && !rainproof) || P.swim) { if (!hasStatus('wet')) bus.emit('wet'); addStatus('wet', 120); }
      const wantCold = !env.warm && (SKY.isNight || (hasStatus('wet') && env.biome === 2));
      if (wantCold) addStatus('cold', Infinity); else delStatus('cold');
    }
    if (env.warm && P.status.wet) P.status.wet.t -= dt * 5;
    // resting by a fire beneath a roof
    const still = Math.hypot(P.vel.x, P.vel.z) < 0.3 && !P.act;
    if (env.warm && env.sheltered && (still || P.sit)) {
      if (!hasStatus('rested') || P.status.rested.t < 60) {
        restT += dt * (P.sit ? 2 : 1);
        addStatus('resting', Infinity, { p: restT / 20 });
        if (restT >= 20) { restT = 0; delStatus('resting'); giveRested(env.comfort); }
      } else delStatus('resting');
    } else { delStatus('resting'); restT = 0; }
    // damage over time
    if (P.status.poisoned) { damagePlayer({ true: P.status.poisoned.rate * dt }, null, true); FX.poison(P.pos.x, P.pos.y + 1.2, P.pos.z); }
    if (P.status.burning) damagePlayer({ true: P.status.burning.rate * dt }, null, true);
    if (P.status.healing) P.hp = Math.min(maxHp(), P.hp + P.status.healing.rate * dt);
    // health regen tick
    regenT -= dt;
    if (regenT <= 0) {
      regenT = 10;
      let r = 1; for (const f of P.food) r += f.regen;
      if (hasStatus('wet')) r *= 0.75;
      if (hasStatus('cold')) r *= 0.5;
      if (hasStatus('resting') || P.sit) r *= 2;
      if (P.hp < maxHp()) { P.hp = Math.min(maxHp(), P.hp + r); }
    }
    // power
    if (P.power && !P.status[P.power]) P.power = null;
    // torch burns while held
    const lt = P.eq.left;
    if (lt && lt.id === 'torch') { lt.burn = (lt.burn || 0) + dt; if (lt.burn > 25) { lt.burn = 0; wear(lt, 1); } if (P.swim) { unequip(lt); HUD.msg('Your torch went out in the water.'); } }
    // grave markers glow
    for (const g of GRAVES) if (g.light) g.light.rotation.y += dt;
  }
  function giveRested(comfort) {
    const t = 480 + (comfort - 1) * 60;
    addStatus('rested', t, { comfort });
    HUD.msg('You are rested (comfort ' + comfort + ').', 'good');
    AU.play('bell');
    bus.emit('rested');
  }

  // ---------- death ----------
  function die(src) {
    const P = PLAYER;
    if (!P.alive) return;
    P.alive = false; P.act = null; P.roll = null; P.draw = 0; P.block = 0; P.steer = null; P.sit = false;
    P.deaths++;
    AU.play('death', P.pos.x, P.pos.y, P.pos.z);
    HUD.msg('You died.', 'bad');
    // skills
    if (!hasStatus('noSkillDrain')) for (const k in P.skills) { const s = P.skills[k]; s.lv = Math.max(0, s.lv - Math.max(1, s.lv * 0.05)); s.lv = Math.floor(s.lv); s.xp = 0; }
    // grave marker with everything carried
    if (P.inv.slots.some((s) => s)) {
      const inv = new Inventory(8, 4);
      P.inv.slots.forEach((s, i) => { if (s) { inv.slots[i] = s; } });
      P.inv = new Inventory(8, 4);
      for (const k in P.eq) P.eq[k] = null;
      let y = groundY(P.pos.x, P.pos.z, P.pos.y + 1);
      y = Math.max(y, waveH(P.pos.x, P.pos.z) - 0.3);
      addGrave(P.pos.x, y, P.pos.z, inv, SKY.day);
    }
    refreshHeld();
    P.food = [];
    for (const k in P.status) delete P.status[k];
    bus.emit('died');
    setTimeout(() => { HUD.fade(1); setTimeout(respawn, 1300); }, 3200);
  }
  function addGrave(x, y, z, inv, day) {
    const mesh = new THREE.Mesh(model('grave', () => buildModel([P_.box(0.5, 1.1, 0.15, COL.stone, [0, 0.55, 0]), P_.box(0.7, 0.1, 0.3, COL.stone2, [0, 0.05, 0]), P_.box(0.06, 0.4, 0.02, COL.paper, [0.12, 0.6, 0.085]), P_.box(0.06, 0.3, 0.02, COL.paper, [-0.1, 0.65, 0.085])])), R.mat.vc);
    mesh.position.set(x, y, z); mesh.castShadow = true;
    R.scene.add(mesh);
    const light = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }));
    light.position.set(x, y + 1.6, z); R.scene.add(light);
    const g = { x, y, z, inv, day, mesh, light };
    GRAVES.push(g);
    return g;
  }
  function takeGrave(g) {
    const P = PLAYER;
    const wasEq = [];
    for (let i = 0; i < g.inv.slots.length; i++) {
      const s = g.inv.slots[i]; if (!s) continue;
      const eq = s.eq; s.eq = false;
      if (!P.inv.slots[i]) { P.inv.slots[i] = s; g.inv.slots[i] = null; }
      else { const left = P.inv.addStack(s); g.inv.slots[i] = left; }
      if (eq && !g.inv.slots[i]) wasEq.push(s);
    }
    for (const s of wasEq) equip(s);
    if (!g.inv.slots.some((s) => s)) {
      R.scene.remove(g.mesh); R.scene.remove(g.light);
      GRAVES.splice(GRAVES.indexOf(g), 1);
      addStatus('corpseRun', 50);
      HUD.msg('You recovered your belongings.', 'good');
    } else HUD.msg('Not everything fit. Come back for the rest.');
    AU.play('pickup');
  }
  function respawn() {
    const P = PLAYER;
    let sp = null;
    if (P.spawn) { const bed = BUILD.pieces.find((p) => p.uid === P.spawn.uid); if (bed) sp = { x: bed.x + 1.2, y: bed.y + 0.2, z: bed.z, yaw: bed.yaw }; else { HUD.msg('Your bed is gone.'); P.spawn = null; } }
    if (!sp) { const s = W.pois[0]; sp = { x: s.x + 2, y: groundY(s.x + 2, s.z + 3, s.y + 5), z: s.z + 3, yaw: 0 }; }
    P.alive = true; P.hp = BASE_HP; P.st = BASE_ST; P.vel.set(0, 0, 0);
    if (P.deaths > 0) addStatus('noSkillDrain', 600);
    teleport(sp.x, sp.y, sp.z, sp.yaw, true);
    bus.emit('respawn');
  }
  function teleport(x, y, z, yaw = 0, already = false) {
    const P = PLAYER;
    const go = () => {
      P.pos.set(x, y, z); P.vel.set(0, 0, 0); P.yaw = yaw; CAM.yaw = yaw; P.fallFrom = y; P.grounded = false;
      // build the world around the new spot before revealing it
      for (let i = 0; i < 30; i++) { if (!updateTerrain(x, z, 8) && !updateNature(x, z, 6)) break; }
      updateGrass(x, z, true);
      for (const m of MOBS_LIVE.slice()) if (!m.boss && dist2(m.pos.x, m.pos.z, x, z) > 150 * 150) removeMob(m);
      P.pos.y = Math.max(groundY(x, z, y + 2), y);
      setTimeout(() => HUD.fade(0), 200);
    };
    if (already) go(); else { HUD.fade(1); setTimeout(go, 700); }
    AU.play('bell');
  }
  // ---------- beds ----------
  function useBed(p) {
    const P = PLAYER;
    const sh = BUILD.shelterAt(p.x, p.y + 1, p.z);
    if (sh < 0.75) { HUD.msg('Your bed needs a roof and walls around it.'); return; }
    if (!P.spawn || P.spawn.uid !== p.uid) { P.spawn = { uid: p.uid }; HUD.msg('Spawn point set.', 'good'); AU.play('bell'); return; }
    if (!(SKY.tod > 0.72 || SKY.tod < 0.2)) { HUD.msg('You can only sleep at night.'); return; }
    if (!BUILD.firesNear(p.x, p.z, p.y, 6).length) { HUD.msg('It is too cold to sleep. Light a fire nearby.'); return; }
    if (MOBS_LIVE.some((m) => !m.dead && m.aware && m.def.mood === 'hostile' && dist2(m.pos.x, m.pos.z, p.x, p.z) < 900)) { HUD.msg('You can\'t sleep with enemies nearby.'); return; }
    // sleep until morning
    P.sit = false; G.sleeping = true;
    HUD.fade(1);
    setTimeout(() => {
      const dayStart = Math.ceil(G.time / DAY_LEN) * DAY_LEN + DAY_LEN * 0.01;
      const t = G.time % DAY_LEN / DAY_LEN < 0.05 ? G.time + 1 : dayStart;
      G.time = t;
      P.pos.set(p.x + Math.cos(p.yaw) * 0.9, p.y + 0.2, p.z - Math.sin(p.yaw) * 0.9);
      giveRested(BUILD.comfortAt(p.x, p.z, p.y).level);
      HUD.banner('Day ' + dayIndex(G.time));
      G.sleeping = false;
      setTimeout(() => HUD.fade(0), 600);
      SAVE.save();
    }, 1500);
  }
  // ---------- blessings ----------
  function usePowerNow() {
    const P = PLAYER;
    if (!P.blessing) { HUD.msg('You have no blessing. Offer a trophy at the spirit shrine.'); return; }
    if (P.powerCd > 0) { HUD.msg('Blessing ready in ' + fmtTime(P.powerCd) + '.'); return; }
    const b = BLESSINGS[P.blessing];
    addStatus(P.blessing, b.dur); P.power = P.blessing; P.powerCd = b.cd;
    FX.magic(P.pos.x, P.pos.y + 1, P.pos.z, [0.7, 0.95, 1], 40, 4);
    AU.play('bell'); AU.play('roar', P.pos.x, P.pos.y, P.pos.z, 0.4);
    HUD.msg(b.name + '!', 'good');
  }
  return { update, die, respawn, teleport, useBed, usePowerNow, addGrave, takeGrave, env, giveRested };
})();
function playerDie(src) { SURV.die(src); }
function usePower() { SURV.usePowerNow(); }
function removeStack(st) { const P = PLAYER, i = P.inv.slots.indexOf(st); if (st.eq) unequip(st); if (i >= 0) P.inv.slots[i] = null; }
