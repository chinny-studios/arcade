// Ricky Rescue — routing: A* over the road graph from the rig to a curb point, a lane-following polyline,
// the GPS ribbon drawn on the road, and turn-by-turn directions.

const ROUTE = { pts: null, cum: null, man: [], goal: null, mesh: null, tex: null, label: '', recalcT: 0, length: 0, i: 0 };

// goal: { x, z, yaw } — a point on a road (usually a curb) and the travel direction to arrive in
function goalEdge(goal) {
  const ne = nearestEdge(goal.x, goal.z, goal.yaw);
  const e = ne.edge, dir = ne.dir;
  const [S] = edgeEnds(e, dir);
  const s = e.axis === 'x' ? (goal.x - S.x) * dir : (goal.z - S.z) * dir;
  const off = e.axis === 'x' ? (goal.z - S.z) * dir : -(goal.x - S.x) * dir; // lateral offset to the right
  return { e, dir, s: clamp(s, 2, CP - 2), off, startNode: S };
}
function findPath(fromNode, fromEdge, toNode) {
  // A* on nodes; no immediate U-turns; time cost with turn penalties
  const open = [{ n: fromNode, g: 0, f: 0, prev: null, via: fromEdge }];
  const best = new Map(); best.set(fromNode.id + ':' + (fromEdge ? fromEdge.id : -1), 0);
  const H = (n) => Math.hypot(n.x - toNode.x, n.z - toNode.z) / 22;
  let it = 0;
  while (open.length && it++ < 6000) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k].f < open[bi].f) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur.n === toNode) { const out = []; let c = cur; while (c && c.prev) { out.unshift({ e: c.via, dir: c.via.a === c.prev.n.id ? 1 : -1 }); c = c.prev; } return out; }
    for (const e of cur.n.edges) {
      if (e === cur.via) continue;
      const nb = CITY.nodes[e.a === cur.n.id ? e.b : e.a];
      let g = cur.g + CP / e.speed;
      if (cur.via) {
        const d0x = cur.via.axis === 'x' ? 1 : 0, d1x = e.axis === 'x' ? 1 : 0;
        if (d0x !== d1x) g += 3.5; // a turn
      }
      if (cur.n.signal) g += 1.5;
      const key = nb.id + ':' + e.id;
      if (best.has(key) && best.get(key) <= g) continue;
      best.set(key, g);
      open.push({ n: nb, g, f: g + H(nb), prev: cur, via: e });
    }
  }
  return null;
}
// the route from the rig to a goal, without touching ROUTE: { pts, cum, man, length }
function computeRoute(goal, from = RIG) {
  const A = from;
  const ge = goalEdge(goal);
  const ne = nearestEdge(A.x, A.z, A.yaw);
  const pts = [{ x: A.x, z: A.z }];
  let legs;
  const startS = ne.dir > 0 ? ne.t * CP : (1 - ne.t) * CP;
  if (ne.edge === ge.e && ne.dir === ge.dir && ge.s > startS - 2) legs = [];
  else {
    const [, E0] = edgeEnds(ne.edge, ne.dir);
    const path = findPath(E0, ne.edge, ge.startNode);
    legs = path || [];
    legs.unshift({ e: ne.edge, dir: ne.dir, from: startS });
  }
  // lane offsets: the inner lane; with lights and sirens on a two-lane street, the middle (traffic pulls to the curb)
  const ls = goal.ls !== undefined ? goal.ls : A.siren;
  const laneO = (e) => (e.lanes === 1 && ls ? 0.35 : laneOff(0));
  const man = [];
  const pushEdge = (e, dir, s0, s1, off0, off1) => {
    const n = Math.max(1, Math.ceil(Math.abs(s1 - s0) / 8));
    for (let k = 0; k <= n; k++) { const s = lerp(s0, s1, k / n), o = lerp(off0, off1, smooth(0.55, 1, k / n)); const p = edgePos(e, dir, s, o); pts.push({ x: p.x, z: p.z }); }
  };
  const turnBetween = (a, b, node) => {
    const h0 = crossHalf(a.e, node), h1 = crossHalf(b.e, node);
    const p0 = edgePos(a.e, a.dir, CP - h0, laneO(a.e)), p2 = edgePos(b.e, b.dir, h1, laneO(b.e));
    const straight = a.e.axis === b.e.axis;
    const p1 = straight ? { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 } : (a.e.axis === 'x' ? { x: p2.x, z: p0.z } : { x: p0.x, z: p2.z });
    for (let k = 1; k < 6; k++) { const u = k / 6, w = 1 - u; pts.push({ x: w * w * p0.x + 2 * w * u * p1.x + u * u * p2.x, z: w * w * p0.z + 2 * w * u * p1.z + u * u * p2.z }); }
    if (!straight) {
      const dx0 = a.e.axis === 'x' ? a.dir : 0, dz0 = a.e.axis === 'z' ? a.dir : 0, dx1 = b.e.axis === 'x' ? b.dir : 0, dz1 = b.e.axis === 'z' ? b.dir : 0;
      man.push({ x: node.x, z: node.z, kind: dx0 * dz1 - dz0 * dx1 > 0 ? 'right' : 'left', street: b.e.name, idx: pts.length - 3 });
    }
  };
  if (!legs.length) pushEdge(ge.e, ge.dir, startS, ge.s, laneO(ge.e), ge.off);
  else {
    for (let k = 0; k < legs.length; k++) {
      const L = legs[k], [S, E] = edgeEnds(L.e, L.dir);
      const s0 = k === 0 ? clamp(L.from + 3, crossHalf(L.e, S), CP) : crossHalf(L.e, S);
      if (s0 < CP - crossHalf(L.e, E)) pushEdge(L.e, L.dir, s0, CP - crossHalf(L.e, E), laneO(L.e), laneO(L.e));
      const next = legs[k + 1] || { e: ge.e, dir: ge.dir };
      turnBetween(L, next, E);
    }
    const [S] = edgeEnds(ge.e, ge.dir);
    pushEdge(ge.e, ge.dir, crossHalf(ge.e, S), ge.s, laneO(ge.e), ge.off);
  }
  // drop near-duplicates, then cumulative distances
  const clean = [pts[0]];
  for (const p of pts) if (dist2(p.x, p.z, clean[clean.length - 1].x, clean[clean.length - 1].z) > 0.8) clean.push(p);
  // a goal off the road (a bay, a lot) gets a final straight leg
  if (dist(goal.x, goal.z, clean[clean.length - 1].x, clean[clean.length - 1].z) > 1.5) clean.push({ x: goal.x, z: goal.z });
  const cum = [0]; for (let k = 1; k < clean.length; k++) cum.push(cum[k - 1] + dist(clean[k].x, clean[k].z, clean[k - 1].x, clean[k - 1].z));
  for (const m of man) m.d = cum[Math.min(cum.length - 1, m.idx)] || 0;
  return { pts: clean, cum, man, length: cum[cum.length - 1] };
}
function buildRoute(goal, label = '') {
  Object.assign(ROUTE, computeRoute(goal), { goal, label, i: 0 });
  drawRoute();
  return ROUTE;
}
function clearRoute() { ROUTE.pts = null; ROUTE.goal = null; ROUTE.man = []; if (ROUTE.mesh) ROUTE.mesh.visible = false; }
function drawRoute() {
  if (!ROUTE.tex) {
    ROUTE.tex = canvasTex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w - 6, 34); g.lineTo(w - 16, 40); g.lineTo(w / 2, 24); g.lineTo(16, 40); g.lineTo(6, 34); g.closePath(); g.fill();
    });
  }
  const P = ROUTE.pts; if (!P || P.length < 2) return;
  const pos = [], uv = [], idx = [];
  const hw = 0.7;
  for (let k = 0; k < P.length; k++) {
    const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)];
    let dx = b.x - a.x, dz = b.z - a.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const y = groundY(P[k].x, P[k].z) + 0.07;
    pos.push(P[k].x - dz * hw, y, P[k].z + dx * hw, P[k].x + dz * hw, y, P[k].z - dx * hw);
    const v = ROUTE.cum[k] / 2.4;
    uv.push(0, v, 1, v);
    if (k) { const i = k * 2; idx.push(i - 2, i - 1, i, i - 1, i + 1, i); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  if (!ROUTE.mesh) {
    ROUTE.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: ROUTE.tex, color: 0x40e0ff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    ROUTE.mesh.renderOrder = 3; ROUTE.mesh.frustumCulled = false;
    R.scene.add(ROUTE.mesh);
  } else { ROUTE.mesh.geometry.dispose(); ROUTE.mesh.geometry = g; }
  ROUTE.mesh.visible = OPTS.gps !== false;
}
// progress along the route; recalculates when the rig strays
function updateRoute(dt) {
  if (!ROUTE.pts || !RIG) return;
  ROUTE.tex.offset.y -= dt * 1.6;
  const P = ROUTE.pts;
  let i = ROUTE.i, bd = dist2(RIG.x, RIG.z, P[i].x, P[i].z);
  for (let k = Math.max(0, i - 4); k < Math.min(P.length, i + 30); k++) { const d = dist2(RIG.x, RIG.z, P[k].x, P[k].z); if (d < bd) { bd = d; i = k; } }
  ROUTE.i = i;
  ROUTE.left = ROUTE.length - ROUTE.cum[i] + Math.sqrt(bd);
  ROUTE.recalcT -= dt;
  if (bd > 18 * 18 && ROUTE.recalcT <= 0 && ROUTE.goal) { ROUTE.recalcT = 1.5; buildRoute(ROUTE.goal, ROUTE.label); if (RIG.auto) RIG.auto = { pts: ROUTE.pts, i: 0 }; }
  // next manoeuvre
  ROUTE.next = null;
  for (const m of ROUTE.man) if (m.d > ROUTE.cum[i] - 4) { ROUTE.next = { kind: m.kind, street: m.street, d: Math.max(0, m.d - ROUTE.cum[i]) }; break; }
}
// rough ETA in game seconds for a straight-line-ish route length
function etaFor(len, lights) { return (len / (lights ? 13 : 9.5) + 8) * TIME_SCALE; }
function routeLength(goal) { return computeRoute(goal).length; }
