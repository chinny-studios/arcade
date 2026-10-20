// Tidebound: maps (tile grids, warps, NPCs, items, triggers) and the overworld: movement, ledges, warps, camera,
// drawing, trainers, encounters and field moves. Only `Maps` and `World` are top-level names in this file.

const Maps = (() => {
  const byId = {};
  const list = [];

  // Maps.def(def): rows + legend → a flat grid of tile names (`tiles[y * w + x]`). Unknown legend chars → 'grass'.
  function def(d) {
    if (!d || !d.id) throw new Error('Maps.def: a map needs an id');
    if (byId[d.id]) console.warn('Maps.def: map "' + d.id + '" is defined twice');
    const rows = d.rows || [];
    const legend = d.legend || {};
    const h = rows.length;
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    const tiles = new Array(w * h);
    const warned = {};
    rows.forEach((row, y) => {
      if (row.length !== w) console.warn('Maps.def: ' + d.id + ' row ' + y + ' has ' + row.length + ' tiles, expected ' + w);
      for (let x = 0; x < w; x++) {
        const ch = row.charAt(x);
        let name = ch ? legend[ch] : undefined;
        if (!name) {
          if (!warned[ch]) { warned[ch] = true; console.warn('Maps.def: ' + d.id + ' has no legend entry for "' + ch + '" (using grass)'); }
          name = 'grass';
        }
        tiles[y * w + x] = name;
      }
    });
    const m = Object.assign({
      music: null, indoor: false, border: 'water', warps: [], npcs: [], items: [], signs: [], triggers: [], encounters: {},
    }, d, { w, h, tiles });
    m.name = d.name || d.id.toUpperCase();
    byId[d.id] = m;
    list.push(m);
    return m;
  }

  return { def, get: (id) => byId[id] || null, list };
})();

const World = (() => {
  const WALK = 0.25, RUN = 0.125, HOP = 0.5, HOLD = 0.1, WANDER = 0.4;
  const LEDGE = { ledge_s: 'down', ledge_w: 'left', ledge_e: 'right' };
  const FALLBACK = {
    water: '#3c6cb4', grass: '#68b850', tallgrass: '#4c9c3c', sand: '#e8d6a0', path: '#d8c08c', floor: '#c49c6c',
    wood_floor: '#b98a5a', cave_floor: '#585866', wall: '#e8e0d0', wall_in: '#e8e0d0', dune: '#e8d6a0',
  };
  const SOLID_RE = /tree|rock|water|wall|bush|fence|boulder|sign|mailbox|counter|table|bed|shelf|plant|lamp|machine|statue|roof|pier_post|flowerbed|^pc$/;
  const DOOR_RE = /door|stairs|cave_entrance|cave_exit|cave_ladder/;
  const ORB = ['..KKKK..', '.KRRRRK.', 'KRWWRRRK', 'KRWRRRRK', 'KRRRRRRK', 'KRRRRRRK', '.KRRRRK.', '..KKKK..'];
  const ORB_COLOR = { K: '#402020', R: '#e03838', W: '#ffffff' };
  const L_LETTER = { up: 'u', down: 'd', left: 'l', right: 'r' };

  let scene = null;          // the opaque world scene
  let map = null;            // runtime map: a copy of the Maps.def object with live tiles/npcs/items
  let busy = 0;              // script locks (World.lock / unlock, tasks, warps)
  let taskBusy = false;      // one async task (script, warp, encounter, trigger) at a time
  let holdDir = null, holdT = 0;
  let bumpCd = 0;
  let popup = null;          // location name popup {name, t}
  let lastName = null;
  let rustles = [];          // tall grass rustle marks {x, y, t}
  let orbC = null;
  const tcache = {};
  // The player object is reused for the whole session so World.player stays the same reference.
  const player = { x: 0, y: 0, dir: 'down', frame: 0, moving: null, stepN: 0, scripted: false, emote: null, sprite: 'player' };

  // ---------- small helpers (private: every file shares one scope) ----------
  function sfx(n) { try { if (typeof Sound !== 'undefined' && Sound.play) Sound.play(n); } catch (_) {} }
  function bgm(t) { try { if (typeof Music !== 'undefined' && Music.play) return Music.play(t); } catch (_) {} return null; }
  function safe(fn) { try { return !!fn(); } catch (e) { showError(e); return false; } }

  function fallbackTile(name) {
    return {
      name,
      solid: SOLID_RE.test(name),
      door: DOOR_RE.test(name),
      counter: name === 'counter',
      over: name === 'tallgrass',
      water: /water/.test(name),
      enc: name === 'tallgrass' ? 'grass' : name === 'cave_floor' ? 'cave' : null,
      ledge: LEDGE[name] || null,
      chop: name === 'chop_tree',
      smash: name === 'smash_rock',
      draw(g, x, y) { g.fillStyle = FALLBACK[name] || '#c040c0'; g.fillRect(x, y, TILE, TILE); },
    };
  }
  // Tile info from Tiles.get, with a fallback when Tiles or the tile is missing.
  function tinfo(name) {
    let t = tcache[name];
    if (t) return t;
    try { t = (typeof Tiles !== 'undefined' && Tiles.get) ? Tiles.get(name) : null; } catch (_) { t = null; }
    if (!t) t = fallbackTile(name);
    tcache[name] = t;
    return t;
  }
  function drawTile(g, name, x, y) {
    const ti = tinfo(name);
    if (ti.draw) ti.draw(g, x, y, G.time); else fallbackTile(name).draw(g, x, y);
  }
  function drawChar(g, name, x, y, dir, frame) {
    if (typeof Chars !== 'undefined' && Chars.draw) { Chars.draw(g, name, x, y, dir, frame); return; }
    g.fillStyle = '#e0a060'; g.fillRect(x + 3, y + 2, 10, 14);
    g.fillStyle = '#303030'; g.fillRect(x + 5, y + 6, 2, 2); g.fillRect(x + 9, y + 6, 2, 2);
  }
  function drawShadow(g, x, y) {
    if (typeof Chars !== 'undefined' && Chars.shadow) { Chars.shadow(g, x, y); return; }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 3, y + 12, 10, 3);
  }
  function drawOrb(g, x, y) {
    if (!orbC) {
      orbC = makeCanvas(8, 8, (c, cg) => {
        ORB.forEach((row, yy) => {
          for (let xx = 0; xx < 8; xx++) {
            const col = ORB_COLOR[row[xx]];
            if (col) { cg.fillStyle = col; cg.fillRect(xx, yy, 1, 1); }
          }
        });
      });
    }
    g.drawImage(orbC, x, y);
  }
  function drawBubble(g, x, y, ch) {
    const bx = x + 10, by = y - 12;
    UI.box(g, bx, by, 12, 12, 'white');
    drawText(g, ch, bx + 4, by + 2, '#e04040', '#ffffff');
  }
  function drawPopup(g) {
    const t = popup.t, hold = 1.7;
    const y = Math.round(t < 0.3 ? lerp(-22, 4, t / 0.3) : t > hold ? lerp(4, -22, (t - hold) / 0.3) : 4);
    const tw = typeof textWidth === 'function' ? textWidth(popup.name) : popup.name.length * 6;
    UI.box(g, 4, y, Math.max(72, tw + 16), 20, 'white');
    drawText(g, popup.name, 12, y + 6, '#404040', '#d0d0c8');
  }

  // ---------- map queries ----------
  const inMap = (x, y) => !!map && x >= 0 && y >= 0 && x < map.w && y < map.h;
  const tileName = (x, y) => map.tiles[y * map.w + x];
  const tileAt = (x, y) => tinfo(tileName(x, y));
  const flagKey = (it) => it.key;
  function itemAt(x, y, visibleOnly) {
    return map.items.find((i) => i.x === x && i.y === y && !flag(flagKey(i)) && (!visibleOnly || !i.hidden)) || null;
  }
  function npcAt(x, y, except) {
    return map.npcs.find((n) => n !== except && n.active && !n.hidden && n.x === x && n.y === y) || null;
  }
  function warpAt(x, y) { return map.warps.find((w) => w.x === x && w.y === y) || null; }
  // Edge warps (on the map perimeter) fire when walking off the edge; others fire when stepped onto.
  function stepWarp(x, y) {
    const w = warpAt(x, y);
    if (!w) return null;
    const edge = x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1;
    return (!edge || tileAt(x, y).door) ? w : null;
  }
  function blockedFor(who, x, y) {
    if (!inMap(x, y)) return true;
    const ti = tileAt(x, y);
    if (ti.solid) return true;
    if (itemAt(x, y, true)) return true;
    if (who !== player) {
      if (ti.ledge || ti.door || warpAt(x, y)) return true;
      if (player.x === x && player.y === y) return true;
    }
    return !!npcAt(x, y, who);
  }
  function dirTo(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 0 && dy === 0) return 'down';
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }
  function lead() { return G.party.find((m) => m && m.hp > 0) || null; }

  // ---------- loading ----------
  function mkNpc(d) {
    return Object.assign({}, d, {
      x: d.x, y: d.y, homeX: d.x, homeY: d.y, dir: d.dir || 'down', move: d.move || 'still',
      active: true, hidden: false, moving: null, frame: 0, stepN: 0, emote: null,
      timer: 1 + R.float() * 2,
    });
  }
  function refreshNpcs() {
    if (!map) return;
    for (const n of map.npcs) {
      n.active = n.cond ? safe(n.cond) : true;
      if (!n.active) n.moving = null;
    }
  }
  function load(id, x, y, dir) {
    const def = Maps.get(id);
    if (!def) throw new Error('World: no map called "' + id + '"');
    const prev = lastName;
    map = Object.assign({}, def, {
      tiles: def.tiles.slice(),
      cleared: new Set(),
      shake: null,
      npcs: (def.npcs || []).map(mkNpc),
      items: (def.items || []).map((it) => Object.assign({}, it, { key: it.id || (id + ':' + it.x + ',' + it.y) })),
    });
    G.map = id; G.x = x; G.y = y; G.dir = dir;
    Object.assign(player, { x, y, dir, frame: 0, moving: null, stepN: 0, scripted: false, emote: null });
    holdDir = null; holdT = 0;
    rustles = [];
    refreshNpcs();
    if (!map.indoor && map.name !== prev) popup = { name: map.name, t: 0 };
    lastName = map.name;
    if (map.music) bgm(map.music);
  }

  // ---------- movement ----------
  function startMove(o, nx, ny, dur, jump, d) {
    o.moving = { fx: o.x, fy: o.y, tx: nx, ty: ny, t: 0, dur, jump: !!jump };
    o.x = nx; o.y = ny; o.dir = d;
    o.stepN++;
    o.frame = (o.stepN & 1) ? 1 : 2;
    if (o === player) { G.x = nx; G.y = ny; G.dir = d; }
  }
  function advance(o, dt) {
    const m = o.moving;
    if (!m) return;
    m.t += dt;
    if (m.t < m.dur) return;
    o.moving = null;
    o.frame = 0;
    if (o === player && !o.scripted) afterStep();
  }
  // Visual position in pixels: x, y (with the hop arc) and gy (ground y, for sorting and the shadow).
  function visPos(o) {
    const m = o.moving;
    if (!m) return { x: o.x * TILE, y: o.y * TILE, gy: o.y * TILE };
    const e = clamp(m.t / m.dur, 0, 1);
    const x = lerp(m.fx, m.tx, e) * TILE;
    const gy = lerp(m.fy, m.ty, e) * TILE;
    return { x, y: m.jump ? gy - Math.sin(Math.PI * e) * 12 : gy, gy };
  }
  function bump() {
    if (bumpCd > 0) return;
    bumpCd = 0.3;
    sfx('bump');
  }
  function tryMove(d) {
    const [dx, dy] = DIRS[d];
    player.dir = d; G.dir = d;
    const nx = player.x + dx, ny = player.y + dy;
    if (!inMap(nx, ny)) {
      const w = warpAt(player.x, player.y);   // edge warp: walking off the map from a warp tile
      if (w) task(() => doWarp(w, null)); else bump();
      return;
    }
    const ti = tileAt(nx, ny);
    if (ti.ledge) {
      if (ti.ledge === d) {
        const lx = nx + dx, ly = ny + dy;
        if (!blockedFor(player, lx, ly)) { sfx('ledge'); startMove(player, lx, ly, HOP, true, d); return; }
      }
      bump();
      return;
    }
    if (blockedFor(player, nx, ny)) { bump(); return; }
    startMove(player, nx, ny, Input.held('b') ? RUN : WALK, false, d);
  }
  function input(dt) {
    const d = Input.dir();
    if (!d) { holdDir = null; holdT = 0; }
    else if (d !== holdDir) { holdDir = d; holdT = 0; }
    else holdT += dt;
    if (player.moving) return;
    if (Input.pressed('start')) { task(() => Menus.start()); return; }
    if (Input.pressed('a')) { task(interact); return; }
    if (!d) return;
    if (player.dir !== d) { player.dir = d; G.dir = d; }   // a tap only turns
    if (holdT >= HOLD) tryMove(d);
  }

  // Runs after each completed player step. Decisions are made synchronously; anything that takes time runs as a task.
  function afterStep() {
    const p = player, m0 = map;
    const sw = stepWarp(p.x, p.y);
    if (sw) { task(() => doWarp(sw, tileName(p.x, p.y))); return; }
    G.steps++;
    const ti = tileAt(p.x, p.y);
    if (ti.enc === 'grass') rustles.push({ x: p.x, y: p.y, t: 0 });
    const trig = (map.triggers || []).filter((t) => {
      const w = t.w || 1, h = t.h || 1;
      return p.x >= t.x && p.x < t.x + w && p.y >= t.y && p.y < t.y + h && (!t.cond || safe(t.cond));
    });
    let repelEnd = false;
    if (G.repel > 0) { G.repel--; if (G.repel === 0) repelEnd = true; }
    const spot = findSpotter();
    const enc = spot ? null : rollEncounter(ti);
    if (!trig.length && !spot && !enc && !repelEnd) return;
    task(async () => {
      if (repelEnd) await UI.say("REPEL's effect wore off!");
      for (const t of trig) {
        if (map !== m0) return;
        if (t.run) await t.run();
      }
      if (map !== m0) return;
      if (spot) { await trainerSpotted(spot.npc, spot.k); return; }
      if (enc) await runEncounter(enc, m0);
    });
  }

  // Runs `fn` as the one async task at a time. Holds the world lock until it resolves.
  function task(fn) {
    if (taskBusy) return;
    taskBusy = true;
    busy++;
    Promise.resolve().then(fn).catch(showError).then(() => {
      taskBusy = false;
      busy--;
      refreshNpcs();
    });
  }

  // ---------- warps, entry, blackout ----------
  async function doWarp(w, tn) {
    if (tn) sfx(/stairs/.test(tn) ? 'stairs' : 'door');
    await warp(w.to, w.tx, w.ty, w.dir || 'down');
  }
  async function enterChecks() {
    const m0 = map;
    if (map.onEnter) await map.onEnter();
    if (map !== m0) return;
    const sp = findSpotter();
    if (sp) await trainerSpotted(sp.npc, sp.k);
  }
  async function warp(id, x, y, dir) {
    busy++;
    try {
      await fadeOut(0.25);
      load(id, x, y, dir);
      await fadeIn(0.25);
      await enterChecks();
    } finally {
      busy--;
      refreshNpcs();
    }
  }
  async function blackout() {
    busy++;
    try {
      await UI.say('{P} is out of usable TIDELINGS!\f{P} blacked out!');
      G.money = Math.floor(G.money / 2);
      await fadeOut(0.3, '#fff');
      Mon.healParty();
      const L = G.lastHeal || { map: 'player_house_1f', x: 5, y: 5 };
      await warp(L.map, L.x, L.y, 'down');
    } finally {
      busy--;
    }
  }
  function enter() {
    if (!scene) scene = { name: 'world', opaque: true, update: (dt) => update(dt), draw: (g) => draw(g) };
    if (!Scenes.has(scene)) Scenes.push(scene);
    busy++;
    return (async () => {
      try {
        load(G.map, G.x, G.y, G.dir);
        await fadeIn(0.3);
        await enterChecks();
      } finally {
        busy--;
        refreshNpcs();
      }
    })();
  }

  // ---------- trainers ----------
  // First undefeated trainer that can see the player: { npc, k } where k is the distance in tiles.
  function findSpotter() {
    for (const n of map.npcs) {
      const t = n.trainer;
      if (!t || !n.active || n.hidden || flag('tr_' + t.id)) continue;
      const [dx, dy] = DIRS[n.dir];
      const sight = t.sight || 4;
      for (let k = 1; k <= sight; k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        if (!inMap(x, y)) break;
        if (player.x === x && player.y === y) return { npc: n, k };
        if (tileAt(x, y).solid || itemAt(x, y, true) || npcAt(x, y, n)) break;
      }
    }
    return null;
  }
  async function trainerSpotted(n, k) {
    const t = n.trainer;
    await Script.emote(n, '!');
    bgm(t.music || 'trainer');
    if (k > 1) await Script.walk(n, L_LETTER[n.dir].repeat(k - 1));
    if (t.intro) await UI.say(t.intro);
    await Script.trainerBattle(n);
  }
  async function talkTo(n) {
    n.dir = dirTo(n, player);
    const t = n.trainer;
    if (t) {
      if (flag('tr_' + t.id)) {
        if (t.after) await UI.say(t.after);
        else if (n.text) await UI.say(n.text);
        return;
      }
      if (t.intro) await UI.say(t.intro);
      bgm(t.music || 'trainer');
      await Script.trainerBattle(n);
      return;
    }
    if (n.talk) { await n.talk(n); return; }
    if (n.text) await UI.say(n.text);
  }

  // ---------- encounters ----------
  function rollEncounter(ti) {
    if (DBG.noEncounters || !ti.enc || !map.encounters) return null;
    const E = map.encounters[ti.enc];
    if (!E || !E.list || !E.list.length) return null;
    const lead0 = lead();
    if (!lead0) return null;
    if (!R.chance(E.rate)) return null;
    const pick = R.weighted(E.list);
    const lv = R.int(pick[1], pick[2]);
    if (G.repel > 0 && lv < lead0.lv) return null;
    return { sp: pick[0], lv };
  }
  async function runEncounter(enc, m0) {
    sfx('encounter');
    const r = await Battle.wild(enc.sp, enc.lv);
    if (r === 'lose') { await blackout(); return; }
    if (map === m0 && m0.music) bgm(m0.music);
  }

  // ---------- A button ----------
  async function interact() {
    const d = player.dir;
    const [dx, dy] = DIRS[d];
    const fx = player.x + dx, fy = player.y + dy;
    let n = npcAt(fx, fy, null);
    if (!n && inMap(fx, fy) && tileAt(fx, fy).counter) n = npcAt(fx + dx, fy + dy, null);
    if (n) return talkTo(n);
    if (!inMap(fx, fy)) return;
    const it = map.items.find((i) => i.x === fx && i.y === fy && !flag(flagKey(i)));
    if (it) return pickup(it);
    const sign = (map.signs || []).find((s) => s.x === fx && s.y === fy);
    if (sign) return sign.run ? sign.run() : UI.say(sign.text);
    const tn = tileName(fx, fy);
    if ((tn === 'chop_tree' || tn === 'smash_rock') && !map.cleared.has(fx + ',' + fy)) return fieldMove(fx, fy, tn);
  }
  async function pickup(it) {
    setFlag(flagKey(it));
    await Script.give(it.item, it.n || 1);
  }
  async function fieldMove(fx, fy, tn) {
    const m = map;
    const chop = tn === 'chop_tree';
    const mv = chop ? 'chop' : 'smash', hm = chop ? 'hm_chop' : 'hm_smash', label = chop ? 'CHOP' : 'SMASH';
    const holder = G.party.find((p) => p && p.hp > 0 && Mon.knows(p, mv));
    if (!holder || !bagCount(hm)) {
      await UI.say(chop ? 'This tree looks like it can be CUT down!' : 'This rock looks like it can be SMASHED!');
      return;
    }
    if (!(await UI.yesno('Use ' + label + '?'))) return;
    await UI.say(Mon.name(holder) + ' used ' + label + '!');
    sfx(chop ? 'chop' : 'smash');
    m.shake = { x: fx, y: fy };
    await tween(0.5, () => {});
    const caveish = m.cave || !!(m.encounters && m.encounters.cave);
    m.tiles[fy * m.w + fx] = caveish ? 'cave_floor' : 'grass';
    m.shake = null;
    m.cleared.add(fx + ',' + fy);
  }

  // ---------- NPC wandering ----------
  function aiNpc(n, dt) {
    if (!n.active || n.hidden || n.moving || n.move === 'still' || !n.move) return;
    n.timer -= dt;
    if (n.timer > 0) return;
    if (n.move === 'look') {
      n.dir = R.pick(DIR_LIST);
      n.timer = 2 + R.float() * 2;
      return;
    }
    if (n.move === 'wander') {
      n.timer = 2 + R.float() * 3;
      const d = R.pick(DIR_LIST);
      const [dx, dy] = DIRS[d];
      const nx = n.x + dx, ny = n.y + dy;
      n.dir = d;
      if (Math.abs(nx - n.homeX) > 2 || Math.abs(ny - n.homeY) > 2) return;
      if (blockedFor(n, nx, ny)) return;
      startMove(n, nx, ny, WANDER, false, d);
    }
  }
  const DIR_LIST = ['up', 'down', 'left', 'right'];

  // ---------- per-frame ----------
  function update(dt) {
    if (!map) return;
    if (bumpCd > 0) bumpCd -= dt;
    if (popup) { popup.t += dt; if (popup.t >= 2) popup = null; }
    for (let i = rustles.length - 1; i >= 0; i--) { rustles[i].t += dt; if (rustles[i].t > 0.3) rustles.splice(i, 1); }
    advance(player, dt);
    for (const n of map.npcs) if (n.moving) advance(n, dt);
    if (busy > 0) return;
    for (const n of map.npcs) aiNpc(n, dt);
    input(dt);
  }

  // ---------- drawing ----------
  function draw(g) {
    if (!map) return;
    const p = player;
    const pv = visPos(p);
    const mw = map.w * TILE, mh = map.h * TILE;
    let cx = Math.round(pv.x + TILE / 2 - W / 2);
    let cy = Math.round(pv.gy + TILE / 2 - H / 2);
    cx = mw >= W ? clamp(cx, 0, mw - W) : -Math.floor((W - mw) / 2);
    cy = mh >= H ? clamp(cy, 0, mh - H) : -Math.floor((H - mh) / 2);

    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(-cx, -cy);

    const x0 = Math.floor(cx / TILE) - 1, x1 = Math.ceil((cx + W) / TILE) + 1;
    const y0 = Math.floor(cy / TILE) - 1, y1 = Math.ceil((cy + H) / TILE) + 1;
    const shake = map.shake;
    const sx = shake ? Math.round(Math.sin(G.time * 80) * 1.5) : 0;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        let name;
        if (inMap(tx, ty)) name = tileName(tx, ty);
        else if (map.indoor) continue;
        else name = map.border || 'water';
        const ox = shake && tx === shake.x && ty === shake.y ? sx : 0;
        drawTile(g, name, tx * TILE + ox, ty * TILE);
      }
    }

    // items on the ground
    for (const it of map.items) {
      if (it.hidden || flag(flagKey(it))) continue;
      if (it.x < x0 || it.x > x1 || it.y < y0 || it.y > y1) continue;
      drawOrb(g, it.x * TILE + 4, it.y * TILE + 4);
    }

    // hop shadow, then NPCs and the player sorted by y
    if (p.moving && p.moving.jump) {
      const e = clamp(p.moving.t / p.moving.dur, 0, 1);
      drawShadow(g, lerp(p.moving.fx, p.moving.tx, e) * TILE, pv.gy);
    }
    const ents = [];
    for (const n of map.npcs) if (n.active && !n.hidden && n.sprite !== 'none') ents.push(n);
    ents.push(p);
    const sorted = ents.map((o) => ({ o, v: visPos(o) }));
    sorted.sort((a, b) => a.v.gy - b.v.gy);
    for (const { o, v } of sorted) {
      drawChar(g, o === p ? 'player' : (o.sprite || o.id), Math.round(v.x), Math.round(v.y), o.dir, o.frame || 0);
      if (o.emote) drawBubble(g, Math.round(v.x), Math.round(v.y), o.emote);
    }

    // over layer (tall grass blades in front of the feet)
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!inMap(tx, ty)) continue;
        const ti = tileAt(tx, ty);
        if (ti.over && ti.drawOver) ti.drawOver(g, tx * TILE, ty * TILE, G.time);
      }
    }
    // rustles
    g.fillStyle = '#f4fff0';
    for (const r of rustles) {
      const rx = r.x * TILE, ry = r.y * TILE - 2 - Math.floor(r.t * 12);
      g.fillRect(rx + 3, ry, 1, 2); g.fillRect(rx + 7, ry - 2, 1, 2); g.fillRect(rx + 11, ry, 1, 2);
    }
    g.restore();

    if (popup) drawPopup(g);
  }

  // ---------- public ----------
  return {
    get player() { return player; },
    get map() { return map; },
    enter,
    warp,
    blackout,
    refresh: refreshNpcs,
    npc(id) { return map ? (map.npcs.find((n) => n.id === id) || null) : null; },
    lock() { busy++; },
    unlock() { busy = Math.max(0, busy - 1); },
    isBusy() { return busy > 0 || !!player.moving; },
    update,
    draw,
    // used by Script.walk: start one scripted step of `o` (player or npc) toward (nx, ny)
    _move: startMove,
  };
})();
