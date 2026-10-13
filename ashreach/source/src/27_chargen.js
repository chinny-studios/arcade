// Ashreach — character creation: name, faction, breed, profession, looks, live 3D preview

const CG = { el: null, cols: [], st: null, r: null, scene: null, cam: null, rig: null, raf: 0, last: 0, rot: 0.4, drag: null, wkind: '' };
const CG_FACTIONS = [
  ['meridian', 'Meridian', 'Corporate', 'Meridian Consolidated terraformed Ashreach to strip-mine lumen. Contracts, order, and the best-equipped security force on the planet. Its people call it progress.'],
  ['freehold', 'Freehold', 'Rebel', 'Contract workers who walked off the job and never came back. A loose federation of badland settlements that answers to nobody, and fights for the lumen under its feet.'],
  ['unaligned', 'Unaligned', 'Neutral', 'Traders, drifters and the uncommitted. Welcome in every Concord city, trusted by neither side, free to take any contract going.'],
];
const CG_PRIMARY = [0x4a6fa5, 0x3d6b4f, 0x8a3b2e, 0x6b5a3a, 0x50565e, 0x2c2f36, 0x7a4f8c, 0xb08a3e, 0x2f7f86, 0xa04f6a, 0xc8c2b4, 0x5a7d2a];
const CG_SECOND = [0x2b2f38, 0x1e2226, 0x4a4036, 0x3a4652, 0x5a3426, 0x6e7378, 0x23362c, 0x8a8478];
const CG_ACCENT = [0x3fd0ff, 0xffb347, 0x7dff9a, 0xff5a6e, 0xc080ff, 0xf4f0e0];
const CG_SYL = [['Ka', 'Vex', 'Tor', 'Ry', 'Zan', 'Mi', 'Kel', 'Dra', 'Syl', 'Nyx', 'Or', 'Ash', 'Jet', 'Qua', 'Lio', 'Vor', 'Cyr', 'Eth', 'Sol', 'Bre', 'Tal', 'Ix', 'Rho', 'Sev', 'Ula', 'Fen', 'Gri', 'Hal'],
  ['ra', 'dar', 'ix', 'ana', 'eth', 'ros', 'yn', 'ova', 'ek', 'ius', 'ara', 'on', 'is', 'ka', 'vel', 'tor', 'ren', 'ia', 'zo', 'mir', 'quin', 'ash', 'ly', 'dex']];
const CG_TAILS = ['', '', '', '', 'x', 'n', 'k', 'e', 'is', 'a'];

function cg_name() {
  const r = (a) => a[Math.floor(Math.random() * a.length)];
  let n = r(CG_SYL[0]) + r(CG_SYL[1]);
  if (Math.random() < 0.45) n += r(CG_SYL[1]);
  n += r(CG_TAILS);
  return n.length > 12 ? n.slice(0, 12) : n;
}
function cg_lists() {
  return {
    skin: typeof MD_SKIN_TONES !== 'undefined' ? MD_SKIN_TONES : [0xf3d2b6, 0xe2b48e, 0xc89064, 0x9c6642, 0x6e4329, 0x4b2d1c],
    hair: typeof MD_HAIR_COLS !== 'undefined' ? MD_HAIR_COLS : [0x1c1612, 0x3a2516, 0x6b4322, 0xb48544, 0xdcc48c, 0x8c2e1a, 0xcfcfcf],
    styles: typeof MD_HAIR_STYLES !== 'undefined' ? MD_HAIR_STYLES : ['Bald', 'Crop', 'Mohawk', 'Ponytail', 'Long', 'Topknot'],
  };
}
function cg_reset() {
  const L = cg_lists(), r = (a) => a[Math.floor(Math.random() * a.length)];
  CG.st = {
    name: cg_name(), faction: 'unaligned', breed: 'baseline', prof: 'trooper', sex: Math.random() < 0.5 ? 'm' : 'f', err: '',
    look: { skin: r(L.skin), hair: r(L.hair), hairStyle: 1 + Math.floor(Math.random() * (L.styles.length - 1)), height: 1, primary: r(CG_PRIMARY), secondary: r(CG_SECOND), accent: CG_ACCENT[0] },
  };
}

function cg_build() {
  const el = ui_h('div', 'screen', null, UI.root);
  el.id = 'chargen'; el.hidden = true;
  CG.el = el;
  el.innerHTML = '<div class="cgh"><h2>NEW CLONE</h2><span class="dim">Concord Immigration · Landfall Shuttleport intake form</span><span class="sp"></span><button class="btn" data-act="cgback:">◂ Back</button></div>' +
    '<div class="cgb"><div class="col pnl"></div><div class="col pnl"></div><div class="col pnl"><canvas id="cgprev"></canvas><div class="cglook"></div></div></div>';
  CG.cols = el.querySelectorAll('.col');
  CG.cv = el.querySelector('#cgprev');
  CG.lookEl = el.querySelector('.cglook');
  el.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'cgname') { CG.st.name = t.value; if (CG.st.err) { CG.st.err = ''; cg_render(); } cg_summary(); }
    else if (t.dataset.h !== undefined) { CG.st.look.height = +t.value / 100; cg_look(); }
  });
  el.addEventListener('keydown', (ev) => { if (ev.target.id === 'cgname' && ev.code === 'Enter') { ev.preventDefault(); ev.target.blur(); } });
  CG.cv.addEventListener('mousedown', (ev) => { CG.drag = { x: ev.clientX, r: CG.rot }; ev.preventDefault(); });
  addEventListener('mousemove', (ev) => { if (CG.drag) CG.rot = CG.drag.r + (ev.clientX - CG.drag.x) * 0.012; });
  addEventListener('mouseup', () => { CG.drag = null; });
  UI.acts.cg = (a) => {
    const [k, v] = [a.slice(0, a.indexOf(':')), a.slice(a.indexOf(':') + 1)];
    const S = CG.st;
    if (k === 'fac') S.faction = v;
    else if (k === 'breed') S.breed = v;
    else if (k === 'prof') S.prof = v;
    else if (k === 'sex') S.sex = v;
    else if (k === 'rand') { S.name = cg_name(); const i = $('#cgname'); if (i) i.value = S.name; S.err = ''; }
    else if (k in S.look) S.look[k] = k === 'hairStyle' ? +v : parseInt(v, 10);
    if (typeof sfx === 'function') sfx('ui_click');
    cg_render();
  };
  UI.acts.cgback = () => { if (typeof showTitle === 'function') showTitle(); };
  UI.acts.cgenter = () => cg_enter();
}

function showChargen() {
  if (!UI.root) uiInit();
  if (!CG.st) cg_reset();
  UI.state = 'chargen';
  ui_hudVisible(false);
  if (typeof TI !== 'undefined' && TI.el) TI.el.hidden = true;
  CG.el.hidden = false;
  cg_render(true);
  cg_previewStart();
}
function cg_hide() { if (CG.el) CG.el.hidden = true; cg_previewStop(); }

function cg_opt(act, on, title, sub, extra) {
  return '<div class="opt' + (on ? ' on' : '') + '" data-act="cg:' + act + '"' + (extra || '') + '><div class="on1">' + title + '</div>' + (sub ? '<div class="on2">' + sub + '</div>' : '') + '</div>';
}
function cg_render(full) {
  const S = CG.st;
  // ---- left: identity, faction, breed, sex ----
  let h = '<div class="hd">Name</div><div class="nmrow"><input id="cgname" class="txt" maxlength="16" spellcheck="false" autocomplete="off" value="' + esc(S.name) + '"><button class="btn" data-act="cg:rand:" data-tip="text:Random name">⟳</button></div><div class="cgerr">' + esc(S.err || '') + '</div>';
  h += '<div class="hd">Faction</div><div class="opts">' + CG_FACTIONS.map(([id, n, role]) => cg_opt('fac:' + id, S.faction === id, esc(n) + '<span class="sw" style="background:' + uiFactionColor(id) + '"></span>', role)).join('') + '</div>';
  h += '<div class="blurb">' + esc(CG_FACTIONS.find((f) => f[0] === S.faction)[3]) + '</div>';
  const B = typeof BREEDS !== 'undefined' ? BREEDS : {};
  h += '<div class="hd">Breed</div><div class="opts" style="grid-template-columns:1fr 1fr">' + Object.keys(B).map((id) => cg_opt('breed:' + id, S.breed === id, esc(B[id].name))).join('') + '</div>';
  const br = B[S.breed];
  if (br) {
    let mx = 1;
    for (const id in B) for (const a of ABILITY_IDS) mx = Math.max(mx, B[id].base[a]);
    h += '<div class="blurb">' + esc(br.desc) + '</div><div class="abars">' + ABILITY_IDS.map((a) => '<span>' + a + '</span><div class="ab"><i style="width:' + Math.round(100 * br.base[a] / mx) + '%"></i></div><span>' + br.base[a] + '</span>').join('') + '</div>' +
      '<div class="blurb mono" style="font-size:11px">Health ×' + br.hpMul + ' · Nano ×' + br.npMul + ' · nano cost cap ' + br.nanoCostCap + '%</div>';
  }
  h += '<div class="hd">Body</div><div class="opts h">' + cg_opt('sex:m', S.sex === 'm', 'Male') + cg_opt('sex:f', S.sex === 'f', 'Female') + '</div>';
  const nameInput = $('#cgname');
  const hadFocus = nameInput && document.activeElement === nameInput;
  if (full || !hadFocus) ui_set(CG.cols[0], h);
  else { const e = CG.cols[0].querySelector('.cgerr'); if (e) e.textContent = S.err || ''; }
  // ---- middle: profession ----
  const P = typeof PROFS !== 'undefined' ? PROFS : {};
  let m = '<div class="hd">Profession</div><div class="opts profs">' + Object.keys(P).map((id) => cg_opt('prof:' + id, S.prof === id, esc(P[id].name), esc(P[id].role), ' style="--pc:' + P[id].color + '"')).join('') + '</div>';
  const pr = P[S.prof];
  if (pr) {
    const sch = typeof NANO_SCHOOLS !== 'undefined' && NANO_SCHOOLS[pr.school];
    const nanos = (pr.startNanos || []).map((id) => (typeof NANOS !== 'undefined' && NANOS[id] ? NANOS[id] : null)).filter(Boolean);
    m += '<div class="pdet" style="border-left:3px solid ' + pr.color + '"><h3 style="color:' + pr.color + '">' + esc(pr.name) + '</h3><div class="role">' + esc(pr.role) + '</div><p>' + esc(pr.desc) + '</p>' +
      '<p class="tips">' + esc(pr.tips || '') + '</p>' +
      '<div class="meta">Weapon: <span class="amb">' + esc(ui_sn(pr.weapon)) + '</span> · Nano school: <span style="color:' + (sch ? sch.color : '#fff') + '">' + esc(sch ? sch.name : pr.school || '—') + '</span><br>' +
      'Health per level ' + pr.hpPerLvl + ' · Nano per level ' + pr.npPerLvl + '</div>' +
      (nanos.length ? '<div class="meta">Starting programs: ' + nanos.map((n) => '<span data-tip="nano:' + esc(n.id) + '" style="color:#cfe;cursor:help;border-bottom:1px dotted #5fe0d0">' + esc(n.name) + '</span>').join(', ') + '</div>' : '') + '</div>';
  }
  ui_set(CG.cols[1], m);
  cg_lookPanel();
  cg_look();
}
function cg_sw(key, list, cur) {
  return '<div class="sws">' + list.map((c) => '<div class="swc' + (c === cur ? ' on' : '') + '" style="background:' + ui_col(c) + '" data-act="cg:' + key + ':' + c + '"></div>').join('') + '</div>';
}
function cg_lookPanel() {
  const S = CG.st, L = cg_lists();
  let h = '<div class="lookrow"><span>Skin</span>' + cg_sw('skin', L.skin, S.look.skin) + '</div>' +
    '<div class="lookrow"><span>Hair</span>' + cg_sw('hair', L.hair, S.look.hair) + '</div>' +
    '<div class="lookrow"><span>Style</span><div class="sws">' + L.styles.map((n, i) => '<div class="opt' + (S.look.hairStyle === i ? ' on' : '') + '" style="padding:2px 6px;font-size:11px" data-act="cg:hairStyle:' + i + '">' + esc(n) + '</div>').join('') + '</div></div>' +
    '<div class="lookrow"><span>Height</span><input type="range" min="92" max="108" value="' + Math.round(S.look.height * 100) + '" data-h></div>' +
    '<div class="lookrow"><span>Armour</span>' + cg_sw('primary', CG_PRIMARY, S.look.primary) + '</div>' +
    '<div class="lookrow"><span>Trim</span>' + cg_sw('secondary', CG_SECOND, S.look.secondary) + '</div>' +
    '<div class="lookrow"><span>Lights</span>' + cg_sw('accent', CG_ACCENT, S.look.accent) + '</div>' +
    '<div class="cgsum"></div><button class="btn pri big" style="width:100%" data-act="cgenter:">Enter Ashreach</button>';
  ui_set(CG.lookEl, h);
  cg_summary();
}
function cg_summary() {
  const S = CG.st, el = CG.lookEl && CG.lookEl.querySelector('.cgsum');
  if (el) el.innerHTML = '<b>' + esc(S.name || '—') + '</b> · ' + esc(ui_breedName(S.breed)) + ' ' + esc(S.sex === 'f' ? 'female' : 'male') + ' ' + esc(ui_profName(S.prof)) + '<br><span style="color:' + uiFactionColor(S.faction) + '">' + esc(cap1(S.faction)) + '</span>';
}
function cg_validName(n) {
  n = (n || '').trim();
  if (n.length < 3) return 'Names need at least 3 characters.';
  if (n.length > 16) return 'Names can be at most 16 characters.';
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(n)) return 'Use letters, digits and hyphens, starting with a letter.';
  return '';
}
function cg_enter() {
  const S = CG.st;
  S.name = (S.name || '').trim();
  S.name = S.name.charAt(0).toUpperCase() + S.name.slice(1);
  const err = cg_validName(S.name);
  if (err) { S.err = err; cg_render(true); return; }
  if (typeof newCharacter !== 'function' || typeof startGame !== 'function') { ui_missing('Starting a game'); return; }
  const look = Object.assign({}, S.look);
  const ch = newCharacter({ name: S.name, breed: S.breed, prof: S.prof, faction: S.faction, sex: S.sex, look });
  cg_hide();
  CG.st = null;
  startGame(ch);
}

// ---------- live preview ----------
function cg_weaponKind(skill) {
  return { assault_rifle: 'rifle', rifle: 'rifle', smg: 'smg', pistol: 'pistol', shotgun: 'shotgun', heavy_weapons: 'heavy', bow: 'rifle', martial_arts: 'fists',
    blunt2h: 'melee2h', edged2h: 'melee2h', blunt1h: 'melee1h', edged1h: 'melee1h', piercing: 'melee1h', melee_energy: 'melee1h', ranged_energy: 'pistol' }[skill] || 'none';
}
function cg_previewStart() {
  if (!CG.r) {
    try {
      CG.r = new THREE.WebGLRenderer({ canvas: CG.cv, antialias: true, alpha: true });
      CG.r.outputEncoding = THREE.sRGBEncoding;
      CG.r.setClearColor(0x000000, 0);
    } catch (e) { CG.r = null; return; }
    CG.scene = new THREE.Scene();
    CG.cam = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
    CG.scene.add(new THREE.HemisphereLight(0xd8e4f0, 0x3a3028, 0.85));
    const key = new THREE.DirectionalLight(0xfff0dc, 1.0); key.position.set(2, 4, 3); CG.scene.add(key);
    const rim = new THREE.DirectionalLight(0x5fe0d0, 0.7); rim.position.set(-3, 2.5, -3); CG.scene.add(rim);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5fe0d0, transparent: true, opacity: 0.12 }));
    CG.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.88, 0.92, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5fe0d0, transparent: true, opacity: 0.5 }));
    ring.position.y = 0.002; CG.scene.add(ring);
  }
  cg_look();
  if (!CG.raf) { CG.last = performance.now(); CG.raf = requestAnimationFrame(cg_frame); }
}
function cg_previewStop() { if (CG.raf) cancelAnimationFrame(CG.raf); CG.raf = 0; }
function cg_lookObj() { const S = CG.st; return Object.assign({ breed: S.breed, sex: S.sex, armorTier: 1, helmet: false }, S.look); }
function cg_look() {
  cg_summary();
  if (!CG.r || !CG.st) return;
  if (!CG.rig && typeof makeHumanoid === 'function') {
    try { CG.rig = makeHumanoid(cg_lookObj()); CG.scene.add(CG.rig.root); } catch (e) { console.error(e); CG.rig = null; }
  } else if (CG.rig && CG.rig.setLook) CG.rig.setLook(cg_lookObj());
  const pr = typeof PROFS !== 'undefined' && PROFS[CG.st.prof];
  const wk = cg_weaponKind(pr && pr.weapon);
  if (CG.rig && CG.rig.setWeapon && wk !== CG.wkind) { CG.rig.setWeapon(wk); CG.wkind = wk; }
}
function cg_frame(now) {
  CG.raf = 0;
  if (!CG.el || CG.el.hidden || !CG.r) return;
  CG.raf = requestAnimationFrame(cg_frame);
  const dt = Math.min(0.05, (now - CG.last) / 1000); CG.last = now;
  const cv = CG.cv, w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  const pr = Math.min(devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(w * pr) || cv.height !== Math.round(h * pr)) { CG.r.setPixelRatio(pr); CG.r.setSize(w, h, false); CG.cam.aspect = w / h; CG.cam.updateProjectionMatrix(); }
  if (!CG.drag) CG.rot += dt * 0.45;
  const H = CG.rig ? CG.rig.height : 1.8;
  if (CG.rig) { CG.rig.root.rotation.y = CG.rot; if (CG.rig.anim) CG.rig.anim(dt, 'idle', 0); }
  const dist = H * 2.6 + 0.7;
  CG.cam.position.set(0, H * 0.6, dist);
  CG.cam.lookAt(0, H * 0.47, 0);
  CG.r.render(CG.scene, CG.cam);
}
