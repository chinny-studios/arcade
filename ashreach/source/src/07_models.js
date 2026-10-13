// Ashreach — character & creature models: low-poly skinned rigs with procedural animation

// Every body is ONE SkinnedMesh (rigid skinning: each vertex follows exactly one bone) built from chamfered
// boxes with vertex colours, so a humanoid costs 1 draw call (+1 per held weapon, +1 for the cast glow or a
// muzzle flash while they show). Geometry is cached per breed/sex/tier/hair/helmet or creature kind; every
// instance shares the template's GPU buffers and owns only a colour attribute. Bones are a real hierarchy
// (base → hips → spine → chest → head / upper arm → forearm → hand, thigh → shin → foot) driven by
// procedural poses that cross-fade between states; humanoid arms are placed with 2-bone IK.

// ---------- shared materials ----------
// One vertex-coloured Lambert for every body, patched with a per-vertex `glow` attribute (self-lit seams,
// lenses, crystals) and an emissive rim term so setGlow() reads as a rim tint without extra geometry.
function md_patch(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float glow;\nvarying float vGlow;\nvarying float vRim;\n' + sh.vertexShader.replace('#include <lights_lambert_vertex>',
      '#include <lights_lambert_vertex>\nvGlow = glow;\nvRim = 1.0 - abs(dot(normalize(transformedNormal), normalize(-mvPosition.xyz)));');
    sh.fragmentShader = 'varying float vGlow;\nvarying float vRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      'totalEmissiveRadiance = emissive * (0.12 + 1.3 * vRim * vRim) + diffuseColor.rgb * vGlow;');
  };
  m.customProgramCacheKey = () => 'md-rim-glow';
  return m;
}
const md_skinMat = md_patch(new THREE.MeshLambertMaterial({ vertexColors: true, skinning: true, flatShading: true }));
const md_statMat = md_patch(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
const md_tints = new Map();
// Glow-tinted variants are shared per colour (a handful exist at once), never per rig.
function md_tintMat(skin, col) {
  const c = new THREE.Color(col), key = (skin ? 's' : 'm') + c.getHex();
  let m = md_tints.get(key);
  if (!m) { m = md_patch(new THREE.MeshLambertMaterial({ vertexColors: true, skinning: skin, flatShading: true, emissive: c })); md_tints.set(key, m); }
  return m;
}
const md_adds = new Map();
function md_addMat(col, op = 0.85) {
  const key = new THREE.Color(col).getHex() + '|' + op;
  let m = md_adds.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }); md_adds.set(key, m); }
  return m;
}
const md_glowGeo = new THREE.IcosahedronGeometry(0.1, 1);
const md_flashGeo = (() => { const g = new THREE.OctahedronGeometry(0.07, 0); g.scale(1, 1, 2.6); g.translate(0, 0, 0.12); return g; })();

// ---------- colour slots ----------
const MD_NSLOT = 16;
const MD_SK = 0, MD_SKD = 1, MD_HR = 2, MD_P = 3, MD_PD = 4, MD_S = 5, MD_SD = 6, MD_A = 7, MD_DK = 8, MD_EY = 9, MD_PU = 10, MD_MT = 11, MD_VS = 12, MD_LP = 13, MD_HRD = 14, MD_GN = 15;
// Presets for character creation (look.skin / look.hair may be an index into these or any hex colour).
const MD_SKIN_TONES = [0xf3d2b6, 0xe2b48e, 0xc89064, 0x9c6642, 0x6e4329, 0x4b2d1c, 0xb9c7b4, 0xc7b3d6];
const MD_HAIR_COLS = [0x1c1612, 0x3a2516, 0x6b4322, 0xb48544, 0xdcc48c, 0x8c2e1a, 0xcfcfcf, 0x2d4d8c, 0x6b2c7a, 0x2c7a58];
const MD_HAIR_STYLES = ['Bald', 'Crop', 'Mohawk', 'Ponytail', 'Long', 'Topknot'];
const _mdC = new THREE.Color(), _mdC2 = new THREE.Color();
function md_col(v, list, d) {
  if (v == null || v === '') v = d;
  if (list && typeof v === 'number' && v >= 0 && v < list.length && v === Math.floor(v)) v = list[v];
  return _mdC2.set(v);
}
function md_pal() { return new Float32Array(MD_NSLOT * 3); }
// Write colour `c` (sRGB, scaled by k) as linear into slot i.
function md_put(pal, i, c, k = 1, mixC, mixK = 0) {
  _mdC.copy(c);
  if (mixC) _mdC.lerp(mixC, mixK);
  _mdC.multiplyScalar(k).convertSRGBToLinear();
  pal[i * 3] = _mdC.r; pal[i * 3 + 1] = _mdC.g; pal[i * 3 + 2] = _mdC.b;
}
const MD_WHITE = new THREE.Color(0xffffff), MD_BLACK = new THREE.Color(0x000000);
function md_basePal(pal) {
  md_put(pal, MD_DK, new THREE.Color(0x26282c)); md_put(pal, MD_EY, new THREE.Color(0xf2f0e6)); md_put(pal, MD_PU, new THREE.Color(0x15161a));
  md_put(pal, MD_MT, new THREE.Color(0x8d949b)); md_put(pal, MD_GN, new THREE.Color(0x3b4047));
}
function md_humanPal(look) {
  const pal = md_pal(); md_basePal(pal);
  const sk = md_col(look.skin, MD_SKIN_TONES, MD_SKIN_TONES[1]).clone();
  md_put(pal, MD_SK, sk); md_put(pal, MD_SKD, sk, 0.82); md_put(pal, MD_LP, sk, 0.72, new THREE.Color(0xa04040), 0.25);
  const hr = md_col(look.hair, MD_HAIR_COLS, MD_HAIR_COLS[2]).clone();
  md_put(pal, MD_HR, hr); md_put(pal, MD_HRD, hr, 0.6);
  const p = md_col(look.primary, null, 0x4f6070).clone(), s = md_col(look.secondary, null, 0x2c3238).clone(), a = md_col(look.accent, null, 0x3fd0ff).clone();
  md_put(pal, MD_P, p); md_put(pal, MD_PD, p, 0.62); md_put(pal, MD_S, s); md_put(pal, MD_SD, s, 0.6); md_put(pal, MD_A, a);
  md_put(pal, MD_VS, a, 0.45, MD_BLACK, 0.35);
  return pal;
}
function md_creaturePal(cols) {
  const pal = md_pal(); md_basePal(pal);
  const c0 = md_col(cols[0], null, 0x888888).clone(), c1 = md_col(cols[1], null, 0x444444).clone(), c2 = md_col(cols[2], null, 0xffcc44).clone();
  md_put(pal, MD_P, c0); md_put(pal, MD_PD, c0, 0.62); md_put(pal, MD_S, c1); md_put(pal, MD_SD, c1, 0.6); md_put(pal, MD_A, c2);
  md_put(pal, MD_SK, c0, 1, MD_WHITE, 0.35); md_put(pal, MD_SKD, c0, 0.8); md_put(pal, MD_HR, c1, 0.8); md_put(pal, MD_HRD, c1, 0.5);
  md_put(pal, MD_VS, c2, 0.5); md_put(pal, MD_LP, c0, 0.5, new THREE.Color(0x802020), 0.4);
  return pal;
}

// ---------- template building ----------
const md_tpls = new Map();
const _mdM = new THREE.Matrix4(), _mdQ = new THREE.Quaternion(), _mdE = new THREE.Euler(), _mdV = new V3(), _mdS = new V3();
// Merge parts {b: bone index, geo, p, r, s, c: slot, g: glow} into flat arrays (bind space).
function md_merge(parts, bones) {
  const P = [], C = [], B = [], G = [];
  for (const pt of parts) {
    const g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo;
    const w = bones ? bones[pt.b].w : [0, 0, 0];
    _mdE.set(...(pt.r || [0, 0, 0])); _mdQ.setFromEuler(_mdE);
    _mdS.set(...(pt.s || [1, 1, 1]));
    _mdV.set(pt.p[0] + w[0], pt.p[1] + w[1], pt.p[2] + w[2]);
    _mdM.compose(_mdV, _mdQ, _mdS);
    const flip = _mdM.determinant() < 0, a = g.attributes.position;
    for (let i = 0; i < a.count; i += 3) for (let j = 0; j < 3; j++) {
      _mdV.fromBufferAttribute(a, i + (flip && j ? 3 - j : j)).applyMatrix4(_mdM);
      P.push(_mdV.x, _mdV.y, _mdV.z); C.push(pt.c); B.push(pt.b || 0); G.push(pt.g || 0);
    }
  }
  const n = P.length / 3, pos = new Float32Array(P), nor = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let j = 0; j < 9; j += 3) { nor[i + j] = nx; nor[i + j + 1] = ny; nor[i + j + 2] = nz; }
  }
  return { n, pos, nor, slot: Uint8Array.from(C), bi: B, glow: Float32Array.from(G) };
}
// Build (once per key) a skinned template: bones + merged geometry attributes shared by every instance.
function md_tpl(key, build) {
  let T = md_tpls.get(key);
  if (T) return T;
  const bones = [], parts = [], I = {};
  const ctx = {
    bone(n, par, x, y, z, order) {
      const pi = par == null ? -1 : I[par], p = bones[pi];
      I[n] = bones.length;
      bones.push({ n, pi, at: [x, y, z], w: p ? [p.w[0] + x, p.w[1] + y, p.w[2] + z] : [x, y, z], order });
    },
    part(b, geo, p, c, r, s, g) { parts.push({ b: I[b], geo, p, c, r, s, g }); },
  };
  const ex = build(ctx) || {};
  const m = md_merge(parts, bones);
  const si = new Uint16Array(m.n * 4), sw = new Float32Array(m.n * 4);
  for (let i = 0; i < m.n; i++) { si[i * 4] = m.bi[i]; sw[i * 4] = 1; }
  const h = ex.h || 2;
  T = Object.assign({
    key, bones, I, n: m.n, tris: m.n / 3, slots: m.slot,
    attrs: {
      position: new THREE.BufferAttribute(m.pos, 3), normal: new THREE.BufferAttribute(m.nor, 3), glow: new THREE.BufferAttribute(m.glow, 1),
      skinIndex: new THREE.Uint16BufferAttribute(si, 4), skinWeight: new THREE.BufferAttribute(sw, 4),
    },
    sphere: new THREE.Sphere(new V3(0, h * 0.45, 0), h * 0.95),
  }, ex);
  md_tpls.set(key, T);
  return T;
}
function md_paint(geo, tpl, pal) {
  const col = geo.attributes.color.array, sl = tpl.slots;
  for (let i = 0; i < tpl.n; i++) { const s = sl[i] * 3, j = i * 3; col[j] = pal[s]; col[j + 1] = pal[s + 1]; col[j + 2] = pal[s + 2]; }
  geo.attributes.color.needsUpdate = true;
}
// A new skinned body from a template: fresh bones + skeleton, shared buffers, own colours.
function md_body(tpl, pal) {
  const bones = tpl.bones.map((b) => { const o = new THREE.Bone(); o.name = b.n; o.position.set(b.at[0], b.at[1], b.at[2]); if (b.order) o.rotation.order = b.order; return o; });
  tpl.bones.forEach((b, i) => { if (b.pi >= 0) bones[b.pi].add(bones[i]); });
  const g = new THREE.BufferGeometry();
  for (const k in tpl.attrs) g.setAttribute(k, tpl.attrs[k]);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tpl.n * 3), 3));
  md_paint(g, tpl, pal);
  g.boundingSphere = tpl.sphere;
  const mesh = new THREE.SkinnedMesh(g, md_skinMat);
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = mesh.receiveShadow = true;
  const B = {};
  tpl.bones.forEach((b, i) => { B[b.n] = bones[i]; });
  return { mesh, bones, B };
}
// Free only what an instance owns: its colour buffer and skeleton (template buffers stay shared).
function md_freeBody(body, tpl) {
  const g = body.mesh.geometry;
  for (const k in tpl.attrs) g.deleteAttribute(k);
  g.dispose();
  body.mesh.skeleton.dispose();
}

// ---------- small math helpers ----------
// Piecewise-eased keyframes: value at time t through (T[i], V[i]).
function md_kf(t, T, V) {
  const n = T.length - 1;
  if (t <= T[0]) return V[0];
  for (let i = 0; i < n; i++) if (t < T[i + 1]) return lerp(V[i], V[i + 1], ease((t - T[i]) / (T[i + 1] - T[i])));
  return V[n];
}
const md_amp = (a) => clamp(0.3 + 0.06 * a, 0, 0.95);           // thigh swing amplitude at speed a
// Metres travelled per gait cycle so the stance foot stays planted (stance sweep = 2 L sin A over duty).
const md_cycle = (a, L) => 2 * L * Math.sin(md_amp(a)) / lerp(0.5, 0.36, smooth(3.2, 6.5, a));
function md_mix(o, a, b, w, keys) {
  if (keys) for (const k of keys) o[k] = a[k] + (b[k] - a[k]) * w;
  else for (let i = 0; i < o.length; i++) o[i] = a[i] + (b[i] - a[i]) * w;
  return o;
}
function md_copy(o, a, keys) { if (keys) for (const k of keys) o[k] = a[k]; else o.set(a); return o; }

// 2-bone IK in the chest frame: place the wrist at T with the elbow toward `pole`, then orient the hand to Qh.
const _ikD = new V3(), _ikP = new V3(), _ikE = new V3(), _ikX = new V3(), _ikY = new V3(), _ikZ = new V3(), _ikM = new THREE.Matrix4(), _ikQ = new THREE.Quaternion();
const MD_XA = new V3(1, 0, 0);
function md_ik(ua, fa, hd, S, T, pole, Qh, a, b) {
  _ikD.subVectors(T, S);
  let d = _ikD.length();
  _ikD.multiplyScalar(1 / (d || 1));
  d = clamp(d, Math.abs(a - b) + 0.02, (a + b) * 0.999);
  const ca = (a * a + d * d - b * b) / (2 * a * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  _ikP.copy(pole).addScaledVector(_ikD, -pole.dot(_ikD));
  if (_ikP.lengthSq() < 1e-6) _ikP.set(0, -1, 0).addScaledVector(_ikD, _ikD.y);
  _ikP.normalize();
  _ikE.copy(S).addScaledVector(_ikD, a * ca).addScaledVector(_ikP, a * sa);
  _ikY.subVectors(S, _ikE).normalize();
  _ikZ.copy(S).addScaledVector(_ikD, d).sub(_ikE).addScaledVector(_ikP, -0.02 * a);
  _ikZ.addScaledVector(_ikY, -_ikZ.dot(_ikY)).normalize();
  _ikX.crossVectors(_ikY, _ikZ);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  ua.quaternion.setFromRotationMatrix(_ikM);
  const cb = clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1);
  fa.quaternion.setFromAxisAngle(MD_XA, -(Math.PI - Math.acos(cb)));
  _ikQ.multiplyQuaternions(ua.quaternion, fa.quaternion).invert();
  hd.quaternion.multiplyQuaternions(_ikQ, Qh);
}

// ======================================================================================
// Humanoids
// ======================================================================================
const MD_BREEDS = {
  baseline: { H: 1.8, leg: 1, tor: 1, wid: 1, th: 1, arm: 1, head: 1, neck: 1, hunch: 0 },
  bulwark: { H: 2.1, leg: 0.9, tor: 1.1, wid: 1.42, th: 1.5, arm: 1.12, head: 0.84, neck: 0.45, hunch: 0.3 },
  kestrel: { H: 1.75, leg: 1.14, tor: 0.96, wid: 0.86, th: 0.76, arm: 1.12, head: 0.92, neck: 1.5, hunch: 0 },
  savant: { H: 1.6, leg: 0.88, tor: 0.9, wid: 0.84, th: 0.78, arm: 0.94, head: 1.42, neck: 0.9, hunch: 0.06 },
};
function md_dims(breed, sex) {
  const B = MD_BREEDS[breed] || MD_BREEDS.baseline, f = sex === 'f';
  const D = {
    an: 0.08, ls: 0.43 * B.leg, lt: 0.44 * B.leg, hOff: 0.045, hw: 0.09 * B.wid * (f ? 1.12 : 1),
    sp0: 0.1 * B.tor, sp1: 0.16 * B.tor, ch: 0.29 * B.tor, nk: 0.05 * B.neck,
    sw: 0.2 * B.wid * (f ? 0.86 : 1), ua: 0.29 * B.arm, fa: 0.26 * B.arm,
  };
  const hs0 = B.head * (f ? 0.95 : 1);
  const top = D.an + D.ls + D.lt + D.hOff + D.sp0 + D.sp1 + D.ch + D.nk + 0.245 * hs0;
  const H = B.H * (f ? 0.95 : 1), k = H / top;
  for (const key in D) D[key] *= k;
  Object.assign(D, { k, f, breed: MD_BREEDS[breed] ? breed : 'baseline', hunch: B.hunch, thr: B.th * (f ? 0.86 : 1), wid: B.wid, hs: hs0 * k, H });
  D.th = D.thr * k; D.hipY = D.an + D.ls + D.lt + D.hOff; D.shY = D.ch * 0.84; D.L = D.ua + D.fa; D.leg = D.ls + D.lt;
  return D;
}
function md_hairOf(v) {
  if (typeof v === 'string') { const i = MD_HAIR_STYLES.findIndex((s) => s.toLowerCase() === v.toLowerCase()); return i < 0 ? 1 : i; }
  return clamp(Math.floor(v == null ? 1 : v), 0, MD_HAIR_STYLES.length - 1);
}
function md_humanKey(look) {
  const tier = clamp(Math.floor(look.armorTier || 0), 0, 3);
  const helm = look.helmet === 'visor' ? 'visor' : look.helmet ? 1 : 0;
  return [MD_BREEDS[look.breed] ? look.breed : 'baseline', look.sex === 'f' ? 'f' : 'm', tier, md_hairOf(look.hairStyle), helm];
}

function md_humanTpl(breed, sex, tier, hair, helm) {
  return md_tpl(['hum', breed, sex, tier, hair, helm].join('|'), (T) => {
    const D = md_dims(breed, sex), k = D.k, th = D.th, thr = D.thr, hs = D.hs, f = D.f;
    const cb = chamferBox, tb = taperBox;
    const p = (b, geo, x, y, z, c, r, s, g) => T.part(b, geo, [x, y, z], c, r, s, g);
    T.bone('base', null, 0, 0, 0);
    T.bone('hips', 'base', 0, D.hipY, 0);
    T.bone('spine', 'hips', 0, D.sp0, 0);
    T.bone('chest', 'spine', 0, D.sp1, 0);
    T.bone('head', 'chest', 0, D.ch + D.nk, 0);
    for (const [sd, s] of [['R', -1], ['L', 1]]) {
      T.bone('ua' + sd, 'chest', s * D.sw, D.shY, 0); T.bone('fa' + sd, 'ua' + sd, 0, -D.ua, 0); T.bone('hd' + sd, 'fa' + sd, 0, -D.fa, 0);
    }
    for (const [sd, s] of [['R', -1], ['L', 1]]) {
      T.bone('th' + sd, 'hips', s * D.hw, -D.hOff, 0, 'YZX'); T.bone('sh' + sd, 'th' + sd, 0, -D.lt, 0); T.bone('ft' + sd, 'sh' + sd, 0, -D.ls, 0);
    }
    const suit = tier >= 2 ? MD_SD : MD_P, trim = tier >= 2 ? MD_S : MD_SD;
    const at = 0.1 * th, ft = 0.085 * th, tt = 0.15 * th, st = 0.105 * th;
    const cw = 2 * D.sw - 0.03 * k, cd = 0.2 * k * (0.62 + 0.38 * thr), ww = 2 * D.hw + 0.07 * k * thr * (f ? 0.8 : 1);
    // ----- torso -----
    p('hips', tb(2 * D.hw + tt * 0.95, cd * 0.95, ww, cd * 0.9, 0.17 * k), 0, -0.03 * k, 0, suit);
    p('hips', cb(ww + 0.02 * k, 0.05 * k, cd * 0.98, 0.015 * k), 0, 0.045 * k, 0, tier ? MD_DK : MD_SD);   // belt
    p('hips', cb(0.06 * k, 0.045 * k, 0.02 * k, 0.01 * k), 0, 0.045 * k, cd * 0.5, MD_MT);                // buckle
    p('spine', tb(ww, cd * 0.9, cw * 0.8, cd, D.sp1 + 0.02 * k), 0, D.sp1 / 2, 0, suit);
    p('chest', tb(cw * 0.8, cd, cw, cd * 1.04, D.ch), 0, D.ch / 2, 0, suit);
    p('chest', tb(cw * 0.95, cd * 0.92, 0.13 * k * thr, 0.1 * k, 0.07 * k), 0, D.ch + 0.025 * k, -0.01 * k, suit);   // trapezius
    p('chest', tb(0.08 * k * Math.sqrt(thr), 0.085 * k, 0.075 * k, 0.08 * k, D.nk + 0.09 * k), 0, D.ch + D.nk / 2 + 0.01 * k, 0.005 * k, MD_SK);
    if (f && tier < 2) p('chest', cb(cw * 0.62, 0.11 * k, 0.08 * k, 0.03 * k), 0, D.ch * 0.6, cd * 0.5, tier === 1 ? MD_S : suit, [0.2, 0, 0]);
    if (tier === 0) {
      p('chest', cb(0.018 * k, D.ch * 0.8, 0.01 * k, 0.004 * k), 0.03 * k, D.ch * 0.52, cd * 0.52, MD_SD);   // zip
      p('chest', tb(0.14 * k, 0.06 * k, 0.16 * k, 0.07 * k, 0.04 * k), 0, D.ch + 0.01 * k, 0.03 * k, MD_SD); // collar
      for (const s of [-1, 1]) p('chest', cb(0.035 * k, D.ch * 0.6, 0.01 * k, 0.004 * k), s * cw * 0.32, D.ch * 0.55, cd * 0.52, MD_A);
    }
    // ----- arms -----
    for (const [sd, s] of [['R', -1], ['L', 1]]) {
      const U = 'ua' + sd, F = 'fa' + sd, Hd = 'hd' + sd;
      p(U, cb(at * 1.2, at * 1.2, at * 1.2, at * 0.35), 0, -0.01 * k, 0, suit);
      p(U, tb(at * 0.85, at * 0.85, at, at, D.ua), 0, -D.ua / 2, 0, suit);
      p(F, tb(ft * 0.78, ft * 0.78, ft, ft, D.fa), 0, -D.fa / 2, 0, suit);
      p(F, cb(ft * 1.08, 0.05 * k, ft * 1.08, 0.015 * k), 0, -D.fa + 0.025 * k, 0, trim);
      p(Hd, cb(0.07 * k * Math.sqrt(thr), 0.1 * k, 0.09 * k, 0.026 * k), 0, -0.05 * k, 0.005 * k, tier ? MD_DK : MD_SK);
      p(Hd, cb(0.03 * k, 0.05 * k, 0.03 * k, 0.01 * k), -s * 0.03 * k, -0.035 * k, 0.04 * k, tier ? MD_DK : MD_SK);
      if (tier === 0) p(U, cb(at * 1.24, 0.035 * k, at * 1.24, 0.01 * k), 0, -0.07 * k, 0, MD_A);
    }
    // ----- legs -----
    for (const [sd] of [['R', -1], ['L', 1]]) {
      const Th = 'th' + sd, Sh = 'sh' + sd, Ft = 'ft' + sd;
      p(Th, tb(tt * 0.74, tt * 0.78, tt, tt * 1.02, D.lt + 0.02 * k), 0, -D.lt / 2, 0, suit);
      p(Sh, tb(st * 0.78, st * 0.8, st, st, D.ls), 0, -D.ls / 2, 0, suit);
      const bw = 0.11 * k * Math.sqrt(thr), bh = D.an + 0.07 * k;
      p(Ft, cb(bw, bh, 0.26 * k, 0.03 * k), 0, -D.an + bh / 2, 0.045 * k, tier ? MD_SD : MD_DK);
      p(Ft, cb(bw * 1.04, 0.025 * k, 0.27 * k, 0.008 * k), 0, -D.an + 0.0125 * k, 0.045 * k, MD_DK);
    }
    // ----- head -----
    const kes = breed === 'kestrel', sav = breed === 'savant', bul = breed === 'bulwark';
    const hy = kes ? 1.06 : 1;
    p('head', cb(0.19 * hs, 0.2 * hs * hy, 0.215 * hs, 0.06 * hs), 0, 0.14 * hs * hy, 0, MD_SK);
    p('head', tb((bul ? 0.16 : f ? 0.11 : 0.125) * hs, 0.13 * hs, 0.18 * hs, 0.18 * hs, 0.1 * hs * hy), 0, 0.055 * hs * hy, 0.018 * hs, MD_SK);
    p('head', tb(0.036 * hs, 0.034 * hs, 0.016 * hs, 0.016 * hs, 0.055 * hs, 0, 0.012 * hs), 0, 0.105 * hs * hy, 0.104 * hs, MD_SKD);
    for (const s of [-1, 1]) {
      p('head', cb(0.042 * hs, 0.024 * hs, 0.02 * hs, 0.006 * hs), s * 0.045 * hs, 0.14 * hs * hy, 0.101 * hs, MD_PU);
      p('head', cb(0.055 * hs, 0.014 * hs, 0.02 * hs, 0.005 * hs), s * 0.045 * hs, 0.165 * hs * hy, 0.104 * hs, MD_HRD, [0, 0, s * (sav ? 0.15 : -0.08)]);
      if (kes) p('head', tb(0.045 * hs, 0.03 * hs, 0.008 * hs, 0.008 * hs, 0.15 * hs), s * 0.1 * hs, 0.17 * hs, -0.04 * hs, MD_SK, [-0.9, 0, -s * 0.5]);
      else p('head', cb(0.026 * hs, 0.055 * hs, 0.042 * hs, 0.01 * hs), s * 0.097 * hs, 0.125 * hs, -0.005 * hs, MD_SK);
    }
    p('head', cb(0.05 * hs, 0.011 * hs, 0.012 * hs, 0.004 * hs), 0, 0.068 * hs * hy, 0.105 * hs, MD_LP);
    if (bul) p('head', cb(0.18 * hs, 0.035 * hs, 0.05 * hs, 0.012 * hs), 0, 0.17 * hs, 0.09 * hs, MD_SKD);
    if (sav) {   // swollen cranium with lumen implants
      p('head', cb(0.2 * hs, 0.14 * hs, 0.24 * hs, 0.06 * hs), 0, 0.22 * hs, -0.025 * hs, MD_SK);
      for (const s of [-1, 1]) { p('head', cb(0.035 * hs, 0.03 * hs, 0.05 * hs, 0.01 * hs), s * 0.08 * hs, 0.25 * hs, -0.05 * hs, MD_MT); p('head', cb(0.02 * hs, 0.012 * hs, 0.035 * hs, 0.004 * hs), s * 0.08 * hs, 0.267 * hs, -0.05 * hs, MD_A, 0, 0, 0.9); }
      p('head', cb(0.014 * hs, 0.012 * hs, 0.16 * hs, 0.004 * hs), 0, 0.292 * hs, -0.03 * hs, MD_A, 0, 0, 0.9);
      p('head', cb(0.03 * hs, 0.03 * hs, 0.03 * hs, 0.008 * hs), 0, 0.16 * hs, -0.13 * hs, MD_MT);
    }
    // hair / helmet
    const topY = (sav ? 0.29 : 0.24) * hs * hy;
    if (helm === 1) {
      p('head', cb(0.235 * hs, 0.19 * hs, 0.255 * hs, 0.06 * hs), 0, 0.175 * hs * hy, -0.01 * hs, tier >= 2 ? MD_P : MD_SD);
      p('head', cb(0.2 * hs, 0.06 * hs, 0.05 * hs, 0.02 * hs), 0, 0.14 * hs * hy, 0.105 * hs, MD_VS, 0, 0, tier >= 3 ? 0.7 : 0.25);
      for (const s of [-1, 1]) p('head', cb(0.03 * hs, 0.09 * hs, 0.09 * hs, 0.01 * hs), s * 0.12 * hs, 0.11 * hs, 0, MD_S);
      if (tier >= 3) p('head', cb(0.03 * hs, 0.04 * hs, 0.22 * hs, 0.01 * hs), 0, 0.275 * hs * hy, -0.02 * hs, MD_A, 0, 0, 0.8);
      else p('head', cb(0.05 * hs, 0.02 * hs, 0.2 * hs, 0.008 * hs), 0, 0.27 * hs * hy, -0.01 * hs, MD_S);
    } else {
      const cap = () => {
        p('head', cb(0.205 * hs, 0.09 * hs, 0.228 * hs, 0.04 * hs), 0, topY - 0.035 * hs, -0.005 * hs, MD_HR);
        p('head', cb(0.2 * hs, 0.13 * hs, 0.06 * hs, 0.025 * hs), 0, topY - 0.11 * hs, -0.088 * hs, MD_HR);
        for (const s of [-1, 1]) p('head', cb(0.02 * hs, 0.07 * hs, 0.09 * hs, 0.008 * hs), s * 0.098 * hs, topY - 0.08 * hs, -0.035 * hs, MD_HR);
      };
      if (hair === 1) { cap(); p('head', cb(0.15 * hs, 0.04 * hs, 0.06 * hs, 0.015 * hs), 0, topY - 0.04 * hs, 0.085 * hs, MD_HR, [0.35, 0, 0]); }
      if (hair === 2) {
        p('head', tb(0.045 * hs, 0.22 * hs, 0.022 * hs, 0.18 * hs, 0.11 * hs), 0, topY + 0.03 * hs, -0.02 * hs, MD_HR);
        p('head', tb(0.04 * hs, 0.04 * hs, 0.02 * hs, 0.02 * hs, 0.08 * hs), 0, topY - 0.04 * hs, -0.12 * hs, MD_HR, [0.5, 0, 0]);
      }
      if (hair === 3) {
        cap(); p('head', cb(0.16 * hs, 0.05 * hs, 0.06 * hs, 0.02 * hs), 0, topY - 0.04 * hs, 0.08 * hs, MD_HR, [0.4, 0, 0]);
        p('head', cb(0.045 * hs, 0.04 * hs, 0.04 * hs, 0.01 * hs), 0, 0.17 * hs, -0.125 * hs, MD_A);
        p('head', tb(0.025 * hs, 0.02 * hs, 0.07 * hs, 0.06 * hs, 0.28 * hs), 0, 0.03 * hs, -0.155 * hs, MD_HR, [-0.25, 0, 0]);
      }
      if (hair === 4) {
        cap(); p('head', cb(0.2 * hs, 0.05 * hs, 0.06 * hs, 0.02 * hs), 0, topY - 0.05 * hs, 0.08 * hs, MD_HR, [0.6, 0, 0]);
        p('head', cb(0.22 * hs, 0.3 * hs, 0.07 * hs, 0.03 * hs), 0, 0.04 * hs, -0.105 * hs, MD_HR, [-0.12, 0, 0]);
        for (const s of [-1, 1]) p('head', cb(0.035 * hs, 0.24 * hs, 0.09 * hs, 0.012 * hs), s * 0.105 * hs, 0.06 * hs, -0.03 * hs, MD_HR);
      }
      if (hair === 5) {
        cap(); p('head', new THREE.IcosahedronGeometry(0.065 * hs, 0), 0, topY + 0.02 * hs, -0.07 * hs, MD_HR, 0, [1, 0.85, 1]);
        p('head', cb(0.06 * hs, 0.02 * hs, 0.06 * hs, 0.006 * hs), 0, topY - 0.02 * hs, -0.07 * hs, MD_A);
      }
      if (helm === 'visor') {
        p('head', cb(0.215 * hs, 0.05 * hs, 0.235 * hs, 0.02 * hs), 0, 0.14 * hs * hy, 0.005 * hs, MD_SD);
        p('head', cb(0.18 * hs, 0.042 * hs, 0.03 * hs, 0.012 * hs), 0, 0.14 * hs * hy, 0.112 * hs, MD_VS, 0, 0, 0.6);
      }
    }
    // ----- armour tiers -----
    const sp = (geo, x, y, z, c, r, s, g) => p('chest', geo, x, y, z, c, r, s, g);
    if (tier === 1) {
      sp(cb(cw + 0.04 * k, D.ch * 0.86, cd + 0.06 * k, 0.045 * k), 0, D.ch * 0.52, 0, MD_S);
      p('spine', tb(ww + 0.03 * k, cd + 0.03 * k, cw * 0.8 + 0.03 * k, cd + 0.05 * k, D.sp1 * 0.9), 0, D.sp1 * 0.55, 0, MD_S);
      for (const s of [-1, 1]) sp(cb(0.035 * k, D.ch * 0.7, 0.02 * k, 0.008 * k), s * 0.07 * k, D.ch * 0.55, cd / 2 + 0.035 * k, MD_SD);
      for (const x of [-0.11, 0.11]) p('hips', cb(0.06 * k, 0.07 * k, 0.04 * k, 0.012 * k), x * k * D.wid, 0.025 * k, cd * 0.5 + 0.02 * k, MD_SD);
      for (const sd of ['R', 'L']) {
        p('sh' + sd, cb(st * 1.2, 0.1 * k, 0.05 * k, 0.02 * k), 0, -0.04 * k, st * 0.55, MD_SD);
        p('fa' + sd, cb(ft * 1.2, 0.07 * k, 0.04 * k, 0.015 * k), 0, -0.02 * k, -ft * 0.55, MD_SD);
        p('ua' + sd, cb(at * 1.45, 0.06 * k, at * 1.45, 0.02 * k), 0, 0.03 * k, 0, MD_S);
      }
    }
    if (tier >= 2) {
      const hv = tier === 3 ? 1 : 0, ex = (hv ? 0.11 : 0.06) * k;
      sp(cb(cw + ex, D.ch * (hv ? 1.0 : 0.9), cd + ex * 1.1, 0.06 * k), 0, D.ch * 0.53, hv ? 0.01 * k : 0, MD_P);
      sp(tb(cw * 0.7, cd * 0.7, cw * 0.9, cd * 0.8, 0.08 * k), 0, D.ch + 0.02 * k, 0, MD_S);           // gorget
      p('spine', tb(ww + 0.04 * k, cd + 0.04 * k, cw * 0.8 + 0.04 * k, cd + 0.06 * k, D.sp1 * 0.85), 0, D.sp1 * 0.55, 0, MD_PD);
      for (const y of [0.25, 0.6]) p('spine', cb(cw * 0.6, 0.012 * k, 0.02 * k, 0.004 * k), 0, D.sp1 * y, cd / 2 + 0.035 * k, MD_S);
      for (const sd of ['R', 'L']) {
        const s = sd === 'R' ? -1 : 1, U = 'ua' + sd, F = 'fa' + sd;
        const pw = at + (hv ? 0.17 : 0.11) * k;
        p(U, cb(pw, (hv ? 0.13 : 0.1) * k, pw * 1.05, 0.04 * k), s * 0.02 * k, 0.03 * k, 0, MD_P, [0, 0, s * 0.3]);
        p(U, cb(pw * 0.9, 0.03 * k, pw, 0.01 * k), s * 0.04 * k, -0.04 * k, 0, MD_S, [0, 0, s * 0.3]);
        if (hv) {
          p(U, cb(pw * 0.85, 0.09 * k, pw * 0.95, 0.03 * k), s * 0.055 * k, -0.075 * k, 0, MD_P, [0, 0, s * 0.42]);
          p(U, cb(pw * 0.92, 0.014 * k, 0.02 * k, 0.004 * k), s * 0.05 * k, 0.0, pw * 0.53, MD_A, [0, 0, s * 0.3], 0, 0.9);
          p(U, cb(at * 1.15, D.ua * 0.55, at * 1.15, 0.02 * k), 0, -D.ua * 0.6, 0, MD_P);
        }
        p(F, cb(ft * (hv ? 1.5 : 1.3), D.fa * 0.62, ft * (hv ? 1.5 : 1.3), 0.025 * k), 0, -D.fa * 0.62, 0, MD_S);
        if (hv) p(F, cb(0.012 * k, D.fa * 0.5, 0.012 * k, 0.003 * k), 0, -D.fa * 0.62, ft * 0.76, MD_A, 0, 0, 0.9);
        const Th = 'th' + sd, Sh = 'sh' + sd, Ft = 'ft' + sd;
        p(Th, cb(tt * (hv ? 1.25 : 1.12), D.lt * 0.6, tt * 0.5, 0.025 * k), 0, -D.lt * 0.42, tt * 0.42, MD_P);
        if (hv) p(Th, cb(tt * 0.5, D.lt * 0.55, tt * 1.1, 0.02 * k), s * tt * 0.55, -D.lt * 0.45, 0, MD_P);
        p(Sh, cb(st * 1.3, D.ls * 0.66, st * 0.6, 0.025 * k), 0, -D.ls * 0.45, st * 0.42, MD_P);
        p(Sh, cb(st * 1.3, 0.09 * k, st * 0.6, 0.025 * k), 0, -0.02 * k, st * 0.5, MD_S);
        if (hv) p(Sh, cb(0.014 * k, D.ls * 0.5, 0.012 * k, 0.003 * k), 0, -D.ls * 0.45, st * 0.74, MD_A, 0, 0, 0.9);
        p(Ft, cb(0.125 * k * Math.sqrt(thr), 0.07 * k, 0.15 * k, 0.02 * k), 0, -D.an + 0.1 * k, 0.07 * k, MD_S);
      }
      for (const [x, z] of [[-0.13, 0], [0.13, 0], [0, 1], [0, -1]]) {   // faulds
        if (!hv && z !== 1 && x === 0) continue;
        p('hips', cb(x ? 0.07 * k : 0.15 * k, 0.13 * k, x ? cd * 0.9 : 0.03 * k, 0.02 * k), x * k * D.wid * 1.25, -0.06 * k, z * (cd * 0.5 + 0.02 * k), MD_PD, [z * 0.12, 0, -x * 1.4]);
      }
      for (const x of [-0.1, 0.1]) p('hips', cb(0.06 * k, 0.065 * k, 0.04 * k, 0.012 * k), x * k * D.wid, 0.03 * k, -cd * 0.5 - 0.02 * k, MD_SD);
      if (hv) {
        sp(cb(0.016 * k, D.ch * 0.65, 0.012 * k, 0.004 * k), 0, D.ch * 0.5, cd / 2 + ex * 0.55 + 0.004 * k, MD_A, 0, 0, 0.9);
        for (const s of [-1, 1]) sp(cb(cw * 0.32, 0.014 * k, 0.012 * k, 0.004 * k), s * cw * 0.2, D.ch * 0.7, cd / 2 + ex * 0.55 + 0.002 * k, MD_A, [0, 0, -s * 0.35], 0, 0.9);
        sp(cb(cw * 0.75, D.ch * 0.95, 0.15 * k, 0.04 * k), 0, D.ch * 0.52, -cd / 2 - 0.11 * k, MD_SD);   // power pack
        for (const s of [-1, 1]) sp(cb(0.05 * k, 0.12 * k, 0.02 * k, 0.008 * k), s * 0.08 * k, D.ch * 0.55, -cd / 2 - 0.19 * k, MD_A, 0, 0, 0.9);
        for (const s of [-1, 1]) sp(new THREE.CylinderGeometry(0.03 * k, 0.03 * k, 0.12 * k, 6), s * 0.11 * k, D.ch * 1.02, -cd / 2 - 0.12 * k, MD_MT);
      }
    }
    const top = D.hipY + D.sp0 + D.sp1 + D.ch + D.nk + topY + (hair === 2 ? 0.08 * hs : 0);
    return { h: top, D, r: (0.3 + 0.1 * (D.wid - 1)) * k };
  });
}

// ---------- weapons (static meshes held in the right hand; +Z = barrel, origin = centre of the fist) ----------
const MD_WPN = {
  none: { cls: 'none' }, fists: { cls: 'fists' },
  pistol: { cls: 'pistol', gun: 1, muzzle: [0, 0.075, 0.22] },
  smg: { cls: 'smg', gun: 1, grip: [0, -0.02, 0.2], muzzle: [0, 0.07, 0.37] },
  rifle: { cls: 'long', gun: 1, grip: [0, 0.0, 0.32], muzzle: [0, 0.085, 0.72] },
  shotgun: { cls: 'long', gun: 1, grip: [0, -0.005, 0.3], muzzle: [0, 0.085, 0.62] },
  heavy: { cls: 'heavy', gun: 1, grip: [0, 0.17, 0.22], muzzle: [0, 0.08, 0.86] },
  melee1h: { cls: 'melee1h' }, melee2h: { cls: 'melee2h', grip: [0, 0, -0.17] },
};
const md_wGeo = {};
const MD_WPAL = { g: [0x3b4047], d: [0x1f2226], m: [0x9aa1a8], a: [0x46d8ff], w: [0x6a4a30], o: [0xe0a030] };
function md_weaponGeo(kind) {
  if (md_wGeo[kind]) return md_wGeo[kind];
  const cb = chamferBox, tb = taperBox, P = [];
  const cy = (r1, r2, h, n = 7) => new THREE.CylinderGeometry(r1, r2, h, n);
  const a = (geo, x, y, z, c, r, g) => P.push({ geo, p: [x, y, z], c, r, g });
  const X = Math.PI / 2;
  switch (kind) {
    case 'pistol':
      a(cb(0.04, 0.05, 0.22, 0.012), 0, 0.075, 0.07, 'g'); a(cb(0.034, 0.11, 0.05, 0.012), 0, 0.0, -0.005, 'd', [0.2, 0, 0]);
      a(cy(0.012, 0.012, 0.05), 0, 0.08, 0.2, 'd', [X, 0, 0]); a(cb(0.042, 0.012, 0.12, 0.004), 0, 0.055, 0.1, 'a', 0, 0.8); break;
    case 'smg':
      a(cb(0.05, 0.07, 0.3, 0.015), 0, 0.07, 0.08, 'g'); a(cb(0.035, 0.1, 0.045, 0.01), 0, 0.0, 0.0, 'd', [0.15, 0, 0]);
      a(cb(0.03, 0.15, 0.04, 0.01), 0, -0.02, 0.12, 'd'); a(cy(0.014, 0.014, 0.1), 0, 0.075, 0.27, 'd', [X, 0, 0]);
      a(cb(0.03, 0.03, 0.14, 0.008), 0, 0.06, -0.12, 'd'); a(cb(0.052, 0.012, 0.18, 0.004), 0, 0.105, 0.06, 'a', 0, 0.8); break;
    case 'rifle':
      a(cb(0.055, 0.09, 0.42, 0.016), 0, 0.075, 0.06, 'g'); a(cb(0.035, 0.11, 0.05, 0.01), 0, -0.005, 0.0, 'd', [0.2, 0, 0]);
      a(tb(0.04, 0.12, 0.045, 0.08, 0.26), 0, 0.06, -0.24, 'd', [-X, 0, 0]); a(cb(0.035, 0.12, 0.05, 0.01), 0, 0.0, 0.1, 'd', [-0.2, 0, 0]);
      a(cy(0.015, 0.015, 0.36), 0, 0.085, 0.45, 'd', [X, 0, 0]); a(cb(0.045, 0.05, 0.2, 0.012), 0, 0.06, 0.34, 'g');
      a(cy(0.022, 0.022, 0.13, 6), 0, 0.15, 0.04, 'd', [X, 0, 0]); a(cb(0.058, 0.014, 0.3, 0.004), 0, 0.12, 0.08, 'a', 0, 0.8); break;
    case 'shotgun':
      a(cb(0.06, 0.09, 0.3, 0.016), 0, 0.075, 0.04, 'g'); a(cb(0.035, 0.11, 0.05, 0.01), 0, -0.005, 0.0, 'd', [0.2, 0, 0]);
      a(tb(0.045, 0.12, 0.05, 0.09, 0.26), 0, 0.06, -0.22, 'w', [-X, 0, 0]);
      for (const x of [-0.016, 0.016]) a(cy(0.016, 0.016, 0.42), x, 0.09, 0.4, 'd', [X, 0, 0]);
      a(cb(0.06, 0.05, 0.16, 0.015), 0, 0.045, 0.32, 'w'); a(cb(0.064, 0.012, 0.2, 0.004), 0, 0.12, 0.05, 'o'); break;
    case 'heavy':
      a(cb(0.13, 0.15, 0.5, 0.03), 0, 0.08, 0.15, 'g'); a(cy(0.05, 0.05, 0.55, 8), 0, 0.08, 0.6, 'd', [X, 0, 0]);
      a(cy(0.07, 0.07, 0.08, 8), 0, 0.08, 0.72, 'g', [X, 0, 0]); a(cy(0.075, 0.075, 0.025, 8), 0, 0.08, 0.5, 'a', [X, 0, 0], 0.9);
      a(cy(0.09, 0.09, 0.08, 8), 0.0, -0.03, 0.12, 'd', [0, 0, X]); a(cb(0.035, 0.11, 0.05, 0.01), 0, -0.005, 0.0, 'd', [0.15, 0, 0]);
      a(cb(0.03, 0.03, 0.12, 0.01), 0, 0.2, 0.22, 'd'); a(cb(0.03, 0.06, 0.03, 0.01), 0, 0.18, 0.17, 'd'); a(cb(0.03, 0.06, 0.03, 0.01), 0, 0.18, 0.27, 'd');
      a(cb(0.135, 0.02, 0.3, 0.006), 0, 0.15, 0.12, 'o'); break;
    case 'melee1h':
      a(cb(0.03, 0.12, 0.03, 0.008), 0, 0, -0.01, 'w', [X, 0, 0]); a(cb(0.14, 0.03, 0.04, 0.01), 0, 0, 0.07, 'g');
      a(tb(0.06, 0.012, 0.005, 0.006, 0.55), 0, 0, 0.36, 'm', [X, 0, 0]); a(cb(0.008, 0.008, 0.48, 0.002), 0, 0.012, 0.33, 'a', 0, 0.9);
      a(new THREE.OctahedronGeometry(0.025, 0), 0, 0, -0.08, 'g'); break;
    case 'melee2h':
      a(cb(0.035, 0.38, 0.035, 0.01), 0, 0, -0.05, 'w', [X, 0, 0]); a(cb(0.22, 0.05, 0.06, 0.015), 0, 0, 0.16, 'g');
      a(tb(0.13, 0.02, 0.02, 0.012, 0.85), 0, 0, 0.6, 'm', [X, 0, 0]); a(cb(0.01, 0.01, 0.7, 0.003), 0, 0.02, 0.55, 'a', 0, 0.9);
      a(new THREE.OctahedronGeometry(0.04, 0), 0, 0, -0.25, 'g'); break;
    case 'baton':
      a(cy(0.02, 0.02, 0.12), 0, 0, 0, 'd', [X, 0, 0]); a(cy(0.024, 0.024, 0.02), 0, 0, 0.07, 'g', [X, 0, 0]);
      a(cy(0.016, 0.018, 0.42), 0, 0, 0.29, 'g', [X, 0, 0]); a(cy(0.02, 0.02, 0.06), 0, 0, 0.47, 'a', [X, 0, 0], 0.9); break;
    case 'hammer':
      a(cy(0.022, 0.022, 0.95), 0, 0, 0.18, 'w', [X, 0, 0]); a(cb(0.14, 0.16, 0.28, 0.03), 0, 0, 0.66, 'g', [0, X, 0]);
      a(cb(0.15, 0.02, 0.17, 0.005), 0, 0, 0.66, 'a', [0, X, 0], 0.9); break;
    case 'fists':   // glowing knuckle wrap, worn on each hand
      a(cb(0.085, 0.06, 0.1, 0.02), 0, 0.0, 0.005, 'd'); a(cb(0.09, 0.02, 0.07, 0.006), 0, -0.04, 0.02, 'a', 0, 0.9);
      a(cb(0.02, 0.05, 0.105, 0.006), 0.035, -0.005, 0.005, 'a', 0, 0.9); break;
    default: return null;
  }
  const parts = P.map((q) => ({ ...q, c: 0, gcol: MD_WPAL[q.c][0] }));
  const m = md_merge(parts, null);
  const col = new Float32Array(m.n * 3);
  let vi = 0;
  for (const q of parts) {
    const g = q.geo.index ? q.geo.index.count : q.geo.attributes.position.count;
    _mdC.set(q.gcol).convertSRGBToLinear();
    for (let i = 0; i < g; i++, vi++) { col[vi * 3] = _mdC.r; col[vi * 3 + 1] = _mdC.g; col[vi * 3 + 2] = _mdC.b; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(m.nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('glow', new THREE.BufferAttribute(m.glow, 1));
  geo.computeBoundingSphere();
  return (md_wGeo[kind] = geo);
}

// ---------- humanoid poses ----------
// A pose is a flat set of numbers (so states cross-fade by plain lerp). Arm targets (rt*, lt*) are wrist
// offsets from each shoulder in the chest frame, rq*/lq* hand orientation (Euler, chest frame), rp*/lp* elbow
// pole directions; lg pulls the left hand onto the weapon's fore-grip; lock keeps arms aimed forward while the
// torso twists; cast drives the glow between the hands.
const MD_HK = ['hy', 'hz_', 'hx', 'hr', 'hz', 'sx', 'sy', 'sz', 'cx', 'cy', 'cz', 'nx', 'ny', 'nz',
  'tLx', 'tLy', 'tLz', 'kL', 'fL', 'tRx', 'tRy', 'tRz', 'kR', 'fR',
  'rtx', 'rty', 'rtz', 'rqx', 'rqy', 'rqz', 'rpx', 'rpy', 'rpz', 'ltx', 'lty', 'ltz', 'lqx', 'lqy', 'lqz', 'lpx', 'lpy', 'lpz', 'lg', 'lock', 'cast'];
function md_hpose() { const o = {}; for (const k of MD_HK) o[k] = 0; return o; }
const md_legDrop = (D, t, kn, z) => (D.lt * Math.cos(t) + D.ls * Math.cos(t + kn)) * Math.cos(z) + D.an;

function md_hLegs(rig, P, v, stance) {
  const D = rig.D, a = Math.abs(v), mv = smooth(0.05, 0.5, a), run = smooth(3.2, 6.5, a);
  const A = md_amp(a) * mv, ph = rig.ph, sv = 1 - mv;
  let hy = 0;
  for (let s = 0; s < 2; s++) {
    const f = ph + s * Math.PI, sg = s ? -1 : 1;   // s=0 left, s=1 right
    const t = -A * Math.sin(f) - 0.14 * run * mv + sv * stance * (s ? 0.1 : -0.22);
    const kn = mv * ((0.45 + 1.15 * run) * Math.pow(Math.max(0, Math.cos(f - 0.55 * run)), 1.5) + 0.1 + 0.15 * run) + sv * (0.04 + stance * 0.2);
    const z = sg * (0.025 + 0.02 * sv + stance * 0.07 * sv);
    const fx = -(t + kn) * (0.85 + 0.15 * mv) + mv * 0.35 * Math.max(0, -Math.cos(f)) * Math.max(0, -Math.sin(f) * Math.sign(v || 1));
    if (s) { P.tRx = t; P.tRy = 0; P.tRz = z; P.kR = kn; P.fR = fx; } else { P.tLx = t; P.tLy = 0; P.tLz = z; P.kL = kn; P.fL = fx; }
    hy = Math.max(hy, md_legDrop(D, t, kn, z));
  }
  P.hy = hy + D.hOff;
  P.hr = -0.22 * A * Math.sin(ph); P.hz = 0.035 * mv * Math.sin(ph);
  P.sx = 0.16 * run * mv + D.hunch * 0.45; P.cx = D.hunch * 0.45 + 0.04 * run;
  P.cy = 0.4 * A * Math.sin(ph); P.nx = -0.12 * run * mv - D.hunch * 0.75;
  return { mv, run, A };
}
// Arm swing (also the idle hang) for both arms.
function md_hSwing(rig, P, g) {
  const D = rig.D, k = D.k, A = g.A * (0.75 + 0.35 * g.run), b = 0.2 + 1.25 * g.run;
  for (let s = 0; s < 2; s++) {
    const sg = s ? 1 : -1, sw = sg * A * Math.sin(rig.ph) + 0.05 + 0.3 * g.run;   // s=1 right arm (in phase with left leg)
    const x = (s ? -1 : 1) * (0.035 + 0.02 * D.wid) * k - (s ? -1 : 1) * 0.05 * k * g.run;
    const y = -D.ua * Math.cos(sw) - D.fa * Math.cos(sw + b), z = D.ua * Math.sin(sw) + D.fa * Math.sin(sw + b);
    if (s) { P.rtx = x; P.rty = y; P.rtz = z; P.rqx = -(sw + b) - 0.1; P.rqy = 0; P.rqz = 0; P.rpx = -0.3; P.rpy = -0.1; P.rpz = -1; }
    else { P.ltx = x; P.lty = y; P.ltz = z; P.lqx = -(sw + b) - 0.1; P.lqy = 0; P.lqz = 0; P.lpx = 0.3; P.lpy = -0.1; P.lpz = -1; }
  }
}
const md_r = (P, x, y, z, qx, qy, qz) => { P.rtx = x; P.rty = y; P.rtz = z; P.rqx = qx; P.rqy = qy; P.rqz = qz; };
const md_l = (P, x, y, z, qx, qy, qz) => { P.ltx = x; P.lty = y; P.ltz = z; P.lqx = qx; P.lqy = qy; P.lqz = qz; };
// Weapon carry while not fighting.
function md_hCarry(rig, P, g) {
  const D = rig.D, k = D.k, bob = 0.012 * k * g.mv * Math.cos(2 * rig.ph);
  switch (rig.wc) {
    case 'pistol': case 'smg': P.rqx = 0.3; P.rqy = 0; break;
    case 'melee1h': P.rqx = 0.75 - 0.3 * g.run; break;
    case 'long': md_r(P, 0.13 * k, -0.36 * k + bob, 0.17 * k, 0.45, 0.55, 0); P.lg = 1; break;
    case 'heavy': md_r(P, 0.1 * k, -0.4 * k + bob, 0.14 * k, 0.2, 0.3, 0); P.lg = 1; break;
    case 'melee2h': md_r(P, 0.1 * k, -0.25 * k + bob, 0.17 * k, -2.25, 0, 0.25); break;
  }
}
// Combat-ready upper body per weapon class.
function md_hCombat(rig, P, g) {
  const D = rig.D, k = D.k, L = D.L, t = rig.t;
  P.rpx = -0.6; P.rpy = -1; P.rpz = -0.1; P.lpx = 0.6; P.lpy = -1; P.lpz = -0.1;
  switch (rig.wc) {
    case 'pistol':
      md_r(P, 0.07 * k, 0.01 * k, L * 0.96, 0, 0, 0); md_l(P, 0.03 * k, -L * 0.9, 0.06 * k, -0.2, 0, 0);
      P.lpx = 0.3; P.lpy = 0; P.lpz = -1; P.lock = 1; P.cy += 0.3; P.ny -= 0.25; break;
    case 'smg':
      md_r(P, 0.1 * k, -0.2 * k, L * 0.68, 0, 0, 0); P.lock = 1; P.cy += 0.15; P.ny -= 0.12; P.lg = 1; break;
    case 'long':
      md_r(P, 0.06 * k, -0.035 * k, 0.33 * k, 0, 0, 0); P.lock = 1; P.cy -= 0.35; P.ny += 0.3; P.nx += 0.12; P.nz += 0.08; P.lg = 1; break;
    case 'heavy':
      md_r(P, 0.12 * k, -0.4 * k, 0.2 * k, 0, 0, 0); P.lock = 1; P.cy -= 0.15; P.lg = 1; P.sx -= 0.05; break;
    case 'melee1h':
      md_r(P, 0.0, 0.05 * k, 0.3 * k, -1.1, 0.2, 0.25); md_l(P, -0.06 * k, -0.26 * k, 0.3 * k, -1.4, 0, 0); P.cy -= 0.2; break;
    case 'melee2h':
      md_r(P, 0.15 * k, -0.24 * k, 0.32 * k, -1.3, 0.25, 0); P.lg = 1; P.cy -= 0.25; break;
    default:   // fists / unarmed: boxing guard
      md_r(P, 0.12 * k, -0.06 * k, 0.26 * k, -1.45, 0, 0); md_l(P, -0.1 * k, -0.02 * k, 0.33 * k, -1.45, 0, 0);
      P.cy -= 0.3; P.ny += 0.25; P.hy -= 0.012 * k * (1 - g.mv) * (1 + Math.sin(t * 6)); P.sx += 0.08;
  }
}
function md_hEval(rig, st, P) {
  const D = rig.D, k = D.k, t = rig.t, br = Math.sin(t * 1.7 + rig.seed);
  for (const key of MD_HK) P[key] = 0;
  if (st === 'dead') {
    P.hy = 0.12 * k * D.thr; P.hx = -1.52; P.hr = 0.25; P.sz = 0.05; P.cx = -0.05; P.nx = -0.15; P.ny = 0.7;
    P.tLx = -0.08; P.tLz = 0.22; P.kL = 0.1; P.tRx = -0.55; P.tRz = -0.12; P.kR = 0.95; P.fL = 0.4; P.fR = 0.2;
    md_r(P, -0.42 * k, 0.12 * k, -0.08 * k, 0.4, 0, 0.6); md_l(P, 0.3 * k, -0.32 * k, -0.1 * k, 0.3, 0, -0.3);
    P.rpx = 0; P.rpy = 0; P.rpz = -1; P.lpx = 0; P.lpy = 0; P.lpz = -1;
    return P;
  }
  if (st === 'sit') {   // cross-legged on the ground, hands on the knees
    P.hy = D.hOff + 0.1 * k * D.thr; P.sx = 0.18 + D.hunch * 0.3; P.cx = 0.06 + 0.012 * br; P.nx = -0.12 - D.hunch * 0.5;
    P.tLy = -0.85; P.tLz = 1.42; P.kL = -2.5; P.fL = 0.3; P.tRy = 0.85; P.tRz = -1.42; P.kR = -2.5; P.fR = 0.3;
    md_r(P, 0.04 * k, -0.42 * k, 0.24 * k + 0.004 * br, -0.6, 0, 0.3); md_l(P, -0.04 * k, -0.42 * k, 0.24 * k + 0.004 * br, -0.6, 0, -0.3);
    P.rpx = -1; P.rpy = 0; P.rpz = -0.3; P.lpx = 1; P.lpy = 0; P.lpz = -0.3;
    if (rig.wc === 'long' || rig.wc === 'heavy' || rig.wc === 'melee2h') { md_r(P, 0.1 * k, -0.42 * k, 0.28 * k, 0.3, 1.2, 0); }
    return P;
  }
  const g = md_hLegs(rig, P, rig.v, st === 'combat' ? 1 : 0);
  md_hSwing(rig, P, g);
  if (st === 'combat') md_hCombat(rig, P, g); else md_hCarry(rig, P, g);
  P.cx += 0.018 * br * (1 - g.mv); P.rty += 0.006 * k * br; P.lty += 0.006 * k * br;
  P.ny += 0.12 * Math.sin(t * 0.37 + rig.seed) * (1 - g.mv) * (st === 'idle' ? 1 : 0.2);
  return P;
}
const MD_HDUR = { attack: 0.55, shoot: 0.24, cast: 1.0, hit: 0.35, special: 0.9, emote: 1.9, jump: 0.8 };
function md_hDur(rig, a) {
  if ((a === 'attack' || a === 'shoot') && rig.gun) return rig.wc === 'heavy' ? 0.36 : rig.wc === 'long' ? 0.3 : 0.22;
  if (a === 'attack' || a === 'shoot') return rig.wc === 'melee2h' ? 0.8 : rig.wc === 'melee1h' ? 0.55 : 0.62;
  return MD_HDUR[a] || 0.5;
}
// One-shot overlays: keyframes that leave from and return to the live pose.
function md_hAct(rig, P, a, t) {
  const D = rig.D, k = D.k, L = D.L, wc = rig.wc;
  let T = [0, 1];
  const K = (key, ...m) => { const v = P[key]; m.unshift(v); m.push(v); for (let i = 0; i < m.length; i++) if (m[i] == null) m[i] = v; P[key] = md_kf(t, T, m); };
  if ((a === 'attack' || a === 'shoot') && rig.gun) {
    const d = rig.actDur, hv = wc === 'heavy' ? 0.5 : 1;
    T = [0, 0.04, d];
    K('rtz', P.rtz - 0.06 * k * hv); K('rty', P.rty + 0.03 * k * hv); K('rqx', P.rqx - 0.32 * hv); K('sx', P.sx - 0.04); K('cx', P.cx - 0.03);
    return;
  }
  if (a === 'attack' || a === 'shoot') {
    if (wc === 'melee1h') {
      T = [0, 0.2, 0.34, 0.55];
      K('rtx', -0.14 * k, 0.32 * k); K('rty', 0.28 * k, -0.24 * k); K('rtz', 0.0, 0.42 * k); K('rqx', -2.5, -0.3); K('rqy', 0, 1.1); K('rqz', 0.4, 0);
      K('cy', -0.55, 0.5); K('sx', -0.05, 0.14); K('lock', 0, 0);
    } else if (wc === 'melee2h') {
      T = [0, 0.32, 0.48, 0.8];
      K('rtx', 0.12 * k, 0.2 * k); K('rty', 0.36 * k, -0.36 * k); K('rtz', 0.02 * k, 0.42 * k); K('rqx', -3.0, -0.1); K('rqy', 0, 0); K('rqz', 0, 0);
      K('sx', -0.12, 0.35); K('cx', -0.1, 0.15); K('lg', 1, 1); K('cy', -0.1, 0.05);
    } else {   // two-punch combo
      T = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.62];
      K('rtx', 0.17 * k, 0.17 * k, null, null, null); K('rty', 0.03 * k, 0.03 * k, null, null, null); K('rtz', L * 0.97, L * 0.97, null, null, null);
      K('rqx', -1.5, -1.5, null, null, null); K('ltx', null, null, null, -0.17 * k, -0.17 * k); K('lty', null, null, null, 0.03 * k, 0.03 * k);
      K('ltz', null, null, null, L * 0.97, L * 0.97); K('lqx', null, null, null, -1.5, -1.5); K('cy', 0.4, 0.4, 0, -0.4, -0.4);
    }
    return;
  }
  if (a === 'cast') {
    T = [0, 0.2, 0.8, 1.0];
    K('rtx', 0.13 * k, 0.13 * k); K('rty', -0.1 * k, -0.08 * k); K('rtz', L * 0.78, L * 0.8); K('rqx', -1.3, -1.3); K('rqy', 0, 0); K('rqz', 0.5, 0.5);
    K('ltx', -0.13 * k, -0.13 * k); K('lty', -0.1 * k, -0.08 * k); K('ltz', L * 0.78, L * 0.8); K('lqx', -1.3, -1.3); K('lqy', 0, 0); K('lqz', -0.5, -0.5);
    K('rpx', -0.7, -0.7); K('rpy', -1, -1); K('lpx', 0.7, 0.7); K('lpy', -1, -1);
    K('lg', 0, 0); K('lock', 0, 0); K('cy', 0, 0); K('nx', 0.1, 0.12); K('ny', 0, 0); K('sx', -0.04, -0.06);
    T = [0, 0.15, 0.8, 0.92]; K('cast', 1, 1);
    return;
  }
  if (a === 'hit') {
    T = [0, 0.07, 0.35];
    K('sx', P.sx - 0.2); K('cx', P.cx - 0.12); K('nx', P.nx - 0.3); K('rty', P.rty + 0.05 * k); K('lty', P.lty + 0.05 * k); K('hz_', -0.05 * k); K('nz', 0.15);
    return;
  }
  if (a === 'special') {
    if (rig.gun) {
      T = [0, 0.04, 0.14, 0.19, 0.29, 0.34, 0.5];
      const z = P.rtz - 0.06 * k, q = P.rqx - 0.3;
      K('rtz', z, null, z, null, z); K('rqx', q, null, q, null, q); K('sx', P.sx - 0.06, null, P.sx - 0.06, null, P.sx - 0.06);
    } else if (wc === 'melee1h' || wc === 'melee2h') {   // spinning slash
      const v = P.hr;
      P.hr = md_kf(t, [0, 0.15, 0.65, 0.9], [v, v - 0.5, v + TAU, v + TAU]);
      T = [0, 0.15, 0.65, 0.9];
      K('rtx', -0.35 * k, -0.35 * k); K('rty', -0.02 * k, -0.02 * k); K('rtz', 0.3 * k, 0.3 * k); K('rqx', -0.2, -0.2); K('rqy', -1.3, -1.3); K('rqz', 0, 0);
      K('lock', 0, 0); K('lg', wc === 'melee2h' ? 1 : 0, wc === 'melee2h' ? 1 : 0); K('sx', 0.15, 0.15);
    } else {   // rising uppercut
      T = [0, 0.25, 0.45, 0.9];
      K('rtx', 0.1 * k, 0.12 * k); K('rty', -0.32 * k, 0.32 * k); K('rtz', 0.22 * k, 0.32 * k); K('rqx', -1.4, -2.9);
      K('sx', 0.3, -0.18); K('cy', 0.3, -0.2); K('kL', P.kL + 0.6, P.kL); K('kR', P.kR + 0.6, P.kR); K('tLx', P.tLx - 0.4, P.tLx); K('tRx', P.tRx - 0.4, P.tRx);
      P.hy = Math.max(md_legDrop(D, P.tLx, P.kL, P.tLz), md_legDrop(D, P.tRx, P.kR, P.tRz)) + D.hOff + md_kf(t, T, [0, 0, rig.jumpLift ? 0.18 * k : 0, 0]);
    }
    return;
  }
  if (a === 'emote') {   // wave with whichever hand is free
    T = [0, 0.3, 1.6, 1.9];
    const w = Math.sin(t * 13) * 0.07 * k * smooth(0.25, 0.4, t) * (1 - smooth(1.5, 1.65, t));
    if (wc === 'none' || wc === 'fists') {
      K('rtx', -0.16 * k, -0.16 * k); K('rty', 0.36 * k, 0.36 * k); K('rtz', 0.12 * k, 0.12 * k); K('rqx', Math.PI - 0.2, Math.PI - 0.2); K('rqy', 0, 0); K('rqz', 0, 0);
      K('rpx', -1, -1); K('rpy', -0.4, -0.4); K('rpz', 0, 0); K('lock', 0, 0); P.rtx += w; P.rqz += w * 6;
    } else {
      K('ltx', 0.16 * k, 0.16 * k); K('lty', 0.36 * k, 0.36 * k); K('ltz', 0.12 * k, 0.12 * k); K('lqx', Math.PI - 0.2, Math.PI - 0.2); K('lqy', 0, 0); K('lqz', 0, 0);
      K('lpx', 1, 1); K('lpy', -0.4, -0.4); K('lpz', 0, 0); K('lg', 0, 0); P.ltx += w; P.lqz += w * 6;
    }
    K('nz', 0.12, 0.12); K('cy', 0, 0);
    return;
  }
  if (a === 'jump') {
    T = [0, 0.12, 0.3, 0.55, 0.7, 0.8];
    K('kL', 0.9, 0.15, 1.1, 0.7); K('kR', 0.9, 0.25, 0.8, 0.7); K('tLx', -0.45, 0.05, -0.85, -0.35); K('tRx', -0.45, 0.25, -0.45, -0.35);
    K('fL', 0.4, 0.6, -0.1, 0.3); K('fR', 0.4, 0.6, 0.1, 0.3); K('sx', 0.25, -0.05, 0.1, 0.2);
    K('rty', P.rty - 0.05 * k, P.rty + 0.15 * k, P.rty + 0.1 * k, P.rty); K('lty', P.lty - 0.05 * k, P.lty + 0.15 * k, P.lty + 0.1 * k, P.lty);
    const lift = rig.jumpLift ? 0.42 * k : 0;
    P.hy = Math.max(md_legDrop(D, P.tLx, P.kL, P.tLz), md_legDrop(D, P.tRx, P.kR, P.tRz)) + D.hOff + md_kf(t, T, [0, 0, lift * 0.5, lift, 0, 0]);
  }
}
const _hT = new V3(), _hT2 = new V3(), _hG = new V3(), _hPole = new V3(), _hQ = new THREE.Quaternion(), _hQr = new THREE.Quaternion(), _hQl = new THREE.Quaternion(), _hE = new THREE.Euler();
function md_hApply(rig, P) {
  const B = rig.B, D = rig.D;
  B.hips.position.set(0, P.hy, P.hz_); B.hips.rotation.set(P.hx, P.hr, P.hz);
  B.spine.rotation.set(P.sx, P.sy, P.sz); B.chest.rotation.set(P.cx, P.cy, P.cz); B.head.rotation.set(P.nx, P.ny, P.nz);
  B.thL.rotation.set(P.tLx, P.tLy, P.tLz); B.shL.rotation.x = P.kL; B.ftL.rotation.x = P.fL;
  B.thR.rotation.set(P.tRx, P.tRy, P.tRz); B.shR.rotation.x = P.kR; B.ftR.rotation.x = P.fR;
  _hQ.setFromAxisAngle(UP, -P.lock * (P.sy + P.cy + P.hr));
  _hT.set(P.rtx, P.rty, P.rtz).applyQuaternion(_hQ).add(rig.SR);
  _hQr.setFromEuler(_hE.set(P.rqx, P.rqy, P.rqz)).premultiply(_hQ);
  md_ik(B.uaR, B.faR, B.hdR, rig.SR, _hT, _hPole.set(P.rpx, P.rpy, P.rpz), _hQr, D.ua, D.fa);
  _hT2.set(P.ltx, P.lty, P.ltz).applyQuaternion(_hQ).add(rig.SL);
  _hQl.setFromEuler(_hE.set(P.lqx, P.lqy, P.lqz)).premultiply(_hQ);
  if (P.lg > 0.001 && rig.wgrip) {
    _hG.copy(rig.wgrip).applyQuaternion(_hQr).add(_hT);
    _hG.y += 0.045 * D.k; _hG.z -= 0.015 * D.k;
    _hT2.lerp(_hG, P.lg);
    _hE.set(-1.3, 0, -0.9); _hQ.setFromEuler(_hE); _hQ.premultiply(_hQr); _hQl.slerp(_hQ, P.lg);
  }
  md_ik(B.uaL, B.faL, B.hdL, rig.SL, _hT2, _hPole.set(P.lpx, P.lpy, P.lpz), _hQl, D.ua, D.fa);
  if (rig.glowM) {
    const c = P.cast;
    rig.glowM.visible = c > 0.02;
    if (c > 0.02) rig.glowM.scale.setScalar(D.k * c * (1 + 0.18 * Math.sin(rig.t * 31)) * (0.9 + 0.3 * smooth(0.3, 0.9, c)));
  }
}

// Shared state-machine driver for humanoids and creatures: cross-fades states, runs one-shots, applies.
function md_drive(rig, dt, state, speed) {
  dt = Math.min(dt || 0, 0.1);
  let st = state || 'idle';
  if (!rig.states.includes(st)) st = 'idle';
  if (speed == null) speed = st === 'walk' ? 1.8 : st === 'run' ? 6 : 0;
  if (st === 'sit' || st === 'dead') speed = 0;
  rig.t += dt;
  rig.v += (speed - rig.v) * Math.min(1, dt * 8);
  const a = Math.abs(rig.v);
  if (a > 0.02) rig.ph = (rig.ph + TAU * rig.v / rig.cyc(a) * dt) % (TAU * 64);
  if (st !== rig.st) {
    if (rig.fade < 1) { md_copy(rig.Pf, rig.P, rig.keys); rig.frozen = true; } else rig.frozen = false;
    rig.fst = rig.st; rig.st = st; rig.fade = 0;
    rig.fdur = st === 'dead' ? 0.55 : rig.fst === 'dead' ? 0.5 : st === 'sit' || rig.fst === 'sit' ? 0.45 : 0.22;
    if (st === 'dead') rig.act = null;
  }
  rig.eval(rig, st, rig.Pa);
  if (rig.fade < 1) {
    rig.fade = Math.min(1, rig.fade + dt / rig.fdur);
    if (!rig.frozen) rig.eval(rig, rig.fst, rig.Pf);
    md_mix(rig.P, rig.Pf, rig.Pa, ease(rig.fade), rig.keys);
  } else md_copy(rig.P, rig.Pa, rig.keys);
  if (rig.act) {
    rig.actT += dt;
    if (rig.actT >= rig.actDur) rig.act = null;
    else rig.actFn(rig, rig.P, rig.act, rig.actT);
  }
  if (rig.flashT > 0) rig.flashT -= dt;
  if (rig.burst && rig.act) for (const bt of rig.burst) if (rig.actT - dt < bt && rig.actT >= bt) rig.flashT = 0.06;
  if (rig.flash) rig.flash.visible = rig.flashT > 0;
  rig.apply(rig, rig.P);
}

// look: { breed, sex, skin, hair, hairStyle, height, primary, secondary, accent, armorTier, helmet }
function makeHumanoid(look) {
  look = Object.assign({}, look || {});
  const root = new THREE.Group();
  root.name = 'humanoid';
  const rig = {
    root, kind: 'humanoid', look, height: 1.8, radius: 0.35, keys: MD_HK, states: ['idle', 'walk', 'run', 'combat', 'sit', 'dead'],
    P: md_hpose(), Pa: md_hpose(), Pf: md_hpose(), t: 0, v: 0, ph: 0, st: 'idle', fst: 'idle', fade: 1, fdur: 0.2, frozen: false,
    act: null, actT: 0, actDur: 0, flashT: 0, seed: Math.random() * 10, jumpLift: true, wkind: 'none', wc: 'none', gun: false,
    weapons: [], glowCol: null, castCol: 0x7fe6ff, eval: md_hEval, apply: md_hApply, actFn: md_hAct, SR: new V3(), SL: new V3(),
  };
  let tpl = null, body = null;
  const build = () => {
    const [breed, sex, tier, hair, helm] = md_humanKey(look);
    const nt = md_humanTpl(breed, sex, tier, hair, helm);
    const pal = md_humanPal(look);
    if (nt === tpl && body) { md_paint(body.mesh.geometry, tpl, pal); return; }
    if (body) { root.remove(body.mesh); md_freeBody(body, tpl); }
    tpl = nt; body = md_body(tpl, pal);
    rig.D = tpl.D; rig.B = body.B; rig.body = body.mesh;
    rig.SR.set(-tpl.D.sw, tpl.D.shY, 0); rig.SL.set(tpl.D.sw, tpl.D.shY, 0);
    rig.cyc = (sp) => md_cycle(sp, tpl.D.leg);
    let hm = +look.height || 1;
    if (hm > 1.3 && hm < 2.6) hm /= tpl.D.H;   // given in metres
    hm = clamp(hm, 0.8, 1.25);
    body.mesh.scale.setScalar(hm);
    rig.height = tpl.h * hm; rig.radius = tpl.r * hm; rig.scale = hm;
    root.add(body.mesh);
    // cast glow between the hands
    rig.glowM = new THREE.Mesh(md_glowGeo, md_addMat(rig.castCol, 0.9));
    rig.glowM.position.set(0, tpl.D.shY - 0.1 * tpl.D.k, tpl.D.L * 0.8 + 0.07 * tpl.D.k); rig.glowM.visible = false;
    body.B.chest.add(rig.glowM);
    rig.setWeapon(rig.wkind, rig.wvar);
    rig.setGlow(rig.glowCol);
  };
  rig.setWeapon = (kind, variant) => {
    kind = MD_WPN[kind] ? kind : 'none';
    for (const m of rig.weapons) m.parent && m.parent.remove(m);
    rig.weapons = []; rig.flash = null;
    const W = MD_WPN[kind], k = rig.D.k;
    rig.wkind = kind; rig.wvar = variant; rig.wc = W.cls; rig.gun = !!W.gun;
    rig.wgrip = W.grip ? new V3(W.grip[0], W.grip[1] - 0.05 * k, W.grip[2] + 0.005 * k) : null;
    rig.burst = W.gun ? [0.0, 0.15, 0.3] : null;
    const gk = kind === 'melee1h' && variant === 'baton' ? 'baton' : kind === 'melee2h' && variant === 'hammer' ? 'hammer' : kind;
    const geo = md_weaponGeo(gk);
    if (!geo) return;
    const hands = kind === 'fists' ? ['hdR', 'hdL'] : ['hdR'];
    for (const h of hands) {
      const m = new THREE.Mesh(geo, rig.glowCol != null ? md_tintMat(false, rig.glowCol) : md_statMat);
      m.position.set(0, -0.05 * k, 0.005 * k); m.castShadow = true;
      if (kind === 'fists') m.scale.setScalar(k * Math.sqrt(rig.D.thr));
      rig.B[h].add(m); rig.weapons.push(m);
    }
    if (W.muzzle) {
      const f = new THREE.Mesh(md_flashGeo, md_addMat(0xffc860, 0.95));
      f.position.set(...W.muzzle); f.visible = false; f.scale.setScalar(kind === 'heavy' ? 1.8 : kind === 'pistol' ? 0.8 : 1.2);
      rig.weapons[0].add(f); rig.flash = f;
    }
  };
  rig.setLook = (l) => { Object.assign(look, l || {}); build(); };
  rig.setGlow = (col) => {
    rig.glowCol = col == null ? null : col;
    body.mesh.material = col == null ? md_skinMat : md_tintMat(true, col);
    for (const m of rig.weapons) m.material = col == null ? md_statMat : md_tintMat(false, col);
  };
  rig.setCastColor = (col) => { rig.castCol = col; if (rig.glowM) rig.glowM.material = md_addMat(col, 0.9); };
  rig.play = (a) => {
    if (rig.st === 'dead' || !MD_HDUR[a]) return;
    rig.act = a; rig.actT = 0; rig.actDur = md_hDur(rig, a);
    if (rig.gun && (a === 'shoot' || a === 'attack')) rig.flashT = 0.06;
  };
  rig.anim = (dt, state, speed) => md_drive(rig, dt, state, speed);
  rig.dispose = () => {
    root.parent && root.parent.remove(root);
    if (body) md_freeBody(body, tpl);
    body = null;
  };
  rig.stats = () => ({ tris: tpl.tris + rig.weapons.reduce((s, m) => s + m.geometry.attributes.position.count / 3, 0), calls: 1 + rig.weapons.length, bones: tpl.bones.length });
  build();
  rig.anim(0, 'idle', 0);
  return rig;
}

// ======================================================================================
// Creatures
// ======================================================================================
// Creature poses are Float32Arrays: Euler (x,y,z) per bone, then a position offset for the kind's mover
// bone, then one effect channel (pulse/glow).
const md_e = (P, i, x, y, z) => { i *= 3; P[i] = x; P[i + 1] = y; P[i + 2] = z; };
const md_ea = (P, i, x, y, z) => { i *= 3; P[i] += x; P[i + 1] += y; P[i + 2] += z; };
const cbx = (w, h, d, b) => chamferBox(w, h, d, b);
const MD_KINDS = {};

// ----- critter: the chitterling, a round chirpy biped with huge ears -----
MD_KINDS.critter = {
  h: 0.82, r: 0.3, cols: [0xc08a52, 0xf0dcb0, 0x5ec8e8], L: 0.2,
  cyc: (a) => 0.42 + 0.12 * a,
  build(T) {
    const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d), tb = taperBox;
    T.bone('base', null, 0, 0, 0); T.bone('body', 'base', 0, 0.34, 0); T.bone('head', 'body', 0, 0.15, 0.02);
    T.bone('earL', 'head', 0.09, 0.16, -0.03); T.bone('earR', 'head', -0.09, 0.16, -0.03);
    T.bone('armL', 'body', 0.16, 0.02, 0.05); T.bone('armR', 'body', -0.16, 0.02, 0.05);
    T.bone('legL', 'body', 0.09, -0.14, 0); T.bone('legR', 'body', -0.09, -0.14, 0); T.bone('tail', 'body', 0, -0.06, -0.17);
    T.part('body', ico(0.2), [0, 0, 0], MD_P, 0, [1, 1, 0.95]);
    T.part('body', ico(0.15), [0, -0.03, 0.08], MD_S, 0, [1, 1.05, 0.6]);
    T.part('head', ico(0.19), [0, 0.1, 0.02], MD_P, 0, [1.18, 0.95, 1]);
    T.part('head', ico(0.085), [0, 0.04, 0.15], MD_S, 0, [1.25, 0.8, 0.9]);
    T.part('head', ico(0.026, 0), [0, 0.075, 0.23], MD_LP);
    for (const s of [-1, 1]) {
      T.part('head', ico(0.068), [s * 0.085, 0.14, 0.135], MD_EY);
      T.part('head', ico(0.042, 0), [s * 0.09, 0.14, 0.182], MD_PU);
      T.part('head', ico(0.013, 0), [s * 0.075, 0.16, 0.218], MD_EY, 0, 0, 0.6);
      const e = s > 0 ? 'earL' : 'earR';
      T.part(e, tb(0.15, 0.035, 0.03, 0.015, 0.36), [s * 0.05, 0.16, 0], MD_P, [0, 0, -s * 0.4]);
      T.part(e, tb(0.1, 0.02, 0.02, 0.01, 0.28), [s * 0.045, 0.15, 0.014], MD_S, [0, 0, -s * 0.4]);
      T.part(e, ico(0.022, 0), [s * 0.17, 0.33, 0.0], MD_A, 0, 0, 0.6);
      const a = s > 0 ? 'armL' : 'armR', l = s > 0 ? 'legL' : 'legR';
      T.part(a, tb(0.045, 0.045, 0.06, 0.06, 0.12), [0, -0.05, 0], MD_P, [0, 0, s * 0.3]);
      T.part(a, ico(0.035, 0), [s * 0.02, -0.11, 0.01], MD_S);
      T.part(l, tb(0.07, 0.07, 0.085, 0.085, 0.12), [0, -0.05, 0], MD_P);
      T.part(l, cbx(0.09, 0.06, 0.15, 0.025), [0, -0.17, 0.035], MD_PD);
    }
    T.part('head', tb(0.03, 0.03, 0.005, 0.005, 0.1), [0, 0.3, 0.0], MD_A, [-0.4, 0, 0]);
    T.part('tail', tb(0.06, 0.05, 0.02, 0.02, 0.2), [0, 0.07, -0.06], MD_P, [-0.8, 0, 0]);
    T.part('tail', ico(0.055, 0), [0, 0.15, -0.13], MD_A);
    return { h: 0.82 };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, ph = rig.ph, s = rig.seed, n = rig.nb * 3;
    const tw = Math.pow(Math.max(0, Math.sin(t * 1.3 + s)), 12);
    md_e(P, I.head, 0.05 * Math.sin(t * 2.1), 0.25 * Math.sin(t * 0.7 + s), 0.15 * Math.sin(t * 0.9 + s));
    md_e(P, I.earL, 0.15 * Math.sin(t * 2.3) - 0.3 * tw, 0, -0.1 * tw); md_e(P, I.earR, 0.15 * Math.sin(t * 2.3 + 1), 0, 0.1 * tw);
    md_e(P, I.armL, -0.2, 0, 0.2); md_e(P, I.armR, -0.2, 0, -0.2); md_e(P, I.tail, 0.1 * Math.sin(t * 3), 0.3 * Math.sin(t * 4.5), 0);
    P[n + 1] = 0.008 * Math.sin(t * 3.4);
    if (st === 'dead') {
      md_e(P, 0, 0, 0, Math.PI / 2); P[n] = 0.12; P[n + 1] = 0.19;
      md_e(P, I.head, 0.2, 0, 0.3); md_e(P, I.earL, 0.6, 0, 0.6); md_e(P, I.earR, 0.6, 0, -0.3); md_e(P, I.legL, -0.4, 0, 0); md_e(P, I.legR, 0.3, 0, 0);
      md_e(P, I.armL, -0.8, 0, 0.6); md_e(P, I.armR, -0.8, 0, -0.6); return;
    }
    if (st === 'sit') {
      P[n + 1] = -0.11; md_e(P, I.legL, -1.3, 0, 0.3); md_e(P, I.legR, -1.3, 0, -0.3); md_e(P, I.body, -0.15, 0, 0);
      md_e(P, I.armL, -0.6, 0, 0.1); md_e(P, I.armR, -0.6, 0, -0.1); return;
    }
    const A = 0.7 * g.mv;
    md_e(P, I.legL, -A * Math.sin(ph), 0, 0); md_e(P, I.legR, A * Math.sin(ph), 0, 0);
    md_e(P, I.body, 0.15 * g.mv + 0.08 * g.run, 0, 0.12 * g.mv * Math.sin(ph));
    P[n + 1] += 0.05 * g.mv * Math.abs(Math.sin(ph)) - 0.02 * g.mv;
    P[I.earL * 3] += -0.5 * g.mv * Math.abs(Math.cos(ph)) - 0.3 * g.run; P[I.earR * 3] += -0.5 * g.mv * Math.abs(Math.cos(ph)) - 0.3 * g.run;
    md_ea(P, I.armL, -0.5 * g.mv * Math.sin(ph), 0, 0); md_ea(P, I.armR, 0.5 * g.mv * Math.sin(ph), 0, 0);
    if (st === 'combat') {
      P[n + 1] -= 0.04; md_ea(P, I.body, 0.25, 0, 0); md_ea(P, I.head, -0.2, 0, 0); md_ea(P, I.earL, 0.7, 0, 0.3); md_ea(P, I.earR, 0.7, 0, -0.3);
      md_ea(P, I.armL, -0.9, 0, 0); md_ea(P, I.armR, -0.9, 0, 0); P[n + 1] += 0.02 * Math.abs(Math.sin(t * 7));
    }
  },
  dur: { attack: 0.5, hit: 0.3, special: 0.8, emote: 1.2, jump: 0.6, cast: 0.9, shoot: 0.5 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'attack' || a === 'shoot' || a === 'special') {
      K([0, 0.18, 0.3, 0.5], n + 2, -0.08, 0.22); K([0, 0.18, 0.3, 0.5], I.body * 3, -0.35, 0.7); K([0, 0.18, 0.3, 0.5], I.head * 3, -0.2, 0.3);
      K([0, 0.18, 0.3, 0.5], n + 1, 0.0, 0.08);
      if (a === 'special') K([0, 0.3, 0.8], I.body * 3 + 1, TAU * 0.5);
    } else if (a === 'hit') { K([0, 0.06, 0.3], I.body * 3, -0.4); K([0, 0.06, 0.3], I.earL * 3, -0.8); K([0, 0.06, 0.3], I.earR * 3, -0.8); }
    else if (a === 'emote' || a === 'jump' || a === 'cast') {
      const T = [0, 0.15, 0.3, 0.45, 0.6];
      K(T, n + 1, 0.0, 0.25, 0.25, 0.0); K(T, I.armL * 3, -2.4, -2.6, -2.4, -0.5); K(T, I.armR * 3, -2.4, -2.6, -2.4, -0.5);
      K(T, I.earL * 3 + 2, 0.4, -0.4, 0.4, 0); K(T, I.earR * 3 + 2, -0.4, 0.4, -0.4, 0);
    }
  },
};

// ----- beast: hyena-like quadruped with a sloped back and a bristling mane -----
MD_KINDS.beast = {
  h: 1.25, r: 0.55, cols: [0x9a6038, 0x3c2a1e, 0xffc040], L: 0.82,
  build(T) {
    const tb = taperBox, X = Math.PI / 2;
    T.bone('base', null, 0, 0, 0); T.bone('pelvis', 'base', 0, 0.84, -0.42); T.bone('chest', 'pelvis', 0, 0.12, 0.8);
    T.bone('neck', 'chest', 0, 0.1, 0.28); T.bone('head', 'neck', 0, 0.2, 0.14); T.bone('jaw', 'head', 0, -0.05, 0.08);
    T.bone('tail1', 'pelvis', 0, 0.06, -0.2); T.bone('tail2', 'tail1', 0, 0, -0.24);
    for (const [sd, s] of [['L', 1], ['R', -1]]) {
      T.bone('fu' + sd, 'chest', s * 0.16, -0.12, 0.08); T.bone('fl' + sd, 'fu' + sd, 0, -0.42, 0);
      T.bone('ru' + sd, 'pelvis', s * 0.15, -0.04, 0); T.bone('rl' + sd, 'ru' + sd, 0, -0.4, 0);
    }
    T.part('pelvis', cbx(0.34, 0.36, 0.42, 0.08), [0, 0, -0.02], MD_P);
    T.part('pelvis', tb(0.32, 0.34, 0.4, 0.44, 0.48), [0, 0.04, 0.38], MD_P, [X, 0, 0]);
    T.part('pelvis', cbx(0.22, 0.12, 0.4, 0.04), [0, -0.17, 0.35], MD_SK);
    T.part('chest', cbx(0.44, 0.54, 0.56, 0.1), [0, -0.02, 0.0], MD_P);
    T.part('chest', cbx(0.3, 0.16, 0.42, 0.05), [0, -0.25, 0.02], MD_SK);
    for (let i = 0; i < 6; i++) T.part('chest', tb(0.07, 0.12, 0.01, 0.02, 0.16 - i * 0.012), [0, 0.3 - i * 0.015, 0.2 - i * 0.13], MD_S, [-0.6, 0, 0]);
    for (let i = 0; i < 3; i++) T.part('pelvis', tb(0.06, 0.1, 0.01, 0.02, 0.09), [0, 0.24 - i * 0.01, 0.5 - i * 0.14], MD_S, [-0.7, 0, 0]);
    T.part('neck', tb(0.22, 0.26, 0.17, 0.2, 0.34), [0, 0.06, 0.04], MD_P, [0.7, 0, 0]);
    for (let i = 0; i < 3; i++) T.part('neck', tb(0.06, 0.1, 0.01, 0.02, 0.15), [0, 0.18 - i * 0.07, -0.06 - i * 0.04], MD_S, [-0.5, 0, 0]);
    T.part('head', cbx(0.25, 0.21, 0.24, 0.06), [0, 0.02, 0.03], MD_P);
    T.part('head', tb(0.17, 0.12, 0.13, 0.1, 0.22), [0, -0.0, 0.22], MD_P, [X, 0, 0]);
    T.part('head', cbx(0.08, 0.055, 0.05, 0.015), [0, 0.03, 0.335], MD_DK);
    for (const s of [-1, 1]) {
      T.part('head', tb(0.09, 0.05, 0.012, 0.012, 0.17), [s * 0.08, 0.17, -0.02], MD_PD, [-0.2, 0, -s * 0.25]);
      T.part('head', cbx(0.045, 0.025, 0.02, 0.006), [s * 0.075, 0.07, 0.145], MD_A, [0, -s * 0.3, s * 0.2], 0, 0.9);
    }
    T.part('jaw', cbx(0.12, 0.05, 0.22, 0.02), [0, -0.025, 0.12], MD_PD);
    for (const s of [-1, 1]) T.part('jaw', tb(0.02, 0.02, 0.004, 0.004, 0.04), [s * 0.045, 0.02, 0.21], MD_EY);
    for (const sd of ['L', 'R']) {
      T.part('fu' + sd, tb(0.09, 0.11, 0.13, 0.15, 0.44), [0, -0.2, 0], MD_P);
      T.part('fl' + sd, tb(0.065, 0.075, 0.08, 0.09, 0.4), [0, -0.2, 0], MD_PD);
      T.part('fl' + sd, cbx(0.1, 0.06, 0.15, 0.02), [0, -0.4, 0.03], MD_DK);
      T.part('ru' + sd, tb(0.1, 0.12, 0.17, 0.24, 0.42), [0, -0.19, 0.02], MD_P);
      T.part('rl' + sd, tb(0.06, 0.07, 0.08, 0.1, 0.46), [0, -0.22, 0], MD_PD);
      T.part('rl' + sd, cbx(0.1, 0.06, 0.15, 0.02), [0, -0.46, 0.04], MD_DK);
    }
    T.part('tail1', tb(0.08, 0.08, 0.05, 0.05, 0.26), [0, 0, -0.12], MD_P, [-X, 0, 0]);
    T.part('tail2', tb(0.07, 0.07, 0.02, 0.02, 0.26), [0, 0, -0.12], MD_S, [-X, 0, 0]);
    return { h: 1.3 };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, ph = rig.ph, n = rig.nb * 3, mv = g.mv, run = g.run;
    const br = Math.sin(t * 2 + rig.seed);
    md_e(P, I.neck, -0.1 + 0.03 * br, 0.15 * Math.sin(t * 0.5 + rig.seed) * (1 - mv), 0); md_e(P, I.head, 0.25, 0, 0); md_e(P, I.jaw, 0.06, 0, 0);
    md_e(P, I.tail1, -0.5 + 0.1 * br, 0.35 * Math.sin(t * 3 + rig.seed) * (1 - mv), 0); md_e(P, I.tail2, -0.3, 0.2 * Math.sin(t * 3 - 1), 0);
    if (st === 'dead') {
      md_e(P, 0, 0, 0, Math.PI / 2); P[n] = 0.22; P[n + 1] = -0.62;
      for (const sd of ['L', 'R']) { md_e(P, I['fu' + sd], -0.4, 0, 0); md_e(P, I['fl' + sd], 0.3, 0, 0); md_e(P, I['ru' + sd], 0.4, 0, 0); md_e(P, I['rl' + sd], 0.2, 0, 0); }
      md_e(P, I.neck, 0.6, 0, 0); md_e(P, I.head, 0.5, 0, 0); md_e(P, I.jaw, 0.35, 0, 0); md_e(P, I.tail1, 0.2, 0, 0); return;
    }
    if (st === 'sit') {
      md_e(P, I.pelvis, -0.68, 0, 0); P[n + 1] = -0.52; P[n + 2] = 0.05;
      md_e(P, I.chest, 0.05, 0, 0); md_e(P, I.neck, -0.45, 0, 0); md_e(P, I.head, 0.8, 0, 0);
      for (const sd of ['L', 'R']) { md_e(P, I['fu' + sd], 0.62, 0, 0); md_e(P, I['fl' + sd], 0.08, 0, 0); md_e(P, I['ru' + sd], -1.5, 0, 0); md_e(P, I['rl' + sd], 2.6, 0, 0); }
      md_e(P, I.tail1, 0.3, 0.3, 0); return;
    }
    const A = (0.32 + 0.05 * Math.abs(rig.v)) * mv, gal = run;
    const off = { fuL: 0, ruR: 0, fuR: Math.PI - 0.9 * gal * 0.6, ruL: Math.PI };
    off.ruR = gal * (Math.PI - 0.5); off.ruL = Math.PI + gal * 0.5 - gal * Math.PI;
    for (const sd of ['L', 'R']) {
      const ff = ph + off['fu' + sd], fr = ph + off['ru' + sd];
      md_e(P, I['fu' + sd], -A * Math.sin(ff), 0, 0);
      md_e(P, I['fl' + sd], (0.4 + 0.8 * run) * mv * Math.pow(Math.max(0, Math.cos(ff - 0.4)), 1.5), 0, 0);
      md_e(P, I['ru' + sd], -0.35 - A * Math.sin(fr), 0, 0);
      md_e(P, I['rl' + sd], 0.7 + (0.5 + 0.6 * run) * mv * Math.pow(Math.max(0, Math.cos(fr - 0.3)), 1.5), 0, 0);
    }
    md_e(P, I.pelvis, 0.06 * gal * mv * Math.sin(2 * ph), 0.05 * mv * Math.sin(ph), 0); md_e(P, I.chest, -0.08 * gal * mv * Math.sin(2 * ph + 1), 0, 0);
    P[n + 1] = 0.03 * mv * Math.cos(2 * ph) * (1 + run) - 0.02 * mv;
    P[I.neck * 3] += 0.08 * mv * Math.sin(2 * ph) + 0.15 * run;
    if (st === 'combat') {
      md_ea(P, I.neck, 0.35, 0, 0); md_ea(P, I.head, -0.25, 0, 0); md_e(P, I.jaw, 0.22 + 0.05 * Math.sin(t * 9), 0, 0); md_e(P, I.tail1, -0.9, 0, 0);
      md_ea(P, I.chest, 0.1, 0, 0); P[n + 1] -= 0.06 * (1 - mv);
      for (const sd of ['L', 'R']) { md_ea(P, I['fu' + sd], -0.15 * (1 - mv), 0, 0); md_ea(P, I['fl' + sd], 0.25 * (1 - mv), 0, 0); }
    }
  },
  dur: { attack: 0.55, hit: 0.3, special: 0.9, emote: 1.6, jump: 0.8, cast: 1.0, shoot: 0.55 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'attack' || a === 'shoot' || a === 'special' || a === 'jump') {
      const T = a === 'attack' || a === 'shoot' ? [0, 0.18, 0.3, 0.55] : [0, 0.3, 0.55, 0.9];
      const big = a === 'attack' || a === 'shoot' ? 1 : 1.6;
      K(T, n + 2, -0.08, 0.3 * big); K(T, I.neck * 3, -0.3, 0.7); K(T, I.head * 3, -0.2, -0.4); K(T, I.jaw * 3, 0.6, 0.05);
      K(T, I.chest * 3, -0.15 * big, 0.15); K(T, n + 1, 0.0, a === 'attack' || a === 'shoot' ? 0.0 : 0.35);
      for (const sd of ['L', 'R']) { K(T, I['fu' + sd] * 3, -0.2, -0.8 * big); K(T, I['fl' + sd] * 3, 0.6, 0.1); }
    } else if (a === 'hit') { K([0, 0.06, 0.3], I.neck * 3, -0.4); K([0, 0.06, 0.3], n + 2, -0.06); K([0, 0.06, 0.3], I.jaw * 3, 0.3); }
    else if (a === 'emote' || a === 'cast') {
      const T = [0, 0.3, 1.2, 1.6]; K(T, I.neck * 3, -1.1, -1.1); K(T, I.head * 3, -0.5, -0.5); K(T, I.jaw * 3, 0.55, 0.55); K(T, I.tail1 * 3, -0.9, -0.9);
    }
  },
};

// ----- insect: six-legged carapace bug with mandibles and a curled stinger -----
MD_KINDS.insect = {
  h: 0.7, r: 0.55, cols: [0x6e5a3a, 0xc8a870, 0xff6a3a], L: 0.45,
  cyc: (a) => 0.55 + 0.1 * a,
  build(T) {
    const tb = taperBox, X = Math.PI / 2;
    T.bone('base', null, 0, 0, 0); T.bone('thorax', 'base', 0, 0.3, 0); T.bone('head', 'thorax', 0, 0.02, 0.2);
    T.bone('mandL', 'head', 0.06, -0.05, 0.12); T.bone('mandR', 'head', -0.06, -0.05, 0.12);
    T.bone('ab1', 'thorax', 0, 0.03, -0.17); T.bone('ab2', 'ab1', 0, 0.0, -0.24); T.bone('sting', 'ab2', 0, 0.02, -0.2);
    for (let i = 0; i < 3; i++) for (const [sd, s] of [['L', 1], ['R', -1]]) {
      T.bone('f' + i + sd, 'thorax', s * 0.12, -0.02, 0.12 - i * 0.12, 'YZX'); T.bone('t' + i + sd, 'f' + i + sd, 0, -0.3, 0);
      T.part('f' + i + sd, tb(0.04, 0.04, 0.06, 0.06, 0.3), [0, -0.15, 0], MD_PD);
      T.part('t' + i + sd, tb(0.012, 0.012, 0.045, 0.045, 0.42), [0, -0.21, 0], MD_S);
    }
    T.part('thorax', cbx(0.28, 0.18, 0.32, 0.06), [0, 0, 0], MD_P);
    T.part('thorax', cbx(0.24, 0.06, 0.26, 0.03), [0, 0.1, 0], MD_PD);
    T.part('head', cbx(0.2, 0.14, 0.17, 0.05), [0, 0, 0.05], MD_P);
    for (const s of [-1, 1]) {
      T.part('head', new THREE.IcosahedronGeometry(0.035, 0), [s * 0.08, 0.035, 0.11], MD_A, 0, 0, 0.9);
      T.part('head', tb(0.014, 0.014, 0.006, 0.006, 0.3), [s * 0.05, 0.16, 0.18], MD_PD, [0.7, 0, -s * 0.35]);
      const m = s > 0 ? 'mandL' : 'mandR';
      T.part(m, tb(0.045, 0.03, 0.012, 0.012, 0.15), [0, 0, 0.06], MD_S, [X, -s * 0.5, 0]);
    }
    T.part('ab1', cbx(0.32, 0.22, 0.28, 0.07), [0, 0.02, -0.1], MD_P);
    T.part('ab1', cbx(0.33, 0.04, 0.12, 0.015), [0, 0.07, -0.1], MD_S);
    T.part('ab2', cbx(0.26, 0.2, 0.24, 0.06), [0, 0.03, -0.1], MD_P);
    T.part('ab2', cbx(0.27, 0.04, 0.1, 0.015), [0, 0.08, -0.1], MD_S);
    T.part('sting', tb(0.13, 0.13, 0.06, 0.06, 0.16), [0, 0, -0.06], MD_PD, [-X, 0, 0]);
    T.part('sting', tb(0.05, 0.05, 0.005, 0.005, 0.18), [0, 0.04, -0.2], MD_A, [-X - 0.6, 0, 0], 0, 0.7);
    return { h: 0.75 };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, ph = rig.ph, n = rig.nb * 3, mv = g.mv;
    md_e(P, I.ab1, 0.2 + 0.03 * Math.sin(t * 1.5), 0.05 * Math.sin(t * 0.8), 0); md_e(P, I.ab2, 0.35, 0, 0); md_e(P, I.sting, 0.9 + 0.08 * Math.sin(t * 2.2), 0, 0);
    const mw = 0.15 + 0.12 * Math.sin(t * (st === 'combat' ? 12 : 2.5));
    md_e(P, I.mandL, 0, mw, 0); md_e(P, I.mandR, 0, -mw, 0); md_e(P, I.head, 0.05 * Math.sin(t * 1.1), 0.12 * Math.sin(t * 0.6 + rig.seed), 0);
    if (st === 'dead') {   // flipped on its back, legs curled
      md_e(P, 0, 0, 0, Math.PI); P[n + 1] = 0.48;
      for (let i = 0; i < 3; i++) for (const s of [1, -1]) { const sd = s > 0 ? 'L' : 'R'; md_e(P, I['f' + i + sd], 0, (i - 1) * 0.5 * s, s * 0.9); md_e(P, I['t' + i + sd], 0, 0, s * 1.6); }
      md_e(P, I.ab1, -0.1, 0, 0); md_e(P, I.sting, 0.2, 0, 0); return;
    }
    const low = st === 'sit' ? 1 : 0;
    const A = 0.45 * mv;
    for (let i = 0; i < 3; i++) for (const s of [1, -1]) {
      const sd = s > 0 ? 'L' : 'R', grp = (i + (s > 0 ? 0 : 1)) % 2, f = ph + grp * Math.PI;
      const yaw = -s * ((1 - i) * 0.6 + A * Math.sin(f));
      const lift = s * 0.35 * mv * Math.max(0, Math.cos(f));
      md_e(P, I['f' + i + sd], 0, yaw, s * (2.0 - 0.35 * low) + lift);
      md_e(P, I['t' + i + sd], 0, 0, -s * (1.62 - 0.1 * low));
    }
    P[n + 1] = -0.1 * low + 0.012 * mv * Math.sin(2 * ph);
    md_e(P, I.thorax, 0.03 * mv * Math.sin(2 * ph), 0.05 * mv * Math.sin(ph), 0);
    if (st === 'combat') { md_e(P, I.thorax, -0.2, 0, 0); md_ea(P, I.head, 0.15, 0, 0); md_ea(P, I.ab2, 0.3, 0, 0); md_ea(P, I.sting, 0.5, 0, 0); }
  },
  dur: { attack: 0.55, hit: 0.3, special: 0.8, emote: 1.2, jump: 0.6, cast: 0.9, shoot: 0.55 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'special' || a === 'shoot' || a === 'cast') {   // stinger strike over the back
      const T = [0, 0.3, 0.45, 0.8]; K(T, I.ab1 * 3, 0.5, 0.2); K(T, I.ab2 * 3, 0.6, 0.9); K(T, I.sting * 3, 1.4, 1.8); K(T, I.thorax * 3, -0.25, 0.15);
    } else if (a === 'attack') {
      const T = [0, 0.18, 0.3, 0.55]; K(T, I.thorax * 3, -0.35, 0.2); K(T, n + 2, -0.06, 0.18); K(T, I.mandL * 3 + 1, 0.7, -0.3); K(T, I.mandR * 3 + 1, -0.7, 0.3); K(T, I.head * 3, -0.2, 0.3);
    } else if (a === 'hit') { K([0, 0.06, 0.3], I.thorax * 3, -0.3); K([0, 0.06, 0.3], n + 2, -0.05); }
    else { const T = [0, 0.2, 0.4, 0.6]; K(T, n + 1, 0.12, 0.2, 0.0); K(T, I.thorax * 3, -0.4, -0.2, 0); }
  },
};

// ----- mutant: hulking hunched biped with knuckle-dragging arms -----
MD_KINDS.mutant = {
  h: 2.05, r: 0.6, cols: [0x8a9a6a, 0x5a4a3a, 0xd8ff50], L: 0.82,
  build(T) {
    const tb = taperBox, ico = (r) => new THREE.IcosahedronGeometry(r, 0);
    T.bone('base', null, 0, 0, 0); T.bone('hips', 'base', 0, 0.86, 0); T.bone('spine', 'hips', 0, 0.14, 0); T.bone('chest', 'spine', 0, 0.24, 0);
    T.bone('head', 'chest', 0, 0.42, 0.14);
    for (const [sd, s] of [['L', 1], ['R', -1]]) {
      T.bone('ua' + sd, 'chest', s * 0.44, 0.36, 0); T.bone('fa' + sd, 'ua' + sd, 0, -0.46, 0); T.bone('hd' + sd, 'fa' + sd, 0, -0.42, 0);
      T.bone('th' + sd, 'hips', s * 0.17, -0.05, 0); T.bone('sh' + sd, 'th' + sd, 0, -0.4, 0); T.bone('ft' + sd, 'sh' + sd, 0, -0.35, 0);
    }
    T.part('hips', tb(0.44, 0.32, 0.5, 0.36, 0.24), [0, -0.02, 0], MD_S);
    T.part('spine', tb(0.48, 0.4, 0.62, 0.48, 0.28), [0, 0.12, 0.02], MD_P);
    T.part('chest', cbx(0.86, 0.55, 0.56, 0.14), [0, 0.26, 0], MD_P);
    T.part('chest', cbx(0.5, 0.42, 0.3, 0.1), [0, 0.18, 0.18], MD_SK);
    T.part('chest', cbx(0.62, 0.36, 0.4, 0.12), [0, 0.46, -0.12], MD_P);
    for (let i = 0; i < 4; i++) T.part('chest', tb(0.08, 0.08, 0.01, 0.01, 0.18), [0.06 * (i % 2 ? 1 : -1), 0.56 - i * 0.12, -0.3 + i * 0.01], MD_EY, [-0.9, 0, 0]);
    T.part('chest', ico(0.2), [0.38, 0.52, -0.02], MD_S); T.part('chest', ico(0.07), [0.4, 0.66, 0.06], MD_A, 0, 0, 0.8); T.part('chest', ico(0.05), [0.28, 0.6, 0.14], MD_A, 0, 0, 0.8);
    T.part('head', cbx(0.24, 0.24, 0.25, 0.07), [0, 0.1, 0.04], MD_P);
    T.part('head', cbx(0.22, 0.1, 0.18, 0.04), [0, 0.0, 0.1], MD_PD);
    for (const s of [-1, 1]) {
      T.part('head', cbx(0.05, 0.03, 0.02, 0.008), [s * 0.055, 0.14, 0.16], MD_A, 0, 0, 0.9);
      T.part('head', tb(0.03, 0.03, 0.006, 0.006, 0.07), [s * 0.06, 0.07, 0.19], MD_EY, [0, 0, 0]);
    }
    T.part('head', cbx(0.22, 0.04, 0.05, 0.015), [0, 0.17, 0.14], MD_PD);
    for (const sd of ['L', 'R']) {
      const s = sd === 'L' ? 1 : -1;
      T.part('ua' + sd, ico(0.2), [0, 0, 0], MD_P, 0, [1.1, 1, 1]);
      T.part('ua' + sd, tb(0.17, 0.17, 0.22, 0.22, 0.46), [0, -0.23, 0], MD_P);
      T.part('fa' + sd, tb(0.2, 0.2, 0.17, 0.17, 0.42), [0, -0.21, 0], MD_P);
      T.part('fa' + sd, cbx(0.22, 0.08, 0.22, 0.02), [0, -0.08, 0], MD_S);
      T.part('hd' + sd, cbx(0.24, 0.22, 0.26, 0.06), [0, -0.1, 0.02], MD_PD);
      for (let i = 0; i < 3; i++) T.part('hd' + sd, tb(0.03, 0.03, 0.005, 0.005, 0.09), [s * 0.0 + (i - 1) * 0.07, -0.22, 0.09], MD_EY, [0.5, 0, 0]);
      T.part('th' + sd, tb(0.17, 0.18, 0.22, 0.24, 0.42), [0, -0.2, 0], MD_P);
      T.part('th' + sd, cbx(0.24, 0.12, 0.26, 0.03), [0, -0.05, 0], MD_S);
      T.part('sh' + sd, tb(0.13, 0.14, 0.17, 0.18, 0.38), [0, -0.18, 0], MD_P);
      T.part('ft' + sd, cbx(0.2, 0.12, 0.3, 0.04), [0, -0.0, 0.06], MD_DK);
    }
    return { h: 2.05 };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, ph = rig.ph, n = rig.nb * 3, mv = g.mv, br = Math.sin(t * 1.4 + rig.seed);
    md_e(P, I.spine, 0.28, 0, 0); md_e(P, I.chest, 0.22 + 0.03 * br, 0, 0); md_e(P, I.head, -0.55, 0.2 * Math.sin(t * 0.4 + rig.seed) * (1 - mv), 0);
    if (st === 'dead') {
      md_e(P, I.hips, 1.45, 0.3, 0); P[n + 1] = -0.62; md_e(P, I.spine, 0.05, 0, 0.1); md_e(P, I.chest, 0, 0, 0); md_e(P, I.head, 0.3, 0.6, 0);
      md_e(P, I.uaL, -0.4, 0, 1.2); md_e(P, I.uaR, 0.1, 0, -1.3); md_e(P, I.faL, -0.3, 0, 0); md_e(P, I.faR, -0.5, 0, 0);
      md_e(P, I.thL, 0.1, 0, 0.15); md_e(P, I.thR, -0.2, 0, -0.1); md_e(P, I.shR, 0.6, 0, 0); return;
    }
    if (st === 'sit') {
      P[n + 1] = -0.45; for (const sd of ['L', 'R']) { const s = sd === 'L' ? 1 : -1; md_e(P, I['th' + sd], -1.45, 0, s * 0.35); md_e(P, I['sh' + sd], 1.9, 0, 0); md_e(P, I['ft' + sd], -0.4, 0, 0); md_e(P, I['ua' + sd], -0.5, 0, s * 0.3); md_e(P, I['fa' + sd], -0.7, 0, 0); }
      md_e(P, I.spine, 0.35, 0, 0); return;
    }
    const A = 0.5 * mv * (0.8 + 0.3 * g.run), D = rig.dims;
    let hy = 0;
    for (const [sd, s, o] of [['L', 1, 0], ['R', -1, Math.PI]]) {
      const f = ph + o, th = -A * Math.sin(f) - 0.15, kn = 0.25 + mv * (0.6 + 0.6 * g.run) * Math.pow(Math.max(0, Math.cos(f)), 1.5);
      md_e(P, I['th' + sd], th, 0, s * 0.08); md_e(P, I['sh' + sd], kn, 0, 0); md_e(P, I['ft' + sd], -(th + kn) * 0.8, 0, 0);
      hy = Math.max(hy, 0.4 * Math.cos(th) + 0.35 * Math.cos(th + kn));
      const sw = -s * A * 0.9 * Math.sin(ph);
      md_e(P, I['ua' + sd], sw - 0.25 * (1 - mv) + 0.03 * br, 0, s * 0.18); md_e(P, I['fa' + sd], -0.35 - 0.3 * g.run, 0, 0);
    }
    P[n + 1] = hy + 0.05 + 0.12 - D;
    md_e(P, I.hips, 0, 0.12 * mv * Math.sin(ph), 0.08 * mv * Math.sin(ph));
    md_ea(P, I.chest, 0, -0.15 * mv * Math.sin(ph), -0.06 * mv * Math.sin(ph));
    if (st === 'combat') {
      for (const sd of ['L', 'R']) { const s = sd === 'L' ? 1 : -1; md_e(P, I['ua' + sd], -0.9 + 0.08 * Math.sin(t * 4 + s), 0, s * 0.55); md_e(P, I['fa' + sd], -1.0, 0, 0); }
      md_ea(P, I.chest, -0.12, 0, 0); md_ea(P, I.head, 0.15, 0, 0);
    }
  },
  dur: { attack: 0.7, hit: 0.35, special: 1.1, emote: 1.6, jump: 0.8, cast: 1.0, shoot: 0.7 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'special' || a === 'jump') {   // double-fist slam
      const T = [0, 0.45, 0.62, 1.1];
      for (const sd of ['L', 'R']) { K(T, I['ua' + sd] * 3, -3.0, -1.2); K(T, I['fa' + sd] * 3, -0.6, -0.1); }
      K(T, I.chest * 3, -0.35, 0.5); K(T, I.spine * 3, -0.1, 0.4); K(T, n + 1, 0.05, -0.15);
    } else if (a === 'attack' || a === 'shoot') {
      const T = [0, 0.3, 0.45, 0.7];
      K(T, I.uaR * 3, 0.6, -1.6); K(T, I.uaR * 3 + 2, -0.6, 0.5); K(T, I.faR * 3, -1.2, -0.2); K(T, I.chest * 3 + 1, -0.5, 0.6); K(T, I.hips * 3 + 1, -0.15, 0.2);
    } else if (a === 'hit') { K([0, 0.07, 0.35], I.chest * 3, -0.35); K([0, 0.07, 0.35], I.head * 3, -0.35); }
    else {   // roar
      const T = [0, 0.3, 1.2, 1.6]; K(T, I.chest * 3, -0.45, -0.45); K(T, I.head * 3, -0.3, -0.3);
      for (const sd of ['L', 'R']) { K(T, I['ua' + sd] * 3 + 2, (sd === 'L' ? 1 : -1) * 1.1, (sd === 'L' ? 1 : -1) * 1.1); K(T, I['fa' + sd] * 3, -1.4, -1.4); }
    }
  },
};

// ----- drone: hovering sphere with fins, a lens eye and an under-slung emitter -----
MD_KINDS.drone = {
  h: 1.7, r: 0.45, cols: [0x9aa4ac, 0x3a4450, 0xff4030], L: 0.5, fly: 1,
  build(T) {
    const tb = taperBox, X = Math.PI / 2, cy = (r1, r2, h, s = 10) => new THREE.CylinderGeometry(r1, r2, h, s);
    T.bone('base', null, 0, 0, 0); T.bone('body', 'base', 0, 1.35, 0); T.bone('eye', 'body', 0, 0, 0.25);
    T.bone('finL', 'body', 0.3, 0, -0.02); T.bone('finR', 'body', -0.3, 0, -0.02); T.bone('gun', 'body', 0, -0.22, 0.05);
    T.part('body', new THREE.IcosahedronGeometry(0.31, 1), [0, 0, 0], MD_P, 0, [1, 0.82, 1]);
    T.part('body', cy(0.35, 0.35, 0.08), [0, 0, 0], MD_S);
    T.part('body', cy(0.15, 0.22, 0.08, 8), [0, 0.25, -0.02], MD_PD);
    T.part('body', tb(0.02, 0.02, 0.01, 0.01, 0.25), [0.08, 0.38, -0.08], MD_DK, [-0.3, 0, -0.2]);
    T.part('body', new THREE.IcosahedronGeometry(0.025, 0), [0.11, 0.5, -0.12], MD_A, 0, 0, 1);
    T.part('body', cy(0.14, 0.1, 0.1, 8), [0, -0.27, -0.03], MD_DK);
    T.part('body', cy(0.1, 0.1, 0.02, 8), [0, -0.33, -0.03], MD_A, 0, 0, 0.9);
    T.part('eye', cy(0.14, 0.15, 0.1, 10), [0, 0, 0], MD_DK, [X, 0, 0]);
    T.part('eye', new THREE.IcosahedronGeometry(0.095, 1), [0, 0, 0.035], MD_A, 0, [1, 1, 0.6], 1);
    for (const s of [-1, 1]) {
      const f = s > 0 ? 'finL' : 'finR';
      T.part(f, tb(0.34, 0.035, 0.12, 0.02, 0.36), [s * 0.16, 0, -0.04], MD_S, [0, 0, -s * X]);
      T.part(f, cbx(0.06, 0.03, 0.04, 0.01), [s * 0.34, 0, 0.0], MD_A, 0, 0, 0.9);
      T.part(f, tb(0.12, 0.02, 0.04, 0.015, 0.16), [s * 0.14, 0.08, -0.12], MD_PD, [-0.4, 0, -s * 0.3]);
    }
    T.part('gun', cbx(0.1, 0.08, 0.16, 0.02), [0, 0, 0], MD_DK);
    T.part('gun', cy(0.025, 0.025, 0.24, 6), [0, 0, 0.16], MD_GN, [X, 0, 0]);
    T.part('gun', cy(0.032, 0.032, 0.03, 6), [0, 0, 0.27], MD_A, [X, 0, 0], 0, 0.8);
    return { h: 1.75, muzzle: ['gun', 0, 0, 0.3] };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, n = rig.nb * 3, s = rig.seed;
    const fwd = clamp(rig.v / 6, -1, 1);
    md_e(P, I.body, 0.28 * fwd + 0.04 * Math.sin(t * 1.3 + s), 0.1 * Math.sin(t * 0.5 + s) * (1 - g.mv), 0.05 * Math.sin(t * 1.7 + s));
    md_e(P, I.eye, 0.08 * Math.sin(t * 0.9), 0.25 * Math.sin(t * 0.6 + s) * (1 - g.mv), 0);
    md_e(P, I.finL, 0, 0.1 * Math.sin(t * 5), 0.12 * Math.sin(t * 6.5) + 0.2 * fwd); md_e(P, I.finR, 0, -0.1 * Math.sin(t * 5), -0.12 * Math.sin(t * 6.5 + 1) - 0.2 * fwd);
    P[n + 1] = 0.07 * Math.sin(t * 2.1 + s);
    if (st === 'dead') { md_e(P, I.body, 0.5, 0, 0.7); P[n + 1] = -1.0; md_e(P, I.finL, 0, 0, -0.7); md_e(P, I.finR, 0, 0, 0.5); md_e(P, I.eye, 0.4, 0, 0); return; }
    if (st === 'sit') { P[n + 1] = -0.85 + 0.01 * Math.sin(t * 2); md_e(P, I.finL, 0, 0, -0.4); md_e(P, I.finR, 0, 0, 0.4); return; }
    if (st === 'combat') { P[n + 1] += 0.1; md_ea(P, I.body, -0.08, 0, 0); md_e(P, I.gun, -0.05, 0, 0); md_e(P, I.eye, 0, 0, 0); }
  },
  dur: { attack: 0.3, shoot: 0.3, hit: 0.35, special: 0.8, emote: 1.4, jump: 0.7, cast: 1.0 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'attack' || a === 'shoot') { const T = [0, 0.04, 0.3]; K(T, I.body * 3, -0.25); K(T, n + 2, -0.1); K(T, I.gun * 3, -0.3); }
    else if (a === 'special') { const T = [0, 0.04, 0.2, 0.24, 0.4, 0.44, 0.8]; K(T, I.body * 3, -0.25, -0.05, -0.25, -0.05, -0.25); K(T, n + 2, -0.1, 0, -0.1, 0, -0.1); }
    else if (a === 'hit') { const T = [0, 0.06, 0.35]; K(T, I.body * 3 + 2, 0.5); K(T, n, 0.12); K(T, n + 1, -0.1); }
    else if (a === 'emote') { const T = [0, 0.3, 1.0, 1.4]; K(T, I.body * 3 + 1, TAU * 0.5, TAU); K(T, n + 1, 0.2, 0.2); }
    else if (a === 'cast') { const T = [0, 0.2, 0.8, 1.0]; K(T, n + 3, 1, 1); K(T, I.finL * 3 + 2, 0.6, 0.6); K(T, I.finR * 3 + 2, -0.6, -0.6); }
    else { const T = [0, 0.3, 0.7]; K(T, n + 1, 0.5); }
  },
};

// ----- worm: segmented burrower rearing out of a mound of rubble -----
MD_KINDS.worm = {
  h: 2.7, r: 0.6, cols: [0xb08858, 0x6a4a30, 0xff8040], L: 0.6, mover: 's0', fly: 1,
  build(T) {
    const cy = (r1, r2, h, s = 8) => new THREE.CylinderGeometry(r1, r2, h, s), tb = taperBox;
    T.bone('base', null, 0, 0, 0); T.bone('s0', 'base', 0, -0.3, 0);
    for (let i = 0; i < 7; i++) T.bone('s' + (i + 1), 's' + i, 0, 0.4, 0);
    T.bone('head', 's7', 0, 0.36, 0);
    for (let j = 0; j < 3; j++) { const a = j * TAU / 3; T.bone('j' + j, 'head', Math.sin(a) * 0.14, 0.2, Math.cos(a) * 0.14); }
    T.part('base', cy(0.7, 0.85, 0.12, 9), [0, 0.0, 0], MD_SD);
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + 0.3; T.part('base', new THREE.IcosahedronGeometry(0.13 + 0.06 * ((i * 7) % 3), 0), [Math.sin(a) * 0.62, 0.06, Math.cos(a) * 0.62], i % 2 ? MD_SD : MD_DK, [i, i * 2, 0]); }
    for (let i = 0; i < 8; i++) {
      const r = 0.34 - i * 0.017, b = 's' + i;
      T.part(b, cy(r * 0.94, r, 0.42), [0, 0.2, 0], MD_P);
      T.part(b, cy(r * 1.06, r * 1.06, 0.07), [0, 0.04, 0], MD_PD);
      T.part(b, cbx(r * 1.0, 0.3, 0.06, 0.02), [0, 0.22, r * 0.86], MD_SK);
      T.part(b, tb(0.08, 0.08, 0.01, 0.01, 0.16), [0, 0.24, -r * 0.92], MD_S, [-1.0, 0, 0]);
    }
    T.part('head', cy(0.22, 0.25, 0.3), [0, 0.12, 0], MD_P);
    T.part('head', cy(0.17, 0.17, 0.03), [0, 0.27, 0], MD_PU);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; T.part('head', tb(0.035, 0.035, 0.004, 0.004, 0.08), [Math.sin(a) * 0.15, 0.3, Math.cos(a) * 0.15], MD_EY, [Math.cos(a) * -0.4, 0, Math.sin(a) * 0.4]); }
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.45; T.part('head', new THREE.IcosahedronGeometry(0.025, 0), [Math.sin(a) * 0.23, 0.15, Math.cos(a) * 0.2], MD_A, 0, 0, 1); }
    for (let j = 0; j < 3; j++) {
      const a = j * TAU / 3;
      T.part('j' + j, tb(0.17, 0.04, 0.03, 0.02, 0.3), [Math.sin(a) * 0.03, 0.14, Math.cos(a) * 0.03], MD_PD, [0, a, 0]);
      T.part('j' + j, tb(0.03, 0.03, 0.004, 0.004, 0.08), [-Math.sin(a) * 0.01, 0.3, -Math.cos(a) * 0.01], MD_EY, [0, a, 0]);
    }
    return { h: 2.7 };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, n = rig.nb * 3, mv = g.mv, sp = 1.3 + 2 * mv, amp = 0.06 + 0.08 * mv;
    const curve = [0.0, -0.08, -0.06, 0.02, 0.18, 0.28, 0.32, 0.3];
    for (let i = 0; i < 8; i++) md_e(P, I['s' + i], curve[i] * (1 + 0.5 * mv) + amp * Math.sin(t * sp - i * 0.7 + rig.seed), 0.03 * Math.sin(t * 0.7), 0.1 * Math.sin(t * sp * 0.8 - i * 0.6));
    md_e(P, I.head, 0.55, 0, 0);
    const jo = 0.25 + 0.1 * Math.sin(t * 2);
    for (let j = 0; j < 3; j++) { const a = j * TAU / 3; md_e(P, I['j' + j], Math.cos(a) * jo, 0, -Math.sin(a) * jo); }
    P[n + 1] = -0.12 * mv;
    if (st === 'dead') {
      const c = [0.9, 0.5, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1];
      for (let i = 0; i < 8; i++) md_e(P, I['s' + i], c[i], 0, 0.05 * i);
      P[n + 1] = -0.55; md_e(P, I.head, 0.3, 0, 0); return;
    }
    if (st === 'sit') { P[n + 1] = -1.6; return; }
    if (st === 'combat') {
      for (let j = 0; j < 3; j++) { const a = j * TAU / 3, o = 0.55 + 0.15 * Math.sin(t * 8); md_e(P, I['j' + j], Math.cos(a) * o, 0, -Math.sin(a) * o); }
      P[I.s5 * 3] += 0.1; P[I.s6 * 3] += 0.1;
    }
  },
  dur: { attack: 0.8, shoot: 0.8, hit: 0.35, special: 1.2, emote: 1.6, jump: 1.0, cast: 1.0 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'hit') { const T = [0, 0.07, 0.35]; for (let i = 3; i < 8; i++) K(T, I['s' + i] * 3, P[I['s' + i] * 3] - 0.15); return; }
    if (a === 'jump' || a === 'emote') { const T = [0, 0.4, 0.8, 1.0]; K(T, n + 1, 0.5, 0.5); for (let i = 1; i < 8; i++) K(T, I['s' + i] * 3, -0.05, -0.05); return; }
    const big = a === 'special' ? 1.4 : 1, T = a === 'special' ? [0, 0.5, 0.7, 1.2] : [0, 0.35, 0.5, 0.8];
    for (let i = 2; i < 8; i++) K(T, I['s' + i] * 3, -0.12 * big, 0.28 * big);
    for (let j = 0; j < 3; j++) { const ang = j * TAU / 3; K(T, I['j' + j] * 3, Math.cos(ang) * 0.9, Math.cos(ang) * 0.1); K(T, I['j' + j] * 3 + 2, -Math.sin(ang) * 0.9, -Math.sin(ang) * 0.1); }
  },
};

// ----- golem: blocky stone giant with glowing lumen veins -----
MD_KINDS.golem = {
  h: 2.75, r: 0.85, cols: [0x7c746a, 0x4e5a62, 0x50e0ff], L: 0.97,
  build(T) {
    const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
    T.bone('base', null, 0, 0, 0); T.bone('hips', 'base', 0, 1.05, 0); T.bone('chest', 'hips', 0, 0.32, 0); T.bone('head', 'chest', 0, 0.82, 0.18);
    for (const [sd, s] of [['L', 1], ['R', -1]]) {
      T.bone('ua' + sd, 'chest', s * 0.72, 0.6, 0); T.bone('fa' + sd, 'ua' + sd, 0, -0.55, 0); T.bone('hd' + sd, 'fa' + sd, 0, -0.5, 0);
      T.bone('th' + sd, 'hips', s * 0.3, -0.1, 0); T.bone('sh' + sd, 'th' + sd, 0, -0.45, 0); T.bone('ft' + sd, 'sh' + sd, 0, -0.42, 0);
    }
    T.part('hips', cbx(0.72, 0.36, 0.52, 0.1), [0, 0, 0], MD_PD);
    T.part('chest', cbx(1.15, 0.86, 0.78, 0.18), [0, 0.42, 0], MD_P, [0.05, 0, 0]);
    T.part('chest', cbx(0.7, 0.4, 0.5, 0.1), [0, 0.06, 0.02], MD_PD);
    T.part('chest', ico(0.34), [-0.25, 0.78, -0.25], MD_PD); T.part('chest', ico(0.28), [0.32, 0.82, -0.2], MD_P); T.part('chest', ico(0.25), [0.05, 0.55, -0.42], MD_PD);
    T.part('chest', cbx(0.5, 0.14, 0.4, 0.04), [0.45, 0.88, 0], MD_S, [0, 0, -0.3]);
    T.part('chest', new THREE.OctahedronGeometry(0.13, 0), [0, 0.45, 0.4], MD_A, 0, [1, 1.3, 0.6], 1);
    for (const [x, y, r] of [[-0.2, 0.62, 0.7], [0.22, 0.3, -0.6], [0.3, 0.6, 0.3], [-0.28, 0.25, -0.2]]) T.part('chest', cbx(0.34, 0.035, 0.02, 0.006), [x, y, 0.395], MD_A, [0, 0, r], 0, 0.9);
    T.part('head', cbx(0.34, 0.3, 0.34, 0.08), [0, 0.1, 0.0], MD_P);
    T.part('head', cbx(0.38, 0.07, 0.12, 0.02), [0, 0.2, 0.13], MD_PD);
    for (const s of [-1, 1]) T.part('head', cbx(0.08, 0.035, 0.02, 0.008), [s * 0.08, 0.13, 0.172], MD_A, 0, 0, 1);
    for (const sd of ['L', 'R']) {
      const s = sd === 'L' ? 1 : -1;
      T.part('ua' + sd, ico(0.36), [s * 0.04, 0.02, 0], MD_P, [0.3, 0.2, 0]);
      T.part('ua' + sd, cbx(0.34, 0.5, 0.34, 0.08), [0, -0.3, 0], MD_PD);
      T.part('fa' + sd, cbx(0.42, 0.48, 0.42, 0.1), [0, -0.25, 0], MD_P);
      T.part('fa' + sd, cbx(0.45, 0.08, 0.45, 0.02), [0, -0.1, 0], MD_S);
      T.part('fa' + sd, cbx(0.03, 0.3, 0.02, 0.006), [s * 0.1, -0.27, 0.215], MD_A, [0, 0, 0.3], 0, 0.9);
      T.part('hd' + sd, cbx(0.5, 0.42, 0.5, 0.12), [0, -0.18, 0.02], MD_PD);
      T.part('th' + sd, cbx(0.4, 0.46, 0.4, 0.1), [0, -0.22, 0], MD_PD);
      T.part('sh' + sd, cbx(0.44, 0.42, 0.44, 0.1), [0, -0.2, 0], MD_P);
      T.part('ft' + sd, cbx(0.5, 0.2, 0.6, 0.06), [0, -0.0, 0.08], MD_PD);
    }
    return { h: 2.75 };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, ph = rig.ph, n = rig.nb * 3, mv = g.mv, br = Math.sin(t * 0.9 + rig.seed);
    md_e(P, I.chest, 0.08 + 0.015 * br, 0, 0); md_e(P, I.head, -0.05, 0.15 * Math.sin(t * 0.3 + rig.seed) * (1 - mv), 0);
    if (st === 'dead') {   // topples forward and lies face-down
      md_e(P, I.hips, 1.45, 0.1, 0.05); P[n + 1] = -0.72; md_e(P, I.chest, 0.05, 0, 0); md_e(P, I.head, 0.2, 0.4, 0);
      md_e(P, I.uaL, -2.2, 0, 0.6); md_e(P, I.uaR, -1.6, 0, -0.9); md_e(P, I.faL, -0.3, 0, 0); md_e(P, I.faR, -0.2, 0, 0);
      md_e(P, I.thL, 0, 0, 0.12); md_e(P, I.thR, -0.1, 0, -0.1); return;
    }
    if (st === 'sit') {
      P[n + 1] = -0.62; for (const sd of ['L', 'R']) { const s = sd === 'L' ? 1 : -1; md_e(P, I['th' + sd], -1.45, 0, s * 0.25); md_e(P, I['sh' + sd], 1.55, 0, 0); md_e(P, I['ua' + sd], -0.5, 0, s * 0.15); md_e(P, I['fa' + sd], -0.6, 0, 0); }
      md_e(P, I.chest, 0.3, 0, 0); md_e(P, I.head, 0.2, 0, 0); return;
    }
    const A = 0.36 * mv;
    let hy = 0;
    for (const [sd, s, o] of [['L', 1, 0], ['R', -1, Math.PI]]) {
      const f = ph + o, th = -A * Math.sin(f), kn = 0.08 + mv * 0.55 * Math.pow(Math.max(0, Math.cos(f)), 1.5);
      md_e(P, I['th' + sd], th, 0, s * 0.06); md_e(P, I['sh' + sd], kn, 0, 0); md_e(P, I['ft' + sd], -(th + kn) * 0.9, 0, 0);
      hy = Math.max(hy, 0.45 * Math.cos(th) + 0.42 * Math.cos(th + kn));
      md_e(P, I['ua' + sd], -s * 0.5 * A * Math.sin(ph) * -1 * s * s - 0.05, 0, s * 0.12); md_e(P, I['fa' + sd], -0.25, 0, 0);
    }
    P[I.uaL * 3] = 0.5 * A * Math.sin(ph) - 0.05; P[I.uaR * 3] = -0.5 * A * Math.sin(ph) - 0.05;
    P[n + 1] = hy - 0.87;
    md_e(P, I.hips, 0, 0.1 * mv * Math.sin(ph), 0.1 * mv * Math.sin(ph)); md_ea(P, I.chest, 0, -0.12 * mv * Math.sin(ph), -0.08 * mv * Math.sin(ph));
    if (st === 'combat') {
      for (const sd of ['L', 'R']) { const s = sd === 'L' ? 1 : -1; md_e(P, I['ua' + sd], -0.8, 0, s * 0.35); md_e(P, I['fa' + sd], -1.1, 0, 0); }
      md_ea(P, I.chest, 0.1, 0, 0);
    }
  },
  dur: { attack: 0.95, shoot: 0.95, hit: 0.4, special: 1.4, emote: 1.6, jump: 1.0, cast: 1.2 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'special' || a === 'jump') {
      const T = [0, 0.6, 0.8, 1.4];
      for (const sd of ['L', 'R']) { K(T, I['ua' + sd] * 3, -3.0, -1.2); K(T, I['fa' + sd] * 3, -0.5, -0.1); }
      K(T, I.chest * 3, -0.3, 0.5); K(T, n + 1, 0.05, -0.2);
    } else if (a === 'attack' || a === 'shoot') {
      const T = [0, 0.4, 0.58, 0.95];
      K(T, I.uaR * 3, 0.5, -1.7); K(T, I.uaR * 3 + 2, -0.5, 0.4); K(T, I.faR * 3, -1.0, -0.2); K(T, I.chest * 3 + 1, -0.45, 0.5);
    } else if (a === 'hit') { K([0, 0.08, 0.4], I.chest * 3, -0.2); }
    else { const T = [0, 0.3, 1.0, 1.4]; K(T, n + 3, 1, 1); K(T, I.chest * 3, -0.25, -0.25); for (const sd of ['L', 'R']) K(T, I['ua' + sd] * 3 + 2, (sd === 'L' ? 1 : -1) * 0.9, (sd === 'L' ? 1 : -1) * 0.9); }
  },
};

// ----- wisp: floating lumen crystal cluster wrapped in an additive halo -----
MD_KINDS.wisp = {
  h: 1.9, r: 0.45, cols: [0x60f0ff, 0xa0a0ff, 0xffffff], L: 0.5, fly: 1,
  build(T) {
    const oc = (r) => new THREE.OctahedronGeometry(r, 0);
    T.bone('base', null, 0, 0, 0); T.bone('core', 'base', 0, 1.4, 0); T.bone('ring', 'core', 0, 0, 0);
    T.part('core', oc(0.24), [0, 0, 0], MD_P, 0, [0.75, 1.7, 0.75], 0.85);
    T.part('core', oc(0.16), [0.06, 0.05, 0.03], MD_A, [0.4, 0.3, 0.5], [0.8, 1.4, 0.8], 1);
    T.part('core', oc(0.12), [-0.1, -0.12, -0.04], MD_S, [0.2, 0.9, -0.6], [0.7, 1.6, 0.7], 0.8);
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      T.bone('sh' + i, 'ring', Math.sin(a) * 0.46, (i % 2 ? 0.12 : -0.1), Math.cos(a) * 0.46);
      T.part('sh' + i, oc(0.09 + 0.02 * (i % 3)), [0, 0, 0], i % 2 ? MD_S : MD_P, [0.3 * i, a, 0.2], [0.6, 1.6, 0.6], 0.85);
    }
    return { h: 1.9, halo: 1 };
  },
  pose(rig, st, P, g) {
    const I = rig.I, t = rig.t, n = rig.nb * 3;
    md_e(P, I.core, 0.15 * clamp(rig.v / 5, -1, 1), t * 0.4, 0.05 * Math.sin(t * 1.1)); md_e(P, I.ring, 0.2 * Math.sin(t * 0.7), t * 1.3 - t * 0.4, 0.15 * Math.sin(t * 0.9));
    for (let i = 0; i < 5; i++) md_e(P, I['sh' + i], 0.3 * Math.sin(t * 2 + i), t * 2.5 + i, 0);
    P[n + 1] = 0.08 * Math.sin(t * 1.6 + rig.seed); P[n + 3] = 0.25 + 0.1 * Math.sin(t * 3);
    if (st === 'dead') { P[n + 1] = -1.2; md_ea(P, I.core, 1.3, 0, 0.4); P[n + 3] = -1; return; }
    if (st === 'sit') { P[n + 1] = -0.6; P[n + 3] = 0; }
    if (st === 'combat') { P[n + 3] = 0.5 + 0.2 * Math.sin(t * 7); P[n + 1] += 0.1; }
  },
  dur: { attack: 0.6, shoot: 0.6, hit: 0.3, special: 1.0, emote: 1.4, jump: 0.8, cast: 1.0 },
  act(rig, P, a, t, K) {
    const I = rig.I, n = rig.nb * 3;
    if (a === 'hit') { K([0, 0.06, 0.3], n + 3, -0.6); K([0, 0.06, 0.3], I.core * 3 + 2, 0.4); return; }
    const T = a === 'attack' || a === 'shoot' ? [0, 0.2, 0.32, 0.6] : [0, 0.3, 0.7, 1.0];
    K(T, n + 3, 1.6, 1.0); K(T, n + 2, -0.05, 0.15); K(T, I.ring * 3, 0.6, -0.4);
  },
};

const MD_CREATURE_KINDS = Object.keys(MD_KINDS);
function md_creatureTpl(kind) {
  const K = MD_KINDS[kind];
  return md_tpl('cr|' + kind, (T) => { const ex = K.build(T) || {}; return Object.assign({ r: K.r }, ex); });
}
function md_cEval(rig, st, P) {
  P.fill(0);
  const a = Math.abs(rig.v), g = { mv: smooth(0.05, 0.5, a), run: smooth(3.2, 6.5, a) };
  rig.K.pose(rig, st, P, g);
  return P;
}
function md_cAct(rig, P, a, t) {
  const K = (T, i, ...m) => { const v = P[i]; m.unshift(v); m.push(v); P[i] = md_kf(t, T, m); };
  rig.K.act(rig, P, a, t, K);
}
function md_cApply(rig, P) {
  const n = rig.nb;
  for (let i = 0; i < n; i++) rig.bones[i].rotation.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
  const mb = rig.bones[rig.mi], at = rig.tpl.bones[rig.mi].at;
  mb.position.set(at[0] + P[n * 3], at[1] + P[n * 3 + 1], at[2] + P[n * 3 + 2]);
  const fx = P[n * 3 + 3];
  if (rig.halo) {
    const v = clamp(0.55 + 0.35 * fx, 0, 1.5);
    rig.halo.visible = v > 0.05; rig.halo.material.opacity = 0.28 * v; rig.halo.scale.setScalar(0.85 + 0.35 * v);
    rig.B.ring.scale.setScalar(1 + 0.35 * Math.max(0, fx - 0.5));
  }
  if (rig.glowM) { rig.glowM.visible = fx > 0.05 && !rig.halo; rig.glowM.scale.setScalar(Math.max(0.01, fx) * 1.6); }
}

// kind: 'critter'|'beast'|'insect'|'mutant'|'drone'|'worm'|'golem'|'wisp'; opts: { colors: [hex,hex,hex], scale }
function makeCreature(kind, opts) {
  opts = opts || {};
  if (!MD_KINDS[kind]) kind = 'critter';
  const K = MD_KINDS[kind], tpl = md_creatureTpl(kind);
  const cols = (opts.colors && opts.colors.length ? opts.colors : K.cols).map((c, i) => c == null ? K.cols[i] : c);
  const body = md_body(tpl, md_creaturePal(cols.concat(K.cols.slice(cols.length))));
  const sc = clamp(+opts.scale || 1, 0.1, 20);
  body.mesh.scale.setScalar(sc);
  const root = new THREE.Group();
  root.name = kind; root.add(body.mesh);
  const nb = tpl.bones.length, np = nb * 3 + 4;
  const rig = {
    root, kind, K, tpl, B: body.B, bones: body.bones, I: tpl.I, nb, mi: tpl.I[K.mover || 'base'] ?? 1, body: body.mesh,
    height: tpl.h * sc, radius: tpl.r * sc, scale: sc, colors: cols, keys: null, states: ['idle', 'walk', 'run', 'combat', 'sit', 'dead'],
    P: new Float32Array(np), Pa: new Float32Array(np), Pf: new Float32Array(np), t: 0, v: 0, ph: 0, st: 'idle', fst: 'idle', fade: 1, fdur: 0.2, frozen: false,
    act: null, actT: 0, actDur: 0, flashT: 0, seed: Math.random() * 10, dims: 0.87, glowCol: null, weapons: [],
    eval: md_cEval, apply: md_cApply, actFn: md_cAct, cyc: K.cyc || ((a) => md_cycle(a, K.L)),
  };
  if (kind === 'mutant') rig.dims = 0.4 + 0.35 + 0.05;
  if (K.mover == null) rig.mi = 0;
  if (tpl.halo) {
    rig.haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[0]), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
    rig.halo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), rig.haloMat);
    body.B.core.add(rig.halo);
  } else {
    rig.glowM = new THREE.Mesh(md_glowGeo, md_addMat(cols[2], 0.9));
    const hb = body.B.head || body.B.eye || body.B.body || body.B.chest || body.B.core;
    rig.glowM.position.set(0, kind === 'drone' ? 0 : 0.25, kind === 'drone' ? 0.12 : 0.15); rig.glowM.visible = false;
    hb.add(rig.glowM);
  }
  if (tpl.muzzle) {
    const f = new THREE.Mesh(md_flashGeo, md_addMat(0xffc860, 0.95));
    f.position.set(tpl.muzzle[1], tpl.muzzle[2], tpl.muzzle[3]); f.visible = false;
    body.B[tpl.muzzle[0]].add(f); rig.flash = f;
  }
  rig.anim = (dt, state, speed) => md_drive(rig, dt, state, speed);
  rig.play = (a) => {
    if (rig.st === 'dead' || !K.dur[a]) return;
    rig.act = a; rig.actT = 0; rig.actDur = K.dur[a];
    if (rig.flash && (a === 'shoot' || a === 'attack')) rig.flashT = 0.06;
    rig.burst = rig.flash && a === 'special' ? [0.0, 0.2, 0.4] : null;
  };
  rig.setWeapon = () => {};
  rig.setLook = (l) => {
    if (!l) return;
    const c = l.colors || [l.primary, l.secondary, l.accent];
    rig.colors = rig.colors.map((v, i) => c[i] == null ? v : c[i]);
    md_paint(body.mesh.geometry, tpl, md_creaturePal(rig.colors));
    if (rig.haloMat) rig.haloMat.color.set(rig.colors[0]);
  };
  rig.setGlow = (col) => { rig.glowCol = col == null ? null : col; body.mesh.material = col == null ? md_skinMat : md_tintMat(true, col); };
  rig.dispose = () => {
    root.parent && root.parent.remove(root);
    md_freeBody(body, tpl);
    if (rig.halo) { rig.halo.geometry.dispose(); rig.haloMat.dispose(); }
  };
  rig.stats = () => ({ tris: tpl.tris, calls: 1 + (rig.halo ? 1 : 0), bones: nb });
  rig.anim(0, 'idle', 0);
  return rig;
}
