// Act of God — the interface: the title screen and city picker, the HUD (city, clock, toll), the power dock with its
// two sides, the size slider, toasts, the news ticker, breaking news, the menu and help.

const UI = {
  hudT: 0, tickT: 0, tickI: 0,
  toggleSound() { const on = AUDIO.toggle(); $('#mSound').textContent = 'Sound: ' + (on ? 'on' : 'off'); toast(on ? 'Sound on' : 'Sound off'); },
};
G.size = 0.35; G.sizeKey = 'city';

function initUI() {
  // title: one card per size
  const box = $('#sizes');
  for (const k of Object.keys(SIZES)) {
    const s = SIZES[k];
    const c = el('button', 'size', `<b>${s.label}</b><span>${s.desc}</span><i>${fmtShort(s.pop[0])}–${fmtShort(s.pop[1])} people</i>`);
    c.dataset.k = k;
    c.onclick = () => { AUDIO.init(); AUDIO.click(); if (G.sizeKey === k && W.def) return; G.sizeKey = k; newCity(); };
    box.appendChild(c);
  }
  $('#reroll').onclick = () => { AUDIO.init(); AUDIO.click(); newCity(); };
  $('#begin').onclick = () => { AUDIO.init(); AUDIO.click(); beginPlay(); };
  // dock
  $('#tabWrath').onclick = () => setSide('wrath');
  $('#tabGrace').onclick = () => setSide('grace');
  $('#hand').onclick = () => { selectPower(null); };
  $('#size').oninput = (e) => setSize(+e.target.value / 100);
  $('#btnMenu').onclick = () => openMenu();
  $('#btnPause').onclick = () => togglePause();
  $('#btnSpeed').onclick = () => cycleSpeed();
  $('#btnHour').onclick = () => cycleHour();
  // menu
  $('#mResume').onclick = () => closeMenu();
  $('#mNew').onclick = () => { closeMenu(); toTitle(); };
  $('#mSound').onclick = () => UI.toggleSound();
  $('#mQuality').onclick = () => { const q = R.quality >= 1 ? 0.7 : R.quality >= 0.7 ? 0.5 : 1; setQuality(q); $('#mQuality').textContent = 'Quality: ' + (q >= 1 ? 'high' : q >= 0.7 ? 'medium' : 'low'); };
  $('#mHelp').onclick = () => { closeMenu(); $('#help').hidden = false; G.state = 'menu'; };
  $('#mHud').onclick = () => { closeMenu(); document.body.classList.add('nohud'); toast('Press H to bring the interface back', ''); };
  $('#helpClose').onclick = () => { $('#help').hidden = true; G.state = 'play'; G.paused = false; };
  bus.on('news', (item, breaking) => showNews(item, breaking));
  // buttons never keep focus, so Space and Tab stay with the game
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });
  buildDock();
  setSide('wrath');
  setSize(G.size);
}
function buildDock() {
  for (const side of ['wrath', 'grace']) {
    const row = $('#pw-' + side);
    row.innerHTML = '';
    let group = null, gEl = null;
    POWERS.filter((p) => p.side === side).forEach((p, i) => {
      if (p.group !== group) { group = p.group; gEl = el('div', 'grp', `<label>${p.group}</label><div class="gb"></div>`); row.appendChild(gEl); }
      const b = el('button', 'pw', `<span class="ic">${p.icon}</span><span class="nm">${p.name}</span><kbd>${keyLabel(i)}</kbd>`);
      b.dataset.id = p.id; b.title = p.name + ' — ' + p.desc;
      b.onclick = () => { AUDIO.init(); AUDIO.click(); selectPower(G.power === p.id ? null : p.id); };
      $('.gb', gEl).appendChild(b);
    });
  }
}
function setSide(side) {
  G.side = side;
  document.body.dataset.side = side;
  $('#tabWrath').classList.toggle('on', side === 'wrath');
  $('#tabGrace').classList.toggle('on', side === 'grace');
  if (G.power && PW[G.power].side !== side) selectPower(null);
  else refreshInfo();
}
function selectPower(id) {
  G.power = id;
  for (const b of $$('.pw')) b.classList.toggle('on', b.dataset.id === id);
  document.body.classList.toggle('casting', !!id);
  G.handMode = false;
  refreshInfo();
}
function setSize(v) {
  G.size = clamp(v, 0, 1);
  $('#size').value = Math.round(G.size * 100);
  refreshInfo();
}
function refreshInfo() {
  const p = G.power && PW[G.power];
  $('#info').classList.toggle('none', !p);
  if (!p) { $('#pName').textContent = G.side === 'wrath' ? 'Wrath' : 'Grace'; $('#pDesc').textContent = G.side === 'wrath' ? 'Choose a power to bring down on the city. Drag to look around.' : 'Choose a blessing. Grace can undo much of what wrath has done, but not all.'; $('#pSize').textContent = ''; return; }
  $('#pName').textContent = p.name;
  $('#pDesc').textContent = p.desc;
  const r = brushR(p);
  $('#pSize').textContent = p.radiusLabel ? p.radiusLabel(r) : p.id === 'quake' ? 'M ' + (5.4 + 3.8 * Math.pow((r - 120) / 2480, 0.7)).toFixed(1) : p.id === 'tornado' ? 'EF' + clamp(Math.round(1 + (r - 12) / 98 * 4), 1, 5) : p.id === 'hurricane' ? 'Category ' + clamp(Math.round(1 + (r - 400) / 2800 * 4), 1, 5) : fmtDist(r * (p.id === 'meteor' ? 2 : 1)) + (p.id === 'meteor' ? ' crater' : ' radius');
}
const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
function togglePause() { G.paused = !G.paused; $('#btnPause').textContent = G.paused ? '▶' : '⏸'; $('#btnPause').classList.toggle('on', G.paused); }
function cycleSpeed() { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 4 : 1; $('#btnSpeed').textContent = G.speed + '×'; }
function cycleHour() {
  // jump to the next of dawn, noon, dusk, night
  const stops = [6.2, 12, 18.3, 23];
  const h = ((G.hour % 24) + 24) % 24;
  const next = stops.find((s) => s > h + 0.25) ?? stops[0] + 24;
  G.hour = Math.floor(G.hour / 24) * 24 + next;
  toast(['Dawn', 'Noon', 'Dusk', 'Night'][stops.indexOf(next % 24)] || 'Dawn', '');
}
function toast(msg, kind = '') {
  const t = el('div', 'toast ' + kind, esc(msg));
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3300);
}
function openMenu() { if (G.state !== 'play') return; G.state = 'menu'; $('#menu').hidden = false; G.wasPaused = G.paused; G.paused = true; }
function closeMenu() { $('#menu').hidden = true; $('#help').hidden = true; G.state = 'play'; G.paused = !!G.wasPaused; }

// ---------- news ----------
function showNews(item, breaking) {
  UI.tickI = 0; UI.tickT = 0;
  renderTicker(item);
  if (breaking && G.state === 'play') {
    const b = $('#banner');
    b.className = item.good ? 'good' : 'bad';
    b.innerHTML = `<small>${item.good ? 'Extraordinary' : 'Breaking news'}</small><b>${esc(item.h)}</b><span>${esc(item.s)}</span>`;
    b.hidden = false;
    clearTimeout(UI.bannerT);
    UI.bannerT = setTimeout(() => { b.hidden = true; }, 7000);
  }
}
function renderTicker(item) {
  const t = $('#tickerText');
  if (!item) { t.innerHTML = ''; return; }
  t.innerHTML = `<b class="${item.kind}">${esc(item.h)}</b>${item.s ? ' <span>' + esc(item.s) + '</span>' : ''}`;
  t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
  $('#tickerOut').textContent = NEWS.outlet;
}
function tickerRotate(dt) {
  UI.tickT += dt;
  if (UI.tickT < 8 || NEWS.items.length < 2) return;
  UI.tickT = 0; UI.tickI = (UI.tickI + 1) % Math.min(5, NEWS.items.length);
  renderTicker(NEWS.items[UI.tickI]);
}

// ---------- HUD numbers ----------
function hudUpdate(dt) {
  UI.hudT -= dt;
  tickerRotate(dt);
  if (UI.hudT > 0) return;
  UI.hudT = 0.25;
  const S = G.stats;
  $('#cName').textContent = W.name;
  $('#cPop').textContent = fmtInt(S.pop);
  $('#clock').textContent = fmtClock(G.hour);
  $('#day').textContent = 'Day ' + (Math.floor(G.hour / 24) + 1);
  const m = S.mood;
  $('#moodBar').style.width = m + '%';
  $('#moodBar').style.background = m > 60 ? '#e8c46a' : m > 35 ? '#b8a88a' : m > 18 ? '#c8703a' : '#d83a2e';
  $('#moodTxt').textContent = m > 80 ? 'Joyful' : m > 60 ? 'Content' : m > 45 ? 'Uneasy' : m > 30 ? 'Afraid' : m > 15 ? 'Terrified' : 'Despairing';
  const rows = [
    ['Dead', S.dead, fmtInt, 'bad'], ['Injured', S.injured, fmtInt, 'warn'], ['Sick', S.infected, fmtInt, 'warn'],
    ['Buildings lost', S.destroyed, fmtInt, 'bad'], ['On fire', S.burning, fmtInt, 'warn'], ['Damage', S.damage, fmtMoneyShort, 'bad'],
    ['Treated', S.treated, fmtInt, ''], ['Saved', S.saved, fmtInt, 'good'], ['Raised', S.revived, fmtInt, 'good'], ['New residents', S.grown, fmtInt, 'good'],
  ];
  const html = rows.filter((r) => r[1] >= 1 || r[0] === 'Dead').map((r) => `<div class="${r[3]}"><span>${r[0]}</span><b>${r[2](r[1])}</b></div>`).join('');
  if (html !== UI.lastToll) { $('#toll').innerHTML = html; UI.lastToll = html; }
}

// ---------- title ----------
function titleInfo() {
  const g = W.gen;
  const water = { coast: 'on the coast', bay: 'around a bay', river: 'on a river', lake: 'beside a lake', delta: 'where a river meets the sea', island: 'on an island', none: 'inland' }[g.water];
  const land = { flat: 'flat country', hills: 'rolling hills', mountains: 'the mountains' }[g.relief];
  const bio = { temperate: '', desert: 'desert ', northern: 'northern ', tropical: 'tropical ' }[g.biome];
  $('#cityName').textContent = W.name;
  $('#cityDesc').textContent = `A ${bio}${SIZES[W.sizeKey].label.toLowerCase()} ${water}, in ${land}. Population ${fmtBig(W.popCap)}. ${fmtInt(W.buildings.length)} buildings.`;
  for (const c of $$('.size')) c.classList.toggle('on', c.dataset.k === W.sizeKey);
}
