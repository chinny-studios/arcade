// Tokoyo — windows & screens: title, character creation, settings, pause, inventory/crafting/chest, build menu, map, notes, victory

const UI = (() => {
  const $id = (s) => document.getElementById(s);
  const open = { inv: false, build: false, map: false, note: false, name: false, pause: false, victory: false };
  let station = null, chest = null, tab = 'craft', selRec = null, drag = null, buildCat = 'build', buildKind = 'hammer', namePiece = null;
  const known = new Set(['wood', 'stone', 'flint', 'resin']);
  function blocking() { return open.inv || open.build || open.map || open.note || open.name || open.pause || open.victory; }
  function relock() { if (G.state === 'play' && !blocking()) Input.lock(); }
  function closeAll(lock = true) {
    $id('invWin').hidden = $id('buildWin').hidden = $id('mapWin').hidden = $id('noteWin').hidden = $id('nameWin').hidden = true;
    open.inv = open.build = open.map = open.note = open.name = false;
    chest = null; station = null; hideTip(); endDrag(true);
    Input.setTyping(false);
    if (lock) relock();
  }
  // ---------- keyboard for windows (runs inside the event, so pointer lock can be requested) ----------
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Enter' && open.name) $id('portalOk').click(); if (e.code === 'Escape' && open.name) closeAll(); return; }
    if (G.state !== 'play') return;
    const c = e.code;
    if (c === 'Escape') {
      e.preventDefault();
      if (open.pause) { resume(); return; }
      if (blocking() && !open.victory) { closeAll(); return; }
      pause(); return;
    }
    if (open.pause || open.victory) return;
    if (c === 'Tab' || c === 'KeyI') { e.preventDefault(); if (open.inv) closeAll(); else if (!blocking() && PLAYER.alive) openInventory(null); return; }
    if (c === 'KeyM') { if (open.map) closeAll(); else if (!blocking()) openMap(); return; }
    if (c === 'KeyN') { const m = AU.toggleMute(); HUD.msg(m ? 'Sound off' : 'Sound on'); return; }
    if (c === 'Backquote' && DEBUG) { G.showAll = !G.showAll; }
  });
  document.addEventListener('mousedown', (e) => {
    if (G.state === 'play' && !blocking() && !Input.locked && e.target.id === 'c') { AU.resume(); Input.lock(); }
  });
  bus.on('lock', (locked, was) => {
    if (!locked && was && G.state === 'play' && !blocking()) pause();
  });
  bus.on('got', (id) => known.add(id));
  bus.on('crafted', (id) => known.add(id));
  // ---------- tooltips ----------
  const tip = $id('tip');
  function showTip(html, e) { tip.innerHTML = html; tip.hidden = false; moveTip(e); }
  function moveTip(e) { const x = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 16), y = Math.min(innerHeight - tip.offsetHeight - 8, e.clientY + 12); tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
  function hideTip() { tip.hidden = true; }
  function itemTip(st) {
    const d = ITEMS[st.id];
    let h = '<div class="tn">' + itemName(st) + '</div>';
    if (d.desc) h += '<div class="td">' + d.desc + '</div>';
    h += statLines(st).map((l) => '<div>' + l + '</div>').join('');
    h += '<div class="td">Weight ' + (d.weight * st.n).toFixed(1) + '</div>';
    return h;
  }
  function statLines(st) {
    const d = ITEMS[st.id], L = [];
    if (d.dmg && Object.keys(d.dmg).length) { const dm = itemDamage(st); L.push(Object.keys(dm).map((k) => cap(k) + ' ' + Math.round(dm[k])).join(' · ')); }
    if (d.tier != null) L.push('Tier ' + d.tier);
    if (d.type === 'shield' || (d.block && d.type === 'weapon')) L.push('Block ' + Math.round(itemBlock(st)) + (d.parry ? ' · parry ×' + d.parry : ''));
    if (d.type === 'armor') L.push('Armour ' + itemArmor(st) + (d.rainproof ? ' · keeps you dry' : '') + (d.move ? ' · movement ' + Math.round(d.move * 100) + '%' : '') + (d.sneak ? ' · sneak +' + Math.round(d.sneak * 100) + '%' : ''));
    if (d.food) L.push('Health +' + d.food.hp + ' · Stamina +' + d.food.st + ' · Regen ' + d.food.regen + '/tick · ' + Math.round(d.food.dur / 60) + ' min');
    if (d.dur) L.push('Durability ' + Math.ceil(st.dur) + ' / ' + maxDur(st.id, st.q));
    if (d.stam && d.type !== 'ammo' && !d.build) L.push('Stamina per use ' + d.stam);
    return L;
  }
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // ---------- inventory ----------
  function openInventory(st) {
    closeAll(false);
    station = st;
    open.inv = true; $id('invWin').hidden = false;
    Input.unlock();
    renderInv();
  }
  function openChest(p) { openInventory(null); chest = p; renderInv(); }
  function renderGrid(gridEl, inv, which) {
    let h = '';
    inv.slots.forEach((s, i) => { h += '<div class="slot' + (s && s.eq ? ' eq' : '') + (s && broken(s) ? ' broken' : '') + '" data-i="' + i + '" data-w="' + which + '">' + HUDslot(s, which === 'p' && i < 8 ? i + 1 : '') + '</div>'; });
    gridEl.innerHTML = h;
  }
  function HUDslot(s, k) {
    if (!s) return k ? '<span class="k">' + k + '</span>' : '';
    const d = ITEMS[s.id];
    let h = '<img src="' + (ICONS[s.id] || '') + '" alt="">' + (k ? '<span class="k">' + k + '</span>' : '');
    if (d.stack > 1) h += '<span class="n">' + s.n + '</span>';
    if (d.maxQ > 1 && s.q > 1) h += '<span class="q">★' + s.q + '</span>';
    if (d.dur) { const m = maxDur(s.id, s.q); if (s.dur < m) h += '<span class="dur"><i style="width:' + (s.dur / m * 100).toFixed(0) + '%;background:' + (s.dur <= 0 ? '#d2452c' : '#8fcf6a') + '"></i></span>'; }
    return h;
  }
  function renderInv() {
    if (!open.inv) return;
    const P = PLAYER;
    renderGrid($id('invGrid'), P.inv, 'p');
    $id('chestPane').hidden = !chest;
    if (chest) { $id('chestTitle').textContent = chest.def.name; renderGrid($id('chestGrid'), chest.data.inv, 'c'); }
    $id('invStats').innerHTML = 'Armour <b>' + playerArmor() + '</b> &nbsp; Weight <b' + (P.inv.weight() > MAX_WEIGHT ? ' style="color:#ff8a70"' : '') + '>' + Math.round(P.inv.weight()) + '/' + MAX_WEIGHT + '</b>';
    for (const b of $id('craftTabs').children) b.classList.toggle('on', b.dataset.t === tab);
    $id('craftBody').hidden = tab === 'skills'; $id('skillList').hidden = tab !== 'skills';
    if (tab === 'skills') renderSkills(); else renderRecipes();
  }
  function levels() {
    const P = PLAYER;
    const lv = stationLevels(P.pos.x, P.pos.z, P.pos.y);
    return lv;
  }
  const ST_NAME = { workbench: 'Workbench', forge: 'Forge', cauldron: 'Cauldron', stonecutter: 'Stonecutter' };
  function renderRecipes() {
    const lv = levels(), P = PLAYER;
    const names = Object.keys(lv).map((k) => ST_NAME[k] + ' ' + lv[k]);
    $id('stationName').textContent = names.length ? 'Near: ' + names.join(' · ') : 'Crafting by hand. Build a workbench for more.';
    const list = [];
    if (tab === 'craft') {
      for (const r of RECIPES) {
        const avail = !r.st || (lv[r.st] || 0) > 0;
        if (!avail) continue;
        const seen = Object.keys(r.req).every((k) => known.has(k)) || !r.st;
        if (!seen) continue;
        list.push({ r, ok: canCraft(r, lv), lvOk: !r.st || lv[r.st] >= r.lv });
      }
    } else {
      for (const s of P.inv.slots) {
        if (!s) continue; const r = recipeFor(s.id), d = ITEMS[s.id];
        if (!r || !(d.maxQ > 1) || s.q >= d.maxQ) continue;
        const st = r.st || 'workbench'; if (!lv[st]) continue;
        list.push({ r, st: s, ok: canUpgrade(s, lv), lvOk: (lv[st] || 0) >= (r.st ? r.lv : 0) + s.q });
      }
    }
    if (!list.find((e) => e === selRec || (selRec && e.r === selRec.r && e.st === selRec.st))) selRec = list[0] || null;
    else selRec = list.find((e) => e.r === selRec.r && e.st === selRec.st);
    const rl = $id('recList'), scroll = rl.scrollTop;
    $id('recList').innerHTML = list.map((e, i) => '<div class="rec' + (e.ok ? '' : ' no') + (selRec && e.r === selRec.r && e.st === selRec.st ? ' sel' : '') + '" data-i="' + i + '"><img src="' + ICONS[e.r.id] + '" alt="">' + ITEMS[e.r.id].name + (e.r.n > 1 ? ' ×' + e.r.n : '') + (e.st ? ' ★' + e.st.q + ' → ★' + (e.st.q + 1) : '') + (e.lvOk ? '' : ' <span style="color:#ff8a70;font-size:11px">(needs level ' + (e.st ? (e.r.st ? e.r.lv : 0) + e.st.q : e.r.lv) + ')</span>') + '</div>').join('') || '<div class="rec no">Nothing to ' + (tab === 'craft' ? 'craft' : 'upgrade') + ' here yet.</div>';
    rl.scrollTop = scroll;
    $id('recList').querySelectorAll('.rec[data-i]').forEach((d) => d.onclick = () => { selRec = list[+d.dataset.i]; AU.play('ui'); renderInv(); });
    const info = $id('recInfo');
    if (!selRec) { info.innerHTML = ''; return; }
    const r = selRec.r, d = ITEMS[r.id];
    const req = selRec.st ? upgradeCost(r, selRec.st.q) : r.req;
    const fake = selRec.st ? Object.assign({}, selRec.st, { q: selRec.st.q + 1, dur: maxDur(r.id, selRec.st.q + 1) }) : newStack(r.id, r.n);
    let h = '<div class="rn">' + d.name + '</div><div class="desc">' + (d.desc || '') + '</div><div class="stats">' + statLines(fake).join('<br>') + '</div>';
    h += '<div class="reqs">' + Object.keys(req).map((k) => '<div class="r' + (P.inv.count(k) >= req[k] ? '' : ' no') + '"><img src="' + ICONS[k] + '" alt="">' + ITEMS[k].name + ' ' + P.inv.count(k) + '/' + req[k] + '</div>').join('') + '</div>';
    h += '<div class="btnrow"><button class="btn" id="bCraft"' + (selRec.ok ? '' : ' disabled') + '>' + (selRec.st ? 'Upgrade' : 'Craft') + '</button>';
    const repSt = Object.keys(lv);
    for (const s of repSt) if (s === 'workbench' || s === 'forge') h += '<button class="btn alt" data-rep="' + s + '">Repair (' + ST_NAME[s] + ')</button>';
    h += '</div>';
    info.innerHTML = h;
    $id('bCraft').onclick = () => { if (selRec.st) upgrade(selRec.st, levels()); else craft(r, levels()); renderInv(); };
    info.querySelectorAll('[data-rep]').forEach((b) => b.onclick = () => { repairAll(b.dataset.rep); renderInv(); });
  }
  function renderSkills() {
    const P = PLAYER;
    $id('stationName').textContent = 'Skills improve as you use them. Dying costs 5% of each.';
    let h = '';
    for (const k in SKILLS) { const s = P.skills[k] || { lv: 0, xp: 0 }; const pr = s.lv >= 100 ? 1 : s.xp / skillNeed(Math.floor(s.lv)); h += '<div class="sk"><span>' + SKILLS[k] + '</span><div class="bar"><i style="width:' + (pr * 100).toFixed(0) + '%"></i></div><b>' + Math.floor(s.lv) + '</b></div>'; }
    $id('skillList').innerHTML = h;
  }
  $id('craftTabs').onclick = (e) => { if (e.target.dataset.t) { tab = e.target.dataset.t; AU.play('ui'); renderInv(); } };
  // slots: click, right click, drag
  function slotFromEvent(e) { const s = e.target.closest('.slot[data-i]'); if (!s) return null; const inv = s.dataset.w === 'c' ? chest.data.inv : PLAYER.inv; return { inv, i: +s.dataset.i, w: s.dataset.w }; }
  const win = $id('invWin');
  win.addEventListener('mousemove', (e) => {
    const sl = slotFromEvent(e);
    if (sl && sl.inv.slots[sl.i] && !drag) showTip(itemTip(sl.inv.slots[sl.i]), e); else if (!drag) hideTip();
  });
  win.addEventListener('mouseleave', hideTip);
  win.addEventListener('contextmenu', (e) => e.preventDefault());
  win.addEventListener('mousedown', (e) => {
    const sl = slotFromEvent(e); if (!sl) return;
    const st = sl.inv.slots[sl.i];
    if (!st) return;
    e.preventDefault();
    if (e.button === 2) {
      if (chest) { moveBetween(sl); }
      else if (sl.w === 'p') useItem(st);
      renderInv(); return;
    }
    if (e.button === 0 && e.shiftKey && chest) { moveBetween(sl); renderInv(); return; }
    if (e.button === 0) {
      drag = { from: sl, st, half: e.ctrlKey && st.n > 1 };
      const di = $id('dragIcon'); di.src = ICONS[st.id]; di.hidden = false; di.style.left = (e.clientX - 24) + 'px'; di.style.top = (e.clientY - 24) + 'px';
      hideTip();
    }
  });
  addEventListener('mousemove', (e) => { if (drag) { const di = $id('dragIcon'); di.style.left = (e.clientX - 24) + 'px'; di.style.top = (e.clientY - 24) + 'px'; } });
  addEventListener('mouseup', (e) => {
    if (!drag) return;
    const to = e.target.closest && e.target.closest('.slot[data-i]');
    if (to) { const toInv = to.dataset.w === 'c' ? chest.data.inv : PLAYER.inv; moveSlot(drag.from.inv, drag.from.i, toInv, +to.dataset.i, drag.half); }
    else if (!e.target.closest('.win')) { // dropped outside: into the world
      const st = drag.from.inv.slots[drag.from.i];
      if (st) { if (st.eq) unequip(st); drag.from.inv.slots[drag.from.i] = null; const P = PLAYER; dropStack(st, P.pos.x + Math.sin(P.yaw) * 0.8, P.pos.y + 1.2, P.pos.z + Math.cos(P.yaw) * 0.8, true); }
    }
    endDrag(); renderInv();
  });
  function endDrag() { drag = null; $id('dragIcon').hidden = true; }
  function moveSlot(fi, a, ti, b, half) {
    if (fi === ti && a === b) return;
    const s = fi.slots[a], t = ti.slots[b];
    if (!s) return;
    if (fi !== ti && s.eq) unequip(s);
    if (half && !t) { const k = Math.floor(s.n / 2); s.n -= k; ti.slots[b] = newStack(s.id, k, s.q); return; }
    if (t && t.id === s.id && ITEMS[s.id].stack > 1) { const k = Math.min(s.n, ITEMS[s.id].stack - t.n); t.n += k; s.n -= k; if (s.n <= 0) fi.slots[a] = null; return; }
    if (t && fi !== ti && t.eq) unequip(t);
    fi.slots[a] = t; ti.slots[b] = s;
  }
  function moveBetween(sl) {
    const other = sl.w === 'c' ? PLAYER.inv : chest.data.inv;
    const st = sl.inv.slots[sl.i];
    if (st.eq) unequip(st);
    const left = other.addStack(st);
    sl.inv.slots[sl.i] = left;
    AU.play('pickup');
  }

  // ---------- build menu ----------
  const CATS = [['build', 'Building'], ['craft', 'Crafting'], ['furniture', 'Furniture'], ['misc', 'Misc']];
  function openBuildMenu(kind) {
    closeAll(false);
    buildKind = kind; open.build = true; $id('buildWin').hidden = false;
    Input.unlock();
    renderBuild();
  }
  function pieceKnown(d) { return d.tool || Object.keys(d.req).every((k) => known.has(k)) || G.noCost; }
  function renderBuild() {
    const P = PLAYER;
    if (buildKind === 'hoe') {
      $id('buildTabs').innerHTML = '';
      $id('pieceGrid').innerHTML = HOE_MODES.map((m) => '<div class="pc' + (BUILD.tool.hoe === m.id ? ' sel' : '') + '" data-h="' + m.id + '"><img src="' + ICONS.hoe + '" alt="">' + m.name + '</div>').join('');
      $id('pieceGrid').querySelectorAll('.pc').forEach((d) => {
        d.onclick = () => { BUILD.setHoe(d.dataset.h); AU.play('ui'); closeAll(); };
        d.onmouseenter = () => { const m = HOE_MODES.find((x) => x.id === d.dataset.h); $id('pieceInfo').innerHTML = '<b>' + m.name + '</b><br>' + m.desc + (Object.keys(m.req).length ? '<br>Costs ' + Object.keys(m.req).map((k) => m.req[k] + ' ' + ITEMS[k].name).join(', ') : ''); };
      });
      return;
    }
    $id('buildTabs').innerHTML = CATS.map(([k, n]) => '<button data-c="' + k + '"' + (k === buildCat ? ' class="on"' : '') + '>' + n + '</button>').join('');
    $id('buildTabs').onclick = (e) => { if (e.target.dataset.c) { buildCat = e.target.dataset.c; AU.play('ui'); renderBuild(); } };
    const list = Object.values(PIECES).filter((d) => d.cat === buildCat && pieceKnown(d));
    $id('pieceGrid').innerHTML = list.map((d) => '<div class="pc' + (BUILD.tool.sel === d.id ? ' sel' : '') + (d.tool || P.inv.has(d.req) || G.noCost ? '' : ' no') + '" data-id="' + d.id + '"><img src="' + ICONS['piece:' + d.id] + '" alt="">' + d.name + '</div>').join('') || '<div class="help">Gather more materials to discover new pieces.</div>';
    $id('pieceGrid').querySelectorAll('.pc').forEach((el) => {
      el.onclick = () => { BUILD.select(el.dataset.id); AU.play('ui'); closeAll(); };
      el.onmouseenter = () => {
        const d = PIECES[el.dataset.id];
        let h = '<b>' + d.name + '</b>';
        if (!d.tool) h += '<div class="reqs">' + Object.keys(d.req).map((k) => '<div class="r' + (P.inv.count(k) >= d.req[k] ? '' : ' no') + '"><img src="' + ICONS[k] + '" alt="">' + ITEMS[k].name + ' ' + P.inv.count(k) + '/' + d.req[k] + '</div>').join('') + '</div>';
        const notes = [];
        if (d.st) notes.push('Needs a ' + (d.st === 'stonecutter' ? 'stonecutter' : 'workbench') + ' nearby');
        if (d.station === 'workbench') notes.push('Needs a roof over it');
        if (d.needFire) notes.push('Place it over a fire');
        if (d.comfort) notes.push('Comfort +' + d.comfort[1]);
        if (d.ext) notes.push('Raises the ' + d.ext + ' level when placed near it');
        if (d.kind === 'raft') notes.push('Place it on the water');
        if (d.mat === 'stone') notes.push('Stone: very strong vertically, can\'t overhang');
        if (notes.length) h += '<div style="color:var(--dim)">' + notes.join(' · ') + '</div>';
        $id('pieceInfo').innerHTML = h;
      };
    });
  }
  // ---------- map ----------
  const mapC = $id('mapC');
  function openMap() {
    closeAll(false); open.map = true; $id('mapWin').hidden = false; Input.unlock();
    const v = HUD.mapView; v.x = PLAYER.pos.x; v.z = PLAYER.pos.z; v.s = 1.6;
    drawMap();
  }
  function drawMap() {
    if (!open.map) return;
    const w = mapC.clientWidth, h = mapC.clientHeight;
    if (mapC.width !== w || mapC.height !== h) { mapC.width = w; mapC.height = h; }
    const v = HUD.mapView;
    HUD.drawMapTo(mapC.getContext('2d'), w, h, v.x, v.z, v.s, 0);
  }
  mapC.addEventListener('wheel', (e) => { e.preventDefault(); const v = HUD.mapView; v.s = clamp(v.s * (e.deltaY > 0 ? 1.15 : 0.87), 0.4, 6); drawMap(); }, { passive: false });
  mapC.addEventListener('mousedown', (e) => { HUD.mapView.drag = [e.clientX, e.clientY]; });
  addEventListener('mousemove', (e) => { const v = HUD.mapView; if (v.drag && open.map) { v.x -= (e.clientX - v.drag[0]) * v.s; v.z -= (e.clientY - v.drag[1]) * v.s; v.drag = [e.clientX, e.clientY]; drawMap(); } });
  addEventListener('mouseup', () => { HUD.mapView.drag = null; });
  // ---------- small dialogs ----------
  function note(title, text) { closeAll(false); open.note = true; const w = $id('noteWin'); w.hidden = false; w.querySelector('h3').textContent = title; w.querySelector('p').textContent = text; Input.unlock(); }
  $id('noteWin').querySelector('button').onclick = () => closeAll();
  function portalName(p) { closeAll(false); open.name = true; namePiece = p; $id('nameWin').hidden = false; const i = $id('portalTag'); i.value = p.data.tag || ''; Input.unlock(); Input.setTyping(true); setTimeout(() => i.focus(), 30); }
  $id('portalOk').onclick = () => { if (namePiece) namePiece.data.tag = $id('portalTag').value.trim(); HUD.msg('Portal tagged "' + (namePiece && namePiece.data.tag) + '".'); closeAll(); };
  $id('portalCancel').onclick = () => closeAll();
  // ---------- pause ----------
  function pause() {
    if (G.state !== 'play' || open.pause) return;
    closeAll(false); open.pause = true; $id('pause').hidden = false; Input.unlock(); G.paused = true;
  }
  function resume() { open.pause = false; $id('pause').hidden = true; G.paused = false; $id('setPanel').hidden = true; $id('helpPanel').hidden = true; relock(); }
  $id('pResume').onclick = resume;
  $id('pQuit').onclick = () => { SAVE.save(); location.hash = DEBUG ? location.hash : ''; location.reload(); };
  $id('pExport').onclick = () => SAVE.exportFile();
  $id('pImport').onclick = () => $id('importFile').click();
  $id('importFile').onchange = (e) => { const f = e.target.files[0]; if (f) SAVE.importFile(f); };
  $id('pSettings').onclick = () => { showPanelOver('setPanel'); };
  $id('pHelp').onclick = () => { showPanelOver('helpPanel'); };
  function showPanelOver(id) {
    // reuse the title's panels on top of the pause screen
    const p = $id(id); $id('pause').appendChild(p); p.hidden = false; $id('pause').querySelector('.menu').hidden = true;
    const back = id === 'setPanel' ? $id('bSetBack') : $id('bHelpBack');
    back.onclick = () => { p.hidden = true; $id('pause').querySelector('.menu').hidden = false; $id('title').insertBefore(p, $id('loading')); bindTitleBacks(); };
  }
  function victory() {
    open.victory = true; Input.unlock(); $id('victory').hidden = false;
    const P = PLAYER;
    $id('vicStats').innerHTML = 'Days survived <b>' + SKY.day + '</b> · deaths <b>' + P.deaths + '</b> · pieces built <b>' + BUILD.pieces.length + '</b>';
  }
  $id('vContinue').onclick = () => { open.victory = false; $id('victory').hidden = true; relock(); };

  // ---------- title & character creation ----------
  const look = { skin: 1, hair: 0, hairCol: 0, build: 0, beard: false };
  let prev = null;
  function chips(elId, opts, get, set) {
    const el = $id(elId);
    el.innerHTML = opts.map((o, i) => '<span class="chip' + (get() === o[1] ? ' on' : '') + '" data-i="' + i + '">' + o[0] + '</span>').join('');
    el.onclick = (e) => { const i = e.target.dataset.i; if (i == null) return; set(opts[i][1]); chips(elId, opts, get, set); AU.play('ui'); };
  }
  function swatches(elId, cols, key) {
    const el = $id(elId);
    el.innerHTML = cols.map((c, i) => '<span class="sw' + (look[key] === i ? ' on' : '') + '" data-i="' + i + '" style="background:#' + c.toString(16).padStart(6, '0') + '"></span>').join('');
    el.onclick = (e) => { const i = e.target.dataset.i; if (i == null) return; look[key] = +i; swatches(elId, cols, key); buildPreview(); AU.play('ui'); };
  }
  function charPanel() {
    chips('cBuild', [['Slender', 0], ['Sturdy', 1]], () => look.build, (v) => { look.build = v; buildPreview(); });
    chips('cHair', HAIR_STYLES.map((n, i) => [n, i]), () => look.hair, (v) => { look.hair = v; buildPreview(); });
    chips('cBeard', [['None', false], ['Beard', true]], () => look.beard, (v) => { look.beard = v; buildPreview(); });
    swatches('cSkin', SKIN_TONES, 'skin'); swatches('cHairCol', HAIR_COLS, 'hairCol');
    $id('cSeed').value = $id('cSeed').value || String(Math.floor(Math.random() * 1e6));
    $id('overwriteNote').hidden = !SAVE.has();
    buildPreview();
  }
  function buildPreview() {
    const cv = $id('charPreview');
    if (!prev) {
      try { prev = { r: new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }), sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 220 / 260, 0.1, 50) }; } catch (e) { return; }
      prev.sc.add(new THREE.HemisphereLight(0xffe8d0, 0x302820, 0.9));
      const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(2, 3, 3); prev.sc.add(dl);
      prev.cam.position.set(0, 1.1, 4.4); prev.cam.lookAt(0, 0.95, 0);
      const spin = () => { if ($id('newPanel').hidden) { prev.raf = null; return; } if (prev.rig) prev.rig.root.rotation.y += 0.01; prev.r.render(prev.sc, prev.cam); prev.raf = requestAnimationFrame(spin); };
      prev.spin = spin;
    }
    if (prev.rig) prev.sc.remove(prev.rig.root);
    prev.rig = makePlayerRig(look);
    prev.rig.root.rotation.y = 0.5;
    const eq = { chest: newStack('rag_tunic', 1), legs: newStack('rag_pants', 1) };
    void eq;
    prev.sc.add(prev.rig.root);
    if (!prev.raf) prev.spin();
  }
  function settingsPanel() {
    const s = SETTINGS;
    const bindR = (id, k, f) => { const el = $id(id); el.value = s[k]; el.oninput = () => { s[k] = +el.value; saveSettings(); if (f) f(); }; };
    bindR('sSens', 'sens'); bindR('sFov', 'fov'); bindR('sView', 'view'); bindR('sVol', 'vol'); bindR('sMusic', 'music');
    const ch = (id, opts, k) => chips(id, opts, () => s[k], (v) => { s[k] = v; saveSettings(); if (k === 'grass' && G.state === 'play') updateGrass(PLAYER.pos.x, PLAYER.pos.z, true); });
    ch('sInvert', [['Off', false], ['On', true]], 'invertY');
    ch('sShadows', [['Off', 0], ['Low', 1], ['High', 2]], 'shadows');
    ch('sGrass', [['Off', 0], ['Normal', 1], ['Dense', 2]], 'grass');
    ch('sScale', [['Low', 0.7], ['Normal', 1]], 'scale');
    ch('sHints', [['On', true], ['Off', false]], 'hints');
  }
  function bindTitleBacks() {
    $id('bSetBack').onclick = () => { $id('setPanel').hidden = true; $id('mainMenu').hidden = false; };
    $id('bHelpBack').onclick = () => { $id('helpPanel').hidden = true; $id('mainMenu').hidden = false; };
  }
  function initTitle(onStart) {
    if (SETTINGS.hints == null) SETTINGS.hints = true;
    $id('bContinue').hidden = !SAVE.has();
    $id('bContinue').onclick = () => { AU.resume(); onStart({ cont: true }); };
    $id('bNew').onclick = () => { $id('mainMenu').hidden = true; $id('newPanel').hidden = false; charPanel(); AU.resume(); };
    $id('bBack').onclick = () => { $id('newPanel').hidden = true; $id('mainMenu').hidden = false; };
    $id('bStart').onclick = () => { onStart({ cont: false, name: $id('cName').value.trim() || 'Wanderer', look: Object.assign({}, look), seed: $id('cSeed').value.trim() || 'tokoyo' }); };
    $id('bSettings').onclick = () => { $id('mainMenu').hidden = true; $id('setPanel').hidden = false; settingsPanel(); };
    $id('bHelp').onclick = () => { $id('mainMenu').hidden = true; $id('helpPanel').hidden = false; };
    bindTitleBacks();
    settingsPanel();
    titleArt();
  }
  // ink-wash mountains behind the title
  function titleArt() {
    const cv = $id('c'), w = cv.width = innerWidth, h = cv.height = innerHeight;
    void w; void h;
    const svg = [];
    const r = mulberry32(7);
    const W2 = 1600, H2 = 900;
    svg.push('<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f45"/><stop offset=".55" stop-color="#b8756a"/><stop offset="1" stop-color="#e8b88a"/></linearGradient></defs>');
    svg.push('<rect width="' + W2 + '" height="' + H2 + '" fill="url(#sky)"/>');
    svg.push('<circle cx="1180" cy="470" r="80" fill="#d2452c" opacity=".9"/>');
    const layers = [['#6a5a66', 380, 140], ['#4a4052', 470, 110], ['#2e2a36', 560, 90], ['#1a1820', 660, 60]];
    layers.forEach(([c, base, amp], li) => {
      let d = 'M0 ' + H2 + ' L0 ' + base;
      for (let x = 0; x <= W2; x += 20) { const y = base - Math.abs(Math.sin(x * 0.004 + li * 2) * amp + Math.sin(x * 0.013 + li) * amp * 0.35) + r() * 8; d += ' L' + x + ' ' + y.toFixed(1); }
      d += ' L' + W2 + ' ' + H2 + ' Z';
      svg.push('<path d="' + d + '" fill="' + c + '" opacity="' + (0.85 + li * 0.05) + '"/>');
      if (li < 3) svg.push('<rect y="' + (base - 10) + '" width="' + W2 + '" height="90" fill="#e8d8c8" opacity=".12"/>');
    });
    // torii silhouette and cedars
    svg.push('<g fill="#120f12"><rect x="300" y="610" width="16" height="200"/><rect x="420" y="610" width="16" height="200"/><rect x="270" y="590" width="196" height="16" rx="4"/><rect x="285" y="630" width="166" height="10"/></g>');
    for (let i = 0; i < 26; i++) { const x = 600 + i * 40 + r() * 20, hh = 120 + r() * 140; svg.push('<path d="M' + x + ' ' + (H2 - 40) + ' L' + (x - 22) + ' ' + (H2 - 40) + ' L' + x + ' ' + (H2 - 40 - hh) + ' L' + (x + 22) + ' ' + (H2 - 40) + ' Z" fill="#0e0c10"/>'); }
    svg.push('<rect y="' + (H2 - 60) + '" width="' + W2 + '" height="60" fill="#0e0c10"/>');
    for (let i = 0; i < 5; i++) { const x = 1150 + i * 60 + r() * 30, y = 330 + r() * 70; svg.push('<path d="M' + x + ' ' + y + ' q 10 -8 20 0 q 10 -8 20 0" stroke="#1a1418" stroke-width="3" fill="none"/>'); }
    const t = $id('title');
    t.style.backgroundImage = getComputedStyle(t).backgroundImage + ', url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W2 + ' ' + H2 + '" preserveAspectRatio="xMidYMid slice">' + svg.join('') + '</svg>') + '")';
    t.style.backgroundSize = 'cover'; t.style.backgroundPosition = 'center';
  }
  return {
    blocking, closeAll, openInventory, openChest, openBuildMenu, note, portalName, pause, resume, victory, initTitle, renderInv, known,
    tick() { if (open.inv && (G.frame % 20 === 0) && !drag) renderInv(); if (open.map && G.frame % 15 === 0) drawMap(); },
    get open() { return open; },
  };
})();
