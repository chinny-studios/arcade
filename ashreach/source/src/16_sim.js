// Ashreach — simulated players: a persistent population that levels, travels, hunts, teams, trades, chats and fights over the Lumen Scar pylons

// Everything private is prefixed sm_. Public: simStart, simStop, simTick, simUpdate, simDeadUpdate, simZoneChanged,
// simTravellers, simSaveState, simChatCommand, teamInvite, teamLeave, teamKick, teamAccept, teamDecline, simList, simPylons.

// ---------- tables ----------
const SM_SEED = 0x51a7e5;
const SM_N = 150;
const sm_rnd = () => Math.random();
const sm_pick = (a) => a[Math.floor(Math.random() * a.length)];
const sm_chance = (p) => Math.random() < p;
function sm_wpick(opts, f = Math.random) {
  let s = 0;
  for (const o of opts) s += o[1];
  let r = f() * s;
  for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
  return opts.length ? opts[opts.length - 1][0] : null;
}

const SM = {
  on: false, pop: [], ents: [], teams: [], q: [], t: 0, frame: 0, zones: [], cap: [12, 25], target: 18, hash: 0,
  T: {}, pylons: {}, push: {}, invite: null, follow: null, recent: [], lastPC: '', lastPCt: -9, warned: 0, resOn: false,
};
const SM_PROF_SHORT = { trooper: 'trooper', bruiser: 'bruiser', medic: 'medic', mechanist: 'mech', runner: 'runner', nanoshaper: 'shaper', psion: 'psion', martialist: 'martialist', infiltrator: 'infil', wayfarer: 'wayfarer', broker: 'broker', executive: 'exec', warden: 'warden', wraith: 'wraith' };
const SM_HEALER = { medic: 1, wayfarer: 0.5, martialist: 0.3, warden: 0.5, runner: 0.4, psion: 0.3 };
const SM_CASTER = { nanoshaper: 1, psion: 0.8, executive: 0.7, medic: 0.5, broker: 0.6, mechanist: 0.5 };
const SM_TANK = { bruiser: 1, warden: 1, trooper: 0.6, martialist: 0.4 };
const SM_ROLE = { trooper: 'dps', bruiser: 'tank', medic: 'heal', mechanist: 'pet', runner: 'dps', nanoshaper: 'nuke', psion: 'pet', martialist: 'dps', infiltrator: 'dps', wayfarer: 'dps', broker: 'debuff', executive: 'cc', warden: 'tank', wraith: 'dps' };
const SM_BREED_PREF = {
  trooper: { baseline: 3, kestrel: 2, savant: 1, bulwark: 3 }, bruiser: { baseline: 2, kestrel: 1, savant: 0.3, bulwark: 5 },
  medic: { baseline: 3, kestrel: 1, savant: 4, bulwark: 0.5 }, mechanist: { baseline: 3, kestrel: 1, savant: 3, bulwark: 1 },
  runner: { baseline: 2, kestrel: 5, savant: 1, bulwark: 0.5 }, nanoshaper: { baseline: 2, kestrel: 0.5, savant: 6, bulwark: 0.2 },
  psion: { baseline: 2, kestrel: 0.5, savant: 5, bulwark: 0.3 }, martialist: { baseline: 3, kestrel: 4, savant: 0.5, bulwark: 2 },
  infiltrator: { baseline: 2, kestrel: 5, savant: 1, bulwark: 0.5 }, wayfarer: { baseline: 3, kestrel: 3, savant: 2, bulwark: 1 },
  broker: { baseline: 3, kestrel: 2, savant: 3, bulwark: 1 }, executive: { baseline: 3, kestrel: 1, savant: 4, bulwark: 0.5 },
  warden: { baseline: 3, kestrel: 1, savant: 0.5, bulwark: 4 }, wraith: { baseline: 2, kestrel: 5, savant: 1, bulwark: 1 },
};
// weapon skill -> the special-attack skills worth raising alongside it
const SM_WSPEC = { assault_rifle: ['burst', 'full_auto'], smg: ['full_auto', 'burst'], rifle: ['aimed_shot'], pistol: ['quick_shot'], shotgun: ['quick_shot'], martial_arts: ['brawl', 'pressure_pt', 'fast_attack'], blunt2h: ['brawl', 'fast_attack'], edged2h: ['fast_attack'], piercing: ['sneak_attack', 'fast_attack'], edged1h: ['fast_attack'], blunt1h: ['fast_attack'], bow: ['aimed_shot'] };
const SM_ASLOTS = [['head', ['head']], ['back', ['back']], ['shoulder', ['lshoulder', 'rshoulder']], ['chest', ['chest']], ['arm', ['larm', 'rarm']], ['wrist', ['lwrist', 'rwrist']], ['hands', ['hands']], ['legs', ['legs']], ['feet', ['feet']]];
const SM_ZFB = { landfall: ['Landfall Isle', [1, 10], 'island'], smugglers_den: ["Smuggler's Den", [6, 11], 'interior'], halden: ['Halden Crossing', null, 'city'], dustbowl: ['Dustbowl Flats', [5, 20], 'outdoor'], greenhollow: ['Greenhollow', [15, 30], 'outdoor'], broken_mesa: ['Broken Mesa', [25, 40], 'outdoor'], sunken_foundry: ['Sunken Foundry', [30, 46], 'interior'], lumen_scar: ['Lumen Scar', [35, 50], 'outdoor'] };
const SM_FAC = { meridian: 'Meridian', freehold: 'Freehold', unaligned: 'Unaligned' };

// ---------- names & looks ----------
const SM_FIRST = ['Kaylen', 'Mara', 'Dorian', 'Juno', 'Talia', 'Rook', 'Sable', 'Iven', 'Petra', 'Cass', 'Orrin', 'Lio', 'Nadia', 'Bram', 'Esme', 'Tobin', 'Wren', 'Yara', 'Corin', 'Halle', 'Jaxon', 'Mirelle', 'Sully', 'Anouk', 'Dax', 'Ilsa', 'Ronan', 'Theda', 'Vik', 'Zora', 'Emrys', 'Kit', 'Leda', 'Marek', 'Oona', 'Pax', 'Quill', 'Rhea', 'Soren', 'Tamsin', 'Ulric', 'Vesna', 'Wade', 'Xenia', 'Yusuf', 'Ziva', 'Abel', 'Brisa', 'Calder', 'Della'];
const SM_LAST = ['Voss', 'Harrow', 'Quell', 'Marchetti', 'Okonjo', 'Lindqvist', 'Reyes', 'Castellan', 'Drummond', 'Ibarra', 'Kestner', 'Morrow', 'Nakamura', 'Ostrova', 'Pellam', 'Rask', 'Szabo', 'Thorne', 'Underwood', 'Varn', 'Whitlock', 'Yarrow', 'Achterberg', 'Brightwater', 'Calloway', 'Delacroix', 'Ferro', 'Grimaldi', 'Holt', 'Ivers', 'Jansen', 'Koval', 'Lark', 'Mbeki', 'Novak', 'Orsini', 'Penhallow', 'Rourke', 'Sandoval', 'Tiernan'];
const SM_HA = ['Dusk', 'Neon', 'Iron', 'Void', 'Rust', 'Ember', 'Static', 'Glitch', 'Frost', 'Hex', 'Pixel', 'Night', 'Storm', 'Grim', 'Chrome', 'Tox', 'Blaze', 'Shadow', 'Rogue', 'Nova', 'Vex', 'Cinder', 'Echo', 'Scrap', 'Turbo', 'Mega', 'Hyper', 'Crit', 'Dust', 'Basalt', 'Lumen', 'Quantum', 'Zero', 'Toxic', 'Silent', 'Lucky', 'Salty', 'Sneaky', 'Cosmic', 'Feral'];
const SM_HB = ['Runner', 'Blade', 'Wolf', 'Fang', 'Shot', 'Fist', 'Heart', 'Walker', 'Hawk', 'Byte', 'Knight', 'Rider', 'Jack', 'Spark', 'Lord', 'Queen', 'Doc', 'Bolt', 'Strike', 'Reaper', 'Pilot', 'Monk', 'Fox', 'Viper', 'Ghost', 'Crow', 'Smith', 'Hound', 'Tank', 'Witch'];
const SM_FIXED = ['Medibot9000', 'Tankgirl', 'Zephyrine', 'Healsonwheels', 'Pewpewpew', 'Lootgoblin', 'Notanalt', 'Grandmapwns', 'Bubblewrap', 'Captainobvious', 'Shootfirst', 'Mrsfixit', 'Toastybuns', 'Sneakypete', 'Nanoboi', 'Healbot', 'Ohnoesdead', 'Sirlagsalot', 'Crittercritic', 'Basaltbetty', 'Dustbunny', 'Chitterchaser', 'Kiteflyer', 'Pylonpusher', 'Afkinhalden', 'Ihaznanos', 'Buffmepls', 'Notadoctor', 'Rezzyrae', 'Bonkbruiser'];
const SM_SY1 = ['Ze', 'Ka', 'Ly', 'Mor', 'Tha', 'Vel', 'Ri', 'Ae', 'Syl', 'Qua', 'Or', 'Bel', 'Xan', 'Ny', 'Cae', 'Iri', 'Sel', 'Va', 'Elo', 'Dra', 'Fae', 'Gwe', 'Ish', 'Jo', 'Kri', 'Mi', 'Nai', 'Oph', 'Pyr', 'Rhy'];
const SM_SY2 = ['phy', 'la', 'ri', 'ven', 'do', 'ra', 'the', 'li', 'mi', 'sa', 'ro', '', '', 'na', 'ly', 'ze', 'ca'];
const SM_SY3 = ['rine', 'ra', 'nyx', 'wyn', 'dra', 'el', 'os', 'ix', 'ia', 'ane', 'eth', 'or', 'ith', 'ys', 'ael', 'ona', 'ika', 'ius', 'enne', 'ara'];
const SM_SKIN = [0xf1d0b0, 0xe0b48c, 0xc89a76, 0xa8754e, 0x8a5a3a, 0x6a4028, 0x4a2c1c, 0xd8b8a0];
const SM_HAIR = [0x1a1410, 0x3a2a1c, 0x6a4a2a, 0xa07040, 0xd8b070, 0xe8e0d0, 0x9a3020, 0x404850, 0x5fe0d0, 0xc060c0, 0x80a0ff];
const SM_COL = { meridian: [0x2f4f7f, 0x4a6fa5, 0xd8dde4, 0x1e2a3a, 0x7a90b0], freehold: [0x8a4a2a, 0xb06a30, 0x5a4030, 0x6a7040, 0xc8a070], unaligned: [0x5a5a50, 0x7a6a50, 0x3a4a4a, 0x8a8a7a, 0x4a3a5a, 0x2a2a2a] };

function sm_genName(R) {
  const r = R.f();
  if (r < 0.22) return R.pick(SM_FIRST) + ' ' + R.pick(SM_LAST);
  if (r < 0.34) return R.pick(SM_FIXED);
  if (r < 0.66) {
    const a = R.pick(SM_HA), b = R.pick(SM_HB), v = R.f();
    if (v < 0.35) return a + b;
    if (v < 0.55) return a + b.toLowerCase();
    if (v < 0.65) return 'xX' + a + b + 'Xx';
    if (v < 0.8) return a + b + R.i(2, 99);
    if (v < 0.88) return a + '_' + b;
    if (v < 0.94) return 'Lil' + a;
    return 'The' + a + b;
  }
  const n = R.pick(SM_SY1) + R.pick(SM_SY2) + R.pick(SM_SY3);
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}
function sm_genLook(R, faction) {
  const pal = SM_COL[faction] || SM_COL.unaligned;
  return { skin: R.pick(SM_SKIN), hair: R.pick(SM_HAIR), hairStyle: R.i(0, 4), height: Math.round(R.r(0.93, 1.07) * 100) / 100, primary: R.pick(pal), secondary: R.pick(SM_COL.unaligned.concat(pal)) };
}
function sm_genPop() {
  const R = makeRng(SM_SEED), used = new Set(), pop = [];
  const profs = Object.keys(PROFS), breeds = Object.keys(BREEDS);
  for (let i = 0; i < SM_N; i++) {
    let name = '';
    for (let k = 0; k < 60; k++) { name = sm_genName(R); if (!used.has(name.toLowerCase()) && name.length <= 18) break; }
    used.add(name.toLowerCase());
    const prof = R.pick(profs), bw = SM_BREED_PREF[prof] || {};
    const breed = sm_wpick(breeds.map((b) => [b, bw[b] == null ? 1 : bw[b]]), R.f);
    const level = 1 + Math.floor(49 * Math.pow(R.f(), 1.75));
    const fr = R.f(), faction = fr < 0.4 ? 'meridian' : fr < 0.8 ? 'freehold' : 'unaligned';
    let pers = R.pick(['chatty', 'chatty', 'quiet', 'quiet', 'helpful', 'trader', 'roleplayer', 'grumpy']);
    if (level < 12 && R.chance(0.45)) pers = 'newbie';
    pop.push({ i, name, prof, breed, level, xp: R.f(), faction, sex: R.chance(0.5) ? 'f' : 'm', pers, look: sm_genLook(R, faction), seed: strSeed(name), zone: null, home: null, ent: null, char: null, casual: R.chance(0.6), pvpP: R.f() });
  }
  return pop;
}

// ---------- zones ----------
function sm_defs() { return typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS ? ZONE_DEFS : {}; }
function sm_zone() { return typeof ZONE !== 'undefined' && ZONE && ZONE.def ? ZONE : null; }
function sm_zoneList() {
  const D = sm_defs(), out = [];
  for (const id in D) { const d = D[id]; if (!d || d.generated || id === 'mission') continue; out.push({ id, name: d.name || id, lvl: d.lvl || null, kind: d.kind || 'outdoor' }); }
  if (!out.length) for (const id in SM_ZFB) out.push({ id, name: SM_ZFB[id][0], lvl: SM_ZFB[id][1], kind: SM_ZFB[id][2] });
  return out;
}
function sm_zname(id) { const d = sm_defs()[id]; return (d && d.name) || (SM_ZFB[id] && SM_ZFB[id][0]) || id; }
function sm_zinfo(id) { return SM.zones.find((z) => z.id === id) || null; }
function sm_city() { const c = SM.zones.find((z) => z.kind === 'city'); return c ? c.id : 'halden'; }
function sm_isPvp(id) { const d = sm_defs()[id]; return !!(d && d.pvp) || id === 'lumen_scar'; }
function sm_fits(level, z, slack = 2) { return !!(z && z.lvl) && z.kind !== 'city' && level >= z.lvl[0] - slack && level <= z.lvl[1] + slack; }
function sm_fitsZone(rec, id) { const z = sm_zinfo(id); if (!z) return false; return z.kind === 'city' || (!!z.lvl && rec.level >= z.lvl[0] - 1 && rec.level <= z.lvl[1] + 3); }
// Where would this sim go next? cityW weights a trip to the city.
function sm_pickZone(rec, cityW = 0.35, f = Math.random) {
  const opts = [];
  for (const z of SM.zones) {
    let w = 0;
    if (z.kind === 'city') w = cityW;
    else if (sm_fits(rec.level, z, 1)) {
      const mid = (z.lvl[0] + z.lvl[1]) / 2, span = (z.lvl[1] - z.lvl[0]) / 2 + 3;
      w = 1.2 - Math.min(1, Math.abs(rec.level - mid) / span);
      if (z.kind === 'interior') w *= 0.3;
      if (sm_isPvp(z.id)) w *= rec.faction === 'unaligned' ? 0.5 : 1.6;
    }
    if (w > 0) opts.push([z.id, w]);
  }
  if (!opts.length) {
    let best = null, bd = 1e9;
    for (const z of SM.zones) if (z.lvl && z.kind !== 'city') { const d = Math.abs((z.lvl[0] + z.lvl[1]) / 2 - rec.level); if (d < bd) { bd = d; best = z.id; } }
    return best || sm_city();
  }
  return sm_wpick(opts, f);
}
function sm_adj(id) {
  const d = sm_defs()[id], s = new Set();
  if (!d) return s;
  for (const x of d.exits || []) if (x.to) s.add(x.to);
  for (const p of d.pois || []) {
    for (const q of (p.data && p.data.destinations) || []) s.add(q && q.zone ? q.zone : q);
    if (p.type === 'door' && p.data && p.data.to) s.add(p.data.to);
  }
  for (const dr of d.doors || []) if (dr.to) s.add(dr.to);
  return s;
}
// BFS over exits, hopper/shuttle routes and doors; returns [from, ..., to] or null.
function sm_path(from, to) {
  if (from === to) return [from];
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const c = q.shift();
    for (const n of sm_adj(c)) {
      if (n in prev) continue;
      prev[n] = c;
      if (n === to) { const out = [n]; let k = c; while (k) { out.unshift(k); k = prev[k]; } return out; }
      q.push(n);
    }
  }
  return null;
}
function sm_valid(x, z) {
  try { const r = collideMove(x, z, x, z, 0.5); if (r && isFinite(r.x) && isFinite(r.z)) return { x: r.x, z: r.z }; } catch (err) { /* world not ready */ }
  return { x, z };
}
function sm_around(x, z, r0, r1) { const a = sm_rnd() * TAU, r = r0 + sm_rnd() * (r1 - r0); return sm_valid(x + Math.sin(a) * r, z + Math.cos(a) * r); }
function sm_inward(x, z, d) { const L = Math.hypot(x, z) || 1; return sm_valid(x - x / L * d + frand(-2, 2), z - z / L * d + frand(-2, 2)); }
// A spot to appear at when arriving from another zone.
function sm_entry(from) {
  const def = sm_zone().def, pois = def.pois || [];
  const ex = (def.exits || []).filter((x) => x.to === from);
  if (ex.length) { const x = sm_pick(ex); return sm_inward(x.x, x.z, (x.r || 6) + 3); }
  const arr = pois.filter((p) => p.type === 'arrive' || p.type === 'hopper' || p.type === 'shuttle' || p.type === 'clonebay' || p.type === 'start');
  if (arr.length) { const p = sm_pick(arr); return sm_around(p.x, p.z, 2, 6); }
  if ((def.exits || []).length) { const x = sm_pick(def.exits); return sm_inward(x.x, x.z, (x.r || 6) + 3); }
  return sm_around(0, 0, 4, 25);
}
// Where to walk to leave toward `dest`.
function sm_exitFor(dest) {
  const Z = sm_zone(), def = Z.def, path = sm_path(Z.id, dest), hop = path && path[1];
  const exits = def.exits || [], pois = def.pois || [];
  const ex = exits.find((x) => x.to === hop) || exits.find((x) => x.to === dest);
  if (ex) return { x: ex.x, z: ex.z, r: ex.r || 6 };
  const goes = (p, zid) => ((p.data && p.data.destinations) || []).some((d) => d === zid || (d && d.zone === zid)) || (p.data && p.data.to === zid);
  const hp = pois.find((p) => goes(p, hop || dest)) || pois.find((p) => p.type === 'hopper' || p.type === 'shuttle' || p.type === 'clonebay');
  if (hp) return { x: hp.x, z: hp.z, r: 3 };
  if (exits.length) { const x = sm_pick(exits); return { x: x.x, z: x.z, r: x.r || 6 }; }
  return null;
}
function sm_capFor(def) {
  if (def.generated) return [0, 0];
  if (def.kind === 'city') return [25, 35];
  if (def.kind === 'interior') return [3, 7];
  return [12, 25];
}

// ---------- characters ----------
function sm_planFor(prof) {
  const P = PROFS[prof], w = {}, ab = {};
  const add = (k, v) => { if (SKILLS[k]) w[k] = Math.max(w[k] || 0, v); };
  const cast = SM_CASTER[prof] || 0, tank = SM_TANK[prof] || 0, heal = SM_HEALER[prof] || 0;
  const ranged = RANGED_SKILLS.has(P.weapon);
  add(P.weapon, cast >= 0.7 ? 0.6 : heal >= 0.5 ? 0.75 : 1);
  const sch = (typeof NANO_PROF_SCHOOLS !== 'undefined' && NANO_PROF_SCHOOLS[prof]) || [P.school];
  sch.forEach((s, i) => add(s, i === 0 ? 1 : 0.7));
  add('body_dev', 0.55 + tank * 0.35);
  add('nano_pool', 0.2 + cast * 0.6 + heal * 0.2);
  add(ranged ? 'ranged_init' : 'melee_init', 0.4);
  if (cast || heal >= 0.5) { add('nano_init', 0.45); add('comp_lit', 0.3); }
  for (const s of SM_WSPEC[P.weapon] || []) add(s, 0.5);
  if (tank) { add('evade_close', 0.3); add('parry', 0.25); } else add(ranged ? 'dodge_ranged' : 'evade_close', 0.3);
  if (heal >= 0.5) { add('treatment', 0.45); add('first_aid', 0.35); }
  // abilities that feed the main skills
  for (const k in w) { const T = SKILLS[k].trickle; for (const a in T) ab[a] = (ab[a] || 0) + T[a] * w[k]; }
  ab.sta = Math.max(ab.sta || 0, 0.6);
  let mx = 0;
  for (const a in ab) mx = Math.max(mx, ab[a]);
  // minor skills and abilities get a light touch so the core skills reach their caps
  const plan = Object.keys(w).map((k) => ({ k, w: w[k] < 0.6 ? w[k] * 0.6 : w[k], ab: false }));
  for (const a in ab) { const v = ab[a] / mx * 0.45; if (v >= 0.15) plan.push({ k: a, w: v, ab: true }); }
  return plan;
}
// Spend IP greedily, keeping every planned stat at a similar fraction of its cap (scaled by weight).
function sm_spendIp(c) {
  const live = sm_planFor(c.prof);
  for (let g = 0; g < 20000 && live.length; g++) {
    let best = null, bs = 1e9;
    for (const p of live) {
      const cap = p.ab ? abilityCap(c, p.k) : skillCap(c, p.k), cur = (p.ab ? c.abil[p.k] : c.skill[p.k]) || 0;
      const s = (cur + 1) / Math.max(1, cap) / p.w;
      if (s < bs) { bs = s; best = p; }
    }
    if (!(best.ab ? raiseAbility(c, best.k) : raiseSkill(c, best.k))) live.splice(live.indexOf(best), 1);
  }
}
function sm_weaponT(skill, ql) {
  const ids = (typeof IT_BY_SKILL !== 'undefined' && IT_BY_SKILL[skill]) || Object.keys(ITEM_T).filter((id) => ITEM_T[id].kind === 'weapon' && ITEM_T[id].skill === skill);
  let best = null;
  for (const id of ids) { const t = ITEM_T[id]; if (t.qlMin <= ql && (!best || t.qlMin > ITEM_T[best].qlMin)) best = id; }
  return best || ids[0] || null;
}
function sm_gear(c, R) {
  if (typeof makeItem !== 'function' || typeof ITEM_T === 'undefined') return;
  const L = c.level, ql = Math.max(1, Math.round(L * R.r(1.5, 2.05)));
  const wid = sm_weaponT(PROFS[c.prof].weapon, ql);
  if (wid) c.equip.rhand = makeItem(wid, ql);
  const cast = SM_CASTER[c.prof] || 0, tank = SM_TANK[c.prof] || 0;
  let set = ql < 8 ? 'basic' : cast >= 0.6 ? 'cloth' : ql < 18 ? (R.chance(0.5) ? 'cloth' : 'basic') : tank >= 0.6 ? (ql >= 45 ? 'plated' : ql >= 28 ? 'combat' : 'mesh') : (ql >= 28 && R.chance(0.5) ? 'combat' : 'mesh');
  if (ql >= 70 && c.faction !== 'unaligned' && R.chance(0.5)) set = c.faction;
  for (const [key, slots] of SM_ASLOTS) {
    if (key === 'head' && R.chance(0.45)) continue;
    if ((key === 'back' || key === 'shoulder' || key === 'wrist') && R.chance(0.3)) continue;
    for (const s of slots) { const id = set === 'basic' ? 'armor_basic_' + s : set + '_' + key; if (ITEM_T[id]) c.equip[s] = makeItem(id, ql); }
  }
  const deck = ql >= 100 ? 'deck_quantum' : ql >= 40 ? 'deck_core' : 'deck_mnemo';
  if (ITEM_T[deck] && (cast || R.chance(0.5))) c.equip.deck = makeItem(deck, ql);
}
function sm_learnNanos(c) {
  if (typeof NANOS === 'undefined') return;
  const S = computeStats(c, gearMods(c)), have = new Set(c.nanos), anyP = (strSeed(c.name) % 100) / 100;
  for (const id in NANOS) {
    const n = NANOS[id];
    if (have.has(id) || (n.lvl || 1) > c.level || !nanoReqMet(S, n)) continue;
    if (n.prof === c.prof || (n.prof === 'any' && (strSeed(id + c.name) % 100) / 100 < 0.35 + anyP * 0.3)) { c.nanos.push(id); have.add(id); }
  }
}
function sm_buildChar(rec) {
  const R = makeRng((rec.seed ^ Math.imul(rec.level, 7919)) >>> 0);
  const c = newCharacter({ name: rec.name, breed: rec.breed, prof: rec.prof, faction: rec.faction, sex: rec.sex, look: rec.look });
  for (const s in c.equip) c.equip[s] = null;
  c.inv = [];
  while (c.level < rec.level && levelUp(c));
  sm_spendIp(c);
  sm_gear(c, R);
  sm_learnNanos(c);
  c.xp = c.level >= MAX_LEVEL ? 0 : Math.floor(clamp(rec.xp, 0, 0.99) * xpToNext(c.level));
  c.credits = Math.round(R.r(0.2, 1.5) * (50 + c.level * c.level * 30));
  return c;
}
// Sort a sim's known nanos into the shelves its brain picks from (best first).
function sm_kit(c) {
  const k = { heal: [], hot: [], buff: [], tbuff: [], fbuff: [], nuke: [], dot: [], debuff: [], ctrl: [], pet: [], taunt: [] };
  if (typeof NANOS === 'undefined') return k;
  for (const id of c.nanos) {
    const n = NANOS[id];
    if (!n || !n.fx) continue;
    const t = {};
    for (const f of n.fx) t[f.t] = 1;
    if (t.morph || t.lattice || t.stealth || t.summon) continue;
    if (n.target === 'enemy') {
      if (t.taunt) k.taunt.push(id); else if (t.dmg) k.nuke.push(id); else if (t.dot) k.dot.push(id);
      else if (t.root || t.stun || t.snare) k.ctrl.push(id); else if (!t.calm) k.debuff.push(id);
    } else if (t.pet) { const pf = n.fx.find((f) => f.t === 'pet'); if (!/mender/.test(pf.pet || '')) k.pet.push(id); }
    else if (n.target === 'pet') continue;
    else if (t.heal) k.heal.push(id);
    else if (t.hot) k.hot.push(id);
    else if ((n.dur || 0) >= 20) (n.target === 'team' ? k.tbuff : n.target === 'friend' ? k.fbuff : k.buff).push(id);
  }
  for (const key in k) k[key].sort((a, b) => (NANOS[b].lvl || 0) - (NANOS[a].lvl || 0) || (NANOS[b].str || 0) - (NANOS[a].str || 0));
  return k;
}
function sm_sync(rec) {
  const c = rec && rec.ent && rec.ent.char;
  if (!c) return;
  rec.level = c.level;
  rec.xp = c.level >= MAX_LEVEL ? 0 : clamp(c.xp / xpToNext(c.level), 0, 0.999);
}

// ---------- spawning ----------
function sm_modeFor(rec) {
  const Z = sm_zone();
  if (!Z || Z.def.safe) return 'social';
  if (sm_isPvp(Z.id) && rec.faction !== 'unaligned' && rec.level >= 30 && rec.pvpP < 0.75 && Object.keys(SM.pylons).length) return 'pvp';
  return 'hunt';
}
function sm_newAi(e, mode) {
  return {
    mode: mode || 'hunt', t: 0, think: sm_rnd(), goal: null, foe: null, spT: 1, nT: 1 + sm_rnd() * 2, kit: sm_kit(e.char), far: false,
    skip: 0, acc: 0, stk: { t: 0, x: e.pos.x, z: e.pos.z, n: 0 }, wantMove: false, pauseT: 0, sessUntil: SM.t + 400 + sm_rnd() * 1400,
    maxVisits: 2 + Math.floor(sm_rnd() * 5), visits: 0, nextBuff: 0, emT: 10 + sm_rnd() * 30,
  };
}
// Pre-run the long self buffs a player would have up when logging in.
function sm_prebuff(e) {
  const k = e.ai.kit;
  for (const id of [].concat(k.buff, k.tbuff, k.fbuff)) {
    const n = NANOS[id];
    if (!n || !nanoReqMet(e.S, n) || sm_hasLine(e, n) || !sm_ncuOk(e, n) || (n.dur || 0) < 60) continue;
    try { applyNano(e, e, n, id); const b = e.buffs.find((x) => x.nano === id); if (b) b.t = b.dur * frand(0.3, 1); } catch (err) { /* ignore */ }
  }
}
function sm_spawn(rec, p, mode) {
  try {
    if (!rec.char || rec.char.level !== rec.level) rec.char = sm_buildChar(rec);
    const c = rec.char;
    const e = makeEnt('sim', { name: rec.name, level: c.level, char: c, faction: c.faction, x: p.x, z: p.z, yaw: p.yaw != null ? p.yaw : sm_rnd() * TAU });
    e.sim = rec; rec.ent = e;
    e.ai = sm_newAi(e, mode || sm_modeFor(rec));
    addEnt(e);
    sm_prebuff(e);
    e.hp = Math.round(e.S.maxHp * frand(0.8, 1));
    SM.ents.push(e);
    return e;
  } catch (err) {
    if (SM.warned++ < 10) console.warn('sim spawn failed', rec.name, err);
    rec.ent = null;
    return null;
  }
}
function sm_despawn(e) {
  const rec = e.sim;
  sm_sync(rec);
  sm_dropTeam(e);
  if (e.team === TEAM) sm_unteam(e, true);
  if (!e.removed) removeEnt(e);
  if (rec && rec.ent === e) rec.ent = null;
  const i = SM.ents.indexOf(e);
  if (i >= 0) SM.ents.splice(i, 1);
}
function sm_scatter(rec, mode) {
  const def = sm_zone().def, pois = def.pois || [];
  if (mode === 'social') { const s = sm_socialSpot(null, rec); return s || sm_around(0, 0, 5, 40); }
  if (mode === 'pvp') {
    const own = Object.values(SM.pylons).filter((p) => p.owner === rec.faction), ps = own.length ? own : Object.values(SM.pylons);
    if (ps.length) { const p = sm_pick(ps); return sm_around(p.x, p.z, 8, 30); }
  }
  const L = rec.level, sps = (def.spawns || []).filter((s) => { const lv = s.lvl || sm_mobLvl(s); return lv && lv[0] <= L + 2 && lv[1] >= L - 7 && lv[0] < 60; });
  if (sps.length) { const s = sm_pick(sps), r = s.r || 10; return sm_around(s.x, s.z, r + 4, r + 20); }
  const pp = pois.filter((p) => p.type !== 'door' && p.type !== 'pylon');
  if (pp.length) { const p = sm_pick(pp); return sm_around(p.x, p.z, 4, 14); }
  return sm_around(0, 0, 5, 40);
}

// ---------- nano helpers ----------
function sm_ready(e, id) { const n = NANOS[id]; return !!n && !(e.cds['n:' + id] > 0) && e.np >= nanoCostFor(e, n) && nanoReqMet(e.S, n); }
function sm_first(e, list, fn) { for (const id of list) if (sm_ready(e, id) && (!fn || fn(NANOS[id], id))) return id; return null; }
function sm_hasLine(t, n) { const b = t.buffs.find((x) => x.line === (n.line || n.id)); return !!b && (b.str || 0) >= (n.str || 0); }
function sm_ncuOk(t, n) {
  if (!t.char) return true;
  const cur = t.buffs.find((b) => b.line === (n.line || n.id));
  return ncuUsed(t) - (cur ? cur.ncu || 0 : 0) + (n.ncu || 0) <= (t.S.ncu || 0);
}
function sm_cast(e, id, t) { try { return castNano(e, id, t).ok; } catch (err) { return false; } }
// Heals for self / team. Returns true if a cast started.
function sm_support(e) {
  const A = e.ai, k = A.kit, healer = SM_HEALER[e.char.prof] || 0;
  if (!k.heal.length && !k.hot.length) return false;
  const mates = e.team ? e.team.members : [e];
  let worst = null, wf = 1;
  for (const m of mates) {
    if (!m || m.dead || m.removed || !m.S || !m.S.maxHp) continue;
    if (m !== e && (entDist(m, e) > 26 || isHostile(e, m))) continue;
    const f = m.hp / m.S.maxHp;
    if (f < wf) { wf = f; worst = m; }
  }
  if (!worst) return false;
  const thr = worst === e ? (healer ? 0.6 : 0.45) : healer ? 0.65 : 0.35;
  const okT = (n) => n.target !== 'self' || worst === e;
  if (wf > thr) {
    if (healer >= 0.5 && wf < 0.85) { const id = sm_first(e, k.hot, (n) => okT(n) && !sm_hasLine(worst, n)); if (id) return sm_cast(e, id, worst); }
    return false;
  }
  const id = sm_first(e, k.heal, okT) || sm_first(e, k.hot, (n) => okT(n) && !sm_hasLine(worst, n));
  return id ? sm_cast(e, id, worst) : false;
}
// Out of combat: pet first, then any missing buffs on self and teammates.
function sm_prep(e) {
  const A = e.ai, k = A.kit;
  if (e.np < e.S.maxNp * 0.25 || SM.t < A.nextBuff) return false;
  A.nextBuff = SM.t + 2 + sm_rnd() * 3;
  if (k.pet.length && !e.pets.some((p) => !p.dead && !p.removed)) { const id = sm_first(e, k.pet); if (id && sm_cast(e, id, e)) return true; }
  const tg = [e];
  if (e.team) for (const m of e.team.members) if (m !== e && !m.dead && !m.removed && m.char && entDist(m, e) < 25 && !isHostile(e, m)) tg.push(m);
  for (const t of tg) {
    const lists = t === e ? [k.buff, k.tbuff, k.fbuff] : [k.tbuff, k.fbuff];
    for (const L of lists) for (const id of L) {
      const n = NANOS[id];
      if (n.target === 'self' && t !== e) continue;
      if (sm_hasLine(t, n) || !sm_ready(e, id) || !sm_ncuOk(t, n)) continue;
      if (sm_cast(e, id, t)) return true;
    }
  }
  return false;
}
function sm_combat(e, foe, dt) {
  const A = e.ai;
  A.spT -= dt;
  if (A.spT <= 0) {
    A.spT = 0.5 + sm_rnd() * 0.9;
    if (!e.cast) for (const s of specialsFor(e)) if (!(e.cds[s] > 0) && useSpecial(e, s).ok) break;
  }
  // medkits and stims, like any sensible player
  if (e.hp < e.S.maxHp * 0.45 && !(e.cds['item:hp'] > 0)) { e.cds['item:hp'] = e.cdMax['item:hp'] = 18; heal(e, e, e.S.maxHp * frand(0.2, 0.3), { item: true, quiet: true }); }
  A.nT -= dt;
  if (A.nT > 0 || e.cast) return;
  const cast = SM_CASTER[e.char.prof] || 0;
  A.nT = cast ? 1.5 + sm_rnd() * 2 : 3 + sm_rnd() * 4;
  if (sm_support(e)) return;
  const k = A.kit, f = e.np / Math.max(1, e.S.maxNp);
  if (k.taunt.length && foe.kind === 'mob' && foe.target && foe.target !== e && sameTeam(e, foe.target)) { const id = sm_first(e, k.taunt); if (id && sm_cast(e, id, foe)) return; }
  if (f < (cast ? 0.12 : 0.35) || !sm_chance(0.3 + cast * 0.6)) return;
  const lacks = (n) => !foe.buffs.some((b) => b.line === n.line);
  const opts = [];
  const a = sm_first(e, k.nuke); if (a) opts.push(a);
  const b = sm_first(e, k.dot, lacks); if (b) opts.push(b);
  const c = sm_first(e, k.debuff, lacks); if (c) opts.push(c);
  if (sm_chance(0.15)) { const d = sm_first(e, k.ctrl, lacks); if (d) opts.push(d); }
  if (opts.length) sm_cast(e, sm_pick(opts), foe);
}
function sm_fight(e, foe, dt) {
  e.target = foe;
  if (e.sitting) standUp(e);
  if (!e.attacking) startAttack(e, foe);
  sm_combat(e, foe, dt);
  if (e.ai) e.ai.wantMove = reachDist(e, foe) > attackStats(e).range + 1.5;
  fightMove(e, foe, dt);
}

// ---------- perception ----------
function sm_threat(e, r = 25) {
  const A = e.ai;
  if (A.hitBy && SM.t - A.hitT < 8 && canAttack(e, A.hitBy) && entDist(e, A.hitBy) < 45) return A.hitBy;
  let best = null, bd = r;
  for (const m of ENTS) {
    if (m.kind !== 'mob' || m.dead || m.removed) continue;
    if (m.target !== e && !m.hate.has(e)) continue;
    const d = entDist(m, e);
    if (d < bd && canAttack(e, m)) { bd = d; best = m; }
  }
  return best;
}
// Mobs fighting anyone on this team (pets included).
function sm_teamThreat(e, T, r = 30) {
  let best = null, bd = r;
  for (const m of ENTS) {
    if (m.dead || m.removed || !m.target || m.kind === 'npc') continue;
    const t = m.target.kind === 'pet' ? m.target.owner : m.target;
    if (!t || t.team !== T || !canAttack(e, m)) continue;
    const d = entDist(m, e);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function sm_mobLvl(s) {
  let a = 99, b = 0;
  for (const id of s.mobs || []) { const T = typeof MOB_T !== 'undefined' && MOB_T[id]; if (T && T.lvl) { a = Math.min(a, T.lvl[0]); b = Math.max(b, T.lvl[1]); } }
  return b ? [a, b] : null;
}
function sm_claimed(m, e) { for (const o of SM.ents) if (o !== e && !o.removed && !o.dead && o.ai && o.ai.foe === m && !sameTeam(o, e)) return true; return false; }
function sm_findMob(e, r, over) {
  const L = e.level, A = e.ai, P = PLAYER, outsider = P && !sameTeam(e, P);
  const big = e.team && e.team.members.length >= 3;
  let best = null, bs = 1e9;
  for (const m of ENTS) {
    if (m.kind !== 'mob' || m.dead || m.removed || m.invulnerable || (m.ai && m.ai.evade)) continue;
    if (m === A.ignore && SM.t < A.ignoreT) continue;
    const d = entDist(m, e);
    if (d > r || m.level > L + over || m.level >= 60 || conXpMul(L, m.level) <= 0) continue;
    if (m.tpl && (m.tpl.friendly || (m.tpl.named && !big))) continue;
    if (!canAttack(e, m)) continue;
    let mine = true;
    for (const h of m.hate.keys()) if (!sameTeam(e, h)) { mine = false; break; }
    if (!mine) continue;
    if (outsider && (P.target === m || entDist(m, P) < 14)) continue;
    if (sm_claimed(m, e)) continue;
    const s = d + Math.abs(m.level - L) * 2;
    if (s < bs) { bs = s; best = m; }
  }
  return best;
}
function sm_pickSpawn(e) {
  const def = sm_zone().def, L = e.level, opts = [];
  for (const s of def.spawns || []) {
    const lv = s.lvl || sm_mobLvl(s);
    if (!lv || lv[0] >= 60 || lv[1] < L - 7 || lv[0] > L + 2) continue;
    const mid = (lv[0] + lv[1]) / 2;
    opts.push([s, (s.camp ? 0.6 : 1) / (1 + Math.abs(mid - L)) / (1 + Math.hypot(s.x - e.pos.x, s.z - e.pos.z) / 150)]);
  }
  return opts.length ? sm_wpick(opts) : null;
}
function sm_findEnemy(e, r) {
  let best = null, bd = r;
  for (const o of ENTS) {
    if (o.dead || o.removed || (o.kind !== 'sim' && o.kind !== 'player' && o.kind !== 'pet')) continue;
    const d = entDist(o, e);
    if (d < bd && canAttack(e, o)) { bd = d; best = o; }
  }
  return best;
}

// ---------- movement ----------
function sm_walk(e, x, z, dt, stop = 1, mul = 1) {
  const A = e.ai;
  if (e.sitting) standUp(e);
  if (A.detour) {
    if (SM.t > A.detour.until || Math.hypot(A.detour.x - e.pos.x, A.detour.z - e.pos.z) < 1) A.detour = null;
    else { A.wantMove = true; moveToward(e, A.detour.x, A.detour.z, dt, 0.5, mul); return 1e9; }
  }
  const d = Math.hypot(x - e.pos.x, z - e.pos.z);
  if (d > stop + 0.2) A.wantMove = true;
  return moveToward(e, x, z, dt, stop, mul);
}
function sm_stuck(e, dt) {
  const A = e.ai, k = A.stk;
  if (!A.wantMove || e.rooted || e.cast || e.stunned > 0 || e.dead) { k.t = 0; k.x = e.pos.x; k.z = e.pos.z; return; }
  k.t += dt;
  if (k.t < 3) return;
  const m = Math.hypot(e.pos.x - k.x, e.pos.z - k.z);
  k.t = 0; k.x = e.pos.x; k.z = e.pos.z;
  if (m > 1) { k.n = 0; return; }
  k.n++;
  if (k.n === 1) { const a = e.yaw + (sm_chance(0.5) ? 1 : -1) * (Math.PI / 2 + sm_rnd()); A.detour = { x: e.pos.x + Math.sin(a) * 6, z: e.pos.z + Math.cos(a) * 6, until: SM.t + 2.5 }; }
  else if (k.n <= 3) {
    A.detour = null; A.goal = null;
    if (A.foe) { A.ignore = A.foe; A.ignoreT = SM.t + 40; A.foe = null; e.attacking = false; }
    if (A.mode === 'fight') A.mode = sm_baseMode(e);
    if (A.mode === 'social') { A.spot = null; A.there = false; }
  } else { sm_unstick(e); k.n = 0; }
}
function sm_place(e, p) {
  e.pos.set(p.x, 0, p.z); e.pos.y = groundY(p.x, p.z); e.vy = 0;
  if (e.rig) e.rig.root.position.copy(e.pos);
}
// Last resort when walking failed repeatedly: hop to somewhere sensible.
function sm_unstick(e) {
  const A = e.ai;
  A.detour = null; A.goal = null;
  if (e.team === TEAM && PLAYER) { sm_place(e, sm_around(PLAYER.pos.x, PLAYER.pos.z, 2, 4)); return; }
  if (A.mode === 'leave') { A.despawn = true; return; }
  if (A.mode === 'social' && A.spot) { sm_place(e, A.spot); A.there = false; return; }
  const def = sm_zone().def, ps = (def.pois || []).filter((p) => p.type !== 'door' && p.type !== 'pylon');
  if (ps.length && (!PLAYER || entDist(e, PLAYER) > 50)) { const p = sm_pick(ps); sm_place(e, sm_around(p.x, p.z, 3, 8)); }
  else A.despawn = !PLAYER || entDist(e, PLAYER) > 30;
}
function sm_follow(e, anchor, dt, idx) {
  const a = anchor.yaw + Math.PI + (idx % 2 ? 1 : -1) * (0.5 + Math.floor(idx / 2) * 0.45);
  const dist = 2.8 + Math.floor(idx / 2) * 0.9;
  const fx = anchor.pos.x + Math.sin(a) * dist, fz = anchor.pos.z + Math.cos(a) * dist;
  const d = Math.hypot(fx - e.pos.x, fz - e.pos.z);
  if (d > 1.2) sm_walk(e, fx, fz, dt, 0.6, d > 10 ? 1.25 : d > 4 ? 1.05 : 0.6);
  else { idleEnt(e, dt); e.yaw = angTo(e.yaw, anchor.yaw, dt * 3); }
}

// ---------- behaviour ----------
function simUpdate(e, dt) {
  const A = e.ai;
  if (!A || !SM.on || !sm_zone()) { idleEnt(e, dt); return; }
  if (A.far) { A.acc += dt; if ((++A.skip & 3) !== 0) return; dt = Math.min(A.acc, 0.25); }
  A.acc = 0;
  try { sm_update(e, dt); } catch (err) {
    if (SM.warned++ < 12) console.warn('sim', e.name, err);
    A.mode = 'hunt'; A.foe = null; A.goal = null; e.attacking = false;
  }
}
function sm_baseMode(e) {
  const A = e.ai, Z = sm_zone();
  if (A.leaving) return 'leave';
  if (Z.def.safe) return 'social';
  if (A.pvp && sm_isPvp(Z.id)) return 'pvp';
  return 'hunt';
}
function sm_update(e, dt) {
  const A = e.ai;
  A.wantMove = false;
  A.think -= dt;
  if (A.mode === 'pvp') A.pvp = true;
  if (e.team === TEAM && TEAM.members.includes(e)) sm_pteam(e, dt);
  else if (e.team && e.team.sim && e.team.leader !== e) sm_teamMember(e, dt, e.team, e.team.leader);
  else sm_solo(e, dt);
  sm_stuck(e, dt);
}
function sm_solo(e, dt) {
  switch (e.ai.mode) {
    case 'fight': sm_fightMode(e, dt); break;
    case 'rest': sm_rest(e, dt); break;
    case 'loot': sm_loot(e, dt); break;
    case 'flee': sm_flee(e, dt); break;
    case 'social': sm_social(e, dt); break;
    case 'leave': sm_leaveMode(e, dt); break;
    case 'pvp': sm_pvp(e, dt); break;
    default: sm_hunt(e, dt);
  }
}
function sm_engage(e, foe) {
  const A = e.ai;
  A.mode = 'fight'; A.foe = foe; A.fightT = 0; A.goal = null;
  if (e.sitting) standUp(e);
  startAttack(e, foe);
}
function sm_needRest(e) {
  const cast = SM_CASTER[e.char.prof] || SM_HEALER[e.char.prof] || 0;
  return e.hp < e.S.maxHp * 0.72 || (e.S.maxNp > 30 && e.np < e.S.maxNp * (cast ? 0.35 : 0.15));
}
function sm_startRest(e) { const A = e.ai; A.mode = 'rest'; A.t = 0; A.foe = null; e.attacking = false; e.target = null; }
function sm_hunt(e, dt) {
  const A = e.ai, Z = sm_zone();
  if (Z.def.safe) { A.mode = 'social'; return; }
  const leadP = e.team === TEAM && TEAM.leader === e;
  if (A.think <= 0) {
    A.think = 0.6 + sm_rnd() * 0.6;
    const th = sm_threat(e);
    if (th) { sm_engage(e, th); return; }
    if (sm_needRest(e)) { sm_startRest(e); return; }
    if (!e.cast && sm_prep(e)) return;
    sm_helpStranger(e);
    if (leadP && PLAYER && entDist(e, PLAYER) > 30) { A.goal = { x: PLAYER.pos.x, z: PLAYER.pos.z }; return; }
    const m = sm_findMob(e, A.goal ? 30 : 45, e.team ? 3 + Math.min(2, e.team.members.length - 2) : 1);
    if (m) { sm_engage(e, m); return; }
    if (!e.team && !A.leaving && SM.t > A.sessUntil) { sm_leave(e, sm_pickZone(e.sim, 0.6)); return; }
    if (!A.goal && A.pauseT <= 0) {
      const sp = sm_pickSpawn(e);
      if (sp) { const a = sm_rnd() * TAU, r = (sp.r || 10) * (0.3 + sm_rnd() * 0.9); A.goal = sm_valid(sp.x + Math.sin(a) * r, sp.z + Math.cos(a) * r); A.noSpawn = 0; }
      else if (++A.noSpawn > 3 && !e.team) { sm_leave(e, sm_pickZone(e.sim, 0.3)); return; }
      else { const p = sm_around(e.pos.x, e.pos.z, 8, 25); A.goal = p; }
    }
  }
  if (e.cast) { idleEnt(e, dt); return; }
  if (A.pauseT > 0) { A.pauseT -= dt; idleEnt(e, dt); return; }
  if (A.goal) {
    const d = sm_walk(e, A.goal.x, A.goal.z, dt, 1.5);
    if (d <= 1.7) { A.goal = null; A.pauseT = 1 + sm_rnd() * 4; }
  } else idleEnt(e, dt);
}
function sm_fightMode(e, dt) {
  const A = e.ai, foe = A.foe;
  A.fightT = (A.fightT || 0) + dt;
  if (!foe || foe.removed || foe.dead || !canAttack(e, foe) || entDist(e, foe) > 75 || (foe.ai && foe.ai.evade)) {
    e.attacking = false; A.foe = null;
    if (foe && foe.dead && foe.kind === 'mob' && !foe.removed && entDist(e, foe) < 40) { A.mode = 'loot'; A.t = 1.2 + sm_rnd() * 2.5; A.corpse = foe; }
    else A.mode = sm_baseMode(e);
    return;
  }
  if (A.think <= 0) {
    A.think = 0.5 + sm_rnd() * 0.4;
    const hpF = e.hp / e.S.maxHp, foeF = foe.hp / Math.max(1, foe.S.maxHp);
    if (!A.fled && hpF < 0.32 && foeF > hpF + 0.1) {
      let n = 0;
      for (const m of ENTS) if (m.kind === 'mob' && !m.dead && m.target === e) n++;
      if ((n > 1 || foe.level > e.level + 2 || hpF < 0.18) && sm_chance(0.5)) { sm_startFlee(e, foe); return; }
    }
    if (A.fightT > 90 && foe.hp >= foe.S.maxHp * 0.95) { A.ignore = foe; A.ignoreT = SM.t + 60; A.foe = null; e.attacking = false; A.mode = sm_baseMode(e); return; }
  }
  sm_fight(e, foe, dt);
}
function sm_loot(e, dt) {
  const A = e.ai, c = A.corpse;
  if (A.think <= 0) { A.think = 0.6; const th = sm_threat(e); if (th) { sm_engage(e, th); return; } }
  if (c && !c.removed && entDist(e, c) > 2) { sm_walk(e, c.pos.x, c.pos.z, dt, 1.6); return; }
  idleEnt(e, dt);
  A.t -= dt;
  if (A.t > 0) return;
  A.corpse = null;
  if (c && c.tpl && c.tpl.named && PLAYER && entDist(e, PLAYER) < 40 && sm_chance(0.5)) sm_say(e, 'vicinity', sm_pick(['finally!', 'got it!', 'gg ' + c.name]));
  if (sm_needRest(e)) sm_startRest(e); else A.mode = sm_baseMode(e);
}
function sm_rest(e, dt) {
  const A = e.ai;
  A.t += dt;
  idleEnt(e, dt);
  if (A.think <= 0) {
    A.think = 0.8;
    const th = sm_threat(e);
    if (th) { sm_engage(e, th); return; }
    if (!e.cast && sm_support(e)) return;
  }
  if (!e.cast && !e.sitting && e.combatT > 3) e.sitting = true;
  if ((e.hp >= e.S.maxHp * 0.97 && e.np >= e.S.maxNp * 0.92) || A.t > 75) { if (e.sitting) standUp(e); A.fled = false; A.mode = sm_baseMode(e); }
}
function sm_startFlee(e, foe) {
  const A = e.ai, a = Math.atan2(e.pos.x - foe.pos.x, e.pos.z - foe.pos.z);
  A.mode = 'flee'; A.fled = true; A.t = 0; A.foe = null;
  stopAttack(e); e.target = null;
  A.goal = sm_valid(e.pos.x + Math.sin(a) * 45, e.pos.z + Math.cos(a) * 45);
  if (PLAYER && entDist(e, PLAYER) < 35 && sm_chance(0.5)) sm_say(e, 'vicinity', sm_pick(['run!!', 'nope nope nope', 'too many!', 'help?']));
}
function sm_flee(e, dt) {
  const A = e.ai;
  A.t += dt;
  const d = A.goal ? sm_walk(e, A.goal.x, A.goal.z, dt, 1, 1.1) : 0;
  if (A.t > 9 || d < 1.5) { A.goal = null; sm_startRest(e); }
}
// Helpful healers patch up a struggling player they happen to pass.
function sm_helpStranger(e) {
  const A = e.ai, P = PLAYER;
  if (!P || P.dead || e.sim.pers !== 'helpful' || !A.kit.heal.length || SM.t < (A.helpT || 0)) return;
  if (P.hp > P.S.maxHp * 0.35 || P.combatT > 4 || entDist(e, P) > 25 || isHostile(e, P)) return;
  const id = sm_first(e, A.kit.heal, (n) => n.target !== 'self');
  if (id && sm_cast(e, id, P)) { A.helpT = SM.t + 90; sm_later(1 + sm_rnd(), () => sm_say(e, 'vicinity', sm_pick(['heals!', 'got you', 'careful out there', 'you looked like you needed that']))); }
}

// ---------- city life ----------
function sm_socialSpot(e, rec) {
  const def = sm_zone().def, pois = (def.pois || []).filter((p) => p.type !== 'door' && p.type !== 'pylon' && p.type !== 'arrive');
  rec = rec || (e && e.sim);
  const pers = rec ? rec.pers : 'chatty';
  // chatty folk drift toward somebody already standing around
  if (e && pers === 'chatty' && sm_chance(0.35)) {
    const o = sm_pick(SM.ents.filter((x) => x !== e && !x.removed && x.ai && x.ai.there));
    if (o) { const p = sm_around(o.pos.x, o.pos.z, 1.6, 2.6); p.face = Math.atan2(o.pos.x - p.x, o.pos.z - p.z); return p; }
  }
  if (!pois.length && !(def.areas || []).length) return null;
  const opts = pois.map((p) => {
    let w = 1;
    const nm = (p.name || '').toLowerCase();
    if (p.type === 'vendor') w = pers === 'trader' ? 4 : 1.5;
    else if (p.type === 'bank') w = pers === 'trader' ? 3 : 1.2;
    else if (p.type === 'terminal') w = pers === 'newbie' ? 2.5 : 1.2;
    else if (p.type === 'trainer') w = pers === 'newbie' ? 2.5 : 0.5;
    else if (p.type === 'clonebay') w = 0.6;
    else if (p.type === 'hopper' || p.type === 'shuttle') w = 0.5;
    else if (p.type === 'npc') w = (p.data && p.data.faction) ? (rec && rec.faction === p.data.faction ? (pers === 'roleplayer' ? 4 : 1) : 0.1) : /bar|keep|lumen/.test(nm) ? (pers === 'chatty' ? 3 : 1.2) : 0.6;
    return [p, w];
  });
  // named districts (plazas, the port, the bar) make good places to loiter too
  for (const ar of def.areas || []) if (ar.r) opts.push([{ x: ar.x, z: ar.z, area: ar.r }, /lumen|bar/i.test(ar.name || '') && pers === 'chatty' ? 3 : 1.2]);
  const p = sm_wpick(opts);
  if (p.area) { const s = sm_around(p.x, p.z, 0, p.area * 0.6); s.face = sm_rnd() * TAU; return s; }
  const s = sm_around(p.x, p.z, 2.5, 5.5);
  s.face = Math.atan2(p.x - s.x, p.z - s.z);
  return s;
}
function sm_social(e, dt) {
  const A = e.ai, Z = sm_zone();
  if (!Z.def.safe) { A.mode = 'hunt'; return; }
  if (A.think <= 0) {
    A.think = 1 + sm_rnd();
    if (!A.spot) {
      if (++A.visits > A.maxVisits && !e.team) { sm_leave(e, sm_pickZone(e.sim, 0)); return; }
      A.spot = sm_socialSpot(e); A.there = false; A.linger = 15 + sm_rnd() * 75;
      if (!A.spot) A.spot = sm_around(e.pos.x, e.pos.z, 5, 20);
    }
    if (A.there) sm_cityKindness(e);
  }
  if (A.spot && !A.there) {
    const d = sm_walk(e, A.spot.x, A.spot.z, dt, 0.8, 0.55);
    if (d < 1.05) { A.there = true; A.t = 0; if (sm_chance(e.sim.pers === 'quiet' ? 0.4 : 0.15)) e.sitting = true; }
    return;
  }
  idleEnt(e, dt);
  if (!A.there) return;
  A.t += dt;
  if (A.spot.face != null && !e.sitting) e.yaw = angTo(e.yaw, A.spot.face, dt * 3);
  A.emT -= dt;
  if (A.emT <= 0) { A.emT = 12 + sm_rnd() * 40; if (!e.sitting && e.rig && e.rig.play && e.sim.pers !== 'quiet') e.rig.play('emote'); }
  if (A.t > A.linger) { A.spot = null; A.there = false; if (e.sitting) standUp(e); }
}
// Helpful sims hand out friend-buffs to a player standing next to them.
function sm_cityKindness(e) {
  const A = e.ai, P = PLAYER;
  if (!P || e.sim.pers !== 'helpful' || !A.kit.fbuff.length || SM.t < (A.giftT || 0) || entDist(e, P) > 10 || !sm_chance(0.08)) return;
  const id = sm_first(e, A.kit.fbuff, (n) => !sm_hasLine(P, n) && sm_ncuOk(P, n));
  if (id && sm_cast(e, id, P)) { A.giftT = SM.t + 600; sm_later(1.5, () => sm_say(e, 'vicinity', sm_pick(['buffed you, have fun out there', 'free buff, enjoy :)', 'there you go, stay safe']))); }
}

// ---------- leaving ----------
function sm_leave(e, dest) {
  const A = e.ai, Z = sm_zone();
  if (!dest || dest === Z.id) dest = Z.id === sm_city() ? sm_pickZone(e.sim, 0) : sm_city();
  if (dest === Z.id) dest = sm_city();
  A.mode = 'leave'; A.leaving = true; A.dest = dest; A.exit = sm_exitFor(dest); A.t = 0;
  A.foe = null; A.goal = null; e.attacking = false; e.target = null;
  if (e.sitting) standUp(e);
  if (e.team && e.team.sim) sm_dropTeam(e);
}
function sm_leaveMode(e, dt) {
  const A = e.ai, Z = sm_zone();
  A.t += dt;
  if (A.think <= 0 && !Z.def.safe) {
    A.think = 0.8;
    const th = sm_threat(e);
    if (th) { sm_engage(e, th); return; }
  }
  if (!A.exit) { A.despawn = true; e.sim.zone = A.dest; return; }
  if (e.cast) { idleEnt(e, dt); return; }
  const d = sm_walk(e, A.exit.x, A.exit.z, dt, 1, Z.def.safe ? 0.6 : 1);
  if (d < Math.max(1.6, (A.exit.r || 4) * 0.5) || A.t > 240) { A.despawn = true; e.sim.zone = A.dest; }
}

// ---------- teams ----------
function sm_teamMember(e, dt, T, anchor) {
  const A = e.ai, P = PLAYER;
  if (!anchor || anchor.removed || (T.sim && !T.members.includes(anchor))) { sm_dropTeam(e); A.mode = sm_baseMode(e); return; }
  if (anchor.dead && T.sim) { sm_dropTeam(e); A.mode = sm_baseMode(e); return; }
  if (entDist(e, anchor) > 80 && !e.cast && (!P || T === TEAM || entDist(e, P) > 60)) sm_place(e, sm_around(anchor.pos.x, anchor.pos.z, 2, 4));
  if (A.think <= 0) {
    A.think = 0.4 + sm_rnd() * 0.4;
    let foe = null;
    if (T === TEAM && P && P.attacking && canAttack(e, P.target) && entDist(e, P.target) < 50) foe = P.target;
    const L = T.leader;
    if (!foe && L && L !== e && L.attacking && canAttack(e, L.target) && entDist(e, L.target) < 50) foe = L.target;
    if (!foe) foe = sm_teamThreat(e, T);
    if (!foe && A.hitBy && SM.t - A.hitT < 8 && canAttack(e, A.hitBy)) foe = A.hitBy;
    A.foe = foe;
    if (!e.cast && sm_support(e)) return;
    if (!foe && !e.cast && e.combatT > 4) sm_prep(e);
  }
  if (A.foe && !A.foe.dead && !A.foe.removed && canAttack(e, A.foe) && entDist(e, A.foe) < 60) { sm_fight(e, A.foe, dt); return; }
  if (A.foe) { A.foe = null; e.attacking = false; }
  if (e.cast) { idleEnt(e, dt); return; }
  const restNow = (anchor.sitting || (T === TEAM && P && P.sitting)) && entDist(e, anchor) < 10;
  if (restNow && (e.hp < e.S.maxHp * 0.98 || e.np < e.S.maxNp * 0.95)) { idleEnt(e, dt); if (!e.sitting && e.combatT > 3) e.sitting = true; return; }
  if (e.sitting && !restNow) standUp(e);
  const sims = T.members.filter((m) => m !== anchor && m.kind === 'sim');
  sm_follow(e, anchor, dt, Math.max(0, sims.indexOf(e)));
}
function sm_pteam(e, dt) {
  const A = e.ai, P = PLAYER;
  if (!P) { idleEnt(e, dt); return; }
  if (TEAM.leader === e && !sm_zone().def.safe) {
    if (A.mode !== 'fight' && A.mode !== 'rest' && A.mode !== 'loot') A.mode = 'hunt';
    // a leader who wandered off comes back for the player first
    const d = entDist(e, P);
    if (d > 150 && !e.cast) { sm_place(e, sm_around(P.pos.x, P.pos.z, 3, 6)); return; }
    if (d > 40 && A.mode !== 'fight') { sm_walk(e, P.pos.x, P.pos.z, dt, 6, 1.2); return; }
    sm_solo(e, dt);
    return;
  }
  const L = TEAM.leader;
  const anchor = L && L !== e && L.kind === 'sim' && !L.dead && !L.removed ? L : P;
  A.mode = 'team';
  sm_teamMember(e, dt, TEAM, anchor);
}
function sm_dropTeam(e) {
  const T = e.team;
  if (!T || !T.sim) return;
  const i = T.members.indexOf(e);
  if (i >= 0) T.members.splice(i, 1);
  e.team = null;
  if (T.leader === e || T.members.length < 2) sm_disband(T);
}
function sm_disband(T) {
  for (const m of T.members) if (m.team === T) { m.team = null; if (m.ai && !m.removed) { m.ai.mode = sm_baseMode(m); m.ai.foe = null; } }
  T.members.length = 0;
  const i = SM.teams.indexOf(T);
  if (i >= 0) SM.teams.splice(i, 1);
}
function sm_formTeam() {
  const Z = sm_zone();
  if (!Z || Z.def.safe || Z.def.generated) return;
  const solo = SM.ents.filter((e) => !e.removed && !e.dead && !e.team && e.ai && (e.ai.mode === 'hunt' || e.ai.mode === 'rest') && !e.ai.leaving);
  if (solo.length < 2) return;
  const lead = sm_pick(solo);
  if (lead.sim.pers === 'quiet' && sm_chance(0.7)) return;
  const mates = solo.filter((o) => o !== lead && Math.abs(o.level - lead.level) <= 5 && entDist(o, lead) < 90 && !(Z.def.pvp && o.faction !== lead.faction)).slice(0, 1 + Math.floor(sm_rnd() * 3));
  if (!mates.length) return;
  const T = { members: [lead].concat(mates), leader: lead, sim: true, until: SM.t + 300 + sm_rnd() * 900 };
  for (const m of T.members) { m.team = T; if (m !== lead) { m.ai.mode = 'member'; m.ai.goal = null; } }
  SM.teams.push(T);
  if (PLAYER && entDist(lead, PLAYER) < 40 && sm_chance(0.5)) sm_say(lead, 'vicinity', sm_pick(['inv sent ' + mates[0].name, 'grouping up, come on ' + mates[0].name, 'team up? ok, follow me']));
}
function sm_teamsTick() {
  for (const T of SM.teams.slice()) {
    for (let i = T.members.length - 1; i >= 0; i--) { const m = T.members[i]; if (m.removed) { T.members.splice(i, 1); if (m.team === T) m.team = null; } }
    if (!T.leader || T.leader.removed || !T.members.includes(T.leader) || T.members.length < 2 || SM.t > T.until) sm_disband(T);
  }
}
// ----- the player's team -----
function sm_sys(text) { EV.emit('chat', 'system', '', text); }
function sm_profName(p) { return (PROFS[p] && PROFS[p].name) || p; }
function sm_findRec(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().trim(), ns = n.replace(/\s+/g, '');
  return SM.pop.find((r) => r.name.toLowerCase() === n) || SM.pop.find((r) => r.name.toLowerCase().replace(/\s+/g, '') === ns) ||
    SM.pop.find((r) => r.name.toLowerCase().split(' ')[0] === n) || null;
}
// Split "Kaylen Voss hello there" into the longest matching sim name and the rest.
function sm_parseName(s) {
  s = String(s || '').trim();
  const lo = s.toLowerCase();
  let best = null;
  for (const r of SM.pop) { const nl = r.name.toLowerCase(); if (lo.startsWith(nl) && (lo.length === nl.length || lo[nl.length] === ' ') && (!best || nl.length > best.name.length)) best = r; }
  if (best) return { rec: best, msg: s.slice(best.name.length).trim() };
  const tok = s.split(/\s+/)[0] || '';
  return { rec: sm_findRec(tok), msg: s.slice(tok.length).trim(), tok };
}
const SM_DECLINE = ['no thanks', 'sry, soloing right now', 'maybe later', 'nah, about to log', 'not right now, sorry'];
function sm_wouldTeam(rec) {
  const P = PLAYER, gap = Math.abs(rec.level - P.level);
  if (rec.ent && rec.ent.team === TEAM) return { ok: false, why: 'we are already teamed :P' };
  if (rec.ent && rec.ent.team) return { ok: false, why: 'already in a team, sry' };
  if (TEAM.members.length >= 6) return { ok: false, why: 'your team is full, no?' };
  if (rec.wantInv && SM.t < rec.wantInv) return { ok: true };
  if (rec.lastAsk && SM.t - rec.lastAsk < 60) return { ok: false, why: 'I said no...' };
  if (gap > 15) return { ok: false, why: rec.level > P.level ? 'you are way too low for me, sorry' : 'I am way too low for you, sorry' };
  let p = { chatty: 0.75, quiet: 0.45, helpful: 0.9, trader: 0.35, roleplayer: 0.6, grumpy: 0.25, newbie: 0.85 }[rec.pers] || 0.5;
  if (gap > 10) p *= 0.15; else if (gap > 5) p *= 0.5;
  if (P.faction !== 'unaligned' && rec.faction !== 'unaligned' && P.faction !== rec.faction) {
    if (rec.pers === 'roleplayer') return { ok: false, why: 'I do not walk with ' + SM_FAC[P.faction] + ' agents.' };
    p *= 0.6;
  }
  if (sm_rnd() < p) return { ok: true };
  rec.lastAsk = SM.t;
  return { ok: false, why: sm_pick(SM_DECLINE) };
}
function sm_joinPlayerTeam(e, rejoin) {
  if (!e || e.removed || e.dead || TEAM.members.includes(e) || TEAM.members.length >= 6 || !PLAYER) return false;
  sm_dropTeam(e);
  if (!TEAM.members.includes(PLAYER)) TEAM.members.unshift(PLAYER);
  TEAM.members.push(e);
  e.team = TEAM; PLAYER.team = TEAM;
  if (!TEAM.leader) TEAM.leader = PLAYER;
  const A = e.ai;
  A.mode = 'team'; A.foe = null; A.leaving = false; A.goal = null; A.teamUntil = SM.t + 900 + sm_rnd() * 2700;
  e.sim.pendingJoin = false;
  sm_sys(e.name + (rejoin ? ' has rejoined your team.' : ' has joined your team.'));
  sm_later(1 + sm_rnd() * 2, () => sm_say(e, 'team', sm_pick(rejoin ? ['back', 're', 'made it, where are you?', 'back, sorry'] : ['hi all', 'hey', 'o/', 'thanks for the inv', 'hello! ready when you are', 'hiya'])));
  EV.emit('team', TEAM);
  return true;
}
function sm_unteam(e, quiet) {
  const i = TEAM.members.indexOf(e);
  if (i >= 0) TEAM.members.splice(i, 1);
  if (e.team === TEAM) e.team = null;
  if (TEAM.leader === e || TEAM.members.length <= 1) TEAM.leader = PLAYER;
  if (e.ai && !e.removed) { e.ai.mode = sm_baseMode(e); e.ai.foe = null; e.attacking = false; }
  if (!quiet) sm_sys(e.name + ' has left your team.');
  EV.emit('team', TEAM);
}
function teamInvite(name) {
  if (!PLAYER || !SM.on) return;
  if (TEAM.members.length > 1 && TEAM.leader !== PLAYER) { sm_sys('Only the team leader can invite.'); return; }
  if (TEAM.members.length >= 6) { sm_sys('Your team is full.'); return; }
  const rec = name && typeof name === 'object' ? name.sim : sm_findRec(name);
  if (!rec) { sm_sys('No one by that name is online.'); return; }
  if (rec.ent && rec.ent.team === TEAM) { sm_sys(rec.name + ' is already in your team.'); return; }
  sm_sys('You invite ' + rec.name + ' to join your team.');
  const d = sm_wouldTeam(rec);
  sm_later(1.5 + sm_rnd() * 3, () => {
    if (!SM.on || !PLAYER) return;
    if (!d.ok) { sm_tell(rec, d.why); sm_sys(rec.name + ' declined your team invitation.'); return; }
    const Z = sm_zone();
    if (rec.ent && !rec.ent.removed && !rec.ent.dead) { sm_joinPlayerTeam(rec.ent); return; }
    if (!Z || Z.def.generated) { sm_tell(rec, 'sure, but you are in a mission. inv me when you are out'); return; }
    sm_tell(rec, 'sure! omw to ' + Z.def.name);
    sm_sys(rec.name + ' accepted and is on the way.');
    rec.pendingJoin = true; rec.zone = Z.id;
    sm_later(15 + sm_rnd() * 20, () => {
      if (!SM.on || !rec.pendingJoin || rec.ent) return;
      const z2 = sm_zone();
      if (!z2 || z2.def.generated) { rec.pendingJoin = false; return; }
      rec.zone = z2.id;
      const e = sm_arrive(rec, sm_city());
      if (e) sm_joinPlayerTeam(e);
    });
  });
}
function teamLeave() {
  if (!PLAYER) return;
  const sims = TEAM.members.filter((m) => m !== PLAYER);
  if (!sims.length) { sm_sys('You are not in a team.'); return; }
  for (const e of sims) { if (e.team === TEAM) e.team = null; if (e.ai && !e.removed) { e.ai.mode = sm_baseMode(e); e.ai.foe = null; e.attacking = false; } }
  TEAM.members.length = 0; TEAM.members.push(PLAYER); TEAM.leader = PLAYER; PLAYER.team = TEAM;
  sm_sys('You have left the team.');
  // whoever is left carries on as a team of their own
  const left = sims.filter((e) => !e.removed && !e.dead && e.kind === 'sim');
  if (left.length >= 2 && !sm_zone().def.safe) {
    const T = { members: left.slice(), leader: left[0], sim: true, until: SM.t + 300 + sm_rnd() * 600 };
    for (const m of left) m.team = T;
    SM.teams.push(T);
  }
  if (left.length) sm_later(1 + sm_rnd() * 2, () => sm_say(sm_pick(left), 'vicinity', sm_pick(['cya!', 'thanks for the team', 'gl out there', 'bye o/'])));
  EV.emit('team', TEAM);
}
function teamKick(ent) {
  if (!PLAYER) return;
  if (typeof ent === 'string') ent = TEAM.members.find((m) => m.name.toLowerCase() === ent.toLowerCase()) || null;
  if (!ent || ent === PLAYER || !TEAM.members.includes(ent)) { sm_sys('They are not in your team.'); return; }
  if (TEAM.leader !== PLAYER) { sm_sys('Only the team leader can kick.'); return; }
  sm_unteam(ent, true);
  sm_sys(ent.name + ' has been removed from the team.');
  if (ent.sim) sm_later(1 + sm_rnd() * 2, () => sm_tell(ent.sim, ent.sim.pers === 'grumpy' ? sm_pick(['wow ok', 'rude', 'whatever']) : sm_pick(['np, gl', 'ok, cya', 'oh. ok bye'])));
}
function teamAccept() {
  const I = SM.invite;
  SM.invite = null;
  if (!PLAYER || !I || !I.e || I.e.removed || I.e.dead) { sm_sys('You have no pending team invitation.'); return; }
  if (TEAM.members.length > 1) { sm_sys('Leave your current team first.'); return; }
  const lead = I.e, prev = lead.team && lead.team.sim ? lead.team.members.slice() : [lead];
  if (lead.team && lead.team.sim) sm_disband(lead.team);
  TEAM.members.length = 0; TEAM.members.push(lead, PLAYER);
  TEAM.leader = lead; PLAYER.team = TEAM; lead.team = TEAM;
  lead.ai.mode = 'hunt'; lead.ai.leaving = false; lead.ai.teamUntil = SM.t + 1200 + sm_rnd() * 2400; lead.ai.foe = null;
  for (const m of prev) if (m !== lead && TEAM.members.length < 6 && !m.removed) {
    TEAM.members.push(m); m.team = TEAM; m.ai.mode = 'team'; m.ai.teamUntil = SM.t + 900 + sm_rnd() * 2400;
  }
  sm_sys('You have joined ' + lead.name + "'s team.");
  sm_later(1 + sm_rnd() * 2, () => sm_say(lead, 'team', sm_pick(['welcome!', 'hey, glad you joined', 'cool, follow me', 'nice, let\'s go'])));
  EV.emit('team', TEAM);
}
function teamDecline() {
  const I = SM.invite;
  SM.invite = null;
  if (!I || !I.e) { sm_sys('You have no pending team invitation.'); return; }
  sm_sys('You declined ' + I.e.name + "'s team invitation.");
  if (I.e.sim && sm_chance(0.5)) sm_later(2, () => sm_tell(I.e.sim, sm_pick(['np', 'ok, maybe later', 'no worries'])));
}
function sm_simInvite(e) {
  if (!e || !PLAYER || SM.invite) return;
  SM.invite = { e, t: SM.t + 60 };
  EV.emit('teaminvite', e);
  if (!(EV.h.teaminvite && EV.h.teaminvite.length)) sm_sys(e.name + ' (level ' + e.level + ' ' + sm_profName(e.char.prof) + ') invites you to join a team. Type /accept or /decline.');
}
function sm_pteamTick() {
  const P = PLAYER;
  if (!P) return;
  for (const e of TEAM.members.slice()) {
    if (e === P || e.kind !== 'sim') continue;
    if (e.removed) { sm_unteam(e, true); continue; }
    if (e.dead || e.attacking) continue;
    const gap = P.level - e.level, Z = sm_zone();
    let why = null;
    if (gap > 10) why = sm_pick(['you are outlevelling me fast, gonna go solo. ty!', 'I am too low to be useful here, cya', 'you outgrew me lol, gl!']);
    else if (gap < -14) why = sm_pick(['getting no xp here, gonna head off. gl!', 'too high for this now, thanks all']);
    else if (Z.def.lvl && Z.def.kind !== 'city' && e.level < Z.def.lvl[0] - 8) why = 'this zone is too hot for me, I will wait in ' + sm_zname(sm_city()) + '. bye!';
    else if (SM.t > (e.ai.teamUntil || 1e9) && P.combatT > 5) why = sm_pick(['gtg, dinner. thanks for the team!', 'have to log, ty all', 'thanks for the xp, gtg', 'gotta run, gl!', 'my cat says bedtime, cya', 'need sleep, thanks team']);
    if (why) {
      sm_say(e, 'team', why);
      sm_unteam(e);
      e.ai.leaving = true; e.ai.mode = 'leave';
      e.ai.dest = sm_city(); e.ai.exit = null;   // logs off where they stand
      sm_later(3 + sm_rnd() * 4, () => { if (!e.removed && e.ai.mode === 'leave') e.ai.despawn = true; });
      return;
    }
  }
  // a little team chatter
  const sims = TEAM.members.filter((m) => m.kind === 'sim' && !m.dead);
  if (sims.length && sm_chance(0.05)) {
    const e = sm_pick(sims), mob = sm_zoneMob(sm_zone().id);
    sm_say(e, 'team', sm_fill(sm_pick(['nice xp here', 'this spot is great', 'how far are you from ding?', 'need a sec for nano soon', 'loving this team', '{mob}s are giving good xp', 'pull more, I can handle it', 'careful, {mob}s here bite', 'anyone need buffs?', 'lol that crit']), { mob: mob || 'mob' }));
  }
}

// ---------- pylons ----------
function sm_pylonInit() {
  const D = sm_defs().lumen_scar;
  if (!D) return;
  D.pvp = true;
  (D.pois || []).filter((p) => p.type === 'pylon').forEach((p, i) => {
    const own = (p.data && p.data.faction) || (i % 2 ? 'freehold' : 'meridian');
    const cur = SM.pylons[p.id];
    if (cur) Object.assign(cur, { x: p.x, z: p.z, name: p.name || cur.name });
    else SM.pylons[p.id] = { id: p.id, name: p.name || ('Pylon ' + (i + 1)), owner: own, x: p.x, z: p.z, c: 0, by: null };
  });
}
function simPylons() { return Object.values(SM.pylons).map((p) => ({ id: p.id, name: p.name, owner: p.owner, contest: p.c, by: p.by })); }
function sm_flip(p, fac) {
  const old = p.owner;
  p.owner = fac; p.c = 0; p.by = null;
  sm_sys('Lumen Scar: the ' + SM_FAC[fac] + ' have taken ' + p.name + (old === 'meridian' || old === 'freehold' ? ' from the ' + SM_FAC[old] : '') + '.');
  const pf = PLAYER && PLAYER.faction;
  if (pf === fac || pf === old) {
    const r = sm_pickRec((x) => x.faction === pf && x.level >= 30);
    if (r) sm_later(2 + sm_rnd() * 3, () => sm_say(r, 'faction', pf === fac ? sm_pick(['nice work, ' + p.name + ' is ours!', 'GG, pylon taken', 'that is how it is done']) : sm_pick(['we lost ' + p.name + ', regroup!', 'they took ' + p.name + ' :(', 'everyone back to ' + p.name + '!'])));
  }
  EV.emit('pylon', p.id, fac);
  sm_resonance();
}
function sm_pylonTick() {
  const Z = sm_zone();
  if (!Z || !Z.def.pvp) return;
  for (const p of Object.values(SM.pylons)) {
    const near = entsNear(p.x, p.z, 22, (o) => !o.dead && (o.kind === 'sim' || o.kind === 'player'));
    let def = 0;
    const atk = { meridian: 0, freehold: 0 };
    for (const o of near) { if (o.faction === p.owner && atk[o.faction] !== undefined) def++; else if (atk[o.faction] !== undefined) atk[o.faction]++; }
    const att = atk.meridian > atk.freehold ? 'meridian' : atk.freehold > 0 ? 'freehold' : null;
    if (!def && att && att !== p.owner) {
      if (p.by !== att) {
        p.by = att; p.c = 0;
        if (PLAYER && PLAYER.faction === p.owner) { const r = sm_pickRec((x) => x.faction === p.owner && x.level >= 30); if (r) sm_say(r, 'faction', p.name + ' is under attack!'); }
      }
      if (++p.c >= 20) sm_flip(p, att);
    } else p.c = Math.max(0, p.c - 1);
  }
}
function sm_choosePylon(e) {
  const f = e.faction, ps = Object.values(SM.pylons);
  if (!ps.length) return null;
  const push = SM.push[f] && SM.pylons[SM.push[f]];
  if (push && push.owner !== f && sm_chance(0.6)) return push.id;
  const own = ps.filter((p) => p.owner === f), enemy = ps.filter((p) => p.owner !== f);
  if (own.length && (sm_chance(0.35) || !enemy.length)) return sm_pick(own).id;
  if (enemy.length) { enemy.sort((a, b) => entDist(e, { pos: a }) - entDist(e, { pos: b })); return enemy[0].id; }
  return sm_pick(ps).id;
}
function sm_pvp(e, dt) {
  const A = e.ai;
  if (!sm_zone().def.pvp) { A.mode = 'hunt'; A.pvp = false; return; }
  if (A.think <= 0) {
    A.think = 0.5 + sm_rnd() * 0.5;
    const en = sm_findEnemy(e, 36);
    if (en) A.foe = en;
    else if (A.foe && (!canAttack(e, A.foe) || entDist(e, A.foe) > 55)) A.foe = null;
    if (!A.foe) A.foe = sm_threat(e);
    if (!e.cast && sm_support(e)) return;
    if (!A.foe && !e.cast) {
      // healers look after nearby allies too
      if (SM_HEALER[e.char.prof] >= 0.5) {
        const hurt = entsNear(e.pos.x, e.pos.z, 25, (o) => o.kind === 'sim' && o !== e && !o.dead && o.faction === e.faction && o.hp < o.S.maxHp * 0.6)[0];
        const id = hurt && sm_first(e, A.kit.heal, (n) => n.target !== 'self');
        if (id && sm_cast(e, id, hurt)) return;
      }
      if (!sm_needRest(e)) sm_prep(e);
    }
    if (!A.pyl || !SM.pylons[A.pyl] || sm_chance(0.01)) A.pyl = sm_choosePylon(e);
  }
  if (A.foe && !A.foe.dead && !A.foe.removed && canAttack(e, A.foe)) { sm_fight(e, A.foe, dt); return; }
  if (A.foe) { A.foe = null; e.attacking = false; }
  if (e.cast) { idleEnt(e, dt); return; }
  if (e.sitting || (sm_needRest(e) && e.combatT > 5)) {
    idleEnt(e, dt);
    if (!e.sitting && e.combatT > 3) e.sitting = true;
    if (e.hp >= e.S.maxHp * 0.95 && e.np >= e.S.maxNp * 0.85) standUp(e);
    return;
  }
  const p = SM.pylons[A.pyl];
  if (!p) { idleEnt(e, dt); return; }
  if (!A.goal || A.goalPyl !== A.pyl) { A.goal = sm_around(p.x, p.z, 5, 14); A.goalPyl = A.pyl; }
  const d = sm_walk(e, A.goal.x, A.goal.z, dt, 1);
  if (d < 1.3) { idleEnt(e, dt); if (sm_chance(dt / 10)) A.goal = null; }
}
// Holding two pylons empowers everyone of that faction.
function sm_resonance() {
  const P = PLAYER;
  if (!P || P.dead || typeof applyBuffRaw !== 'function') return;
  const f = P.faction, n = f === 'unaligned' ? 0 : Object.values(SM.pylons).filter((p) => p.owner === f).length;
  const b = P.buffs.find((x) => x.line === 'lumen_resonance');
  if (n >= 2) {
    if (b) b.t = b.dur;
    else {
      const L = P.level;
      applyBuffRaw(null, P, { id: 'lumen_resonance', name: 'Lumen Resonance', line: 'lumen_resonance', str: 1, dur: 900, mods: { maxHp: Math.round(20 + L * 4), addDmg: Math.max(1, Math.round(L / 8)), hpRegen: 1, npRegen: 1 }, icon: { glyph: '✧', color: '#7ff0ff' } });
      if (!SM.resOn) sm_sys('The ' + SM_FAC[f] + ' hold ' + n + ' lumen pylons: Lumen Resonance empowers you.');
    }
    SM.resOn = true;
  } else {
    if (b) removeBuff(P, b);
    if (SM.resOn) sm_sys('Lumen Resonance fades: your faction has lost the pylon fields.');
    SM.resOn = false;
  }
}
function sm_warTick() {
  const ps = Object.values(SM.pylons);
  if (!ps.length) return;
  for (const f of ['meridian', 'freehold']) {
    const enemy = ps.filter((p) => p.owner !== f);
    const old = SM.push[f];
    SM.push[f] = enemy.length ? sm_pick(enemy).id : null;
    const pf = PLAYER && PLAYER.faction;
    if (pf === f && SM.push[f] && SM.push[f] !== old && sm_chance(0.7)) {
      const r = sm_pickRec((x) => x.faction === f && x.level >= 33);
      if (r) sm_say(r, 'faction', sm_pick(['everyone push ' + SM.pylons[SM.push[f]].name + '!', 'push ' + SM.pylons[SM.push[f]].name + ', they only have a few there', 'pylon push on ' + SM.pylons[SM.push[f]].name + ', 35+ come help']));
    }
  }
  // the war goes on while the player is elsewhere
  const Z = sm_zone();
  if (!(Z && Z.def.pvp) && sm_chance(0.4)) { const p = sm_pick(ps); sm_flip(p, p.owner === 'meridian' ? 'freehold' : p.owner === 'freehold' ? 'meridian' : sm_pick(['meridian', 'freehold'])); }
}

// ---------- death ----------
function simDeadUpdate(e, dt) {
  const A = e.ai;
  if (!A) return;
  try {
    if (!A.deadInit) { A.deadInit = true; A.corpseT = 10 + sm_rnd() * 20; A.foe = null; sm_onSimDeath(e); }
    if (e.deadT < A.corpseT) return;
    A.deadInit = false;
    const Z = sm_zone(), cb = ((Z && Z.def.pois) || []).filter((p) => p.type === 'clonebay');
    const inPT = e.team === TEAM;
    if (cb.length && (inPT || A.pvp || sm_chance(0.5))) { const p = sm_pick(cb); sm_revive(e, sm_around(p.x, p.z, 2, 5)); }
    else if (inPT) sm_revive(e, sm_entry(sm_city()));
    else { e.sim.zone = sm_city(); A.despawn = true; }
  } catch (err) { if (SM.warned++ < 12) console.warn('sim dead', err); A.despawn = true; }
}
function sm_revive(e, p) {
  e.dead = false; e.deadT = 0; e.buffs = []; e.cast = null; e.sitting = false; e.attacking = false; e.target = null; e.hate.clear();
  refreshStats(e);
  e.hp = Math.round(e.S.maxHp * 0.6); e.np = Math.round(e.S.maxNp * 0.5);
  sm_place(e, p);
  const A = e.ai;
  A.foe = null; A.goal = null; A.hitBy = null; A.fled = false; A.detour = null;
  if (e.team !== TEAM) A.mode = sm_baseMode(e);
}
function sm_onSimDeath(e) {
  if (e.team === TEAM) {
    sm_later(1.5 + sm_rnd() * 2, () => sm_say(e, 'team', sm_pick(['argh, dead', 'rip me, brb', 'died lol, running back', 'ouch. clone bay, brb'])));
    const o = TEAM.members.find((m) => m.kind === 'sim' && m !== e && !m.dead);
    if (o && sm_chance(0.5)) sm_later(3 + sm_rnd() * 2, () => sm_say(o, 'team', sm_pick(['rip ' + e.name, 'rip', 'oops'])));
  } else if (PLAYER && entDist(e, PLAYER) < 35 && sm_chance(0.3)) sm_later(1.5, () => sm_say(e.sim, 'vicinity', sm_pick(['ugh', 'well that went badly', 'lag killed me', 'nooo'])));
  else if (sm_chance(0.06)) sm_later(4, () => sm_say(e.sim, 'ooc', 'just died to ' + (e.ai.hitBy ? 'a ' + e.ai.hitBy.name : 'adds') + ', sigh'));
}

// ---------- chat ----------
const SM_QA = [
  { q: ['how do i get nano back faster?', 'out of nano all the time, help', 'how do you regen faster?'], k: /nano|regen|np\b|mana|rest/, a: ['sit down between fights (X), you regen about 3x faster sitting', 'sit (X) after every pull, regen is way faster sitting. nano recharge cells help too'] },
  { q: ['what should i spend IP on?', 'what do i do with improvement points?', 'IP advice for a new player?'], k: /\bip\b|improvement|skill point/, a: ['weapon skill and Body Development first, then your main nano school', 'you get IP every level. weapon skill, body dev, and the nano school your programs need'] },
  { q: ['how do missions work?', 'is the mission terminal worth it?', 'how do i pick mission rewards?'], k: /mission|terminal|slider/, a: ['use the mission terminal sliders to choose difficulty and the reward type you want', 'mission terminals in Halden, set the sliders for what reward you want, then go to the marked door'] },
  { q: ['do i lose stuff when i die?', 'i died, where do i go?', 'what does the clone bay do?'], k: /clone|die\b|died|death|respawn/, a: ['nope, you just wake up at your clone bay. register at the Halden clone bay so it saves your spot', 'clone sickness is just a 2 minute debuff, no item loss'] },
  { q: ['why am i getting no xp?', 'mobs give me 0 xp??', 'fastest way to level?'], k: /\bxp\b|\bexp\b|experience|levell?ing|level up/, a: ['grey mobs give no xp at all, fight stuff close to your level', 'team up, team kills give a bonus on top of the split'] },
  { q: ["can't equip this rifle, why?", 'why can i not wear this armour?', 'what are item requirements?'], k: /equip|requirement|reqs?\b|can.?t wear|can.?t use/, a: ['check the requirements in the tooltip, raise the skill with IP or use implants', 'reqs are checked on equip. implants and buffs count toward them'] },
  { q: ['how do implants work?', 'what are clusters?', 'are implants worth it?'], k: /implant|cluster/, a: ['implant surgeon in Halden. clusters go in the shiny, bright and faded sockets', 'implants boost abilities so you can wear better gear, totally worth it'] },
  { q: ["what's nano memory?", 'why do my buffs fail?', 'how many buffs can i run?'], k: /memory|ncu|buff/, a: ['every buff uses Nano Memory. levelling, Computer Literacy and memory banks raise it', 'only one buff per nanoline runs at a time, the stronger one wins'] },
  { q: ['how do i get to Broken Mesa?', 'how do people get to the Lumen Scar so fast?', 'what is the hopper?'], k: /hopper|travel|get to|shuttle/, a: ['the hopper in Halden flies to Mesa Outpost and Scar Outpost', 'take the shuttle from Landfall to Halden, then the hopper from there'] },
  { q: ['is the Lumen Scar worth it?', 'what do the pylons do?', 'can unaligned go to the Scar?'], k: /pylon|scar|pvp|contested/, a: ['hold 2 of the 3 pylons and your faction gets Lumen Resonance', 'Lumen Scar is 35+, Meridian and Freehold fight there. unaligned folks can\'t be attacked'] },
  { q: ['how do people make money here?', 'how do i get credits?', 'so broke lol, tips?'], k: /money|credit|cash|broke|\bcr\b/, a: ['missions pay best, and sell your loot at any vendor', 'sell junk to vendors and run missions, the credits add up fast'] },
  { q: ['how do i attack stuff lol', 'how does targeting work?', 'how do i use specials?'], k: /target|attack|special|fight/, a: ['Tab cycles targets, backquote toggles auto attack', 'specials like Burst have their own timers, put them on your hotbar'] },
  { q: ['is there autorun?', 'how do i run faster?'], k: /autorun|run faster|speed/, a: ['R is autorun', 'Run Speed skill and speed nanos. runners and wayfarers are fastest'] },
  { q: ['how do i talk to vendors', 'how do i use the bank?'], k: /talk|vendor|shop|bank|npc/, a: ['F or right-click to use people and terminals', 'walk up and press F, works on every vendor and terminal'] },
  { q: ['medkits barely heal me, normal?', 'what does first aid do?'], k: /medkit|first aid|heal/, a: ['raise First Aid, it scales medkit heals', 'First Aid makes medkits stronger, and medics have the best heals'] },
  { q: ['how do i join a team?', 'how does teaming work?'], k: /team|group|invite/, a: ['type /invite name, or answer someone\'s LFT in OOC', '/invite name and /leave. team kills share xp with a bonus'] },
  { q: ['help im stuck in a rock', 'stuck behind a wall, what do i do?'], k: /stuck/, a: ['type /stuck, it puts you back at a safe spot in the zone'] },
  { q: ['which breed is best for a medic?', 'does breed matter?'], k: /breed|savant|kestrel|bulwark|baseline/, a: ['savants for casters, big nano pools. bulwarks for tanks, huge HP', 'kestrels for agility and sense, baselines are even at everything'] },
];
const SM_LFT = ['{lvl} {prof} LFT', 'LFT {lvl} {prof}, {zone} or missions', '{lvl} {prof} looking for team, anything goes', 'LFM {zone} team, {lo}-{hi}, need {need}', 'LF2M for {dungeon}, need {need} + one dps', 'LF1M {need} then we go, {zone}', 'anyone want to team in {zone}? {lvl} {prof}', 'LFT for missions, {lvl} {prof}, can {role}', 'need a {need} for {boss}, /t me', '{lvl} {prof} lf duo partner, {zone}', 'LFG {dungeon} run, have {n}/6', 'team forming in {zone} for {mob}s, {lo}-{hi}, /t me for inv'];
const SM_TRADE = ['WTS {item} QL{ql}, {price} or best offer', 'selling {item} QL{ql} for {price}, /t me', 'WTS {item} QL{ql} cheap, need creds for implants', 'WTB {item} around QL{ql}, paying {price}', 'WTB {item} QL{ql}+ /t me', 'anyone selling {item}? QL{ql}ish', 'WTS {item} QL{ql}, {price}, can meet at the Halden bank', 'buying clusters, any QL, decent prices', 'WTS {implant} QL{ql}, {price}', 'pricecheck on {item} QL{ql}?', 'selling nanocrystals for {prof}s, tell me what you need'];
const SM_BANTER = [
  ['lag?', ['no lag here', 'bit laggy in Halden', 'fine for me', 'yes. everything is rubberbanding']],
  ['is the Scar Colossus up?', ['no idea, I stay far away from that thing', 'someone said it was down earlier', 'go look and tell us :P']],
  ['{mob}s hit way too hard for their level', ['they are fine, get better armour', 'agreed', 'skill issue :P']],
  ['Freehold forever', ['Meridian pays better, just saying', 'o7', 'sure, enjoy your mud huts'], 'freehold'],
  ['Meridian has the best gear, fight me', ['their prices are a crime', 'Freehold gear looks cooler though', 'o7'], 'meridian'],
  ['anyone else grinding {mob}s right now?', ['yep, {zone} is packed', 'me, send help', 'just finished, good xp']],
  ['gn all', ['gn', 'night', 'sleep well']],
  ['brb food', null],
  ['finally got my {weapon}!', ['grats', 'nice', 'gz, what QL?']],
  ['just died to a {mob} add. brb running back', ['rip', 'happens to the best of us', 'lol']],
  ['any {prof}s around? need a buff', ['{prof} here, where are you?', 'try the Halden bank, always a few there']],
  ['spent all my creds on implants, now I am broke', ['welcome to Ashreach', 'worth it though']],
  ['{zone} is packed today', ['tell me about it', 'everyone is out there']],
  ['the music in Halden is stuck in my head', ['same lol', 'good tune though']],
  ['nerf {prof}s', ['{prof}s are fine, learn to play', 'lol no', 'they hit me for 300 earlier...']],
  ['what is everyone levelling on today?', ['{mob}s in {zone}', 'missions, always missions', 'whatever is not grey']],
  ['remember to register at a clone bay before you go out, folks', ['wise words', 'learned that the hard way']],
  ['the hopper ride to Scar Outpost always makes me nervous', ['the Scar does that to people', 'just do not look down']],
  ['Rusty Lumen bar, drinks on me', ['omw', 'how generous', 'hold me a seat']],
  ['anyone been to the Sunken Foundry yet?', ['bring a healer, the slag golems hurt', 'yes, Overseer Kal-9 wrecked us']],
  ['who keeps training {mob}s to the zone line', ['not me', 'lol sorry']],
  ['wow, a QL{ql} {weapon} dropped off a {mob}', ['nice drop', 'lucky!', 'sell it to me']],
];
const SM_DING = ['ding {lvl}!', 'DING {lvl}', 'finally {lvl}', 'ding! {lvl} {prof} now', '{lvl}, finally...'];
const SM_GRATS = ['grats', 'gz', 'grats!', 'gratz {name}', 'nice, gz', 'congrats!', 'woo, gz', 'gz {name}'];
const SM_KS = ['hey, that was my mob', 'ks much?', 'wow, really?', 'i was fighting that...', 'ok take it then', 'kill stealer'];
const SM_VIC_CITY = {
  chatty: ['anyone going to {zone}?', 'this place never sleeps', 'hey all', '*waves*', 'what a day', 'anyone know a good {prof} build?', 'the Rusty Lumen is packed tonight', 'need to buy a better {weapon} soon'],
  trader: ['WTS {item} QL{ql}, {price}', 'buying clusters, any QL', 'selling nanocrystals, cheaper than the store', 'got a QL{ql} {item}, make me an offer'],
  roleplayer: ['The Concord keeps the peace here. Out there, nobody does.', 'Lumen in the air tonight. Can you smell it?', 'Meridian credits spend the same as any other... for now.', 'The Freeholds remember every stolen acre.', 'They say the Scar sings when a pylon changes hands.', 'Mind your coin, stranger. Halden has quick fingers.'],
  newbie: ['where is the bank?', 'how do i use the mission terminal?', 'what does Nano Memory do?', 'how do i get to the Lumen Scar?', 'is the clone bay free?'],
  helpful: ['new here? ask me anything', 'remember to register at the clone bay before heading out', 'buffs for anyone who asks'],
  grumpy: ['why is everyone standing on the clone bay', 'stop running into me', 'prices in this town are a joke', 'ugh, the hopper is always busy'],
  quiet: ['...', 'hm'],
};
const SM_VIC_FIELD = ['{mob}s everywhere', 'anyone need a buff?', 'this camp is mine btw', 'inc!', 'oops, pulled two', 'ugh, misses all day', 'nice spot', 'heal pls? no? ok', 'careful, {mob}s here hit hard', 'that one had a QL{ql} {weapon} lol'];
function sm_later(delay, fn) { SM.q.push({ t: SM.t + delay, fn }); }
function sm_runQueue() {
  if (!SM.q.length) return;
  const now = SM.q.filter((x) => x.t <= SM.t);
  if (!now.length) return;
  SM.q = SM.q.filter((x) => x.t > SM.t);
  for (const x of now) { try { x.fn(); } catch (err) { if (SM.warned++ < 12) console.warn('sim queue', err); } }
}
// casual typists drop the capital on ordinary opening words (never on names or WTS/LFT)
const SM_LOWER = /^(Anyone|Any|How|What|Where|Is|Why|Who|Selling|Buying|Finally|Just|Need|Nice|This|The|Check|Use|Sit|Missions|Nope|Hold|Remember|Spent|Team|Weapon|Weapons|Every|Only|Implant|Implants|Reqs|Raise|Grats|Ding|Ugh|Oops|Careful|Heals|Got|Sure|Hey|Hi|Yes|No|Not|Try|Walk|Type|Savants|Kestrels|First|Sell|Bring|Agreed|Lol|Thanks|Take|Hold|Free|New|Buffs|Stop|Prices|Sorry|Help|Can|Do|Does|Fastest|Mobs|Out|So|Medkits|Welcome|You|If|Happy|Busy|Cool|Haha|True|Good|Grey|Spend|Every|Nano|Sell|Reqs|Team|Too|Getting|Have|Thanks|Need|Gotta|My|Wow|Ok)\b/;
function sm_style(rec, s) {
  if (!rec || rec.pers === 'roleplayer') return s;
  if (rec.pers === 'newbie' || rec.casual) {
    if (SM_LOWER.test(s)) s = s.charAt(0).toLowerCase() + s.slice(1);
    if (sm_chance(0.6)) s = s.replace(/[.!]$/, '');
  }
  return s;
}
function sm_fill(s, ctx) { return s.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined && ctx[k] !== null ? ctx[k] : m)); }
// Say something as a sim (rec or ent). Vicinity needs the sim near the player; tells go to the player.
function sm_say(src, ch, text) {
  if (!src || !text || !SM.on || !PLAYER) return false;
  const rec = src.sim || src, e = rec.ent;
  if (ch === 'vicinity' && (!e || e.removed || entDist(e, PLAYER) > 40)) return false;
  if (ch === 'team' && (!e || e.team !== TEAM)) return false;
  if (ch === 'faction' && rec.faction !== PLAYER.faction) return false;
  text = sm_style(rec, text);
  if (ch !== 'team' && ch !== 'tell' && SM.recent.includes(ch + text)) return false;
  SM.recent.push(ch + text);
  if (SM.recent.length > 50) SM.recent.shift();
  if (ch === 'faction') EV.emit('chat', 'faction', rec.name, text, SM_FAC[rec.faction]);
  else EV.emit('chat', ch, rec.name, text);
  if (e && !e.removed && e.rig && e.rig.play && ch === 'vicinity' && !e.sitting && sm_chance(0.3)) e.rig.play('emote');
  return true;
}
function sm_tell(rec, text) { if (rec && text && SM.on && PLAYER) { SM.lastTell = rec; EV.emit('chat', 'tell', rec.name, sm_style(rec, text)); } }
const SM_PW = { chatty: 3, quiet: 0.25, helpful: 1.4, trader: 1.6, roleplayer: 1, grumpy: 1.2, newbie: 1.8 };
function sm_pickRec(filter, weight) {
  const opts = [];
  for (const r of SM.pop) if (!filter || filter(r)) opts.push([r, weight ? weight(r) : SM_PW[r.pers] || 1]);
  return opts.length ? sm_wpick(opts) : null;
}
function sm_plural(n) { return /[^aeiou]y$/.test(n) ? n.slice(0, -1) + 'ies' : /s$/.test(n) ? n + 'es' : n + 's'; }
function sm_zoneMob(zid, level) {
  const d = sm_defs()[zid];
  if (!d || typeof MOB_T === 'undefined') return null;
  const ids = [];
  for (const s of d.spawns || []) for (const id of s.mobs || []) { const T = MOB_T[id]; if (T && !T.named && !T.friendly && (!level || !s.lvl || (s.lvl[0] <= level + 3 && s.lvl[1] >= level - 6))) ids.push(id); }
  const id = sm_pick(ids);
  return id ? MOB_T[id].name : null;
}
function sm_huntZoneFor(level) {
  const zs = SM.zones.filter((z) => z.kind !== 'city' && z.kind !== 'interior' && sm_fits(level, z, 0));
  if (!zs.length) return SM.zones.find((z) => z.kind !== 'city' && z.lvl) || null;
  zs.sort((a, b) => Math.abs((a.lvl[0] + a.lvl[1]) / 2 - level) - Math.abs((b.lvl[0] + b.lvl[1]) / 2 - level));
  return zs[0];
}
function sm_price(v) { v = Math.max(10, Math.round(v)); return v < 1000 ? v + 'cr' : v < 1e6 ? (v / 1000).toFixed(v < 10000 ? 1 : 0).replace(/\.0$/, '') + 'k' : (v / 1e6).toFixed(1) + 'm'; }
function sm_tradeItem(level, kinds) {
  if (typeof ITEM_T === 'undefined') return { name: 'Field Medkit', ql: 20, price: '500cr' };
  const ids = Object.keys(ITEM_T).filter((id) => (kinds || ['weapon', 'armor', 'util']).includes(ITEM_T[id].kind) && !/basic/.test(id));
  const id = sm_pick(ids), T = ITEM_T[id];
  if (!T) return { name: 'Field Medkit', ql: 20, price: '500cr' };
  const ql = clamp(Math.round(level * frand(1.4, 2.6)), T.qlMin, Math.min(T.qlMax, 200));
  let v = 100 + ql * ql;
  try { v = itemPrice(makeItem(id, ql), true); } catch (err) { /* estimate */ }
  return { name: T.name, ql, price: sm_price(v * frand(0.7, 1.4)) };
}
function sm_ctx(rec) {
  const L = rec.level, hz = sm_huntZoneFor(L), it = sm_tradeItem(L), wp = sm_tradeItem(L, ['weapon']), im = sm_tradeItem(L, ['implant']);
  const dung = L >= 26 ? 'sunken_foundry' : 'smugglers_den';
  const boss = L >= 40 ? 'colossus' : L >= 26 ? 'overseer' : 'smuggler_boss';
  const bossN = (typeof MOB_T !== 'undefined' && MOB_T[boss] && MOB_T[boss].name) || { colossus: 'the Scar Colossus', overseer: 'Overseer Kal-9', smuggler_boss: 'Captain Varro' }[boss];
  const role = SM_ROLE[rec.prof];
  const otherProf = sm_pick(Object.keys(PROFS));
  const mob = hz && sm_zoneMob(hz.id, L);
  return {
    lvl: L, prof: SM_PROF_SHORT[rec.prof] || rec.prof, zone: hz ? hz.name : sm_zname(sm_city()), mob: mob || 'Rust Hound', item: it.name, ql: it.ql, price: it.price,
    weapon: wp.name, implant: im.name, dungeon: sm_zname(dung), boss: bossN, lo: Math.max(1, L - 3), hi: Math.min(50, L + 3), n: 2 + Math.floor(sm_rnd() * 3),
    need: sm_pick(['healer', 'tank', 'medic', 'bruiser', 'nuker', 'buffer', 'dps']), role: { heal: 'heal', tank: 'tank', pet: 'pet tank', nuke: 'nuke', cc: 'crowd control', debuff: 'debuff' }[role] || 'dps',
    name: PLAYER ? PLAYER.name : '', pname: PLAYER ? PLAYER.name : '', plvl: PLAYER ? PLAYER.level : 1,
    pfac: PLAYER ? SM_FAC[PLAYER.faction] : '', faction: SM_FAC[rec.faction], otherProf: SM_PROF_SHORT[otherProf],
  };
}
function sm_oocTick() {
  const r = sm_rnd();
  if (r < 0.2) {
    const rec = sm_pickRec((x) => x.pers !== 'quiet' && x.level >= 3);
    if (rec) sm_say(rec, 'ooc', sm_fill(sm_pick(SM_LFT), sm_ctx(rec)));
  } else if (r < 0.4) {
    const rec = sm_pickRec(null, (x) => (x.pers === 'trader' ? 6 : x.pers === 'quiet' ? 0.1 : 0.7));
    if (!rec) return;
    const line = sm_fill(sm_pick(SM_TRADE), sm_ctx(rec));
    sm_say(rec, 'ooc', line);
    if (/pricecheck/.test(line)) { const o = sm_pickRec((x) => x.pers === 'trader' && x !== rec); if (o) sm_later(4 + sm_rnd() * 6, () => sm_say(o, 'ooc', sm_tradeItem(rec.level).price + 'ish')); }
  } else if (r < 0.6) {
    const qa = sm_pick(SM_QA);
    const nb = sm_pickRec((x) => x.level < 20, (x) => (x.pers === 'newbie' ? 6 : 1));
    const vet = sm_pickRec((x) => x.level >= 15 && x !== nb, (x) => (x.pers === 'helpful' ? 5 : x.pers === 'chatty' ? 2 : x.pers === 'grumpy' ? 0.5 : 0.6));
    if (!nb) return;
    sm_say(nb, 'ooc', sm_pick(qa.q));
    if (vet) sm_later(4 + sm_rnd() * 7, () => sm_say(vet, 'ooc', vet.pers === 'grumpy' && sm_chance(0.5) ? 'read the help (F1)' : sm_pick(qa.a)));
    if (vet && sm_chance(0.35)) sm_later(14 + sm_rnd() * 6, () => sm_say(nb, 'ooc', sm_pick(['ty!', 'thanks!!', 'oh cool, thx', 'ahh ok'])));
  } else if (r < 0.84) {
    const b = sm_pick(SM_BANTER);
    const rec = sm_pickRec((x) => !b[2] || x.faction === b[2]);
    if (!rec) return;
    const ctx = sm_ctx(rec);
    sm_say(rec, 'ooc', sm_fill(b[0], ctx));
    if (b[1] && sm_chance(0.75)) { const o = sm_pickRec((x) => x !== rec); if (o) sm_later(3 + sm_rnd() * 8, () => sm_say(o, 'ooc', sm_fill(sm_pick(b[1]), ctx))); }
  } else if (r < 0.92) {
    const rec = sm_pickRec((x) => x.level >= 5 && x.pers !== 'quiet');
    if (rec) sm_ding(rec);
  } else {
    const rec = sm_pickRec(null);
    if (rec) sm_say(rec, 'ooc', sm_pick(['anyone know when the next patch is?', 'hi all', 'o/', 'back', 'what a session', 'that was close', 'who wants to run {dungeon}?'].map((s) => sm_fill(s, sm_ctx(rec)))));
  }
}
function sm_ding(rec) {
  sm_say(rec, 'ooc', sm_fill(sm_pick(SM_DING), { lvl: rec.level, prof: SM_PROF_SHORT[rec.prof] }));
  const n = Math.floor(sm_rnd() * 3);
  for (let i = 0; i < n; i++) { const o = sm_pickRec((x) => x !== rec && x.pers !== 'grumpy'); if (o) sm_later(2 + sm_rnd() * 6 + i * 2, () => sm_say(o, 'ooc', sm_fill(sm_pick(SM_GRATS), { name: rec.name.split(' ')[0] }))); }
}
function sm_vicTick() {
  const P = PLAYER, Z = sm_zone();
  const near = SM.ents.filter((e) => !e.removed && !e.dead && entDist(e, P) < 35 && e.team !== TEAM);
  if (!near.length) return;
  const e = sm_pick(near), rec = e.sim, ctx = sm_ctx(rec);
  if (Z.def.safe) {
    const L = SM_VIC_CITY[rec.pers] || SM_VIC_CITY.chatty;
    const line = sm_fill(sm_pick(L), ctx);
    if (!sm_say(e, 'vicinity', line)) return;
    if (rec.pers === 'newbie') {
      const vet = near.find((o) => o !== e && o.sim.pers !== 'newbie' && o.level >= 12);
      const a = sm_answer(line.toLowerCase());
      if (vet && a) sm_later(3 + sm_rnd() * 4, () => sm_say(vet, 'vicinity', a));
    }
  } else if (e.ai.mode !== 'pvp' && rec.pers !== 'quiet') sm_say(e, 'vicinity', sm_fill(sm_pick(SM_VIC_FIELD), ctx));
}
function sm_facTick() {
  const P = PLAYER;
  if (!P || P.faction === 'unaligned') return;
  const rec = sm_pickRec((x) => x.faction === P.faction && x.level >= 25);
  if (!rec) return;
  const ps = Object.values(SM.pylons), held = ps.filter((p) => p.owner === P.faction).length;
  const p = sm_pick(ps);
  const lines = ['who is in the Scar right now?', 'recruiting for a pylon push in the Lumen Scar, 35+', 'any healers free for the Scar?'];
  if (ps.length) lines.push('we hold ' + held + '/' + ps.length + ' pylons, keep it up', 'need heals at ' + p.name, (P.faction === 'meridian' ? 'Freehold' : 'Meridian') + ' zerg incoming at ' + p.name, 'everyone to ' + p.name + '!');
  sm_say(rec, 'faction', sm_pick(lines));
}
// Unprompted tells: offers, questions, invites.
function sm_tellTick() {
  const P = PLAYER, Z = sm_zone();
  if (!P || P.dead) return;
  const solo = TEAM.members.length <= 1;
  const near = SM.ents.filter((e) => !e.removed && !e.dead && !e.team && Math.abs(e.level - P.level) <= 4 && e.ai.mode !== 'pvp' && !e.ai.leaving && !isHostile(e, P));
  if (solo && near.length && !Z.def.safe && !SM.invite && sm_chance(0.55)) {
    near.sort((a, b) => entDist(a, P) - entDist(b, P));
    const e = near[Math.floor(sm_rnd() * Math.min(3, near.length))], ctx = sm_ctx(e.sim);
    if (e.sim.pers === 'quiet' || e.sim.pers === 'grumpy') return;
    sm_tell(e.sim, sm_fill(sm_pick(['hey, want to team up for {zone}?', 'you look like you could use a {role}. team?', 'lf duo partner, want in? sending inv', 'team? xp is better together']), ctx));
    sm_later(2.5 + sm_rnd() * 2, () => { if (!e.removed && !e.dead && TEAM.members.length <= 1) sm_simInvite(e); });
    return;
  }
  const rec = sm_pickRec((x) => x.pers !== 'quiet' && x.pers !== 'grumpy');
  if (!rec) return;
  const ctx = sm_ctx(rec);
  const L = {
    trader: ['need any {item}? got QL{ql} for {price}', 'buying any loot you have, decent prices'],
    newbie: ['hi! how did you get to {plvl}? any tips?', 'sorry to bother, where is the mission terminal?'],
    roleplayer: ['Greetings, traveller. The lumen remembers those who stand together.', 'A {pfac} in these parts? Walk carefully, friend.'],
    helpful: ['if you ever need a buff or directions, send me a tell :)', 'welcome to Ashreach! /t me if you get lost'],
    chatty: ['hey {pname}, saw you earlier, nice gear', 'how is your day going?', 'do you know if {zone} is busy right now?'],
  }[rec.pers] || ['hi'];
  sm_tell(rec, sm_fill(sm_pick(L), ctx));
}

// ---------- answering the player ----------
function sm_where(t) {
  // mobs
  if (typeof MOB_T !== 'undefined') for (const id in MOB_T) {
    const T = MOB_T[id], n = T.name.toLowerCase();
    if (T.friendly || !(t.includes(n) || t.includes(sm_plural(n)) || (n.split(' ').length > 1 && t.includes(n.split(' ').pop())))) continue;
    const zs = SM.zones.filter((z) => ((sm_defs()[z.id] || {}).spawns || []).some((s) => (s.mobs || []).includes(id)));
    if (zs.length) return (T.named ? T.name + ' is in ' : sm_plural(T.name) + ' are in ') + zs.map((z) => z.name + (z.lvl && z.kind !== 'city' ? ' (' + z.lvl[0] + '-' + z.lvl[1] + ')' : '')).join(' and ');
  }
  // places
  const KW = [[/bank|vault/, (p) => p.type === 'bank'], [/clone/, (p) => p.type === 'clonebay'], [/mission|terminal/, (p) => p.type === 'terminal'], [/hopper/, (p) => p.type === 'hopper'], [/shuttle/, (p) => p.type === 'shuttle'], [/trainer/, (p) => p.type === 'trainer'],
    [/implant/, (p) => p.type === 'vendor' && /implant/.test(p.role || p.name.toLowerCase())], [/weapon|gun/, (p) => p.type === 'vendor' && /weapon/.test(p.role || '')], [/armou?r/, (p) => p.type === 'vendor' && /armor/.test(p.role || '')],
    [/nano/, (p) => p.type === 'vendor' && /nano/.test(p.role || '')], [/vendor|shop|store/, (p) => p.type === 'vendor'], [/bar|rusty|drink/, (p) => /bar|keep/i.test(p.name || '')], [/embassy|meridian/, (p) => p.data && p.data.faction === 'meridian'], [/lodge|freehold/, (p) => p.data && p.data.faction === 'freehold']];
  for (const [re, fn] of KW) {
    if (!re.test(t)) continue;
    const Z = sm_zone(), here = Z && (Z.def.pois || []).find(fn);
    if (here) return (here.name || 'it') + ', right here in ' + Z.def.name;
    for (const z of SM.zones) { const p = ((sm_defs()[z.id] || {}).pois || []).find(fn); if (p) return (p.name || 'one') + ' in ' + z.name; }
  }
  // zones
  for (const z of SM.zones) {
    if (!t.includes(z.name.toLowerCase()) && !t.includes(z.id.replace('_', ' '))) continue;
    const path = sm_path(sm_city(), z.id);
    const via = path && path.length > 2 ? ', go through ' + path.slice(1, -1).map(sm_zname).join(' then ') : '';
    return z.name + (z.lvl && z.kind !== 'city' ? ' is a ' + z.lvl[0] + '-' + z.lvl[1] + ' zone' : ' is the city') + (z.id !== sm_city() ? via || ', reachable from ' + sm_zname(sm_city()) : '');
  }
  return null;
}
function sm_levelTip(L) {
  const z = sm_huntZoneFor(L);
  if (!z) return 'missions are always good xp';
  const mob = sm_zoneMob(z.id, L);
  return 'at ' + L + ' I would go to ' + z.name + (mob ? ', the ' + sm_plural(mob) + ' there are about right' : '') + '. missions are good too';
}
function sm_answer(t) {
  if (/\bwhere\b|\bfind\b|how do i get to|location/.test(t)) { const w = sm_where(t); if (w) return w; }
  if (/(what|which|good).*(level|lvl|zone|spot|place)|where.*(level|lvl|hunt)|level at\b/.test(t)) return sm_levelTip(PLAYER ? PLAYER.level : 10);
  for (const qa of SM_QA) if (qa.k.test(t)) return sm_pick(qa.a);
  return null;
}
function sm_replyTo(rec, t) {
  if (/^(hi|hey|hello|yo|sup|hiya|greetings|o\/|howdy)\b/.test(t)) return sm_pick(rec.pers === 'roleplayer' ? ['Well met.', 'Greetings, friend.'] : rec.pers === 'grumpy' ? ['what', 'yes?', 'hi I guess'] : ['hey', 'hi :)', 'yo', 'o/', 'hiya']);
  if (/\b(thanks|thx|ty|cheers)\b/.test(t)) return sm_pick(['np', 'np!', 'anytime', 'no worries']);
  if (/what.*(level|lvl)|\blevel\?|\blvl\?|your level/.test(t)) return rec.level + ' ' + SM_PROF_SHORT[rec.prof] + ', you?';
  if (/\b(sell|wts|buy|wtb|price|how much)\b/.test(t)) {
    const it = sm_tradeItem(rec.level);
    return rec.pers === 'trader' ? sm_pick(['I can do ' + it.price + ' for it', 'I have a QL' + it.ql + ' ' + it.name + ' for ' + it.price, 'sold already, sorry. got a QL' + it.ql + ' ' + it.name + ' though']) : sm_pick(['not selling anything, sorry', 'try asking in OOC', 'I am broke lol']);
  }
  if (/\bbuff/.test(t)) return rec.ent && rec.ent.ai && rec.ent.ai.kit.fbuff.length ? 'sure, come find me in ' + sm_zname(rec.zone) : 'not a buffer, sorry';
  if (/\b(lol|haha|lmao)\b/.test(t)) return sm_pick(['lol', 'haha', ':D']);
  const a = sm_answer(t);
  if (a) return a;
  if (/\?$/.test(t)) return sm_pick(rec.pers === 'helpful' ? ['not sure, try asking in OOC', 'hmm, no idea sorry'] : ['no idea', 'dunno', 'no clue, sorry']);
  return sm_pick({ chatty: ['haha yeah', 'true', 'nice', 'oh really?'], quiet: ['k', 'ok', '?'], helpful: ['what do you need?', 'happy to help'], trader: ['need anything? I have lots of gear'], roleplayer: ['Indeed.', 'The lumen hears you.'], grumpy: ['busy', 'ok', 'what do you want'], newbie: ['cool', 'i am new here lol'] }[rec.pers] || ['ok']);
}
function sm_replyTell(rec, msg) {
  const t = msg.toLowerCase().trim();
  if (rec.pers === 'quiet' && sm_chance(0.2)) return;
  const delay = 2 + sm_rnd() * 5;
  if (/\b(team|group|inv|invite|join|duo|lft|lfg|party)\b/.test(t)) {
    sm_later(delay, () => {
      const d = sm_wouldTeam(rec);
      if (!d.ok) { sm_tell(rec, d.why); return; }
      const e = rec.ent;
      if (e && !e.removed && !e.dead) {
        if (TEAM.members.length > 1 && TEAM.leader === PLAYER) { sm_tell(rec, 'sure, send me an invite'); rec.wantInv = SM.t + 120; }
        else if (TEAM.members.length <= 1) { sm_tell(rec, 'sure, sending inv'); sm_later(2, () => sm_simInvite(e)); }
        else sm_tell(rec, 'you are not the leader, ask them to inv me');
      } else { rec.wantInv = SM.t + 300; sm_tell(rec, 'sure, I am in ' + sm_zname(rec.zone) + '. send me an invite and I will come over'); }
    });
    return;
  }
  sm_later(delay, () => sm_tell(rec, sm_replyTo(rec, t)));
}
function sm_onPlayerChat(ch, text, to) {
  if (!SM.on || !PLAYER || !text) return;
  const key = ch + '|' + text + '|' + (to || '');
  if (key === SM.lastPC && SM.t - SM.lastPCt < 0.5) return;
  SM.lastPC = key; SM.lastPCt = SM.t;
  const t = String(text).toLowerCase().trim(), P = PLAYER;
  if (ch === 'tell') {
    const { rec, msg } = sm_parseName((to ? to + ' ' : '') + text);
    if (!rec) { sm_sys('No one by that name is online.'); return; }
    SM.lastTell = rec;
    sm_replyTell(rec, msg || text);
    return;
  }
  const mention = SM.pop.find((r) => t.includes(r.name.toLowerCase()) || (r.name.includes(' ') && t.includes(r.name.toLowerCase().split(' ')[0] + ' ')));
  if (ch === 'team') {
    const sims = TEAM.members.filter((m) => m.kind === 'sim' && !m.dead);
    if (!sims.length) return;
    const who = (mention && sims.find((m) => m.sim === mention)) || sm_pick(sims);
    let r = null;
    if (/\bheal/.test(t)) { const h = sims.find((m) => m.ai.kit.heal.length); if (h) { const id = sm_first(h, h.ai.kit.heal, (n) => n.target !== 'self'); if (id) sm_cast(h, id, P); sm_later(1, () => sm_say(h, 'team', sm_pick(['on it', 'healing', 'got you']))); } return; }
    if (/\bbuff/.test(t)) { for (const m of sims) { m.ai.nextBuff = 0; sm_prep(m); } r = sm_pick(['buffing', 'sure', 'k']); }
    else if (/\b(rest|sit|med|break)\b/.test(t)) r = sm_pick(['k', 'good idea', 'sitting']);
    else if (/\b(ready|rdy|pull|go|lets go)\b/.test(t)) r = sm_pick(['rdy', 'go go', 'ready', 'k']);
    else if (/\b(wait|stop|hold)\b/.test(t)) r = sm_pick(['k', 'waiting', 'ok']);
    else if (/\bding\b/.test(t)) r = sm_pick(['grats!!', 'gz!', 'nice ding']);
    else if (mention || sm_chance(0.5)) r = sm_replyTo(who.sim, t);
    if (r) sm_later(1 + sm_rnd() * 3, () => sm_say(who, 'team', r));
    return;
  }
  if (ch === 'vicinity' || ch === 'shout' || ch === 'say') {
    const range = ch === 'shout' ? 120 : 25;
    const near = SM.ents.filter((e) => !e.removed && !e.dead && entDist(e, P) < range);
    if (!near.length) return;
    const who = (mention && near.find((e) => e.sim === mention)) || sm_pick(near);
    if (!mention && !sm_chance(/\?|^(hi|hey|hello|yo)\b/.test(t) ? 0.75 : 0.25)) return;
    const r = sm_replyTo(who.sim, t);
    if (r) sm_later(1.5 + sm_rnd() * 3, () => sm_say(who, 'vicinity', r));
    return;
  }
  if (ch === 'faction') {
    const rec = sm_pickRec((x) => x.faction === P.faction && x.level >= 25);
    if (rec && sm_chance(0.6)) sm_later(2 + sm_rnd() * 4, () => sm_say(rec, 'faction', /pylon|push|help|scar/.test(t) ? sm_pick(['on my way', 'omw', 'coming', 'give me 2 min']) : sm_pick(['o7', 'aye', 'agreed'])));
    return;
  }
  if (ch === 'ooc') {
    if (/^(hi|hey|hello|yo|sup|o\/|hiya)\b/.test(t)) {
      const n = Math.floor(sm_rnd() * 3);
      for (let i = 0; i < n; i++) { const r = sm_pickRec((x) => x.pers !== 'quiet' && x.pers !== 'grumpy'); if (r) sm_later(2 + sm_rnd() * 5 + i * 2, () => sm_say(r, 'ooc', sm_pick(['hi', 'hey ' + P.name.split(' ')[0], 'o/', 'yo', 'hello!']))); }
      return;
    }
    if (/\bding\b/.test(t)) {
      const n = 1 + Math.floor(sm_rnd() * 3);
      for (let i = 0; i < n; i++) { const r = sm_pickRec((x) => x.pers !== 'grumpy'); if (r) sm_later(2 + sm_rnd() * 5 + i * 2, () => sm_say(r, 'ooc', sm_fill(sm_pick(SM_GRATS), { name: P.name.split(' ')[0] }))); }
      return;
    }
    if (/\b(lft|lfg|lf team|looking for (a )?team|lfm|lf\dm)\b/.test(t)) {
      const Z = sm_zone();
      const cand = SM.ents.filter((e) => !e.removed && !e.dead && e.team !== TEAM && Math.abs(e.level - P.level) <= 5 && e.ai.mode !== 'pvp' && !isHostile(e, P) && !['quiet', 'grumpy'].includes(e.sim.pers));
      if (cand.length && TEAM.members.length <= 1 && !Z.def.generated) {
        cand.sort((a, b) => entDist(a, P) - entDist(b, P));
        const e = cand[Math.floor(sm_rnd() * Math.min(3, cand.length))];
        sm_later(3 + sm_rnd() * 6, () => { sm_tell(e.sim, sm_fill(sm_pick(['{lvl} {prof} here, want to team?', 'I can join, {lvl} {prof}. sending inv', 'hey, looking too. inv sent']), sm_ctx(e.sim))); sm_later(2, () => { if (TEAM.members.length <= 1) sm_simInvite(e); }); });
      } else { const r = sm_pickRec((x) => Math.abs(x.level - P.level) <= 6 && x.pers !== 'quiet' && x.zone !== Z.id && !x.ent); if (r) sm_later(4 + sm_rnd() * 6, () => sm_tell(r, 'I would but I am in ' + sm_zname(r.zone) + '. /t me if you still need someone later')); }
      return;
    }
    if (/\b(wts|sell|selling)\b/.test(t)) { const r = sm_pickRec((x) => x.pers === 'trader'); if (r && sm_chance(0.7)) sm_later(4 + sm_rnd() * 8, () => sm_tell(r, sm_pick(['how much?', 'what QL?', 'interested, price?']))); return; }
    if (/\b(wtb|buy|buying)\b/.test(t)) { const r = sm_pickRec((x) => x.pers === 'trader'); if (r && sm_chance(0.7)) { const it = sm_tradeItem(P.level); sm_later(4 + sm_rnd() * 8, () => sm_tell(r, 'I might have one, QL' + it.ql + ', ' + it.price + '. I am in ' + sm_zname(r.zone))); } return; }
    if (/\blag\b/.test(t)) { const r = sm_pickRec(null); if (r) sm_later(2 + sm_rnd() * 4, () => sm_say(r, 'ooc', sm_pick(['no lag here', 'fine for me', 'a bit, yeah']))); return; }
    const a = sm_answer(t);
    if (a || /\?$/.test(t)) {
      const r = sm_pickRec((x) => x.level >= 12, (x) => (x.pers === 'helpful' ? 5 : x.pers === 'chatty' ? 2 : 0.5));
      if (r) sm_later(3 + sm_rnd() * 6, () => sm_say(r, 'ooc', a || sm_pick(['no idea sorry', 'try the help (F1)', 'good question'])));
      return;
    }
    if (sm_chance(0.2)) { const r = sm_pickRec((x) => x.pers === 'chatty'); if (r) sm_later(3 + sm_rnd() * 5, () => sm_say(r, 'ooc', sm_pick(['lol', 'true', 'haha', 'same']))); }
  }
}

// ---------- slash commands ----------
function sm_who(filter) {
  const Z = sm_zone();
  const list = SM.ents.filter((e) => !e.removed).concat(PLAYER ? [PLAYER] : []);
  const f = String(filter || '').toLowerCase();
  const rows = list.filter((e) => !f || e.name.toLowerCase().includes(f) || (e.char && e.char.prof.startsWith(f))).sort((a, b) => b.level - a.level);
  sm_sys(rows.length + ' player' + (rows.length === 1 ? '' : 's') + ' in ' + (Z ? Z.def.name : 'this zone') + ':');
  for (const e of rows.slice(0, 25)) sm_sys('  ' + e.name + ' — ' + e.level + ' ' + sm_profName(e.char ? e.char.prof : '') + ' (' + (SM_FAC[e.faction] || e.faction) + ')' + (e.team === TEAM && e !== PLAYER ? ' [team]' : '') + (e.dead ? ' [dead]' : ''));
  if (rows.length > 25) sm_sys('  ...and ' + (rows.length - 25) + ' more.');
}
function sm_entByName(a) {
  if (!a) return PLAYER && PLAYER.target;
  const { rec } = sm_parseName(a);
  return rec && rec.ent && !rec.ent.removed ? rec.ent : null;
}
function simChatCommand(cmd, args) {
  if (!SM.on || !PLAYER) return false;
  const a = (Array.isArray(args) ? args.join(' ') : String(args == null ? '' : args)).trim();
  try {
    switch (String(cmd).toLowerCase()) {
      case 'invite': case 'inv': {
        const t = PLAYER.target;
        if (!a && !(t && t.kind === 'sim')) { sm_sys('Usage: /invite name (or target someone first).'); return true; }
        teamInvite(a || t); return true;
      }
      case 'leave': case 'disband': teamLeave(); return true;
      case 'kick': { const e = sm_entByName(a); if (!e) sm_sys('Usage: /kick name'); else teamKick(e); return true; }
      case 'accept': teamAccept(); return true;
      case 'decline': teamDecline(); return true;
      case 'who': sm_who(a); return true;
      case 't': case 'tell': case 'w': case 'msg': {
        const { rec, msg } = sm_parseName(a);
        if (!rec) { sm_sys('No one by that name is online.'); return true; }
        if (!msg) { sm_sys('Usage: /t name message'); return true; }
        EV.emit('chat', 'tell', PLAYER.name, msg, rec.name);
        SM.lastTell = rec;
        sm_replyTell(rec, msg);
        return true;
      }
      case 'r': case 'reply': {
        if (!SM.lastTell || !a) { sm_sys('Nobody to reply to.'); return true; }
        EV.emit('chat', 'tell', PLAYER.name, a, SM.lastTell.name);
        sm_replyTell(SM.lastTell, a);
        return true;
      }
      case 'follow': {
        const e = sm_entByName(a);
        if (!e || e === PLAYER || e.kind === 'npc' || e.dead) { if (SM.follow) { SM.follow = null; sm_sys('You stop following.'); } else sm_sys('Target someone to follow.'); return true; }
        SM.follow = e; sm_sys('You are now following ' + e.name + '.');
        return true;
      }
      case 'assist': {
        const e = sm_entByName(a);
        if (!e || !e.target || e.target.dead) { sm_sys((e ? e.name : 'Your target') + ' has no target.'); return true; }
        setTarget(e.target);
        return true;
      }
      case 'ooc': case 'o': case 'team': case 'tm': case 'p': case 'say': case 'faction': case 'f': {
        if (!a) { sm_sys('Say what?'); return true; }
        const ch = { o: 'ooc', tm: 'team', p: 'team', say: 'vicinity', f: 'faction' }[cmd] || cmd;
        if (ch === 'team' && TEAM.members.length <= 1) { sm_sys('You are not in a team.'); return true; }
        if (ch === 'faction' && PLAYER.faction === 'unaligned') { sm_sys('The Unaligned have no faction channel.'); return true; }
        EV.emit('chat', ch, PLAYER.name, a, ch === 'faction' ? SM_FAC[PLAYER.faction] : undefined);
        sm_onPlayerChat(ch, a);
        return true;
      }
      case 'pylons': {
        const ps = simPylons();
        if (!ps.length) sm_sys('No pylon fields are known.');
        for (const p of ps) sm_sys(p.name + ': ' + (SM_FAC[p.owner] || p.owner) + (p.by ? ' (contested by the ' + SM_FAC[p.by] + ')' : ''));
        return true;
      }
    }
  } catch (err) { if (SM.warned++ < 12) console.warn('sim command', err); return true; }
  return false;
}

// ---------- events ----------
EV.on('playerchat', (ch, text, to) => { try { sm_onPlayerChat(ch, text, to); } catch (err) { if (SM.warned++ < 12) console.warn('sim chat', err); } });
EV.on('dmg', (src, tgt) => {
  if (!SM.on || !src || !tgt || src === tgt) return;
  if (tgt.kind === 'sim' && tgt.ai) { tgt.ai.hitBy = src; tgt.ai.hitT = SM.t; }
  // kill-steal grumbles
  if ((src === PLAYER || (src.kind === 'pet' && src.owner === PLAYER)) && tgt.kind === 'mob') {
    for (const s of SM.ents) {
      if (!s.ai || s.ai.foe !== tgt || s.team === TEAM || s.dead || s.removed) continue;
      if (!(tgt.tagger === s || tgt.hate.has(s)) || SM.t < (s.ai.ksT || 0)) break;
      s.ai.ksT = SM.t + 120;
      if (sm_chance(s.sim.pers === 'grumpy' ? 0.85 : 0.35)) sm_later(1 + sm_rnd() * 2, () => sm_say(s, 'vicinity', sm_pick(SM_KS)));
      break;
    }
  }
});
// Dusk and dawn get a few remarks from whoever is around (and from the OOC crowd).
const SM_DUSK = ['getting dark out here', 'night already? lost track of time', 'mobs get twitchy after dark, careful', 'love the stars over the Flats', 'can barely see the hounds lol', 'night shift, who is with me', 'lamps are on in Halden, heading back'];
const SM_DAWN = ['morning all', 'sun is up, finally', 'pulled an all-nighter grinding, worth it', 'gm', 'dawn already? one more mission', 'coffee and missions, the breakfast of champions'];
EV.on('daynight', (ph) => {
  if (!SM.on || !PLAYER || (ph !== 'dusk' && ph !== 'dawn')) return;
  try {
    const lines = ph === 'dusk' ? SM_DUSK : SM_DAWN;
    const near = SM.ents.filter((e) => !e.removed && !e.dead && entDist(e, PLAYER) < 40);
    if (near.length && sm_chance(0.7)) { const e = sm_pick(near); sm_later(2 + sm_rnd() * 6, () => sm_say(e, 'vicinity', sm_pick(lines))); }
    const far = SM.pop.filter((r) => !r.ent || r.ent.removed);
    if (far.length && sm_chance(0.6)) { const r = sm_pick(far); sm_later(5 + sm_rnd() * 10, () => sm_say(r, 'ooc', sm_pick(lines))); }
  } catch (err) { console.error(err); }
});
EV.on('levelup', (ent, lvl) => {
  if (!SM.on || !PLAYER || !ent) return;
  try {
    if (ent === PLAYER) {
      for (const m of TEAM.members) if (m.kind === 'sim' && sm_chance(0.7)) sm_later(1 + sm_rnd() * 3, () => sm_say(m, 'team', sm_fill(sm_pick(SM_GRATS.concat(['grats!!', 'nice ding'])), { name: PLAYER.name.split(' ')[0] })));
      const near = SM.ents.filter((e) => !e.removed && e.team !== TEAM && entDist(e, PLAYER) < 30);
      for (let i = 0; i < Math.min(2, near.length); i++) if (sm_chance(0.5)) { const e = near[i]; sm_later(2 + sm_rnd() * 3, () => sm_say(e, 'vicinity', sm_fill(sm_pick(SM_GRATS), { name: PLAYER.name.split(' ')[0] }))); }
      SM.resOn && sm_later(1, () => { const b = PLAYER.buffs.find((x) => x.line === 'lumen_resonance'); if (b) removeBuff(PLAYER, b, true); sm_resonance(); });
    } else if (ent.kind === 'sim' && ent.char) {
      // spend the new IP, learn new programs, keep the record in step
      sm_spendIp(ent.char);
      sm_learnNanos(ent.char);
      refreshStats(ent);
      if (ent.ai) ent.ai.kit = sm_kit(ent.char);
      sm_sync(ent.sim);
      if (ent.team === TEAM) sm_later(1, () => sm_say(ent, 'team', sm_pick(['ding ' + lvl + '!', 'ding!', 'woo, ' + lvl])));
      else if (entDist(ent, PLAYER) < 30 && sm_chance(0.4)) sm_later(1, () => sm_say(ent, 'vicinity', 'ding!'));
      else if (sm_chance(0.1)) sm_ding(ent.sim);
    }
  } catch (err) { if (SM.warned++ < 12) console.warn('sim levelup', err); }
});
EV.on('death', (e) => {
  if (!SM.on || e !== PLAYER) return;
  const mates = TEAM.members.filter((m) => m.kind === 'sim' && !m.dead);
  if (mates.length) { const m = sm_pick(mates); sm_later(1 + sm_rnd() * 2, () => sm_say(m, 'team', sm_pick(['rip', 'noooo', "oops, sorry, couldn't save you", 'rip :( see you back here']))); }
  else { const n = SM.ents.find((s) => !s.removed && !s.dead && entDist(s, PLAYER) < 25); if (n && sm_chance(0.3)) sm_later(2, () => sm_say(n, 'vicinity', sm_pick(['rip', 'ouch', 'o7']))); }
});
EV.on('kill', (killer, victim) => {
  if (!SM.on || !victim || victim.kind !== 'mob' || !victim.tpl || !victim.tpl.named) return;
  const k = killer && (killer.kind === 'pet' ? killer.owner : killer);
  if (k && k.team === TEAM) { const m = TEAM.members.find((x) => x.kind === 'sim' && !x.dead); if (m) sm_later(1.5, () => sm_say(m, 'team', sm_pick(['gz!', 'GG', 'nice!', 'down it goes']))); }
});

// ---------- population ----------
function sm_arrive(rec, from) {
  const Z = sm_zone();
  if (!Z || rec.ent) return null;
  rec.zone = Z.id;
  const p = sm_entry(from || sm_pick([...sm_adj(Z.id)]) || sm_city());
  const e = sm_spawn(rec, p);
  if (e && e.ai.mode === 'social') e.ai.spot = null;
  return e;
}
function sm_balance() {
  const Z = sm_zone();
  if (!Z || Z.def.generated) return;
  const act = SM.ents.filter((e) => !e.removed && e.team !== TEAM && !e.ai.leaving).length;
  const [lo, hi] = SM.cap;
  if (sm_chance(0.15)) SM.target = clamp(SM.target + (sm_chance(0.5) ? 1 : -1), lo, hi);
  if (act < SM.target - 1 || (act < hi && sm_chance(0.2))) {
    let rec = sm_pick(SM.pop.filter((r) => r.zone === Z.id && !r.ent && !r.pendingJoin));
    if (!rec) rec = sm_pick(SM.pop.filter((r) => !r.ent && !r.pendingJoin && sm_fitsZone(r, Z.id)));
    if (rec) { const from = rec.zone !== Z.id ? rec.zone : null; sm_arrive(rec, from); }
  } else if (act > SM.target + 1 || (act > lo && sm_chance(0.2))) {
    const c = SM.ents.filter((e) => !e.removed && !e.dead && !e.team && !e.ai.leaving && e.ai.mode !== 'fight' && e.ai.mode !== 'pvp');
    c.sort((a, b) => entDist(b, PLAYER) - entDist(a, PLAYER));
    const e = c[Math.floor(sm_rnd() * Math.min(4, c.length))];
    if (e) sm_leave(e, sm_pickZone(e.sim, Z.def.safe ? 0 : 0.5));
  }
}
function sm_lvlTime(L) { return 1500 + L * 220; }
function sm_bgTick(dt) {
  for (const r of SM.pop) {
    if (r.ent || r.level >= MAX_LEVEL) continue;
    r.xp += dt / sm_lvlTime(r.level);
    if (r.xp >= 1) { r.xp -= 1; r.level++; r.char = null; if (sm_chance(0.12)) sm_ding(r); }
  }
}
function sm_moveTick() {
  const Z = sm_zone();
  const bg = SM.pop.filter((r) => !r.ent && !r.pendingJoin);
  if (!bg.length) return;
  const mis = bg.filter((r) => !sm_fitsZone(r, r.zone));
  const rec = mis.length && sm_chance(0.5) ? sm_pick(mis) : sm_pick(bg);
  const from = rec.zone, to = sm_pickZone(rec, 0.35);
  if (!to || to === from) return;
  rec.zone = to;
  if (Z && to === Z.id && !Z.def.generated) {
    const act = SM.ents.filter((e) => !e.removed && e.team !== TEAM).length;
    if (act < SM.cap[1]) sm_arrive(rec, from);
  }
}
function sm_followTick() {
  const f = SM.follow, P = PLAYER;
  if (!f) return;
  const moved = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
  if (f.removed || f.dead || P.dead || moved || entDist(f, P) > 120) { SM.follow = null; if (typeof PC !== 'undefined') PC.autorun = false; sm_sys('You stop following.'); return; }
  const d = entDist(f, P);
  P.yaw = Math.atan2(f.pos.x - P.pos.x, f.pos.z - P.pos.z);
  if (typeof PC !== 'undefined') PC.autorun = d > 3.5;
}

// ---------- lifecycle ----------
function simStart(saved) {
  try {
    SM.on = true; SM.t = 0; SM.q = []; SM.ents = []; SM.teams = []; SM.invite = null; SM.follow = null; SM.lastTell = null; SM.recent = []; SM.resOn = false;
    SM.zones = sm_zoneList();
    SM.pop = sm_genPop();
    SM.hash = strSeed(SM.pop.map((r) => r.name).join('|'));
    const R = makeRng(SM_SEED + 7);
    for (const r of SM.pop) { r.home = sm_pickZone(r, 0, R.f); r.zone = R.chance(0.3) ? sm_city() : r.home; }
    SM.pylons = {}; SM.push = {};
    sm_pylonInit();
    if (saved && saved.v === 1 && saved.h === SM.hash && Array.isArray(saved.s)) {
      saved.s.forEach((s, i) => { const r = SM.pop[i]; if (!r || !Array.isArray(s)) return; r.level = clamp(s[0] | 0, 1, MAX_LEVEL); r.xp = clamp((s[1] || 0) / 1000, 0, 0.999); if (sm_zinfo(s[2])) r.zone = s[2]; });
      for (const id in saved.p || {}) if (SM.pylons[id] && SM_FAC[saved.p[id]]) SM.pylons[id].owner = saved.p[id];
      // the world kept turning while you were away
      const away = clamp((Date.now() - (saved.t || Date.now())) / 1000, 0, 8 * 3600) * 0.35;
      if (away > 60) for (const r of SM.pop) {
        r.xp += away / sm_lvlTime(r.level);
        while (r.xp >= 1 && r.level < MAX_LEVEL) { r.xp -= 1; r.level++; }
        if (r.level >= MAX_LEVEL) r.xp = 0;
        if (sm_rnd() < Math.min(0.8, away / 3600)) r.zone = sm_pickZone(r, 0.35);
      }
    }
    SM.T = { ooc: 4 + sm_rnd() * 6, fac: 60 + sm_rnd() * 60, vic: 8 + sm_rnd() * 8, tell: 150 + sm_rnd() * 150, bg: 5, move: 15 + sm_rnd() * 20, pop: 5, pyl: 1, res: 2, team: 10, steam: 20, war: 180 + sm_rnd() * 200, teams: 2 };
  } catch (err) { console.warn('simStart failed', err); SM.on = false; }
}
function simStop() {
  SM.on = false; SM.q = []; SM.invite = null; SM.follow = null;
  for (const r of SM.pop) { sm_sync(r); r.ent = null; r.pendingJoin = false; }
  SM.ents = []; SM.teams = [];
  TEAM.members.length = 0; TEAM.leader = null;
}
function simSaveState() {
  if (!SM.pop.length) return null;
  for (const r of SM.pop) if (r.ent && !r.ent.removed) sm_sync(r);
  const p = {};
  for (const id in SM.pylons) p[id] = SM.pylons[id].owner;
  return { v: 1, t: Date.now(), h: SM.hash, s: SM.pop.map((r) => [r.level, Math.round(r.xp * 1000), r.zone]), p };
}
function simTravellers() {
  if (!SM.on) return [];
  return TEAM.members.filter((m) => m.kind === 'sim' && !m.removed && !m.dead);
}
function simZoneChanged(id) {
  if (!SM.on) return;
  try {
    SM.zones = sm_zoneList();
    sm_pylonInit();
    const Z = sm_zone();
    for (const r of SM.pop) if (r.ent && r.ent.removed) { sm_sync(r); r.ent = null; }
    SM.ents = SM.ents.filter((e) => !e.removed);
    SM.teams = [];
    SM.follow = null;
    // teammates came along; ones left behind dead catch up later
    for (const m of TEAM.members.slice()) {
      if (m.kind !== 'sim') continue;
      if (m.removed) {
        sm_unteam(m, true);
        const rec = m.sim;
        if (!Z.def.generated) { rec.pendingJoin = true; rec.zone = id; sm_later(20 + sm_rnd() * 20, () => { if (!SM.on || !rec.pendingJoin || rec.ent || !sm_zone() || sm_zone().def.generated) { rec.pendingJoin = false; return; } const e = sm_arrive(rec, sm_city()); if (e) sm_joinPlayerTeam(e, true); }); }
        continue;
      }
      m.sim.zone = id;
      Object.assign(m.ai, { mode: 'team', foe: null, goal: null, detour: null, leaving: false, far: false });
      m.ai.stk = { t: 0, x: m.pos.x, z: m.pos.z, n: 0 };
      if (Z.def.pvp && isHostile(m, PLAYER)) {
        sm_say(m, 'team', 'not going into the Scar with a ' + SM_FAC[PLAYER.faction] + ', see you later');
        sm_unteam(m); m.ai.despawn = true; m.sim.zone = sm_city();
      }
    }
    if (SM.invite && (!SM.invite.e || SM.invite.e.removed)) SM.invite = null;
    SM.cap = sm_capFor(Z.def);
    SM.target = Math.round(frand(SM.cap[0], SM.cap[1]) * 0.85);
    if (Z.def.generated || !SM.cap[1]) return;
    // fill the zone: people who are here, topped up by passers-by of the right level
    let here = SM.pop.filter((r) => r.zone === id && !r.ent && !r.pendingJoin);
    if (here.length < SM.target) {
      const extra = SM.pop.filter((r) => r.zone !== id && !r.ent && !r.pendingJoin && sm_fitsZone(r, id));
      extra.sort(() => sm_rnd() - 0.5);
      for (const r of extra.slice(0, SM.target - here.length)) { r.zone = id; here.push(r); }
    }
    if (Z.def.pvp) {
      for (const f of ['meridian', 'freehold']) {
        const have = here.filter((r) => r.faction === f && r.level >= 30).length;
        if (have < 6) for (const r of SM.pop.filter((x) => x.faction === f && x.level >= 33 && !x.ent && x.zone !== id).slice(0, 6 - have)) { r.zone = id; here.push(r); }
      }
    }
    here.sort(() => sm_rnd() - 0.5);
    if (Z.def.pvp) here.sort((a, b) => (b.faction !== 'unaligned' && b.level >= 30) - (a.faction !== 'unaligned' && a.level >= 30));
    here = here.slice(0, SM.target);
    for (const r of here) {
      const mode = sm_modeFor(r);
      const e = sm_spawn(r, sm_scatter(r, mode), mode);
      if (!e) continue;
      if (mode === 'pvp') e.ai.pvp = true;
      if (mode === 'hunt' && sm_chance(0.2)) { e.ai.mode = 'rest'; e.sitting = true; e.hp = Math.round(e.S.maxHp * 0.7); }
    }
    sm_resonance();
  } catch (err) { if (SM.warned++ < 12) console.warn('simZoneChanged', err); }
}
function simTick(dt) {
  if (!SM.on || !PLAYER) return;
  SM.t += dt; SM.frame++;
  const T = SM.T, Z = sm_zone();
  try {
    sm_runQueue();
    for (let i = SM.ents.length - 1; i >= 0; i--) {
      const e = SM.ents[i];
      if (e.removed) { sm_sync(e.sim); if (e.sim.ent === e) e.sim.ent = null; if (e.team === TEAM) sm_unteam(e, true); SM.ents.splice(i, 1); continue; }
      if (e.ai.despawn) { sm_despawn(e); continue; }
      if ((SM.frame + i) % 10 === 0) e.ai.far = entDist(e, PLAYER) > 120 && e.team !== TEAM;
    }
    if (SM.invite && SM.t > SM.invite.t) { const n = SM.invite.e && SM.invite.e.name; SM.invite = null; if (n) sm_sys('The team invitation from ' + n + ' has expired.'); }
    sm_followTick();
    if (!Z) return;
    if ((T.ooc -= dt) <= 0) { T.ooc = 8 + sm_rnd() * 12; sm_oocTick(); }
    if ((T.vic -= dt) <= 0) { T.vic = 10 + sm_rnd() * 15; sm_vicTick(); }
    if ((T.fac -= dt) <= 0) { T.fac = 70 + sm_rnd() * 90; sm_facTick(); }
    if ((T.tell -= dt) <= 0) { T.tell = 240 + sm_rnd() * 360; sm_tellTick(); }
    if ((T.bg -= dt) <= 0) { T.bg = 5; sm_bgTick(5); }
    if ((T.move -= dt) <= 0) { T.move = 15 + sm_rnd() * 25; sm_moveTick(); }
    if ((T.pop -= dt) <= 0) { T.pop = 5 + sm_rnd() * 6; sm_balance(); }
    if ((T.pyl -= dt) <= 0) { T.pyl = 1; sm_pylonTick(); }
    if ((T.res -= dt) <= 0) { T.res = 5; sm_resonance(); }
    if ((T.team -= dt) <= 0) { T.team = 10; sm_pteamTick(); }
    if ((T.teams -= dt) <= 0) { T.teams = 2; sm_teamsTick(); }
    if ((T.steam -= dt) <= 0) { T.steam = 25 + sm_rnd() * 25; sm_formTeam(); }
    if ((T.war -= dt) <= 0) { T.war = 150 + sm_rnd() * 150; sm_warTick(); }
  } catch (err) { if (SM.warned++ < 20) console.warn('simTick', err); }
}
// For UIs: everyone online, or just this zone.
function simList(zoneOnly) {
  return SM.pop.filter((r) => !zoneOnly || (r.ent && !r.ent.removed)).map((r) => ({ name: r.name, level: r.ent && r.ent.char ? r.ent.char.level : r.level, prof: r.prof, breed: r.breed, faction: r.faction, zone: r.zone, here: !!(r.ent && !r.ent.removed), ent: r.ent || null }));
}
try { if (typeof ZONE_DEFS !== 'undefined' && ZONE_DEFS.lumen_scar) ZONE_DEFS.lumen_scar.pvp = true; } catch (err) { /* zones load later */ }
