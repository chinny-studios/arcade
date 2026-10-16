// Willow Lane — wants: every household sim keeps three small wishes drawn from who they are and what's going on.
// Making one come true lifts their mood and adds aspiration points. Game code reports what happened with
// bus.emit('did', sim, kind, data); kinds: ix, social, friend, skill, job, promoted, buy, married, baby, grade, party.

const WANTS = [
  { id: 'chatWith', icon: '💬', w: 3, gen: (s) => { const o = knownOnLot(s, (x) => relGet(s, x).f > -10); return o ? o.id : (knownAny(s) || {}).id; },
    label: (s, a) => 'Chat with ' + nameOf(a), done: (k, d, a) => k === 'social' && d.win && d.target.id === a && !SOCIAL[d.id].mean },
  { id: 'newFriend', icon: '🤝', w: 2, gen: (s) => s.age !== 'baby' && true, label: () => 'Make a new friend', done: (k) => k === 'friend' },
  { id: 'hugFamily', icon: '🤗', w: 2, gen: (s) => { const f = household().find((h) => h !== s && h.age !== 'baby' && isFamily(s, h)); return f ? f.id : null; },
    label: (s, a) => 'Hug ' + nameOf(a), done: (k, d, a) => k === 'social' && d.win && d.id === 'hug' && d.target.id === a },
  { id: 'kiss', icon: '💋', w: 3, gen: (s) => { const p = partnerOf(s); return p && p.household ? p.id : null; },
    label: (s, a) => 'Kiss ' + nameOf(a), done: (k, d, a) => k === 'social' && d.win && (d.id === 'kiss' || d.id === 'slowDance') && d.target.id === a },
  { id: 'goSteady', icon: '💞', w: 2, gen: (s) => (romanceGroup(s) && !partnerOf(s) ? true : null), label: () => 'Go steady with someone', done: (k, d) => k === 'social' && d.win && d.id === 'goSteady' },
  { id: 'propose', icon: '💍', w: 2, gen: (s) => { const p = partnerOf(s); return p && isGrown(s) && relGet(s, p).partner ? p.id : null; },
    label: (s, a) => 'Propose to ' + nameOf(a), done: (k, d, a) => k === 'social' && d.win && d.id === 'propose' && d.target.id === a },
  { id: 'marry', icon: '💒', w: 3, gen: (s) => { const p = partnerOf(s); return p && relGet(s, p).engaged ? p.id : null; }, label: (s, a) => 'Marry ' + nameOf(a), done: (k) => k === 'married' },
  { id: 'baby', icon: '👶', w: 2, gen: (s) => (isGrown(s) && s.age !== 'elder' && partnerOf(s) && relGet(s, partnerOf(s)).spouse && household().length < 7 ? true : null), label: () => 'Have a baby', done: (k) => k === 'baby' },
  { id: 'skill', icon: '📈', w: 4, gen: (s) => { if (s.age === 'baby') return null; const k = wantedSkill(s); return k ? k + ':' + (skillLv(s, k) + 1) : null; },
    label: (s, a) => { const [k, n] = a.split(':'); return `Reach ${SKILL[k].label} ${n}`; }, done: (k, d, a) => { const [sk, n] = a.split(':'); return k === 'skill' && d.skill === sk && d.level >= +n; } },
  { id: 'getJob', icon: '💼', w: 5, gen: (s) => (isGrown(s) && s.age !== 'elder' && !s.job ? true : null), label: () => 'Find a job', done: (k) => k === 'job' },
  { id: 'promotion', icon: '🎉', w: 3, gen: (s) => (s.job && CAREER[s.job.track].levels[s.job.level + 1] ? true : null), label: () => 'Get promoted', done: (k) => k === 'promoted' },
  { id: 'aGrade', icon: '📝', w: 3, gen: (s) => (s.school && s.school.grade < 11 ? true : null), label: () => 'Get an A at school', done: (k, d) => k === 'grade' && d.grade >= 11 },
  { id: 'homework', icon: '📚', w: 2, gen: (s) => (s.school ? true : null), label: () => 'Do homework', done: (k, d) => k === 'ix' && d.id === 'homework' },
  { id: 'buy', icon: '🛍️', w: 3, gen: (s) => { if (s.age === 'baby') return null; const c = rpick(CATALOG.filter((c) => !c.fixed && !c.hidden && c.price >= 80 && c.price <= Math.max(300, G.money * 0.5) && !G.objects.some((o) => o.type === c.id) && c.cat !== 'kitchen' && c.cat !== 'bath' && wantTaste(s, c))); return c ? c.id : null; },
    label: (s, a) => 'Buy a ' + CAT[a].name.toLowerCase().replace(/^(a|an|the) /, ''), done: (k, d, a) => k === 'buy' && d.type === a },
  { id: 'do', icon: '✨', w: 5, gen: (s) => { const ids = availableFun(s); return ids.length ? rpick(ids) : null; },
    label: (s, a) => IX[a] ? (typeof IX[a].label === 'function' ? IX[a].label(s, G.objects.find((o) => o.def.acts.includes(a)) || {}) : IX[a].label) : a, iconOf: (a) => (IX[a] ? IX[a].icon : '✨'), done: (k, d, a) => k === 'ix' && d.id === a },
  { id: 'meal', icon: '🍲', w: 2, gen: (s) => (s.age !== 'baby' ? true : null), label: () => 'Eat a home-cooked meal', done: (k, d) => k === 'ix' && (d.id === 'serving' || d.id === 'cookMeal') },
  { id: 'party', icon: '🎊', w: 2, gen: (s) => (isGrown(s) && s.pers.outgoing >= 6 && G.objects.some((o) => o.type === 'phone') ? true : null), label: () => 'Throw a party', done: (k, d) => k === 'party' && d.hit },
];
const WANT = Object.fromEntries(WANTS.map((w) => [w.id, w]));
const nameOf = (id) => { const s = simById(id); return s ? s.first : 'someone'; };
const knownOnLot = (s, f) => rpick(onLotSims().filter((o) => o !== s && !o.service && o.age !== 'baby' && relGet(s, o).met && f(o)));
const knownAny = (s) => rpick(G.sims.filter((o) => o !== s && o.alive && !o.service && o.age !== 'baby' && relGet(s, o).met));
function wantedSkill(s) {
  const w = {};
  for (const k of SKILLS) w[k.id] = 1;
  if (s.job) { const N = CAREER[s.job.track].levels[s.job.level + 1]; if (N) for (const k in N[4]) if (skillLv(s, k) < N[4][k]) w[k] += 6; }
  w.body += s.pers.active * 0.4; w.charisma += s.pers.outgoing * 0.4; w.creativity += s.pers.playful * 0.4; w.logic += (10 - s.pers.playful) * 0.4; w.cooking += s.pers.neat * 0.2;
  const opts = SKILLS.filter((k) => skillLv(s, k.id) < 10);
  return opts.length ? rweighted(opts, (k) => w[k.id]).id : null;
}
// personality flavours the shopping list
function wantTaste(s, c) {
  if (c.cat === 'kids') return s.age === 'child' || (isGrown(s) && household().some((h) => h.age === 'child' || h.age === 'baby'));
  if (c.cat === 'hobbies') return true;
  if (c.cat === 'electronics') return s.pers.playful >= 4 || s.age !== 'elder';
  if (c.cat === 'decor' || c.cat === 'lighting') return s.pers.neat >= 4 || chance(0.5);
  return true;
}
const FUN_IX = ['watchTV', 'dance', 'chess', 'paint', 'piano', 'stargaze', 'playGames', 'chatOnline', 'read', 'bath', 'swing', 'playToys', 'playDollhouse', 'workout', 'watchFish', 'writeNovel', 'practiceSpeech', 'nap'];
function availableFun(s) {
  const out = new Set();
  for (const o of G.objects) for (const id of o.def.acts) if (FUN_IX.includes(id) && IX[id] && (!IX[id].test || IX[id].test(s, o) === true || id === 'stargaze')) out.add(id);
  return [...out];
}

function topUpWants(s) {
  if (!s.household || s.age === 'baby' || !s.alive) return;
  s.wants = (s.wants || []).filter((w) => G.t < w.until && WANT[w.id]);
  let guard = 0;
  while (s.wants.length < 3 && guard++ < 20) {
    const def = rweighted(WANTS.filter((d) => !s.wants.some((w) => w.id === d.id)), (d) => d.w);
    if (!def) break;
    const arg = def.gen(s);
    if (arg == null || arg === false) continue;
    s.wants.push({ id: def.id, arg, until: G.t + rint(18, 30) * 60 });
  }
}
const wantLabel = (s, w) => WANT[w.id].label(s, w.arg);
const wantIcon = (w) => (WANT[w.id].iconOf ? WANT[w.id].iconOf(w.arg) : WANT[w.id].icon);
bus.on('did', (s, kind, data) => {
  if (!s || !s.household || !s.wants) return;
  for (const w of s.wants.slice()) {
    let ok = false;
    try { ok = WANT[w.id].done(kind, data || {}, w.arg); } catch (e) { ok = false; }
    if (!ok) continue;
    s.wants = s.wants.filter((x) => x !== w);
    const pts = 20 + WANT[w.id].w * 0 + (['marry', 'baby', 'promotion', 'propose', 'goSteady'].includes(w.id) ? 40 : 0);
    s.aspire = (s.aspire || 0) + pts;
    addMoodlet(s, 'wantMet');
    floatText(s, '★ +' + pts, '#ffd860');
    thought(s, wantIcon(w), 2, 'Wish come true!');
    sfx('skill');
    if (G.selected === s) renderPanel();
  }
});
