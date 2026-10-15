// Farhold — menus: inventory, technology, crafting, quick menu, build menu, refiner, storage, trade, merchants,
// ship broker, teleporter, galaxy map, discovery log, pause/settings, dialogs; gamepad navigation.

const UI = {
  cur: null, opts: {}, tab: null, sel: null, el: null, focusI: 0, mapView: null,
  blocking() { return !!this.cur || G.state !== 'play'; },
  open(name, opts = {}) {
    if (G.state !== 'play') return;
    this.cur = name; this.opts = opts; this.sel = null;
    if (name === 'inventory' && !this.tab) this.tab = 'suit';
    this.el = document.getElementById('ui');
    this.el.hidden = false;
    document.body.classList.add('menu');
    Input.unlock();
    AU.sfx('click');
    this.render();
    if (name === 'map') this.mapInit();
  },
  close() {
    if (!this.cur) return;
    const was = this.cur;
    this.cur = null; this.el.hidden = true; document.body.classList.remove('menu');
    if (was === 'map') this.mapView = null;
    if (G.state === 'play') Input.lock();
    AU.sfx('click');
  },
  toggle(name, opts) { if (this.cur === name) this.close(); else { if (this.cur) this.close(); this.open(name, opts); } },
  dialog(title, text, gift) { this.open('dialog', { title, text, gift }); },
  render() {
    const fn = this['r_' + this.cur];
    if (!fn) return;
    const html = fn.call(this);
    this.el.innerHTML = '<div class="panel p-' + this.cur + '">' + html + '</div>';
    this.bind();
    this.focusables();
  },
  bind() {
    this.el.onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      e.stopPropagation();
      this.act(b.dataset.act, b.dataset, b);
    };
    this.el.onmouseover = (e) => { const s = e.target.closest('.slot[data-act]'); if (s && this.cur !== 'map') { /* hover shows details */ } };
    const inp = this.el.querySelector('input[type=text]');
    if (inp) { inp.onfocus = () => Input.setTyping(true); inp.onblur = () => Input.setTyping(false); }
    for (const r of this.el.querySelectorAll('input[type=range], select, input[type=checkbox]')) r.oninput = r.onchange = () => this.act('setting', r.dataset, r);
  },
  act(a, d, el) {
    AU.sfx('click', 0.6);
    const P = PLAYER;
    switch (a) {
      case 'close': this.close(); return;
      case 'tab': this.tab = d.tab; this.sel = null; break;
      case 'slot': this.sel = { inv: d.inv, i: +d.i }; break;
      case 'xfer': { const from = this.invOf(d.inv), to = this.invOf(d.to); const s = from.slots[+d.i]; if (!s) break; const left = to.add(s.id, s.n); const moved = s.n - left; s.n = left; if (!s.n) from.slots[+d.i] = null; if (moved) HUD.msg('Moved ' + moved + ' ' + ITEMS[s.id].name + '.'); else HUD.msg('No room.', 'bad'); break; }
      case 'discard': { const inv = this.invOf(d.inv); inv.slots[+d.i] = null; this.sel = null; break; }
      case 'use': this.useItem(d.id); break;
      case 'sort': this.invOf(d.inv).sort(); this.sel = null; break;
      case 'craft': craft(d.id, +(d.n || 1)); break;
      case 'repair': repairTech(d.id); break;
      case 'buildtech': buildTech(d.id); break;
      case 'recharge': recharge(d.k); break;
      case 'summon': summonShip(); this.close(); return;
      case 'part': this.close(); startPlacing(d.id); return;
      case 'refadd': { const rf = this.opts.refiner, id = d.id; const have = INV.count(id); const n = d.n === 'all' ? have : Math.min(have, +d.n); if (!n) break; if (rf.input && rf.input.id !== id) { HUD.msg('Take out the current input first.', 'bad'); break; } INV.take(id, n); rf.input = rf.input || { id, n: 0 }; rf.input.n += n; break; }
      case 'refout': { const rf = this.opts.refiner; if (rf.output) { const left = giveItem(rf.output.id, rf.output.n); rf.output.n = left; if (!left) rf.output = null; } break; }
      case 'refback': { const rf = this.opts.refiner; if (rf.input) { const left = giveItem(rf.input.id, rf.input.n); rf.input.n = left; if (!left) rf.input = null; } break; }
      case 'store': { const inv = this.opts.inv; const s = P.suit.slots[+d.i]; if (!s) break; const left = inv.add(s.id, s.n); s.n = left; if (!left) P.suit.slots[+d.i] = null; break; }
      case 'unstore': { const inv = this.opts.inv; const s = inv.slots[+d.i]; if (!s) break; const left = giveItem(s.id, s.n, true); s.n = left; if (!left) inv.slots[+d.i] = null; break; }
      case 'sell': { const id = d.id, have = INV.count(id); const n = d.n === 'all' ? have : Math.min(have, +d.n); if (!n) break; INV.take(id, n); const u = priceOf(id, true) * n; P.units += u; AU.sfx('pickup'); HUD.msg('Sold ' + n + ' ' + ITEMS[id].name + ' for ' + fmtNum(u) + ' units.', 'good'); bus.emit('sold', id, n); break; }
      case 'buy': { const id = d.id, n = +d.n, cost = priceOf(id, false) * n; if (P.units < cost) { HUD.msg('Not enough units.', 'bad'); AU.sfx('deny'); break; } if (INV.space(id) < n) { HUD.msg('No room.', 'bad'); break; } P.units -= cost; giveItem(id, n, true); AU.sfx('pickup'); bus.emit('bought', id, n); break; }
      case 'buybp': { const t = TECH[d.id]; if (P.nanites < t.nan) { HUD.msg('Not enough nanites.', 'bad'); AU.sfx('deny'); break; } P.nanites -= t.nan; P.known.add(d.id); AU.sfx('unlock'); HUD.msg('Blueprint learned: ' + t.name + '. Build it from the Technology tab.', 'good'); break; }
      case 'data': { const n = INV.count('datapad'); if (!n) break; INV.take('datapad', n); giveItem('nanites', n * 60); break; }
      case 'slotbuy': { const which = d.k, price = slotPrice(which); if (P.units < price) { HUD.msg('Not enough units.', 'bad'); AU.sfx('deny'); break; } P.units -= price; if (which === 'suit') P.suit.grow(1); else SHIP.cur.cargo.grow(1); AU.sfx('unlock'); break; }
      case 'buyship': this.buyShip(+d.i); break;
      case 'claim': claimWreck(this.opts.live); this.close(); return;
      case 'salvage': salvageWreck(this.opts.live); this.close(); return;
      case 'tp': teleportTo(teleportDestinations()[+d.i]); return;
      case 'upload': { const n = uploadPlanet(d.id); HUD.msg(n ? 'Uploaded discoveries: +' + n + ' nanites.' : 'Nothing new to upload.', n ? 'good' : ''); break; }
      case 'uploadall': { let n = 0; for (const id in DISC.planets) n += uploadPlanet(id); HUD.msg(n ? 'Uploaded discoveries: +' + n + ' nanites.' : 'Nothing new to upload.', n ? 'good' : ''); break; }
      case 'rename': { const inp = this.el.querySelector('#renameIn'); const v = inp && inp.value.trim().slice(0, 28); if (v) { const e = DISC.planets[d.pl]; if (d.sp) e.sp[d.sp].name = v; else e.name = v; } Input.setTyping(false); break; }
      case 'renamebase': { const inp = this.el.querySelector('#renameIn'); const b = BASES.list.find((x) => x.id === d.id); if (inp && b && inp.value.trim()) b.name = inp.value.trim().slice(0, 28); Input.setTyping(false); break; }
      case 'logsel': this.sel = d.pl; break;
      case 'mapsel': GALAXY.target = GALAXY.stars[+d.i]; break;
      case 'route': { const t = bestHopToward(GALAXY.core); if (t) { GALAXY.target = t; this.mapCenterOn(t); } else HUD.msg('No star in range brings you closer.', 'bad'); break; }
      case 'mapme': this.mapCenterOn(SYS.star); break;
      case 'resume': this.close(); return;
      case 'save': SAVE.save('manual'); HUD.msg('Game saved.', 'good'); break;
      case 'export': SAVE.exportFile(); break;
      case 'import': SAVE.importFile(); return;
      case 'quit': SAVE.save('quit'); location.reload(); return;
      case 'settings': this.tab = 'settings'; break;
      case 'controls': this.tab = 'controls'; break;
      case 'back': this.tab = null; break;
      case 'setting': this.setting(d.k, el); return;
      case 'newgalaxy': newGalaxy(); this.close(); return;
      case 'continue': this.close(); return;
    }
    this.render();
  },
  invOf(k) { return k === 'ship' ? SHIP.cur.cargo : k === 'store' ? this.opts.inv : PLAYER.suit; },
  useItem(id) {
    const map = { lifegel: 'life', oxygen: 'life', ioncell: 'haz', sodium: 'haz', sodnit: 'haz', shieldcell: 'shield', jelly: 'lift', liftfuel: 'lift', dihydro: 'lift', tritium: 'pulse' };
    if (map[id]) recharge(map[id], id);
  },
  setting(k, el) {
    if (k === 'sens') SETTINGS.sens = +el.value;
    if (k === 'fov') { SETTINGS.fov = +el.value; R.camera.fov = SETTINGS.fov; R.camera.updateProjectionMatrix(); }
    if (k === 'vol') { SETTINGS.vol = +el.value; AU.setVol(); }
    if (k === 'music') { SETTINGS.music = +el.value; AU.setVol(); }
    if (k === 'invertY') SETTINGS.invertY = el.checked;
    if (k === 'autoQ') SETTINGS.autoQ = el.checked;
    if (k === 'fpv') SETTINGS.fpv = el.checked;
    if (k === 'quality') { SETTINGS.quality = +el.value; applyQuality(); HUD.msg('Terrain detail changes apply on the next planet you visit.'); }
    saveSettings();
    const out = el.parentElement.querySelector('output'); if (out) out.textContent = el.value;
  },
  // ---------- screens ----------
  head(title, sub) { return '<div class="ph"><div><h2>' + title + '</h2>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div><button class="btn x" data-act="close">✕</button></div>'; },
  grid(inv, key, actions) {
    let h = '<div class="grid">';
    inv.slots.forEach((s, i) => {
      const sel = this.sel && this.sel.inv === key && this.sel.i === i;
      h += '<div class="slot ' + (s ? '' : 'empty ') + (sel ? 'sel' : '') + '" data-act="' + (actions || 'slot') + '" data-inv="' + key + '" data-i="' + i + '">' + (s ? iconImg(s.id) + '<b>' + fmtNum(s.n) + '</b>' : '') + '</div>';
    });
    return h + '</div>';
  },
  detail(key) {
    if (!this.sel || this.sel.inv !== key) return '<div class="detail dim">Select an item.</div>';
    const inv = this.invOf(key), s = inv.slots[this.sel.i];
    if (!s) return '<div class="detail dim">Empty slot.</div>';
    const it = ITEMS[s.id];
    let h = '<div class="detail"><div class="dh">' + iconImg(s.id, 'big') + '<div><div class="dn">' + it.name + '</div><div class="dim">' + fmtNum(s.n) + ' · ' + fmtNum(it.val) + ' u each</div></div></div><p>' + it.desc + '</p><div class="row">';
    const other = key === 'suit' ? 'ship' : 'suit';
    if (shipInReach() && SHIP.cur) h += '<button class="btn" data-act="xfer" data-inv="' + key + '" data-to="' + other + '" data-i="' + this.sel.i + '">Move to ' + (other === 'ship' ? 'starship' : 'exosuit') + '</button>';
    if (['lifegel', 'oxygen', 'ioncell', 'sodium', 'sodnit', 'shieldcell', 'jelly', 'liftfuel', 'dihydro', 'tritium'].includes(s.id)) h += '<button class="btn" data-act="use" data-id="' + s.id + '">Use</button>';
    h += '<button class="btn danger" data-act="discard" data-inv="' + key + '" data-i="' + this.sel.i + '">Discard</button></div></div>';
    return h;
  },
  r_inventory() {
    const tabs = [['suit', 'Exosuit'], ['ship', 'Starship'], ['tech', 'Technology'], ['craft', 'Crafting']];
    let h = this.head('Inventory', iconImg('units', 'ic') + fmtNum(PLAYER.units) + ' units &nbsp; ' + iconImg('nanites', 'ic') + fmtNum(PLAYER.nanites) + ' nanites');
    h += '<div class="tabs">' + tabs.map(([k, n]) => '<button class="btn tab ' + (this.tab === k ? 'on' : '') + '" data-act="tab" data-tab="' + k + '">' + n + '</button>').join('') + '</div>';
    if (this.tab === 'suit') h += '<div class="cols"><div><div class="sh">Exosuit · ' + PLAYER.suit.slots.filter(Boolean).length + '/' + PLAYER.suit.size + ' <button class="btn sm" data-act="sort" data-inv="suit">Sort</button></div>' + this.grid(PLAYER.suit, 'suit') + '</div>' + this.detail('suit') + '</div>';
    else if (this.tab === 'ship') {
      if (!SHIP.cur) h += '<p class="dim">No starship.</p>';
      else h += '<div class="cols"><div><div class="sh">' + esc(SHIP.cur.name) + ' · ' + SHIP_TYPES[SHIP.cur.type].name + ' · ' + SHIP.cur.cargo.slots.filter(Boolean).length + '/' + SHIP.cur.cargo.size + (shipInReach() ? '' : ' <span class="bad">(out of range)</span>') + ' <button class="btn sm" data-act="sort" data-inv="ship">Sort</button></div>' + (shipInReach() ? this.grid(SHIP.cur.cargo, 'ship') : '<p class="dim">Get within 200 m of your ship to reach its cargo.</p>') + '</div>' + (shipInReach() ? this.detail('ship') : '') + '</div>';
    } else if (this.tab === 'tech') h += this.techList();
    else h += this.craftList();
    return h;
  },
  costHtml(cost) { return Object.entries(cost).map(([k, v]) => { const ok = INV.has(k, v); return '<span class="cost ' + (ok ? '' : 'no') + '">' + iconImg(k, 'ic') + v + ' ' + ITEMS[k].name + ' <i>(' + INV.count(k) + ')</i></span>'; }).join(' '); },
  techList() {
    let h = '';
    for (const [slot, title] of [['suit', 'Exosuit'], ['tool', 'Multitool'], ['ship', 'Starship']]) {
      h += '<div class="sh">' + title + '</div><div class="techs">';
      for (const id in TECH) {
        const t = TECH[id]; if (t.slot !== slot) continue;
        const st = PLAYER.tech[id];
        if (st && st.built) {
          h += '<div class="tech ' + (st.broken ? 'broken' : '') + '">' + iconImg('tech_' + id, 'ic2') + '<div class="ti"><b>' + t.name + '</b>' + (st.broken ? ' <span class="bad">DAMAGED</span>' : ' <span class="good">✓</span>') + '<div class="dim">' + t.desc + '</div>';
          if (st.broken) h += '<div>' + this.costHtml(t.repair) + '</div><button class="btn" data-act="repair" data-id="' + id + '">Repair</button>';
          h += '</div></div>';
        } else if (PLAYER.known.has(id)) {
          const blocked = t.req && !hasTech(t.req);
          h += '<div class="tech bp">' + iconImg('tech_' + id, 'ic2') + '<div class="ti"><b>' + t.name + '</b> <span class="dim">blueprint</span><div class="dim">' + t.desc + '</div><div>' + this.costHtml(t.cost) + '</div>' + (blocked ? '<div class="bad">Requires ' + TECH[t.req].name + '</div>' : '<button class="btn" data-act="buildtech" data-id="' + id + '">Build</button>') + '</div></div>';
        }
      }
      h += '</div>';
    }
    h += '<p class="dim">More blueprints: technology merchants on space stations, shelters on planets.</p>';
    return h;
  },
  craftList() {
    let h = '<div class="crafts">';
    for (const r of RECIPES) {
      const ok = canCraft(r);
      h += '<div class="craft ' + (ok ? '' : 'no') + '">' + iconImg(r.out, 'ic2') + '<div class="ti"><b>' + ITEMS[r.out].name + '</b> <span class="dim">(' + INV.count(r.out) + ')</span><div class="dim">' + ITEMS[r.out].desc + '</div><div>' + this.costHtml(r.in) + '</div></div><div class="cb"><button class="btn" data-act="craft" data-id="' + r.out + '" data-n="1">Craft</button><button class="btn sm" data-act="craft" data-id="' + r.out + '" data-n="5">×5</button></div></div>';
    }
    return h + '</div>';
  },
  r_quick() {
    let h = this.head('Quick Menu', 'Recharge with what you carry');
    const row = (k, v) => { const R_ = RECHARGE[k]; const fuel = R_.items.map(([id]) => INV.count(id) ? iconImg(id, 'ic') + INV.count(id) : '').filter(Boolean).join(' ') || '<span class="dim">no fuel</span>'; return '<div class="qrow"><div class="qn">' + R_.name + '</div><div class="g"><i style="width:' + clamp(v, 0, 100) + '%"></i></div><div class="qv">' + Math.round(v) + '%</div><div class="qf">' + fuel + '</div><button class="btn" data-act="recharge" data-k="' + k + '">Recharge</button></div>'; };
    h += row('life', PLAYER.stats.life) + row('haz', PLAYER.stats.haz) + row('shield', PLAYER.stats.shield / maxShield() * 100);
    if (SHIP.cur && shipInReach()) h += '<div class="sh">' + esc(SHIP.cur.name) + '</div>' + row('lift', SHIP.cur.lift) + row('pulse', SHIP.cur.pulse) + row('dshield', SHIP.cur.shield / shipMaxShield() * 100);
    if (SHIP.cur && !PLAYER.inShip && PLAYER.frame && PLAYER.frame.kind === 'planet') h += '<div class="row"><button class="btn" data-act="summon">Summon starship</button></div>';
    return h;
  },
  r_build() {
    let h = this.head('Build', 'Place with <kbd>' + keyLabel('fire') + '</kbd> · rotate <kbd>' + keyLabel('rotate') + '</kbd> · dismantle <kbd>' + keyLabel('dismantle') + '</kbd> · exit <kbd>' + keyLabel('cancel') + '</kbd>');
    const pl = PLAYER.frame && PLAYER.frame.pl;
    const hasBase = pl && baseAt(pl, PLAYER.pos);
    if (!hasBase) h += '<p class="warnc">Start by placing a <b>Base Computer</b> — every other part must be within ' + BASE_R + ' m of one.</p>';
    else h += '<p class="dim">Base: <b>' + esc(hasBase.name) + '</b> · ' + hasBase.parts.length + ' parts &nbsp; <input type="text" id="renameIn" placeholder="Rename base" maxlength="28"> <button class="btn sm" data-act="renamebase" data-id="' + hasBase.id + '">Rename</button></p>';
    h += '<div class="parts">';
    for (const id in PARTS) { const p = PARTS[id]; const ok = INV.hasAll(p.cost); h += '<div class="part ' + (ok ? '' : 'no') + '" data-act="part" data-id="' + id + '"><b>' + p.name + '</b><div class="dim">' + p.desc + '</div><div>' + this.costHtml(p.cost) + '</div></div>'; }
    return h + '</div>';
  },
  r_refiner() {
    const rf = this.opts.refiner;
    let h = this.head(this.opts.name || 'Refiner', 'Turns one element into another over time');
    const rec = rf.input && refinerRecipe(rf.input.id);
    h += '<div class="refbox"><div class="rslot">' + (rf.input ? iconImg(rf.input.id) + '<b>' + rf.input.n + '</b>' : '<span class="dim">input</span>') + '</div><div class="arrow">' + (rec ? rec.a + ' → ' + rec.b + '<div class="g"><i style="width:' + clamp(rf.t / rf.speed * 100, 0, 100) + '%"></i></div>' : '→') + '</div><div class="rslot">' + (rf.output ? iconImg(rf.output.id) + '<b>' + rf.output.n + '</b>' : '<span class="dim">output</span>') + '</div></div>';
    h += '<div class="row"><button class="btn" data-act="refout">Take output</button><button class="btn" data-act="refback">Remove input</button></div><div class="sh">Add from inventory</div><div class="reflist">';
    for (const r of REFINE) { const n = INV.count(r.in); if (!n) continue; h += '<div class="rrow">' + iconImg(r.in, 'ic') + ITEMS[r.in].name + ' <span class="dim">(' + n + ')</span> → ' + iconImg(r.out, 'ic') + ITEMS[r.out].name + ' <span class="dim">' + r.a + ':' + r.b + '</span><button class="btn sm" data-act="refadd" data-id="' + r.in + '" data-n="50">+50</button><button class="btn sm" data-act="refadd" data-id="' + r.in + '" data-n="all">All</button></div>'; }
    return h + '</div>';
  },
  r_storage() {
    let h = this.head('Storage', 'Click to move items');
    h += '<div class="cols"><div><div class="sh">Storage</div>' + this.grid(this.opts.inv, 'store', 'unstore') + '</div><div><div class="sh">Exosuit</div>' + this.grid(PLAYER.suit, 'suit', 'store') + '</div></div>';
    return h;
  },
  r_trade() {
    const S = SYS.cur, E = ECONOMIES[S.economy];
    let h = this.head('Galactic Trade Terminal', E.name + ' economy · ' + iconImg('units', 'ic') + fmtNum(PLAYER.units) + ' units');
    h += '<div class="cols"><div><div class="sh">Sell</div><div class="tlist">';
    const have = new Set(); for (const inv of INV.list()) for (const s of inv.slots) if (s) have.add(s.id);
    for (const id of have) { const n = INV.count(id); h += '<div class="trow">' + iconImg(id, 'ic') + '<span class="tn">' + ITEMS[id].name + ' <i>(' + n + ')</i></span><span class="tp">' + fmtNum(priceOf(id, true)) + ' u' + (E.favour.includes(id) ? ' ▲' : '') + '</span><button class="btn sm" data-act="sell" data-id="' + id + '" data-n="1">1</button><button class="btn sm" data-act="sell" data-id="' + id + '" data-n="10">10</button><button class="btn sm" data-act="sell" data-id="' + id + '" data-n="all">All</button></div>'; }
    if (!have.size) h += '<p class="dim">Nothing to sell.</p>';
    h += '</div></div><div><div class="sh">Buy</div><div class="tlist">';
    const r = RNG(hashN(S.seed, 7));
    const stock = ['carbon', 'ferrite', 'sodium', 'oxygen', 'dihydro', 'tritium', 'pferrite', 'chromatic', 'plate', 'seal', 'jelly', 'liftfuel', 'ioncell', 'lifegel', 'antimatter', 'housing', 'circuit', 'warpcell'].filter((id) => ['carbon', 'ferrite', 'tritium', 'antimatter', 'housing', 'warpcell'].includes(id) || r() < 0.7);
    for (const id of stock) h += '<div class="trow">' + iconImg(id, 'ic') + '<span class="tn">' + ITEMS[id].name + '</span><span class="tp">' + fmtNum(priceOf(id, false)) + ' u</span><button class="btn sm" data-act="buy" data-id="' + id + '" data-n="1">1</button>' + (ITEMS[id].cat === 'el' ? '<button class="btn sm" data-act="buy" data-id="' + id + '" data-n="50">50</button>' : '<button class="btn sm" data-act="buy" data-id="' + id + '" data-n="5">5</button>') + '</div>';
    return h + '</div></div></div>';
  },
  r_tech() {
    let h = this.head('Technology Merchant', iconImg('nanites', 'ic') + fmtNum(PLAYER.nanites) + ' nanites');
    const r = RNG(STATION.seed);
    const all = Object.keys(TECH).filter((id) => TECH[id].nan);
    h += '<div class="techs">';
    for (const id of all) {
      const t = TECH[id];
      if (PLAYER.known.has(id)) continue;
      if (r() < 0.25 && !['cadmiumdrive', 'emerildrive', 'indiumdrive', 'reactor'].includes(id)) continue;
      h += '<div class="tech bp">' + iconImg('tech_' + id, 'ic2') + '<div class="ti"><b>' + t.name + '</b><div class="dim">' + t.desc + '</div><div class="dim">Build cost: ' + Object.entries(t.cost).map(([k, v]) => v + ' ' + ITEMS[k].name).join(', ') + (t.req ? ' · needs ' + TECH[t.req].name : '') + '</div><button class="btn" data-act="buybp" data-id="' + id + '">' + iconImg('nanites', 'ic') + t.nan + '</button></div></div>';
    }
    h += '</div>';
    const dp = INV.count('datapad');
    h += '<div class="row">' + (dp ? '<button class="btn" data-act="data">Exchange ' + dp + ' Salvaged Data for ' + dp * 60 + ' nanites</button>' : '<span class="dim">Bring Salvaged Data to exchange it for nanites.</span>') + '</div>';
    return h;
  },
  r_suitshop() {
    let h = this.head('Exosuit Outfitter', iconImg('units', 'ic') + fmtNum(PLAYER.units) + ' units');
    h += '<div class="qrow"><div class="qn">Exosuit slot</div><div class="qv">' + PLAYER.suit.size + ' slots</div><button class="btn" data-act="slotbuy" data-k="suit">Buy for ' + fmtNum(slotPrice('suit')) + ' u</button></div>';
    if (SHIP.cur) h += '<div class="qrow"><div class="qn">Starship cargo slot</div><div class="qv">' + SHIP.cur.cargo.size + ' slots</div><button class="btn" data-act="slotbuy" data-k="ship">Buy for ' + fmtNum(slotPrice('ship')) + ' u</button></div>';
    h += '<p class="dim">Drop pods on planets also expand the exosuit for free.</p>';
    return h;
  },
  shipOffers() { const r = RNG(STATION.seed + 9); return [0, 1, 2].map((i) => { const type = r.pick(['fighter', 'explorer', 'hauler', 'shuttle']); const seed = r.int(0, 1e9); const T = SHIP_TYPES[type]; return { type, seed, name: makeShipData(type, seed).name, price: Math.round((T.price || 60000) * r.range(0.8, 1.3) / 1000) * 1000 }; }); },
  r_ships() {
    let h = this.head('Starship Broker', iconImg('units', 'ic') + fmtNum(PLAYER.units) + ' units · trade-in ' + fmtNum(tradeIn()) + ' u');
    h += '<div class="techs">';
    this.shipOffers().forEach((o, i) => { const T = SHIP_TYPES[o.type]; h += '<div class="tech"><div class="ti"><b>' + esc(o.name) + '</b> <span class="dim">' + T.name + '</span><div class="dim">' + T.slots + ' cargo slots · speed ×' + T.speed + ' · shield ×' + T.shield + ' · weapons ×' + T.dmg + '</div><button class="btn" data-act="buyship" data-i="' + i + '">Buy for ' + fmtNum(Math.max(0, o.price - tradeIn())) + ' u</button></div></div>'; });
    return h + '</div><p class="dim">Your cargo moves to the new ship as far as it fits. Installed technology carries over.</p>';
  },
  buyShip(i) {
    const o = this.shipOffers()[i], cost = Math.max(0, o.price - tradeIn());
    if (PLAYER.units < cost) { HUD.msg('Not enough units.', 'bad'); AU.sfx('deny'); return; }
    PLAYER.units -= cost;
    const data = makeShipData(o.type, o.seed, o.name);
    for (const s of SHIP.cur.cargo.slots) if (s) data.cargo.add(s.id, s.n);
    data.lift = SHIP.cur.lift; data.pulse = SHIP.cur.pulse;
    const f = SHIP.frame, p = SHIP.pos.clone(), q = SHIP.q.clone(), st = SHIP.state;
    setShip(data); placeShip(f, p, q, st); SHIP.onPad = true;
    HUD.banner('New starship acquired', 'win'); AU.sfx('unlock');
  },
  r_wreck() {
    const L = this.opts.live, T = SHIP_TYPES[L.wreck.type];
    return this.head('Crashed Ship', T.name + ' class') + '<p>The ship is battered but mostly intact. Its lift thrusters are wrecked.</p><p class="dim">' + T.slots + ' cargo slots · speed ×' + T.speed + ' · shield ×' + T.shield + ' · weapons ×' + T.dmg + '</p><div class="row"><button class="btn" data-act="claim">Claim it (replaces your ship)</button><button class="btn" data-act="salvage">Salvage parts</button><button class="btn" data-act="close">Leave it</button></div>';
  },
  r_teleport() {
    const list = teleportDestinations();
    let h = this.head('Teleporter', 'Bases with teleporters and stations you have docked at');
    h += '<div class="tlist">' + (list.length ? list.map((d, i) => '<div class="trow"><span class="tn">' + esc(d.name) + ' <i>' + esc(GALAXY.stars[d.star].name) + '</i></span><button class="btn sm" data-act="tp" data-i="' + i + '">Go</button></div>').join('') : '<p class="dim">No destinations yet.</p>') + '</div>';
    return h;
  },
  r_dialog() {
    const o = this.opts;
    return '<div class="ph"><h2>' + o.title + '</h2></div><p class="dtext">' + o.text + '</p>' + (o.gift ? '<p class="good">Received ' + fmtNum(o.gift.n) + ' ' + (o.gift.id === 'units' ? 'units' : o.gift.id === 'nanites' ? 'nanites' : ITEMS[o.gift.id].name) + '.</p>' : '') + '<div class="row"><button class="btn" data-act="close">OK</button></div>';
  },
  r_ending() {
    return '<div class="ph"><h2>Farhold</h2></div><p class="dtext">At the heart of the galaxy there is no machine, no beacon, no answer — only a vast and quiet light, and in it, the faint outline of countless ships like yours, all arriving at once.</p><p class="dtext">SOLA is silent for a long time. Then: <i>“Pilot. The signal has changed. It is coming from somewhere new now. Another galaxy. Another centre.”</i></p><p class="dtext">The journey does not end. It only begins again, somewhere else.</p><div class="row"><button class="btn" data-act="newgalaxy">Follow the signal (new galaxy, keep everything)</button><button class="btn" data-act="continue">Stay and explore</button></div>';
  },
  r_log() {
    const c = discoveryCounts();
    let h = this.head('Discoveries', c.planets + ' planets · ' + c.fauna + ' fauna · ' + c.flora + ' flora · ' + c.mineral + ' minerals' + (c.pending ? ' · <b>' + c.pending + ' to upload</b>' : ''));
    h += '<div class="row"><button class="btn" data-act="uploadall">Upload all discoveries</button></div><div class="cols log"><div class="tlist">';
    const ids = Object.keys(DISC.planets);
    if (!this.sel && ids.length) this.sel = ids[ids.length - 1];
    for (const id of ids) { const e = DISC.planets[id]; h += '<div class="trow ' + (this.sel === id ? 'on' : '') + '" data-act="logsel" data-pl="' + id + '"><span class="tn">' + esc(e.name) + ' <i>' + esc(e.sys) + '</i></span><span class="dim">' + Object.keys(e.sp).length + '</span></div>'; }
    if (!ids.length) h += '<p class="dim">Scan creatures, plants and minerals with the analysis visor.</p>';
    h += '</div><div>';
    const e = DISC.planets[this.sel];
    if (e) {
      const pl = PLANETS.list.find((p) => p.id === this.sel);
      h += '<div class="sh">' + esc(e.name) + '</div>';
      if (pl) {
        const fa = planetFauna(pl), fl = planetFlora(pl).list;
        h += '<div class="dim">' + PLANET_TYPES[pl.type].name + ' · ' + HAZ_LABEL[pl.haz] + ' · Fauna ' + (fa.filter((s) => e.sp[s.id]).length) + '/' + fa.length + ' · Flora ' + fl.filter((s) => s.cat === 'flora' && e.sp[s.id]).length + '/' + fl.filter((s) => s.cat === 'flora').length + ' · Sentinels ' + SENTINEL_LV[pl.sentinel].name + '</div>';
      }
      h += '<div class="row"><input type="text" id="renameIn" placeholder="New name" maxlength="28"><button class="btn sm" data-act="rename" data-pl="' + this.sel + '">Rename planet</button><button class="btn sm" data-act="upload" data-id="' + this.sel + '">Upload</button></div><div class="splist">';
      for (const k in e.sp) { const s = e.sp[k]; h += '<div class="trow"><span class="tn">' + esc(s.name) + ' <i>' + s.cat + '</i>' + (s.uploaded ? '' : ' <b class="warnc">•</b>') + '</span><button class="btn sm" data-act="rename" data-pl="' + this.sel + '" data-sp="' + k + '">Rename</button></div>'; }
      h += '</div>';
    }
    h += '</div></div>';
    if (PLAYER.lore.length) h += '<div class="sh">Waystones</div>' + PLAYER.lore.map((i) => '<p class="dtext small">' + LORE[i] + '</p>').join('');
    return h;
  },
  r_pause() {
    let h = this.head(this.tab === 'settings' ? 'Settings' : this.tab === 'controls' ? 'Controls' : 'Paused');
    if (this.tab === 'settings') return h + settingsHtml() + '<div class="row"><button class="btn" data-act="back">Back</button></div>';
    if (this.tab === 'controls') return h + controlsHtml() + '<div class="row"><button class="btn" data-act="back">Back</button></div>';
    h += '<div class="menu-col"><button class="btn big" data-act="resume">Resume</button><button class="btn big" data-act="save">Save game</button><button class="btn big" data-act="settings">Settings</button><button class="btn big" data-act="controls">Controls</button><button class="btn big" data-act="export">Export save file</button><button class="btn big" data-act="import">Import save file</button><button class="btn big danger" data-act="quit">Save &amp; quit to title</button></div>';
    return h;
  },
  r_map() {
    const t = GALAXY.target;
    let h = '<div class="ph"><div><h2>Galaxy Map</h2><div class="sub">' + esc(SYS.star.name) + ' · ' + fmtNum(Math.hypot(SYS.star.x, SYS.star.z)) + ' ly from the core · warp range ' + fmtNum(warpRange()) + ' ly · ' + INV.count('warpcell') + ' warp cells</div></div><button class="btn x" data-act="close">✕</button></div>';
    h += '<div class="mapwrap"><canvas id="galmap"></canvas><div class="mapinfo">';
    if (t) {
      const d = starDist(SYS.star, t), err = warpCheck(t);
      h += '<div class="dn">' + esc(t.name) + '</div><div class="dim">' + STAR_CLASS[t.cls].name + ' star · ' + fmtNum(d) + ' ly away · ' + fmtNum(Math.hypot(t.x, t.z)) + ' ly from core</div>';
      if (GALAXY.visited.has(t.i)) h += '<div class="good">Visited</div>';
      h += err ? '<div class="bad">' + err + '</div>' : '<div class="good">Ready — hold <kbd>' + keyLabel('warp') + '</kbd> in space to warp.</div>';
    } else h += '<div class="dim">Click a star to plot a course.</div>';
    h += '<div class="row"><button class="btn sm" data-act="route">Next hop to Farhold</button><button class="btn sm" data-act="mapme">Centre on me</button></div><div class="dim small">Drag to pan · wheel to zoom</div></div></div>';
    return h;
  },
  // ---------- galaxy map canvas ----------
  mapInit() {
    const cv = document.getElementById('galmap');
    if (!cv) return;
    if (!this.mapView) this.mapView = { cx: SYS.star.x, cz: SYS.star.z, zoom: 0.12 };
    const V = this.mapView;
    const fit = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
    fit();
    let drag = null;
    cv.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY, cx: V.cx, cz: V.cz, moved: false }; };
    cv.onmousemove = (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; V.cx = drag.cx - dx / V.zoom; V.cz = drag.cz - dy / V.zoom; };
    cv.onmouseup = (e) => { if (drag && !drag.moved) this.mapClick(e.offsetX, e.offsetY); drag = null; };
    cv.onwheel = (e) => { V.zoom = clamp(V.zoom * (e.deltaY < 0 ? 1.15 : 0.87), 0.04, 1.2); e.preventDefault(); };
  },
  mapCenterOn(s) { if (this.mapView) { this.mapView.cx = s.x; this.mapView.cz = s.z; } },
  mapClick(x, y) {
    const cv = document.getElementById('galmap'), V = this.mapView;
    let best = null, bd = 14;
    for (const s of GALAXY.stars) { const sx = (s.x - V.cx) * V.zoom + cv.width / 2, sy = (s.z - V.cz) * V.zoom + cv.height / 2; const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = s; } }
    if (best) { GALAXY.target = best; AU.sfx('click'); this.render(); this.mapInit(); }
  },
  mapDraw(dt) {
    const cv = document.getElementById('galmap');
    if (!cv || !this.mapView) return;
    const V = this.mapView, g = cv.getContext('2d'), W = cv.width, H = cv.height;
    if (cv.clientWidth !== W) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
    // pad / keys pan
    const mv = Act.move(); V.cx += mv.x * dt * 400 / V.zoom; V.cz -= mv.y * dt * 400 / V.zoom;
    if (Input.gp.b[6] > 0.3) V.zoom = Math.max(0.04, V.zoom * (1 - dt * 1.5)); if (Input.gp.b[7] > 0.3) V.zoom = Math.min(1.2, V.zoom * (1 + dt * 1.5));
    g.fillStyle = '#04060c'; g.fillRect(0, 0, W, H);
    const sx = (x) => (x - V.cx) * V.zoom + W / 2, sy = (z) => (z - V.cz) * V.zoom + H / 2;
    // galactic glow
    const cg = g.createRadialGradient(sx(0), sy(0), 0, sx(0), sy(0), 3200 * V.zoom);
    cg.addColorStop(0, 'rgba(255,220,160,0.35)'); cg.addColorStop(0.15, 'rgba(160,120,255,0.12)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cg; g.fillRect(0, 0, W, H);
    // range
    g.strokeStyle = 'rgba(120,200,255,0.5)'; g.setLineDash([6, 6]); g.beginPath(); g.arc(sx(SYS.star.x), sy(SYS.star.z), warpRange() * V.zoom, 0, TAU); g.stroke(); g.setLineDash([]);
    for (const s of GALAXY.stars) {
      const x = sx(s.x), y = sy(s.z);
      if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
      const c = STAR_CLASS[s.cls].col;
      g.fillStyle = cssHex(c);
      const r = s.core ? 7 : GALAXY.visited.has(s.i) ? 3.2 : 2.2;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (s.core) { g.strokeStyle = '#ffd080'; g.beginPath(); g.arc(x, y, 12 + Math.sin(G.time * 2) * 2, 0, TAU); g.stroke(); g.fillStyle = '#ffd080'; g.font = '700 14px Rajdhani'; g.fillText('FARHOLD', x + 14, y + 4); }
      if (V.zoom > 0.25 && !s.core) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '11px Rajdhani'; g.fillText(s.name, x + 5, y - 4); }
    }
    // you
    const mx = sx(SYS.star.x), my = sy(SYS.star.z);
    g.strokeStyle = '#7cffb0'; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, 8, 0, TAU); g.stroke(); g.lineWidth = 1;
    g.fillStyle = '#7cffb0'; g.font = '700 12px Rajdhani'; g.fillText('YOU', mx + 10, my + 14);
    if (GALAXY.target) {
      const tx = sx(GALAXY.target.x), ty = sy(GALAXY.target.z);
      g.strokeStyle = '#ffb050'; g.beginPath(); g.moveTo(mx, my); g.lineTo(tx, ty); g.stroke();
      g.beginPath(); g.arc(tx, ty, 9, 0, TAU); g.stroke();
    }
  },
  // ---------- gamepad navigation ----------
  focusables() { this.focusI = 0; this.updateFocus(); },
  list() { return [...this.el.querySelectorAll('.btn, .slot[data-act], .part, .trow[data-act], input, select')].filter((e) => e.offsetParent); },
  updateFocus() {
    if (!Input.gp.active) return;
    const l = this.list();
    l.forEach((e, i) => e.classList.toggle('focus', i === this.focusI));
  },
  nav(dx, dy) {
    const l = this.list(); if (!l.length) return;
    const cur = l[this.focusI] || l[0], cr = cur.getBoundingClientRect();
    let best = -1, bs = Infinity;
    l.forEach((e, i) => {
      if (e === cur) return;
      const r = e.getBoundingClientRect(); const ddx = (r.left + r.width / 2) - (cr.left + cr.width / 2), ddy = (r.top + r.height / 2) - (cr.top + cr.height / 2);
      const along = ddx * dx + ddy * dy; if (along <= 4) return;
      const perp = Math.abs(ddx * dy) + Math.abs(ddy * dx);
      const s = along + perp * 2.5; if (s < bs) { bs = s; best = i; }
    });
    if (best >= 0) { this.focusI = best; this.updateFocus(); l[best].scrollIntoView({ block: 'nearest' }); AU.sfx('click', 0.3); }
  },
  tick(dt) {
    // global hotkeys
    if (G.state !== 'play') return;
    if (Act.hit('pause')) { if (this.cur) { if (this.cur === 'pause' && this.tab) { this.tab = null; this.render(); } else this.close(); } else { this.tab = null; this.open('pause'); } return; }
    if (!this.cur) {
      if (!PLAYER.alive) return;
      if (Act.hit('inventory')) { this.tab = this.tab && ['suit', 'ship', 'tech', 'craft'].includes(this.tab) ? this.tab : 'suit'; this.open('inventory'); }
      else if (Act.hit('quick')) this.open('quick');
      else if (Act.hit('map')) this.open('map');
      else if (Act.hit('log')) { this.sel = null; this.open('log'); }
      else if (Act.hit('build') && !BUILD.active && !PLAYER.inShip) openBuildMenu();
      return;
    }
    if (Act.hit('inventory') && this.cur === 'inventory') { this.close(); return; }
    if (Act.hit('map') && this.cur === 'map') { this.close(); return; }
    if (Act.hit('quick') && this.cur === 'quick') { this.close(); return; }
    if (Act.hit('log') && this.cur === 'log') { this.close(); return; }
    if (Act.hit('build') && this.cur === 'build') { this.close(); return; }
    if (this.cur === 'map') this.mapDraw(dt);
    // live refresh for refiners and gauges
    this.refreshT = (this.refreshT || 0) - dt;
    if (this.refreshT <= 0 && (this.cur === 'refiner' || this.cur === 'quick')) { this.refreshT = 0.5; const fi = this.focusI; this.render(); this.focusI = fi; this.updateFocus(); }
    // pad
    const gp = Input.gp;
    if (gp.active) {
      if (gp.hit[12]) this.nav(0, -1); if (gp.hit[13]) this.nav(0, 1); if (gp.hit[14]) this.nav(-1, 0); if (gp.hit[15]) this.nav(1, 0);
      const ax = gp.axes[0], ay = gp.axes[1];
      this.stickT = (this.stickT || 0) - dt;
      if (this.cur !== 'map' && (Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5) && this.stickT <= 0) { this.stickT = 0.18; if (Math.abs(ax) > Math.abs(ay)) this.nav(Math.sign(ax), 0); else this.nav(0, Math.sign(ay)); }
      if (gp.hit[0]) { const l = this.list(); const e = l[this.focusI]; if (e) e.click(); }
      if (gp.hit[1]) this.close();
      if (this.cur === 'inventory' && (gp.hit[4] || gp.hit[5])) { const tabs = ['suit', 'ship', 'tech', 'craft']; this.tab = tabs[(tabs.indexOf(this.tab) + (gp.hit[5] ? 1 : 3)) % 4]; this.sel = null; this.render(); }
    }
  },
};
function slotPrice(which) { const n = which === 'suit' ? PLAYER.suit.size - 23 : SHIP.cur.cargo.size - SHIP_TYPES[SHIP.cur.type].slots + 1; return Math.round(6000 * Math.pow(Math.max(1, n), 1.35) / 500) * 500; }
function tradeIn() { return SHIP.cur ? Math.round((SHIP_TYPES[SHIP.cur.type].price || 60000) * 0.5) : 0; }
function bestHopToward(goal) {
  let best = null, bd = starDist(SYS.star, goal);
  for (const s of GALAXY.stars) { if (s === SYS.star) continue; if (warpCheck(s) && warpCheck(s) !== 'You need a Warp Cell.') continue; const d = starDist(s, goal); if (d < bd) { bd = d; best = s; } }
  return best;
}
function summonShip() {
  const P = PLAYER, f = P.frame;
  if (!SHIP.cur || !f || f.kind !== 'planet') return;
  if (SHIP.frame && SHIP.frame.kind === 'station') { HUD.msg('Your ship is docked at the station.', 'bad'); return; }
  const up = P.pos.clone().normalize();
  const fw = new V3(0, 0, -1).applyQuaternion(P.q);
  const dir = P.pos.clone().addScaledVector(fw, 14).normalize();
  const h = surfaceH(f.pl, dir);
  if (f.pl.P.sea != null && h < f.pl.P.sea) { HUD.msg('No room for the ship to land here.', 'bad'); return; }
  const target = dir.clone().multiplyScalar(f.pl.R + h);
  const q1 = basisQuat(dir, fw.clone().negate(), new Q4());
  placeShip(f, target.clone().addScaledVector(dir, 80), q1, 'landing');
  SHIP.path = { p0: SHIP.pos.clone(), p1: target, q0: q1, q1, dur: 4, up: dir, pad: null };
  SHIP.t = 0;
  AU.sfx('landing');
  HUD.msg('Your starship is on its way.');
  void up;
}
function settingsHtml() {
  const S = SETTINGS;
  const rng = (k, lbl, min, max, step) => '<label class="set">' + lbl + '<input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + S[k] + '"><output>' + S[k] + '</output></label>';
  const chk = (k, lbl) => '<label class="set chk"><input type="checkbox" data-k="' + k + '" ' + (S[k] ? 'checked' : '') + '>' + lbl + '</label>';
  return '<div class="settings">' + rng('sens', 'Look sensitivity', 0.2, 3, 0.1) + rng('fov', 'Field of view', 55, 100, 1) + rng('vol', 'Volume', 0, 1, 0.05) + rng('music', 'Music', 0, 1, 0.05) +
    '<label class="set">Graphics quality<select data-k="quality">' + QUALITY.map((q, i) => '<option value="' + i + '" ' + (S.quality == i ? 'selected' : '') + '>' + q.name + '</option>').join('') + '</select></label>' +
    chk('invertY', 'Invert look') + chk('autoQ', 'Adjust quality automatically') + chk('fpv', 'Head bob') + '</div>';
}
function controlsHtml() {
  const rows = [['Move', 'WASD', 'Left stick'], ['Look', 'Mouse', 'Right stick'], ['Jump / jetpack', 'Space (hold)', 'A'], ['Sprint', 'Shift', 'L3'], ['Interact (hold for some)', 'E', 'X'], ['Mine / fire', 'Left mouse', 'RT'], ['Switch beam / bolt caster', 'G', 'RB'], ['Scanner', 'C', 'LB'], ['Analysis visor', 'F', 'LT'], ['Reload', 'R', 'Y'], ['Melee', 'V', 'B'], ['Flashlight', 'T', '—'], ['Third person', 'P', 'R3'], ['Inventory', 'Tab / I', 'View'], ['Quick menu (recharge)', 'X', 'D-pad ←'], ['Build menu', 'B', 'D-pad ↓'], ['Galaxy map', 'M', 'D-pad ↑'], ['Discoveries', 'N', 'D-pad →'], ['Pause', 'Esc', 'Menu'],
    ['— Starship —', '', ''], ['Steer', 'Mouse', 'Left stick'], ['Roll', 'A / D', 'Right stick'], ['Throttle / brake', 'W / S', 'RT / LT'], ['Boost', 'Shift', 'A'], ['Pulse drive', 'Space (hold)', 'LB (hold)'], ['Fire cannon', 'Left mouse', 'RB'], ['Take off', 'Space', 'A'], ['Land / exit', 'E (hold)', 'X (hold)'], ['Warp', 'H (hold)', 'Y (hold)'], ['Cockpit / chase view', 'P', 'R3']];
  return '<table class="ctl">' + rows.map((r) => '<tr><td>' + r[0] + '</td><td><kbd>' + r[1] + '</kbd></td><td><kbd>' + r[2] + '</kbd></td></tr>').join('').replace(/<kbd><\/kbd>/g, '') + '</table>';
}
