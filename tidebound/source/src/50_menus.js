// Tidebound: menus. The start menu and the screens under it (TIDELINGS, summary, BAG, TIDEDEX, trainer card,
// OPTIONS), plus the PC, the MART, name entry, and the medicine / HM / evolution helpers that menus and battle share.
// Each screen is a scene pushed onto Scenes. Full screens are opaque; the start menu is an overlay. Every public
// function returns a Promise that resolves when its scene pops itself. Only `Menus` is declared at top level.

const Menus = (() => {
  // ---------- palette and text ----------
  const BG = '#dde7f1';
  const INK = '#404040';
  const BLUE = '#3070d0';
  const DIM = '#9aa2aa';
  const NO_EFFECT = "It won't have any effect.";
  const STATUS_NAME = { psn: 'POISON', brn: 'BURN', par: 'PARALYSIS', slp: 'SLEEP' };
  const STATUS_BADGE = {
    psn: ['PSN', '#a040a0'], brn: ['BRN', '#e06030'], par: ['PAR', '#b89010'], slp: ['SLP', '#607890'], fnt: ['FNT', '#505050'],
  };
  const CAT_NAME = { phys: 'PHYSICAL', spec: 'SPECIAL', status: 'STATUS' };
  const HM_MOVE = { hm_chop: 'chop', hm_smash: 'smash' };
  const POCKETS = [
    { name: 'ITEMS', kinds: ['medicine', 'field'] },
    { name: 'ORBS', kinds: ['ball'] },
    { name: 'BERRIES & HELD', kinds: ['held'] },
    { name: 'KEY ITEMS', kinds: ['key'] },
  ];
  const START_DESC = {
    dex: 'Your record of every Tideling you have met.',
    party: 'The Tidelings travelling with you.',
    bag: 'Items you are carrying.',
    card: 'Your trainer card.',
    save: 'Save your progress.',
    options: 'Text speed, music and sound.',
    exit: 'Close this menu.',
  };

  // ---------- small helpers ----------
  function sfx(name) { try { if (typeof Sound !== 'undefined') Sound.play(name); } catch (_) {} }
  function pad3(n) { return String(n).padStart(3, '0'); }
  function fit(s, maxW) {
    if (textWidth(s) <= maxW) return s;
    let t = s;
    while (t.length > 1 && textWidth(t + '.') > maxW) t = t.slice(0, -1);
    return t + '.';
  }
  function right(g, s, xr, y, color) { drawText(g, s, xr - textWidth(s), y, color); }
  function center(g, s, xc, y, color) { drawText(g, s, Math.round(xc - textWidth(s) / 2), y, color); }
  function panel(g, x, y, w, h) { UI.box(g, x, y, w, h, 'white'); }
  function bg(g) { g.fillStyle = BG; g.fillRect(0, 0, W, H); }
  function msgBox(g, text, width = 300, lines = 3) {
    panel(g, 4, 132, 312, 44);
    wrapText(text || '', width).slice(0, lines).forEach((l, i) => drawText(g, l, 10, 137 + i * 12));
  }
  function nameOf(m) { return Mon.name(m); }
  function speciesOf(m) { return SPECIES[m.sp]; }
  function maxHp(m) { return Mon.maxhp(m); }
  function ratioOf(m) { return clamp(m.hp / Math.max(1, maxHp(m)), 0, 1); }
  function statusKey(m) { return m.hp <= 0 ? 'fnt' : (m.status || null); }
  function say(text, opts) { return UI.say(text, opts); }

  // ---------- pixel drawing ----------
  function disc(g, cx, cy, r, color) {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) g.fillRect(cx + x, cy + y, 1, 1);
  }
  function hole(g, cx, cy, r) {
    g.save();
    g.globalCompositeOperation = 'destination-out';
    disc(g, cx, cy, r, '#000');
    g.restore();
  }
  function orbMark(g, cx, cy, r, caught) {
    disc(g, cx, cy, r, '#303038');
    disc(g, cx, cy, r - 1, caught ? '#e8e8e8' : '#b8bcc4');
    if (caught) {
      g.fillStyle = '#e04040';
      for (let y = -r + 1; y < 0; y++) for (let x = -r + 1; x < r; x++) if (x * x + y * y <= (r - 1) * (r - 1) + (r - 1)) g.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  const iconCache = {};
  function itemIcon(id) {
    if (!iconCache[id]) iconCache[id] = makeCanvas(16, 16, (c, g) => paintItem(g, id));
    return iconCache[id];
  }
  function paintItem(g, id) {
    const it = ITEMS[id] || {};
    if (it.kind === 'ball') { orbMark(g, 8, 8, 7, true); return; }
    if (it.kind === 'medicine') {
      g.fillStyle = '#303038'; g.fillRect(3, 3, 10, 12); g.fillRect(6, 1, 4, 2);
      g.fillStyle = it.cure ? '#9a84d8' : '#e05868'; g.fillRect(4, 4, 8, 10);
      g.fillStyle = '#ffffff'; g.fillRect(7, 6, 2, 5); g.fillRect(5, 8, 6, 2);
      return;
    }
    if (it.kind === 'held' && /berry$/.test(id)) {
      disc(g, 8, 9, 5, '#303038'); disc(g, 8, 9, 4, '#d04878');
      g.fillStyle = '#48a848'; g.fillRect(9, 2, 4, 2); g.fillRect(11, 1, 2, 1);
      return;
    }
    if (it.kind === 'held') {
      g.fillStyle = '#303038'; g.fillRect(6, 1, 4, 14); g.fillRect(1, 6, 14, 4);
      g.fillStyle = '#6cc0ec'; g.fillRect(7, 2, 2, 12); g.fillRect(2, 7, 12, 2);
      return;
    }
    if (it.kind === 'key') {
      disc(g, 5, 8, 4, '#303038'); disc(g, 5, 8, 3, '#f0c040'); hole(g, 5, 8, 1);
      g.fillStyle = '#303038'; g.fillRect(8, 7, 7, 3);
      g.fillStyle = '#f0c040'; g.fillRect(8, 8, 7, 1); g.fillRect(12, 10, 2, 2);
      return;
    }
    if (id === 'repel') {
      g.fillStyle = '#303040'; g.fillRect(6, 1, 4, 3);
      g.fillStyle = '#303038'; g.fillRect(4, 4, 8, 11);
      g.fillStyle = '#8898a8'; g.fillRect(5, 5, 6, 9);
      return;
    }
    disc(g, 8, 8, 6, '#303038'); disc(g, 8, 8, 5, '#b07838'); hole(g, 8, 8, 2);
  }

  // Pill with the type name in its colour. Returns its width.
  function typePill(g, type, x, y) {
    const label = String(type).toUpperCase();
    const w = textWidth(label) + 6;
    g.fillStyle = TYPE_COLOR[type] || '#888888';
    g.fillRect(x, y, w, 9);
    if (type === 'electric' || type === 'ground') drawText(g, label, x + 3, y + 1, '#303030', '#f8f8e8');
    else drawText(g, label, x + 3, y + 1, '#ffffff', '#303030');
    return w;
  }
  function typeRow(g, types, xc, y) {
    const widths = types.map((t) => textWidth(String(t).toUpperCase()) + 6);
    const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, types.length - 1) * 3;
    let x = Math.round(xc - total / 2);
    types.forEach((t) => { x += typePill(g, t, x, y) + 3; });
  }
  function statusBadge(g, key, x, y) {
    const b = STATUS_BADGE[key];
    if (!b) return 0;
    const w = textWidth(b[0]) + 6;
    g.fillStyle = b[1];
    g.fillRect(x, y, w, 9);
    drawText(g, b[0], x + 3, y + 1, '#ffffff', '#202020');
    return w;
  }
  function bar(g, x, y, w, h, frac, color) {
    g.fillStyle = '#505868'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#f4f4ec'; g.fillRect(x, y, w, h);
    const fw = Math.round(w * clamp(frac, 0, 1));
    if (fw > 0) { g.fillStyle = color; g.fillRect(x, y, fw, h); }
  }
  function hpBar(g, x, y, w, h, frac) {
    bar(g, x, y, w, h, frac, frac > 0.5 ? '#38c060' : frac > 0.2 ? '#f8c830' : '#e04040');
  }
  const silCache = {};
  function silhouette(sp) {
    if (!silCache[sp]) {
      silCache[sp] = makeCanvas(64, 64, (c, g) => {
        g.drawImage(Sprites.mon(sp), 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#2c3440';
        g.fillRect(0, 0, 64, 64);
      });
    }
    return silCache[sp];
  }

  // ---------- scene plumbing ----------
  // Pushes a scene and returns a Promise that resolves with the value passed to scene.close(v).
  function run(scene) {
    return new Promise((resolve) => {
      let open = true;
      scene.busy = false;
      scene.close = (v) => {
        if (!open) return;
        open = false;
        Scenes.pop(scene);
        resolve(v);
      };
      Scenes.push(scene);
    });
  }
  // Runs an async handler for a scene; the scene ignores input until it finishes.
  function runAction(scene, fn) {
    scene.busy = true;
    Promise.resolve().then(fn).finally(() => { scene.busy = false; });
  }
  // Up/down for a list of n entries (no wrap).
  function nav(cur, n) {
    if (n <= 0) return 0;
    if (Input.repeat('up')) return Math.max(0, cur - 1);
    if (Input.repeat('down')) return Math.min(n - 1, cur + 1);
    return clamp(cur, 0, n - 1);
  }
  // Scroll offset that keeps cur visible in a window of `rows` lines.
  function scrollFor(cur, top, rows, n) {
    let t = top;
    if (cur < t) t = cur;
    if (cur >= t + rows) t = cur - rows + 1;
    return clamp(t, 0, Math.max(0, n - rows));
  }
  function inCave() {
    const mp = typeof World !== 'undefined' && World.map;
    return !!mp && String(mp.id || '').includes('cave');
  }

  // ---------- medicine, HMs and post-battle events (shared helpers) ----------
  // Normalised effects of a medicine item.
  function effectsOf(id) {
    const it = ITEMS[id] || {};
    return {
      heal: it.heal || 0,
      cure: it.cure || null,
      revive: it.revive ? (typeof it.revive === 'number' ? it.revive : 0.5) : (id === 'revive' ? 0.5 : 0),
      pp: it.pp || (id === 'ether' ? 10 : 0),
      levels: it.level || (id === 'rarecandy' ? 1 : 0),
    };
  }
  // Whether a medicine item would do something to this Tideling right now.
  function canUse(id, m) {
    const it = ITEMS[id];
    if (!it || !m || it.kind !== 'medicine') return false;
    const e = effectsOf(id);
    if (e.levels) return m.lv < 100;
    if (e.revive) return m.hp <= 0;
    if (m.hp <= 0) return false;
    if (e.heal) return m.hp < maxHp(m);
    if (e.cure) return e.cure === 'all' ? !!m.status : m.status === e.cure;
    if (e.pp) return m.moves.some((mv) => mv.pp < ((MOVES[mv.id] || { pp: 0 }).pp));
    return false;
  }
  // Applies a medicine item to a Tideling. Does not consume the item (the caller does).
  // Rare candy gains XP and returns the events; show them with Menus.showEvents.
  function useMedicine(id, m) {
    if (!canUse(id, m)) return { ok: false, text: NO_EFFECT };
    const nm = nameOf(m);
    const e = effectsOf(id);
    if (e.levels) {
      const growth = speciesOf(m).growth;
      const target = Mon.xpAt(Math.min(100, m.lv + e.levels), growth);
      const events = Mon.gainXp(m, Math.max(1, target - m.xp));
      return { ok: true, text: `${nm} ate the ${ITEMS[id].name}!`, events };
    }
    if (e.revive) {
      m.hp = Math.max(1, Math.floor(maxHp(m) * e.revive));
      m.status = null; m.slp = 0;
      return { ok: true, text: `${nm} was revived!` };
    }
    if (e.heal) {
      const before = m.hp;
      m.hp = Math.min(maxHp(m), m.hp + e.heal);
      return { ok: true, text: `${nm} regained ${m.hp - before} HP!` };
    }
    if (e.cure) {
      const st = m.status;
      m.status = null; m.slp = 0;
      return { ok: true, text: `${nm} was cured of ${STATUS_NAME[st] || 'its condition'}!` };
    }
    if (e.pp) {
      m.moves.forEach((mv) => { mv.pp = Math.min((MOVES[mv.id] || { pp: mv.pp }).pp, mv.pp + e.pp); });
      return { ok: true, text: `${nm}'s moves regained PP!` };
    }
    return { ok: false, text: NO_EFFECT };
  }
  function canLearnHm(m, mv) {
    const sp = SPECIES[m.sp];
    return !!sp && (sp.hm || []).includes(mv) && !Mon.knows(m, mv);
  }
  // Announces the results of Mon.gainXp, asking for forget-choices and running evolutions.
  async function showEvents(m, events) {
    for (const ev of events || []) {
      if (ev.type === 'level') {
        sfx('levelup');
        await say(`${nameOf(m)} grew to LV ${ev.lv}!`);
      } else if (ev.type === 'learn') {
        await say(`${nameOf(m)} learned ${MOVES[ev.move].name}!`);
      } else if (ev.type === 'learnFull') {
        const mvName = MOVES[ev.move].name;
        const slot = await forgetMove(m, ev.move);
        if (slot >= 0) {
          const old = MOVES[m.moves[slot].id].name;
          Mon.teach(m, ev.move, slot);
          await say(`1, 2 and... Poof! ${nameOf(m)} forgot ${old}. And... ${nameOf(m)} learned ${mvName}!`);
        } else {
          await say(`${nameOf(m)} did not learn ${mvName}.`);
        }
      } else if (ev.type === 'evolve' && typeof Evolve !== 'undefined') {
        await Evolve.run(m, ev.to);
      }
    }
  }
  // "X wants to forget a move": resolves with the slot (0-3) to overwrite, or -1 to give up. Does not teach.
  function forgetMove(m, move) {
    const rowsOf = () => {
      const rows = m.moves.map((mv) => ({ id: mv.id, pp: mv.pp, isNew: false }));
      rows.push({ id: move, isNew: true });
      return rows;
    };
    const s = { name: 'forget', opaque: true, cur: 0 };
    s.update = () => {
      if (s.busy) return;
      const rows = rowsOf();
      s.cur = nav(s.cur, rows.length);
      if (Input.pressed('b')) return s.close(-1);
      if (!Input.pressed('a')) return;
      if (s.cur === rows.length - 1) {
        runAction(s, async () => {
          if (await UI.yesno(`Give up on learning ${MOVES[move].name}?`)) s.close(-1);
        });
      } else {
        s.close(s.cur);
      }
    };
    s.draw = (g) => {
      bg(g);
      panel(g, 4, 4, 312, 18);
      drawText(g, `${fit(nameOf(m), 150)}  MOVES`, 10, 9);
      const rows = rowsOf();
      panel(g, 4, 26, 212, 102);
      drawMoveRows(g, rows, 4, 30, s.cur, true);
      drawMoveDetail(g, rows[s.cur].id, 222, 26, 94, 102);
      panel(g, 4, 132, 312, 44);
      drawText(g, 'Which move should be forgotten?', 10, 137);
      wrapText(MOVES[rows[s.cur].id].desc, 300).slice(0, 2).forEach((l, i) => drawText(g, l, 10, 149 + i * 12));
    };
    return run(s);
  }

  // Move rows: name, type pill and PP. rows entries are {id, pp, isNew} or null.
  function drawMoveRows(g, rows, x, y0, sel, showCursor) {
    rows.forEach((r, i) => {
      const y = y0 + i * 24;
      if (!r) { drawText(g, '-', x + 12, y + 3, DIM); return; }
      const mv = MOVES[r.id];
      if (!mv) return;
      drawText(g, fit(mv.name, 88), x + 12, y + 3, r.isNew ? BLUE : INK);
      typePill(g, mv.type, x + 104, y + 3);
      drawText(g, r.isNew ? 'NEW' : `PP ${r.pp}/${mv.pp}`, x + 162, y + 3, INK);
    });
    if (showCursor && rows[sel]) UI.cursor(g, x + 2, y0 + sel * 24 + 4);
  }
  function drawMoveDetail(g, id, x, y, w, h) {
    panel(g, x, y, w, h);
    const mv = id && MOVES[id];
    if (!mv) return;
    drawText(g, 'POWER', x + 8, y + 8, DIM);
    right(g, mv.power ? String(mv.power) : '--', x + w - 8, y + 18, INK);
    drawText(g, 'ACC', x + 8, y + 34, DIM);
    right(g, mv.acc ? String(mv.acc) : '--', x + w - 8, y + 44, INK);
    drawText(g, 'CLASS', x + 8, y + 60, DIM);
    drawText(g, CAT_NAME[mv.cat] || '-', x + 8, y + 70, INK);
  }

  // ---------- start menu ----------
  let startCursor = 0;
  function startEntries() {
    const list = [];
    if (flag('got_dex')) list.push({ k: 'dex', label: 'TIDEDEX' });
    if (G.party.length) list.push({ k: 'party', label: 'TIDELINGS' });
    list.push({ k: 'bag', label: 'BAG' }, { k: 'card', label: G.name }, { k: 'save', label: 'SAVE' },
      { k: 'options', label: 'OPTIONS' }, { k: 'exit', label: 'EXIT' });
    return list;
  }
  async function saveGame() {
    if (!(await UI.yesno('Would you like to save the game?'))) return;
    const ok = Save.write();
    sfx('save');
    await say(ok ? '{P} saved the game.' : 'The game could not be saved.');
  }
  // Start menu: an overlay on the world. Resolves when closed.
  function start() {
    const s = { name: 'start', opaque: false };
    s.update = () => {
      if (s.busy) return;
      const list = startEntries();
      startCursor = nav(Math.min(startCursor, list.length - 1), list.length);
      if (Input.pressed('b') || Input.pressed('start')) return s.close();
      if (!Input.pressed('a')) return;
      const k = list[startCursor].k;
      if (k === 'exit') return s.close();
      runAction(s, async () => {
        if (k === 'dex') await dex();
        else if (k === 'party') await party({ mode: 'view' });
        else if (k === 'bag') {
          const r = await bag({ mode: 'field' });
          if (r && r.warp) {
            s.close();
            const h = G.lastHeal;
            await World.warp(h.map, h.x, h.y, 'down');
          }
        } else if (k === 'card') await trainerCard();
        else if (k === 'save') await saveGame();
        else if (k === 'options') await options();
      });
    };
    s.draw = (g) => {
      const list = startEntries();
      const idx = Math.min(startCursor, list.length - 1);
      const lines = wrapText(START_DESC[list[idx].k] || '', 146);
      panel(g, 4, 4, 156, lines.length * 12 + 8);
      lines.forEach((l, i) => drawText(g, l, 11, 9 + i * 12));
      panel(g, 228, 4, 88, list.length * 12 + 8);
      list.forEach((e, i) => {
        const y = 9 + i * 12;
        drawText(g, e.label, 240, y, i === idx ? BLUE : INK);
        if (i === idx) UI.cursor(g, 231, y);
      });
    };
    return run(s);
  }

  // ---------- TIDELINGS (party) ----------
  function rowY(i) { return i === 0 ? 4 : 4 + (i - 1) * 25; }
  function leadPanel(g, m, x, y, w, h, dimmed) {
    panel(g, x, y, w, h);
    g.drawImage(Sprites.mon(m.sp), x + 24, y + 6);
    drawText(g, fit(nameOf(m), w - 40), x + 6, y + 74, dimmed ? DIM : INK);
    right(g, 'LV ' + m.lv, x + w - 6, y + 74, INK);
    drawText(g, 'HP', x + 6, y + 86);
    hpBar(g, x + 24, y + 88, w - 36, 4, ratioOf(m));
    drawText(g, `${m.hp}/${maxHp(m)}`, x + 6, y + 96);
    let bx = x + 6;
    const sk = statusKey(m);
    if (sk) bx += statusBadge(g, sk, bx, y + 108) + 4;
    if (m.item) { g.fillStyle = '#e8b020'; g.fillRect(x + w - 12, y + 108, 6, 6); }
  }
  function rowPanel(g, m, x, y, w, h, dimmed, frame) {
    panel(g, x, y, w, h);
    g.drawImage(Sprites.monIcon(m.sp, frame), x + 2, y);
    const c = dimmed ? DIM : INK;
    drawText(g, fit(nameOf(m), 74), x + 30, y + 3, c);
    drawText(g, 'LV ' + m.lv, x + 108, y + 3, c);
    const sk = statusKey(m);
    if (sk) statusBadge(g, sk, x + 138, y + 3);
    hpBar(g, x + 30, y + 15, 70, 4, ratioOf(m));
    drawText(g, `${m.hp}/${maxHp(m)}`, x + 104, y + 13, c);
    if (m.item) { g.fillStyle = '#e8b020'; g.fillRect(x + w - 9, y + 4, 5, 5); }
  }

  // Party screen. opts: mode 'view' | 'battle' | 'item' | 'teach' | 'pick'; title; canCancel; active (battle index
  // of the mon in the fight); filter(m) → bool; badMsg string or fn(m); item / move ids for context.
  // Resolves with the chosen index (or -1 when cancelled).
  function party(opts = {}) {
    const mode = opts.mode || 'view';
    const canCancel = opts.canCancel !== false;
    const s = { name: 'party', opaque: true, cur: 0, moving: -1 };
    const prompt = () => (s.moving >= 0 ? 'Move to where?' : (opts.title || 'Choose a TIDELING.'));
    const dimmed = (i) => {
      const m = G.party[i];
      if (mode === 'battle') return m.hp <= 0 || i === opts.active;
      return !!opts.filter && !opts.filter(m);
    };
    s.update = () => {
      if (s.busy) return;
      const n = G.party.length;
      s.cur = nav(s.cur, n + 1);
      if (Input.pressed('left')) s.cur = 0;
      else if (Input.pressed('right') && s.cur === 0 && n > 1) s.cur = 1;
      if (Input.pressed('b')) {
        if (s.moving >= 0) s.moving = -1;
        else if (canCancel) s.close(-1);
      } else if (Input.pressed('a')) {
        if (s.cur >= n) {
          if (s.moving >= 0) s.moving = -1;
          else if (canCancel) s.close(-1);
        } else {
          const i = s.cur;
          runAction(s, () => partyPick(s, i, opts, mode));
        }
      }
    };
    s.draw = (g) => {
      bg(g);
      const n = G.party.length;
      const frame = Math.floor(Timers.time * 2) & 1;
      if (n) leadPanel(g, G.party[0], 4, 4, 112, 124, dimmed(0));
      for (let i = 1; i < n; i++) rowPanel(g, G.party[i], 126, rowY(i), 190, 25, dimmed(i), frame);
      if (s.moving >= 0) {
        g.fillStyle = BLUE;
        if (s.moving === 0) g.fillRect(118, 4, 3, 124);
        else g.fillRect(120, rowY(s.moving), 3, 25);
      }
      msgBox(g, prompt(), 226, 2);
      panel(g, 246, 150, 66, 20);
      center(g, 'CANCEL', 279, 156, INK);
      if (s.cur === 0 && n) UI.cursor(g, 117, 56);
      else if (s.cur < n) UI.cursor(g, 117, rowY(s.cur) + 8);
      else UI.cursor(g, 237, 156);
    };
    return run(s);
  }
  async function partyPick(s, i, opts, mode) {
    const m = G.party[i];
    if (s.moving >= 0) {
      if (i !== s.moving) {
        const a = s.moving;
        [G.party[a], G.party[i]] = [G.party[i], G.party[a]];
      }
      s.moving = -1;
      return;
    }
    const at = { x: 150, y: Math.min(90, rowY(i)) };
    if (mode === 'view') {
      const field = ['chop', 'smash'].filter((mv) => Mon.knows(m, mv)).map((mv) => mv.toUpperCase());
      const labels = ['SUMMARY', 'SWITCH', 'ITEM', ...field, 'CANCEL'];
      const pick = labels[await UI.choose(labels, at)];
      if (pick === 'SUMMARY') s.cur = await summary(m, G.party, i);
      else if (pick === 'SWITCH') s.moving = i;
      else if (pick === 'ITEM') await itemMenu(m);
      else if (pick === 'CHOP' || pick === 'SMASH') {
        await say(`Use ${pick} by facing a ${pick === 'CHOP' ? 'small tree' : 'large rock'} and pressing A.`);
      }
      return;
    }
    if (mode === 'battle') {
      const fainted = m.hp <= 0;
      const active = i === opts.active;
      if (fainted) await say(`${nameOf(m)} has no energy left to fight!`);
      else if (active) await say(`${nameOf(m)} is already in battle!`);
      const labels = !fainted && !active ? ['SHIFT', 'SUMMARY', 'CANCEL'] : ['SUMMARY', 'CANCEL'];
      const pick = labels[await UI.choose(labels, at)];
      if (pick === 'SHIFT') return s.close(i);
      if (pick === 'SUMMARY') s.cur = await summary(m, G.party, i);
      return;
    }
    // item, teach and pick: the caller chooses a target
    if (opts.filter && !opts.filter(m)) {
      const msg = typeof opts.badMsg === 'function' ? opts.badMsg(m) : (opts.badMsg || NO_EFFECT);
      await say(msg);
    } else {
      s.close(i);
    }
  }
  async function itemMenu(m) {
    const labels = ['GIVE', 'TAKE', 'CANCEL'];
    const pick = labels[await UI.choose(labels, { x: 150, y: 40 })];
    if (pick === 'GIVE') {
      const r = await bag({ mode: 'give' });
      if (r && r.item) await giveItem(m, r.item);
    } else if (pick === 'TAKE') {
      if (!m.item) return say(`${nameOf(m)} is not holding anything.`);
      const old = m.item;
      m.item = null;
      bagAdd(old, 1);
      await say(`Took the ${ITEMS[old].name} from ${nameOf(m)}.`);
    }
  }
  // Hands a held item to a Tideling (consumes it from the bag) and returns any item it was holding.
  async function giveItem(m, id) {
    const old = m.item;
    if (old === id) return say(`${nameOf(m)} is already holding the ${ITEMS[id].name}.`);
    bagAdd(id, -1);
    m.item = id;
    if (old) {
      bagAdd(old, 1);
      await say(`Took the ${ITEMS[old].name} from ${nameOf(m)} and gave it the ${ITEMS[id].name}.`);
    } else {
      await say(`${nameOf(m)} is now holding the ${ITEMS[id].name}.`);
    }
  }

  // ---------- summary (three pages) ----------
  function placeName(id) {
    if (!id) return '-';
    try {
      if (typeof Maps !== 'undefined' && Maps.get) {
        const mp = Maps.get(id);
        if (mp && mp.name) return fit(mp.name, 150);
      }
    } catch (_) {}
    return fit(String(id).toUpperCase(), 150);
  }
  // Summary pages. list/index let up and down switch Tidelings. Resolves with the final index.
  function summary(mon, list, index) {
    const roster = list && list.length ? list : [mon];
    const s = {
      name: 'summary', opaque: true, page: 0, mi: 0,
      idx: index != null ? index : Math.max(0, roster.indexOf(mon)),
    };
    s.update = () => {
      if (Input.pressed('b')) return s.close(s.idx);
      if (Input.pressed('left')) s.page = Math.max(0, s.page - 1);
      if (Input.pressed('right')) s.page = Math.min(2, s.page + 1);
      let ni = s.idx;
      if (Input.repeat('up')) ni = Math.max(0, ni - 1);
      if (Input.repeat('down')) ni = Math.min(roster.length - 1, ni + 1);
      if (ni !== s.idx) { s.idx = ni; s.mi = 0; }
      if (s.page === 2 && Input.pressed('a')) s.mi = (s.mi + 1) % Math.max(1, roster[s.idx].moves.length);
    };
    s.draw = (g) => {
      const m = roster[s.idx];
      bg(g);
      panel(g, 4, 4, 312, 18);
      drawText(g, `${fit(nameOf(m), 150)}  LV ${m.lv}`, 10, 9);
      right(g, `${['INFO', 'STATS', 'MOVES'][s.page]} ${s.page + 1}/3`, 310, 9, INK);
      if (s.page === 0) summaryInfo(g, m);
      else if (s.page === 1) summaryStats(g, m);
      else summaryMoves(g, m, s.mi);
    };
    return run(s);
  }
  function summaryInfo(g, m) {
    const sp = speciesOf(m);
    panel(g, 4, 26, 104, 102);
    g.drawImage(Sprites.mon(m.sp), 24, 30);
    center(g, 'NO.' + pad3(sp.num), 56, 104, INK);
    drawText(g, 'TYPE', 116, 28);
    let tx = 156;
    sp.types.forEach((t) => { tx += typePill(g, t, tx, 27) + 3; });
    drawText(g, 'OT', 116, 42);
    drawText(g, fit(m.ot || G.name, 150), 156, 42, INK);
    const ab = ABILITIES[m.ability];
    drawText(g, 'ABILITY', 116, 56);
    drawText(g, ab ? ab.name : '-', 156, 56, BLUE);
    wrapText(ab ? ab.desc : '', 196).slice(0, 3).forEach((l, i) => drawText(g, l, 116, 68 + i * 11));
    drawText(g, 'HELD', 116, 106);
    drawText(g, m.item ? ITEMS[m.item].name : 'NONE', 156, 106, m.item ? INK : DIM);
    drawText(g, 'CAUGHT', 116, 118);
    drawText(g, placeName(m.caughtAt), 156, 118, INK);
    msgBox(g, sp.dex || '');
  }
  function summaryStats(g, m) {
    const st = Mon.stats(m);
    const sp = speciesOf(m);
    panel(g, 4, 26, 156, 102);
    const rows = [['HP', maxHp(m)], ['ATTACK', st.atk], ['DEFENSE', st.def], ['SP.ATK', st.spa], ['SP.DEF', st.spd], ['SPEED', st.spe]];
    rows.forEach(([k, v], i) => {
      const y = 34 + i * 16;
      drawText(g, k, 12, y);
      right(g, String(v), 150, y, INK);
    });
    panel(g, 168, 26, 148, 102);
    drawText(g, 'HP', 178, 34);
    right(g, `${m.hp}/${maxHp(m)}`, 308, 34, INK);
    hpBar(g, 178, 46, 128, 5, ratioOf(m));
    drawText(g, 'EXP POINTS', 178, 62);
    right(g, String(m.xp), 308, 72, INK);
    if (m.lv >= 100) {
      drawText(g, 'MAX LEVEL', 178, 86);
    } else {
      const base = Mon.xpAt(m.lv, sp.growth);
      const next = Mon.xpAt(m.lv + 1, sp.growth);
      drawText(g, `TO LV ${m.lv + 1}`, 178, 86);
      right(g, String(Math.max(0, next - m.xp)), 308, 96, INK);
      bar(g, 178, 110, 128, 4, (m.xp - base) / Math.max(1, next - base), BLUE);
    }
    msgBox(g, 'LEFT and RIGHT: page.   UP and DOWN: Tideling.', 300, 1);
  }
  function summaryMoves(g, m, mi) {
    panel(g, 4, 26, 212, 102);
    const rows = [0, 1, 2, 3].map((i) => (m.moves[i] ? { id: m.moves[i].id, pp: m.moves[i].pp } : null));
    drawMoveRows(g, rows, 4, 30, mi, true);
    const cur = rows[mi];
    drawMoveDetail(g, cur ? cur.id : null, 222, 26, 94, 102);
    msgBox(g, cur && MOVES[cur.id] ? MOVES[cur.id].desc : '');
  }

  // ---------- BAG ----------
  function pocketsFor(mode) {
    if (mode === 'battle') return [{ name: 'ITEMS', kinds: ['medicine'] }, { name: 'ORBS', kinds: ['ball'] }];
    if (mode === 'give') return [{ name: 'BERRIES & HELD', kinds: ['held'] }];
    if (mode === 'sell') return POCKETS.filter((p) => !p.kinds.includes('key'));
    return POCKETS;
  }
  function bagList(pocket, mode) {
    return Object.keys(ITEMS).filter((id) => bagCount(id) > 0 && pocket.kinds.includes(ITEMS[id].kind)
      && (mode !== 'sell' || ITEMS[id].price > 0));
  }
  function fieldActions(id) {
    const kind = ITEMS[id].kind;
    const a = [];
    if (kind === 'medicine' || kind === 'field' || kind === 'key') a.push('USE');
    if (kind === 'held') a.push('GIVE');
    if (kind !== 'key') a.push('TOSS');
    a.push('CANCEL');
    return a;
  }
  // Bag. mode: 'field' (USE / GIVE / TOSS; resolves {warp: true} after an escape rope), 'battle' (resolves
  // {item, target}, target null for orbs; nothing is consumed), 'give' (resolves {item}), 'sell' (shop).
  function bag(opts = {}) {
    const mode = opts.mode || 'field';
    const pockets = pocketsFor(mode);
    const s = { name: 'bag', opaque: true, p: 0, cur: 0, top: 0 };
    s.update = () => {
      if (s.busy) return;
      const list = bagList(pockets[s.p], mode);
      if (pockets.length > 1 && (Input.pressed('left') || Input.pressed('right'))) {
        s.p = (s.p + (Input.pressed('right') ? 1 : pockets.length - 1)) % pockets.length;
        s.cur = 0; s.top = 0;
        return;
      }
      s.cur = nav(Math.min(s.cur, list.length - 1), list.length);
      s.top = scrollFor(s.cur, s.top, 8, list.length);
      if (Input.pressed('b')) return s.close(null);
      if (Input.pressed('a') && list.length) {
        const id = list[s.cur];
        runAction(s, () => bagPick(s, id, mode));
      }
    };
    s.draw = (g) => {
      bg(g);
      const pocket = pockets[s.p];
      const list = bagList(pocket, mode);
      panel(g, 4, 4, 312, 18);
      if (pockets.length > 1) {
        drawText(g, '<', 9, 9, DIM);
        drawText(g, '>', 306, 9, DIM);
      }
      center(g, pocket.name, 160, 9, INK);
      if (mode === 'sell') right(g, '$' + G.money, 296, 9, INK);
      // left: the selected item's icon, kind and count
      panel(g, 4, 26, 102, 102);
      const cur = list[s.cur];
      if (cur) {
        const it = ITEMS[cur];
        g.drawImage(itemIcon(cur), 27, 40, 32, 32);
        center(g, it.kind.toUpperCase(), 55, 84, DIM);
        center(g, 'x' + bagCount(cur), 55, 98, INK);
        if (mode === 'sell') center(g, '$' + Math.floor(it.price / 2), 55, 110, INK);
      }
      // right: the list
      panel(g, 110, 26, 206, 102);
      if (!list.length) drawText(g, 'There are no items here.', 122, 56, DIM);
      for (let i = 0; i < 8; i++) {
        const k = s.top + i;
        if (k >= list.length) break;
        const id = list[k];
        const y = 30 + i * 12;
        drawText(g, ITEMS[id].name, 124, y, INK);
        right(g, 'x' + bagCount(id), 306, y, INK);
      }
      if (list.length) UI.cursor(g, 112, 30 + (s.cur - s.top) * 12);
      msgBox(g, cur ? ITEMS[cur].desc : '');
    };
    return run(s);
  }
  async function bagPick(s, id, mode) {
    if (mode === 'give') return s.close({ item: id });
    if (mode === 'sell') return sellItem(id);
    if (mode === 'battle') {
      if (ITEMS[id].kind === 'ball') return s.close({ item: id, target: null });
      const idx = await party({
        mode: 'item', title: `Use ${ITEMS[id].name} on which TIDELING?`, filter: (m) => canUse(id, m),
      });
      if (idx >= 0) s.close({ item: id, target: idx });
      return;
    }
    const acts = fieldActions(id);
    const act = acts[await UI.choose(acts)];
    if (act === 'USE') {
      const r = await fieldUse(id);
      if (r && r.warp) s.close(r);
    } else if (act === 'GIVE') {
      const idx = await party({ mode: 'pick', title: `Give ${ITEMS[id].name} to which TIDELING?` });
      if (idx >= 0) await giveItem(G.party[idx], id);
    } else if (act === 'TOSS') {
      await tossItem(id);
    }
  }
  // Field use of an item. Returns {warp: true} for an escape rope used in a cave, otherwise null.
  async function fieldUse(id) {
    const it = ITEMS[id];
    if (it.kind === 'medicine') {
      const idx = await party({
        mode: 'item', title: `Use ${it.name} on which TIDELING?`, filter: (m) => canUse(id, m),
      });
      if (idx < 0) return null;
      const m = G.party[idx];
      const r = useMedicine(id, m);
      if (!r.ok) { await say(r.text); return null; }
      bagAdd(id, -1);
      await say(r.text);
      if (r.events && r.events.length) await showEvents(m, r.events);
      return null;
    }
    if (it.kind === 'key') return teachHm(id);
    if (id === 'repel') {
      G.repel = 100;
      bagAdd(id, -1);
      await say('{P} used the REPEL.');
      return null;
    }
    if (id === 'escaperope') {
      if (!inCave()) { await say("You can't use that here."); return null; }
      bagAdd(id, -1);
      return { warp: true };
    }
    await say('Nothing happens.');
    return null;
  }
  // Teaches an HM from the bag. Resolves null (HMs are not consumed).
  async function teachHm(id) {
    const mv = HM_MOVE[id];
    if (!mv) { await say('Nothing happens.'); return null; }
    const mvName = MOVES[mv].name;
    const idx = await party({
      mode: 'teach', title: `Teach ${mvName} to which TIDELING?`,
      filter: (m) => canLearnHm(m, mv),
      badMsg: (m) => (Mon.knows(m, mv) ? `${nameOf(m)} already knows ${mvName}.` : `${nameOf(m)} can't learn ${mvName}.`),
    });
    if (idx < 0) return null;
    const m = G.party[idx];
    const slot = m.moves.length < 4 ? m.moves.length : await forgetMove(m, mv);
    if (slot < 0) { await say(`${nameOf(m)} did not learn ${mvName}.`); return null; }
    Mon.teach(m, mv, slot);
    await say(`${nameOf(m)} learned ${mvName}!`);
    return null;
  }
  async function tossItem(id) {
    const n = await UI.number(bagCount(id), { min: 1 });
    if (!n) return;
    if (!(await UI.yesno(`Throw away ${n} ${ITEMS[id].name}?`))) return;
    bagAdd(id, -n);
    await say(`Threw away ${n} ${ITEMS[id].name}.`);
  }
  async function sellItem(id) {
    const it = ITEMS[id];
    const each = Math.floor(it.price / 2);
    if (!each) { await say("I can't buy that."); return; }
    const n = await UI.number(bagCount(id), { min: 1 });
    if (!n) return;
    const total = each * n;
    if (!(await UI.yesno(`I can pay $${total}. Sell ${n} ${it.name}?`))) return;
    bagAdd(id, -n);
    G.money += total;
    sfx('money');
    await say(`Turned over ${n} ${it.name} and received $${total}.`);
  }

  // ---------- TIDEDEX ----------
  function dex() {
    const list = DEX_ORDER;
    const seen = (sp) => !!G.dex.seen[sp];
    const caught = (sp) => !!G.dex.caught[sp];
    const s = { name: 'dex', opaque: true, cur: 0, top: 0 };
    s.update = () => {
      if (s.busy) return;
      s.cur = nav(s.cur, list.length);
      s.top = scrollFor(s.cur, s.top, 8, list.length);
      if (Input.pressed('b')) return s.close();
      if (Input.pressed('a') && seen(list[s.cur])) {
        const sp = list[s.cur];
        runAction(s, () => dexDetail(sp));
      }
    };
    s.draw = (g) => {
      bg(g);
      const seenN = list.filter(seen).length;
      const caughtN = list.filter(caught).length;
      panel(g, 4, 4, 312, 18);
      drawText(g, 'TIDEDEX', 10, 9, INK);
      right(g, `SEEN ${seenN}   CAUGHT ${caughtN}`, 308, 9, INK);
      panel(g, 4, 26, 164, 102);
      for (let i = 0; i < 8; i++) {
        const k = s.top + i;
        if (k >= list.length) break;
        const sp = list[k];
        const sn = SPECIES[sp];
        const y = 30 + i * 12;
        const c = seen(sp) ? INK : DIM;
        drawText(g, pad3(sn.num), 14, y, c);
        drawText(g, seen(sp) ? sn.name : '-----', 40, y, c);
        if (seen(sp)) orbMark(g, 156, y + 4, 3, caught(sp));
      }
      if (list.length) UI.cursor(g, 6, 30 + (s.cur - s.top) * 12);
      panel(g, 176, 26, 140, 102);
      const cur = list[s.cur];
      if (seen(cur)) {
        g.drawImage(caught(cur) ? Sprites.mon(cur) : silhouette(cur), 214, 30);
        center(g, SPECIES[cur].name, 246, 98, INK);
        typeRow(g, SPECIES[cur].types, 246, 110);
      } else {
        center(g, '?', 246, 60, DIM);
      }
      msgBox(g, seen(cur) ? 'A: DETAILS    B: BACK' : 'No data yet.', 300, 1);
    };
    return run(s);
  }
  function dexDetail(sp) {
    const sn = SPECIES[sp];
    const isCaught = !!G.dex.caught[sp];
    const s = { name: 'dexdetail', opaque: true };
    s.update = () => { if (Input.pressed('a') || Input.pressed('b')) s.close(); };
    s.draw = (g) => {
      bg(g);
      panel(g, 4, 4, 312, 18);
      drawText(g, `NO.${pad3(sn.num)}  ${sn.name}`, 10, 9, INK);
      panel(g, 4, 26, 112, 102);
      g.drawImage(isCaught ? Sprites.mon(sp) : silhouette(sp), 28, 30);
      typeRow(g, sn.types, 60, 104);
      panel(g, 124, 26, 192, 102);
      drawText(g, 'HEIGHT', 136, 40, DIM);
      right(g, sn.height || '?', 304, 40, INK);
      drawText(g, 'WEIGHT', 136, 56, DIM);
      right(g, sn.weight || '?', 304, 56, INK);
      drawText(g, 'STATUS', 136, 72, DIM);
      right(g, isCaught ? 'CAUGHT' : 'SEEN', 304, 72, isCaught ? BLUE : INK);
      msgBox(g, isCaught ? sn.dex : 'Catch one to learn more about it.');
    };
    return run(s);
  }

  // ---------- TRAINER CARD ----------
  function waveBadge(g, x, y) {
    disc(g, x + 8, y + 8, 7, '#2a5ca8');
    g.fillStyle = '#e8f4ff';
    for (let i = 0; i < 12; i++) {
      const yy = y + 7 + Math.round(Math.sin(i * 0.9) * 2);
      g.fillRect(x + 2 + i, yy, 1, 2);
    }
  }
  function trainerCard() {
    const s = { name: 'card', opaque: true, portrait: null };
    try {
      if (typeof Chars !== 'undefined' && Chars.portrait) s.portrait = Chars.portrait('player');
    } catch (_) {}
    s.update = () => { if (Input.pressed('a') || Input.pressed('b')) s.close(); };
    s.draw = (g) => {
      bg(g);
      panel(g, 4, 4, 312, 172);
      drawText(g, 'TRAINER CARD', 14, 12, BLUE);
      panel(g, 14, 26, 80, 80);
      if (s.portrait) {
        g.drawImage(s.portrait, 22, 34);
      } else {
        disc(g, 54, 46, 10, '#8090a0');
        g.fillStyle = '#8090a0';
        g.fillRect(38, 58, 32, 40);
      }
      const caughtN = Object.keys(G.dex.caught).filter((k) => G.dex.caught[k]).length;
      const sec = Math.floor(G.time || 0);
      const time = `${Math.floor(sec / 3600)}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}`;
      const rows = [['NAME', G.name], ['MONEY', '$' + G.money], ['TIDEDEX', `${caughtN}/${DEX_ORDER.length}`], ['TIME', time]];
      rows.forEach(([k, v], i) => {
        const y = 30 + i * 16;
        drawText(g, k, 112, y, DIM);
        right(g, v, 308, y, INK);
      });
      drawText(g, 'BADGES', 112, 98, DIM);
      for (let i = 0; i < 8; i++) {
        const x = 112 + i * 24, y = 110;
        if (i === 0 && G.badges.includes('wave')) {
          waveBadge(g, x, y);
        } else {
          g.fillStyle = '#c4ccd6'; g.fillRect(x, y, 16, 16);
          g.fillStyle = '#e8ecf0'; g.fillRect(x + 2, y + 2, 12, 12);
        }
      }
      drawText(g, 'PRESS A OR B TO CLOSE', 14, 160, DIM);
    };
    return run(s);
  }

  // ---------- OPTIONS ----------
  function options() {
    const TEXT = [['slow', 'SLOW'], ['mid', 'MID'], ['fast', 'FAST']];
    const ROWS = ['TEXT SPEED', 'MUSIC', 'SOUND'];
    const TIPS = ['How quickly the text is written out.', 'Background music on or off.', 'Sound effects on or off.'];
    const s = { name: 'options', opaque: true, cur: 0 };
    const value = (i) => {
      if (i === 0) {
        const t = TEXT.find((v) => v[0] === G.options.text) || TEXT[1];
        return t[1];
      }
      return (i === 1 ? G.options.music : G.options.sfx) ? 'ON' : 'OFF';
    };
    const change = (i, d) => {
      if (i === 0) {
        const k = Math.max(0, TEXT.findIndex((v) => v[0] === G.options.text));
        G.options.text = TEXT[(k + d + 3) % 3][0];
      } else if (i === 1) {
        G.options.music = !G.options.music;
        try { if (typeof Music !== 'undefined' && Music.refresh) Music.refresh(); } catch (_) {}
      } else {
        G.options.sfx = !G.options.sfx;
      }
      sfx('select');
    };
    s.update = () => {
      s.cur = nav(s.cur, ROWS.length);
      if (Input.pressed('b')) return s.close();
      if (Input.pressed('left')) change(s.cur, -1);
      else if (Input.pressed('right') || Input.pressed('a')) change(s.cur, 1);
    };
    s.draw = (g) => {
      bg(g);
      panel(g, 4, 4, 312, 18);
      drawText(g, 'OPTIONS', 10, 9, INK);
      panel(g, 4, 26, 312, 98);
      ROWS.forEach((label, i) => {
        const y = 36 + i * 24;
        drawText(g, label, 22, y, s.cur === i ? BLUE : INK);
        drawText(g, '<', 196, y, DIM);
        center(g, value(i), 250, y, INK);
        drawText(g, '>', 300, y, DIM);
      });
      UI.cursor(g, 8, 36 + s.cur * 24);
      msgBox(g, TIPS[s.cur], 300, 1);
    };
    return run(s);
  }

  // ---------- PC ----------
  // A list of Tidelings with icons and a preview. Resolves with the index, or -1.
  function monList(title, list, prompt) {
    const s = { name: 'monlist', opaque: true, cur: 0, top: 0 };
    s.update = () => {
      s.cur = nav(Math.min(s.cur, list.length - 1), list.length);
      s.top = scrollFor(s.cur, s.top, 4, list.length);
      if (Input.pressed('b')) return s.close(-1);
      if (Input.pressed('a') && list.length) return s.close(s.cur);
    };
    s.draw = (g) => {
      bg(g);
      const frame = Math.floor(Timers.time * 2) & 1;
      panel(g, 4, 4, 312, 18);
      drawText(g, title, 10, 9, INK);
      right(g, `${list.length}/${G.party.length + G.box.length}`, 308, 9, INK);
      panel(g, 4, 22, 196, 106);
      for (let i = 0; i < 4; i++) {
        const k = s.top + i;
        if (k >= list.length) break;
        const m = list[k];
        const y = 26 + i * 25;
        g.drawImage(Sprites.monIcon(m.sp, frame), 8, y);
        drawText(g, fit(nameOf(m), 150), 38, y + 3, INK);
        drawText(g, `LV ${m.lv}    HP ${m.hp}/${maxHp(m)}`, 38, y + 13, INK);
      }
      if (list.length && s.cur >= s.top && s.cur < s.top + 4) UI.cursor(g, 6, 26 + (s.cur - s.top) * 25 + 6);
      panel(g, 206, 22, 110, 106);
      const m = list[s.cur];
      if (m) {
        g.drawImage(Sprites.mon(m.sp), 229, 26);
        center(g, fit(nameOf(m), 100), 261, 94, INK);
        center(g, `LV ${m.lv}`, 261, 104, INK);
        hpBar(g, 216, 114, 90, 4, ratioOf(m));
      }
      msgBox(g, list.length ? prompt : 'There is nothing here.', 300, 2);
    };
    return run(s);
  }
  async function pcWithdraw() {
    if (!G.box.length) return say('There are no TIDELINGS in the PC.');
    const i = await monList('WITHDRAW', G.box, 'Withdraw which TIDELING?');
    if (i < 0) return;
    if (G.party.length >= 6) return say('Your party is full!');
    const [m] = G.box.splice(i, 1);
    G.party.push(m);
    await say(`${nameOf(m)} was withdrawn from the PC.`);
  }
  async function pcDeposit() {
    if (!G.party.length) return;
    const i = await monList('DEPOSIT', G.party, 'Deposit which TIDELING?');
    if (i < 0) return;
    const m = G.party[i];
    const healthyOthers = G.party.filter((x, j) => j !== i && x.hp > 0).length;
    if (healthyOthers === 0) return say("You can't deposit your last healthy TIDELING!");
    G.party.splice(i, 1);
    G.box.push(m);
    await say(`${nameOf(m)} was deposited in the PC.`);
  }
  async function pc() {
    await say('{P} booted up the PC.');
    for (;;) {
      const labels = ['WITHDRAW', 'DEPOSIT', 'LOG OFF'];
      const pick = await UI.choose(labels, { cancel: true });
      if (pick === 0) await pcWithdraw();
      else if (pick === 1) await pcDeposit();
      else return;
    }
  }

  // ---------- MART ----------
  async function buyOne(id) {
    const it = ITEMS[id];
    const max = Math.min(99, Math.floor(G.money / it.price));
    if (max < 1) return say("You don't have enough money.");
    const n = await UI.number(max, { min: 1 });
    if (!n) return;
    const total = n * it.price;
    const label = it.name + (n > 1 ? 's' : '');
    if (!(await UI.yesno(`Certainly. You want ${n} ${label}? That will be $${total}. OK?`))) return;
    G.money -= total;
    bagAdd(id, n);
    sfx('money');
    await say('Here you are! Thank you!');
  }
  function buyList(stock) {
    const s = { name: 'buy', opaque: true, cur: 0, top: 0 };
    s.update = () => {
      if (s.busy) return;
      s.cur = nav(Math.min(s.cur, stock.length - 1), stock.length);
      s.top = scrollFor(s.cur, s.top, 7, stock.length);
      if (Input.pressed('b')) return s.close();
      if (Input.pressed('a') && stock.length) runAction(s, () => buyOne(stock[s.cur]));
    };
    s.draw = (g) => {
      bg(g);
      panel(g, 4, 4, 120, 22);
      drawText(g, 'MONEY', 10, 11, INK);
      right(g, '$' + G.money, 118, 11, INK);
      panel(g, 4, 30, 312, 98);
      for (let i = 0; i < 7; i++) {
        const k = s.top + i;
        if (k >= stock.length) break;
        const it = ITEMS[stock[k]];
        const y = 36 + i * 13;
        const can = G.money >= it.price;
        drawText(g, it.name, 18, y, can ? INK : DIM);
        right(g, '$' + it.price, 306, y, can ? INK : DIM);
      }
      if (stock.length) UI.cursor(g, 6, 36 + (s.cur - s.top) * 13);
      msgBox(g, stock.length ? ITEMS[stock[s.cur]].desc : 'Nothing for sale.');
    };
    return run(s);
  }
  // The shop: a welcome, then BUY / SELL / QUIT. Resolves when the shopkeeper says goodbye.
  async function mart(items) {
    const stock = (items || []).filter((id) => ITEMS[id]);
    await say('Welcome! How may I serve you?');
    for (;;) {
      const pick = await UI.choose(['BUY', 'SELL', 'QUIT'], { cancel: true });
      if (pick === 0) await buyList(stock);
      else if (pick === 1) await bag({ mode: 'sell' });
      else break;
      if (!(await UI.yesno('Is there anything else I can do?'))) break;
    }
    await say('Thank you! Come again!');
  }

  // ---------- name entry ----------
  // Letter grid: upper, lower, digits. SELECT changes the set, START jumps to OK, B deletes, max 8 characters.
  function enterName(prompt, def) {
    const PAGE_ROWS = [['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ'], ['abcdefghijklm', 'nopqrstuvwxyz'], ['0123456789']];
    const PAGE_LABEL = ['A-Z', 'a-z', '0-9'];
    const s = { name: 'naming', opaque: true, page: 0, r: 0, c: 0, text: '' };
    const finish = () => s.close(s.text.trim() || def || '');
    s.update = () => {
      const R = PAGE_ROWS[s.page];
      if (Input.pressed('select')) { s.page = (s.page + 1) % 3; s.r = 0; s.c = 0; return; }
      if (Input.pressed('start')) { s.r = R.length; s.c = 1; return; }
      if (Input.pressed('b')) { s.text = s.text.slice(0, -1); return; }
      if (Input.repeat('up')) s.r = Math.max(0, s.r - 1);
      if (Input.repeat('down')) s.r = Math.min(R.length, s.r + 1);
      const rowLen = s.r === R.length ? 2 : R[s.r].length;
      if (Input.repeat('left')) s.c = (s.c + rowLen - 1) % rowLen;
      if (Input.repeat('right')) s.c = (s.c + 1) % rowLen;
      s.c = Math.min(s.c, rowLen - 1);
      if (!Input.pressed('a')) return;
      if (s.r === R.length) {
        if (s.c === 0) s.text = s.text.slice(0, -1);
        else finish();
      } else if (s.text.length < 8) {
        s.text += R[s.r][s.c];
      }
    };
    s.draw = (g) => {
      const R = PAGE_ROWS[s.page];
      bg(g);
      panel(g, 4, 4, 312, 18);
      drawText(g, prompt || 'Your name?', 10, 9, INK);
      right(g, PAGE_LABEL[s.page], 308, 9, DIM);
      panel(g, 96, 26, 128, 18);
      const blink = Math.floor(Timers.time * 2) & 1 ? '_' : '';
      drawText(g, s.text + blink, 104, 31, INK);
      R.forEach((row, r) => {
        const y = 52 + r * 16;
        const x0 = 160 - (row.length * 20) / 2;
        row.split('').forEach((ch, c) => {
          const x = x0 + c * 20;
          drawText(g, ch, x + 6, y, INK);
          if (s.r === r && s.c === c) UI.cursor(g, x - 1, y);
        });
      });
      panel(g, 56, 96, 64, 16);
      panel(g, 200, 96, 64, 16);
      center(g, 'BACK', 88, 100, INK);
      center(g, 'OK', 232, 100, INK);
      if (s.r === R.length) UI.cursor(g, s.c === 0 ? 46 : 190, 100);
      msgBox(g, 'A: PICK    B: DELETE    START: OK    SELECT: SET', 300, 2);
    };
    return run(s);
  }

  return {
    start, party, summary, bag, dex, pc, mart, options, showEvents, useMedicine, canUse, forgetMove, giveItem,
    name: enterName,
  };
})();
DBG.menus = Menus;
