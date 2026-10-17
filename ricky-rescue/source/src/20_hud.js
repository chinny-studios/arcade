// Ricky Rescue — the HUD: clock and status, GPS directions, minimap and full map, speed and lights, radio chatter,
// toasts, interaction prompts, the dispatch card and a small patient monitor while driving.

const HUD = { radio: [], toasts: [], map: null, mapBig: false, prompts: [], promptIdx: 0, lastStatus: '' };

function radio(who, text, kind = 'other') {
  HUD.radio.push({ who, text, kind, t: performance.now() });
  if (HUD.radio.length > 40) HUD.radio.shift();
  AUDIO.squelch();
  renderRadio();
  if (G.call) G.call.log.push({ t: G.call.t, who, text, radio: true });
}
function renderRadio() {
  const box = $('#radio'); if (!box) return;
  const now = performance.now();
  box.innerHTML = HUD.radio.slice(-4).map((m) => `<div class="rm ${m.kind}${now - m.t > 14000 ? ' old' : ''}"><b>${esc(m.who)}</b> ${esc(m.text)}</div>`).join('');
}
function toast(text, kind = '') {
  const box = $('#toasts'); if (!box) return;
  const t = el('div', 'toast ' + kind, esc(text)); box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3900);
  if (kind === 'bad') AUDIO.tone(300, 0.12, 'square', 0.04);
}

// ---------- minimap ----------
function buildMinimap() {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), k = S / (CW + 80), o = 40;
  const P = (x) => (x + o) * k;
  g.fillStyle = '#1b2a1e'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#1d3a52'; g.fillRect(0, 0, P(-31), P(CW / 2));
  const dcol = { maple: '#2c3b2c', eastgate: '#3a3630', downtown: '#30343e', harbor: '#2e3436' };
  for (const b of CITY.blocks) {
    g.fillStyle = b.kind === 'park' || b.kind === 'plaza' ? '#2f5530' : dcol[b.district];
    g.fillRect(P(b.sx0), P(b.sz0), (b.sx1 - b.sx0) * k, (b.sz1 - b.sz0) * k);
  }
  g.fillStyle = 'rgba(0,0,0,.25)';
  for (const s of CITY.solids) if (!s.r && s.h > 2 && s.tag !== 'water' && s.tag !== 'car') g.fillRect(P(s.x0), P(s.z0), (s.x1 - s.x0) * k, (s.z1 - s.z0) * k);
  for (const e of CITY.edges) {
    const A = CITY.nodes[e.a], B = CITY.nodes[e.b];
    g.strokeStyle = e.line === 0 || e.line === CN ? '#c8b060' : e.lanes === 2 ? '#a8a8a0' : '#7a7a76';
    g.lineWidth = e.half * 2 * k;
    g.beginPath(); g.moveTo(P(A.x), P(A.z)); g.lineTo(P(B.x), P(B.z)); g.stroke();
  }
  for (const H of Object.values(CITY.hospitals)) { g.fillStyle = '#e8eef4'; g.fillRect(P(H.x) - 9, P(H.z) - 9, 18, 18); g.fillStyle = '#d02a2a'; g.fillRect(P(H.x) - 2.5, P(H.z) - 7, 5, 14); g.fillRect(P(H.x) - 7, P(H.z) - 2.5, 14, 5); }
  const st = CITY.station; g.fillStyle = '#2a5ad8'; g.beginPath(); g.arc(P(st.x), P(st.z), 7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('12', P(st.x), P(st.z) + 3);
  // district names
  g.font = 'bold 13px sans-serif'; g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillText('HARBOR', P(240), P(110)); g.fillText('DOWNTOWN', P(720), P(110)); g.fillText('MAPLE HEIGHTS', P(240), P(940)); g.fillText('EASTGATE', P(720), P(940));
  HUD.map = { cv, k, o, S };
}
function drawMinimap(cvId, big) {
  const cv = $(cvId); if (!cv || !HUD.map || !RIG) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, M = HUD.map;
  const fx = G.where === 'foot' ? PLAYER.x : RIG.x, fz = G.where === 'foot' ? PLAYER.z : RIG.z;
  const P = (x) => (x + M.o) * M.k;
  g.save(); g.clearRect(0, 0, W, H);
  if (big) {
    const s = Math.min(W, H) / M.S; g.translate((W - M.S * s) / 2, (H - M.S * s) / 2); g.scale(s, s);
    g.drawImage(M.cv, 0, 0);
    // locked districts
    for (const [id, d] of Object.entries(DISTRICTS)) if (!G.career.districts.includes(id)) { const e = id === 'downtown' || id === 'eastgate', so = id === 'maple' || id === 'eastgate'; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(P(e ? CW / 2 : 0), P(so ? CW / 2 : 0), CW / 2 * M.k, CW / 2 * M.k); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '11px sans-serif'; g.textAlign = 'center'; g.fillText('Unlocks at ' + RANKS[d.rank].name + ' / ' + d.xp + ' XP', P(e ? CW * 0.75 : CW / 4), P(so ? CW * 0.75 : CW / 4) + 18); }
  } else {
    g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, TAU); g.clip();
    const zoom = 2.6, rot = G.where === 'cab' || G.where === 'back' ? -RIG.yaw + Math.PI : -CAM.userYaw;
    g.translate(W / 2, H / 2); g.scale(zoom, zoom); g.rotate(OPTS.mapRotate ? rot + Math.PI : 0); g.translate(-P(fx), -P(fz));
    g.drawImage(M.cv, 0, 0);
  }
  // route
  if (ROUTE.pts && ROUTE.pts.length > 1) { g.strokeStyle = '#40e0ff'; g.lineWidth = big ? 3 : 2.2; g.beginPath(); ROUTE.pts.forEach((p, i) => (i ? g.lineTo(P(p.x), P(p.z)) : g.moveTo(P(p.x), P(p.z)))); g.stroke(); }
  // the call
  const C = G.call;
  if (C && C.place && C.stage !== 'done') { g.fillStyle = '#ff4a4a'; g.beginPath(); g.arc(P(C.place.x), P(C.place.z), big ? 6 : 4, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
  if (C && C.staging && C.stage === 'enroute' && !C.pdCleared) { g.fillStyle = '#ffd040'; g.beginPath(); g.arc(P(C.staging.x), P(C.staging.z), 4, 0, TAU); g.fill(); }
  // fire engines and police cars out on the road, flashing while they run hot
  const flash = Math.floor(performance.now() / 280) % 2;
  for (const u of RESP.units) {
    if (u.state === 'home' || u.state === 'gone') continue;
    g.fillStyle = u.kind === 'fire' ? (u.siren && flash ? '#ffffff' : '#ff3a2a') : (u.siren && flash ? '#ff3a3a' : '#4a8aff');
    const s = big ? 5 : 3.2; g.fillRect(P(u.x) - s / 2, P(u.z) - s / 2, s, s);
  }
  // traffic dots when zoomed in
  if (!big) { g.fillStyle = 'rgba(255,255,255,.45)'; for (const c of TRAFFIC.cars) g.fillRect(P(c.x) - 1, P(c.z) - 1, 2, 2); }
  // us
  g.save(); g.translate(P(RIG.x), P(RIG.z)); g.rotate(-RIG.yaw + Math.PI);
  g.fillStyle = RIG.siren ? (Math.floor(performance.now() / 300) % 2 ? '#ff4040' : '#ffffff') : '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill(); g.restore();
  if (G.where === 'foot') { g.fillStyle = '#ffd040'; g.beginPath(); g.arc(P(PLAYER.x), P(PLAYER.z), big ? 3.5 : 2.5, 0, TAU); g.fill(); }
  g.restore();
}

// ---------- per-frame HUD ----------
function updateHUD(dt) {
  const C = G.call, S = G.shift;
  $('#clock').textContent = fmtClock(G.clockT);
  $('#shiftEnd').textContent = S ? (S.over ? 'Shift over' : 'Shift ends ' + fmtClock(S.endT)) : '';
  // status line
  let st = 'In service · waiting for a call', sub = '';
  if (C) {
    const P = C.P;
    const pri = `<span class="pri p${C.pri}">P${C.pri}</span> `;
    if (C.stage === 'pending') st = pri + 'New call: ' + esc(C.nature);
    else if (C.stage === 'enroute') st = pri + (C.hazard && !C.pdCleared ? 'Responding to staging for ' : 'Responding to ') + esc(C.addr);
    else if (C.stage === 'staging') st = pri + 'Staged, waiting for police';
    else if (C.stage === 'onscene') st = pri + 'On scene: ' + esc(C.nature);
    else if (C.stage === 'transport') st = pri + 'Transporting to ' + esc(HOSPITALS[C.dest].short);
    else if (C.stage === 'hospital') st = 'At ' + esc(HOSPITALS[C.dest].short) + ': unload and hand off';
    sub = C.stage === 'enroute' ? 'Call time ' + fmtDur(C.t) : C.times.arrive !== undefined ? 'On scene ' + fmtDur(C.t - C.times.arrive) : '';
    const ul = unitsLine(C); if (ul) sub += (sub ? ' · ' : '') + ul;
    if (C.mci && !C.mci.sent && C.stage === 'onscene') sub = `Triaged ${C.mci.tags.size} of ${C.mci.pts.length}` + (C.mci.tags.size === C.mci.pts.length ? ' · radio your report (R)' : '');
  } else if (S && !S.over && S.nextCallT > G.clockT) sub = 'Press T to skip ahead to the next call';
  if (st !== HUD.lastStatus) { $('#status').innerHTML = st; HUD.lastStatus = st; }
  $('#statusSub').textContent = sub;
  // GPS
  const gps = $('#gps');
  if (ROUTE.pts && ROUTE.left !== undefined && (G.where === 'cab' || G.where === 'foot') && OPTS.gps) {
    gps.hidden = false;
    const n = ROUTE.next;
    $('#gpsArrow').className = 'arrow ' + (n ? n.kind : 'straight');
    $('#gpsText').textContent = n && n.d < 400 ? `${n.kind === 'left' ? 'Left' : 'Right'} onto ${n.street}` : (ROUTE.label || 'Destination');
    $('#gpsDist').textContent = (n && n.d < 400 ? Math.round(n.d / 5) * 5 + ' m · ' : '') + Math.round(ROUTE.left) + ' m left';
  } else gps.hidden = true;
  // speed, lights
  const drv = G.where === 'cab';
  $('#drive').hidden = !drv;
  if (drv && RIG) {
    $('#speed').textContent = Math.round(Math.abs(RIG.v) * (OPTS.units === 'kmh' ? 3.6 : 2.237));
    $('#speedU').textContent = OPTS.units === 'kmh' ? 'km/h' : 'mph';
    $('#lsBtn').classList.toggle('on', RIG.siren);
    $('#lsBtn').textContent = RIG.siren ? 'L&S ON · ' + RIG.tone.toUpperCase() : 'Lights & sirens';
    $('#dmg i').style.width = (100 - RIG.damage) + '%';
  }
  // mini patient monitor when the patient is aboard and Ricky is driving, or the care panel is shut mid-call
  const mm = $('#miniMon');
  const P = C && C.P;
  const showMini = P && !CARE.open && (C.times.contact !== undefined) && (P.monitor || drv) && C.stage !== 'done' && !(C.mci && !C.mci.sent);
  mm.hidden = !showMini;
  if (showMini) {
    const live = P.monitor;
    $('#mmHR').textContent = P.arrest ? (live ? RHYTHM_NAMES[P.v.rhythm].split(' ')[0] : '--') : live ? Math.round(P.v.hr) : (P.meas.hr ? P.meas.hr.v : '--');
    $('#mmSp').textContent = P.arrest ? '--' : live ? Math.round(P.v.spo2) : (P.meas.spo2 ? P.meas.spo2.v : '--');
    $('#mmBP').textContent = P.meas.bp ? P.meas.bp.v : '--';
    mm.classList.toggle('alarm', !!P.arrest || (live && (P.v.spo2 < 88 || P.v.hr > 140 || P.v.hr < 45)));
    $('#mmWho').textContent = WORK.partner ? PARTNER_SHORT + ': ' + WORK.partner.name : PARTNER.task === 'back' ? PARTNER_SHORT + ' is with the patient' : '';
  }
  // interaction prompts
  HUD.prompts = UI.blocking() ? [] : interactions();
  const pr = $('#prompt');
  if (HUD.prompts.length) {
    pr.hidden = false;
    const keyName = Input.mode === 'pad' ? 'A' : Input.mode === 'touch' ? 'tap' : 'E';
    HUD.promptIdx = HUD.promptIdx % HUD.prompts.length;
    pr.innerHTML = HUD.prompts.map((p, i) => `<div class="pp${i === HUD.promptIdx ? ' on' : ''}" data-i="${i}"><span class="k">${i === HUD.promptIdx ? keyName : ''}</span>${esc(p.label)}</div>`).join('') + (HUD.prompts.length > 1 ? `<div class="hint">${Input.mode === 'pad' ? 'D-pad' : 'Tab'} to switch</div>` : '');
  } else pr.hidden = true;
  // dispatch card
  const dc = $('#dispatch');
  dc.hidden = !(C && C.stage === 'pending');
  if (!dc.hidden) $('#dispText').textContent = C.dispatchText;
  // staging / scene hints
  HUD.radioT = (HUD.radioT || 0) - dt; if (HUD.radioT <= 0) { HUD.radioT = 1; renderRadio(); }
  drawMinimap('#minimap', false);
  if (HUD.mapBig) drawMinimap('#bigmap', true);
  // touch controls follow what Ricky is doing
  document.body.dataset.where = G.where;
}
function usePrompt(i) {
  const p = HUD.prompts[i === undefined ? HUD.promptIdx : i];
  if (p) { AUDIO.click(); p.fn(); }
}
