// 08_people: pedestrians. One instanced mesh draws the whole crowd; the vertex shader swings legs and arms and
// picks each part's colour from per-person attributes. People walk the pavements along both sides of every street
// (lanes offset from the road graph), turn at junctions, step around you, and thin out late at night.
// Named characters for errands are single meshes made the same way (makePerson).
const PERSON_POSE = `
attribute float part; attribute float limb;
attribute vec3 iShirt; attribute vec3 iPants; attribute vec3 iHair; attribute vec4 iMisc;   // skin, phase, swing, height
uniform vec3 uSkinA, uSkinB;
vec3 personPose(vec3 p) {
  float s = iMisc.z, ph = iMisc.y;
  if (limb > 0.5) {
    float side = (limb < 1.5 || limb > 3.5) ? 1.0 : -1.0;
    float a = sin(ph) * side * s * (limb < 2.5 ? 0.55 : 0.45);
    float py = limb < 2.5 ? 0.86 : 1.4;
    float y = p.y - py, z = p.z;
    p.y = py + y * cos(a) - z * sin(a); p.z = y * sin(a) + z * cos(a);
  }
  p.y += abs(sin(ph)) * 0.03 * s;
  return p * vec3(1.0, iMisc.w, 1.0);
}
vec3 personColor() {
  if (part < 0.5) return mix(uSkinA, uSkinB, iMisc.x);
  if (part < 1.5) return iShirt;
  if (part < 2.5) return iPants;
  if (part < 3.5) return vec3(0.12, 0.11, 0.1);
  if (part < 4.5) return iHair;
  return vec3(0.85);
}`;
// person geometry: boxes tagged with part (colour slot) and limb (what swings)
function personGeo() {
  const P = [], N = [], U = [], PART = [], LIMB = [], IX = [];
  const box = (x0, y0, z0, x1, y1, z1, part, limb) => {
    const f = [[[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
      [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]],
      [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]]];
    for (const q of f) {
      const b = P.length / 3;
      for (let k = 0; k < 4; k++) { P.push(...q[k]); N.push(...q[4]); U.push(k === 1 || k === 2 ? 1 : 0, k > 1 ? 1 : 0); PART.push(part); LIMB.push(limb); }
      IX.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  };
  // legs and shoes
  box(-0.17, 0.08, -0.08, -0.03, 0.86, 0.08, 2, 1); box(0.03, 0.08, -0.08, 0.17, 0.86, 0.08, 2, 2);
  box(-0.17, 0, -0.12, -0.03, 0.08, 0.09, 3, 1); box(0.03, 0, -0.12, 0.17, 0.08, 0.09, 3, 2);
  // torso, arms (sleeve then hand), neck, head, hair
  box(-0.21, 0.84, -0.12, 0.21, 1.44, 0.12, 1, 0);
  box(-0.3, 1.04, -0.06, -0.21, 1.42, 0.06, 1, 3); box(0.21, 1.04, -0.06, 0.3, 1.42, 0.06, 1, 4);
  box(-0.3, 0.86, -0.05, -0.22, 1.04, 0.05, 0, 3); box(0.22, 0.86, -0.05, 0.3, 1.04, 0.05, 0, 4);
  box(-0.06, 1.44, -0.05, 0.06, 1.5, 0.05, 0, 0);
  box(-0.11, 1.5, -0.12, 0.11, 1.75, 0.11, 0, 0);
  box(-0.12, 1.66, -0.06, 0.12, 1.79, 0.13, 4, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setAttribute('part', new THREE.Float32BufferAttribute(PART, 1));
  g.setAttribute('limb', new THREE.Float32BufferAttribute(LIMB, 1));
  g.setAttribute('tile', new THREE.Float32BufferAttribute(new Array(P.length / 3).fill(T.white), 1));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(P.length).fill(1), 3));
  g.setAttribute('aux', new THREE.Float32BufferAttribute(new Array(P.length / 3 * 2).fill(0), 2));
  g.setIndex(IX);
  return g;
}
let PEOPLE_MAT = null;
function peopleMat() {
  if (!PEOPLE_MAT) PEOPLE_MAT = makeMat({ pose: PERSON_POSE, uniforms: { uSkinA: { value: new THREE.Color(0.96, 0.8, 0.66) }, uSkinB: { value: new THREE.Color(0.42, 0.28, 0.2) } } });
  return PEOPLE_MAT;
}
const SHIRTS = [0xf2f2f2, 0x1c1c22, 0x2a3a6a, 0xb83030, 0x7a8a9a, 0xe0c890, 0x3a6a4a, 0xd87aa0, 0xf0d040, 0x6a4a8a, 0x88aacc, 0xe86a30, 0x444444, 0xc8c8c0];
const PANTS = [0x1e2430, 0x2a2a2a, 0x3a4a6a, 0x6a6052, 0xd8d0c0, 0x4a3a2a, 0x222a3a, 0x8a8a8a];
const HAIR = [0x0e0c0c, 0x1a1412, 0x2a2018, 0x3a2a1c, 0x6a6a6a, 0xb8b0a0, 0x8a5a2a, 0xd8c070];
function randomLook(r = Math.random) {
  const skin = r() < 0.75 ? r() * 0.25 : 0.3 + r() * 0.7;
  return { shirt: hex3(SHIRTS[Math.floor(r() * SHIRTS.length)]), pants: hex3(PANTS[Math.floor(r() * PANTS.length)]), hair: hex3(HAIR[Math.floor(r() * (skin < 0.3 ? 5 : HAIR.length))]), skin, h: 0.92 + r() * 0.14 };
}
// a single person (for named characters): an InstancedMesh of one
function makePerson(look, x, y, z, yaw, sc = scene) {
  const m = new THREE.InstancedMesh(personGeo(), peopleMat(), 1);
  const at = (n, k, v) => m.geometry.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(v), k));
  at('iShirt', 3, look.shirt); at('iPants', 3, look.pants); at('iHair', 3, look.hair); at('iMisc', 4, [look.skin, 0, 0, look.h || 1]);
  m.setMatrixAt(0, new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z));
  m.frustumCulled = false;
  sc.add(m);
  return m;
}
function posePerson(m, x, y, z, yaw, phase = 0, swing = 0) {
  m.setMatrixAt(0, _m4.makeRotationY(yaw).setPosition(x, y, z)); m.instanceMatrix.needsUpdate = true;
  const a = m.geometry.attributes.iMisc; a.array[1] = phase; a.array[2] = swing; a.needsUpdate = true;
}
const _m4 = new THREE.Matrix4();

// ---------------------------------------------------------------- the crowd
const CROWD = { max: 420, mesh: null, peds: [], lanes: [], nodeEnds: [], near: [], nearT: 0 };
function buildLanes() {
  const busy = (E) => (/Nathan/.test(E.name) ? 5 : MAIN_STREETS.test(E.name) ? 2.5 : E.cls === 'service' ? 0.3 : 1);
  for (const E of W.edges) {
    if (E.len < 6) continue;
    for (const s of [1, -1]) {
      const off = (E.w / 2 + 1.7) * s;
      const pts = [];
      let ok = 0, n = 0;
      for (let k = 0; k < E.pts.length; k += 2) {
        // offset each vertex by the averaged normal of its two segments
        const k0 = Math.max(0, k - 2), k1 = Math.min(E.pts.length - 2, k + 2);
        const dx = E.pts[k1] - E.pts[k0], dz = E.pts[k1 + 1] - E.pts[k0 + 1], L = Math.hypot(dx, dz) || 1;
        pts.push(E.pts[k] - dz / L * off, E.pts[k + 1] + dx / L * off);
      }
      let len = 0; for (let k = 2; k < pts.length; k += 2) len += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
      for (let d = 0; d <= len; d += 3) { const [x, z] = polyAt(pts, d); const c = gclass(x, z); n++; if (c === G.PAVE || c === G.GREEN) ok++; }
      if (n === 0 || ok / n < 0.75) continue;
      const xs = pts.filter((_, i) => i % 2 === 0), zs = pts.filter((_, i) => i % 2 === 1);
      const lane = { i: CROWD.lanes.length, E, s, pts, len, w: busy(E) * len, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), cx: (Math.min(...xs) + Math.max(...xs)) / 2, cz: (Math.min(...zs) + Math.max(...zs)) / 2 };
      CROWD.lanes.push(lane);
    }
  }
  // lane ends near each other (within 14 m) connect: walking on round the corner, or across at a junction
  const ends = [];
  for (const L of CROWD.lanes) { ends.push({ L, end: 0, x: L.pts[0], z: L.pts[1] }); ends.push({ L, end: 1, x: L.pts[L.pts.length - 2], z: L.pts[L.pts.length - 1] }); }
  const C = 20, grid = new Map();
  for (const e of ends) { const k = Math.floor(e.x / C) * 4096 + Math.floor(e.z / C); (grid.get(k) || grid.set(k, []).get(k)).push(e); }
  for (const e of ends) {
    e.next = [];
    const gx = Math.floor(e.x / C), gz = Math.floor(e.z / C);
    for (let a = gx - 1; a <= gx + 1; a++) for (let b = gz - 1; b <= gz + 1; b++) for (const f of grid.get(a * 4096 + b) || []) {
      if (f.L === e.L) continue;
      if (dist2(e.x, e.z, f.x, f.z) < 14 * 14) e.next.push(f);
    }
  }
  CROWD.ends = ends;
  for (const L of CROWD.lanes) { L.end0 = ends[L.i * 2]; L.end1 = ends[L.i * 2 + 1]; }
}
function initCrowd() {
  buildLanes();
  const g = personGeo(), N = CROWD.max;
  const at = (n, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(N * k), k); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(n, a); return a; };
  CROWD.aShirt = at('iShirt', 3); CROWD.aPants = at('iPants', 3); CROWD.aHair = at('iHair', 3); CROWD.aMisc = at('iMisc', 4);
  const m = CROWD.mesh = new THREE.InstancedMesh(g, peopleMat(), N);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false; m.count = 0; m.name = 'crowd';
  scene.add(m);
  for (let i = 0; i < N; i++) CROWD.peds.push({ on: false, i });
}
function crowdTarget() {
  // people out by the hour: busiest in the evening, few before dawn
  const h = CLOCK.t, k = h < 5 ? 0.12 : h < 7 ? lerp(0.12, 0.5, (h - 5) / 2) : h < 10 ? 0.6 : h < 17 ? 0.8 : h < 23 ? 1 : lerp(1, 0.3, (h - 23));
  return Math.round(CROWD.max * 0.62 * OPT.crowd * k * (PL.space === STREET ? 1 : 0.25));
}
function nearLanes() {
  if (performance.now() - CROWD.nearT < 1500 && CROWD.near.length && dist2(PL.x, PL.z, CROWD.nearX, CROWD.nearZ) < 40 * 40) return CROWD.near;
  CROWD.nearT = performance.now(); CROWD.nearX = PL.x; CROWD.nearZ = PL.z;
  CROWD.near = CROWD.lanes.filter((L) => L.x1 > PL.x - 170 && L.x0 < PL.x + 170 && L.z1 > PL.z - 170 && L.z0 < PL.z + 170);
  let s = 0; for (const L of CROWD.near) s += L.w; CROWD.nearW = s;
  return CROWD.near;
}
function spawnPed(p, far) {
  const lanes = nearLanes(); if (!lanes.length) return false;
  let t = Math.random() * CROWD.nearW, L = lanes[0];
  for (const l of lanes) { t -= l.w; if (t <= 0) { L = l; break; } }
  const d = Math.random() * L.len;
  const [x, z] = polyAt(L.pts, d);
  const dd = dist2(x, z, PL.x, PL.z);
  if (dd > 165 * 165) return false;
  if (far && dd < 60 * 60) {       // pop in out of sight when we can
    const vx = x - PL.x, vz = z - PL.z, fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw);
    if ((vx * fx + vz * fz) / Math.sqrt(dd) > 0.3) return false;
  }
  const look = randomLook();
  Object.assign(p, { on: true, L, d, dir: Math.random() < 0.5 ? 1 : -1, speed: 1.1 + Math.random() * 0.5, lat: (Math.random() - 0.5) * 1.6, phase: Math.random() * 6, x, z, yaw: 0, side: 0, stop: 0 });
  const i = p.i;
  CROWD.aShirt.setXYZ(i, ...look.shirt); CROWD.aPants.setXYZ(i, ...look.pants); CROWD.aHair.setXYZ(i, ...look.hair);
  CROWD.aMisc.setXYZW(i, look.skin, p.phase, 1, look.h);
  CROWD.aShirt.needsUpdate = CROWD.aPants.needsUpdate = CROWD.aHair.needsUpdate = true;
  return true;
}
// Each person keeps their own instance slot; idle slots are scaled to nothing.
function updateCrowd(dt) {
  if (!CROWD.mesh) return;
  const want = crowdTarget();
  let active = 0;
  for (const p of CROWD.peds) if (p.on) active++;
  for (let k = 0, tries = 0; k < 6 && active < want && tries < 24; tries++) {
    const p = CROWD.peds[Math.floor(Math.random() * CROWD.peds.length)]; if (p.on) continue;
    if (spawnPed(p, true)) { active++; k++; }
  }
  const M = CROWD.mesh;
  let top = 0;
  for (const p of CROWD.peds) {
    const i = p.i;
    if (!p.on) { _m4.makeScale(0, 0, 0); M.setMatrixAt(i, _m4); continue; }
    top = i + 1;
    const dd = dist2(p.x, p.z, PL.x, PL.z);
    if (dd > 190 * 190 || (active > want + 8 && dd > 80 * 80)) { p.on = false; active--; _m4.makeScale(0, 0, 0); M.setMatrixAt(i, _m4); continue; }
    if (p.stop > 0) p.stop -= dt;
    else {
      p.d += p.dir * p.speed * dt;
      if (p.d < 0 || p.d > p.L.len) {
        const e = p.d < 0 ? p.L.end0 : p.L.end1;
        if (e.next.length && Math.random() < 0.92) {
          const f = e.next[Math.floor(Math.random() * e.next.length)];
          p.L = f.L; p.dir = f.end === 0 ? 1 : -1; p.d = f.end === 0 ? 0 : f.L.len;
        } else { p.dir = -p.dir; p.d = clamp(p.d, 0, p.L.len); }
      }
      p.phase += dt * p.speed * 5.2;
      if (Math.random() < dt * 0.01) p.stop = 2 + Math.random() * 5;      // pause to look at a window or a phone
    }
    const [lx, lz, dx, dz] = polyAt(p.L.pts, p.d);
    const px = PL.x - p.x, pz = PL.z - p.z;
    if (PL.space === STREET && px * px + pz * pz < 5) { const cr = dx * pz - dz * px; p.side = lerp(p.side, (cr * p.dir > 0 ? -1.3 : 1.3), clamp(dt * 4, 0, 1)); }
    else p.side = lerp(p.side, 0, clamp(dt * 0.8, 0, 1));
    const side = p.lat + p.side;
    const tx = lx - dz * side, tz = lz + dx * side;
    const k = clamp(dt * 2.5, 0, 1), ox = p.x, oz = p.z;
    p.x = lerp(p.x, tx, k); p.z = lerp(p.z, tz, k);
    const mvx = p.x - ox, mvz = p.z - oz;
    if (mvx * mvx + mvz * mvz > 1e-7) p.yaw = Math.atan2(mvx, mvz) + Math.PI;
    _m4.makeRotationY(p.yaw).setPosition(p.x, groundAt(p.x, p.z), p.z);
    M.setMatrixAt(i, _m4);
    CROWD.aMisc.setY(i, p.phase); CROWD.aMisc.setZ(i, p.stop > 0 ? 0 : 1);
  }
  M.count = top;
  M.instanceMatrix.needsUpdate = true; CROWD.aMisc.needsUpdate = true;
  M.visible = PL.space === STREET || PL.space === ROOF || (PL.space && PL.space.name === 'ferry');
}
// people push you aside a little
function crowdPush() {
  if (PL.space !== STREET) return;
  for (const p of CROWD.peds) {
    if (!p.on) continue;
    const dx = PL.x - p.x, dz = PL.z - p.z, d2 = dx * dx + dz * dz;
    if (d2 < 0.36 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (0.6 - d) * 0.5; PL.x += dx / d * k; PL.z += dz / d * k; }
  }
}
