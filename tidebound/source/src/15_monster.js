// Tidebound: monster instances. Plain-JSON instances (see DESIGN.md) plus the Gen-3 style stat, XP and
// learning helpers. Also the data validator (DBG.checkData) used by tests.

const Mon = (() => {
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

  function species(m) { return SPECIES[m.sp]; }

  function stats(m) {
    const sp = SPECIES[m.sp];
    const lv = m.lv, iv = m.iv || {};
    const out = {};
    for (const k of STATS) {
      const base = sp.base[k], i = iv[k] || 0;
      const core = Math.floor((2 * base + 2 * i) * lv / 100);
      out[k] = k === 'hp' ? core + lv + 10 : core + 5;
    }
    return out;
  }

  function maxhp(m) { return stats(m).hp; }
  function name(m) { return m.nick || SPECIES[m.sp].name; }

  // Total XP needed to reach level lv (lv 1 is 0 XP for every growth rate).
  function xpAt(lv, growth) {
    if (lv <= 1) return 0;
    const n = lv;
    if (growth === 'fast') return Math.floor(4 * n * n * n / 5);
    if (growth === 'slow') return Math.floor(5 * n * n * n / 4);
    return n * n * n;
  }

  // Moves a species knows at a level: the last four learnable entries up to that level (no duplicates).
  function defaultMoves(sp, lv) {
    const ids = [];
    for (const [l, id] of sp.learn) {
      if (l > lv) continue;
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1);
      ids.push(id);
    }
    return ids.slice(-4).map((id) => ({ id, pp: MOVES[id].pp }));
  }

  function create(sp, lv, opts = {}) {
    const s = SPECIES[sp];
    if (!s) throw new Error('Mon.create: unknown species ' + sp);
    const iv = opts.iv || { hp: R.int(0, 15), atk: R.int(0, 15), def: R.int(0, 15), spa: R.int(0, 15), spd: R.int(0, 15), spe: R.int(0, 15) };
    const m = {
      sp, nick: opts.nick || null, lv, xp: xpAt(lv, s.growth), hp: 0, iv,
      moves: opts.moves ? opts.moves.map((id) => ({ id, pp: MOVES[id].pp })) : defaultMoves(s, lv),
      status: null, slp: 0,
      ability: opts.ability || R.pick(s.abilities),
      item: opts.item || null,
      ot: opts.ot || (G && G.name) || 'KAI',
      caughtAt: opts.caughtAt ?? (G ? G.map : null),
    };
    m.hp = maxhp(m);
    return m;
  }

  // Gain XP. Returns events in order: level, learn (free slot), learnFull (player must choose a move to forget),
  // evolve (pending; fires once, on the call that crosses evolve.lv). HP keeps the damage already taken.
  function gainXp(m, n) {
    const events = [];
    if (!(n > 0)) return events;
    const sp0 = SPECIES[m.sp];
    const growth = sp0.growth;
    const wasAlive = m.hp > 0;
    const oldMax = maxhp(m);
    const startLv = m.lv;
    m.xp += n;
    while (m.lv < 100 && m.xp >= xpAt(m.lv + 1, growth)) {
      const prev = m.lv;
      m.lv++;
      events.push({ type: 'level', lv: m.lv });
      for (const move of learnable(m, m.lv)) {
        if (knows(m, move)) continue;
        if (m.moves.length < 4) {
          m.moves.push({ id: move, pp: MOVES[move].pp });
          events.push({ type: 'learn', move });
        } else {
          events.push({ type: 'learnFull', move });
        }
      }
      const ev = SPECIES[m.sp].evolve;
      if (ev && prev < ev.lv && m.lv >= ev.lv) events.push({ type: 'evolve', to: ev.to });
    }
    if (m.lv !== startLv) {
      const newMax = maxhp(m);
      m.hp = wasAlive ? Math.max(1, newMax - (oldMax - m.hp)) : 0;
    }
    return events;
  }

  function heal(m) {
    m.hp = maxhp(m);
    m.status = null;
    m.slp = 0;
    for (const mv of m.moves) mv.pp = MOVES[mv.id].pp;
    return m;
  }

  function healParty() {
    for (const m of G.party) heal(m);
  }

  function canEvolve(m) {
    const ev = SPECIES[m.sp].evolve;
    return ev && m.lv >= ev.lv ? ev.to : null;
  }

  function evolve(m, to) {
    const oldMax = maxhp(m);
    const dmg = oldMax - m.hp;
    const wasAlive = m.hp > 0;
    m.sp = to;
    if (!SPECIES[to].abilities.includes(m.ability)) m.ability = SPECIES[to].abilities[0];
    const newMax = maxhp(m);
    m.hp = wasAlive ? Math.max(1, newMax - dmg) : 0;
    return m;
  }

  function learnable(m, lv) {
    return SPECIES[m.sp].learn.filter((e) => e[0] === lv).map((e) => e[1]);
  }

  function knows(m, moveId) {
    return m.moves.some((mv) => mv.id === moveId);
  }

  // Put moveId into slot (0..3) if given and in range, else into a free slot. False when the moveset is full.
  function teach(m, moveId, slot) {
    const e = { id: moveId, pp: MOVES[moveId].pp };
    if (typeof slot === 'number' && slot >= 0 && slot < m.moves.length) m.moves[slot] = e;
    else if (m.moves.length < 4) m.moves.push(e);
    else return false;
    return true;
  }

  function markSeen(sp) { G.dex.seen[sp] = true; }
  function markCaught(sp) { G.dex.caught[sp] = true; G.dex.seen[sp] = true; }

  function addToParty(m) {
    if (G.party.length < 6) { G.party.push(m); return 'party'; }
    G.box.push(m);
    return 'box';
  }

  // Gen-3 experience for defeating `defender` (a monster instance).
  function xpYield(defender, isTrainer) {
    const y = SPECIES[defender.sp].xpYield;
    let x = Math.floor(y * defender.lv / 7);
    if (isTrainer) x = Math.floor(x * 1.5);
    return x;
  }

  // Status string ('psn' etc., or 'fnt' / a monster object) to its label.
  function statusName(s) {
    if (s && typeof s === 'object') s = s.hp <= 0 ? 'fnt' : s.status;
    const table = { psn: 'PSN', brn: 'BRN', par: 'PAR', slp: 'SLP', fnt: 'FNT' };
    return table[s] || '';
  }

  function alive(m) { return m.hp > 0; }

  return {
    stats, maxhp, name, species, xpAt, create, gainXp, heal, healParty, canEvolve, evolve,
    learnable, knows, teach, markSeen, markCaught, addToParty, xpYield, statusName, alive,
  };
})();

DBG.data = { MOVES, SPECIES, ITEMS, ABILITIES };

// Returns an array of problem strings. Empty when the data is consistent.
DBG.checkData = function checkData() {
  const problems = [];
  const bad = (msg) => problems.push(msg);
  const STAT_NAMES = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'];
  const GROWTHS = ['fast', 'medium', 'slow'];
  const STATUSES = ['psn', 'brn', 'par', 'slp'];

  for (const [id, mv] of Object.entries(MOVES)) {
    if (mv.name.length > 12) bad(`move ${id}: name longer than 12 chars`);
    if (!TYPES.includes(mv.type)) bad(`move ${id}: unknown type ${mv.type}`);
    if (!['phys', 'spec', 'status'].includes(mv.cat)) bad(`move ${id}: bad cat ${mv.cat}`);
    if (!(mv.pp > 0)) bad(`move ${id}: pp must be positive`);
    if (typeof mv.desc !== 'string' || !mv.desc) bad(`move ${id}: missing desc`);
    if (mv.status && !STATUSES.includes(mv.status.s)) bad(`move ${id}: bad status ${mv.status.s}`);
    if (mv.stat) {
      if (!['self', 'foe'].includes(mv.stat.target)) bad(`move ${id}: bad stat target`);
      for (const k of Object.keys(mv.stat.stats)) if (!STAT_NAMES.includes(k)) bad(`move ${id}: bad stat ${k}`);
    }
    if (mv.cat === 'status' && mv.power) bad(`move ${id}: status move with power`);
    if (mv.cat !== 'status' && !(mv.power > 0)) bad(`move ${id}: damaging move without power`);
  }

  for (const [id, it] of Object.entries(ITEMS)) {
    if (!it.name || !it.kind || typeof it.price !== 'number') bad(`item ${id}: missing name, kind or price`);
    if (it.teaches && !MOVES[it.teaches]) bad(`item ${id}: teaches unknown move ${it.teaches}`);
  }

  for (const [id, ab] of Object.entries(ABILITIES)) {
    if (!ab.name || !ab.desc) bad(`ability ${id}: missing name or desc`);
  }

  const nums = new Set();
  for (const [id, sp] of Object.entries(SPECIES)) {
    if (sp.id !== id) bad(`species ${id}: id field is ${sp.id}`);
    if (!sp.name) bad(`species ${id}: no name`);
    if (nums.has(sp.num)) bad(`species ${id}: duplicate num ${sp.num}`);
    nums.add(sp.num);
    if (!sp.types.length || sp.types.some((t) => !TYPES.includes(t))) bad(`species ${id}: bad types`);
    for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
      if (!(sp.base[k] > 0)) bad(`species ${id}: bad base ${k}`);
    }
    if (!sp.abilities.length) bad(`species ${id}: no abilities`);
    for (const a of sp.abilities) if (!ABILITIES[a]) bad(`species ${id}: unknown ability ${a}`);
    if (!GROWTHS.includes(sp.growth)) bad(`species ${id}: bad growth ${sp.growth}`);
    if (!(sp.catchRate >= 3 && sp.catchRate <= 255)) bad(`species ${id}: catchRate out of range`);
    if (sp.evolve) {
      if (!SPECIES[sp.evolve.to]) bad(`species ${id}: evolves to unknown ${sp.evolve.to}`);
      if (!(sp.evolve.lv > 0)) bad(`species ${id}: bad evolve level`);
    }
    let lastLv = 0;
    for (const [lv, mid] of sp.learn) {
      if (!MOVES[mid]) bad(`species ${id}: learnset move ${mid} does not exist`);
      if (lv < lastLv) bad(`species ${id}: learnset not sorted at ${mid}`);
      lastLv = lv;
    }
    for (const h of sp.hm || []) if (!MOVES[h]) bad(`species ${id}: hm ${h} is not a move`);
    if (!sp.dex || !sp.color || !sp.height || !sp.weight) bad(`species ${id}: missing dex text, colour, height or weight`);
  }

  const seen = new Set();
  for (const id of DEX_ORDER) {
    if (!SPECIES[id]) bad(`DEX_ORDER: unknown species ${id}`);
    if (seen.has(id)) bad(`DEX_ORDER: duplicate ${id}`);
    seen.add(id);
  }
  for (const id of Object.keys(SPECIES)) if (!seen.has(id)) bad(`DEX_ORDER: missing ${id}`);

  return problems;
};
