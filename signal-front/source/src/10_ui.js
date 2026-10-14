// Signal Front — HUD, menus, banners and the title / setup / result screens

function blit(cv, img, bg) {
  const x = cv.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.clearRect(0, 0, cv.width, cv.height);
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, cv.width, cv.height); }
  x.drawImage(img, 0, 0, cv.width, cv.height);
}
function spriteCanvas(t, side, size = 16, bg) {
  const c = mkCanvas(size, size); c.className = 'pix';
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, size, size); }
  x.drawImage(unitSprite(t, side, 0), 0, 0, size, size);
  return c;
}

// ---------------- top bar ----------------
function hudRefresh() {
  if (!S) return;
  for (let p = 0; p < 2; p++) {
    const card = $('#side' + p), sd = S.sides[p], co = COS[sd.co];
    card.classList.toggle('active', S.turn === p);
    blit(card.querySelector('canvas'), portrait(sd.co, sd.pw ? 1 : 0));
    card.querySelector('.nm').textContent = co.name;
    card.querySelector('.funds').textContent = 'G ' + fmt(sd.funds);
    const m = card.querySelector('.meter');
    const pc = powerCost(S, p, 1), sc = powerCost(S, p, 2), stars = co.super.stars, per = sc / stars;
    let html = '';
    for (let i = 0; i < stars; i++) {
      const f = clamp((sd.meter - i * per) / per, 0, 1);
      html += '<i class="' + (i >= co.power.stars ? 'big' : '') + '"><b style="width:' + Math.round(f * 100) + '%"></b></i>';
    }
    m.innerHTML = html;
    m.classList.toggle('ready', !sd.pw && sd.meter >= pc);
    let tag = card.querySelector('.pwtag');
    if (sd.pw) { if (!tag) { tag = el('span', 'pwtag'); card.appendChild(tag); } tag.textContent = sd.pw === 2 ? 'SUPER' : 'POWER'; }
    else if (tag) tag.remove();
  }
  $('#dayTxt').textContent = 'DAY ' + S.day;
  $('#turnTxt').textContent = FACTIONS[S.turn].name;
  const human = isHumanTurn();
  $('#endBtn').disabled = !human || G.mode === 'busy';
  const hs = humanSide();
  $('#powerBtn').hidden = !(human && (canPower(S, hs, 1) || canPower(S, hs, 2)));
  $('#powerBtn').textContent = canPower(S, hs, 2) ? 'Super!' : 'Power!';
  if (R.cursor) infoAt(R.cursor.x, R.cursor.y);
}

function infoAt(x, y) {
  if (!S || !inb(S, x, y)) return;
  const t = tileAt(S, x, y), T0 = TER[t.k];
  $('#terrCard').hidden = false;
  const tc = $('#terrCard canvas'), tx = tc.getContext('2d');
  tx.imageSmoothingEnabled = false; tx.clearRect(0, 0, 16, 20);
  tx.drawImage(tileImage(S, x, y), 0, 4);
  if (t.k === 'forest' || t.k === 'mount') tx.drawImage(tallTile(t.k, x, y), 0, 0);
  else if (T0.prop) tx.drawImage(propSprite(t.k, t.o), 0, 0);
  $('#terrName').textContent = T0.name.toUpperCase();
  let line = '<span class="stars">' + '★'.repeat(T0.def) + '</span>' + (T0.def ? '' : '<span style="color:var(--dim)">no cover</span>');
  if (T0.prop) line += ' · ' + (t.o < 0 ? 'Neutral' : FACTIONS[t.o].name) + (t.cp < 20 ? ' · <b>' + t.cp + '</b>/20' : '');
  $('#terrLine').innerHTML = line;
  const u = unitAt(S, x, y);
  const card = $('#unitCard');
  if (u && canSee(S, viewSide(), u)) {
    card.hidden = false; card.dataset.unit = u.id;
    blit(card.querySelector('canvas'), unitSprite(u.t, u.s, 0));
    const U = UNITS[u.t];
    $('#unitName').textContent = U.name.toUpperCase();
    let l = 'HP <b>' + disp(u.hp) + '</b> · Fuel <b>' + u.fuel + '</b>';
    if (U.w1 && U.w1.ammo) l += ' · Ammo <b>' + u.ammo + '</b>';
    if (u.cargo.length) l += ' · Carrying ' + UNITS[u.cargo[0].t].name;
    $('#unitLine').innerHTML = l;
  } else card.hidden = true;
}

// ---------------- action menu / forecast ----------------
function openActionMenu(items) {
  const m = $('#actionMenu');
  m.innerHTML = '';
  for (const it of items) {
    const b = el('button', null, it.label);
    b.onclick = (e) => { e.stopPropagation(); menuPick(it.id); };
    m.appendChild(b);
  }
  m.hidden = false;
  const p = tileToScreen(G.dest.x, G.dest.y);
  const w = m.offsetWidth, h = m.offsetHeight;
  let left = p.x + p.s + 8, top = p.y - 4;
  if (left + w > innerWidth - 8) left = p.x - w - 8;
  if (left < 8) left = 8;
  top = clamp(top, 64, innerHeight - h - 8);
  m.style.left = left + 'px'; m.style.top = top + 'px';
  if (!isTouch) m.querySelector('button').focus({ preventScroll: true });
}
function closeActionMenu() { $('#actionMenu').hidden = true; }

function showForecast(u, t, f) {
  const box = $('#forecast');
  const pct = (a, b) => (a === b ? a + '%' : a + '–' + b + '%');
  let html = '<div class="row"><span class="k">DAMAGE</span><span class="v hit">' + pct(f.lo, f.hi) + '</span></div>';
  if (UNITS[u.t].kamikaze) html += '<div class="hint">The Kite is destroyed by its own strike.</div>';
  else if (f.counter) html += '<div class="row"><span class="k">COUNTER</span><span class="v ctr">' + pct(f.clo, f.chi) + '</span></div>';
  else html += '<div class="row"><span class="k">COUNTER</span><span class="v" style="color:var(--dim)">none</span></div>';
  if (f.lo >= t.hp) html += '<div class="hint" style="color:var(--good)">Destroys the target.</div>';
  if (isTouch) html += '<div class="hint">Tap the target again to fire.</div>';
  box.innerHTML = html;
  box.hidden = false;
  const p = tileToScreen(t.x, t.y);
  const w = box.offsetWidth, h = box.offsetHeight;
  let left = p.x + p.s + 10, top = p.y - h / 2 + p.s / 2;
  if (left + w > innerWidth - 8) left = p.x - w - 10;
  box.style.left = clamp(left, 8, innerWidth - w - 8) + 'px';
  box.style.top = clamp(top, 64, innerHeight - h - 8) + 'px';
}
function hideForecast() { $('#forecast').hidden = true; }

// ---------------- banners & toasts ----------------
async function showBanner(html, bg, ms, cls) {
  const b = $('#banner'), s = b.querySelector('.strip');
  s.innerHTML = html; s.style.background = bg;
  b.className = cls || '';
  if (TIME.fast) return;
  void b.offsetWidth;
  b.classList.add('on');
  await wait(ms);
  b.classList.add('out');
  await wait(380);
  // snap back off-screen without animating across the map
  s.style.transition = 'none';
  b.className = cls || '';
  void s.offsetWidth;
  s.style.transition = '';
}
async function turnBanner(side, events) {
  const sd = S.sides[side], f = FACTIONS[side];
  const inc = events.find((e) => e.kind === 'income');
  const cv = mkCanvas(32, 32);
  const html = '<canvas class="pix" width="32" height="32"></canvas><div><div class="big">DAY ' + S.day + '</div><div class="sub">' + f.long +
    (inc && inc.amount ? ' · +' + fmt(inc.amount) + ' G' : '') + '</div></div>';
  void cv; void sd;
  sfx('turn');
  const p = showBanner(html, 'linear-gradient(90deg,' + f.ramp[3] + ',' + f.ramp[2] + ' 50%,' + f.ramp[3] + ')', side === humanSide() ? 900 : 650);
  const c = $('#banner canvas'); if (c) blit(c, portrait(sd.co));
  await p;
}
async function powerBanner(side, level) {
  const co = coOf(S, side), f = FACTIONS[side];
  const pw = level === 2 ? co.super : co.power;
  sfx('power');
  const html = '<canvas class="pix" width="32" height="32"></canvas><div><div class="big">' + pw.name.toUpperCase() + '</div><div class="sub">' + co.name + ' · ' + pw.desc + '</div></div>';
  const p = showBanner(html, 'linear-gradient(90deg,#000,' + f.ramp[2] + ' 50%,#000)', 1300, 'power');
  const c = $('#banner canvas'); if (c) blit(c, portrait(S.sides[side].co, 1));
  R.shake = 3;
  await p;
}
let toastT = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('off');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.add('off'), 2600);
}
function log() { /* reserved for a battle log */ }

// ---------------- modals ----------------
function anyModalOpen() { return $$('.modal').some((m) => !m.hidden); }
function closeModals() { $$('.modal').forEach((m) => (m.hidden = true)); }
function openModal(id) { closeModals(); $(id).hidden = false; sfx('menu'); }

function vsChips(t) {
  const out = [];
  const U = UNITS[t];
  for (const cls of ['inf', 'veh', 'tank', 'heavy', 'drone', 'heli', 'jet', 'ship', 'sub']) {
    const v = Math.max(U.w1 ? U.w1.dmg[cls] || 0 : 0, U.w2 ? U.w2.dmg[cls] || 0 : 0);
    if (!v) continue;
    out.push('<span class="' + (v >= 75 ? 'hi' : v >= 35 ? 'mid' : 'lo') + '">' + CLS_NAME[cls] + ' ' + v + '%</span>');
  }
  return out.length ? '<div class="vs">' + out.join('') + '</div>' : '<div class="desc" style="color:var(--dim)">Unarmed.</div>';
}
function unitStats(t, side) {
  const U = UNITS[t];
  const rng = U.w1 && U.w1.range ? U.w1.range.join('–') : U.w1 || U.w2 ? '1' : '—';
  return '<div class="stat"><span>Cost</span><span>' + fmt(S ? unitCost(S, side, t) : U.cost) + ' G</span><span>Move</span><span>' + U.move + ' (' + MT_NAME[U.mt] + ')</span>' +
    '<span>Vision</span><span>' + U.vis + '</span><span>Range</span><span>' + rng + '</span><span>Fuel</span><span>' + U.fuel + (U.burn ? ' (−' + U.burn + '/day)' : '') + '</span>' +
    '<span>Class</span><span>' + CLS_NAME[U.cls] + '</span>' +
    (U.w1 ? '<span>Weapon</span><span>' + U.w1.name + (U.w1.ammo ? ' ×' + U.w1.ammo : '') + '</span>' : '') +
    (U.w2 ? '<span>' + (U.w1 ? 'Backup' : 'Weapon') + '</span><span>' + U.w2.name + '</span>' : '') + '</div>';
}

let BUILD = { x: 0, y: 0, kind: 'ground', sel: null };
function openBuild(x, y, kind) {
  BUILD = { x, y, kind, sel: null };
  const side = S.turn;
  $('#buildTitle').textContent = kind === 'ground' ? 'Factory' : kind === 'air' ? 'Airfield' : 'Port';
  $('#funds2').textContent = 'G ' + fmt(S.sides[side].funds);
  const list = $('#buildList'); list.innerHTML = '';
  const roster = buildList(S, side, kind);
  for (const t of roster) {
    const cost = unitCost(S, side, t), ok = S.sides[side].funds >= cost;
    const b = el('button', 'bu' + (ok ? '' : ' no'));
    b.appendChild(spriteCanvas(t, side, 16));
    b.appendChild(el('span', 'n', UNITS[t].name));
    b.appendChild(el('span', 'c', fmt(cost)));
    b.onclick = () => { if (BUILD.sel === t && ok) return confirmBuild(); buildSelect(t); };
    b.ondblclick = () => { if (ok) { BUILD.sel = t; confirmBuild(); } };
    b.dataset.t = t;
    list.appendChild(b);
  }
  const first = roster.find((t) => S.sides[side].funds >= unitCost(S, side, t)) || roster[0];
  buildSelect(first, true);
  openModal('#buildModal');
}
function buildSelect(t, quiet) {
  BUILD.sel = t;
  const side = S.turn, U = UNITS[t], ok = S.sides[side].funds >= unitCost(S, side, t);
  $$('#buildList .bu').forEach((b) => b.classList.toggle('sel', b.dataset.t === t));
  const d = $('#buildDetail');
  d.innerHTML = '<div class="hero"></div><div class="desc">' + U.desc + '</div>' + unitStats(t, side) + '<div class="k" style="font-family:\'Press Start 2P\';font-size:8px;color:var(--dim)">BASE DAMAGE VS</div>' + vsChips(t);
  const hero = d.querySelector('.hero');
  hero.appendChild(spriteCanvas(t, side, 16, '#2c5a2a'));
  hero.appendChild(el('div', null, '<div class="px" style="font-size:11px">' + U.name.toUpperCase() + '</div>'));
  const go = el('button', 'btn primary', ok ? 'Deploy · ' + fmt(unitCost(S, side, t)) : 'Not enough funds');
  go.disabled = !ok;
  go.onclick = confirmBuild;
  d.appendChild(go);
  if (!quiet) sfx('cursor');
}
async function confirmBuild() {
  const t = BUILD.sel;
  if (!t || S.sides[S.turn].funds < unitCost(S, S.turn, t)) { sfx('error'); return; }
  closeModals();
  G.mode = 'busy';
  await perform({ kind: 'build', t, x: BUILD.x, y: BUILD.y });
  G.mode = 'idle';
  hudRefresh();
}

function openCO(side) {
  const sd = S.sides[side], co = COS[sd.co], box = $('#coBox');
  const mine = side === humanSide() && isHumanTurn();
  const pwRow = (lvl) => {
    const p = lvl === 2 ? co.super : co.power, ok = mine && canPower(S, side, lvl);
    return '<div class="pw"><div class="tx"><b>' + (lvl === 2 ? 'SUPER: ' : 'POWER: ') + p.name.toUpperCase() + '</b>' + p.desc +
      ' <span style="color:var(--dim)">(' + fmt(powerCost(S, side, lvl) / STAR) + '★)</span></div>' + (mine ? '<button class="btn ' + (ok ? 'primary' : '') + '" data-lvl="' + lvl + '"' + (ok ? '' : ' disabled') + '>Activate</button>' : '') + '</div>';
  };
  box.innerHTML = '<h2>' + FACTIONS[side].long + '<button class="x" data-close>✕</button></h2>' +
    '<div class="cohead"><canvas class="pix" width="32" height="32"></canvas><div><div class="t">' + co.name.toUpperCase() + '</div><div class="s">' + co.title + '</div></div></div>' +
    '<div class="desc">' + co.bio + '</div><div class="desc" style="margin-top:8px"><b style="color:var(--gold);font-weight:400">Always:</b> ' + co.d2d + '</div>' +
    pwRow(1) + pwRow(2) +
    (sd.pw ? '<div class="desc" style="margin-top:8px;color:var(--gold)">' + (sd.pw === 2 ? co.super.name : co.power.name) + ' is active until the start of their next turn.</div>' : '') +
    '<div class="desc" style="margin-top:8px;color:var(--dim)">Every power also gives all units +10% firepower and defence. The meter fills as you deal and take damage.</div>';
  blit(box.querySelector('canvas'), portrait(sd.co));
  box.querySelectorAll('[data-lvl]').forEach((b) => (b.onclick = async () => {
    closeModals();
    G.mode = 'busy'; clearSel();
    await perform({ kind: 'power', level: +b.dataset.lvl });
    G.mode = 'idle'; hudRefresh();
  }));
  box.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModals));
  openModal('#coModal');
}

function openIntel(u) {
  const U = UNITS[u.t], box = $('#intelBox');
  box.innerHTML = '<h2>' + U.name.toUpperCase() + '<button class="x" data-close>✕</button></h2>' +
    '<div style="display:flex;gap:12px;align-items:flex-start"><div class="hero"></div><div style="flex:1"><div class="desc">' + U.desc + '</div>' +
    '<div class="desc" style="margin-top:6px">HP ' + disp(u.hp) + '/10 · Fuel ' + u.fuel + '/' + U.fuel + (U.w1 && U.w1.ammo ? ' · Ammo ' + u.ammo + '/' + U.w1.ammo : '') + '</div></div></div>' +
    unitStats(u.t, u.s) + '<div style="height:6px"></div>' + vsChips(u.t);
  box.querySelector('.hero').appendChild(spriteCanvas(u.t, u.s, 16, '#2c5a2a'));
  box.querySelector('.hero canvas').style.cssText = 'width:64px;height:64px;border:2px solid var(--edge)';
  box.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModals));
  openModal('#intelModal');
}

// ---------------- title / setup / how-to / result ----------------
const SETUP = storeGet('setup', { map: 'crossfire', coP: 'kade', coE: 'volsk', fog: false, funds: 0, income: 1000, diff: 'normal' });

function setState(st) { document.body.dataset.state = st; }

function miniMap(def) {
  const m = buildMap(def);
  const sc = 4;
  const c = mkCanvas(m.w * sc, m.h * sc); c.className = 'mini pix';
  const x = c.getContext('2d');
  const col = { plain: '#7cc858', forest: '#2f7a3a', mount: '#a89070', road: '#b9b2a2', bridge: '#a87c4c', river: '#4a90e8', sea: '#3a7ce0', shoal: '#ecd898', reef: '#2a5cb8' };
  m.tiles.forEach((t, i) => {
    const X = (i % m.w) * sc, Y = ((i / m.w) | 0) * sc;
    if (TER[t.k].prop) { x.fillStyle = t.o < 0 ? '#d8d4c8' : FACTIONS[t.o].ramp[1]; x.fillRect(X, Y, sc, sc); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X, Y + sc - 1, sc, 1); if (t.k === 'hq') { x.fillStyle = '#ffd23a'; x.fillRect(X + 1, Y + 1, sc - 2, sc - 2); } }
    else { x.fillStyle = col[t.k] || '#7cc858'; x.fillRect(X, Y, sc, sc); }
  });
  return c;
}

function buildSetup() {
  const mc = $('#mapCards'); mc.innerHTML = '';
  for (const def of MAPS) {
    const b = el('button', 'pick' + (SETUP.map === def.id ? ' sel' : ''));
    b.appendChild(miniMap(def));
    const m = buildMap(def);
    b.appendChild(el('div', 'n', def.name));
    b.appendChild(el('div', 'b', m.w + '×' + m.h + ' · ' + def.blurb));
    b.onclick = () => { SETUP.map = def.id; sfx('cursor'); buildSetup(); };
    mc.appendChild(b);
  }
  for (const side of [0, 1]) {
    const box = $('#coCards' + side); box.innerHTML = '';
    for (const id in COS) {
      const co = COS[id];
      if (co.side !== side) continue;
      const key = side === 0 ? 'coP' : 'coE';
      const b = el('button', 'pick' + (SETUP[key] === id ? ' sel' : ''));
      const row = el('div', 'row');
      const cv = mkCanvas(32, 32); cv.className = 'pix'; blit(cv, portrait(id));
      row.appendChild(cv);
      row.appendChild(el('div', null, '<div class="n">' + co.name + '</div><div class="b">' + co.title + '</div>'));
      b.appendChild(row);
      b.appendChild(el('div', 'b', co.d2d + '<br><span style="color:var(--gold)">' + co.power.name + '</span> · <span style="color:var(--gold)">' + co.super.name + '</span>'));
      b.onclick = () => { SETUP[key] = id; sfx('cursor'); buildSetup(); };
      box.appendChild(b);
    }
  }
  const ob = $('#optBox'); ob.innerHTML = '';
  const opt = (label, key, vals) => {
    const d = el('div', 'opt box'); d.appendChild(el('div', 'k', label));
    const seg = el('div', 'seg');
    for (const [v, txt] of vals) {
      const b = el('button', SETUP[key] === v ? 'on' : '', txt);
      b.onclick = () => { SETUP[key] = v; sfx('cursor'); buildSetup(); };
      seg.appendChild(b);
    }
    d.appendChild(seg); ob.appendChild(d);
  };
  opt('FOG OF WAR', 'fog', [[false, 'Off'], [true, 'On']]);
  opt('STARTING FUNDS', 'funds', [[0, '0'], [5000, '5,000'], [10000, '10,000']]);
  opt('INCOME PER PROPERTY', 'income', [[1000, '1,000'], [2000, '2,000']]);
  opt('ENEMY AI', 'diff', [['normal', 'Normal'], ['hard', 'Hard (+25% income)']]);
}

function buildHowto(back) {
  const unitRows = (side) => FACTIONS[side].roster.map((t) => {
    const U = UNITS[t];
    return '<div class="r box"><span class="ic"></span><div><div class="n">' + U.name.toUpperCase() + ' <span style="color:var(--gold)">' + fmt(U.cost) + '</span></div><div class="d">' + U.desc + '</div></div></div>';
  }).join('');
  const h = $('#howtoBody');
  h.innerHTML = '<h1>How to play</h1>' +
    '<p>Turn-based tactics in the classic handheld style. You command <b>Meridian</b>, whose army is entirely uncrewed: robots, drones and autonomous launchers. ' +
    'The <b>Drovic Federation</b> fields cheap drone swarms alongside tanks, guns and infantry.</p>' +
    '<p><b>Win</b> by capturing the enemy HQ or destroying every enemy unit.</p>' +
    '<ul><li><b>Select</b> a unit, then tap a blue tile to move. Pick an action: Fire, Network (capture), Supply, Load, Drop, Join or Wait.</li>' +
    '<li><b>Attack</b>: choose Fire, then a red-bracketed target. The forecast shows damage and the counterattack. On touch, tap the target twice.</li>' +
    '<li><b>Counterattacks</b>: a unit that survives a direct attack fires back. Indirect units (Spark, Moray, Howitzer, MLRS) can\'t move and fire on the same turn and never take counter fire.</li>' +
    '<li><b>Terrain</b>: each ★ reduces damage taken. Air units ignore terrain. Forests hide units in fog.</li>' +
    '<li><b>Property</b>: Crawlers and Striders network (capture) property. Each capture removes the unit\'s HP from 20 points. Property earns funds, and repairs 2 HP each turn for a fee.</li>' +
    '<li><b>Build</b>: tap an empty factory, airfield or port you own. New units act next turn.</li>' +
    '<li><b>Fuel and ammo</b>: aircraft burn fuel every day and crash at zero. Resupply on your property or next to a Nexus.</li>' +
    '<li><b>Commander powers</b>: the meter fills as you trade damage. Tap your portrait or the Power button to activate.</li>' +
    '<li><b>Tap an enemy</b> to see everywhere it can strike next turn. Drag to pan, pinch or scroll to zoom. Right-click or Esc cancels.</li></ul>' +
    '<p><b>Meridian specials:</b> the <b>Watchpost</b> gives nearby units +10% firepower and defence and sees into forests. The <b>Static</b> jammer cuts enemy drone firepower by 30% within 2 tiles and wears them down every turn. The <b>Deepfin</b> is invisible unless an enemy is adjacent. ' +
    '<b>Drovic specials:</b> the <b>Kite</b> is destroyed by its own strike; <b>FPV swarms</b> are cheap but can\'t fight aircraft.</p>' +
    '<h3>Meridian Autonomy Command</h3><div class="roster">' + unitRows(0) + '</div>' +
    '<h3>Drovic Federation</h3><div class="roster">' + unitRows(1) + '</div>' +
    '<div class="bar"><span></span><button class="btn primary" id="howBack">Back</button></div>';
  const rows = h.querySelectorAll('.roster');
  rows.forEach((r, side) => r.querySelectorAll('.ic').forEach((ic, i) => ic.replaceWith(spriteCanvas(FACTIONS[side].roster[i], side, 16, '#2c5a2a'))));
  $('#howBack').onclick = back;
}

function finishGame() {
  if (S.finished) return;
  S.finished = true;
  G.mode = 'off';
  clearSel();
  storeDel('save');
  const won = S.winner === humanSide();
  sfx(won ? 'win' : 'lose');
  playSong('title');
  const how = S.how === 'hq' ? (won ? 'Enemy HQ networked.' : 'Your HQ has fallen.') : S.how === 'yield' ? 'You conceded.' : (won ? 'Enemy forces routed.' : 'Your forces were destroyed.');
  const st = (p) => S.sides[p].stats;
  const row = (k, f) => '<span>' + f(st(0)) + '</span><span class="h">' + k + '</span><span>' + f(st(1)) + '</span>';
  $('#resultBody').innerHTML = '<div class="verdict ' + (won ? 'win' : 'lose') + '">' + (won ? 'VICTORY' : 'DEFEAT') + '</div>' +
    '<div class="desc" style="font-size:24px">' + how + ' Day ' + S.day + ' · ' + S.name + '</div>' +
    '<div class="stats"><span class="h" style="color:' + FACTIONS[0].ramp[0] + '">MERIDIAN</span><span></span><span class="h" style="color:' + FACTIONS[1].ramp[0] + '">DROVIC</span>' +
    row('UNITS BUILT', (s) => s.built) + row('UNITS LOST', (s) => s.lost) + row('KILLS', (s) => s.kills) + row('CAPTURES', (s) => s.captured) + row('DAMAGE DEALT', (s) => fmt(s.dealt) + ' G') + '</div>' +
    '<div class="bar" style="justify-content:center"><button class="btn" id="rTitle">Title</button><button class="btn primary" id="rAgain">Rematch</button></div>';
  $('#rTitle').onclick = () => toTitle();
  $('#rAgain').onclick = () => startGame({ ...SETUP });
  setTimeout(() => setState('result'), TIME.fast ? 0 : 1200);
}

function uiInit() {
  $('#endBtn').onclick = () => { audioInit(); humanEndTurn(); };
  $('#powerBtn').onclick = () => openCO(humanSide());
  $('#menuBtn').onclick = () => { refreshMenu(); openModal('#menuModal'); };
  $('#side0').onclick = () => openCO(0);
  $('#side1').onclick = () => openCO(1);
  $('#zoomIn').onclick = () => setZoom(1, R.W / 2, R.H / 2);
  $('#zoomOut').onclick = () => setZoom(-1, R.W / 2, R.H / 2);
  $('#unitCard').onclick = () => { const u = S.units.find((w) => w.id === +$('#unitCard').dataset.unit); if (u) openIntel(u); };
  $$('[data-close]').forEach((b) => (b.onclick = closeModals));
  $$('.modal').forEach((m) => m.addEventListener('pointerdown', (e) => { if (e.target === m) closeModals(); }));
  $('#mMusic').onclick = () => { setMusic(!AUD.music); refreshMenu(); };
  $('#mSfx').onclick = () => { setSfx(!AUD.sfx); refreshMenu(); };
  $('#mSpeed').onclick = () => { TIME.speed = TIME.speed === 1 ? 2.2 : 1; storeSet('speed', TIME.speed); refreshMenu(); };
  $('#mHelp').onclick = () => { closeModals(); buildHowto(() => setState('play')); setState('howto'); };
  $('#mQuit').onclick = () => { if (!isHumanTurn() || G.mode === 'busy') return; closeModals(); saveGame(); toTitle(); };
  $('#mYield').onclick = () => { if (!isHumanTurn() || G.mode === 'busy') return; closeModals(); if (!S.over) { S.over = true; S.winner = 1 - humanSide(); S.how = 'yield'; finishGame(); } };
  $('#tNew').onclick = () => { audioInit(); buildSetup(); setState('setup'); sfx('menu'); };
  $('#tContinue').onclick = () => { audioInit(); loadGame(); };
  $('#tHelp').onclick = () => { audioInit(); buildHowto(() => setState('title')); setState('howto'); };
  $('#tSound').onclick = () => { audioInit(); const on = !(AUD.music || AUD.sfx); setMusic(on); setSfx(on); refreshTitle(); };
  $('#setupBack').onclick = () => setState('title');
  $('#setupGo').onclick = () => { storeSet('setup', SETUP); startGame({ ...SETUP }); };
}
function refreshMenu() {
  // leaving the match is only possible on your own turn, between actions
  const free = isHumanTurn() && G.mode !== 'busy';
  $('#mQuit').disabled = !free; $('#mYield').disabled = !free;
  $('#mMusic').textContent = 'Music: ' + (AUD.music ? 'On' : 'Off');
  $('#mSfx').textContent = 'Sound FX: ' + (AUD.sfx ? 'On' : 'Off');
  $('#mSpeed').textContent = 'Enemy speed: ' + (TIME.speed === 1 ? 'Normal' : 'Fast');
}
function refreshTitle() {
  $('#tContinue').hidden = !storeGet('save', null);
  $('#tSound').textContent = 'Sound: ' + (AUD.music || AUD.sfx ? 'On' : 'Off');
}
