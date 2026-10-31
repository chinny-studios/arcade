// Screens and HUD: the shelf (title), the job card, tools, hover info, advice toasts, the reveal, the
// before/after wipe and photo mode.
const UI = { jobT: 0, toastT: 0, lastToast: {}, allDone: false, chimed: new Set() };

function pieceDone(id) { return SAVE.done.includes(id); }
function pieceUnlocked(i) { return DEBUG || i === 0 || pieceDone(PIECES[i - 1].id); }
const UPCOMING = [
  { title: 'Valve radio', era: 'Walnut and Bakelite, 1938' },
  { title: 'Violin', era: 'Flamed maple, c. 1870' },
  { title: 'Kabuto helmet', era: 'Iron and urushi lacquer, Edo period' },
];
function buildShelf() {
  const el = $('#cards'); el.innerHTML = '';
  PIECES.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'card' + (pieceDone(p.id) ? ' done' : '');
    const open = pieceUnlocked(i);
    b.disabled = !open;
    b.innerHTML = `<b>${p.title}</b><span>${p.era}</span><i>${pieceDone(p.id) ? 'Restored' : open ? 'On the bench' : 'Locked'}</i>`;
    b.onclick = () => { auInit(); auClick(); startPiece(p.id); };
    el.appendChild(b);
  });
  for (const u of UPCOMING.slice(PIECES.length - 1)) {
    const b = document.createElement('button');
    b.className = 'card'; b.disabled = true;
    b.innerHTML = `<b>${u.title}</b><span>${u.era}</span><i>In the post</i>`;
    el.appendChild(b);
  }
}

function showScreen(state) {
  G.state = state;
  document.body.dataset.state = state;
  $('#title').hidden = state !== 'title';
  $('#loading').hidden = state !== 'loading';
  $('#hud').hidden = state !== 'play';
  $('#reveal').hidden = state !== 'reveal';
  $('#ba').hidden = state !== 'ba';
  $('#photo').hidden = state !== 'photo';
  const portrait = window.innerWidth / window.innerHeight < 0.8;
  CAM.tShift = state === 'title' ? (portrait ? 0 : 0.2) : state === 'play' && !portrait ? 0.06 : 0;
  CAM.tShiftY = state === 'title' && portrait ? 0.16 : state === 'reveal' ? 0.08 : 0;
}
function setLoad(msg, k) { $('#loadmsg').textContent = msg; $('#loading .bar i').style.width = Math.round(k * 100) + '%'; }
const frameWait = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// Build a piece and put it on the turntable. The shelf shows the next unrestored piece turning in the background.
async function loadPiece(id) {
  if (G.piece && G.piece.id === id && !G.piece.revealed) return G.piece;
  disposePiece();
  setLoad('Unpacking the ' + PIECES.find((p) => p.id === id).title.toLowerCase(), 0.15);
  await frameWait();
  const def = PIECES.find((p) => p.id === id);
  const piece = def.build();
  piece.def = def;
  setLoad('Studying it under the lamp', 0.5);
  await frameWait();
  preparePiece(piece);
  setLoad('Ready', 1);
  G.piece = piece;
  UI.chimed = new Set(piece.parts.filter((p) => p.prog.all >= PART_DONE).map((p) => p.name));
  return piece;
}
function disposePiece() {
  const p = G.piece; if (!p) return;
  R.platter.remove(p.root);
  p.root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); if (o.material.userData.U.uMap.value) o.material.userData.U.uMap.value.dispose(); } });
  G.piece = null;
}

async function startPiece(id) {
  const fresh = !G.piece || G.piece.id !== id || G.piece.revealed;
  if (fresh) { showScreen('loading'); await loadPiece(id); }
  G.open = false; G.lamp = false; G.workTime = 0;
  if (G.piece.setOpen) G.piece.setOpen(false);
  $('#bLamp').classList.remove('on');
  buildHUD(G.piece);
  showScreen('play');
  resetView();
  toast('Drag across the piece to work it. Start with the solvent.', 'info', 5);
}

function buildHUD(p) {
  $('#ptitle .k').textContent = 'On the bench';
  $('#ptitle h2').textContent = p.def.title;
  $('#ptitle .sub').textContent = p.def.era;
  const nav = $('#tools'); nav.innerHTML = '';
  for (const t of TOOLS) {
    const b = document.createElement('button');
    b.className = 'tool'; b.dataset.tool = t.id; b.title = t.tip;
    b.innerHTML = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg><span>${t.name}</span><kbd>${t.key}</kbd>`;
    b.onclick = () => setTool(t.id);
    nav.appendChild(b);
  }
  const sep = document.createElement('div'); sep.className = 'sep'; nav.appendChild(sep);
  const sz = document.createElement('label'); sz.id = 'size';
  sz.innerHTML = `Brush <input type="range" min="0" max="1" step="0.01" value="${G.size}">`;
  sz.querySelector('input').oninput = (e) => setSize(+e.target.value);
  nav.appendChild(sz);
  const useful = new Set(); for (const q of p.parts) { useful.add('solvent'); if (q.job.corr === 'rust') useful.add('wire'); if (q.job.old) useful.add('sand'); if (q.job.corr === 'tarnish' || q.job.polish || q.init.scratch) useful.add('polish'); if (q.job.fin) useful.add('finish'); }
  for (const b of nav.querySelectorAll('.tool')) b.classList.toggle('na', !useful.has(b.dataset.tool));
  $('#bOpen').hidden = !p.setOpen;
  if (p.setOpen) $('#bOpen').innerHTML = `${p.openLabel[0]} <kbd>O</kbd>`;
  setTool(G.tool);
  renderJob(true);
}
function setTool(id) {
  G.tool = id;
  for (const b of $$('.tool')) b.classList.toggle('on', b.dataset.tool === id);
  $('#tooltip').textContent = TOOL[id].tip;
  auClick();
}
function setSize(v) { G.size = sat(v); const i = $('#size input'); if (i) i.value = G.size; }
function toggleLamp() { G.lamp = !G.lamp; $('#bLamp').classList.toggle('on', G.lamp); auClick(); }
function toggleOpen() {
  const p = G.piece; p.setOpen(!G.open);
  $('#bOpen').innerHTML = `${p.openLabel[G.open ? 1 : 0]} <kbd>O</kbd>`;
  auClick();
}

// job card, grouped by part name
function jobGroups(p) {
  const groups = new Map();
  for (const q of p.parts) { if (!groups.has(q.name)) groups.set(q.name, []); groups.get(q.name).push(q); }
  return [...groups].map(([name, list]) => {
    const tasks = new Map();
    let W = 0, all = 0, scratchShow = false;
    for (const q of list) {
      const w = q.n; W += w; all += q.prog.all * w; scratchShow = scratchShow || q.prog.scratchShow;
      for (const t of partTasks(q)) tasks.set(t, (tasks.get(t) || 0) + q.prog[t] * w);
    }
    for (const [t, v] of tasks) tasks.set(t, v / W);
    if (!scratchShow && tasks.get('scratch') > 0.99) tasks.delete('scratch');
    return { name, list, all: all / W, tasks };
  });
}
function renderJob(force) {
  const p = G.piece; if (!p) return;
  let changed = force;
  for (const q of p.parts) if (q.progDirty) { q.prog = progressOf(q); q.progDirty = false; changed = true; }
  if (!changed) return;
  const groups = jobGroups(p);
  let html = '', done = 0;
  for (const g of groups) {
    const ok = g.all >= PART_DONE;
    if (ok) done++;
    if (ok && !UI.chimed.has(g.name)) { UI.chimed.add(g.name); auChime(); toast(g.name + ' done.', 'good', 2.2); }
    html += `<div class="jp${ok ? ' done' : ''}${UI.hot === g.name ? ' hot' : ''}"><div class="n">${g.name}<em>${ok ? 'Done' : Math.floor(g.all * 100) + '%'}</em></div><div class="t">`;
    for (const [t, v] of g.tasks) html += `<span class="${v >= 0.97 ? 'ok' : ''}" style="--p:${v.toFixed(3)}">${TASKS[t]}</span>`;
    html += '</div></div>';
  }
  $('#job').innerHTML = `<h3>Job card <b>${done} / ${groups.length}</b></h3>` + html;
  UI.allDone = done === groups.length;
  $('#finish').hidden = !UI.allDone || G.state !== 'play';
  if (UI.allDone && !UI.saidDone) { UI.saidDone = true; toast('Every part is done. Finish when you are happy with it.', 'good', 4); }
}
function setHover(part) {
  const el = $('#hover');
  const name = part ? part.name : null;
  if (UI.hot !== name) { UI.hot = name; for (const j of $$('.jp')) j.classList.toggle('hot', !!name && j.querySelector('.n').firstChild.textContent === name); }
  if (!part) { el.classList.remove('on'); return; }
  const g = jobGroups(G.piece).find((x) => x.name === name);
  const left = [...g.tasks].filter(([, v]) => v < 0.97).map(([t, v]) => `${TASKS[t]} ${Math.floor(v * 100)}%`);
  el.innerHTML = `<b>${name}</b><div class="s">${left.length ? left.join(' · ') : 'Done'}</div>`;
  el.style.left = PTR.x + 'px'; el.style.top = PTR.y + 'px';
  el.classList.add('on');
}

function toast(msg, kind = 'info', secs = 3) {
  const now = G.t;
  if (UI.lastToast[msg] && now - UI.lastToast[msg] < 7) return;
  UI.lastToast[msg] = now;
  const el = $('#toast');
  el.textContent = msg; el.className = 'on ' + kind;
  UI.toastT = secs;
}
function advise(fx) {
  if (!fx || fx.total < 0.04) return;
  const T = fx.total, eff = fx.useful / T, tool = G.tool;
  if (fx.nofin > T * 0.5) return toast('Nothing on this piece takes a new finish.');
  if (fx.blocked > T * 0.4) return toast('A new finish will not take over grime, rust or old varnish. Clean and strip first.');
  if (fx.harm > T * 0.2 && tool === 'wire') return toast('The wire brush is scratching it. Polish will take the scratches back out.', 'warn');
  if (fx.harm > T * 0.2 && tool === 'sand') return toast('The pad is scuffing it. Polish will bring it back.', 'warn');
  if (eff < 0.1) {
    if (tool === 'polish' && fx.grimeLeft > T * 0.3) return toast('Grime is clogging the cloth. Clean with solvent first.');
    if (tool !== 'wire' && fx.rustLeft > T * 0.3) return toast('That will not shift the rust. Try the wire brush.');
    if (tool !== 'polish' && fx.tarnLeft > T * 0.3) return toast('Tarnish comes off with the polishing cloth.');
    if (tool !== 'sand' && fx.oldLeft > T * 0.3) return toast('The old varnish needs the sanding pad.');
  }
}

function uiStep(dt) {
  if (UI.toastT > 0) { UI.toastT -= dt; if (UI.toastT <= 0) $('#toast').classList.remove('on'); }
  if (G.state === 'play') { UI.jobT -= dt; if (UI.jobT <= 0) { UI.jobT = 0.25; renderJob(); } }
}

// ---- reveal
function finishPiece() {
  const p = G.piece; if (!p || G.state !== 'play') return;
  PTR.mode = null; cursor.visible = false;
  if (p.setOpen) p.setOpen(false);
  settlePiece(p);
  p.revealed = true;
  G.lamp = false;
  if (!SAVE.done.includes(p.id)) SAVE.done.push(p.id);
  SAVE.best[p.id] = Math.min(SAVE.best[p.id] || Infinity, Math.round(G.workTime));
  writeSave();
  showScreen('reveal');
  $('#reveal h2').textContent = p.def.title;
  const mins = Math.max(1, Math.round(G.workTime / 60));
  $('#reveal p').textContent = p.def.done + ` ${mins} minute${mins === 1 ? '' : 's'} at the bench.`;
  const i = PIECES.findIndex((x) => x.id === p.id);
  $('#bNext').hidden = !PIECES[i + 1];
  CAM.tDist = p.dist * 1.2; CAM.tPitch = 0.14; CAM.tTarget.copy(p.focus);
  G.revealT = 0;
  auReveal();
  if (p.onReveal) p.onReveal();
}

// ---- before / after: the left of the line is drawn with the masks as they were when the piece arrived
const BA = { x: 0.5, drag: false };
function openBA() { showScreen('ba'); BA.x = 0.5; placeBA(); }
function closeBA() { showScreen('reveal'); }
function placeBA() { $('#ba .line').style.left = BA.x * 100 + '%'; }
$('#ba').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; BA.drag = true; $('#ba').setPointerCapture(e.pointerId); BA.x = sat(e.clientX / window.innerWidth); placeBA(); });
$('#ba').addEventListener('pointermove', (e) => { if (BA.drag) { BA.x = sat(e.clientX / window.innerWidth); placeBA(); } });
$('#ba').addEventListener('pointerup', () => { BA.drag = false; });
function setMasks(before) {
  for (const p of G.piece.parts) {
    p.geom.attributes.mA = before ? p.beforeA : p.afterA;
    p.geom.attributes.mB = before ? p.beforeB : p.afterB;
  }
}
function drawBA() {
  const w = window.innerWidth, h = window.innerHeight, x = Math.round(BA.x * w);
  renderer.setScissorTest(true);
  setMasks(true); renderer.setScissor(0, 0, x, h); renderer.render(scene, camera);
  setMasks(false); renderer.setScissor(x, 0, w - x, h); renderer.render(scene, camera);
  renderer.setScissorTest(false);
}

// ---- photo mode
function openPhoto() { showScreen('photo'); $('#pExp').value = Math.log2(renderer.toneMappingExposure); $('#pLight').value = G.lightAng || 0; }
function closePhoto() { showScreen('reveal'); }
function savePhoto() {
  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'patina-' + G.piece.id + '.png'; a.click();
  const f = $('#flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60);
}

function toShelf() {
  if (G.state === 'loading') return;
  PTR.mode = null;
  renderer.toneMappingExposure = 1; G.lightAng = 0;
  const next = PIECES.find((p, i) => pieceUnlocked(i) && !pieceDone(p.id)) || PIECES[0];
  buildShelf();
  showScreen('title');
  if (G.piece && G.piece.revealed && next.id !== G.piece.id) loadPiece(next.id).then(() => { resetView(true); CAM.tPitch = 0.08; });
  else { resetView(); CAM.tPitch = 0.08; }
}

$('#bLamp').onclick = toggleLamp;
$('#bOpen').onclick = toggleOpen;
$('#bMenu').onclick = toShelf;
$('#bHelp').onclick = () => { $('#help').hidden = !$('#help').hidden; $('#bHelp').classList.toggle('on', !$('#help').hidden); };
$('#bSound').onclick = () => { auInit(); auSetOn(!AU.on); $('#bSound').textContent = AU.on ? 'Sound on' : 'Sound off'; };
$('#bSound').textContent = AU.on ? 'Sound on' : 'Sound off';
$('#finish').onclick = finishPiece;
$('#bBA').onclick = openBA;
$('#baClose').onclick = closeBA;
$('#bPhoto').onclick = openPhoto;
$('#pClose').onclick = closePhoto;
$('#pSave').onclick = savePhoto;
$('#pExp').oninput = (e) => { renderer.toneMappingExposure = Math.pow(2, +e.target.value); };
$('#pLight').oninput = (e) => { G.lightAng = +e.target.value; };
$('#bShelf').onclick = toShelf;
$('#bNext').onclick = () => { const i = PIECES.findIndex((x) => x.id === G.piece.id); if (PIECES[i + 1]) startPiece(PIECES[i + 1].id); };
