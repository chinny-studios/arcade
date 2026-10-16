// Willow Lane — HUD: household bar, sim panel tabs, clock & speed, notifications, pie menus,
// thought and speech bubbles, floating text, dialogs, and the build/buy catalog

const UI = { tab: 'needs', bubbles: [], pie: null, cat: 'seating', buildTab: 'wall', lastPanel: 0 };

function initUI() {
  $('#speed').addEventListener('click', (e) => { const b = e.target.closest('[data-sp]'); if (b) setSpeed(+b.dataset.sp); });
  $('#modes').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { UI.tab = b.dataset.tab; sfx('click'); renderPanel(); } });
  $('#wallsBtn').addEventListener('click', () => cycleWalls());
  $('#optBtn').addEventListener('click', () => optionsDialog());
  $('#family').addEventListener('click', (e) => { const b = e.target.closest('[data-sim]'); if (b) { const s = simById(+b.dataset.sim); if (s) { if (G.selected === s) focusSim(s); else selectSim(s); } } });
  $('#queue').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b && G.selected) { const a = G.selected.queue[+b.dataset.q]; if (a) { cancelAct(G.selected, a); sfx('click'); } } });
  $('#notes').addEventListener('click', (e) => { const n = e.target.closest('.note'); if (!n) return; const s = simById(+n.dataset.sim); if (s && s.onLot) focusSim(s); n.classList.add('gone'); setTimeout(() => n.remove(), 300); });
  $('#logBtn').addEventListener('click', () => logDialog());
  // don't rebuild the panel under the pointer (a click would land on a replaced button)
  $('#panelBody').addEventListener('pointerenter', () => { UI.panelHover = true; });
  $('#panelBody').addEventListener('pointerleave', () => { UI.panelHover = false; });
  bus.on('queue', (s) => { if (s === G.selected) renderQueue(); });
  bus.on('money', () => renderMoney());
  bus.on('household', () => { renderFamily(); renderPanel(); });
  bus.on('tool', () => renderCatalog());
}

// ---------- selection, speed, modes ----------
function selectSim(s) {
  if (!s || !s.household) return;
  G.selected = s;
  sfx('select');
  renderFamily(); renderPanel(); renderQueue();
}
function focusSim(s) { R.cam.follow = s; R.cam.distT = Math.min(R.cam.distT, 24); }
function setSpeed(v) {
  if (G.mode !== 'live' && v > 0) setMode('live');
  G.userSpeed = v;
  sfx('click');
  renderSpeed();
}
function renderSpeed() { for (const b of $$('#speed [data-sp]')) b.classList.toggle('on', +b.dataset.sp === G.userSpeed || (G.speed === 4 && +b.dataset.sp === 3 && G.userSpeed > 0)); $('#speed').classList.toggle('ultra', G.speed === 4); }
function setMode(m) {
  if (G.state !== 'play' || m === G.mode) return;
  if (m !== 'live' && !household().some((s) => s.household)) return;
  G.mode = m;
  sfx('mode');
  document.body.dataset.mode = m;
  clearGhost(); BUILD.tool = m === 'buy' ? 'hand' : m === 'build' ? 'wall' : null; BUILD.item = null;
  if (m === 'build' && !BUILD.tool) BUILD.tool = 'wall';
  showGrid(m !== 'live');
  closePie();
  for (const b of $$('#modes [data-mode]')) b.classList.toggle('on', b.dataset.mode === m);
  if (m === 'build') { UI.buildTab = 'wall'; setTool('wall'); }
  renderCatalog(); renderPanel();
  updateCutaway(true);
  music.mode(m);
}
function cycleWalls() { G.walls = G.walls === 'up' ? 'cut' : G.walls === 'cut' ? 'down' : 'up'; $('#wallsBtn').dataset.w = G.walls; $('#wallsBtn').title = 'Walls: ' + { up: 'up', cut: 'cutaway', down: 'down' }[G.walls] + ' (V)'; updateCutaway(true); sfx('click'); }

// ---------- top/bottom bar ----------
function renderMoney() { $('#money').textContent = fmtMoney(G.money); }
function renderClock() {
  $('#clock').innerHTML = `<b>${fmtClock()}</b><span>${DAYS[weekday()]} · Day ${dayNum()}</span>`;
}
function renderFamily() {
  const hh = household();
  const sig = hh.map((s) => s.id + (s === G.selected ? '*' : '') + (s.away ? s.away.kind : '') + Math.round(s.mood / 20) + s.age + (s.portrait ? 1 : 0)).join('|');
  if (sig === UI.famSig) return;
  UI.famSig = sig;
  $('#family').innerHTML = hh.map((s) => `<button class="fam${s === G.selected ? ' on' : ''}${s.away ? ' away' : ''}" data-sim="${s.id}" title="${esc(fullName(s))}${s.away ? ' (' + (s.away.kind === 'work' ? 'at work' : 'at school') + ')' : ''}">
    <img src="${simPortrait(s)}" alt=""><i style="background:${cssHex(moodColor(s.mood))}"></i>${s.away ? `<em>${s.away.kind === 'work' ? '💼' : '🏫'}</em>` : ''}</button>`).join('');
}
function renderQueue() {
  const s = G.selected, q = $('#queue');
  if (!s || G.mode !== 'live') { q.innerHTML = ''; return; }
  q.innerHTML = s.queue.map((a, i) => `<button class="qa${a === s.cur ? ' cur' : ''}${a.user ? '' : ' auto'}" data-q="${i}" title="${esc(a.label)} — click to cancel"><span>${a.icon}</span><small>${esc(a.label)}</small></button>`).join('');
}
const bar = (v, cls = '') => `<div class="meter ${cls}"><i style="width:${clamp(v, 0, 100)}%;background:${cssHex(v > 50 ? mixHex(0xe8d040, 0x50d070, (v - 50) / 50) : mixHex(0xe04a30, 0xe8d040, v / 50))}"></i></div>`;
function renderPanel() {
  const s = G.selected, body = $('#panelBody');
  for (const b of $$('#tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === UI.tab);
  if (G.mode !== 'live') return;
  if (!s) { body.innerHTML = ''; $('#who').innerHTML = ''; return; }
  calcMood(s);
  $('#who').innerHTML = `<img src="${simPortrait(s)}" alt=""><div><b>${esc(fullName(s))}</b><span>${AGES[s.age].label} · ${SIGN[s.sign].icon} ${SIGN[s.sign].label}</span><span class="mood" style="color:${cssHex(moodColor(s.mood))}">${moodLabel(s.mood)}</span></div>`;
  let h = '';
  if (UI.tab === 'needs') {
    h = '<div class="needs">' + NEEDS.map((n) => (s.age === 'baby' && (n.id === 'bladder' || n.id === 'comfort' || n.id === 'room') ? '' : `<div class="need"><span>${n.icon} ${n.label}</span>${bar(s.needs[n.id])}</div>`)).join('') + '</div>';
  } else if (UI.tab === 'mood') {
    const ml = s.moodlets.map((m) => { const d = MOODLETS[m.id]; const left = Math.max(0, Math.ceil((m.until - G.t) / 60)); return `<div class="ml ${d.mood > 0 ? 'pos' : 'neg'}" title="${left} h left">${d.icon} ${d.label} <b>${d.mood > 0 ? '+' : ''}${d.mood}</b></div>`; }).join('') || '<div class="dim small">No moodlets right now.</div>';
    h = `<div class="cols"><div><div class="moodbig"><div class="mm"><i style="left:${(s.mood + 100) / 2}%"></i></div><span>${moodLabel(s.mood)}</span></div>${ml}</div>
      <div>${TRAITS.map((t) => `<div class="trait" title="${esc(t.tip)}"><span>${t.lo}</span><div class="pips">${pips(s.pers[t.id])}</div><span>${t.hi}</span></div>`).join('')}
      <div class="ints">${s.interests.map((i) => `<span class="chip">${INTEREST[i].icon} ${INTEREST[i].label}</span>`).join('')}</div>
      ${s.household ? `<button class="mini" id="renameBtn">✏️ Rename</button>` : ''}</div></div>`;
  } else if (UI.tab === 'skills') {
    h = '<div class="skills">' + SKILLS.map((k) => `<div class="skill"><span>${k.icon} ${k.label}</span><div class="pips big">${pips(skillLv(s, k.id), 10, skillProg(s, k.id))}</div><b>${skillLv(s, k.id)}</b></div>`).join('') + '</div>';
  } else if (UI.tab === 'career') {
    if (s.job) {
      const L = careerLevel(s.job), C = CAREER[s.job.track], N = C.levels[s.job.level + 1];
      const req = N ? Object.entries(N[4]).map(([k, v]) => `<span class="${skillLv(s, k) >= v ? 'ok' : 'no'}">${SKILL[k].icon} ${SKILL[k].label} ${skillLv(s, k)}/${v}</span>`).join('') + `<span class="${friendCount(s) >= N[5] ? 'ok' : 'no'}">🤝 Friends ${friendCount(s)}/${N[5]}</span>` : '<span class="ok">Top of the career!</span>';
      h = `<div class="career"><div class="ch">${C.icon} <b>${L.title}</b> <span class="dim">${C.label}, level ${s.job.level + 1}</span></div>
        <div class="row2"><span>💵 ${fmtMoney(L.pay)} a day</span><span>🕘 ${L.start}:00–${(L.start + L.hours) % 24}:00, Mon–Fri</span></div>
        <div class="perf"><span>Performance</span><div class="meter"><i style="width:${(s.job.perf + 100) / 2}%;background:${s.job.perf >= 0 ? '#50d070' : '#e04a30'}"></i></div></div>
        <div class="req">${N ? 'Next: <b>' + N[0] + '</b> (' + fmtMoney(N[1]) + ')' : ''} ${req}</div>
        <button class="mini" id="quitBtn">Quit job</button></div>`;
    } else if (s.school) {
      h = `<div class="career"><div class="ch">🏫 <b>School</b> <span class="dim">Grade ${GRADES[s.school.grade]}</span></div>
        <div class="row2"><span>🚌 Bus at ${SCHOOL.bus}:00, home by ${SCHOOL.start + SCHOOL.hours}:00 on weekdays</span></div>
        <div class="row2"><span>📝 Homework: ${s.school.homework ? '<b class="bad">to do</b> (desk or computer)' : 'done'}</span></div>
        <div class="dim small">Good moods and finished homework raise grades. An A brings a gift from the grandparents.</div></div>`;
    } else if (s.pension) h = `<div class="career"><div class="ch">👴 <b>Retired</b></div><div class="row2"><span>Pension ${fmtMoney(s.pension)} a day</span></div></div>`;
    else if (s.age === 'baby') h = `<div class="career dim">Babies grow up into children in a few days. Feed, change and play with them at the bassinet.</div>`;
    else h = `<div class="career"><div class="ch">💼 <b>Unemployed</b></div><div class="dim">Find a job on the computer or in the job ads at the mailbox.</div><button class="mini" id="adsBtn">Find a job now (newspaper)</button></div>`;
  } else if (UI.tab === 'rels') {
    const list = G.sims.filter((o) => o !== s && o.alive && !o.service && relGet(s, o).met).sort((a, b) => (relGet(s, b).f + relGet(s, b).r) - (relGet(s, a).f + relGet(s, a).r));
    h = '<div class="rels">' + (list.map((o) => { const r = relGet(s, o); return `<div class="rel" data-sim="${o.id}"><img src="${simPortrait(o)}" alt=""><div><b>${esc(o.first)} ${esc(o.last)}</b><span>${relLabel(s, o)}${o.household ? ' · lives here' : ''}</span>
      <div class="rb"><em>🤝</em><div class="meter two"><i style="left:50%;width:${Math.abs(r.f) / 2}%;${r.f < 0 ? 'transform:translateX(-100%);background:#e04a30' : 'background:#50c0f0'}"></i></div></div>
      ${r.r > 0 ? `<div class="rb"><em>💗</em><div class="meter"><i style="width:${r.r}%;background:#f06aa0"></i></div></div>` : ''}</div></div>`; }).join('') || '<div class="dim small">No one yet. Say hello to the neighbours!</div>') + '</div>';
  }
  body.innerHTML = h;
  const q = (id) => body.querySelector(id);
  if (q('#quitBtn')) q('#quitBtn').onclick = () => confirmDialog(`Quit ${s.first}’s job as ${careerLevel(s.job).title}?`, () => quitJob(s));
  if (q('#adsBtn')) q('#adsBtn').onclick = () => jobDialog(s, 3);
  if (q('#renameBtn')) q('#renameBtn').onclick = () => renameDialog(s);
}
function pips(v, n = 10, prog = 0) { let h = ''; for (let i = 0; i < n; i++) h += `<i class="${i < v ? 'on' : i === v && prog > 0 ? 'part' : ''}" ${i === v && prog > 0 ? `style="--p:${Math.round(prog * 100)}%"` : ''}></i>`; return h; }

// ---------- notifications & toasts ----------
function notify(text, icon = 'ℹ️', s = null, big = false) {
  G.log.unshift({ t: G.t, text, icon });
  if (G.log.length > 80) G.log.pop();
  if (G.state !== 'play') return;
  const n = el('div', 'note' + (big ? ' big' : ''), `${s && s.alive !== false && (s.household || s.role === 'townie') ? `<img src="${simPortrait(s)}" alt="">` : `<span class="ni">${icon}</span>`}<div><small>${fmtClock()} · ${DAYS[weekday()].slice(0, 3)}</small>${esc(text)}</div>`);
  if (s) n.dataset.sim = s.id;
  const box = $('#notes');
  box.prepend(n);
  while (box.children.length > 5) box.lastChild.remove();
  setTimeout(() => { n.classList.add('gone'); setTimeout(() => n.remove(), 400); }, big ? 14000 : 9000);
  if (big) sfx('chime');
}
function toast(text) { const t = $('#toast'); t.textContent = text; t.classList.add('show'); clearTimeout(UI.toastT); UI.toastT = setTimeout(() => t.classList.remove('show'), 1800); }
function showTip(ev, text, bad) { const t = $('#tip'); t.textContent = text; t.classList.toggle('bad', !!bad); t.style.left = ev.clientX + 16 + 'px'; t.style.top = ev.clientY + 14 + 'px'; t.hidden = false; }
function hideTip() { $('#tip').hidden = true; }

// ---------- bubbles over heads ----------
function addBubble(s, cls, html, dur, yOff = 0) {
  if (!s || !s.model || G.state !== 'play') return;
  // one thought and one speech bubble per sim
  for (const b of UI.bubbles) if (b.s === s && b.cls === cls && cls !== 'float' && cls !== 'heart') { b.el.innerHTML = html; b.t = dur; b.dur = dur; return; }
  const e = el('div', 'bub ' + cls, html);
  $('#bubbles').appendChild(e);
  UI.bubbles.push({ s, cls, el: e, t: dur, dur, yOff, dx: (Math.random() - 0.5) * 30 });
}
function thought(s, icon, dur = 2.5, text) { if (!s.household && !s.visit) return; addBubble(s, 'think', `<span>${icon}</span>${text ? `<small>${esc(text)}</small>` : ''}`, dur); }
function speech(s, icons, dur = 2) { addBubble(s, 'speak', icons.map((i) => `<span>${i}</span>`).join(''), dur); }
function floatText(s, text, color) { addBubble(s, 'float', `<b style="color:${color}">${esc(text)}</b>`, 2.2, 0.2); }
function hearts(s) { addBubble(s, 'heart', '💗', 1.8, -0.2); }
function floatMoney(n, s) {
  const m = $('#money'); const e = el('span', 'mfloat ' + (n >= 0 ? 'pos' : 'neg'), (n >= 0 ? '+' : '−') + fmtMoney(Math.abs(n)));
  m.parentElement.appendChild(e); setTimeout(() => e.remove(), 1600);
}
function confetti(x, y, z) {
  if (G.state !== 'play') return;
  const p = worldToScreen(x, y, z);
  for (let i = 0; i < 26; i++) {
    const c = el('i', 'conf'); c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
    c.style.background = ['#f05a7a', '#f0c040', '#50c0f0', '#60e080', '#b070f0'][i % 5];
    c.style.setProperty('--dx', (Math.random() - 0.5) * 260 + 'px'); c.style.setProperty('--dy', -60 - Math.random() * 160 + 'px'); c.style.setProperty('--r', Math.random() * 720 + 'deg');
    $('#bubbles').appendChild(c); setTimeout(() => c.remove(), 1600);
  }
}
function updateBubbles(dtReal) {
  for (let i = UI.bubbles.length - 1; i >= 0; i--) {
    const b = UI.bubbles[i];
    b.t -= dtReal;
    const s = b.s;
    if (b.t <= 0 || !s.model || !s.model.visible) { b.el.remove(); UI.bubbles.splice(i, 1); continue; }
    const hgt = (s.model.userData.height || 1.7) + (s.posture === 'lie' ? -1.1 : s.posture === 'sit' ? -0.45 : 0);
    const k = 1 - b.t / b.dur;
    const rise = b.cls === 'float' || b.cls === 'heart' ? k * 0.8 : 0;
    const p = worldToScreen(s.x, (s.y || 0) + hgt + 0.35 + b.yOff + rise, s.z);
    b.el.style.transform = `translate(${p.x + (b.cls === 'heart' ? b.dx : 0)}px, ${p.y}px)`;
    b.el.style.opacity = !p.vis ? 0 : b.cls === 'float' || b.cls === 'heart' ? 1 - k * k : Math.min(1, b.t * 3, (b.dur - b.t) * 6 + 0.2);
  }
}

// ---------- pie menu ----------
function openPie(ev, entries, title, portrait) {
  closePie();
  if (!entries.length) return;
  const pie = el('div', 'pie');
  pie.style.left = ev.clientX + 'px'; pie.style.top = ev.clientY + 'px';
  const center = el('div', 'pc', portrait ? `<img src="${portrait}" alt="">` : '');
  center.title = title || '';
  pie.appendChild(center);
  const cap = el('div', 'pt', esc(title || '')); pie.appendChild(cap);
  layoutPie(pie, entries, 0);
  $('#app').appendChild(pie);
  UI.pie = pie;
  sfx('pie');
  // keep on screen
  const r = pie.getBoundingClientRect();
  const dx = Math.max(0, 150 - ev.clientX) - Math.max(0, ev.clientX + 150 - window.innerWidth), dy = Math.max(0, 130 - ev.clientY) - Math.max(0, ev.clientY + 150 - window.innerHeight);
  pie.style.left = ev.clientX + dx + 'px'; pie.style.top = ev.clientY + dy + 'px';
}
function layoutPie(pie, entries, level) {
  for (const b of [...pie.querySelectorAll('.pi')]) b.remove();
  const n = entries.length;
  const rad = n <= 4 ? 82 : n <= 7 ? 100 : n <= 10 ? 122 : 140;
  entries.forEach((e, i) => {
    const a = -Math.PI / 2 + (i / n) * TAU;
    const b = el('button', 'pi' + (e.disabled ? ' dis' : '') + (e.sub ? ' sub' : ''), `<span>${e.icon || ''}</span>${esc(e.label)}${e.disabled ? `<small>${esc(e.disabled)}</small>` : ''}`);
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.82;
    b.style.transform = `translate(calc(${x}px - ${x < -20 ? 100 : x > 20 ? 0 : 50}%), calc(${y}px - 50%))`;
    b.style.animationDelay = i * 0.015 + 's';
    b.onclick = (ev) => {
      ev.stopPropagation();
      if (e.disabled) { sfx('error'); return; }
      if (e.sub) { layoutPie(pie, e.sub.concat([{ label: 'Back', icon: '↩', back: true, run: () => layoutPie(pie, entries, level) }]), level + 1); sfx('pie'); return; }
      if (e.back) { e.run(); return; }
      closePie(); sfx('click'); e.run();
    };
    pie.appendChild(b);
  });
}
function closePie() { if (UI.pie) { UI.pie.remove(); UI.pie = null; } }

// Build the pie menu for something the player clicked in live mode
function pieFor(ev, pick) {
  const s = G.selected;
  if (!s) return;
  if (s.away) { if (pick.type === 'sim' && pick.sim.household && !pick.sim.away) selectSim(pick.sim); else toast(`${s.first} is ${s.away.kind === 'work' ? 'at work' : 'at school'}`); return; }
  if (s.age === 'baby' && !(pick.type === 'sim' && pick.sim.household)) { toast('Babies can’t do much yet — pick someone else'); return; }
  if (pick.type === 'sim') {
    const t = pick.sim;
    if (t.household && t !== s && t.age !== 'baby') {
      // household sims: select, or interact via the menu
      const entries = socialEntries(s, t);
      entries.unshift({ label: 'Select ' + t.first, icon: '👆', run: () => selectSim(t) });
      openPie(ev, entries, fullName(t), simPortrait(t));
      return;
    }
    if (t === s) { openPie(ev, selfEntries(s), fullName(s), simPortrait(s)); return; }
    if (t.age === 'baby') { const crib = objById(t.crib); if (crib) pieFor(ev, { type: 'obj', obj: crib }); return; }
    if (t.service) {
      const e = [];
      if (t.service === 'pizza') e.push(ixEntry(s, 'payPizza', t));
      openPie(ev, e.filter(Boolean), t.first, null);
      return;
    }
    openPie(ev, socialEntries(s, t), fullName(t) + ' · ' + relLabel(s, t), simPortrait(t));
    return;
  }
  if (pick.type === 'obj') {
    const o = pick.obj, entries = [];
    for (const id of o.def.acts) {
      const def = IX[id]; if (!def) continue;
      if (def.menu) {
        const sub = def.menu(s, o).map((m) => ixEntry(s, id, o, m.arg, m.label)).filter(Boolean);
        if (sub.length) entries.push({ label: ixLabel(def, s, o, null).replace(/ …|…/, '').replace(/ with $/, '') + '…', icon: def.icon, sub });
        continue;
      }
      const e = ixEntry(s, id, o); if (e) entries.push(e);
    }
    let title = o.def.name;
    if (o.broken) title += ' (broken)'; else if (o.def.plant && o.dead) title += ' (dead)';
    if (o.memorial) title = 'In memory of ' + o.memorial;
    if (o.type === 'crib') { const b = babyIn(o); if (b) title = b.first + ' · ' + moodLabel(calcMood(b)); }
    if (!entries.length) { toast(s.first + ' can’t do anything with the ' + o.def.name.toLowerCase()); return; }
    openPie(ev, entries, title, null);
    return;
  }
  if (pick.type === 'item') {
    const it = pick.item, entries = [];
    for (const id of ITEM_IX[it.kind] || []) { const def = IX[id]; if (!def) continue; if (def.menu) { const sub = def.menu(s, it).map((m) => ixEntry(s, id, it, m.arg, m.label)).filter(Boolean); entries.push(...sub); continue; } const e = ixEntry(s, id, it); if (e) entries.push(e); }
    openPie(ev, entries, { meal: 'Home-cooked meal', plate: 'Plate', pizza: 'Pizza', puddle: 'Puddle', fire: 'Fire!', cake: 'Birthday cake', trashbag: 'Trash' }[it.kind] || it.kind, null);
  }
}
function ixEntry(s, id, target, arg, label) {
  const def = IX[id];
  const t = def.test ? def.test(s, target, arg) : true;
  if (t === false) return null;
  return { label: label || ixLabel(def, s, target, arg), icon: def.icon, disabled: t === true ? null : t, run: () => queueAct(s, id, target, arg, true) };
}
function socialEntries(s, t) {
  if (s.age === 'baby') return [];
  const items = socialMenu(s, t);
  const out = [];
  for (const cat of SOCIAL_CATS) {
    const sub = items.filter((x) => x.cat === cat).map((x) => ({ label: x.label, icon: x.icon, disabled: x.disabled, run: () => queueAct(s, 'social', t, x.id, true) }));
    if (!sub.length) continue;
    if (cat === 'Visitors' || sub.length === 1) out.push(...sub);
    else out.push({ label: cat, icon: { Talk: '💬', Friendly: '🤗', Romance: '💗', Mean: '😠' }[cat], sub, disabled: sub.every((x) => x.disabled) ? sub[0].disabled : null });
  }
  if (t.service === 'pizza') { const e = ixEntry(s, 'payPizza', t); if (e) out.unshift(e); }
  return out;
}
function selfEntries(s) {
  const e = [];
  if (s.age !== 'baby') {
    e.push({ label: 'Daydream', icon: '💭', run: () => queueAct(s, 'daydream', null, null, true) });
    e.push({ label: 'Dance', icon: '🕺', run: () => queueAct(s, 'danceAlone', null, null, true) });
    if (s.job) e.push({ label: 'Call in sick', icon: '🤒', disabled: s.job.sickDay === dayNum() ? 'Already called in' : isWeekend() ? 'Day off' : null, run: () => { s.job.sickDay = dayNum(); s.job.carDay = dayNum(); s.job.perf -= 8; notify(`${s.first} called in sick today.`, '🤒', s); } });
  }
  return e;
}
IX.daydream = { label: 'Daydream', icon: '💭', run: function* (s, _, act) { yield* useLoop(s, act, { anim: 'idle', max: 20, rates: { fun: 8 }, every: (dt) => { if (chance(dt * 0.1)) thought(s, rpick(['🏝️', '🍰', '🚀', '💰', '❤️']), 2); } }); } };
IX.danceAlone = { label: 'Dance', icon: '🕺', run: function* (s, _, act) { yield* useLoop(s, act, { anim: 'dance', max: 30, rates: { fun: 18, energy: -4 }, skill: 'body', skillRate: 0.2 }); } };

// ---------- dialogs ----------
function dialog(html, opts = {}) {
  const d = $('#dialog');
  d.innerHTML = `<div class="dlg${opts.wide ? ' wide' : ''}">${html}</div>`;
  d.hidden = false;
  UI.dialogPrev = G.userSpeed;
  if (G.state === 'play' && !opts.keepTime) { G.userSpeed = 0; renderSpeed(); }
  sfx('open');
  return d.firstChild;
}
function closeDialog() { const d = $('#dialog'); d.hidden = true; d.innerHTML = ''; if (G.state === 'play' && UI.dialogPrev != null) { G.userSpeed = UI.dialogPrev; UI.dialogPrev = null; renderSpeed(); } }
function confirmDialog(text, yes) {
  const d = dialog(`<p>${esc(text)}</p><div class="btns"><button class="btn" id="dNo">Cancel</button><button class="btn pri" id="dYes">OK</button></div>`);
  d.querySelector('#dNo').onclick = closeDialog; d.querySelector('#dYes').onclick = () => { closeDialog(); yes(); };
}
function jobDialog(s, n) {
  const tracks = rshuffle(CAREERS.slice()).slice(0, n);
  const d = dialog(`<h2>Job offers for ${esc(s.first)}</h2><div class="jobs">${tracks.map((c) => { const L = c.levels[0]; return `<button class="job" data-t="${c.id}"><span>${c.icon}</span><b>${L[0]}</b><small>${c.label} · ${fmtMoney(L[1])}/day · ${L[2]}:00–${(L[2] + L[3]) % 24}:00</small></button>`; }).join('')}</div>
    ${s.job ? `<p class="dim small">Taking a new job means leaving ${their(s)} job as ${careerLevel(s.job).title}.</p>` : ''}<div class="btns"><button class="btn" id="dNo">Not now</button></div>`);
  d.querySelector('#dNo').onclick = closeDialog;
  for (const b of d.querySelectorAll('.job')) b.onclick = () => { closeDialog(); takeJob(s, b.dataset.t); sfx('fanfare'); };
}
function renameDialog(s) {
  const d = dialog(`<h2>Rename</h2><div class="frm"><label>First name <input id="rnF" value="${esc(s.first)}" maxlength="16"></label><label>Last name <input id="rnL" value="${esc(s.last)}" maxlength="18"></label></div><div class="btns"><button class="btn" id="dNo">Cancel</button><button class="btn pri" id="dYes">Save</button></div>`);
  d.querySelector('#dNo').onclick = closeDialog;
  d.querySelector('#dYes').onclick = () => { s.first = d.querySelector('#rnF').value.trim() || s.first; s.last = d.querySelector('#rnL').value.trim() || s.last; closeDialog(); renderPanel(); renderFamily(); };
}
function logDialog() {
  const d = dialog(`<h2>Recent events</h2><div class="log">${G.log.slice(0, 60).map((l) => `<div><span>${l.icon}</span><small>Day ${dayNum(l.t)} ${fmtClock(l.t)}</small> ${esc(l.text)}</div>`).join('') || '<p class="dim">Nothing yet.</p>'}</div><div class="btns"><button class="btn pri" id="dNo">Close</button></div>`, { wide: true });
  d.querySelector('#dNo').onclick = closeDialog;
}
function optionsDialog() {
  const O = G.options;
  const tg = (k, label) => `<label class="tg"><input type="checkbox" data-k="${k}" ${O[k] ? 'checked' : ''}><span>${label}</span></label>`;
  const d = dialog(`<h2>Options</h2>
    <div class="opts">${tg('freeWill', 'Free will (sims look after themselves)')}${tg('aging', 'Aging (birthdays and old age)')}
    <label class="tg sel"><span>Lifespan</span><select id="oLife">${['short', 'normal', 'long'].map((v) => `<option ${O.lifespan === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    ${tg('sound', 'Sound effects')}${tg('voices', 'Sim voices')}${tg('music', 'Music')}${tg('edgePan', 'Pan when the mouse touches the screen edge')}</div>
    <div class="keys"><b>Controls</b> Click a sim or object for actions · Click the ground to walk · Right-drag or Q/E to rotate · Wheel or Z/X to zoom · WASD/arrows to pan · Space pause · 1 2 3 speed · F1 F2 F3 live/buy/build · V walls · Tab next sim · C centre camera · R rotate (buy mode) · Ctrl+Z undo</div>
    <div class="btns"><button class="btn" id="oSave">💾 Save</button><button class="btn" id="oQuit">Main menu</button><button class="btn pri" id="dNo">Close</button></div>`, { wide: true });
  for (const c of d.querySelectorAll('input[data-k]')) c.onchange = () => { O[c.dataset.k] = c.checked; if (c.dataset.k === 'music') music.enable(c.checked); };
  d.querySelector('#oLife').onchange = (e) => { O.lifespan = e.target.value; };
  d.querySelector('#dNo').onclick = closeDialog;
  d.querySelector('#oSave').onclick = () => { saveGame(); toast('Game saved'); };
  d.querySelector('#oQuit').onclick = () => { closeDialog(); confirmDialog('Save and go back to the main menu?', () => { saveGame(true); toMenu(); }); };
}
function gameOver() {
  G.state = 'over';
  const d = dialog(`<h2>The end of the ${esc(G.family)} story</h2><p>Everyone in the household has gone. Their memorial stands on Willow Lane.</p><p class="dim">Births: ${G.stats.births} · Weddings: ${G.stats.weddings} · Promotions: ${G.stats.promotions}</p><div class="btns"><button class="btn pri" id="dNo">Start a new family</button></div>`);
  d.querySelector('#dNo').onclick = () => { closeDialog(); deleteSave(); toMenu(); };
}

// ---------- build & buy catalog ----------
function renderCatalog() {
  const box = $('#catalog');
  if (G.mode === 'live') { box.innerHTML = ''; return; }
  if (G.mode === 'buy') {
    const tabs = CATS.map((c) => `<button class="ct${UI.cat === c.id ? ' on' : ''}" data-cat="${c.id}" title="${c.label}">${c.icon}</button>`).join('');
    const items = CATALOG.filter((c) => c.cat === UI.cat && !c.hidden && !c.fixed);
    box.innerHTML = `<div class="ctabs">${tabs}<span class="ctl">${CATS.find((c) => c.id === UI.cat).label}</span><span class="sp"></span><button class="mini" id="sellBtn" title="Sell the object you're holding or pointing at (Del)">💲 Sell</button><button class="mini" id="undoBtn" title="Undo (Ctrl+Z)">↶</button><button class="mini" id="redoBtn" title="Redo">↷</button></div>
      <div class="items">${items.map((c) => `<button class="item${BUILD.item === c.id && !BUILD.moving ? ' on' : ''}${c.price > G.money ? ' poor' : ''}" data-item="${c.id}"><img src="${objectThumb(c.id)}" alt=""><b>${fmtMoney(c.price)}</b></button>`).join('')}</div>
      <div class="desc" id="desc">${BUILD.moving ? 'Moving <b>' + esc(BUILD.moving.def.name) + '</b>: click to put it down, R to rotate, Del to sell, Esc to cancel.' : 'Pick something to buy. Click objects on the lot to move them.'}</div>`;
    for (const b of box.querySelectorAll('[data-cat]')) b.onclick = () => { UI.cat = b.dataset.cat; sfx('click'); renderCatalog(); };
    for (const b of box.querySelectorAll('[data-item]')) {
      b.onclick = () => { sfx('click'); setTool('place', null, b.dataset.item); renderCatalog(); };
      b.onmouseenter = () => { const c = CAT[b.dataset.item]; $('#desc').innerHTML = `<b>${esc(c.name)}</b> · ${fmtMoney(c.price)} · ${c.w}×${c.d}<br>${esc(c.desc)}<div class="stats">${Object.entries(c.stats).filter(([, v]) => v).map(([k, v]) => `<span>${k === 'room' ? '🖼️ Room' : NEED[k] ? NEED[k].icon + ' ' + NEED[k].label : k} ${'●'.repeat(Math.min(10, v))}</span>`).join('')}</div>`; };
    }
  } else {
    const tools = [['wall', '🧱', 'Walls'], ['erase', '🪓', 'Remove walls'], ['door', '🚪', 'Doors'], ['window', '🪟', 'Windows'], ['floor', '🟫', 'Floors'], ['paper', '🖌️', 'Wallpaper']];
    const tabs = tools.map(([id, ic, lb]) => `<button class="ct${BUILD.tool === id ? ' on' : ''}" data-tool="${id}" title="${lb}">${ic}</button>`).join('');
    let items = '';
    if (BUILD.tool === 'door') items = DOORS.map((d) => `<button class="item sw${BUILD.style === d.id ? ' on' : ''}" data-style="${d.id}"><span class="big">${d.arch ? '⛩️' : d.glass ? '🪟' : '🚪'}</span><small>${esc(d.name)}</small><b>${fmtMoney(d.price)}</b></button>`).join('');
    if (BUILD.tool === 'window') items = WINDOWS.map((d) => `<button class="item sw${BUILD.style === d.id ? ' on' : ''}" data-style="${d.id}"><span class="big">${d.round ? '⭕' : '🪟'}</span><small>${esc(d.name)}</small><b>${fmtMoney(d.price)}</b></button>`).join('');
    if (BUILD.tool === 'floor') items = `<button class="item sw${BUILD.style === 0 ? ' on' : ''}" data-style="0"><span class="big">🌱</span><small>Remove floor</small><b>$0</b></button>` + FLOORS.map((f) => `<button class="item sw${BUILD.style === f.id ? ' on' : ''}" data-style="${f.id}"><img src="${f.thumb}" alt=""><small>${esc(f.name)}</small><b>${fmtMoney(f.price)}</b></button>`).join('');
    if (BUILD.tool === 'paper') items = PAPERS.map((p) => `<button class="item sw${BUILD.style === p.id ? ' on' : ''}" data-style="${p.id}"><img src="${p.thumb}" alt="" class="tall"><small>${esc(p.name)}</small><b>${fmtMoney(p.price)}</b></button>`).join('');
    const help = { wall: `Drag along the grid to build walls (${fmtMoney(WALL_PRICE)} per tile).`, erase: 'Drag along walls to remove them for a refund.', door: 'Click a wall to put a door in it.', window: 'Click a wall to put a window in it.', floor: 'Drag a rectangle to lay floor tiles.', paper: 'Click a wall to paper it. Hold Shift to paper the whole room.' }[BUILD.tool] || '';
    box.innerHTML = `<div class="ctabs">${tabs}<span class="ctl">${(tools.find((t) => t[0] === BUILD.tool) || ['', '', ''])[2]}</span><span class="sp"></span><button class="mini" id="undoBtn" title="Undo (Ctrl+Z)">↶</button><button class="mini" id="redoBtn" title="Redo">↷</button></div>
      <div class="items">${items || `<div class="help">${help}</div>`}</div><div class="desc">${items ? help : ''}</div>`;
    for (const b of box.querySelectorAll('[data-tool]')) b.onclick = () => {
      const t = b.dataset.tool; sfx('click');
      const st = t === 'floor' ? (BUILD.lastFloor || 1) : t === 'paper' ? (BUILD.lastPaper || 1) : 1;
      setTool(t, st);
    };
    for (const b of box.querySelectorAll('[data-style]')) b.onclick = () => { BUILD.style = +b.dataset.style; if (BUILD.tool === 'floor') BUILD.lastFloor = BUILD.style; if (BUILD.tool === 'paper') BUILD.lastPaper = BUILD.style; sfx('click'); renderCatalog(); };
  }
  const q = (id) => box.querySelector(id);
  if (q('#undoBtn')) q('#undoBtn').onclick = () => undoBuild();
  if (q('#redoBtn')) q('#redoBtn').onclick = () => redoBuild();
  if (q('#sellBtn')) q('#sellBtn').onclick = () => sellHeld();
}

// ---------- per-frame HUD refresh ----------
function updateHUD(dtReal) {
  renderClock();
  UI.lastPanel += dtReal;
  if (UI.lastPanel > 0.5) { UI.lastPanel = 0; if (G.mode === 'live' && (!UI.panelHover || UI.tab === 'needs')) { renderPanel(); } renderFamily(); renderQueue(); }
  updateBubbles(dtReal);
  // the mood gem over the selected sim
  const s = G.selected;
  if (R.gem) {
    R.gem.visible = !!(s && s.model && s.model.visible && G.mode === 'live');
    if (R.gem.visible) {
      const h = (s.model.userData.height || 1.7) + (s.posture === 'lie' ? -1.0 : s.posture === 'sit' ? -0.42 : 0);
      R.gem.position.set(s.x, (s.y || 0) + h + 0.42 + Math.sin(performance.now() / 500) * 0.04, s.z);
      R.gem.rotation.y += dtReal * 1.6;
      const c = moodColor(s.mood); R.gem.material.color.setHex(c); R.gem.material.emissive.setHex(c);
    }
  }
}
