// Farhold — the HUD: vitals, compass, ship gauges, projected markers, visor, messages, SOLA, banners, item icons

const ICON = {};
function makeIcons() {
  const draw = (id, sym, col, shape) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const hc = cssHex(col);
    g.translate(32, 32);
    g.beginPath();
    if (shape === 'hex') for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 27, Math.sin(a) * 27); }
    else if (shape === 'dia') { g.moveTo(0, -28); g.lineTo(26, 0); g.lineTo(0, 28); g.lineTo(-26, 0); }
    else g.roundRect ? g.roundRect(-26, -26, 52, 52, 10) : g.rect(-26, -26, 52, 52);
    g.closePath();
    const grd = g.createLinearGradient(0, -28, 0, 28); grd.addColorStop(0, cssHex(shadeHex(col, 0.55))); grd.addColorStop(1, cssHex(shadeHex(col, 0.22)));
    g.fillStyle = grd; g.fill(); g.lineWidth = 2.5; g.strokeStyle = hc; g.stroke();
    g.fillStyle = '#fff'; g.font = '700 ' + (sym.length > 2 ? 17 : 22) + 'px Rajdhani, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = hc; g.shadowBlur = 8; g.fillText(sym, 0, 2);
    ICON[id] = c.toDataURL();
  };
  for (const id in ITEMS) { const it = ITEMS[id]; draw(id, it.sym, it.col, it.cat === 'el' ? 'hex' : it.cat === 'sp' ? 'dia' : 'sq'); }
  draw('units', '¤', 0xffd060, 'dia'); draw('nanites', '⬡', 0x80b0ff, 'dia');
  for (const id in TECH) { const t = TECH[id]; draw('tech_' + id, t.name.split(' ').map((w) => w[0]).join('').slice(0, 2), t.slot === 'suit' ? 0x60c0ff : t.slot === 'tool' ? 0xffa040 : 0x80ff9a, 'sq'); }
}
const iconImg = (id, cls = '') => '<img class="' + cls + '" src="' + (ICON[id] || '') + '" alt="">';

const HUD = {
  el: {}, msgs: [], pickups: {}, markers: [], solaT: 0, bannerT: 0, discT: 0, warnT: 0, objFlash: 0,
  init() {
    for (const id of ['hud', 'cross', 'prompt', 'msgs', 'pickups', 'banner', 'sola', 'objective', 'compass', 'vitals', 'env', 'tool', 'shiphud', 'visor', 'markers', 'flash', 'vignette', 'disc', 'warnbox', 'wanted', 'holdring', 'fps', 'reticle', 'bars', 'jetbar']) this.el[id] = document.getElementById(id);
    this.compassCtx = this.el.compass.querySelector('canvas').getContext('2d');
  },
  msg(t, cls = '') {
    const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = t;
    this.el.msgs.appendChild(d);
    while (this.el.msgs.children.length > 6) this.el.msgs.firstChild.remove();
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, 4200);
  },
  pickup(id, n) {
    const name = id === 'units' ? 'Units' : id === 'nanites' ? 'Nanites' : ITEMS[id].name;
    let p = this.pickups[id];
    if (p && p.d.isConnected) { p.n += n; p.t = 3; p.d.querySelector('b').textContent = '+' + fmtNum(p.n); return; }
    const d = document.createElement('div'); d.className = 'pk';
    d.innerHTML = iconImg(id) + '<span>' + name + '</span><b>+' + fmtNum(n) + '</b>';
    this.el.pickups.appendChild(d);
    this.pickups[id] = p = { d, n, t: 3 };
  },
  banner(t, cls = '') { const b = this.el.banner; b.textContent = t; b.className = 'on ' + cls; this.bannerT = 3.2; },
  sola(html) { const s = this.el.sola; s.querySelector('.t').innerHTML = html; s.hidden = false; s.classList.remove('in'); void s.offsetWidth; s.classList.add('in'); this.solaT = 9 + html.length / 40; AU.sfx('talk', 0.5); },
  hurt(kind) { const v = this.el.vignette; v.className = kind; v.style.opacity = 1; setTimeout(() => (v.style.opacity = 0), 120); },
  flash(k) { this.el.flash.style.opacity = k; },
  warn(t) { this.el.warnbox.textContent = t; this.el.warnbox.hidden = false; this.warnT = 0.4; },
  objective(flash) { if (flash) this.objFlash = 2; },
  discovery(sp, pl, u) {
    const d = this.el.disc;
    const cat = sp.cat === 'fauna' ? 'Fauna' : sp.cat === 'flora' ? 'Flora' : 'Mineral';
    d.innerHTML = '<div class="k">' + cat + ' discovered</div><div class="n">' + esc(sp.name) + '</div><div class="r">' + (sp.rarity || 'Common') + ' · <b>+' + fmtNum(u) + '</b> units</div>';
    d.className = 'on'; this.discT = 4;
  },
  fps(t) { if (this.el.fps) this.el.fps.textContent = t; },
  setPrompt(html, hold) {
    const p = this.el.prompt;
    if (html !== this._prompt) { this._prompt = html; p.innerHTML = html || ''; }
    p.hidden = !html;
    this.el.holdring.style.setProperty('--k', hold || 0);
    this.el.holdring.hidden = !hold;
  },
  update(dt) {
    const P = PLAYER, st = P.stats, el = this.el;
    // timers
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) el.banner.className = ''; }
    if (this.solaT > 0) { this.solaT -= dt; if (this.solaT <= 0) el.sola.hidden = true; }
    if (this.discT > 0) { this.discT -= dt; if (this.discT <= 0) el.disc.className = ''; }
    if (this.warnT > 0) { this.warnT -= dt; if (this.warnT <= 0) el.warnbox.hidden = true; }
    for (const id in this.pickups) { const p = this.pickups[id]; p.t -= dt; if (p.t <= 0) { p.d.style.opacity = 0; const d = p.d; setTimeout(() => d.remove(), 500); delete this.pickups[id]; } }
    const inShip = P.inShip;
    document.body.classList.toggle('inship', inShip);
    document.body.classList.toggle('visor', TOOL.visor && !inShip);
    // vitals
    const bar = (id, v, max = 100) => { const b = el.bars.querySelector('[data-b="' + id + '"]'); if (b) { b.querySelector('i').style.width = clamp(v / max * 100, 0, 100) + '%'; b.classList.toggle('low', v / max < 0.2); } };
    bar('shield', st.shield, maxShield()); bar('hp', st.hp); bar('life', st.life); bar('haz', st.haz);
    el.bars.querySelector('[data-b="haz"]').classList.toggle('active', SURV.exposed);
    el.bars.querySelector('[data-b="haz"] .lbl').textContent = SURV.exposed ? HAZ_LABEL[SURV.kind] || 'Hazard' : 'Hazard Protection';
    el.jetbar.style.setProperty('--k', st.jet / 100); el.jetbar.style.setProperty('--s', st.stam / 100);
    el.jetbar.classList.toggle('show', !inShip && (st.jet < 99 || st.stam < 99));
    // environment panel
    this.updateEnv();
    // objective
    const qt = QUEST.text();
    if (qt !== this._qt) { this._qt = qt; el.objective.innerHTML = qt ? '<div class="h">Current objective</div><div class="t">' + qt + '</div>' : ''; }
    if (this.objFlash > 0) { this.objFlash -= dt; el.objective.classList.toggle('flash', Math.sin(this.objFlash * 10) > 0); } else el.objective.classList.remove('flash');
    // tool panel
    if (!inShip) {
      const mode = TOOL.mode === 'mine' ? 'Mining Beam' : 'Bolt Caster';
      const v = TOOL.mode === 'mine' ? TOOL.heat : TOOL.ammo / TOOL.clip * 100;
      el.tool.innerHTML = '<div class="m">' + (TOOL.visor ? 'Analysis Visor' : mode) + '</div><div class="g ' + (TOOL.over > 0 ? 'over' : '') + '"><i style="width:' + v + '%"></i></div><div class="s">' + (TOOL.mode === 'mine' ? (TOOL.over > 0 ? 'OVERHEATED' : 'Heat') : (TOOL.reloadT > 0 ? 'Reloading…' : TOOL.ammo + ' / ' + TOOL.clip)) + ' · <kbd>' + keyLabel('mode') + '</kbd> switch</div>' + (TOOL.scanT > 0 ? '<div class="s">Scanner recharging ' + Math.ceil(TOOL.scanT) + 's</div>' : '');
    }
    // ship gauges
    if (inShip && SHIP.cur) this.updateShipHUD();
    // wanted
    el.wanted.innerHTML = WANTED.level ? '<span>' + '★'.repeat(WANTED.level) + '<i>' + '★'.repeat(5 - WANTED.level) + '</i></span>' : '';
    // visor info
    if (TOOL.visor && !inShip) this.updateVisor();
    this.updateCompass();
    this.updateMarkers();
    el.cross.hidden = inShip ? SHIP.state !== 'flight' : false;
  },
  updateEnv() {
    const el = this.el.env, P = PLAYER;
    let h = '';
    const pl = ENV.pl && (ENV.inAtmo > 0.3 || ENV.alt < 3000) ? ENV.pl : null;
    if (pl && (P.frame && P.frame.kind === 'planet' || P.inShip)) {
      const W = WEATHER.get(pl);
      const wtxt = !pl.atmo ? 'No atmosphere' : W && W.on ? '<b class="bad">' + W.name + '</b>' : W && W.warn ? '<b class="warnc">Storm approaching</b>' : 'Calm';
      h = '<div class="pn">' + esc(planetDisplayName(pl)) + '</div><div class="row">' + Math.round(ENV.temp) + '°C · ' + wtxt + '</div><div class="row dim">Sentinels: ' + SENTINEL_LV[pl.sentinel].name + (SURV.sheltered && !P.inShip ? ' · <b class="good">Sheltered</b>' : '') + '</div>';
    } else if (P.frame && P.frame.kind === 'station') {
      h = '<div class="pn">' + esc(SYS.cur.name) + ' Station</div><div class="row dim">' + ECONOMIES[SYS.cur.economy].name + ' economy · ' + CONFLICT[SYS.cur.conflict] + '</div>';
    } else if (SYS.cur) {
      h = '<div class="pn">' + esc(SYS.cur.name) + '</div><div class="row dim">' + STAR_CLASS[SYS.cur.cls].name + ' star · ' + ECONOMIES[SYS.cur.economy].name + ' · ' + CONFLICT[SYS.cur.conflict] + '</div>';
    }
    h += '<div class="cur">' + iconImg('units', 'ic') + fmtNum(P.units) + ' &nbsp; ' + iconImg('nanites', 'ic') + fmtNum(P.nanites) + '</div>';
    if (h !== this._env) { this._env = h; el.innerHTML = h; }
  },
  updateShipHUD() {
    const S = SHIP, el = this.el.shiphud, C = S.cur;
    const spd = Math.round(S.speed), alt = S.frame && S.frame.kind === 'planet' ? Math.round(S.alt) : null;
    const g = (lbl, v, cls) => '<div class="sg ' + (cls || '') + '"><span>' + lbl + '</span><div class="g"><i style="width:' + clamp(v, 0, 100) + '%"></i></div></div>';
    let h = '<div class="spd"><b>' + fmtNum(spd) + '</b><small> u</small></div>';
    if (alt != null && S.state !== 'landed') h += '<div class="alt">ALT ' + fmtNum(alt) + ' m</div>';
    if (S.pulseK > 0.05) h += '<div class="pulse">PULSE</div>';
    if (S.jammed > 0 && !S.frame) h += '<div class="jam">PULSE JAMMED</div>';
    h += g('Shield', C.shield / shipMaxShield() * 100, 'sh') + g('Hull', C.hull, 'hu') + g('Lift', C.lift, 'lf') + g('Pulse', C.pulse, 'pu');
    if (S.heat > 1) h += g('Heat', S.heat, S.over > 0 ? 'over' : 'ht');
    let hint = '';
    if (S.state === 'landed') hint = (S.frame && S.frame.kind === 'station' ? '<kbd>' + keyLabel('jump') + '</kbd> launch' : '<kbd>' + keyLabel('jump') + '</kbd> take off') + ' · hold <kbd>' + keyLabel('interact') + '</kbd> exit';
    else if (S.state === 'flight') {
      if (S.inAtmo && S.alt < 180) hint = 'hold <kbd>' + keyLabel('interact') + '</kbd> land';
      else if (!S.frame) hint = 'hold <kbd>' + keyLabel('pulse') + '</kbd> pulse drive' + (GALAXY.target && GALAXY.target !== SYS.star ? ' · hold <kbd>' + keyLabel('warp') + '</kbd> warp to ' + esc(GALAXY.target.name) : '');
      if (WARP.hold > 0) hint = 'Charging hyperdrive… ' + Math.round(WARP.hold / 1.2 * 100) + '%';
    } else if (S.state === 'dock' || S.state === 'undock') hint = S.state === 'dock' ? 'Docking…' : 'Launching…';
    h += '<div class="hint">' + hint + '</div>';
    if (h !== this._sh) { this._sh = h; el.innerHTML = h; }
    // flight reticle from stick deflection
    const r = this.el.reticle;
    r.hidden = S.state !== 'flight';
    r.style.transform = 'translate(' + (S.stick.x * 90) + 'px,' + (S.stick.y * 90) + 'px)';
  },
  updateVisor() {
    const V = this.el.visor.querySelector('.info'), t = TOOL.vTarget;
    let h = '';
    if (t) {
      const sp = t.sp, pl = PLAYER.frame && PLAYER.frame.pl;
      const known = pl && (t.kind === 'fauna' || t.kind === 'flora' || t.kind === 'mineral') && isDiscovered(pl, sp);
      h = '<div class="k">' + ({ fauna: 'Fauna', flora: 'Flora', mineral: 'Mineral', sentinel: 'Sentinel', poi: 'Structure' }[t.kind] || '') + '</div>';
      h += '<div class="n">' + (known || t.kind === 'sentinel' || t.kind === 'poi' ? esc(pl ? displayName(pl, sp) : sp.name) : '???') + '</div>';
      if (t.kind === 'fauna' && known) h += '<div class="d">' + sp.tempLabel + ' · ' + sp.diet + '<br>Height ' + (sp.height).toFixed(1) + ' m · ' + sp.weight + ' kg<br><i>' + sp.note + '</i></div>';
      if (t.kind === 'flora' && known) h += '<div class="d">' + (sp.root || '') + '<br><i>' + (sp.note || '') + '</i>' + (sp.pick ? '<br>Harvest: ' + ITEMS[sp.pick.item].name : '<br>Yields ' + ITEMS[sp.yield.item].name) + '</div>';
      if (t.kind === 'mineral' && known) h += '<div class="d">Yields ' + ITEMS[sp.yield.item].name + '</div>';
      if (!known && (t.kind === 'fauna' || t.kind === 'flora' || t.kind === 'mineral')) h += '<div class="prog"><i style="width:' + TOOL.vProg * 100 + '%"></i></div><div class="d">Scanning…</div>';
    } else h = '<div class="d dim">Aim at creatures, plants and minerals to study them.</div>';
    if (h !== this._vis) { this._vis = h; V.innerHTML = h; }
  },
  updateCompass() {
    const g = this.compassCtx, W = 520, H = 30;
    g.clearRect(0, 0, W, H);
    const f = PLAYER.inShip ? SHIP.frame : PLAYER.frame;
    if (!f || f.kind !== 'planet') { this.el.compass.style.opacity = 0.0; this._heading = null; return; }
    this.el.compass.style.opacity = 1;
    const up = (PLAYER.inShip ? SHIP.pos : PLAYER.pos).clone().normalize();
    const north = new V3(0, 1, 0).addScaledVector(up, -up.y);
    if (north.lengthSq() < 1e-6) north.set(1, 0, 0);
    north.normalize();
    const east = new V3().crossVectors(north, up);
    const fwd = new V3(0, 0, -1).applyQuaternion(CAM.q); fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    const heading = Math.atan2(fwd.dot(east), fwd.dot(north));
    this._heading = { heading, north, east, up };
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '600 13px Rajdhani, sans-serif'; g.textAlign = 'center';
    for (let d = 0; d < 360; d += 15) {
      let a = angWrap(d * Math.PI / 180 - heading);
      if (Math.abs(a) > 1.2) continue;
      const x = W / 2 + a / 1.2 * (W / 2);
      const lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d];
      if (lab) { g.fillStyle = lab === 'N' ? '#ffb050' : '#fff'; g.fillText(lab, x, 22); }
      else { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x - 0.5, 14, 1, d % 45 ? 5 : 8); }
    }
  },
  // project markers from frame-local positions to the screen
  updateMarkers() {
    const list = collectMarkers();
    const host = this.el.markers;
    while (this.markers.length < list.length) { const d = document.createElement('div'); d.className = 'mk'; d.innerHTML = '<i></i><span></span>'; host.appendChild(d); this.markers.push(d); }
    const w = innerWidth, h = innerHeight;
    const cam = R.camera;
    for (let i = 0; i < this.markers.length; i++) {
      const d = this.markers[i], m = list[i];
      if (!m) { d.style.display = 'none'; continue; }
      _v1.copy(m.world).project(cam);
      const behind = _v1.z > 1 || _v1.z < -1 && false;
      const camSpace = m.world.clone().applyMatrix4(cam.matrixWorldInverse);
      let x = (_v1.x * 0.5 + 0.5) * w, y = (-_v1.y * 0.5 + 0.5) * h;
      const back = camSpace.z > 0;
      if (back || behind) { x = w - x; y = h - 40; }
      const clamped = x < 30 || x > w - 30 || y < 60 || y > h - 40 || back;
      x = clamp(x, 30, w - 30); y = clamp(y, 60, h - 40);
      d.style.display = '';
      d.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
      d.className = 'mk ' + (m.cls || '') + (clamped ? ' edge' : '');
      const key = m.icon + '|' + m.label + '|' + m.color;
      if (d._k !== key) { d._k = key; d.firstChild.innerHTML = m.img ? iconImg(m.img) : m.icon; d.firstChild.style.color = m.color || '#fff'; d.firstChild.style.borderColor = m.color || '#fff'; }
      d.lastChild.textContent = (m.label ? m.label + ' · ' : '') + fmtDist(m.dist);
    }
  },
};
function fmtDist(d) { return d < 1000 ? Math.round(d) + ' m' : d < 1e5 ? (d / 1000).toFixed(1) + ' km' : fmtNum(d / 1000) + ' km'; }
// gather markers: quest target, ship, scanner hits, POIs, bases, station/planets in space, pirates
function collectMarkers() {
  const out = [];
  const camW = R.camera.position;
  const P = PLAYER;
  const add = (f, local, o) => { const world = toWorld(f, local, new V3()); out.push(Object.assign({ world, dist: world.distanceTo(camW) }, o)); };
  const qt = QUEST.target();
  if (qt) add(qt.f, qt.pos, { icon: '◆', label: qt.label, color: '#ffb050', cls: 'quest' });
  if (SHIP.cur && !P.inShip && SHIP.frame === P.frame && (!qt || qt.label !== 'Ship')) add(SHIP.frame, SHIP.pos.clone().addScaledVector(shipUp(new V3()), 3), { icon: '✈', label: '', color: '#7cffb0' });
  const f = P.inShip ? SHIP.frame : P.frame;
  if (f && f.kind === 'planet') {
    const pl = f.pl, me = (P.inShip ? SHIP.pos : P.pos);
    for (const m of TOOL.markers) if (m.o.alive) add(f, m.pos.clone().addScaledVector(m.pos.clone().normalize(), 2), { img: m.item, icon: '', label: '', color: cssHex(ITEMS[m.item].col), cls: 'res' });
    const range = P.inShip ? 1600 : 280;
    for (const poi of pl.pois) {
      if (poi.type === 'crash') continue;
      const loc = poi.dir.clone().multiplyScalar(pl.R + poi.h + 4);
      const d = loc.distanceTo(me);
      if (d < range || poi.known && d < 2500) { const T = POI_TYPES[poi.type]; add(f, loc, { icon: T.icon, label: T.name, color: POIS.done.has(poiKey(pl, poi)) ? '#888' : T.col }); }
    }
    for (const b of BASES.list) if (b.pl === pl.id) add(f, b.center.clone().addScaledVector(b.center.clone().normalize(), 4), { icon: '⌂', label: b.name, color: '#80d0ff' });
    for (const gm of GRAVES.markers) if (gm.pl === pl) add(f, gm.g.pos.clone().addScaledVector(gm.g.pos.clone().normalize(), 2), { icon: '✝', label: 'Grave', color: '#ff70b0' });
  } else if (!f && SYS.cur) {
    if (STATION.obj && (!qt || qt.label !== 'Station')) add(null, STATION.pos, { icon: '◎', label: 'Station', color: '#9ae0ff' });
    for (const p of PLANETS.list) add(null, p.pos, { icon: '●', label: planetDisplayName(p), color: cssHex(p.pal.low) });
    for (const p of PIRATES.list) if (p.alive) add(null, p.pos, { icon: '✖', label: 'Pirate', color: '#ff5040', cls: 'enemy' });
  }
  return out;
}
