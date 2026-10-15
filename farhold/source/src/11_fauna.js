// Farhold — procedural fauna: species per planet, body plans assembled from parts, walking on the sphere,
// herds that wander, flee, graze or hunt; feeding and hunting.

const PLANS = ['quad', 'quad', 'quad', 'biped', 'hex', 'hopper'];
const TEMPER = [
  { id: 'docile', w: 4, label: 'Docile' }, { id: 'skittish', w: 3, label: 'Timid' },
  { id: 'territorial', w: 1.2, label: 'Defensive' }, { id: 'predator', w: 1, label: 'Predatory' },
];
const DIETS = ['Herbivore', 'Grazer', 'Omnivore', 'Absorbs nutrients', 'Lithovore', 'Carnivore'];
function planetFauna(pl) {
  if (pl.faunaSp) return pl.faunaSp;
  const list = [];
  if (pl.fauna > 0) {
    const r = RNG(hashN(pl.seed, 61));
    const nG = clamp(Math.round(2 + pl.fauna * 4 + r.range(-1, 1)), 2, 7), nF = pl.atmo && r() < 0.8 ? r.int(1, 2) : 0;
    for (let i = 0; i < nG + nF; i++) {
      const flyer = i >= nG;
      const plan = flyer ? 'flyer' : r.pick(PLANS);
      const sizeK = flyer ? r.range(0.4, 1.1) : plan === 'hopper' ? r.range(0.3, 0.9) : r() < 0.15 ? r.range(2.5, 4.5) : r.range(0.45, 1.8);
      let temper = r.weighted(TEMPER).id;
      if (flyer) temper = 'docile';
      if (pl.sys.star === GALAXY.start && pl.idx === 0 && temper === 'predator' && sizeK > 1.2) temper = 'territorial';
      const sp = {
        id: 'fauna' + i, cat: 'fauna', plan, size: sizeK, temper, seed: r.int(1, 1e9),
        name: NAMEGEN.species(hashN(pl.seed, 200 + i)),
        rarity: sizeK > 2.4 ? 'Rare' : r() < 0.3 ? 'Uncommon' : 'Common',
        diet: temper === 'predator' ? 'Carnivore' : r.pick(DIETS.slice(0, 5)),
        hp: Math.round(30 + sizeK * sizeK * 60), speed: (plan === 'hopper' ? 3.5 : plan === 'hex' ? 4.5 : 3) * (0.6 + Math.sqrt(sizeK) * 0.6) * (flyer ? 3 : 1),
        dmg: Math.round(8 + sizeK * 8), height: r.range(0.3, 4.5) * sizeK, weight: Math.round(sizeK ** 3 * r.range(20, 120)),
        note: r.pick(['Gathers in small herds', 'Sleeps standing up', 'Communicates in low hums', 'Shimmers when frightened', 'Hides its young in burrows', 'Follows the warm currents', 'Unusually curious', 'Marks territory with scent']),
        w: sizeK > 2.4 ? 0.4 : 1,
      };
      sp.tempLabel = TEMPER.find((t) => t.id === temper).label;
      list.push(sp);
    }
  }
  pl.faunaSp = list;
  return list;
}

// ---------- body building ----------
function faunaParts(sp) {
  if (sp.parts) return sp.parts;
  const r = RNG(sp.seed);
  const body = hsl(r(), r.range(0.35, 0.85), r.range(0.35, 0.6)), belly = shadeHex(mixHex(body, 0xf0e8d0, r.range(0.3, 0.7)), 1), accent = hsl(r(), r.range(0.6, 1), r.range(0.45, 0.65));
  const eye = r.pick([0xffffff, 0xffe060, 0x60ffff, 0xff4040]);
  const P = { legs: [], wings: [], tail: null };
  const bp = [], hp = [];
  let legLen = 0.6, bodyY = 0.8, legPos = [], headPos = [0, 0, -0.8];
  const headShape = r.int(0, 3), horns = r() < 0.4, spikes = r() < 0.35, shell = r() < 0.2, fins = r() < 0.25;
  switch (sp.plan) {
    case 'quad': {
      const L = r.range(1.2, 2), Hh = r.range(0.6, 1), W = r.range(0.5, 0.9);
      legLen = r.range(0.5, 1.3); bodyY = legLen + Hh * 0.3;
      bp.push(P_.sph(0.5, 10, 7, body, [0, 0, 0], null, [W * 1.6, Hh * 1.4, L * 1.05]));
      bp.push(P_.sph(0.45, 8, 6, belly, [0, -Hh * 0.25, 0], null, [W * 1.4, Hh * 0.9, L * 0.9]));
      if (shell) bp.push(P_.sph(0.55, 7, 4, accent, [0, Hh * 0.2, 0.05], null, [W * 1.7, Hh * 1.1, L * 1.0]));
      if (spikes) for (let i = 0; i < 5; i++) bp.push(P_.cone(0.08, 0.35, 4, accent, [0, Hh * 0.55, -L * 0.35 + i * L * 0.18]));
      if (fins) bp.push(P_.tbox(0.05, L * 0.8, 0.02, L * 0.3, 0.6, accent, [0, Hh * 0.8, 0]));
      legPos = [[-W * 0.55, -L * 0.33], [W * 0.55, -L * 0.33], [-W * 0.55, L * 0.33], [W * 0.55, L * 0.33]];
      headPos = [0, Hh * 0.35, -L * 0.6];
      P.tail = { pos: [0, Hh * 0.1, L * 0.5], len: r.range(0.2, 1.2) };
      break;
    }
    case 'biped': {
      const L = r.range(0.9, 1.4), Hh = r.range(0.8, 1.2);
      legLen = r.range(0.9, 1.6); bodyY = legLen + 0.3;
      bp.push(P_.sph(0.5, 10, 7, body, [0, 0.2, 0], [0.5, 0, 0], [1.1, Hh * 1.5, L * 1.1]));
      bp.push(P_.sph(0.42, 8, 6, belly, [0, 0.05, -0.15], [0.5, 0, 0], [0.9, Hh * 1.2, L * 0.8]));
      bp.push(P_.cyl(0.06, 0.08, 0.5, 5, body, [-0.35, 0.1, -0.4], [0.9, 0, 0])); bp.push(P_.cyl(0.06, 0.08, 0.5, 5, body, [0.35, 0.1, -0.4], [0.9, 0, 0]));
      if (spikes) for (let i = 0; i < 4; i++) bp.push(P_.cone(0.07, 0.3, 4, accent, [0, 0.75 - i * 0.12, 0.1 + i * 0.25], [0.6, 0, 0]));
      legPos = [[-0.3, 0.1], [0.3, 0.1]];
      headPos = [0, 0.9, -0.5];
      P.tail = { pos: [0, -0.05, 0.5], len: r.range(0.6, 1.6) };
      break;
    }
    case 'hex': {
      const L = r.range(1.2, 1.8);
      legLen = r.range(0.4, 0.8); bodyY = legLen * 0.8;
      for (let i = 0; i < 3; i++) bp.push(P_.sph(0.35 + (i === 1 ? 0.1 : 0), 8, 6, i % 2 ? accent : body, [0, 0.05, -L * 0.35 + i * L * 0.35], null, [1.3, 0.8, 1.2]));
      if (shell) bp.push(P_.sph(0.5, 7, 4, accent, [0, 0.2, 0.1], null, [1.3, 0.6, 1.6]));
      legPos = [[-0.4, -L * 0.3], [0.4, -L * 0.3], [-0.45, 0], [0.45, 0], [-0.4, L * 0.3], [0.4, L * 0.3]];
      headPos = [0, 0.1, -L * 0.62];
      break;
    }
    case 'hopper': {
      bp.push(P_.sph(0.55, 10, 8, body, [0, 0, 0], null, [1.1, 1.0, 1.2]));
      bp.push(P_.sph(0.45, 8, 6, belly, [0, -0.15, -0.15], null, [1, 0.8, 1]));
      for (let i = 0; i < 3; i++) bp.push(glowPart(P_.sph(0.08, 5, 4, accent, [r.range(-0.4, 0.4), r.range(0, 0.45), r.range(-0.4, 0.4)]), 0.6));
      legLen = 0.25; bodyY = 0.55;
      legPos = [[-0.3, 0.1], [0.3, 0.1]];
      headPos = [0, 0.25, -0.5];
      break;
    }
    case 'flyer': {
      bp.push(P_.sph(0.3, 8, 6, body, [0, 0, 0], null, [0.9, 0.8, 1.8]));
      bp.push(P_.cone(0.15, 0.7, 5, accent, [0, 0, 0.75], [Math.PI / 2, 0, 0]));
      legLen = 0; bodyY = 0;
      P.wings = [r.range(1.2, 2.2), r.range(0.4, 0.8)];
      headPos = [0, 0.1, -0.55];
      break;
    }
  }
  // head
  const hs = sp.plan === 'hopper' ? 0.0 : r.range(0.25, 0.4);
  if (hs > 0) {
    if (headShape === 0) hp.push(P_.sph(hs, 8, 6, body, [0, 0, 0], null, [1, 0.9, 1.2]));
    else if (headShape === 1) hp.push(P_.box(hs * 1.8, hs * 1.4, hs * 2.2, body, [0, 0, 0]));
    else if (headShape === 2) { hp.push(P_.sph(hs, 8, 6, body, [0, 0, 0])); hp.push(P_.cone(hs * 0.5, hs * 1.6, 5, accent, [0, -hs * 0.2, -hs * 1.3], [-Math.PI / 2, 0, 0])); }
    else { hp.push(P_.sph(hs, 8, 6, body, [0, 0, 0], null, [1.3, 0.8, 1])); hp.push(P_.box(hs * 1.4, hs * 0.5, hs, belly, [0, -hs * 0.4, -hs * 0.7])); }
    hp.push(glowPart(P_.sph(hs * 0.22, 5, 4, eye, [-hs * 0.5, hs * 0.25, -hs * 0.8]), 0.8));
    hp.push(glowPart(P_.sph(hs * 0.22, 5, 4, eye, [hs * 0.5, hs * 0.25, -hs * 0.8]), 0.8));
    if (horns) { hp.push(P_.cone(hs * 0.18, hs * 1.4, 4, 0xe8e0c8, [-hs * 0.6, hs * 0.8, 0], [0.3, 0, 0.4])); hp.push(P_.cone(hs * 0.18, hs * 1.4, 4, 0xe8e0c8, [hs * 0.6, hs * 0.8, 0], [0.3, 0, -0.4])); }
    if (r() < 0.3) { hp.push(P_.cyl(0.015, 0.02, hs * 2, 3, accent, [-hs * 0.3, hs * 1.4, 0], [0.4, 0, 0.3])); hp.push(glowPart(P_.sph(0.05, 4, 3, accent, [-hs * 0.55, hs * 2.3, -0.3]), 1)); }
  } else {
    hp.push(glowPart(P_.sph(0.14, 6, 5, eye, [-0.2, 0.05, -0.08]), 0.8)); hp.push(glowPart(P_.sph(0.14, 6, 5, eye, [0.2, 0.05, -0.08]), 0.8));
  }
  P.body = buildModel(bp, { jitter: 0.08, seed: sp.seed });
  P.head = buildModel(hp, { seed: sp.seed + 1 });
  P.headPos = headPos; P.bodyY = bodyY; P.legLen = legLen; P.legPos = legPos;
  if (legLen > 0) { const lw = sp.plan === 'hex' ? 0.06 : 0.1 + (sp.plan === 'biped' ? 0.06 : 0); P.leg = buildModel([P_.cyl(lw * 0.7, lw, legLen, 5, shadeHex(body, 0.8), [0, -legLen / 2, 0]), P_.sph(lw * 1.3, 5, 4, shadeHex(body, 0.6), [0, -legLen, 0], null, [1, 0.6, 1.4])]); }
  if (P.tail) P.tailG = buildModel([P_.cyl(0.04, 0.14, P.tail.len, 5, body, [0, 0, P.tail.len / 2], [Math.PI / 2 - 0.3, 0, 0]), glowPart(P_.sph(0.07, 4, 3, accent, [0, P.tail.len * 0.3, P.tail.len]), 0.4)]);
  if (P.wings.length) P.wing = buildModel([P_.tbox(P.wings[1], 0.04, P.wings[1] * 0.3, 0.02, P.wings[0], accent, [0, 0, 0], [0, 0, Math.PI / 2]), P_.tbox(P.wings[1] * 0.5, 0.05, 0.05, 0.02, P.wings[0] * 0.8, body, [0, 0.02, -0.1], [0, 0, Math.PI / 2])]);
  sp.parts = P;
  return P;
}
function makeCreatureRig(sp) {
  const P = faunaParts(sp);
  const root = new THREE.Group(), pivot = new THREE.Group();
  root.add(pivot);
  const body = meshOf(P.body); body.position.y = P.bodyY; pivot.add(body);
  const head = meshOf(P.head); head.position.set(...P.headPos); body.add(head);
  const legs = [];
  for (const [x, z] of P.legPos) { const g = new THREE.Group(); g.position.set(x, P.bodyY - 0.1, z); const m = meshOf(P.leg); g.add(m); pivot.add(g); legs.push(g); }
  let tail = null;
  if (P.tailG) { tail = meshOf(P.tailG); tail.position.set(...P.tail.pos); body.add(tail); }
  const wings = [];
  if (P.wing) for (const s of [-1, 1]) { const g = new THREE.Group(); const m = meshOf(P.wing); m.position.x = s * P.wings[0] / 2; g.add(m); g.position.y = 0.1; body.add(g); g.userData.s = s; wings.push(g); }
  root.scale.setScalar(sp.size);
  return { root, pivot, body, head, legs, tail, wings };
}

// ---------- live creatures ----------
const FAUNA = { live: [], spawnT: 0, pl: null };
function faunaReset() { for (const c of FAUNA.live) c.rig.root.parent && c.rig.root.parent.remove(c.rig.root); FAUNA.live = []; FAUNA.pl = null; }
function spawnCreature(pl, sp, pos) {
  const rig = makeCreatureRig(sp);
  const up = pos.clone().normalize();
  const c = { sp, pl, rig, pos: pos.clone(), up, fwd: perpOf(up).applyAxisAngle(up, Math.random() * TAU), hp: sp.hp, state: 'wander', t: Math.random() * 3, target: null, anim: Math.random() * 10, speed: 0, alive: true, fed: false, hurtT: 0, deadT: 0, atkT: 0, fly: sp.plan === 'flyer', alt: 0, id: Math.random() };
  if (c.fly) { c.alt = 25 + Math.random() * 35; c.center = pos.clone(); c.circ = Math.random() * TAU; c.circR = 20 + Math.random() * 40; }
  pl.group.add(rig.root);
  FAUNA.live.push(c);
  placeCreature(c, 0);
  return c;
}
function placeCreature(c, dt) {
  const pl = c.pl;
  c.up.copy(c.pos).normalize();
  const h = surfaceH(pl, c.up);
  const ground = pl.R + Math.max(h, pl.P.sea != null && !c.fly ? pl.P.sea - 0.2 : -1e9);
  let r = ground;
  if (c.fly) r = ground + c.alt;
  else if (c.sp.plan === 'hopper') r = ground + Math.abs(Math.sin(c.anim * 3)) * 0.8 * Math.min(1, c.speed / 2) * c.sp.size;
  c.pos.copy(c.up).multiplyScalar(r);
  c.fwd.addScaledVector(c.up, -c.fwd.dot(c.up)).normalize();
  c.rig.root.position.copy(c.pos);
  basisQuat(c.up, c.fwd, c.rig.root.quaternion);
}
const _fwd = new V3();
function updateFauna(dt, pl, playerLocal, playerOnPlanet) {
  if (FAUNA.pl !== pl) { faunaReset(); FAUNA.pl = pl; }
  if (!pl) return;
  const species = planetFauna(pl);
  // populate around the player
  FAUNA.spawnT -= dt;
  const alt = playerLocal.length() - pl.R;
  if (species.length && FAUNA.spawnT <= 0 && alt < 400) {
    FAUNA.spawnT = 1.5;
    const ground = FAUNA.live.filter((c) => !c.fly).length, air = FAUNA.live.length - ground;
    const cap = Math.round(6 + pl.fauna * 14);
    const flyers = species.filter((s) => s.plan === 'flyer'), walkers = species.filter((s) => s.plan !== 'flyer');
    if (ground < cap && walkers.length) {
      const sp = RNG(Math.random() * 1e9 | 0).weighted(walkers);
      const up = playerLocal.clone().normalize();
      const t = perpOf(up).applyAxisAngle(up, Math.random() * TAU);
      const d = 70 + Math.random() * 90;
      const c0 = up.clone().addScaledVector(t, d / pl.R).normalize();
      const h = surfaceH(pl, c0);
      if (!(pl.P.sea != null && h < pl.P.sea + 0.5) && !nearPOI(pl, c0, 25)) {
        const n = sp.size > 2.4 ? 1 : 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) { const dd = c0.clone().addScaledVector(perpOf(c0).applyAxisAngle(c0, Math.random() * TAU), (2 + Math.random() * 8) / pl.R).normalize(); spawnCreature(pl, sp, dd.multiplyScalar(pl.R + h)); }
      }
    }
    if (air < 3 && flyers.length) {
      const sp = fpick(flyers);
      const up = playerLocal.clone().normalize();
      const c0 = up.clone().addScaledVector(perpOf(up).applyAxisAngle(up, Math.random() * TAU), (40 + Math.random() * 80) / pl.R).normalize();
      spawnCreature(pl, sp, c0.multiplyScalar(pl.R + surfaceH(pl, c0)));
    }
  }
  for (let i = FAUNA.live.length - 1; i >= 0; i--) {
    const c = FAUNA.live[i];
    const dP = c.pos.distanceTo(playerLocal);
    if (dP > 260 || (!c.alive && c.deadT > 6)) { c.rig.root.parent && c.rig.root.parent.remove(c.rig.root); FAUNA.live.splice(i, 1); continue; }
    updateCreature(c, dt, playerLocal, dP, playerOnPlanet);
  }
}
function nearPOI(pl, dir, m) { for (const p of pl.pois) if (p.dir.distanceTo(dir) * pl.R < POI_TYPES[p.type].r + m) return p; return null; }
function updateCreature(c, dt, playerLocal, dP, onPlanet) {
  const sp = c.sp, rig = c.rig;
  c.anim += dt * (0.5 + c.speed * 0.6 / sp.size);
  if (!c.alive) {
    c.deadT += dt;
    rig.pivot.rotation.z = Math.min(Math.PI / 2, c.deadT * 3);
    if (c.deadT > 4) rig.root.scale.setScalar(sp.size * Math.max(0.01, 1 - (c.deadT - 4) / 2));
    return;
  }
  c.hurtT = Math.max(0, c.hurtT - dt);
  c.t -= dt; c.atkT = Math.max(0, c.atkT - dt);
  let want = 0;
  const toP = _v1.copy(playerLocal).sub(c.pos); toP.addScaledVector(c.up, -toP.dot(c.up));
  const sees = onPlanet && dP < 40 && PLAYER.alive;
  if (c.fly) {
    c.circ += dt * sp.speed / c.circR;
    const t = perpOf(c.center.clone().normalize());
    const u = c.center.clone().normalize();
    const b = new V3().crossVectors(u, t);
    const goal = c.center.clone().addScaledVector(t, Math.cos(c.circ) * c.circR).addScaledVector(b, Math.sin(c.circ) * c.circR);
    _fwd.copy(goal).sub(c.pos); _fwd.addScaledVector(c.up, -_fwd.dot(c.up));
    if (_fwd.lengthSq() > 1) c.fwd.lerp(_fwd.normalize(), Math.min(1, dt * 2)).normalize();
    want = sp.speed;
    if (c.state === 'flee') { c.alt = Math.min(c.alt + dt * 10, 90); if (c.t <= 0) c.state = 'wander'; }
  } else {
    switch (c.state) {
      case 'wander':
        if (c.t <= 0) { c.t = 2 + Math.random() * 6; c.idle = Math.random() < 0.4; c.fwd.applyAxisAngle(c.up, (Math.random() - 0.5) * 2.5); }
        want = c.idle ? 0 : sp.speed * 0.35;
        if (sees && sp.temper === 'skittish' && dP < 12) { c.state = 'flee'; c.t = 5; }
        if (sees && sp.temper === 'predator' && dP < 28) { c.state = 'chase'; c.t = 12; AU.sfx('growl', 0.6); }
        if (sees && sp.temper === 'territorial' && dP < 7) { c.state = 'chase'; c.t = 6; AU.sfx('growl', 0.5); }
        break;
      case 'flee':
        if (toP.lengthSq() > 0.01) c.fwd.lerp(toP.normalize().negate(), Math.min(1, dt * 4)).normalize();
        want = sp.speed;
        if (c.t <= 0) c.state = 'wander';
        break;
      case 'chase':
        if (toP.lengthSq() > 0.01) c.fwd.lerp(toP.clone().normalize(), Math.min(1, dt * 5)).normalize();
        want = sp.speed * 1.15;
        if (dP < 1.4 + sp.size * 0.9) {
          want = 0;
          if (c.atkT <= 0 && onPlanet) { c.atkT = 1.4; damagePlayer(sp.dmg, 'creature'); AU.sfx('bite', 0.7); c.lunge = 0.3; }
        }
        if (c.t <= 0 || dP > 45 || !PLAYER.alive) { c.state = 'wander'; c.t = 3; }
        break;
      case 'happy':
        want = dP > 4 ? sp.speed * 0.5 : 0;
        if (toP.lengthSq() > 0.01) c.fwd.lerp(toP.normalize(), Math.min(1, dt * 3)).normalize();
        if (c.t <= 0) c.state = 'wander';
        break;
    }
  }
  c.speed = lerp(c.speed, want, Math.min(1, dt * 3));
  // step and avoid water
  const prev = _v2.copy(c.pos);
  c.pos.addScaledVector(c.fwd, c.speed * dt);
  if (!c.fly && c.pl.P.sea != null) {
    const h = surfaceH(c.pl, _v3.copy(c.pos).normalize());
    if (h < c.pl.P.sea + 0.3) { c.pos.copy(prev); c.fwd.negate(); c.t = 1; }
  }
  if (!c.fly && dP < 60) natCollide(c.pos, 0.4 * sp.size, c.up);
  placeCreature(c, dt);
  // animation
  const ph = c.anim * 4, sw = Math.min(1, c.speed / (sp.speed * 0.5));
  rig.legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i >> 1) * Math.PI * (sp.plan === 'hex' ? 0.66 : 1)) * 0.6 * sw; });
  if (rig.tail) rig.tail.rotation.y = Math.sin(c.anim * 2) * 0.4;
  rig.head.rotation.x = c.idle && c.state === 'wander' ? 0.5 + Math.sin(c.anim) * 0.15 : Math.sin(c.anim * 1.3) * 0.08;
  for (const w of rig.wings) w.rotation.z = Math.sin(c.anim * 7) * 0.7 * w.userData.s;
  if (c.lunge) { c.lunge = Math.max(0, c.lunge - dt); rig.body.position.z = -Math.sin(c.lunge / 0.3 * Math.PI) * 0.4; }
  const hurt = c.hurtT > 0;
  rig.body.material = hurt ? R.mat.hurt : c.scanned ? R.mat.vc : R.mat.vc;
}
function damageCreature(c, dmg) {
  if (!c.alive) return;
  c.hp -= dmg; c.hurtT = 0.2;
  AU.sfx('hurt', 0.5);
  if (c.hp <= 0) {
    c.alive = false; c.deadT = 0;
    const n = Math.round(10 + c.sp.size * 20);
    giveItem('mordite', n, true);
    bus.emit('creatureKilled', c);
    // predators' packmates turn hostile, prey scatter
    for (const o of FAUNA.live) if (o !== c && o.alive && o.sp === c.sp && o.pos.distanceTo(c.pos) < 30) { o.state = c.sp.temper === 'predator' || c.sp.temper === 'territorial' ? 'chase' : 'flee'; o.t = 6; }
    return;
  }
  if (c.sp.temper === 'docile' || c.sp.temper === 'skittish') { c.state = 'flee'; c.t = 6; }
  else { c.state = 'chase'; c.t = 10; }
}
function feedCreature(c) {
  if (c.fed || !c.alive) return false;
  if (!INV.has('carbon', 10)) { HUD.msg('Feeding needs 10 Carbon.', 'bad'); return false; }
  INV.take('carbon', 10);
  c.fed = true; c.state = 'happy'; c.t = 12;
  FX.hearts(toWorld(planetFrame(c.pl), c.pos.clone().addScaledVector(c.up, 1.5 * c.sp.size)));
  AU.sfx('chirp', 0.6);
  setTimeout(() => {
    if (!c.alive) return;
    const r = Math.random();
    if (c.sp.size > 1.2 && r < 0.45) giveItem('egg', 1);
    else giveItem(fpick(['sodium', 'oxygen', 'dihydro', 'carbon']), 20 + Math.floor(Math.random() * 20));
    HUD.msg('The ' + c.sp.name.split(' ')[0] + ' leaves you a gift.', 'good');
  }, 2500);
  bus.emit('creatureFed', c);
  return true;
}
// ray vs creatures (planet-local)
function faunaRaycast(o, d, maxD) {
  let best = null, bt = maxD;
  for (const c of FAUNA.live) {
    if (!c.alive) continue;
    const rad = 0.8 * c.sp.size;
    _v1.copy(c.pos).addScaledVector(c.up, c.sp.parts ? c.sp.parts.bodyY * c.sp.size : 0.5).sub(o);
    const tc = _v1.dot(d);
    if (tc < 0 || tc - rad > bt) continue;
    const d2 = _v1.lengthSq() - tc * tc;
    if (d2 > rad * rad) continue;
    const t = tc - Math.sqrt(rad * rad - d2);
    if (t < bt) { bt = t; best = c; }
  }
  return best ? { c: best, t: bt } : null;
}
