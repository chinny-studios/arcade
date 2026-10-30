// ---- 13_hud: battle HUD (DOM panels) and the overlay canvas (markers, reticle, minimap) ----
const TELE = ['Back sails', 'Heave to', 'Quarter sail', 'Half sail', 'Three-quarter', 'Full sail'];
const ALLY = '#6fe09a', ENEMY = '#ff5d4d', NEUTRAL = '#d8d2c4';
const CLASS_ICON = { sloop: '▸', fireship: '✷', brig: '◆', frigate: '▲', galleon: '■' };
const Hud = { hitT: 0, hitSail: false, ribbons: [], mapBig: false };

Hud.init = function () {
  Hud.ov = $('ov'); Hud.g = Hud.ov.getContext('2d');
  Hud.mini = $('mini'); Hud.mg = Hud.mini.getContext('2d');
  Hud.resize();
};
Hud.resize = function () {
  if (!Hud.ov) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  Hud.ov.width = innerWidth * dpr; Hud.ov.height = innerHeight * dpr; Hud.dpr = dpr;
  const ms = Math.round(Math.min(220, Math.max(140, innerHeight * 0.26)));
  Hud.mini.width = Hud.mini.height = ms * dpr; Hud.mini.style.width = Hud.mini.style.height = ms + 'px';
};
Hud.reset = function () {
  $('feed').innerHTML = ''; $('ribbons').innerHTML = ''; $('banner').className = ''; $('dead').hidden = true;
  Hud.ribbons = []; Hud.mapBig = false; document.body.classList.remove('chart');
  // fleet roster icons
  for (let T = 0; T < 2; T++) {
    const box = $('fleet' + T); box.innerHTML = '';
    for (const s of G.ships.filter((s) => s.team === T)) { const i = el('span', 'fi', CLASS_ICON[s.cls]); i.title = s.name; s._icon = i; box.appendChild(i); }
  }
  const caps = $('caps'); caps.innerHTML = '';
  for (const c of Match.caps) { const d = el('div', 'cap', `<b>${c.id}</b><i></i>`); c._el = d; caps.appendChild(d); }
  const p = G.player;
  const w = $('weap'); w.innerHTML = '';
  if (p) {
    AMMO.forEach((a, i) => w.appendChild(el('div', 'slot', `<kbd>${i + 1}</kbd><span>${a.name}</span><small>${Math.round(p.C.guns.range * a.range)} m</small>`)));
    if (p.C.rafts) w.appendChild(el('div', 'slot raft', `<kbd>4</kbd><span>Fire rafts</span><small>${p.C.rafts.range} m</small>`));
    $('cname').textContent = p.name; $('cclass').textContent = p.C.name;
    $('spname').textContent = SPECIALS[p.spec.id].name;
    $('ignite').hidden = !p.C.ignite;
  }
};
Hud.ribbon = function (text, kind) {
  if (G.simming || !$('ribbons')) return;
  const r = el('div', 'rib ' + (kind || ''), text); $('ribbons').prepend(r);
  setTimeout(() => r.classList.add('out'), 2600); setTimeout(() => r.remove(), 3300);
  while ($('ribbons').children.length > 4) $('ribbons').lastChild.remove();
};
Hud.deny = function (text) { if (G.simming) return; const d = $('deny'); d.textContent = text; d.classList.add('on'); clearTimeout(Hud.denyT); Hud.denyT = setTimeout(() => d.classList.remove('on'), 1600); };
Hud.feed = function (text, team) {
  if (G.simming || !$('feed')) return;
  const ally = team === Match.viewTeam;
  const f = el('div', team < 0 ? '' : ally ? 'a' : 'e', text); $('feed').prepend(f);
  while ($('feed').children.length > 6) $('feed').lastChild.remove();
  setTimeout(() => f.classList.add('old'), 12000);
};
Hud.banner = function (title, sub) {
  if (G.simming) return;
  const b = $('banner'); b.innerHTML = `<h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}`; b.className = 'on';
  clearTimeout(Hud.banT); Hud.banT = setTimeout(() => { b.className = ''; }, 3800);
};
Hud.hitMark = function (sail) { Hud.hitT = 0.25; Hud.hitSail = !!sail; };
Hud.dead = function (by, captured) {
  if (G.simming) return;
  $('dead').hidden = false;
  $('deadtitle').textContent = captured ? 'Your ship has been taken' : Match.playerLost === 'expended' ? 'Your fireship is spent' : 'Your ship has gone down';
  $('deadsub').textContent = by ? (captured ? `Boarded and captured by ${by.name}.` : `Sunk by ${by.name}.`) : '';
  PC.spectWait = 3; Input.unlock();
};

const pctColor = (f) => f > 0.6 ? '#7ed67a' : f > 0.3 ? '#f0c24a' : '#ff6046';
Hud.update = function (dt) {
  const p = G.player, M = Match;
  // top bar
  const ally = Match.viewTeam;
  for (let T = 0; T < 2; T++) {
    const side = T === ally ? 'L' : 'R';
    $('pts' + side).textContent = Math.max(0, Math.round(M.pts[T]));
    $('bar' + side).style.width = clamp(M.pts[T] / MATCH.win * 100, 0, 100) + '%';
    for (const s of G.ships) if (s._icon) {
      s._icon.className = 'fi ' + (s.alive ? '' : 'dead') + (s.team === ally ? ' a' : ' e');
      const box = $('fleet' + (s.team === ally ? 0 : 1)); if (s._icon.parentNode !== box) box.appendChild(s._icon);
    }
  }
  $('clock').textContent = M.phase === 'countdown' ? 'Battle in ' + Math.ceil(M.cd) : fmtTime(M.left);
  for (const c of M.caps) {
    const own = c.owner < 0 ? 'n' : c.owner === ally ? 'a' : 'e', cap = c.capTeam < 0 ? '' : c.capTeam === ally ? ' capa' : ' cape';
    c._el.className = 'cap ' + own + cap + (c.contested ? ' cont' : '');
    c._el.querySelector('i').style.width = (c.prog * 100) + '%';
  }
  // own ship panel
  if (p) {
    $('hpbar').style.width = (p.hpf * 100) + '%'; $('hpbar').style.background = pctColor(p.hpf);
    $('hpnum').textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
    $('sailbar').style.width = (p.sails * 100) + '%'; $('crewbar').style.width = (p.crewf * 100) + '%';
    $('sailnum').textContent = Math.round(p.sails * 100) + '%'; $('crewnum').textContent = Math.round(p.crew);
    $('speed').textContent = (Math.abs(p.v) * 0.55).toFixed(1) + ' kn';
    $('tele').textContent = TELE[p.tele + 1];
    const tl = $('telebar').children; for (let i = 0; i < 6; i++) tl[i].className = i === p.tele + 1 ? 'on' : i < p.tele + 1 ? 'past' : '';
    $('rudderdot').style.left = (50 + p.rudder * 45) + '%';
    const st = $('status').children;
    for (let i = 0; i < 3; i++) st[i].className = 'ic fire' + (p.fires[i] > 0 || p.ignited > 0 ? ' on' : '');
    for (let i = 0; i < 2; i++) st[3 + i].className = 'ic leak' + (p.leaks[i] > 0 ? ' on' : '');
    st[5].className = 'ic board' + (p.board ? ' on' : '');
    st[6].className = 'ic gun' + (BATTERIES.some((b) => p.crit[b] > 0) ? ' on' : '');
    st[7].className = 'ic rud' + (p.crit.rudder > 0 ? ' on' : '');
    const down = p.model.masts.filter((m) => m.fallen).length;
    st[8].className = 'ic mast' + (down ? ' on' : ''); st[8].dataset.n = down ? down + '×' : '';
    const slots = $('weap').children;
    for (let i = 0; i < slots.length; i++) slots[i].classList.toggle('sel', i === p.weapon);
    if (p.C.rafts && slots[3]) slots[3].querySelector('small').textContent = p.raftRl > 0 ? Math.ceil(p.raftRl) + ' s' : 'ready';
    const cons = (id, o, ready, active) => {
      const e = $(id); e.className = 'con' + (active ? ' act' : ready ? ' rdy' : '');
      e.querySelector('em').textContent = active ? Math.ceil(o.t) + 's' : o.n <= 0 ? '—' : o.cd > 0 ? Math.ceil(o.cd) + 's' : '×' + o.n;
    };
    cons('repair', p.repair, p.repair.n > 0 && p.repair.cd <= 0, p.repair.t > 0);
    cons('special', p.spec, p.spec.n > 0 && p.spec.cd <= 0, p.spec.t > 0);
    if (p.C.ignite) { const e = $('ignite'); e.className = 'con' + (p.ignited > 0 ? ' act' : ' rdy'); e.querySelector('em').textContent = p.ignited > 0 ? Math.ceil(p.ignited) + 's' : 'ready'; }
    const t = p.alive ? nearestEnemy(p, 40) : null;
    $('boardhint').hidden = !t || !!p.board;
    if (t) $('boardhint').innerHTML = p.canBoard(t) ? `<kbd>G</kbd> Board ${t.name}` : p.boardReason(t);
    $('boardbar').hidden = !p.board;
    if (p.board) { const o = p.board.other, a = p.strength(), d = o.strength(); $('boardbar').querySelector('i').style.width = (a / (a + d) * 100) + '%'; $('boardbar').querySelector('span').textContent = `${Math.round(p.crew)} vs ${Math.round(o.crew)}`; }
  }
  if (Input.any('KeyM', 'P8')) { Hud.mapBig = !Hud.mapBig; document.body.classList.toggle('chart', Hud.mapBig); }
  Hud.hitT -= dt;
  drawOverlay(); drawMini();
};

// ---- overlay canvas ----
const _v = new THREE.Vector3();
function proj(x, y, z) {
  _v.set(x, y, z).project(R.camera);
  if (_v.z > 1 || _v.z < -1) return null;
  return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight];
}
function drawOverlay() {
  const g = Hud.g, dpr = Hud.dpr, W = innerWidth, H = innerHeight;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  if (G.state !== 'play') return;
  const p = G.player, ally = Match.viewTeam, me = PC.subject();
  g.font = '600 12px "Spectral SC", Georgia, serif'; g.textAlign = 'center';
  // caps on the water
  for (const c of Match.caps) {
    const q = proj(c.x, 6, c.z); if (!q) continue;
    const col = c.owner < 0 ? NEUTRAL : c.owner === ally ? ALLY : ENEMY;
    g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 13, 0, TAU); g.stroke();
    if (c.prog > 0) { g.strokeStyle = c.capTeam === ally ? ALLY : ENEMY; g.lineWidth = 4; g.beginPath(); g.arc(q[0], q[1], 17, -Math.PI / 2, -Math.PI / 2 + TAU * c.prog); g.stroke(); }
    g.fillStyle = col; g.font = '700 14px "Spectral SC", Georgia, serif'; g.fillText(c.id, q[0], q[1] + 5);
    if (me) { g.font = '11px Georgia, serif'; g.fillText(Math.round(Math.hypot(c.x - me.x, c.z - me.z)) + ' m', q[0], q[1] + 30); }
  }
  // ship markers, nearest first; a label that would overlap one already drawn is nudged upward
  const placed = [], list = [];
  for (const s of G.ships) {
    if (!s.alive || s === me || !s.model.root.visible) continue;
    const q = proj(s.x, s.C.mastH + 8 + s.y, s.z); if (q) list.push([s, q, me ? Math.hypot(s.x - me.x, s.z - me.z) : 0]);
  }
  list.sort((a, b) => a[2] - b[2]);
  for (const [s, q, d] of list) {
    const isAlly = s.team === ally, col = isAlly ? ALLY : ENEMY;
    const w = 58, x = q[0] - w / 2;
    let y = q[1];
    for (let k = 0; k < 6 && placed.some((r) => Math.abs(r[0] - q[0]) < 110 && Math.abs(r[1] - y) < 30); k++) y -= 30;
    placed.push([q[0], y]);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle = col; g.fillRect(x, y, w * s.hpf, 4);
    g.font = '600 12px "Spectral SC", Georgia, serif'; g.fillStyle = col;
    g.fillText(CLASS_ICON[s.cls] + ' ' + s.name, q[0], y - 6);
    if (!isAlly) { g.font = '11px Georgia, serif'; g.fillStyle = '#eee'; g.fillText((d / 1000).toFixed(2) + ' km', q[0], y + 17); }
    if (s.fires.some((f) => f > 0) || s.ignited > 0) { g.fillStyle = '#ff9a3a'; g.fillText('🔥', q[0] + w / 2 + 10, y + 5); }
    if (s.board) { g.fillStyle = '#fff'; g.fillText('⚔', q[0] - w / 2 - 10, y + 5); }
  }
  // rafts
  for (const r of Combat.rafts) { if (r.team === ally) continue; const q = proj(r.x, 2, r.z); if (q) { g.fillStyle = '#ffb04a'; g.fillText('▲ raft', q[0], q[1] - 6); } }
  if (!p || !p.alive || !p.isPlayer) return;
  // spyglass: dark round vignette
  if (PC.spyK > 0.05) {
    const r = Math.min(W, H) * 0.62, gr = g.createRadialGradient(W / 2, H / 2, r * 0.82, W / 2, H / 2, r * 1.02);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${0.92 * PC.spyK})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  // fire-raft fan
  if (p.weapon === RAFT_SLOT) {
    const a0 = Math.atan2(PC.ax - p.x, PC.az - p.z);
    g.strokeStyle = p.raftRl > 0 ? 'rgba(255,255,255,.25)' : 'rgba(255,170,70,.8)'; g.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      const a = a0 + i * 5 * DEG; g.beginPath(); let first = true;
      for (let k = 1; k <= 12; k++) { const d = p.C.rafts.range * k / 12, q = proj(p.x + Math.sin(a) * d, 0.5, p.z + Math.cos(a) * d); if (!q) { first = true; continue; } if (first) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); first = false; }
      g.stroke();
    }
  }
  // lead marker
  const t = PC.target;
  if (t && settings.lead) {
    const [lx, lz] = p.weapon === RAFT_SLOT ? raftLead(p, t) : leadPoint(p, t), q = proj(lx, 0, lz);
    if (q) { g.strokeStyle = '#ffe28a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(q[0], q[1] - 7); g.lineTo(q[0] + 7, q[1]); g.lineTo(q[0], q[1] + 7); g.lineTo(q[0] - 7, q[1]); g.closePath(); g.stroke(); }
  }
  // reticle
  const cx = W / 2, cy = H / 2, range = p.weapon === RAFT_SLOT ? p.C.rafts.range : p.range(), inR = PC.aimDist <= range;
  const rc = inR ? 'rgba(255,255,255,.9)' : 'rgba(255,120,100,.9)';
  g.strokeStyle = rc; g.lineWidth = 1.5; g.beginPath();
  g.moveTo(cx - 26, cy); g.lineTo(cx - 8, cy); g.moveTo(cx + 8, cy); g.lineTo(cx + 26, cy); g.moveTo(cx, cy + 8); g.lineTo(cx, cy + 20);
  for (let i = 1; i <= 3; i++) { g.moveTo(cx - 5, cy + 8 + i * 4); g.lineTo(cx + 5, cy + 8 + i * 4); }
  g.stroke();
  if (Hud.hitT > 0) { g.strokeStyle = Hud.hitSail ? '#fff' : '#ffcf5a'; g.lineWidth = 2.5; g.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(cx + a * 6, cy + b * 6); g.lineTo(cx + a * 13, cy + b * 13); } g.stroke(); }
  g.font = '600 12px Georgia, serif'; g.fillStyle = rc; g.textAlign = 'left';
  g.fillText(Math.round(Math.min(PC.aimDist, 9999)) + ' m' + (inR ? '' : '  out of range'), cx + 32, cy + 4);
  // batteries: lit when bearing on the aim point; ring shows reload
  const bats = [['port', 'PORT', -1], ['star', 'STBD', 1], ['bow', 'BOW', 0], ['stern', 'STERN', 0]];
  let ox = -78;
  g.textAlign = 'center';
  for (const [b, lab] of bats) {
    if (!p.model.guns[b].length) continue;
    const x = cx + ox, y = cy + 48; ox += 52;
    const bear = p.bears(b, PC.ax, PC.az), ready = p.rl[b] <= 0, f = 1 - p.rl[b] / (p.rlMax[b] || 1);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.stroke();
    g.strokeStyle = p.crit[b] > 0 ? '#ff5d4d' : ready ? (bear ? '#7ef08a' : '#9aa') : '#f0c24a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + TAU * f); g.stroke();
    g.fillStyle = bear ? '#fff' : 'rgba(255,255,255,.45)'; g.font = '600 9px Georgia, serif'; g.fillText(lab, x, y + 24);
    if (!ready) { g.font = '600 10px Georgia, serif'; g.fillText(Math.ceil(p.rl[b] / p.reloadRate() / (p.crit[b] > 0 ? 0.5 : 1)), x, y + 4); }
  }
  // target panel
  if (t) {
    g.textAlign = 'center'; g.font = '600 13px "Spectral SC", Georgia, serif'; g.fillStyle = ENEMY;
    g.fillText(`${t.name} · ${t.C.name}`, cx, cy + 96);
    g.font = '11px Georgia, serif'; g.fillStyle = '#ddd';
    g.fillText(`Hull ${Math.round(t.hpf * 100)}%  Sails ${Math.round(t.sails * 100)}%  Crew ${Math.round(t.crew)}  ·  ${Math.round(Math.hypot(t.x - p.x, t.z - p.z))} m`, cx, cy + 112);
  }
  // out of bounds warning
  const lim = World.S / 2 - 120;
  if (Math.abs(p.x) > lim || Math.abs(p.z) > lim) { g.font = '600 16px Georgia, serif'; g.fillStyle = '#ffb04a'; g.textAlign = 'center'; g.fillText('Edge of the battle area', cx, H * 0.3); }
}

function drawMini() {
  const big = Hud.mapBig && G.state === 'play', c = big ? Hud.ov : Hud.mini, g = big ? Hud.g : Hud.mg, dpr = Hud.dpr;
  $('mini').style.visibility = big ? 'hidden' : 'visible';
  if (!World.mapCanvas || G.state !== 'play') return;
  let S, ox = 0, oy = 0;
  if (big) { S = Math.min(innerWidth, innerHeight) * 0.86; ox = (innerWidth - S) / 2; oy = (innerHeight - S) / 2; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, innerWidth, innerHeight); }
  else { S = c.width / dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S); }
  const ws = World.S, mx = (x) => ox + (ws / 2 - x) / ws * S, my = (z) => oy + (ws / 2 - z) / ws * S, k = S / ws;
  g.globalAlpha = 0.92; g.drawImage(World.mapCanvas, ox, oy, S, S); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
  for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(ox + S * i / 10, oy); g.lineTo(ox + S * i / 10, oy + S); g.moveTo(ox, oy + S * i / 10); g.lineTo(ox + S, oy + S * i / 10); g.stroke(); }
  const p = G.player, ally = Match.viewTeam, me = PC.subject();
  for (const b of Match.fog) { g.fillStyle = 'rgba(230,235,240,.22)'; g.beginPath(); g.arc(mx(b.x), my(b.z), b.r * k, 0, TAU); g.fill(); }
  for (const cl of Combat.clouds) { g.fillStyle = 'rgba(220,220,220,.4)'; g.beginPath(); g.arc(mx(cl.x), my(cl.z), cl.r * k, 0, TAU); g.fill(); }
  for (const cp of Match.caps) {
    const col = cp.owner < 0 ? NEUTRAL : cp.owner === ally ? ALLY : ENEMY;
    g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.arc(mx(cp.x), my(cp.z), cp.r * k, 0, TAU); g.stroke();
    g.fillStyle = col; g.font = `700 ${big ? 18 : 11}px Georgia, serif`; g.textAlign = 'center'; g.fillText(cp.id, mx(cp.x), my(cp.z) + (big ? 6 : 4));
  }
  if (me && me.alive) {
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(mx(me.x), my(me.z), me.range() * k, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(mx(me.x), my(me.z)); g.lineTo(mx(me.x + Math.sin(PC.yaw) * 600), my(me.z + Math.cos(PC.yaw) * 600)); g.stroke();
  }
  const tri = (x, z, h, col, sz) => {
    const X = mx(x), Y = my(z), dx = -Math.sin(h), dy = -Math.cos(h);
    g.fillStyle = col; g.beginPath(); g.moveTo(X + dx * sz, Y + dy * sz); g.lineTo(X - dx * sz * 0.6 - dy * sz * 0.5, Y - dy * sz * 0.6 + dx * sz * 0.5); g.lineTo(X - dx * sz * 0.6 + dy * sz * 0.5, Y - dy * sz * 0.6 - dx * sz * 0.5); g.fill();
  };
  const sz = big ? 9 : 5;
  for (const s of G.ships) {
    if (!s.alive) { if (s.team === ally || s.seenT[ally] > Match.time - 30) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillText('×', mx(s.x), my(s.z) + 3); } continue; }
    if (s.team === ally) tri(s.x, s.z, s.h, s === p ? '#fff' : ALLY, s === p ? sz * 1.3 : sz);
    else if (s.seen[ally]) tri(s.x, s.z, s.h, ENEMY, sz);
    else if (s.lastPos && s.lastPos[ally] && Match.time - s.lastPos[ally].t < 60) { g.fillStyle = 'rgba(255,93,77,.4)'; g.beginPath(); g.arc(mx(s.lastPos[ally].x), my(s.lastPos[ally].z), sz * 0.6, 0, TAU); g.fill(); }
    if (big && (s.team === ally || s.seen[ally])) { g.fillStyle = '#fff'; g.font = '11px Georgia, serif'; g.fillText(s.name, mx(s.x), my(s.z) - 12); }
  }
  for (const f of Match.forts) { g.fillStyle = f.owner < 0 ? NEUTRAL : f.owner === ally ? ALLY : ENEMY; g.fillRect(mx(f.x) - 2.5, my(f.z) - 2.5, 5, 5); }
  // wind arrow
  const wx = ox + S - 16, wy = oy + 16, a = Match.wind.a;
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(wx + Math.sin(a) * 9, wy + Math.cos(a) * 9); g.lineTo(wx - Math.sin(a) * 9, wy - Math.cos(a) * 9); g.stroke();
  g.beginPath(); g.arc(wx - Math.sin(a) * 9, wy - Math.cos(a) * 9, 2.5, 0, TAU); g.fillStyle = '#fff'; g.fill();
  if (big) { g.font = '600 13px Georgia, serif'; g.textAlign = 'center'; g.fillStyle = '#eee'; g.fillText('M  close the chart', innerWidth / 2, oy + S + 22); }
}
