// Signal Front — shared helpers: math, noise, DOM, timing

const DEBUG = location.hash === '#debug';
const T = 16; // art tile size in pixels; everything is drawn on this grid and scaled up
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const frand = (a, b) => a + (b - a) * Math.random();
const irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mdist = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const isTouch = matchMedia('(pointer: coarse)').matches;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// deterministic per-tile noise for terrain dressing
function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Animation timing. In fast mode (headless tests, "instant" AI speed) waits resolve immediately.
const TIME = { fast: false, speed: 1 };
function wait(ms) {
  if (TIME.fast || ms <= 0) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms / TIME.speed));
}

function storeGet(k, d) {
  try { const v = localStorage.getItem('signalfront.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
}
function storeSet(k, v) {
  try { localStorage.setItem('signalfront.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
}
function storeDel(k) {
  try { localStorage.removeItem('signalfront.' + k); } catch (e) { /* storage unavailable */ }
}
