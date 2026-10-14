// Signal Front — turn flow, animated actions and map input (mouse + touch)

const G = {
  mode: 'off',    // off | idle | select | menu | target | drop | busy
  sel: null,      // selected unit
  reach: null,
  dest: null,     // {x,y} chosen destination while the action menu is open
  path: null,
  targets: null,
  tgt: null,      // target previewed (touch: first tap previews, second confirms)
  inspect: null,  // enemy unit whose range is shown
};

const humanSide = () => (S && !S.sides[0].ai ? 0 : S && !S.sides[1].ai ? 1 : 0);
const viewSide = () => (DEBUG && R.reveal ? S.turn : humanSide());
const isHumanTurn = () => S && !S.over && !S.sides[S.turn].ai;

// ---------------- animated actions ----------------
async function animMove(u, path) {
  if (path.length < 2) return;
  const hidden = !canSee(S, viewSide(), u);
  if (!hidden) { sfx('move', u.t); if (!isHumanTurn()) ensureVisible(path[path.length - 1].x, path[path.length - 1].y, 1); }
  if (TIME.fast || hidden) return;
  const per = isAir(u.t) ? 55 : 75;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const t0 = performance.now(), dur = per / TIME.speed;
    await new Promise((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        u.anim = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  }
  u.anim = { x: path[path.length - 1].x, y: path[path.length - 1].y };
}

function weaponSound(a, w) {
  const t = a.t;
  if (UNITS[t].kamikaze) return 'boom';
  if (w === 2) return 'mg';
  if (['spark', 'moray', 'mlrs', 'mallet', 'streak', 'razorwing', 'strider', 'atgm', 'gunship', 'deepfin', 'fpv'].includes(t)) return 'missile';
  return 'cannon';
}

async function fireFx(a, d, res) {
  const A = tileCenter(a.x, a.y), D = tileCenter(d.x, d.y);
  const visA = canSee(S, viewSide(), a), visD = canSee(S, viewSide(), d);
  const sound = weaponSound(a, res.w);
  const indirectShot = mdist(a.x, a.y, d.x, d.y) > 1;
  if (visA && !UNITS[a.t].kamikaze) { fxAdd({ type: 'flash', x: A.x + (a.s === 0 ? 5 : -5), y: A.y - 2, dur: 0.18 }); a.flash = R.t + 0.12; }
  sfx(sound);
  if (indirectShot || sound === 'missile') {
    fxAdd({ type: 'shot', x0: A.x, y0: A.y - 4, x1: D.x, y1: D.y, arc: indirectShot ? 18 + mdist(a.x, a.y, d.x, d.y) * 4 : 3, dur: indirectShot ? 0.55 : 0.28, trail: true });
    await wait(indirectShot ? 550 : 280);
  } else if (sound === 'mg') {
    for (let i = 0; i < 4; i++) fxAdd({ type: 'shot', x0: A.x, y0: A.y - 2, x1: D.x + frand(-3, 3), y1: D.y + frand(-3, 3), dur: 0.12 + i * 0.04, col: '#ffe890' });
    await wait(260);
  } else await wait(160);
  if (visD) {
    fxAdd({ type: 'boom', x: D.x + frand(-2, 2), y: D.y + frand(-2, 2), dur: 0.5, big: res.killed });
    if (res.shown > 0) fxAdd({ type: 'text', s: '-' + res.shown, x: D.x, y: D.y - 6, dur: 1.0, col: '#ffd0c0' });
    d.flash = R.t + 0.15;
    R.shake = Math.max(R.shake, res.killed ? 5 : 2);
  }
  sfx(res.killed ? 'boom' : 'cannon');
  await wait(res.killed ? 520 : 360);
}

async function animAttack(a, d) {
  if (!TIME.fast && (canSee(S, viewSide(), a) || canSee(S, viewSide(), d))) ensureVisible(d.x, d.y, 1);
  const dist = mdist(a.x, a.y, d.x, d.y);
  if (UNITS[a.t].kamikaze && !TIME.fast && canSee(S, viewSide(), a)) {
    // the one-way drone dives onto its target
    const t0 = performance.now(), dur = 260 / TIME.speed;
    await new Promise((res) => { const step = () => { const k = Math.min(1, (performance.now() - t0) / dur); a.anim = { x: lerp(a.x, d.x, k * k), y: lerp(a.y, d.y, k * k) }; if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    R.hideUnit = a.id;
  }
  const r1 = strike(S, a, d);
  if (!TIME.fast) await fireFx(a, d, r1);
  if (d.hp > 0 && a.hp > 0 && canCounter(S, a, d, dist)) {
    const r2 = strike(S, d, a);
    if (!TIME.fast) await fireFx(d, a, r2);
  }
  if (R.hideUnit === a.id) R.hideUnit = null;
  a.anim = null;
  const dead = removeDead(S);
  if (dead.some((u) => u.s === humanSide())) log('lost', dead.filter((u) => u.s === humanSide()));
  hudRefresh();
}

async function perform(a) {
  if (a.kind === 'power') return doPower(S.turn, a.level);
  if (a.kind === 'build') {
    const u = doBuild(S, S.turn, a.t, a.x, a.y);
    if (u && canSee(S, viewSide(), u)) {
      if (!isHumanTurn()) ensureVisible(a.x, a.y, 1);
      const c = tileCenter(a.x, a.y);
      fxAdd({ type: 'ring', x: c.x, y: c.y, dur: 0.5, col: FACTIONS[u.s].ramp[0] });
      sfx('build');
      await wait(isHumanTurn() ? 0 : 320);
    }
    hudRefresh();
    return;
  }
  if (a.kind !== 'unit') return;
  const u = S.units.find((w) => w.id === a.id);
  if (!u) return;
  const tc = trapCheck(S, u, a.path || [{ x: u.x, y: u.y }]);
  await animMove(u, tc.path);
  const from = { x: u.x, y: u.y };
  commitMove(S, u, tc.path);
  u.anim = null;
  if (tc.trapped) {
    u.done = true;
    const c = tileCenter(u.x, u.y);
    if (canSee(S, viewSide(), u)) { fxAdd({ type: 'text', s: 'AMBUSH!', x: c.x, y: c.y - 8, dur: 1.2, col: '#ffd23a' }); sfx('trap'); await wait(700); }
    hudRefresh();
    return;
  }
  const visible = canSee(S, viewSide(), u);
  switch (a.act) {
    case 'attack': {
      const d = S.units.find((w) => w.id === a.target);
      u.done = true;
      if (d) await animAttack(u, d);
      break;
    }
    case 'capture': {
      const r = doCapture(S, u);
      const c = tileCenter(u.x, u.y);
      if (visible || tileAt(S, u.x, u.y).o === humanSide()) {
        if (r.done) { fxAdd({ type: 'text', s: 'CAPTURED', x: c.x, y: c.y - 8, dur: 1.3, col: '#ffd23a' }); sfx('captured'); }
        else { fxAdd({ type: 'text', s: String(r.left), x: c.x, y: c.y - 8, dur: 1.0, col: '#ffe9a0' }); sfx('capture'); }
        await wait(r.done ? 650 : 380);
      }
      break;
    }
    case 'load': { const o = unitAt(S, u.x, u.y) === u ? S.units.find((w) => w !== u && w.x === u.x && w.y === u.y) : unitAt(S, u.x, u.y); if (o) doLoad(S, u, o); else u.done = true; sfx('menu'); break; }
    case 'join': { const o = S.units.find((w) => w !== u && w.x === u.x && w.y === u.y); if (o) { doJoin(S, u, o); sfx('repair'); } else u.done = true; break; }
    case 'drop': {
      u.done = true;
      if (a.drop && u.cargo.length) { const c = doDrop(S, u, a.drop.x, a.drop.y); void c; sfx('menu'); await wait(150); }
      break;
    }
    case 'supply': {
      u.done = true;
      const got = supplyAround(S, u);
      for (const g of got) { const c = tileCenter(g.x, g.y); fxAdd({ type: 'spark', x: c.x, y: c.y, dur: 0.7, col: '#6ff3ff' }); }
      if (got.length) { sfx('repair'); await wait(350); }
      break;
    }
    default: u.done = true;
  }
  void from;
  bump(S);
  hudRefresh();
}

async function doPower(side, level) {
  const co = coOf(S, side);
  const res = activatePower(S, side, level);
  await powerBanner(side, level);
  if (res && res.units) {
    for (const u of res.units) {
      if (!canSee(S, viewSide(), u)) continue;
      const c = tileCenter(u.x, u.y);
      if (res.kind === 'heal') fxAdd({ type: 'spark', x: c.x, y: c.y, dur: 0.9 });
      else fxAdd({ type: 'boom', x: c.x, y: c.y, dur: 0.6 });
    }
    if (res.kind === 'strike') {
      ensureVisible(res.x, res.y, 2);
      const c = tileCenter(res.x, res.y);
      fxAdd({ type: 'beam', x: c.x, y: c.y, dur: 0.6 });
      for (let i = 0; i < 9; i++) setTimeout(() => fxAdd({ type: 'boom', x: c.x + frand(-28, 28), y: c.y + frand(-28, 28), dur: 0.6, big: true }), i * 70);
      R.shake = 8; sfx('boom');
    } else if (res.kind === 'hurt') { R.shake = 4; sfx('zap'); }
    else if (res.kind === 'heal') sfx('repair');
    await wait(800);
  }
  void co;
  hudRefresh();
}

// ---------------- turn flow ----------------
async function beginTurn(events) {
  const game = S;
  clearSel();
  G.mode = 'busy';
  hudRefresh();
  const side = S.turn;
  playSong(FACTIONS[side].id);
  await turnBanner(side, events);
  if (S !== game) return; // left the match while the banner played
  showStartEvents(events);
  if (S.over) return finishGame();
  if (S.sides[side].ai) await runAI();
  else {
    G.mode = 'idle';
    // return to where the player left the camera (their HQ on the first turn)
    if (R.humanCam) { R.camTo = { x: R.humanCam.x, y: R.humanCam.y }; }
    hudRefresh();
  }
}
function showStartEvents(events) {
  for (const e of events) {
    if (e.kind === 'repair' && canSee(S, viewSide(), e.unit)) { const c = tileCenter(e.unit.x, e.unit.y); fxAdd({ type: 'spark', x: c.x, y: c.y, dur: 0.8 }); }
    if (e.kind === 'jam' && canSee(S, viewSide(), e.unit)) { const c = tileCenter(e.unit.x, e.unit.y); fxAdd({ type: 'ring', x: c.x, y: c.y, dur: 0.6, col: '#ffd23a' }); }
    if (e.kind === 'crash' && e.unit.s === humanSide()) toast(UNITS[e.unit.t].name + ' ran out of fuel and was lost.');
  }
}
async function runAI() {
  const game = S;
  G.mode = 'busy';
  hudRefresh();
  let guard = 0;
  while (S === game && !S.over && guard++ < 400) {
    const a = aiNext(S, S.turn);
    if (a.kind === 'end') break;
    await perform(a);
    if (S !== game) return;
    checkVictory(S);
    if (!TIME.fast) await wait(60);
  }
  if (S !== game) return;
  if (S.over) return finishGame();
  await nextTurn();
}
async function nextTurn() {
  const ev = endTurn(S);
  checkVictory(S);
  saveGame();
  await beginTurn(ev);
}
async function humanEndTurn() {
  if (!isHumanTurn() || G.mode === 'busy') return;
  // ask once if units are still waiting for orders
  if (!G.confirmEnd && S.units.some((u) => u.s === S.turn && !u.done)) {
    G.confirmEnd = true;
    $('#endBtn').textContent = 'End turn?';
    sfx('menu');
    setTimeout(() => { G.confirmEnd = false; $('#endBtn').textContent = 'End Turn'; }, 2500);
    return;
  }
  G.confirmEnd = false; $('#endBtn').textContent = 'End Turn';
  R.humanCam = { x: R.cam.x, y: R.cam.y };
  clearSel();
  G.mode = 'busy';
  await nextTurn();
}
async function afterHumanAction() {
  clearSel();
  checkVictory(S);
  if (S.over) return finishGame();
  G.mode = 'idle';
  hudRefresh();
  if (S.sides[S.turn].ai) await runAI(); // never happens, but keeps the loop safe
}

// ---------------- selection helpers ----------------
function clearSel() {
  if (G.sel) G.sel.anim = null;
  G.sel = null; G.reach = null; G.dest = null; G.path = null; G.targets = null; G.tgt = null; G.inspect = null;
  R.over = null; R.over2 = null; R.path = null; R.targets = null;
  closeActionMenu(); hideForecast();
}
function reachOverlay(r) {
  const o = new Uint8Array(S.w * S.h);
  for (let i = 0; i < r.dist.length; i++) if (r.dist[i] >= 0) o[i] = 1;
  return o;
}
function attackFringe(u, r) {
  const o = new Uint8Array(S.w * S.h);
  const [r0, r1] = attackRange(S, u);
  const mark = (cx, cy) => {
    for (let dy = -r1; dy <= r1; dy++) for (let dx = -r1; dx <= r1; dx++) {
      const d = Math.abs(dx) + Math.abs(dy), x = cx + dx, y = cy + dy;
      if (d >= r0 && d <= r1 && inb(S, x, y)) o[y * S.w + x] = 1;
    }
  };
  if (!UNITS[u.t].w1 && !UNITS[u.t].w2) return o;
  if (isIndirect(u.t)) mark(u.x, u.y);
  else for (let i = 0; i < r.dist.length; i++) if (r.dist[i] >= 0) { const x = i % S.w, y = (i / S.w) | 0; const k = stopKind(S, u, x, y); if (k === 'move' || k === 'stay') mark(x, y); }
  return o;
}
function selectUnit(u) {
  clearSel();
  G.sel = u; G.mode = 'select';
  G.reach = reach(S, u);
  R.over = { kind: 'move', tiles: reachOverlay(G.reach) };
  if (UNITS[u.t].w1 || UNITS[u.t].w2) {
    const f = attackFringe(u, G.reach);
    for (let i = 0; i < f.length; i++) if (R.over.tiles[i]) f[i] = 0;
    R.over2 = { kind: 'attack', tiles: f };
  }
  sfx('select');
  hudRefresh();
}
function inspectUnit(u) {
  clearSel();
  G.inspect = u; G.mode = 'idle';
  const r = reach(S, u, { mp: moveRange(S, u) });
  const f = attackFringe(u, r);
  if (isIndirect(u.t)) R.over = { kind: 'threat', tiles: f };
  else { const m = reachOverlay(r); for (let i = 0; i < f.length; i++) if (m[i]) f[i] = 1; R.over = { kind: 'threat', tiles: f }; }
  sfx('menu');
  hudRefresh();
}

// The path follows the pointer the way it does in the classic games: extend it while it stays affordable,
// otherwise fall back to the cheapest path.
function updatePath(x, y) {
  const u = G.sel, r = G.reach;
  if (!u || !inb(S, x, y) || r.dist[y * S.w + x] < 0) { R.path = null; G.path = null; return; }
  let p = G.path && G.path.length ? G.path.slice() : [{ x: u.x, y: u.y }];
  const k = p.findIndex((q) => q.x === x && q.y === y);
  if (k >= 0) p = p.slice(0, k + 1);
  else {
    const last = p[p.length - 1];
    if (mdist(last.x, last.y, x, y) === 1) {
      p.push({ x, y });
      if (pathCost(S, u, p) > r.mp || !pathOK(u, p)) p = pathTo(S, r, x, y);
    } else p = pathTo(S, r, x, y);
  }
  G.path = p; R.path = p;
}
function pathOK(u, p) {
  for (let i = 1; i < p.length; i++) {
    const t = tileAt(S, p[i].x, p[i].y);
    if (!moveCost(u.t, t.k)) return false;
    const o = unitAt(S, p[i].x, p[i].y);
    if (o && o.s !== u.s && canSee(S, u.s, o)) return false;
  }
  return true;
}

// what the selected unit can do if it stops at (x,y)
function actionsAt(u, x, y) {
  const kind = stopKind(S, u, x, y);
  const out = [];
  if (kind === 'load') return [{ id: 'load', label: 'Load' }];
  if (kind === 'join') return [{ id: 'join', label: 'Join' }];
  const moved = x !== u.x || y !== u.y;
  const tg = targetsFrom(S, u, x, y, moved);
  if (tg.length) out.push({ id: 'attack', label: UNITS[u.t].kamikaze ? 'Strike' : 'Fire' });
  const t = tileAt(S, x, y);
  if (UNITS[u.t].cap && TER[t.k].prop && t.o !== u.s) out.push({ id: 'capture', label: UNITS[u.t].side === 0 ? 'Network' : 'Capture' });
  if (UNITS[u.t].supply) {
    const any = S.units.some((w) => w.s === u.s && w !== u && mdist(w.x, w.y, x, y) === 1 && (w.fuel < UNITS[w.t].fuel || (UNITS[w.t].w1 && w.ammo < UNITS[w.t].w1.ammo)));
    if (any) out.push({ id: 'supply', label: 'Supply' });
  }
  if (u.cargo.length && dropTilesAt(u, x, y).length) out.push({ id: 'drop', label: 'Drop' });
  out.push({ id: 'wait', label: 'Wait' });
  return out;
}
function dropTilesAt(u, x, y) {
  const ox = u.x, oy = u.y;
  u.x = x; u.y = y;
  const r = dropTiles(S, u).filter((p) => !(p.x === ox && p.y === oy) || true);
  u.x = ox; u.y = oy;
  // the transport's own start tile is free once it has moved away
  return r.filter((p) => !(unitAt(S, p.x, p.y) && unitAt(S, p.x, p.y) !== u));
}

async function chooseDest(x, y) {
  const u = G.sel;
  let p = G.path && G.path.length && G.path[G.path.length - 1].x === x && G.path[G.path.length - 1].y === y ? G.path : pathTo(S, G.reach, x, y);
  if (!p) return;
  const kind = stopKind(S, u, x, y);
  if (!kind) { sfx('error'); return; }
  const tc = trapCheck(S, u, p);
  G.mode = 'busy';
  R.over = null; R.over2 = null; R.path = null;
  if (tc.trapped) {
    await perform({ kind: 'unit', id: u.id, path: p, act: 'wait' });
    return afterHumanAction();
  }
  await animMove(u, p);
  u.anim = { x, y };
  G.dest = { x, y }; G.path = p;
  G.mode = 'menu';
  openActionMenu(actionsAt(u, x, y));
}
function cancelMenu() {
  const u = G.sel;
  closeActionMenu(); hideForecast();
  if (!u) { G.mode = 'idle'; return; }
  u.anim = null;
  sfx('cancel');
  selectUnit(u);
  if (G.dest) R.cursor = { x: u.x, y: u.y };
}
async function menuPick(id) {
  const u = G.sel, d = G.dest;
  closeActionMenu();
  sfx('menu');
  if (id === 'attack') {
    G.targets = targetsFrom(S, u, d.x, d.y, d.x !== u.x || d.y !== u.y);
    R.targets = G.targets.map((t) => ({ x: t.x, y: t.y }));
    G.mode = 'target'; G.tgt = null;
    if (G.targets.length === 1 || !isTouch) previewTarget(G.targets[0]);
    hudRefresh();
    return;
  }
  if (id === 'drop') {
    const tiles = dropTilesAt(u, d.x, d.y);
    const o = new Uint8Array(S.w * S.h); for (const p of tiles) o[p.y * S.w + p.x] = 1;
    R.over = { kind: 'move', tiles: o };
    G.mode = 'drop';
    toast('Choose where to drop the ' + UNITS[u.cargo[0].t].name + '.');
    return;
  }
  G.mode = 'busy';
  await perform({ kind: 'unit', id: u.id, path: G.path, act: id });
  afterHumanAction();
}
function previewTarget(t) {
  G.tgt = t;
  const u = G.sel, d = G.dest;
  const f = forecast(S, u, d.x, d.y, t);
  showForecast(u, t, f);
}
async function confirmTarget(t) {
  const u = G.sel;
  G.mode = 'busy'; R.targets = null; hideForecast();
  await perform({ kind: 'unit', id: u.id, path: G.path, act: 'attack', target: t.id });
  afterHumanAction();
}

// ---------------- input ----------------
const PTR = { down: new Map(), drag: false, start: null, cam0: null, pinch: null, lastTap: 0 };
function inputInit() {
  const cv = R.cv;
  cv.addEventListener('pointerdown', (e) => {
    audioInit();
    cv.setPointerCapture(e.pointerId);
    PTR.down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PTR.down.size === 1) { PTR.drag = false; PTR.start = { x: e.clientX, y: e.clientY, type: e.pointerType, button: e.button }; PTR.cam0 = { ...R.cam }; }
    else if (PTR.down.size === 2) {
      const [a, b] = [...PTR.down.values()];
      PTR.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: R.zoom }; PTR.drag = true;
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = PTR.down.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (PTR.down.size === 2 && PTR.pinch) {
      const [a, b] = [...PTR.down.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const steps = Math.round(Math.log2(d / PTR.pinch.d) * 3);
      const want = clamp(PTR.pinch.z + steps, 1, 40);
      if (want !== R.zoom) setZoom(want - R.zoom, (a.x + b.x) / 2 * R.dpr, (a.y + b.y) / 2 * R.dpr);
      return;
    }
    if (PTR.down.size === 1 && PTR.start) {
      const dx = e.clientX - PTR.start.x, dy = e.clientY - PTR.start.y;
      if (!PTR.drag && Math.hypot(dx, dy) > (e.pointerType === 'mouse' ? 6 : 12)) PTR.drag = true;
      if (PTR.drag) {
        R.camTo = null;
        R.cam.x = PTR.cam0.x - dx * R.dpr / R.zoom; R.cam.y = PTR.cam0.y - dy * R.dpr / R.zoom;
        clampCam();
        return;
      }
    }
    if (e.pointerType === 'mouse') hover(e.clientX, e.clientY);
  });
  const up = (e) => {
    const was = PTR.down.get(e.pointerId);
    PTR.down.delete(e.pointerId);
    if (PTR.down.size < 2) PTR.pinch = null;
    if (!was || PTR.down.size > 0) return;
    if (!PTR.drag && PTR.start) {
      if (PTR.start.button === 2) rightClick();
      else tap(e.clientX, e.clientY, e.pointerType);
    }
    PTR.start = null; PTR.drag = false;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', (e) => { PTR.down.delete(e.pointerId); PTR.start = null; PTR.pinch = null; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(e.deltaY < 0 ? 1 : -1, e.clientX * R.dpr, e.clientY * R.dpr); }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (document.body.dataset.state !== 'play') return;
    if (e.key === 'Escape') { if (anyModalOpen()) closeModals(); else rightClick(); }
  });
}

function hover(cx, cy) {
  if (!S) return;
  const t = screenToTile(cx, cy);
  if (!inb(S, t.x, t.y)) { R.cursor = null; return; }
  if (!R.cursor || R.cursor.x !== t.x || R.cursor.y !== t.y) {
    R.cursor = t;
    if (G.mode === 'select') updatePath(t.x, t.y);
    if (G.mode === 'target') { const tg = G.targets.find((q) => q.x === t.x && q.y === t.y); if (tg && tg !== G.tgt) { previewTarget(tg); sfx('cursor'); } }
    if (G.mode === 'idle' || G.mode === 'select') infoAt(t.x, t.y);
  }
}

function rightClick() {
  if (G.mode === 'target') { R.targets = null; hideForecast(); G.mode = 'menu'; openActionMenu(actionsAt(G.sel, G.dest.x, G.dest.y)); sfx('cancel'); return; }
  if (G.mode === 'drop') { R.over = null; G.mode = 'menu'; openActionMenu(actionsAt(G.sel, G.dest.x, G.dest.y)); sfx('cancel'); return; }
  if (G.mode === 'menu') return cancelMenu();
  if (G.mode === 'select' || G.inspect) { clearSel(); G.mode = isHumanTurn() ? 'idle' : G.mode; sfx('cancel'); hudRefresh(); }
}

function tap(cx, cy, ptype) {
  if (!S || anyModalOpen()) return;
  const t = screenToTile(cx, cy);
  const on = inb(S, t.x, t.y);
  if (on) { R.cursor = t; infoAt(t.x, t.y); }
  if (!isHumanTurn() || G.mode === 'busy') {
    // allow looking at units during the enemy turn
    return;
  }
  const side = S.turn;
  switch (G.mode) {
    case 'idle': {
      if (!on) { clearSel(); return; }
      const u = unitAt(S, t.x, t.y);
      if (u && canSee(S, side, u)) {
        if (u.s === side && !u.done) return selectUnit(u);
        if (G.inspect === u) { clearSel(); hudRefresh(); return; }
        return inspectUnit(u);
      }
      const tl = tileAt(S, t.x, t.y);
      if (!u && tl.o === side && TER[tl.k].build) { clearSel(); return openBuild(t.x, t.y, TER[tl.k].build); }
      clearSel(); hudRefresh();
      return;
    }
    case 'select': {
      const u = G.sel;
      if (!on) return rightClick();
      if (t.x === u.x && t.y === u.y) { G.path = [{ x: u.x, y: u.y }]; return chooseDest(u.x, u.y); }
      if (G.reach.dist[t.y * S.w + t.x] >= 0 && stopKind(S, u, t.x, t.y)) {
        if (ptype !== 'mouse') updatePath(t.x, t.y);
        return chooseDest(t.x, t.y);
      }
      // tapping another of our ready units switches selection
      const o = unitAt(S, t.x, t.y);
      if (o && o.s === side && !o.done) return selectUnit(o);
      return rightClick();
    }
    case 'menu': return cancelMenu();
    case 'target': {
      const tg = on && G.targets.find((q) => q.x === t.x && q.y === t.y);
      if (!tg) return rightClick();
      if (ptype === 'mouse' || G.tgt === tg) return confirmTarget(tg);
      previewTarget(tg); sfx('cursor');
      return;
    }
    case 'drop': {
      if (on && R.over && R.over.tiles[t.y * S.w + t.x]) {
        const u = G.sel;
        G.mode = 'busy'; R.over = null;
        perform({ kind: 'unit', id: u.id, path: G.path, act: 'drop', drop: { x: t.x, y: t.y } }).then(afterHumanAction);
        return;
      }
      return rightClick();
    }
  }
}
