// Valor Bay — the HUD: score, rank and combo; health and the hero meter; the four power slots with cooldowns; the
// radar and the full map (M); markers for every crime in progress; speech bubbles, floating points, "!" warnings
// over crooks about to swing; the villain's health bar; toasts, banners and tips; speed lines

const HUD = (() => {
  const bubbles = [], floats = [], warns = [], marks = [];
  let radar, rg, mapOpen = false, tipQ = [], tipT = 0, lastRank = '';
  function init() {
    radar = $('#radar'); rg = radar.getContext('2d');
    for (let i = 0; i < 10; i++) { const e = el('div', 'bubble'); e.hidden = true; $('#bubbles').appendChild(e); bubbles.push({ e, ent: null, t: 0 }); }
    for (let i = 0; i < 10; i++) { const e = el('div', 'float'); e.hidden = true; $('#floats').appendChild(e); floats.push({ e, t: 0, x: 0, y: 0, z: 0 }); }
    for (let i = 0; i < 8; i++) { const e = el('div', 'warn', '!'); e.hidden = true; $('#warns').appendChild(e); warns.push(e); }
    for (let i = 0; i < 8; i++) { const e = el('div', 'mk'); e.hidden = true; $('#marks').appendChild(e); marks.push(e); }
  }
  function reset() {
    $('#toasts').innerHTML = '';
    const D = P.D;
    $('#heroName').textContent = D.name; $('#heroName').style.color = D.color;
    $('#abil').innerHTML = '';
    for (const [k, key, pk] of [['rmb', 'RMB', 'Y'], ['q', 'Q', 'LB'], ['e', 'E', 'RB'], ['r', 'R', 'LT']]) {
      const p = D[k];
      $('#abil').insertAdjacentHTML('beforeend', `<div class="ab" id="ab_${k}"><div class="cd"></div><b><span class="kk">${key}</span><span class="pk">${pk}</span></b><span>${esc(p.name)}</span></div>`);
    }
    $('#travelHint').innerHTML = `<b><span class="kk">SHIFT</span><span class="pk">RT</span></b> ${esc(D.travel.name)}`;
    lastRank = '';
  }
  function update(dt) {
    if (!P) return;
    $('#score').textContent = fmtNum(G.score);
    const rk = rankOf(G.score);
    if (rk !== lastRank) { if (lastRank) banner('RANK UP!', '#ffd820', rk); lastRank = rk; $('#rank').textContent = rk; }
    $('#arrests').textContent = G.arrests;
    const cb = $('#combo');
    if (G.combo >= 2) { cb.hidden = false; $('#comboN').textContent = G.combo + ' HITS'; $('#comboM').textContent = '×' + comboMul().toFixed(1); $('#comboBar').style.width = (G.comboT / 3 * 100) + '%'; }
    else cb.hidden = true;
    $('#hpFill').style.width = (P.hp / P.maxHp * 100) + '%';
    $('#hpTxt').textContent = Math.ceil(P.hp);
    $('#meterFill').style.width = P.meter + '%';
    document.body.classList.toggle('ultReady', P.meter >= 100);
    document.body.classList.toggle('lowhp', P.hp < P.maxHp * 0.3 && !P.downed);
    // power slots
    const D = P.D;
    const setCd = (k, f, active) => { const e = $('#ab_' + k); if (!e) return; e.querySelector('.cd').style.height = (clamp(f, 0, 1) * 100) + '%'; e.classList.toggle('active', !!active); };
    setCd('rmb', P.cds.rmb / D.rmb.cd, P.held);
    setCd('q', P.cds.q / (D.q.cd + (P.id === 'skylark' ? 2.6 : 0)), P.beam > 0 || P.whirl > 0);
    setCd('e', P.cds.e / D.e.cd, P.lap > 0 || P.pillar);
    setCd('r', 1 - P.meter / 100, G.speedForce > 0 || P.rampage > 0 || P.zero > 0);
    $('#ab_r').classList.toggle('ready', P.meter >= 100);
    // threat and place
    $('#threatName').textContent = threatName(G.wave);
    $('#threatFill').style.width = G.wave + '%';
    $('#district').textContent = districtOf(P.x, P.z);
    // crosshair
    const at = aimTarget(70, 0.16);
    $('#cross').classList.toggle('lock', !!at);
    // speed lines
    const sp = Math.hypot(P.vx, P.vy, P.vz);
    $('#speed').style.opacity = clamp((sp - 22) / 30, 0, 0.85);
    // the villain bar
    const boss = FOES.list.find((f) => f.boss && !f.dead && dist(f.x, f.z, P.x, P.z) < 140 && (f.aggro || dist(f.x, f.z, P.x, P.z) < 90));
    $('#boss').hidden = !boss;
    if (boss) { $('#bossName').textContent = boss.V.name + ', ' + boss.V.title; $('#bossFill').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%'; }
    updateBubbles(dt); updateFloats(dt); updateWarns(); updateMarks(); drawRadar();
    if (mapOpen) drawMap();
    // tips
    tipT -= dt;
    if (tipT <= 0) { const t = tipQ.shift(); if (t) { $('#tip').innerHTML = t; $('#tip').hidden = false; tipT = 7; } else $('#tip').hidden = true; }
    const v = $('#vig'); v.style.opacity = Math.max(0, parseFloat(v.style.opacity || 0) - dt * 2);
  }
  // project a world point to the screen (null if behind)
  function proj(x, y, z) { _v1.set(x, y, z).project(R.camera); if (_v1.z > 1) return null; return [(_v1.x * 0.5 + 0.5) * R.w, (-_v1.y * 0.5 + 0.5) * R.h]; }
  function say(ent, text) {
    if (!ent || !P || dist(ent.x, ent.z, P.x, P.z) > 45) return;
    let b = bubbles.find((q) => q.ent === ent) || bubbles.find((q) => q.t <= 0) || bubbles.reduce((a, q) => (a.t < q.t ? a : q));
    b.ent = ent; b.t = 2.6; b.e.textContent = text; b.e.hidden = false;
  }
  function updateBubbles(dt) {
    for (const b of bubbles) {
      if (b.t <= 0) continue;
      b.t -= dt;
      const e = b.ent;
      if (b.t <= 0 || !e || e.dead) { b.t = 0; b.e.hidden = true; continue; }
      const p = proj(e.x, e.y + e.h + 0.5, e.z);
      if (!p) { b.e.style.opacity = 0; continue; }
      const d = dist(e.x, e.z, R.camera.position.x, R.camera.position.z);
      b.e.style.opacity = b.t < 0.4 ? b.t / 0.4 : 1;
      b.e.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -100%) scale(${clamp(14 / d, 0.55, 1.1)})`;
    }
  }
  function floatScore(at, n, mul) {
    const f = floats.find((q) => q.t <= 0) || floats.reduce((a, q) => (a.t < q.t ? a : q));
    f.t = 1.1; f.x = at.x; f.y = (at.y || 0) + (at.h || 1.8) + 1.2; f.z = at.z;
    f.e.textContent = '+' + fmtNum(n); f.e.classList.toggle('mul', mul > 1); f.e.hidden = false;
  }
  function updateFloats(dt) {
    for (const f of floats) {
      if (f.t <= 0) continue;
      f.t -= dt;
      if (f.t <= 0) { f.e.hidden = true; continue; }
      const p = proj(f.x, f.y + (1.1 - f.t) * 1.5, f.z);
      if (!p) { f.e.style.opacity = 0; continue; }
      f.e.style.opacity = f.t < 0.3 ? f.t / 0.3 : 1;
      f.e.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -50%)`;
    }
  }
  function updateWarns() {
    let i = 0;
    for (const f of FOES.list) {
      if (i >= warns.length) break;
      const w = f.boss ? f.warn : (f.state === 'windup' || f.state === 'aim') && f.tgt === P;
      if (!w || f.ko) continue;
      const p = proj(f.x, f.y + f.h + 0.9, f.z);
      if (!p) continue;
      const e = warns[i++]; e.hidden = false; e.classList.toggle('gun', f.state === 'aim'); e.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -50%)`;
    }
    for (; i < warns.length; i++) warns[i].hidden = true;
  }
  // markers for crimes in progress, pinned to the screen edge when off-screen
  function updateMarks() {
    const list = CRIME.list.filter((c) => c.state === 'active').sort((a, b) => dist2(a.x, a.z, P.x, P.z) - dist2(b.x, b.z, P.x, P.z));
    let i = 0;
    for (const c of list) {
      if (i >= marks.length) break;
      const d = dist(c.x, c.z, P.x, P.z);
      if (d < 18) continue;
      const e = marks[i++];
      _v1.set(c.x, 4, c.z).project(R.camera);
      let x = _v1.x, y = _v1.y;
      const behind = _v1.z > 1;
      if (behind) { x = -x; y = -y; }
      const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.88;
      if (off) { const k = Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.85, 1e-3); x /= k; y /= k; if (behind) { y = Math.min(y, -0.75); } }
      e.hidden = false;
      e.className = 'mk ' + (c.type === 'villain' ? 'boss' : c.type) + (off ? ' off' : '');
      e.innerHTML = `<i>${c.type === 'villain' ? '☠' : c.type === 'getaway' ? '🚗' : '!'}</i><span>${Math.round(d)} m</span>`;
      e.style.transform = `translate(${(x * 0.5 + 0.5) * R.w}px, ${(-y * 0.5 + 0.5) * R.h}px) translate(-50%, -50%)`;
    }
    for (; i < marks.length; i++) marks[i].hidden = true;
  }
  function drawRadar() {
    const S = radar.width, M = CITY.map, rng = 180, k = S / (2 * rng);
    rg.save();
    rg.clearRect(0, 0, S, S);
    rg.beginPath(); rg.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); rg.clip();
    rg.fillStyle = '#2a6ab0'; rg.fillRect(0, 0, S, S);
    rg.translate(S / 2, S / 2); rg.rotate(-CAM.yaw);
    const sx = (P.x + M.E) * M.k, sz = (P.z + M.E) * M.k, sw = rng * M.k;
    rg.drawImage(M.canvas, sx - sw, sz - sw, sw * 2, sw * 2, -S / 2, -S / 2, S, S);
    for (const c of CRIME.list) {
      if (c.state !== 'active') continue;
      let dx = (c.x - P.x) * k, dz = (c.z - P.z) * k; const l = Math.hypot(dx, dz), lim = S / 2 - 9;
      if (l > lim) { dx *= lim / l; dz *= lim / l; }
      rg.fillStyle = c.type === 'villain' ? '#b040ff' : c.type === 'getaway' ? '#ff8a20' : '#ff2a2a';
      rg.strokeStyle = '#000'; rg.lineWidth = 2;
      rg.beginPath(); rg.arc(dx, dz, c.type === 'villain' ? 7 : 5, 0, TAU); rg.fill(); rg.stroke();
    }
    for (const f of FOES.list) { if (f.ko || f.dead) continue; const dx = (f.x - P.x) * k, dz = (f.z - P.z) * k; if (Math.hypot(dx, dz) < S / 2) { rg.fillStyle = f.boss ? '#b040ff' : '#ff6a6a'; rg.fillRect(dx - 1.5, dz - 1.5, 3, 3); } }
    rg.restore();
    // the hero arrow (the map turns, so it always points up)
    rg.save(); rg.translate(S / 2, S / 2); rg.rotate(-(P.yaw - CAM.yaw));
    rg.fillStyle = P.D.color; rg.strokeStyle = '#000'; rg.lineWidth = 2;
    rg.beginPath(); rg.moveTo(0, -8); rg.lineTo(6, 6); rg.lineTo(0, 3); rg.lineTo(-6, 6); rg.closePath(); rg.fill(); rg.stroke();
    rg.restore();
    rg.strokeStyle = '#111'; rg.lineWidth = 4; rg.beginPath(); rg.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); rg.stroke();
    rg.fillStyle = '#fff'; rg.font = 'bold 12px sans-serif'; rg.textAlign = 'center';
    rg.save(); rg.translate(S / 2, S / 2); rg.rotate(-CAM.yaw); rg.fillText('N', 0, -S / 2 + 14); rg.restore();
  }
  // the full map
  function toggleMap(on = !mapOpen) { mapOpen = on; $('#map').hidden = !on; if (on) drawMap(); }
  function drawMap() {
    // the island and the piers, cropped from the map image
    const c = $('#mapC'), g = c.getContext('2d'), S = c.width, M = CITY.map, V = 480, src = V * 2 * M.k;
    g.drawImage(M.canvas, (M.E - V) * M.k, (M.E - V) * M.k, src, src, 0, 0, S, S);
    const X = (x) => (x + V) / (2 * V) * S;
    g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
    for (const l of CITY.landmarks) { g.fillStyle = '#000'; g.fillText(l.name, X(l.x) + 1, X(l.z) + 1); g.fillStyle = '#fff'; g.fillText(l.name, X(l.x), X(l.z)); }
    for (const cr of CRIME.list) {
      if (cr.state !== 'active') continue;
      g.fillStyle = cr.type === 'villain' ? '#b040ff' : cr.type === 'getaway' ? '#ff8a20' : '#ff2a2a'; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.arc(X(cr.x), X(cr.z), cr.type === 'villain' ? 10 : 7, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.fillText(cr.name, X(cr.x), X(cr.z) - 12);
    }
    g.save(); g.translate(X(P.x), X(P.z)); g.rotate(-P.yaw);
    g.fillStyle = P.D.color; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(0, 4); g.lineTo(-8, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function toast(msg, kind = 'info') {
    const t = el('div', 'toast ' + kind, esc(msg));
    $('#toasts').prepend(t);
    while ($('#toasts').children.length > 4) $('#toasts').lastChild.remove();
    setTimeout(() => t.classList.add('out'), 4200); setTimeout(() => t.remove(), 4900);
  }
  function banner(text, col = '#ffd820', sub = '') {
    const b = $('#banner');
    b.innerHTML = `<div class="bt">${esc(text)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}`;
    b.style.setProperty('--c', col);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }
  function villain(c) {
    const V = VILLAINS[c.villain];
    banner(V.name.toUpperCase() + '!', '#c050ff', `${V.title} is attacking ${c.district}!`);
    toast(`${V.name} is attacking ${c.district}!`, 'crime');
  }
  function hurt(dmg) { const v = $('#vig'); v.style.opacity = Math.min(0.9, parseFloat(v.style.opacity || 0) + dmg / 25); }
  function cooldownBlink(k) { const e = $('#ab_' + k); if (!e) return; e.classList.remove('blink'); void e.offsetWidth; e.classList.add('blink'); }
  function heroTips(id) {
    const D = HEROES[id], pad = Input.mode === 'pad';
    const k = (kb, p) => `<b>${pad ? p : kb}</b>`;
    tipQ = [
      `${k('WASD', 'Left stick')} move, ${k('Mouse', 'Right stick')} look, ${k('Space', 'A')} jump. ${k('Shift', 'RT')}: <b>${D.travel.name}</b>. ${esc(D.travel.desc)}`,
      `${k('Left click', 'X')} punches the nearest crook (keep pressing for combos, push toward the one you want). ${k('C', 'B')} dodges. ${k('Right click', 'Y')}: <b>${D.rmb.name}</b>.`,
      `${k('Q', 'LB')}: <b>${D.q.name}</b>. ${k('E', 'RB')}: <b>${D.e.name}</b>. Fill the hero meter in a fight, then ${k('R', 'LT')} for <b>${D.r.name}</b>.`,
      `Red markers are crimes in progress. ${k('M', 'Back')} opens the map; ${k('H', 'D-pad up')} switches hero. The longer crimes go unanswered, the worse the city gets.`,
    ];
    tipT = 1.5;
  }
  return { init, reset, update, say, floatScore, toast, banner, villain, hurt, cooldownBlink, heroTips, toggleMap, get mapOpen() { return mapOpen; }, proj };
})();
