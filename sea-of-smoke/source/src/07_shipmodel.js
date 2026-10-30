// ---- 07_shipmodel: procedural ship meshes, sails and flags ----
// Local frame: bow +z, port +x, starboard -x, waterline y = 0. buildShip returns { root, tilt, sails, flags, guns, fires }.
const FLAG_TEX = {};
function flagTex(team) {
  if (FLAG_TEX[team]) return FLAG_TEX[team];
  const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d');
  if (team === 0) {
    g.fillStyle = '#111'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#eee';
    g.beginPath(); g.arc(48, 25, 11, 0, TAU); g.fill(); g.fillRect(42, 30, 12, 9);
    g.fillStyle = '#111'; g.beginPath(); g.arc(44, 24, 3, 0, TAU); g.arc(52, 24, 3, 0, TAU); g.fill(); g.fillRect(46, 34, 1.5, 5); g.fillRect(49.5, 34, 1.5, 5);
    g.strokeStyle = '#eee'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(30, 40); g.lineTo(66, 58); g.moveTo(66, 40); g.lineTo(30, 58); g.stroke();
  } else if (team === 1) {
    g.fillStyle = '#a3151a'; g.fillRect(0, 0, 96, 64);
    g.strokeStyle = '#f2ead8'; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(26, 52); g.quadraticCurveTo(46, 30, 68, 12); g.moveTo(70, 52); g.quadraticCurveTo(50, 30, 28, 12); g.stroke();
    g.fillStyle = '#f2ead8'; g.fillRect(22, 48, 12, 3); g.fillRect(62, 48, 12, 3);
  } else {
    g.fillStyle = '#d8d4c8'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#9a9488'; g.fillRect(0, 26, 96, 12);
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; FLAG_TEX[team] = t; return t;
}

const SAIL_MAT = new THREE.MeshLambertMaterial({ color: 0xe8dfc8, side: THREE.DoubleSide });
const SAIL_MAT_DARK = new THREE.MeshLambertMaterial({ color: 0x5a5148, side: THREE.DoubleSide });
const HULL_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
const HOLE_MAT = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.translate(32, 32);
  g.fillStyle = 'rgba(60,40,22,0.9)'; // splintered rim
  g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = (i % 2 ? 17 : 27) * (0.8 + Math.random() * 0.35); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
  g.fillStyle = '#0a0705'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = 11 + Math.random() * 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
  const t = new THREE.CanvasTexture(c);
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true });
})();
const HOLE_GEO = new THREE.PlaneGeometry(1, 1);

function squareSail(wTop, h, bil) {
  const g = new THREE.PlaneGeometry(1, 1, 4, 4), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5; // v=1 top
    const w = lerp(wTop * 1.12, wTop, v);
    p.setXYZ(i, (u - 0.5) * w, (v - 1) * h, bil * Math.sin(Math.PI * u) * (0.35 + 0.65 * Math.sin(Math.PI * (1 - v) * 0.5 + 0.3)));
  }
  g.computeVertexNormals(); return g;
}
// Fore-and-aft sail in the y-z plane; pts are [z, y] corners: tack (bottom fore), clew (bottom aft), peak, throat.
function aftSail(pts, bil) {
  const g = new THREE.BufferGeometry(), seg = 4, pos = [];
  const P = (u, v) => { // bilinear over quad: 0=throat(top fore),1=peak(top aft),2=clew(bottom aft),3=tack(bottom fore)
    const top = [lerp(pts[0][0], pts[1][0], u), lerp(pts[0][1], pts[1][1], u)], bot = [lerp(pts[3][0], pts[2][0], u), lerp(pts[3][1], pts[2][1], u)];
    return [bil * Math.sin(Math.PI * u) * Math.sin(Math.PI * v), lerp(top[1], bot[1], v), lerp(top[0], bot[0], v)];
  };
  for (let a = 0; a < seg; a++) for (let b = 0; b < seg; b++) {
    const p00 = P(a / seg, b / seg), p10 = P((a + 1) / seg, b / seg), p01 = P(a / seg, (b + 1) / seg), p11 = P((a + 1) / seg, (b + 1) / seg);
    pos.push(...p00, ...p01, ...p10, ...p10, ...p01, ...p11);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

function buildShip(clsId, opt) {
  const C = CLASSES[clsId], L = C.len, B = C.beam, fb = C.fb, dr = C.draft;
  const strake = opt.strake || [0.7, 0.55, 0.2], hullC = [0.17, 0.12, 0.08], bottom = [0.33, 0.17, 0.11];
  const NS = 18, M = 10, parts = [];
  const halfW = (u) => u < 0.5 ? B / 2 * (0.7 + 0.3 * Math.sin(u / 0.5 * Math.PI / 2)) : B / 2 * Math.max(0.03, Math.pow(Math.cos((u - 0.5) / 0.5 * Math.PI / 2), 0.75));
  const deckY = (u) => fb + fb * 0.28 * Math.pow((u - 0.55) / 0.45, 2);
  const keelY = (u) => -dr * (u > 0.82 ? 1 - (u - 0.82) / 0.18 * 0.75 : u < 0.06 ? 0.85 : 1);
  const shape = (t) => t < 0.55 ? Math.pow(Math.sin(t / 0.55 * Math.PI / 2), 0.55) : 1 - 0.1 * Math.pow((t - 0.55) / 0.45, 2);
  const zAt = (u) => -L / 2 + u * L;
  // ---- hull loft ----
  const pos = [], col = [], idx = [], ring = 2 * M + 1;
  for (let s = 0; s <= NS; s++) {
    const u = s / NS, w = halfW(u), dy = deckY(u), ky = keelY(u), z = zAt(u);
    const band = dy - fb * 0.5;
    for (let k = 0; k < ring; k++) {
      const t = k <= M ? 1 - k / M : (k - M) / M, side = k <= M ? 1 : -1;
      const y = lerp(ky, dy, t), x = side * w * shape(t);
      pos.push(x, y, z);
      const c = y < 0.3 ? bottom : Math.abs(y - band) < fb * 0.14 ? strake : hullC;
      col.push(...c);
    }
  }
  for (let s = 0; s < NS; s++) for (let k = 0; k < ring - 1; k++) {
    const a = s * ring + k, b = a + 1, c = a + ring, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  // transom
  const ctr = pos.length / 3; pos.push(0, (keelY(0) + deckY(0)) / 2, zAt(0)); col.push(...hullC);
  for (let k = 0; k < ring - 1; k++) idx.push(ctr, k + 1, k);
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hull.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  hull.setIndex(idx); hull.computeVertexNormals(); parts.push({ geo: hull, color: hullC });
  // deck
  const dp = [], dc = [], di = [];
  for (let s = 0; s <= NS; s++) {
    const u = s / NS, w = halfW(u) * 0.9, y = deckY(u) - 0.7, z = zAt(u);
    dp.push(w, y, z, -w, y, z); dc.push(0.55, 0.42, 0.28, 0.55, 0.42, 0.28);
  }
  for (let s = 0; s < NS; s++) { const a = s * 2, b = a + 1, c = a + 2, d = a + 3; di.push(a, b, c, b, d, c); }
  const deck = new THREE.BufferGeometry(); deck.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); deck.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3)); deck.setIndex(di); deck.computeVertexNormals();
  parts.push({ geo: deck, color: [0.55, 0.42, 0.28] });
  // castles on big ships
  if (C.rig === 'ship') {
    const qh = fb * (C.decks > 1 ? 0.55 : 0.35), ql = L * 0.24;
    parts.push({ geo: new THREE.BoxGeometry(halfW(0.1) * 1.75, qh, ql), color: hullC, m: M4(0, deckY(0.1) + qh / 2 - 0.4, zAt(0) + ql / 2 + 0.3) });
    parts.push({ geo: new THREE.BoxGeometry(halfW(0.1) * 1.6, 0.6, 0.4), color: strake, m: M4(0, deckY(0.1) + qh - 0.6, zAt(0) + 0.2) });
    for (let i = -2; i <= 2; i++) parts.push({ geo: new THREE.BoxGeometry(B * 0.09, qh * 0.35, 0.2), color: [0.85, 0.7, 0.35], m: M4(i * B * 0.13, deckY(0.05) + qh * 0.45, zAt(0) - 0.05) });
    if (C.decks > 1) parts.push({ geo: new THREE.BoxGeometry(halfW(0.8) * 1.6, qh * 0.7, L * 0.14), color: hullC, m: M4(0, deckY(0.8) + qh * 0.3 - 0.4, zAt(0.8)) });
  }
  // ---- gun ports and barrels ----
  const guns = { port: [], star: [], bow: [], stern: [] }, perDeck = Math.ceil(C.guns.side / C.decks);
  const gunDark = [0.06, 0.05, 0.04], iron = [0.14, 0.14, 0.15];
  let placed = 0;
  for (let d = 0; d < C.decks && placed < C.guns.side; d++) {
    const n = Math.min(perDeck, C.guns.side - placed); placed += n;
    for (let i = 0; i < n; i++) {
      const u = lerp(0.16, 0.76, n === 1 ? 0.5 : i / (n - 1)), z = zAt(u);
      const y = deckY(u) - fb * 0.32 - d * 1.75;
      const t = (y - keelY(u)) / (deckY(u) - keelY(u)), x = halfW(u) * shape(clamp(t, 0, 1));
      for (const side of [1, -1]) {
        parts.push({ geo: new THREE.BoxGeometry(0.12, 0.75, 0.85), color: gunDark, m: M4(side * (x + 0.02), y, z) });
        if (L > 25) parts.push({ geo: new THREE.CylinderGeometry(0.16, 0.2, 1.4, 5), color: iron, m: M4(side * (x + 0.4), y, z, 0, 1, 1, 1, 0, Math.PI / 2) });
        (side > 0 ? guns.port : guns.star).push([side * (x + 0.9), y, z]);
      }
    }
  }
  for (let i = 0; i < C.guns.bow; i++) guns.bow.push([(i - (C.guns.bow - 1) / 2) * 1.2, deckY(0.95) - 0.3, zAt(0.97)]);
  for (let i = 0; i < C.guns.stern; i++) guns.stern.push([(i - (C.guns.stern - 1) / 2) * 1.6, deckY(0.02) - 0.5, zAt(0) - 0.5]);
  // ---- masts, yards, bowsprit ----
  // Each mast (with its yards, boom and sails) is its own group pivoting at the deck, so it can be shot away and fall.
  const wood = [0.36, 0.26, 0.16], sailsDef = [], masts = C.rig === 'ship' ? [[0.73, 0.9], [0.5, 1], [0.28, 0.76]] : C.rig === 'brig' ? [[0.66, 0.95], [0.38, 1]] : [[0.6, 1]];
  const rad = 0.18 + L * 0.008, mastParts = [], mastInfo = [];
  masts.forEach(([u, hk], mi) => {
    const z = zAt(u), y0 = deckY(u) - 0.7, H = (C.mastH - fb) * hk, mp = [];
    mastInfo.push({ y0, z, H });
    mp.push({ geo: new THREE.CylinderGeometry(rad * 0.6, rad, H, 6), color: wood, m: M4(0, H / 2, 0) });
    const square = C.rig === 'ship' ? (mi < 2 ? 3 : 2) : C.rig === 'brig' ? (mi === 0 ? 3 : 1) : 1;
    const tiers = [[0.22, 0.45, 1.75], [0.47, 0.71, 1.38], [0.73, 0.9, 0.95]];
    const startTier = C.rig === 'sloop' || (C.rig === 'brig' && mi === 1) ? 1 : 0;
    for (let t = startTier; t < startTier + square && t < 3; t++) {
      const [a, b, wk] = tiers[t], wTop = B * wk * (mi === 2 ? 0.8 : 1) * (C.rig === 'sloop' ? 0.75 : 1);
      mp.push({ geo: new THREE.CylinderGeometry(0.12, 0.12, wTop * 1.1, 4), color: wood, m: M4(0, H * b, rad, 0, 1, 1, 1, 0, Math.PI / 2) });
      sailsDef.push({ mast: mi, kind: 'sq', geo: squareSail(wTop, H * (b - a) * 0.97, wTop * 0.1), x: 0, y: H * b, z: rad + 0.2 });
    }
    // fore-and-aft sails: sloop main, brig main, ship mizzen
    if (C.rig === 'sloop' || (C.rig === 'brig' && mi === 1) || (C.rig === 'ship' && mi === 2)) {
      const boom = Math.min(L * (C.rig === 'sloop' ? 0.5 : 0.3), z - zAt(0) + 2), top = H * (C.rig === 'sloop' ? 0.62 : 0.45);
      sailsDef.push({ mast: mi, kind: 'fa', geo: aftSail([[0, top], [-boom * 0.8, top + H * 0.12], [-boom, 1.5], [0, 1.5]], 0.9), x: 0, y: 0, z: -rad });
      mp.push({ geo: new THREE.CylinderGeometry(0.1, 0.12, boom, 4), color: wood, m: M4(0, 1.5, -boom / 2, 0, 1, 1, 1, Math.PI / 2) });
    }
    if (mi === 0) {
      const bl = L * (C.rig === 'sloop' ? 0.45 : 0.3), bz = zAt(1) - 1;
      parts.push({ geo: new THREE.CylinderGeometry(0.12, rad * 0.8, bl, 5), color: wood, m: M4(0, deckY(1) + bl * 0.15, bz + bl * 0.45, 0, 1, 1, 1, Math.PI / 2 - 0.3) });
      const tipZ = bz + bl * 0.9 - z, tipY = deckY(1) + bl * 0.28 - y0;
      sailsDef.push({ mast: mi, kind: 'jib', geo: aftSail([[0, H * 0.82], [0, H * 0.8], [tipZ * 0.3, 2.2], [tipZ, tipY]], 0.6), x: 0, y: 0, z: rad });
    }
    if (mi === (C.rig === 'ship' ? 1 : 0)) guns.truck = [mi, H + 0.5];
    mastParts.push(mp);
  });
  // stern flagstaff
  parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.08, L * 0.12, 4), color: wood, m: M4(0, deckY(0) + L * 0.06, zAt(0) - 0.4) });

  // Per-ship hull material, so a battered ship can blacken on its own.
  const hullMat = HULL_MAT.clone();
  const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt);
  const hullMesh = new THREE.Mesh(mergeParts(parts), hullMat); tilt.add(hullMesh);
  const mastGroups = mastParts.map((mp, mi) => {
    const g = new THREE.Group(), info = mastInfo[mi]; g.position.set(0, info.y0, info.z);
    g.add(new THREE.Mesh(mergeParts(mp), hullMat)); tilt.add(g);
    return { group: g, H: info.H, fallen: false, fallT: 0, fallDir: 1, mi };
  });
  const sails = sailsDef.map((d) => { const m = new THREE.Mesh(d.geo, SAIL_MAT); m.position.set(d.x, d.y, d.z); m.userData.kind = d.kind; m.userData.mast = d.mast; mastGroups[d.mast].group.add(m); return m; });
  const flags = [];
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map: flagTex(opt.team), side: THREE.DoubleSide }));
  const fs = Math.max(2.4, L * 0.09); fl.scale.set(fs * 1.5, fs, 1); fl.geometry.translate(-0.5, 0, 0);
  fl.position.set(0, guns.truck[1], 0); fl.rotation.y = Math.PI / 2; mastGroups[guns.truck[0]].group.add(fl); flags.push(fl);
  const en = fl.clone(); en.scale.set(fs * 1.8, fs * 1.2, 1); en.position.set(0, deckY(0) + L * 0.11, zAt(0) - 0.4); tilt.add(en); flags.push(en);
  const fires = [[0, deckY(0.8), zAt(0.8)], [0, deckY(0.5), zAt(0.5)], [0, deckY(0.2), zAt(0.2)]];
  // Shot holes: up to 80 dark splintered patches stamped on the hull sides where balls strike.
  const holes = new THREE.InstancedMesh(HOLE_GEO, HOLE_MAT, 80); holes.count = 0; holes.frustumCulled = false; tilt.add(holes);
  // Hull surface x at a given position along the hull (u 0..1, stern to bow) and height y.
  const hullX = (u, y) => { const ky = keelY(u), dy = deckY(u); return halfW(u) * shape(clamp((y - ky) / (dy - ky), 0, 1)); };
  return { root, tilt, hull: hullMesh, hullMat, masts: mastGroups, sails, flags, guns, fires, holes, deckY: deckY(0.5), halfW, hullX };
}
