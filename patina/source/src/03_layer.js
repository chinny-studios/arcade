// The layered restoration material. Every paintable surface is a MeshPhysicalMaterial patched with
// onBeforeCompile. Per-vertex masks (attributes mA, mB) say how much of each layer is left, and the fragment
// shader turns them into crisp, noisy layers using the shared 3D noise volume in object space:
//   mA.r grime   mA.g corrosion (tarnish or rust)   mA.b old finish   mA.a new finish
//   mB.r scratches   mB.g polish
// aoR = (baked ambient occlusion, reach). Reach is how visible the vertex is from where the camera can go.
// Bump detail (engraving, knurling, wood pores, rust, grime) is evaluated as a height in metres and turned into
// a normal with unnormalised screen-space derivatives, so it stays the right size at any zoom.
const LAYER = { noise: { value: null }, time: { value: 0 }, hint: { value: 0 } };

const L_VERT_PARS = `
attribute vec4 mA; attribute vec4 mB; attribute vec2 aoR;
varying vec3 vOP; varying vec3 vON; varying vec4 vMA; varying vec4 vMB; varying vec2 vAO;
`;
const L_VERT_MAIN = `
vOP = position; vON = normal; vMA = mA; vMB = mB; vAO = aoR;
`;

const L_FRAG_PARS = `
varying vec3 vOP; varying vec3 vON; varying vec4 vMA; varying vec4 vMB; varying vec2 vAO;
uniform highp sampler3D uNoise;
uniform float uTime; uniform float uHint;
uniform vec3 uCol; uniform vec3 uCol2; uniform vec3 uDirt; uniform vec3 uDust; uniform vec3 uFinT; uniform vec3 uOldT;
uniform float uRough; uniform float uRoughPol; uniform float uMetal; uniform float uScale;
uniform vec3 uAxis; uniform vec3 uOrigin; uniform vec4 uPat; uniform vec4 uNeed;
uniform float uCC; uniform float uIrid; uniform float uIridT; uniform float uAOK;
#ifdef L_MAP
uniform sampler2D uMap; uniform vec4 uMapXf;
#endif

float gFw, gGroove, gMicro, cG, cC, cO, cF, cS, cP;
vec3 gAlb, gEm, gSheenC; float gRough, gMetal, gCC, gCCR, gCCB, gIrid, gIridT, gTrans, gSheenR;

vec4 N3(vec3 p) { return texture(uNoise, p); }
float tri(float x) { return abs(fract(x) - 0.5) * 2.0; }
float hash1(float n) { return fract(sin(n * 12.9898 + 4.1) * 43758.5453); }
// 1 when a feature of this wavelength spans several pixels, fading to 0 before it would alias
float lodf(float wl) { return smoothstep(1.6, 4.5, wl / max(gFw, 1e-7)); }
mat3 axisBasis() {
  vec3 a = normalize(uAxis);
  vec3 t1 = normalize(cross(a, abs(a.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  return mat3(t1, cross(a, t1), a);
}

// engraved / machined relief, in metres
float patH(vec3 op) {
  gGroove = 0.0;
  float h = 0.0;
#ifdef P_GUILLOCHE
  {
    mat3 B = axisBasis(); vec3 d = op - uOrigin; vec2 q = vec2(dot(d, B[0]), dot(d, B[1]));
    float r = length(q), a = atan(q.y, q.x), R = uPat.x, wl = 1.0 / uPat.y;
    float field = smoothstep(R * 0.30, R * 0.305, r) * (1.0 - smoothstep(R * 0.845, R * 0.85, r));
    float s = tri(r * uPat.y + 0.6 * tri(a * uPat.z / 6.2832));
    float f = field * lodf(wl);
    h += (s - 0.5) * uPat.w * f;
    gGroove += (1.0 - s) * f * 0.55;
    gMicro += field * (1.0 - lodf(wl)) * 0.16;
    float lw = wl * 0.7;
    float ring = (1.0 - smoothstep(0.0, lw, abs(r - R * 0.29))) + (1.0 - smoothstep(0.0, lw, abs(r - R * 0.86)));
    h -= ring * uPat.w * 1.5 * lodf(lw * 2.0);
    gGroove += ring * 0.5;
  }
#endif
#ifdef P_KNURL
  {
    mat3 B = axisBasis(); vec3 d = op - uOrigin; vec2 q = vec2(dot(d, B[0]), dot(d, B[1]));
    float r = length(q), a = atan(q.y, q.x), along = dot(d, B[2]);
    float band = smoothstep(uPat.z, uPat.z + 0.0002, along) * (1.0 - smoothstep(uPat.w - 0.0002, uPat.w, along));
    float wl = 6.2832 * r / uPat.x;
    float s = tri(a * uPat.x / 6.2832);
    float f = band * lodf(wl);
    h += (s - 0.5) * uPat.y * f;
    gGroove += (1.0 - s) * f * 0.6;
    gMicro += band * (1.0 - lodf(wl)) * 0.25;
  }
#endif
#ifdef P_WOOD
  {
    mat3 B = axisBasis(); vec3 d = op - uOrigin; vec3 q = vec3(dot(d, B[0]), dot(d, B[1]), dot(d, B[2]));
    float pore = N3(vec3(q.x * uScale * 7.0, q.y * uScale * 7.0, q.z * uScale * 0.35)).b;
    float pr = smoothstep(0.64, 0.8, pore) * lodf(1.0 / (uScale * 7.0));
    h -= pr * uPat.w;
    gGroove += pr * 0.35;
  }
#endif
  return h;
}

// fine random scratches, as coverage 0..1 (lines narrower than a pixel fade to a faint haze)
float scratchPat(vec3 op) {
  float s = 0.0;
  vec3 p = op * uScale * 0.5;
  float k = 18.0 * uScale * 0.5;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 dir = normalize(vec3(sin(fi * 2.4 + 0.7), cos(fi * 1.9 + 0.2) * 0.8, sin(fi * 3.7 + 2.0)));
    float x = dot(p, dir) * 18.0 + (N3(p * 0.7 + fi * 0.31).r - 0.5) * 3.0;
    float li = floor(x);
    float keep = step(0.5, hash1(li + fi * 37.0));
    float seg = smoothstep(0.5, 0.66, N3(p * 1.3 + vec3(li * 0.137, fi * 0.71, li * 0.05)).g);
    float dist = abs(fract(x) - 0.5) / k;
    float w = 0.000015 + hash1(li * 3.1 + fi) * 0.00004;
    float cov = clamp(w / max(gFw, 1e-7), 0.08, 1.0) * (1.0 - smoothstep(w * 0.5, w * 0.5 + gFw, dist));
    s = max(s, cov * keep * seg);
  }
  return s;
}

float layerH(vec3 op) {
  float h = patH(op);
  vec3 p = op * uScale;
#ifdef C_RUST
  h += cC * ((N3(p * 2.7).r - 0.5) + (N3(p * 9.0).b - 0.5) * 0.6) * 0.3 / (uScale * 2.7);
#endif
#ifdef O_OLD
  h -= cO * (1.0 - smoothstep(0.0, 0.1, N3(p * 1.5).a)) * 0.08 / (uScale * 1.5);
#endif
  h += cG * (N3(p * 5.0).g - 0.4) * 0.07 / (uScale * 5.0);
  return h;
}

vec3 lBump(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = dFdx(surf_pos), vSigmaY = dFdy(surf_pos);
  vec3 R1 = cross(vSigmaY, surf_norm), R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}

void layerEval() {
  gFw = max(length(dFdx(vOP)), length(dFdy(vOP)));
  vec3 p = vOP * uScale;
  // the volume holds 8 noise cells per tile, so these are cells of about 15, 3.6, 0.9 and 0.2 tile-units / 8
  vec4 nD = N3(p * 0.07), nA = N3(p * 0.31), nB = N3(p * 1.3), nC = N3(p * 5.1);
  float brk = (nB.g - 0.5) * 0.8 + (nC.r - 0.5) * 0.5;
  gMicro = 0.0;
  patH(vOP);
  float cav = clamp((1.0 - vAO.x) * 1.3 + gGroove, 0.0, 1.0);

  vec3 alb = uCol; float rough = uRough; float metal = uMetal;
  gCC = uCC; gCCR = 0.04; gCCB = 0.0; gIrid = uIrid; gIridT = uIridT; gTrans = 1.0; gEm = vec3(0.0);
  gSheenC = vec3(0.0); gSheenR = 0.5; cG = 0.0; cC = 0.0; cO = 0.0; cF = 0.0; cS = 0.0; cP = 0.0;

#ifdef K_METAL
  cP = smoothstep(0.0, 1.0, vMB.g);
  rough = mix(uRough, uRoughPol, cP) * (0.8 + 0.4 * nC.b) + gMicro;
  alb *= 0.94 + 0.08 * nA.r + 0.08 * nD.r;
#endif
#ifdef K_ENAMEL
  alb *= 0.97 + 0.06 * nB.r;
  gCC = 1.0; gCCR = 0.035 + 0.03 * nC.r;
#endif
#ifdef K_GLASS
  rough = 0.0; metal = 0.0;
#endif
#ifdef K_WOOD
  {
    mat3 B = axisBasis(); vec3 d = vOP - uOrigin; vec3 q = vec3(dot(d, B[0]), dot(d, B[1]), dot(d, B[2]));
    float warp = (N3(vec3(q.x, q.y, q.z * 0.12) * uScale * 0.45).r - 0.5) * uPat.y + (nB.g - 0.5) * 0.12;
    float ring = fract(length(q.xy) * uPat.x + warp);
    float late = smoothstep(0.5, 0.86, ring) * (1.0 - smoothstep(0.93, 1.0, ring));
    float streak = N3(vec3(q.x * uScale * 3.0, q.y * uScale * 3.0, q.z * uScale * 0.18)).r;
    alb = mix(uCol, uCol2, late * 0.9) * (0.82 + 0.36 * streak);
    rough = uRough + late * 0.06 + gGroove * 0.2;
  }
#endif
#ifdef K_FELT
  {
    float fib = N3(p * 7.0).b * 0.6 + N3(p * 2.0).r * 0.4;
    alb = uCol * (0.75 + 0.5 * fib); rough = 1.0; metal = 0.0;
    gSheenC = uCol2; gSheenR = 0.55;
  }
#endif
#ifdef K_PAINT
  alb *= 0.95 + 0.1 * nA.r;
  rough = uRough * (0.85 + 0.3 * nC.b);
#endif
#ifdef L_MAP
  {
    mat3 B = axisBasis(); vec3 d = vOP - uOrigin;
    vec2 uv = vec2(dot(d, B[0]), dot(d, B[1])) * uMapXf.x + 0.5;
    float ink = texture2D(uMap, uv).a;
    alb = mix(alb, uCol2, ink);
    rough = mix(rough, 0.55, ink);
  }
#endif

  // ---- wear, from the bottom up
  float sAmt = smoothstep(0.03, 0.5, vMB.r);
  if (sAmt > 0.0) cS = scratchPat(vOP) * sAmt;
#ifdef K_GLASS
  rough = mix(rough, 0.3, cS); alb = mix(alb, vec3(1.0), cS * 0.3);
#else
  rough = mix(rough, min(1.0, rough + 0.4), cS);
  alb *= 1.0 - cS * 0.12;
  gCCR = mix(gCCR, 0.35, cS);
#endif

#ifdef C_TARNISH
  {
    float t = smoothstep(0.03, 0.95, vMA.g + brk * 0.18 + cav * 0.15 * vMA.g);
    cC = t;
    alb = alb * mix(vec3(1.0), vec3(0.42, 0.29, 0.17), t) * (1.0 - 0.38 * t);
    rough = mix(rough, 0.42, t * 0.75);
    gIrid = max(gIrid, (0.3 + 1.7 * t * (1.0 - t)) * t * 1.25);
    gIridT = 220.0 + 520.0 * nB.b + 200.0 * t;
    float vg = smoothstep(0.55, 0.9, cav + brk * 0.3) * smoothstep(0.45, 0.9, vMA.g);
    alb = mix(alb, vec3(0.09, 0.25, 0.18) * (0.7 + 0.6 * nC.g), vg);
    metal = mix(metal, 0.0, vg); rough = mix(rough, 0.85, vg); gIrid *= 1.0 - vg;
  }
#endif
#ifdef C_RUST
  {
    float t = smoothstep(0.12, 0.32, vMA.g + brk * 0.45 + cav * 0.2 * vMA.g);
    cC = t;
    vec3 rc = mix(vec3(0.30, 0.10, 0.03), vec3(0.11, 0.045, 0.02), nC.g) * (0.8 + 0.5 * nB.r);
    rc = mix(rc, vec3(0.45, 0.2, 0.06), smoothstep(0.62, 0.8, nC.b) * 0.6);
    alb = mix(alb, rc, t); metal = mix(metal, 0.0, t); rough = mix(rough, 0.9, t); gIrid *= 1.0 - t;
    float halo = smoothstep(0.0, 0.25, vMA.g + brk * 0.3) * (1.0 - t);
    alb *= 1.0 - halo * 0.35; rough = mix(rough, 0.5, halo * 0.5);
  }
#endif
#ifdef O_OLD
  {
    float t = smoothstep(0.1, 0.28, vMA.b + brk * 0.35);
    cO = t;
    float crack = 1.0 - smoothstep(0.0, 0.1, N3(p * 1.5).a);
    alb = mix(alb, alb * uOldT * (1.0 - crack * 0.6), t);
    gCC = mix(gCC, 0.75 * (1.0 - crack), t); gCCR = mix(gCCR, 0.16 + nB.r * 0.2, t); gCCB = t;
    rough = mix(rough, 0.6, t);
  }
#endif
#ifdef F_COAT
  cF = smoothstep(0.1, 0.9, vMA.a + brk * 0.08);
  alb = mix(alb, alb * uFinT, cF);
  gCC = max(gCC, cF); gCCR = mix(gCCR, 0.025 + nC.r * 0.03, cF);
#endif

  // grime sits on top of everything: a thin dulling film, and crusts where it builds up in crevices
  {
    float g = vMA.r * (1.0 + 1.4 * cav);
    float crust = smoothstep(0.5, 0.75, g + brk * 0.35 * min(1.0, vMA.r * 3.0));
    float film = smoothstep(0.02, 0.6, vMA.r + brk * 0.12 * vMA.r);
    vec3 gc = mix(uDirt, uDust, clamp(0.25 + (nD.g - 0.5) * 1.6 + (nA.g - 0.5) * 0.5 - cav * 0.6, 0.0, 1.0)) * (0.85 + 0.3 * nC.b);
    float dull = max(crust, film * 0.6);
    cG = crust;
    alb = mix(alb, gc, max(crust, film * 0.42));
    metal = mix(metal, 0.0, max(crust, film * 0.45));
    rough = mix(rough, 0.85, dull);
    gCC *= 1.0 - max(crust, film * 0.9);
    gIrid *= 1.0 - dull;
    gSheenC *= 1.0 - crust;
#ifdef K_GLASS
    gTrans = 1.0 - max(crust * 0.9, film * 0.5);
#endif
  }

  gAlb = alb; gRough = clamp(rough, 0.02, 1.0); gMetal = clamp(metal, 0.0, 1.0);

  if (uHint > 0.0) {
    float w = max(max(vMA.r - 0.08, vMA.g - 0.08), max(vMA.b - 0.08, vMB.r - 0.1));
    w = max(w, uNeed.x * (0.85 - vMB.g));
    w = max(w, uNeed.y * (0.85 - vMA.a));
    float on = step(0.0, w) * step(0.03, vAO.y) * uNeed.w;
    gEm += uHint * on * vec3(0.08, 0.24, 0.6) * (0.35 + 0.12 * sin(uTime * 5.0));
    gAlb *= 1.0 - uHint * 0.3 * uNeed.w;
  }
}
`;

const L_AO = `
{
  float lao = mix(1.0, vAO.x, uAOK) * (1.0 - gGroove * 0.4);
  reflectedLight.indirectDiffuse *= lao;
  float ldNV = saturate(dot(normal, normalize(vViewPosition)));
  reflectedLight.indirectSpecular *= saturate(pow(ldNV + lao, exp2(-16.0 * material.roughness - 1.0)) - 1.0 + lao);
  reflectedLight.directDiffuse *= mix(1.0, lao, 0.35);
  reflectedLight.directSpecular *= mix(1.0, lao, 0.2);
#ifdef USE_CLEARCOAT
  clearcoatSpecularIndirect *= lao;
#endif
#ifdef USE_SHEEN
  sheenSpecularIndirect *= lao;
#endif
}
`;

const L_MATERIAL = `
#ifdef USE_CLEARCOAT
  material.clearcoat = saturate(gCC);
  material.clearcoatRoughness = clamp(gCCR + geometryRoughness, 0.0525, 1.0);
#endif
#ifdef USE_IRIDESCENCE
  material.iridescence = saturate(gIrid);
  material.iridescenceThickness = gIridT;
#endif
#ifdef USE_SHEEN
  material.sheenColor = gSheenC;
  material.sheenRoughness = clamp(gSheenR, 0.07, 1.0);
#endif
`;

// o: { kind: metal|enamel|glass|wood|felt|paint, col, col2, rough, roughPol, metal, scale, pat, axis, origin, patP,
//      corr: tarnish|rust, old, fin, dirt, dust, finT, oldT, cc, irid, iridT, sheen, ior, thick, map, mapXf, env, aoK }
function layerMat(o) {
  const kind = o.kind || 'metal';
  const defs = { ['K_' + kind.toUpperCase()]: '' };
  if (o.pat) defs['P_' + o.pat.toUpperCase()] = '';
  if (o.corr) defs['C_' + o.corr.toUpperCase()] = '';
  if (o.old) defs.O_OLD = '';
  if (o.fin) defs.F_COAT = '';
  if (o.map) defs.L_MAP = '';
  const m = new THREE.MeshPhysicalMaterial({ roughness: 1, metalness: 0 });
  m.defines = Object.assign({}, m.defines, defs);
  if (kind === 'enamel' || o.fin || o.old || o.cc) m.clearcoat = 1;
  if (o.corr === 'tarnish' || o.irid) { m.iridescence = 1; m.iridescenceIOR = 1.8; }
  if (kind === 'felt' || o.sheen) { m.sheen = 1; m.sheenColor.setRGB(1, 1, 1); }
  if (kind === 'glass') { m.transmission = 1; m.ior = o.ior || 1.5; m.thickness = o.thick || 0.001; }
  m.envMapIntensity = o.env ?? 1;
  const metal = kind === 'metal';
  const U = {
    uNoise: LAYER.noise, uTime: LAYER.time, uHint: LAYER.hint,
    uCol: { value: o.col || lin(0.5, 0.5, 0.5) }, uCol2: { value: o.col2 || lin(0.02, 0.02, 0.02) },
    uDirt: { value: o.dirt || lin(0.075, 0.06, 0.045) }, uDust: { value: o.dust || lin(0.32, 0.29, 0.24) },
    uFinT: { value: o.finT || lin(0.85, 0.7, 0.5) }, uOldT: { value: o.oldT || lin(0.45, 0.28, 0.12) },
    uRough: { value: o.rough ?? (metal ? 0.38 : 0.5) }, uRoughPol: { value: o.roughPol ?? 0.07 },
    uMetal: { value: o.metal ?? (metal ? 1 : 0) }, uScale: { value: o.scale || 100 },
    uAxis: { value: o.axis || V3(0, 0, 1) }, uOrigin: { value: o.origin || V3() },
    uPat: { value: new THREE.Vector4(...(o.patP || [0, 0, 0, 0])) }, uNeed: { value: new THREE.Vector4() },
    uCC: { value: o.cc || 0 }, uIrid: { value: o.irid || 0 }, uIridT: { value: o.iridT || 380 }, uAOK: { value: o.aoK ?? 1 },
    uMap: { value: o.map || null }, uMapXf: { value: new THREE.Vector4(...(o.mapXf || [1, 0, 0, 0])) },
  };
  m.userData.U = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', L_VERT_PARS + 'void main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + L_VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', L_FRAG_PARS + 'void main() {')
      .replace('#include <color_fragment>', 'layerEval();\ndiffuseColor.rgb = gAlb;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = gMetal;')
      .replace('#include <normal_fragment_maps>', `{
        vec3 dpx = dFdx(vOP), dpy = dFdy(vOP);
        float H0 = layerH(vOP);
        normal = lBump(-vViewPosition, normal, vec2(layerH(vOP + dpx) - H0, layerH(vOP + dpy) - H0), faceDirection);
      }`)
      .replace('#include <clearcoat_normal_fragment_begin>', '#include <clearcoat_normal_fragment_begin>\n#ifdef USE_CLEARCOAT\nclearcoatNormal = normalize(mix(clearcoatNormal, normal, gCCB));\n#endif')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gEm;')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n' + L_MATERIAL)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + L_AO)
      .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;', 'material.transmission = transmission * gTrans;'));
  };
  const key = 'layer:' + Object.keys(defs).sort().join(',');
  m.customProgramCacheKey = () => key;
  return m;
}

// a part that is not part of the job (bench, stand, turntable) still uses the layer shader, with fixed masks
function fixedMasks(geom, grime = 0, fin = 0, polish = 1, scratch = 0, corr = 0) {
  const n = geom.attributes.position.count;
  const a = new Uint8Array(n * 4), b = new Uint8Array(n * 4), ao = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    a[i * 4] = grime * 255; a[i * 4 + 1] = corr * 255; a[i * 4 + 3] = fin * 255;
    b[i * 4] = scratch * 255; b[i * 4 + 1] = polish * 255;
    ao[i * 2] = 1; ao[i * 2 + 1] = 0;
  }
  geom.setAttribute('mA', new THREE.BufferAttribute(a, 4, true));
  geom.setAttribute('mB', new THREE.BufferAttribute(b, 4, true));
  geom.setAttribute('aoR', new THREE.BufferAttribute(ao, 2));
  return geom;
}
