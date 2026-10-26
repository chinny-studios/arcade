// 09_traffic: vehicles on the road graph, driving on the left. Double-deckers, red taxis, minibuses, cars, vans and
// lorries keep their distance, stop at red lights (junctions near the mapped traffic signals) and for you if you
// stand in the road, and carry head and tail lights at night.
const TRAFFIC = { cars: [], max: 70, signals: [], types: null };
const VTYPES = [
  // id, length, width, height, weight, speed m/s, main roads only
  { id: 'bus', L: 11.8, Wd: 2.5, H: 4.4, w: 2.2, v: 10, main: true },
  { id: 'taxi', L: 4.6, Wd: 1.75, H: 1.5, w: 4, v: 12 },
  { id: 'mini', L: 7, Wd: 2.1, H: 2.6, w: 1.5, v: 12 },
  { id: 'car', L: 4.6, Wd: 1.8, H: 1.45, w: 3, v: 12 },
  { id: 'van', L: 5, Wd: 1.9, H: 2.1, w: 1.2, v: 11 },
  { id: 'lorry', L: 7.5, Wd: 2.3, H: 3.1, w: 0.8, v: 9 },
];
const CAR_COLS = [0xe8e8e6, 0x1a1a1e, 0x9aa0a6, 0x2a3a5a, 0x6a1a1a, 0xc8c0b0, 0x3a4a3a];

function vehicleGeo(t, col, variant) {
  const g = new Geo(), L = t.L / 2, Wd = t.Wd / 2, H = t.H;
  const body = (c) => { g.col = c; };
  if (t.id === 'bus') {
    const red = variant ? [0.85, 0.75, 0.2] : [0.78, 0.12, 0.1], cream = variant ? [0.95, 0.9, 0.5] : [0.92, 0.88, 0.78];
    body(cream); g.box(-Wd, 0.35, -L, Wd, H, L, { side: T.busSide, top: T.roof, front: T.carWin, back: T.metal }, 0, 'u');
    body(red); g.box(-Wd - 0.01, 0.35, -L, Wd + 0.01, 1.3, L, T.white, 0, 'tu');
  } else if (t.id === 'taxi') {
    body([0.8, 0.08, 0.08]); g.box(-Wd, 0.3, -L, Wd, 0.95, L, T.white, 0, 'u');
    body([0.75, 0.75, 0.78]); g.box(-Wd + 0.08, 0.95, -L + 1.2, Wd - 0.08, 1.45, L - 1.0, { side: T.carWin, top: T.white, front: T.carWin, back: T.carWin }, 0, 'u');
    body([1, 1, 0.9]); g.aux = [0.8, 0]; g.box(-0.3, 1.45, -0.1, 0.3, 1.6, 0.15, T.white, 0, 'u'); g.aux = [0, 0];
  } else if (t.id === 'mini') {
    const roof = variant ? [0.75, 0.12, 0.1] : [0.12, 0.45, 0.25];
    body([0.92, 0.9, 0.82]); g.box(-Wd, 0.3, -L, Wd, 1.5, L, T.white, 0, 'u');
    g.box(-Wd, 1.5, -L + 0.6, Wd, 2.3, L, { side: T.carWin, front: T.carWin, back: T.carWin, top: T.white }, 0, 'u');
    body(roof); g.box(-Wd, 2.3, -L + 0.6, Wd, H, L, T.white, 0, 'u');
  } else if (t.id === 'lorry') {
    body(hex3(col)); g.box(-Wd, 0.5, -L, Wd, 2.6, -L + 2.2, { side: T.white, front: T.carWin }, 0, 'u');
    body([0.85, 0.85, 0.82]); g.box(-Wd, 0.6, -L + 2.4, Wd, H, L, T.metal, 2, 'u');
  } else {
    const c = hex3(col);
    body(c); g.box(-Wd, 0.3, -L, Wd, 0.95, L, T.white, 0, 'u');
    if (t.id === 'van') { g.box(-Wd, 0.95, -L + 0.5, Wd, H, L, { side: T.white, front: T.carWin, back: T.white, top: T.white }, 0, 'u'); body([0.25, 0.3, 0.35]); g.box(-Wd - 0.01, 1.2, -L + 0.6, Wd + 0.01, 1.8, -L + 1.6, T.carWin, 0, 'tu'); }
    else { body([c[0] * 0.9, c[1] * 0.9, c[2] * 0.9]); g.box(-Wd + 0.1, 0.95, -L + 1.2, Wd - 0.1, H, L - 0.9, { side: T.carWin, top: T.white, front: T.carWin, back: T.carWin }, 0, 'u'); }
  }
  // wheels
  body([0.08, 0.08, 0.08]);
  for (const s of [-1, 1]) for (const z of [-L + 0.9, L - 0.9]) g.box(s * Wd - 0.12, 0, z - 0.35, s * Wd + 0.12, 0.6, z + 0.35, T.white, 0, 't');
  // lights: front is -z
  g.aux = [1.2, 0]; body([1, 0.98, 0.85]);
  for (const s of [-1, 1]) g.box(s * (Wd - 0.35) - 0.18, 0.6, -L - 0.03, s * (Wd - 0.35) + 0.18, 0.78, -L, T.white, 0, 'bu');
  body([0.9, 0.1, 0.08]);
  for (const s of [-1, 1]) g.box(s * (Wd - 0.3) - 0.15, 0.7, L, s * (Wd - 0.3) + 0.15, 0.88, L + 0.03, T.white, 0, 'fu');
  g.aux = [0, 0];
  return g.build();
}
function vehicleGlowGeo(t) {
  const g = new Geo(), L = t.L / 2, Wd = t.Wd / 2;
  for (const s of [-1, 1]) glowQuad(g, s * (Wd - 0.35), 0.7, -L - 0.3, 1.6, 1.0, '#fff4d8');
  for (const s of [-1, 1]) glowQuad(g, s * (Wd - 0.3), 0.8, L + 0.2, 1.0, 0.7, '#ff2010');
  return g.build();
}
function initTraffic() {
  TRAFFIC.types = VTYPES.map((t) => ({ t, geos: [0, 1, 2, 3].map((v) => vehicleGeo(t, CAR_COLS[(v * 3 + t.L * 7 | 0) % CAR_COLS.length], v % 2)), glow: vehicleGlowGeo(t) }));
  // signalised junctions: graph nodes near a mapped traffic signal
  for (const N of W.nodes) {
    if (N.out.length + N.inn.length < 3) continue;
    for (const s of MAP.signals) if (dist2(N.x, N.z, s[0] / 10, s[1] / 10) < 26 * 26) { N.sig = { off: Math.random() * 40 }; TRAFFIC.signals.push(N); break; }
  }
  for (let i = 0; i < TRAFFIC.max; i++) {
    const grp = new THREE.Group(); grp.visible = false; scene.add(grp);
    TRAFFIC.cars.push({ on: false, grp, body: null, glow: null });
  }
}
// green for an edge arriving at node N? Two phases split by heading (roughly north-south vs east-west)
function signalGreen(N, E) {
  if (!N.sig) return true;
  const t = (UNI.uTime.value + N.sig.off) % 44;
  const p = E.pts, dx = p[p.length - 2] - p[0], dz = p[p.length - 1] - p[1];
  return Math.abs(dz) > Math.abs(dx) ? t < 18 : t >= 22 && t < 40;
}
function pedGreen(N) { if (!N || !N.sig) return false; const t = (UNI.uTime.value + N.sig.off) % 44; return (t >= 18 && t < 22) || t >= 40; }
function laneOffset(E, lane) {
  if (E.ow) { const n = Math.max(1, Math.round(E.w / 3.3)); return -E.w / 2 + (lane % n + 0.5) * E.w / n; }
  const n = Math.max(1, Math.round(E.w / 6.6)); return (E.w / 2) * ((lane % n) + 0.5) / n;
}
function canGo(E, dir) { return E.ow === 0 || E.ow === dir; }
function spawnCar(c) {
  const near = W.edges.filter((E) => E.cls !== 'service' && E.len > 15 && dist2(E.pts[0], E.pts[1], PL.x, PL.z) < 230 * 230 && dist2(E.pts[0], E.pts[1], PL.x, PL.z) > 60 * 60);
  if (!near.length) return false;
  const E = near[Math.floor(Math.random() * near.length)];
  const dir = E.ow ? E.ow : Math.random() < 0.5 ? 1 : -1;
  const main = E.cls === 'primary' || E.cls === 'secondary' || E.cls === 'trunk';
  let ti = 0, s = 0; const ws = TRAFFIC.types.map((T2) => (T2.t.main && !main ? 0 : T2.t.w)); const tot = ws.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot; for (ti = 0; ti < ws.length; ti++) { r -= ws[ti]; if (r <= 0) break; }
  ti = Math.min(ti, ws.length - 1);
  const TT = TRAFFIC.types[ti];
  if (c.body) c.grp.remove(c.body); if (c.glow) c.grp.remove(c.glow);
  c.body = new THREE.Mesh(TT.geos[Math.floor(Math.random() * 4)], MAT.world);
  c.glow = new THREE.Mesh(TT.glow, MAT.glow); c.glow.renderOrder = 5;
  c.grp.add(c.body, c.glow);
  Object.assign(c, { on: true, E, dir, d: dir > 0 ? Math.random() * E.len : E.len - Math.random() * E.len, t: TT.t, v: 0, vmax: TT.t.v * (0.8 + Math.random() * 0.3), lane: Math.floor(Math.random() * 3), honk: 0 });
  c.grp.visible = true;
  return true;
}
function nextEdge(c) {
  const N = W.nodes[c.dir > 0 ? c.E.b : c.E.a];
  const opts = [];
  for (const E of N.out) if (E !== c.E && canGo(E, 1) && E.cls !== 'service') opts.push([E, 1]);
  for (const E of N.inn) if (E !== c.E && canGo(E, -1) && E.cls !== 'service') opts.push([E, -1]);
  if (!opts.length) return null;
  return opts[Math.floor(Math.random() * opts.length)];
}
function updateTraffic(dt) {
  if (!TRAFFIC.types) return;
  const want = Math.round(TRAFFIC.max * clamp(OPT.crowd, 0.2, 1) * (CLOCK.t < 5 ? 0.35 : 1));
  let active = 0; for (const c of TRAFFIC.cars) if (c.on) active++;
  if (active < want && PL.space === STREET) { const c = TRAFFIC.cars.find((q) => !q.on); if (c && spawnCar(c)) active++; }
  const night = SKY.night > 0.3;
  for (const c of TRAFFIC.cars) {
    if (!c.on) continue;
    const [x, z] = polyAt(c.E.pts, c.d);
    if (dist2(x, z, PL.x, PL.z) > 300 * 300 || (active > want + 4 && dist2(x, z, PL.x, PL.z) > 150 * 150)) { c.on = false; c.grp.visible = false; active--; continue; }
    // target speed: free road, the car ahead, the light, the player
    let target = c.vmax * (c.E.cls === 'residential' || c.E.cls === 'unclassified' ? 0.7 : 1);
    const toEnd = c.dir > 0 ? c.E.len - c.d : c.d;
    const endNode = W.nodes[c.dir > 0 ? c.E.b : c.E.a];
    if (endNode.sig && toEnd < 30 && !signalGreen(endNode, c.E)) target = Math.min(target, Math.max(0, (toEnd - 7) * 0.8));
    for (const o of TRAFFIC.cars) {
      if (o === c || !o.on || o.E !== c.E || o.dir !== c.dir || (o.lane % 2) !== (c.lane % 2)) continue;
      const gap = (o.d - c.d) * c.dir;
      if (gap > 0 && gap < 22) target = Math.min(target, Math.max(0, (gap - (o.t.L + c.t.L) / 2 - 2.5) * 0.9));
    }
    // the player in front
    const [, , dx, dz] = polyAt(c.E.pts, c.d);
    const fx = dx * c.dir, fz = dz * c.dir;
    const px = PL.x - c.grp.position.x, pz = PL.z - c.grp.position.z;
    const ahead = px * fx + pz * fz, lat = Math.abs(px * -fz + pz * fx);
    if (PL.space === STREET && ahead > 0 && ahead < 14 && lat < 1.8) { target = Math.min(target, Math.max(0, (ahead - c.t.L / 2 - 1.5))); if (ahead < 8 && c.honk <= 0) { c.honk = 6; bus.emit('honk', c); } }
    c.honk -= dt;
    c.v = target < c.v ? Math.max(target, c.v - 7 * dt) : Math.min(target, c.v + 2.5 * dt);
    c.d += c.v * dt * c.dir;
    if (c.d < 0 || c.d > c.E.len) {
      const nx = nextEdge(c);
      if (!nx) { c.on = false; c.grp.visible = false; continue; }
      const over = c.d < 0 ? -c.d : c.d - c.E.len;
      c.E = nx[0]; c.dir = nx[1]; c.d = c.dir > 0 ? over : c.E.len - over;
    }
    const [x2, z2, dx2, dz2] = polyAt(c.E.pts, c.d);
    const off = laneOffset(c.E, c.lane);
    // left of the direction of travel
    const lx = dz2 * c.dir, lz = -dx2 * c.dir;
    const tx = x2 + lx * off, tz = z2 + lz * off;
    const yaw = Math.atan2(-dx2 * c.dir, -dz2 * c.dir);
    // ease the body so lane offsets don't snap at junctions
    if (!c.placed) { c.grp.position.set(tx, 0, tz); c.grp.rotation.y = yaw; c.placed = true; }
    const k = clamp(dt * 4, 0, 1);
    c.grp.position.x = lerp(c.grp.position.x, tx, k); c.grp.position.z = lerp(c.grp.position.z, tz, k);
    c.grp.position.y = Math.max(0, groundAt(c.grp.position.x, c.grp.position.z) - KERB);
    c.grp.rotation.y += angWrap(yaw - c.grp.rotation.y) * k;
    c.glow.visible = night;
  }
}
// cars knock you back if you walk into them
function trafficPush() {
  if (PL.space !== STREET) return;
  for (const c of TRAFFIC.cars) {
    if (!c.on) continue;
    const p = c.grp.position, ry = c.grp.rotation.y, cs = Math.cos(ry), sn = Math.sin(ry);
    const dx = PL.x - p.x, dz = PL.z - p.z;
    const u = dx * cs - dz * sn, v = dx * sn + dz * cs;           // into the car's frame
    const hw = c.t.Wd / 2 + 0.3, hl = c.t.L / 2 + 0.3;
    if (Math.abs(u) < hw && Math.abs(v) < hl) {
      const pu = hw - Math.abs(u), pv = hl - Math.abs(v);
      let nu = u, nv = v;
      if (pu < pv) nu = Math.sign(u || 1) * hw; else nv = Math.sign(v || 1) * hl;
      PL.x = p.x + nu * cs + nv * sn; PL.z = p.z - nu * sn + nv * cs;
    }
  }
}
