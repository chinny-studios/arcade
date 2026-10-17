// Ricky Rescue — options and the career save (localStorage). A shift in progress isn't saved: the career is saved at
// the station, after every call and when the page is hidden.

const OPTS = { volume: 0.7, sirenVol: 1, quality: 1, units: 'mph', gps: true, autoLights: true, partnerAuto: true, autoCPR: false, voice: true, shake: true, mapRotate: false, tips: true, ff: false };
function loadOpts() { try { const o = JSON.parse(localStorage.getItem(OPTS_KEY) || 'null'); if (o) Object.assign(OPTS, o); } catch (e) { /* storage blocked */ } OPTS.ff = false; }
function saveOpts() { try { localStorage.setItem(OPTS_KEY, JSON.stringify(OPTS)); } catch (e) { /* storage blocked */ } }
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function peekSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function saveGame() {
  if (!G.career || G.noSave) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.career)); } catch (e) { /* storage blocked */ }
}
function loadGame() {
  const s = peekSave(); if (!s) return false;
  const base = newCareer();
  G.career = Object.assign(base, s, { stats: Object.assign(base.stats, s.stats || {}), look: Object.assign(base.look, s.look || {}), tips: s.tips || {} });
  updateUnlocks(G.career);
  return true;
}
addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
