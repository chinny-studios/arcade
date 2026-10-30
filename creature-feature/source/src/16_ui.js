// Creature Feature — screens: the title, choosing your monster, pause, options, controls, the title card at the
// start of a run, and THE END

const UI = (() => {
  const stack = [];
  const isMenu = (id) => ['pause', 'options', 'help', 'over'].includes(id);
  function show(id) {
    const e = $('#' + id); if (!e) return;
    e.hidden = false;
    if (!stack.includes(id)) stack.push(id);
    if (id === 'options') fillOptions();
    if (id === 'help') fillHelp();
    if (document.exitPointerLock && isMenu(id)) document.exitPointerLock();
    focusFirst(e);
  }
  function hide(id) { const e = $('#' + id); if (e) e.hidden = true; const i = stack.indexOf(id); if (i >= 0) stack.splice(i, 1); const t = top(); if (t) focusFirst($('#' + t)); }
  const top = () => stack[stack.length - 1];
  function back() { const t = top(); if (!t || t === 'over') return; hide(t); if (!top() && document.body.dataset.state === 'play' && !DEBUG) Input.lock(); }
  const paused = () => stack.some(isMenu);
  function focusFirst(e) { if (Input.mode !== 'pad') return; const b = e.querySelector('button:not([disabled]), .card'); if (b) b.focus(); }
  function update() {
    const n = Input.navPad();
    const t = top() || (document.body.dataset.state === 'select' ? 'select' : document.body.dataset.state === 'title' ? 'title' : null);
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
    document.body.dataset.state = 'title';
    $('#title').hidden = false; $('#select').hidden = true;
    if (P) { R.scene.remove(P.M.root); P = null; }
    G.over = false;
    AUDIO.music(false);
    hidePreview();
    if (document.exitPointerLock) document.exitPointerLock();
    if (!PEOPLE.list.length) { resetTown(); populate(); }
    focusFirst($('#title'));
  }
  function toSelect() {
    for (const id of stack.slice()) hide(id);
    if (P) { R.scene.remove(P.M.root); P = null; }
    document.body.dataset.state = 'select';
    $('#title').hidden = true; $('#select').hidden = false;
    const cards = $('#cards'); cards.innerHTML = '';
    for (const id of MONSTER_ORDER) {
      const D = MONSTERS[id], best = SAVE.best[id] || 0;
      const bar = (n) => '<i class="on"></i>'.repeat(n) + '<i></i>'.repeat(5 - n);
      const c = el('div', 'card', `<div class="ck">${esc(D.kind)}</div><h3>${esc(D.name)}</h3><div class="tagl">${esc(D.tag)}</div>
        <div class="stats">${Object.entries(D.stats).map(([k, v]) => `<div><span>${k}</span><b>${bar(v)}</b></div>`).join('')}</div>
        <ul><li><b>${esc(D.attack.name)}</b></li><li><b>${esc(D.a1.name)}</b>: ${esc(D.a1.desc)}</li><li><b>${esc(D.a2.name)}</b>: ${esc(D.a2.desc)}</li></ul>
        <div class="best">${best ? 'Best: ' + fmtNum(best) : 'Not yet unleashed'}</div>`);
      c.tabIndex = 0; c.dataset.id = id;
      c.addEventListener('mouseenter', () => pickCard(id));
      c.addEventListener('focus', () => pickCard(id));
      c.addEventListener('click', () => { if (SELECT.id === id || Input.mode !== 'touch') begin(id); else pickCard(id); });
      cards.appendChild(c);
    }
    pickCard(SELECT.id || 'vampire');
    focusFirst($('#select'));
  }
  const SELECT = { id: null };
  function pickCard(id) {
    SELECT.id = id;
    for (const c of $$('#cards .card')) c.classList.toggle('sel', c.dataset.id === id);
    showPreview(id);
    $('#goBtn').textContent = 'Unleash ' + MONSTERS[id].name;
    $('#selBlurb').textContent = MONSTERS[id].blurb;
  }
  function begin(id) {
    $('#select').hidden = true;
    startRun(id);
    if (!DEBUG && Input.mode === 'kbm') Input.lock();
  }
  // ---------- the title card ----------
  function intro(id) {
    const D = MONSTERS[id], e = $('#intro');
    $('#introA').textContent = D.name.toUpperCase();
    $('#introB').textContent = pick(D.films);
    $('#tip').hidden = true;
    e.hidden = false; e.classList.remove('fade'); void e.offsetWidth; e.classList.add('fade');
    setTimeout(() => { e.hidden = true; }, 4200);
    if (OPTS.tips) {
      const k = HUD.keyNames(), touch = Input.mode === 'touch';
      const mv = touch ? 'Left thumb to move, drag to look' : Input.mode === 'pad' ? 'Left stick to move, right stick to look' : 'WASD to move, mouse to look';
      const tips = {
        vampire: `${mv}. <b>${k.atk || 'BITE'}</b> to bite, <b>${k.a1 || 'HYPNO'}</b> to hypnotise who you're looking at, <b>${k.a2 || 'BAT'}</b> to become a bat. Stay in the dark: lamplight gives you away.`,
        werewolf: `${mv}. Hold <b>${touch ? 'RUN' : Input.mode === 'pad' ? 'B' : 'Shift'}</b> to run on all fours. <b>${k.a1 || 'POUNCE'}</b> leaps at whoever you aim at, <b>${k.a2 || 'HOWL'}</b> freezes everyone near you.`,
        frank: `${mv}. You're slow: <b>${k.a2 || 'STOMP'}</b> knocks everyone down, <b>${k.a1 || 'GRAB'}</b> picks up cars, bins, people and the road itself, then throws them.`,
        mummy: `${mv}. <b>${k.a1 || 'LASH'}</b> reels in whoever you aim at from 24 m. <b>${k.a2 || 'SAND'}</b> raises a sandstorm that blinds everyone in it.`,
      };
      setTimeout(() => { if (P && !G.over) HUD.tip(tips[id] + ` Hold <b>${touch ? 'SENSE' : Input.mode === 'pad' ? 'Y' : 'V'}</b> to sense your prey through walls. Kills and feeding (<b>${k.use || 'USE'}</b> on a body) keep the hunger away.`, 14); }, 3800);
    }
  }
  // ---------- THE END ----------
  function gameOver() {
    const D = MONSTERS[G.monster];
    $('#overStats').innerHTML = `<div><span>Score</span><b>${fmtNum(G.score)}</b></div><div><span>Victims</span><b>${G.kills}</b></div><div><span>Best combo</span><b>×${G.bestCombo}</b></div><div><span>Fed</span><b>${G.fed}</b></div><div><span>Got away</span><b>${G.escaped}</b></div><div><span>Survived</span><b>${fmtTime(G.t)}</b></div>`;
    $('#overBest').textContent = G.newBest ? 'A new record for ' + D.name + '!' : 'Best for ' + D.name + ': ' + fmtNum(SAVE.best[G.monster] || 0);
    $('#overLine').textContent = pick(['...or is it?', 'The town will never forget.', 'Pine Hollow sleeps. For now.', 'Coming soon to a drive-in near you.']);
    $('#tip').hidden = true;
    show('over');
  }
  // ---------- options and help ----------
  function fillOptions() {
    const o = $('#optList');
    o.innerHTML = `
      <label>Graphics</label><select data-o="quality"><option value="low">Low</option><option value="med">Medium</option><option value="high">High</option></select>
      <label>Look sensitivity</label><input type="range" data-o="sens" min="0.3" max="2.5" step="0.1">
      <label>Invert look</label><input type="checkbox" data-o="invert">
      <label>Field of view</label><input type="range" data-o="fov" min="55" max="95" step="1">
      <label>Volume</label><input type="range" data-o="vol" min="0" max="1" step="0.05">
      <label>Music</label><input type="range" data-o="music" min="0" max="1" step="0.05">
      <label>Blood</label><select data-o="gore"><option value="full">Full</option><option value="mild">Less</option></select>
      <label>Film grain</label><input type="checkbox" data-o="grain">
      <label>Tips</label><input type="checkbox" data-o="tips">`;
    for (const i of $$('[data-o]', o)) {
      const k = i.dataset.o;
      if (i.type === 'checkbox') i.checked = !!OPTS[k]; else i.value = OPTS[k];
      i.addEventListener('input', () => { OPTS[k] = i.type === 'checkbox' ? i.checked : i.type === 'range' ? +i.value : i.value; applyOptions(); writeSave(); });
    }
  }
  function fillHelp() {
    const touch = Input.mode === 'touch', pad = Input.mode === 'pad';
    const rows = touch ? [['Left thumb', 'Move'], ['Drag right side', 'Look'], ['Big red button', 'Attack'], ['Power buttons', 'Your two powers'], ['RUN / SNEAK', 'Toggle running or stalking'], ['USE', 'Feed on a body, break in, beckon'], ['SENSE', 'Hold to see prey through walls']]
      : pad ? [['Left stick', 'Move'], ['Right stick', 'Look'], ['RT', 'Attack'], ['LT / RB', 'Powers'], ['A', 'Jump (climb as a bat)'], ['B or L3 (hold)', 'Run'], ['LB or R3 (hold)', 'Stalk (dive as a bat)'], ['X', 'Feed, break in, beckon'], ['Y (hold)', 'Sense prey'], ['Start', 'Pause']]
        : [['WASD', 'Move'], ['Mouse', 'Look'], ['Left click', 'Attack'], ['Right click / R', 'First power'], ['Q', 'Second power'], ['Space', 'Jump (climb as a bat)'], ['Shift (hold)', 'Run'], ['C / Ctrl (hold)', 'Stalk quietly (dive as a bat)'], ['F / E', 'Feed on a body, break in, beckon'], ['V / Tab (hold)', 'Sense prey through walls'], ['Mouse wheel', 'Camera distance'], ['Esc / P', 'Pause']];
    $('#keys').innerHTML = rows.map(([a, b]) => `<b>${a}</b><span>${b}</span>`).join('');
  }
  function wire() {
    $('#btnHunt').onclick = toSelect;
    $('#btnOptions').onclick = () => show('options');
    $('#btnHelp').onclick = () => show('help');
    $('#goBtn').onclick = () => begin(SELECT.id || 'vampire');
    $('#selBack').onclick = toTitle;
    $('#resume').onclick = back;
    $('#pOptions').onclick = () => show('options');
    $('#pHelp').onclick = () => show('help');
    $('#pQuit').onclick = () => { if (P && !G.over) { G.over = true; } toTitle(); };
    $('#optBack').onclick = () => hide('options');
    $('#helpBack').onclick = () => hide('help');
    $('#again').onclick = () => { hide('over'); begin(G.monster); };
    $('#other').onclick = () => { hide('over'); toSelect(); };
    $('#overTitle').onclick = () => { hide('over'); toTitle(); };
    $('#hudPause').onclick = () => show('pause');
    bus.on('lock', (l) => { if (!l && document.body.dataset.state === 'play' && !G.over && !paused() && !DEBUG && Input.mode === 'kbm') show('pause'); });
  }
  return { show, hide, top, back, paused, update, toTitle, toSelect, intro, gameOver, wire, isOpen: (id) => stack.includes(id) };
})();
function applyOptions() {
  if (R.renderer) resize();
  document.body.classList.toggle('grain', !!OPTS.grain);
}
