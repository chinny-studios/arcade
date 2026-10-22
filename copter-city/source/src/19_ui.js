// Copter City — menus: title, career map, free flight setup, the hangar, pause, options, controls, notices and the
// big map. Panels are DOM; a gamepad moves focus with the D-pad and A presses.

const UI = (() => {
  const stack = [];
  const MODAL = ['hangar', 'pause', 'options', 'help', 'notice', 'mapBig', 'career', 'free'];
  function show(id) { const e = $('#' + id); if (!e) return; e.hidden = false; if (!stack.includes(id)) stack.push(id); focusFirst(e); if (id === 'mapBig') drawBigMap(); }
  function hide(id) { const e = $('#' + id); if (e) e.hidden = true; const i = stack.indexOf(id); if (i >= 0) stack.splice(i, 1); if (id === 'notice' && UI.onNotice) { const f = UI.onNotice; UI.onNotice = null; f(); } }
  const isOpen = (id) => stack.includes(id);
  const top = () => stack[stack.length - 1];
  const paused = () => stack.some((id) => MODAL.includes(id) && id !== 'mapBig') || (isOpen('mapBig') && G.mapPause);
  function focusFirst(e) { const b = e.querySelector('button:not([disabled]), select'); if (b && Input.mode === 'pad') b.focus(); }
  function update() {
    const t = top(); if (!t) return;
    const nav = Input.navPad(); const panel = $('#' + t);
    const items = $$('button:not([disabled]), select', panel).filter((b) => b.offsetParent !== null);
    if (!items.length) return;
    let i = items.indexOf(document.activeElement);
    if (nav.down || nav.right) { i = (i + 1) % items.length; items[i].focus(); }
    if (nav.up || nav.left) { i = (i - 1 + items.length) % items.length; items[i].focus(); }
    if (nav.ok && i >= 0) { const it = items[i]; if (it.tagName === 'SELECT') { it.selectedIndex = (it.selectedIndex + 1) % it.options.length; it.dispatchEvent(new Event('change')); } else it.click(); }
    if (nav.back) back();
  }
  function back() {
    const t = top();
    if (!t) return;
    if (t === 'notice') hide('notice');
    else if (['options', 'help'].includes(t)) { hide(t); }
    else if (t === 'career' || t === 'free') { hide(t); }
    else if (t === 'hangar') leaveHangar();
    else if (t === 'mapBig') hide('mapBig');
    else if (t === 'pause') hide('pause');
  }
  function notice(title, html, onOk) {
    $('#noticeTitle').textContent = title; $('#noticeBody').innerHTML = html;
    UI.onNotice = onOk || null;
    show('notice');
  }
  return { show, hide, isOpen, top, paused, update, back, notice, stack };
})();

function setState(s) { document.body.dataset.state = s; }

// ---------- title ----------
function showTitle() {
  setState('title');
  for (const id of UI.stack.slice()) UI.hide(id);
  $('#title').hidden = false;
  $('#btnContinue').hidden = !hasSave();
  const car = loadCareer();
  $('#btnContinue').textContent = car ? `Continue career (${cityDef(car.city).name}, ${fmtMoney(car.money)})` : 'Continue career';
  if (!G.city) { buildCity(cityDef('dover')); initTraffic(); buildMapImage(); G.city = null; G.titleCity = true; }
}
function wireUI() {
  const on = (id, f) => { const e = $('#' + id); if (e) e.addEventListener('click', (ev) => { AUDIO.init(); AUDIO.sfx('click'); f(ev); }); };
  on('btnContinue', () => { G.career = loadCareer(); if (!G.career) return; openCareerMap(); });
  on('btnNew', () => {
    if (hasSave() && !confirm('Start a new career? Your saved career will be replaced.')) return;
    G.career = newCareer(); G.noSave = false; saveGame(); openCareerMap();
  });
  on('btnFree', openFree);
  on('btnOptions', () => { fillOptions(); UI.show('options'); });
  on('btnHelp', () => UI.show('help'));
  on('optClose', () => { UI.hide('options'); });
  on('helpClose', () => UI.hide('help'));
  on('noticeOk', () => UI.hide('notice'));
  on('careerBack', () => UI.hide('career'));
  on('freeBack', () => UI.hide('free'));
  on('freeGo', () => {
    const city = $('#freeCity').value, heli = $('#freeHeli').value, hour = +$('#freeHour').value, calls = $('#freeCalls').value === 'on';
    UI.hide('free'); $('#title').hidden = true;
    startCity({ city, heli, free: true, hour, dispatch: calls });
  });
  on('pResume', () => UI.hide('pause'));
  on('pOptions', () => { fillOptions(); UI.show('options'); });
  on('pHelp', () => UI.show('help'));
  on('pMap', () => { UI.hide('pause'); UI.show('mapBig'); });
  on('pQuit', () => { saveGame(); UI.hide('pause'); leaveCity(); showTitle(); });
  on('mapClose', () => UI.hide('mapBig'));
  on('hLeave', leaveHangar);
  for (const b of $$('[data-htab]')) b.addEventListener('click', () => { AUDIO.sfx('click'); hangarTab(b.dataset.htab); });
  $('#options').addEventListener('change', readOptions);
  $('#options').addEventListener('input', readOptions);
  $('#hud-pause').addEventListener('click', () => { if (!UI.paused()) UI.show('pause'); });
}

// ---------- career map ----------
function openCareerMap() {
  const car = G.career, box = $('#cityList');
  box.innerHTML = '';
  $('#careerHead').innerHTML = `<b>${rankOf(car)}</b> · ${fmtMoney(car.money)} · ${car.stats.done} calls answered · ${car.owned.length} helicopter${car.owned.length > 1 ? 's' : ''}`;
  CITIES.forEach((def, i) => {
    const cs = car.cities[def.id];
    const row = el('div', 'city' + (cs.unlocked ? '' : ' locked') + (car.city === def.id ? ' cur' : ''));
    row.innerHTML = `<div class="cn">${i + 1}. ${def.name}${cs.passed ? ' <span class="ok">★ goal met</span>' : ''}</div>
      <div class="cb">${cs.unlocked ? esc(def.blurb) : 'Locked. Meet the goal in ' + CITIES[i - 1].name + ' to get a job offer here.'}</div>
      <div class="cg">Goal: answer ${def.goal} calls · ${cs.done} done · earned ${fmtMoney(cs.earned)} · tokens ${(cs.tokens || []).length}/12 · calls: ${def.calls.map((t) => CALL[t].tag).join(' ')}</div>`;
    if (cs.unlocked) {
      const b = el('button', 'btn', car.city === def.id ? 'Fly' : 'Move here');
      b.addEventListener('click', () => { AUDIO.sfx('click'); car.city = def.id; UI.hide('career'); $('#title').hidden = true; startCity({ city: def.id, heli: car.heli, free: false }); });
      row.appendChild(b);
    }
    box.appendChild(row);
  });
  UI.show('career');
}

// ---------- free flight ----------
function openFree() {
  const car = loadCareer();
  const cs = $('#freeCity'); cs.innerHTML = '';
  for (const def of CITIES) if (DEBUG || def.id === 'dover' || (car && car.cities[def.id].unlocked)) cs.appendChild(new Option(def.name, def.id));
  const hs = $('#freeHeli'); hs.innerHTML = '';
  for (const id of HELI_ORDER) hs.appendChild(new Option(`${HELIS[id].name} (${HELIS[id].role})`, id));
  $('#freeNote').textContent = car ? 'Cities you have unlocked in your career are open. Every helicopter is free to fly.' : 'Unlock more cities in the career. Every helicopter is free to fly.';
  UI.show('free');
}

// ---------- starting and leaving a city ----------
function startCity(o) {
  const def = cityDef(o.city);
  G.free = !!o.free; G.mode = G.free ? 'free' : 'career';
  if (G.free) { G.career = G.career || newCareer(); }
  G.dispatch = o.dispatch !== false;
  G.titleCity = false;
  clearFires(); clearFX();
  buildCity(def); initTraffic(); initCalls(); buildMapImage();
  G.city = def; G.t = 0; G.stats = { done: 0, failed: 0, earned: 0 };
  const car = G.career;
  G.hour = o.hour !== undefined ? o.hour : (!G.free && car && car.hour !== null && car.city === def.id ? car.hour : def.hour);
  setTimeOfDay(G.hour, true);
  // tokens you've already found stay found
  if (!G.free && car) for (const t of CITY.tokens) if ((car.cities[def.id].tokens || []).includes(t.i)) { t.got = true; t.mesh.visible = false; }
  const home = CITY.home;
  const s = (!G.free && car && car.hstate[o.heli]) || {};
  HELI.fuel = s.fuel || 0; HELI.hp = s.hp || 0; HELI.gas = s.gas !== undefined ? s.gas : 999;
  if (G.free) { HELI.fuel = 0; HELI.hp = 0; HELI.gas = 999; }
  HELI.seats = [];
  spawnHeli(o.heli || 'sparrow', home.x, home.y, home.z, Math.PI);
  initPilot();
  G.where = 'heli'; document.body.dataset.where = 'heli';
  CAM.mode = CAM.mode || 'chase'; CAM.snap = true; CAM.yaw = 0;
  setState('play');
  $('#title').hidden = true;
  if (!G.free && car) { car.city = def.id; saveGame(); }
  G.nextCallT = 14;
  if (!o.quiet) {
    const first = !G.free && car && !car.introDone;
    if (first) { car.introDone = true; saveGame(); }
    UI.notice(def.name, `<p>${esc(def.blurb)}</p>${G.free ? '<p><b>Free flight.</b> Fuel and repairs are on the house.</p>' : `<p><b>Goal:</b> answer ${def.goal} calls to earn a promotion. Dispatch will radio them in; follow the coloured beam.</p>`}${first ? '<p>New to flying? <b>W/S</b> forward and back, <b>A/D</b> turn, <b>Space</b> climb, <b>Shift</b> descend, <b>Q/E</b> strafe. <b>1</b>–<b>5</b> pick equipment and <b>F</b> uses it. Land on the yellow pad and press <b>Enter</b> for the hangar. Press <b>F1</b> for all controls.</p>' : ''}`);
  }
  MUSIC.setStation(OPTS.station);
  bus.emit('cityStart', def);
}
function leaveCity() {
  saveGame();
  for (const c of G.calls.slice()) cleanupCall(c);
  G.calls = []; G.city = null; AUDIO.siren(false);
  if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* */ }
}

// ---------- the hangar ----------
function openHangar() {
  if (!HELI.landed || !HELI.pad || HELI.pad.kind !== 'home') { toast('Land on the yellow pad at the hangar first.'); return; }
  HELI.engine = false;
  hangarTab('service');
  UI.show('hangar');
  AUDIO.sfx('door');
}
function leaveHangar() { UI.hide('hangar'); saveGame(); }
function hangarTab(tab) {
  for (const b of $$('[data-htab]')) b.classList.toggle('on', b.dataset.htab === tab);
  const box = $('#hBody'), H = HELI, car = G.career;
  $('#hMoney').textContent = G.free ? 'Free flight: everything is on the house' : fmtMoney(car.money);
  box.innerHTML = '';
  const row = (html, btn, f, dis) => { const r = el('div', 'hrow', `<div>${html}</div>`); if (btn) { const b = el('button', 'btn', btn); b.disabled = !!dis; b.addEventListener('click', () => { AUDIO.sfx('click'); f(); hangarTab(tab); }); r.appendChild(b); } box.appendChild(r); return r; };
  if (tab === 'service') {
    const q = hangarQuote();
    row(`<b>Fuel</b> ${Math.round(H.fuel)} / ${Math.round(H.st.fuel)} L`, q.fuel > 1 ? `Refuel ${fmtMoney(q.fuelCost)}` : 'Full', () => buyService('fuel'), q.fuel <= 1);
    row(`<b>Hull</b> ${Math.round(H.hp)} / ${Math.round(H.st.hp)}`, q.hp > 1 ? `Repair ${fmtMoney(q.hpCost)}` : 'No damage', () => buyService('repair'), q.hp <= 1);
    if (H.st.gas) row(`<b>Tear gas</b> ${H.gas} / ${H.st.gas}`, q.gas ? `Restock ${fmtMoney(q.gasCost)}` : 'Full', () => buyService('gas'), !q.gas);
    if (q.fuel > 1 || q.hp > 1 || q.gas) row('<b>Everything</b>', `All for ${fmtMoney(q.fuelCost + q.hpCost + q.gasCost)}`, () => { buyService('fuel'); buyService('repair'); if (H.st.gas) buyService('gas'); });
    row(`<span class="dim">${esc(H.st.desc)}</span>`);
  } else if (tab === 'helis') {
    for (const id of HELI_ORDER) {
      const h = HELIS[id], own = G.free || car.owned.includes(id), cur = H.type === id;
      row(`<b>${h.name}</b> <span class="dim">${h.role}</span><br><span class="dim small">Speed ${Math.round(h.speed * 3.6)} km/h · hull ${h.hp} · fuel ${h.fuel} L · seats ${h.seats}${h.bucket ? ' · bucket ' + h.bucket + ' L' : ''}${h.gas ? ' · gas ×' + h.gas : ''}<br>${h.equip.map((e) => EQUIP[e].name).join(', ')}</span>`,
        cur ? 'Flying' : own ? 'Fly this' : `Buy ${fmtMoney(h.price)}`, () => { if (G.free) { switchHeli(id); } else buyHeli(id); }, cur || (!own && car.money < h.price));
    }
  } else if (tab === 'ups') {
    const ups = G.free ? {} : (car.ups[H.type] || {});
    for (const [k, u] of Object.entries(UPGRADES)) {
      if (u.needs && !H.st.equip.includes(u.needs)) continue;
      const lvl = ups[k] || 0, cost = lvl < 3 ? upCost(H.type, k, lvl) : 0;
      row(`<b>${u.name}</b> ${'■'.repeat(lvl)}${'□'.repeat(3 - lvl)}<br><span class="dim small">${u.desc}</span>`, lvl >= 3 ? 'Maxed' : `Upgrade ${fmtMoney(cost)}`, () => buyUpgrade(k), G.free || lvl >= 3 || car.money < cost);
    }
    if (G.free) row('<span class="dim">Upgrades are part of the career.</span>');
  } else if (tab === 'move') {
    if (G.free) { row('<span class="dim">In free flight, quit to the title to change city.</span>'); return; }
    for (const def of CITIES) {
      const cs = car.cities[def.id];
      if (!cs.unlocked) continue;
      row(`<b>${def.name}</b><br><span class="dim small">${cs.passed ? 'Goal met' : `${cs.done}/${def.goal} calls`}</span>`, def.id === CITY.def.id ? 'Here' : 'Relocate', () => { UI.hide('hangar'); leaveCity(); startCity({ city: def.id, heli: HELI.type, free: false }); }, def.id === CITY.def.id);
    }
  }
}

// ---------- options ----------
function fillOptions() {
  for (const e of $$('#options [data-opt]')) {
    const k = e.dataset.opt, v = OPTS[k];
    if (e.type === 'checkbox') e.checked = !!v; else if (e.type === 'range') e.value = v; else e.value = String(v);
  }
}
function readOptions() {
  for (const e of $$('#options [data-opt]')) {
    const k = e.dataset.opt;
    if (e.type === 'checkbox') OPTS[k] = e.checked;
    else if (e.type === 'range') OPTS[k] = +e.value;
    else OPTS[k] = isNaN(+e.value) ? e.value : +e.value;
  }
  applyOptions(); saveOpts();
}
function applyOptions() {
  setRes(OPTS.res); setViewDist(OPTS.view);
}
