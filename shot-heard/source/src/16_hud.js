// Shot Heard — HUD: painted map image, minimap, compass, flag and soldier markers, crosshair, hit and damage
// indicators, gun-laying marker, spyglass mask; DOM panels for tickets, flags, feed, messages, weapon and drill.

const hud = $('#hud2d'), hg = hud.getContext('2d');
let HW = 1280, HH = 720, HDPR = 1, hudReloadPaused = 0;
function resizeHud(w, h) {
  HDPR = Math.min(devicePixelRatio || 1, 2);
  HW = w; HH = h; hud.width = Math.round(w * HDPR); hud.height = Math.round(h * HDPR);
}
const HUDC = { friend: '#63b0ff', foe: '#ff6a48', neutral: '#e8e2d0', squad: '#9ccb6a', gold: '#d7b45a' };
const relC = (team) => team < 0 ? HUDC.neutral : PL.s && team === PL.s.team ? HUDC.friend : (!PL.s && team === MATCH.side) ? HUDC.friend : HUDC.foe;

// ---------- the map image ----------
let MAPIMG = null;
function makeMapImage() {
  const S = 512, half = TER.half;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), img = g.createImageData(S, S), D = img.data;
  const colA = TER.geo.attributes.color.array, N = TER.N;
  const L = new V3(-0.6, 0.7, -0.4).normalize();
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = -half + (i + 0.5) / S * half * 2, z = -half + (j + 0.5) / S * half * 2;
    const vi = Math.round((x + TER.ext) / TER.step), vj = Math.round((z + TER.ext) / TER.step), k = (vj * N + vi) * 3;
    normalAt(x, z, _v1);
    const sh = clamp(0.55 + _v1.dot(L) * 0.6, 0.35, 1.25);
    let r = colA[k] * sh, gg = colA[k + 1] * sh, b = colA[k + 2] * sh;
    const fo = forestAt(x, z);
    if (fo > 0.1) { r = lerp(r, 0.2, fo * 0.6); gg = lerp(gg, 0.3, fo * 0.6); b = lerp(b, 0.16, fo * 0.6); }
    const wd = waterDepth(x, z);
    if (wd > 0) { const t = clamp(wd / 3, 0, 1); r = lerp(0.42, 0.24, t); gg = lerp(0.52, 0.36, t); b = lerp(0.56, 0.48, t); }
    // contours
    const hh = heightAt(x, z);
    if (Math.abs(((hh + 100) % 5) - 2.5) > 2.35 && wd < 0) { r *= 0.85; gg *= 0.85; b *= 0.85; }
    const o = (j * S + i) * 4;
    D[o] = clamp(r * 255, 0, 255); D[o + 1] = clamp(gg * 255, 0, 255); D[o + 2] = clamp(b * 255, 0, 255); D[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const sc = S / (half * 2), P = (x, z) => [(x + half) * sc, (z + half) * sc];
  // buildings, walls, works
  g.fillStyle = 'rgba(60,40,30,.9)';
  for (const b of LAYOUT.buildings) {
    const [x, z] = P(b.x, b.z);
    g.save(); g.translate(x, z); g.rotate(-b.yaw); g.fillRect(-b.w / 2 * sc, -b.d / 2 * sc, b.w * sc, b.d * sc); g.restore();
  }
  g.lineWidth = 1.2;
  for (const w of TER.map.walls) {
    g.strokeStyle = w.kind === 'stone' ? 'rgba(90,86,78,.9)' : 'rgba(110,80,50,.8)';
    g.beginPath(); w.pts.forEach((p, i) => { const [x, z] = P(p[0], p[1]); i ? g.lineTo(x, z) : g.moveTo(x, z); }); g.stroke();
  }
  g.lineWidth = 2.2; g.strokeStyle = 'rgba(100,70,40,.85)';
  for (const w of (TER.map.works || []).concat(TER.map.trenches || [])) { g.beginPath(); w.pts.forEach((p, i) => { const [x, z] = P(p[0], p[1]); i ? g.lineTo(x, z) : g.moveTo(x, z); }); g.stroke(); }
  // a paper wash over the whole thing
  g.fillStyle = 'rgba(230,215,180,.12)'; g.fillRect(0, 0, S, S);
  MAPIMG = cv;
  return cv;
}
// world → map canvas coordinates for a canvas of size S
const mapXY = (x, z, S) => [(x + TER.half) / (TER.half * 2) * S, (z + TER.half) / (TER.half * 2) * S];
function drawFlagIcon(g, x, y, f, r = 9) {
  g.beginPath(); g.arc(x, y, r, 0, TAU);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = relC(f.owner); g.stroke();
  if (f.ctrl < 1 && f.ctrl > 0) { g.beginPath(); g.arc(x, y, r + 2.5, -Math.PI / 2, -Math.PI / 2 + TAU * f.ctrl); g.strokeStyle = relC(f.owner >= 0 ? f.owner : f.capTeam); g.lineWidth = 2; g.stroke(); }
  g.fillStyle = relC(f.owner); g.font = `${Math.round(r * 1.25)}px 'IM Fell English SC', Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(f.id, x, y + 1);
  if (f.locked && MATCH.mode === 'breakthrough') { g.globalAlpha = 0.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#000'; g.fill(); g.globalAlpha = 1; }
}
// full map, for the deploy screen and the M key
function drawBigMap(cv, opts = {}) {
  const g = cv.getContext('2d'), S = cv.width;
  g.clearRect(0, 0, S, S);
  if (MAPIMG) g.drawImage(MAPIMG, 0, 0, S, S);
  const team = PL.s ? PL.s.team : MATCH.side;
  // HQs
  TER.map.hq.forEach((h, t) => { const [x, y] = mapXY(h.x, h.z, S); g.strokeStyle = relC(t); g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(x, y, h.r / (TER.half * 2) * S, 0, TAU); g.stroke(); g.setLineDash([]); g.fillStyle = relC(t); g.font = `${Math.round(S / 48)}px 'IM Fell English SC', Georgia, serif`; g.textAlign = 'center'; g.fillText('HQ', x, y + 4); });
  for (const sh of SHIPS) if (sh.alive) { const [x, y] = mapXY(sh.pos.x, sh.pos.z, S); g.save(); g.translate(x, y); g.rotate(-sh.yaw); g.fillStyle = relC(sh.team); g.beginPath(); g.moveTo(0, S / 70); g.lineTo(S / 200, -S / 90); g.lineTo(-S / 200, -S / 90); g.fill(); g.restore(); }
  for (const s of SOLDIERS) {
    if (s.state !== 'up') continue;
    const friend = s.team === team;
    if (!friend && s.spotT <= 0) continue;
    const [x, y] = mapXY(s.pos.x, s.pos.z, S);
    g.fillStyle = s.isPlayer ? HUDC.gold : friend ? (PL.s && s.squad === PL.s.squad ? HUDC.squad : HUDC.friend) : HUDC.foe;
    g.beginPath(); g.arc(x, y, s.isPlayer ? S / 120 : S / 200, 0, TAU); g.fill();
  }
  for (const c of COLOURS) if (c.team === team && c.alive) { const [x, y] = mapXY(c.x, c.z, S); g.fillStyle = HUDC.gold; g.fillRect(x - 2, y - 9, 2, 10); g.fillRect(x, y - 9, 7, 5); }
  for (const f of MATCH.flags) { const [x, y] = mapXY(f.x, f.z, S); drawFlagIcon(g, x, y, f, S / 50); }
  if (opts.spawns) for (const p of opts.spawns) {
    const [x, y] = mapXY(p.x, p.z, S);
    g.strokeStyle = p === opts.sel ? HUDC.gold : 'rgba(255,255,255,.7)'; g.lineWidth = p === opts.sel ? 3 : 1.5;
    g.beginPath(); g.arc(x, y, S / 32, 0, TAU); g.stroke();
  }
  if (PL.s && PL.s.state === 'up') {
    const [x, y] = mapXY(PL.s.pos.x, PL.s.pos.z, S);
    g.save(); g.translate(x, y); g.rotate(-PL.yaw); g.fillStyle = HUDC.gold; g.beginPath(); g.moveTo(0, S / 60); g.lineTo(S / 140, -S / 160); g.lineTo(-S / 140, -S / 160); g.fill(); g.restore();
  }
}

// ---------- per-frame canvas HUD ----------
const HIT = { t: 0, head: false, kill: false };
const DMG = [];
function hitMarker(head) { HIT.t = 0.25; HIT.head = head; sHit(head); }
function playerHurt(dmg, dir) { PL.hurt = Math.min(1, PL.hurt + dmg / 60); DMG.push({ a: dir, t: 1.6 }); sHurt(); }
function project(x, y, z, out) {
  _v6.set(x, y, z).project(camera);
  out.x = (_v6.x * 0.5 + 0.5) * HW; out.y = (-_v6.y * 0.5 + 0.5) * HH; out.z = _v6.z;
  return _v6.z < 1;
}
const _sp = { x: 0, y: 0, z: 0 };
function drawHud(dt) {
  const g = hg;
  g.setTransform(HDPR, 0, 0, HDPR, 0, 0);
  g.clearRect(0, 0, HW, HH);
  const s = PL.s;
  if (!s || !MATCH.on) return;
  const team = s.team;
  // spyglass mask
  if (PL.spyT > 0.05) {
    g.save(); g.globalAlpha = Math.min(1, PL.spyT * 1.3); g.fillStyle = '#050403'; g.fillRect(0, 0, HW, HH);
    g.globalCompositeOperation = 'destination-out';
    const R = Math.min(HW, HH) * 0.42;
    const gr = g.createRadialGradient(HW / 2, HH / 2, R * 0.82, HW / 2, HH / 2, R); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(HW / 2, HH / 2, R, 0, TAU); g.fill(); g.restore();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(HW / 2 - 40, HH / 2); g.lineTo(HW / 2 + 40, HH / 2); g.moveTo(HW / 2, HH / 2 - 40); g.lineTo(HW / 2, HH / 2 + 40); g.stroke();
  }
  // world markers: flags
  for (const f of MATCH.flags) {
    if (!project(f.x, heightAt(f.x, f.z) + 10.5, f.z, _sp)) continue;
    if (_sp.x < -20 || _sp.x > HW + 20 || _sp.y < -20 || _sp.y > HH + 20) continue;
    const d = Math.hypot(f.x - s.pos.x, f.z - s.pos.z);
    if (d < f.r) continue;
    const obj = s.squad && s.squad.obj === f;
    g.globalAlpha = 0.92;
    drawFlagIcon(g, _sp.x, _sp.y, f, obj ? 12 : 10);
    if (obj) { g.strokeStyle = HUDC.gold; g.lineWidth = 1.5; g.beginPath(); g.moveTo(_sp.x, _sp.y - 20); g.lineTo(_sp.x + 6, _sp.y - 15); g.lineTo(_sp.x, _sp.y - 10); g.lineTo(_sp.x - 6, _sp.y - 15); g.closePath(); g.stroke(); }
    g.font = "11px 'EB Garamond', Georgia, serif"; g.fillStyle = 'rgba(240,230,210,.85)'; g.textAlign = 'center';
    g.fillText(Math.round(d) + ' m', _sp.x, _sp.y + 22);
    g.globalAlpha = 1;
  }
  // soldiers: friends close by, squadmates, the wounded, spotted enemies
  for (const o of SOLDIERS) {
    if (o === s || o.state === 'dead') continue;
    const friend = o.team === team;
    if (!friend && (o.spotT <= 0 || o.state !== 'up')) continue;
    const d = o.pos.distanceTo(s.pos);
    const sq = friend && o.squad === s.squad;
    if (friend && d > (sq ? 400 : 70) && o.state === 'up') continue;
    if (friend && o.state === 'down' && d > 60) continue;
    const top = o.state === 'up' ? o.hb.hy + 0.6 : o.pos.y + 0.6;
    if (!project(o.state === 'up' ? o.hb.hx : o.pos.x, top, o.state === 'up' ? o.hb.hz : o.pos.z, _sp)) continue;
    if (_sp.x < 0 || _sp.x > HW || _sp.y < 0 || _sp.y > HH) continue;
    if (o.state === 'down') {
      g.fillStyle = 'rgba(240,235,225,.9)'; g.fillRect(_sp.x - 7, _sp.y - 7, 14, 14);
      g.fillStyle = '#c8302a'; g.fillRect(_sp.x - 2, _sp.y - 5, 4, 10); g.fillRect(_sp.x - 5, _sp.y - 2, 10, 4);
      continue;
    }
    const c = friend ? (sq ? HUDC.squad : HUDC.friend) : HUDC.foe;
    g.fillStyle = c; g.globalAlpha = friend ? clamp(1.2 - d / 80, 0.45, 0.95) : 0.95;
    g.beginPath();
    if (friend) { g.moveTo(_sp.x - 5, _sp.y - 6); g.lineTo(_sp.x + 5, _sp.y - 6); g.lineTo(_sp.x, _sp.y); }
    else { g.moveTo(_sp.x - 6, _sp.y - 9); g.lineTo(_sp.x + 6, _sp.y - 9); g.lineTo(_sp.x, _sp.y - 1); }
    g.fill();
    if (friend && d < 14 && Math.abs(_sp.x - HW / 2) < 140 && Math.abs(_sp.y - HH / 2) < 160) { g.font = "12px 'EB Garamond', Georgia, serif"; g.textAlign = 'center'; g.fillText(o.name, _sp.x, _sp.y - 10); }
    g.globalAlpha = 1;
  }
  for (const c of COLOURS) if (c.alive && c.team === team && project(c.x, heightAt(c.x, c.z) + 4, c.z, _sp) && _sp.x > 0 && _sp.x < HW && _sp.y > 0 && _sp.y < HH) {
    g.fillStyle = HUDC.gold; g.fillRect(_sp.x - 1, _sp.y - 10, 2, 12); g.fillRect(_sp.x + 1, _sp.y - 10, 8, 5);
  }
  // crosshair, or the gun-laying marker
  const cx = HW / 2, cy = HH / 2;
  if (s.mount && s.mount.type === 'cannon') {
    const c = s.mount.c;
    if (project(c.aimPoint.x, c.aimPoint.y + 0.2, c.aimPoint.z, _sp)) {
      g.strokeStyle = c.loaded ? HUDC.gold : 'rgba(255,255,255,.5)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(_sp.x, _sp.y, 16, 7, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(_sp.x - 22, _sp.y); g.lineTo(_sp.x - 10, _sp.y); g.moveTo(_sp.x + 10, _sp.y); g.lineTo(_sp.x + 22, _sp.y); g.stroke();
      g.font = "13px 'EB Garamond', Georgia, serif"; g.fillStyle = '#fff'; g.textAlign = 'center';
      g.fillText(Math.round(c.aimPoint.distanceTo(c.pos)) + ' m · ' + (c.ammo === 'canister' ? 'canister' : 'round shot'), _sp.x, _sp.y + 24);
    }
  } else if (s.mount && s.mount.type === 'ship') {
    const sh = s.mount.s, rel = angWrap(PL.yaw - sh.yaw), side = rel < 0 ? 0 : 1;
    g.font = "16px 'IM Fell English SC', Georgia, serif"; g.textAlign = 'center';
    g.fillStyle = sh.loaded[side] ? HUDC.gold : 'rgba(255,255,255,.55)';
    g.fillText((side ? 'Larboard' : 'Starboard') + ' guns ' + (sh.loaded[side] ? 'ready' : 'loading ' + Math.round(sh.rt[side] / 20 * 100) + '%'), cx, cy + 40);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 3, 0, TAU); g.stroke();
  } else if (s.state === 'up' && PL.spyT < 0.1 && !s.sprint) {
    const w = s.wp.def;
    const showX = s.hand !== 'primary' || s.aimT < 0.55;
    if (showX) {
      const spread = s.hand === 'primary' ? lerp(w.hip, w.spread, s.aimT) * (1 + Math.min(1.5, Math.hypot(s.vel.x, s.vel.z) / 3)) * (s.crouch > 0.5 ? 0.75 : 1) : 1;
      const px = Math.tan(spread * Math.PI / 180) / Math.tan(camera.fov * Math.PI / 360) * HH / 2;
      const gap = clamp(px, 4, 120);
      g.strokeStyle = s.wp.loaded > 0 || s.hand !== 'primary' ? 'rgba(255,255,255,.85)' : 'rgba(255,140,120,.85)'; g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(cx - gap - 7, cy); g.lineTo(cx - gap, cy); g.moveTo(cx + gap, cy); g.lineTo(cx + gap + 7, cy);
      g.moveTo(cx, cy + gap); g.lineTo(cx, cy + gap + 7);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(cx - 1, cy - 1, 2, 2);
    }
  }
  // hold-to-interact ring
  if (PL.inter && PL.inter.hold && PL.interT > 0 && PL.inter.hold < 50) {
    g.strokeStyle = HUDC.gold; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + TAU * PL.interT / PL.inter.hold); g.stroke();
  }
  // hit marker
  if (HIT.t > 0) {
    HIT.t -= dt;
    g.strokeStyle = HIT.head ? HUDC.gold : '#fff'; g.lineWidth = 2; g.globalAlpha = clamp(HIT.t * 5, 0, 1);
    g.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(cx + a * 6, cy + b * 6); g.lineTo(cx + a * 12, cy + b * 12); } g.stroke();
    g.globalAlpha = 1;
  }
  // where the shot came from
  for (let i = DMG.length - 1; i >= 0; i--) {
    const D = DMG[i]; D.t -= dt;
    if (D.t <= 0) { DMG.splice(i, 1); continue; }
    const rel = angWrap(D.a - PL.yaw);
    const a = -rel - Math.PI / 2;
    g.strokeStyle = `rgba(220,60,40,${clamp(D.t, 0, 1) * 0.8})`; g.lineWidth = 6;
    g.beginPath(); g.arc(cx, cy, 90, a - 0.25, a + 0.25); g.stroke();
  }
  drawCompass(g);
  drawMinimap(g);
}
function drawCompass(g) {
  const W = 380, x0 = HW / 2 - W / 2, y = 64;
  g.save();
  g.beginPath(); g.rect(x0, y - 4, W, 26); g.clip();
  const heading = -PL.yaw + Math.PI;   // 0 = north (-z)
  const pxPerRad = W / 1.9;
  g.fillStyle = 'rgba(240,230,210,.85)'; g.strokeStyle = 'rgba(240,230,210,.6)'; g.lineWidth = 1;
  g.font = "13px 'IM Fell English SC', Georgia, serif"; g.textAlign = 'center';
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let k = 0; k < 72; k++) {
    const a = k * TAU / 72, d = angWrap(a - heading), x = HW / 2 + d * pxPerRad;
    if (Math.abs(d) > 1.0) continue;
    g.globalAlpha = 1 - Math.abs(d);
    if (k % 9 === 0) g.fillText(names[k / 9], x, y + 12);
    else { g.beginPath(); g.moveTo(x, y + (k % 3 === 0 ? 2 : 5)); g.lineTo(x, y + 9); g.stroke(); }
  }
  // flags on the compass
  const s = PL.s;
  for (const f of MATCH.flags) {
    const a = Math.atan2(f.x - s.pos.x, -(f.z - s.pos.z)), d = angWrap(a - heading), x = HW / 2 + d * pxPerRad;
    if (Math.abs(d) > 1) continue;
    g.globalAlpha = 1 - Math.abs(d) * 0.7;
    g.fillStyle = relC(f.owner); g.font = "12px 'IM Fell English SC', Georgia, serif"; g.fillText(f.id, x, y + 21);
  }
  g.restore();
}
function drawMinimap(g) {
  if (!MAPIMG) return;
  const R = 82, cx = 18 + R, cy = HH - 72 - R, s = PL.s, range = 170;
  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill(); g.clip();
  const S = MAPIMG.width, k = R / range;
  g.translate(cx, cy); g.rotate(PL.yaw + Math.PI);
  const [mx, my] = mapXY(s.pos.x, s.pos.z, S);
  const pxPerM = S / (TER.half * 2);
  g.globalAlpha = 0.85;
  g.drawImage(MAPIMG, -mx * k / pxPerM, -my * k / pxPerM, S * k / pxPerM, S * k / pxPerM);
  g.globalAlpha = 1;
  const P = (x, z) => [(x - s.pos.x) * k, (z - s.pos.z) * k];
  for (const o of SOLDIERS) {
    if (o === s || o.state !== 'up') continue;
    const friend = o.team === s.team;
    if (!friend && o.spotT <= 0) continue;
    const [x, y] = P(o.pos.x, o.pos.z);
    if (x * x + y * y > R * R) continue;
    g.fillStyle = friend ? (o.squad === s.squad ? HUDC.squad : HUDC.friend) : HUDC.foe;
    g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
  }
  for (const f of MATCH.flags) {
    let [x, y] = P(f.x, f.z);
    const d = Math.hypot(x, y); if (d > R - 10) { x *= (R - 10) / d; y *= (R - 10) / d; }
    g.save(); g.translate(x, y); g.rotate(-(PL.yaw + Math.PI)); drawFlagIcon(g, 0, 0, f, 7); g.restore();
  }
  g.restore();
  g.strokeStyle = 'rgba(215,180,90,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.fillStyle = HUDC.gold; g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 5, cy + 5); g.lineTo(cx - 5, cy + 5); g.fill();
}

// ---------- DOM panels ----------
const UI = { acc: 0, msgs: [], pops: [], feed: [], lastMsg: '', lastMsgT: 0, bannerT: 0, hintT: 0 };
function hudMsg(text, cls = '') {
  if (text === UI.lastMsg && clock - UI.lastMsgT < 2) return;
  UI.lastMsg = text; UI.lastMsgT = clock;
  const el = document.createElement('div'); el.className = 'msg ' + cls; el.textContent = text;
  const box = $('#msgs'); box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 700); }, 2600);
}
function hudPop(label, pts) {
  const el = document.createElement('div'); el.className = 'pop';
  el.innerHTML = label + (pts ? '<b>+' + pts + '</b>' : '');
  const box = $('#pops'); box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 600); }, 1600);
}
function hudBanner(title, sub, cls) {
  const b = $('#banner');
  b.className = 'on ' + (cls || '');
  b.innerHTML = title + (sub ? '<small>' + sub + '</small>' : '');
  UI.bannerT = 4.5;
}
function nameSpan(s) {
  if (!s) return '';
  const me = PL.s && s === PL.s, team = PL.s ? PL.s.team : MATCH.side;
  return `<span class="${me ? 'me' : s.team === team ? 'fr' : 'fo'}">${s.name}</span>`;
}
function hudFeed(att, v, how, head) {
  const el = document.createElement('div'); el.className = 'kf';
  const wp = how || 'wounds';
  el.innerHTML = att && att !== v ? `${nameSpan(att)}<span class="wp">${wp}${head ? ' · head' : ''}</span>${nameSpan(v)}` : `${nameSpan(v)}<span class="wp">fell</span>`;
  feedPush(el);
}
function hudFeedText(text, cls) { const el = document.createElement('div'); el.className = 'kf'; el.innerHTML = `<span class="${cls || ''}">${text}</span>`; feedPush(el); }
function feedPush(el) {
  const box = $('#feed'); box.appendChild(el);
  while (box.children.length > 6) box.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 700); }, 7000);
}
function updateDomHud(dt) {
  const s = PL.s, M = MATCH;
  UI.bannerT -= dt;
  if (UI.bannerT <= 0) $('#banner').classList.remove('on');
  hudReloadPaused = Math.max(0, hudReloadPaused - dt);
  $('#vignette').style.opacity = clamp(PL.hurt * 0.9 + (s && s.hp < 35 && s.state === 'up' ? 0.35 + Math.sin(clock * 5) * 0.1 : 0), 0, 1);
  postMat.uniforms.uHurt.value = clamp(PL.hurt * 0.6, 0, 0.6);
  postMat.uniforms.uBlur.value = clamp(PL.suppress * 0.25 + (s && s.state === 'down' ? 0.3 : 0), 0, 0.4);
  UI.acc += dt;
  if (UI.acc < 0.1) return;
  UI.acc = 0;
  if (!s || !s.wp) return;   // not yet deployed
  const team = s.team, foe = 1 - team;
  const tk = (el, t) => { el.querySelector('.nm').textContent = TEAMS[t].name; el.querySelector('b').textContent = isFinite(M.tickets[t]) ? M.tickets[t] : '∞'; el.querySelector('.bar i').style.width = (isFinite(M.tickets[t]) ? clamp(M.tickets[t] / M.maxT[t], 0, 1) * 100 : 100) + '%'; };
  tk($('#tkF'), team); tk($('#tkE'), foe);
  const own = [0, 0]; for (const f of M.flags) if (f.owner >= 0) own[f.owner]++;
  $('#tkF').classList.toggle('bleed', M.mode === 'conquest' && own[foe] > own[team]);
  $('#tkE').classList.toggle('bleed', M.mode === 'conquest' && own[team] > own[foe]);
  const fr = $('#flagRow');
  if (fr.children.length !== M.flags.length) { fr.innerHTML = ''; for (const f of M.flags) { const d = document.createElement('div'); d.className = 'fl'; d.textContent = f.id; fr.appendChild(d); } }
  M.flags.forEach((f, i) => {
    const d = fr.children[i];
    d.className = 'fl' + (f.owner === team ? ' fr' : f.owner === foe ? ' fo' : '') + (f.locked && M.mode === 'breakthrough' ? ' lock' : '') + (f.contested || (f.owner >= 0 && f.threat > 0) ? ' cont' : '') + (s.squad && s.squad.obj === f ? ' cur' : '');
  });
  if (M.mode === 'breakthrough') {
    const n = M.map.breakthrough.sectors.length;
    $('#sector').textContent = (team === M.attacker ? 'Attacking' : 'Defending') + ' · sector ' + (M.sector + 1) + ' of ' + n;
  } else $('#sector').textContent = '';
  // capture bar
  let inF = null;
  for (const f of M.flags) if (s.state === 'up' && Math.hypot(s.pos.x - f.x, s.pos.z - f.z) < f.r && (!f.locked || M.mode !== 'breakthrough')) inF = f;
  const cb = $('#capbar');
  if (inF) {
    cb.hidden = false;
    const t = inF.owner >= 0 ? inF.owner : inF.capTeam;
    const verb = inF.contested ? 'Contested' : inF.owner === team ? (inF.ctrl < 1 ? 'Securing' : 'Holding') : inF.owner === foe ? 'Neutralizing' : inF.capTeam === team ? 'Capturing' : inF.ctrl > 0 ? 'Neutralizing' : 'Capturing';
    cb.querySelector('.lbl').textContent = verb + ' ' + inF.name;
    const bar = cb.querySelector('.bar i'); bar.style.width = (inF.ctrl * 100) + '%'; bar.style.background = relC(t);
  } else cb.hidden = true;
  // vitals
  $('#cls').textContent = CLASSES[s.cls].name + ' · ' + s.name;
  const hp = $('#hp'); hp.querySelector('i').style.width = clamp(s.hp, 0, 100) + '%'; hp.querySelector('span').textContent = Math.ceil(Math.max(0, s.hp)); hp.classList.toggle('low', s.hp < 35);
  $('#stam i').style.width = (s.stamina * 100) + '%';
  // weapon
  const w = s.wp.def, g = currentGadget(s);
  let name, state = '', ammo = '';
  if (s.mount && s.mount.type === 'cannon') {
    const c = s.mount.c;
    name = '6-pounder field gun'; state = c.loaded ? '<span class="ld">Loaded</span> · ' + (c.ammo === 'canister' ? 'canister' : 'round shot') : c.reloading ? 'Loading… ' + Math.round(c.rt / cannonReloadTime(s) * 100) + '%' : '<span class="ul">Empty</span> · press R';
    ammo = '';
  } else if (s.mount && s.mount.type === 'ship') {
    const sh = s.mount.s; name = 'Gunboat'; state = 'Sail ' + ['astern', 'furled', 'half', 'full', 'all plain sail'][sh.throttle + 1] + ' · hull ' + Math.round(sh.hp / sh.max * 100) + '%'; ammo = '';
  } else if (g) { const gi = s.hand === 'g0' ? 0 : 1; name = GADGETS[g].name; state = GADGETS[g].desc; ammo = GADGETS[g].n ? s.gad[gi] + '' : ''; }
  else if (s.hand === 'melee' || (s.mount && s.mount.type === 'horse' && s.hand === 'melee')) { const m = s.mount ? MELEE.sabre : MELEE[s.load.melee]; name = m.name; state = 'LMB to strike'; }
  else {
    name = w.name;
    state = s.wp.loaded > 0 ? '<span class="ld">Loaded' + ((w.shots || 1) > 1 ? ' ×' + s.wp.loaded : '') + '</span>' : s.wp.reloading ? 'Loading' : '<span class="ul">Unloaded</span> · press R';
    ammo = s.wp.ammo + ' <small>cartridges</small>';
  }
  $('#wpName').textContent = name; $('#wpState').innerHTML = state; $('#wpAmmo').innerHTML = ammo;
  const rl = $('#reload');
  if (s.wp.reloading && !s.mount && s.hand === 'primary') {
    rl.hidden = false;
    const st = drillOf(s)[drillStage(s)];
    rl.querySelector('.stage').textContent = (reloadPaused(s) ? 'Paused · ' : '') + st[1];
    rl.querySelector('.rb i').style.width = (s.wp.rt / w.reload * 100) + '%';
  } else rl.hidden = true;
  const sl = $('#slots');
  const labels = [w.name.split(' ')[0] === 'Officer\'s' ? 'Fusil' : w.model === 'pistol' ? 'Pistol' : w.model === 'blunder' ? 'Blunderbuss' : w.model === 'rifle' || w.model === 'jaeger' ? 'Rifle' : 'Musket', MELEE[s.load.melee].name].concat(s.load.gadgets.map((x) => GADGETS[x].name));
  const html = labels.map((l, i) => `<div class="sl${slotIndex(s) === i ? ' on' : ''}"><span class="n">${i + 1}</span>${l}</div>`).join('');
  if (sl.innerHTML !== html) sl.innerHTML = html;
  // prompts
  const pr = $('#prompt');
  let ptxt = PL.inter ? PL.inter.text : '';
  if (s.mount && s.mount.type === 'horse') ptxt = '<b>E</b> dismount';
  if (s.mount && s.mount.type === 'cannon') ptxt = '<b>E</b> leave the gun';
  if (s.mount && s.mount.type === 'ship') ptxt = '<b>E</b> leave the helm';
  if (PL.autoT > 0 && !s.wp.reloading && s.wp.loaded <= 0) ptxt = 'Press <b>R</b> to load';
  if (pr.innerHTML !== ptxt) pr.innerHTML = ptxt;
  const dn = $('#downed');
  if (s.state === 'down') {
    dn.hidden = false;
    const medics = SOLDIERS.some((o) => o.team === s.team && o.cls === 'surgeon' && o.state === 'up' && o.pos.distanceTo(s.pos) < 40);
    dn.querySelector('.s').innerHTML = 'Bleeding out in <b>' + Math.ceil(s.downT) + '</b>s · ' + (medics ? 'a surgeon is near' : 'no surgeon near') + (s.downT < 10.5 ? ' · <b>Space</b> to give up' : '');
  } else dn.hidden = true;
  const oob = $('#oob');
  oob.hidden = PL.oob <= 0; if (PL.oob > 0) oob.querySelector('b').textContent = Math.ceil(10 - PL.oob);
  const kh = $('#keyHint');
  UI.hintT -= 0.1;
  kh.style.opacity = SET.hints && UI.hintT > 0 ? 1 : 0;
}
function showKeyHint() {
  UI.hintT = 22;
  const pad = lastInput === 'pad';
  $('#keyHint').innerHTML = pad
    ? '<b>LT</b> present · <b>RT</b> fire · <b>X</b> load<br><b>RB</b> bayonet · <b>LB</b> spot / order<br><b>A</b> jump · <b>B</b> crouch · <b>L3</b> run<br><b>D-pad ↑</b> use · <b>Y</b> sidearm<br><b>Back</b> scores · <b>Start</b> pause'
    : '<b>RMB</b> present · <b>LMB</b> fire · <b>R</b> load<br><b>F</b> bayonet · <b>Q</b> spot / order squad<br><b>Shift</b> run · <b>C</b> crouch · <b>Space</b> vault<br><b>E</b> use, revive, crew, mount<br><b>1–4</b> weapons · <b>M</b> map · <b>Tab</b> scores';
}
function drawScoreboard() {
  const team = PL.s ? PL.s.team : MATCH.side;
  const table = (t) => {
    const men = SOLDIERS.filter((s) => s.team === t).sort((a, b) => b.sc.score - a.sc.score);
    const rows = men.map((s, i) => `<tr class="${s.isPlayer ? 'me' : ''}${s.state !== 'up' ? ' dead' : ''}"><td>${i + 1}</td><td>${s.name}</td><td>${CLASSES[s.cls].name.split(' ')[0]}</td><td>${s.sc.score}</td><td>${s.sc.kills}</td><td>${s.sc.deaths}</td><td>${s.sc.revives || ''}</td></tr>`).join('');
    return `<h3 style="color:${relC(t)}">${TEAMS[t].army} · ${isFinite(MATCH.tickets[t]) ? MATCH.tickets[t] : '∞'}</h3><table><tr><th>#</th><th>Name</th><th>Class</th><th>Score</th><th>K</th><th>D</th><th>Rev</th></tr>${rows}</table>`;
  };
  $('#sbF').innerHTML = table(team); $('#sbE').innerHTML = table(1 - team);
}
