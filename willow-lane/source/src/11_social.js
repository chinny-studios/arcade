// Willow Lane — social interactions, romance milestones, weddings, moving in, pregnancy, birth, birthdays and old age

// Each social: cat, label, icon, req(a, b) -> true | 'reason' | false, p(a, b) acceptance chance,
// win/lose deltas { f, r, social, fun } for the pair, anims [initiator, target], topics for speech bubbles, dur in game minutes
const SOCIALS = [
  // talk
  { id: 'introduce', cat: 'Talk', label: 'Introduce yourself', icon: '👋', req: (a, b) => (!relGet(a, b).met ? true : false), p: () => 0.95, win: { f: 6, social: 10 }, anims: ['wave', 'wave'], topics: ['👋'], dur: 6, close: false },
  { id: 'chat', cat: 'Talk', label: 'Chat', icon: '💬', req: () => true, p: (a, b) => 0.75 + relGet(b, a).f / 300 + b.pers.outgoing * 0.015, win: { f: 4, social: 22, fun: 4 }, lose: { f: -2 }, anims: ['talk', 'talk'], topic: 'interest', dur: 18 },
  { id: 'joke', cat: 'Talk', label: 'Tell a joke', icon: '🤣', req: (a, b) => (relGet(a, b).f > -40 ? true : 'They can’t stand you'), p: (a, b) => 0.35 + b.pers.playful * 0.06 + relGet(b, a).f / 300 + skillLv(a, 'charisma') * 0.02, win: { f: 6, social: 18, fun: 14 }, lose: { f: -4 }, anims: ['talk', 'laugh'], topics: ['🤡', '🍌', '🦆'], dur: 10 },
  { id: 'compliment', cat: 'Talk', label: 'Compliment', icon: '🌟', req: (a, b) => (relGet(a, b).met ? true : false), p: (a, b) => 0.6 + relGet(b, a).f / 250 + skillLv(a, 'charisma') * 0.03, win: { f: 5, social: 14 }, lose: { f: -2 }, anims: ['talk', 'shy'], topics: ['🌟', '👗', '😊'], dur: 8 },
  { id: 'deepTalk', cat: 'Talk', label: 'Deep conversation', icon: '🌌', req: (a, b) => (relGet(a, b).f >= 35 ? true : 'Not close enough yet'), p: (a, b) => 0.5 + relGet(b, a).f / 200 + compat(a, b) * 0.2 + (10 - b.pers.playful) * 0.02, win: { f: 8, social: 30 }, lose: { f: -3 }, anims: ['talk', 'talk'], topics: ['🌌', '💭', '📚', '🕯️'], dur: 25 },
  { id: 'gossip', cat: 'Talk', label: 'Gossip', icon: '🤫', req: (a, b) => (relGet(a, b).f >= 25 ? true : 'Not close enough yet'), p: (a, b) => 0.4 + b.pers.outgoing * 0.04 + (10 - b.pers.nice) * 0.02, win: { f: 6, social: 22, fun: 8 }, lose: { f: -5 }, anims: ['talk', 'laugh'], topics: ['🤫', '👀', '💅'], dur: 14 },
  { id: 'complain', cat: 'Talk', label: 'Complain', icon: '😤', req: (a, b) => (relGet(a, b).met ? true : false), p: (a, b) => 0.3 + b.pers.nice * 0.05 + relGet(b, a).f / 300, win: { f: 2, social: 14 }, lose: { f: -5 }, anims: ['angry', 'listen'], topics: ['🌧️', '💸', '😤'], dur: 12 },
  // friendly
  { id: 'highFive', cat: 'Friendly', label: 'High five', icon: '✋', req: (a, b) => (relGet(a, b).f >= 15 ? true : 'Not close enough yet'), p: (a, b) => 0.55 + b.pers.playful * 0.04 + relGet(b, a).f / 300, win: { f: 4, social: 10, fun: 10 }, lose: { f: -3 }, anims: ['cheer', 'cheer'], topics: ['✋'], dur: 4, close: true },
  { id: 'hug', cat: 'Friendly', label: 'Hug', icon: '🤗', req: (a, b) => (relGet(a, b).f >= 35 || isFamily(a, b) ? true : 'Not close enough yet'), p: (a, b) => 0.4 + relGet(b, a).f / 120 + b.pers.nice * 0.02, win: { f: 8, social: 20 }, lose: { f: -6 }, anims: ['hug', 'hug'], topics: ['💗'], dur: 6, close: true },
  { id: 'backRub', cat: 'Friendly', label: 'Back rub', icon: '💆', req: (a, b) => (relGet(a, b).f >= 45 ? true : 'Not close enough yet'), p: (a, b) => 0.4 + relGet(b, a).f / 150, win: { f: 6, r: 2, social: 16, comfort: 20 }, lose: { f: -6 }, anims: ['tickle', 'idle'], topics: ['💆'], dur: 10, close: true, behind: true },
  { id: 'tickle', cat: 'Friendly', label: 'Tickle', icon: '🤭', req: (a, b) => (relGet(a, b).f >= 30 || isFamily(a, b) ? true : 'Not close enough yet'), p: (a, b) => 0.3 + b.pers.playful * 0.06 + relGet(b, a).f / 300, win: { f: 6, social: 14, fun: 20 }, lose: { f: -6 }, anims: ['tickle', 'giggle'], topics: ['🤭'], dur: 7, close: true },
  { id: 'dance', cat: 'Friendly', label: 'Dance together', icon: '💃', req: (a, b) => (relGet(a, b).f >= 20 ? true : 'Not close enough yet'), p: (a, b) => 0.45 + b.pers.active * 0.04 + relGet(b, a).f / 300, win: { f: 6, social: 16, fun: 24 }, lose: { f: -3 }, anims: ['dance', 'dance'], topics: ['🎵'], dur: 15 },
  { id: 'gift', cat: 'Friendly', label: 'Give a gift ($50)', icon: '🎁', req: (a, b) => (!a.household ? false : !moneyOK(50) ? 'Costs $50' : relGet(a, b).met ? true : false), p: () => 0.92, win: { f: 12, social: 12, fun: 6 }, anims: ['talk', 'cheer'], topics: ['🎁'], dur: 6, cost: 50 },
  { id: 'playTag', cat: 'Friendly', label: 'Play tag', icon: '🏃', req: (a, b) => (a.age === 'child' && b.age === 'child' ? true : a.age === 'child' || b.age === 'child' ? (relGet(a, b).f >= 20 || isFamily(a, b) ? true : 'Not close enough yet') : false), p: (a, b) => 0.6 + b.pers.playful * 0.04, win: { f: 6, social: 14, fun: 30 }, lose: { f: -2 }, anims: ['cheer', 'giggle'], topics: ['🏃'], dur: 12 },
  { id: 'homeworkHelp', cat: 'Friendly', label: 'Help with homework', icon: '📝', req: (a, b) => (b.school && b.school.homework && isGrown(a) ? true : false), p: () => 0.9, win: { f: 6, social: 10 }, anims: ['talk', 'read'], topics: ['📝', '➗', '🧪'], dur: 30, after: (a, b) => { b.school.homework = false; b.school.perf += 1; gainSkill(b, 'logic', 15); } },
  // romance
  { id: 'flirt', cat: 'Romance', label: 'Flirt', icon: '😏', req: (a, b) => romReq(a, b, 15, 0), p: (a, b) => 0.3 + relGet(b, a).f / 200 + relGet(b, a).r / 150 + compat(a, b) * 0.15 + skillLv(a, 'charisma') * 0.02, win: { f: 4, r: 8, social: 14, fun: 8 }, lose: { f: -4, r: -2 }, anims: ['talk', 'shy'], topics: ['😏', '🌹', '✨'], dur: 8, romantic: true },
  { id: 'kiss', cat: 'Romance', label: 'Kiss', icon: '💋', req: (a, b) => romReq(a, b, 40, 30), p: (a, b) => 0.25 + relGet(b, a).r / 90 + relGet(b, a).f / 300, win: { f: 6, r: 12, social: 20, fun: 10 }, lose: { f: -8, r: -6 }, anims: ['kiss', 'kiss'], topics: ['💋'], dur: 6, close: true, romantic: true, kissy: true },
  { id: 'slowDance', cat: 'Romance', label: 'Slow dance', icon: '🌙', req: (a, b) => romReq(a, b, 40, 35), p: (a, b) => 0.35 + relGet(b, a).r / 100, win: { f: 6, r: 10, social: 20, fun: 16 }, lose: { f: -4, r: -4 }, anims: ['slowdance', 'slowdance'], topics: ['🌙', '💞'], dur: 15, close: true, romantic: true },
  { id: 'goSteady', cat: 'Romance', label: 'Ask to go steady', icon: '💞', req: (a, b) => { const r = romReq(a, b, 50, 45); if (r !== true) return r; const x = relGet(a, b); if (x.partner || x.engaged || x.spouse) return false; if (partnerOf(a) || partnerOf(b)) return 'Already with someone'; return true; }, p: (a, b) => 0.15 + relGet(b, a).r / 90, win: { f: 10, r: 10, social: 20 }, lose: { f: -8, r: -10 }, anims: ['talk', 'cheer'], topics: ['💞', '💑'], dur: 8, romantic: true, after: (a, b) => { setPartners(a, b, 'partner'); notify(`${a.first} and ${b.first} are going steady!`, '💞', a.household ? a : b); addMoodlet(a, 'smitten'); addMoodlet(b, 'smitten'); }, onLose: (a, b) => addMoodlet(a, 'rejected') },
  { id: 'propose', cat: 'Romance', label: 'Propose', icon: '💍', req: (a, b) => { if (!isGrown(a) || !isGrown(b)) return false; const x = relGet(a, b); if (!x.partner) return false; return x.r >= 70 && x.f >= 60 ? true : 'Not ready for that yet'; }, p: (a, b) => 0.05 + relGet(b, a).r / 85, win: { f: 10, r: 10, social: 20 }, lose: { f: -10, r: -15 }, anims: ['propose', 'cheer'], topics: ['💍'], dur: 10, close: true, romantic: true, after: (a, b) => { setPartners(a, b, 'engaged'); notify(`${b.first} said yes! ${a.first} and ${b.first} are engaged. Use “Get married” when you’re ready.`, '💍', a.household ? a : b); addMoodlet(a, 'engaged'); addMoodlet(b, 'engaged'); sfx('fanfare'); }, onLose: (a, b) => { addMoodlet(a, 'heartbroken'); } },
  { id: 'marry', cat: 'Romance', label: 'Get married', icon: '💒', req: (a, b) => (relGet(a, b).engaged ? (a.household || b.household ? true : false) : false), p: () => 0.97, win: { f: 15, r: 15, social: 30, fun: 20 }, anims: ['kiss', 'kiss'], topics: ['💒'], dur: 12, close: true, romantic: true, wedding: true, after: (a, b) => wedding(a, b) },
  { id: 'moveIn', cat: 'Romance', label: 'Ask to move in', icon: '🏡', req: (a, b) => { if (!a.household || b.household || !isGrown(b) && b.age !== 'teen') return false; if (b.age === 'teen' && !isGrown(a)) return false; if (household().length >= 8) return 'The house is full'; return relGet(a, b).f >= 60 || relGet(a, b).partner || relGet(a, b).engaged ? true : 'Not close enough yet'; }, p: (a, b) => 0.2 + relGet(b, a).f / 200 + relGet(b, a).r / 200, win: { f: 8, social: 12 }, lose: { f: -6 }, anims: ['talk', 'cheer'], topics: ['🏡'], dur: 8, after: (a, b) => moveIn(b, a) },
  { id: 'breakUp', cat: 'Romance', label: 'Break up', icon: '💔', req: (a, b) => { const x = relGet(a, b); return x.partner || x.engaged || x.spouse ? true : false; }, p: () => 1, win: { f: -25, r: -50 }, anims: ['talk', 'sad'], topics: ['💔'], dur: 10, after: (a, b) => { clearPartners(a, b); addMoodlet(b, 'heartbroken'); addMoodlet(a, 'rejected'); notify(`${a.first} broke up with ${b.first}.`, '💔', a.household ? a : b); } },
  // mean
  { id: 'insult', cat: 'Mean', label: 'Insult', icon: '😒', req: (a, b) => (relGet(a, b).met ? true : false), p: () => 1, win: { f: -10, social: 6, funA: 8 }, anims: ['angry', 'sad'], topics: ['😒', '🙄', '🐷'], dur: 8, mean: true },
  { id: 'poke', cat: 'Mean', label: 'Poke', icon: '👉', req: () => true, p: () => 1, win: { f: -4, social: 4, funA: 6 }, anims: ['tickle', 'angry'], topics: ['👉'], dur: 4, close: true, mean: true },
  { id: 'argue', cat: 'Mean', label: 'Argue', icon: '🗯️', req: (a, b) => (relGet(a, b).met ? true : false), p: () => 1, win: { f: -12, social: 8 }, anims: ['angry', 'angry'], topics: ['🗯️', '💢', '⚡'], dur: 15, mean: true, after: (a, b) => { addMoodlet(a, 'fought'); addMoodlet(b, 'fought'); } },
  { id: 'slap', cat: 'Mean', label: 'Slap', icon: '🖐️', req: (a, b) => (relGet(a, b).f <= -20 ? true : 'They haven’t done anything to deserve it'), p: () => 1, win: { f: -18, social: 4, funA: 10 }, anims: ['slap', 'flinch'], topics: ['💥'], dur: 5, close: true, mean: true, after: (a, b) => addMoodlet(b, 'embarrassed') },
  // visitors
  { id: 'greet', cat: 'Visitors', label: 'Greet & invite in', icon: '🚪', req: (a, b) => (b.visit && b.visit.state === 'door' && a.household ? true : false), p: () => 1, win: { f: 3, social: 10 }, anims: ['wave', 'wave'], topics: ['👋'], dur: 4, after: (a, b) => { b.visit.state = 'in'; b.visit.since = G.t; } },
  { id: 'inviteIn', cat: 'Visitors', label: 'Invite in', icon: '🏠', req: (a, b) => (b.visit && b.visit.state === 'passing' && a.household ? true : false), p: (a, b) => 0.35 + relGet(b, a).f / 150 + b.pers.outgoing * 0.04, win: { f: 3, social: 10 }, lose: { f: -1 }, anims: ['wave', 'talk'], topics: ['🏠'], dur: 4, after: (a, b) => { b.visit.state = 'in'; b.visit.since = G.t; b.visit.until = G.t + rint(120, 240); } },
  { id: 'goodbye', cat: 'Visitors', label: 'Say goodbye', icon: '👋', req: (a, b) => (b.visit && b.visit.state === 'in' && a.household ? true : false), p: () => 1, win: { social: 4 }, anims: ['wave', 'wave'], topics: ['👋'], dur: 4, after: (a, b) => { b.visit.until = G.t; } },
  { id: 'askLeave', cat: 'Visitors', label: 'Ask to leave', icon: '🚶', req: (a, b) => (b.visit && b.visit.state === 'in' && a.household ? true : false), p: () => 1, win: { f: -5 }, anims: ['talk', 'sad'], topics: ['🚶'], dur: 3, after: (a, b) => { b.visit.until = G.t; } },
];
const SOCIAL = Object.fromEntries(SOCIALS.map((x) => [x.id, x]));
const SOCIAL_CATS = ['Talk', 'Friendly', 'Romance', 'Mean', 'Visitors'];
function romReq(a, b, f, r) {
  const ga = romanceGroup(a), gb = romanceGroup(b);
  if (!ga || ga !== gb) return false;
  if (isFamily(a, b)) return false;
  const x = relGet(a, b);
  if (x.f < f) return 'Not close enough yet';
  if (x.r < r) return 'Needs more romance';
  const p = partnerOf(b);
  if (p && p !== a && b.onLot && p.onLot && Math.hypot(p.x - b.x, p.z - b.z) < 8 && !x.partner) return 'Their partner is watching!';
  return true;
}
// is the target free to talk?
function socialAvailable(b) {
  if (!b.alive || !b.onLot || b.away) return 'Not here';
  if (b.sleeping) return 'Sleeping';
  if (b.age === 'baby') return false;
  if (b.leaving) return 'Leaving';
  if (b.cur && (b.cur.id === 'beSocial' || b.cur.id === 'social')) return 'Busy talking';
  if (b.cur && b.cur.def.keep) return 'Busy';
  return true;
}
function socialMenu(a, b) {
  const out = [];
  if (a === b) return out;
  const av = socialAvailable(b);
  for (const def of SOCIALS) {
    const r = def.req(a, b);
    if (r === false) continue;
    out.push({ cat: def.cat, label: def.label, icon: def.icon, id: def.id, disabled: r !== true ? r : av !== true ? av : null });
  }
  return out;
}

IX.social = {
  label: (a, b, id) => SOCIAL[id].label + ' — ' + b.first, icon: '💬',
  test: (a, b, id) => { const r = SOCIAL[id].req(a, b); if (r !== true) return r; const av = socialAvailable(b); return av === true ? true : av || 'Busy'; },
  run: function* (a, b, act, id) {
    const def = SOCIAL[id];
    act.icon = def.icon;
    // approach
    let tries = 0;
    while (!act.cancel && Math.hypot(b.x - a.x, b.z - a.z) > 1.6 && tries++ < 4) {
      const i = yield* walkNear(a, act, b.x, b.z, 1);
      if (i < 0) return;
      if (socialAvailable(b) !== true) { thought(a, '❓', 2); return; }
    }
    if (act.cancel || socialAvailable(b) !== true) return;
    if (b.cur && b.cur.user && b.household && !b.cur.cancel) { /* the player's orders take priority, but they still stop to listen */ }
    // pull the target in
    cancelAll(b, false);
    const bAct = queueAct(b, 'beSocial', a, id, false, true);
    // wait for them to be free and face us
    let t = 0;
    while (!act.cancel && t < 12) { t += yield; if (b.cur === bAct && b.posture === 'stand' && !b.path) break; }
    if (b.cur !== bAct) { if (bAct) bAct.cancel = true; return; }
    yield* faceSim(a, b);
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    if (def.close && d > 0.6) { const k = (d - 0.58) / d; yield* slide(a, a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, angleTo(a, b.x, b.z), 0.4); }
    bAct.facing = true;
    if (def.cost) spend(def.cost);
    // talk
    const topics = def.topic === 'interest' ? a.interests.concat(b.interests).map((i) => INTEREST[i].icon) : def.topics;
    let k = 0, el = 0;
    a.lastSocial = b.lastSocial = G.t;
    const p = clamp(def.p(a, b) + (b.mood / 400) + compat(a, b) * 0.08 + (def.mean ? 0 : (b.pers.nice - 5) * 0.01), 0.03, 0.98);
    const win = R01() < p;
    const shared = def.topic === 'interest' && a.interests.some((i) => b.interests.includes(i));
    a.talking = true;
    while (!act.cancel && el < def.dur) {
      const dt = yield; el += dt;
      const turn = Math.floor(el / 2.2) % 2;
      a.anim = def.anims[0]; b.anim = def.anims[1];
      a.talking = turn === 0 || def.anims[0] !== 'talk'; b.talking = turn === 1 && (def.anims[1] === 'talk' || def.anims[1] === 'listen');
      if (Math.floor(el / 2.2) !== k) { k = Math.floor(el / 2.2); const who = turn === 0 ? a : b; speech(who, [rpick(topics)], 2); babble(who, def.mean ? -0.6 : def.romantic ? 0.4 : 0.2); }
      addNeeds(a, { social: (def.win.social || 10) * 2 }, dt); addNeeds(b, { social: (def.win.social || 10) * 1.6 }, dt);
      if (def.kissy && chance(dt * 0.4)) hearts(a);
    }
    a.talking = b.talking = false;
    // outcome
    const delta = win ? def.win : def.lose || { f: -2 };
    const mult = 1 + (shared ? 0.5 : 0) + skillLv(a, 'charisma') * 0.04;
    if (win || def.lose) relAdd(a, b, (delta.f || 0) * (delta.f > 0 ? mult : 1), delta.r || 0);
    if (win) {
      addNeeds(a, { fun: (delta.fun || 0) + (delta.funA || 0), comfort: delta.comfort ? 0 : 0 }, 60);
      addNeeds(b, { fun: delta.fun || 0, comfort: delta.comfort || 0 }, 60);
      if (def.mean) { b.anim = def.anims[1] === 'sad' ? 'sad' : 'angry'; a.anim = 'laugh'; floatText(b, '−', '#ff7a64'); }
      else { a.anim = def.anims[0] === 'propose' ? 'propose' : def.close ? def.anims[0] : 'laugh'; b.anim = def.close ? def.anims[1] : rpick(['laugh', 'cheer', 'talk']); floatText(b, '+', '#8af0a0'); if (def.romantic) { hearts(a); hearts(b); sfx(def.kissy ? 'kiss' : 'chime'); } }
      if (def.after) def.after(a, b);
    } else {
      b.anim = 'angry'; a.anim = def.romantic ? 'sad' : 'shy';
      floatText(b, '−', '#ff7a64');
      speech(b, ['❌'], 2); babble(b, -0.8);
      if (def.romantic) addMoodlet(a, 'rejected');
      if (def.onLose) def.onLose(a, b);
    }
    yield* wait(a, act, 2.5, a.anim);
    bAct.cancel = true;
    a.anim = 'idle';
  },
};
IX.beSocial = {
  label: (b, a) => 'Talking with ' + a.first, icon: '💬', keep: true,
  run: function* (b, a, act) {
    if (b.posture !== 'stand' || b.seat) yield* getUp(b);
    let t = 0;
    while (!act.cancel && t < 90) {
      const dt = yield; t += dt;
      if (act.facing) { b.dir += angWrap(angleTo(b, a.x, a.z) - b.dir) * Math.min(1, dt * 8); }
      else { b.anim = 'idle'; b.dir += angWrap(angleTo(b, a.x, a.z) - b.dir) * Math.min(1, dt * 4); }
      if (!a.cur || a.cur.id !== 'social') break;
    }
    b.anim = 'idle';
  },
};

// ---------- life events ----------
function wedding(a, b) {
  setPartners(a, b, 'spouse');
  addMoodlet(a, 'married'); addMoodlet(b, 'married');
  G.stats.weddings++;
  sfx('fanfare'); confetti(a.x, 2, a.z); confetti(b.x, 2.2, b.z);
  for (const o of onLotSims()) if (o !== a && o !== b && o.age !== 'baby' && !o.sleeping && Math.hypot(o.x - a.x, o.z - a.z) < 12) { if (!o.cur || !o.cur.user) { cancelAll(o, false); queueAct(o, 'cheerFor', a, null, false, true); } }
  notify(`${a.first} and ${b.first} are married! 💒`, '💒', a.household ? a : b, true);
  const out = a.household ? b : a, home = a.household ? a : b;
  if (!out.household) moveIn(out, home);
}
function moveIn(s, host) {
  if (household().length >= 8) { notify('The house is full: nobody else can move in.', '🏠', host); return; }
  s.household = true; s.role = 'resident'; s.visit = null; s.leaving = false;
  const bring = rint(5, 30) * 100;
  earn(bring, s);
  if (s.age === 'child' || s.age === 'teen') s.school = s.school || { grade: 7, homework: false, perf: 0 };
  notify(`${fullName(s)} moved in and brought ${fmtMoney(bring)} with ${them(s)}.`, '🏡', s, true);
  bus.emit('household');
}
function startPregnancy(carrier, other) {
  carrier.preg = { start: G.t, partner: other.id };
  G.flags.pregNote = true;
  notify(`${carrier.first} is expecting a baby with ${other.first}! 🍼`, '🍼', carrier, true);
  sfx('fanfare');
  addMoodlet(carrier, 'smitten'); addMoodlet(other, 'smitten');
}
const PREG_MIN = 3 * 1440;
function tickPregnancy(s) {
  if (!s.preg) return;
  const k = (G.t - s.preg.start) / PREG_MIN;
  if (s.model && s.model.userData.J && s.model.userData.J.torso) {
    const J = s.model.userData.J;
    if (!J.belly) { J.belly = sph(J.torso, 0.15, mat(s.look.top), 0, 0.12, 0.08, 10); }
    const sc = clamp(k * 1.2, 0, 1); J.belly.scale.set(sc * 1.1, sc, sc * 0.9); J.belly.visible = sc > 0.1;
  }
  if (k >= 1 && s.onLot && !s.away) giveBirth(s);
}
function giveBirth(s) {
  const other = simById(s.preg.partner);
  s.preg = null;
  if (s.model && s.model.userData.J && s.model.userData.J.belly) s.model.userData.J.belly.visible = false;
  const baby = makeBaby(s, other);
  notify(`${s.first} had a baby! Welcome, ${baby.first}! 👶`, '👶', baby, true);
  for (const p of [s, other]) if (p) addMoodlet(p, 'newBaby');
  sfx('fanfare');
  bus.emit('household');
}
function makeBaby(p1, p2, adoptive) {
  const body = rpick(['f', 'm', 'x']);
  const mixP = {};
  for (const t of TRAITS) mixP[t.id] = clamp(Math.round(((p1 ? p1.pers[t.id] : 5) + (p2 ? p2.pers[t.id] : 5)) / 2 + rint(-2, 2)), 0, 10);
  const look = adoptive ? randomLook(body, 'baby') : {
    body, skin: p2 ? mixHex(p1.look.skin, p2.look.skin, rrange(0.3, 0.7)) : p1.look.skin, hair: 'short',
    hairColor: rpick([p1.look.hairColor, p2 ? p2.look.hairColor : p1.look.hairColor]), top: rpick([0xf0d0e0, 0xd0e0f0, 0xf0f0d0, 0xe0f0e0]), bottom: 0xe8e4dc, shoes: 0xe8e4dc, outfit: 'pants',
  };
  const s = makeSim({ age: 'baby', body, last: G.family, look, pers: mixP, household: true, interests: rshuffle([...(p1 ? p1.interests : []), ...(p2 ? p2.interests : []), ...INTERESTS.map((i) => i.id)]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3) });
  s.needs.hunger = 80; s.needs.social = 80; s.needs.hygiene = 90; s.needs.fun = 70; s.needs.energy = 90;
  for (const p of [p1, p2]) if (p) setFamily(p, s, 'Child', 'Parent');
  for (const h of household()) if (h !== s && h !== p1 && h !== p2) { if (p1 && relGet(h, p1).family === 'Child') setFamily(h, s, 'Sibling', 'Sibling'); }
  G.stats.births++;
  // put the baby in a free bassinet, or get one for free
  let crib = G.objects.find((o) => o.type === 'crib' && !babyIn(o));
  if (!crib) crib = placeFreeNear('crib', p1 ? p1.x : LOT_W / 2, p1 ? p1.z : LOT_D / 2);
  s.crib = crib ? crib.id : 0;
  s.onLot = true;
  if (crib) { const [x, z] = objCenter(crib); s.x = x; s.z = z; s.dir = worldAngle(crib, 0); }
  else { s.x = p1.x; s.z = p1.z; }
  makeSimModel(s);
  return s;
}
// find room for an object near a point, trying every rotation, indoors first
function placeFreeNear(type, x, z) {
  const def = CAT[type];
  let best = null, bd = 1e9;
  for (let tz = 0; tz < LOT_D; tz++) for (let tx = 0; tx < LOT_W; tx++) for (let r = 0; r < 4; r++) {
    if (canPlace(def, tx, tz, r)) continue;
    const tmp = { def, x: tx, z: tz, r };
    if (def.acts.length && !standSpots(Object.assign(tmp, { users: {} })).length) continue;
    const d = Math.hypot(tx - x, tz - z) + (roomAt(tx + 0.5, tz + 0.5) ? 0 : 20);
    if (d < bd) { bd = d; best = [tx, tz, r]; }
  }
  if (!best) return null;
  return placeObject(type, best[0], best[1], best[2], { price: 0 });
}

// ---------- birthdays & old age ----------
const stageDays = (age) => AGES[age].days * LIFESPAN[G.options.lifespan || 'normal'];
function dailyAging() {
  if (!G.options.aging) return;
  for (const s of G.sims) {
    if (!s.alive || !s.household) continue;
    s.ageDays++;
    if (AGES[s.age].next && s.ageDays >= stageDays(s.age)) s.birthdayDue = true;
    if (s.age === 'elder' && s.ageDays >= stageDays('elder') + (s.extraLife == null ? (s.extraLife = rint(0, 3)) : s.extraLife)) s.deathDue = true;
  }
}
function ageUp(s) {
  const prev = s.age, next = AGES[s.age].next;
  if (!next) return;
  s.birthdayDue = false;
  s.age = next; s.ageDays = 0;
  if (prev === 'baby') {
    s.crib = 0;
    // a new look for the toddler-turned-child
    const L = s.look; L.hair = rpick(['short', 'curly', 'pigtails', 'bob', 'pony', 'side', 'afro']); L.top = rpick(CLOTH_COLORS); L.bottom = rpick(CLOTH_COLORS); L.outfit = rpick(['pants', 'shorts', 'skirt']); L.shoes = rpick([0x2a2a2e, 0xe8e4dc, 0xa83a3a]);
    s.school = { grade: 7, homework: false, perf: 0 };
    // step out next to the bassinet
    const free = findPath(s.x, s.z, [[Math.floor(s.x) + 1, Math.floor(s.z)], [Math.floor(s.x) - 1, Math.floor(s.z)], [Math.floor(s.x), Math.floor(s.z) + 1], [Math.floor(s.x), Math.floor(s.z) - 1]]);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const tx = Math.floor(s.x) + dx, tz = Math.floor(s.z) + dz; if (NAV.walk(tx, tz)) { s.x = tx + 0.5; s.z = tz + 0.5; break; } }
    for (const k in s.needs) s.needs[k] = Math.max(s.needs[k], 60);
  }
  if (next === 'adult') { s.school = null; if (s.household) setTimeout(() => notify(`${s.first} is an adult now and can look for a job (computer or newspaper).`, '💼', s), 400); }
  if (next === 'elder' && s.job) {
    const L = careerLevel(s.job); s.pension = Math.round(L.pay * 0.45); s.job = null;
    if (s.household) notify(`${s.first} retired with a pension of ${fmtMoney(s.pension)} a day.`, '👴', s);
  }
  if (next === 'elder') s.look.hairColor = mixHex(s.look.hairColor, 0xd8d8d8, 0.7);
  if (s.pers && prev === 'baby') { /* personality is set at birth */ }
  hardStop(s);
  makeSimModel(s);
  addMoodlet(s, 'birthday');
  confetti(s.x, 1.8, s.z); sfx('fanfare');
  if (s.household) notify(`Happy birthday, ${s.first}! ${they(s)[0].toUpperCase() + they(s).slice(1)} ${s.pronoun === 'they' ? 'are' : 'is'} now ${AGES[next].label.toLowerCase() === 'adult' ? 'an adult' : AGES[next].label.toLowerCase() === 'elder' ? 'an elder' : 'a ' + AGES[next].label.toLowerCase()}.`, '🎂', s, true);
  for (const o of onLotSims()) if (o !== s && o.household && !o.sleeping && o.age !== 'baby' && Math.hypot(o.x - s.x, o.z - s.z) < 10 && (!o.cur || !o.cur.user)) { cancelAll(o, false); queueAct(o, 'cheerFor', s, null, false, true); }
  bus.emit('household');
}
function passAway(s) {
  s.deathDue = false;
  hardStop(s);
  s.dying = 0.001;
  s.anim = 'cheer';
  sfx('passing');
  notify(`${fullName(s)} has passed away peacefully after a long, full life. Rest in peace.`, '🕊️', s, true);
  for (const o of G.sims) if (o.alive && o !== s && (relGet(o, s).f >= 40 || isFamily(o, s) || relGet(o, s).spouse)) { addMoodlet(o, 'grieving'); }
}
function finishPassing(s) {
  s.alive = false; s.onLot = false; s.household = false; s.dying = 0;
  if (s.model) s.model.visible = false;
  if (G.selected === s) G.selected = household().find((h) => !h.away && h.onLot) || household()[0] || null;
  const urn = placeFreeNear('urn', LOT_W / 2, LOT_D - 4);
  if (urn) urn.memorial = s.first;
  bus.emit('household');
  if (!household().length) gameOver();
}
