// ---------------------------------------------------------------------------------------------
// Apogee: a 1960s orbital espionage shooter in the style of the 1997 console classics.
// 01_core: shared helpers, settings and save data. Every src file shares one scope (see build.py).
// ---------------------------------------------------------------------------------------------
const DEBUG = /debug/.test(location.hash);
const TAU = Math.PI * 2;
const CELL = 2;                  // metres per map cell
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const $ = (id) => document.getElementById(id);
const smooth = (t) => t * t * (3 - 2 * t);
// Yaw convention (same as a three.js camera): forward = (-sin yaw, 0, -cos yaw).
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);
const fwdX = (yaw) => -Math.sin(yaw), fwdZ = (yaw) => -Math.cos(yaw);
const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
};

// Difficulty tables. Index 0 Agent, 1 Secret Agent, 2 Orbital Agent.
const DIFFS = ['Agent', 'Secret Agent', 'Orbital Agent'];
const DIFF = {
  dmgToPlayer: [0.5, 1.0, 1.9],
  accuracy:    [0.42, 0.62, 0.88],
  reaction:    [1.0, 0.65, 0.4],
  guardHp:     [70, 100, 130],
  ammoMul:     [1.4, 1.0, 0.75],
};

// ---- Save data and settings (localStorage, key prefixed with the game's name) ----
const SAVE_KEY = 'apogee.save.v1';
const SAVE = {
  unlocked: 1,             // missions available
  best: {},                // 'mission_diff' -> seconds
  done: {},                // 'mission_diff' -> true
  settings: {
    controls: 'modern',    // 'modern' | 'classic'
    fps: 'smooth',         // 'smooth' | 'n64' (20 fps like the cartridge)
    res: 'low',            // 'low' 320x240 | 'high' 640x480 (expansion pak)
    aspect: '4:3',         // '4:3' | '16:9'
    sens: 1.0,
    invert: false,
    sight: 'always',       // crosshair: 'always' | 'aim'
    music: 0.6,
    sfx: 0.8,
  },
};
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && typeof d === 'object') {
      SAVE.unlocked = clamp(d.unlocked | 0 || 1, 1, 3);
      SAVE.best = d.best || {};
      SAVE.done = d.done || {};
      Object.assign(SAVE.settings, d.settings || {});
    }
  } catch (e) { /* private mode, blocked storage: play without saving */ }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* ignore */ }
}
loadSave();
const SET = SAVE.settings;

// Delayed actions on the game clock (so they pause with the game and follow sim() in tests).
const TIMERS = [];
function later(s, fn) { TIMERS.push({ t: G.time + s, fn }); }
function runTimers() {
  for (let k = 0; k < TIMERS.length; k++) {
    if (TIMERS[k].t > G.time) continue;
    const f = TIMERS[k].fn; TIMERS.splice(k--, 1); f();
  }
}

// Global game state shared across modules. Filled in by 14_main.js and friends.
const G = {
  state: 'boot',     // boot | title | select | brief | play | watch | end
  mission: 0, diff: 0,
  time: 0,           // mission clock (seconds)
  level: null,       // the built level (04_level.js)
  actors: [],        // guards, technicians, the boss
  player: null,
  stats: null,
  alarm: null,
  paused: false,
  god: false, peace: false,
};
