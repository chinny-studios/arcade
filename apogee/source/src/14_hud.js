// 14_hud: the in-game HUD is drawn on a 480-line canvas laid over the picture (so it softens with the frame like
// the cartridge's), and the menus are DOM screens: title, mission dossiers, briefing, the wristwatch pause menu and
// the debrief. Every screen can be driven by mouse, arrow keys + Enter/Esc, or a gamepad (d-pad/stick, A, B).
const HUD = { msgs: [], hurt: 0, flash: 0, showBars: 0, hurtDir: null, ctx: null };

function hudMsg(text, big) {
  HUD.msgs.push({ text, t: 0, big: !!big });
  if (HUD.msgs.length > 4) HUD.msgs.shift();
}
function drawHud(dt) {
  const cv = hudCanvas, c = HUD.ctx || (HUD.ctx = cv.getContext('2d'));
  const W = cv.width, H = cv.height, p = G.player;
  c.clearRect(0, 0, W, H);
  HUD.hurt = Math.max(0, HUD.hurt - dt * 1.6); HUD.flash = Math.max(0, HUD.flash - dt * 2.5); HUD.showBars -= dt;
  if (HUD.hurt > 0) { c.fillStyle = 'rgba(190,0,0,' + (HUD.hurt * 0.45) + ')'; c.fillRect(0, 0, W, H); }
  if (HUD.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(1, HUD.flash * 2) + ')'; c.fillRect(0, 0, W, H); }
  if (!p) return;
  const Wp = curWeapon();
  c.textBaseline = 'alphabetic';
  // scope for the zoomed rifles
  if (p.aiming && Wp.zoom >= 2) {
    c.fillStyle = '#000';
    c.beginPath(); c.rect(0, 0, W, H); c.arc(W / 2, H / 2, H * 0.42, 0, TAU, true); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(W / 2 - H * 0.42, H / 2); c.lineTo(W / 2 + H * 0.42, H / 2); c.moveTo(W / 2, H / 2 - H * 0.42); c.lineTo(W / 2, H / 2 + H * 0.42); c.stroke();
  }
  // crosshair
  const showCross = !p.dead && (p.aimMode || p.aiming || SET.sight === 'always') && !(p.aiming && Wp.zoom >= 2);
  if (showCross) {
    const x = W / 2 + (p.aimMode ? p.aimX * W / 2 : 0), y = H / 2 - (p.aimMode ? p.aimY * H / 2 : 0);
    const r = p.aimMode ? 9 : 6;
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 3; crossAt(c, x, y, r);
    c.strokeStyle = p.aimMode ? '#ff4030' : 'rgba(255,235,200,.9)'; c.lineWidth = 1.5; crossAt(c, x, y, r);
  }
  // health & armour arcs: shown when hurt (and always while low)
  if ((HUD.showBars > 0 || p.hp < 30) && !p.dead) {
    const a = HUD.showBars > 0 ? Math.min(1, HUD.showBars) : 0.6;
    arcBar(c, W * 0.12, H * 0.5, H * 0.33, p.hp / 100, '#ff5a30', a, -1);
    arcBar(c, W * 0.88, H * 0.5, H * 0.33, p.armor / 100, '#4aa8ff', a, 1);
  }
  // ammo
  c.font = '14px Michroma, sans-serif'; c.textAlign = 'right';
  const ax = W - 22, ay = H - 26;
  if (Wp.mag) {
    const m = p.mag[Wp.id] || 0, res = p.ammo[Wp.ammo] || 0;
    shadowText(c, String(res), ax, ay - 34, '#f0e0b0');
    const n = Wp.mag, cols = n > 12 ? Math.ceil(n / 2) : n, bw = n > 12 ? 4 : 6;
    for (let k = 0; k < n; k++) {
      const row = n > 12 ? (k < cols ? 0 : 1) : 0, col = n > 12 ? k % cols : k;
      const x = ax - (col + 1) * (bw + 2), y = ay - 22 + row * 12;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x + 1, y + 1, bw, 10);
      c.fillStyle = k < m ? (Wp.ammo === 'cell' ? '#7ff' : '#e8c060') : 'rgba(120,120,120,.35)';
      c.fillRect(x, y, bw, 10);
      if (k < m) { c.fillStyle = Wp.ammo === 'cell' ? '#cff' : '#fff2c0'; c.fillRect(x, y, bw, 2); }
    }
  } else if (Wp.thrown) shadowText(c, (p.ammo.mines || 0) + ' left' + (MINES.list.length ? '  ·  ' + MINES.list.length + ' set (F)' : ''), ax, ay, '#f0e0b0');
  else if (Wp.id === 'bug') shadowText(c, p.bugs + ' left', ax, ay, '#f0e0b0');
  c.font = '10px Michroma, sans-serif';
  if (p.switchT <= 0) shadowText(c, Wp.name.toUpperCase(), ax, ay + 16, 'rgba(240,230,200,.8)');
  if (p.reloadT > 0) { c.textAlign = 'center'; shadowText(c, 'RELOADING', W / 2, H * 0.62, '#f0e0b0'); }
  // messages
  c.textAlign = 'center';
  let my = H - 40;
  for (let k = HUD.msgs.length - 1; k >= 0; k--) {
    const m = HUD.msgs[k];
    m.t += dt;
    const life = m.big ? 4.5 : 3, alpha = clamp((life - m.t) * 2, 0, 1);
    if (alpha <= 0) { HUD.msgs.splice(k, 1); continue; }
    c.globalAlpha = alpha;
    c.font = (m.big ? '15px' : '12px') + ' Michroma, sans-serif';
    shadowText(c, m.text, W / 2, my, m.big ? '#ffd870' : '#f4ecd8');
    my -= m.big ? 22 : 18;
  }
  c.globalAlpha = 1;
  // use prompt and progress
  if (!p.dead && G.state === 'play') {
    if (p.use) {
      const t = p.use.t / p.use.len;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(W / 2 - 80, H * 0.66, 160, 10);
      c.fillStyle = '#7fdc8a'; c.fillRect(W / 2 - 79, H * 0.66 + 1, 158 * t, 8);
      c.font = '11px Michroma, sans-serif'; shadowText(c, p.use.ob.type === 'download' ? 'DOWNLOADING' : 'WORKING', W / 2, H * 0.66 - 6, '#d8f0d8');
    } else {
      HUD.useT = (HUD.useT || 0) - dt;
      if (HUD.useT <= 0) { HUD.useT = 0.15; HUD.use = useTarget(); }
      if (HUD.use) { c.font = '11px Michroma, sans-serif'; shadowText(c, (INPUT.lastPad && performance.now() - INPUT.lastPad < 4000 ? '[A] ' : '[E] ') + HUD.use.text, W / 2, H * 0.62, '#f4ecd8'); }
    }
  }
  // alarm
  if (G.alarm && G.alarm.on && (G.time * 2 % 1) < 0.6) { c.font = '13px Michroma, sans-serif'; c.textAlign = 'center'; shadowText(c, 'ALARM', W / 2, 28, '#ff5040'); }
}
function crossAt(c, x, y, r) {
  c.beginPath();
  c.moveTo(x - r, y); c.lineTo(x - r * 0.35, y); c.moveTo(x + r * 0.35, y); c.lineTo(x + r, y);
  c.moveTo(x, y - r); c.lineTo(x, y - r * 0.35); c.moveTo(x, y + r * 0.35); c.lineTo(x, y + r);
  c.stroke();
}
function shadowText(c, s, x, y, col) { c.fillStyle = 'rgba(0,0,0,.85)'; c.fillText(s, x + 1.5, y + 1.5); c.fillStyle = col; c.fillText(s, x, y); }
// segmented curved bar, like the cartridge's health/armour arcs
function arcBar(c, cx, cy, r, v, col, alpha, side) {
  const n = 18, span = 1.1, a0 = side < 0 ? Math.PI - span / 2 : -span / 2;
  c.globalAlpha = alpha;
  const filled = Math.round(clamp(v, 0, 1) * n);
  for (let k = 0; k < n; k++) {
    const on = (side < 0 ? k : n - 1 - k) < filled;
    const aa = a0 + span * (k + 0.1) / n, ab = a0 + span * (k + 0.9) / n;
    c.beginPath(); c.arc(side < 0 ? cx + r : cx - r, cy, r, aa, ab); c.lineWidth = 11; c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
    c.beginPath(); c.arc(side < 0 ? cx + r : cx - r, cy, r, aa, ab); c.lineWidth = 8; c.strokeStyle = on ? col : 'rgba(80,80,80,.5)'; c.stroke();
  }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- screens and menu navigation
function setState(s) {
  G.state = s;
  document.body.dataset.state = s;
  if (s !== 'play' && document.pointerLockElement) document.exitPointerLock();
  focusFirst();
}
function screenEl() { return { title: $('title'), select: $('select'), brief: $('brief'), watch: $('watch'), end: $('end') }[G.state]; }
function focusables() { const el = screenEl(); return el ? [...el.querySelectorAll('.b:not(:disabled), .folder')] : []; }
function focusFirst() {
  const f = focusables();
  const pref = f.find((e) => e.dataset.default) || f[0];
  setFocus(pref);
}
function setFocus(el) {
  for (const e of document.querySelectorAll('.focus')) e.classList.remove('focus');
  if (el) { el.classList.add('focus'); if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  UI.focus = el;
}
const UI = { focus: null, briefTab: 'background', watchTab: 'obj', pick: null };
function moveFocus(dx, dy) {
  const f = focusables();
  if (!f.length) return;
  const cur = UI.focus && f.includes(UI.focus) ? UI.focus : null;
  if (!cur) { setFocus(f[0]); return; }
  const r0 = cur.getBoundingClientRect(), c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
  let best = null, bs = 1e9;
  for (const e of f) {
    if (e === cur) continue;
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ddx = cx - c0[0], ddy = cy - c0[1];
    const along = dx ? ddx * dx : ddy * dy, across = dx ? Math.abs(ddy) : Math.abs(ddx);
    if (along <= 2) continue;
    const s = along + across * 2.5;
    if (s < bs) { bs = s; best = e; }
  }
  if (best) { setFocus(best); sfx('menu'); }
}
function uiKey(e) {
  if (G.state === 'play') {
    if (BIND.watch.includes(e.code) && !G.player.dead) { e.preventDefault(); openWatch(); }
    return;
  }
  if (G.state === 'boot') return;
  const k = e.code;
  if (k === 'ArrowUp' || k === 'KeyW') moveFocus(0, -1);
  else if (k === 'ArrowDown' || k === 'KeyS') moveFocus(0, 1);
  else if (k === 'ArrowLeft' || k === 'KeyA') moveFocus(-1, 0);
  else if (k === 'ArrowRight' || k === 'KeyD') moveFocus(1, 0);
  else if (k === 'Enter' || k === 'Space') { e.preventDefault(); if (G.state === 'title') toSelect(); else if (UI.focus) UI.focus.click(); }
  else if (k === 'Escape' || k === 'Backspace' || (k === 'Tab' && G.state === 'watch')) { e.preventDefault(); uiBack(); }
}
function uiBack() {
  sfx('menu');
  if (G.state === 'select') { if (!$('diffs').hidden) { $('diffs').hidden = true; focusFirst(); } else setState('title'); }
  else if (G.state === 'brief') toSelect();
  else if (G.state === 'watch') closeWatch();
}
function pollMenuPad() {
  const pad = pollPad();
  if (!pad) return;
  const st = UI.padNav || (UI.padNav = { t: 0 });
  const dx = pad.b[14] ? -1 : pad.b[15] ? 1 : Math.abs(pad.lx) > 0.6 ? Math.sign(pad.lx) : 0;
  const dy = pad.b[12] ? -1 : pad.b[13] ? 1 : Math.abs(pad.ly) > 0.6 ? Math.sign(pad.ly) : 0;
  const now = performance.now();
  if ((dx || dy) && now > st.t) { st.t = now + 220; if (dy) moveFocus(0, dy); else moveFocus(dx, 0); }
  if (!dx && !dy) st.t = 0;
  if (pad.tap(0) || pad.tap(9)) { initAudio(); if (G.state === 'title') toSelect(); else if (G.state === 'watch' && pad.tap(9)) closeWatch(); else if (UI.focus) UI.focus.click(); }
  if (pad.tap(1)) uiBack();
}

// ---------------------------------------------------------------- title and mission select
function toTitle() { setState('title'); showTitleScene(); playMusic('title'); }
function toSelect() {
  initAudio(); sfx('menuOk');
  if (G.state !== 'select' && G.state !== 'brief') showTitleScene();
  const box = $('folders'); box.innerHTML = '';
  MISSIONS.forEach((M, i) => {
    const locked = i >= SAVE.unlocked && !G.unlockAll;
    const el = document.createElement('button');
    el.className = 'folder' + (locked ? ' locked' : '');
    const stamps = DIFFS.map((d, k) => SAVE.done[i + '_' + k] ? '<b>✓</b> ' + d + ' ' + fmtTime(SAVE.best[i + '_' + k]) : '· ' + d).join('<br>');
    el.innerHTML = `<div class="num">MISSION ${i + 1}</div><div class="nm">${locked ? '' : M.name}</div><div class="pl">${locked ? '' : M.place}</div><div class="stamp">${locked ? '' : stamps}</div>`;
    el.onclick = () => { if (locked) { sfx('deny'); return; } chooseMission(i); };
    el.onmouseenter = () => setFocus(el);
    box.appendChild(el);
  });
  $('diffs').hidden = true;
  setState('select');
  playMusic('title');
}
function chooseMission(i) {
  UI.pick = i; sfx('menuOk');
  const box = $('diffs'); box.innerHTML = ''; box.hidden = false;
  DIFFS.forEach((d, k) => {
    const b = document.createElement('button'); b.className = 'b'; b.textContent = d;
    b.onclick = () => openBrief(i, k); b.onmouseenter = () => setFocus(b);
    if (k === 0) b.dataset.default = 1;
    box.appendChild(b);
  });
  setFocus(box.firstChild);
  [...$('folders').children].forEach((f, k) => f.style.opacity = k === i ? 1 : 0.45);
}
function openBrief(i, d) {
  sfx('menuOk');
  UI.pick = i; UI.diff = d; UI.briefTab = 'background';
  const M = MISSIONS[i];
  $('bname').textContent = 'Mission ' + (i + 1) + ': ' + M.name;
  $('bmeta').textContent = M.place + '  ·  ' + DIFFS[d];
  const tabs = $('tabs'); tabs.innerHTML = '';
  for (const [k, label] of [['background', 'Background'], ['control', 'Control'], ['quarter', 'Quartermaster']]) {
    const b = document.createElement('button'); b.className = 'b'; b.textContent = label; b.dataset.tab = k;
    b.onclick = () => { UI.briefTab = k; renderBrief(); sfx('menu'); }; b.onmouseenter = () => setFocus(b);
    tabs.appendChild(b);
  }
  $('bobj').innerHTML = M.objectives.filter((o) => o.diffs.includes(d)).map((o, k) => `<li>${'abcdefg'[k]}. ${o.text}</li>`).join('');
  $('baccept').onclick = () => beginMission(i, d);
  $('baccept').dataset.default = 1;
  $('bback').onclick = () => toSelect();
  renderBrief();
  setState('brief');
}
function renderBrief() {
  const M = MISSIONS[UI.pick];
  $('btext').textContent = M.brief[UI.briefTab];
  for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.tab === UI.briefTab);
}
function beginMission(i, d) {
  initAudio(); sfx('menuOk');
  setState('boot'); $('boot').textContent = 'LOADING';
  setTimeout(() => {
    startMission(i, d);
    setState('play');
    hudMsg(MISSIONS[i].name.toUpperCase(), true);
    if (!DEBUG) requestLock();
  }, 30);
}

// ---------------------------------------------------------------- the watch (pause)
function openWatch() {
  if (G.state !== 'play' || G.ended) return;
  sfx('menuOk');
  UI.watchTab = UI.watchTab || 'obj';
  renderWatch();
  setState('watch');
}
function closeWatch() {
  writeSave();
  setState('play');
  if (!DEBUG) requestLock();
}
function renderWatch() {
  const p = G.player;
  $('wh').style.width = 'calc(var(--u) * ' + Math.round(p.hp * 1.1) + ')';
  $('wa').style.width = 'calc(var(--u) * ' + Math.round(p.armor * 1.1) + ')';
  const tabs = $('wtabs'); tabs.innerHTML = '';
  for (const [k, label] of [['obj', 'MISSION'], ['inv', 'INVENTORY'], ['opt', 'OPTIONS'], ['quit', 'ABORT']]) {
    const b = document.createElement('button'); b.className = 'b' + (UI.watchTab === k ? ' on' : ''); b.textContent = label;
    b.onclick = () => { UI.watchTab = k; renderWatch(); sfx('menu'); setFocus([...$('wtabs').children].find((e) => e.textContent === label)); };
    b.onmouseenter = () => setFocus(b);
    tabs.appendChild(b);
  }
  const body = $('wbody'); body.innerHTML = '';
  const line = (html, cls) => { const d = document.createElement('div'); d.className = cls || ''; d.innerHTML = html; body.appendChild(d); return d; };
  const btn = (label, fn, on) => { const b = document.createElement('button'); b.className = 'b' + (on ? ' on' : ''); b.innerHTML = label; b.onclick = fn; b.onmouseenter = () => setFocus(b); body.appendChild(b); return b; };
  if (UI.watchTab === 'obj') {
    line(MISSIONS[G.mission].name + ' · ' + DIFFS[G.diff] + ' · ' + fmtTime(G.time));
    for (const o of OBJ.list) line(`<span class="${o.status === 'failed' ? 'failed' : ''}">${o.letter}. ${o.text}</span><span class="st">${o.status === 'done' ? 'Done' : o.status === 'failed' ? 'FAILED' : o.status === 'ok' ? '-' : 'Open'}</span>`, 'row2');
  } else if (UI.watchTab === 'inv') {
    p.weapons.forEach((id, k) => {
      const W = WEAPONS[id];
      const am = W.mag ? (p.mag[id] || 0) + ' / ' + (p.ammo[W.ammo] || 0) : W.thrown ? (p.ammo.mines || 0) : id === 'bug' ? p.bugs : '';
      btn(`${W.name}${am !== '' ? ' <span class="st">' + am + '</span>' : ''}`, () => { selectWeapon(k); closeWatch(); }, k === p.cur);
    });
    const items = Object.keys(p.items).filter((k) => p.items[k] && ITEMS[k]);
    if (items.length) line('Carrying: ' + items.map((k) => ITEMS[k].name).join(', '));
  } else if (UI.watchTab === 'opt') {
    optionButtons(btn, () => renderWatch());
  } else {
    btn('Abort mission', () => { stopAllLoops(); G.ended = true; toSelect(); });
    btn('Restart mission', () => { stopAllLoops(); beginMission(G.mission, G.diff); });
    btn('Back to the mission', () => closeWatch());
  }
}
function optionButtons(btn, rerender) {
  const set = (k, v) => { SET[k] = v; writeSave(); sfx('menu'); };
  const keep = (label) => () => { rerender(); const f = [...document.querySelectorAll('#wbody .b')].find((e) => e.textContent.startsWith(label)); if (f) setFocus(f); };
  const opt = (label, value, fn) => { const b = btn(label + ': ' + value, () => { fn(); keep(label)(); }); return b; };
  opt('Controls', SET.controls === 'classic' ? 'Classic (auto-aim, aim mode)' : 'Modern (mouse look)', () => set('controls', SET.controls === 'classic' ? 'modern' : 'classic'));
  opt('Look speed', SET.sens.toFixed(1), () => set('sens', SET.sens >= 2.5 ? 0.4 : Math.round((SET.sens + 0.3) * 10) / 10));
  opt('Invert look', SET.invert ? 'On' : 'Off', () => set('invert', !SET.invert));
  opt('Crosshair', SET.sight === 'always' ? 'Always' : 'When aiming', () => set('sight', SET.sight === 'always' ? 'aim' : 'always'));
  opt('Frame rate', SET.fps === 'n64' ? 'Authentic 20 fps' : 'Smooth', () => set('fps', SET.fps === 'n64' ? 'smooth' : 'n64'));
  opt('Resolution', SET.res === 'high' ? '640x480 (expansion pak)' : '320x240', () => { set('res', SET.res === 'high' ? 'low' : 'high'); applyVideoSettings(); });
  opt('Screen', SET.aspect, () => { set('aspect', SET.aspect === '4:3' ? '16:9' : '4:3'); applyVideoSettings(); });
  opt('Music', Math.round(SET.music * 10), () => { set('music', SET.music >= 1 ? 0 : Math.round((SET.music + 0.2) * 10) / 10); applyVolumes(); });
  opt('Effects', Math.round(SET.sfx * 10), () => { set('sfx', SET.sfx >= 1 ? 0 : Math.round((SET.sfx + 0.2) * 10) / 10); applyVolumes(); });
}

// ---------------------------------------------------------------- debrief
function showEnd(ok, why) {
  if (G.state === 'watch' || G.state === 'play') setState('end');
  const S = G.stats;
  $('etitle').textContent = ok ? 'MISSION COMPLETE' : 'MISSION FAILED';
  $('etitle').className = ok ? '' : 'fail';
  $('ewhy').textContent = why || (ok ? MISSIONS[G.mission].name + ' · ' + DIFFS[G.diff] : '');
  const acc = S.shots ? Math.round(S.hits / S.shots * 100) : 0;
  const key = G.mission + '_' + G.diff;
  const rows = [['Time', fmtTime(G.time) + (SAVE.best[key] ? '   (best ' + fmtTime(SAVE.best[key]) + ')' : '')], ['Kills', S.kills], ['Accuracy', acc + '%'], ['Shots fired', S.shots], ['Head hits', S.head], ['Body hits', S.body], ['Limb hits', S.limb], ['Hats', S.hat]];
  $('estats').innerHTML = rows.map(([a, b]) => `<div class="r"><span>${a}</span><b>${b}</b></div>`).join('');
  $('eobj').innerHTML = OBJ.list.map((o) => `<div class="${o.status === 'done' ? 'done' : o.status === 'failed' ? 'failed' : 'open'}">${o.letter}. ${o.text}: ${o.status === 'done' ? 'Completed' : o.status === 'failed' ? 'Failed' : 'Incomplete'}</div>`).join('');
  const b = $('ebtns'); b.innerHTML = '';
  const add = (label, fn, def) => { const e = document.createElement('button'); e.className = 'b'; e.textContent = label; e.onclick = fn; e.onmouseenter = () => setFocus(e); if (def) e.dataset.default = 1; b.appendChild(e); };
  if (ok && G.mission + 1 < MISSIONS.length) add('Next mission', () => openBrief(G.mission + 1, G.diff), true);
  add(ok ? 'Play again' : 'Retry', () => beginMission(G.mission, G.diff), !ok);
  add('Mission select', () => toSelect(), ok && G.mission + 1 >= MISSIONS.length);
  setState('end');
}
