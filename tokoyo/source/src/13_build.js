// Tokoyo — building: pieces, colliders, snapping, structural support, placement & removal, stations, fires, doors, beds, chests, portals, raft, hoe

// ---------- oriented boxes ----------
function makeOBB(cx, cy, cz, hx, hy, hz, yaw, pitch = 0) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  return { c: new V3(cx, cy, cz), h: [hx, hy, hz], ax: [new V3(1, 0, 0).applyQuaternion(q), new V3(0, 1, 0).applyQuaternion(q), new V3(0, 0, 1).applyQuaternion(q)] };
}
function obbClosest(o, p, out) {
  _v4.copy(p).sub(o.c);
  out.copy(o.c);
  let inside = true;
  for (let i = 0; i < 3; i++) {
    let d = _v4.dot(o.ax[i]);
    if (d > o.h[i]) { d = o.h[i]; inside = false; } else if (d < -o.h[i]) { d = -o.h[i]; inside = false; }
    out.addScaledVector(o.ax[i], d);
  }
  return inside;
}
function obbRay(o, ro, rd, maxT) {
  let tmin = -1e9, tmax = 1e9, ni = -1, ns = 1;
  _v4.copy(ro).sub(o.c);
  for (let i = 0; i < 3; i++) {
    const e = _v4.dot(o.ax[i]), f = rd.dot(o.ax[i]);
    if (Math.abs(f) > 1e-8) {
      let t1 = (-e - o.h[i]) / f, t2 = (-e + o.h[i]) / f, s = -1;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
      if (t1 > tmin) { tmin = t1; ni = i; ns = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax || tmax < 0) return null;
    } else if (-e - o.h[i] > 0 || -e + o.h[i] < 0) return null;
  }
  const t = tmin >= 0 ? tmin : 0;
  if (t > maxT) return null;
  return { t, n: ni >= 0 ? o.ax[ni].clone().multiplyScalar(ns) : new V3(0, 1, 0) };
}
function obbOverlap(a, b, pad = 0) {
  const T = _v4.copy(b.c).sub(a.c);
  const axes = [...a.ax, ...b.ax];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const c = new V3().crossVectors(a.ax[i], b.ax[j]); if (c.lengthSq() > 1e-6) axes.push(c.normalize()); }
  for (const L of axes) {
    let ra = 0, rb = 0;
    for (let i = 0; i < 3; i++) { ra += (a.h[i] + pad) * Math.abs(a.ax[i].dot(L)); rb += (b.h[i] + pad) * Math.abs(b.ax[i].dot(L)); }
    if (Math.abs(T.dot(L)) > ra + rb) return false;
  }
  return true;
}
function obbAABB(o) {
  const ex = [0, 0, 0];
  for (let i = 0; i < 3; i++) { ex[0] += Math.abs(o.ax[i].x) * o.h[i]; ex[1] += Math.abs(o.ax[i].y) * o.h[i]; ex[2] += Math.abs(o.ax[i].z) * o.h[i]; }
  return [o.c.x - ex[0], o.c.y - ex[1], o.c.z - ex[2], o.c.x + ex[0], o.c.y + ex[1], o.c.z + ex[2]];
}

// ---------- piece shapes: local colliders, snap points, anchor ----------
function pieceShape(def) {
  const [w, h, d] = def.size || [1, 1, 1];
  const S = { solid: [], pick: [], snaps: [], anchor: 0 };
  const box = (cx, cy, cz, hx, hy, hz, pitch = 0) => ({ c: [cx, cy, cz], h: [hx, hy, hz], pitch });
  const grid = (xs, ys, zs) => { for (const x of xs) for (const y of ys) for (const z of zs) S.snaps.push([x, y, z]); };
  switch (def.kind) {
    case 'floor': S.solid.push(box(0, -h / 2, 0, w / 2, h / 2, d / 2)); grid([-w / 2, 0, w / 2], [0], [-d / 2, 0, d / 2]); S.snaps.splice(4, 1); S.anchor = h; break;
    case 'wall': case 'door': S.solid.push(box(0, h / 2, 0, w / 2, h / 2, d / 2)); grid([-w / 2, 0, w / 2], [0, h], [0]); S.snaps.push([-w / 2, h / 2, 0], [w / 2, h / 2, 0]); break;
    case 'beam': S.solid.push(box(0, 0, 0, w / 2, h / 2, d / 2)); S.snaps.push([-w / 2, 0, 0], [w / 2, 0, 0], [0, 0, 0]); S.anchor = h / 2; break;
    case 'pole': S.solid.push(box(0, h / 2, 0, w / 2, h / 2, d / 2)); S.snaps.push([0, 0, 0], [0, h, 0], [0, h / 2, 0]); break;
    case 'roof': {
      const rise = def.rise, len = Math.hypot(d, rise), ang = Math.atan2(rise, d);
      S.solid.push(box(0, rise / 2 + 0.05, 0, w / 2, 0.1, len / 2, ang));
      grid([-w / 2, 0, w / 2], [0], [d / 2]); grid([-w / 2, 0, w / 2], [rise], [-d / 2]);
      break;
    }
    case 'ridge': {
      const rise = def.rise, half = d / 2, len = Math.hypot(half, rise), ang = Math.atan2(rise, half);
      S.solid.push(box(0, rise / 2 + 0.05, d / 4, w / 2, 0.1, len / 2, ang), box(0, rise / 2 + 0.05, -d / 4, w / 2, 0.1, len / 2, -ang));
      grid([-w / 2, 0, w / 2], [0], [-d / 2, d / 2]); grid([-w / 2, 0, w / 2], [rise], [0]);
      break;
    }
    case 'stairs': {
      const len = Math.hypot(h, d), ang = Math.atan2(h, d), th = 0.3;
      S.solid.push(box(0, h / 2 - th / 2 * Math.cos(ang) + 0.08, th / 2 * Math.sin(ang), w / 2, th / 2, len / 2, ang));
      grid([-w / 2, 0, w / 2], [0], [d / 2]); grid([-w / 2, 0, w / 2], [h], [-d / 2]);
      break;
    }
    case 'raft': S.solid.push(box(0, 0.25, 0, w / 2, 0.22, d / 2)); break;
    default: {
      if (def.solid === 'posts') { const px = w / 2 - 0.5; S.solid.push(box(-px, h / 2, 0, 0.22, h / 2, 0.22), box(px, h / 2, 0, 0.22, h / 2, 0.22)); }
      else if (def.solid !== false) S.solid.push(box(0, h / 2, 0, w / 2, h / 2, d / 2));
    }
  }
  if (!S.pick.length) S.pick = S.solid.length ? S.solid : [box(0, h / 2, 0, w / 2, Math.max(h / 2, 0.15), d / 2)];
  return S;
}
const SHAPES = {};
const shapeOf = (id) => SHAPES[id] || (SHAPES[id] = pieceShape(PIECES[id]));

// ---------- state ----------
const BUILD = (() => {
  const pieces = [], grid = new Map(), CELL = 8;
  let uid = 1;
  const tool = { kind: null, sel: null, hoe: 'level', yaw: 0, ghost: null, ghostId: null, valid: false, why: '', pos: new V3(), snapYaw: 0, target: null, menu: false, integrity: false, ring: null };
  const key = (i, j) => (i + 512) * 4096 + (j + 512);
  function cellsOf(p) {
    const out = [];
    const a = p.aabb, i0 = Math.floor(a[0] / CELL), i1 = Math.floor(a[3] / CELL), j0 = Math.floor(a[2] / CELL), j1 = Math.floor(a[5] / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push(key(i, j));
    return out;
  }
  function gridAdd(p) { p.cells = cellsOf(p); for (const k of p.cells) { let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(p); } }
  function gridDel(p) { for (const k of p.cells || []) { const l = grid.get(k); if (l) { const i = l.indexOf(p); if (i >= 0) l.splice(i, 1); } } }
  function near(x, z, r, fn) {
    const seen = new Set();
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const l = grid.get(key(i, j)); if (!l) continue;
      for (const p of l) if (!seen.has(p)) { seen.add(p); if (fn(p) === false) return; }
    }
  }
  // world transform of a piece's colliders and snaps
  function worldShape(id, x, y, z, yaw) {
    const S = shapeOf(id), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const tr = (c) => [x + c[0] * cy + c[2] * sy, y + c[1], z - c[0] * sy + c[2] * cy];
    const ob = (b) => { const c = tr(b.c); return makeOBB(c[0], c[1], c[2], b.h[0], b.h[1], b.h[2], yaw, b.pitch); };
    const solid = S.solid.map(ob), pick = S.pick === S.solid ? solid : S.pick.map(ob);
    const snaps = S.snaps.map((c) => new V3(...tr(c)));
    let aabb = null;
    for (const o of pick.concat(solid)) { const a = obbAABB(o); if (!aabb) aabb = a.slice(); else for (let i = 0; i < 3; i++) { aabb[i] = Math.min(aabb[i], a[i]); aabb[i + 3] = Math.max(aabb[i + 3], a[i + 3]); } }
    return { solid, pick, snaps, aabb };
  }

  // ---------- creation ----------
  function makeMesh(p) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(pieceGeo(p.id), R.mat.vc);
    m.castShadow = true; m.receiveShadow = true;
    if (p.def.kind === 'door') { const hinge = new THREE.Object3D(); hinge.position.x = -p.def.size[0] / 2; hinge.add(m); g.add(hinge); p.hinge = hinge; }
    else g.add(m);
    if (p.def.kind === 'raft') {
      const sail = new THREE.Mesh(buildModel([P_.box(2.4, 2.4, 0.03, 0xd8cfae, [0, -1.2, 0]), ...[0, 1, 2, 3].map((i) => P_.box(2.42, 0.05, 0.05, COL.darkwood, [0, -i * 0.8, 0]))]), R.mat.vcDS);
      sail.position.set(0, 4.2, 0.45); sail.castShadow = true; g.add(sail); p.sail = sail;
    }
    if (p.def.portal) {
      const sw = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), new THREE.MeshBasicMaterial({ color: 0x7fd6ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
      sw.position.set(0, 1.55, 0); g.add(sw); p.swirl = sw;
    }
    m.userData.piece = p; p.mesh = m;
    g.position.set(p.x, p.y, p.z); g.rotation.y = p.yaw;
    R.scene.add(g);
    p.group = g;
  }
  function add(id, x, y, z, yaw, o = {}) {
    const def = PIECES[id];
    const p = { uid: o.uid || uid++, id, def, x, y, z, yaw, hp: o.hp != null ? o.hp : def.hp, data: o.data || {}, support: 0, nbr: [] };
    uid = Math.max(uid, p.uid + 1);
    Object.assign(p, worldShape(id, x, y, z, yaw));
    if (def.chest && !p.data.inv) p.data.inv = new Inventory(5, Math.ceil(def.chest / 5));
    if (def.fire && p.data.fuel == null) p.data.fuel = o.fresh ? 2 : 0;
    if (def.lamp && p.data.fuel == null) p.data.fuel = o.fresh ? 3 : 0;
    if (def.proc && !p.data.q) p.data.q = [];
    if (def.kind === 'raft') { p.data.speed = p.data.speed || 0; p.data.mode = p.data.mode || 0; }
    makeMesh(p);
    pieces.push(p);
    gridAdd(p);
    if (def.kind !== 'raft') linkNeighbours(p);
    return p;
  }
  function linkNeighbours(p) {
    near(p.x, p.z, 6, (q) => {
      if (q === p || q.def.kind === 'raft' || q.static) return;
      if (!touches(p, q)) return;
      p.nbr.push(q); q.nbr.push(p);
    });
  }
  function touches(a, b) {
    const A = a.solid.length ? a.solid : a.pick, B = b.solid.length ? b.solid : b.pick;
    for (const x of A) for (const y of B) if (obbOverlap(x, y, 0.06)) return true;
    return false;
  }
  function remove(p, opts = {}) {
    const i = pieces.indexOf(p); if (i < 0) return;
    pieces.splice(i, 1);
    gridDel(p);
    for (const q of p.nbr) { const k = q.nbr.indexOf(p); if (k >= 0) q.nbr.splice(k, 1); }
    R.scene.remove(p.group);
    if (p.data.inv) for (const s of p.data.inv.slots) if (s) dropStack(s, p.x, p.y + 0.6, p.z);
    if (p.data.q) for (const it of p.data.q) dropItems(it, 1, p.x, p.y + 1, p.z);
    if (p.def.proc === 'tatara' && p.data.fuel) dropItems('coal', p.data.fuel, p.x, p.y + 1, p.z);
    if (p.def.proc === 'spit' && p.data.meat) for (const m of p.data.meat) if (m) dropItems(m.id, 1, p.x, p.y + 1, p.z);
    if (opts.refund) for (const k in p.def.req) dropItems(k, p.def.req[k], p.x, p.y + 0.6, p.z);
    FX.dust(p.x, p.y + 0.5, p.z, 8);
    FX.chips(p.x, p.y + 0.6, p.z, p.def.mat === 'stone' ? COL.stone : COL.wood, 8);
    AU.play('destroy', p.x, p.y + 0.5, p.z);
    if (PLAYER.steer === p) PLAYER.steer = null;
    if (PLAYER.onRaft === p) PLAYER.onRaft = null;
    if (!opts.noSupport) updateSupport();
    bus.emit('pieces');
  }

  // ---------- structural support ----------
  function grounded(p) {
    if (p.def.kind === 'raft') return false;
    const obs = p.solid.length ? p.solid : p.pick;
    for (const o of obs) {
      // bottom corners of the box
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const x = o.c.x + o.ax[0].x * o.h[0] * sx + o.ax[1].x * o.h[1] * sy + o.ax[2].x * o.h[2] * sz;
        const y = o.c.y + o.ax[0].y * o.h[0] * sx + o.ax[1].y * o.h[1] * sy + o.ax[2].y * o.h[2] * sz;
        const z = o.c.z + o.ax[0].z * o.h[0] * sx + o.ax[1].z * o.h[1] * sy + o.ax[2].z * o.h[2] * sz;
        if (y < p.aabb[1] + 0.3 && heightAt(x, z) >= y - 0.25) return true;
      }
    }
    return false;
  }
  function supportFrom(p, q) { // support q passes to p
    if (q.def.kind === 'obj' || q.def.kind === 'stakes') return 0;
    const mat = MATS[p.def.mat] || MATS.wood;
    const vertical = q.aabb[4] <= p.aabb[1] + 0.2;
    if (!vertical && q.aabb[1] >= p.aabb[4] - 0.2) return q.support * (1 - mat.hLoss) * 0.5; // hanging under q
    return q.support * (1 - (vertical ? mat.vLoss : mat.hLoss));
  }
  function computeSupport(list) {
    const heap = new MaxHeap();
    for (const p of list) {
      p.support = 0; p.done = false;
      if (p.def.kind === 'raft') continue;
      if (p.isGround == null) p.isGround = grounded(p);
      if (p.isGround) { p.support = (MATS[p.def.mat] || MATS.wood).max; heap.push({ k: p.support, p }); }
    }
    while (heap.size) {
      const { p } = heap.pop();
      if (p.done) continue; p.done = true;
      for (const q of p.nbr) {
        if (q.done) continue;
        const s = Math.min((MATS[q.def.mat] || MATS.wood).max, supportFrom(q, p));
        if (s > q.support) { q.support = s; heap.push({ k: s, p: q }); }
      }
    }
  }
  function updateSupport() {
    for (let pass = 0; pass < 20; pass++) {
      computeSupport(pieces);
      const fall = pieces.filter((p) => p.def.kind !== 'raft' && p.support < (MATS[p.def.mat] || MATS.wood).min);
      if (!fall.length) break;
      for (const p of fall) {
        // collapsed pieces return what they were made of
        for (const k in p.def.req) dropItems(k, Math.max(1, Math.floor(p.def.req[k] * 0.67)), p.x, p.y + 0.5, p.z);
        remove(p, { noSupport: true });
      }
    }
    if (tool.integrity) tintAll();
  }
  function supportColor(p) {
    const m = MATS[p.def.mat] || MATS.wood, f = (p.support - m.min) / (m.max - m.min);
    return f > 0.75 ? 0 : f > 0.5 ? 1 : f > 0.25 ? 2 : f > 0.08 ? 3 : 4;
  }
  function tintAll() { for (const p of pieces) p.mesh.material = tool.integrity && p.def.kind !== 'raft' ? R.mat.integ[supportColor(p)] : R.mat.vc; }
  bus.on('terrain', (x, z, r) => {
    let any = false;
    near(x, z, r + 4, (p) => { const g = grounded(p); if (g !== p.isGround) { p.isGround = g; any = true; } });
    if (any) updateSupport();
  });

  // ---------- queries ----------
  function raycast(o, d, maxT, solidOnly) {
    let best = null;
    const seen = new Set();
    const steps = Math.ceil(maxT / 4) + 1;
    for (let s = 0; s <= steps; s++) {
      const t = Math.min(maxT, s * 4);
      const x = o.x + d.x * t, z = o.z + d.z * t;
      near(x, z, 4, (p) => {
        if (seen.has(p)) return; seen.add(p);
        const list = solidOnly ? p.solid : p.pick.concat(p.solid);
        for (const ob of list) {
          if (p.def.kind === 'door' && p.data.open && solidOnly) continue;
          const h = obbRay(ob, o, d, best ? best.t : maxT);
          if (h && (!best || h.t < best.t)) best = { t: h.t, n: h.n, piece: p };
        }
      });
    }
    if (best) best.point = o.clone().addScaledVector(d, best.t);
    return best;
  }
  const _down = new V3(0, -1, 0), _o = new V3(), _q = new V3(), _c = new V3();
  function surfaceBelow(x, y, z) {
    let best = null;
    near(x, z, 2, (p) => {
      if (p.def.kind === 'door' && p.data.open) return;
      for (const ob of p.solid) {
        const h = obbRay(ob, _o.set(x, y, z), _down, 40);
        if (h && h.t > 0 && (best == null || y - h.t > best)) { best = y - h.t; }
      }
    });
    return best;
  }
  // push a vertical capsule (feet at p) out of solid pieces; horizontal only
  function pushOut(p, r, height, horiz) {
    const ys = [r + 0.08, height / 2, height - r];
    near(p.x, p.z, 3, (pc) => {
      if (pc.def.kind === 'door' && pc.data.open) return;
      if (pc.def.kind === 'raft' && PLAYER.steer === pc) return;
      for (const ob of pc.solid) for (const oy of ys) {
        _c.set(p.x, p.y + oy, p.z);
        const inside = obbClosest(ob, _c, _q);
        let nx, ny, nz, d;
        if (inside) {
          // centre inside: push out along the box face nearest horizontally
          _v4.copy(_c).sub(ob.c);
          let bi = 0, bd = 1e9, bs = 1;
          for (let i = 0; i < 3; i++) { const dd = _v4.dot(ob.ax[i]); const pen = ob.h[i] - Math.abs(dd); if (Math.abs(ob.ax[i].y) < 0.7 && pen < bd) { bd = pen; bi = i; bs = Math.sign(dd) || 1; } }
          nx = ob.ax[bi].x * bs; ny = 0; nz = ob.ax[bi].z * bs; d = -bd;
        } else {
          nx = _c.x - _q.x; ny = _c.y - _q.y; nz = _c.z - _q.z; d = Math.hypot(nx, ny, nz);
          if (d >= r || d < 1e-6) continue;
          nx /= d; ny /= d; nz /= d;
        }
        if (horiz && ny > 0.55) continue;
        const hl = Math.hypot(nx, nz); if (hl < 0.15) continue;
        const push = Math.min(0.6, (r - d) / hl);
        p.x += nx / hl * push; p.z += nz / hl * push;
        if (ny < -0.6 && PLAYER.vel.y > 0) PLAYER.vel.y = 0;
      }
    });
  }
  function coveredAt(x, z, y) {
    // grass: a floor resting on the ground here
    let c = false;
    near(x, z, 1, (p) => { if (c) return false; if (p.def.kind !== 'floor' && p.def.kind !== 'obj') return; if (p.aabb[1] > y + 0.6) return; if (x > p.aabb[0] && x < p.aabb[3] && z > p.aabb[2] && z < p.aabb[5]) c = true; });
    return c;
  }
  function roofAt(x, y, z) { const h = raycast(_o.set(x, y, z), UP, 30, true); return !!h; }
  // fraction of sky rays blocked: >0.8 = sheltered
  function shelterAt(x, y, z) {
    if (!roofAt(x, y, z)) return 0;
    let n = 0, hit = 0;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; _v3.set(Math.cos(a) * 0.7, 0.7, Math.sin(a) * 0.7).normalize(); n++; if (raycast(_o.set(x, y, z), _v3, 25, true)) hit++; }
    return 0.5 + 0.5 * hit / n;
  }
  function stationLevel(p) {
    let lv = 1;
    const seen = new Set();
    near(p.x, p.z, 6, (q) => { if (q.def.ext === p.def.station && !seen.has(q.id) && dist2(q.x, q.z, p.x, p.z) < 25) { seen.add(q.id); lv++; } });
    return lv;
  }
  function stationOk(p) {
    if (p.def.station === 'workbench' && !roofAt(p.x, p.y + 1.2, p.z)) return 'needs a roof';
    if (p.def.needFire && !fireUnder(p)) return 'needs a fire under it';
    return null;
  }
  function fireUnder(p) {
    let f = false;
    near(p.x, p.z, 2, (q) => { if (q.def.fire && q.data.fuel > 0 && dist2(q.x, q.z, p.x, p.z) < 1.2 * 1.2 && q.y <= p.y + 0.3) f = true; });
    return f;
  }
  function stationsAt(x, z, y = PLAYER.pos.y) {
    const lv = {};
    near(x, z, 22, (p) => {
      const st = p.def.station; if (!st) return;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d > p.def.range || Math.abs(p.y - y) > 8) return;
      if (stationOk(p)) return;
      lv[st] = Math.max(lv[st] || 0, stationLevel(p));
    });
    return lv;
  }
  function inRangeOf(st, x, z, y) {
    let ok = false;
    near(x, z, 22, (p) => { if (p.def.station === st && dist2(p.x, p.z, x, z) < p.def.range * p.def.range && Math.abs(p.y - y) < 12) ok = true; });
    return ok;
  }
  function comfortAt(x, z, y) {
    const groups = {};
    near(x, z, 10, (p) => {
      if (!p.def.comfort || dist2(p.x, p.z, x, z) > 100 || Math.abs(p.y - y) > 5) return;
      if (p.def.fire && !(p.data.fuel > 0)) return;
      const [g, v] = p.def.comfort; groups[g] = Math.max(groups[g] || 0, v);
    });
    let c = 1; for (const g in groups) c += groups[g];
    return { level: c, fire: !!groups.fire };
  }
  function firesNear(x, z, y, r) {
    const out = [];
    near(x, z, r, (p) => { if (p.def.fire && p.data.fuel > 0 && dist2(p.x, p.z, x, z) < r * r && Math.abs(p.y - y) < 4) out.push(p); });
    return out;
  }

  // ---------- placement ----------
  function cost(def) { return G.noCost ? {} : def.req; }
  function setGhost(id) {
    if (tool.ghost) { R.scene.remove(tool.ghost); tool.ghost = null; }
    tool.ghostId = id;
    if (!id) return;
    const def = PIECES[id];
    if (def.tool === 'repair') return;
    const g = new THREE.Group();
    const m = new THREE.Mesh(pieceGeo(id), R.mat.ghost);
    if (def.kind === 'door') m.position.x = -def.size[0] / 2;
    g.add(m); g.userData.m = m;
    R.scene.add(g);
    tool.ghost = g;
  }
  function ringMesh() {
    if (tool.ring) return tool.ring;
    const r = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; R.scene.add(r); tool.ring = r; return r;
  }
  function aimHit(maxD = 9) {
    const ray = aimRay();
    const P = PLAYER;
    let t = rayTerrain(ray.o, ray.d, 30), n = null, piece = null;
    const hb = raycast(ray.o, ray.d, t > 0 ? t : 30, false);
    if (hb) { t = hb.t; n = hb.n; piece = hb.piece; }
    if (t < 0) return null;
    const pt = ray.o.clone().addScaledVector(ray.d, t);
    if (Math.hypot(pt.x - P.pos.x, pt.z - P.pos.z) > maxD || Math.abs(pt.y - P.pos.y) > maxD) return null;
    if (!n) n = normalAt(pt.x, pt.z, new V3());
    return { pt, n, piece, t };
  }
  function updateGhost() {
    const id = tool.sel, def = id && PIECES[id];
    if (!def || def.tool) { if (tool.ghost) tool.ghost.visible = false; return; }
    if (tool.ghostId !== id) setGhost(id);
    const hit = aimHit();
    if (!hit) { tool.ghost.visible = false; tool.valid = false; tool.why = ''; return; }
    tool.ghost.visible = true;
    const S = shapeOf(id);
    let yaw = tool.yaw;
    let pos = hit.pt.clone();
    if (def.kind === 'raft') pos.y = waveH(pos.x, pos.z) - 0.1;
    else pos.y += S.anchor;
    // align to the piece we're pointing at
    const tgt = hit.piece;
    if (tgt && def.snap && !Input.down('ShiftLeft')) {
      const rel = angWrap(tool.yaw - tgt.yaw);
      const q = Math.round(rel / (Math.PI / 2)) * (Math.PI / 2);
      if (Math.abs(rel - q) < 0.4) yaw = tgt.yaw + q;
    }
    // snapping: move the ghost so one of its snap points meets a nearby piece's. Candidates that would
    // overlap an existing piece are skipped; the orientation lining up the most snap points wins.
    let snapped = false;
    const near3 = [];
    near(hit.pt.x, hit.pt.z, 3.5, (p) => { if (!p.static && p.def.kind !== 'raft') near3.push(p); });
    const trySnap = (yw) => {
      const ws = worldShape(id, 0, 0, 0, yw);
      const cy = (ws.aabb[1] + ws.aabb[4]) / 2;
      let best = null;
      const seen = new Set();
      for (const p of near3) for (const e of p.snaps) {
        if (e.distanceToSquared(hit.pt) > 2.6 * 2.6) continue;
        for (const g of ws.snaps) {
          const nx = e.x - g.x, ny = e.y - g.y, nz = e.z - g.z;
          const key = Math.round(nx * 20) + ',' + Math.round(ny * 20) + ',' + Math.round(nz * 20);
          if (seen.has(key)) continue; seen.add(key);
          // the piece should end up where the player is pointing
          const dist = Math.hypot(nx + (ws.aabb[0] + ws.aabb[3]) / 2 - hit.pt.x, nz + (ws.aabb[2] + ws.aabb[5]) / 2 - hit.pt.z) + Math.abs(ny + cy - hit.pt.y) * 0.25;
          if (dist > 2.6 || (best && dist - 0.7 > best.score)) continue;
          const w2 = worldShape(id, nx, ny, nz, yw);
          if (overlapsPieces(w2, near3)) continue;
          let match = 0;
          for (const gs of w2.snaps) { let ok = false; for (const q of near3) { for (const e2 of q.snaps) if (e2.distanceToSquared(gs) < 0.004) { ok = true; break; } if (ok) break; } if (ok) match++; }
          const score = dist - Math.min(match, 3) * 0.25;
          if (!best || score < best.score) best = { pos: new V3(nx, ny, nz), yaw: yw, score };
        }
      }
      return best;
    };
    if (def.snap && S.snaps.length && !Input.down('ShiftLeft') && near3.length) {
      const ref = tgt || near3.reduce((a, p) => (!a || dist2(p.x, p.z, hit.pt.x, hit.pt.z) < dist2(a.x, a.z, hit.pt.x, hit.pt.z) ? p : a), null);
      if (ref && !tgt) { const rel = angWrap(tool.yaw - ref.yaw), q = Math.round(rel / (Math.PI / 2)) * (Math.PI / 2); if (Math.abs(rel - q) < 0.4) yaw = ref.yaw + q; }
      const yaws = (def.kind === 'wall' || def.kind === 'door' || def.kind === 'beam' || def.kind === 'stairs') ? [yaw, yaw + Math.PI / 2] : [yaw];
      if (def.kind === 'stairs') yaws.push(yaw + Math.PI, yaw - Math.PI / 2);
      let r = null;
      for (const yw of yaws) { const c = trySnap(yw); if (c && (!r || c.score < r.score - 0.05)) r = c; }
      if (r) { pos.copy(r.pos); yaw = r.yaw; snapped = true; }
    }
    tool.pos.copy(pos); tool.snapYaw = yaw;
    tool.ghost.position.copy(pos); tool.ghost.rotation.y = yaw;
    // validity
    const ws = worldShape(id, pos.x, pos.y, pos.z, yaw);
    let why = '';
    const P = PLAYER;
    if (!PLAYER.inv.has(cost(def))) why = 'Missing materials';
    else if (def.st && !G.noCost && !inRangeOf(def.st, pos.x, pos.z, pos.y)) why = def.st === 'stonecutter' ? 'Needs a stonecutter nearby' : 'Needs a workbench nearby';
    else if (def.kind === 'raft' && heightAt(pos.x, pos.z) > -0.9) why = 'Must be placed on deeper water';
    else if (def.kind !== 'raft' && !snapped && pos.y < waveH(pos.x, pos.z) - 1.2) why = 'Too deep in the water';
    else {
      const shrink = (o) => ({ c: o.c, ax: o.ax, h: o.h.map((v) => Math.max(0.01, v - 0.09)) });
      let blocked = false;
      near(pos.x, pos.z, 6, (p) => {
        if (p.static && def.kind === 'raft') return;
        for (const a of ws.solid.length ? ws.solid : ws.pick) for (const b of p.solid.length ? p.solid : p.pick) if (obbOverlap(shrink(a), shrink(b))) { blocked = true; return false; }
      });
      if (blocked) why = 'Something is in the way';
      // the player's own body
      if (!why && ws.solid.length) {
        const pc = { c: new V3(P.pos.x, P.pos.y + 0.9, P.pos.z), ax: [new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1)], h: [0.3, 0.85, 0.3] };
        for (const a of ws.solid) if (obbOverlap(shrink(a), pc)) { why = 'You are in the way'; break; }
      }
      if (!why && def.kind !== 'raft') {
        // support preview
        const tmp = { def, solid: ws.solid, pick: ws.pick, aabb: ws.aabb, nbr: [] };
        tmp.isGround = grounded(Object.assign(tmp, { def }));
        let sup = tmp.isGround ? (MATS[def.mat] || MATS.wood).max : 0;
        if (!tmp.isGround) near(pos.x, pos.z, 6, (p) => { if (!p.static && touches(tmp, p)) sup = Math.max(sup, Math.min((MATS[def.mat] || MATS.wood).max, supportFrom(tmp, p))); });
        if (sup < (MATS[def.mat] || MATS.wood).min) why = 'Not enough support';
        tool.ghostSupport = sup;
      }
    }
    tool.valid = !why; tool.why = why;
    tool.ghost.userData.m.material = why ? R.mat.ghostBad : R.mat.ghost;
  }
  function overlapsPieces(ws, list) {
    const shrink = (o) => ({ c: o.c, ax: o.ax, h: o.h.map((v) => Math.max(0.01, v - 0.09)) });
    for (const p of list) for (const a of ws.solid.length ? ws.solid : ws.pick) for (const b of p.solid.length ? p.solid : p.pick) if (obbOverlap(shrink(a), shrink(b))) return true;
    return false;
  }
  function place() {
    const def = PIECES[tool.sel];
    if (!tool.valid) { if (tool.why) HUD.msg(tool.why, 'bad'); return; }
    PLAYER.inv.take(cost(def));
    const p = add(def.id, tool.pos.x, tool.pos.y, tool.pos.z, tool.snapYaw, { fresh: true });
    updateSupport();
    AU.play('build', p.x, p.y, p.z);
    FX.dust(p.x, p.y, p.z, 4);
    PLAYER.act = { kind: 'melee', anim: 'swing', t: 0, dur: 0.45, hitT: 0.2, combo: 0, mult: 0, done: true, cancel: true };
    bus.emit('placed', p);
    bus.emit('pieces');
    if (def.portal) UI.portalName(p);
  }
  function lookPiece(maxD = 8) {
    const ray = aimRay();
    const h = raycast(ray.o, ray.d, 30, false);
    if (!h) return null;
    const tt = rayTerrain(ray.o, ray.d, h.t);
    if (tt >= 0 && tt < h.t) return null;
    if (h.point.distanceTo(PLAYER.pos) > maxD) return null;
    return h.piece;
  }
  function deconstruct() {
    const p = lookPiece();
    if (!p || p.static) return;
    if (p.data.inv && p.data.inv.slots.some((s) => s)) { HUD.msg('Empty the chest first.'); return; }
    if (PLAYER.steer === p) return;
    remove(p, { refund: true });
    PLAYER.act = { kind: 'melee', anim: 'swing', t: 0, dur: 0.45, hitT: 0.2, combo: 1, mult: 0, done: true, cancel: true };
  }
  function repairLook() {
    const p = lookPiece();
    if (!p || p.static) return;
    if (p.hp >= p.def.hp) { HUD.msg(p.def.name + ' is not damaged.'); return; }
    if (!G.noCost && !inRangeOf('workbench', p.x, p.z, p.y)) { HUD.msg('Needs a workbench nearby to repair.'); return; }
    p.hp = p.def.hp; AU.play('build', p.x, p.y, p.z); FX.magic(p.x, p.y + 1, p.z, [1, 1, 0.8], 8, 1); HUD.msg('Repaired ' + p.def.name + '.');
  }
  function damagePiece(p, amt) {
    if (!p || p.static || (p.def.kind === 'raft' && amt < 5)) return;
    p.hp -= amt;
    FX.chips(p.x, p.y + 0.8, p.z, p.def.mat === 'stone' ? COL.stone : COL.wood, 4);
    AU.play('chop', p.x, p.y + 0.5, p.z, 0.6);
    if (p.hp <= 0) {
      for (const k in p.def.req) dropItems(k, Math.floor(p.def.req[k] * 0.5), p.x, p.y + 0.5, p.z);
      remove(p);
    }
  }
  // hoe
  function hoeApply(hit) {
    const mode = HOE_MODES.find((m) => m.id === tool.hoe);
    if (!G.noCost && !PLAYER.inv.has(mode.req)) { HUD.msg('Missing materials', 'bad'); return; }
    if (!useStamina(4)) return;
    const { x, z } = hit.pt;
    const P = PLAYER;
    if (mode.id === 'level') {
      const ty = P.pos.y;
      editTerrain(x, z, 1.9, (h, k) => lerp(h, ty, k < 0.7 ? 1 : 1 - smooth(0.7, 1, k)));
      paintTerrain(x, z, 1.6, 1);
    } else if (mode.id === 'raise') {
      editTerrain(x, z, 1.6, (h, k, ix, iz) => Math.min(h + 0.5 * (1 - smooth(0.6, 1, k)), heightBase(ix, iz) + 8));
      paintTerrain(x, z, 1.4, 1);
    } else if (mode.id === 'path') paintTerrain(x, z, 1.2, 1);
    else if (mode.id === 'paved') { editTerrain(x, z, 1.4, (h, k) => lerp(h, hit.pt.y, 0.5 * (1 - k))); paintTerrain(x, z, 1.3, 2); }
    if (!G.noCost) PLAYER.inv.take(mode.req);
    refreshShoreTex(x, z, 4);
    updateGrass(PLAYER.pos.x, PLAYER.pos.z, true);
    AU.play('step', x, hit.pt.y, z, 1);
    FX.dust(x, hit.pt.y, z, 4);
    P.act = { kind: 'melee', anim: 'swing', t: 0, dur: 0.5, hitT: 0.25, combo: 0, mult: 0, done: true, cancel: true };
  }
  function toolInput(kind, dt) {
    tool.kind = kind;
    const m = Input.m;
    if (m.hit[2]) { UI.openBuildMenu(kind); return; }
    if (kind === 'hammer') {
      if (m.wheel) tool.yaw += m.wheel * Math.PI / 8;
      if (Input.hit('KeyR')) tool.yaw += Math.PI / 8;
      if (Input.hit('KeyT')) { tool.integrity = !tool.integrity; tintAll(); HUD.msg(tool.integrity ? 'Showing structural support' : 'Support view off'); }
      if (m.hit[1] || Input.hit('KeyQ')) { deconstruct(); return; }
      if (!tool.sel) { if (m.hit[0]) UI.openBuildMenu(kind); return; }
      if (PIECES[tool.sel].tool === 'repair') { if (m.hit[0]) repairLook(); return; }
      updateGhost();
      if (m.hit[0] && (!PLAYER.act || PLAYER.act.cancel)) place();
    } else if (kind === 'hoe') {
      const hit = aimHit(8);
      const ring = ringMesh();
      ring.visible = !!hit;
      if (hit) { ring.position.set(hit.pt.x, hit.pt.y + 0.08, hit.pt.z); }
      if (hit && m.hit[0] && (!PLAYER.act || PLAYER.act.cancel)) hoeApply(hit);
    }
  }
  function toolIdle() {
    if (tool.ghost) tool.ghost.visible = false;
    if (tool.ring) tool.ring.visible = false;
    if (tool.integrity) { tool.integrity = false; tintAll(); }
    tool.kind = null;
  }

  // ---------- interaction ----------
  function interactPrompt(p) {
    if (p.static) return null;
    const d = p.def, P = PLAYER;
    if (d.station) { const w = stationOk(p); return w ? d.name + ' — ' + w : '[E] Use ' + d.name; }
    if (d.fire) return d.name + (p.data.fuel > 0 ? ' (' + Math.ceil(p.data.fuel) + '/' + d.fire.max + ')' : ' (out)') + ' — [E] Add wood';
    if (d.lamp) return d.name + ' (' + Math.ceil(p.data.fuel) + '/' + d.lamp.max + ') — [E] Add resin';
    if (d.bed) return '[E] ' + (P.spawn && P.spawn.uid === p.uid ? 'Sleep' : 'Set spawn point');
    if (d.chest) return '[E] Open ' + d.name;
    if (d.kind === 'door') return '[E] ' + (p.data.open ? 'Close' : 'Open');
    if (d.seat) return '[E] Sit';
    if (d.portal) return 'Torii portal "' + (p.data.tag || '') + '" — [E] Set tag';
    if (d.kind === 'raft') return '[E] Steer the raft';
    if (d.proc === 'kiln') return d.name + ' (' + p.data.q.length + '/25 wood) — [E] Add wood';
    if (d.proc === 'tatara') return d.name + ' (ore ' + p.data.q.length + '/10, charcoal ' + (p.data.fuel || 0) + '/20) — [E] Add ore  [Shift+E] Add charcoal';
    if (d.proc === 'spit') {
      const meat = p.data.meat || [];
      const ready = meat.find((m) => m && m.t >= 25 && !m.burnt);
      if (ready) return '[E] Take ' + ITEMS[ready.out].name;
      return d.name + (fireUnder(p) ? '' : ' (no fire)') + ' — [E] Cook meat';
    }
    if (d.ext) return d.name + ' (extends the ' + d.ext + ')';
    return null;
  }
  function interact(p, shift) {
    const d = p.def, P = PLAYER, inv = P.inv;
    if (d.station) { const w = stationOk(p); if (w) { HUD.msg(d.name + ' ' + w + '.'); return; } UI.openInventory(p); return; }
    if (d.fire) { if (p.data.fuel >= d.fire.max) { HUD.msg('It is full.'); return; } if (!inv.remove('wood', 1)) { HUD.msg('You have no wood.'); return; } p.data.fuel = Math.min(d.fire.max, Math.floor(p.data.fuel) + 1); AU.play('fire', p.x, p.y, p.z); return; }
    if (d.lamp) { if (p.data.fuel >= d.lamp.max) { HUD.msg('It is full.'); return; } if (!inv.remove('resin', 1)) { HUD.msg('You have no resin.'); return; } p.data.fuel = Math.min(d.lamp.max, Math.floor(p.data.fuel) + 1); return; }
    if (d.bed) return SURV.useBed(p);
    if (d.chest) { UI.openChest(p); return; }
    if (d.kind === 'door') { p.data.open = !p.data.open; AU.play('door', p.x, p.y + 1, p.z); return; }
    if (d.seat) { P.pos.set(p.x, p.y + 0.1, p.z); P.vel.set(0, 0, 0); P.sit = true; P.yaw = p.yaw; return; }
    if (d.portal) { UI.portalName(p); return; }
    if (d.kind === 'raft') { startSteer(p); return; }
    if (d.proc === 'kiln') { if (p.data.q.length >= 25) { HUD.msg('It is full.'); return; } let n = 0; while (p.data.q.length < 25 && n < (shift ? 25 : 1) && inv.remove('wood', 1)) { p.data.q.push('wood'); n++; } if (!n) HUD.msg('You have no wood.'); return; }
    if (d.proc === 'tatara') {
      if (shift) { let n = 0; while ((p.data.fuel || 0) < 20 && n < 20 && inv.remove('coal', 1)) { p.data.fuel = (p.data.fuel || 0) + 1; n++; } if (!n) HUD.msg('You have no charcoal.'); return; }
      if (p.data.q.length >= 10) { HUD.msg('It is full.'); return; }
      const ore = inv.count('copper_ore') ? 'copper_ore' : inv.count('tin_ore') ? 'tin_ore' : null;
      if (!ore) { HUD.msg('You have no ore.'); return; }
      inv.remove(ore, 1); p.data.q.push(ore); return;
    }
    if (d.proc === 'spit') {
      const meat = p.data.meat || (p.data.meat = [null, null]);
      const ready = meat.findIndex((m) => m && m.t >= 25 && !m.burnt);
      const burnt = meat.findIndex((m) => m && m.burnt);
      if (ready >= 0) { inv.add(meat[ready].out, 1); HUD.pickup(meat[ready].out, 1); meat[ready] = null; return; }
      if (burnt >= 0) { inv.add('burnt_meat', 1); meat[burnt] = null; return; }
      const free = meat.indexOf(null);
      if (free < 0) { HUD.msg('The spit is full.'); return; }
      const raw = inv.count('raw_venison') ? 'raw_venison' : inv.count('raw_boar') ? 'raw_boar' : null;
      if (!raw) { HUD.msg('You have no raw meat.'); return; }
      inv.remove(raw, 1); meat[free] = { id: raw, out: raw === 'raw_boar' ? 'cooked_boar' : 'cooked_venison', t: 0 };
      return;
    }
  }

  // ---------- raft ----------
  function startSteer(p) {
    const P = PLAYER;
    P.steer = p; P.sit = false; P.act = null; P.draw = 0;
    HUD.msg('W / S: set sail · A / D: rudder · E: let go');
    bus.emit('steer');
  }
  const RAFT_MODES = ['Paddle back', 'Stop', 'Paddle', 'Half sail', 'Full sail'];
  function updateRafts(dt) {
    const P = PLAYER;
    for (const p of pieces) {
      if (p.def.kind !== 'raft') continue;
      const D = p.data;
      const mode = D.mode || 0;
      const wind = Math.cos(angWrap(Math.atan2(WIND.dir.value.x, WIND.dir.value.y) - p.yaw));
      const wf = 0.35 + 0.65 * (wind + 1) / 2;
      const target = mode === -1 ? -1.6 : mode === 1 ? 2.2 : mode === 2 ? 5.2 * wf * (0.6 + SKY.windS * 0.6) : mode === 3 ? 8.4 * wf * (0.6 + SKY.windS * 0.6) : 0;
      D.speed = lerp(D.speed || 0, target, Math.min(1, dt * 0.35));
      const ox = p.x, oz = p.z, oyaw = p.yaw;
      p.yaw += (D.rudder || 0) * dt * 0.45 * clamp(Math.abs(D.speed) / 3 + 0.3, 0.3, 1);
      const nx = p.x + Math.sin(p.yaw) * D.speed * dt, nz = p.z + Math.cos(p.yaw) * D.speed * dt;
      // bump into the shore
      const bow = heightAt(nx + Math.sin(p.yaw) * 2.6 * Math.sign(D.speed || 1), nz + Math.cos(p.yaw) * 2.6 * Math.sign(D.speed || 1));
      if (bow > -0.55) { D.speed *= -0.3; if (Math.abs(D.speed) > 0.5) { damagePiece(p, 3); AU.play('thud', p.x, 0, p.z, 0.5); } }
      else { p.x = nx; p.z = nz; }
      const y = waveH(p.x, p.z) - 0.18;
      const dy = y - p.y; p.y = y;
      const tx = (waveH(p.x + 1, p.z) - waveH(p.x - 1, p.z)) / 2, tz = (waveH(p.x, p.z + 1) - waveH(p.x, p.z - 1)) / 2;
      p.group.position.set(p.x, p.y, p.z);
      p.group.rotation.set(0, 0, 0); p.group.rotation.order = 'YXZ'; p.group.rotation.y = p.yaw; p.group.rotation.x = -tz * 0.6; p.group.rotation.z = tx * 0.6;
      if (p.sail) { p.sail.visible = mode >= 2; p.sail.scale.y = mode === 2 ? 0.55 : 1; p.sail.position.y = mode === 2 ? 4.2 : 4.2; }
      // refresh colliders
      gridDel(p); Object.assign(p, worldShape(p.id, p.x, p.y, p.z, p.yaw)); gridAdd(p);
      // carry the player standing on the deck
      const dyaw = p.yaw - oyaw, ddx = p.x - ox, ddz = p.z - oz;
      if (P.steer === p) continue;
      const lx = P.pos.x - p.x, lz = P.pos.z - p.z;
      const deckTop = p.y + 0.47;
      if (P.grounded && Math.abs(P.pos.y - deckTop) < 0.35 && Math.abs(lx * Math.cos(p.yaw) - lz * Math.sin(p.yaw)) < 1.6 && Math.abs(lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw)) < 2.4) {
        const c = Math.cos(dyaw), s = Math.sin(dyaw);
        const rx = (P.pos.x - ox) * c + (P.pos.z - oz) * s, rz = -(P.pos.x - ox) * s + (P.pos.z - oz) * c;
        P.pos.x = p.x + rx; P.pos.z = p.z + rz; P.pos.y += dy; P.yaw += dyaw; CAM.yaw += dyaw;
        P.onRaft = p;
      } else if (P.onRaft === p) P.onRaft = null;
      if (Math.abs(D.speed) > 2 && Math.random() < dt * 4) FX.splash(p.x - Math.sin(p.yaw) * 2.4, p.z - Math.cos(p.yaw) * 2.4, 3);
    }
  }
  function steerRaftInput(dt, uiOpen) {
    const P = PLAYER, p = P.steer, D = p.data;
    if (!uiOpen) {
      if (Input.hit('KeyW')) { D.mode = Math.min(3, (D.mode || 0) + 1); HUD.msg(RAFT_MODES[D.mode + 1]); }
      if (Input.hit('KeyS')) { D.mode = Math.max(-1, (D.mode || 0) - 1); HUD.msg(RAFT_MODES[D.mode + 1]); }
      D.rudder = (Input.down('KeyA') ? 1 : 0) - (Input.down('KeyD') ? 1 : 0);
      if (Input.hit('KeyE') || Input.hit('Space')) { P.steer = null; D.rudder = 0; P.pos.set(p.x - Math.sin(p.yaw) * 1.6, p.y + 0.5, p.z - Math.cos(p.yaw) * 1.6); P.vel.set(0, 0, 0); return; }
    }
    // stand at the stern
    P.pos.set(p.x - Math.sin(p.yaw) * 1.8, p.y + 0.47, p.z - Math.cos(p.yaw) * 1.8);
    P.yaw = p.yaw; P.vel.set(0, 0, 0); P.grounded = true; P.swim = false; P.fallFrom = P.pos.y;
  }

  // ---------- per-frame upkeep ----------
  let lightT = 0;
  function update(dt) {
    const P = PLAYER;
    const lights = [];
    const ppos = P.pos;
    for (const p of pieces) {
      const d = p.def, D = p.data;
      const close = dist2(p.x, p.z, ppos.x, ppos.z) < 80 * 80;
      if (d.fire) {
        if (D.fuel > 0) {
          const exposed = SKY.rain > 0.5 && !roofCached(p);
          D.fuel = Math.max(0, D.fuel - dt / d.fire.burn * (exposed ? 4 : 1));
          if (close) {
            FX.fire(p.x, p.y + 0.15, p.z, d.id === 'irori' ? 0.8 : 1);
            lights.push({ x: p.x, y: p.y + 1.0, z: p.z, i: (0.55 + SKY.night * 1.1) * (1 + Math.sin(G.time * 13 + p.uid) * 0.1 + Math.sin(G.time * 7.3) * 0.06), c: 0xff9a4a, r: 16 });
          }
          // standing in the fire burns
          if (P.alive && dist2(p.x, p.z, ppos.x, ppos.z) < 0.5 && Math.abs(ppos.y - p.y) < 0.6) damagePlayer({ fire: 6 * dt * 10 }, null, true);
        }
      } else if (d.lamp) {
        if (D.fuel > 0) {
          D.fuel = Math.max(0, D.fuel - dt / d.lamp.burn);
          if (close) lights.push({ x: p.x, y: p.y + (d.id === 'toro' ? 1.35 : 0.7), z: p.z, i: 1.1, c: d.id === 'toro' ? 0xffb060 : 0xffd090, r: 12 });
        }
      } else if (d.proc === 'kiln' && D.q.length) {
        D.t = (D.t || 0) + dt;
        if (close) { FX.fire(p.x, p.y + 2.3, p.z, 0.3); lights.push({ x: p.x, y: p.y + 0.6, z: p.z + 0.8, i: 0.8, c: 0xff7a30, r: 6 }); }
        if (D.t >= 12) { D.t = 0; D.q.shift(); dropItems('coal', 1, p.x + Math.sin(p.yaw) * 1.1, p.y + 0.5, p.z + Math.cos(p.yaw) * 1.1); AU.play('pickup', p.x, p.y, p.z, 0.5); }
      } else if (d.proc === 'tatara' && D.q.length && D.fuel > 0) {
        D.t = (D.t || 0) + dt;
        if (close) { FX.fire(p.x, p.y + 2.6, p.z, 0.5); FX.sparks(p.x, p.y + 2.6, p.z, 1); lights.push({ x: p.x, y: p.y + 0.6, z: p.z + 1.0, i: 1.2, c: 0xff7a30, r: 8 }); }
        if (D.t >= 24) {
          D.t = 0; const ore = D.q.shift(); D.fuel--;
          dropItems(ore === 'copper_ore' ? 'copper' : 'tin', 1, p.x + Math.sin(p.yaw) * 1.3, p.y + 0.6, p.z + Math.cos(p.yaw) * 1.3);
          AU.play('pickup', p.x, p.y, p.z, 0.5);
        }
      } else if (d.proc === 'spit' && D.meat) {
        const fire = fireUnder(p);
        for (const m of D.meat) if (m && fire) { m.t += dt; if (m.t >= 50 && !m.burnt) { m.burnt = true; } }
        // show meat on the spit
        if (!p.meatMesh) { p.meatMesh = []; for (let i = 0; i < 2; i++) { const mm = new THREE.Mesh(itemGeo('raw_boar'), R.mat.vc); mm.position.set(-0.3 + i * 0.6, 0.95, 0); mm.rotation.x = Math.PI / 2; p.group.add(mm); p.meatMesh.push(mm); } }
        D.meat.forEach((m, i) => { const mm = p.meatMesh[i]; mm.visible = !!m; if (m) { mm.geometry = itemGeo(m.burnt ? 'burnt_meat' : m.t >= 25 ? m.out : m.id); mm.rotation.y += dt * 2; } });
      } else if (d.portal) {
        p.swirl.rotation.z += dt; p.swirl.material.opacity = 0.35 + Math.sin(G.time * 3) * 0.1;
        if (close) lights.push({ x: p.x, y: p.y + 1.6, z: p.z, i: 0.8, c: 0x7fd6ff, r: 8 });
      }
      if (d.kind === 'door' && p.hinge) p.hinge.rotation.y = lerp(p.hinge.rotation.y, D.open ? -Math.PI / 2 * 0.95 : 0, Math.min(1, dt * 8));
      if (d.damage && P.alive && dist2(p.x, p.z, ppos.x, ppos.z) < 2) { /* stakes only hurt creatures */ }
    }
    if (P.steer) {
      const p = P.steer;
      if (dist2(p.x, p.z, ppos.x, ppos.z) < 9) lights.length = lights.length; // nothing
    }
    // torch the player holds
    if (P.alive && P.eq.left && P.eq.left.id === 'torch') {
      const h = P.rig.handL; h.getWorldPosition(_v3);
      lights.push({ x: _v3.x, y: _v3.y + 0.5, z: _v3.z, i: 1.4 + Math.sin(G.time * 17) * 0.1, c: 0xffa050, r: 15 });
      FX.fire(_v3.x, _v3.y + 0.45, _v3.z, 0.25, false);
    }
    EVENTS.lights(lights);
    updateLightPool(lights);
    lightT -= dt;
  }
  const roofCache = new Map();
  function roofCached(p) {
    const c = roofCache.get(p.uid);
    if (c && G.time - c.t < 10) return c.v;
    const v = roofAt(p.x, p.y + 1.5, p.z);
    roofCache.set(p.uid, { v, t: G.time });
    return v;
  }
  function portalCheck() {
    const P = PLAYER;
    if (P.portalCd > G.time) return;
    near(P.pos.x, P.pos.z, 3, (p) => {
      if (!p.def.portal) return;
      const lx = (P.pos.x - p.x) * Math.cos(p.yaw) - (P.pos.z - p.z) * Math.sin(p.yaw), lz = (P.pos.x - p.x) * Math.sin(p.yaw) + (P.pos.z - p.z) * Math.cos(p.yaw);
      if (Math.abs(lx) > 1.0 || Math.abs(lz) > 0.35 || Math.abs(P.pos.y - p.y) > 1.5) return;
      const others = pieces.filter((q) => q !== p && q.def.portal && q.data.tag && q.data.tag === p.data.tag);
      P.portalCd = G.time + 3;
      if (!p.data.tag) { HUD.msg('This portal has no tag. Press E to name it.'); return false; }
      if (others.length !== 1) { HUD.msg(others.length ? 'Too many portals share this tag.' : 'No other portal is tagged "' + p.data.tag + '".'); return false; }
      if (P.inv.slots.some((s) => s && ITEMS[s.id].ore)) { HUD.msg('The kami will not let ore pass through.', 'bad'); return false; }
      const q = others[0];
      SURV.teleport(q.x + Math.sin(q.yaw) * 1.5, q.y + 0.2, q.z + Math.cos(q.yaw) * 1.5, q.yaw);
      return false;
    });
  }
  // fixed world structures (shrines, ruins) share the collision grid but are never built or removed by the player
  const statics = [];
  function addStatic(obbs, owner) {
    const s = { def: { kind: 'static', name: '' }, data: {}, solid: obbs, pick: obbs, snaps: [], static: true, owner, x: obbs[0].c.x, y: obbs[0].c.y, z: obbs[0].c.z, nbr: [] };
    let aabb = null;
    for (const o of obbs) { const a = obbAABB(o); if (!aabb) aabb = a.slice(); else for (let i = 0; i < 3; i++) { aabb[i] = Math.min(aabb[i], a[i]); aabb[i + 3] = Math.max(aabb[i + 3], a[i + 3]); } }
    s.aabb = aabb;
    gridAdd(s); statics.push(s);
    return s;
  }
  function removeStatic(owner) { for (let i = statics.length - 1; i >= 0; i--) if (statics[i].owner === owner) { gridDel(statics[i]); statics.splice(i, 1); } }
  function clear() { for (const p of pieces.slice()) { R.scene.remove(p.group); } pieces.length = 0; grid.clear(); uid = 1; }

  return {
    pieces, tool, add, remove, addStatic, removeStatic, raycast, surfaceBelow, pushOut, coveredAt, roofAt, shelterAt, stationsAt, inRangeOf, comfortAt, firesNear, near,
    toolInput, toolIdle, interactPrompt, interact, update, updateRafts, steerRaftInput, damagePiece, updateSupport, portalCheck, clear, lookPiece, fireUnder, stationOk, stationLevel,
    active: () => !!tool.kind, wantsWheel: () => tool.kind === 'hammer' && !!tool.sel, select(id) { tool.sel = id; setGhost(null); },
    setHoe(m) { tool.hoe = m; },
  };
})();
function steerRaft(dt, uiOpen) { BUILD.steerRaftInput(dt, uiOpen); }
// original terrain height (before edits) for the raise limit
function heightBase(ix, iz) { const k = (iz + WORLD.half) * W.N + (ix + WORLD.half); return W.orig.has(k) ? W.orig.get(k) : W.H[k]; }
