// Farhold — the galaxy, star systems and planet descriptions (pure data; meshes live in 06_planet)

const STAR_CLASS = {
  G: { name: 'Yellow', col: 0xffe6a0, light: 0xfff0d8 },
  M: { name: 'Red', col: 0xff7050, light: 0xffc0a0 },
  E: { name: 'Green', col: 0x8affa0, light: 0xd8ffd8 },
  O: { name: 'Blue', col: 0x8ab8ff, light: 0xd8e8ff },
};
const DRIVE_FOR = { G: null, M: 'cadmiumdrive', E: 'emerildrive', O: 'indiumdrive' };

const GALAXY = { seed: 0, stars: [], core: null };
function genGalaxy(seed) {
  GALAXY.seed = seed;
  const r = RNG(hashN(seed, 1));
  const stars = [];
  const N = 420, RAD = 3000, ARMS = 3;
  // the far hold at the centre
  stars.push({ i: 0, x: 0, y: 0, z: 0, cls: 'O', core: true });
  let tries = 0;
  while (stars.length < N && tries++ < 20000) {
    const d = Math.pow(r(), 0.75) * RAD;
    if (d < 260) continue;
    const arm = r.int(0, ARMS - 1);
    const ang = arm / ARMS * TAU + d / RAD * 4.2 + r.range(-0.45, 0.45) * (1.2 - d / RAD * 0.6);
    const x = Math.cos(ang) * d + r.range(-90, 90), z = Math.sin(ang) * d + r.range(-90, 90), y = r.range(-60, 60) * (1 - d / RAD * 0.5);
    let ok = true;
    for (let k = 0; k < stars.length && ok; k++) { const s = stars[k]; if ((s.x - x) ** 2 + (s.z - z) ** 2 < 70 * 70) ok = false; }
    if (!ok) continue;
    const t = d / RAD, cr = r();
    const cls = cr < 0.55 + t * 0.25 ? 'G' : cr < 0.78 + t * 0.12 ? 'M' : cr < 0.92 ? 'E' : 'O';
    stars.push({ i: stars.length, x, y, z, cls });
  }
  for (const s of stars) { s.seed = hashN(seed, s.i, 77); s.name = s.core ? 'Farhold' : NAMEGEN.system(s.seed); s.dist = Math.hypot(s.x, s.z); }
  // the start: a yellow star out on the rim
  let start = null, best = -1;
  for (const s of stars) if (s.cls === 'G' && s.dist > RAD * 0.85 && s.dist < RAD * 0.97) { const k = hashN(s.seed) % 1000; if (k > best) { best = k; start = s; } }
  GALAXY.stars = stars; GALAXY.core = stars[0]; GALAXY.start = start || stars[stars.length - 1];
  return GALAXY;
}
const starDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ---------- palettes ----------
const PAL_HUES = {
  lush: { ground: [[0.22, 0.36, 5], [0.08, 0.12, 1], [0.45, 0.52, 1], [0.85, 0.95, 1], [0.12, 0.18, 1]], sky: [[0.53, 0.62, 5], [0.75, 0.85, 1], [0.95, 1.05, 1]], water: [[0.48, 0.6, 4], [0.36, 0.44, 1]], gs: [0.5, 0.78], gl: [0.3, 0.42] },
  frozen: { ground: [[0.52, 0.62, 3], [0.68, 0.78, 1], [0.0, 0.05, 1]], sky: [[0.55, 0.65, 3], [0.7, 0.8, 1]], water: [[0.5, 0.56, 1]], gs: [0.08, 0.3], gl: [0.72, 0.86] },
  scorched: { ground: [[0.02, 0.08, 3], [0.08, 0.12, 2], [0.95, 1.0, 1]], sky: [[0.04, 0.09, 3], [0.92, 0.99, 1]], water: [[0.05, 0.08, 1]], gs: [0.5, 0.75], gl: [0.28, 0.42] },
  toxic: { ground: [[0.15, 0.22, 3], [0.25, 0.32, 1], [0.78, 0.86, 1]], sky: [[0.15, 0.24, 3], [0.3, 0.38, 1]], water: [[0.18, 0.26, 1]], gs: [0.5, 0.8], gl: [0.3, 0.45] },
  radioactive: { ground: [[0.25, 0.33, 2], [0.08, 0.13, 2], [0.5, 0.56, 1]], sky: [[0.28, 0.36, 2], [0.1, 0.16, 1]], water: [[0.3, 0.38, 1]], gs: [0.55, 0.85], gl: [0.3, 0.45] },
  barren: { ground: [[0.07, 0.11, 4], [0.02, 0.05, 1], [0.12, 0.15, 1]], sky: [[0.08, 0.12, 2], [0.55, 0.6, 1]], water: [[0.5, 0.55, 1]], gs: [0.35, 0.6], gl: [0.42, 0.58] },
  dead: { ground: [[0.0, 1.0, 1]], sky: [[0.6, 0.65, 1]], water: [[0.5, 0.6, 1]], gs: [0.0, 0.12], gl: [0.3, 0.55] },
  exotic: { ground: [[0.75, 0.92, 2], [0.45, 0.55, 1], [0.0, 1.0, 1]], sky: [[0.78, 0.95, 2], [0.4, 0.5, 1]], water: [[0.8, 0.9, 1]], gs: [0.55, 0.9], gl: [0.35, 0.55] },
};
function pickHue(r, list) { const s = list.reduce((a, b) => a + b[2], 0); let x = r() * s; for (const h of list) { x -= h[2]; if (x <= 0) return r.range(h[0], h[1]); } return list[0][0]; }
function makePalette(type, r) {
  const H = PAL_HUES[type];
  let gh = pickHue(r, H.ground);
  if (type === 'lush' && r() < 0.25) gh = r(); // pulp worlds: sometimes the grass is any colour at all
  const gs = r.range(H.gs[0], H.gs[1]), gl = r.range(H.gl[0], H.gl[1]);
  const low = hsl(gh, gs, gl), low2 = hsl(gh + r.range(-0.06, 0.06), gs * r.range(0.8, 1.15), gl * r.range(0.82, 1.12));
  const high = hsl(gh + r.range(-0.1, 0.1), gs * r.range(0.5, 0.9), gl * r.range(0.75, 1.25));
  const rh = r(), rs = r.range(0.08, 0.32);
  const rock = hsl(rh, rs, r.range(0.28, 0.42)), rock2 = hsl(rh + r.range(-0.08, 0.08), rs * 0.8, r.range(0.36, 0.5));
  const snow = type === 'scorched' ? hsl(r.range(0.0, 0.08), 0.6, 0.45) : type === 'toxic' ? hsl(gh, 0.4, 0.75) : hsl(r.range(0.5, 0.7), 0.25, 0.9);
  const sand = type === 'frozen' ? hsl(0.55, 0.2, 0.8) : hsl(r.range(0.09, 0.14), r.range(0.3, 0.55), r.range(0.55, 0.7));
  const wh = pickHue(r, H.water);
  const water = hsl(wh, r.range(0.5, 0.8), r.range(0.38, 0.5)), deep = hsl(wh + r.range(-0.03, 0.03), r.range(0.6, 0.9), r.range(0.14, 0.22));
  const bed = mixHex(sand, deep, 0.55);
  const sh = pickHue(r, H.sky);
  const skyS = type === 'dead' ? 0 : r.range(0.3, 0.62);
  const zenith = hsl(sh, skyS, r.range(0.4, 0.55)), horizon = hsl(sh + r.range(-0.06, 0.06), skyS * 0.55, r.range(0.74, 0.88));
  const sunset = hsl(r.range(-0.04, 0.12), 0.85, 0.6);
  const cloud = hsl(sh, skyS * 0.25, 0.92);
  const toA = (h) => hex3(h);
  return { low, low2, high, rock, rock2, snow, sand, bed, water, deep, zenith, horizon, sunset, cloud,
    k: { low: toA(low), low2: toA(low2), high: toA(high), rock: toA(rock), rock2: toA(rock2), snow: toA(snow), sand: toA(sand), bed: toA(bed) } };
}

// ---------- star systems ----------
// A system: { star, name, cls, planets[], station, arrival, economy, conflict, seed }
function genSystem(star) {
  const r = RNG(hashN(star.seed, 3));
  const S = { star, seed: star.seed, name: star.name, cls: star.cls, core: !!star.core, planets: [], col: STAR_CLASS[star.cls].col };
  S.economy = r.int(0, ECONOMIES.length - 1);
  S.conflict = star.core ? 0 : clamp(Math.floor(r() * r() * 4.2), 0, 3);
  S.wealth = r.int(1, 3);
  const isStart = star === GALAXY.start;
  const nP = star.core ? 3 : r.int(2, 5);
  const types = Object.keys(PLANET_TYPES);
  let angle = r() * TAU;
  for (let i = 0; i < nP; i++) {
    let type;
    if (isStart && i === 0) type = r.pick(['toxic', 'frozen', 'radioactive', 'scorched']);
    else if (isStart && i === 1) type = 'lush';
    else if (star.core && i === 0) type = 'exotic';
    else type = r.weighted(types.map((t) => ({ t, w: t === 'lush' ? 1.6 : t === 'dead' ? 0.8 : 1 }))).t;
    angle += r.range(0.9, 2.2);
    const d = 38000 + i * 26000 + r.range(-6000, 6000);
    const pos = new V3(Math.cos(angle) * d, r.range(-9000, 9000), Math.sin(angle) * d);
    const p = genPlanet(S, i, type, pos, false, r.int(0, 1e9));
    S.planets.push(p);
    if (!star.core && r() < 0.35 && i > 0) {
      const mt = r.pick(['dead', 'barren', 'frozen', 'dead', 'radioactive']);
      const mp = pos.clone().add(new V3(r.range(-1, 1), r.range(-0.3, 0.3), r.range(-1, 1)).normalize().multiplyScalar(p.R * 3.4 + 3500));
      const m = genPlanet(S, S.planets.length, mt, mp, true, r.int(0, 1e9));
      m.parent = p;
      S.planets.push(m);
    }
  }
  // the station sits a little way off the first planet, sunward
  const home = S.planets[0];
  const toStar = home.pos.clone().multiplyScalar(-1).normalize();
  S.station = { pos: home.pos.clone().addScaledVector(toStar, home.R * 2.6 + 9000).add(new V3(r.range(-2000, 2000), r.range(1500, 3000), r.range(-2000, 2000))), yaw: r() * TAU };
  S.arrival = S.station.pos.clone().add(new V3(r.range(-1, 1), r.range(-0.2, 0.2), r.range(-1, 1)).normalize().multiplyScalar(14000));
  S.starR = 9000;
  // asteroid fields: a few clusters around the system
  S.fields = [];
  const nf = r.int(2, 4);
  for (let i = 0; i < nf; i++) {
    const near = i === 0 ? S.station.pos : r.pick(S.planets).pos;
    S.fields.push({ pos: near.clone().add(new V3(r.range(-1, 1), r.range(-0.4, 0.4), r.range(-1, 1)).normalize().multiplyScalar(r.range(6000, 12000))), r: r.range(1800, 3200), n: r.int(70, 140), seed: r.int(0, 1e9) });
  }
  return S;
}

function genPlanet(S, idx, type, pos, moon, seed) {
  const r = RNG(seed);
  const T = PLANET_TYPES[type];
  const R = Math.round(moon ? r.range(900, 1300) : r.range(1600, 2600));
  const tp = T.terr;
  const rr = (v) => (Array.isArray(v) ? r.range(v[0], v[1]) : v || 0);
  const pal = makePalette(type, r);
  const hasSea = r() < T.sea;
  const P = {
    id: S.seed + ':' + idx, seed: seed >>> 0, R, amp: rr(tp.amp) * (moon ? 0.7 : 1), cont: rr(tp.cont), mtn: rr(tp.mtn), hills: rr(tp.hills),
    terr: Math.round(rr(tp.terr)), crat: rr(tp.crat), warp: rr(tp.warp), canyon: rr(tp.canyon), spikes: rr(tp.spikes),
    sea: hasSea ? 0 : null, hiStart: r.range(0.35, 0.55), snow: type === 'frozen' ? r.range(-0.1, 0.15) : (type === 'lush' || type === 'radioactive' || type === 'toxic') && r() < 0.6 ? r.range(0.55, 0.8) : type === 'dead' ? null : r() < 0.3 ? r.range(0.6, 0.85) : null,
    pal: pal.k, pois: [],
  };
  if (!hasSea) P.cont *= 0.8;
  const tempBase = r.range(T.temp[0], T.temp[1]);
  const pl = {
    sys: S, idx, id: P.id, seed, type, T, moon, R, P, pos, pal,
    name: NAMEGEN.planet(seed), adj: r.pick(T.adj),
    atmo: T.atmo, atmoR: R * 1.16, soi: R * 2.3,
    day: r.range(900, 1500) * (moon ? 0.8 : 1), tilt: r.range(-0.4, 0.4), phase0: r() * TAU,
    temp: tempBase, haz: T.haz, hazMul: T.hazMul,
    storm: T.storm ? { name: T.storm, temp: T.stormTemp, freq: r.range(0.3, 1) } : null,
    flora: T.flora * r.range(0.6, 1.3), fauna: T.fauna * r.range(0.5, 1.3),
    sentinel: T.atmo ? r.weighted([{ v: 0, w: 1 }, { v: 1, w: 3 }, { v: 2, w: 4 }, { v: 3, w: 1.5 }]).v : r.chance(0.4) ? 1 : 0,
    special: T.special, metal: STAR_METAL[S.cls],
    gravity: 11 * (R / 2000) ** 0.3,
  };
  if (pl.fauna < 0.05) pl.fauna = 0;
  if (S.star === GALAXY.start && idx === 0) { pl.sentinel = 1; pl.flora = Math.max(pl.flora, 0.8); pl.fauna = Math.max(pl.fauna, 0.5); pl.hazMul = 0.8; }
  if (S.core) { pl.sentinel = 0; }
  pl.lifeLabel = pl.fauna <= 0 ? 'None' : pl.fauna < 0.35 ? 'Sparse' : pl.fauna < 0.8 ? 'Moderate' : 'Bountiful';
  pl.floraLabel = pl.flora <= 0 ? 'None' : pl.flora < 0.35 ? 'Sparse' : pl.flora < 0.8 ? 'Average' : 'Abundant';
  genPOIs(pl, r);
  // the crash site wakes up to a morning sun
  if (pl.crash) {
    const toStar = pos.clone().negate().normalize(), tq = new Q4().setFromAxisAngle(new V3(1, 0, 0), pl.tilt), q = new Q4();
    const elev = (sp) => { q.setFromAxisAngle(UP, sp); return pl.crash.dir.clone().applyQuaternion(q).applyQuaternion(tq).dot(toStar); };
    let best = 0, bs = -1e9;
    for (let i = 0; i < 360; i++) { const sp = i / 360 * TAU; const e = elev(sp), rising = elev(sp + 0.02) > e; const sc = -Math.abs(e - 0.55) + (rising ? 0.5 : 0); if (sc > bs) { bs = sc; best = sp; } }
    pl.phase0 = best;
  }
  return pl;
}

// Points of interest: placed on the sphere and flattened by the kernel
const POI_TYPES = {
  post: { name: 'Trading Post', r: 34, icon: '⌂', col: '#ffd060' },
  shelter: { name: 'Shelter', r: 14, icon: '▲', col: '#9ae0ff' },
  pod: { name: 'Drop Pod', r: 6, icon: '◎', col: '#c0a0ff' },
  machine: { name: 'Damaged Machinery', r: 6, icon: '⚙', col: '#a0ffa0' },
  ruin: { name: 'Ancient Waystone', r: 12, icon: '◈', col: '#ffb070' },
  wreck: { name: 'Crashed Ship', r: 22, icon: '✈', col: '#ff9a7a' },
  cache: { name: 'Supply Cache', r: 4, icon: '▣', col: '#e0e0e0' },
  crash: { name: 'Your Ship', r: 16, icon: '✈', col: '#7cffb0' },
};
function genPOIs(pl, r) {
  const P = pl.P, L = [];
  const want = pl.atmo ? { post: 2, shelter: 6, pod: 4, machine: 6, ruin: 3, wreck: 2, cache: 10 } : { shelter: 3, pod: 2, machine: 5, ruin: 1, wreck: 1, cache: 8 };
  if (pl.moon) { for (const k in want) want[k] = Math.ceil(want[k] / 2); }
  const pois = [];
  const isCrash = pl.sys.star === GALAXY.start && pl.idx === 0;
  K.seed(P.seed);
  const tryPlace = (type, dir) => {
    const def = POI_TYPES[type];
    const h = K.heightRaw(P, dir.x, dir.y, dir.z);
    if (P.sea != null && h < P.sea + 2) return null;
    // reject steep spots
    const e = 6 / P.R;
    const h1 = K.heightRaw(P, dir.x + e, dir.y, dir.z), h2 = K.heightRaw(P, dir.x, dir.y + e, dir.z), h3 = K.heightRaw(P, dir.x, dir.y, dir.z + e);
    if (Math.max(Math.abs(h1 - h), Math.abs(h2 - h), Math.abs(h3 - h)) > 4.5) return null;
    for (const o of pois) if (o.dir.distanceTo(dir) * P.R < def.r + POI_TYPES[o.type].r + 60) return null;
    const poi = { type, dir: dir.clone().normalize(), h, id: pois.length, yaw: r() * TAU, seed: r.int(0, 1e9), done: false };
    pois.push(poi);
    L.push(poi.dir.x, poi.dir.y, poi.dir.z, def.r, def.r * 2.2 + 8, h);
    return poi;
  };
  if (isCrash) {
    for (let t = 0; t < 200; t++) { const d = new V3(r.range(-1, 1), r.range(0.2, 1), r.range(-1, 1)).normalize(); if (tryPlace('crash', d)) break; }
    pl.crash = pois[0];
  }
  for (const type in want) {
    for (let i = 0; i < want[type]; i++) {
      for (let t = 0; t < 30; t++) {
        const d = new V3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1));
        if (d.lengthSq() < 0.05 || d.lengthSq() > 1) continue;
        // near the crash site, drop extra caches and a shelter within walking range
        if (isCrash && (type === 'cache' && i < 3 || type === 'shelter' && i === 0 || type === 'machine' && i === 0)) {
          const c = pl.crash.dir; const tng = perpOf(c).applyAxisAngle(c, r() * TAU);
          d.copy(c).addScaledVector(tng, r.range(260, 600) / P.R);
        }
        if (tryPlace(type, d.normalize())) break;
      }
    }
  }
  P.pois = L;
  pl.pois = pois;
}
// planet-local surface point & height (uses the kernel with POI flattening)
function surfaceH(pl, dir) { K.seed(pl.P.seed); return K.height(pl.P, dir.x, dir.y, dir.z); }
function surfacePoint(pl, dir, out = new V3(), lift = 0) { const h = surfaceH(pl, dir); return out.copy(dir).multiplyScalar(pl.R + h + lift); }
