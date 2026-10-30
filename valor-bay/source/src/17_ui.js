// Valor Bay — screens: the title over the city, choosing a hero (with the hero posing on the plaza), pause, switching
// hero mid-patrol, options and controls

const PREVIEW = { M: null, id: null };
const UI = (() => {
  const stack = [];
  const isMenu = (id) => ['pause', 'options', 'help', 'heroes'].includes(id);
  function show(id) {
    const e = $('#' + id); if (!e) return;
    e.hidden = false;
    if (!stack.includes(id)) stack.push(id);
    if (id === 'options') fillOptions();
    if (id === 'help') fillHelp();
    if (id === 'heroes') fillCards($('#hcards'), G.heroId, (hid) => { hide('heroes'); switchHero(hid); });
    if (document.exitPointerLock && isMenu(id)) document.exitPointerLock();
    focusFirst(e);
  }
  function hide(id) { const e = $('#' + id); if (e) e.hidden = true; const i = stack.indexOf(id); if (i >= 0) stack.splice(i, 1); const t = top(); if (t) focusFirst($('#' + t)); }
  const top = () => stack[stack.length - 1];
  function back() { const t = top(); if (!t) return; hide(t); if (!top() && document.body.dataset.state === 'play' && !DEBUG) Input.lock(); }
  const paused = () => stack.some(isMenu);
  const blockInput = () => paused();
  function focusFirst(e) { if (Input.mode !== 'pad') return; const b = e.querySelector('button:not([disabled]), .card'); if (b) b.focus(); }
  function update() {
    const n = Input.navPad();
    const st = document.body.dataset.state;
    const t = top() || (st === 'select' ? 'select' : st === 'title' ? 'title' : null);
    if (!t) return;
    const items = $$('#' + t + ' button:not([disabled]), #' + t + ' .card, #' + t + ' select, #' + t + ' input').filter((x) => x.offsetParent);
    if (!items.length) return;
    let i = items.indexOf(document.activeElement);
    if (n.down || n.right) { i = (i + 1) % items.length; items[i].focus(); }
    if (n.up || n.left) { i = (i - 1 + items.length) % items.length; items[i].focus(); }
    if (n.ok && i >= 0) items[i].click();
    if (n.back) { if (t === 'select') toTitle(); else if (top()) back(); }
  }
  // ---------- title and select ----------
  function toTitle() {
    for (const id of stack.slice()) hide(id);
    if (P) { endPatrol(); despawnHero(); }
    document.body.dataset.state = 'title';
    $('#title').hidden = false; $('#select').hidden = true;
    hidePreview(); AUDIO.music(false); HUD.toggleMap(false);
    if (document.exitPointerLock) document.exitPointerLock();
    focusFirst($('#title'));
  }
  function fillCards(host, sel, onGo) {
    host.innerHTML = '';
    for (const id of HERO_ORDER) {
      const D = HEROES[id], best = SAVE.best[id] || 0;
      const bar = (n) => '<i class="on"></i>'.repeat(n) + '<i></i>'.repeat(5 - n);
      const c = el('div', 'card', `<div class="ck">${esc(D.kind)}</div><h3 style="color:${D.color}">${esc(D.name)}</h3><div class="tagl">${esc(D.tag)}</div>
        <div class="stats">${Object.entries(D.stats).map(([k, v]) => `<div><span>${k}</span><b>${bar(v)}</b></div>`).join('')}</div>
        <ul><li><b>${esc(D.travel.name)}</b></li><li><b>${esc(D.rmb.name)}</b>, <b>${esc(D.q.name)}</b>, <b>${esc(D.e.name)}</b></li><li>Ultimate: <b>${esc(D.r.name)}</b></li></ul>
        <div class="best">${best ? 'Best patrol: ' + fmtNum(best) : 'Never suited up'}</div>`);
      c.tabIndex = 0; c.dataset.id = id;
      if (id === sel) c.classList.add('sel');
      c.addEventListener('mouseenter', () => { if (host.id === 'cards') pickCard(id); });
      c.addEventListener('focus', () => { if (host.id === 'cards') pickCard(id); });
      c.addEventListener('click', () => { if (host.id === 'cards' && PREVIEW.id !== id) pickCard(id); else onGo(id); });
      c.addEventListener('dblclick', () => onGo(id));
      host.appendChild(c);
    }
  }
  function toSelect() {
    for (const id of stack.slice()) hide(id);
    document.body.dataset.state = 'select';
    $('#title').hidden = true; $('#select').hidden = false;
    fillCards($('#cards'), SAVE.hero, (id) => go(id));
    pickCard(SAVE.hero || 'spindle');
    focusFirst($('#select'));
  }
  function pickCard(id) {
    for (const c of $$('#cards .card')) c.classList.toggle('sel', c.dataset.id === id);
    $('#selBlurb').textContent = HEROES[id].blurb;
    showPreview(id);
  }
  function go(id) {
    hidePreview();
    $('#select').hidden = true;
    startPatrol(id || PREVIEW.id || 'spindle');
    if (!DEBUG) Input.lock();
  }
  // ---------- pause and options ----------
  function fillOptions() {
    const L2 = $('#optList'); L2.innerHTML = '';
    const sel = (k, label, opts) => { const r = el('div', '', `<label>${label}</label>`); const s = el('select'); for (const [v, n] of opts) { const o = el('option', '', n); o.value = v; if (String(OPTS[k]) === String(v)) o.selected = true; s.appendChild(o); } s.addEventListener('change', () => { OPTS[k] = typeof OPTS[k] === 'number' ? +s.value : s.value; applyOptions(); writeSave(); }); L2.append(r.firstChild, s); };
    const rng = (k, label, a, b, st) => { const lab = el('label', '', label); const s = el('input'); s.type = 'range'; s.min = a; s.max = b; s.step = st; s.value = OPTS[k]; s.addEventListener('input', () => { OPTS[k] = +s.value; applyOptions(); writeSave(); }); L2.append(lab, s); };
    const chk = (k, label) => { const lab = el('label', '', label); const s = el('input'); s.type = 'checkbox'; s.checked = !!OPTS[k]; s.addEventListener('change', () => { OPTS[k] = s.checked; applyOptions(); writeSave(); }); L2.append(lab, s); };
    sel('quality', 'Graphics', [['low', 'Low (no ink lines)'], ['med', 'Medium'], ['high', 'High']]);
    chk('outline', 'Comic ink lines and dots');
    sel('time', 'Time of day', [['cycle', 'Day and night'], ['day', 'Always day'], ['sunset', 'Always sunset'], ['night', 'Always night']]);
    rng('fov', 'Field of view', 55, 95, 1);
    rng('sens', 'Look sensitivity', 0.3, 2.5, 0.05);
    chk('invert', 'Invert look up/down');
    chk('shake', 'Screen shake');
    rng('vol', 'Volume', 0, 1, 0.05);
    rng('music', 'Music', 0, 1, 0.05);
    chk('tips', 'Show tips');
  }
  function fillHelp() {
    const pad = Input.mode === 'pad';
    const rows = [
      ['Move / look', pad ? 'Left stick / right stick' : 'WASD / mouse'], ['Jump (twice for a flip)', pad ? 'A' : 'Space'], ['Dodge / dive / drop off a wall', pad ? 'B' : 'C'],
      ['Travel power', pad ? 'RT (hold)' : 'Shift (hold)'], ['Attack (free-flow combos)', pad ? 'X' : 'Left click'], ['Ranged power', pad ? 'Y' : 'Right click'],
      ['Power 1 / power 2', pad ? 'LB / RB' : 'Q / E'], ['Ultimate (full hero meter)', pad ? 'LT' : 'R'], ['Map', pad ? 'Back' : 'M or Tab'], ['Switch hero', pad ? 'D-pad up' : 'H'], ['Pause', pad ? 'Start' : 'Esc or P'], ['Zoom', 'Mouse wheel'],
    ];
    $('#keys').innerHTML = rows.map(([a, b]) => `<b>${esc(b)}</b><span>${esc(a)}</span>`).join('');
    const D = P ? P.D : HEROES[SAVE.hero || 'spindle'];
    $('#heroHelp').innerHTML = `<h3 style="color:${D.color}">${esc(D.name)}</h3><p><b>${esc(D.travel.name)}:</b> ${esc(D.travel.desc)}</p>` +
      ['rmb', 'q', 'e', 'r'].map((k) => `<p><b>${esc(D[k].name)}:</b> ${esc(D[k].desc)}</p>`).join('');
  }
  function wire() {
    $('#btnPatrol').addEventListener('click', toSelect);
    $('#btnOptions').addEventListener('click', () => show('options'));
    $('#btnHelp').addEventListener('click', () => show('help'));
    $('#selBack').addEventListener('click', toTitle);
    $('#goBtn').addEventListener('click', () => go(PREVIEW.id));
    $('#resume').addEventListener('click', back);
    $('#pHero').addEventListener('click', () => { hide('pause'); show('heroes'); });
    $('#pOptions').addEventListener('click', () => show('options'));
    $('#pHelp').addEventListener('click', () => show('help'));
    $('#pQuit').addEventListener('click', toTitle);
    $('#optBack').addEventListener('click', back);
    $('#helpBack').addEventListener('click', back);
    $('#heroesBack').addEventListener('click', back);
    $('#mapClose').addEventListener('click', () => HUD.toggleMap(false));
    bus.on('lock', (on) => { if (!on && document.body.dataset.state === 'play' && !paused() && !DEBUG) show('pause'); });
  }
  return { show, hide, back, top, paused, blockInput, update, toTitle, toSelect, wire, go };
})();
function switchHero(id) {
  if (!P) return;
  const at = { x: P.x, y: P.y, z: P.z, yaw: P.yaw };
  if (P.mode === 'swing' || P.mode === 'wall' || P.mode === 'fly' || !P.onGround) at.y = supportY(P.x, P.z, P.y);
  startPatrol(id, { at, keepCity: true });
  burst('spark', P.x, P.y + 1, P.z, 40, { speed: 8, life: 0.6, size: 1, col: [0xffffff, 0xffd820] });
  ring(P.x, P.y + 0.1, P.z, { r0: 0.5, r1: 6, life: 0.5 });
  if (!DEBUG) Input.lock();
}
// the select screen: the chosen hero posing on the plaza at golden hour
function showPreview(id) {
  if (PREVIEW.id === id && PREVIEW.M) return;
  hidePreview();
  const D = HEROES[id];
  PREVIEW.M = buildRig(partsOf(id, D.look), D.build, { glowHands: id === 'equinox' });
  // on the south edge of a mid-height roof near downtown, facing out over the city
  if (!PREVIEW.spot) {
    const lot = CITY.lots.filter((l) => l.h > 38 && l.h < 80 && l.x1 - l.x0 > 14).sort((a, b) => dist2((a.x0 + a.x1) / 2, a.z1, 0, 60) - dist2((b.x0 + b.x1) / 2, b.z1, 0, 60))[0];
    PREVIEW.spot = { x: (lot.x0 + lot.x1) / 2, y: lot.h, z: lot.z1 - 2.2 };
  }
  const S = PREVIEW.spot;
  PREVIEW.M.root.position.set(S.x, S.y + D.build.h * 0.55, S.z);
  PREVIEW.M.root.rotation.y = Math.PI;
  R.scene.add(PREVIEW.M.root);
  PREVIEW.id = id; PREVIEW.t = 0;
}
function hidePreview() { if (PREVIEW.M) { disposeRig(PREVIEW.M); PREVIEW.M = null; PREVIEW.id = null; } }
function applyOptions() {
  R.camera.fov = OPTS.fov; resize();
  if (OPTS.time !== 'cycle') G.tod = { day: 11, sunset: 18.3, night: 22.5 }[OPTS.time];
  document.body.classList.toggle('noshake', !OPTS.shake);
}
