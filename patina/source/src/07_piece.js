// Pieces and parts. A piece is a group on the turntable platter made of parts (paintable meshes with a job) and
// props (stand, fittings: lit and baked, but not part of the job). Each part keeps float masks on the CPU,
// 8 per vertex: grime, corrosion, old finish, new finish, scratches, polish, (2 spare). They are packed into the
// mA / mB byte attributes the layer shader reads.
const PIECES = [];

const TOOLS = [
  { id: 'solvent', name: 'Solvent', key: '1', tip: 'Solvent swab: lifts grime, dust and old wax from anything.', col: 0x9fd4ff,
    icon: '<path d="M6 26 L20 12" stroke-width="2.4"/><ellipse cx="22.5" cy="9.5" rx="3.2" ry="5" transform="rotate(45 22.5 9.5)" fill="currentColor" fill-opacity=".25"/><ellipse cx="4.8" cy="27.2" rx="2" ry="3" transform="rotate(45 4.8 27.2)"/>' },
  { id: 'wire', name: 'Wire brush', key: '2', tip: 'Brass wire brush: scrubs off rust. Scratches soft metal, glass, enamel and wood.', col: 0xffb27a,
    icon: '<rect x="4" y="16" width="18" height="6" rx="2"/><path d="M22 19 L29 19"/><path d="M6 15v-5M9 15v-6M12 15v-5M15 15v-6M18 15v-5M21 15v-6" stroke-width="1.2"/>' },
  { id: 'sand', name: 'Sanding pad', key: '3', tip: 'Sanding pad: strips old varnish and lacquer back to bare material. Scuffs metal.', col: 0xe8d29a,
    icon: '<rect x="5" y="10" width="22" height="12" rx="2.5"/><path d="M8 14h2M13 13h1M17 15h2M21 13h1M10 18h1M15 18h2M20 18h1" stroke-width="1.4"/>' },
  { id: 'polish', name: 'Polish', key: '4', tip: 'Polishing cloth: buffs out tarnish and fine scratches and brings up a shine.', col: 0xfff0b0,
    icon: '<path d="M6 22c3-8 8-12 14-12 3 0 5 1 6 3-2 6-8 10-15 11z" fill="currentColor" fill-opacity=".2"/><path d="M11 18c3-2 6-3 9-3"/><path d="M24 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" stroke="none"/>' },
  { id: 'finish', name: 'Finish', key: '5', tip: 'Finish brush: lays a fresh coat on bare wood or lacquer. Clean and strip first.', col: 0xffc76a,
    icon: '<path d="M18 4l6 6-9 9-6-6z" fill="currentColor" fill-opacity=".2"/><path d="M9 13l-4 8c-1 3 1 5 4 4l7-4"/><path d="M5 27h12"/>' },
];
const TOOL = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

const TASKS = {
  clean: 'Clean', tarnish: 'Tarnish', rust: 'Rust', strip: 'Strip', scratch: 'Scratches', polish: 'Polish', finish: 'Finish',
};

// o: { name, geom, mat, job, init, parent, paint=true, glass }
// job: { surf: soft|hard|glass|enamel|wood, corr: tarnish|rust, old, fin: 'Varnish'|..., polish }
function addPart(piece, o) {
  const mesh = new THREE.Mesh(o.geom, layerMat(o.mat));
  mesh.castShadow = o.cast ?? !o.glass; mesh.receiveShadow = true;
  (o.parent || piece.root).add(mesh);
  if (o.pos) mesh.position.copy(o.pos);
  const n = o.geom.attributes.position.count;
  const part = {
    name: o.name, mesh, geom: o.geom, n, job: o.job || {}, init: o.init || {}, glass: !!o.glass, paint: o.paint !== false, hinged: !!o.hinged,
    m: new Float32Array(n * 8), ao: new Float32Array(n).fill(1), reach: new Float32Array(n).fill(1),
    mA: new Uint8Array(n * 4), mB: new Uint8Array(n * 4), lo: n, hi: -1, prog: null, piece,
  };
  o.geom.setAttribute('mA', new THREE.BufferAttribute(part.mA, 4, true));
  o.geom.setAttribute('mB', new THREE.BufferAttribute(part.mB, 4, true));
  o.geom.setAttribute('aoR', new THREE.BufferAttribute(new Float32Array(n * 2).fill(1), 2));
  const U = mesh.material.userData.U;
  U.uNeed.value.set(part.job.polish ? 1 : 0, part.job.fin ? 1 : 0, 0, o.paint === false ? 0 : 1);
  mesh.userData.part = part;
  (part.paint ? piece.parts : piece.props).push(part);
  return part;
}

// Bake AO/reach for everything on the turntable, then lay down the starting wear.
function preparePiece(piece) {
  R.platter.add(piece.root);
  R.platter.rotation.y = 0;
  piece.setOpen && piece.setOpen(false, true);
  scene.updateMatrixWorld(true);
  const all = [...piece.parts, ...piece.props];
  const box = new THREE.Box3();
  for (const p of all) box.expandByObject(p.mesh);
  const sph = box.getBoundingSphere(new THREE.Sphere());
  piece.center = sph.center; piece.radius = sph.radius;
  const occ = all.filter((p) => !p.glass).map((p) => p.mesh).concat(R.platterParts);
  const dirs = piece.bakeDirs || (G.quality ? 96 : 48);
  const res = bakeAO(all.map((p) => p.mesh), occ, sph.center, sph.radius * 1.05, { dirs });
  // pieces that open are baked again open: hinged parts take their AO from that pose, and anything that can be
  // seen in either pose counts as reachable
  if (piece.setOpen) {
    piece.setOpen(true, true); scene.updateMatrixWorld(true);
    const b2 = new THREE.Box3(); for (const p of all) b2.expandByObject(p.mesh);
    const s2 = b2.getBoundingSphere(new THREE.Sphere());
    const res2 = bakeAO(all.map((p) => p.mesh), occ, s2.center, s2.radius * 1.05, { dirs });
    piece.setOpen(false, true); scene.updateMatrixWorld(true);
    for (const p of all) {
      const r = res.get(p.mesh), r2 = res2.get(p.mesh);
      if (p.hinged) r.ao = r2.ao;
      for (let i = 0; i < p.n; i++) r.reach[i] = Math.max(r.reach[i], r2.reach[i]);
    }
  }
  const inv = new THREE.Matrix4().copy(piece.root.matrixWorld).invert();
  for (const p of all) {
    const r = res.get(p.mesh);
    p.ao = r.ao; p.reach = r.reach;
    const a = p.geom.attributes.aoR.array;
    for (let i = 0; i < p.n; i++) { a[i * 2] = r.ao[i]; a[i * 2 + 1] = r.reach[i]; }
    p.geom.attributes.aoR.needsUpdate = true;
    p.rel = new THREE.Matrix4().multiplyMatrices(inv, p.mesh.matrixWorld);
    p.bvh = buildBVH(p.geom);
    p.grid = buildGrid(p.geom.attributes.position.array, piece.brush[1] * 0.7);
    p.geom.computeBoundingSphere();
    initWear(p, piece);
    upload(p, true);
    p.beforeA = new THREE.BufferAttribute(p.mA.slice(), 4, true);
    p.beforeB = new THREE.BufferAttribute(p.mB.slice(), 4, true);
    p.afterA = p.geom.attributes.mA; p.afterB = p.geom.attributes.mB;
  }
  for (const p of piece.parts) p.prog = progressOf(p);
}

// Starting wear: grime pools in cavities and settles on top; corrosion follows the noise and the crevices.
// init: { grime: [base, cavity, up, noise], corr: [base, cavity, noise], scratch: [amount, coverage], old: [base, noise],
//         polish: [base, noise], fin: base }
function initWear(p, piece) {
  const P = p.geom.attributes.position.array, Nn = p.geom.attributes.normal.array, m = p.m, I = p.init;
  const v = V3(), nv = V3(), nm = new THREE.Matrix3().setFromMatrix4(p.rel);
  const f = piece.noiseF || 100, seed = piece.seed || 1;
  for (let i = 0; i < p.n; i++) {
    v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(p.rel);
    nv.set(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]).applyMatrix3(nm).normalize();
    const cav = 1 - p.ao[i], up = Math.max(0, nv.y);
    const n1 = fbm(v.x * f, v.y * f, v.z * f, seed, 4), n2 = fbm(v.x * f * 2.3, v.y * f * 2.3, v.z * f * 2.3, seed + 7, 3);
    const o = i * 8;
    m[o] = m[o + 1] = m[o + 2] = m[o + 3] = m[o + 4] = m[o + 5] = 0;
    if (I.grime) { const g = I.grime; m[o] = g[0] + g[1] * cav + g[2] * up + (n1 - 0.5) * 2 * g[3]; }
    if (I.corr) { const c = I.corr; m[o + 1] = c[0] + c[1] * cav + (n2 - 0.45) * 2 * c[2]; }
    if (I.scratch) { const s = I.scratch; m[o + 4] = s[0] * smoothstep(1 - s[1], 1 - s[1] + 0.12, fbm(v.x * f * 0.6, v.y * f * 0.6, v.z * f * 0.6, seed + 31, 3)); }
    if (I.old) { m[o + 2] = I.old[0] + (n2 - 0.5) * 2 * I.old[1]; }
    if (I.polish) { m[o + 5] = I.polish[0] + (n1 - 0.5) * 2 * I.polish[1]; }
    else m[o + 5] = p.job.polish ? 0 : 1;
    if (I.fin !== undefined) m[o + 3] = I.fin;
    // what the camera can never see starts clean and counts for nothing
    if (p.reach[i] < 0.02) { m[o] = m[o + 1] = m[o + 2] = m[o + 4] = 0; m[o + 3] = p.job.fin ? 1 : m[o + 3]; m[o + 5] = 1; }
    for (let k = 0; k < 6; k++) m[o + k] = sat(m[o + k]);
  }
  p.lo = 0; p.hi = p.n - 1;
}

function upload(p, all) {
  if (!all && p.hi < p.lo) return;
  const lo = all ? 0 : p.lo, hi = all ? p.n - 1 : p.hi, m = p.m, a = p.mA, b = p.mB;
  for (let i = lo; i <= hi; i++) {
    const o = i * 8, q = i * 4;
    a[q] = m[o] * 255; a[q + 1] = m[o + 1] * 255; a[q + 2] = m[o + 2] * 255; a[q + 3] = m[o + 3] * 255;
    b[q] = m[o + 4] * 255; b[q + 1] = m[o + 5] * 255;
  }
  const A = p.geom.attributes.mA, B = p.geom.attributes.mB;
  A.clearUpdateRanges(); B.clearUpdateRanges();
  if (!all) { A.addUpdateRange(lo * 4, (hi - lo + 1) * 4); B.addUpdateRange(lo * 4, (hi - lo + 1) * 4); }
  A.needsUpdate = true; B.needsUpdate = true;
  p.lo = p.n; p.hi = -1;
}

// which tasks a part has, and how far along each one is (weighted by reach)
function partTasks(p) {
  const J = p.job, I = p.init, t = [];
  if (I.grime) t.push('clean');
  if (J.corr) t.push(J.corr);
  if (J.old) t.push('strip');
  t.push('scratch');
  if (J.polish) t.push('polish');
  if (J.fin) t.push('finish');
  return t;
}
function progressOf(p) {
  const m = p.m, J = p.job;
  let W = 0, wAll = 0, cl = 0, co = 0, st = 0, sc = 0, po = 0, fi = 0, scAny = 0;
  for (let i = 0; i < p.n; i++) {
    const w = smoothstep(0.03, 0.2, p.reach[i]);
    if (w <= 0) continue;
    const o = i * 8;
    const a = m[o] < 0.08, b = m[o + 1] < 0.08, c = m[o + 2] < 0.08, d = m[o + 4] < 0.1;
    const e = !J.polish || m[o + 5] > 0.85, f = !J.fin || m[o + 3] > 0.85;
    W += w; cl += a * w; co += b * w; st += c * w; sc += d * w; po += e * w; fi += f * w;
    if (!d) scAny += w;
    if (a && b && c && d && e && f) wAll += w;
  }
  W = W || 1;
  return { all: wAll / W, clean: cl / W, tarnish: co / W, rust: co / W, strip: st / W, scratch: sc / W, polish: po / W, finish: fi / W, scratchShow: scAny / W > 0.004 };
}
const PART_DONE = 0.965;

// Brush: a flattened sphere (a disc that follows the surface), so working a crystal doesn't reach the dial below.
const _v = V3(), _n = V3(), _inv = new THREE.Matrix4(), _nm = new THREE.Matrix3();
function brushAt(hit, radius, tool, dt, fx) {
  const piece = G.piece;
  for (const p of piece.parts) {
    if (!p.mesh.visible) continue;
    if (p.glass !== hit.part.glass) continue;
    _inv.copy(p.mesh.matrixWorld).invert();
    _v.copy(hit.point).applyMatrix4(_inv);
    const bs = p.geom.boundingSphere;
    if (_v.distanceTo(bs.center) > bs.radius + radius) continue;
    _nm.setFromMatrix4(_inv);
    _n.copy(hit.normal).applyMatrix3(_nm).normalize();
    const P = p.geom.attributes.position.array, Nn = p.geom.attributes.normal.array;
    const hx = _v.x, hy = _v.y, hz = _v.z, nx = _n.x, ny = _n.y, nz = _n.z, rr = radius * radius;
    let touched = false;
    gridQuery(p.grid, hx, hy, hz, radius, (i) => {
      const dx = P[i * 3] - hx, dy = P[i * 3 + 1] - hy, dz = P[i * 3 + 2] - hz;
      const along = dx * nx + dy * ny + dz * nz;
      const tan2 = dx * dx + dy * dy + dz * dz - along * along;
      const e = tan2 / rr + (along * along) / (rr * 0.12);
      if (e >= 1) return;
      const facing = smoothstep(-0.2, 0.35, Nn[i * 3] * nx + Nn[i * 3 + 1] * ny + Nn[i * 3 + 2] * nz);
      if (facing <= 0) return;
      const w = (1 - e) * (1 - e) * facing * dt;
      applyTool(p, i, w, tool, fx);
      if (i < p.lo) p.lo = i; if (i > p.hi) p.hi = i;
      touched = true;
    });
    if (touched) { p.dirty = true; fx.parts.add(p); }
  }
}

function remaining(m, o, J) {
  return m[o] + m[o + 1] + m[o + 2] + m[o + 4] + (J.polish ? 1 - m[o + 5] : 0) + (J.fin ? 1 - m[o + 3] : 0);
}
function applyTool(p, i, w, tool, fx) {
  const m = p.m, o = i * 8, J = p.job, s = J.surf || 'soft';
  const before = remaining(m, o, J), sc0 = m[o + 4];
  switch (tool) {
    case 'solvent':
      m[o] -= w * 1.9;
      if (J.old) m[o + 2] -= w * 0.04;
      break;
    case 'wire':
      m[o] -= w * 1.1;
      if (J.corr === 'rust') m[o + 1] -= w * 1.5; else if (J.corr) m[o + 1] -= w * 0.7;
      if (s !== 'hard') m[o + 4] += w * (s === 'glass' || s === 'enamel' ? 1.3 : 0.95);
      m[o + 5] -= w * 0.6; m[o + 3] -= w * 0.9;
      if (J.old) m[o + 2] -= w * 0.45;
      break;
    case 'sand':
      m[o] -= w * 1.0; m[o + 2] -= w * 1.25; m[o + 3] -= w * 1.5;
      if (J.corr) m[o + 1] -= w * 0.55;
      if (s !== 'wood') m[o + 4] += w * (s === 'hard' ? 0.5 : 0.95);
      m[o + 5] -= w * 0.9;
      break;
    case 'polish': {
      const eff = 1 - 0.8 * sat(m[o] * 1.5);
      m[o] -= w * 0.35;
      if (J.corr === 'tarnish') m[o + 1] -= w * 1.15 * eff; else if (J.corr === 'rust') m[o + 1] -= w * 0.08 * eff;
      if (s !== 'wood') m[o + 4] -= w * 0.8 * eff;
      if (J.polish) m[o + 5] += w * 0.95 * eff * (1 - sat(m[o + 1]) * 0.75);
      break;
    }
    case 'finish':
      if (!J.fin) { fx.nofin += w; return; }
      if (m[o] > 0.15 || m[o + 2] > 0.15 || m[o + 1] > 0.15) { fx.blocked += w; return; }
      m[o + 3] += w * 1.3;
      break;
  }
  for (let k = 0; k < 6; k++) { const x = m[o + k]; m[o + k] = x < 0 ? 0 : x > 1 ? 1 : x; }
  const gain = before - remaining(m, o, J);
  if (gain > 0) fx.useful += gain;
  fx.total += w;
  if (m[o + 4] > sc0) fx.harm += m[o + 4] - sc0;
  // what was the main thing left under the brush (for advice)
  if (m[o + 1] > 0.3) fx[J.corr === 'rust' ? 'rustLeft' : 'tarnLeft'] += w;
  if (m[o + 2] > 0.3) fx.oldLeft += w;
  if (m[o] > 0.3) fx.grimeLeft += w;
}
function newFx() { return { useful: 0, total: 0, harm: 0, blocked: 0, nofin: 0, rustLeft: 0, tarnLeft: 0, oldLeft: 0, grimeLeft: 0, parts: new Set() }; }

// When the piece is done, ease every remaining speck to its finished state for the reveal.
function settlePiece(piece) {
  for (const p of piece.parts) {
    p.settleFrom = p.m.slice();
    p.settleTo = p.m.slice();
    const t = p.settleTo, J = p.job;
    for (let i = 0; i < p.n; i++) {
      const o = i * 8;
      t[o] = 0; t[o + 1] = 0; t[o + 2] = 0; t[o + 4] = 0;
      t[o + 5] = 1;
      if (J.fin) t[o + 3] = 1;
    }
  }
  piece.settle = 0;
}
function stepSettle(piece, dt) {
  if (piece.settle === undefined || piece.settle >= 1) return;
  piece.settle = Math.min(1, piece.settle + dt / 1.6);
  const k = smoothstep(0, 1, piece.settle);
  for (const p of piece.parts) {
    const a = p.settleFrom, b = p.settleTo, m = p.m;
    for (let j = 0; j < m.length; j++) m[j] = a[j] + (b[j] - a[j]) * k;
    upload(p, true);
  }
}

// raycast every part and prop; returns the nearest hit in world space
const _ray = new THREE.Ray(), _lr = new THREE.Ray(), _rc = new THREE.Raycaster();
function pick(ndc) {
  const piece = G.piece; if (!piece) return null;
  _rc.setFromCamera(ndc, camera);
  _ray.copy(_rc.ray);
  let best = null;
  for (const p of [...piece.parts, ...piece.props]) {
    if (!p.mesh.visible || !p.bvh) continue;
    _inv.copy(p.mesh.matrixWorld).invert();
    _lr.copy(_ray).applyMatrix4(_inv);
    const h = rayBVH(p.bvh, _lr.origin, _lr.direction, best ? best.t : 10);
    if (h && (!best || h.t < best.t)) best = { t: h.t, part: p, tri: h.tri, u: h.u, v: h.v };
  }
  if (!best) return null;
  const p = best.part, I = p.bvh.I, Nn = p.bvh.N, t = best.tri;
  const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3, w0 = 1 - best.u - best.v;
  const n = V3(Nn[a] * w0 + Nn[b] * best.u + Nn[c] * best.v, Nn[a + 1] * w0 + Nn[b + 1] * best.u + Nn[c + 1] * best.v, Nn[a + 2] * w0 + Nn[b + 2] * best.u + Nn[c + 2] * best.v);
  n.applyMatrix3(_nm.getNormalMatrix(p.mesh.matrixWorld)).normalize();
  if (n.dot(_ray.direction) > 0) n.negate();
  return { part: p, point: _ray.at(best.t, V3()), normal: n, t: best.t };
}
