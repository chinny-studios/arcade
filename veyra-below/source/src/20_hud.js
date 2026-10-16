// Veyra Below — HUD: bars, party, action palette, minimap and automap, floating text, labels, chat

const HUD = (() => {
  const floats = [], bubbles = [], labels = [];
  let ctx, mm, mmCtx, am, amCtx, dpr = 1, mmT = 0, automap = false;
  const cache = {};
  function init() {
    ctx = $('#hud2d').getContext('2d');
    mm = $('#minimap'); mmCtx = mm.getContext('2d');
    am = $('#automap'); amCtx = am.getContext('2d');
    bus.on('resize', () => { dpr = Math.min(window.devicePixelRatio || 1, 2); am.width = innerWidth * dpr; am.height = innerHeight * dpr; });
    dpr = Math.min(window.devicePixelRatio || 1, 2); am.width = innerWidth * dpr; am.height = innerHeight * dpr;
    // palette
    const pal = $('#palette');
    for (let i = 0; i < 6; i++) {
      const s = el('div', 'slot'); s.dataset.i = i;
      s.innerHTML = `<div class="ico"></div><div class="cd"></div><div class="cnt"></div><div class="key">${i + 1}</div>`;
      s.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (PL && !UI.isOpen()) useSlot(PL, i, PL.aimPt); });
      pal.appendChild(s);
    }
    $('#pbGauge').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (PL) usePB(PL); });
    $('#minimap').addEventListener('click', () => toggleMap());
  }
  function set(id, prop, v) { const k = id + prop; if (cache[k] === v) return; cache[k] = v; const e = document.getElementById(id); if (!e) return; if (prop === 'text') e.textContent = v; else if (prop === 'html') e.innerHTML = v; else e.style[prop] = v; }
  function float(x, y, z, text, color, size = 16, crit = false) {
    if (!OPTS.numbers && /^\d/.test(text)) return;
    floats.push({ x, y, z, text, color, size, t: 0, life: crit ? 1.1 : 0.85, crit, dx: (Math.random() - 0.5) * 20 });
    if (floats.length > 80) floats.shift();
  }
  function say(a, text) {
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].a === a) bubbles.splice(i, 1);
    bubbles.push({ a, text, t: 0 });
    log(`<b style="color:${hexCss(ROLES[a.role].color)}">${esc(a.name)}</b>: ${esc(text)}`);
  }
  function log(html) {
    const L = $('#log'), d = el('div', 'line', html); L.appendChild(d);
    while (L.children.length > 6) L.removeChild(L.firstChild);
    setTimeout(() => d.classList.add('fade'), 7000);
  }
  function toast(text, color = '#fff') {
    const T_ = $('#toasts'), d = el('div', 'toast', esc(text)); d.style.color = color; T_.appendChild(d);
    while (T_.children.length > 4) T_.removeChild(T_.firstChild);
    setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3200);
  }
  let bannerT = null;
  function banner(title, sub, big) {
    const b = $('#banner'); b.innerHTML = `<div class="bt">${esc(title)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}`;
    b.className = 'show' + (big ? ' big' : ''); clearTimeout(bannerT); bannerT = setTimeout(() => { b.className = ''; }, big ? 3600 : 2600);
  }
  function prompt(text) {
    const p = $('#prompt');
    const key = Input.mode === 'pad' ? 'Ⓐ' : Input.mode === 'touch' ? '' : 'E';
    set('prompt', 'html', text ? `${key ? `<span class="k">${key}</span>` : ''}${esc(text)}` : '');
    p.hidden = !text;
    $('#tInteract').classList.toggle('ready', !!text);
  }
  function hurtFlash() { const v = $('#vignette'); v.classList.remove('hit'); void v.offsetWidth; v.classList.add('hit'); }
  function toggleMap(on) { automap = on === undefined ? !automap : on; am.hidden = !automap; }
  function slotIcon(c, e) {
    if (!e) return { html: '', cls: 'empty', label: '' };
    if (e.t === 'tech') { const T_ = TECHS[e.id]; return { html: techIconSVG(e.id), cls: 'tech', label: `${T_.name} Lv${c.techs[e.id] || 0}` }; }
    if (e.t === 'skill') { const S_ = SKILLS[e.id]; return { html: iconSVG(S_.icon || 'star'), cls: 'skill', label: S_.name }; }
    if (e.t === 'item') { return { html: toolIconSVG(e.id), cls: 'item', label: TOOLS[e.id].name }; }
    return { html: '', cls: '' };
  }
  function update(dt) {
    const c = GAME.char; if (!c || !PL) return;
    const a = PL;
    // vitals
    set('hpFill', 'width', (a.hp / a.maxHp * 100).toFixed(1) + '%');
    set('hpText', 'text', `${Math.ceil(a.hp)} / ${a.maxHp}`);
    set('tpFill', 'width', (a.maxTp ? a.tp / a.maxTp * 100 : 0).toFixed(1) + '%');
    set('tpText', 'text', `${Math.floor(a.tp)} / ${a.maxTp}`);
    set('xpFill', 'width', (c.level >= MAX_LEVEL ? 100 : c.xp / xpToNext(c.level) * 100).toFixed(1) + '%');
    set('lvl', 'text', 'Lv ' + c.level);
    set('pname', 'text', c.name);
    set('pclass', 'text', CLASS_NAME(c.role, c.race));
    $('#hpFill').classList.toggle('low', a.hp < a.maxHp * 0.3);
    // buffs and statuses
    const icons = [];
    for (const [k, b] of Object.entries(a.buffs)) icons.push(`<span class="buff ${k}" title="${k}">${{ fervor: 'ATK▲', bulwark: 'DEF▲', warcry: 'CRY', barrier: 'BAR', aegis: 'AEG', regen: 'REG' }[k] || k}<i>${Math.ceil(b.t)}</i></span>`);
    for (const [k, s] of Object.entries(a.status)) icons.push(`<span class="buff bad">${{ burn: 'BURN', freeze: 'FRZ', shock: 'PAR', poison: 'PSN', slow: 'SLOW', stun: 'STUN' }[k] || k}<i>${Math.ceil(s.t)}</i></span>`);
    set('buffs', 'html', icons.join(''));
    // palette
    const slots = $$('#palette .slot');
    for (let i = 0; i < 6; i++) {
      const e = c.hotbar[i], s = slots[i], ic = slotIcon(c, e), key = JSON.stringify(e) + (e && e.t === 'tech' ? c.techs[e.id] : '');
      if (s.dataset.k !== key) { s.dataset.k = key; s.querySelector('.ico').innerHTML = ic.html; s.className = 'slot ' + ic.cls; s.title = ic.label; }
      let cd = 0, cnt = '', dim = false;
      if (e && e.t === 'skill') { const S_ = SKILLS[e.id]; cd = (a.cd['s_' + e.id] || 0) / ((S_.cd || 1) * (1 - a.S.cdr)); dim = a.tp < (S_.tp || 0); }
      if (e && e.t === 'tech') { dim = a.tp < techCost(e.id, c.techs[e.id] || 1); }
      if (e && e.t === 'item') { const n = invCount(c.inv, e.id); cnt = String(n); dim = !n; }
      s.querySelector('.cd').style.height = (clamp(cd, 0, 1) * 100) + '%';
      s.querySelector('.cnt').textContent = cnt;
      s.classList.toggle('dim', dim);
      s.querySelector('.key').textContent = Input.mode === 'pad' ? ['RT+X', 'RT+Y', 'RT+B', 'LT+X', 'LT+Y', 'LT+B'][i] : String(i + 1);
    }
    // overdrive
    const m = c.sprite;
    set('pbFill', 'height', m.pbCharge + '%');
    $('#pbGauge').classList.toggle('ready', m.pbCharge >= 100 && m.pbs.length > 0);
    $('#pbGauge').hidden = !m.pbs.length;
    // party frames
    const ph = ALLIES.map((p) => `<div class="pf ${p.downed ? 'down' : ''}"><div class="pn"><b style="color:${hexCss(ROLES[p.role].color)}">${esc(p.name)}</b> <span>${CLASS_NAME(p.role, p.race)} Lv${p.lvl}</span></div><div class="pbar"><i style="width:${(p.hp / p.maxHp * 100).toFixed(0)}%"></i></div><div class="pbar tp"><i style="width:${(p.maxTp ? p.tp / p.maxTp * 100 : 0).toFixed(0)}%"></i></div></div>`).join('');
    set('party', 'html', ph);
    // boss
    const b = GAME.boss && !GAME.boss.dead && GAME.boss.awake && GAME.mode === 'field' ? GAME.boss : null;
    $('#bossBar').hidden = !b;
    if (b) { set('bossName', 'text', b.name); set('bossFill', 'width', (b.hp / b.maxHp * 100).toFixed(1) + '%'); $('#bossBar').classList.toggle('shield', !!b.bossShield); }
    // quest tracker
    const q = c.quest.active;
    set('qtrack', 'html', q ? `<div class="qt">${esc(q.title)}</div><div class="qs">${q.done ? 'Complete: return to the Bureau' : q.type === 'hunt' ? `${q.got} / ${q.n}` : `${AREAS[q.area].name} ${q.floor + 1} · ${DIFFS[q.diff].name}`}</div>` : '');
    set('area', 'text', GAME.mode === 'field' ? `${AREAS[GAME.area].name} · ${GAME.floorIdx === 2 ? 'Depths' : 'Floor ' + (GAME.floorIdx + 1)} · ${DIFFS[GAME.diff].name}` : 'Meridian');
    mmT -= dt; if (mmT <= 0) { mmT = 0.1; drawMinimap(mmCtx, mm.width, mm.height, 30, false); if (automap) drawMinimap(amCtx, am.width, am.height, 0, true); }
    if (Input.pressed('map')) toggleMap();
    drawOverlay(dt);
  }
  // ---------- canvas overlay ----------
  function drawOverlay(dt) {
    const W = innerWidth, H = innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // enemy health bars and names
    for (const e of ENTS) {
      if (e.team !== 1 || e.dead || e.boss || e.box || e.stealthed || e.burrowed) continue;
      const show = e.hp < e.maxHp || e.elite || e.unique || e.variant || e.pod;
      if (!show) continue;
      const p = worldToScreen(e.x, (e.h || 1.6) + 0.45, e.z); if (!p.vis || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) continue;
      const w = e.unique ? 64 : e.elite ? 52 : 38;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - w / 2 - 1, p.y - 1, w + 2, 6);
      ctx.fillStyle = e.unique ? '#e8a040' : e.elite ? '#5a90ff' : '#e04040'; ctx.fillRect(p.x - w / 2, p.y, w * Math.max(0, e.hp / e.maxHp), 4);
      if (e.elite || e.unique || e.variant) {
        ctx.font = '600 12px Rajdhani, system-ui, sans-serif';
        ctx.fillStyle = e.unique ? '#f0b050' : e.variant ? '#ffe070' : '#7aa8ff';
        ctx.fillText(e.name, p.x, p.y - 10);
        if (e.elite) { ctx.font = '500 10px Rajdhani, system-ui, sans-serif'; ctx.fillStyle = '#9ab8e8'; ctx.fillText(eliteName(e), p.x, p.y - 22); }
      }
      if (Object.keys(e.status).length) { ctx.font = '600 9px Rajdhani, system-ui'; let sx = p.x - w / 2; for (const k of Object.keys(e.status)) { const col = { burn: '#ff8040', freeze: '#90e0ff', shock: '#fff060', mark: '#ff5050', enfeeble: '#c0a0ff', expose: '#c0a0ff', slow: '#a0c0ff', stun: '#ffe0a0', poison: '#a0ff60' }[k]; if (!col) continue; ctx.fillStyle = col; ctx.fillRect(sx, p.y + 6, 6, 3); sx += 8; } }
    }
    // ally bars and names
    for (const a of ALLIES) {
      const p = worldToScreen(a.x, 2.35, a.z); if (!p.vis) continue;
      ctx.font = '600 12px Rajdhani, system-ui, sans-serif'; ctx.fillStyle = a.downed ? '#ff7070' : '#d0f0ff';
      ctx.fillText(a.downed ? `${a.name} (down)` : a.name, p.x, p.y - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - 20, p.y, 40, 4); ctx.fillStyle = '#50e070'; ctx.fillRect(p.x - 20, p.y, 40 * a.hp / a.maxHp, 4);
    }
    // ground item labels
    labels.length = 0;
    const showAll = Input.held('labels') || OPTS.labels;
    const items = GROUND.filter((d) => !d.credits && PL && dist2(d.x, d.z, PL.x, PL.z) < 16 * 16 && (showAll || d.item.rar >= 2 || d.item.kind === 'quest' || d.item.kind === 'gem' || (d.item.kind === 'tool' && TOOLS[d.item.base].use === 'mat')));
    ctx.font = '600 13px Rajdhani, system-ui, sans-serif';
    const placed = [];
    for (const d of items) {
      const p = worldToScreen(d.x, 0.9, d.z); if (!p.vis) continue;
      const txt = itemName(d.item), w = ctx.measureText(txt).width + 12, h = 18;
      let x = p.x - w / 2, y = p.y - h;
      for (let k = 0; k < 8; k++) { const hit = placed.find((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y); if (!hit) break; y = hit.y - h - 2; }
      placed.push({ x, y, w, h });
      const hov = Input.mode === 'kbm' && Input.mouse.x >= x && Input.mouse.x <= x + w && Input.mouse.y >= y && Input.mouse.y <= y + h;
      ctx.fillStyle = hov ? 'rgba(40,60,90,0.92)' : 'rgba(6,10,18,0.78)'; ctx.fillRect(x, y, w, h);
      if (d.item.rar === 5) { ctx.strokeStyle = '#ff4050'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
      ctx.fillStyle = itemColor(d.item); ctx.fillText(txt, x + w / 2, y + h / 2 + 1);
      labels.push({ d, x, y, w, h });
      if (hov) showTip(d.item, Input.mouse.x, y);
    }
    if (!labels.some((l) => Input.mouse.x >= l.x && Input.mouse.x <= l.x + l.w && Input.mouse.y >= l.y && Input.mouse.y <= l.y + l.h)) hideTip();
    // speech bubbles
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.t += dt;
      if (b.t > 4 || b.a.dead || !ENTS.includes(b.a)) { bubbles.splice(i, 1); continue; }
      const p = worldToScreen(b.a.x, 2.9, b.a.z); if (!p.vis) continue;
      ctx.font = '500 13px Rajdhani, system-ui, sans-serif';
      const w = Math.min(240, ctx.measureText(b.text).width + 16), h = 22, al = Math.min(1, (4 - b.t) * 2);
      ctx.globalAlpha = al;
      ctx.fillStyle = 'rgba(240,248,255,0.94)'; roundRect(ctx, p.x - w / 2, p.y - h - 14, w, h, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 14); ctx.lineTo(p.x + 5, p.y - 14); ctx.lineTo(p.x, p.y - 7); ctx.fill();
      ctx.fillStyle = '#1a2230'; ctx.fillText(b.text.length > 38 ? b.text.slice(0, 36) + '…' : b.text, p.x, p.y - h / 2 - 13);
      ctx.globalAlpha = 1;
    }
    // floating numbers
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt;
      if (f.t > f.life) { floats.splice(i, 1); continue; }
      const p = worldToScreen(f.x, f.y + f.t * 1.4, f.z); if (!p.vis) continue;
      const k = f.t / f.life, sc = f.crit ? 1 + Math.max(0, 0.4 - f.t) * 1.5 : 1;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.font = `800 ${Math.round(f.size * sc)}px Rajdhani, system-ui, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(f.text, p.x + f.dx * k, p.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, p.x + f.dx * k, p.y);
      ctx.globalAlpha = 1;
    }
    // aim reticle for mouse users
    if (PL && PL.aimPt && Input.mode === 'kbm' && GAME.mode === 'field' && !UI.isOpen()) {
      const p = worldToScreen(PL.aimPt.x, 0.05, PL.aimPt.z);
      if (p.vis) { ctx.strokeStyle = 'rgba(160,230,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, 12, 7, 0, 0, TAU); ctx.stroke(); }
    }
    // revive progress
    if (GAME.reviveT > 0 && GAME.holdRevive) { const p = worldToScreen(GAME.holdRevive.x, 2.6, GAME.holdRevive.z); ctx.strokeStyle = '#a0ffc0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 14, -Math.PI / 2, -Math.PI / 2 + TAU * GAME.reviveT / 2); ctx.stroke(); }
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function labelAt(x, y) { for (let i = labels.length - 1; i >= 0; i--) { const l = labels[i]; if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) return l.d; } return null; }
  let tipItem = null;
  function showTip(it, x, y) {
    const tt = $('#gtip');
    if (tipItem !== it) { tipItem = it; tt.innerHTML = tooltipHTML(it, cmpFor(it), GAME.char); }
    tt.hidden = false;
    const r = tt.getBoundingClientRect();
    tt.style.left = clamp(x - r.width / 2, 8, innerWidth - r.width - 8) + 'px';
    tt.style.top = clamp(y - r.height - 8, 8, innerHeight - r.height - 8) + 'px';
  }
  function hideTip() { tipItem = null; $('#gtip').hidden = true; }
  // ---------- minimap / automap ----------
  function drawMinimap(g, W, H, radius, full) {
    const L = LV; if (!L || !PL) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    if (!full) { g.fillStyle = 'rgba(4,8,16,0.6)'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 1, 0, TAU); g.fill(); g.save(); g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 3, 0, TAU); g.clip(); }
    else { g.fillStyle = 'rgba(2,4,10,0.55)'; g.fillRect(0, 0, W, H); }
    const s = full ? Math.min(W, H) / (Math.max(L.w, L.h) * T) * 0.9 : W / (radius * 2 * T / 2) / 2.2;
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(CAM.yaw + Math.PI);
    const cx = full ? L.w * T / 2 : PL.x, cz = full ? L.h * T / 2 : PL.z;
    g.scale(s, s); g.translate(-cx, -cz);
    const i0 = full ? 0 : Math.max(0, tileOf(PL.x) - radius), i1 = full ? L.w - 1 : Math.min(L.w - 1, tileOf(PL.x) + radius);
    const j0 = full ? 0 : Math.max(0, tileOf(PL.z) - radius), j1 = full ? L.h - 1 : Math.min(L.h - 1, tileOf(PL.z) + radius);
    const hub = L.kind === 'hub';
    g.fillStyle = full ? 'rgba(120,170,220,0.45)' : 'rgba(130,170,210,0.55)';
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * L.w + i; if (!L.cells[k] || (!L.seen[k] && !hub)) continue;
      g.fillRect(i * T, j * T, T + 0.05, T + 0.05);
    }
    g.fillStyle = '#ff3040';
    for (const rm of L.rooms) if (rm.locked) for (const d of rm.doors) g.fillRect(d.i * T, d.j * T, T, T);
    const dot = (x, z, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, z, r / s, 0, TAU); g.fill(); };
    for (const o of L.objects) {
      if (!hub && !L.seen[tileOf(o.z) * L.w + tileOf(o.x)]) continue;
      const col = o.kind === 'next' ? (o.locked ? '#a070ff' : '#e0a0ff') : o.kind === 'home' || o.kind === 'tele' ? '#60d8ff' : o.kind === 'portal' || o.kind === 'return' ? '#80c0ff' : o.kind === 'capsule' ? '#ff70b0' : o.kind === 'npc' ? '#ffe070' : o.kind === 'rescue' ? '#a0ffa0' : '#fff';
      dot(o.x, o.z, o.kind === 'npc' ? 3 : 4, col);
    }
    for (const d of GROUND) if (!d.credits && (d.item.rar >= 2 || d.item.kind === 'quest')) dot(d.x, d.z, 2.5, itemColor(d.item));
    for (const e of ENTS) {
      if (e.dead || e.stealthed || e.burrowed) continue;
      if (e.team === 1 && !e.box) { if (dist2(e.x, e.z, PL.x, PL.z) < 22 * 22 || e.boss) dot(e.x, e.z, e.boss ? 5 : e.elite || e.unique ? 3.5 : 2.5, e.boss ? '#ff4060' : e.unique ? '#f0b050' : e.elite ? '#6a9aff' : '#ff5050'); }
      else if (e.kind === 'ally') dot(e.x, e.z, 3, e.downed ? '#ff9090' : '#60f080');
    }
    // the player arrow
    g.save(); g.translate(PL.x, PL.z); g.rotate(-PL.yaw); g.scale(1 / s, 1 / s);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, 7); g.lineTo(-5, -5); g.lineTo(0, -2); g.lineTo(5, -5); g.closePath(); g.fill();
    g.restore();
    g.restore();
    if (!full) { g.restore(); g.strokeStyle = 'rgba(120,200,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, TAU); g.stroke(); }
  }
  return { init, update, float, say, log, toast, banner, prompt, hurtFlash, labelAt, toggleMap, hideTip, get automap() { return automap; } };
})();
function cmpFor(it) {
  const c = GAME.char; if (!c || !isEquip(it)) return null;
  if (it.kind === 'unit') return c.equip.unit1 || c.equip.unit2;
  return c.equip[it.kind];
}

// ---------- icons (inline SVG, 24×24) ----------
const ICON_PATHS = {
  greatblade: 'M5 19l3-3m0 0l9-9 2-4-4 2-9 9m2 2l-3-3m0 3l2 2',
  gun: 'M3 9h14l2 2v2H9l-2 5H4l1-5H3z',
  staff: 'M6 20L16 6m0 0a2.5 2.5 0 1 0 3.5-3.5A2.5 2.5 0 0 0 16 6z',
  armor: 'M5 5l4-2h6l4 2-1 7-2 1v6H8v-6l-2-1z',
  shield: 'M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z',
  chip: 'M7 7h10v10H7zM10 3v4m4-4v4m-4 10v4m4-4v4M3 10h4m-4 4h4m10-4h4m-4 4h4',
  vial: 'M9 3h6m-5 0v6l-4 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-9V3',
  disc: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  gem: 'M6 4h12l3 5-9 11L3 9z',
  quest: 'M12 3l2.5 6H21l-5 4 2 7-6-4-6 4 2-7-5-4h6.5z',
  slash: 'M4 20L20 4M8 4h12v12', shield2: 'M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z', edge: 'M4 20l16-16M14 4h6v6M6 14l4 4',
  spin: 'M12 4a8 8 0 1 1-8 8m8-8V1m0 3l3 2', drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z', cry: 'M4 9h4l5-4v14l-5-4H4zm13 0a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12',
  slam: 'M12 3v10m-4-4l4 4 4-4M3 20h18M6 17l-2 3m14-3l2 3', combo: 'M4 17l4-10 4 10 4-10 4 10', heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  fan: 'M12 20L4 6m8 14V4m0 16l8-14', crit: 'M12 3v4m0 10v4M3 12h4m10 0h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', roll: 'M4 12a8 8 0 0 1 14-5m2 5a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4',
  lance: 'M3 12h15m0 0l-4-4m4 4l-4 4M21 8v8', grenade: 'M12 7a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 0V4h3', mark: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  turret: 'M6 20h12M8 20l1-6h6l1 6M9 14V9h6v5m0-3h6', rain: 'M6 4v6m4-4v6m4-8v6m4-4v6M4 20h16', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  tech: 'M12 2l3 6 6 1-4.5 4 1 6.5L12 16l-5.5 3.5 1-6.5L3 9l6-1z', bolts: 'M5 19l5-5m0 0l2-6 2 6m-4 0h4m3 5l3-3', font: 'M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11zm0 8v6',
  chain: 'M9 15l6-6M8 11l-2 2a3 3 0 0 0 4 4l2-2m4-4l2-2a3 3 0 0 0-4-4l-2 2', bubble: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-4 6a4 4 0 0 1 4-3', wisp: 'M12 4a5 5 0 0 0-5 5c0 4 5 4 5 11 0-7 5-7 5-11a5 5 0 0 0-5-5z',
  skull: 'M12 3a7 7 0 0 0-7 7c0 3 2 4 2 6v2h10v-2c0-2 2-3 2-6a7 7 0 0 0-7-7zM9 11h.01M15 11h.01M10 21v-3m4 3v-3', meteor: 'M14 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3 3l8 8M7 3l6 6M3 7l6 6',
  star: 'M12 3l2.6 6.2L21 10l-5 4.3 1.6 6.7L12 17.6 6.4 21 8 14.3 3 10l6.4-.8z', trap: 'M4 16h16M6 16l2-6h8l2 6M12 10V6M9 6h6', trapice: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  fire: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z', ice: 'M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7z', light: 'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  dark: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z', heal: 'M12 5v14M5 12h14', cure: 'M5 12l4 4 10-10', up: 'M12 19V5m-6 6l6-6 6 6', down: 'M12 5v14m-6-6l6 6 6-6', revive: 'M12 4v4m0 0a6 6 0 1 1-6 6M12 8l-3-3m3 3l3-3', portal: 'M12 3a5 9 0 1 0 0 18 5 9 0 0 0 0-18z',
};
function iconSVG(k, color = 'currentColor') { return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS[k] || ICON_PATHS.star}"/></svg>`; }
function techIconSVG(id) {
  const T_ = TECHS[id];
  const k = T_.elem ? { fire: 'fire', ice: 'ice', bolt: 'zap', light: 'light', dark: 'dark' }[T_.elem] : { heal: 'heal', cure: 'cure', buff: 'up', debuff: 'down', revive: 'revive', portal: 'portal' }[T_.kind];
  return iconSVG(k, T_.elem ? hexCss(ELEM_COLORS[T_.elem]) : '#a0ffc0');
}
function toolIconSVG(id) { return iconSVG('vial', hexCss(TOOLS[id].color)); }
function itemIconSVG(it) {
  if (it.kind === 'weapon') { const c = WTYPES[it.base].cls; return iconSVG(c === 'melee' ? 'greatblade' : c === 'staff' ? 'staff' : c === 'thrown' ? 'disc' : 'gun', itemColor(it)); }
  if (it.kind === 'frame') return iconSVG('armor', itemColor(it));
  if (it.kind === 'barrier') return iconSVG('shield', itemColor(it));
  if (it.kind === 'unit') return iconSVG('chip', itemColor(it));
  if (it.kind === 'tool') return toolIconSVG(it.base);
  if (it.kind === 'disc') return techIconSVG(it.base);
  if (it.kind === 'gem') return iconSVG('gem', itemColor(it));
  return iconSVG('quest', itemColor(it));
}
