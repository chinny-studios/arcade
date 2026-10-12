// Iron Saber — breakable buildings (grids of blocks with structural collapse, adapted from Calamity Bay),
// the city of New Haven, the Coalition base and the Dominion outposts.

// Facade styles (the shader draws windows from these).
const ST = { GLASS: 0, OFFICE: 1, APT: 2, HOUSE: 3, IND: 4, BOX: 5, PLAIN: 6, ROCK: 7, MIL: 8, HANGAR: 9 };
const ST_HP = [150, 120, 85, 38, 60, 40, 80, 200, 170, 90];
const ST_RATE = [2600, 2100, 1500, 2200, 600, 900, 1400, 0, 800, 1200]; // $ per m³ of collateral damage

const buildMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
buildMat.onBeforeCompile = (sh) => {
  sh.vertexShader = 'attribute vec4 aInfo;\nvarying vec3 vP; varying vec3 vN2; varying float vSt;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec3 sc_ = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vP = aInfo.xyz + position * sc_; vN2 = normal; vSt = aInfo.w;`);
  sh.fragmentShader = 'varying vec3 vP; varying vec3 vN2; varying float vSt;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float st = floor(vSt + 0.001);
    float dmg = clamp(vSt - st, 0.0, 1.0);
    vec3 N = normalize(vN2);
    vec3 base = diffuseColor.rgb;
    if (abs(N.y) < 0.5) {
      float u = abs(N.x) > 0.5 ? vP.z : vP.x;
      float y = vP.y;
      float fh = 3.6, cs = 3.2; vec2 ww = vec2(0.0);
      if (st < 0.5) { cs = 3.0; ww = vec2(0.86, 0.78); }
      else if (st < 1.5) { cs = 3.6; ww = vec2(0.9, 0.46); }
      else if (st < 2.5) { fh = 3.1; cs = 4.2; ww = vec2(0.42, 0.5); }
      else if (st < 3.5) { fh = 3.2; cs = 4.4; ww = vec2(0.3, 0.42); }
      else if (st < 4.5) { fh = 6.5; cs = 7.0; ww = vec2(0.75, 0.14); base *= 0.9 + 0.1 * step(0.5, fract(u * 0.9)); }
      else if (st < 5.5) { base *= 0.84 + 0.16 * step(0.45, fract(u * 1.5)); }
      else if (st > 7.5 && st < 8.5) { fh = 4.0; cs = 6.0; ww = vec2(0.5, 0.12); base *= 0.92 + 0.08 * step(0.5, fract(y * 0.25)); }
      else if (st > 8.5) { base *= 0.86 + 0.14 * step(0.5, fract(u * 0.7)); }
      if (st < 2.5 && y < 4.6) { fh = 4.6; ww = vec2(0.86, 0.6); }
      if (ww.x > 0.0) {
        vec2 g = vec2(u / cs, y / fh);
        vec2 f = fract(g);
        vec2 fw = fwidth(g) * 1.2;
        vec2 lo = 0.5 - ww * 0.5, hi = 0.5 + ww * 0.5;
        vec2 m = smoothstep(lo - fw, lo + fw, f) * (1.0 - smoothstep(hi - fw, hi + fw, f));
        float win = m.x * m.y;
        float far = clamp(max(fw.x, fw.y) * 1.6 - 0.3, 0.0, 1.0);
        win = mix(win, ww.x * ww.y, far);
        float r = fract(sin(dot(floor(g), vec2(12.9898, 78.233)) + floor(vP.x * 0.01) * 7.0) * 43758.5453);
        vec3 glass = mix(vec3(0.12, 0.2, 0.28), base * 0.5, 0.3) * (0.8 + 0.4 * r);
        if (st < 0.5) glass = mix(vec3(0.24, 0.38, 0.52), base * 0.75, 0.45) * (0.85 + 0.3 * r);
        base = mix(base, glass, win);
        totalEmissiveRadiance += vec3(0.05, 0.07, 0.1) * win * (1.0 - dmg) * step(st, 2.5);
      }
    } else if (N.y > 0.5) base = base * 0.72 + 0.04;
    else base *= 0.4;
    diffuseColor.rgb = mix(base, vec3(0.09, 0.08, 0.075), dmg * 0.85);
  }`);
};
buildMat.customProgramCacheKey = () => 'is-building';

const BLD = [];
const BLK_ = [];       // every block: {x,y,z,hx,hy,hz,hp,max,b,ci,j,alive,vol,w,info:[4],col:[3]}
const STATS = { volTotal: 0, wTotal: 0, wGone: 0, money: 0, blocks: 0, down: 0, kills: 0, lost: 0, cars: 0, trees: 0 };
let staticMesh = null, staticInfo = null, staticDirtyM = false, staticDirtyI = false;
let roofMesh = null, ROOF_GEO = null;
const ROOFS = [];
const dirtyB = [];

// ---------- spatial grid of buildings (whole map) ----------
const BG_CELL = 40, BG_N = 132, BG_OFF = 66;
const BGRID = Array.from({ length: BG_N * BG_N }, () => []);
const bgIdx = (x, z) => {
  const gx = Math.floor(x / BG_CELL) + BG_OFF, gz = Math.floor(z / BG_CELL) + BG_OFF;
  return gx < 0 || gz < 0 || gx >= BG_N || gz >= BG_N ? -1 : gz * BG_N + gx;
};

function makeBuilding(o) {
  const y0 = o.y0 !== undefined ? o.y0 : terrainH(o.x0 + o.nx * o.cw / 2, o.z0 + o.nz * o.cd / 2);
  const b = {
    id: BLD.length, x0: o.x0, z0: o.z0, y0, nx: o.nx, ny: o.ny, nz: o.nz, cw: o.cw, cd: o.cd, ch: o.ch,
    style: o.style, kind: o.kind || 'bld', name: o.name || '', team: o.team || 0,
    cells: new Int32Array(o.nx * o.ny * o.nz).fill(-1), occ0: new Uint8Array(o.nx * o.ny * o.nz),
    layerOrig: new Int32Array(o.ny), layerNow: new Int32Array(o.ny), alive: 0, vol: 0, volLeft: 0, wPer: 1,
    dirty: false, touched: false, down: false, roof: -1, fireT: 0, lastHit: new V3(1, 0, 0),
  };
  b.x1 = b.x0 + b.nx * b.cw; b.z1 = b.z0 + b.nz * b.cd; b.y1 = y0 + b.ny * b.ch;
  const hp = o.hp || ST_HP[o.style];
  for (let j = 0; j < b.ny; j++) for (let k = 0; k < b.nz; k++) for (let i = 0; i < b.nx; i++) {
    if (o.occ && !o.occ(i, j, k)) continue;
    const ci = (j * b.nz + k) * b.nx + i;
    const lx = (i + 0.5) * b.cw, ly = (j + 0.5) * b.ch, lz = (k + 0.5) * b.cd;
    const col = o.color(i, j, k);
    const vol = b.cw * b.ch * b.cd;
    const id = BLK_.length;
    BLK_.push({
      x: b.x0 + lx, y: y0 + ly, z: b.z0 + lz, hx: b.cw / 2, hy: b.ch / 2, hz: b.cd / 2,
      hp, max: hp, b: b.id, ci, j, alive: true, vol, w: 0, info: [lx, ly, lz, o.style], col,
    });
    b.cells[ci] = id; b.occ0[ci] = 1;
    b.layerOrig[j]++; b.layerNow[j]++; b.alive++; b.vol += vol;
  }
  if (!b.alive) return null;
  b.volLeft = b.vol;
  BLD.push(b);
  for (let gx = Math.floor(b.x0 / BG_CELL); gx <= Math.floor((b.x1 - 0.01) / BG_CELL); gx++)
    for (let gz = Math.floor(b.z0 / BG_CELL); gz <= Math.floor((b.z1 - 0.01) / BG_CELL); gz++) {
      const gi = (gz + BG_OFF) * BG_N + gx + BG_OFF;
      if (gi >= 0 && gi < BGRID.length) BGRID[gi].push(b);
    }
  return b;
}

const PAL = {
  glass: [[0.62, 0.67, 0.72], [0.36, 0.46, 0.56], [0.58, 0.52, 0.42], [0.3, 0.33, 0.37], [0.74, 0.76, 0.74], [0.42, 0.55, 0.58]],
  office: [[0.82, 0.78, 0.68], [0.72, 0.72, 0.7], [0.88, 0.86, 0.8], [0.7, 0.62, 0.52], [0.6, 0.64, 0.66]],
  apt: [[0.66, 0.36, 0.28], [0.56, 0.38, 0.3], [0.84, 0.76, 0.62], [0.78, 0.55, 0.45], [0.62, 0.58, 0.5], [0.85, 0.82, 0.74]],
  house: [[0.92, 0.88, 0.76], [0.78, 0.86, 0.9], [0.95, 0.82, 0.7], [0.8, 0.9, 0.78], [0.96, 0.95, 0.9], [0.86, 0.78, 0.86], [0.95, 0.9, 0.62]],
  roof: [[0.55, 0.25, 0.2], [0.35, 0.33, 0.35], [0.45, 0.3, 0.22], [0.3, 0.38, 0.45], [0.5, 0.45, 0.4]],
  ind: [[0.6, 0.62, 0.6], [0.48, 0.56, 0.6], [0.55, 0.6, 0.5], [0.7, 0.66, 0.58]],
  box: [[0.75, 0.2, 0.15], [0.15, 0.35, 0.65], [0.9, 0.55, 0.15], [0.2, 0.55, 0.3], [0.85, 0.82, 0.2], [0.85, 0.85, 0.85], [0.5, 0.25, 0.5]],
  mil: [[0.42, 0.45, 0.33], [0.5, 0.48, 0.38], [0.38, 0.41, 0.34]],
  dom: [[0.36, 0.4, 0.3], [0.44, 0.4, 0.32]],
};
const jit = (c, a = 0.06) => c.map((v) => clamp(v * (1 - a + rand() * a * 2), 0, 1));

// ---------- building recipes ----------
function tower(x0, z0, w, d, h, style, opts = {}) {
  const nx = clamp(Math.round(w / 9), 2, 7), nz = clamp(Math.round(d / 9), 2, 7);
  const ch = 8, ny = Math.max(3, Math.round(h / ch));
  const s1 = rand() < 0.6 ? Math.floor(ny * rr(0.55, 0.75)) : 999;
  const s2 = s1 < 999 && rand() < 0.5 ? Math.floor(lerp(s1, ny, rr(0.4, 0.7))) : 999;
  const base = opts.color || jit(pick(style === ST.GLASS ? PAL.glass : PAL.office));
  const band = rand() < 0.35;
  return makeBuilding({
    x0, z0, nx, nz, ny, cw: w / nx, cd: d / nz, ch, style, kind: 'tower', name: opts.name, hp: opts.hp,
    occ: (i, j, k) => {
      const ins = j >= s2 ? 2 : j >= s1 ? 1 : 0;
      const ix = Math.min(ins, Math.floor((nx - 1) / 2)), iz = Math.min(ins, Math.floor((nz - 1) / 2));
      return i >= ix && i < nx - ix && k >= iz && k < nz - iz;
    },
    color: (i, j) => band && j % 4 === 3 ? base.map((v) => v * 0.8) : base,
  });
}
function midrise(x0, z0, w, d, h, style) {
  const nx = clamp(Math.round(w / 8), 2, 6), nz = clamp(Math.round(d / 8), 2, 6);
  const ch = style === ST.APT ? 6.2 : 7.2, ny = Math.max(2, Math.round(h / ch));
  const base = jit(pick(style === ST.APT ? PAL.apt : PAL.office));
  const lShape = rand() < 0.3 && nx >= 3 && nz >= 3, cut = ri(0, 3), cutH = ri(1, ny - 1);
  return makeBuilding({
    x0, z0, nx, nz, ny, cw: w / nx, cd: d / nz, ch, style, kind: 'mid',
    occ: (i, j, k) => {
      if (!lShape || j < cutH) return true;
      const hi = i >= nx / 2, hk = k >= nz / 2;
      return !(hi === !!(cut & 1) && hk === !!(cut & 2));
    },
    color: (i, j) => j === 0 && style === ST.APT ? base.map((v) => v * 0.85) : base,
  });
}
function house(x0, z0, w, d) {
  const two = rand() < 0.35;
  const base = jit(pick(PAL.house), 0.04);
  const b = makeBuilding({ x0, z0, nx: 1, nz: 1, ny: two ? 2 : 1, cw: w, cd: d, ch: two ? 3.1 : 3.6, style: ST.HOUSE, kind: 'house', color: () => base });
  if (b) {
    const along = w > d ? 0 : 1;
    ROOFS.push({ b: b.id, x: x0 + w / 2, y: b.y1, z: z0 + d / 2, w: (along ? d : w) + 1.0, d: (along ? w : d) + 1.0, h: Math.min(w, d) * 0.38, rot: along ? Math.PI / 2 : 0, col: jit(pick(PAL.roof)), alive: true });
    b.roof = ROOFS.length - 1;
  }
  return b;
}
function warehouse(x0, z0, w, d, h = 12) {
  const nx = clamp(Math.round(w / 10), 2, 8), nz = clamp(Math.round(d / 10), 2, 6);
  const base = jit(pick(PAL.ind));
  return makeBuilding({ x0, z0, nx, nz, ny: 2, cw: w / nx, cd: d / nz, ch: h / 2, style: ST.IND, kind: 'warehouse', color: () => base });
}
function containers(x0, z0, rows, len, y0) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < len; c++) {
    if (rand() < 0.12) continue;
    const n = ri(1, 4);
    makeBuilding({ x0: x0 + c * 13, z0: z0 + r * 3.4, y0, nx: 1, nz: 1, ny: n, cw: 12.2, cd: 2.44, ch: 2.6, style: ST.BOX, kind: 'box', color: () => jit(pick(PAL.box), 0.05) });
  }
}
function tank(cx, cz, r, h, col = [0.88, 0.88, 0.85]) {
  const n = 3, cw = (r * 2) / n;
  return makeBuilding({
    x0: cx - r, z0: cz - r, nx: n, nz: n, ny: Math.max(1, Math.round(h / 6)), cw, cd: cw, ch: h / Math.max(1, Math.round(h / 6)), style: ST.PLAIN, kind: 'tank', hp: 50,
    occ: (i, j, k) => !((i === 0 || i === 2) && (k === 0 || k === 2)), color: () => col,
  });
}
function stack(x0, z0, h) {
  const red = [0.75, 0.22, 0.18], white = [0.9, 0.9, 0.88];
  return makeBuilding({ x0, z0, nx: 1, nz: 1, ny: Math.round(h / 6), cw: 5, cd: 5, ch: 6, style: ST.PLAIN, kind: 'stack', hp: 70, color: (i, j) => (j > Math.round(h / 6) - 3 && j % 2 ? red : white) });
}
function radioTower(x0, z0, h, name, team = 0) {
  const red = [0.85, 0.2, 0.15], white = [0.93, 0.93, 0.9], dark = [0.32, 0.34, 0.3];
  const ny = Math.round(h / 6);
  return makeBuilding({
    x0, z0, nx: 3, nz: 3, ny, cw: 4, cd: 4, ch: 6, style: ST.PLAIN, kind: 'radio', name, hp: 90, team,
    occ: (i, j, k) => j < 2 || (i === 1 && k === 1) || (j === ny - 3 && (i === 1 || k === 1)),
    color: (i, j) => (j < 2 ? [0.6, 0.6, 0.58] : team ? (j % 4 < 2 ? dark : red) : Math.floor(j / 2) % 2 ? red : white),
  });
}
function hqTower(x0, z0) {
  const cream = [0.88, 0.89, 0.92], blue = [0.25, 0.4, 0.72], gold = [0.85, 0.7, 0.3];
  return makeBuilding({
    x0, z0, nx: 5, nz: 5, ny: 30, cw: 9, cd: 9, ch: 8, style: ST.GLASS, kind: 'tower', name: 'Coalition HQ', hp: 190,
    occ: (i, j, k) => {
      if (j < 18) return true;
      if (j < 26) return i >= 1 && i <= 3 && k >= 1 && k <= 3;
      return i === 2 && k === 2;
    },
    color: (i, j, k) => (j === 17 || j === 25 ? gold : j >= 26 ? blue : (i === 0 || i === 4) && (k === 0 || k === 4) ? blue : cream),
  });
}
function hangar(x0, z0, w, d, h, y0) {
  const base = [0.62, 0.64, 0.66];
  return makeBuilding({ x0, z0, y0, nx: Math.round(w / 10), nz: Math.round(d / 10), ny: 3, cw: w / Math.round(w / 10), cd: d / Math.round(d / 10), ch: h / 3, style: ST.HANGAR, kind: 'hangar', color: (i, j) => (j === 2 ? [0.5, 0.52, 0.55] : base) });
}
function gantry(x0, z0, y0) {
  const yel = [0.88, 0.7, 0.18], grey = [0.45, 0.47, 0.5];
  return makeBuilding({
    x0, z0, y0, nx: 7, nz: 1, ny: 6, cw: 4.5, cd: 4, ch: 4.2, style: ST.PLAIN, kind: 'gantry', hp: 60,
    occ: (i, j) => i === 0 || i === 6 || j === 5 || (j === 3 && (i === 1 || i === 5)), color: (i, j) => (j === 5 ? yel : grey),
  });
}
function bunker(x0, z0, w, d, h, y0, team = 1, name) {
  const base = jit(pick(team ? PAL.dom : PAL.mil), 0.04);
  return makeBuilding({ x0, z0, y0, nx: Math.max(1, Math.round(w / 8)), nz: Math.max(1, Math.round(d / 8)), ny: Math.max(1, Math.round(h / 4.5)), cw: w / Math.max(1, Math.round(w / 8)), cd: d / Math.max(1, Math.round(d / 8)), ch: h / Math.max(1, Math.round(h / 4.5)), style: ST.MIL, kind: 'bunker', team, name, color: () => base });
}

// ---------- city plan ----------
const LOTS = [];
function planCity() {
  const inset = ROAD_HW + WALK_W;
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
    const x0 = -CITY_HALF + i * BLOCK + inset, z0 = -CITY_HALF + j * BLOCK + inset;
    const x1 = x0 + BLOCK - inset * 2, z1 = z0 + BLOCK - inset * 2;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = Math.hypot(cx, cz);
    let kind;
    if (i === 5 && j === 4) kind = 'hq';
    else if ((i === 3 && j === 5) || (i === 6 && j === 7)) kind = 'park';
    else if (r < 270) kind = 'downtown';
    else if (r < 480) kind = 'midtown';
    else if (cx > 330 && cz < 500) kind = 'industrial';
    else if (r > 760) kind = 'suburb';
    else kind = 'residential';
    LOTS.push({ i, j, x0, z0, x1, z1, cx, cz, kind });
  }
}
function fillLot(L) {
  const { x0, z0, x1, z1 } = L, W = x1 - x0, D = z1 - z0;
  if (L.kind === 'hq') { hqTower(L.cx - 22.5, L.cz - 22.5); return; }
  if (L.kind === 'park') {
    for (let k = 0; k < 40; k++) {
      const x = rr(x0 + 4, x1 - 4), z = rr(z0 + 4, z1 - 4);
      const px = x - L.cx, pz = z - L.cz;
      if (Math.hypot(px, pz) < 28 || Math.abs(Math.abs(px) - Math.abs(pz)) < 6) continue;
      addTree(x, z, rand() < 0.2 ? 0 : 1, rr(9, 15));
    }
    return;
  }
  if (L.kind === 'downtown') {
    const r = rand();
    if (r < 0.3) {
      const w = rr(54, 72), d = rr(54, 72);
      tower(L.cx - w / 2, L.cz - d / 2, w, d, rr(150, 262), rand() < 0.6 ? ST.GLASS : ST.OFFICE);
    } else if (r < 0.65) {
      const alongX = rand() < 0.5;
      for (let s = 0; s < 2; s++) {
        const w = rr(34, 44), d = rr(40, 52), h = rr(90, 210);
        const cx = alongX ? x0 + W * (s ? 0.75 : 0.25) : L.cx, cz = alongX ? L.cz : z0 + D * (s ? 0.75 : 0.25);
        tower(cx - (alongX ? w : d) / 2, cz - (alongX ? d : w) / 2, alongX ? w : d, alongX ? d : w, h, rand() < 0.55 ? ST.GLASS : ST.OFFICE);
      }
    } else {
      for (let s = 0; s < 4; s++) {
        const cx = x0 + W * (s & 1 ? 0.75 : 0.25), cz = z0 + D * (s & 2 ? 0.75 : 0.25);
        const w = rr(30, 40), d = rr(30, 40);
        tower(cx - w / 2, cz - d / 2, w, d, rr(55, 150), rand() < 0.5 ? ST.GLASS : ST.OFFICE);
      }
    }
    return;
  }
  if (L.kind === 'midtown') {
    for (let s = 0; s < 4; s++) {
      const cx = x0 + W * (s & 1 ? 0.75 : 0.25), cz = z0 + D * (s & 2 ? 0.75 : 0.25);
      if (rand() < 0.1) { for (let t = 0; t < 5; t++) addTree(cx + rr(-16, 16), cz + rr(-16, 16), 1, rr(8, 12)); continue; }
      const w = rr(30, 44), d = rr(30, 44);
      midrise(cx - w / 2, cz - d / 2, w, d, rr(20, 72), rand() < 0.5 ? ST.APT : ST.OFFICE);
    }
    streetTrees(L, 22);
    return;
  }
  if (L.kind === 'residential' || L.kind === 'suburb') {
    const n = L.kind === 'suburb' ? 3 : 4, pw = W / n, pd = D / n;
    for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) {
      const cx = x0 + pw * (a + 0.5), cz = z0 + pd * (c + 0.5);
      const edge = a === 0 || c === 0 || a === n - 1 || c === n - 1;
      if (L.kind === 'residential' && edge && rand() < 0.25) {
        midrise(cx - pw * 0.42, cz - pd * 0.42, pw * 0.84, pd * 0.84, rr(12, 24), ST.APT);
        continue;
      }
      if (!edge && rand() < 0.35) { for (let t = 0; t < 3; t++) addTree(cx + rr(-8, 8), cz + rr(-8, 8), 1, rr(7, 11)); continue; }
      const w = rr(10, 14), d = rr(9, 13);
      house(cx - w / 2 + rr(-2, 2), cz - d / 2 + rr(-2, 2), w, d);
      if (rand() < (L.kind === 'suburb' ? 0.8 : 0.35)) addTree(cx + (rand() < 0.5 ? -1 : 1) * rr(8, 11), cz + rr(-7, 7), 1, rr(7, 11));
    }
    return;
  }
  if (L.kind === 'industrial') {
    const mode = (L.i + L.j) % 3;
    if (mode === 0) {
      warehouse(x0 + 4, z0 + 4, W - 8, rr(36, 46), rr(11, 16));
      containers(x0 + 6, z1 - 30, 7, Math.floor((W - 12) / 13));
    } else if (mode === 1) {
      warehouse(x0 + 4, z0 + 4, rr(40, 50), D - 8, rr(12, 18));
      tank(x1 - 22, z0 + 22, 12, rr(14, 22)); tank(x1 - 22, z1 - 22, 12, rr(14, 22));
      stack(x1 - 50, L.cz - 2, rr(48, 66));
    } else {
      containers(x0 + 4, z0 + 4, 14, Math.floor((W - 8) / 13));
      tank(x1 - 18, z1 - 18, 10, 16, [0.85, 0.85, 0.82]);
    }
  }
}
function streetTrees(L, step) {
  for (let x = L.x0 + 8; x < L.x1 - 4; x += step) { addTree(x, L.z0 - 2.5, 1, rr(7, 9)); addTree(x, L.z1 + 2.5, 1, rr(7, 9)); }
}

// ---------- sites outside the city ----------
const BAYS = [-150, -50, 50, 150].map((dx) => ({ x: BASE.x + dx, z: BASE.z - 40 }));
let RELAY = null;
const OUTPOST_B = [];
function buildSites() {
  const by = SITES.base.h;
  for (const b of BAYS) gantry(b.x - 15.75, b.z - 30, by);
  hangar(-210, BASE.z + 50, 90, 60, 30, by);
  hangar(-80, BASE.z + 60, 70, 50, 26, by);
  hangar(120, BASE.z + 50, 90, 60, 30, by);
  radioTower(215, BASE.z - 120, 48, 'Base Tower');
  bunker(170, BASE.z - 130, 30, 20, 9, by, 0);
  tank(-220, BASE.z - 110, 9, 14); tank(-195, BASE.z - 110, 9, 14);
  // Dominion desert outpost
  const O = SITES.outpost, oy = O.h;
  OUTPOST_B.push(bunker(O.x - 70, O.z - 40, 26, 18, 9, oy, 1, 'Dominion Bunker'));
  OUTPOST_B.push(bunker(O.x + 40, O.z - 60, 22, 22, 9, oy, 1, 'Dominion Bunker'));
  OUTPOST_B.push(bunker(O.x - 20, O.z + 50, 34, 16, 13.5, oy, 1, 'Dominion Command Post'));
  radioTower(O.x + 10, O.z - 5, 54, 'Outpost Mast', 1);
  tank(O.x + 80, O.z + 40, 8, 12, [0.5, 0.48, 0.38]); tank(O.x + 100, O.z + 60, 8, 12, [0.5, 0.48, 0.38]);
  containers(O.x - 110, O.z + 80, 3, 4, oy);
  // the mountain relay
  const R = SITES.relay;
  RELAY = radioTower(R.x - 6, R.z - 6, 84, 'Dominion Relay', 1);
  bunker(R.x - 50, R.z + 20, 20, 14, 9, R.h, 1);
  bunker(R.x + 30, R.z - 40, 16, 16, 9, R.h, 1);
  // forest clearing camp
  const C = SITES.clearing;
  bunker(C.x - 30, C.z - 20, 18, 10, 4.5, C.h, 1);
  bunker(C.x + 20, C.z + 15, 14, 10, 4.5, C.h, 1);
  // east depot and the scrap yard
  const D = SITES.depot;
  warehouse(D.x - 60, D.z - 70, 50, 34, 14);
  containers(D.x + 10, D.z - 70, 6, 3, D.h);
  const Y = SITES.yard;
  containers(Y.x - 70, Y.z - 60, 10, 4, Y.h);
  bunker(Y.x + 30, Y.z - 60, 30, 18, 9, Y.h, 0);
}

function genCity() {
  planCity();
  for (const L of LOTS) fillLot(L);
  buildSites();
  for (const b of BLD) b.wPer = Math.pow(b.vol, -0.2);
  for (const k of BLK_) { k.w = k.vol * BLD[k.b].wPer; STATS.wTotal += k.w; STATS.volTotal += k.vol; }
  const n = BLK_.length;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  staticInfo = new Float32Array(n * 4);
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(staticInfo, 4));
  staticMesh = new THREE.InstancedMesh(geo, buildMat, n);
  staticMesh.frustumCulled = false;
  staticMesh.castShadow = true; staticMesh.receiveShadow = true;
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const k = BLK_[i];
    _m4.makeScale(k.hx * 2, k.hy * 2, k.hz * 2).setPosition(k.x, k.y, k.z);
    staticMesh.setMatrixAt(i, _m4);
    staticMesh.setColorAt(i, c.setRGB(k.col[0], k.col[1], k.col[2]));
    staticInfo.set(k.info, i * 4);
  }
  scene.add(staticMesh);
  // gabled roofs for houses
  const rg = new THREE.BufferGeometry();
  const P = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, 0.5,
    -0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, 0.5, -0.5, 0, 0.5,
    0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5];
  rg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  rg.computeVertexNormals();
  ROOF_GEO = rg;
  roofMesh = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, ROOFS.length));
  roofMesh.castShadow = true; roofMesh.receiveShadow = true; roofMesh.frustumCulled = false;
  ROOFS.forEach((r, i) => {
    _m4.compose(_v1.set(r.x, r.y, r.z), _q1.setFromAxisAngle(UP, r.rot), _v2.set(r.w, r.h, r.d));
    roofMesh.setMatrixAt(i, _m4);
    roofMesh.setColorAt(i, c.setRGB(...r.col));
  });
  scene.add(roofMesh);
}

// ---------- queries ----------
let bStamp = 1;
function staticAt(x, y, z) {
  const gi = bgIdx(x, z);
  if (gi < 0) return -1;
  for (const b of BGRID[gi]) {
    if (x < b.x0 || x >= b.x1 || z < b.z0 || z >= b.z1 || y >= b.y1 || y < b.y0 || !b.alive) continue;
    const i = ((x - b.x0) / b.cw) | 0, k = ((z - b.z0) / b.cd) | 0, j = ((y - b.y0) / b.ch) | 0;
    const id = b.cells[(j * b.nz + k) * b.nx + i];
    if (id >= 0) return id;
  }
  return -1;
}
// Visit each live block overlapping the box. fn(blockId)
function blocksInBox(x0, y0, z0, x1, y1, z1, fn) {
  const stamp = ++bStamp;
  for (let gx = Math.floor(x0 / BG_CELL); gx <= Math.floor(x1 / BG_CELL); gx++)
    for (let gz = Math.floor(z0 / BG_CELL); gz <= Math.floor(z1 / BG_CELL); gz++) {
      if (gx + BG_OFF < 0 || gz + BG_OFF < 0 || gx + BG_OFF >= BG_N || gz + BG_OFF >= BG_N) continue;
      for (const b of BGRID[(gz + BG_OFF) * BG_N + gx + BG_OFF]) {
        if (b._s === stamp || !b.alive) continue;
        b._s = stamp;
        if (x1 < b.x0 || x0 > b.x1 || z1 < b.z0 || z0 > b.z1 || y0 > b.y1 || y1 < b.y0) continue;
        const i0 = clamp(Math.floor((x0 - b.x0) / b.cw), 0, b.nx - 1), i1 = clamp(Math.floor((x1 - b.x0) / b.cw), 0, b.nx - 1);
        const k0 = clamp(Math.floor((z0 - b.z0) / b.cd), 0, b.nz - 1), k1 = clamp(Math.floor((z1 - b.z0) / b.cd), 0, b.nz - 1);
        const j0 = clamp(Math.floor((y0 - b.y0) / b.ch), 0, b.ny - 1), j1 = clamp(Math.floor((y1 - b.y0) / b.ch), 0, b.ny - 1);
        for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
          const id = b.cells[(j * b.nz + k) * b.nx + i];
          if (id >= 0) fn(id);
        }
      }
    }
}
// Visit each live block whose box comes within r of (cx,cy,cz). fn(blockId, dist)
function blocksInSphere(cx, cy, cz, r, fn) {
  blocksInBox(cx - r, cy - r, cz - r, cx + r, cy + r, cz + r, (id) => {
    const B = BLK_[id];
    const dx = Math.max(Math.abs(cx - B.x) - B.hx, 0), dy = Math.max(Math.abs(cy - B.y) - B.hy, 0), dz = Math.max(Math.abs(cz - B.z) - B.hz, 0);
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d <= r) fn(id, d);
  });
}
const hasBuildings = (x, z) => { const gi = bgIdx(x, z); return gi >= 0 && BGRID[gi].length > 0; };

// ---------- damage ----------
let frameCrumble = 0;
function setTint(id) {
  const B = BLK_[id];
  staticInfo[id * 4 + 3] = B.info[3] + clamp(1 - B.hp / B.max, 0, 1) * 0.85;
  staticDirtyI = true;
}
function damageBlock(id, dmg, ix, iy, iz, split) {
  const B = BLK_[id];
  if (!B.alive) return false;
  B.hp -= dmg;
  const b = BLD[B.b];
  if (ix || iz) b.lastHit.set(ix, 0, iz).normalize();
  if (!b.touched) firstDamage(b);
  if (B.hp <= 0) { detachBlock(id, ix, iy, iz, split); return true; }
  setTint(id);
  return false;
}
// Area damage to buildings, falling off with distance; returns blocks destroyed.
function blastBuildings(x, y, z, r, dmg) {
  let n = 0;
  blocksInSphere(x, y, z, r, (id, d) => {
    const B = BLK_[id];
    const k = 1 - d / r;
    _v4.set(B.x - x, B.y - y, B.z - z).normalize().multiplyScalar(4 + 10 * k);
    if (damageBlock(id, dmg * (0.35 + 0.65 * k), _v4.x, Math.max(_v4.y, 1), _v4.z, k > 0.5)) n++;
  });
  return n;
}
function firstDamage(b) {
  b.touched = true;
  if (b.roof >= 0) {
    const r = ROOFS[b.roof];
    if (r.alive) {
      r.alive = false;
      roofMesh.setMatrixAt(b.roof, ZERO_M); roofMesh.instanceMatrix.needsUpdate = true;
      spawnRoof(r);
    }
  }
}
function removeStatic(id) {
  const B = BLK_[id], b = BLD[B.b];
  B.alive = false;
  b.cells[B.ci] = -1; b.layerNow[B.j]--; b.alive--; b.volLeft -= B.vol;
  staticMesh.setMatrixAt(id, ZERO_M); staticDirtyM = true;
  STATS.wGone += B.w; STATS.money += B.vol * ST_RATE[B.info[3] | 0]; STATS.blocks++;
  if (!b.down && b.volLeft < b.vol * 0.3) { b.down = true; STATS.down++; onBuildingDown(b); }
  if (!b.dirty) { b.dirty = true; dirtyB.push(b); }
  if (!b.touched) firstDamage(b);
  if (b.roof >= 0 && ROOFS[b.roof].alive) firstDamage(b);
  wakeNear(B.x, B.y + B.hy, B.z, Math.max(B.hx, B.hz) * 1.6);
  frameCrumble += B.vol;
}
function detachBlock(id, ix = 0, iy = 0, iz = 0, split = false) {
  const B = BLK_[id];
  if (!B.alive) return;
  removeStatic(id);
  const big = B.hx * B.hy * B.hz > 30;
  if (split && big) {
    const ax = B.hx >= B.hz ? 0 : 2;
    for (let s = -1; s <= 1; s += 2) for (let t = -1; t <= 1; t += 2) {
      const off = [0, 0, 0], h = [B.hx, B.hy / 2, B.hz];
      off[1] = t * B.hy / 2;
      if (ax === 0) { h[0] = B.hx / 2; off[0] = s * B.hx / 2; } else { h[2] = B.hz / 2; off[2] = s * B.hz / 2; }
      spawnBlockBody(B, off, h, ix + off[0] / B.hx * 3 + frand(-2, 2), iy + frand(0, 4), iz + off[2] / B.hz * 3 + frand(-2, 2), 30);
    }
  } else {
    spawnBlockBody(B, [0, 0, 0], [B.hx, B.hy, B.hz], ix + frand(-1, 1), iy, iz + frand(-1, 1), big ? 0 : 40);
  }
  if (Math.random() < 0.6) dustAt(B.x, B.y, B.z, Math.max(B.hx, B.hy, B.hz) * 1.6, 2);
  if (Math.random() < 0.35) sparkBurst(B.x, B.y, B.z, 3);
}

// ---------- structural checks ----------
function processDirty() {
  let n = 0;
  while (dirtyB.length && n < 6) {
    const b = dirtyB.shift();
    b.dirty = false;
    checkBuilding(b);
    n++;
  }
}
function checkBuilding(b) {
  if (b.alive <= 0) return;
  let above = b.alive;
  for (let j = 0; j < b.ny; j++) {
    const now = b.layerNow[j], orig = b.layerOrig[j];
    above -= now;
    if (orig === 0 || above <= 0) continue;
    const r = now / orig;
    if (r < 0.34 || (r <= 0.5 && above > now * 5)) { collapseFrom(b, j); return; }
  }
  // connectivity to the ground through face-adjacent blocks
  const { nx, ny, nz, cells } = b, N = cells.length;
  const seen = new Uint8Array(N), q = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let c = 0; c < nx * nz; c++) if (cells[c] >= 0) { seen[c] = 1; q[qt++] = c; }
  while (qh < qt) {
    const c = q[qh++], i = c % nx, k = ((c / nx) | 0) % nz, j = (c / (nx * nz)) | 0;
    const nb = [i > 0 ? c - 1 : -1, i < nx - 1 ? c + 1 : -1, k > 0 ? c - nx : -1, k < nz - 1 ? c + nx : -1, j > 0 ? c - nx * nz : -1, j < ny - 1 ? c + nx * nz : -1];
    for (const d of nb) if (d >= 0 && !seen[d] && cells[d] >= 0) { seen[d] = 1; q[qt++] = d; }
  }
  const loose = [];
  for (let c = 0; c < N; c++) if (cells[c] >= 0 && !seen[c]) loose.push(cells[c]);
  if (!loose.length) return;
  if (loose.length >= 6) makeFalling(b, loose, b.lastHit, 0.15);
  else for (const id of loose) detachBlock(id, frand(-1, 1), 0, frand(-1, 1));
}
function collapseFrom(b, j) {
  const { nx, nz, cells } = b;
  let ox = 0, oz = 0, on = 0, rx = 0, rz = 0, rn = 0;
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const c = (j * nz + k) * nx + i;
    if (b.occ0[c]) { ox += i; oz += k; on++; }
    if (cells[c] >= 0) { rx += i; rz += k; rn++; }
  }
  const dir = new V3(0, 0, 0);
  if (rn && on) dir.set(ox / on - rx / rn, 0, oz / on - rz / rn);
  dir.multiplyScalar(2).add(b.lastHit);
  if (dir.lengthSq() < 0.01) dir.set(frand(-1, 1), 0, frand(-1, 1));
  dir.normalize();
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) {
    const id = cells[(j * nz + k) * nx + i];
    if (id >= 0) detachBlock(id, dir.x * 3 + frand(-2, 2), 0, dir.z * 3 + frand(-2, 2), true);
  }
  const sec = [];
  for (let c = (j + 1) * nx * nz; c < cells.length; c++) if (cells[c] >= 0) sec.push(cells[c]);
  if (sec.length >= 4) makeFalling(b, sec, dir, 0.32);
  else for (const id of sec) detachBlock(id, dir.x * 2, 0, dir.z * 2);
  if (sec.length > 20) collapseRumble(b, sec.length);
}
function makeFalling(b, ids, dir, tip) {
  for (const id of ids) removeStatic(id);
  spawnCompound(ids, dir, tip);
}

// ---------- fires and smoke on damaged buildings ----------
function updateBuildingFires(dt) {
  for (const b of BLD) {
    if (!b.touched || b.alive <= 0) continue;
    const dmg = 1 - b.volLeft / b.vol;
    if (dmg < 0.12) continue;
    b.fireT -= dt;
    if (b.fireT > 0) continue;
    b.fireT = rr(4, 9) / (0.5 + dmg);
    for (let t = 0; t < 6; t++) {
      const id = b.cells[Math.floor(Math.random() * b.cells.length)];
      if (id < 0) continue;
      const B = BLK_[id];
      addEmitter({ kind: 'fire', x: B.x + frand(-B.hx, B.hx), y: B.y, z: B.z + frand(-B.hz, B.hz), life: rr(14, 30), block: id, size: Math.max(B.hx, B.hz) });
      break;
    }
  }
}
