// 09b_ferry: two Star Ferries shuttle on the real route between Tsim Sha Tsui and Central. Board at the pier, ride
// the crossing on the upper deck (walk about, the boat carries you), stay aboard at Central, and get off when the
// boat is back in Tsim Sha Tsui. The boats are double-ended: they never turn round.
const FERRY = { route: null, len: 0, boats: [], cycle: 0, dock: 50, cross: 150, deckY: 3.3, water: -2.6 };
const FERRY_NAMES = [['Morning Star', '晨星'], ['Twinkling Star', '熒星'], ['Solar Star', '日星'], ['Silver Star', '銀星']];

function ferryGeo() {
  const g = new Geo(), L = 17, Wd = 4.8;
  // hull: green below, white band
  g.col = [1, 1, 1];
  g.box(-Wd, -1.6, -L, Wd, 1.0, L, { side: T.ferryHull, top: T.ferryDeck, front: T.ferryHull, back: T.ferryHull }, 4, 'u');
  // rounded ends: angled quads (a cheap taper)
  for (const s of [-1, 1]) {
    const z0 = s * L, z1 = s * (L + 2.6);
    g.quad([-Wd, -1.6, z0], [Wd, -1.6, z0], [Wd * 0.4, 1.0, z1], [-Wd * 0.4, 1.0, z1], [0, 0, 1, 0, 1, 1, 0, 1], T.ferryHull);
    g.quad([Wd, -1.6, z0], [-Wd, -1.6, z0], [-Wd * 0.4, 1.0, z1], [Wd * 0.4, 1.0, z1], [0, 0, 1, 0, 1, 1, 0, 1], T.ferryHull);
    g.tri([-Wd, 1.0, z0], [Wd, 1.0, z0], [Wd * 0.4, 1.0, z1], [0, 0, 1, 0, 1, 1], T.ferryDeck, [0, 1, 0]);
    g.tri([-Wd, 1.0, z0], [Wd * 0.4, 1.0, z1], [-Wd * 0.4, 1.0, z1], [0, 0, 1, 1, 0, 1], T.ferryDeck, [0, 1, 0]);
  }
  // lower cabin and upper deck floor
  g.box(-Wd + 0.3, 1.0, -L + 2, Wd - 0.3, 3.2, L - 2, { side: T.ferryCabin, front: T.ferryCabin, back: T.ferryCabin, top: T.ferryDeck }, 3.2, 'u');
  g.box(-Wd, 3.2, -L, Wd, 3.35, L, { side: T.white, top: T.ferryDeck }, 3, 'u');
  // upper deck: wheelhouses at both ends, a canopy on posts, benches, rails
  for (const s of [-1, 1]) {
    g.box(-1.6, 3.35, s * (L - 1.2) - 1.2, 1.6, 5.6, s * (L - 1.2) + 1.2, { side: T.ferryCabin, top: T.roofGreen }, 3, 'u');
  }
  g.col = [0.3, 0.55, 0.38];
  g.box(-Wd + 0.2, 5.9, -L + 3, Wd - 0.2, 6.05, L - 3, T.white, 0, '');
  for (const z of [-L + 3, -L / 3, L / 3, L - 3]) for (const x of [-Wd + 0.3, Wd - 0.3]) g.box(x - 0.08, 3.35, z - 0.08, x + 0.08, 5.9, z + 0.08, T.white);
  g.col = [1, 1, 1];
  for (let z = -L + 4.5; z < L - 4; z += 1.6) for (const x of [-2.6, 0.6]) {
    g.box(x, 3.35, z - 0.25, x + 2, 3.8, z + 0.25, T.bench, 1);
    g.box(x, 3.8, z - 0.05, x + 2, 4.3, z + 0.05, T.bench, 1);
  }
  const cut = new Geo();
  for (const s of [-1, 1]) cut.wall(s * Wd, s * L, s * Wd, -s * L, 3.35, 4.4, T.railGreen, 2, 1.05);
  for (const s of [-1, 1]) cut.wall(-s * Wd, s * L, s * Wd, s * L, 3.35, 4.4, T.railGreen, 2, 1.05);
  return [g.build(), cut.build()];
}
function initFerry() {
  const r = MAP.ferry; if (!r || r.length < 4) return;
  // route runs Central -> TST; stop each end short of the pier
  const pts = []; for (let i = 0; i < r.length; i++) pts.push(r[i] / 10);
  FERRY.route = pts;
  let len = 0; for (let k = 2; k < pts.length; k += 2) len += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  FERRY.len = len;
  FERRY.d0 = 26; FERRY.d1 = len - 30;          // berths at Central and Tsim Sha Tsui
  FERRY.cycle = 2 * (FERRY.dock + FERRY.cross);
  const [gb, gc] = ferryGeo();
  for (let i = 0; i < 2; i++) {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(gb, MAT.world));
    const rails = new THREE.Mesh(gc, MAT.cut); grp.add(rails);
    const nm = FERRY_NAMES[i];
    scene.add(grp);
    FERRY.boats.push({ grp, off: i * FERRY.cycle / 2, name: nm, x: 0, z: 0, yaw: 0, state: '' });
  }
  updateFerry(0);
}
// position along the route at cycle time t: dock TST, cross to Central, dock Central, cross back
function ferryAt(t) {
  const { dock, cross, d0, d1 } = FERRY;
  t = ((t % FERRY.cycle) + FERRY.cycle) % FERRY.cycle;
  const ease = (u) => u * u * (3 - 2 * u);
  if (t < dock) return { d: d1, state: 'tst', left: dock - t };
  t -= dock;
  if (t < cross) return { d: lerp(d1, d0, ease(t / cross)), state: 'toCentral', left: cross - t };
  t -= cross;
  if (t < dock) return { d: d0, state: 'central', left: dock - t };
  t -= dock;
  return { d: lerp(d0, d1, ease(t / cross)), state: 'toTST', left: cross - t };
}
function updateFerry(dt) {
  if (!FERRY.route) return;
  const now = UNI.uTime.value;
  for (const b of FERRY.boats) {
    const s = ferryAt(now + b.off);
    const [x, z, dx, dz] = polyAt(FERRY.route, s.d);
    const yaw = Math.atan2(-dx, -dz);
    const ox = b.x, oz = b.z, oyaw = b.yaw;
    b.x = x; b.z = z; b.yaw = yaw; b.state = s.state; b.left = s.left;
    const bob = Math.sin(now * 0.8 + b.off) * 0.06;
    b.grp.position.set(x, FERRY.water + 1.6 + bob, z); b.grp.rotation.set(Math.sin(now * 0.6 + b.off) * 0.01, yaw, Math.sin(now * 0.7) * 0.012);
    // carry the rider
    if (PL.space === FERRY_SPACE && FERRY_SPACE.boat === b && dt > 0) {
      const cs0 = Math.cos(oyaw), sn0 = Math.sin(oyaw);
      const rx = PL.x - ox, rz = PL.z - oz;
      const u = rx * cs0 - rz * sn0, v = rx * sn0 + rz * cs0;
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      PL.x = x + u * cs + v * sn; PL.z = z - u * sn + v * cs;
      PL.yaw += angWrap(yaw - oyaw);
      PL.y = FERRY_SPACE.ground();
    }
  }
}
const FERRY_SPACE = {
  name: 'ferry', boat: null, speed: 0.7,
  local(x, z) { const b = this.boat, cs = Math.cos(b.yaw), sn = Math.sin(b.yaw), rx = x - b.x, rz = z - b.z; return [rx * cs - rz * sn, rx * sn + rz * cs]; },
  ground() { return this.boat.grp.position.y + 3.35; },
  collide(x, z) {
    const b = this.boat, [u, v] = this.local(x, z);
    let cu = clamp(u, -4.3, 4.3), cv = clamp(v, -16.3, 16.3);
    // the wheelhouses at each end
    for (const s of [-1, 1]) { const zc = s * 15.8; if (Math.abs(cu) < 1.9 && Math.abs(cv - zc) < 1.5) { if (1.9 - Math.abs(cu) < 1.5 - Math.abs(cv - zc)) cu = Math.sign(cu || 1) * 1.9; else cv = zc + Math.sign(cv - zc) * 1.5; } }
    const cs = Math.cos(b.yaw), sn = Math.sin(b.yaw);
    return [b.x + cu * cs + cv * sn, b.z - cu * sn + cv * cs];
  },
  allowed() { return true; },
  scene: () => scene,
};
function nextFerryAtTST() {
  // seconds until a boat is (or is about to be) at the Tsim Sha Tsui berth
  let best = 1e9, boat = null;
  for (const b of FERRY.boats) {
    const s = ferryAt(UNI.uTime.value + b.off);
    if (s.state === 'tst') return [0, b, s.left];
    let t = 0; const tt = ((UNI.uTime.value + b.off) % FERRY.cycle + FERRY.cycle) % FERRY.cycle;
    t = FERRY.cycle - tt;
    if (t < best) { best = t; boat = b; }
  }
  return [best, boat, 0];
}
function boardFerry(b) {
  FERRY_SPACE.boat = b;
  PL.space = FERRY_SPACE;
  const cs = Math.cos(b.yaw), sn = Math.sin(b.yaw);
  // stand at the rail on the harbour end, looking out
  const u = 0, v = -9;
  PL.x = b.x + u * cs + v * sn; PL.z = b.z - u * sn + v * cs; PL.y = FERRY_SPACE.ground(); PL.yaw = b.yaw; PL.pitch = 0;
}
function leaveFerry() {
  const p = W.LP.ferryDoor || [-400, 615];
  placePlayer(p[0], p[1], Math.atan2(-(LM_BY.clocktower.x - p[0]), -(LM_BY.clocktower.z - p[1])), STREET);
}
