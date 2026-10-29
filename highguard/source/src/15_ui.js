// ---- 15_ui: title, campaign and briefing, help, settings, pause, results ----
const Ui = { prev: [], sel: 0 };
const SCREENS = ['title', 'campaign', 'help', 'settings', 'pause', 'results'];
Ui.show = function (id, keepPrev) {
  const cur = SCREENS.find((s) => !$(s).hidden);
  if (keepPrev && cur) Ui.prev.push(cur); else if (!keepPrev) Ui.prev = [];
  for (const s of SCREENS) $(s).hidden = s !== id;
  document.body.dataset.state = id ? (G.state === 'play' ? 'play' : G.state) : G.state;
};
Ui.back = function () { const p = Ui.prev.pop(); Sfx.ui(); if (p) { for (const s of SCREENS) $(s).hidden = s !== p; } else Ui.title(); };
Ui.init = function () {
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', Ui.back));
  $('btnCampaign').onclick = () => { Sfx.init(); Sfx.ui(); Ui.campaign(); };
  $('btnHelp').onclick = () => { Sfx.init(); Sfx.ui(); Ui.show('help', true); };
  $('btnSet').onclick = () => { Sfx.init(); Sfx.ui(); Ui.settings(); Ui.show('settings', true); };
  $('btnLaunch').onclick = () => { Sfx.ui(); Ui.launch(Ui.sel); };
  $('btnResume').onclick = () => Ui.resume();
  $('btnRestart').onclick = () => Ui.launch(Mission.idx);
  $('btnPHelp').onclick = () => Ui.show('help', true);
  $('btnPSet').onclick = () => { Ui.settings(); Ui.show('settings', true); };
  $('btnLeave').onclick = () => { G.paused = false; Ui.title(); };
  $('btnNext').onclick = () => Ui.launch(Math.min(MISSIONS.length - 1, Mission.idx + 1));
  $('btnRetry').onclick = () => Ui.launch(Mission.idx);
  $('btnCamp').onclick = () => Ui.campaign();
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && G.state === 'play' && !G.paused && !DEBUG && Mission.phase === 'play') Ui.pause();
  });
  Ui.title();
};
Ui.title = function () {
  G.state = 'title'; G.paused = false; Input.unlock();
  Ui.show('title');
  Ui.demo();
};
Ui.demo = function () {
  if (Mission.demo && G.ships.length) return;
  Mission.start(3, { demo: true, noPlayer: true, seed: 7 });
  for (const s of G.ships) if (s.ai) s.ai.cruiseT = 0;
  Cine.ship = null;
};
Ui.backdrop = function (dt) { Mission.update(dt); Cine.update(dt); };
Ui.campaign = function () {
  G.state = 'menu'; G.paused = false; Input.unlock();
  Ui.demo();
  const L = $('mlist'); L.innerHTML = '<h2>Campaign</h2>';
  Ui.sel = Math.min(Ui.sel || progress.open - 1, progress.open - 1);
  MISSIONS.forEach((m, i) => {
    const open = i < progress.open || DEBUG, d = el('div', 'mi' + (open ? '' : ' locked') + (i === Ui.sel ? ' sel' : ''),
      '<div><b>' + (open ? m.name : '· · ·') + '</b><small>' + m.sub + '</small></div><span class="grade">' + (progress.best[m.id] || '') + '</span>');
    if (open) d.onclick = () => { Ui.sel = i; Sfx.ui(); Ui.campaign(); };
    L.appendChild(d);
  });
  const m = MISSIONS[Ui.sel];
  $('bname').textContent = m.name; $('bsub').textContent = m.sub; $('btext').innerHTML = m.brief; $('bgoal').textContent = m.goal;
  const nm = (e, t) => (e[5] && e[5].name ? e[5].name + ' · ' : '') + CLASS_NAMES[t][e[0]];
  const p = m.player, sq = (p[5].squads || []).map((t) => CRAFT[t].one.toLowerCase() + 's');
  $('bship').innerHTML = '<li>' + nm(p, 0) + '</li><li>' + CLASSES[p[0]].side.guns + ' guns a side' + (CLASSES[p[0]].torps ? ', ' + CLASSES[p[0]].torps + ' torpedo tubes' : '') + '</li>' + (sq.length ? '<li>Hangar: ' + sq.join(', ') + '</li>' : '');
  const count = (list, t) => { const c = {}; for (const e of list) { const k = e[5] && e[5].name ? nm(e, t) : CLASS_NAMES[t][e[0]]; c[k] = (c[k] || 0) + 1; } return Object.entries(c).map(([k, n]) => '<li>' + (n > 1 ? n + ' × ' : '') + k + '</li>').join(''); };
  $('ballies').innerHTML = count(m.allies, 0);
  const now = m.enemies.filter((e) => !(e[5] && e[5].jump > 20)), later = m.enemies.length - now.length;
  $('benemy').innerHTML = count(now, 1) + (later ? '<li>…and more expected</li>' : '');
  Ui.show('campaign');
};
Ui.launch = function (idx) {
  Sfx.init();
  G.paused = false; G.state = 'play';
  Mission.start(idx, {});
  PC.reset(); Hud.reset();
  Ui.show(null);
  document.body.dataset.state = 'play';
  Hud.banner(Mission.def.name, Mission.def.goal);
  if (!DEBUG) Input.lock();
};
Ui.pause = function () {
  if (G.state !== 'play') return;
  G.paused = true; Input.unlock(); Input.clear(); Ui.pausedAt = performance.now();
  Ui.show('pause'); document.body.dataset.state = 'play';
};
Ui.resume = function () {
  G.paused = false; Ui.show(null); document.body.dataset.state = 'play';
  Input.lock();
};
Ui.results = function () {
  G.state = 'over'; Input.unlock();
  const p = G.player, win = Mission.result === 'win';
  $('restitle').textContent = win ? 'Victory' : 'Defeat'; $('restitle').style.color = win ? 'var(--ok)' : 'var(--foe)';
  $('reswhy').textContent = Mission.reason;
  $('resgrade').textContent = win ? Mission.grade : '';
  const st = p ? p.stats : { dmg: 0, kills: 0, shots: 0, hits: 0, subs: 0 };
  const lostCraft = p ? p.squads.reduce((a, q) => a + q.lostCount, 0) : 0;
  const rows = [['Time', fmtTime(Mission.time)], ['Hull remaining', p ? Math.round(p.hull / p.maxHull * 100) + '%' : '0%'], ['Warships destroyed by you', Mission.log.filter((l) => l.mine && l.team === 1).length],
    ['Subsystems knocked out', st.subs], ['Damage dealt', Math.round(st.dmg)], ['Battery accuracy', st.shots ? Math.round(st.hits / st.shots * 100) + '%' : '–'],
    ['Enemy craft shot down by your squadrons', st.craftKills || 0], ['Your craft lost', lostCraft], ['Allied warships lost', Mission.log.filter((l) => l.team === 0 && l.name !== (p && p.name)).length]];
  $('resstats').innerHTML = rows.map((r) => '<span>' + r[0] + '</span><span>' + r[1] + '</span>').join('');
  $('btnNext').hidden = !win || Mission.idx >= MISSIONS.length - 1;
  if (win && Mission.idx >= MISSIONS.length - 1) $('reswhy').textContent += ' Aster is safe. The campaign is complete.';
  Ui.show('results'); document.body.dataset.state = 'over';
};
Ui.settings = function () {
  const f = $('setform');
  f.innerHTML = '';
  const add = (label, input) => { f.appendChild(el('label', '', label)); f.appendChild(input); };
  const range = (k, a, b, s, fn) => { const i = el('input'); i.type = 'range'; i.min = a; i.max = b; i.step = s; i.value = settings[k]; i.oninput = () => { settings[k] = +i.value; if (fn) fn(); saveSettings(); }; return i; };
  const check = (k) => { const i = el('input'); i.type = 'checkbox'; i.checked = settings[k]; i.onchange = () => { settings[k] = i.checked; saveSettings(); }; return i; };
  add('Mouse sensitivity', range('sens', 0.3, 2.5, 0.05));
  add('Invert mouse Y', check('invert'));
  add('Lead marker', check('lead'));
  add('Camera shake', check('shake'));
  add('Volume', range('vol', 0, 1, 0.05, () => Sfx.setVolume(settings.vol)));
  const q = el('select'); for (const o of ['auto', 'low', 'high']) { const op = el('option', '', o[0].toUpperCase() + o.slice(1)); op.value = o; q.appendChild(op); }
  q.value = settings.quality; q.onchange = () => { settings.quality = q.value; saveSettings(); R.pixel = q.value === 'low' ? 0.7 : q.value === 'high' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.25); R.renderer.setPixelRatio(R.pixel); R.resize(); };
  add('Resolution', q);
};
Ui.update = function () {
  if (Input.hit('Escape')) {
    if (G.state === 'play') { if (!G.paused) Ui.pause(); else if (performance.now() - (Ui.pausedAt || 0) > 400) Ui.resume(); }
  }
};
