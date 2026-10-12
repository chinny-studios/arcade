// Iron Saber — DOM overlays: banners, hints, objective panel, prompts, title-screen suit roster, key help.

let sayT = 0, hintT = 0;
function say(text, dur = 2, cls = '') {
  const el = $('#banner');
  el.textContent = text; el.className = 'on ' + cls;
  sayT = dur;
}
function hint(text, dur = 4) { const el = $('#hint'); el.textContent = text; el.classList.add('on'); hintT = dur; }
function setObjective(name, text) {
  const el = $('#obj');
  el.hidden = !name;
  if (name) { $('#objName').textContent = 'SORTIE · ' + name; $('#objText').textContent = text; }
}
function setPrompt(text) { const el = $('#prompt'); if (el.textContent !== text) el.textContent = text; el.classList.toggle('on', !!text); }
function updateUI(dt) {
  sayT -= dt; hintT -= dt;
  if (sayT <= 0) $('#banner').classList.remove('on');
  if (hintT <= 0) $('#hint').classList.remove('on');
}
const KEYS_FOOT = '<b>WASD</b> walk · <b>Shift</b> run · <b>Space</b> jump · <b>E</b> board suit · <b>C</b> call suit · <b>V</b> view · <b>M</b> map';
const KEYS_SUIT = '<b>WASD</b> walk · <b>Shift</b> boost dash · <b>Space</b> jump / hold to fly · <b>LMB</b> fire · <b>RMB</b> shield · <b>Q</b> vulcans · <b>R</b> missiles · <b>F</b> saber · <b>E</b> exit · <b>V</b> view · <b>M</b> map';
function setKeysHelp() { const h = PILOT.state === 'suit' ? KEYS_SUIT : KEYS_FOOT; const el = $('#keys'); if (el.dataset.k !== h) { el.innerHTML = h; el.dataset.k = h; } }
function buildRoster() {
  const box = $('#roster');
  for (const id of PLAYABLE) {
    const T = SUIT_T[id];
    const d = document.createElement('div');
    d.className = 'suit';
    const where = { valiant: 'Coalition Base hangar', swift: 'New Haven city park', bastion: 'East depot, by the desert', ogre: 'West scrap yard, by the forest' }[id];
    d.innerHTML = `<div class="sname">${T.name}</div><div class="srole">${T.role} · ${(17.8 * T.scale).toFixed(1)} m · ${T.cockpit === 'pano' ? 'panoramic cockpit' : 'classic cockpit'}</div><p>${T.blurb}</p><div class="swhere">◇ ${where}</div>`;
    box.appendChild(d);
  }
}
