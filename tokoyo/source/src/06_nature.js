// Tokoyo — nature: seeded trees, rocks, ore and pickables per chunk; merged chunk meshes; felling, mining, grass

const NAT = { chunks: [], removed: new Set(), picked: new Map(), rockHp: new Map(), falling: [], logs: [], grass: null, grassAt: null };

function foliageMaterial() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.t; sh.uniforms.uWind = WIND.str; sh.uniforms.uWDir = WIND.dir;
    sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform vec2 uWDir; attribute float aSway;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      float ph = position.x * 0.13 + position.z * 0.11;
      float sw = (sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.7 + ph * 1.9) * 0.2) * uWind * 0.035 * aSway;
      transformed.x += sw * uWDir.x; transformed.z += sw * uWDir.y;`);
  };
  return mat;
}

function natChunkGen(ci) {
  const i = ci % NCH, j = (ci / NCH) | 0, x0 = i * CH - WORLD.half, z0 = j * CH - WORLD.half;
  const rnd = mulberry32((W.seed * 1000003 + ci * 7919) >>> 0);
  const C = { ci, x0, z0, trees: [], rocks: [], picks: [], bushes: [], near: null, far: null, dirty: true, farDirty: true };
  const pois = W.pois.filter((p) => p.x > x0 - 40 && p.x < x0 + CH + 40 && p.z > z0 - 40 && p.z < z0 + CH + 40);
  const inPoi = (x, z, pad) => pois.some((p) => p.flat && dist2(p.x, p.z, x, z) < (p.flat + pad) * (p.flat + pad));
  const step = 3.2, n = Math.floor(CH / step);
  let ti = 0, ri = 0, pi = 0;
  for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) {
    const x = x0 + (a + rnd()) * step, z = z0 + (b + rnd()) * step;
    const h = heightAt(x, z);
    const r1 = rnd(), r2 = rnd(), r3 = rnd();
    if (h < -0.2) continue;
    const f = forestAt(x, z);
    const ny = normalAt(x, z, _v1).y;
    const spawnD = Math.hypot(x, z);
    const pond = coarse(W.pond, x, z);
    // trees
    if (h > 1.4 && ny > 0.8 && !inPoi(x, z, 3) && spawnD > 24) {
      const grove = smooth(0.15, 0.55, Noise.fbm(x / 90 + 11, z / 90 - 5, 2));
      const bambooP = smooth(0.45, 0.65, Noise.fbm(x / 70 - 40, z / 70 + 9, 2));
      let p, type;
      if (f > 0.5) {
        p = 0.36 + 0.1 * grove;
        type = bambooP > 0.6 && r3 < 0.5 ? 'bamboo' : r3 < 0.62 ? 'sugi' : 'matsu';
      } else {
        p = 0.012 + 0.32 * grove + f * 0.4;
        type = bambooP > 0.5 && r3 < 0.7 ? 'bamboo' : f > 0.3 && r3 < 0.5 ? 'matsu' : grove > 0.7 && r3 < 0.18 ? 'hinoki' : r3 < 0.62 ? 'keyaki' : 'momiji';
      }
      if (pond > 0.05) p *= 0.3;
      if (r1 < p) {
        const id = ci + ':t' + ti++;
        const t = { id, type, v: Math.floor(r2 * 3), x, z, y: h - 0.1, rot: r2 * TAU, s: 0.85 + r3 * 0.35, hp: TREE_TYPES[type].hp, stump: false };
        if (NAT.removed.has(id)) { if (TREE_TYPES[type].stump && !NAT.removed.has(id + 's')) { t.stump = true; t.hp = 30; C.trees.push(t); } }
        else C.trees.push(t);
        continue;
      }
    }
    // rocks & ore
    if (h > 0 && !inPoi(x, z, 2)) {
      let rt = null;
      if (r1 > 0.994 - (f > 0.5 ? 0.004 : 0)) rt = 'boulder';
      else if (f > 0.55 && r1 > 0.9915 && r1 <= 0.994 - 0.004 && h > 6) rt = 'copper';
      else if (f > 0.55 && h < 2.2 && h > 0.15 && r1 > 0.955 && r1 < 0.975) rt = 'tin';
      if (rt) {
        const id = ci + ':r' + ri++;
        if (!NAT.removed.has(id)) { const T = ROCK_TYPES[rt]; C.rocks.push({ id, type: rt, v: Math.floor(r2 * 3), x, z, y: h, rot: r2 * TAU, s: 0.85 + r3 * 0.3, hp: NAT.rockHp.get(id) || T.hp }); }
        continue;
      }
    }
    // pickables
    if (!inPoi(x, z, 0)) {
      let pt = null;
      const nearSpawn = spawnD < 60 ? 3 : 1;
      const shore = h < 1.6;
      if (shore && r1 < 0.035) pt = 'flint';
      else if (r1 < 0.012 * nearSpawn) pt = 'stone';
      else if (r1 < 0.012 * nearSpawn + (f > 0.5 ? 0.024 : 0.009 * nearSpawn)) pt = 'branch';
      else if (f < 0.5 && !shore) {
        const s = smooth(0.3, 0.6, Noise.fbm(x / 40 + 3, z / 40 + 77, 2));
        if (r1 > 0.97 - s * 0.06) pt = 'susuki';
        else if (r1 > 0.955 && r1 < 0.962) pt = 'strawberry';
        else if (r1 > 0.945 && r1 < 0.95) pt = 'yomogi';
      } else if (f >= 0.5 && !shore) {
        if (r1 > 0.985) pt = 'kokemomo';
        else if (r1 > 0.978 && r1 < 0.985) pt = 'matsutake';
      }
      if (pt && h > 0.1) {
        const id = ci + ':p' + pi++;
        if (!NAT.removed.has(id)) C.picks.push({ id, type: pt, x, z, y: h, rot: r2 * TAU });
        continue;
      }
    }
    // decorative bushes
    if (h > 1 && ny > 0.75 && r2 < (f > 0.5 ? 0.07 : 0.025) && !inPoi(x, z, 1)) C.bushes.push({ x, z, y: h, rot: r3 * TAU, v: Math.floor(r1 * 1000) % 4, f: f > 0.5, s: 0.7 + r3 * 0.6 });
  }
  return C;
}
function natChunk(ci) { return NAT.chunks[ci] || (NAT.chunks[ci] = natChunkGen(ci)); }
function natChunkAt(x, z) { const i = Math.floor((x + WORLD.half) / CH), j = Math.floor((z + WORLD.half) / CH); if (i < 0 || j < 0 || i >= NCH || j >= NCH) return null; return natChunk(j * NCH + i); }

// merge a chunk's objects into one geometry (with a per-vertex sway weight)
function mergeInto(list) {
  let n = 0; for (const [g] of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), sway = new Float32Array(n);
  let o = 0;
  const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), q = new THREE.Quaternion(), v = new V3();
  for (const [g, x, y, z, rot, s, sw, tilt] of list) {
    q.setFromEuler(_e1.set(tilt ? tilt[0] : 0, rot, tilt ? tilt[1] : 0, 'YXZ'));
    m.compose(v.set(x, y, z), q, _v2.set(s, s, s));
    nm.getNormalMatrix(m);
    const P = g.attributes.position, N = g.attributes.normal, Co = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      _v3.set(P.getX(i), P.getY(i), P.getZ(i));
      sway[o / 3] = sw ? Math.max(0, _v3.y - 1) * s : 0;
      _v3.applyMatrix4(m);
      pos[o] = _v3.x; pos[o + 1] = _v3.y; pos[o + 2] = _v3.z;
      _v4.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(nm).normalize();
      nor[o] = _v4.x; nor[o + 1] = _v4.y; nor[o + 2] = _v4.z;
      col[o] = Co.getX(i); col[o + 1] = Co.getY(i); col[o + 2] = Co.getZ(i);
      o += 3;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  g.computeBoundingSphere();
  return g;
}
function buildNatNear(C) {
  const L = [];
  for (const t of C.trees) {
    if (t.stump) L.push([stumpGeo(t.type), t.x, t.y, t.z, t.rot, t.s, false]);
    else if (!t.felling) L.push([treeGeo(t.type, t.v), t.x, t.y, t.z, t.rot, t.s, true]);
  }
  for (const r of C.rocks) { const hpF = r.hp / ROCK_TYPES[r.type].hp; L.push([rockGeo(r.type, r.v), r.x, r.y - 0.2, r.z, r.rot, r.s * (0.55 + 0.45 * hpF), false]); }
  for (const p of C.picks) { if (NAT.picked.has(p.id)) continue; L.push([pickGeo(p.type), p.x, p.y, p.z, p.rot, 1, p.type === 'susuki' || p.type === 'yomogi']); }
  for (const b of C.bushes) L.push([bushGeo(b.v, b.f), b.x, b.y, b.z, b.rot, b.s, true]);
  const g = mergeInto(L);
  if (C.near) { C.near.geometry.dispose(); C.near.geometry = g; }
  else { C.near = new THREE.Mesh(g, R.mat.foliage); C.near.castShadow = true; C.near.receiveShadow = true; C.near.matrixAutoUpdate = false; R.natGroup.add(C.near); }
  C.dirty = false;
}
function buildNatFar(C) {
  const L = [];
  for (const t of C.trees) if (!t.stump && !t.felling) L.push([treeFarGeo(t.type, t.v % 3), t.x, t.y, t.z, t.rot, t.s, false]);
  for (const r of C.rocks) L.push([rockGeo(r.type, r.v), r.x, r.y - 0.2, r.z, r.rot, r.s, false]);
  const g = mergeInto(L);
  if (C.far) { C.far.geometry.dispose(); C.far.geometry = g; }
  else { C.far = new THREE.Mesh(g, R.mat.vc); C.far.matrixAutoUpdate = false; R.natGroup.add(C.far); }
  C.farDirty = false;
}
function initNature() {
  R.mat.foliage = foliageMaterial();
  R.natGroup = new THREE.Group(); R.scene.add(R.natGroup);
  NAT.chunks = new Array(NCH * NCH);
  // grass
  const gmax = 9000;
  const gm = new THREE.InstancedMesh(grassGeo(), R.mat.vcWind, gmax);
  gm.count = 0; gm.frustumCulled = false; gm.receiveShadow = true;
  R.scene.add(gm); NAT.grass = gm;
}
function updateNature(cx, cz, budget = 2) {
  const view = SETTINGS.view, nearD = Math.min(150, view);
  let built = 0;
  const ci0 = Math.max(0, Math.floor((cx - view - CH + WORLD.half) / CH)), ci1 = Math.min(NCH - 1, Math.floor((cx + view + WORLD.half) / CH));
  const cj0 = Math.max(0, Math.floor((cz - view - CH + WORLD.half) / CH)), cj1 = Math.min(NCH - 1, Math.floor((cz + view + WORLD.half) / CH));
  // hide everything first that's out of range
  for (const C of NAT.chunks) if (C) {
    const i = C.ci % NCH, j = (C.ci / NCH) | 0;
    if (i < ci0 || i > ci1 || j < cj0 || j > cj1) { if (C.near) C.near.visible = false; if (C.far) C.far.visible = false; }
  }
  const todo = [];
  for (let j = cj0; j <= cj1; j++) for (let i = ci0; i <= ci1; i++) {
    const ci = j * NCH + i, x0 = i * CH - WORLD.half, z0 = j * CH - WORLD.half;
    const d = Math.max(0, Math.hypot(x0 + CH / 2 - cx, z0 + CH / 2 - cz) - CH * 0.7);
    const C = NAT.chunks[ci];
    if (d > view) { if (C) { if (C.near) C.near.visible = false; if (C.far) C.far.visible = false; } continue; }
    const wantNear = d < nearD;
    if (!C) { todo.push([ci, d]); continue; }
    if (wantNear) {
      if (!C.near || C.dirty) todo.push([ci, d]);
      if (C.near) { C.near.visible = true; if (C.far) C.far.visible = false; }
      else if (C.far) C.far.visible = true;
    } else {
      if (!C.far || C.farDirty) todo.push([ci, d + 50]);
      if (C.far) { C.far.visible = true; if (C.near) C.near.visible = false; }
    }
  }
  todo.sort((a, b) => a[1] - b[1]);
  for (const [ci, d] of todo) {
    if (built >= budget) break;
    const C = natChunk(ci);
    if (d < nearD) { if (!C.near || C.dirty) { buildNatNear(C); built++; } C.near.visible = true; if (C.far) C.far.visible = false; }
    else { if (!C.far || C.farDirty) { buildNatFar(C); built++; } C.far.visible = true; if (C.near) C.near.visible = false; }
  }
  return todo.length;
}
function natDirty(C, far = false) { C.dirty = true; if (far) C.farDirty = true; }

// collision & queries: calls fn(obj, kind) for trees, stumps and rocks near (x,z)
function natQuery(x, z, r, fn) {
  const i0 = Math.floor((x - r + WORLD.half) / CH), i1 = Math.floor((x + r + WORLD.half) / CH);
  const j0 = Math.floor((z - r + WORLD.half) / CH), j1 = Math.floor((z + r + WORLD.half) / CH);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= NCH || j >= NCH) continue;
    const C = natChunk(j * NCH + i);
    for (const t of C.trees) if (!t.felling && dist2(t.x, t.z, x, z) < (r + 3) * (r + 3)) if (fn(t, 'tree', C) === false) return;
    for (const k of C.rocks) if (dist2(k.x, k.z, x, z) < (r + 3) * (r + 3)) if (fn(k, 'rock', C) === false) return;
  }
}
function treeRadius(t) { const T = TREE_TYPES[t.type]; return (t.stump ? (T.stump || 0.3) : T.trunkR) * t.s; }
function rockRadius(k) { return ROCK_TYPES[k.type].r * k.s * (0.55 + 0.45 * k.hp / ROCK_TYPES[k.type].hp); }
// pickables near a point
function natPickNear(x, z, r) {
  let best = null, bd = r * r;
  const C0 = natChunkAt(x, z); if (!C0) return null;
  natQueryPicks(x, z, r, (p) => { const d = dist2(p.x, p.z, x, z); if (d < bd) { bd = d; best = p; } });
  return best;
}
function natQueryPicks(x, z, r, fn) {
  const i0 = Math.floor((x - r + WORLD.half) / CH), i1 = Math.floor((x + r + WORLD.half) / CH);
  const j0 = Math.floor((z - r + WORLD.half) / CH), j1 = Math.floor((z + r + WORLD.half) / CH);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= NCH || j >= NCH) continue;
    const C = natChunk(j * NCH + i);
    for (const p of C.picks) if (!NAT.picked.has(p.id) && dist2(p.x, p.z, x, z) < r * r) fn(p, C);
  }
}
function natPick(p) {
  const T = PICK_TYPES[p.type];
  const C = natChunkAt(p.x, p.z);
  if (T.regrow) NAT.picked.set(p.id, G.time + T.regrow);
  else { NAT.removed.add(p.id); C.picks.splice(C.picks.indexOf(p), 1); }
  natDirty(C);
  return { item: T.item, n: T.n };
}
function natRegrow() {
  for (const [id, t] of NAT.picked) if (G.time > t) {
    NAT.picked.delete(id);
    const ci = parseInt(id, 10); if (NAT.chunks[ci]) natDirty(NAT.chunks[ci]);
  }
}

// ---- damage: trees, stumps, logs, rocks. Returns a message key or null. ----
function natDamageTree(t, C, chop, tier, fromX, fromZ) {
  const T = TREE_TYPES[t.type];
  if (!t.stump && tier < T.tier) return 'tooHard';
  t.hp -= chop;
  FX.chips(t.x, t.y + 1.2, t.z, t.type === 'bamboo' ? 0x9ab25a : 0xc9a576, 6);
  AU.play('chop', t.x, t.y + 1, t.z);
  if (t.hp > 0) { t.shake = 0.3; return null; }
  if (t.stump) {
    NAT.removed.add(t.id + 's');
    C.trees.splice(C.trees.indexOf(t), 1); natDirty(C);
    dropItems('wood', 1 + Math.floor(Math.random() * 2), t.x, t.y + 0.5, t.z);
    return null;
  }
  // fell it
  NAT.removed.add(t.id);
  const dir = Math.atan2(t.x - fromX, t.z - fromZ) + (Math.random() - 0.5) * 0.6;
  const mesh = new THREE.Mesh(treeGeo(t.type, t.v), R.mat.vc);
  mesh.position.set(t.x, t.y, t.z); mesh.rotation.y = t.rot; mesh.scale.setScalar(t.s); mesh.castShadow = true;
  const pivotO = new THREE.Object3D(); pivotO.position.set(t.x, t.y + 0.4, t.z); pivotO.rotation.y = dir;
  R.scene.add(pivotO);
  mesh.position.set(0, -0.4, 0); mesh.rotation.y = t.rot - dir; pivotO.add(mesh);
  NAT.falling.push({ t, C, o: pivotO, mesh, dir, a: 0, v: 0.05 });
  if (T.stump) { t.stump = true; t.hp = 30; } else C.trees.splice(C.trees.indexOf(t), 1);
  natDirty(C, true);
  AU.play('creak', t.x, t.y + 3, t.z);
  bus.emit('felled', t);
  return null;
}
function updateFalling(dt) {
  for (let i = NAT.falling.length - 1; i >= 0; i--) {
    const f = NAT.falling[i];
    f.v += dt * 1.6; f.a += f.v * dt;
    f.o.rotation.x = Math.min(f.a, Math.PI / 2 - 0.05);
    if (f.a >= Math.PI / 2 - 0.05) {
      R.scene.remove(f.o); f.mesh.geometry = null;
      NAT.falling.splice(i, 1);
      AU.play('thud', f.t.x, f.t.y, f.t.z);
      FX.dust(f.t.x + Math.sin(f.dir) * 5, f.t.y, f.t.z + Math.cos(f.dir) * 5, 14);
      // hurt whatever it lands on
      const T = TREE_TYPES[f.t.type];
      bus.emit('treeCrash', f.t.x, f.t.z, f.dir, (T.h || 8) * f.t.s);
      spawnLogs(f.t, f.dir);
    }
  }
  for (const l of NAT.logs) if (l.shake > 0) { l.shake -= dt; l.mesh.position.y = l.y + Math.sin(l.shake * 60) * 0.03; }
}
function spawnLogs(t, dir) {
  const T = TREE_TYPES[t.type];
  if (!T.log) { for (const [id, a, b] of T.drops) dropItems(id, a + Math.floor(Math.random() * (b - a + 1)), t.x + Math.sin(dir) * 2, t.y + 0.5, t.z + Math.cos(dir) * 2); return; }
  const len = T.logLen * t.s;
  for (let k = 0; k < T.log; k++) {
    const d = 1.5 + (k + 0.5) * len / T.log;
    const x = t.x + Math.sin(dir) * d, z = t.z + Math.cos(dir) * d;
    const y = Math.max(heightAt(x, z), 0) + T.logR * t.s;
    const mesh = new THREE.Mesh(logGeo(t.type), R.mat.vc);
    mesh.scale.set(t.s / T.log * 1.02, t.s, t.s);
    mesh.position.set(x, y, z); mesh.rotation.y = dir + Math.PI / 2; mesh.castShadow = true; mesh.receiveShadow = true;
    R.scene.add(mesh);
    NAT.logs.push({ type: t.type, x, y, z, rot: dir + Math.PI / 2, len: len / T.log, r: T.logR * t.s, hp: 40 + T.hp * 0.3, mesh, share: 1 / T.log });
  }
}
function natDamageLog(l, chop) {
  l.hp -= chop; l.shake = 0.2;
  FX.chips(l.x, l.y + 0.3, l.z, 0xc9a576, 5);
  AU.play('chop', l.x, l.y, l.z);
  if (l.hp > 0) return;
  R.scene.remove(l.mesh);
  NAT.logs.splice(NAT.logs.indexOf(l), 1);
  const T = TREE_TYPES[l.type];
  for (const [id, a, b] of T.drops) {
    const n = Math.round((a + Math.random() * (b - a)) * l.share + Math.random() * 0.5);
    dropItems(id, n, l.x, l.y + 0.4, l.z);
  }
}
function natDamageRock(k, C, pick, tier) {
  const T = ROCK_TYPES[k.type];
  if (tier < T.tier) return 'tooHard';
  const before = k.hp;
  k.hp -= pick;
  FX.chips(k.x, k.y + T.h * 0.6, k.z, k.type === 'copper' ? 0x4f9a76 : k.type === 'tin' ? 0xc8ccd0 : COL.stone, 7);
  AU.play('pick', k.x, k.y + 1, k.z);
  // drop a share each time a chunk breaks off
  const per = T.hp / T.chunks;
  const n0 = Math.floor((T.hp - before) / per), n1 = Math.floor((T.hp - Math.max(0, k.hp)) / per);
  for (let c = n0; c < n1; c++) for (const [id, a, b] of T.drops) {
    const n = Math.round((a + Math.random() * (b - a)) / T.chunks + Math.random() * 0.4);
    if (n > 0) dropItems(id, n, k.x + (Math.random() - 0.5) * 2, k.y + T.h, k.z + (Math.random() - 0.5) * 2);
  }
  if (k.hp <= 0) {
    NAT.removed.add(k.id); NAT.rockHp.delete(k.id);
    C.rocks.splice(C.rocks.indexOf(k), 1);
    FX.dust(k.x, k.y + 0.5, k.z, 12);
    natDirty(C, true);
  } else { NAT.rockHp.set(k.id, k.hp); natDirty(C); }
  return null;
}

// ---- grass around the camera ----
function updateGrass(px, pz, force) {
  const g = NAT.grass;
  if (!SETTINGS.grass) { g.count = 0; return; }
  const cell = 8, gx = Math.round(px / cell) * cell, gz = Math.round(pz / cell) * cell;
  if (!force && NAT.grassAt && NAT.grassAt[0] === gx && NAT.grassAt[1] === gz) return;
  NAT.grassAt = [gx, gz];
  const R0 = 44 * (SETTINGS.grass > 1 ? 1.3 : 1), sp = SETTINGS.grass > 1 ? 1.0 : 1.3;
  let n = 0;
  const m = _m4, q = _q1;
  for (let z = gz - R0; z <= gz + R0; z += sp) for (let x = gx - R0; x <= gx + R0; x += sp) {
    if (n >= g.instanceMatrix.count) break;
    const ix = Math.round(x / sp), iz = Math.round(z / sp);
    const h1 = hash2(ix, iz, 3), h2 = hash2(ix, iz, 9);
    const wx = x + (h1 - 0.5) * sp, wz = z + (h2 - 0.5) * sp;
    if (dist2(wx, wz, gx, gz) > R0 * R0) continue;
    const h = heightAt(wx, wz);
    if (h < 1.2) continue;
    if (paintAt(wx, wz)) continue;
    const f = forestAt(wx, wz);
    const dens = f > 0.5 ? 0.12 : 0.85 - smooth(0.3, 0.5, f) * 0.6;
    if (hash2(ix, iz, 17) > dens) continue;
    const ny = normalAt(wx, wz, _v1).y;
    if (ny < 0.8) continue;
    if (BUILD && BUILD.coveredAt(wx, wz, h)) continue;
    q.setFromAxisAngle(UP, h1 * TAU);
    const s = 0.65 + h2 * 0.55;
    m.compose(_v2.set(wx, h - 0.05, wz), q, _v3.set(s, s * (f > 0.5 ? 0.8 : 1), s));
    g.setMatrixAt(n++, m);
  }
  g.count = n;
  g.instanceMatrix.needsUpdate = true;
}
