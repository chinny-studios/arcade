// Ricky Rescue — menus and panels: title, new career, Station 12 (shift setup, garage, locker, career), options,
// help, pause, shift summary, first-time tips, and focus navigation for the gamepad.

const BLOCKING = ['rear', 'transport', 'handoff', 'triage', 'review', 'pause', 'options', 'help', 'shiftOver', 'mapBig'];
const PAUSING = ['pause', 'options', 'help', 'review', 'shiftOver'];
const UI = {
  open: new Set(), focusEl: null,
  show(id) { const e = $('#' + id); if (!e) return; e.hidden = false; this.open.add(id); this.focusEl = null; if (id === 'mapBig') HUD.mapBig = true; },
  hide(id) { const e = $('#' + id); if (!e) return; e.hidden = true; this.open.delete(id); this.focusEl = null; if (id === 'mapBig') HUD.mapBig = false; },
  isOpen(id) { return this.open.has(id); },
  blocking() { for (const id of BLOCKING) if (this.open.has(id)) return true; return G.mode !== 'play'; },
  paused() { for (const id of PAUSING) if (this.open.has(id)) return true; return G.mode !== 'play'; },
  top() { const order = ['options', 'help', 'pause', 'shiftOver', 'review', 'handoff', 'transport', 'triage', 'rear', 'mapBig', 'care']; for (const id of order) if (this.open.has(id)) return $('#' + id); const st = document.body.dataset.state; return st !== 'play' ? $('#' + st) : null; },
  // gamepad: move focus between visible buttons in the top panel
  update() {
    const n = Input.navPad(); if (!Object.keys(n).length) return;
    const root = this.top(); if (!root) return;
    const btns = $$('.btn', root).filter((b) => b.offsetParent !== null && !b.disabled);
    if (!btns.length) return;
    if (!this.focusEl || !btns.includes(this.focusEl)) { this.setFocus(btns[0]); if (!n.ok) return; }
    if (n.ok) { this.focusEl.click(); return; }
    if (n.back) { const x = $('.x', root); if (x && x.offsetParent) x.click(); else if (root.id === 'care') closeCare(); return; }
    const dir = n.up ? [0, -1] : n.down ? [0, 1] : n.left ? [-1, 0] : n.right ? [1, 0] : null; if (!dir) return;
    const a = this.focusEl.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bd = 1e9;
    for (const b of btns) {
      if (b === this.focusEl) continue;
      const r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      const along = dx * dir[0] + dy * dir[1]; if (along <= 4) continue;
      const d = along + Math.abs(dx * dir[1] + dy * dir[0]) * 2.5;
      if (d < bd) { bd = d; best = b; }
    }
    if (best) this.setFocus(best);
  },
  setFocus(b) { if (this.focusEl) this.focusEl.classList.remove('focus'); this.focusEl = b; b.classList.add('focus'); b.scrollIntoView({ block: 'nearest' }); },
};
function setState(s) { document.body.dataset.state = s; G.mode = s === 'play' ? 'play' : s; UI.focusEl = null; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }

// ---------- title ----------
function showTitle() {
  setState('title');
  closeAllPanels();
  const m = $('#titleMenu'); m.innerHTML = '';
  const has = hasSave();
  const add = (label, sub, fn, cls = '') => { const b = el('button', 'mb btn ' + cls, esc(label) + (sub ? `<small>${esc(sub)}</small>` : '')); b.onclick = () => { AUDIO.init(); AUDIO.click(); fn(); }; m.appendChild(b); };
  if (has) { const s = peekSave(); add('Continue career', s ? `${RANKS[rankFor(s.xp)].name} · ${s.stats.calls} calls` : '', () => { loadGame(); showStation(); }, 'go'); }
  add('New career', has ? 'replaces your save' : 'start as an EMT at Station 12', () => showCreate(), has ? '' : 'go');
  add('Quick shift', 'jump straight into a call', () => { if (!G.career) { G.career = has ? (loadGame(), G.career) : newCareer(); } startShift({ hours: 4, firstCall: 3 }); setState('play'); });
  add('How to play', '', () => UI.show('help'));
  add('Options', '', () => openOptions());
  titleScene();
}
function titleScene() {
  // the rig parked in front of the station with lights going, an orbiting camera
  if (!G.career) G.career = newCareer();
  const st = CITY.station;
  createRig(G.career.rig, st.x, st.z, st.yaw);
  RIG.siren = document.body.dataset.state === 'title';
  setEnv('city');
  G.clockT = document.body.dataset.state === 'title' ? 19.4 * 3600 : 9.5 * 3600;
  setTimeOfDay(G.clockT / 3600);
  G.titleT = 0;
}
function closeAllPanels() { for (const id of [...UI.open]) UI.hide(id); closeCare(); }

// ---------- new career ----------
const CREATE = { look: { skin: SKINS[2], hair: HAIRS[1], style: 'short' }, name: 'Ricky' };
function showCreate() {
  setState('create');
  const b = $('#createBody');
  const sw = (list, key) => list.map((c) => `<button class="sw btn${CREATE.look[key] === c ? ' on' : ''}" data-k="${key}" data-v="${c}" style="background:${hexCss(c)}"></button>`).join('');
  b.innerHTML = `
    <p>You're <b>Ricky</b>, a new EMT on Medic 12 out of Station 12 in Maple Heights. Your partner is <b>Marisol Vega</b>, an EMT with fourteen years on the job. Work your way up to Paramedic and Field Training Officer, unlock the rest of the city, and buy better rigs.</p>
    <div class="lab">Skin</div><div class="rowb">${sw(SKINS, 'skin')}</div>
    <div class="lab">Hair</div><div class="rowb">${sw(HAIRS, 'hair')}</div>
    <div class="lab">Hair style</div><div class="rowb">${['short', 'long', 'bun', 'bald', 'cap'].map((s) => `<button class="chip btn${CREATE.look.style === s ? ' on' : ''}" data-style="${s}">${s}</button>`).join('')}</div>
    <div class="rowb" style="margin-top:20px"><button class="big btn" id="crBack">Back</button><button class="big go btn" id="crGo">Start career</button></div>`;
  $$('.sw', b).forEach((e) => (e.onclick = () => { CREATE.look[e.dataset.k] = +e.dataset.v; showCreate(); }));
  $$('[data-style]', b).forEach((e) => (e.onclick = () => { CREATE.look.style = e.dataset.style; showCreate(); }));
  $('#crBack').onclick = () => showTitle();
  $('#crGo').onclick = () => { G.career = newCareer({ look: Object.assign({}, CREATE.look) }); saveGame(); showStation(); };
}

// ---------- the station ----------
const ST = { tab: 'shift', hour: 7, hours: 8, cover: null };
function showStation(tab) {
  setState('station');
  closeAllPanels();
  if (tab) ST.tab = tab;
  const K = G.career;
  if (!ST.cover) ST.cover = [...K.districts];
  ST.cover = ST.cover.filter((d) => K.districts.includes(d)); for (const d of K.districts) if (!ST.cover.includes(d) && ST.newly) ST.cover.push(d);
  if (!ST.cover.length) ST.cover = [...K.districts];
  titleScene();
  $('#stMoney').textContent = fmtMoney(K.money);
  $('#stRank').textContent = `${K.name} · ${RANKS[K.rank].long}`;
  const tabs = $('#stTabs'); tabs.innerHTML = '';
  for (const [id, name] of [['shift', 'Start a shift'], ['garage', 'Garage'], ['locker', 'Locker'], ['career', 'Career']]) {
    const b = el('button', 'tab btn' + (ST.tab === id ? ' on' : ''), name); b.onclick = () => { ST.tab = id; showStation(); }; tabs.appendChild(b);
  }
  const back = el('button', 'tab btn', 'Title'); back.style.marginLeft = 'auto'; back.onclick = () => showTitle(); tabs.appendChild(back);
  const B = $('#stBody');
  if (ST.tab === 'shift') {
    B.innerHTML = `
      <div class="lab">Start time</div><div class="rowb">${[[7, 'Day · 07:00'], [15, 'Evening · 15:00'], [21, 'Night · 21:00']].map(([h, n]) => `<button class="chip btn${ST.hour === h ? ' on' : ''}" data-h="${h}">${n}</button>`).join('')}</div>
      <div class="lab">Length</div><div class="rowb">${[[4, '4 hours'], [8, '8 hours'], [12, '12 hours']].map(([h, n]) => `<button class="chip btn${ST.hours === h ? ' on' : ''}" data-len="${h}">${n}</button>`).join('')}</div>
      <p class="dim" style="font-size:13px">Calls come every few minutes of game time; press T to skip quiet stretches. A 4-hour shift is about 4–6 calls.</p>
      <div class="lab">Districts to cover</div><div class="cards">${Object.entries(DISTRICTS).map(([id, d]) => { const un = K.districts.includes(id); return `<button class="card btn${un && ST.cover.includes(id) ? ' on' : ''}${un ? '' : ' locked'}" data-d="${id}"><b>${d.name}</b><span>${d.blurb}</span>${un ? '' : `<span class="price">Unlocks at ${RANKS[d.rank].name} and ${d.xp} XP</span>`}</button>`; }).join('')}</div>
      <div class="rowb"><button class="big go btn" id="stGo">Start shift</button></div>`;
    $$('[data-h]', B).forEach((e) => (e.onclick = () => { ST.hour = +e.dataset.h; showStation(); }));
    $$('[data-len]', B).forEach((e) => (e.onclick = () => { ST.hours = +e.dataset.len; showStation(); }));
    $$('[data-d]', B).forEach((e) => (e.onclick = () => { const id = e.dataset.d; if (!K.districts.includes(id)) return; if (ST.cover.includes(id)) { if (ST.cover.length > 1) ST.cover = ST.cover.filter((q) => q !== id); } else ST.cover.push(id); showStation(); }));
    $('#stGo').onclick = () => { AUDIO.init(); startShift({ hour: ST.hour, hours: ST.hours, cover: [...ST.cover] }); setState('play'); };
  } else if (ST.tab === 'garage') {
    const card = (on, title, sub, price, fn, locked) => `<button class="card btn${on ? ' on' : ''}${locked ? ' locked' : ''}" data-fn="${fn}"><b>${title}</b><span>${sub}</span><span class="price">${price}</span></button>`;
    const owned = (list, id) => list.includes(id);
    let h = '<div class="lab">Ambulances</div><div class="cards">';
    for (const [id, r] of Object.entries(RIGS)) h += card(K.rig === id, r.name, r.blurb + ` Top speed ${Math.round(r.speed * 2.237)} mph, ${Math.round(r.cap * 100)}% cabinets.`, owned(K.rigs, id) ? (K.rig === id ? 'In service' : 'Owned · select') : fmtMoney(r.cost), 'rig:' + id);
    h += '</div><div class="lab">Livery</div><div class="cards">';
    for (const [id, l] of Object.entries(LIVERIES)) h += card(K.livery === id, l.name, `<span style="display:inline-block;width:60px;height:12px;border-radius:3px;background:linear-gradient(90deg,${hexCss(l.body)} 50%,${hexCss(l.stripe)} 50%)"></span>`, owned(K.liveries, id) ? (K.livery === id ? 'Applied' : 'Owned') : fmtMoney(l.cost), 'liv:' + id);
    h += '</div><div class="lab">Light pattern</div><div class="cards">';
    for (const [id, l] of Object.entries(LIGHTS)) h += card(K.lightPat === id, l.name, '', owned(K.lightPats, id) ? (K.lightPat === id ? 'Fitted' : 'Owned') : fmtMoney(l.cost), 'pat:' + id);
    h += '</div><div class="lab">Light colours</div><div class="cards">';
    for (const [id, l] of Object.entries(LIGHT_COLORS)) h += card(K.lightCol === id, l.name, `<span style="display:inline-block;width:40px;height:12px;border-radius:3px;background:linear-gradient(90deg,${hexCss(l.a)} 50%,${hexCss(l.b)} 50%)"></span>`, owned(K.lightCols, id) ? (K.lightCol === id ? 'Fitted' : 'Owned') : fmtMoney(l.cost), 'col:' + id);
    h += '</div>';
    B.innerHTML = h;
    $$('[data-fn]', B).forEach((e) => (e.onclick = () => { garageBuy(e.dataset.fn); }));
  } else if (ST.tab === 'locker') {
    let h = '<div class="lab">Uniform</div><div class="cards">';
    for (const [id, u] of Object.entries(UNIFORMS)) h += `<button class="card btn${K.uniform === id ? ' on' : ''}" data-u="${id}"><b>${u.name}</b><span><span style="display:inline-block;width:40px;height:12px;border-radius:3px;background:linear-gradient(90deg,${hexCss(u.shirt)} 50%,${hexCss(u.pants)} 50%)"></span></span><span class="price">${K.uniforms.includes(id) ? (K.uniform === id ? 'Wearing' : 'Owned') : fmtMoney(u.cost)}</span></button>`;
    h += '</div>';
    const sw = (list, key) => list.map((c) => `<button class="sw btn${K.look[key] === c ? ' on' : ''}" data-k="${key}" data-v="${c}" style="background:${hexCss(c)}"></button>`).join('');
    h += `<div class="lab">Skin</div><div class="rowb">${sw(SKINS, 'skin')}</div><div class="lab">Hair</div><div class="rowb">${sw(HAIRS, 'hair')}</div><div class="lab">Hair style</div><div class="rowb">${['short', 'long', 'bun', 'bald', 'cap'].map((s) => `<button class="chip btn${K.look.style === s ? ' on' : ''}" data-style="${s}">${s}</button>`).join('')}</div>`;
    B.innerHTML = h;
    $$('[data-u]', B).forEach((e) => (e.onclick = () => garageBuy('uni:' + e.dataset.u)));
    $$('.sw', B).forEach((e) => (e.onclick = () => { K.look[e.dataset.k] = +e.dataset.v; saveGame(); showStation(); }));
    $$('[data-style]', B).forEach((e) => (e.onclick = () => { K.look.style = e.dataset.style; saveGame(); showStation(); }));
  } else {
    const nr = RANKS[K.rank + 1];
    const g = K.stats.grades;
    B.innerHTML = `
      <div class="xpbar"><i style="width:${nr ? clamp((K.xp - RANKS[K.rank].xp) / (nr.xp - RANKS[K.rank].xp) * 100, 0, 100) : 100}%"></i><span>${RANKS[K.rank].long} · ${K.xp} XP${nr ? ' · next: ' + nr.long + ' at ' + nr.xp : ''}</span></div>
      <div><span class="stat"><b>${K.stats.calls}</b><span>calls</span></span><span class="stat"><b>${K.stats.shifts}</b><span>shifts</span></span><span class="stat"><b>${K.stats.saves}</b><span>cardiac saves</span></span><span class="stat"><b>${K.stats.deliveries}</b><span>babies delivered</span></span><span class="stat"><b>${K.stats.best === null ? '–' : K.stats.best}</b><span>best score</span></span><span class="stat"><b>${g.A}/${g.B}/${g.C}/${g.D}/${g.F}</b><span>A/B/C/D/F</span></span></div>
      <div class="lab">Certifications</div><div class="cards">${RANKS.map((r, i) => `<div class="card${K.rank >= i ? ' on' : ' locked'}"><b>${r.long}</b><span>${r.blurb}</span><span class="price">${r.xp} XP</span></div>`).join('')}</div>
      <div class="lab">Recent calls</div>${K.hist.length ? K.hist.slice(0, 10).map((h) => `<div class="ri ${h.grade <= 'B' ? 'good' : h.grade === 'C' ? 'meh' : 'bad'}"><span>${h.grade}</span>${esc(h.nature)}: ${esc(h.name)} (${h.total})</div>`).join('') : '<p class="dim">No calls yet.</p>'}`;
  }
}
function garageBuy(code) {
  const K = G.career, [kind, id] = code.split(':');
  const table = { rig: [RIGS, 'rigs', 'rig'], liv: [LIVERIES, 'liveries', 'livery'], pat: [LIGHTS, 'lightPats', 'lightPat'], col: [LIGHT_COLORS, 'lightCols', 'lightCol'], uni: [UNIFORMS, 'uniforms', 'uniform'] }[kind];
  const [T, list, cur] = table;
  if (!K[list].includes(id)) {
    if (K.money < T[id].cost) { toastMenu(`You need ${fmtMoney(T[id].cost - K.money)} more.`); return; }
    K.money -= T[id].cost; K[list].push(id);
    AUDIO.chime('A');
  }
  K[cur] = id;
  saveGame();
  showStation();
}
function toastMenu(t) { const b = $('#stBody'); const d = el('div', 'toast bad', esc(t)); d.style.position = 'sticky'; d.style.top = '0'; b.prepend(d); setTimeout(() => d.remove(), 2500); }

// ---------- options, help, pause, shift over ----------
const OPT_DEFS = [
  ['volume', 'Volume', 'range', 0, 1], ['sirenVol', 'Siren volume', 'range', 0, 1.5], ['quality', 'Graphics', 'choice', [[0, 'Low'], [1, 'Medium'], [2, 'High']]],
  ['units', 'Speed units', 'choice', [['mph', 'mph'], ['kmh', 'km/h']]], ['gps', 'GPS line on the road', 'bool'], ['autoLights', 'Lights & sirens on automatically for priority 1', 'bool'],
  ['partnerAuto', 'Marisol takes vitals and starts CPR on her own', 'bool'], ['autoCPR', 'Ricky\'s compressions without the rhythm game', 'bool'], ['voice', 'Spoken AED prompts', 'bool'],
  ['shake', 'Camera shake', 'bool'], ['mapRotate', 'Rotate the minimap', 'bool'],
];
function openOptions() {
  const box = $('#optList'); box.innerHTML = '';
  for (const [k, name, type, a, b] of OPT_DEFS) {
    const row = el('div', 'opt', `<span>${name}</span>`);
    if (type === 'range') { const i = el('input'); i.type = 'range'; i.min = a; i.max = b; i.step = 0.05; i.value = OPTS[k]; i.oninput = () => { OPTS[k] = +i.value; applyOpts(); }; row.appendChild(i); }
    else if (type === 'bool') { const bt = el('button', 'chip btn' + (OPTS[k] ? ' on' : ''), OPTS[k] ? 'On' : 'Off'); bt.onclick = () => { OPTS[k] = !OPTS[k]; applyOpts(); openOptions(); }; row.appendChild(bt); }
    else { const w = el('div', 'rowb'); for (const [v, n] of a) { const bt = el('button', 'chip btn' + (OPTS[k] === v ? ' on' : ''), n); bt.onclick = () => { OPTS[k] = v; applyOpts(); openOptions(); }; w.appendChild(bt); } row.appendChild(w); }
    box.appendChild(row);
  }
  UI.show('options');
}
function applyOpts() { saveOpts(); AUDIO.setVolume(OPTS.volume); if (R.quality !== OPTS.quality) setQuality(OPTS.quality); if (ROUTE.mesh) ROUTE.mesh.visible = OPTS.gps; }
const HELP_HTML = `
<h3>The job</h3>
<p>Calls come over the radio. <b>Respond</b>, drive Medic 12 to the address following the blue GPS line, and park at the curb. Get out, take what you need from the back, find the patient (often inside), assess and treat them, move them to the stretcher, load them up and take them to the right hospital. Give a good handoff report, and the call is scored.</p>
<h3>Driving</h3>
<ul><li><span class="kbd">W</span><span class="kbd">S</span> or <span class="kbd">↑</span><span class="kbd">↓</span> throttle and brake/reverse, <span class="kbd">A</span><span class="kbd">D</span> steer, <span class="kbd">Space</span> handbrake.</li>
<li><span class="kbd">Q</span> lights and sirens, <span class="kbd">R</span> change siren tone, <span class="kbd">H</span> air horn, <span class="kbd">C</span> camera distance, <span class="kbd">F</span> get in or out.</li>
<li>With lights and sirens on, traffic pulls to the curb and cross traffic waits for you. Use them for priority 1 calls and critical patients only. Crashes cost points and shake up your patient.</li></ul>
<h3>On foot</h3>
<ul><li><span class="kbd">WASD</span> walk, <span class="kbd">Shift</span> run, drag with the mouse to look around. <span class="kbd">E</span> does the highlighted action; <span class="kbd">Tab</span> switches between actions when there are several.</li>
<li>At the <b>rear doors</b> take the stretcher (you push it; the jump bag and monitor ride on it), the stair chair, the scoop or the long board. Walk-ups beyond the first floor need the stair chair or scoop.</li></ul>
<h3>Patient care</h3>
<ul><li>Work top to bottom: <b>gloves</b>, <b>general impression</b>, <b>ABCs</b>, fix life threats, <b>vitals</b>, history, exam, then treatment. Glucose on anyone confused. Reassess.</li>
<li>Pick who does the next action by clicking <b>Ricky</b> or <b>Marisol</b>. You work in parallel. Marisol is an EMT: advanced skills are yours once certified.</li>
<li>CPR, bagging and direct pressure keep a rescuer busy until stopped. Doing Ricky's compressions, tap <span class="kbd">Space</span> at 100–120 a minute.</li>
<li>Mistakes (contraindicated drugs, unneeded interventions) are allowed but recorded. Time matters: patients get worse while you work.</li></ul>
<h3>Transport</h3>
<ul><li>Pick the hospital: <b>Mercy</b> has the cath lab, stroke center and labor & delivery; <b>Harbor General</b> is the Level I trauma center; <b>St. Brigid</b> is close but basic.</li>
<li>Radio a <b>STEMI</b>, <b>stroke</b> or <b>trauma alert</b> when it fits. Ride in back to keep treating while Marisol drives, or drive yourself and let her watch the patient.</li>
<li>At the hospital, back into the bay, unload, push the stretcher to the ER doors and give your report. Restock at the rear doors of the rig.</li></ul>
<h3>Gamepad</h3>
<p>RT gas, LT brake, left stick steer or walk, right stick camera, A use, X lights and sirens, Y in/out, B back, LB horn, RB siren tone, D-pad menus, Start pause, View map.</p>
<h3>Touch</h3>
<p>Steer and pedal buttons in the rig; a stick and USE button on foot; IN/OUT, L&S and HORN at the top.</p>
<p class="dim">Ricky Rescue simplifies real protocols to make a game. It isn't medical training.</p>`;
function openPause() { if (G.mode !== 'play') return; UI.show('pause'); }
function showShiftOver() {
  const S = G.shift, K = G.career;
  const res = S.results;
  const g = (x) => res.filter((r) => r.grade === x).length;
  $('#soBody').innerHTML = `<p>${res.length} call${res.length === 1 ? '' : 's'} this shift. Grades: A ${g('A')}, B ${g('B')}, C ${g('C')}, D ${g('D')}, F ${g('F')}.</p>
    <p class="dim">${res.map((r) => `${r.grade} · ${esc(r.C.nature)} (${r.total})`).join('<br>')}</p>
    <p style="color:var(--amber);font-weight:700">Earned ${fmtMoney(S.earnings)} and ${S.xp} XP. Balance ${fmtMoney(K.money)}.</p>`;
  UI.show('shiftOver');
}
bus.on('shiftEnd', () => { if (G.call) return; setTimeout(() => showShiftOver(), 600); });

// ---------- first-time tips ----------
function tip(id, text) { const K = G.career; if (!K || K.tips[id] || !OPTS.tips) return; K.tips[id] = true; setTimeout(() => toast(text, 'good'), 400); }
bus.on('dispatch', () => tip('dispatch', 'A call! Press Enter (or Respond) and follow the blue line. Q toggles lights & sirens.'));
bus.on('arrive', () => tip('arrive', 'On scene. Press F to get out, then grab equipment at the rear doors or go straight to the patient.'));
bus.on('contact', () => tip('contact', 'Start with Gloves & PPE, then the general impression and ABCs. Click Marisol to give her jobs too.'));
bus.on('loaded', () => tip('loaded', 'Choose the hospital that fits the patient and radio ahead with an alert if needed.'));
bus.on('atHospital', () => tip('hospital', 'Push the stretcher to the ER doors under the red EMERGENCY sign and hand off.'));

// ---------- static wiring ----------
function wireUI() {
  for (const b of $$('[data-close]')) b.onclick = () => { UI.hide(b.dataset.close); };
  $('#careX').onclick = () => closeCare();
  for (const w of ['ricky', 'partner']) {
    $('#w-' + w).onclick = (e) => { if (e.target.classList.contains('stop')) return; CARE.who = w; renderCare(); };
    $('#w-' + w + ' .stop').onclick = (e) => { e.stopPropagation(); stopWorker(w); renderCare(); };
  }
  $('#btnRespond').onclick = () => respond();
  $('#lsBtn').onclick = () => setSiren(!RIG.siren);
  $('#tpPartner').onclick = () => { TP.driver = 'partner'; renderTransport(); };
  $('#tpRicky').onclick = () => { TP.driver = 'ricky'; renderTransport(); };
  $('#tpLS').onclick = () => { TP.ls = !TP.ls; renderTransport(); };
  $('#tpGo').onclick = () => confirmTransport();
  $('#rvOk').onclick = () => { UI.hide('review'); backInService(); if (G.shift.over) showShiftOver(); };
  $('#soOk').onclick = () => { UI.hide('shiftOver'); G.shift = null; G.call = null; clearScene(); clearRoute(); showStation(); };
  $('#btnMenu').onclick = () => openPause();
  $('#mapWrap').onclick = () => (HUD.mapBig ? UI.hide('mapBig') : UI.show('mapBig'));
  $('#pResume').onclick = () => UI.hide('pause');
  $('#pOptions').onclick = () => openOptions();
  $('#pHelp').onclick = () => UI.show('help');
  $('#pEnd').onclick = () => { UI.hide('pause'); if (G.call && G.call.stage !== 'done') { G.call.how = 'abandoned'; } G.call = null; clearScene(); clearRoute(); stopAllWork(); closeCare(); if (G.shift) { G.shift.over = true; showShiftOver(); } };
  $('#pQuit').onclick = () => { UI.hide('pause'); saveGame(); G.call = null; G.shift = null; clearScene(); clearRoute(); stopAllWork(); showTitle(); };
  $('#helpBody').innerHTML = HELP_HTML;
  const cpr = $('#cprBtn');
  cpr.addEventListener('pointerdown', (e) => { e.preventDefault(); cprTap(); });
  $('#prompt').addEventListener('click', (e) => { const p = e.target.closest('.pp'); if (p) usePrompt(+p.dataset.i); });
}
