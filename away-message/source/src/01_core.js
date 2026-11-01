// Away Message — core: DOM helpers, random, the game-time scheduler, the event bus and the save file.
// All files share this one scope. Function declarations are hoisted, so any file may call any other's functions
// at run time; top-level code only runs in 99_main.js.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DEBUG = /#debug/.test(location.hash);
const APP = () => $('#app');

function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b + ' bytes';
const fmtBytes = (b) => b.toLocaleString('en-US');
let _uid = 0;
const uid = (p = 'u') => p + (++_uid).toString(36) + Math.floor(Math.random() * 1e6).toString(36);

// ---- game time ----
// Everything that happens "later" (downloads, buddies, Mom, Bongo, viruses) runs on game time T.t, so AM.sim()
// can fast-forward it. sleep() is a game-time promise for scripted sequences.
const T = { t: 0, frame: 0 };
let _timers = [], _tid = 0;
const _tickers = new Set();
function after(sec, fn) { const id = ++_tid; _timers.push({ id, at: T.t + sec, fn }); return id; }
function every(sec, fn, jitter = 0) { const id = ++_tid; _timers.push({ id, at: T.t + sec + rnd(-jitter, jitter), fn, every: sec, jitter }); return id; }
function cancel(id) { if (id) _timers = _timers.filter((t) => t.id !== id); }
const sleep = (sec) => new Promise((r) => after(sec, r));
// Real-time sleep, independent of game time. Used by the boot/ScanDisk/shutdown overlays, which run while the
// game-time scheduler is paused (a full-screen #screen is up), so they can't wait on `sleep`.
const rsleep = (sec) => new Promise((r) => setTimeout(r, Math.max(0, sec) * 1000));
function onTick(fn) { _tickers.add(fn); return () => _tickers.delete(fn); }
function stepWorld(dt) {
  T.t += dt;
  for (let guard = 0; guard < 500; guard++) {
    let best = null;
    for (const t of _timers) if (t.at <= T.t && (!best || t.at < best.at)) best = t;
    if (!best) break;
    if (best.every) best.at = Math.max(best.at + best.every + rnd(-best.jitter, best.jitter), T.t + 0.05);
    else _timers.splice(_timers.indexOf(best), 1);
    try { best.fn(); } catch (e) { console.error(e); }
  }
  for (const f of [..._tickers]) { try { f(dt); } catch (e) { console.error(e); } }
}

// In-game clock: Friday, June 15, 2001, starting at 7:30 PM when the PC boots.
const CLOCK = { base: new Date(2001, 5, 15, 19, 30, 0).getTime(), t0: 0 };
function gameDate() { return new Date(CLOCK.base + (T.t - CLOCK.t0) * 1000); }
function clockStr(d = gameDate()) { let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; }
function dateStr(d = gameDate()) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
function shortDate(d = gameDate()) { return (d.getMonth() + 1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2) + ' ' + clockStr(d); }

// ---- bus ----
const _ev = {};
function on(n, f) { (_ev[n] = _ev[n] || []).push(f); }
function emit(n, d) { for (const f of _ev[n] || []) { try { f(d); } catch (e) { console.error(e); } } }

// ---- save ----
const SAVE_KEY = 'away-message';
function DEFAULT_SAVE() {
  return {
    v: 1, sn: '', scheme: 'standard', wall: 'clouds', saver: 'pipes', saverWait: 120, skin: 'base', vol: 0.8, modemSound: true,
    hideExt: true, trails: false, files: [], ach: {}, stats: {}, rel: {}, blocked: {}, pranked: {},
    bongo: { installed: true, updater: true, voice: true, roam: true, adware: [], uninstalls: 0, met: false, sang: {} },
    profile: '', aways: null, viruses: [], adbegone: false, defs: false, homepage: 'www.amerinet.com/',
    desktop: {}, notepad: '', mail: [], mailSeen: {}, crush: 0, guestbook: false, cleanShutdown: true, boots: 0, quests: {}, playlist: [], skins: ['base', 'chrome', 'bubblegum'],
  };
}
let S = loadSave();
function loadSave() {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (j && j.v === 1) { const d = DEFAULT_SAVE(); const o = Object.assign(d, j); o.bongo = Object.assign(DEFAULT_SAVE().bongo, j.bongo || {}); return o; }
  } catch (e) { /* private window */ }
  return DEFAULT_SAVE();
}
let _saveT = 0;
function save() { clearTimeout(_saveT); _saveT = setTimeout(saveNow, 400); }
function saveNow() { clearTimeout(_saveT); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* full or blocked */ } }
function resetSave() { S = DEFAULT_SAVE(); saveNow(); }
function stat(k, n = 1) { S.stats[k] = (S.stats[k] || 0) + n; save(); emit('stat', k); return S.stats[k]; }
