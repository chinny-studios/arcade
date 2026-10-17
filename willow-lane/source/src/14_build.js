// Willow Lane — build mode (walls, doors, windows, floors, wallpaper) and buy mode (place, move, rotate, sell), with undo

const BUILD = {
  tool: null,      // build: wall | erase | door | window | floor | paper ; buy: place | move
  style: 1,        // door/window/floor/paper id
  item: null,      // catalog id while placing
  rot: 0, ghost: null, ghostKey: '', moving: null, drag: null, hover: null,
  preview: null, undo: [], redo: [], grid: null,
};

function snapshot() {
  return JSON.stringify({ lot: lotToJSON(), objs: G.objects.map(objToJSON), money: G.money });
}
function pushUndo() { BUILD.undo.push(snapshot()); if (BUILD.undo.length > 25) BUILD.undo.shift(); BUILD.redo.length = 0; }
function restoreSnap(js) {
  const j = JSON.parse(js);
  for (const o of G.objects) if (o.model) R.scene.remove(o.model);
  G.objects = [];
  lotFromJSON(j.lot);
  for (const oj of j.objs) objFromJSON(oj);
  G.money = j.money;
  rebuildOcc(); rebuildLot(); updateCutaway(true);
  bus.emit('money');
}
function undoBuild() { if (!BUILD.undo.length) return; BUILD.redo.push(snapshot()); restoreSnap(BUILD.undo.pop()); sfx('click'); }
function redoBuild() { if (!BUILD.redo.length) return; BUILD.undo.push(snapshot()); restoreSnap(BUILD.redo.pop()); sfx('click'); }

function objToJSON(o) { return { id: o.id, t: o.type, x: o.x, z: o.z, r: o.r, p: o.price, d: o.boughtDay, s: { dirt: o.dirt, broken: o.broken, water: o.water, dead: o.dead, trash: o.trash, fish: o.fish, memorial: o.memorial } }; }
function objFromJSON(j) { if (!CAT[j.t]) return null; return placeObject(j.t, j.x, j.z, j.r, { id: j.id, price: j.p, boughtDay: j.d, state: j.s }); }

// ---------- grid overlay ----------
function showGrid(on) {
  if (!BUILD.grid) {
    const pts = [];
    for (let x = 0; x <= LOT_W; x++) pts.push(x, 0.04, 0, x, 0.04, LOT_D);
    for (let z = 0; z <= LOT_D; z++) pts.push(0, 0.04, z, LOT_W, 0.04, z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    BUILD.grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }));
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LOT_W, 0.01, LOT_D)), new THREE.LineBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.6 }));
    edge.position.set(LOT_W / 2, 0.05, LOT_D / 2); BUILD.grid.add(edge);
    R.scene.add(BUILD.grid);
  }
  BUILD.grid.visible = on;
}

// ---------- mode switching ----------
function setTool(tool, style, item) {
  clearGhost();
  BUILD.tool = tool; BUILD.style = style || BUILD.style; BUILD.item = item || null; BUILD.drag = null;
  if (tool === 'place' && item) { BUILD.rot = CAT[item].wall ? BUILD.rot : BUILD.rot; makeGhost(item); }
  bus.emit('tool');
}
function clearGhost() {
  if (BUILD.ghost) { R.scene.remove(BUILD.ghost); BUILD.ghost = null; }
  if (BUILD.preview) { R.scene.remove(BUILD.preview); BUILD.preview = null; }
  if (BUILD.moving) { const o = BUILD.moving; o.model.visible = true; BUILD.moving = null; rebuildOcc(); }
  hideTip();
}
function makeGhost(id) {
  const m = buildObjectModel(id);
  m.traverse((c) => { if (c.isMesh) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = 0.75; c.material.depthWrite = true; c.castShadow = false; c.userData.ghost = true; } });
  R.scene.add(m);
  BUILD.ghost = m;
}
function tintGhost(ok) {
  if (!BUILD.ghost) return;
  BUILD.ghost.traverse((c) => { if (c.isMesh && c.material.emissive) { c.material.emissive.setHex(ok ? 0x205020 : 0x802020); c.material.emissiveIntensity = 1; } });
}

// ---------- pointer handling (called by the input code in build/buy mode) ----------
function hoverTile(p) { return p ? [Math.floor(p.x), Math.floor(p.z)] : null; }
function nearestVertex(p) { return [Math.round(p.x), Math.round(p.z)]; }
function nearestEdge(p) {
  // the wall edge closest to a point
  const fx = p.x - Math.floor(p.x), fz = p.z - Math.floor(p.z);
  const tx = Math.floor(p.x), tz = Math.floor(p.z);
  const cands = [['h', tx, tz, fz], ['h', tx, tz + 1, 1 - fz], ['v', tx, tz, fx], ['v', tx + 1, tz, 1 - fx]];
  cands.sort((a, b) => a[3] - b[3]);
  return cands[0];
}
function wallSegmentsBetween(a, b) {
  const segs = [];
  if (a[0] === b[0]) { const x = a[0]; for (let z = Math.min(a[1], b[1]); z < Math.max(a[1], b[1]); z++) segs.push(['v', x, z]); }
  else if (a[1] === b[1]) { const z = a[1]; for (let x = Math.min(a[0], b[0]); x < Math.max(a[0], b[0]); x++) segs.push(['h', x, z]); }
  return segs.filter(([o, x, z]) => (o === 'h' ? x >= 0 && x < LOT_W && z >= 0 && z <= LOT_D : z >= 0 && z < LOT_D && x >= 0 && x <= LOT_W));
}
// snap a drag to the dominant axis
function axisSnap(a, p) { const b = nearestVertex(p); return Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? [b[0], a[1]] : [a[0], b[1]]; }
function segBlocked(o, x, z) {
  // objects straddling the edge block a new wall
  const [ax, az, bx, bz] = o === 'h' ? [x, z - 1, x, z] : [x - 1, z, x, z];
  const ia = occAt(ax, az), ib = occAt(bx, bz);
  return ia && ia === ib;
}

function buildPointer(type, p, ev) {
  const t = BUILD.tool;
  if (!t || !p) return;
  if (t === 'wall' || t === 'erase') {
    if (type === 'down') BUILD.drag = { a: nearestVertex(p) };
    const a = BUILD.drag ? BUILD.drag.a : nearestVertex(p), b = BUILD.drag ? axisSnap(a, p) : a;
    const segs = wallSegmentsBetween(a, b);
    let cost = 0, n = 0;
    const valid = segs.filter(([o, x, z]) => { const has = !!wallGet(o, x, z); if (t === 'wall') return !has && !segBlocked(o, x, z); return has; });
    n = valid.length; cost = n * WALL_PRICE * (t === 'wall' ? 1 : -1);
    drawWallPreview(BUILD.drag ? segs : [], valid, t, a);
    if (BUILD.drag) showTip(ev, t === 'wall' ? `${n} wall${n === 1 ? '' : 's'} · ${fmtMoney(cost)}` : `Remove ${n} · refund ${fmtMoney(-cost)}`, t === 'wall' && cost > G.money);
    else showTip(ev, t === 'wall' ? 'Drag to build walls' : 'Drag along walls to remove them');
    if (type === 'up' && BUILD.drag) {
      BUILD.drag = null; drawWallPreview([], [], t);
      if (!n) return;
      if (t === 'wall' && cost > G.money) { sfx('error'); toast('Not enough money'); return; }
      pushUndo();
      for (const [o, x, z] of valid) {
        if (t === 'wall') wallSet(o, x, z, { a: 1, b: 1, open: null, autoA: true, autoB: true });
        else { for (const ob of G.objects.slice()) if (ob.def.wall && ob.wallKey === wkey(o, x, z)) { earn(sellValue(ob)); removeObject(ob); } wallSet(o, x, z, null); }
      }
      if (t === 'wall') spend(cost); else earn(-cost);
      rebuildLot();
      autoPapers();
      rebuildLot(); updateCutaway(true); rebuildOcc();
      sfx('build');
    }
    return;
  }
  if (t === 'door' || t === 'window') {
    const [o, x, z] = nearestEdge(p);
    const w = wallGet(o, x, z);
    const D = t === 'door' ? DOOR[BUILD.style] : WINDOW[BUILD.style];
    const blocked = w && G.objects.some((ob) => ob.def.wall && ob.wallKey === wkey(o, x, z));
    drawEdgePreview(o, x, z, !!w && !blocked);
    showTip(ev, !w ? 'Point at a wall' : blocked ? 'Something hangs on this wall' : `${D.name} · ${fmtMoney(D.price)}`, !w || blocked || D.price > G.money);
    if (type === 'down' && w && !blocked) {
      if (D.price > G.money) { sfx('error'); toast('Not enough money'); return; }
      if (w.open && w.open.type === t && w.open.style === BUILD.style) return;
      pushUndo();
      if (w.open) earn(Math.round((w.open.type === 'door' ? DOOR[w.open.style] : WINDOW[w.open.style]).price * 0.8));
      w.open = { type: t, style: BUILD.style };
      spend(D.price);
      rebuildLot(); updateCutaway(true); NAV.dirty = true;
      sfx('build');
    }
    return;
  }
  if (t === 'floor') {
    const tile = hoverTile(p);
    if (type === 'down') BUILD.drag = { a: tile };
    const a = BUILD.drag ? BUILD.drag.a : tile, b = tile;
    const x0 = clamp(Math.min(a[0], b[0]), 0, LOT_W - 1), x1 = clamp(Math.max(a[0], b[0]), 0, LOT_W - 1), z0 = clamp(Math.min(a[1], b[1]), 0, LOT_D - 1), z1 = clamp(Math.max(a[1], b[1]), 0, LOT_D - 1);
    const f = BUILD.style;
    let n = 0;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (LOT.floor[tidx(x, z)] !== f) n++;
    const cost = f === 0 ? 0 : n * FLOOR[f].price;
    drawRectPreview(x0, z0, x1, z1, f === 0 ? 0xff9a7a : 0x9af0a0);
    showTip(ev, f === 0 ? `Remove floor (${n})` : `${FLOOR[f].name} · ${n} tile${n === 1 ? '' : 's'} · ${fmtMoney(cost)}`, cost > G.money);
    if (type === 'up' && BUILD.drag) {
      BUILD.drag = null; drawRectPreview();
      if (!n) return;
      if (cost > G.money) { sfx('error'); toast('Not enough money'); return; }
      pushUndo();
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) LOT.floor[tidx(x, z)] = f;
      spend(cost); rebuildLot(); updateCutaway(true); sfx('floor');
    }
    return;
  }
  if (t === 'paper') {
    const hit = pickAt(ev.clientX, ev.clientY, [...LOT.wallObjs.values()]);
    drawRectPreview();
    if (!hit || hit.pick.type !== 'wall') { showTip(ev, 'Point at a wall · Shift paints the whole room'); return; }
    const { o, x, z } = hit.pick;
    const side = o === 'h' ? (hit.point.z < z ? 'a' : 'b') : (hit.point.x < x ? 'a' : 'b');
    const targets = [];
    if (ev.shiftKey) {
      const [tx, tz] = side === 'a' ? (o === 'h' ? [x, z - 1] : [x - 1, z]) : [x, z];
      const room = inLot(tx, tz) ? LOT.room[tidx(tx, tz)] : 0;
      for (const [k, w] of LOT.walls) {
        const [oo, xs, zs] = k.split(':'); const xx = +xs, zz = +zs;
        const [ax, az] = oo === 'h' ? [xx, zz - 1] : [xx - 1, zz];
        if ((inLot(ax, az) ? LOT.room[tidx(ax, az)] : 0) === room) targets.push([w, 'a']);
        if ((inLot(xx, zz) ? LOT.room[tidx(xx, zz)] : 0) === room) targets.push([w, 'b']);
      }
    } else targets.push([wallGet(o, x, z), side]);
    const todo = targets.filter(([w, sd]) => w[sd] !== BUILD.style);
    const cost = todo.length * PAPER[BUILD.style].price;
    showTip(ev, `${PAPER[BUILD.style].name} · ${todo.length} side${todo.length === 1 ? '' : 's'} · ${fmtMoney(cost)}`, cost > G.money);
    if (type === 'down' && todo.length) {
      if (cost > G.money) { sfx('error'); toast('Not enough money'); return; }
      pushUndo();
      for (const [w, sd] of todo) { w[sd] = BUILD.style; w[sd === 'a' ? 'autoA' : 'autoB'] = false; }
      spend(cost); rebuildLot(); updateCutaway(true); sfx('paint');
    }
    return;
  }
  if (t === 'place') { placePointer(type, p, ev); return; }
  if (t === 'hand') { handPointer(type, p, ev); }
}

// Walls nobody has papered yet: siding outside, plain paint inside (rechecked whenever rooms change)
function autoPapers() {
  for (const [k, w] of LOT.walls) {
    if (!w.autoA && !w.autoB) continue;
    const [o, xs, zs] = k.split(':'); const x = +xs, z = +zs;
    const [ax, az] = o === 'h' ? [x, z - 1] : [x - 1, z];
    const inA = inLot(ax, az) && LOT.room[tidx(ax, az)] > 0, inB = inLot(x, z) && LOT.room[tidx(x, z)] > 0;
    if (w.autoA) w.a = inA ? 1 : 14;
    if (w.autoB) w.b = inB ? 1 : 14;
  }
}

// ---------- buy mode ----------
function placePointer(type, p, ev) {
  const id = BUILD.item; if (!id) return;
  const def = CAT[id];
  const [tx, tz] = hoverTile(p);
  let r = BUILD.rot;
  if (def.wall) { // turn to face away from the nearest wall
    const best = [0, 1, 2, 3].map((rr) => [rr, !canPlace(def, tx, tz, rr, BUILD.moving)]).find(([rr, ok]) => ok && rr === r) || [0, 1, 2, 3].map((rr) => [rr, !canPlace(def, tx, tz, rr, BUILD.moving)]).find(([, ok]) => ok);
    if (best) r = best[0];
  }
  const [W, D] = footprint(def, r);
  const x = clamp(tx - Math.floor((W - 1) / 2), -20, 60), z = clamp(tz - Math.floor((D - 1) / 2), -20, 60);
  const why = canPlace(def, x, z, r, BUILD.moving);
  const price = BUILD.moving ? 0 : def.price;
  const ok = !why && price <= G.money;
  if (BUILD.ghost) {
    const tmp = { def, x, z, r };
    const [cx, cz] = localToWorld(tmp, 0, 0);
    BUILD.ghost.position.set(cx, 0.01, cz); BUILD.ghost.rotation.y = r * Math.PI / 2;
    tintGhost(ok);
    if (def.wall) BUILD.ghost.visible = !why || why !== 'Needs a plain wall behind it' || true;
  }
  showTip(ev, why ? why : price > G.money ? 'Not enough money' : `${def.name}${price ? ' · ' + fmtMoney(price) : ''} · R to rotate`, !ok);
  if (type === 'down' && ev.button === 0) {
    if (!ok) { sfx('error'); return; }
    pushUndo();
    if (BUILD.moving) {
      const o = BUILD.moving; BUILD.moving = null;
      o.x = x; o.z = z; o.r = r;
      if (def.wall) { const e = wallBehind(x, z, r); o.wallKey = e ? wkey(e[0], e[1], e[2]) : ''; }
      makeObjectModel(o); o.room = roomAt(x + 0.5, z + 0.5);
      rebuildOcc(); updateCutaway(true);
      sfx('place'); clearGhost(); BUILD.tool = 'hand'; bus.emit('tool');
    } else {
      spend(price);
      placeObject(id, x, z, r);
      for (const h of household()) bus.emit('did', h, 'buy', { type: id });
      updateCutaway(true);
      sfx('place');
      if (!ev.shiftKey) { clearGhost(); BUILD.tool = 'hand'; BUILD.item = null; bus.emit('tool'); }
    }
  }
}
function handPointer(type, p, ev) {
  const hit = pickAt(ev.clientX, ev.clientY, G.objects.map((o) => o.model).filter(Boolean));
  const o = hit && hit.pick.type === 'obj' ? hit.pick.obj : null;
  if (!o) { hideTip(); return; }
  showTip(ev, o.def.fixed ? `${o.def.name} (can’t be moved)` : `${o.def.name} · sells for ${fmtMoney(sellValue(o))} · click to move, Del to sell`);
  BUILD.hover = o;
  if (type === 'down' && ev.button === 0 && !o.def.fixed) {
    if (Object.keys(o.users).length) { toast('Someone is using that'); sfx('error'); return; }
    if (o.type === 'crib' && babyIn(o)) { toast('A baby sleeps here'); sfx('error'); return; }
    BUILD.moving = o; o.model.visible = false; BUILD.rot = o.r; BUILD.item = o.type;
    // free its tiles while it's held
    OCC.fill(0); for (const x of G.objects) if (x !== o && blocks(x.def)) for (const [tx, tz] of objTiles(x)) if (inLot(tx, tz)) OCC[tidx(tx, tz)] = x.id;
    makeGhost(o.type); BUILD.tool = 'place'; sfx('click');
  }
}
function sellHeld() {
  const o = BUILD.moving || (BUILD.tool === 'hand' ? BUILD.hover : null);
  if (!o || o.def.fixed) return;
  if (o.type === 'crib' && babyIn(o)) { toast('A baby sleeps here'); sfx('error'); return; }
  pushUndo();
  earn(sellValue(o));
  if (BUILD.moving) { BUILD.moving = null; if (BUILD.ghost) { R.scene.remove(BUILD.ghost); BUILD.ghost = null; } }
  removeObject(o); BUILD.hover = null;
  sfx('sell'); BUILD.tool = 'hand'; BUILD.item = null; hideTip(); bus.emit('tool');
}
function rotateTool(d = 1) { BUILD.rot = (BUILD.rot + d + 4) % 4; sfx('click'); }

// ---------- previews ----------
function drawWallPreview(all, valid, t, at) {
  if (BUILD.preview) { R.scene.remove(BUILD.preview); BUILD.preview = null; }
  const g = new THREE.Group();
  const okM = new THREE.MeshBasicMaterial({ color: t === 'erase' ? 0xff6050 : 0x70e090, transparent: true, opacity: 0.55 });
  const badM = new THREE.MeshBasicMaterial({ color: 0x808080, transparent: true, opacity: 0.3 });
  const vs = new Set(valid.map((s) => s.join(':')));
  for (const s of all) {
    const [o, x, z] = s, ok = vs.has(s.join(':'));
    const m = new THREE.Mesh(boxGeo(1, t === 'erase' ? WALL_H + 0.05 : 1.4, WALL_T + 0.06), ok ? okM : badM);
    if (o === 'h') m.position.set(x + 0.5, 0.7, z); else { m.position.set(x, 0.7, z + 0.5); m.rotation.y = Math.PI / 2; }
    if (t === 'erase') m.position.y = WALL_H / 2;
    g.add(m);
  }
  if (at) { const c = new THREE.Mesh(cylGeo(0.12, 0.12, 0.1, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); c.position.set(at[0], 0.06, at[1]); g.add(c); }
  R.scene.add(g); BUILD.preview = g;
}
function drawEdgePreview(o, x, z, ok) {
  if (BUILD.preview) { R.scene.remove(BUILD.preview); BUILD.preview = null; }
  const m = new THREE.Mesh(boxGeo(0.9, 2.2, WALL_T + 0.1), new THREE.MeshBasicMaterial({ color: ok ? 0x70e090 : 0xff6050, transparent: true, opacity: 0.45 }));
  if (o === 'h') m.position.set(x + 0.5, 1.1, z); else { m.position.set(x, 1.1, z + 0.5); m.rotation.y = Math.PI / 2; }
  R.scene.add(m); BUILD.preview = m;
}
function drawRectPreview(x0, z0, x1, z1, col) {
  if (BUILD.preview) { R.scene.remove(BUILD.preview); BUILD.preview = null; }
  if (x0 == null) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 1, z1 - z0 + 1), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1 + 1) / 2, 0.06, (z0 + z1 + 1) / 2);
  R.scene.add(m); BUILD.preview = m;
}
