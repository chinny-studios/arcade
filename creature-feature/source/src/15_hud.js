// Creature Feature — the HUD: score and combo, hunger, the town's panic, the powers and their cooldowns, the radar,
// the kill feed, speech bubbles over people, the use prompt, the crosshair and the hunger-sense markers

const HUD = (() => {
  const bubbles = [], marks = [];
  let radar, rx, feedEl, lastScore = -1, shownScore = 0;
  function init() {
    radar = $('#radar'); rx = radar.getContext('2d');
    feedEl = $('#feed');
    for (let i = 0; i < 8; i++) { const b = el('div', 'bubble'); b.hidden = true; $('#bubbles').appendChild(b); bubbles.push(b); }
    for (let i = 0; i < 48; i++) { const m = el('div', 'mark'); m.hidden = true; $('#marks').appendChild(m); marks.push(m); }
  }
  function reset() {
    feedEl.innerHTML = ''; $('#toasts').innerHTML = ''; shownScore = 0; lastScore = -1;
    const D = P.D;
    const keys = keyNames();
    $('#abil').innerHTML = [['atk', D.attack.name], ['a1', D.a1.name], ['a2', D.a2.name]].map(([k, n]) => `<div class="ab" data-k="${k}"><div class="cd"></div><b>${keys[k]}</b><span>${n}</span></div>`).join('');
    $('#portrait').textContent = D.name;
    $('#tAtk').textContent = D.attack.name.toUpperCase(); $('#tA1').textContent = D.a1.name.toUpperCase(); $('#tA2').textContent = D.a2.name.toUpperCase();
    document.body.dataset.monster = P.id;
  }
  function keyNames() {
    const m = Input.mode;
    if (m === 'pad') return { atk: 'RT', a1: 'LT', a2: 'RB', use: 'X' };
    if (m === 'touch') return { atk: '', a1: '', a2: '', use: '' };
    return { atk: 'LMB', a1: 'RMB', a2: 'Q', use: 'F' };
  }
  function kill(v, gain, labels, how) {
    const e = el('div', 'kf', `<b>+${fmtNum(gain)}</b> ${esc(FOLK[v.type].name)}${G.combo > 1 ? ` <i>×${G.combo}</i>` : ''}${labels.length ? ' <em>' + labels.map(esc).join(' · ') + '</em>' : ''}`);
    feedEl.prepend(e);
    while (feedEl.children.length > 5) feedEl.lastChild.remove();
    setTimeout(() => e.classList.add('old'), 3500);
    setTimeout(() => e.remove(), 6000);
    if (G.combo > 1) { const c = $('#comboPop'); c.textContent = '×' + G.combo; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    void how;
  }
  function toast(text, kind = '') {
    const t = el('div', 'toast ' + kind, esc(text));
    $('#toasts').appendChild(t);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2400);
    setTimeout(() => t.remove(), 3100);
  }
  const _p = new V3();
  function project(x, y, z) {
    _p.set(x, y, z).project(R.camera);
    if (_p.z > 1 || _p.z < -1) return null;
    return [(_p.x + 1) / 2 * innerWidth, (1 - _p.y) / 2 * innerHeight];
  }
  function update(dt) {
    if (!P) return;
    // score counts up
    shownScore = G.score < shownScore ? G.score : Math.min(G.score, shownScore + Math.max(1, (G.score - shownScore) * dt * 8));
    if (Math.round(shownScore) !== lastScore) { lastScore = Math.round(shownScore); $('#score').textContent = fmtNum(lastScore); }
    $('#combo').hidden = G.combo < 2;
    if (G.combo >= 2) { $('#comboN').textContent = '×' + G.combo; $('#comboBar').style.width = (G.comboT / COMBO_TIME * 100).toFixed(1) + '%'; }
    const h = G.hunger / HUNGER_MAX;
    $('#hungerFill').style.width = (h * 100).toFixed(1) + '%';
    document.body.classList.toggle('starving', h < 0.25 && !G.over);
    $('#panicName').textContent = panicName();
    $('#panicFill').style.width = G.panic.toFixed(0) + '%';
    $('#time').textContent = fmtTime(G.t);
    $('#kills').textContent = G.kills;
    // powers
    for (const ab of $$('#abil .ab')) {
      const k = ab.dataset.k, D = P.D;
      const max = k === 'atk' ? D.attack.cd + D.attack.lock * 0.5 : k === 'a1' ? D.a1.cd : D.a2.cd + (P.id === 'mummy' ? D.a2.dur : 0);
      let f = clamp(P.cd[k] / max, 0, 1);
      if (k === 'a2' && P.form === 'bat') { f = 0; ab.classList.add('active'); ab.querySelector('span').textContent = 'Land (' + Math.ceil(P.batT) + ')'; }
      else if (k === 'a2' && P.storm > 0) { ab.classList.add('active'); }
      else { ab.classList.remove('active'); if (k === 'a2') ab.querySelector('span').textContent = D.a2.name; }
      if (k === 'atk') ab.querySelector('span').textContent = P.form === 'bat' ? 'Swoop' : P.held ? 'Throw' : D.attack.name;
      if (k === 'a1' && P.id === 'frank') ab.querySelector('span').textContent = P.held ? 'Throw' : 'Grab';
      ab.querySelector('.cd').style.height = (f * 100).toFixed(0) + '%';
    }
    // the use prompt
    const pr = $('#prompt');
    if (P.near && !P.act && !G.over) {
      const k = keyNames().use;
      pr.innerHTML = (k ? `<b>${k}</b> ` : '') + esc(P.near.label);
      pr.classList.toggle('dim', !!P.near.empty);
      pr.hidden = false;
    } else pr.hidden = true;
    $('#tUse').classList.toggle('ready', !!(P.near && !P.near.empty));
    // crosshair for aimed powers
    const aim = (P.id === 'vampire' && P.form !== 'bat') || P.id === 'mummy' || P.id === 'werewolf' || (P.id === 'frank' && P.held);
    $('#cross').hidden = !aim || G.over;
    if (aim && G.frame % 6 === 0) { const range = P.id === 'vampire' ? 32 : P.id === 'mummy' ? 24 : P.id === 'werewolf' ? 18 : 40; $('#cross').classList.toggle('lock', !!aimTarget(range)); }
    bubblesUpdate();
    senseUpdate();
    if (G.frame % 3 === 0) drawRadar();
    const tip = $('#tip'); if (tip.dataset.until && G.t > +tip.dataset.until) { tip.hidden = true; tip.dataset.until = ''; }
  }
  function bubblesUpdate() {
    const cands = [];
    for (const v of PEOPLE.list) {
      if (v.sayT <= 0 || v.hidden || v.state === 'dead' || v.state === 'gone') continue;
      const d = dist(v.x, v.z, R.camera.position.x, R.camera.position.z);
      if (d > 45) continue;
      cands.push([d, v]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    bubbles.forEach((b, i) => {
      const c = cands[i];
      if (!c) { b.hidden = true; return; }
      const v = c[1], s = project(v.x, v.y + 2.15, v.z);
      if (!s) { b.hidden = true; return; }
      b.hidden = false;
      if (b.textContent !== v.line) b.textContent = v.line;
      b.style.transform = `translate(${s[0].toFixed(0)}px, ${s[1].toFixed(0)}px) translate(-50%, -100%) scale(${clamp(14 / c[0], 0.6, 1).toFixed(2)})`;
      b.style.opacity = clamp(v.sayT * 2, 0, 1);
    });
  }
  function senseUpdate() {
    const on = (Input.held('sense') || G.sense) && !G.over && P.rise <= 0;
    document.body.classList.toggle('sense', on);
    let n = 0;
    if (on) {
      const list = [];
      for (const v of PEOPLE.list) {
        if (v.state === 'dead' || v.state === 'gone' || v.inside) continue;
        const d = dist(v.x, v.z, P.x, P.z); if (d > 160) continue;
        list.push([d, v.x, v.y + 1.2, v.z, v.state === 'flee' ? 'flee' : v.state === 'incar' ? 'car' : 'calm', '']);
      }
      for (const r of TOWN.refuges) if (r.occ.length) { const d = dist(r.x, r.z, P.x, P.z); if (d < 160) list.push([d, r.x, 2.6, r.z, 'house', r.occ.length]); }
      list.sort((a, b) => a[0] - b[0]);
      for (const it of list) {
        if (n >= marks.length) break;
        const s = project(it[1], it[2], it[3]); if (!s) continue;
        const m = marks[n++];
        m.hidden = false; m.className = 'mark ' + it[4]; m.textContent = it[5];
        m.style.transform = `translate(${s[0].toFixed(0)}px, ${s[1].toFixed(0)}px) translate(-50%, -50%) scale(${clamp(30 / it[0], 0.5, 1.2).toFixed(2)})`;
      }
    }
    for (let i = n; i < marks.length; i++) marks[i].hidden = true;
  }
  function drawRadar() {
    const W = radar.width, c = W / 2, sc = c / 60, x = rx;
    x.clearRect(0, 0, W, W);
    x.save(); x.beginPath(); x.arc(c, c, c - 1, 0, TAU); x.clip();
    x.fillStyle = 'rgba(10,6,8,0.62)'; x.fillRect(0, 0, W, W);
    x.strokeStyle = 'rgba(200,40,40,0.25)'; x.lineWidth = 1;
    for (const r of [20, 40]) { x.beginPath(); x.arc(c, c, r * sc, 0, TAU); x.stroke(); }
    // rotate so up is where the camera looks
    const cs = Math.cos(CAM.yaw), sn = Math.sin(CAM.yaw);
    const toR = (wx, wz) => { const dx = wx - P.x, dz = wz - P.z; return [c + (dx * cs - dz * sn) * sc, c + (dx * sn + dz * cs) * sc]; };
    for (const r of TOWN.refuges) { if (!r.occ.length) continue; const [a, b] = toR(r.x, r.z); if (Math.hypot(a - c, b - c) > c) continue; x.fillStyle = '#e8c040'; x.fillRect(a - 4, b - 4, 8, 8); x.fillStyle = '#000'; x.font = 'bold 8px sans-serif'; x.textAlign = 'center'; x.fillText(r.occ.length, a, b + 3); }
    for (const v of PEOPLE.list) {
      if (v.state === 'gone' || v.inside) continue;
      const [a, b] = toR(v.x, v.z); if (Math.hypot(a - c, b - c) > c) continue;
      if (v.state === 'dead') { x.fillStyle = '#5a0a0a'; x.fillRect(a - 1.5, b - 1.5, 3, 3); continue; }
      x.fillStyle = v.state === 'incar' ? '#6ab0ff' : v.state === 'flee' ? '#ff3a3a' : v.alert > 0.3 ? '#ffd040' : '#f0e8d8';
      x.beginPath(); x.arc(a, b, v.state === 'incar' ? 3.4 : 2.6, 0, TAU); x.fill();
    }
    x.restore();
    x.fillStyle = '#ff2a2a'; x.beginPath(); x.moveTo(c, c - 6); x.lineTo(c + 4, c + 4); x.lineTo(c - 4, c + 4); x.fill();
    x.strokeStyle = 'rgba(200,40,40,0.6)'; x.lineWidth = 2; x.beginPath(); x.arc(c, c, c - 1, 0, TAU); x.stroke();
  }
  function tip(text, secs = 8) { const t = $('#tip'); t.innerHTML = text; t.hidden = false; t.dataset.until = G.t + secs; }
  return { init, reset, update, kill, toast, tip, keyNames, project };
})();
