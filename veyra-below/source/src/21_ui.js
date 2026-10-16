// Veyra Below — menus: title, character creation, gear and skills, ship services, dialogs, gamepad navigation

// ---------- item actions shared by menus ----------
function canEquip(c, it) {
  if (!isEquip(it)) return 'Not equipment.';
  if (it.unid) return 'Have the Artificer appraise it first.';
  if (it.kind === 'weapon' && !ROLES[c.role].weapons.includes(it.base)) return `${ROLES[c.role].name}s can't use ${WTYPES[it.base].name}.`;
  if (reqLevel(it) > c.level) return `Requires level ${reqLevel(it)}.`;
  return '';
}
function equipItem(c, it, slot) {
  const why = canEquip(c, it); if (why) { HUD.toast(why, '#ff9090'); AUDIO.sfx('error'); return false; }
  slot = slot || (it.kind === 'unit' ? (!c.equip.unit1 ? 'unit1' : !c.equip.unit2 ? 'unit2' : 'unit1') : it.kind);
  const old = c.equip[slot];
  invRemove(c.inv, it); c.equip[slot] = it;
  if (old) c.inv.push(old);
  AUDIO.sfx('uiok'); if (PL) refreshPartyActor(PL, false);
  return true;
}
function unequip(c, slot) {
  const it = c.equip[slot]; if (!it) return;
  if (c.inv.length >= INV_MAX) { HUD.toast('Your inventory is full.', '#ff9090'); return; }
  c.equip[slot] = null; c.inv.push(it); AUDIO.sfx('ui'); if (PL) refreshPartyActor(PL, false);
}
function learnDisc(c, it) {
  const why = discProblem(c, it); if (why) { HUD.toast(why, '#ff9090'); AUDIO.sfx('error'); return; }
  c.techs[it.base] = it.lv; invRemove(c.inv, it);
  HUD.toast(`Learned ${TECHS[it.base].name} Lv${it.lv}`, '#a0d8ff'); AUDIO.sfx('levelup');
  if (!c.hotbar.some((h) => h && h.t === 'tech' && h.id === it.base)) { const i = c.hotbar.findIndex((h) => !h); if (i >= 0) c.hotbar[i] = { t: 'tech', id: it.base }; }
}
function useTonic(c, it) {
  const T_ = TOOLS[it.base];
  if (c.matTotal >= MAT_CAP) { HUD.toast('Your body can\'t take any more tonics.', '#ff9090'); return; }
  invTake(c.inv, it.base, 1); c.mats[T_.stat] = (c.mats[T_.stat] || 0) + T_.v; c.matTotal++;
  HUD.toast(`${STAT_NAMES[T_.stat]} +${T_.v}`, '#ffb0ff'); AUDIO.sfx('buff'); if (PL) refreshPartyActor(PL, false);
}
function itemRow(it, right, attrs = '') {
  return `<div class="row" data-nav ${attrs}><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r">${right || ''}</span></div>`;
}
function hotbarStrip(c) {
  return `<div class="hdr">Action palette</div><div class="acts">${c.hotbar.map((h, i) => {
    let nm = '—'; if (h) nm = h.t === 'tech' ? TECHS[h.id].name : h.t === 'skill' ? SKILLS[h.id].name : TOOLS[h.id].name;
    return `<span class="hk"><b>${i + 1}</b> ${esc(nm)} ${h ? `<button class="btn sm" data-nav data-a="hbclear:${i}" title="Clear">×</button>` : ''}</span>`;
  }).join(' ')}</div>`;
}
function assignButtons(t, id) { return `<span class="hk">Palette: ${[0, 1, 2, 3, 4, 5].map((i) => `<button class="btn sm" data-nav data-a="assign:${t}:${id}:${i}">${i + 1}</button>`).join('')}</span>`; }

const UI = (() => {
  let cur = null, dlg = null, loadingOn = false, focus = null, downEl = null;
  const st = { menuTab: 'gear', sel: null, npcTab: null, teleArea: 'forest', teleDiff: 0, delArm: -1, create: null, artSel: null, socketItem: null };
  const root = () => $('#ui');
  function isOpen() { return !!cur && cur.id !== 'title' && cur.id !== 'create' || !!dlg; }
  function blocking() { return !!cur || !!dlg || loadingOn; }
  function open(id, render, on, cls) {
    close(true);
    const el = document.createElement('div'); el.className = cls || 'scrim';
    root().appendChild(el);
    cur = { id, el, render, on: on || (() => {}) };
    redraw();
    if (Input.mode !== 'pad') focus = null;
  }
  function redraw() {
    if (!cur) return;
    const sc = cur.el.querySelector('.pc') ? cur.el.querySelector('.pc').scrollTop : 0;
    cur.el.innerHTML = cur.render();
    const pc = cur.el.querySelector('.pc'); if (pc) pc.scrollTop = sc;
    if (focus && !document.body.contains(focus)) focus = null;
    if (focus) applyFocus(focus);
  }
  function close(silent) {
    if (cur) { cur.el.remove(); if (!silent) AUDIO.sfx('uiback'); }
    cur = null; focus = null; HUD.hideTip();
    $('#gtip').hidden = true;
  }
  function back() {
    if (dlg) { advance(); return; }
    if (!cur) return;
    if (cur.id === 'title') return;
    if (cur.id === 'create' || cur.id === 'title-opts') { showTitle(); return; }
    close();
  }
  // click handling
  function init() {
    root().addEventListener('click', (e) => {
      const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
      AUDIO.init();
      const [verb, ...args] = t.dataset.a.split(':');
      handle(verb, args, t);
    });
    root().addEventListener('input', (e) => { if (e.target.id === 'cname' && st.create) { st.create.name = e.target.value.slice(0, 14); const sg = $('#csign'); if (sg) sg.innerHTML = signLine(st.create.name); } if (e.target.dataset.opt) { setOpt(e.target.dataset.opt, +e.target.value); } });
    root().addEventListener('mouseover', (e) => { const r = e.target.closest('[data-tip]'); if (r) showTipFor(r); });
    root().addEventListener('mouseout', (e) => { if (e.target.closest('[data-tip]')) $('#gtip').hidden = true; });
    $('#menuBtn').addEventListener('click', () => { AUDIO.init(); if (GAME.char && !blocking()) openMenu(); });
    $('#mapBtn').addEventListener('click', () => HUD.toggleMap());
    addEventListener('keydown', (e) => {
      if (dlg && ['Space', 'Enter', 'KeyE', 'KeyF', 'Escape'].includes(e.code)) { e.preventDefault(); advance(); return; }
      if (e.target.tagName === 'INPUT') { if (e.code === 'Escape') e.target.blur(); return; }
      if (e.code === 'Escape' && cur) { e.preventDefault(); back(); return; }
      if (!cur && !dlg && GAME.char && (GAME.mode === 'hub' || GAME.mode === 'field') && PL && !PL.downed) {
        const tabs = { Escape: 'gear', KeyI: 'gear', KeyC: 'char', KeyK: 'skills', KeyT: 'arts', KeyJ: 'contract' };
        if (tabs[e.code]) { e.preventDefault(); openMenu(tabs[e.code]); }
      } else if (cur && cur.id === 'menu' && ['KeyI', 'KeyC', 'KeyK', 'KeyT', 'KeyJ'].includes(e.code)) close();
    });
  }
  function showTipFor(r) {
    const c = GAME.char, [where, key] = r.dataset.tip.split(':');
    let it = null;
    if (where === 'inv') it = c.inv[+key]; else if (where === 'eq') it = c.equip[key]; else if (where === 'bank') it = c.bank.items[+key]; else if (where === 'shop') it = GAME.shopStock && GAME.shopStock[+key];
    if (!it) return;
    const tt = $('#gtip'); tt.innerHTML = tooltipHTML(it, where === 'eq' ? null : cmpFor(it), c); tt.hidden = false;
    const rr = r.getBoundingClientRect(), b = tt.getBoundingClientRect();
    let x = rr.right + 10; if (x + b.width > innerWidth - 8) x = rr.left - b.width - 10;
    tt.style.left = Math.max(8, x) + 'px'; tt.style.top = clamp(rr.top, 8, innerHeight - b.height - 8) + 'px';
  }
  // ---------- dispatcher ----------
  function handle(verb, a, el) {
    const c = GAME.char;
    switch (verb) {
      case 'close': close(); return;
      case 'tab': st.menuTab = a[0]; st.sel = null; AUDIO.sfx('ui'); redraw(); return;
      case 'ntab': st.npcTab = a[0]; st.sel = null; AUDIO.sfx('ui'); redraw(); return;
      case 'hbclear': c.hotbar[+a[0]] = null; AUDIO.sfx('ui'); redraw(); return;
      case 'assign': { const [t, id, i] = a; c.hotbar = c.hotbar.map((h) => (h && h.t === t && h.id === id ? null : h)); c.hotbar[+i] = { t, id }; AUDIO.sfx('uiok'); redraw(); return; }
      case 'opt': setOpt(a[0], a[1] === undefined ? !OPTS[a[0]] : +a[1]); redraw(); return;
    }
    cur && cur.on(verb, a, el);
  }

  // ---------- title ----------
  function showTitle() {
    GAME.mode = 'title'; GAME.char = null;
    document.body.dataset.state = 'title';
    titleScene();
    AUDIO.music('title');
    open('title', () => {
      const saves = SAVE.list();
      return `<div id="title"><div class="logo"><h1>VEYRA BELOW</h1><p>Descend · Survive · Plunder</p></div>
      <div class="slots">${[0, 1, 2].map((i) => { const s = saves[i]; return s ? `<div class="sl"><h3>${esc(s.name)}</h3><div class="m">${CLASS_NAME(s.role, s.race)} · Level ${s.level}</div><div class="m">${(STAR_SIGNS.find((q) => q.id === s.sid) || {}).name || ''} · ${fmtTime(s.playTime)} played</div><div class="acts"><button class="btn pri" data-nav data-a="cont:${i}">Continue</button><button class="btn warn sm" data-nav data-a="del:${i}">${st.delArm === i ? 'Really delete?' : 'Delete'}</button></div></div>` : `<div class="sl"><h3 style="color:var(--faint)">Empty slot</h3><div class="m">A new warden</div><div class="acts"><button class="btn pri" data-nav data-a="new:${i}">New warden</button></div></div>`; }).join('')}</div>
      <div class="acts"><button class="btn" data-nav data-a="topts">Options</button></div>
      <div class="foot">WASD to move · mouse to aim · left click attack, right click heavy, Q special (time your presses for perfect combo hits) · Space roll · E use · 1–6 palette · R overdrive · Tab map · I/K/T menus. Gamepad and touch work too.</div></div>`;
    }, (verb, a) => {
      if (verb === 'cont') { const ch = SAVE.load(+a[0]); if (ch) startWithChar(ch, +a[0]); }
      if (verb === 'new') showCreate(+a[0]);
      if (verb === 'del') { if (st.delArm === +a[0]) { SAVE.del(+a[0]); st.delArm = -1; AUDIO.sfx('uiback'); } else { st.delArm = +a[0]; setTimeout(() => { st.delArm = -1; if (cur && cur.id === 'title') redraw(); }, 3000); } redraw(); }
      if (verb === 'topts') openOptions(true);
    }, 'titlewrap');
  }
  function titleScene() {
    resetLevelState(); clearRoot();
    LV = genHub(); buildHubMeshes(LV); applyPalette(HUB_PAL);
    GAME.titleCam = true;
  }
  function startWithChar(ch, slot) {
    GAME.char = ch; GAME.slot = slot; GAME.diff = ch.prog.diff || 0; GAME.titleCam = false;
    close(true);
    enterHub();
    if (!ch.prog.introDone) { ch.prog.introDone = true; dialog('Veyra Below', STORY.intro, () => {}); }
  }
  // ---------- character creation ----------
  function showCreate(slot) {
    st.create = { slot, name: '', role: 'vanguard', race: 'human', suit: SUIT_COLORS[0], suit2: 0x2a2e38, hair: HAIR_COLORS[0], build: 0 };
    document.body.dataset.state = 'create';
    rebuildPreview();
    open('create', renderCreate, (verb, a) => {
      const s = st.create;
      if (verb === 'role') s.role = a[0]; if (verb === 'race') s.race = a[0];
      if (verb === 'suit') s.suit = +a[0]; if (verb === 'suit2') s.suit2 = +a[0]; if (verb === 'hair') s.hair = +a[0]; if (verb === 'build') s.build = +a[0];
      if (verb === 'cback') { showTitle(); return; }
      if (verb === 'cgo') {
        const name = (s.name || '').trim();
        if (!name) { HUD.toast('Give your warden a name.', '#ff9090'); AUDIO.sfx('error'); return; }
        const ch = newCharacter(name, s.role, s.race, { suit: s.suit, suit2: s.suit2, hair: s.hair, build: s.build, glow: [0x60e0ff, 0x80ff90, 0xc080ff][Object.keys(ROLES).indexOf(s.role)] });
        SAVE.store(slot, ch);
        startWithChar(ch, slot); return;
      }
      AUDIO.sfx('ui'); rebuildPreview(); redraw();
    }, 'createwrap');
  }
  const signLine = (n) => { if (!n.trim()) return '<span style="color:var(--faint)">Your star sign comes from your name.</span>'; const s = signFor(n.trim()); return `Star sign: <b style="color:${hexCss(s.color)}">${s.name}</b> <span style="color:var(--dim)">· finds more ${s.favor.map((w) => WTYPES[w].name).join(' and ')} relics</span>`; };
  function renderCreate() {
    const s = st.create, R0 = ROLES[s.role], RA = RACES[s.race];
    const pv = {}; for (const k of STAT_KEYS) pv[k] = Math.round(R0.base[k] * RA.mods[k]);
    const sw = (verb, list, cur) => `<div class="sw">${list.map((c) => `<button data-nav data-a="${verb}:${c}" class="${c === cur ? 'sel' : ''}" style="background:${hexCss(c)}"></button>`).join('')}</div>`;
    return `<div id="create"><div class="panel"><div class="ph"><h2>New warden</h2><span class="sp"></span><button class="x" data-a="cback">×</button></div><div class="pc">
      <div class="hdr">Name</div><input type="text" id="cname" maxlength="14" value="${esc(s.name)}" placeholder="Name" autocomplete="off"><div id="csign" style="margin-top:5px;font-size:13px">${signLine(s.name)}</div>
      <div class="hdr">Class</div><div class="cards3">${Object.entries(ROLES).map(([k, r]) => `<div class="card ${k === s.role ? 'sel' : ''}" data-nav data-a="role:${k}"><h3 style="color:${hexCss(r.color)}">${r.name}</h3><p>${r.desc}</p></div>`).join('')}</div>
      <div class="hdr">Origin</div><div class="cards3">${Object.entries(RACES).map(([k, r]) => `<div class="card ${k === s.race ? 'sel' : ''}" data-nav data-a="race:${k}"><h3>${r.name}</h3><p>${r.desc}</p></div>`).join('')}</div>
      <div class="hdr">Suit</div>${sw('suit', SUIT_COLORS, s.suit)}
      <div class="hdr">Trim</div>${sw('suit2', [0x2a2e38, 0x3a3030, 0x30383a, 0xe8e8e8, 0x5a4a30, 0x1a1a40], s.suit2)}
      <div class="hdr">${s.race === 'construct' ? 'Plating' : 'Hair'}</div>${sw('hair', HAIR_COLORS, s.hair)}
      <div class="hdr">Build</div><div class="acts"><button class="btn ${s.build ? '' : 'pri'}" data-nav data-a="build:0">Slim</button><button class="btn ${s.build ? 'pri' : ''}" data-nav data-a="build:1">Broad</button></div>
      <div class="hdr">Starting stats</div><div class="stats" style="grid-template-columns:repeat(4,auto auto)">${STAT_KEYS.map((k) => `<span class="k">${STAT_NAMES[k]}</span><span class="v">${pv[k]}</span>`).join('')}</div>
      <div class="acts" style="margin-top:14px"><button class="btn" data-nav data-a="cback">Back</button><span class="sp" style="flex:1"></span><button class="btn pri" data-nav data-a="cgo">Begin</button></div>
    </div></div></div>`;
  }
  function rebuildPreview() {
    const s = st.create;
    if (GAME.preview) R.root.remove(GAME.preview.g);
    const rig = makeHumanoid({ suit: s.suit, suit2: s.suit2, hair: s.hair, race: s.race, role: s.role, build: s.build, glow: 0x60e0ff });
    equipWeaponModel(rig, ROLES[s.role].start, [0x60e0ff, 0x80ff90, 0xc080ff][Object.keys(ROLES).indexOf(s.role)]);
    const tele = LV.objects.find((o) => o.kind === 'tele');
    rig.g.position.set(tele.x, 0.2, tele.z); R.root.add(rig.g);
    GAME.preview = rig; GAME.previewT = 0;
  }

  // ---------- in-game menu ----------
  function openMenu(tab) {
    if (tab) st.menuTab = tab;
    st.sel = null;
    open('menu', renderMenu, menuAction);
    AUDIO.sfx('ui');
  }
  const MENU_TABS = [['gear', 'Gear'], ['char', 'Character'], ['skills', 'Skills'], ['arts', 'Arts'], ['sprite', 'Sprite'], ['contract', 'Contract'], ['options', 'Options'], ['system', 'System']];
  function renderMenu() {
    const c = GAME.char;
    const body = { gear: gearTab, char: charTab, skills: skillsTab, arts: artsTab, sprite: spriteTab, contract: contractTab, options: optionsTab, system: systemTab }[st.menuTab](c);
    return `<div class="panel"><div class="ph"><h2>${esc(c.name)}</h2><span class="sub">${CLASS_NAME(c.role, c.race)} · Level ${c.level} · <span class="cr">${fmtNum(c.credits)} cr</span></span><span class="sp"></span><button class="x" data-a="close">×</button></div>
      <div class="tabs">${MENU_TABS.map(([k, n]) => `<button class="tab ${k === st.menuTab ? 'on' : ''}" data-nav data-a="tab:${k}">${n}${k === 'skills' && c.skillPts ? ` <span class="cr">(${c.skillPts})</span>` : ''}</button>`).join('')}</div>
      <div class="pc">${body}</div></div>`;
  }
  function gearTab(c) {
    const eq = EQUIP_SLOTS.map((s) => { const it = c.equip[s]; return it ? `<div class="row ${st.sel && st.sel.where === 'eq' && st.sel.k === s ? 'sel' : ''}" data-nav data-a="sel:eq:${s}" data-tip="eq:${s}"><span class="slotname">${SLOT_NAMES[s]}</span><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span></div>` : `<div class="row"><span class="slotname">${SLOT_NAMES[s]}</span><span class="nm" style="color:var(--faint)">empty</span></div>`; }).join('');
    const inv = c.inv.map((it, i) => `<div class="row ${st.sel && st.sel.where === 'inv' && st.sel.k === i ? 'sel' : ''}" data-nav data-a="sel:inv:${i}" data-tip="inv:${i}"><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r">${isEquip(it) && !it.unid && canEquip(c, it) ? '<span style="color:var(--red)">✕</span>' : ''}</span></div>`).join('') || '<div style="color:var(--faint)">Empty</div>';
    let det = '';
    const it = st.sel && (st.sel.where === 'eq' ? c.equip[st.sel.k] : c.inv[st.sel.k]);
    if (it) {
      const acts = [];
      if (st.sel.where === 'eq') acts.push('<button class="btn" data-nav data-a="unequip">Unequip</button>');
      else {
        if (isEquip(it)) { if (it.kind === 'unit') acts.push('<button class="btn pri" data-nav data-a="equip:unit1">Equip (slot A)</button><button class="btn pri" data-nav data-a="equip:unit2">Equip (slot B)</button>'); else acts.push('<button class="btn pri" data-nav data-a="equip">Equip</button>'); }
        if (it.kind === 'disc') acts.push('<button class="btn pri" data-nav data-a="learn">Learn</button>');
        if (it.kind === 'tool') { const u = TOOLS[it.base].use; if (u === 'mat') acts.push('<button class="btn pri" data-nav data-a="tonic">Drink</button>'); else if (u !== 'none') acts.push('<button class="btn pri" data-nav data-a="use">Use</button>'); if (SPRITE_FEED[it.base]) acts.push(`<button class="btn" data-nav data-a="feed">Feed sprite${c.sprite.feedT > 0 ? ` (${Math.ceil(c.sprite.feedT)}s)` : ''}</button>`); if (u !== 'none' && u !== 'mat') acts.push(assignButtons('item', it.base)); }
        acts.push(`<button class="btn warn" data-nav data-a="drop">${GAME.mode === 'field' ? 'Drop' : 'Discard'}</button>`);
      }
      det = `<div class="detail">${tooltipHTML(it, st.sel.where === 'inv' ? cmpFor(it) : null, c)}<div class="acts">${acts.join('')}</div></div>`;
    }
    return `${hotbarStrip(c)}<div class="cols" style="margin-top:8px"><div><div class="hdr">Equipped</div><div class="list">${eq}</div>
      <div class="hdr">Sprite</div><div class="row" data-nav data-a="tab:sprite"><span class="nm" style="color:${hexCss(SPRITE_FORMS[c.sprite.form].color)}">${SPRITE_FORMS[c.sprite.form].name}</span><span class="r">Level ${spriteLevel(c.sprite)}</span></div>${det}</div>
      <div><div class="hdr">Inventory ${c.inv.length} / ${INV_MAX} <button class="btn sm" data-nav data-a="sort" style="float:right">Sort</button></div><div class="list">${inv}</div></div></div>`;
  }
  function menuAction(verb, a) {
    const c = GAME.char;
    const it = st.sel && (st.sel.where === 'eq' ? c.equip[st.sel.k] : c.inv[st.sel.k]);
    switch (verb) {
      case 'sel': st.sel = { where: a[0], k: a[0] === 'inv' ? +a[1] : a[1] }; AUDIO.sfx('ui'); break;
      case 'equip': if (it && equipItem(c, it, a[0])) st.sel = null; break;
      case 'unequip': unequip(c, st.sel.k); st.sel = null; break;
      case 'learn': if (it) { learnDisc(c, it); st.sel = null; } break;
      case 'tonic': if (it) { useTonic(c, it); if (!c.inv.includes(it)) st.sel = null; } break;
      case 'use': if (it && PL) { if (startItem(PL, it.base)) { close(); return; } } break;
      case 'feed': if (it) { HUD.toast(feedSprite(c, it.base), '#d0b0ff'); if (!c.inv.includes(it)) st.sel = null; } break;
      case 'drop': if (it) { invRemove(c.inv, it); if (GAME.mode === 'field' && PL) dropItem(it, PL.x, PL.z, 1); AUDIO.sfx('uiback'); st.sel = null; } break;
      case 'sort': c.inv.sort((p, q) => ['weapon', 'frame', 'barrier', 'unit', 'disc', 'gem', 'tool', 'quest'].indexOf(p.kind) - ['weapon', 'frame', 'barrier', 'unit', 'disc', 'gem', 'tool', 'quest'].indexOf(q.kind) || (q.rar || 0) - (p.rar || 0) || (q.ilvl || 0) - (p.ilvl || 0)); st.sel = null; AUDIO.sfx('ui'); break;
      case 'skillup': { const sk = SKILLS[a[0]]; if (c.skillPts > 0 && skillTierOpen(c, sk) && (c.skills[a[0]] || 0) < sk.max) { c.skills[a[0]] = (c.skills[a[0]] || 0) + 1; c.skillPts--; AUDIO.sfx('uiok'); if (sk.type === 'active' && c.skills[a[0]] === 1 && !c.hotbar.some((h) => h && h.id === a[0])) { const i = c.hotbar.findIndex((h) => !h); if (i >= 0) c.hotbar[i] = { t: 'skill', id: a[0] }; } if (PL) refreshPartyActor(PL, false); } break; }
      case 'pbsel': c.sprite.pbSel = +a[0]; AUDIO.sfx('uiok'); break;
      case 'feedid': HUD.toast(feedSprite(c, a[0]), '#d0b0ff'); break;
      case 'abandon': c.quest.active = null; AUDIO.sfx('uiback'); break;
      case 'quit': SAVE.save(); showTitle(); return;
      case 'saveNow': SAVE.save(); HUD.toast('Saved.', '#a0ffb0'); break;
    }
    redraw();
  }
  function charTab(c) {
    const S = PL ? PL.S : computeStats(c);
    const row = (k, v) => `<span class="k">${k}</span><span class="v">${v}</span>`;
    const sign = STAR_SIGNS.find((q) => q.id === c.sid);
    return `<div class="cols"><div><div class="hdr">Attributes</div><div class="stats">
      ${row('HP', S.maxHp)}${row('PSI', S.maxTp)}${row('ATK (attack)', S.atp)}${row('DEF (defence)', S.dfp)}${row('PSY (psionic power)', S.mst)}${row('ACC (accuracy)', S.ata)}${row('EVA (evasion)', S.evp)}${row('LUK (luck)', S.lck)}</div>
      <div class="hdr">Combat</div><div class="stats">${row('Weapon damage', PL && PL.weapon ? `${weaponDamage(PL.weapon).min}–${weaponDamage(PL.weapon).max}` : '—')}${row('Critical chance', pct(S.crit))}${row('Critical damage', '×' + S.critMul.toFixed(2))}${row('Attack speed', '+' + pct(S.atkSpd))}${row('Move speed', S.speed.toFixed(1) + ' m/s')}${row('PSI regen', S.tpRegenTotal.toFixed(1) + '/s')}${row('Life leech', pct(S.leech + S.meleeLeech))}${row('Damage reduction', pct(S.dmgReduce))}${row('Art damage', '+' + pct(S.techPct))}</div></div>
      <div><div class="hdr">Resistances</div><div class="stats">${ELEMS.map((e) => row(ELEM_NAMES[e], pct(S[RES_KEYS[e]]))).join('')}</div>
      <div class="hdr">Record</div><div class="stats">${row('Star sign', sign ? `<span style="color:${hexCss(sign.color)}">${sign.name}</span>` : '')}${row('Experience', c.level >= MAX_LEVEL ? 'max' : `${fmtNum(c.xp)} / ${fmtNum(xpToNext(c.level))}`)}${row('Tonics taken', `${c.matTotal} / ${MAT_CAP}`)}${row('Play time', fmtTime(c.playTime))}${row('Monsters slain', fmtNum(c.stats.kills))}${row('Bosses slain', c.stats.bosses)}${row('Relics found', c.stats.rares)}${row('Times fallen', c.stats.deaths)}${row('Highest difficulty', DIFFS[c.prog.maxDiff].name)}</div></div></div>`;
  }
  function skillsTab(c) {
    let h = `<div class="acts"><b>Skill points: <span class="cr">${c.skillPts}</span></b><span style="color:var(--dim);font-size:13px">One per level. Tiers open at levels ${SKILL_TIER_LEVEL.join(' / ')} once you've spent ${SKILL_TIER_POINTS[1]} and ${SKILL_TIER_POINTS[2]} points.</span></div>${hotbarStrip(c)}`;
    for (let tier = 0; tier < 3; tier++) {
      h += `<div class="hdr">Tier ${tier + 1}</div><div class="skgrid">`;
      for (const [id, sk] of classSkills(c).filter(([, s]) => s.tier === tier)) {
        const r = c.skills[id] || 0, open = skillTierOpen(c, sk);
        h += `<div class="sk ${open ? '' : 'locked'}"><div class="t">${iconSVG(sk.icon)}<span>${sk.name}</span><span class="rk">${r}/${sk.max}</span></div><div class="d">${sk.desc(Math.max(1, r))}${sk.type === 'active' ? `<br><span style="color:var(--faint)">${sk.tp ? sk.tp + ' PSI · ' : ''}${sk.cd}s cooldown</span>` : ''}</div>
          <div class="acts">${open && r < sk.max && c.skillPts ? `<button class="btn sm pri" data-nav data-a="skillup:${id}">${r ? 'Rank up' : 'Learn'}</button>` : ''}${sk.type === 'active' && r ? assignButtons('skill', id) : ''}</div></div>`;
      }
      h += '</div>';
    }
    const rs = Object.entries(SKILLS).filter(([, s]) => s.role === 'race' && s.race === c.race);
    if (rs.length) { h += `<div class="hdr">${RACES[c.race].name} abilities</div><div class="skgrid">${rs.map(([id, sk]) => `<div class="sk ${c.level >= sk.level ? '' : 'locked'}"><div class="t">${iconSVG(sk.icon)}<span>${sk.name}</span><span class="rk">${c.level >= sk.level ? 'Known' : 'Lv ' + sk.level}</span></div><div class="d">${sk.desc()}</div><div class="acts">${c.level >= sk.level ? assignButtons('skill', id) : ''}</div></div>`).join('')}</div>`; }
    return h;
  }
  function artsTab(c) {
    const known = TECH_ORDER.filter((id) => c.techs[id] > 0);
    let h = hotbarStrip(c) + `<div class="hdr">Known arts</div>`;
    if (!known.length) h += `<div style="color:var(--dim)">You don't know any psionic arts yet. Art chips drop from monsters and are sold by the Quartermaster.</div>`;
    h += '<div class="list">' + known.map((id) => { const T_ = TECHS[id], lv = c.techs[id]; return `<div class="row" style="cursor:default;flex-wrap:wrap"><span class="ic">${techIconSVG(id)}</span><span class="nm">${T_.name} <span style="color:var(--gold)">Lv${lv}</span></span><span class="r">${Math.round(techCost(id, lv) * (1 + (PL ? PL.S.tpCost : 0)))} PSI</span><div style="width:100%;font-size:13px;color:var(--dim)">${T_.desc}</div>${assignButtons('tech', id)}</div>`; }).join('') + '</div>';
    h += `<div class="hdr">Limits</div><div style="color:var(--dim);font-size:13px">${ROLES[c.role].name}s can raise arts to level ${ROLES[c.role].techMax}.${c.role !== 'psion' ? ' Radiance, Umbra, Enfeeble and Expose are for Psions only.' : ''}${RACES[c.race].noSupport ? ' Constructs cannot use support arts.' : ''}</div>`;
    return h;
  }
  function spriteTab(c) {
    const m = c.sprite, f = SPRITE_FORMS[m.form], lv = spriteLevel(m);
    const bar = (k) => `<span class="k">${SPRITE_STAT_NAMES[k]}</span><span class="v">${m[k].toFixed(2)}</span>`;
    const next = SPRITE_EVOLVE.find((v) => v > lv);
    const feedable = Object.keys(SPRITE_FEED).filter((id) => invCount(c.inv, id) > 0);
    return `<div class="cols"><div><div class="hdr">Your sprite</div><div style="font-size:22px;font-weight:700;color:${hexCss(f.color)}">${f.name} <span style="color:var(--dim);font-size:15px">Level ${lv}</span></div>
      <div class="stats" style="margin-top:6px">${['def', 'pow', 'dex', 'mind'].map(bar).join('')}<span class="k">Bond</span><span class="v">${Math.round(m.syn)}%</span><span class="k">Wit</span><span class="v">${Math.round(m.iq)}</span></div>
      <div style="color:var(--dim);font-size:13px;margin-top:6px">Each point of Guard adds 2 DEF, Might 2 ATK, Agility 1 ACC and ½ EVA, Insight 2 PSY. Bond makes the overdrive charge faster.${next ? ` Evolves at level ${next}.` : ' Fully evolved.'}</div>
      <div class="hdr">Overdrive</div>${m.pbs.length ? m.pbs.map((p, i) => `<div class="row ${m.pbSel % m.pbs.length === i ? 'sel' : ''}" data-nav data-a="pbsel:${i}"><span class="nm">${PBS[p].name}</span><span class="r">${PBS[p].desc}</span></div>`).join('') : '<div style="color:var(--dim);font-size:13px">Your sprite learns its first overdrive when it evolves at level 10.</div>'}</div>
      <div><div class="hdr">Feed ${m.feedT > 0 ? `<span style="color:var(--dim)">(hungry again in ${Math.ceil(m.feedT)}s)</span>` : '<span style="color:var(--green)">(hungry)</span>'}</div>
      <div class="list">${feedable.length ? feedable.map((id) => `<div class="row" data-nav data-a="feedid:${id}"><span class="ic">${toolIconSVG(id)}</span><span class="nm">${TOOLS[id].name} ×${invCount(c.inv, id)}</span><span class="r">${['def', 'pow', 'dex', 'mind'].map((k, i) => SPRITE_FEED[id][i] ? `${SPRITE_STAT_NAMES[k]} +${SPRITE_FEED[id][i]}` : '').filter(Boolean).join(', ')}</span></div>`).join('') : '<div style="color:var(--dim)">Sprites eat medgels, psi cells and other consumables. You have nothing it likes.</div>'}</div></div></div>`;
  }
  function contractTab(c) {
    const q = c.quest.active;
    if (!q) return `<div style="color:var(--dim)">No active contract. Juno at the Wardens' Bureau on the Meridian hands them out.</div>`;
    return `<div class="detail"><div class="tt-name" style="color:var(--gold)">${esc(q.title)}</div><div class="tt-sub">${AREAS[q.area].name} ${q.floor + 1} · ${DIFFS[q.diff].name} · for ${esc(q.giver)}</div><p>${esc(q.desc)}</p>
      <div>${q.done ? '<b style="color:var(--green)">Complete. Return to the Bureau for your reward.</b>' : q.type === 'hunt' ? `Progress: ${q.got} / ${q.n}` : 'In progress'}</div><div>Reward: <span class="cr">${fmtNum(q.reward)} cr</span> and ${fmtNum(q.xp)} XP</div>
      <div class="acts"><button class="btn warn" data-nav data-a="abandon">Abandon</button></div></div>`;
  }
  function optionsTab() {
    return `<div class="opt"><span>Music</span><input type="range" min="0" max="1" step="0.05" value="${OPTS.music}" data-opt="music"></div>
      <div class="opt"><span>Sound effects</span><input type="range" min="0" max="1" step="0.05" value="${OPTS.sfx}" data-opt="sfx"></div>
      <div class="opt"><span>Graphics</span><div class="acts" style="margin:0">${['Low', 'Medium', 'High'].map((n, i) => `<button class="btn sm ${OPTS.quality === i ? 'pri' : ''}" data-nav data-a="opt:quality:${i}">${n}</button>`).join('')}</div></div>
      <div class="opt"><span>Camera zoom</span><input type="range" min="0.7" max="1.35" step="0.05" value="${OPTS.zoom}" data-opt="zoom"></div>
      <div class="opt"><span>Screen shake</span><div><button class="btn sm ${OPTS.shake ? 'pri' : ''}" data-nav data-a="opt:shake">${OPTS.shake ? 'On' : 'Off'}</button></div></div>
      <div class="opt"><span>Damage numbers</span><div><button class="btn sm ${OPTS.numbers ? 'pri' : ''}" data-nav data-a="opt:numbers">${OPTS.numbers ? 'On' : 'Off'}</button></div></div>
      <div class="opt"><span>Show every item label</span><div><button class="btn sm ${OPTS.labels ? 'pri' : ''}" data-nav data-a="opt:labels">${OPTS.labels ? 'On' : 'Off (hold Alt)'}</button></div></div>
      <div class="hdr">Controls</div><div style="color:var(--dim);font-size:13px;line-height:1.6">
      <b>Keyboard &amp; mouse:</b> WASD move · mouse aims · left click attack (hold to keep swinging) · right click heavy · Q or middle click special · tap again as a swing ends for a perfect combo hit · Space roll · E use / pick up · 1–6 palette · H medgel · G psi cell · R overdrive · Tab map · Alt labels · I gear · K skills · T arts · J contract · Esc menu.<br>
      <b>Gamepad:</b> left stick move · right stick aim · X attack · Y heavy · B special · A use (or roll) · RB roll · LB overdrive · hold RT or LT with X/Y/B for palette slots 1–3 and 4–6 · D-pad up/down medgel/psi cell · Start menu · Back map.<br>
      <b>Touch:</b> left side to move · ATK, HVY, SPC, ROLL and USE buttons · tap palette slots and the overdrive gauge · ☰ menu.</div>`;
  }
  function systemTab(c) {
    return `<div class="acts"><button class="btn" data-nav data-a="saveNow">Save now</button><button class="btn warn" data-nav data-a="quit">Save and quit to title</button></div>
      <p style="color:var(--dim);font-size:13px">The game saves when you board the Meridian and when you quit. Progress on a floor isn't saved: if you quit down on Veyra, you'll wake up on the ship.</p>`;
  }
  function openOptions(fromTitle) {
    open('options', () => `<div class="panel narrow"><div class="ph"><h2>Options</h2><span class="sp"></span><button class="x" data-a="oback">×</button></div><div class="pc">${optionsTab()}</div></div>`, (v) => { if (v === 'oback') { if (fromTitle) showTitle(); else close(); } });
    if (fromTitle) cur.id = 'title-opts';
  }

  // ---------- ship services ----------
  function openNpc(id) {
    const c = GAME.char;
    if (id === 'commander') { commanderTalk(); return; }
    st.npcTab = null; st.sel = null; st.socketItem = null;
    const n = NPCS[id];
    const renders = { shop: shopPanel, artificer: artificerPanel, bank: bankPanel, bureau: bureauPanel, spritelab: (c) => pcWrap('', spriteTab(c)), lobby: lobbyPanel, medic: medicPanel };
    open('npc', () => `<div class="panel"><div class="ph"><h2>${n.role}</h2><span class="sub">${esc(n.name)} · <span class="cr">${fmtNum(c.credits)} cr</span></span><span class="sp"></span><button class="x" data-a="close">×</button></div>${renders[id](c)}</div>`, (verb, a) => npcAction(id, verb, a));
  }
  const pcWrap = (tabs, body) => `${tabs || ''}<div class="pc">${body}</div>`;
  const tabsHtml = (list, curT) => `<div class="tabs">${list.map(([k, n]) => `<button class="tab ${k === curT ? 'on' : ''}" data-nav data-a="ntab:${k}">${n}</button>`).join('')}</div>`;
  function commanderTalk() {
    const c = GAME.char, s = c.prog.story;
    const nextArea = AREA_ORDER[Math.min(3, s)];
    const lines = s === 0 ? STORY.commander : [STORY.after[AREA_ORDER[s - 1]]];
    if (s < 4) lines.push(`Your next objective: ${AREAS[nextArea].name}. ${AREAS[nextArea].blurb}`);
    else if (c.prog.maxDiff > GAME.diff || c.prog.maxDiff > 0) lines.push(`The Bureau has cleared you for ${DIFFS[c.prog.maxDiff].name} contracts. Choose the difficulty at the teleporter.`);
    dialog(NPCS.commander.name, lines);
  }
  function ensureShop() {
    const c = GAME.char;
    if (GAME.shopFor === GAME.hubVisit && GAME.shopStock) return;
    GAME.shopFor = GAME.hubVisit;
    const rng = RNG(c.name + GAME.hubVisit + c.level), lvl = Math.max(1, c.level);
    const stock = [];
    for (let k = 0; k < 9; k++) {
      const kind = rng.pick(['weapon', 'weapon', 'weapon', 'frame', 'barrier', 'unit']);
      const base = kind === 'weapon' ? rng.pick(ROLES[c.role].weapons.concat(WTYPE_ORDER)) : undefined;
      const it = makeEquip(kind, Math.max(1, lvl + rng.int(-2, 1)), rng() < 0.45 ? 1 : 0, rng, { base }); it.unid = false;
      stock.push(it);
    }
    const arts = TECH_ORDER.filter((t) => techLevelCap(c, t) > 0 && t !== 'recall' && t !== 'rekindle');
    for (let k = 0; k < 4; k++) { const t = rng.pick(arts); stock.push(makeDisc(t, clamp(Math.floor(lvl / 3) + rng.int(0, 1), 1, Math.min(12, techLevelCap(c, t))))); }
    stock.push(makeDisc('recall', 1));
    GAME.shopStock = stock;
  }
  function shopTools(c) { return ['medgel1', 'medgel2', 'medgel3', 'psicell1', 'psicell2', 'psicell3', 'purgeSpray', 'reviveShot', 'restorer', 'beacon', 'lifeCharm', 'hone1', 'hone2'].filter((id) => (TOOLS[id].lvl || 0) <= c.level); }
  function shopPanel(c) {
    ensureShop();
    const tab = st.npcTab || 'buy';
    let body = '';
    if (tab === 'buy') {
      body = `<div class="cols"><div><div class="hdr">Supplies</div><div class="list">${shopTools(c).map((id) => `<div class="row" style="cursor:default"><span class="ic">${toolIconSVG(id)}</span><span class="nm">${TOOLS[id].name} <span style="color:var(--faint)">(${invCount(c.inv, id)})</span></span><span class="r cr">${TOOLS[id].price}</span><button class="btn sm" data-nav data-a="buyt:${id}:1">Buy</button>${TOOLS[id].stack > 1 ? `<button class="btn sm" data-nav data-a="buyt:${id}:5">×5</button>` : ''}</div>`).join('')}</div></div>
        <div><div class="hdr">Equipment and art chips</div><div class="list">${GAME.shopStock.map((it, i) => `<div class="row" data-tip="shop:${i}" style="cursor:default"><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r cr">${fmtNum(buyPrice(it))}</span><button class="btn sm" data-nav data-a="buyi:${i}">Buy</button></div>`).join('') || '<div style="color:var(--faint)">Sold out</div>'}</div></div></div>`;
    } else {
      body = `<div class="acts"><button class="btn" data-nav data-a="sellStd">Sell all standard gear</button></div><div class="list" style="margin-top:8px">${c.inv.map((it, i) => it.kind === 'quest' ? '' : `<div class="row" data-tip="inv:${i}" style="cursor:default"><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r cr">${fmtNum(sellPrice(it))}</span><button class="btn sm" data-nav data-a="sell:${i}">Sell</button></div>`).join('') || '<div style="color:var(--faint)">Nothing to sell</div>'}</div>`;
    }
    return pcWrap(tabsHtml([['buy', 'Buy'], ['sell', 'Sell']], tab), body);
  }
  function artificerPanel(c) {
    const tab = st.npcTab || 'appraise';
    let body = '';
    const all = [...EQUIP_SLOTS.map((s) => c.equip[s]).filter(Boolean), ...c.inv];
    if (tab === 'appraise') {
      const un = c.inv.map((it, i) => [it, i]).filter(([it]) => it.unid);
      body = un.length ? `<div class="list">${un.map(([it, i]) => `<div class="row" style="cursor:default"><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r cr">${fmtNum(appraiseFee(it))}</span><button class="btn sm pri" data-nav data-a="appraise:${i}">Appraise</button></div>`).join('')}</div><div class="acts"><button class="btn" data-nav data-a="appraiseAll">Appraise all</button></div>` : '<div style="color:var(--dim)">Nothing to appraise. Exotic, ensemble, legendary and relic finds come to me sealed.</div>';
    } else if (tab === 'hone') {
      const ws = all.filter((it) => it.kind === 'weapon' && !it.unid && (it.grind || 0) < it.maxGrind);
      const kits = ['hone1', 'hone2', 'hone3'].filter((k) => invCount(c.inv, k) > 0);
      body = `<div style="color:var(--dim);font-size:13px;margin-bottom:8px">Each hone adds 3.5% damage, up to the weapon's limit. Hone kits: ${['hone1', 'hone2', 'hone3'].map((k) => `${TOOLS[k].name} ×${invCount(c.inv, k)}`).join(', ')}</div><div class="list">${ws.map((it) => `<div class="row" style="cursor:default;flex-wrap:wrap"><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r">${it.grind || 0}/${it.maxGrind}</span>${kits.map((k) => `<button class="btn sm" data-nav data-a="hone:${it.uid}:${k}">+${TOOLS[k].grind}</button>`).join('')}</div>`).join('') || '<div style="color:var(--faint)">No weapons that can be honed further.</div>'}</div>`;
    } else if (tab === 'socket') {
      const holders = all.filter((it) => isEquip(it) && !it.unid && it.sockets && (it.gems || []).length < it.sockets);
      const gems = c.inv.map((g, i) => [g, i]).filter(([g]) => g.kind === 'gem');
      const sel = holders.find((h) => h.uid === st.socketItem);
      body = `<div class="cols"><div><div class="hdr">Item with a free socket</div><div class="list">${holders.map((it) => `<div class="row ${sel === it ? 'sel' : ''}" data-nav data-a="sockSel:${it.uid}"><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r">${(it.gems || []).length}/${it.sockets}</span></div>`).join('') || '<div style="color:var(--faint)">None</div>'}</div></div>
        <div><div class="hdr">Crystal</div><div class="list">${gems.map(([g, i]) => `<div class="row" style="cursor:default"><span class="ic">${itemIconSVG(g)}</span><span class="nm" style="color:${itemColor(g)}">${esc(itemName(g))}</span>${sel ? `<button class="btn sm pri" data-nav data-a="sock:${i}">Set (${fmtNum(200 + sel.ilvl * 20)} cr)</button>` : ''}</div>`).join('') || '<div style="color:var(--faint)">No psi crystals</div>'}</div></div></div><p style="color:var(--dim);font-size:13px">Crystals can't be taken back out once set.</p>`;
    } else {
      const groups = {};
      for (const g of c.inv) if (g.kind === 'gem' && g.lv < 2) { const k = g.base + ':' + g.lv; groups[k] = (groups[k] || 0) + 1; }
      const ks = Object.entries(groups).filter(([, n]) => n >= 3);
      body = `<div style="color:var(--dim);font-size:13px;margin-bottom:8px">Fuse three crystals of the same kind into one of the next tier.</div><div class="list">${ks.map(([k, n]) => { const [id, lv] = k.split(':'); return `<div class="row" style="cursor:default"><span class="ic">${iconSVG('gem', hexCss(GEMS[id].color))}</span><span class="nm">3 × ${GEM_TIERS[+lv]} ${GEMS[id].name} → ${GEM_TIERS[+lv + 1]}</span><span class="r">(have ${n})</span><button class="btn sm pri" data-nav data-a="fuse:${id}:${lv}">Fuse (${(+lv + 1) * 500} cr)</button></div>`; }).join('') || '<div style="color:var(--faint)">You need three matching crystals.</div>'}</div>`;
    }
    return pcWrap(tabsHtml([['appraise', 'Appraise'], ['hone', 'Hone'], ['socket', 'Socket'], ['fuse', 'Fuse']], tab), body);
  }
  const appraiseFee = (it) => Math.max(20, Math.round(itemValue(it) / 10));
  function bankPanel(c) {
    const b = c.bank;
    return pcWrap('', `<div class="acts"><span>Credits on you: <span class="cr">${fmtNum(c.credits)}</span> · in the vault: <span class="cr">${fmtNum(b.credits)}</span></span></div>
      <div class="acts"><button class="btn sm" data-nav data-a="dep:1000">Deposit 1,000</button><button class="btn sm" data-nav data-a="dep:all">Deposit all</button><button class="btn sm" data-nav data-a="wd:1000">Withdraw 1,000</button><button class="btn sm" data-nav data-a="wd:all">Withdraw all</button></div>
      <div class="cols" style="margin-top:10px"><div><div class="hdr">Inventory ${c.inv.length}/${INV_MAX}</div><div class="list">${c.inv.map((it, i) => `<div class="row" data-nav data-a="store:${i}" data-tip="inv:${i}"><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span><span class="r">store →</span></div>`).join('')}</div></div>
      <div><div class="hdr">Vault ${b.items.length}/${BANK_MAX}</div><div class="list">${b.items.map((it, i) => `<div class="row" data-nav data-a="take:${i}" data-tip="bank:${i}"><span class="r">← take</span><span class="ic">${itemIconSVG(it)}</span><span class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</span></div>`).join('') || '<div style="color:var(--faint)">Empty</div>'}</div></div></div>`);
  }
  function bureauPanel(c) {
    ensureQuestOffers();
    const q = c.quest.active;
    let h = '';
    if (q) h += `<div class="hdr">Your contract</div><div class="detail"><div class="tt-name" style="color:var(--gold)">${esc(q.title)}</div><div class="tt-sub">${AREAS[q.area].name} ${q.floor + 1} · ${DIFFS[q.diff].name}</div><p>${esc(q.desc)}</p><div>${q.done ? '<b style="color:var(--green)">Complete!</b>' : q.type === 'hunt' ? `${q.got} / ${q.n}` : 'In progress'}</div><div class="acts">${q.done ? `<button class="btn pri" data-nav data-a="turnin">Claim ${fmtNum(q.reward)} cr and ${fmtNum(q.xp)} XP</button>` : '<button class="btn warn" data-nav data-a="qabandon">Abandon</button>'}</div></div>`;
    h += `<div class="hdr">Open contracts</div><div class="list">${c.quest.offers.map((o, i) => `<div class="detail" style="margin-top:0"><div class="tt-name" style="color:var(--gold)">${esc(o.title)}</div><div class="tt-sub">${AREAS[o.area].name} ${o.floor + 1} · ${DIFFS[o.diff].name} · from ${esc(o.giver)}</div><div style="font-size:14px">${esc(o.desc)}</div><div class="acts"><span>Reward <span class="cr">${fmtNum(o.reward)} cr</span> · ${fmtNum(o.xp)} XP</span>${q ? '' : `<button class="btn sm pri" data-nav data-a="accept:${i}">Accept</button>`}</div></div>`).join('')}</div>`;
    h += `<p style="color:var(--dim);font-size:13px">One contract at a time. Contracts are offered for your selected difficulty (${DIFFS[c.prog.diff].name}); change it at the teleporter.</p>`;
    return pcWrap('', h);
  }
  function ensureCandidates() {
    if (GAME.candFor === GAME.hubVisit && GAME.candidates) return;
    GAME.candFor = GAME.hubVisit;
    const rng = RNG(GAME.char.name + ':crew:' + GAME.hubVisit);
    GAME.candidates = [0, 1, 2, 3].map(() => genAllyCandidate(GAME.char.level, rng));
  }
  function lobbyPanel(c) {
    ensureCandidates();
    const card = (a, act) => `<div class="detail" style="margin-top:0"><div class="tt-name" style="color:${hexCss(ROLES[a.role].color)}">${esc(a.name)}</div><div class="tt-sub">${CLASS_NAME(a.role, a.race)} · ${WTYPES[a.weapon].name} · ${a.personality}</div><div class="acts">${act}</div></div>`;
    return pcWrap('', `<div class="hdr">Your party (${c.allies.length}/3)</div><div class="cards3">${c.allies.map((a, i) => card(a, `<button class="btn sm warn" data-nav data-a="dismiss:${i}">Dismiss</button>`)).join('') || '<div style="color:var(--dim)">You\'re going down alone. Wardens in your party fight, heal and revive you, and level with you.</div>'}</div>
      <div class="hdr">Available wardens</div><div class="cards3">${GAME.candidates.map((a, i) => card(a, c.allies.length < 3 ? `<button class="btn sm pri" data-nav data-a="hire:${i}">Recruit</button>` : '<span style="color:var(--faint)">Party full</span>')).join('')}</div>
      <p style="color:var(--dim);font-size:13px">Monsters get tougher with each warden in your party. New faces arrive every time you return to the ship.</p>`);
  }
  function medicPanel(c) {
    const cost = c.level * 100;
    return pcWrap('', `<p>Ines patches you up for free. For a fee, she can also reset your skill training so you can spend your points again.</p>
      <div class="acts"><button class="btn pri" data-nav data-a="healall">Heal the party</button><button class="btn warn" data-nav data-a="respec" ${c.credits < cost ? 'disabled' : ''}>Reset skills (${fmtNum(cost)} cr)</button></div>`);
  }
  function npcAction(id, verb, a) {
    const c = GAME.char;
    const pay = (n) => { if (c.credits < n) { HUD.toast('Not enough credits.', '#ff9090'); AUDIO.sfx('error'); return false; } c.credits -= n; return true; };
    const findAny = (uid) => [...EQUIP_SLOTS.map((s) => c.equip[s]).filter(Boolean), ...c.inv].find((it) => String(it.uid) === String(uid));
    switch (verb) {
      case 'buyt': { const n = +a[1], id2 = a[0], cost = TOOLS[id2].price * n; if (c.credits < cost) { HUD.toast('Not enough credits.', '#ff9090'); AUDIO.sfx('error'); break; } const it = makeTool(id2, n); if (!invAdd(c.inv, it)) { HUD.toast('Your inventory is full.', '#ff9090'); break; } c.credits -= cost; AUDIO.sfx('buy'); break; }
      case 'buyi': { const it = GAME.shopStock[+a[0]]; if (!it) break; if (c.inv.length >= INV_MAX) { HUD.toast('Your inventory is full.', '#ff9090'); break; } if (!pay(buyPrice(it))) break; c.inv.push(it); GAME.shopStock.splice(+a[0], 1); AUDIO.sfx('buy'); $('#gtip').hidden = true; break; }
      case 'sell': { const it = c.inv[+a[0]]; if (!it) break; c.credits += sellPrice(it); invRemove(c.inv, it); AUDIO.sfx('buy'); $('#gtip').hidden = true; break; }
      case 'sellStd': { let n = 0; for (const it of [...c.inv]) if (isEquip(it) && it.rar === 0) { c.credits += sellPrice(it); invRemove(c.inv, it); n++; } HUD.toast(n ? `Sold ${n} items.` : 'Nothing to sell.', '#ffd860'); if (n) AUDIO.sfx('buy'); break; }
      case 'appraise': { const it = c.inv[+a[0]]; if (it && pay(appraiseFee(it))) appraise(it); break; }
      case 'appraiseAll': for (const it of c.inv.filter((q) => q.unid)) { if (c.credits < appraiseFee(it)) { HUD.toast('Not enough credits for the rest.', '#ff9090'); break; } c.credits -= appraiseFee(it); appraise(it); } break;
      case 'hone': { const it = findAny(a[0]), k = a[1]; if (!it || !invTake(c.inv, k, 1)) break; it.grind = Math.min(it.maxGrind, (it.grind || 0) + TOOLS[k].grind); AUDIO.sfx('uiok'); FX && HUD.toast(`${itemName(it)}`, itemColor(it)); if (PL) refreshPartyActor(PL, false); break; }
      case 'sockSel': st.socketItem = +a[0] || a[0]; AUDIO.sfx('ui'); break;
      case 'sock': { const it = findAny(st.socketItem), g = c.inv[+a[0]]; if (!it || !g || g.kind !== 'gem') break; if (!pay(200 + it.ilvl * 20)) break; it.gems = it.gems || []; it.gems.push({ id: g.base, tier: g.lv }); invRemove(c.inv, g); AUDIO.sfx('uiok'); if (PL) refreshPartyActor(PL, false); break; }
      case 'fuse': { const gid = a[0], lv = +a[1]; if (!pay((lv + 1) * 500)) break; let n = 0; for (let i = c.inv.length - 1; i >= 0 && n < 3; i--) { const g = c.inv[i]; if (g.kind === 'gem' && g.base === gid && g.lv === lv) { c.inv.splice(i, 1); n++; } } c.inv.push(makeGem(gid, lv + 1)); AUDIO.sfx('rare'); break; }
      case 'dep': { const n = a[0] === 'all' ? c.credits : Math.min(c.credits, +a[0]); c.credits -= n; c.bank.credits += n; AUDIO.sfx('buy'); break; }
      case 'wd': { const n = a[0] === 'all' ? c.bank.credits : Math.min(c.bank.credits, +a[0]); c.bank.credits -= n; c.credits += n; AUDIO.sfx('buy'); break; }
      case 'store': { const it = c.inv[+a[0]]; if (!it) break; if (!invAdd(c.bank.items, it, BANK_MAX)) { HUD.toast('The vault is full.', '#ff9090'); break; } invRemove(c.inv, it); AUDIO.sfx('ui'); $('#gtip').hidden = true; break; }
      case 'take': { const it = c.bank.items[+a[0]]; if (!it) break; if (!invAdd(c.inv, it)) { HUD.toast('Your inventory is full.', '#ff9090'); break; } invRemove(c.bank.items, it); AUDIO.sfx('ui'); $('#gtip').hidden = true; break; }
      case 'accept': { if (c.quest.active) break; c.quest.active = c.quest.offers.splice(+a[0], 1)[0]; ensureQuestOffers(); AUDIO.sfx('uiok'); HUD.toast('Contract accepted: ' + c.quest.active.title, '#ffd080'); break; }
      case 'qabandon': c.quest.active = null; AUDIO.sfx('uiback'); break;
      case 'turnin': {
        const q = c.quest.active; if (!q || !q.done) break;
        c.credits += q.reward; const ups = gainXP(c, q.xp); c.quest.done++; c.quest.active = null;
        AUDIO.sfx('levelup'); HUD.toast(`+${fmtNum(q.reward)} credits, +${fmtNum(q.xp)} XP`, '#ffd860');
        if (rnd() < 0.5) { const it = rollDrop({ ilvl: q.lvl + 2, mf: 1, sid: STAR_SIGNS.find((s) => s.id === c.sid), role: c.role, diff: q.diff, source: 'unique' }); if (it && invAdd(c.inv, it)) HUD.toast(`Bonus: ${itemName(it)}`, itemColor(it)); }
        if (ups) onLevelUp(ups);
        ensureQuestOffers(); break;
      }
      case 'hire': { const rec = GAME.candidates[+a[0]]; if (!rec || c.allies.length >= 3) break; c.allies.push(rec); GAME.candidates.splice(+a[0], 1); rebuildAllies(); AUDIO.sfx('uiok'); HUD.toast(`${rec.name} joined your party.`, '#a0ffb0'); break; }
      case 'dismiss': { const rec = c.allies.splice(+a[0], 1)[0]; rebuildAllies(); AUDIO.sfx('uiback'); if (rec) HUD.toast(`${rec.name} left the party.`, '#c0c0c0'); break; }
      case 'healall': for (const p of [PL, ...ALLIES]) if (p) { if (p.downed) reviveActor(p, 1); p.hp = p.maxHp; p.tp = p.maxTp; p.status = {}; } AUDIO.sfx('heal'); break;
      case 'respec': { const cost = c.level * 100; if (!pay(cost)) break; let pts = 0; for (const [k, v] of Object.entries(c.skills)) pts += v; c.skills = {}; c.skillPts += pts; c.hotbar = c.hotbar.map((h) => (h && h.t === 'skill' && SKILLS[h.id].role !== 'race' ? null : h)); AUDIO.sfx('uiok'); if (PL) refreshPartyActor(PL, false); break; }
      case 'pbsel': c.sprite.pbSel = +a[0]; AUDIO.sfx('uiok'); break;
      case 'feedid': HUD.toast(feedSprite(c, a[0]), '#d0b0ff'); break;
    }
    redraw();
  }
  function appraise(it) {
    it.unid = false; AUDIO.sfx(it.rar === 5 ? 'rare' : 'uiok');
    HUD.toast(`${it.rar === 5 ? 'A relic: ' : ''}${itemName(it)}`, itemColor(it));
  }
  function rebuildAllies() {
    for (const a of ALLIES) removeActor(a);
    spawnAllies(PL.x, PL.z);
  }

  // ---------- teleporter ----------
  function openTeleporter() {
    const c = GAME.char;
    st.teleDiff = Math.min(c.prog.diff, c.prog.maxDiff);
    const areas = unlockedAreas(c, st.teleDiff); if (!areas.includes(st.teleArea)) st.teleArea = areas[areas.length - 1];
    open('tele', () => {
      const ua = unlockedAreas(c, st.teleDiff), way = c.prog.way[st.teleDiff][st.teleArea] || 0, q = c.quest.active;
      return `<div class="panel narrow"><div class="ph"><h2>Teleporter</h2><span class="sub">Descend to Veyra</span><span class="sp"></span><button class="x" data-a="close">×</button></div><div class="pc">
        <div class="hdr">Difficulty</div><div class="acts" style="margin-top:0">${DIFFS.map((d, i) => `<button class="btn sm ${i === st.teleDiff ? 'pri' : ''}" data-nav data-a="tdiff:${i}" ${i > c.prog.maxDiff ? 'disabled' : ''} style="color:${d.color}">${d.name}${i > c.prog.maxDiff ? ' 🔒' : ''}</button>`).join('')}</div>
        <div style="color:var(--dim);font-size:13px">Monsters from level ${AREAS.forest.lvl + DIFFS[st.teleDiff].lvl}. Beat Kharzael to unlock the next difficulty.</div>
        <div class="hdr">Area</div><div class="list">${AREA_ORDER.map((id) => { const A = AREAS[id], ok = ua.includes(id), done = c.prog.bosses[st.teleDiff][id]; return `<div class="row ${st.teleArea === id ? 'sel' : ''}" ${ok ? `data-nav data-a="tarea:${id}"` : ''} style="${ok ? '' : 'opacity:.4;cursor:default'}"><span class="nm">${A.name} <span style="color:var(--dim);font-weight:500">· ${A.sub}</span></span><span class="r">Lv ${A.lvl + DIFFS[st.teleDiff].lvl}+ ${done ? '✓' : ok ? '' : '🔒'}</span></div>`; }).join('')}</div>
        <div style="color:var(--dim);font-size:13px;margin-top:6px">${AREAS[st.teleArea].blurb}</div>
        ${q && !q.done && q.diff === st.teleDiff ? `<div style="color:var(--gold);font-size:13px;margin-top:6px">Contract: ${esc(q.title)} (${AREAS[q.area].name} ${q.floor + 1})</div>` : ''}
        <div class="hdr">Start at</div><div class="acts" style="margin-top:0">${[0, 1, 2].map((f) => `<button class="btn ${f === 0 ? 'pri' : ''}" data-nav data-a="go:${f}" ${f > way ? 'disabled' : ''}>${f === 2 ? 'The Depths (boss)' : 'Floor ' + (f + 1)}</button>`).join('')}</div>
        <div style="color:var(--dim);font-size:13px">Floors you've reached become waypoints.${ALLIES.length ? ` Party: ${ALLIES.map((a) => a.name).join(', ')}.` : ' You have no party: recruit wardens at the Crew Terminal.'}</div>
      </div></div>`;
    }, (verb, a) => {
      if (verb === 'tdiff') { st.teleDiff = +a[0]; c.prog.diff = st.teleDiff; const ua = unlockedAreas(c, st.teleDiff); if (!ua.includes(st.teleArea)) st.teleArea = ua[ua.length - 1]; c.quest.offers = []; ensureQuestOffers(); AUDIO.sfx('ui'); redraw(); }
      if (verb === 'tarea') { st.teleArea = a[0]; AUDIO.sfx('ui'); redraw(); }
      if (verb === 'go') { close(true); c.prog.diff = st.teleDiff; SAVE.save(); descend(st.teleArea, +a[0], st.teleDiff); }
    });
  }

  // ---------- dialog ----------
  const dlgQueue = [];
  function dialog(who, lines, cb) {
    if (dlg) { dlgQueue.push([who, lines, cb]); return; }
    dlg = { who, lines: lines.slice(), i: 0, cb };
    const el = document.createElement('div'); el.className = 'dlg'; el.id = 'dlg';
    el.addEventListener('click', advance);
    root().appendChild(el); dlg.el = el;
    drawDialog();
  }
  function drawDialog() { if (!dlg) return; dlg.el.innerHTML = `<div class="who">${esc(dlg.who)}</div><div class="txt">${esc(dlg.lines[dlg.i])}</div><div class="more">${dlg.i < dlg.lines.length - 1 ? 'Continue ▸' : 'Close ▸'}</div>`; }
  function advance() {
    if (!dlg) return;
    AUDIO.sfx('ui');
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { const cb = dlg.cb; dlg.el.remove(); dlg = null; cb && cb(); if (!dlg && dlgQueue.length) dialog(...dlgQueue.shift()); return; }
    drawDialog();
  }
  // ---------- loading, downed, ending ----------
  function loading(title, tip) {
    loadingOn = !!title; $('#loading').hidden = !title;
    if (title) { $('#loadT').textContent = title; $('#loadTip').textContent = tip || ''; }
  }
  function downed(on) {
    if (downEl) { downEl.remove(); downEl = null; }
    if (!on) return;
    downEl = document.createElement('div'); downEl.className = 'down';
    const draw = () => { const n = invCount(GAME.char.inv, 'reviveShot'), anyAlly = ALLIES.some((a) => !a.downed);
      downEl.innerHTML = `<h2>You are down</h2><p style="color:var(--dim);margin:0 0 10px">${anyAlly ? 'Your party can revive you.' : 'No one is left standing to help.'}</p><div class="acts" style="justify-content:center"><button class="btn pri" data-a="selfrev" ${n ? '' : 'disabled'}>Use Revive Shot (${n})</button><button class="btn warn" data-a="giveup">Return to the ship (lose 10% credits)</button></div>`; };
    draw();
    downEl.addEventListener('click', (e) => { const t = e.target.closest('[data-a]'); if (!t || t.disabled) return; if (t.dataset.a === 'selfrev') selfRevive(PL); else returnToShipDefeated(); });
    root().appendChild(downEl);
  }
  function ending() {
    const el = document.createElement('div'); el.className = 'ending';
    el.innerHTML = `<div><h1>The Sleeper falls</h1><p>${esc(STORY.after.ruins)}</p><p>Thank you for playing Veyra Below. The Bureau has opened ${DIFFS[Math.min(3, GAME.char.prog.maxDiff)].name} contracts: the monsters are stronger, and so is the loot.</p><button class="btn pri" data-nav id="endOk">Continue</button></div>`;
    root().appendChild(el);
    cur = { id: 'ending', el, render: () => el.innerHTML, on: () => {} };
    el.querySelector('#endOk').addEventListener('click', () => { el.remove(); cur = null; });
  }
  // ---------- gamepad focus ----------
  function navTargets() {
    const scope = dlg ? dlg.el : cur ? cur.el : downEl;
    if (!scope) return [];
    return $$('[data-nav], .row[data-a], .btn, .tab, .card', scope).filter((e) => e.offsetParent !== null && !e.disabled);
  }
  function applyFocus(el) { for (const e of $$('.focus', root())) e.classList.remove('focus'); focus = el; if (el) { el.classList.add('focus'); el.scrollIntoView({ block: 'nearest' }); if (el.dataset.tip) showTipFor(el); } }
  function update() {
    if (Input.mode !== 'pad') { if (focus) applyFocus(null); return; }
    const n = Input.navPad();
    if (dlg) { if (n.ok || n.back) advance(); return; }
    const list = navTargets(); if (!list.length) return;
    if (!focus || !list.includes(focus)) applyFocus(list[0]);
    for (const dir of ['up', 'down', 'left', 'right']) {
      if (!n[dir]) continue;
      const r = focus.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let best = null, bs = Infinity;
      for (const e of list) {
        if (e === focus) continue;
        const q = e.getBoundingClientRect(), ex = q.left + q.width / 2, ey = q.top + q.height / 2, dx = ex - cx, dy = ey - cy;
        const ok = dir === 'up' ? dy < -4 : dir === 'down' ? dy > 4 : dir === 'left' ? dx < -4 : dx > 4;
        if (!ok) continue;
        const main = dir === 'up' || dir === 'down' ? Math.abs(dy) : Math.abs(dx), side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
        const s = main + side * 2.5; if (s < bs) { bs = s; best = e; }
      }
      if (best) { applyFocus(best); AUDIO.sfx('ui'); }
    }
    if (n.ok && focus) focus.click();
    if (n.back || (n.menu && cur && cur.id === 'menu')) back();
    if ((n.prevTab || n.nextTab) && cur) {
      const tabs = $$('.tab', cur.el); const i = tabs.findIndex((t) => t.classList.contains('on'));
      const t = tabs[(i + (n.nextTab ? 1 : -1) + tabs.length) % tabs.length]; if (t) { t.click(); focus = null; }
    }
  }
  return { init, isOpen, blocking, showTitle, openMenu, openNpc, openTeleporter, dialog, loading, downed, ending, update, close, redraw, get cur() { return cur; }, get dlg() { return dlg; }, st };
})();
