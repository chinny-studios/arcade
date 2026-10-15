// Tokoyo — HUD: item icons, vitals, hotbar, status, minimap & world map, messages, banners, prompts, nameplates, damage numbers

const ICONS = {};
function makeIcons() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  let r;
  try { r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  const sc = new THREE.Scene();
  sc.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(2, 3, 4); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const shot = (geo, rot) => {
    const m = new THREE.Mesh(geo, R.mat.vc);
    geo.computeBoundingSphere();
    const bs = geo.boundingSphere;
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.position.copy(bs.center).applyEuler(m.rotation).multiplyScalar(-1);
    const g = new THREE.Group(); g.add(m); sc.add(g);
    const d = bs.radius / Math.sin(15 * Math.PI / 180) * 1.0;
    cam.position.set(0, 0, d); cam.lookAt(0, 0, 0);
    r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam);
    sc.remove(g);
    return cv.toDataURL();
  };
  for (const id in ITEMS) {
    const it = ITEMS[id];
    const held = (it.type === 'weapon' || it.type === 'tool') && !['wood'].includes(id);
    const rot = held ? [0.2, 0.6, -0.75] : it.type === 'shield' ? [0.15, -0.5, 0] : it.type === 'armor' ? [0.35, -0.5, 0] : [0.6, -0.6, 0];
    ICONS[id] = shot(itemGeo(id), rot);
  }
  for (const id in PIECES) {
    if (PIECES[id].tool) { ICONS['piece:' + id] = ICONS.hammer; continue; }
    ICONS['piece:' + id] = shot(pieceGeo(id), [0.45, -0.6, 0]);
  }
  r.dispose();
}

const HUD = (() => {
  const el = {};
  let msgs = [], banT = 0, hurtV = 0, prompt = '', crowT = 0, lastHp = 0, ghostT = 0;
  let mapImg, fogCv, fogCtx, fogData, explored, miniCtx, mapView = { x: 0, z: 0, s: 1.6, drag: null };
  function init() {
    for (const id of ['hotbar', 'mini', 'where', 'status', 'msgs', 'pickups', 'banner', 'prompt', 'bossBar', 'raid', 'crowBox', 'foods', 'hpBar', 'stBar', 'stWrap', 'buildInfo', 'hurt', 'lowhp', 'fade', 'fps', 'keysHint', 'drawRing', 'cross']) el[id] = document.getElementById(id);
    miniCtx = document.getElementById('miniC').getContext('2d');
    el.hud2d = document.getElementById('hud2d').getContext('2d');
    el.fps.hidden = !DEBUG;
  }
  // ---------- world map ----------
  function buildMap() {
    const S = 512, C = W.C;
    mapImg = document.createElement('canvas'); mapImg.width = mapImg.height = S;
    const ctx = mapImg.getContext('2d'), img = ctx.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i + 0.5) / S * WORLD.size - WORLD.half, z = (j + 0.5) / S * WORLD.size - WORLD.half;
      const h = coarse(W.h4, x, z), f = forestAt(x, z);
      const hx = coarse(W.h4, x + 4, z) - coarse(W.h4, x - 4, z), hz = coarse(W.h4, x, z + 4) - coarse(W.h4, x, z - 4);
      const shade = clamp(1 - (hx + hz) * 0.08, 0.6, 1.35);
      let c;
      if (h < -0.3) { const d = clamp(-h / 25, 0, 1); c = [lerp(70, 22, d), lerp(130, 58, d), lerp(140, 82, d)]; }
      else if (h < 1.6) c = [196, 180, 132];
      else { const m = [118, 150, 70], fo = [52, 82, 46]; c = [lerp(m[0], fo[0], f), lerp(m[1], fo[1], f), lerp(m[2], fo[2], f)]; if (h > 28) { const t = smooth(28, 40, h); c = [lerp(c[0], 130, t), lerp(c[1], 128, t), lerp(c[2], 118, t)]; } c = c.map((v) => v * shade); }
      // parchment tint
      const o = (j * S + i) * 4;
      img.data[o] = clamp(c[0] * 0.9 + 20, 0, 255); img.data[o + 1] = clamp(c[1] * 0.9 + 16, 0, 255); img.data[o + 2] = clamp(c[2] * 0.85 + 8, 0, 255); img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    void C;
    fogCv = document.createElement('canvas'); fogCv.width = fogCv.height = 256;
    fogCtx = fogCv.getContext('2d');
    fogData = fogCtx.createImageData(256, 256);
    if (!explored) explored = new Uint8Array(256 * 256);
    for (let k = 0; k < 256 * 256; k++) { const n = hash2(k % 256, k >> 8, 5) * 10; fogData.data[k * 4 + 3] = explored[k] ? 0 : 255; fogData.data[k * 4] = 74 + n; fogData.data[k * 4 + 1] = 64 + n; fogData.data[k * 4 + 2] = 48 + n; }
    fogCtx.putImageData(fogData, 0, 0);
  }
  function reveal(x, z, r) {
    const cx = (x + WORLD.half) / 8, cz = (z + WORLD.half) / 8, rr = r / 8;
    let any = false;
    for (let j = Math.max(0, Math.floor(cz - rr)); j <= Math.min(255, Math.ceil(cz + rr)); j++) for (let i = Math.max(0, Math.floor(cx - rr)); i <= Math.min(255, Math.ceil(cx + rr)); i++) {
      const k = j * 256 + i;
      if (!explored[k] && (i - cx) ** 2 + (j - cz) ** 2 < rr * rr) { explored[k] = 1; fogData.data[k * 4 + 3] = 0; any = true; }
    }
    if (any) fogCtx.putImageData(fogData, 0, 0);
  }
  function drawMapTo(ctx, w, h, cx, cz, metersPerPx, rotate) {
    ctx.fillStyle = '#4a4030'; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (rotate) ctx.rotate(rotate);
    const s = 1 / metersPerPx;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mapImg, (-WORLD.half - cx) * s, (-WORLD.half - cz) * s, WORLD.size * s, WORLD.size * s);
    ctx.drawImage(fogCv, (-WORLD.half - cx) * s, (-WORLD.half - cz) * s, WORLD.size * s, WORLD.size * s);
    // pins
    const pin = (x, z, color, label, shape) => {
      const px = (x - cx) * s, pz = (z - cz) * s;
      ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath();
      if (shape === 'sq') ctx.rect(px - 4, pz - 4, 8, 8); else if (shape === 'tri') { ctx.moveTo(px, pz - 6); ctx.lineTo(px + 5, pz + 4); ctx.lineTo(px - 5, pz + 4); ctx.closePath(); } else ctx.arc(px, pz, 4.5, 0, TAU);
      ctx.stroke(); ctx.fill();
      if (label && metersPerPx < 3) { ctx.font = '600 12px ' + getComputedStyle(document.body).getPropertyValue('--sans'); ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 3; ctx.strokeText(label, px + 8, pz + 4); ctx.fillText(label, px + 8, pz + 4); }
    };
    const S = EVENTS.S;
    for (const p of W.pois) {
      if (p.type === 'shrine') pin(p.x, p.z, '#e0b85a', 'Spirit shrine', 'tri');
      if ((p.type === 'altar1' || p.type === 'altar2') && S.revealed.has(p.type)) pin(p.x, p.z, '#d2452c', p.name, 'tri');
    }
    for (const q of S.pins) if (q.type === 'haunted') pin(q.x, q.z, '#6fc8ff', 'Haunted shrine', 'sq');
    for (const p of BUILD.pieces) {
      if (p.def.portal) pin(p.x, p.z, '#7fd6ff', p.data.tag || 'Portal', 'sq');
      if (p.def.bed && PLAYER.spawn && PLAYER.spawn.uid === p.uid) pin(p.x, p.z, '#8fcf6a', 'Bed', 'sq');
      if (p.def.kind === 'raft') pin(p.x, p.z, '#c9a576', 'Raft', 'sq');
    }
    for (const g of GRAVES) pin(g.x, g.z, '#ffffff', 'Your grave', 'tri');
    if (DEBUG && G.showAll) for (const p of W.pois) pin(p.x, p.z, '#f0f', p.type, 'sq');
    // player arrow
    const P = PLAYER, px = (P.pos.x - cx) * s, pz = (P.pos.z - cz) * s;
    ctx.save(); ctx.translate(px, pz); ctx.rotate(-P.yaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  // ---------- icons & slots ----------
  function slotHTML(st, key, eq) {
    if (!st) return (key ? '<span class="k">' + key + '</span>' : '');
    const d = ITEMS[st.id];
    let h = '<img src="' + (ICONS[st.id] || '') + '" alt="">' + (key ? '<span class="k">' + key + '</span>' : '');
    if (d.stack > 1) h += '<span class="n">' + st.n + '</span>';
    if (d.maxQ > 1 && st.q > 1) h += '<span class="q">★' + st.q + '</span>';
    if (d.dur && st.dur < maxDur(st.id, st.q)) h += '<span class="dur"><i style="width:' + (st.dur / maxDur(st.id, st.q) * 100).toFixed(0) + '%;background:' + (st.dur <= 0 ? '#d2452c' : st.dur / maxDur(st.id, st.q) < 0.25 ? '#e0a040' : '#8fcf6a') + '"></i></span>';
    void eq;
    return h;
  }
  let hotSig = '';
  function hotbar() {
    const P = PLAYER;
    const sig = P.inv.slots.slice(0, 8).map((s) => s ? s.id + s.n + s.q + Math.round(s.dur || 0) + (s.eq ? 'e' : '') : '-').join('|');
    if (sig === hotSig) return;
    hotSig = sig;
    let h = '';
    for (let i = 0; i < 8; i++) { const s = P.inv.slots[i]; h += '<div class="slot' + (s && s.eq ? ' eq' : '') + (s && broken(s) ? ' broken' : '') + '">' + slotHTML(s, i + 1) + '</div>'; }
    el.hotbar.innerHTML = h;
  }
  let statSig = '';
  function status() {
    const P = PLAYER;
    const list = [];
    for (const k in P.status) {
      const s = P.status[k], info = STATUS_INFO[k]; if (!info) continue;
      let t = s.t === Infinity ? '' : fmtTime(s.t);
      if (k === 'resting') t = Math.round((s.p || 0) * 100) + '%';
      if (k === 'rested') t += ' · comfort ' + (s.comfort || 1);
      list.push('<div class="st' + (info.good ? '' : ' bad') + '" title="' + info.desc + '">' + info.name + ' ' + t + '<i>' + info.icon + '</i></div>');
    }
    if (P.blessing) { const b = BLESSINGS[P.blessing]; list.push('<div class="st">' + b.name.split(' ')[0] + ' ' + (P.powerCd > 0 ? fmtTime(P.powerCd) : 'ready (F)') + '<i>' + (P.blessing === 'osugi' ? '杉' : '猪') + '</i></div>'); }
    const sig = list.join('');
    if (sig !== statSig) { statSig = sig; el.status.innerHTML = sig; }
  }
  let foodSig = '';
  function foods() {
    const P = PLAYER;
    const sig = P.food.map((f) => f.id + Math.ceil(f.t / 30)).join('|');
    if (sig === foodSig) return;
    foodSig = sig;
    el.foods.innerHTML = P.food.map((f) => '<div class="food' + (f.t < f.dur * 0.25 ? ' low' : '') + '" title="' + ITEMS[f.id].name + '"><img src="' + ICONS[f.id] + '" alt=""><div class="ft">' + fmtTime(f.t) + '</div></div>').join('');
  }
  // ---------- per frame ----------
  let miniT = 0, revT = 0;
  function update(dt) {
    const P = PLAYER;
    // vitals
    const mh = maxHp(), ms = maxSt();
    if (P.hp < lastHp - 0.5) ghostT = 0.6;
    lastHp = P.hp;
    const hpPct = clamp(P.hp / mh, 0, 1) * 100;
    el.hpBar.children[1].style.width = hpPct + '%';
    if ((ghostT -= dt) <= 0) el.hpBar.children[0].style.width = hpPct + '%';
    el.hpBar.style.width = (100 + (mh - BASE_HP) * 1.0) + 'px';
    el.hpBar.children[2].textContent = Math.ceil(Math.max(0, P.hp)) + ' / ' + Math.round(mh);
    el.stBar.children[0].style.width = clamp(P.st / ms, 0, 1) * 100 + '%';
    el.stBar.children[1].textContent = Math.floor(P.st) + ' / ' + Math.round(ms);
    el.stWrap.style.opacity = P.st < ms - 0.5 || P.running ? 1 : 0;
    el.stWrap.style.width = (160 + (ms - BASE_ST) * 1.2) + 'px';
    el.lowhp.style.opacity = P.alive && P.hp < mh * 0.3 ? 0.5 + Math.sin(G.time * 5) * 0.3 : 0;
    hurtV = Math.max(0, hurtV - dt * 1.5); el.hurt.style.opacity = hurtV;
    hotbar(); status(); foods();
    // messages fade
    const now = performance.now();
    for (const m of msgs) if (!m.gone && now - m.t > 4500) { m.gone = true; m.el.style.opacity = 0; setTimeout(() => m.el.remove(), 700); }
    msgs = msgs.filter((m) => !m.gone || now - m.t < 6000);
    for (const p of el.pickups.children) if (now - p.dataset.t > 3000 && !p.dataset.f) { p.dataset.f = 1; p.style.opacity = 0; setTimeout(() => p.remove(), 600); }
    if (banT > 0) { banT -= dt; if (banT <= 0) el.banner.classList.remove('on'); }
    // prompt & crosshair
    el.prompt.innerHTML = prompt;
    const bow = P.eq.right && ITEMS[P.eq.right.id].anim === 'bow';
    el.drawRing.hidden = !(bow && P.draw > 0);
    if (!el.drawRing.hidden) { const s = 46 - P.draw * 30; el.drawRing.style.width = el.drawRing.style.height = s + 'px'; el.drawRing.style.margin = (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px'; el.drawRing.style.borderColor = P.draw >= 1 ? '#e0b85a' : 'rgba(255,255,255,.4)'; }
    // boss bar
    const boss = MOBS_LIVE.find((m) => m.boss && !m.dead && dist2(m.pos.x, m.pos.z, P.pos.x, P.pos.z) < 120 * 120);
    el.bossBar.hidden = !boss;
    if (boss) { el.bossBar.children[0].textContent = boss.def.name; el.bossBar.children[1].children[0].style.width = clamp(boss.hp / boss.maxHp, 0, 1) * 100 + '%'; }
    const raid = EVENTS.S.raid;
    el.raid.hidden = !raid; if (raid) el.raid.textContent = 'Hyakki Yagyō · the night parade · ' + fmtTime(Math.max(0, raid.t));
    // crow speech
    if (crowT > 0) { crowT -= dt; if (crowT <= 0) el.crowBox.hidden = true; }
    // build info
    buildInfo();
    // minimap
    revT -= dt; if (revT <= 0) { revT = 0.5; reveal(P.pos.x, P.pos.z, 90); }
    miniT -= dt;
    if (miniT <= 0) {
      miniT = 0.1;
      drawMapTo(miniCtx, 176, 176, P.pos.x, P.pos.z, 1.3, 0);
      miniCtx.fillStyle = '#e0b85a'; miniCtx.font = '700 12px serif'; miniCtx.fillText('N', 84, 13);
      const tod = SKY.tod, hh = Math.floor(tod * 24), mm = Math.floor((tod * 24 - hh) * 60 / 10) * 10;
      el.where.innerHTML = '<b>' + BIOME_NAME[biomeAt(P.pos.x, P.pos.z)] + '</b><br>Day ' + SKY.day + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ' · ' + WEATHERS[SKY.wname].name;
    }
    draw2d();
  }
  function buildInfo() {
    const t = BUILD.tool, P = PLAYER, rd = P.eq.right && ITEMS[P.eq.right.id];
    const on = rd && rd.build;
    el.buildInfo.hidden = !on || UI.blocking();
    el.keysHint.innerHTML = on ? '' : '<b>Tab</b> inventory · <b>E</b> use · <b>RMB</b> block · <b>M</b> map · <b>Esc</b> pause';
    if (!on) return;
    let h = '';
    if (rd.build === 'hammer') {
      const d = t.sel && PIECES[t.sel];
      if (!d) h = '<div class="t">Hammer</div><div class="keys">Right mouse: choose what to build<br>Q / middle mouse: take down</div>';
      else {
        h = '<div class="t">' + d.name + '</div>';
        if (!d.tool) {
          h += '<div class="req">' + Object.keys(d.req).map((k) => '<span class="' + (P.inv.count(k) >= d.req[k] || G.noCost ? '' : 'no') + '">' + ITEMS[k].name + ' ' + P.inv.count(k) + '/' + d.req[k] + '</span>').join('') + '</div>';
          if (t.why) h += '<div class="why">' + t.why + '</div>';
          h += '<div class="keys">LMB place · scroll/R rotate · Shift free placement<br>Q take down · T support view · RMB menu</div>';
        } else h += '<div class="keys">LMB on a damaged piece to repair it.</div>';
      }
    } else {
      const m = HOE_MODES.find((x) => x.id === t.hoe);
      h = '<div class="t">Hoe · ' + m.name + '</div><div class="keys">' + m.desc + '<br>LMB apply · RMB choose mode</div>';
    }
    if (h !== el.buildInfo.dataset.h) { el.buildInfo.dataset.h = h; el.buildInfo.innerHTML = h; }
  }
  // nameplates and floating numbers
  const _p = new V3();
  function draw2d() {
    const ctx = el.hud2d, w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    const cam = R.camera, P = PLAYER;
    const toScreen = (x, y, z) => { _p.set(x, y, z).project(cam); if (_p.z > 1 || _p.z < -1) return null; return [(_p.x + 1) / 2 * w, (1 - _p.y) / 2 * h]; };
    ctx.textAlign = 'center';
    for (const m of MOBS_LIVE) {
      if (m.dead || m.boss) continue;
      const d2 = dist2(m.pos.x, m.pos.z, P.pos.x, P.pos.z);
      if (d2 > 22 * 22 || !(m.aware || m.hp < m.maxHp)) continue;
      if (m.type === 'deer' && m.hp >= m.maxHp) continue;
      const s = toScreen(m.pos.x, m.pos.y + m.def.h * m.scale + 0.35, m.pos.z); if (!s) continue;
      const a = clamp(1 - Math.sqrt(d2) / 22, 0.3, 1);
      ctx.globalAlpha = a;
      ctx.font = '600 13px ' + 'sans-serif';
      ctx.fillStyle = m.aware && m.def.mood === 'hostile' ? '#ffd0c0' : '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 3;
      const name = m.def.name + (m.stars ? ' ' + '★'.repeat(m.stars) : '');
      ctx.strokeText(name, s[0], s[1] - 8); ctx.fillText(name, s[0], s[1] - 8);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(s[0] - 30, s[1] - 3, 60, 6);
      ctx.fillStyle = m.staggered > 0 ? '#ffd060' : '#d84a3a'; ctx.fillRect(s[0] - 29, s[1] - 2, 58 * clamp(m.hp / m.maxHp, 0, 1), 4);
    }
    for (const t of FX.texts) {
      const s = toScreen(t.x, t.y, t.z); if (!s) continue;
      ctx.globalAlpha = clamp(t.t / 0.4, 0, 1);
      ctx.font = (t.big ? '800 22px ' : '700 16px ') + 'sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.lineWidth = 3; ctx.fillStyle = t.c;
      ctx.strokeText(t.s, s[0], s[1]); ctx.fillText(t.s, s[0], s[1]);
    }
    ctx.globalAlpha = 1;
  }
  // ---------- api ----------
  function msg(text, cls = '') {
    const last = msgs[msgs.length - 1];
    if (last && last.text === text && performance.now() - last.t < 2000) return;
    const d = document.createElement('div'); d.className = 'msg ' + cls; d.textContent = text;
    el.msgs.appendChild(d);
    msgs.push({ el: d, t: performance.now(), text });
    while (el.msgs.children.length > 7) el.msgs.firstChild.remove();
  }
  function pickup(id, n) {
    for (const c of el.pickups.children) if (c.dataset.id === id && !c.dataset.f) { c.dataset.n = +c.dataset.n + n; c.dataset.t = performance.now(); c.querySelector('span').textContent = ITEMS[id].name + ' ×' + c.dataset.n; return; }
    const d = document.createElement('div'); d.className = 'pk'; d.dataset.id = id; d.dataset.n = n; d.dataset.t = performance.now();
    d.innerHTML = '<img src="' + (ICONS[id] || '') + '" alt=""><span>' + ITEMS[id].name + ' ×' + n + '</span>';
    el.pickups.appendChild(d);
    while (el.pickups.children.length > 6) el.pickups.firstChild.remove();
  }
  function banner(t, cls = '') { el.banner.textContent = t; el.banner.className = 'on ' + cls; banT = 4; }
  function crowSay(t) { if (!t) { el.crowBox.hidden = true; crowT = 0; return; } el.crowBox.hidden = false; el.crowBox.querySelector('.txt').textContent = t; crowT = 14 + t.length / 30; }
  return {
    init, update, msg, pickup, banner, crowSay, buildMap, drawMapTo, reveal,
    hurt(v) { hurtV = Math.min(0.9, hurtV + 0.25 + v); },
    fade(v) { el.fade.style.opacity = v; },
    flashStamina() { el.stBar.classList.remove('flash'); void el.stBar.offsetWidth; el.stBar.classList.add('flash'); el.stWrap.style.opacity = 1; },
    setPrompt(p) { prompt = p; },
    get explored() { return explored; }, set explored(v) { explored = v; },
    mapView,
    fps(v) { el.fps.textContent = v; },
  };
})();

// ---------- what the player is looking at ----------
function interactTarget() {
  const P = PLAYER;
  if (!P.alive || P.steer) return null;
  const cam = R.camera.position, fwd = R.camera.getWorldDirection(_v1).clone();
  const reach = 2.8;
  let best = null, bs = 1e9;
  const consider = (pos, r, obj) => {
    const dp = Math.hypot(pos.x - P.pos.x, pos.z - P.pos.z);
    if (dp > reach + r || Math.abs(pos.y - P.pos.y - 0.8) > 2.6) return;
    const to = _v2.copy(pos).sub(cam), d = to.length(); to.divideScalar(d);
    const ang = Math.acos(clamp(to.dot(fwd), -1, 1));
    const lim = Math.atan2(r + 0.35, d) + 0.12;
    if (ang > lim) return;
    const score = ang / lim + dp * 0.08;
    if (score < bs) { bs = score; best = obj; }
  };
  for (const d of DROPS) if (dist2(d.x, d.z, P.pos.x, P.pos.z) < 16) consider(new V3(d.x, d.y + 0.2, d.z), 0.35, { kind: 'drop', d, prompt: '[E] Pick up ' + itemName(d.st) + (d.st.n > 1 ? ' ×' + d.st.n : '') });
  natQueryPicks(P.pos.x, P.pos.z, 4, (p) => consider(new V3(p.x, p.y + 0.3, p.z), 0.45, { kind: 'pick', p, prompt: '[E] Pick ' + PICK_TYPES[p.type].name }));
  for (const it of EVENTS.interactables(P.pos.x, P.pos.z)) consider(it.pos, it.r * 0.6, { kind: 'poi', it, prompt: it.prompt() });
  const pc = BUILD.lookPiece(3.6);
  if (pc) { const pr = BUILD.interactPrompt(pc); if (pr) { const o = { kind: 'piece', p: pc, prompt: pr }; if (!best || bs > 0.6) best = o; } }
  return best;
}
function interact() {
  const t = interactTarget();
  if (!t) return;
  const P = PLAYER;
  if (t.kind === 'drop') { pickDrop(t.d); return; }
  if (t.kind === 'pick') {
    const r = natPick(t.p);
    const left = P.inv.add(r.item, r.n);
    if (left) dropItems(r.item, left, t.p.x, t.p.y + 0.5, t.p.z);
    HUD.pickup(r.item, r.n - left); AU.play('pickup'); bus.emit('got', r.item, r.n);
    P.act = { kind: 'melee', anim: 'unarmed', t: 0, dur: 0.35, hitT: 0.15, combo: 1, mult: 0, done: true, cancel: true };
    return;
  }
  if (t.kind === 'poi') { t.it.use(); return; }
  if (t.kind === 'piece') BUILD.interact(t.p, Input.down('ShiftLeft'));
}
