// Iron Saber — 2D HUD canvas: holographic suit HUD (green panoramic, amber classic), helmet HUD on foot,
// radar, lock-on boxes, objective markers, warnings, cockpit CRT readouts and the tactical map.

const hudCv = $('#hud2d');
const hctx = hudCv.getContext('2d');
const HUD = { w: 1, h: 1, dpr: 1, flash: 0, flashShield: false, warn: '', warnT: 0, hitT: 0, dispT: 0, mapOn: false, alertT: 0, lockT: 0 };
const PAL_G = { main: '#7dffb0', dim: 'rgba(125,255,176,0.35)', faint: 'rgba(125,255,176,0.12)', hi: '#d8ffe8', warn: '#ff5a4a', enemy: '#ff6a5a', ally: '#7cc4ff', obj: '#ffd23a' };
const PAL_A = { main: '#ffb347', dim: 'rgba(255,179,71,0.38)', faint: 'rgba(255,179,71,0.12)', hi: '#ffe2b8', warn: '#ff4a3a', enemy: '#ff6a5a', ally: '#7cc4ff', obj: '#fff07a' };
const PAL_F = { main: '#cfe8ff', dim: 'rgba(207,232,255,0.4)', faint: 'rgba(207,232,255,0.12)', hi: '#ffffff', warn: '#ff5a4a', enemy: '#ff6a5a', ally: '#7cc4ff', obj: '#ffd23a' };
const MONO = "'Share Tech Mono', ui-monospace, Menlo, monospace";

function resizeHud(w, h) {
  HUD.dpr = Math.min(devicePixelRatio || 1, 2);
  hudCv.width = Math.round(w * HUD.dpr); hudCv.height = Math.round(h * HUD.dpr);
  HUD.w = w; HUD.h = h;
}
function hudFlash(a, shield) { HUD.flash = Math.max(HUD.flash, a); HUD.flashShield = !!shield; }
function hudWarn(t) { HUD.warn = t; HUD.warnT = 1.6; }
function hitMarker() { HUD.hitT = 0.22; }

const _hp = new V3();
// World point → screen. Returns false if behind the camera.
function toScreen(p, out) {
  _hp.copy(p).applyMatrix4(camera.matrixWorldInverse);
  const behind = _hp.z > -0.1;
  _hp.applyMatrix4(camera.projectionMatrix);
  out.x = (_hp.x * 0.5 + 0.5) * HUD.w; out.y = (-_hp.y * 0.5 + 0.5) * HUD.h; out.behind = behind;
  if (behind) { out.x = HUD.w - out.x; out.y = HUD.h - out.y; }
  return !behind;
}
const SP = { x: 0, y: 0, behind: false };
function txt(c, s, x, y, size, col, align = 'left', base = 'alphabetic') {
  c.font = `${size}px ${MONO}`; c.fillStyle = col; c.textAlign = align; c.textBaseline = base; c.fillText(s, x, y);
}
function bar(c, x, y, w, h, f, col, dim, label, val) {
  c.strokeStyle = dim; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w, h);
  c.fillStyle = col; c.fillRect(x + 2, y + 2, Math.max(0, (w - 3) * clamp(f, 0, 1)), h - 3);
  if (label) txt(c, label, x, y - 4, 12, dim);
  if (val !== undefined) txt(c, val, x + w, y - 4, 12, col, 'right');
}

function drawHud(dt) {
  const c = hctx, P = PILOT;
  c.setTransform(HUD.dpr, 0, 0, HUD.dpr, 0, 0);
  c.clearRect(0, 0, HUD.w, HUD.h);
  HUD.flash = Math.max(0, HUD.flash - dt * 2.5);
  HUD.warnT -= dt; HUD.hitT -= dt; HUD.alertT -= dt;
  if (state !== 'play' && state !== 'paused') return;
  if (HUD.mapOn) { drawMap(c); return; }
  const s = P.state === 'suit' ? P.inSuit : null;
  if (s) drawSuitHud(c, s, dt);
  else drawFootHud(c, dt);
  if (HUD.flash > 0) {
    const g = c.createRadialGradient(HUD.w / 2, HUD.h / 2, HUD.h * 0.3, HUD.w / 2, HUD.h / 2, HUD.h * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, HUD.flashShield ? `rgba(120,200,255,${HUD.flash * 0.5})` : `rgba(255,30,20,${HUD.flash * 0.55})`);
    c.fillStyle = g; c.fillRect(0, 0, HUD.w, HUD.h);
  }
}

// ---------- in a suit ----------
const RECT = { x: 0, y: 0, w: 0, h: 0 };
function drawSuitHud(c, s, dt) {
  const fp = camMode === 'fp', cls = fp && s.T.cockpit === 'classic';
  const C = cls ? PAL_A : PAL_G;
  if (cls) classicScreenRect(RECT); else { RECT.x = 0; RECT.y = 0; RECT.w = HUD.w; RECT.h = HUD.h; }
  const cx = HUD.w / 2, cy = HUD.h / 2;
  c.save();
  c.beginPath(); c.rect(RECT.x, RECT.y, RECT.w, RECT.h); c.clip();
  // monitor texture: faint scanlines on the panoramic screen
  if (fp && !cls) {
    c.fillStyle = 'rgba(0,20,10,0.05)';
    for (let y = 0; y < HUD.h; y += 3) c.fillRect(0, y, HUD.w, 1);
  }
  const bootK = clamp((BOOT.t - 0.6) / 1.6, 0, 1);
  if (BOOT.t < BOOT.dur && fp) {
    // monitors waking: black, then a sweep reveals the outside
    c.fillStyle = `rgba(0,0,0,${1 - bootK})`;
    c.fillRect(RECT.x, RECT.y, RECT.w, RECT.h);
    const sy = RECT.y + RECT.h * bootK;
    c.fillStyle = C.main; c.globalAlpha = 0.6 * (1 - bootK); c.fillRect(RECT.x, sy - 2, RECT.w, 3); c.globalAlpha = 1;
    BOOT.lines.forEach((l, i) => { if (BOOT.t > 0.3 + i * 0.35) txt(c, l, RECT.x + 30, RECT.y + 50 + i * 22, 15, C.main); });
  }
  c.globalAlpha = BOOT.t < BOOT.dur ? bootK : 1;
  // markers: enemies, locks, objectives, allies
  for (const o of SUITS) {
    if (o === s || o.dead || o.gone) continue;
    const p = o.spheres[0].p;
    const d = p.distanceTo(s.pos);
    if (d > 2400) continue;
    if (!toScreen(p, SP)) continue;
    if (o.team === 1) {
      const r = clamp(2200 / Math.max(d, 1), 8, 40);
      c.strokeStyle = C.enemy; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(SP.x, SP.y - r); c.lineTo(SP.x + r, SP.y); c.lineTo(SP.x, SP.y + r); c.lineTo(SP.x - r, SP.y); c.closePath(); c.stroke();
      if (d < 900) txt(c, Math.round(d) + 'm', SP.x + r + 4, SP.y + 4, 11, C.enemy);
    } else if (o.mode === 'parked' && d < 1500) {
      txt(c, '◇ ' + o.T.name, SP.x, SP.y - 10, 11, C.ally, 'center');
    }
  }
  if (PLAYER_LOCK && !PLAYER_LOCK.dead && !PLAYER_LOCK.gone) {
    const t = PLAYER_LOCK, p = t.spheres[0].p;
    if (toScreen(p, SP)) {
      const d = p.distanceTo(s.pos);
      const r = clamp(3000 / d, 22, 70) * (1 + Math.max(0, HUD.lockT) * 2);
      c.strokeStyle = C.warn; c.lineWidth = 2;
      const k = r * 0.35;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        c.beginPath(); c.moveTo(SP.x + sx * r, SP.y + sy * (r - k)); c.lineTo(SP.x + sx * r, SP.y + sy * r); c.lineTo(SP.x + sx * (r - k), SP.y + sy * r); c.stroke();
      }
      txt(c, 'LOCK', SP.x, SP.y - r - 6, 12, C.warn, 'center');
      txt(c, t.name, SP.x + r + 6, SP.y - 6, 12, C.warn);
      txt(c, Math.round(d) + 'm', SP.x + r + 6, SP.y + 10, 12, C.warn);
      bar(c, SP.x - r, SP.y + r + 6, r * 2, 5, t.hp / t.maxHp, C.warn, C.dim);
    }
  }
  HUD.lockT -= dt * 4;
  drawObjectives(c, C, s.pos);
  // reticle
  c.strokeStyle = C.main; c.lineWidth = 1.5;
  c.beginPath(); c.arc(cx, cy, 18, 0, TAU); c.stroke();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); c.lineTo(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36); c.stroke(); }
  c.fillStyle = C.main; c.fillRect(cx - 1, cy - 1, 2, 2);
  if (HUD.hitT > 0) { c.strokeStyle = C.hi; c.lineWidth = 2; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(cx + a * 8, cy + b * 8); c.lineTo(cx + a * 16, cy + b * 16); c.stroke(); } }
  txt(c, AIM.dist < 3000 ? Math.round(AIM.dist) + '' : '----', cx + 40, cy + 4, 12, C.dim);
  // pitch ladder and heading tape
  drawCompass(c, C, cx, RECT.y + 26, Math.min(520, RECT.w * 0.6), CAM.yaw);
  c.strokeStyle = C.faint; c.lineWidth = 1;
  for (let a = -60; a <= 60; a += 10) {
    if (!a) continue;
    const y = cy + (CAM.pitch * 180 / Math.PI - a) * (HUD.h / camera.fov) * 1;
    if (y < RECT.y + 50 || y > RECT.y + RECT.h - 60) continue;
    c.beginPath(); c.moveTo(cx - 140, y); c.lineTo(cx - 90, y); c.moveTo(cx + 90, y); c.lineTo(cx + 140, y); c.stroke();
    txt(c, a + '', cx - 146, y + 4, 10, C.faint, 'right');
  }
  // alerts
  if (INCOMING > 0) {
    if (Math.floor(clock * 4) % 2) txt(c, '▲ MISSILE ALERT ▲', cx, RECT.y + RECT.h * 0.28, 20, C.warn, 'center');
    alarmSound();
  }
  if (HUD.warnT > 0) txt(c, HUD.warn, cx, cy + 90, 16, C.warn, 'center');
  if (s.hp < s.maxHp * 0.3 && Math.floor(clock * 2) % 2) txt(c, 'ARMOR CRITICAL', cx, cy + 112, 16, C.warn, 'center');
  const exitHint = canExit(s) && Math.hypot(s.vel.x, s.vel.z) < 1 && s.modeT > 6;
  if (exitHint) txt(c, '[E] DISEMBARK', cx, RECT.y + RECT.h - 18, 13, C.dim, 'center');
  c.restore();
  // gauges: holographic overlay on the panoramic monitor and in third person; CRTs in the classic cockpit
  if (!cls) {
    c.globalAlpha = BOOT.t < BOOT.dur ? bootK : 1;
    drawGauges(c, C, s, 28, HUD.h - 200);
    drawWeapons(c, C, s, HUD.w - 250, HUD.h - 200);
    drawRadarAt(c, C, s.pos, CAM.yaw, 100, 120, 80, 1200);
    txt(c, s.T.name, 28, HUD.h - 214, 14, C.main);
    const spd = Math.hypot(s.vel.x, s.vel.z) * 3.6;
    txt(c, `SPD ${Math.round(spd).toString().padStart(3, ' ')} km/h   ALT ${Math.round(s.pos.y - terrainH(s.pos.x, s.pos.z))} m`, cx, HUD.h - 34, 13, C.dim, 'center');
    c.globalAlpha = 1;
  } else {
    // amber essentials along the bottom of the screen
    bar(c, RECT.x + 12, RECT.y + RECT.h - 22, 160, 8, s.hp / s.maxHp, s.hp < s.maxHp * 0.3 ? C.warn : C.main, C.dim, 'ARMOR');
    bar(c, RECT.x + RECT.w - 172, RECT.y + RECT.h - 22, 160, 8, s.boost / s.T.boostMax, C.main, C.dim, 'BOOST');
  }
  // cockpit displays at 10 Hz
  HUD.dispT -= dt;
  if (HUD.dispT <= 0 && fp) { HUD.dispT = 0.1; drawDisplays(s, cls ? PAL_A : PAL_G); }
}
function drawCompass(c, C, cx, y, w, yaw) {
  const deg = ((-yaw * 180 / Math.PI) % 360 + 540) % 360;
  c.strokeStyle = C.dim; c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx - w / 2, y + 10); c.lineTo(cx + w / 2, y + 10); c.stroke();
  for (let d = -60; d <= 60; d += 5) {
    const h = Math.round(deg + d), x = cx + d / 60 * w / 2;
    const hh = ((h % 360) + 360) % 360;
    c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x, y + (hh % 15 === 0 ? 2 : 6)); c.stroke();
    if (hh % 45 === 0) txt(c, ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][hh / 45], x, y + 24, 12, hh === 0 ? C.hi : C.main, 'center');
  }
  c.fillStyle = C.main; c.beginPath(); c.moveTo(cx, y + 12); c.lineTo(cx - 5, y + 18); c.lineTo(cx + 5, y + 18); c.fill();
}
function drawGauges(c, C, s, x, y) {
  bar(c, x, y + 10, 200, 10, s.hp / s.maxHp, s.hp < s.maxHp * 0.3 ? C.warn : C.main, C.dim, 'ARMOR', Math.max(0, Math.round(s.hp)) + '');
  bar(c, x, y + 46, 200, 8, s.boost / s.T.boostMax, s.boost < 15 ? C.warn : C.main, C.dim, 'BOOST', Math.round(s.boost / s.T.boostMax * 100) + '%');
  if (s.T.primary.kind === 'beam') bar(c, x, y + 80, 200, 8, s.energy / 100, s.energy < s.T.primary.cost ? C.warn : C.main, C.dim, 'E-CAP', Math.round(s.energy) + '%');
  txt(c, s.onGround ? (s.dashing ? 'DASH' : 'GROUND') : s.flying ? 'THRUST' : 'AIRBORNE', x, y + 108, 12, C.dim);
}
function drawWeapons(c, C, s, x, y) {
  const T = s.T, rows = [];
  const pk = T.primary.kind;
  rows.push([pk === 'beam' ? 'BEAM RIFLE' : pk === 'mg' ? '120mm MG' : '240mm CANNON', pk === 'beam' ? Math.floor(s.energy / T.primary.cost) + ' SHOT' : 'READY', 'LMB']);
  if (T.vulcan) rows.push(['VULCAN', s.overheat ? 'OVERHEAT' : Math.round(s.heat) + '% HEAT', 'Q']);
  rows.push([T.missiles + 'x MISSILE', s.mslReload > 0 ? 'RELOAD ' + s.mslReload.toFixed(1) : s.mslLeft + ' READY', 'R']);
  rows.push([T.melee === 'axe' ? 'HEAT AXE' : 'BEAM SABER', s.meleeCD > 0 ? '...' : 'READY', 'F']);
  if (T.shield) rows.push(['SHIELD', s.block > 0.5 ? 'GUARD' : 'STOWED', 'RMB']);
  rows.forEach((r, i) => {
    const yy = y + 14 + i * 22;
    txt(c, r[2], x, yy, 11, C.dim);
    txt(c, r[0], x + 36, yy, 13, C.main);
    txt(c, r[1], x + 222, yy, 12, /OVERHEAT|RELOAD/.test(r[1]) ? C.warn : C.dim, 'right');
  });
}
// radar: north-up rotating to heading, enemies red, allies blue, objectives yellow
function drawRadarAt(c, C, pos, yaw, cx, cy, r, range) {
  c.save();
  c.strokeStyle = C.dim; c.lineWidth = 1;
  c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
  c.beginPath(); c.arc(cx, cy, r / 2, 0, TAU); c.strokeStyle = C.faint; c.stroke();
  c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx + r, cy); c.moveTo(cx, cy - r); c.lineTo(cx, cy + r); c.stroke();
  const sweep = (clock * 2) % TAU;
  c.fillStyle = C.faint; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, sweep - 0.5, sweep); c.fill();
  const plot = (x, z, col, sz) => {
    const dx = x - pos.x, dz = z - pos.z;
    // rotate so the view direction is up
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    const fx = dx * sa + dz * ca, rx = dx * ca - dz * sa;
    let px = -rx / range * r, py = -fx / range * r;
    const L = Math.hypot(px, py);
    if (L > r) { px *= r / L; py *= r / L; sz *= 0.7; }
    c.fillStyle = col; c.fillRect(cx + px - sz / 2, cy + py - sz / 2, sz, sz);
  };
  for (const o of SUITS) {
    if (o.dead || o.gone) continue;
    if (o.team === 1) { if (Math.hypot(o.pos.x - pos.x, o.pos.z - pos.z) < range * 1.6) plot(o.pos.x, o.pos.z, C.enemy, 5); }
    else if (o !== PILOT.inSuit) plot(o.pos.x, o.pos.z, C.ally, 4);
  }
  for (const m of objectiveMarkers()) plot(m.x, m.z, C.obj, 6);
  c.fillStyle = C.main; c.beginPath(); c.moveTo(cx, cy - 6); c.lineTo(cx - 4, cy + 4); c.lineTo(cx + 4, cy + 4); c.fill();
  // north tick
  txt(c, 'N', cx - Math.sin(yaw) * (r + 9), cy + Math.cos(yaw) * (r + 9) + 4, 11, C.main, 'center');
  c.restore();
}
function drawObjectives(c, C, from) {
  for (const m of objectiveMarkers()) {
    _v1.set(m.x, m.y, m.z);
    const d = Math.hypot(m.x - from.x, m.z - from.z);
    const on = toScreen(_v1, SP);
    let x = SP.x, y = SP.y;
    const pad = 40;
    if (!on || x < pad || x > HUD.w - pad || y < pad || y > HUD.h - pad) {
      // clamp to the screen edge
      const dx = x - HUD.w / 2, dy = y - HUD.h / 2, k = Math.min((HUD.w / 2 - pad) / Math.abs(dx || 1), (HUD.h / 2 - pad) / Math.abs(dy || 1));
      x = HUD.w / 2 + dx * k; y = HUD.h / 2 + dy * k;
    }
    c.strokeStyle = C.obj; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 9, y); c.lineTo(x, y + 9); c.lineTo(x - 9, y); c.closePath(); c.stroke();
    txt(c, m.label, x, y - 14, 12, C.obj, 'center');
    txt(c, (d > 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm'), x, y + 22, 11, C.obj, 'center');
  }
}

// ---------- on foot ----------
function drawFootHud(c, dt) {
  const C = PAL_F, P = PILOT, cx = HUD.w / 2, cy = HUD.h / 2;
  if (P.state === 'dead') return;
  drawCompass(c, C, cx, 18, Math.min(420, HUD.w * 0.5), CAM.yaw);
  if (camMode === 'fp' && P.state === 'foot') { c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(cx, cy, 2, 0, TAU); c.fill(); }
  bar(c, 24, HUD.h - 44, 180, 8, P.hp / 100, P.hp < 35 ? C.warn : C.main, C.dim, 'PILOT VITALS', Math.round(P.hp) + '');
  txt(c, regionName(P.pos.x, P.pos.z), 24, HUD.h - 66, 13, C.dim);
  // nearby suits
  for (const s of SUITS) {
    if (s.team !== 0 || s.dead || s.gone) continue;
    _v1.copy(s.spheres[0].p);
    const d = _v1.distanceTo(P.pos);
    if (!toScreen(_v1, SP)) continue;
    txt(c, '◇ ' + s.T.name, SP.x, SP.y - 8, 12, C.ally, 'center');
    txt(c, Math.round(d) + 'm' + (s.mode === 'parked' ? '' : s.auto ? ' · INBOUND' : ''), SP.x, SP.y + 8, 11, C.ally, 'center');
  }
  for (const s of SUITS) {
    if (s.team !== 1 || s.dead || s.gone) continue;
    const d = s.pos.distanceTo(P.pos);
    if (d > 700 || !toScreen(s.spheres[0].p, SP)) continue;
    txt(c, '▼ HOSTILE ' + Math.round(d) + 'm', SP.x, SP.y - 30, 12, C.enemy, 'center');
  }
  drawObjectives(c, C, P.pos);
  drawRadarAt(c, C, P.pos, CAM.yaw, HUD.w - 90, HUD.h - 100, 64, 900);
  if (HUD.warnT > 0) txt(c, HUD.warn, cx, cy + 80, 15, C.warn, 'center');
}

// ---------- cockpit CRT readouts ----------
function drawDisplays(s, C) {
  // radar
  let d = dispRadar, c = d.ctx;
  c.fillStyle = '#020604'; c.fillRect(0, 0, 256, 256);
  drawRadarAt(c, C, s.pos, CAM.yaw, 128, 128, 112, 1200);
  d.tex.needsUpdate = true;
  // status: armor silhouette and gauges
  d = dispStatus; c = d.ctx;
  c.fillStyle = '#020604'; c.fillRect(0, 0, 256, 256);
  txt(c, s.T.name, 12, 24, 16, C.main);
  bar(c, 12, 56, 232, 12, s.hp / s.maxHp, s.hp < s.maxHp * 0.3 ? C.warn : C.main, C.dim, 'ARMOR', Math.round(s.hp) + '');
  bar(c, 12, 100, 232, 12, s.boost / s.T.boostMax, C.main, C.dim, 'BOOST');
  if (s.T.primary.kind === 'beam') bar(c, 12, 144, 232, 12, s.energy / 100, C.main, C.dim, 'E-CAP');
  else txt(c, s.T.primary.kind === 'mg' ? '120mm  AMMO  ∞' : '240mm  HE  READY', 12, 150, 15, C.main);
  txt(c, s.mslReload > 0 ? 'MSL RELOAD ' + s.mslReload.toFixed(1) : 'MSL x' + s.mslLeft + ' READY', 12, 190, 15, s.mslReload > 0 ? C.warn : C.main);
  txt(c, (s.T.melee === 'axe' ? 'HEAT AXE ' : 'SABER ') + (s.meleeCD > 0 ? '--' : 'OK'), 12, 214, 15, C.main);
  txt(c, 'SPD ' + Math.round(Math.hypot(s.vel.x, s.vel.z) * 3.6) + ' km/h', 12, 240, 14, C.dim);
  d.tex.needsUpdate = true;
  // system line
  d = dispSys; c = d.ctx;
  c.fillStyle = '#020604'; c.fillRect(0, 0, 256, 128);
  const lines = [`REACTOR ${(96 + Math.sin(clock) * 2).toFixed(1)}%`, `TEMP ${Math.round(310 + s.heat)}K`, `${regionName(s.pos.x, s.pos.z)}`, `${Math.round(s.pos.x)} / ${Math.round(s.pos.z)}`];
  lines.forEach((l, i) => txt(c, l, 10, 26 + i * 26, 15, i === 2 ? C.main : C.dim));
  d.tex.needsUpdate = true;
}

// ---------- tactical map ----------
let mapImg = null;
function buildMapImage() {
  const N = 260, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), img = g.createImageData(N, N), col = new THREE.Color();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -HALF + (i + 0.5) / N * HALF * 2, z = -HALF + (j + 0.5) / N * HALF * 2;
    const h = terrainH(x, z), hx = terrainH(x + 15, z) - h, hz = terrainH(x, z + 15) - h;
    terrainColor(x, h, z, 0.9, col);
    let k = clamp(1 - (hx + hz) * 0.02, 0.6, 1.3);
    if (lakeAt(x, z)) { col.setRGB(0.18, 0.4, 0.55); k = 1; }
    if (inCity(x, z)) { const q = ((x + CITY_HALF) % BLOCK + BLOCK) % BLOCK, w = ((z + CITY_HALF) % BLOCK + BLOCK) % BLOCK; if (Math.min(q, BLOCK - q, w, BLOCK - w) < ROAD_HW) col.setRGB(0.25, 0.25, 0.27); else col.setRGB(0.55, 0.55, 0.53); }
    const o = (j * N + i) * 4;
    img.data[o] = clamp(col.r * k * 255, 0, 255); img.data[o + 1] = clamp(col.g * k * 255, 0, 255); img.data[o + 2] = clamp(col.b * k * 255, 0, 255); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // buildings
  g.fillStyle = 'rgba(60,62,70,0.9)';
  for (const b of BLD) {
    const x = (b.x0 + HALF) / (HALF * 2) * N, z = (b.z0 + HALF) / (HALF * 2) * N;
    g.fillRect(x, z, Math.max(1, (b.x1 - b.x0) / (HALF * 2) * N), Math.max(1, (b.z1 - b.z0) / (HALF * 2) * N));
  }
  mapImg = cv;
}
function drawMap(c) {
  const S = Math.min(HUD.w, HUD.h) * 0.86, x0 = (HUD.w - S) / 2, y0 = (HUD.h - S) / 2;
  c.fillStyle = 'rgba(4,8,10,0.75)'; c.fillRect(0, 0, HUD.w, HUD.h);
  c.imageSmoothingEnabled = true;
  c.globalAlpha = 0.92; c.drawImage(mapImg, x0, y0, S, S); c.globalAlpha = 1;
  c.strokeStyle = PAL_G.main; c.lineWidth = 2; c.strokeRect(x0, y0, S, S);
  const M = (x, z) => [x0 + (x + HALF) / (HALF * 2) * S, y0 + (z + HALF) / (HALF * 2) * S];
  // region labels
  for (const [n, x, z] of [['GREYSPINE MOUNTAINS', 0, -1900], ['KESRA DESERT', 1800, -500], ['ELDWOOD FOREST', -1800, 300], ['MERIDIAN PLAINS', 900, 1900], ['NEW HAVEN', 0, -760], ['COALITION BASE', 0, 1370]]) {
    const [px, py] = M(x, z); txt(c, n, px, py, 13, 'rgba(255,255,255,0.75)', 'center');
  }
  for (const s of SUITS) {
    if (s.dead || s.gone) continue;
    const [px, py] = M(s.pos.x, s.pos.z);
    if (s.team === 1) { if (s.pos.distanceTo(playerPos(_v1)) < 1500) { c.fillStyle = PAL_G.enemy; c.fillRect(px - 3, py - 3, 6, 6); } }
    else { c.fillStyle = PAL_G.ally; c.beginPath(); c.arc(px, py, 5, 0, TAU); c.fill(); txt(c, s.T.name.split(' ')[1], px + 8, py + 4, 11, PAL_G.ally); }
  }
  for (const m of objectiveMarkers(true)) {
    const [px, py] = M(m.x, m.z);
    c.strokeStyle = PAL_G.obj; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px, py - 8); c.lineTo(px + 8, py); c.lineTo(px, py + 8); c.lineTo(px - 8, py); c.closePath(); c.stroke();
    txt(c, m.label, px, py - 12, 12, PAL_G.obj, 'center');
  }
  const p = playerPos(_v1), [px, py] = M(p.x, p.z);
  c.save(); c.translate(px, py); c.rotate(-CAM.yaw + Math.PI);
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 7); c.lineTo(-6, 7); c.closePath(); c.fill(); c.restore();
  txt(c, 'TACTICAL MAP · M TO CLOSE', HUD.w / 2, y0 - 10, 14, PAL_G.main, 'center');
  txt(c, 'N', x0 + S / 2, y0 + 18, 14, '#fff', 'center');
}
