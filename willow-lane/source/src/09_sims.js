// Willow Lane — sims: creation (random, from CAS, babies from parents), needs, mood, moodlets, skills,
// relationships, and the model that follows them around

const simById = (id) => G.sims.find((s) => s.id === id);
const household = () => G.sims.filter((s) => s.household && s.alive);
const onLotSims = () => G.sims.filter((s) => s.onLot && s.alive && !s.away);
const they = (s) => (s.pronoun === 'she' ? 'she' : s.pronoun === 'he' ? 'he' : 'they');
const them = (s) => (s.pronoun === 'she' ? 'her' : s.pronoun === 'he' ? 'him' : 'them');
const their = (s) => (s.pronoun === 'she' ? 'her' : s.pronoun === 'he' ? 'his' : 'their');
const isAre = (s) => (s.pronoun === 'they' ? 'are' : 'is');
const fullName = (s) => s.first + ' ' + s.last;

function randomLook(body, age) {
  const kid = age === 'child' || age === 'baby';
  const hairsF = ['bob', 'long', 'pony', 'bun', 'curly', 'afro', 'pigtails', 'side', 'short'], hairsM = ['short', 'buzz', 'side', 'curly', 'afro', 'mohawk', 'bald', 'pony'];
  let hair = rpick(body === 'f' ? hairsF : body === 'm' ? hairsM : hairsF.concat(hairsM));
  if (kid && hair === 'bald') hair = 'short';
  if (!kid && hair === 'pigtails' && chance(0.6)) hair = 'pony';
  const outfit = body === 'm' ? rpick(['pants', 'pants', 'shorts']) : rpick(['pants', 'shorts', 'skirt', 'dress']);
  return { body, skin: rpick(SKINS), hair, hairColor: age === 'elder' ? rpick([0xb8b8b8, 0xe8e4dc, 0x8a8a8a]) : rpick(HAIR_COLORS.slice(0, 7)),
    top: rpick(CLOTH_COLORS), bottom: rpick(CLOTH_COLORS.slice(0, 15)), shoes: rpick([0x2a2a2e, 0x6a4a30, 0xe8e4dc, 0x3a3a6a, 0xa83a3a]), outfit };
}
function randomPers(total = TRAIT_POINTS) {
  const p = { neat: 0, outgoing: 0, active: 0, playful: 0, nice: 0 }, keys = Object.keys(p);
  for (let i = 0; i < total; i++) { const k = rpick(keys.filter((k) => p[k] < 10)); p[k]++; }
  return p;
}
function makeSim(o = {}) {
  const body = o.body || rpick(['f', 'm', 'x']);
  const age = o.age || 'adult';
  const pronoun = o.pronoun || (body === 'f' ? 'she' : body === 'm' ? 'he' : rpick(['they', 'she', 'he']));
  const first = o.first || rpick(pronoun === 'she' ? NAMES_F.concat(NAMES_X.slice(0, 6)) : pronoun === 'he' ? NAMES_M.concat(NAMES_X.slice(6, 12)) : NAMES_X);
  const s = {
    id: o.id || newId(), first, last: o.last || rpick(SURNAMES), age, ageDays: o.ageDays || 0, pronoun,
    look: o.look || randomLook(body, age), canCarry: o.canCarry != null ? o.canCarry : body === 'f', voice: o.voice != null ? o.voice : R01(),
    pers: o.pers || randomPers(), interests: o.interests || rshuffle(INTERESTS.map((i) => i.id)).slice(0, 3),
    needs: {}, skills: {}, rels: {}, moodlets: [], job: null, school: null,
    household: !!o.household, role: o.role || (o.household ? 'resident' : 'townie'), alive: true,
    x: 0, z: 0, dir: 0, onLot: false, away: null, posture: 'stand', anim: 'idle', animT: 0, queue: [], cur: null,
    mood: 50, novel: 0, painting: 0, lastSocial: -999, idleT: 0, bornDay: dayNum(), memory: [],
  };
  if (o.look && o.look.body == null) s.look.body = body;
  s.sign = signFor(s.pers);
  for (const n of NEEDS) s.needs[n.id] = o.needs ? o.needs[n.id] : rrange(65, 95);
  for (const k of SKILLS) s.skills[k.id] = { lv: 0, xp: 0 };
  if (o.skills) for (const k in o.skills) s.skills[k] = { lv: o.skills[k], xp: 0 };
  if (age === 'child' || age === 'teen') s.school = { grade: 7, homework: false, perf: 0 };
  G.sims.push(s);
  return s;
}

// ---------- needs & mood ----------
function decayNeeds(s, dt) {
  const N = s.needs, h = dt / 60, P = s.pers;
  const baby = s.age === 'baby', kid = s.age === 'child';
  const k = (id) => NEED[id].decay * h;
  N.hunger -= k('hunger') * (baby ? 1.5 : 1) * (1 + (P.active - 5) * 0.03);
  N.bladder -= k('bladder') * (baby ? 0 : s.sleeping ? 0.45 : 1);
  if (!s.sleeping) N.energy -= k('energy') * (kid ? 1.15 : s.age === 'elder' ? 1.1 : 1);
  N.hygiene -= k('hygiene') * (baby ? 1.3 : 1);
  N.fun -= k('fun') * (1 + (P.playful - 5) * 0.06) * (baby ? 1.2 : 1);
  N.social -= k('social') * (1 + (P.outgoing - 5) * 0.07) * (baby ? 1.3 : 1);
  if (s.posture === 'stand' && !baby) N.comfort -= k('comfort');
  if (s.onLot && !s.away) { const r = LOT.rooms[roomAt(s.x, s.z)]; const target = r ? (r.score != null ? r.score : 50) : 50; N.room += (target - N.room) * Math.min(1, 0.06 * dt); }
  for (const n of NEEDS) N[n.id] = clamp(N[n.id], 0, 100);
}
// At work or school: lunch and a bathroom are on site, colleagues and classmates keep them company
function decayAway(s, dt) {
  const N = s.needs, h = dt / 60;
  N.hunger = Math.max(Math.min(N.hunger, 30), N.hunger - NEED.hunger.decay * h * 0.7);
  N.bladder = Math.max(Math.min(N.bladder, 55), N.bladder - NEED.bladder.decay * h * 0.6);
  N.energy -= NEED.energy.decay * h * 0.85;
  N.hygiene -= NEED.hygiene.decay * h * 0.6;
  N.fun -= NEED.fun.decay * h * (s.away && s.away.kind === 'school' ? 0.35 : 0.5);
  N.social += 3 * h;
  for (const n of NEEDS) N[n.id] = clamp(N[n.id], 0, 100);
}
function addNeeds(s, rates, dt) { // rates per game hour
  for (const k in rates) if (s.needs[k] != null) s.needs[k] = clamp(s.needs[k] + rates[k] * dt / 60, 0, 100);
}
function calcMood(s) {
  let sum = 0, wsum = 0;
  for (const n of NEEDS) {
    const v = s.needs[n.id];
    const f = v >= 50 ? (v - 50) / 50 : -Math.pow((50 - v) / 50, 0.9) * 1.6;
    sum += f * n.weight; wsum += n.weight;
  }
  let m = (sum / wsum) * 100;
  for (const ml of s.moodlets) m += MOODLETS[ml.id] ? MOODLETS[ml.id].mood : 0;
  s.mood = clamp(m, -100, 100);
  return s.mood;
}
const moodLabel = (m) => (m > 60 ? 'Elated' : m > 30 ? 'Happy' : m > 5 ? 'Fine' : m > -20 ? 'Uncomfortable' : m > -50 ? 'Unhappy' : 'Miserable');
const moodColor = (m) => { const t = clamp((m + 100) / 200, 0, 1); return t > 0.5 ? mixHex(0xf0d040, 0x40e060, (t - 0.5) * 2) : mixHex(0xe04030, 0xf0d040, t * 2); };
function lowestNeed(s) { let best = null; for (const n of NEEDS) { if (s.age === 'baby' && (n.id === 'bladder' || n.id === 'comfort' || n.id === 'room')) continue; if (!best || s.needs[n.id] < s.needs[best.id]) best = n; } return best; }

function addMoodlet(s, id, hours) {
  const def = MOODLETS[id]; if (!def) return;
  s.moodlets = s.moodlets.filter((m) => m.id !== id);
  s.moodlets.push({ id, until: G.t + (hours || def.hours) * 60 });
}
const hasMoodlet = (s, id) => s.moodlets.some((m) => m.id === id);
function expireMoodlets(s) { s.moodlets = s.moodlets.filter((m) => m.until > G.t); }

// ---------- skills ----------
function gainSkill(s, id, minutes) {
  const sk = s.skills[id]; if (!sk || sk.lv >= 10) return;
  const mult = (s.age === 'child' ? 1.3 : s.age === 'elder' ? 0.9 : 1) * (s.mood < -20 ? 0.5 : 1);
  sk.xp += minutes * mult;
  const need = skillNeed(sk.lv);
  if (sk.xp >= need) {
    sk.xp -= need; sk.lv++;
    bus.emit('did', s, 'skill', { skill: id, level: sk.lv });
    if (s.household) { notify(`${s.first} reached ${SKILL[id].label} level ${sk.lv}!`, SKILL[id].icon, s); floatText(s, '+' + SKILL[id].icon, '#8af0a0'); sfx('skill'); }
  }
}
const skillLv = (s, id) => (s.skills[id] ? s.skills[id].lv : 0);
const skillProg = (s, id) => { const sk = s.skills[id]; return sk.lv >= 10 ? 1 : sk.xp / skillNeed(sk.lv); };

// ---------- relationships ----------
function rel(a, b) {
  if (!a.rels[b.id]) a.rels[b.id] = { f: 0, r: 0, met: false };
  return a.rels[b.id];
}
const relGet = (a, b) => a.rels[b.id] || { f: 0, r: 0, met: false };
function relAdd(a, b, df, dr = 0) {
  const ra = rel(a, b), rb = rel(b, a);
  const before = ra.f;
  ra.f = clamp(ra.f + df, -100, 100); rb.f = clamp(rb.f + df * 0.9, -100, 100);
  if (dr) { ra.r = clamp(ra.r + dr, 0, 100); rb.r = clamp(rb.r + dr * 0.9, 0, 100); }
  if (dr < 0) { ra.r = clamp(ra.r, 0, 100); }
  ra.met = rb.met = true;
  if (before < 50 && ra.f >= 50 && !ra.family) { addMoodlet(a, 'newFriend'); addMoodlet(b, 'newFriend'); bus.emit('did', a, 'friend', { target: b }); bus.emit('did', b, 'friend', { target: a }); if (a.household || b.household) notify(`${a.first} and ${b.first} are now friends.`, '🤝', a.household ? a : b); }
  if (before > -50 && ra.f <= -50 && (a.household || b.household)) notify(`${a.first} and ${b.first} have become enemies.`, '😠', a.household ? a : b);
}
function relLabel(a, b) {
  const r = relGet(a, b);
  if (r.spouse) return 'Spouse';
  if (r.engaged) return 'Fiancé(e)';
  if (r.partner) return 'Partner';
  if (r.family) return r.family;
  if (r.f >= 80) return 'Best friend';
  if (r.f >= 50) return 'Friend';
  if (r.f <= -50) return 'Enemy';
  if (r.f <= -20) return 'Disliked';
  if (!r.met) return 'Stranger';
  return 'Acquaintance';
}
const isFamily = (a, b) => !!relGet(a, b).family;
const partnerOf = (a) => { for (const id in a.rels) { const r = a.rels[id]; if (r.partner || r.engaged || r.spouse) { const s = simById(+id); if (s && s.alive) return s; } } return null; };
const friendCount = (s) => Object.keys(s.rels).filter((id) => { const o = simById(+id); return o && o.alive && s.rels[id].f >= 50 && !o.service; }).length;
function setFamily(a, b, aToB, bToA) { rel(a, b).family = aToB; rel(b, a).family = bToA; rel(a, b).met = rel(b, a).met = true; rel(a, b).f = Math.max(rel(a, b).f, 45); rel(b, a).f = Math.max(rel(b, a).f, 45); }
function setPartners(a, b, kind) { // kind: partner | engaged | spouse
  const ra = rel(a, b), rb = rel(b, a);
  for (const r of [ra, rb]) { r.partner = kind === 'partner'; r.engaged = kind === 'engaged'; r.spouse = kind === 'spouse'; r.met = true; r.f = Math.max(r.f, 60); r.r = Math.max(r.r, 70); }
}
function clearPartners(a, b) { for (const r of [rel(a, b), rel(b, a)]) { r.partner = r.engaged = r.spouse = false; } }
function compat(a, b) { // -1..1 from star signs and shared interests
  let c = 0;
  if ((SIGN_LIKE[a.sign] || []).includes(b.sign)) c += 0.5;
  if ((SIGN_DISLIKE[a.sign] || []).includes(b.sign)) c -= 0.5;
  c += a.interests.filter((i) => b.interests.includes(i)).length * 0.2;
  return clamp(c, -1, 1);
}

// ---------- model ----------
function makeSimModel(s) {
  if (s.model) R.scene.remove(s.model);
  s.model = buildSimModel(s);
  s.model.userData.pick = { type: 'sim', sim: s };
  s.model.visible = s.onLot && !s.away;
  R.scene.add(s.model);
  s.portrait = null;
  syncSimModel(s);
}
function simPortrait(s) {
  if (!s.portrait) { const m = buildSimModel(s); poseSim(m, 'idle', 0, { mood: 40 }); s.portrait = renderThumb(m, s.age === 'baby' ? 'obj' : 'head'); }
  return s.portrait;
}
function syncSimModel(s) {
  const m = s.model; if (!m) return;
  m.visible = s.onLot && !s.away && s.alive;
  if (!m.visible) return;
  m.position.set(s.x, s.y || 0, s.z);
  m.rotation.y = s.dir;
  poseSim(m, s.anim, s.animT, { talk: s.talking, mood: s.mood, seatH: s.seatH });
}
