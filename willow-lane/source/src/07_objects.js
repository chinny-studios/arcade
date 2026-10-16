// Willow Lane — object instances on the lot: placement rules, footprints, use spots (stand, sit, lie), items, thumbnails

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // front direction for rotation r
const OCC = new Int32Array(LOT_W * LOT_D);      // id of the blocking object on each tile

function footprint(def, r) { return r % 2 ? [def.d, def.w] : [def.w, def.d]; }
// local continuous coords (origin at footprint centre, +z = front) -> world
function localToWorld(o, lx, lz) {
  const [W, D] = footprint(o.def, o.r), a = o.r * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
  return [o.x + W / 2 + lx * c + lz * s, o.z + D / 2 - lx * s + lz * c];
}
const worldAngle = (o, la) => la + o.r * Math.PI / 2;
function objTiles(o) { const [W, D] = footprint(o.def, o.r), t = []; for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) t.push([o.x + i, o.z + j]); return t; }
const objCenter = (o) => localToWorld(o, 0, 0);
const blocks = (def) => !def.noblock && !def.wall;
function rebuildOcc() { OCC.fill(0); for (const o of G.objects) if (blocks(o.def)) for (const [x, z] of objTiles(o)) if (inLot(x, z)) OCC[tidx(x, z)] = o.id; NAV.dirty = true; }
const objById = (id) => G.objects.find((o) => o.id === id);
const occAt = (x, z) => (inLot(x, z) ? OCC[tidx(x, z)] : 0);

// the wall edge behind a wall-mounted object at tile x,z with rotation r (its back faces -front)
function wallBehind(x, z, r) { const [dx, dz] = DIRS[r]; return edgeOf(x, z, x - dx, z - dz); }

function canPlace(def, x, z, r, ignore) {
  const [W, D] = footprint(def, r);
  for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
    const tx = x + i, tz = z + j;
    if (!inLot(tx, tz)) return 'Must be on the lot';
    for (const o of G.objects) {
      if (o === ignore) continue;
      const hit = objTiles(o).some(([ox, oz]) => ox === tx && oz === tz);
      if (!hit) continue;
      if (def.wall && o.def.wall && o.r === r) return 'Something already hangs here';
      if (def.wall || o.def.wall) continue;
      if (def.flat && o.def.flat) return 'Already a rug here';
      if (def.flat || o.def.flat) continue;
      return 'Something is in the way';
    }
    // no wall may cut through the footprint
    if (i < W - 1 && wallGet('v', tx + 1, tz)) return 'A wall is in the way';
    if (j < D - 1 && wallGet('h', tx, tz + 1)) return 'A wall is in the way';
  }
  if (def.wall) { const e = wallBehind(x, z, r); const w = e && wallGet(e[0], e[1], e[2]); if (!w || w.open) return 'Needs a plain wall behind it'; }
  if (def.outdoorOnly && roomAt(x + 0.5, z + 0.5) > 0) return 'Must go outdoors';
  if (blocks(def)) for (const s of G.sims) if (s.onLot && s.posture === 'stand' && !s.away) { const sx = Math.floor(s.x), sz = Math.floor(s.z); if (sx >= x && sx < x + W && sz >= z && sz < z + D && s.busy) return 'A sim is using this spot'; }
  return null;
}

function placeObject(type, x, z, r, opts = {}) {
  const def = CAT[type];
  const o = { id: opts.id || newId(), type, def, x, z, r, users: {}, dirt: 0, broken: false, water: 100, dead: false, trash: 0, on: false,
    price: opts.price != null ? opts.price : def.price, boughtDay: opts.boughtDay != null ? opts.boughtDay : dayNum(), fish: 100 };
  if (opts.state) Object.assign(o, opts.state);
  G.objects.push(o);
  if (def.wall) { const e = wallBehind(x, z, r); o.wallKey = e ? wkey(e[0], e[1], e[2]) : ''; }
  makeObjectModel(o);
  o.room = roomAt(x + 0.5, z + 0.5);
  rebuildOcc();
  return o;
}
function makeObjectModel(o) {
  if (o.model) R.scene.remove(o.model);
  const m = buildObjectModel(o.type);
  const [cx, cz] = objCenter(o);
  m.position.set(cx, 0, cz); m.rotation.y = o.r * Math.PI / 2;
  m.userData.pick = { type: 'obj', obj: o };
  m.traverse((c) => { if (c.userData.screen) o.screen = c; if (c.userData.lampShade) o.shade = c; if (c.userData.flag) o.flag = c; if (c.userData.canvas) o.canvasMesh = c; });
  R.scene.add(m);
  o.model = m;
  applyObjectLook(o);
}
// tint dead plants, dim broken screens
function applyObjectLook(o) {
  if (!o.model) return;
  if (o.def.plant) o.model.traverse((c) => { if (c.userData.leaf) { if (!c.userData.baseMat) c.userData.baseMat = c.material; c.material = o.dead ? mat(0x8a6a3a) : o.water < 30 ? mat(0x7a8a3a) : c.userData.baseMat; } });
}
function removeObject(o) {
  G.objects = G.objects.filter((x) => x !== o);
  if (o.model) R.scene.remove(o.model);
  for (const id of Object.values(o.users)) { const s = simById(id); if (s) cancelAll(s); }
  rebuildOcc();
}
function sellValue(o) { return Math.round(o.price * (o.boughtDay === dayNum() ? 1 : o.broken ? 0.4 : 0.8)); }

// ---------- use spots ----------
// Is (tx,tz) a tile a sim can stand on and step from toward (fx,fz)?
function standable(tx, tz) { return NAV.walk(tx, tz); }
function adjacentOpen(ax, az, bx, bz) {
  // tiles must be 8-neighbours with no wall between them
  const dx = bx - ax, dz = bz - az;
  if (Math.abs(dx) + Math.abs(dz) === 1) return edgeOpen(ax, az, bx, bz) && !wallBetweenAny(ax, az, bx, bz);
  if (dx === 0 && dz === 0) return true;
  return false;
}
// windows and walls both block reaching across an edge (doors don't)
function wallBetweenAny(ax, az, bx, bz) { const w = edgeWall(ax, az, bx, bz); return !!w && !(w.open && w.open.type === 'door'); }

// Standing spots facing the object: the tiles in front of each footprint column
function standSpots(o) {
  const out = [];
  if (o.def.wall) { const [cx, cz] = localToWorld(o, 0, 0.12); return [{ x: cx, z: cz, a: worldAngle(o, Math.PI), tx: Math.floor(cx), tz: Math.floor(cz) }].filter((p) => standable(p.tx, p.tz)); }
  const w = o.def.w, d = o.def.d;
  for (let i = 0; i < w; i++) {
    const lx = -w / 2 + i + 0.5;
    const [fx, fz] = localToWorld(o, lx, d / 2 + 0.5), [ix, iz] = localToWorld(o, lx, d / 2 - 0.5);
    const tx = Math.floor(fx), tz = Math.floor(fz);
    if (!standable(tx, tz) || !adjacentOpen(tx, tz, Math.floor(ix), Math.floor(iz))) continue;
    out.push({ x: tx + 0.5, z: tz + 0.5, a: worldAngle(o, Math.PI), tx, tz });
  }
  return out;
}
// For objects you can walk around (chess, stereo), any open neighbour works
function aroundSpots(o) {
  const res = [], tiles = objTiles(o), set = new Set(tiles.map(([x, z]) => x + ',' + z));
  for (const [x, z] of tiles) for (const [dx, dz] of DIRS) {
    const tx = x + dx, tz = z + dz; if (set.has(tx + ',' + tz)) continue;
    if (!standable(tx, tz) || !adjacentOpen(tx, tz, x, z)) continue;
    res.push({ x: tx + 0.5, z: tz + 0.5, a: Math.atan2(x - tx, z - tz), tx, tz });
  }
  return res;
}
function seatSpots(o) {
  const res = [];
  (o.def.seats || []).forEach((st, i) => {
    const [sx, sz] = localToWorld(o, st.x, st.z), a = worldAngle(o, st.a);
    const seatT = [Math.floor(sx), Math.floor(sz)];
    const fd = [Math.sin(st.a), Math.cos(st.a)];
    const cands = [[st.x + fd[0], st.z + fd[1]], [st.x, st.z + 1], [st.x - fd[0], st.z - fd[1]], [st.x + 1, st.z], [st.x - 1, st.z], [st.x, st.z - 1]];
    let ap = null;
    for (const [lx, lz] of cands) {
      const [wx, wz] = localToWorld(o, lx, lz), tx = Math.floor(wx), tz = Math.floor(wz);
      if (objTiles(o).some(([ox, oz]) => ox === tx && oz === tz)) continue;
      if (!standable(tx, tz) || !adjacentOpen(tx, tz, seatT[0], seatT[1])) continue;
      ap = { tx, tz }; break;
    }
    if (ap) res.push({ i, x: sx, z: sz, a, h: st.h, ap, desk: st.desk });
  });
  return res;
}
// Lie spots. The sim's root goes at the foot end so the body lies along the bed with the head toward the sim's -z.
// Returns { i, x, z, a, h, ap } with ap the tile to step on and off from.
function lieSpots(o) {
  const res = [];
  const d = o.def.d, w = o.def.w;
  (o.def.beds || []).forEach((b, i) => {
    const cands = [];
    if (b.nap || b.bench) cands.push([b.x, d / 2 + 0.5, b.x, d / 2 - 0.5]);
    const side = b.x < 0 ? [-1] : b.x > 0 ? [1] : [1, -1];
    for (const s of side) for (const lz of [-d / 2 + 0.5, d / 2 - 0.5]) cands.push([s * (w / 2 + 0.5), lz, s * (w / 2 - 0.5), lz]);
    if (!b.nap && !b.bench) cands.push([b.x, d / 2 + 0.5, b.x, d / 2 - 0.5]);
    let ap = null;
    for (const [lx, lz, ix, iz] of cands) {
      const [wx, wz] = localToWorld(o, lx, lz), tx = Math.floor(wx), tz = Math.floor(wz);
      const [jx, jz] = localToWorld(o, ix, iz);
      if (!standable(tx, tz) || !adjacentOpen(tx, tz, Math.floor(jx), Math.floor(jz))) continue;
      ap = { tx, tz }; break;
    }
    if (!ap) return;
    let x, z, a, h;
    if (b.nap) { [x, z] = localToWorld(o, b.x + 0.86, b.z); a = worldAngle(o, Math.PI / 2); h = 0.47; }
    else if (b.bench) { [x, z] = localToWorld(o, 0, 0.74); a = worldAngle(o, 0); h = 0.52; }
    else { [x, z] = localToWorld(o, b.x, 0.88); a = worldAngle(o, 0); h = 0.6; }
    res.push({ i, x, z, a, h, ap, nap: !!b.nap });
  });
  return res;
}
// a free seat facing this table/desk tile, for eating
function seatFacing(tx, tz, ignore) {
  for (const o of G.objects) {
    if (!o.def.seats || o === ignore) continue;
    for (const sp of seatSpots(o)) {
      const fx = Math.floor(sp.x + Math.sin(sp.a)), fz = Math.floor(sp.z + Math.cos(sp.a));
      if (fx === tx && fz === tz && !o.users[sp.i]) return { o, sp };
    }
  }
  return null;
}
// is a tile part of a surface (table, counter, desk) and how high is it
function surfaceAt(tx, tz) {
  const id = occAt(tx, tz); if (!id) return null;
  const o = objById(id); if (!o) return null;
  if (o.def.surface) return { o, h: o.def.surface };
  return null;
}

// ---------- items ----------
function addItem(kind, x, z, y = 0, extra = {}) {
  const it = Object.assign({ id: newId(), kind, x, z, y, dirty: false, born: G.t }, extra);
  it.room = roomAt(x, z);
  it.model = buildItemModel(it);
  it.model.position.set(x, y, z);
  it.model.userData.pick = { type: 'item', item: it };
  R.scene.add(it.model);
  G.items.push(it);
  return it;
}
function removeItem(it) { G.items = G.items.filter((i) => i !== it); if (it.model) R.scene.remove(it.model); }
function refreshItem(it) { if (it.model) R.scene.remove(it.model); it.model = buildItemModel(it); it.model.position.set(it.x, it.y, it.z); it.model.userData.pick = { type: 'item', item: it }; R.scene.add(it.model); }
// a free spot on a surface near (x,z) to put a plate down, else the floor
function surfaceSpotNear(x, z, maxD = 3) {
  let best = null, bd = 1e9;
  for (const o of G.objects) {
    if (!o.def.surface) continue;
    for (const [tx, tz] of objTiles(o)) {
      if (G.items.some((it) => Math.floor(it.x) === tx && Math.floor(it.z) === tz && it.y > 0.1)) continue;
      const d = Math.hypot(tx + 0.5 - x, tz + 0.5 - z);
      if (d < bd && d <= maxD) { bd = d; best = { x: tx + 0.5, z: tz + 0.5, y: o.def.surface, o }; }
    }
  }
  return best;
}

// ---------- object upkeep (every game minute) ----------
function tickObjects(dtMin) {
  for (const o of G.objects) {
    if (o.def.plant && !o.dead) {
      const out = roomAt(o.x + 0.5, o.z + 0.5) === 0;
      o.water -= dtMin * (out ? 0.016 : 0.012);
      if (o.water <= 0) { o.water = 0; o.dead = true; applyObjectLook(o); notify(`The ${o.def.name.toLowerCase()} has died. Water your plants!`, '🥀'); }
      else if (o.water < 30 && !o._wilt) { o._wilt = true; applyObjectLook(o); }
    }
    if (o.type === 'aquarium') o.fish = Math.max(0, o.fish - dtMin * 0.02);
  }
}
function updateObjectVisuals(t, dt) {
  const dark = 1 - lightLevel();
  for (const o of G.objects) {
    if (o.screen) o.screen.material.emissiveIntensity = o.on && !o.broken ? 0.7 + Math.sin(t * 9 + o.id) * 0.15 + Math.sin(t * 2.3) * 0.1 : 0;
    if (o.shade) o.shade.material.emissiveIntensity = dark > 0.3 ? 0.9 : 0;
    if (o.flag) o.flag.rotation.z = G.bills.some((b) => !b.paid) ? -1.4 : 0;
    if (o.type === 'aquarium' && o.model) o.model.traverse((c) => { if (c.userData.fish != null) { c.position.x = Math.sin(t * 0.5 + c.userData.fish * 1.7) * 0.55; c.rotation.y = Math.cos(t * 0.5 + c.userData.fish * 1.7) > 0 ? 0 : Math.PI; } });
  }
  for (const it of G.items) if (it.kind === 'fire' && it.model) it.model.traverse((c) => { if (c.userData.flame != null) { c.scale.y = 0.7 + Math.abs(Math.sin(t * 9 + c.userData.flame * 2)) * 0.6; } });
  // hand out the lamp lights
  const lamps = dark > 0.3 ? G.objects.filter((o) => o.def.lamp) : [];
  const c = R.cam;
  lamps.sort((a, b) => Math.hypot(a.x - c.tx, a.z - c.tz) - Math.hypot(b.x - c.tx, b.z - c.tz));
  R.lampLights.forEach((L, i) => {
    const o = lamps[i];
    if (!o) { L.intensity = 0; return; }
    const [x, z] = objCenter(o); const [fx, fz] = o.def.wall ? localToWorld(o, 0, -0.1) : [x, z];
    L.position.set(fx, o.def.wall ? 1.9 : o.type === 'lamp_table' ? 1.1 : 1.6, fz); L.intensity = 1.7 * dark;
  });
}

// ---------- thumbnails (catalog icons, sim portraits) ----------
const THUMB = { r: null, scene: null, cam: null };
function thumbRenderer() {
  if (THUMB.r) return THUMB;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  THUMB.r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  THUMB.r.outputEncoding = THREE.sRGBEncoding;
  THUMB.r.setSize(128, 128, false);
  THUMB.scene = new THREE.Scene();
  THUMB.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.9));
  const d = new THREE.DirectionalLight(0xffffff, 0.6); d.position.set(3, 5, 4); THUMB.scene.add(d);
  THUMB.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  return THUMB;
}
function renderThumb(model, mode = 'obj') {
  const T = thumbRenderer();
  T.scene.add(model);
  const bb = new THREE.Box3().setFromObject(model), size = new V3(), ctr = new V3();
  bb.getSize(size); bb.getCenter(ctr);
  if (mode === 'head') {
    const h = model.userData.height || 1.7;
    T.cam.position.set(0.18 * h / 1.7, h * 0.93, 0.75 * h / 1.7 + 0.25); T.cam.lookAt(0, h * 0.88, 0);
    T.cam.fov = 30; T.cam.updateProjectionMatrix();
  } else {
    const r = Math.max(size.x, size.y, size.z);
    T.cam.position.set(ctr.x + r * 1.5, ctr.y + r * 1.1, ctr.z + r * 1.9); T.cam.lookAt(ctr);
  }
  T.r.setClearColor(0x000000, 0);
  T.r.render(T.scene, T.cam);
  T.scene.remove(model);
  return T.r.domElement.toDataURL();
}
const THUMBS = {};
function objectThumb(id) { if (!THUMBS[id]) THUMBS[id] = renderThumb(buildObjectModel(id)); return THUMBS[id]; }
