// Ashreach — missions: terminal offers, instanced interiors, objectives, rewards, plus the Landfall starter quests and NPC dialog

// Public: requestMissions(npc, sliders) -> 5 offers; acceptMission(npc, offer) -> mission | { ok: false, msg }; abandonMission(m);
//         missionZoneChanged(zoneId, prevZoneId); missionDoor(doorEnt); missionTick(dt);
//         missionMarkers() -> [{ id, title, zone, x, z, type, done }]; questList() -> starter quests with state;
//         questDialog(npc) opens the NPC dialog.
const MS = { cur: null, mobs: [], objs: [], beacons: [], rep: null, ret: null, t: 0, flushT: 0, dlg: null, dlgNpc: null };
const MS_MAX = 3;
const MS_SLIDERS = ['good_bad', 'order_chaos', 'open_hidden', 'physical_mystical', 'headon_stealth', 'credits_xp', 'easy_hard'];

// ---------- text pools ----------
const MS_FIRST = ['Idris', 'Maren', 'Kessa', 'Torvald', 'Halle', 'Joss', 'Brannoch', 'Ilya', 'Sable', 'Corin', 'Vesna', 'Rook', 'Dagny', 'Ansel', 'Mirelle', 'Tobiah', 'Yara', 'Quill', 'Odessa', 'Hollis', 'Perrin', 'Ysolde'];
const MS_LAST = ['Voss', 'Kell', 'Marrow', 'Ashgrove', 'Tarn', 'Dunmore', 'Okafor', 'Brandt', 'Halvard', 'Sorrel', 'Quarry', 'Pike', 'Linden', 'Rhee', 'Ostrander', 'Calder', 'Vance', 'Thorne'];
const MS_RANK = ['Foreman', 'Cell Leader', 'Quartermaster', 'Warbroker', 'Rogue Auditor', 'Deserter Sergeant', 'Lumen Baron', 'Smuggler-Captain', 'Site Overseer'];
const MS_ROLE = ['survey technician', 'Concord courier', 'lumen assayer', 'Freehold medic', 'records clerk', 'convoy driver', 'field engineer', 'defecting guard'];
const MS_GOOD = ['A Concord arbiter', 'A Freehold quartermaster', 'A nervous Meridian records clerk', 'The director of a Halden clinic', 'A Greenhollow settler-elder'];
const MS_BAD = ['An anonymous broker', 'A syndicate go-between', 'A Meridian "security contractor"', 'A lumen baron with deep pockets', 'A Freehold hardliner'];
const MS_THEME_TXT = {
  office: ['an abandoned Meridian office block', 'a gutted regional administration annex'],
  warehouse: ['a lumen-freight warehouse', 'a looted salvage depot'],
  lab: ['a derelict Meridian research lab', 'a sealed Concord-era clinic lab'],
  bunker: ['a sealed Freehold bunker', 'a pre-Collapse blast shelter'],
  cave: ['a smuggler cave system', 'a lumen-seam cavern'],
};
const MS_CONT = {
  office: ['Locked Filing Cabinet', 'Executive Safe'], warehouse: ['Sealed Cargo Crate', 'Freight Container'], lab: ['Cold Storage Locker', 'Specimen Vault'],
  bunker: ['Armoury Locker', 'Reinforced Strongbox'], cave: ["Smuggler's Cache", 'Buried Chest'],
};
const MS_CONS = {
  office: ['Server Rack', 'Records Terminal'], warehouse: ['Loader Control Panel', 'Freight Router'], lab: ['Analysis Console', 'Cryo Regulator'],
  bunker: ['Power Regulator', 'Ventilation Controller'], cave: ['Salvaged Relay', 'Lumen Pump Console'],
};
const MS_PARTS = ['Regulator Coil', 'Replacement Relay', 'Lattice Capacitor', 'Flux Governor', 'Signal Amplifier'];
const MS_ITEMS = {
  retrieve: [['key_data', ['Ledger Core', 'Survey Data Core', 'Concord Audit Core', 'Encrypted Route Map']], ['key_sample', ['Lumen Sample Case', 'Culture Vial Case', 'Sealed Reagent Case']], ['key_relic', ["Terraformer's Relic", 'Pre-Collapse Relic', "Founders' Medallion"]], ['key_card', ['Master Keycard', 'Executive Passcard']]],
  deliver: [['key_parcel', ['Courier Parcel', 'Diplomatic Pouch', 'Wrapped Bundle']], ['key_data', ['Sealed Data Core', 'Cipher Slate']]],
};
const MS_TITLES = {
  assassinate: ['Silence {name}', 'Contract on {name}', 'The Fall of {name}', 'End of the Line: {last}', '{rank} {last} Must Go', 'Paid in Full'],
  retrieve: ['Recover the {item}', 'The {item} Job', 'Lost Property: {item}', 'Quiet Retrieval', 'Fetch the {item}'],
  repair: ['Bring the {obj} Back Online', 'Dead {obj}', 'Fix the {obj}', 'Spark in the Dark', 'Repair Order: {obj}'],
  find: ['Find {name}', 'Missing: {name}', 'Last Seen: {name}', 'Where is {last}?', 'Proof of Life'],
  deliver: ['Special Delivery', 'Parcel for {name}', 'Hand-Carry: {item}', 'Signed, Sealed', 'The Long Way Round'],
};
const MS_FLAVOUR = {
  good: ['The settlements are counting on this.', 'Nobody else is willing to go in.', 'Do it for the people who have to live out here.'],
  neutral: ['It pays well and the rules are simple.', 'Plain work for plain credits.', 'Everyone has to eat.'],
  bad: ["Don't ask what this is really about.", 'The credits clear either way.', 'No witnesses, no questions.'],
};

// ---------- small helpers ----------
const ms_s1 = (v) => clamp(+v || 0, -1, 1);
function ms_wpick(rng, table) {
  let tot = 0;
  for (const t of table) tot += Math.max(0, t[1]);
  let r = rng.f() * tot;
  for (const t of table) { r -= Math.max(0, t[1]); if (r <= 0) return t[0]; }
  return table[table.length - 1][0];
}
function ms_fmt(s, o) { return s.replace(/\{(\w+)\}/g, (a, k) => (o[k] != null ? o[k] : a)); }
function ms_zoneName(id) { return (typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS[id] && ZONE_DEFS[id].name) || cap1(String(id).replace(/_/g, ' ')); }
function ms_say(text, cls) { EV.emit('log', text, cls || 'info'); EV.emit('chat', 'system', '', text); }
function ms_sfx(n) { if (typeof sfx === 'function') sfx(n); }
function ms_person(rng) { const f = rng.pick(MS_FIRST), l = rng.pick(MS_LAST); return { first: f, last: l, name: f + ' ' + l }; }
function ms_list() { return PLAYER && PLAYER.char ? (PLAYER.char.missions || (PLAYER.char.missions = [])) : []; }
function ms_active() { return ms_list().filter((m) => m.state === 'active'); }
function ms_get(id) { return ms_list().find((m) => m.id === id) || null; }
function ms_hasTpl(id) { return typeof ITEM_T !== 'undefined' && !!ITEM_T[id]; }
function ms_par() { return (typeof zoneRoot !== 'undefined' && zoneRoot) || (typeof ZONE !== 'undefined' && ZONE && ZONE.root) || scene; }

// ---------- offer generation ----------
function ms_theme(rng, s) {
  const pos = { office: [-1, -0.4], bunker: [-0.6, -0.8], warehouse: [0.3, -0.8], lab: [-0.2, 0.9], cave: [0.9, 0.4] };
  const tab = [];
  for (const t in pos) { const d = (s.order_chaos - pos[t][0]) ** 2 + (s.physical_mystical - pos[t][1]) ** 2; tab.push([t, 0.06 + Math.exp(-1.5 * d)]); }
  return ms_wpick(rng, tab);
}
function ms_zoneMob(rng, ids, lvl) {
  const ok = ids.filter((id) => MOB_T[id] && MOB_T[id].lvl && lvl >= MOB_T[id].lvl[0] - 3 && lvl <= MOB_T[id].lvl[1] + 3);
  return ok.length ? rng.pick(ok) : null;
}
const MS_BEASTS = ['dust_scuttler', 'rust_hound', 'sand_wyrm', 'dune_strider', 'scorpod', 'mire_lurker', 'spore_beetle', 'thornback', 'feral_mutant', 'mesa_stalker', 'brute_mutant', 'scar_worm'];
const MS_HUMS = ['smuggler', 'dust_raider', 'canyon_raider', 'deserter'];
// Weighted mob table [[tplId, weight]] for a mission of this theme, shaped by the order/chaos and physical/mystical sliders.
function ms_mix(rng, theme, s, lvl) {
  const base = {
    office: { merc: 2, security_bot: 2, lab_horror: 0.1 }, warehouse: { merc: 3, security_bot: 1, lab_horror: 0.3, hum: 1 },
    lab: { merc: 0.8, security_bot: 1.5, lab_horror: 3 }, bunker: { merc: 2.5, security_bot: 2.5, lab_horror: 0.2, hum: 1 }, cave: { beast: 3.5, merc: 0.8, lab_horror: 0.8 },
  }[theme];
  const w = Object.assign({}, base);
  if (w.security_bot) w.security_bot *= Math.max(0.2, 1 - 0.6 * s.order_chaos);
  if (w.lab_horror) w.lab_horror *= Math.max(0.2, (1 + 0.6 * s.order_chaos) * (1 + 0.8 * s.physical_mystical));
  if (w.merc) w.merc *= Math.max(0.3, 1 + 0.3 * s.order_chaos - 0.3 * s.physical_mystical);
  const out = [];
  for (const k in w) {
    if (k === 'beast' || k === 'hum') {
      const id = ms_zoneMob(rng, k === 'beast' ? MS_BEASTS : MS_HUMS, lvl);
      if (id) out.push([id, w[k]]);
      if (k === 'beast') { const id2 = ms_zoneMob(rng, MS_BEASTS, lvl); if (id2 && id2 !== id) out.push([id2, w[k] * 0.6]); }
    } else out.push([k, w[k]]);
  }
  if (!out.length) out.push(['merc', 1]);
  return out.map((p) => [p[0], Math.round(p[1] * 100) / 100]);
}
function ms_mixText(mix) {
  const top = mix.slice().sort((a, b) => b[1] - a[1])[0][0];
  return { merc: 'mercenaries', security_bot: 'security bots', lab_horror: 'lab-bred horrors' }[top] || (MOB_T[top] ? MOB_T[top].name.toLowerCase() + 's' : 'hired guns');
}
function ms_location(rng, lvl, zoneNow) {
  const cand = [];
  for (const id in ZONE_DEFS) {
    const d = ZONE_DEFS[id];
    if (!d || d.kind === 'interior' || d.generated || !d.doors || !d.doors.length) continue;
    let w;
    if (d.safe || !d.lvl) w = lvl <= 20 ? 0.6 : 0.1;
    else if (lvl >= d.lvl[0] - 2 && lvl <= d.lvl[1] + 3) w = 1;
    else continue;
    if (id === zoneNow) w += lvl <= 12 ? 2.5 : 0.5;
    cand.push([id, w]);
  }
  const zone = cand.length ? ms_wpick(rng, cand) : (zoneNow && ZONE_DEFS[zoneNow] ? zoneNow : 'landfall');
  let d = null;
  try { d = typeof randomDoorIn === 'function' ? randomDoorIn(zone, rng) : null; } catch (e) { d = null; }
  if (!d) {
    // no building doors in this zone: fall back to a spot near one of its landmarks
    const def = ZONE_DEFS[zone], p = def && (def.pois || []).find((q) => q.type === 'terminal' || q.type === 'start');
    const a = rng.r(0, TAU), r = rng.r(18, 30);
    d = { x: (p ? p.x : 0) + Math.sin(a) * r, z: (p ? p.z : 0) + Math.cos(a) * r, yaw: a };
  }
  return { zone, x: d.x, z: d.z, yaw: d.yaw || 0 };
}
// A QL-scaled reward item. physical -> weapons & armour for this profession, mystical -> nano crystals, clusters, implants.
function ms_rewardItem(rng, ql, myst, prof) {
  const mk = (id, q) => { try { return makeItem(id, q, rng); } catch (e) { return null; } };
  const pickT = (ids, q) => (typeof it_pickT === 'function' ? it_pickT(rng, ids, q) : rng.pick(ids));
  let it = null;
  if (rng.chance((myst + 1) / 2 * 0.9 + 0.05)) {
    const r = rng.f();
    if (r < 0.4 && typeof NANOS !== 'undefined') {
      const lv = PLAYER ? PLAYER.level : ql / 2.3;
      const ids = Object.keys(NANOS).filter((id) => (NANOS[id].prof === prof || NANOS[id].prof === 'any') && NANOS[id].lvl <= lv + 5 && NANOS[id].lvl >= lv - 8);
      if (ids.length) it = mk('nano:' + rng.pick(ids), 1);
    }
    if (!it && r < 0.75 && typeof CLUSTER_T !== 'undefined' && typeof CLUSTER_COLORS !== 'undefined') {
      const stats = Object.keys(CLUSTER_T);
      it = mk('cluster_' + rng.pick(CLUSTER_COLORS) + '_' + rng.pick(stats), Math.round(ql * 0.85));
    }
    if (!it && typeof makeImplant === 'function') { try { it = makeImplant(rng.pick(IMPLANT_SLOTS), Math.round(ql * 0.8), rng); } catch (e) { it = null; } }
  }
  if (!it) {
    const sk = PROFS[prof] && PROFS[prof].weapon;
    if (rng.chance(0.55) && sk && typeof IT_BY_SKILL !== 'undefined' && IT_BY_SKILL[sk]) it = mk(pickT(IT_BY_SKILL[sk], ql), ql);
    else if (typeof IT_BY_KIND !== 'undefined') {
      const ids = IT_BY_KIND.armor.filter((id) => !ITEM_T[id].shield && !ITEM_T[id].faction && ITEM_T[id].set !== 'basic');
      it = mk(pickT(ids.length ? ids : IT_BY_KIND.armor, ql), ql);
    }
  }
  return it || mk('health_kit', ql);
}
function ms_keyTpl(prefer) {
  if (ms_hasTpl(prefer)) return prefer;
  const k = Object.keys(ITEM_T).find((id) => ITEM_T[id].kind === 'key');
  return k || 'misc_junk';
}
// A mission item instance (quest-flagged), named for the mission.
function ms_item(tid, ql, name, mid, flag) {
  const it = makeItem(ms_keyTpl(tid), ql);
  if (!it) return null;
  it.name = name; it.mission = mid; it.quest = true;
  if (flag) it[flag] = true;
  return it;
}

// One offer. Everything is derived from `seed`, so the same offer always builds the same interior.
function ms_offer(seed, S, ctx, used) {
  const rng = makeRng(seed);
  const J = {};
  for (const k of MS_SLIDERS) J[k] = clamp(S[k] + rng.r(-0.3, 0.3), -1, 1);
  const g = J.good_bad, hd = J.headon_stealth, oh = J.open_hidden;
  // type mix
  const ex = (v) => Math.max(0.1, v);
  const tt = [
    ['assassinate', ex(1 + 0.7 * g) * ex(1 - 0.6 * hd) * ex(1 - 0.4 * oh)],
    ['retrieve', ex(1 + 0.5 * g) * ex(1 + 0.4 * hd) * ex(1 + 0.5 * oh)],
    ['repair', ex(1 - 0.6 * g) * 0.9],
    ['find', ex(1 - 0.7 * g) * ex(1 + 0.3 * hd) * ex(1 + 0.5 * oh) * 0.9],
    ['deliver', ex(1 - 0.3 * g) * ex(1 + 0.3 * hd) * 0.9],
  ].map((t) => [t[0], t[1] * Math.pow(0.55, used[t[0]] || 0)]);
  const type = ms_wpick(rng, tt);
  // level, size, counts
  const hard = S.easy_hard;
  const lvl = Math.max(1, Math.min(MAX_LEVEL + 4, ctx.lvl + Math.round(hard * 4 + rng.r(-1, 1))));
  const off = lvl - ctx.lvl;
  const ql = clamp(Math.round(lvl * 2.3), 1, 200);
  const size = clamp(Math.round(2 + oh * 1.2 + rng.r(-0.5, 0.5)), 1, 3);
  const nMobs = clamp(Math.round(3 + size * 1.4 + hard * 2.2 - hd * 0.8 + rng.r(-0.8, 0.8)), 4, 14);
  const theme = ms_theme(rng, J);
  const mix = ms_mix(rng, theme, J, lvl);
  const location = ms_location(rng, lvl, ctx.zone);
  const where = rng.pick(MS_THEME_TXT[theme]) + ' in ' + ms_zoneName(location.zone);
  const client = g < -0.2 ? rng.pick(MS_GOOD) : g > 0.2 ? rng.pick(MS_BAD) : rng.pick(MS_GOOD.concat(MS_BAD));
  const tone = rng.pick(MS_FLAVOUR[g < -0.2 ? 'good' : g > 0.2 ? 'bad' : 'neutral']);
  const foes = ms_mixText(mix);
  // target
  const P = ms_person(rng);
  const T = { room: oh > 0.2 || rng.chance(0.5) ? 'far' : 'mid' };
  const f = { name: P.name, first: P.first, last: P.last, rank: rng.pick(MS_RANK), where, client, foes, tone };
  let desc;
  if (type === 'assassinate') {
    const horror = theme === 'lab' && rng.chance(0.4);
    Object.assign(T, { name: P.name, rank: f.rank, mob: horror ? 'lab_horror' : theme === 'cave' && mix[0][0] !== 'merc' && rng.chance(0.4) ? mix[0][0] : 'merc' });
    if (T.mob === 'lab_horror') T.name = 'Subject ' + rng.i(2, 99) + ' "' + P.last + '"';
    f.name = T.name;
    desc = '{client} wants {rank} {name} gone. They are holed up in {where}, behind a screen of {foes}. Kill {name} and the contract is yours. {tone}';
  } else if (type === 'retrieve') {
    const [tid, names] = rng.pick(MS_ITEMS.retrieve);
    const where2 = rng.chance(0.5) ? 'container' : 'guard';
    Object.assign(T, { item: { t: tid, name: rng.pick(names), ql }, where: where2, holder: where2 === 'container' ? rng.pick(MS_CONT[theme]) : P.name, mob: 'merc' });
    f.item = T.item.name; f.holder = T.holder;
    desc = '{client} needs the {item} recovered from {where}. ' + (where2 === 'container' ? 'It is locked inside a {holder}, deep in the building.' : '{holder}, a hired gun, carries it on their person.') + ' Guards: {foes}. {tone}';
  } else if (type === 'repair') {
    Object.assign(T, { obj: rng.pick(MS_CONS[theme]), part: { t: 'key_sample', name: rng.pick(MS_PARTS), ql } });
    f.obj = T.obj; f.part = T.part.name;
    desc = 'The {obj} inside {where} has gone dark and it takes the whole complex with it. Here is a {part}: fit it to the console and hold your ground while it reinitialises. Expect {foes}. {tone}';
  } else if (type === 'find') {
    Object.assign(T, { name: P.name, role: rng.pick(MS_ROLE) });
    f.role = T.role;
    desc = '{name}, a {role}, went into {where} and never came out. Find them and speak to them: {client} just wants proof of life. {foes} are in there too. {tone}';
  } else {
    const [tid, names] = rng.pick(MS_ITEMS.deliver);
    Object.assign(T, { name: P.name, role: rng.pick(MS_ROLE), item: { t: tid, name: rng.pick(names), ql } });
    f.item = T.item.name; f.role = T.role;
    desc = 'Carry this {item} to {name}, a {role} holed up in {where}. Get past {foes} and put it in their hands. {tone}';
  }
  f.place = ms_zoneName(location.zone);
  const title = ms_fmt(rng.pick(MS_TITLES[type]), f);
  // reward: harder missions pay more; credits_xp splits the pot
  const fx = (S.credits_xp + 1) / 2, mul = 1 + 0.08 * off;
  const xpBase = mobXp(lvl) * (2.5 + nMobs * 0.3 + size * 0.8), crBase = (6 + lvl * 4.5) * (1 + lvl * 0.02) * (4 + nMobs * 0.5 + size);
  const prof = ctx.prof;
  const item = ms_rewardItem(rng, clamp(Math.round(ql * (1 + 0.06 * off)), 1, 200), S.physical_mystical, prof);
  return {
    id: 'ms' + seed.toString(36), seed, title, desc: ms_fmt(desc, f), type, ql, lvl, theme, size, nMobs, mix, stealth: hd > 0.2,
    client, reward: { credits: Math.round(crBase * mul * (1.5 - fx)), xp: Math.round(xpBase * mul * (0.5 + fx)), item },
    location, target: T, state: 'offer',
  };
}
function requestMissions(npc, sliders) {
  const S = {};
  for (const k of MS_SLIDERS) S[k] = ms_s1(sliders && sliders[k]);
  const ctx = { lvl: PLAYER ? PLAYER.level : 1, zone: typeof ZONE !== 'undefined' && ZONE ? ZONE.id : 'landfall', prof: PLAYER && PLAYER.char ? PLAYER.char.prof : 'trooper' };
  const rng = makeRng((Math.random() * 4294967296) >>> 0);
  const used = {}, out = [];
  for (let i = 0; i < 5; i++) {
    const o = ms_offer(rng.i(1, 2147483646), S, ctx, used);
    used[o.type] = (used[o.type] || 0) + 1;
    out.push(o);
  }
  return out;
}

// ---------- accept / abandon ----------
function acceptMission(npc, offer) {
  if (!PLAYER || !offer) return { ok: false, msg: 'No mission selected.' };
  const list = ms_list();
  if (ms_active().length >= MS_MAX) return { ok: false, msg: 'You can only carry ' + MS_MAX + ' missions at a time.' };
  if (list.some((m) => m.id === offer.id)) return { ok: false, msg: 'You already have that mission.' };
  const m = JSON.parse(JSON.stringify(offer));
  m.state = 'active'; m.acceptedAt = Date.now(); m.progress = { kills: 0, cleared: false, bonus: false };
  const T = m.target;
  // mission key (the "lure" in the inventory) plus any carried objective item
  const keyName = { assassinate: 'Target Dossier', retrieve: 'Retrieval Order', find: 'Locator Beacon', repair: 'Work Order', deliver: 'Delivery Slip' }[m.type];
  const key = ms_item('key_card', m.ql, keyName + ': ' + m.title, m.id, 'missionKey');
  if (key) addItem(PLAYER, key);
  if (m.type === 'deliver') { const it = ms_item(T.item.t, m.ql, T.item.name, m.id, 'missionItem'); if (it) addItem(PLAYER, it); }
  if (m.type === 'repair') { const it = ms_item(T.part.t, m.ql, T.part.name, m.id, 'missionItem'); if (it) addItem(PLAYER, it); }
  list.push(m);
  ms_say('Mission accepted: ' + m.title + ' (QL ' + m.ql + '). Look for the beacon near ' + ms_zoneName(m.location.zone) + '.', 'info');
  ms_sfx('mission');
  EV.emit('mission', m);
  if (typeof ZONE !== 'undefined' && ZONE && ZONE.id === m.location.zone) ms_entrance(m);
  return m;
}
function ms_dropItems(m) {
  if (!PLAYER) return;
  for (const it of PLAYER.char.inv.slice()) if (it.mission === m.id) removeItem(PLAYER, it);
}
function ms_clearWorld(m) {
  for (const e of ENTS.slice()) if (e.poi && e.poi.data && e.poi.data.mission === m.id && !e.poi.data.obj && e.role === 'door') removeEnt(e);
  for (const b of MS.beacons.slice()) if (b.userData.mid === m.id) { b.parent && b.parent.remove(b); b.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); MS.beacons.splice(MS.beacons.indexOf(b), 1); }
}
function abandonMission(m) {
  if (typeof m === 'string') m = ms_get(m);
  if (!m || !PLAYER) return false;
  const list = ms_list(), i = list.indexOf(m);
  if (i < 0) return false;
  list.splice(i, 1);
  ms_dropItems(m); ms_clearWorld(m);
  if (MS.rep && MS.rep.m === m) MS.rep = null;
  if (MS.cur === m.id) { for (const e of MS.mobs) if (!e.removed) removeEnt(e); for (const e of MS.objs) if (!e.removed) removeEnt(e); MS.mobs = []; MS.objs = []; }
  m.state = 'abandoned';
  ms_say('Mission abandoned: ' + m.title + '.', 'warn');
  EV.emit('mission', m);
  return true;
}

// ---------- completion ----------
function ms_pend(it) { const f = PLAYER.char.flags; (f.msPending = f.msPending || []).push(it); }
function ms_complete(m) {
  if (!PLAYER || m.state !== 'active') return;
  m.state = 'done'; m.doneAt = Date.now();
  const R = m.reward, c = PLAYER.char;
  ms_say('Mission complete: ' + m.title + '!', 'info');
  c.credits += R.credits;
  EV.emit('log', 'You received ' + fmtInt(R.credits) + ' credits.', 'loot');
  ms_sfx('mission_done'); ms_sfx('coin');
  giveXp(PLAYER, R.xp);
  if (R.item) {
    if (addItem(PLAYER, R.item)) { EV.emit('loot', PLAYER, R.item); EV.emit('log', 'Mission reward: ' + R.item.name + ' (QL ' + R.item.ql + ').', 'loot'); }
    else { ms_pend(R.item); EV.emit('log', 'Your inventory is full: ' + R.item.name + ' will be delivered when you make room.', 'warn'); }
  }
  ms_dropItems(m); ms_clearWorld(m);
  if (MS.rep && MS.rep.m === m) MS.rep = null;
  EV.emit('mission', m);
  ms_checkClear(m);
  if (typeof saveGame === 'function') saveGame(true);
}
// Bonus XP for clearing every hostile in the instance (once, after the objective is also done).
function ms_checkClear(m) {
  if (!m || MS.cur !== m.id || m.progress.bonus || !MS.mobs.length) return;
  if (!MS.mobs.every((e) => e.dead || e.removed)) return;
  if (m.state !== 'done') { if (!m.progress.cleared) ms_say('The place is quiet. Finish the job.', 'info'); m.progress.cleared = true; return; }
  m.progress.cleared = true;
  m.progress.bonus = true;
  const x = Math.round(mobXp(m.lvl) * (1 + 0.15 * MS.mobs.length));
  ms_say('Instance cleared: bonus experience.', 'xp');
  giveXp(PLAYER, x);
  EV.emit('mission', m);
}

// ---------- the outside: entrance door and beacon ----------
function ms_beacon(m) {
  const L = m.location, y = groundY(L.x, L.z), h = 90;
  const g = new THREE.Group();
  const mk = (geo, color, op) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
  const col = { assassinate: 0xff5a4a, retrieve: 0xffb347, repair: 0x5fe0d0, find: 0x7dff9a, deliver: 0xc080ff }[m.type] || 0xffb347;
  const beam = mk(new THREE.CylinderGeometry(0.7, 1.4, h, 12, 1, true), col, 0.3); beam.position.y = h / 2;
  const core = mk(new THREE.CylinderGeometry(0.12, 0.2, h, 6, 1, true), 0xffffff, 0.7); core.position.y = h / 2;
  const ring = mk(new THREE.TorusGeometry(2.6, 0.1, 6, 28), col, 0.8); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3;
  g.add(beam, core, ring);
  g.position.set(L.x, y, L.z);
  g.userData = { mid: m.id, ring, beam, t: Math.random() * 6 };
  g.frustumCulled = false;
  ms_par().add(g);
  MS.beacons.push(g);
}
function ms_entrance(m) {
  if (!PLAYER || m.state !== 'active') return;
  const L = m.location;
  if (ENTS.some((e) => !e.removed && e.role === 'door' && e.poi && e.poi.data && e.poi.data.mission === m.id && !e.poi.data.obj)) return;
  spawnNpc({ id: 'ms_door_' + m.id, type: 'door', name: 'Mission: ' + m.title, x: L.x, z: L.z, yaw: L.yaw, data: { mission: m.id } });
  ms_beacon(m);
}
// Map markers for the UI (outdoor entrances of active missions).
function missionMarkers() {
  return ms_active().map((m) => ({ id: m.id, title: m.title, zone: m.location.zone, x: m.location.x, z: m.location.z, type: m.type }));
}
function ms_nearestPoi(zone, x, z) {
  const def = ZONE_DEFS[zone];
  let best = null, bd = 1e9;
  for (const p of (def && def.pois) || []) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p.id; } }
  return best;
}

// ---------- entering the instance ----------
function ms_buildZone(m) {
  const L = m.location;
  const mobs = [];
  for (const p of m.mix) if (!mobs.includes(p[0])) mobs.push(p[0]);
  const def = makeInteriorDef({ id: 'mission', seed: m.seed, theme: m.theme, size: m.size, lvl: m.lvl, mobs, boss: m.type === 'assassinate' ? m.target.mob : null, name: m.title });
  def.id = 'mission'; def.name = m.title; def.kind = 'interior'; def.generated = true; def.safe = false;
  def.lvl = [Math.max(1, m.lvl - 1), m.lvl + 1];
  // we place the inhabitants ourselves
  def.spawns = []; def.exits = [];
  const ret = { x: L.x + Math.sin(L.yaw) * 4, z: L.z + Math.cos(L.yaw) * 4, yaw: L.yaw };
  def.returnTo = { zone: L.zone, poi: ms_nearestPoi(L.zone, L.x, L.z), at: ret };
  // the exit door must come back out beside the entrance
  for (const p of def.pois) if (p.type === 'door') p.data = {};
  registerZone(def);
  MS.ret = def.returnTo;
  return def;
}
function missionDoor(door) {
  if (!PLAYER) return;
  const d = (door && door.poi && door.poi.data) || {};
  if (d.obj) { ms_useObj(door, d); return; }
  if (ZONE.id === 'mission' && !d.mission) {
    const r = MS.ret || ZONE.def.returnTo;
    if (r) travel({ zone: r.zone, at: r.at || r.poi });
    return;
  }
  const m = ms_get(d.mission);
  if (!m || m.state !== 'active') { EV.emit('log', 'This entrance is no longer in use.', 'warn'); return; }
  if (PLAYER.level < Math.max(1, m.lvl - 12)) { EV.emit('log', 'This mission is far above your level.', 'warn'); }
  let def;
  try { def = ms_buildZone(m); } catch (err) { console.error(err); EV.emit('log', 'The way in is blocked (mission generation failed).', 'warn'); return; }
  MS.cur = m.id;
  const arr = def.pois.find((p) => p.type === 'arrive' || p.id === 'arrive' || p.type === 'start');
  ms_say('You enter ' + m.title + '.', 'info');
  changeZone('mission', arr ? arr.id : null);
}

// ---------- the inside: mobs, objectives ----------
function ms_roomPt(room, rng, margin = 1.6) {
  const w = Math.max(2, (room.w || 8) - margin * 2), d = Math.max(2, (room.d || 8) - margin * 2);
  return { x: room.x + rng.r(-0.5, 0.5) * w, z: room.z + rng.r(-0.5, 0.5) * d };
}
function ms_mob(m, tpl, lvl, p, role, o) {
  const e = spawnMob(tpl, Math.max(1, lvl), p.x, p.z, { leash: 40 });
  if (!e) return null;
  e.missionId = m.id; e.missionRole = role;
  if (o) {
    if (o.name) e.name = o.name;
    e.tpl = Object.assign({}, e.tpl, { named: true });
    e.mob.maxHp = Math.round(e.mob.maxHp * (o.hp || 1)); e.mob.xp = Math.round(e.mob.xp * (o.xp || 1));
    e.mob.dmg = e.mob.dmg.map((v) => Math.round(v * (o.dmg || 1)));
    refreshStats(e); e.hp = e.S.maxHp;
    if (e.rig && e.rig.root) e.rig.root.scale.multiplyScalar(o.scale || 1);
  }
  MS.mobs.push(e);
  return e;
}
// A clickable thing in the instance. Role 'door' routes F-presses to missionDoor() without opening any window.
function ms_obj(m, kind, name, p, yaw, extra) {
  const human = kind === 'person';
  const e = spawnNpc({ id: 'ms_obj_' + uid(), type: human ? 'npc' : 'door', name, x: p.x, z: p.z, yaw, data: Object.assign({ mission: m.id, obj: kind }, extra || {}) });
  if (!e) return null;
  e.role = 'door';
  if (!human) {
    e.rig.height = kind === 'container' ? 1.3 : 1.9; e.rig.radius = 0.9;
    ms_decor(e.rig.root, kind, m);
  }
  MS.objs.push(e);
  return e;
}
function ms_decor(root, kind, m) {
  const mat = (c, em) => new THREE.MeshLambertMaterial({ color: c, emissive: em || 0x000000 });
  const col = { assassinate: 0xff5a4a, retrieve: 0xffb347, repair: 0x5fe0d0, find: 0x7dff9a, deliver: 0xc080ff }[m.type] || 0xffb347;
  const add = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); o.castShadow = true; root.add(o); return o; };
  if (kind === 'container') {
    add(new THREE.BoxGeometry(1.5, 0.9, 0.9), mat(0x4a5058), 0, 0.45, 0);
    add(new THREE.BoxGeometry(1.56, 0.12, 0.96), mat(0x2a2e34), 0, 0.92, 0);
    add(new THREE.BoxGeometry(0.28, 0.2, 0.06), mat(col, col), 0, 0.62, 0.48);
  } else {
    add(new THREE.BoxGeometry(1.4, 1.5, 0.7), mat(0x30363e), 0, 0.75, 0);
    add(new THREE.BoxGeometry(1.1, 0.7, 0.06), mat(0x0a1014, 0x0b2a2a), 0, 1.0, 0.38);
    add(new THREE.BoxGeometry(0.9, 0.08, 0.06), mat(col, col), 0, 1.45, 0.38);
    const sp = add(new THREE.BoxGeometry(0.08, 0.08, 0.08), mat(0xffffff, col), 0.45, 1.65, 0.2);
    sp.userData.spark = true;
  }
}
function ms_buildContent() {
  const m = ms_get(MS.cur);
  if (!m || m.state !== 'active') return;
  const def = ZONE.def, rng = makeRng((m.seed ^ 0x9e3779b9) >>> 0), T = m.target;
  const arr = def.pois.find((p) => p.type === 'arrive' || p.id === 'arrive' || p.type === 'start') || { x: 0, z: 0 };
  let rooms = (def.rooms || []).slice();
  if (!rooms.length) for (let i = 0; i < 4; i++) rooms.push({ x: arr.x + 12 * (i + 1), z: arr.z + rng.r(-6, 6), w: 10, d: 10 });
  rooms.sort((a, b) => Math.hypot(a.x - arr.x, a.z - arr.z) - Math.hypot(b.x - arr.x, b.z - arr.z));
  if (rooms.length > 2) rooms.shift();
  const far = T.room === 'far' || rooms.length < 3;
  const trm = far ? rooms[rooms.length - 1] : rooms[Math.floor(rooms.length / 2)];
  const mt = ms_wpick.bind(null, rng, m.mix);
  const lv = () => m.lvl + rng.i(-1, 1);
  // inhabitants: head-on missions clump them into groups, stealth ones spread them thin
  let left = m.nMobs, ri = 0;
  const grp = m.stealth ? 1 : 3;
  while (left > 0) {
    const room = m.stealth ? rooms[ri++ % rooms.length] : rng.chance(0.5) ? rooms[Math.floor(rng.f() * rooms.length)] : rooms[ri++ % rooms.length];
    const k = Math.min(left, grp === 1 ? 1 : rng.i(2, grp));
    for (let i = 0; i < k; i++) ms_mob(m, mt(), lv(), ms_roomPt(room, rng), 'guard');
    left -= k;
  }
  // the objective sits in the target room under a couple of extra guards
  const op = ms_roomPt(trm, rng, 2.5);
  const guards = (n) => { for (let i = 0; i < n; i++) ms_mob(m, mt(), lv() + 1, ms_roomPt(trm, rng), 'guard'); };
  if (m.type === 'assassinate') {
    ms_mob(m, T.mob, m.lvl + 2, op, 'target', { name: T.name, hp: 2.2, dmg: 1.25, xp: 2.5, scale: 1.12 });
    guards(2);
  } else if (m.type === 'retrieve') {
    if (T.where === 'guard') { ms_mob(m, T.mob, m.lvl + 1, op, 'holder', { name: T.holder, hp: 1.8, dmg: 1.15, xp: 2, scale: 1.08 }); guards(1); }
    else { ms_obj(m, 'container', T.holder, op, rng.r(0, TAU)); guards(2); }
  } else if (m.type === 'repair') {
    ms_obj(m, 'console', T.obj, op, rng.r(0, TAU)); guards(3);
  } else {
    ms_obj(m, 'person', T.name, op, rng.r(0, TAU), { role: T.role }); guards(2);
  }
  ms_say('Objective: ' + ms_objective(m), 'info');
}
function ms_objective(m) {
  const T = m.target;
  switch (m.type) {
    case 'assassinate': return 'kill ' + T.name + '.';
    case 'retrieve': return 'recover the ' + T.item.name + (T.where === 'guard' ? ' from ' + T.holder + '.' : ' from the ' + T.holder + '.');
    case 'repair': return 'fit the ' + T.part.name + ' to the ' + T.obj + '.';
    case 'find': return 'find and speak to ' + T.name + '.';
    default: return 'deliver the ' + T.item.name + ' to ' + T.name + '.';
  }
}
function ms_useObj(ent, d) {
  const m = ms_get(d.mission), T = m && m.target;
  if (!m || m.state !== 'active') { EV.emit('log', 'There is nothing more to do here.', 'info'); return; }
  const say = (t) => EV.emit('chat', 'vicinity', ent.name, t);
  if (d.obj === 'container') {
    if (d.used) { EV.emit('log', 'It is empty.', 'info'); return; }
    d.used = true;
    const it = ms_item(T.item.t, m.ql, T.item.name, m.id, 'missionItem');
    if (it) addItem(PLAYER, it);
    ms_sfx('loot');
    ms_say('You crack the ' + ent.name + ' and take the ' + T.item.name + '.', 'loot');
    ms_complete(m);
  } else if (d.obj === 'console') {
    if (MS.rep) { EV.emit('log', 'You are already working on it.', 'warn'); return; }
    const part = PLAYER.char.inv.find((i) => i.mission === m.id && i.missionItem);
    if (!part) { EV.emit('log', 'The ' + ent.name + ' is dead. It needs a ' + T.part.name + '.', 'warn'); return; }
    MS.rep = { m, ent, part, t: 0, total: 4 + Math.min(4, m.lvl * 0.06) };
    ms_say('You fit the ' + part.name + ' and start the reinitialisation. Stay close.', 'info');
    ms_sfx('cast_start');
  } else if (d.obj === 'person') {
    if (m.type === 'find') {
      say(ms_line(m.seed, ['Is it over? Tell them I am alive.', 'You came all this way for me? Thank the Concord.', 'I held out. I knew somebody would come.']));
      ms_complete(m);
    } else {
      const it = PLAYER.char.inv.find((i) => i.mission === m.id && i.missionItem);
      if (!it) { say('You were supposed to bring me something.'); return; }
      removeItem(PLAYER, it);
      say(ms_line(m.seed, ['At last. This is exactly what I was waiting for.', 'You carried it all the way in here? You have my thanks.', 'Good. Now go, before the guards regroup.']));
      ms_complete(m);
    }
  }
}
function ms_line(seed, a) { return a[(seed >>> 3) % a.length]; }

EV.on('kill', (killer, victim) => {
  if (!victim || !victim.missionId || !PLAYER) return;
  const m = ms_get(victim.missionId);
  if (!m || m.state !== 'active') return;
  if (victim.missionRole === 'target') { ms_say(victim.name + ' is dead.', 'info'); ms_complete(m); }
  else if (victim.missionRole === 'holder') {
    const it = ms_item(m.target.item.t, m.ql, m.target.item.name, m.id, 'missionItem');
    if (it) addItem(PLAYER, it);
    ms_say('You take the ' + m.target.item.name + ' from ' + victim.name + '.', 'loot');
    ms_complete(m);
  }
});

// ---------- zone hook ----------
function missionZoneChanged(zoneId, prevZoneId) {
  MS.mobs = []; MS.objs = []; MS.rep = null;
  MS.beacons = MS.beacons.filter((b) => b.parent);
  ms_dlgClose();
  if (!PLAYER) return;
  ms_qZone(zoneId);
  if (zoneId === 'mission') { ms_buildContent(); return; }
  MS.cur = null;
  for (const m of ms_active()) if (m.location.zone === zoneId) ms_entrance(m);
}

// ---------- per-frame ----------
function missionTick(dt) {
  if (!PLAYER || !PLAYER.char) return;
  MS.t += dt;
  for (const b of MS.beacons) {
    const u = b.userData;
    u.t += dt;
    u.ring.rotation.z += dt * 1.5;
    u.ring.scale.setScalar(1 + 0.08 * Math.sin(u.t * 3));
    u.beam.material.opacity = 0.26 + 0.08 * Math.sin(u.t * 2);
  }
  // repair channel
  const R = MS.rep;
  if (R) {
    if (PLAYER.dead || R.ent.removed || Math.hypot(PLAYER.pos.x - R.ent.pos.x, PLAYER.pos.z - R.ent.pos.z) > 7.5) {
      MS.rep = null; EV.emit('log', 'You stepped away. The repair was interrupted.', 'warn');
    } else if ((R.t += dt) >= R.total) {
      MS.rep = null;
      removeItem(PLAYER, R.part);
      ms_say('The ' + R.ent.name + ' hums back to life.', 'info');
      ms_complete(R.m);
    }
  }
  if (MS.t - (MS.clearT || 0) > 0.5) {
    MS.clearT = MS.t;
    const m = ms_get(MS.cur);
    if (m && ZONE.id === 'mission') ms_checkClear(m);
    ms_qPoll();
  }
  if (MS.t - MS.flushT > 3) {
    MS.flushT = MS.t;
    // purge finished missions after a short while, deliver rewards that did not fit earlier
    const l = ms_list();
    for (let i = l.length - 1; i >= 0; i--) if (l[i].state === 'done' && Date.now() - (l[i].doneAt || 0) > 30000) l.splice(i, 1);
    const pend = PLAYER.char.flags.msPending;
    if (pend && pend.length && PLAYER.char.inv.length < INV_MAX && addItem(PLAYER, pend[0])) { EV.emit('log', 'Mission reward delivered: ' + pend[0].name + '.', 'loot'); pend.shift(); }
    if (MS.dlg && MS.dlgNpc && Math.hypot(PLAYER.pos.x - MS.dlgNpc.pos.x, PLAYER.pos.z - MS.dlgNpc.pos.z) > 10) ms_dlgClose();
  }
}

// ======================================================================================
// Starter quests on Landfall Isle
// ======================================================================================
const MS_QUESTS = [
  { id: 'pest', title: 'Pest Control', pat: /recruit|officer|sergeant|instruct/i, kind: 'kill', mob: 'chitterling', need: 6, what: 'chitterlings',
    offer: 'Welcome to Landfall. Before the Concord clears you for the mainland there is a small matter: chitterlings have been chewing through the cable runs along the beach. Put six of them down and I will see you supplied.',
    prog: 'Six chitterlings. They are the little chirping ones on the sand. Click one or press Tab to target it, then press the backquote key to start your attack.',
    done: 'Tidy work. Here are a few field medkits. Use them from your inventory when a fight turns against you.',
    rew: { xp: 8, credits: 40, items: [['health_kit', 6, 3]] } },
  { id: 'contract', title: 'First Contract', pat: /broker|clerk|dispatch|terminal|mission/i, kind: 'mission', need: 1, what: 'mission',
    offer: 'Everybody out here lives on contracts. Use the mission terminal in the shuttleport: set the sliders to what you fancy, take one of the five offers, follow the beacon to its door and finish the job. Come back when you have done one.',
    prog: 'Open the mission terminal, pick an offer and accept it. A beacon will show where the door is. Easy settings are kind to new arrivals.',
    done: 'You came back in one piece, that is the first test passed. This one is on the house.',
    rew: { xp: 6, credits: 80, weapon: 12 } },
  { id: 'kit', title: 'Know Your Kit', pat: /quartermaster|armou?rer|trainer|supply/i, kind: 'gear', need: 1, what: 'gear',
    offer: 'A fighter who never opens her pack is just a tourist. Equip something from your inventory, and spend those improvement points (open the Character window with C) on your skills. Then come and see me.',
    prog: 'Open your inventory (I) and double-click a weapon or armour piece, then open the Character window (C) and raise a skill or ability with the + buttons.',
    done: 'Now you look like somebody worth shooting at. Take this for the road.',
    rew: { xp: 6, credits: 150 } },
  { id: 'halden', title: 'Halden Bound', pat: /pilot|captain|dock|harbo|ferry|shuttle/i, kind: 'zone', zone: 'halden', need: 1, what: 'journey',
    offer: 'You are ready for the mainland. Take the shuttle at the end of the pier to Halden Crossing: a Concord city, safe ground, with shops, clone bays and plenty of contracts. I have wired some credits to your account for the fare.',
    prog: 'Board the shuttle at the end of the pier and choose Halden Crossing.',
    done: 'Welcome to Halden Crossing. Browse the shops, find a mission terminal and check the Hopper pad when you are ready to see more of Ashreach.',
    adv: { credits: 150 }, rew: { xp: 10, credits: 100, items: [['nano_kit', 8, 2]] } },
];
const MS_RUMOURS = [
  'They say the Scar glows brighter every winter. Nobody who goes there comes back with the same eyes.',
  'Meridian says the ceasefire is holding. Meridian also says the lumen is running out. Both cannot be true.',
  'Keep a medkit on you. The Concord clone bays are fair, but nobody enjoys waking up in one.',
  'Contracts pay better the deeper you go. So do funerals.',
  'The Freeholds are not all bandits, whatever the posters say. Some of them even pay on time.',
  'If a Dust Raider offers to sell you a map, buy the map. Then check which direction it is pointing.',
];
function ms_qs() { const f = PLAYER.char.flags; return f.quests || (f.quests = {}); }
// Landfall NPCs that can give starter quests (faction recruiters keep their own UI)
function ms_landfallNpcs() { const d = typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS.landfall; return d ? (d.pois || []).filter((p) => p.type === 'npc' && p.role !== 'faction') : []; }
// Which landfall NPC gives quest `i`: first name match among the NPCs, otherwise spread them round-robin.
let ms_gv = null;
function ms_giver(i) {
  const npcs = ms_landfallNpcs();
  if (!npcs.length) return null;
  if (!ms_gv || ms_gv.n !== npcs.length) {
    const taken = [];
    ms_gv = { n: npcs.length, a: MS_QUESTS.map((q, j) => { const p = npcs.find((o) => o.data && o.data.quest === q.id) || npcs.find((o) => q.pat.test(o.name || '') && !taken.includes(o.id)) || npcs[j % npcs.length]; taken.push(p.id); return p; }) };
  }
  return ms_gv.a[i];
}
function ms_qSig() { const e = PLAYER.char.equip; return Object.keys(e).filter((k) => e[k]).map((k) => k + e[k].uid).join(','); }
function ms_qSpent() { const c = PLAYER.char; let n = 0; for (const k in c.abil) n += c.abil[k] || 0; for (const k in c.skill) n += c.skill[k] || 0; return n; }
function ms_qCount(i) { return MS_QUESTS[i].kind === 'gear' ? 1 : MS_QUESTS[i].need; }
function questList() {
  if (!PLAYER) return [];
  const Q = ms_qs();
  return MS_QUESTS.map((q, i) => ({ id: q.id, title: q.title, state: (Q[q.id] && Q[q.id].s) || 'new', n: (Q[q.id] && Q[q.id].n) || 0, need: q.need, text: q.what, giver: (ms_giver(i) || {}).name || '' }));
}
function ms_qAvail(i) { const Q = ms_qs(); return !Q[MS_QUESTS[i].id] && (i === 0 || (Q[MS_QUESTS[i - 1].id] && Q[MS_QUESTS[i - 1].id].s === 'done')); }
function ms_qGrant(r, label) {
  const c = PLAYER.char;
  if (r.credits) { c.credits += r.credits; EV.emit('log', 'You received ' + fmtInt(r.credits) + ' credits.', 'loot'); ms_sfx('coin'); }
  if (r.xp) giveXp(PLAYER, Math.round(mobXp(PLAYER.level) * r.xp));
  const give = (it) => { if (it && addItem(PLAYER, it)) { EV.emit('loot', PLAYER, it); EV.emit('log', 'You received ' + it.name + '.', 'loot'); } else if (it) ms_pend(it); };
  for (const [id, ql, n] of r.items || []) {
    const it = makeItem(id, ql);
    if (!it) continue;
    const t = ITEM_T[id];
    if (n > 1 && t && (t.maxStack || 1) >= n) { it.stack = n; give(it); } else { give(it); for (let k = 1; k < (n || 1); k++) give(makeItem(id, ql)); }
  }
  if (r.weapon) {
    const sk = PROFS[c.prof] && PROFS[c.prof].weapon;
    let id = sk && IT_BY_SKILL[sk] ? it_pickT(makeRng(strSeed(c.name)), IT_BY_SKILL[sk], r.weapon) : null;
    if (!id) id = IT_BY_KIND.weapon[0];
    give(makeItem(id, r.weapon));
  }
}
function ms_qAccept(i) {
  const q = MS_QUESTS[i], Q = ms_qs();
  if (!ms_qAvail(i)) return false;
  Q[q.id] = { s: 'active', n: 0, sig: ms_qSig(), sp: ms_qSpent(), eq: false, ip: false };
  ms_say('Quest accepted: ' + q.title + '.', 'info');
  if (q.adv) ms_qGrant(q.adv);
  ms_sfx('mission');
  EV.emit('quest', q.id, 'active');
  if (q.kind === 'zone' && ZONE.id === q.zone) ms_qReady(i);
  return true;
}
function ms_qReady(i) {
  const q = MS_QUESTS[i], st = ms_qs()[q.id];
  if (!st || st.s !== 'active') return;
  st.s = 'ready';
  EV.emit('quest', q.id, 'ready');
  if (q.kind === 'zone') { ms_qComplete(i); return; }
  const g = ms_giver(i);
  ms_say('Quest objective complete: ' + q.title + '. Return to ' + (g ? g.name : 'the quest giver') + '.', 'info');
  ms_sfx('mission');
}
function ms_qComplete(i) {
  const q = MS_QUESTS[i], st = ms_qs()[q.id];
  if (!st || st.s !== 'ready') return false;
  st.s = 'done';
  ms_say('Quest complete: ' + q.title + '!', 'info');
  ms_sfx('mission_done');
  ms_qGrant(q.rew);
  EV.emit('quest', q.id, 'done');
  if (typeof saveGame === 'function') saveGame(true);
  return true;
}
function ms_qBump(kind, fn) {
  const Q = ms_qs();
  MS_QUESTS.forEach((q, i) => {
    const st = Q[q.id];
    if (!st || st.s !== 'active' || q.kind !== kind || (fn && !fn(q))) return;
    st.n = (st.n || 0) + 1;
    if (st.n >= q.need) ms_qReady(i);
    else EV.emit('log', q.title + ': ' + st.n + ' / ' + q.need + ' ' + q.what + '.', 'info');
  });
}
function ms_qZone(zoneId) {
  const Q = ms_qs();
  MS_QUESTS.forEach((q, i) => { if (q.kind === 'zone' && q.zone === zoneId && Q[q.id] && Q[q.id].s === 'active') ms_qReady(i); });
}
function ms_qPoll() {
  const Q = ms_qs();
  MS_QUESTS.forEach((q, i) => {
    const st = Q[q.id];
    if (!st || st.s !== 'active' || q.kind !== 'gear') return;
    if (!st.eq && ms_qSig() !== st.sig && Object.values(PLAYER.char.equip).some(Boolean)) st.eq = true;
    if (!st.ip && ms_qSpent() > st.sp) st.ip = true;
    if (st.eq && st.ip) ms_qReady(i);
  });
}
EV.on('kill', (killer, victim) => {
  if (!PLAYER || !victim || victim.kind !== 'mob' || !victim.tplId) return;
  const k = killer && (killer.kind === 'pet' ? killer.owner : killer);
  if (k !== PLAYER && !(k && k.team && k.team === PLAYER.team)) return;
  ms_qBump('kill', (q) => q.mob === victim.tplId);
});
EV.on('mission', (m) => { if (PLAYER && m && m.state === 'done' && m.type) ms_qBump('mission'); });

// ---------- NPC dialog ----------
function ms_dlgClose() {
  if (MS.dlg) { MS.dlg.remove(); MS.dlg = null; MS.dlgNpc = null; }
}
function ms_npcQuest(npc) {
  if (!PLAYER || !npc || !npc.poi) return -1;
  const Q = ms_qs();
  for (let i = 0; i < MS_QUESTS.length; i++) {
    const st = Q[MS_QUESTS[i].id], g = ms_giver(i);
    if (!g || g.id !== npc.poi.id) continue;
    if (st && st.s !== 'done') return i;
    if (!st && ms_qAvail(i)) return i;
  }
  return -1;
}
function questDialog(npc) {
  const root = typeof document !== 'undefined' && document.getElementById('ui');
  if (!root || !PLAYER) return;
  ms_dlgClose();
  MS.dlgNpc = npc;
  const el = document.createElement('div');
  el.className = 'win pnl'; el.id = 'win-quest';
  el.style.cssText = 'left:calc(50% - 200px);top:90px;width:400px;z-index:900;';
  root.appendChild(el);
  MS.dlg = el;
  ms_dlgDraw(npc);
}
function ms_dlgDraw(npc) {
  const el = MS.dlg;
  if (!el) return;
  const i = ms_npcQuest(npc), q = i >= 0 ? MS_QUESTS[i] : null, st = q && ms_qs()[q.id];
  let text, obj = '', btns = '';
  if (q && !st) { text = q.offer; btns = '<button class="btn pri" data-a="acc">Accept</button>'; obj = '<div class="hd">Objective</div><div>' + ms_qObj(q, null) + '</div>' + ms_qRew(q); }
  else if (q && st.s === 'active') { text = q.prog; obj = '<div class="hd">Objective</div><div>' + ms_qObj(q, st) + '</div>' + ms_qRew(q); }
  else if (q && st.s === 'ready') { text = q.done; btns = '<button class="btn pri" data-a="done">Complete</button>'; obj = '<div class="hd">Objective</div><div class="grn">Done: ' + ms_qObj(q, st) + '</div>' + ms_qRew(q); }
  else text = (npc.poi && (npc.poi.text || (npc.poi.data && npc.poi.data.text))) || MS_RUMOURS[strSeed(npc.name || '') % MS_RUMOURS.length];
  el.innerHTML = '<div class="wt"><span>' + esc(npc.name) + '</span><button class="wx" title="Close">×</button></div>' +
    '<div class="wb" style="line-height:1.45;user-select:none">' + (q ? '<div class="hd">' + esc(q.title) + '</div>' : '') +
    '<div style="margin-bottom:6px">' + esc(text) + '</div>' + obj + '</div>' +
    '<div class="wf">' + btns + '<span class="sp"></span><button class="btn" data-a="x">Close</button></div>';
  el.querySelector('.wx').onclick = ms_dlgClose;
  for (const b of el.querySelectorAll('[data-a]')) {
    b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'x') ms_dlgClose();
      else if (a === 'acc') { ms_qAccept(i); ms_dlgDraw(npc); }
      else if (a === 'done') { ms_qComplete(i); ms_dlgDraw(npc); }
    };
  }
}
function ms_qObj(q, st) {
  const n = st ? st.n || 0 : 0;
  switch (q.kind) {
    case 'kill': return 'Kill ' + q.need + ' ' + q.what + ' (' + Math.min(n, q.need) + ' / ' + q.need + ')';
    case 'mission': return 'Complete one mission from a mission terminal' + (st && st.s === 'ready' ? ' (1 / 1)' : ' (0 / 1)');
    case 'gear': return 'Equip an item ' + (st && st.eq ? '(done)' : '') + ' and spend improvement points ' + (st && st.ip ? '(done)' : '');
    default: return 'Take the shuttle to ' + ms_zoneName(q.zone);
  }
}
function ms_qRew(q) {
  const r = q.rew, bits = [];
  if (q.adv && q.adv.credits) bits.push(q.adv.credits + ' cr now');
  if (r.credits) bits.push(r.credits + ' cr');
  if (r.xp) bits.push('experience');
  for (const it of r.items || []) bits.push((it[2] > 1 ? it[2] + ' x ' : '') + (ITEM_T[it[0]] ? ITEM_T[it[0]].name : it[0]));
  if (r.weapon) bits.push('a weapon for your profession');
  return '<div class="hd">Reward</div><div class="amb">' + esc(bits.join(', ')) + '</div>';
}
EV.on('interact', (npc) => {
  if (!npc || npc.role !== 'npc' || (npc.poi && npc.poi.role === 'faction')) return;
  // the generic UI 'npc' window may also have opened; our dialog replaces it
  setTimeout(() => { if (typeof uiClose === 'function') uiClose('npc'); questDialog(npc); }, 0);
});
EV.on('zone', () => ms_dlgClose());
if (typeof addEventListener === 'function') addEventListener('keydown', (ev) => { if (ev.code === 'Escape' && MS.dlg) { ev.stopImmediatePropagation(); ms_dlgClose(); } }, true);
