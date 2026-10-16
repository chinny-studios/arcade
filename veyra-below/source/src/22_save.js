// Veyra Below — saves (three slots in localStorage) and options

const SAVE_KEY = 'veyrabelow.saves.v1', OPT_KEY = 'veyrabelow.opts.v1';
const OPTS = { music: 0.5, sfx: 0.7, quality: 1, zoom: 1, shake: true, numbers: true, labels: false };
function loadOpts() {
  try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPT_KEY) || '{}')); } catch (e) { /* defaults */ }
}
function setOpt(k, v) {
  OPTS[k] = v;
  if (k === 'music' || k === 'sfx') AUDIO.setVolume(OPTS.music, OPTS.sfx);
  if (k === 'quality') setQuality(v);
  if (k === 'zoom') CAM.zoom = v;
  try { localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } catch (e) { /* private mode */ }
}
const SAVE = {
  all() { try { const a = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } },
  write(a) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(a)); return true; } catch (e) { HUD.toast('Could not save: storage is unavailable.', '#ff9090'); return false; } },
  list() { return [0, 1, 2].map((i) => this.all()[i] || null); },
  load(i) { const c = this.all()[i]; return c ? migrate(JSON.parse(JSON.stringify(c))) : null; },
  store(i, c) { if (i < 0) return; const a = this.all(); a[i] = c; this.write(a); },
  save() { if (!GAME.char || GAME.slot < 0) return; this.store(GAME.slot, GAME.char); },
  del(i) { const a = this.all(); a[i] = null; this.write(a); },
};
// fill in fields added after a save was made
function migrate(c) {
  const d = newCharacter(c.name, c.role, c.race, c.look);
  for (const k of Object.keys(d)) if (c[k] === undefined) c[k] = d[k];
  for (const k of Object.keys(d.prog)) if (c.prog[k] === undefined) c.prog[k] = d.prog[k];
  for (const k of Object.keys(d.sprite)) if (c.sprite[k] === undefined) c.sprite[k] = d.sprite[k];
  return c;
}
