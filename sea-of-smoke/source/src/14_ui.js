// ---- 14_ui: title, port (ship and map choice), help, settings, pause, results ----
const Ui = { screen: 'title', prev: null, preview: null, ang: 0 };
const show = (id) => { for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id; Ui.screen = id; document.body.dataset.state = id || 'play'; };

Ui.init = function () {
  $('btnSail').onclick = () => { Sfx.init(); Sfx.ui(); Ui.port(); };
  $('btnHelp').onclick = () => { Sfx.init(); Sfx.ui(); Ui.prev = Ui.screen; show('help'); };
  $('btnSet').onclick = () => { Sfx.init(); Sfx.ui(); Ui.prev = Ui.screen; Ui.settings(); };
  for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { Sfx.ui(); Ui.back(); };
  $('btnGo').onclick = () => { Sfx.init(); Sfx.ui(); Ui.startBattle(); };
  $('btnResume').onclick = () => Ui.resume();
  $('btnPHelp').onclick = () => { Ui.prev = 'pause'; show('help'); };
  $('btnPSet').onclick = () => { Ui.prev = 'pause'; Ui.settings(); };
  $('btnLeave').onclick = () => { G.paused = false; Ui.leave(); };
  $('btnAgain').onclick = () => { Sfx.ui(); Ui.startBattle(); };
  $('btnPort').onclick = () => { Sfx.ui(); Ui.leave(); };
  $('btnSkip').onclick = () => Ui.skip();
  // port: ship list and maps
  const list = $('ships');
  for (const id of CLASS_ORDER) {
    const C = CLASSES[id], b = el('button', 'shipbtn', `<b>${CLASS_ICON[id]}</b><span>${C.name}<small>${C.ship} · ${C.role}</small></span>`);
    b.onclick = () => { Sfx.ui(); settings.ship = id; saveSettings(); Ui.portRefresh(); };
    b.dataset.id = id; list.appendChild(b);
  }
  const maps = $('maps');
  MAPS.forEach((m, i) => { const b = el('button', 'mapbtn', `<b>${m.name}</b><small>${m.caps.length} points · ${m.time}</small>`); b.onclick = () => { Sfx.ui(); settings.map = i; saveSettings(); Ui.portRefresh(); }; b.dataset.i = i; maps.appendChild(b); });
  // settings form
  const f = $('setform');
  const row = (label, input) => { const r = el('label', 'set'); r.append(el('span', '', label), input); f.appendChild(r); return input; };
  const range = (k, min, max, step) => { const i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = settings[k]; i.oninput = () => { settings[k] = +i.value; saveSettings(); if (k === 'vol') Sfx.setVolume(settings.vol); }; return i; };
  const check = (k) => { const i = el('input'); i.type = 'checkbox'; i.checked = !!settings[k]; i.onchange = () => { settings[k] = i.checked; saveSettings(); }; return i; };
  row('Aim sensitivity', range('sens', 0.3, 2.5, 0.05));
  row('Invert aim distance', check('invert'));
  row('Lead marker on targets', check('lead'));
  row('Camera shake', check('shake'));
  row('Volume', range('vol', 0, 1, 0.05));
  const q = el('select'); for (const v of ['auto', 'low', 'high']) { const o = el('option', '', v); o.value = v; q.appendChild(o); } q.value = settings.quality;
  q.onchange = () => { settings.quality = q.value; saveSettings(); R.quality = q.value === 'low' ? 0.75 : q.value === 'high' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.5); R.renderer.setPixelRatio(R.quality); R.resize(); };
  row('Resolution', q);
  show('title');
  Ui.backdropMap();
};
Ui.back = function () { if (Ui.prev === 'pause') show('pause'); else show(Ui.prev || 'title'); };
Ui.settings = function () { show('settings'); };
Ui.port = function () { show('port'); Ui.portRefresh(); };
Ui.portRefresh = function () {
  const id = settings.ship, C = CLASSES[id];
  for (const b of document.querySelectorAll('.shipbtn')) b.classList.toggle('sel', b.dataset.id === id);
  for (const b of document.querySelectorAll('.mapbtn')) b.classList.toggle('sel', +b.dataset.i === settings.map);
  const m = MAPS[settings.map];
  $('mapdesc').textContent = m.desc;
  const bar = (label, v, max, txt, inv) => `<div class="stat"><span>${label}</span><i><b style="width:${clamp((inv ? max - v : v) / max * 100, 4, 100)}%"></b></i><em>${txt}</em></div>`;
  const bpm = Math.round(C.guns.side * C.guns.dmg * 60 / C.guns.reload);
  const sp = SPECIALS[C.special];
  $('shipinfo').innerHTML = `<h3>${C.name}</h3><h2>${C.ship}</h2><p>${C.blurb}</p>` +
    bar('Hull', C.hp, 18000, C.hp) + bar('Speed', C.speed * 0.55, 14, (C.speed * 0.55).toFixed(1) + ' kn') +
    bar('Turning', 300 - C.turnR, 300, C.turnR + ' m circle') + bar('Broadside', bpm, 15000, `${C.guns.side} × ${C.guns.cal}`) +
    bar('Gun range', C.guns.range, 800, C.guns.range + ' m') + bar('Stealth', 1000 - C.conceal, 700, 'seen at ' + C.conceal + ' m') + bar('Crew', C.crew, 500, C.crew) +
    `<ul class="kit"><li><kbd>R</kbd> Repair party ×${C.repair.charges}: puts out fires, stops leaks, mends the hull</li><li><kbd>T</kbd> ${sp.name} ×${sp.charges}: ${sp.desc}</li>` +
    (C.rafts ? `<li><kbd>4</kbd> Fire rafts: three burning boats, ${C.rafts.range} m, reload ${C.rafts.reload} s</li><li><kbd>Y</kbd> Set her alight: ram an enemy within 30 s</li>` : '') +
    (C.chainBonus ? '<li>Chain shot loads 35% faster and tears 35% more sail</li>' : '') + '</ul>';
  Ui.setPreview(id);
};

// ---- backdrop: a ship riding at anchor while the menus are open ----
Ui.backdropMap = function () {
  const map = MAPS[settings.map] || MAPS[0];
  if (World.map !== map) World.build(map);
  R.setLook(map, 0);
  Ui.setPreview(settings.ship);
};
Ui.setPreview = function (id) {
  if (Ui.preview && Ui.preview.cls === id && World.map === Ui.preview.map) return;
  if (Ui.preview) R.scene.remove(Ui.preview.model.root);
  if (World.map !== MAPS[settings.map]) { World.build(MAPS[settings.map]); R.setLook(MAPS[settings.map], 0); }
  const sp = World.map.spawns[0];
  Ui.preview = { cls: id, map: World.map, model: buildShip(id, { team: 0, strake: STRAKES[0] }), x: sp.x, z: sp.z };
  R.scene.add(Ui.preview.model.root);
  Ui.preview.model.sails.forEach((s) => { s.scale.y = 0.9; });
};
Ui.backdrop = function (dt) {
  const p = Ui.preview; if (!p) return;
  Ui.ang += dt * 0.06;
  const m = p.model, C = CLASSES[p.cls];
  const y = waveH(p.x, p.z);
  m.root.position.set(p.x, y * 0.8, p.z); m.root.rotation.y = 0.6;
  m.tilt.rotation.set(-(waveH(p.x, p.z + C.len * 0.4) - waveH(p.x, p.z - C.len * 0.4)) / C.len * 0.6, 0, Math.sin(R.wt * 0.7) * 0.03);
  m.flags.forEach((f, i) => { f.rotation.y = Math.PI / 2 + 1 + Math.sin(R.wt * 7 + i) * 0.1; });
  const port = Ui.screen === 'port', d = C.len * (port ? 1.6 : 2.1) + 30;
  const a = Ui.ang + (port ? 2.2 : 0), rx = Math.cos(a), rz = -Math.sin(a); // camera right
  R.camera.position.set(p.x + Math.sin(a) * d, C.mastH * (port ? 0.35 : 0.45) + 6, p.z + Math.cos(a) * d);
  // aim off to one side so the ship stands clear of the menus (centre on the port screen, right on the title)
  const off = port ? 0 : -C.len * 0.75;
  R.camera.lookAt(p.x + rx * off, C.mastH * (port ? 0.42 : 0.12), p.z + rz * off);
  R.camera.fov = 50; R.camera.updateProjectionMatrix();
  R.scene.fog.near = 500; R.scene.fog.far = 3400;
  if (rand() < 0.3) Fx.wake(p.x + rnd(-C.beam, C.beam), p.z + rnd(-C.len / 2, C.len / 2), 0, 0, 1.5);
};

Ui.startBattle = function (o) {
  o = Object.assign({ cls: settings.ship, map: settings.map }, o || {});
  if (Ui.preview) { R.scene.remove(Ui.preview.model.root); Ui.preview = null; }
  G.state = 'play'; G.paused = false; show(null);
  const r = Match.start(o);
  Input.clear();
  if (!DEBUG) Input.lock();
  return r;
};
Ui.pause = function () {
  if (G.state !== 'play' || G.paused) return;
  G.paused = true; show('pause'); Input.unlock();
};
Ui.resume = function () { G.paused = false; show(null); Input.clear(); Input.lock(); };
Ui.leave = function () {
  for (const s of G.ships) R.scene.remove(s.model.root);
  for (const r of Combat.rafts) R.scene.remove(r.mesh);
  G.ships = []; G.player = null; Combat.reset(); Fx.clear(); Match.phase = 'none'; Match.fog = [];
  G.state = 'port'; Input.unlock(); Ui.port(); Ui.backdropMap();
};
// Fast-forward the rest of the battle after the player's ship is lost.
Ui.skip = async function () {
  if (Ui.skipping) return; Ui.skipping = true;
  $('btnSkip').textContent = 'Fast-forwarding…';
  while (Match.phase === 'battle') {
    G.simming = true;
    for (let i = 0; i < 300 && Match.phase === 'battle'; i++) Match.update(1 / 15);
    G.simming = false;
    await new Promise((r) => setTimeout(r, 0));
  }
  Ui.skipping = false; $('btnSkip').textContent = 'Skip to the end';
  Match.overT = 99;
};
Ui.results = function () {
  const r = Match.result, p = G.player; if (!r) return;
  G.state = 'over'; Input.unlock();
  const ally = Match.viewTeam;
  const res = r.win < 0 ? 'Draw' : r.win === ally ? 'Victory' : 'Defeat';
  $('restitle').textContent = res; $('restitle').className = res.toLowerCase();
  $('reswhy').textContent = `${r.why} · ${Math.round(r.pts[ally])} to ${Math.round(r.pts[1 - ally])} · ${fmtTime(r.time)}`;
  if (p) {
    const st = p.stats;
    $('resme').innerHTML = `<h3>${p.name} · ${p.C.name}</h3><div class="mine">` +
      [['Damage', Math.round(st.dmg)], ['Ships sunk', st.kills], ['Captured', st.captures], ['Fires set', st.fires], ['Points taken', st.caps], ['Hit rate', st.shots ? Math.round(st.hits / st.shots * 100) + '%' : '—'],
        ['Fate', !p.alive ? (Match.playerLost === 'expended' ? 'Spent' : 'Sunk') : p.team !== ally ? 'Captured' : 'Afloat']]
        .map(([a, b]) => `<div><b>${b}</b><span>${a}</span></div>`).join('') + '</div>';
  } else $('resme').innerHTML = '';
  const rows = G.ships.slice().sort((a, b) => b.stats.dmg - a.stats.dmg).map((s) =>
    `<tr class="${s.team === ally ? 'a' : 'e'}${s.isPlayer || s === p ? ' me' : ''}"><td>${CLASS_ICON[s.cls]} ${s.name}</td><td>${s.C.name}</td><td>${Math.round(s.stats.dmg)}</td><td>${s.stats.kills}</td><td>${s.alive ? Math.round(s.hpf * 100) + '%' : 'sunk'}</td></tr>`).join('');
  $('restable').innerHTML = `<tr><th>Ship</th><th>Class</th><th>Damage</th><th>Sunk</th><th>Hull</th></tr>${rows}`;
  show('results');
};
Ui.update = function () {
  if (G.state === 'play') {
    if (Input.hit('Escape') || Input.hit('P9')) { if (G.paused) Ui.resume(); else Ui.pause(); }
    const helm = G.player && G.player.alive && G.player.isPlayer;
    if (!G.paused && !DEBUG && helm && !Input.locked && Ui.wasLocked && Match.phase !== 'over') Ui.pause();
    Ui.wasLocked = Input.locked;
    if (Match.phase === 'over' && Match.overT > 4.5) Ui.results();
    if (!$('dead').hidden && (Input.hit('Enter') || Input.hit('P9'))) Ui.skip();
  } else if (Ui.screen === 'title' && (Input.hit('Enter') || Input.hit('P0'))) $('btnSail').click();
  else if (Ui.screen === 'port' && (Input.hit('Enter') || Input.hit('P0'))) $('btnGo').click();
};
