// Willow Lane — main menu, Create-a-Sim (a family of up to four), lot choice, and the in-game look editor

const CAS = { members: [], cur: 0, family: '', tab: 'basics', scene: null, cam: null, model: null, rotY: 0, editSim: null, drag: null };

// ---------- main menu ----------
function toMenu() {
  G.state = 'menu';
  document.body.dataset.state = 'menu';
  $('#menu').hidden = false; $('#cas').hidden = true;
  const has = !!loadSaveRaw();
  $('#mContinue').hidden = !has;
  if (has) { try { const j = JSON.parse(loadSaveRaw()); $('#mContinue').innerHTML = `Continue <small>The ${esc(j.G.family)} family · Day ${dayNum(j.G.t)}</small>`; } catch (e) { /* old save */ } }
  closeDialog(); closePie();
  music.mode('menu');
  // a gentle fly-around behind the menu
  if (!G.objects.length) buildLot('starter');
  for (const s of G.sims) if (s.model) s.model.visible = false;
}
function initMenu() {
  $('#mContinue').onclick = () => { sfx('click'); if (!loadGame()) toast('Could not load the save'); };
  $('#mNew').onclick = () => { sfx('click'); openCAS(); };
  $('#mQuick').onclick = () => { sfx('click'); presetDialog(); };
  $('#mHelp').onclick = () => { sfx('click'); helpDialog(); };
}
function presetDialog() {
  const d = dialog(`<h2>Choose a family</h2><div class="presets">${PRESETS.map((p, i) => `<button class="preset" data-i="${i}"><b>The ${p.name}s</b><small>${esc(p.blurb)}</small><span>${p.members.map((m) => m.first).join(' · ')}</span></button>`).join('')}</div><div class="btns"><button class="btn" id="dNo">Back</button></div>`, { wide: true, keepTime: true });
  d.querySelector('#dNo').onclick = closeDialog;
  for (const b of d.querySelectorAll('.preset')) b.onclick = () => { const p = PRESETS[+b.dataset.i]; closeDialog(); lotDialog(p.name, p.members.map((m) => Object.assign({}, m, { look: Object.assign({ body: m.body }, m.look) }))); };
}
function helpDialog() {
  const d = dialog(`<h2>How to play</h2><div class="help2">
    <p><b>Your sims have needs.</b> Hunger, comfort, hygiene, bladder, energy, fun, social and room all drain over time. Keep them high and your sims stay happy, learn faster, do better at work and are nicer to be around.</p>
    <p><b>Click to act.</b> Click an object for a menu of things to do with it, another sim to talk, joke, hug, flirt or argue, and the ground to walk there. Actions queue up at the top left: click one to cancel it. With free will on, sims look after themselves when you leave them alone.</p>
    <p><b>Make a living.</b> Find a job on the computer or in the job ads at the mailbox. The carpool comes an hour before each shift. Build skills (bookshelf, mirror, weight bench, chess, easel, piano, telescope) and make friends to get promoted. Children catch the school bus at 7 and should do their homework.</p>
    <p><b>Pay your bills</b> at the mailbox every few days, or the repo officer will come for your furniture.</p>
    <p><b>Fall in love.</b> Flirt, kiss, go steady, propose and get married. Couples can try for a baby in a double bed, or adopt by phone. Babies grow into children, teens, adults and elders, and birthday cakes speed things along.</p>
    <p><b>Build and buy.</b> Buy mode (F2) has furniture, and build mode (F3) has walls, doors, windows, floors and wallpaper. Time stops while you build.</p>
    <p class="dim small">Camera: right-drag or Q/E to rotate, wheel or Z/X to zoom, WASD or arrow keys to pan. Space pauses, 1–3 set the speed, V cycles walls up / cutaway / down.</p></div>
    <div class="btns"><button class="btn pri" id="dNo">Got it</button></div>`, { wide: true, keepTime: true });
  d.querySelector('#dNo').onclick = closeDialog;
}

// ---------- lot choice ----------
function lotDialog(family, members) {
  // price the starter cottage by building it once
  buildLot('starter');
  const price = Math.round(lotValue() * STARTER_PRICE_FACTOR / 100) * 100;
  const d = dialog(`<h2>Where will the ${esc(family)}s live?</h2><p class="dim">Family funds: ${fmtMoney(START_FUNDS)}</p>
    <div class="presets"><button class="preset" data-k="starter"><b>🏡 Starter cottage</b><small>Two bedrooms, a bathroom and an open kitchen, already furnished. Room to grow.</small><span>${fmtMoney(price)} · leaves ${fmtMoney(START_FUNDS - price)}</span></button>
    <button class="preset" data-k="empty"><b>🌱 Empty lot</b><small>Grass, a mailbox and two trees. Build your dream home from scratch.</small><span>Free · keeps ${fmtMoney(START_FUNDS)}</span></button></div>
    <div class="btns"><button class="btn" id="dNo">Back</button></div>`, { wide: true, keepTime: true });
  d.querySelector('#dNo').onclick = closeDialog;
  for (const b of d.querySelectorAll('.preset')) b.onclick = () => { closeDialog(); newGame(family, members, b.dataset.k, price); };
}

// ---------- Create-a-Sim ----------
function blankMember(age = 'adult', rel) {
  const body = rpick(['f', 'm', 'x']);
  const pronoun = body === 'f' ? 'she' : body === 'm' ? 'he' : rpick(['they', 'she', 'he']);
  const first = rpick(pronoun === 'she' ? NAMES_F : pronoun === 'he' ? NAMES_M : NAMES_X);
  const look = randomLook(body, age); look.body = body;
  return { first, age, body, pronoun, pers: randomPers(), look, interests: rshuffle(INTERESTS.map((i) => i.id)).slice(0, 3), canCarry: body === 'f', voice: R01(), rel };
}
function openCAS(editSim) {
  G.state = 'cas';
  document.body.dataset.state = 'cas';
  $('#menu').hidden = true; $('#cas').hidden = false;
  CAS.editSim = editSim || null;
  if (editSim) {
    CAS.members = [{ first: editSim.first, age: editSim.age, body: editSim.look.body, pronoun: editSim.pronoun, pers: Object.assign({}, editSim.pers), look: Object.assign({}, editSim.look), interests: editSim.interests.slice(), canCarry: editSim.canCarry, voice: editSim.voice }];
    CAS.family = editSim.last; CAS.tab = 'looks';
  } else {
    CAS.family = rpick(SURNAMES);
    CAS.members = [blankMember('adult')];
    CAS.tab = 'basics';
  }
  CAS.cur = 0;
  if (!CAS.scene) setupCasScene();
  renderCAS(); updateCasModel();
  music.mode('cas');
}
function setupCasScene() {
  const S = new THREE.Scene();
  S.background = new THREE.Color(0xdfe9ef);
  S.add(new THREE.HemisphereLight(0xffffff, 0xa8b0b8, 0.85));
  const d = new THREE.DirectionalLight(0xffffff, 0.65); d.position.set(2, 5, 4); S.add(d);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.12, 40), new THREE.MeshLambertMaterial({ color: 0xf6f4ee })); plat.position.y = -0.06; S.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.025, 8, 48), new THREE.MeshLambertMaterial({ color: 0x5ac8b0 })); ring.rotation.x = Math.PI / 2; S.add(ring);
  CAS.scene = S;
  CAS.cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  CAS.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshLambertMaterial({ color: 0x40e060, emissive: 0x40e060, emissiveIntensity: 0.4 }));
  CAS.gem.scale.y = 1.6; S.add(CAS.gem);
  const cv = $('#c');
  cv.addEventListener('pointerdown', (e) => { if (G.state === 'cas') CAS.drag = e.clientX; });
  window.addEventListener('pointermove', (e) => { if (G.state === 'cas' && CAS.drag != null) { CAS.rotY += (e.clientX - CAS.drag) * 0.01; CAS.drag = e.clientX; } });
  window.addEventListener('pointerup', () => { CAS.drag = null; });
}
function updateCasModel() {
  if (CAS.model) CAS.scene.remove(CAS.model);
  const m = CAS.members[CAS.cur];
  const fake = { age: m.age, look: Object.assign({}, m.look, { body: m.body }) };
  CAS.model = buildSimModel(fake);
  CAS.scene.add(CAS.model);
  CAS.anim = 'idle'; CAS.animT = 0;
}
function renderCasScene(dt) {
  if (!CAS.model) return;
  CAS.animT += dt;
  if (CAS.drag == null) CAS.rotY += dt * 0.3;
  CAS.model.rotation.y = Math.sin(CAS.rotY) * 0.9;
  poseSim(CAS.model, CAS.anim, CAS.animT, { mood: 60, talk: CAS.anim === 'talk' });
  if (CAS.anim !== 'idle' && CAS.animT > 2.2) CAS.anim = 'idle';
  const h = CAS.model.userData.height || 1.7;
  // frame the sim in the middle of the screen (the panels sit either side)
  const w = window.innerWidth, hh = window.innerHeight;
  CAS.cam.aspect = w / hh; CAS.cam.updateProjectionMatrix();
  const span = h + 0.75, dist = span / (2 * Math.tan((CAS.cam.fov * Math.PI / 180) / 2)) * 1.18;
  CAS.cam.position.set(0, span * 0.5 + 0.25, dist); CAS.cam.lookAt(0, span * 0.5 - 0.05, 0);
  CAS.cam.setViewOffset(w, hh, w > 900 ? -w * 0.02 : 0, w > 900 ? 0 : hh * 0.18, w, hh);
  CAS.gem.position.set(0, h + 0.35, 0); CAS.gem.rotation.y += dt * 1.5;
  R.renderer.render(CAS.scene, CAS.cam);
}
function casPose(a) { CAS.anim = a; CAS.animT = 0; }

function renderCAS() {
  const box = $('#cas');
  const m = CAS.members[CAS.cur];
  const used = TRAITS.reduce((a, t) => a + m.pers[t.id], 0), left = TRAIT_POINTS - used;
  const edit = !!CAS.editSim;
  const sw = (list, key, cls = '') => list.map((c) => `<button class="sw ${cls}${m.look[key] === c ? ' on' : ''}" data-look="${key}" data-v="${c}" style="background:${cssHex(c)}"></button>`).join('');
  const chips = (list, cur, attr) => list.map((x) => `<button class="chip${cur === x.id ? ' on' : ''}" data-${attr}="${x.id}">${x.label}</button>`).join('');
  let tab = '';
  if (CAS.tab === 'basics') {
    tab = `<label class="fl">First name <input id="cFirst" value="${esc(m.first)}" maxlength="16"></label>
      <div class="fl">Age<div class="row">${chips([{ id: 'child', label: 'Child' }, { id: 'teen', label: 'Teen' }, { id: 'adult', label: 'Adult' }, { id: 'elder', label: 'Elder' }], m.age, 'age')}</div></div>
      <div class="fl">Body<div class="row">${chips(BODIES, m.body, 'body')}</div></div>
      <div class="fl">Pronouns<div class="row">${chips([{ id: 'she', label: 'she/her' }, { id: 'he', label: 'he/him' }, { id: 'they', label: 'they/them' }], m.pronoun, 'pron')}</div></div>
      ${isGrownAge(m.age) ? `<label class="tg"><input type="checkbox" id="cCarry" ${m.canCarry ? 'checked' : ''}><span>Can become pregnant</span></label>` : ''}
      ${CAS.cur > 0 && !edit ? `<div class="fl">Relationship to ${esc(CAS.members[0].first)}<div class="row">${relChoices(m).map((r) => `<button class="chip${m.rel === r.id ? ' on' : ''}" data-rel="${r.id}">${r.label}</button>`).join('')}</div></div>` : ''}
      <div class="fl">Voice<div class="row"><input type="range" id="cVoice" min="0" max="1" step="0.01" value="${m.voice}"><button class="chip" id="cHear">🔊 Hear</button></div></div>`;
  } else if (CAS.tab === 'looks') {
    tab = `<div class="fl">Skin<div class="sws">${sw(SKINS, 'skin')}</div></div>
      <div class="fl">Hair<div class="row">${HAIRS.map((x) => `<button class="chip${m.look.hair === x.id ? ' on' : ''}" data-hair="${x.id}">${x.label}</button>`).join('')}</div></div>
      <div class="fl">Hair colour<div class="sws">${sw(HAIR_COLORS, 'hairColor')}</div></div>
      <div class="fl">Outfit<div class="row">${OUTFITS.map((x) => `<button class="chip${m.look.outfit === x.id ? ' on' : ''}" data-outfit="${x.id}">${x.label}</button>`).join('')}</div></div>
      <div class="fl">${m.look.outfit === 'dress' ? 'Dress' : 'Top'}<div class="sws">${sw(CLOTH_COLORS, 'top')}</div></div>
      ${m.look.outfit === 'dress' ? '' : `<div class="fl">${m.look.outfit === 'skirt' ? 'Skirt' : m.look.outfit === 'shorts' ? 'Shorts' : 'Trousers'}<div class="sws">${sw(CLOTH_COLORS, 'bottom')}</div></div>`}
      <div class="fl">Shoes<div class="sws">${sw([0x2a2a2e, 0x6a4a30, 0xe8e4dc, 0x3a3a6a, 0xa83a3a, 0x3a7a4a, 0xe8c840], 'shoes')}</div></div>`;
  } else if (CAS.tab === 'pers') {
    tab = `<div class="pts">Points left: <b class="${left ? '' : 'good'}">${left}</b></div>` + TRAITS.map((t) => `<div class="tr" title="${esc(t.tip)}"><div class="tl"><span>${t.lo}</span><b>${t.icon}</b><span>${t.hi}</span></div><div class="trow"><button class="pm" data-tr="${t.id}" data-d="-1">−</button><div class="pips big">${pips(m.pers[t.id])}</div><button class="pm" data-tr="${t.id}" data-d="1">+</button></div></div>`).join('') +
      `<div class="sign">${SIGN[signFor(m.pers)].icon} ${SIGN[signFor(m.pers)].label}</div>`;
  } else if (CAS.tab === 'ints') {
    tab = `<p class="dim small">Pick three. Sims who share interests have more to talk about.</p><div class="row">${INTERESTS.map((i) => `<button class="chip big${m.interests.includes(i.id) ? ' on' : ''}" data-int="${i.id}">${i.icon} ${i.label}</button>`).join('')}</div>`;
  }
  const tabs = edit ? [['looks', '👕 Looks']] : [['basics', '🪪 Basics'], ['looks', '👕 Looks'], ['pers', '⭐ Personality'], ['ints', '💬 Interests']];
  box.innerHTML = `<div class="casL">
      ${edit ? `<h2>Change appearance</h2>` : `<h2>Create a family</h2><label class="fl">Family name <input id="cFam" value="${esc(CAS.family)}" maxlength="18"></label>`}
      <div class="mems">${CAS.members.map((x, i) => `<button class="mem${i === CAS.cur ? ' on' : ''}" data-mem="${i}"><b>${esc(x.first)}</b><small>${AGES[x.age].label}${i > 0 ? ' · ' + (relChoices(x).find((r) => r.id === x.rel) || { label: 'Roommate' }).label : ''}</small>${i > 0 && !edit ? `<span class="del" data-del="${i}" title="Remove">✕</span>` : ''}</button>`).join('')}
      ${!edit && CAS.members.length < 4 ? `<button class="mem add" id="cAdd">＋ Add a sim</button>` : ''}</div>
      ${edit ? '' : `<div class="dim small">Up to four sims. At least one must be an adult or elder.</div>`}
    </div>
    <div class="casR"><div class="ctabs2">${tabs.map(([id, lb]) => `<button class="${CAS.tab === id ? 'on' : ''}" data-ctab="${id}">${lb}</button>`).join('')}<button class="dice" id="cRand" title="Randomise">🎲</button></div><div class="ctab">${tab}</div></div>
    <div class="casB"><button class="btn" id="cBack">${edit ? 'Cancel' : 'Main menu'}</button><button class="btn pri" id="cDone">${edit ? 'Done' : 'Move in →'}</button></div>`;
  wireCAS(box);
}
const isGrownAge = (a) => a === 'adult' || a === 'elder';
function relChoices(m) {
  const head = CAS.members[0], ages = ['child', 'teen', 'adult', 'elder'], hi = ages.indexOf(head.age), mi = ages.indexOf(m.age);
  const out = [{ id: 'roommate', label: 'Roommate' }];
  if (isGrownAge(m.age) && isGrownAge(head.age)) out.push({ id: 'spouse', label: 'Spouse' }, { id: 'partner', label: 'Partner' });
  if (mi < hi) out.push({ id: 'child', label: 'Child' });
  if (mi > hi && isGrownAge(m.age)) out.push({ id: 'parent', label: 'Parent' });
  if (Math.abs(mi - hi) <= 1) out.push({ id: 'sibling', label: 'Sibling' });
  if (head.age === 'elder' && mi <= 1) out.push({ id: 'grandchild', label: 'Grandchild' });
  return out;
}
function wireCAS(box) {
  const m = CAS.members[CAS.cur];
  const on = (sel, ev, f) => { const e = box.querySelector(sel); if (e) e.addEventListener(ev, f); };
  const all = (sel, f) => box.querySelectorAll(sel).forEach((e) => e.addEventListener('click', (ev) => { ev.stopPropagation(); f(e); }));
  on('#cFam', 'input', (e) => { CAS.family = e.target.value; });
  on('#cFirst', 'input', (e) => { m.first = e.target.value; box.querySelector('.mem.on b').textContent = m.first; });
  all('[data-mem]', (e) => { CAS.cur = +e.dataset.mem; sfx('click'); renderCAS(); updateCasModel(); });
  all('[data-del]', (e) => { CAS.members.splice(+e.dataset.del, 1); CAS.cur = 0; sfx('click'); renderCAS(); updateCasModel(); });
  on('#cAdd', 'click', () => { const age = CAS.members.some((x) => isGrownAge(x.age)) ? rpick(['adult', 'child', 'teen']) : 'adult'; const nm = blankMember(age); nm.rel = relChoices(nm)[relChoices(nm).length > 1 ? 1 : 0].id; CAS.members.push(nm); CAS.cur = CAS.members.length - 1; sfx('click'); renderCAS(); updateCasModel(); });
  all('[data-ctab]', (e) => { CAS.tab = e.dataset.ctab; sfx('click'); renderCAS(); });
  all('[data-age]', (e) => { m.age = e.dataset.age; if (!isGrownAge(m.age)) m.canCarry = false; if (m.look.hair === 'bald' && m.age === 'child') m.look.hair = 'short'; if (CAS.cur > 0 && !relChoices(m).some((r) => r.id === m.rel)) m.rel = relChoices(m)[0].id; sfx('click'); renderCAS(); updateCasModel(); });
  all('[data-body]', (e) => { m.body = e.dataset.body; m.look.body = m.body; sfx('click'); renderCAS(); updateCasModel(); });
  all('[data-pron]', (e) => { m.pronoun = e.dataset.pron; sfx('click'); renderCAS(); });
  on('#cCarry', 'change', (e) => { m.canCarry = e.target.checked; });
  all('[data-rel]', (e) => { m.rel = e.dataset.rel; sfx('click'); renderCAS(); });
  on('#cVoice', 'input', (e) => { m.voice = +e.target.value; });
  on('#cHear', 'click', () => { babble({ voice: m.voice, age: m.age, x: 0, z: 0, cas: true }, 0.4); casPose('talk'); });
  all('[data-look]', (e) => { m.look[e.dataset.look] = +e.dataset.v; sfx('click'); renderCAS(); updateCasModel(); });
  all('[data-hair]', (e) => { m.look.hair = e.dataset.hair; sfx('click'); renderCAS(); updateCasModel(); });
  all('[data-outfit]', (e) => { m.look.outfit = e.dataset.outfit; sfx('click'); renderCAS(); updateCasModel(); });
  all('[data-tr]', (e) => { const k = e.dataset.tr, d = +e.dataset.d; const used = TRAITS.reduce((a, t) => a + m.pers[t.id], 0); if (d > 0 && (used >= TRAIT_POINTS || m.pers[k] >= 10)) { sfx('error'); return; } if (d < 0 && m.pers[k] <= 0) return; m.pers[k] += d; sfx('click'); renderCAS(); casPose(d > 0 ? 'cheer' : 'idle'); });
  all('[data-int]', (e) => { const id = e.dataset.int; if (m.interests.includes(id)) m.interests = m.interests.filter((x) => x !== id); else { m.interests.push(id); if (m.interests.length > 3) m.interests.shift(); } sfx('click'); renderCAS(); });
  on('#cRand', 'click', () => {
    if (CAS.tab === 'looks' || CAS.editSim) { const L = randomLook(m.body, m.age); L.body = m.body; m.look = L; }
    else { const keep = { rel: m.rel, age: m.age }; Object.assign(m, blankMember(m.age, keep.rel)); }
    sfx('click'); renderCAS(); updateCasModel(); casPose('wave');
  });
  on('#cBack', 'click', () => { sfx('click'); if (CAS.editSim) closeLookEditor(false); else toMenu(); });
  on('#cDone', 'click', () => {
    if (CAS.editSim) { closeLookEditor(true); return; }
    if (!CAS.members.some((x) => isGrownAge(x.age))) { toast('Add at least one adult or elder'); sfx('error'); return; }
    if (CAS.members.some((x) => x.interests.length < 1)) { toast('Everyone needs at least one interest'); sfx('error'); return; }
    if (CAS.members.some((x) => !x.first.trim())) { toast('Everyone needs a name'); sfx('error'); return; }
    if (!CAS.members[0] || !isGrownAge(CAS.members[0].age)) { // put a grown-up first so relationships make sense
      const i = CAS.members.findIndex((x) => isGrownAge(x.age)); const [h] = CAS.members.splice(i, 1); CAS.members.unshift(h);
      for (let k = 1; k < CAS.members.length; k++) if (!relChoices(CAS.members[k]).some((r) => r.id === CAS.members[k].rel)) CAS.members[k].rel = relChoices(CAS.members[k])[0].id;
    }
    // spend any leftover personality points at random
    for (const x of CAS.members) { let used = TRAITS.reduce((a, t) => a + x.pers[t.id], 0); while (used < TRAIT_POINTS) { const k = rpick(TRAITS).id; if (x.pers[k] < 10) { x.pers[k]++; used++; } } }
    sfx('click');
    lotDialog((CAS.family || 'Sim').trim(), CAS.members);
  });
}

// ---------- the dresser: change one sim's look mid-game ----------
function openLookEditor(s) {
  CAS.prevSpeed = G.userSpeed; G.userSpeed = 0;
  $('#hud').hidden = true;
  openCAS(s);
}
function closeLookEditor(apply) {
  const s = CAS.editSim, m = CAS.members[0];
  if (apply && s) { s.look = Object.assign({}, m.look, { body: m.body }); makeSimModel(s); }
  CAS.editSim = null;
  G.state = 'play'; document.body.dataset.state = 'play';
  $('#cas').hidden = true; $('#hud').hidden = false;
  G.userSpeed = CAS.prevSpeed || 1;
  renderFamily(); renderPanel(); renderSpeed();
  music.mode(G.mode);
}
