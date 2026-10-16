// Willow Lane — free will: every interaction advertises how much it satisfies each need; sims weigh the
// adverts against their current needs, personality and distance, then pick one of the best few.

// interactions a guest may use (no cooking, sleeping, chores or paying bills in someone else's house)
const VISITOR_OK = new Set(['sit', 'watchTV', 'dance', 'chess', 'read', 'serving', 'grabSlice', 'useToilet', 'washHands', 'piano', 'stargaze', 'watchFish',
  'playToys', 'playDollhouse', 'swing', 'babyPlay', 'paint', 'cleanUp']);
const ITEM_IX = { meal: ['serving'], pizza: ['grabSlice', 'cleanUp'], plate: ['cleanUp'], puddle: ['mop'], fire: ['extinguish'], cake: ['blowCandles'], trashbag: ['mop'] };

const needUtility = (n, v) => Math.pow((100 - clamp(v, 0, 100)) / 100, NEED[n] ? NEED[n].urgency : 1.6) * 100;
function scoreAdverts(s, adv) {
  let sc = 0;
  const P = s.pers;
  for (const k in adv) {
    const A = adv[k];
    if (!A) continue;
    if (k === 'skill') { sc += A * (s.mood > 20 ? 9 : s.mood > 0 ? 4 : 0) * (lowestNeed(s) && s.needs[lowestNeed(s).id] > 45 ? 1 : 0.2); continue; }
    if (k === 'homework') { sc += A * (hourIn(hourF(), 15, 21) ? 28 : 6); continue; }
    if (s.needs[k] == null) continue;
    const v = s.needs[k];
    let g = needUtility(k, v) - needUtility(k, Math.min(100, v + A));
    if (k === 'fun') g *= 1 + (P.playful - 5) * 0.06;
    else if (k === 'social') g *= 1 + (P.outgoing - 5) * 0.09;
    else if (k === 'room') g = A * (0.3 + 1.2 * Math.pow(1 - v / 100, 1.5)) * (1 + (P.neat - 5) * 0.12);
    else if (k === 'comfort') g *= 1 + (5 - P.active) * 0.06;
    sc += g;
  }
  return sc;
}

function chooseSocial(s, b) {
  const r = relGet(s, b), P = s.pers;
  const opts = [];
  const add = (id, w) => { const d = SOCIAL[id]; if (d && d.req(s, b) === true) opts.push({ id, w }); };
  if (!r.met) { add('introduce', 10); return opts.length ? rweighted(opts, (o) => o.w).id : null; }
  if (b.visit && b.visit.state === 'door' && s.household) { add('greet', 50); }
  add('chat', 8 + P.outgoing);
  add('joke', P.playful * 0.8);
  add('compliment', P.nice * 0.5);
  add('deepTalk', (10 - P.playful) * 0.5);
  add('gossip', P.outgoing * 0.3);
  add('hug', r.f > 50 ? 3 + P.nice * 0.3 : 0);
  add('tickle', P.playful * 0.3);
  add('highFive', 1.5);
  add('playTag', 6);
  if (r.partner || r.engaged || r.spouse) { add('kiss', 4); add('flirt', 3); add('slowDance', 1.5); }
  else if (r.r > 25 && !partnerOf(s)) add('flirt', 1 + P.outgoing * 0.1);
  if (P.nice <= 3 || r.f < -20) { add('insult', (5 - P.nice) * 0.8 + (r.f < 0 ? 3 : 0)); add('poke', (5 - P.nice) * 0.4); add('argue', r.f < -30 ? 2 : 0); add('complain', (5 - P.nice) * 0.5); }
  if (r.f < -50 && P.nice < 3) add('slap', 1);
  if (b.school && b.school.homework && isGrown(s)) add('homeworkHelp', 3);
  if (!opts.length) return null;
  return rweighted(opts, (o) => o.w).id;
}

function autonomy(s) {
  const cands = [];
  const guest = !s.household;
  const push = (id, target, arg, adv, d) => {
    if (!adv) return;
    let sc = scoreAdverts(s, adv);
    if (sc <= 0.5) return;
    sc = sc / (1 + d / 16) * rrange(0.85, 1.15);
    if (s.failed && s.failed[id + (target ? target.id : '')] > G.t) return;
    cands.push({ id, target, arg, sc });
  };
  for (const o of G.objects) {
    if (!o.def.acts.length) continue;
    const d = distTo(s, o);
    if (d > 40) continue;
    for (const id of o.def.acts) {
      const def = IX[id];
      if (!def || !def.adverts || def.menu) continue;
      if (guest && !VISITOR_OK.has(id)) continue;
      if (def.test && def.test(s, o) !== true) continue;
      push(id, o, null, def.adverts(s, o), d);
    }
  }
  for (const it of G.items) {
    const ids = ITEM_IX[it.kind]; if (!ids) continue;
    const d = Math.hypot(it.x - s.x, it.z - s.z);
    for (const id of ids) {
      const def = IX[id];
      if (!def || !def.adverts) continue;
      if (guest && !VISITOR_OK.has(id)) continue;
      if (id === 'cleanUp' && (!it.dirty || it.claim)) continue;
      if (id === 'mop' && it.claim) continue;
      if (def.test && def.test(s, it) !== true) continue;
      push(id, it, null, def.adverts(s, it), d);
    }
  }
  // someone at the door: a grown-up goes to let them in
  if (s.household && canAdult(s)) for (const b of onLotSims()) if (b.visit && b.visit.state === 'door' && !b.service && !G.sims.some((h) => h.cur && h.cur.id === 'social' && h.cur.target === b)) push('social', b, 'greet', { social: 60 }, Math.hypot(b.x - s.x, b.z - s.z) * 0.3);
  // socialise with someone nearby
  if (s.age !== 'baby' && G.t - s.lastSocial > 25) {
    for (const b of onLotSims()) {
      if (b === s || b.service || socialAvailable(b) !== true) continue;
      if (b.visit && (b.visit.state === 'passing' || b.visit.state === 'door')) continue;
      const d = Math.hypot(b.x - s.x, b.z - s.z);
      if (d > 14) continue;
      const id = chooseSocial(s, b);
      if (!id) continue;
      const def = SOCIAL[id];
      const adv = { social: def.win.social * 1.6 + 6, fun: def.mean ? (5 - s.pers.nice) * 3 : (def.win.fun || 0) };
      if (id === 'greet') adv.social = 90;
      push('social', b, id, adv, d);
    }
  }
  if (!cands.length) return false;
  cands.sort((a, b) => b.sc - a.sc);
  const top = cands.slice(0, 3).filter((c) => c.sc > cands[0].sc * 0.6);
  const c = rweighted(top, (x) => x.sc);
  const act = queueAct(s, c.id, c.target, c.arg, false);
  if (act) act.autoKey = c.id + (c.target ? c.target.id : '');
  return true;
}

// remember failed attempts so a sim doesn't loop on something unreachable
function noteFailed(s, act) { if (!act || !act.autoKey) return; s.failed = s.failed || {}; s.failed[act.autoKey] = G.t + 30; }

// idle fidgets when there's nothing to do
function idleWander(s) {
  if (chance(0.5)) return;
  const r = 4, x = Math.floor(s.x) + rint(-r, r), z = Math.floor(s.z) + rint(-r, r);
  if (!NAV.walk(x, z)) return;
  if (s.household && !inLot(x, z)) return;
  queueAct(s, 'goHere', { x: x + 0.5, z: z + 0.5 }, null, false);
}
