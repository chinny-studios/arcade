// Ricky Rescue — the time between calls: the rig check (problems left by the last crew turn up on a call if nobody
// looks), restocking at a hospital or the station, coffee against a shift's worth of tiredness, and waiting on post
// with the clock running fast until the pager goes. Activities run on game time with the clock sped up, and a page
// interrupts them.

const DT = { act: null, waiting: false };
const ACT_WARP = 8, WAIT_WARP = 20;
const RIG_CHECK = [
  { id: 'o2', name: 'Main O₂ cylinder', dur: 20, fault: 'Main cylinder reads 400 psi', fix: 'Swap in a full cylinder', fixDur: 90 },
  { id: 'pads', name: 'Defib pads & AED self-test', dur: 30, fault: 'The pads expired last month', fix: 'Open a fresh set', fixDur: 40, acts: ['aed', 'analyse', 'shock', 'defib'], delay: 25, found: 'The pads are expired! Tearing open the spare set.' },
  { id: 'monitor', name: 'Monitor batteries', dur: 25, fault: 'Both batteries are nearly flat', fix: 'Swap in charged batteries', fixDur: 50, acts: ['monitor', 'ecg12'], delay: 20, found: 'The monitor died. Swapping the battery.' },
  { id: 'suction', name: 'Suction unit', dur: 25, fault: 'Won\'t hold vacuum: cracked canister', fix: 'Replace the canister', fixDur: 60, acts: ['suction'], delay: 20, found: 'The suction won\'t pull. Swapping the canister.' },
  { id: 'airway', name: 'Airway kit & laryngoscope', dur: 30, fault: 'The laryngoscope bulb is dead', fix: 'Fit a new blade', fixDur: 40, acts: ['ett'], delay: 25, found: 'No light on the blade! Swapping it.' },
  { id: 'drugs', name: 'Drug box seal & dates', dur: 35, fault: 'Seal broken and the naloxone is missing', fix: 'Replace from hospital or station stock', fixDur: 60, base: true },
  { id: 'gluco', name: 'Glucometer & strips', dur: 20, fault: 'The strip vial is empty', fix: 'Open a new vial', fixDur: 30, acts: ['glucose'], delay: 20, found: 'Out of test strips. Digging out a new vial.' },
  { id: 'stretcher', name: 'Stretcher & stair chair', dur: 30, fault: 'The stretcher battery is flat', fix: 'Swap the battery pack', fixDur: 60, acts: ['load'], delay: 20, found: 'The stretcher won\'t lift. Cranking it by hand.' },
  { id: 'radios', name: 'Portable radios', dur: 20 },
  { id: 'lights', name: 'Lights, siren & horn', dur: 25 },
];

// ---------- a new shift ----------
function resetDowntime(r = RNG()) {
  const S = G.shift;
  DT.act = null; DT.waiting = false;
  S.energy = 100; S.coffees = 0; S.lastCoffeeT = -1e9; S.energyWarn = 0;
  // the last crew left a few things for us to find
  const items = {};
  let n = 0;
  for (const c of RIG_CHECK) { const bad = !!c.fault && n < 3 && r.chance(0.22); if (bad) n++; items[c.id] = { state: 'todo', bad }; }
  S.check = { items, done: false, fixed: 0, missed: 0 };
  if (items.o2.bad) RIG.stock.o2 = 22;
  if (items.drugs.bad) RIG.stock.narcan = 0;
}
const atBase = () => RIG && (Object.values(CITY.hospitals).some((h) => dist(RIG.x, RIG.z, h.bay.x, h.bay.z) < 40) || dist(RIG.x, RIG.z, CITY.station.x, CITY.station.z) < 40);

// ---------- activities ----------
// o = { id, label, dur (game seconds), done(), cancel(fraction), hide (Ricky goes inside) }
function startActivity(o) {
  if (G.call || !G.shift || DT.act) return false;
  DT.act = Object.assign({ t: 0 }, o); DT.waiting = false;
  PLAYER.busy = 1; PLAYER.workPose = o.pose || null;
  if (o.hide && PLAYER.model) PLAYER.model.root.visible = false;
  return true;
}
function endActivity() {
  const a = DT.act; DT.act = null;
  PLAYER.busy = 0; PLAYER.workPose = null;
  if (a && a.hide && PLAYER.model && G.where === 'foot') PLAYER.model.root.visible = true;
  return a;
}
function cancelActivity() { const a = DT.act; if (!a) return; endActivity(); if (a.cancel) a.cancel(a.t / a.dur); }
function timeWarp() {
  if (G.call || !G.shift || G.shift.over) return 1;
  return DT.act ? ACT_WARP : DT.waiting ? WAIT_WARP : 1;
}
function fatigueMul() { const e = G.shift ? G.shift.energy : 100; return e < 20 ? 1.18 : e < 40 ? 1.08 : 1; }
function updateDowntime(gdt) {
  const S = G.shift; if (!S) return;
  const h = hourNow();
  S.energy = Math.max(0, S.energy - gdt / 3600 * (h < 6 ? 9 : 5.5));
  if (S.energy < 40 && S.energyWarn < 1) { S.energyWarn = 1; partnerSay('I\'m starting to fade. Coffee on the next quiet stretch?'); }
  if (S.energy < 20 && S.energyWarn < 2) { S.energyWarn = 2; toast('Ricky is exhausted and working slower. Grab a coffee between calls.', 'bad'); }
  if (DT.act) { DT.act.t += gdt; if (DT.act.t >= DT.act.dur) { const a = endActivity(); a.done(); } }
  if (DT.waiting && (G.call || !SSM.m12 || !SSM.m12.onPost || S.over)) DT.waiting = false;
}
bus.on('dispatch', () => { if (DT.act) { const a = DT.act; cancelActivity(); toast(`Page! ${a.label} interrupted.`); } DT.waiting = false; });

// ---------- waiting on post ----------
function toggleWait() {
  if (G.call || !G.shift || G.shift.over) return;
  const m = SSM.m12;
  if (DT.waiting) { DT.waiting = false; return; }
  if (!m || !m.onPost) { toast(m && m.post ? `You can only wait on post. Head to ${postLabel(m.post)}.` : 'You can only wait on post.', 'bad'); return; }
  if (DT.act) return;
  DT.waiting = true;
  toast('Waiting for a page… (T to stop)');
  if (rnd.chance(0.4)) partnerSay(pick(['I\'ll do the paperwork from the last one.', 'Wake me if it\'s a good one.', 'Quiet. Don\'t say it.', 'Want to quiz each other on drug doses?']));
}

// ---------- restocking ----------
function missingStock() {
  const full = fullStock(RIGS[RIG.type].cap); let n = 0;
  for (const [k, v] of Object.entries(full)) if (k === 'o2' ? RIG.stock.o2 < 90 : RIG.stock[k] < v) n++;
  return n;
}
function startRestock() {
  const n = missingStock();
  if (!n) { toast('The cabinets are already full.'); return; }
  closePanel('rear');
  const before = Object.assign({}, RIG.stock), full = fullStock(RIGS[RIG.type].cap);
  const fill = (f) => { for (const [k, v] of Object.entries(full)) RIG.stock[k] = Math.max(before[k], Math.round(before[k] + (v - before[k]) * f)); };
  startActivity({ id: 'restock', label: 'Restocking the cabinets', dur: 60 + n * 15, pose: 'crouch', done: () => {
    fill(1); toast('Cabinets restocked.', 'good');
    const it = G.shift.check.items; if (it.o2.bad && it.o2.state !== 'fixed') it.o2.bad = false; if (it.drugs.bad && it.drugs.state !== 'fixed') it.drugs.bad = false;
  }, cancel: (f) => { fill(f); toast('Restock cut short.'); } });
}

// ---------- the rig check ----------
function openRigCheck() { closePanel('rear'); renderRigCheck(); UI.show('rigcheck'); }
function renderRigCheck() {
  const S = G.shift; if (!S) return;
  const box = $('#rcList'); box.innerHTML = '';
  const busy = DT.act && DT.act.id.startsWith('rc:');
  for (const c of RIG_CHECK) {
    const it = S.check.items[c.id];
    const row = el('div', 'rc ' + it.state);
    const doing = busy && DT.act.item === c.id;
    let right = '';
    if (doing) right = `<span class="rcbar"><i style="width:${Math.round(DT.act.t / DT.act.dur * 100)}%"></i></span>`;
    else if (it.state === 'todo') right = `<button class="btn" data-check="${c.id}">Check · ${fmtDur(c.dur)}</button>`;
    else if (it.state === 'fault') right = `<button class="btn red" data-fix="${c.id}">${esc(c.fix)}</button>`;
    else right = `<span class="ok">${it.state === 'fixed' ? 'Fixed' : 'OK'}</span>`;
    row.innerHTML = `<div><b>${esc(c.name)}</b>${it.state === 'fault' ? `<span class="bad">${esc(c.fault)}</span>` : ''}</div>${right}`;
    box.appendChild(row);
  }
  const done = RIG_CHECK.filter((c) => S.check.items[c.id].state !== 'todo').length;
  $('#rcSum').textContent = S.check.done ? 'Rig check complete. Medic 12 is ready.' : `${done} of ${RIG_CHECK.length} checked` + (G.call ? ' · finish the call first' : '');
  for (const b of $$('[data-check]', box)) b.onclick = () => rigCheckItem(b.dataset.check);
  for (const b of $$('[data-fix]', box)) b.onclick = () => rigFixItem(b.dataset.fix);
}
function rigCheckItem(id) {
  const c = RIG_CHECK.find((q) => q.id === id), it = G.shift.check.items[id];
  if (G.call) { toast('Finish the call first.', 'bad'); return; }
  if (!startActivity({ id: 'rc:' + id, item: id, label: 'Checking the ' + c.name.toLowerCase(), dur: c.dur, done: () => {
    it.state = it.bad ? 'fault' : 'ok';
    if (it.bad) { AUDIO.tone(330, 0.15, 'square', 0.04); partnerSay(pick(['Good thing we looked.', 'Of course. Night crew strikes again.', 'Glad we caught that here and not on a call.'])); }
    rigCheckProgress();
  } })) return;
  renderRigCheck();
}
function rigFixItem(id) {
  const c = RIG_CHECK.find((q) => q.id === id), it = G.shift.check.items[id];
  if (G.call) { toast('Finish the call first.', 'bad'); return; }
  if (c.base && !atBase()) { toast('Only at a hospital or the station.', 'bad'); return; }
  if (!startActivity({ id: 'rc:' + id, item: id, label: c.fix, dur: c.fixDur, done: () => {
    it.state = 'fixed'; it.bad = false; G.shift.check.fixed++;
    if (id === 'o2') RIG.stock.o2 = 100;
    if (id === 'drugs') RIG.stock.narcan = fullStock(RIGS[RIG.type].cap).narcan;
    toast(c.name + ': sorted.', 'good');
    rigCheckProgress();
  } })) return;
  renderRigCheck();
}
function rigCheckProgress() {
  const S = G.shift, ch = S.check;
  if (!ch.done && RIG_CHECK.every((c) => ch.items[c.id].state === 'ok' || ch.items[c.id].state === 'fixed')) {
    ch.done = true; postReward(15); toast('Rig check complete. +15 XP', 'good');
  }
  if (UI.isOpen('rigcheck')) renderRigCheck();
}
// on a call: a problem nobody checked for costs time the first time the kit is needed
function equipDelay(actId, C = G.call) {
  const S = G.shift; if (!S || !S.check || !C) return 0;
  for (const c of RIG_CHECK) {
    if (!c.acts || !c.acts.includes(actId)) continue;
    const it = S.check.items[c.id];
    if (!it.bad || it.state === 'fixed') continue;
    it.bad = false; it.state = 'fixed'; S.check.missed++;
    (C.equipFails = C.equipFails || []).push(c.fault.charAt(0).toLowerCase() + c.fault.slice(1));
    toast(c.found, 'bad'); callLog(C, PARTNER_SHORT, c.found);
    return c.delay;
  }
  return 0;
}

// ---------- coffee ----------
function coffeeSpot() {
  if (G.call || !G.shift || PLAYER.sp !== 'city') return null;
  for (const p of SSM.posts) if (p.coffee && dist(PLAYER.x, PLAYER.z, p.coffee.x, p.coffee.z) < 3.4) return p.coffee;
  return null;
}
function grabCoffee(spot) {
  const S = G.shift, K = G.career;
  if (G.clockT - S.lastCoffeeT < 40 * 60) { toast('You just had one. Any more and your hands will shake.'); return; }
  if (spot.cost && K.money < spot.cost) { toast('Not enough cash.', 'bad'); return; }
  startActivity({ id: 'coffee', label: 'Grabbing a coffee', dur: 240, hide: true, done: () => {
    S.energy = Math.min(100, S.energy + 35); S.coffees++; S.lastCoffeeT = G.clockT; S.energyWarn = S.energy < 40 ? 1 : 0;
    if (spot.cost) K.money -= spot.cost;
    toast(`Coffee from ${spot.name}${spot.cost ? ' (' + fmtMoney(spot.cost) + ')' : ''}. Energy ${Math.round(S.energy)}%.`, 'good');
    if (rnd.chance(0.6)) partnerSay(pick(['Did you get me one? ...You did. You\'re the best.', 'Ah. Now I can feel my face again.', 'Same order as always, I see.']));
  }, cancel: (f) => { if (f > 0.5) { S.energy = Math.min(100, S.energy + 15); S.lastCoffeeT = G.clockT; toast('You grab the coffee to go.'); } } });
}
