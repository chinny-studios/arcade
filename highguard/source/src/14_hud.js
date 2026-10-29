// ---- 14_hud: DOM panels and the overlay canvas (brackets, sight, lead marker, radar) ----
const Hud = { slow: 0, ribbonsN: 0 };
const _hv = new V3(), _hw = new V3();
Hud.init = function () {
  Hud.ov = $('ov'); Hud.cx = Hud.ov.getContext('2d');
  Hud.shCv = $('shcv').getContext('2d'); Hud.tshCv = $('tshcv').getContext('2d');
  Hud.resize();
};
Hud.resize = function () {
  const dpr = Math.min(devicePixelRatio || 1, 2); Hud.dpr = dpr;
  if (!Hud.ov) return;
  Hud.ov.width = innerWidth * dpr; Hud.ov.height = innerHeight * dpr;
};
Hud.reset = function () {
  $('feed').innerHTML = ''; $('ribbons').innerHTML = ''; $('banner').className = ''; $('tip').classList.remove('on'); $('warn').classList.remove('on');
  Hud.objectives(); Hud.buildSquads(); Hud.buildSubs();
};
// ---- Messages ----
Hud.feed = function (html, cls) {
  if (G.simming) return;
  const f = $('feed'), d = el('div', cls || '', html); f.prepend(d);
  while (f.children.length > 6) f.lastChild.remove();
  setTimeout(() => d.classList.add('old'), 7000);
};
Hud.ribbon = function (text, cls) {
  if (G.simming) return;
  const r = $('ribbons'), d = el('div', 'rib ' + (cls || ''), text); r.prepend(d);
  while (r.children.length > 4) r.lastChild.remove();
  setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3300);
};
Hud.banner = function (title, sub) {
  if (G.simming) return;
  const b = $('banner'); b.innerHTML = '<h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : ''); b.className = 'on';
  clearTimeout(Hud.bannerT); Hud.bannerT = setTimeout(() => b.className = '', 4200);
};
Hud.tip = function (html) {
  if (G.simming) return;
  const t = $('tip'); t.innerHTML = html; t.classList.add('on');
  clearTimeout(Hud.tipT); Hud.tipT = setTimeout(() => t.classList.remove('on'), 11000);
};
Hud.warn = function (text) {
  if (G.simming) return;
  const w = $('warn'); w.textContent = text; w.classList.add('on');
  clearTimeout(Hud.warnT); Hud.warnT = setTimeout(() => w.classList.remove('on'), 1800);
};
Hud.objectives = function () {
  const d = Mission.def; if (!d) return;
  $('mname').textContent = d.name;
  $('olist').innerHTML = Mission.objs.filter((o) => o.state !== 'wait').map((o) => '<li class="' + o.state + '">' + o.text + '</li>').join('');
};
Hud.buildSquads = function () {
  const p = G.player, h = $('hangar');
  h.innerHTML = '<h4>Hangar</h4>';
  if (!p || !p.squads.length) { h.hidden = true; return; }
  h.hidden = false;
  p.squads.forEach((q, i) => {
    const row = el('div', 'sq', '<kbd>' + SQUAD_KEYS[i].slice(3) + '</kbd><div><b>' + q.name + '</b> <small>' + CRAFT[q.type].name + '</small><span class="pips"></span><em></em></div>');
    h.appendChild(row); q.row = row;
  });
  h.appendChild(el('div', 'hint', 'Tap: launch / attack target · <kbd>Shift</kbd> escort us · hold: recall · <kbd>V</kbd> all attack'));
};
Hud.buildSubs = function () {
  const p = G.player, s = $('subs'); s.innerHTML = '';
  if (!p) return;
  for (const k of SUB_ORDER) {
    if (!p.subs[k]) continue;
    const r = el('div', 'subr', '<span>' + SUBSYS[k].name + '</span><div><i></i></div><em></em>'); s.appendChild(r); p.subs[k].row = r;
  }
};
const pct = (v) => Math.max(0, Math.round(v * 100)) + '%';
Hud.update = function (dt) {
  const p = G.player;
  Hud.slow -= dt;
  if (Hud.slow <= 0 && p) { Hud.slow = 0.1; Hud.panels(p); }
  Hud.overlay(p);
};
Hud.panels = function (p) {
  Hud.objectives();
  $('cname').textContent = p.name; $('cclass').textContent = p.className;
  const hf = p.hull / p.maxHull;
  $('hullbar').style.width = pct(hf); $('hullbar').className = hf < 0.3 ? 'low' : ''; $('hullnum').textContent = Math.ceil(p.hull) + ' / ' + p.maxHull;
  $('speed').textContent = Math.round(Math.abs(p.speed)) + ' m/s'; $('thr').textContent = THROTTLE_NAMES[PC.thrIdx];
  const bars = $('thrbar').children; for (let i = 0; i < bars.length; i++) bars[i].className = i === PC.thrIdx ? 'on' : i < PC.thrIdx ? 'past' : '';
  $('pitch').textContent = (p.pitch >= 0 ? '+' : '') + Math.round(p.pitch / DEG) + '°';
  drawShields(Hud.shCv, p, true);
  for (const k in p.subs) {
    const s = p.subs[k]; if (!s.row) continue;
    s.row.className = 'subr' + (s.down ? ' down' : s.hp < s.max * 0.5 ? ' hurt' : '');
    s.row.querySelector('i').style.width = pct(s.hp / s.max);
    s.row.querySelector('em').textContent = s.down ? 'Down · ' + Math.ceil(s.repair) + ' s' : pct(s.hp / s.max);
  }
  // Weapons.
  const w = [];
  for (const side of ['port', 'bow', 'stbd']) {
    const b = p.bat[side]; if (!b) continue;
    const down = (side === 'port' || side === 'stbd') && !p.ok(side), ready = b.t <= 0, bears = PC.bears[side];
    const f = ready ? 1 : 1 - b.t / b.reload;
    w.push('<div class="wp' + (down ? ' down' : bears && ready ? ' go' : bears ? ' bear' : '') + '"><span>' + (side === 'port' ? 'Port battery' : side === 'stbd' ? 'Starboard battery' : 'Bow guns') + '</span><div><i style="width:' + pct(f) + '"></i></div><small>' + (down ? 'Knocked out' : !ready ? 'Reloading' : bears ? 'Bears · fire' : 'Ready') + '</small></div>');
  }
  if (p.torpMax) {
    const f = p.torpCd <= 0 ? 1 : 1 - p.torpCd / 26;
    w.push('<div class="wp' + (p.torpCd <= 0 ? ' torp' : '') + '"><span>Torpedoes <kbd>Space</kbd></span><div><i style="width:' + pct(f) + '"></i></div><small>' + (p.torpCd <= 0 ? p.torpMax + ' tubes ready' : 'Loading · ' + Math.ceil(p.torpCd) + ' s') + '</small></div>');
  }
  $('weap').innerHTML = w.join('');
  // Squadrons.
  for (const q of p.squads) {
    if (!q.row) continue;
    let pips = '';
    for (let i = 0; i < q.size; i++) pips += '<i class="' + (i < q.out.length ? 'out' : i < q.total ? 'in' : '') + '"></i>';
    q.row.querySelector('.pips').innerHTML = pips;
    q.row.querySelector('em').textContent = q.status;
    q.row.className = 'sq' + (q.out.length ? ' active' : '');
  }
  // Target panel.
  const t = PC.target, tp = $('tpanel');
  if (!t) { tp.hidden = true; }
  else {
    tp.hidden = false; tp.className = 'pod ' + (t.team === p.team ? 'ally' : 'foe');
    $('tname').textContent = t.name; $('tclass').textContent = (t.team === p.team ? '' : 'Enemy ') + t.className;
    $('tdist').textContent = (t.pos.distanceTo(p.pos) / 1000).toFixed(2) + ' km';
    $('thull').style.width = pct(t.hull / t.maxHull); $('thullnum').textContent = pct(t.hull / t.maxHull);
    drawShields(Hud.tshCv, t, false, p);
    let html = '<div class="tsub' + (PC.sub === null ? ' sel' : '') + '"><span>Hull (centre of mass)</span></div>';
    for (const k of SUB_ORDER) {
      const s = t.subs[k]; if (!s) continue;
      html += '<div class="tsub' + (PC.sub === k ? ' sel' : '') + (s.down ? ' down' : '') + '"><span>' + SUBSYS[k].name + '</span><div><i style="width:' + pct(s.hp / s.max) + '"></i></div><em>' + (s.down ? 'Destroyed' : pct(s.hp / s.max)) + '</em></div>';
    }
    $('tsubs').innerHTML = html;
  }
  $('bridgeoff').hidden = p.ok('bridge');
  // Out of the battle area.
  $('bounds').hidden = !(Mission.outT > 0);
  if (Mission.outT > 0) $('bounds').textContent = Mission.outT > 6 ? 'Leaving the battle area · the helm is bringing you about' : 'Leaving the battle area · turn back';
  const inbound = Combat.torps.filter((t) => t.target === p).length;
  $('torpwarn').hidden = !inbound; if (inbound) $('torpwarn').textContent = inbound + ' torpedo' + (inbound > 1 ? 'es' : '') + ' inbound';
};
// Four arcs around a small hull: fore at the top, port on the left (the ship seen from above).
function drawShields(x, s, mine, viewer) {
  const W = x.canvas.width, H = x.canvas.height, cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.4;
  x.clearRect(0, 0, W, H);
  x.save(); x.translate(cx, cy);
  if (!mine && viewer) { _hv.copy(viewer.pos).sub(s.pos); const l = s.dirToLocal(_hv, _hw); s.viewFacing = s.facingOf(l.multiplyScalar(s.radius / Math.max(1, l.length()))); }
  x.fillStyle = 'rgba(200,220,240,.55)';
  x.beginPath(); x.moveTo(0, -r * 0.62); x.lineTo(r * 0.2, r * 0.45); x.lineTo(-r * 0.2, r * 0.45); x.closePath(); x.fill();
  const arcs = { fore: [-Math.PI * 0.75, -Math.PI * 0.25], stbd: [-Math.PI * 0.25, Math.PI * 0.25], aft: [Math.PI * 0.25, Math.PI * 0.75], port: [Math.PI * 0.75, Math.PI * 1.25] };
  for (const f of FACINGS) {
    const v = s.shield[f] / s.shieldBase, cap = s.shieldCap(f) / s.shieldBase, a = arcs[f];
    x.lineWidth = r * 0.2; x.lineCap = 'butt';
    x.strokeStyle = 'rgba(255,255,255,.1)'; x.beginPath(); x.arc(0, 0, r, a[0] + 0.08, a[1] - 0.08); x.stroke();
    const col = v < 0.05 ? 'rgba(255,80,60,.9)' : v / cap < 0.35 ? 'rgba(255,190,80,.95)' : mine ? 'rgba(120,210,255,.95)' : 'rgba(255,150,100,.95)';
    if (v > 0.01) { x.strokeStyle = col; x.beginPath(); const m = (a[0] + a[1]) / 2, half = (a[1] - a[0] - 0.16) / 2 * clamp(v / cap, 0, 1); x.arc(0, 0, r, m - half, m + half); x.stroke(); }
    if (s.reinforce === f) { x.lineWidth = 2; x.strokeStyle = '#fff'; x.beginPath(); x.arc(0, 0, r + r * 0.17, a[0] + 0.08, a[1] - 0.08); x.stroke(); }
    if (s.viewFacing === f && !mine) { x.lineWidth = 2; x.strokeStyle = 'rgba(255,240,120,.9)'; x.beginPath(); x.arc(0, 0, r - r * 0.17, a[0] + 0.12, a[1] - 0.12); x.stroke(); }
  }
  if (!s.ok('shields')) { x.fillStyle = '#ff6a50'; x.font = 'bold ' + (r * 0.32 | 0) + 'px sans-serif'; x.textAlign = 'center'; x.fillText('GEN DOWN', 0, r * 0.12); }
  x.restore();
}
// ---- Overlay canvas ----
function proj(p, out) {
  _hv.copy(p).project(R.camera);
  out.x = (_hv.x * 0.5 + 0.5) * innerWidth; out.y = (-_hv.y * 0.5 + 0.5) * innerHeight; out.on = _hv.z < 1 && _hv.z > -1;
  _hw.copy(p).sub(R.camera.position); out.d = _hw.length(); out.behind = _hw.dot(PC.camDir) < 0;
  return out;
}
const _pp = {}, _pq = {};
Hud.overlay = function (p) {
  const x = Hud.cx, dpr = Hud.dpr, W = innerWidth, H = innerHeight;
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  if (!p || G.state !== 'play') return;
  const pxs = H / (2 * Math.tan(R.camera.fov * DEG / 2));
  x.font = '11px "Rajdhani", "Segoe UI", sans-serif'; x.textAlign = 'center';
  // Small craft.
  for (const c of G.craft) {
    if (!c.alive || c.mode === 'docked') continue;
    if (c.pos.distanceToSquared(R.camera.position) > 4500 * 4500) continue;
    const q = proj(c.pos, _pp); if (q.behind || !q.on) continue;
    const s = c.type === 'bmb' ? 4 : c.type === 'shuttle' ? 6 : 3;
    x.strokeStyle = c.team === p.team ? 'rgba(127,212,255,.8)' : 'rgba(255,110,80,.9)'; x.lineWidth = 1.2;
    x.beginPath();
    if (c.type === 'bmb') { x.moveTo(q.x, q.y - s); x.lineTo(q.x + s, q.y + s); x.lineTo(q.x - s, q.y + s); x.closePath(); }
    else if (c.type === 'shuttle') { x.rect(q.x - s, q.y - s, s * 2, s * 2); }
    else { x.moveTo(q.x, q.y - s); x.lineTo(q.x + s, q.y); x.lineTo(q.x, q.y + s); x.lineTo(q.x - s, q.y); x.closePath(); }
    x.stroke();
    if (c.type === 'shuttle') { x.fillStyle = '#bfe8ff'; x.fillText('SHUTTLE', q.x, q.y - 10); }
  }
  // Torpedoes aimed at us.
  for (const t of Combat.torps) {
    if (t.target !== p) continue;
    const q = proj(t.pos, _pp); if (q.behind || !q.on) continue;
    x.strokeStyle = '#ff4a3a'; x.lineWidth = 1.5; x.beginPath(); x.arc(q.x, q.y, 6, 0, TAU); x.stroke();
  }
  // Capital ships.
  for (const s of G.ships) {
    if (s === p || !s.alive || !s.arrived || s.jumpAnim != null) continue;
    const q = proj(s.centre(_hw), _pp); if (q.behind || !q.on) continue;
    const r = Math.max(10, s.radius * 0.55 * pxs / q.d), foe = s.team !== p.team, sel = s === PC.target;
    const col = foe ? (sel ? '#ff8a5a' : 'rgba(255,110,80,.75)') : (sel ? '#a8e4ff' : 'rgba(127,212,255,.6)');
    x.strokeStyle = col; x.lineWidth = sel ? 2 : 1.2;
    const k = Math.min(r * 0.4, 14);
    x.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.moveTo(q.x + sx * r, q.y + sy * r - sy * k); x.lineTo(q.x + sx * r, q.y + sy * r); x.lineTo(q.x + sx * r - sx * k, q.y + sy * r); }
    x.stroke();
    if (sel || q.d < 2600 || s.tag) {
      x.fillStyle = col; x.fillText(s.name + (sel ? ' · ' + (s.pos.distanceTo(p.pos) / 1000).toFixed(1) + ' km' : ''), q.x, q.y - r - 6);
      const hw = Math.max(26, r), f = s.hull / s.maxHull;
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(q.x - hw / 2, q.y + r + 4, hw, 3);
      x.fillStyle = f < 0.3 ? '#ff5a40' : foe ? '#ffb070' : '#8fd8ff'; x.fillRect(q.x - hw / 2, q.y + r + 4, hw * f, 3);
    }
    if (s.tag && s.tag !== 'convoy') { x.fillStyle = '#ffd34a'; x.fillText(s.tag === 'protect' ? 'PROTECT' : s.tag === 'flagship' ? 'DISABLE · DO NOT DESTROY' : 'TARGET', q.x, q.y - r - 18); }
    else if (s.tag === 'convoy') { x.fillStyle = '#9fe6b0'; x.fillText('PROTECT', q.x, q.y - r - 18); }
    // Subsystem markers on the locked target.
    if (sel) for (const kk in s.subs) {
      const ss = s.subs[kk], m = proj(s.toWorld(ss.p, _hw), _pq); if (m.behind) continue;
      const on = PC.sub === kk;
      x.strokeStyle = ss.down ? 'rgba(255,255,255,.35)' : on ? '#ffd34a' : 'rgba(255,220,160,.7)'; x.lineWidth = on ? 2 : 1;
      if (ss.down) { x.beginPath(); x.moveTo(m.x - 4, m.y - 4); x.lineTo(m.x + 4, m.y + 4); x.moveTo(m.x + 4, m.y - 4); x.lineTo(m.x - 4, m.y + 4); x.stroke(); }
      else { x.beginPath(); x.arc(m.x, m.y, on ? 7 : 4, 0, TAU); x.stroke(); if (on) { x.fillStyle = '#ffd34a'; x.fillText(SUBSYS[kk].name, m.x, m.y + 18); } }
    }
  }
  // Lead marker.
  if (PC.lead && PC.target && settings.lead) {
    const q = proj(PC.lead, _pp);
    if (!q.behind && q.on) {
      const t = proj(PC.target.toWorld(PC.sub ? PC.target.subs[PC.sub].p : PC.target.model.centre, _hw), _pq);
      x.strokeStyle = 'rgba(255,211,74,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(t.x, t.y); x.lineTo(q.x, q.y); x.stroke();
      x.strokeStyle = '#ffd34a'; x.lineWidth = 2; x.beginPath(); x.moveTo(q.x, q.y - 8); x.lineTo(q.x + 8, q.y); x.lineTo(q.x, q.y + 8); x.lineTo(q.x - 8, q.y); x.closePath(); x.stroke();
    }
  }
  // Off-screen arrow toward the target.
  if (PC.target) {
    const q = proj(PC.target.centre(_hw), _pp);
    if (q.behind || q.x < 0 || q.x > W || q.y < 0 || q.y > H) {
      let dx = q.x - W / 2, dy = q.y - H / 2; if (q.behind) { dx = -dx; dy = -dy; }
      const a = Math.atan2(dy, dx), rr = Math.min(W, H) * 0.36;
      x.save(); x.translate(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); x.rotate(a);
      x.fillStyle = PC.target.team === p.team ? '#8fd8ff' : '#ff8a5a'; x.beginPath(); x.moveTo(12, 0); x.lineTo(-6, -8); x.lineTo(-6, 8); x.closePath(); x.fill(); x.restore();
    }
  }
  // Sight.
  if (p.alive) {
    const cx = W / 2, cy = H / 2, onFoe = PC.aimShip && PC.aimShip.team !== p.team;
    x.strokeStyle = onFoe ? '#ffb070' : 'rgba(220,240,255,.85)'; x.lineWidth = 1.5;
    x.beginPath(); x.arc(cx, cy, 14, 0, TAU); x.stroke();
    x.beginPath(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { x.moveTo(cx + a * 20, cy + b * 20); x.lineTo(cx + a * 30, cy + b * 30); } x.stroke();
    x.fillStyle = 'rgba(220,240,255,.85)'; x.beginPath(); x.arc(cx, cy, 1.5, 0, TAU); x.fill();
    // Which batteries bear on the sight, and their reload.
    const labels = [];
    for (const side of ['port', 'bow', 'stbd']) {
      const b = p.bat[side]; if (!b || !PC.bears[side]) continue;
      labels.push([side === 'port' ? 'PORT' : side === 'stbd' ? 'STBD' : 'BOW', b.t <= 0, b.t / b.reload]);
    }
    x.font = 'bold 12px "Rajdhani", "Segoe UI", sans-serif';
    labels.forEach((l, i) => {
      const lx = cx + (i - (labels.length - 1) / 2) * 56, ly = cy + 46;
      x.fillStyle = l[1] ? '#7dff9a' : '#ffc04a'; x.fillText(l[0], lx, ly);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(lx - 20, ly + 4, 40, 3); x.fillStyle = l[1] ? '#7dff9a' : '#ffc04a'; x.fillRect(lx - 20, ly + 4, 40 * (l[1] ? 1 : 1 - l[2]), 3);
    });
    x.font = '11px "Rajdhani", "Segoe UI", sans-serif'; x.fillStyle = PC.range > BOLT_RANGE ? '#ff8a6a' : 'rgba(220,240,255,.7)';
    x.fillText((PC.range / 1000).toFixed(2) + ' km', cx + 52, cy - 18);
  }
  Hud.radar(x, p);
};
Hud.radar = function (x, p) {
  const H = innerHeight, R0 = Math.min(70, H * 0.1), cx = 12 + R0 + 4, cy = H - 252 - R0, range = 5000;
  x.save();
  x.fillStyle = 'rgba(6,12,20,.6)'; x.strokeStyle = 'rgba(127,212,255,.35)'; x.lineWidth = 1;
  x.beginPath(); x.arc(cx, cy, R0, 0, TAU); x.fill(); x.stroke();
  x.beginPath(); x.arc(cx, cy, R0 * 0.5, 0, TAU); x.stroke();
  x.beginPath(); x.moveTo(cx, cy - R0); x.lineTo(cx, cy + R0); x.moveTo(cx - R0, cy); x.lineTo(cx + R0, cy); x.stroke();
  // Camera direction wedge.
  const ca = angNorm(PC.yaw - p.yaw);
  x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R0, -Math.PI / 2 - ca - 0.5, -Math.PI / 2 - ca + 0.5); x.closePath(); x.fill();
  const k = R0 / range;
  const blip = (pos, fn) => {
    _hv.copy(pos).sub(p.pos); if (_hv.lengthSq() > range * range * 1.2) return;
    _hv.applyAxisAngle(UP, -p.yaw);
    const bx = cx - _hv.x * k, by = cy - _hv.z * k, h = _hv.y * k;
    if ((bx - cx) ** 2 + (by - cy) ** 2 > R0 * R0) return;
    fn(bx, by, h);
  };
  for (const c of G.craft) {
    if (!c.alive || c.mode === 'docked') continue;
    blip(c.pos, (bx, by) => { x.fillStyle = c.team === p.team ? 'rgba(127,212,255,.8)' : 'rgba(255,110,80,.9)'; x.fillRect(bx - 1, by - 1, 2, 2); });
  }
  for (const t of Combat.torps) blip(t.pos, (bx, by) => { x.fillStyle = '#ffe070'; x.fillRect(bx - 1, by - 1, 2, 2); });
  for (const s of G.ships) {
    if (!s.alive || !s.arrived || s === p) continue;
    blip(s.pos, (bx, by, h) => {
      const col = s.team === p.team ? '#7fd4ff' : '#ff6e50', sz = 2.5 + Math.min(4, s.len / 160);
      x.strokeStyle = col; x.lineWidth = 1; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by - h); x.stroke();
      x.fillStyle = col; x.fillRect(bx - sz, by - h - sz, sz * 2, sz * 2);
      if (s === PC.target) { x.strokeStyle = '#ffd34a'; x.strokeRect(bx - sz - 3, by - h - sz - 3, sz * 2 + 6, sz * 2 + 6); }
    });
  }
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(cx, cy - 6); x.lineTo(cx + 4, cy + 4); x.lineTo(cx - 4, cy + 4); x.closePath(); x.fill();
  x.fillStyle = 'rgba(200,225,255,.6)'; x.font = '10px "Rajdhani", sans-serif'; x.fillText('5 km', cx + R0 - 14, cy + R0 - 2);
  x.restore();
};
