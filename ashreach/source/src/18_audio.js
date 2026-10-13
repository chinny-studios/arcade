// Ashreach — procedural Web Audio: sound effects, ambience beds and generative music. No audio files.
// Everything is written against the module-level `AC`, so audioAttach(new OfflineAudioContext(...)) lets tests render it.
// Public: audioInit AC muted setMuted setVolume sfx setMusic setAmbience audioUpdate audioListener audVol
// Extras: audioAttach audioShutdown audMusicTick AUD_SFX AUD_MUSIC AUD_AMB (used by test/audio_view.html)

let AC = null, muted = false;
const audioListener = { x: 0, y: 0, z: 0, yaw: 0 };   // yaw convention as entities: faces +Z at 0
const audVol = { master: 0.8, music: 0.7, sfx: 0.85 };
const AUD_KEY = 'ashreach_audio';
let audG = null, audNoise = null, audOffline = false, audTimer = 0;
const audWant = { music: null, amb: null };           // requested before the first user gesture
const audMus = { cur: null, mood: null };
const audAmbS = { cur: null, kind: null };
const audRL = {};                                      // rate limiter timestamps per sound name
let audRLAll = [];

try {
  const s = JSON.parse(localStorage.getItem(AUD_KEY) || 'null');
  if (s) {
    for (const k of ['master', 'music', 'sfx']) if (typeof s[k] === 'number') audVol[k] = clamp(s[k], 0, 1);
    muted = !!s.muted;
  }
} catch (e) { /* no storage */ }
function audSave() { try { localStorage.setItem(AUD_KEY, JSON.stringify({ master: audVol.master, music: audVol.music, sfx: audVol.sfx, muted })); } catch (e) { /* ignore */ } }

const audMtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const audRnd = (a, b) => a + Math.random() * (b - a);
const audPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- graph ----------
function audIR(sec, decay) {
  const sr = AC.sampleRate, n = Math.floor(sr * sec), b = AC.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.47 * t);   // gets darker as it decays
      d[i] = lp * Math.pow(1 - t, decay);
    }
  }
  return b;
}
function audGain(v, dst) { const g = AC.createGain(); g.gain.value = v; if (dst) g.connect(dst); return g; }

// Build the whole graph on any BaseAudioContext (real or offline).
function audioAttach(ctx) {
  audioShutdown();
  AC = ctx; audOffline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
  const g = audG = {};
  // master -> compressor -> soft clip (hard ceiling well under 0.9) -> out
  g.master = audGain(muted ? 0 : audVol.master);
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 10; comp.attack.value = 0.003; comp.release.value = 0.22;
  const clip = AC.createWaveShaper(), cv = new Float32Array(1024);
  for (let i = 0; i < cv.length; i++) cv[i] = 0.86 * Math.tanh(1.5 * (i / (cv.length - 1) * 2 - 1));
  clip.curve = cv; clip.oversample = '2x';
  g.master.connect(comp); comp.connect(clip); clip.connect(AC.destination);
  g.sfxVol = audGain(audVol.sfx, g.master);
  g.musVol = audGain(audVol.music, g.master);
  g.sfxBus = audGain(1.5, g.sfxVol);
  g.ambBus = audGain(0.25, g.sfxVol);
  g.musBus = audGain(0.085, g.musVol);                 // music sits well under the effects
  const mv = AC.createConvolver(); mv.buffer = audIR(3.2, 2.4); g.musVerb = audGain(1, mv); mv.connect(g.musBus);
  const sv = AC.createConvolver(); sv.buffer = audIR(1.4, 2.6); g.sfxVerb = audGain(1, sv); sv.connect(g.sfxVol);
  // noise buffers
  const sr = AC.sampleRate, w = AC.createBuffer(1, sr * 2, sr), p = AC.createBuffer(1, sr * 4, sr);
  const wd = w.getChannelData(0), pd = p.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
  for (let i = 0; i < pd.length; i++) {
    const x = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
    b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
    pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
  }
  audNoise = { white: w, pink: p };
  if (!audOffline && typeof setInterval !== 'undefined') audTimer = setInterval(() => audMusicTick(document.hidden ? 1.6 : 0.5), 200);
  audMusicApply(); audAmbApply();
}
function audioShutdown() {
  if (audTimer) clearInterval(audTimer);
  audTimer = 0;
  audMus.cur = null; audMus.mood = null; audAmbS.cur = null; audAmbS.kind = null;
  for (const k in audRL) delete audRL[k];
  audRLAll = [];
  AC = null; audG = null; audNoise = null; audOffline = false;
}
function audioInit() {
  if (AC) { if (AC.state === 'suspended' || AC.state === 'interrupted') AC.resume().catch(() => {}); return; }
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return;
  try { audioAttach(new Ctx({ latencyHint: 'interactive' })); } catch (e) { AC = null; return; }
  if (AC.state === 'suspended') AC.resume().catch(() => {});
}
// Browsers only allow audio after a gesture: start on the first one even if the game forgets to call audioInit.
if (typeof document !== 'undefined' && document.addEventListener) {
  const first = () => {
    audioInit();
    if (AC && AC.state === 'running') for (const e of ['pointerdown', 'keydown', 'touchend', 'mousedown']) document.removeEventListener(e, first, true);
  };
  for (const e of ['pointerdown', 'keydown', 'touchend', 'mousedown']) document.addEventListener(e, first, true);
}

function audApplyVol() {
  if (!AC || !audG) return;
  const t = AC.currentTime;
  audG.master.gain.setTargetAtTime(muted ? 0 : audVol.master, t, 0.04);
  audG.musVol.gain.setTargetAtTime(audVol.music, t, 0.04);
  audG.sfxVol.gain.setTargetAtTime(audVol.sfx, t, 0.04);
}
function setMuted(b) { muted = !!b; audSave(); audApplyVol(); }
// each 0..1; pass undefined/null to leave one unchanged
function setVolume(master, music, sfxV) {
  if (typeof master === 'number') audVol.master = clamp(master, 0, 1);
  if (typeof music === 'number') audVol.music = clamp(music, 0, 1);
  if (typeof sfxV === 'number') audVol.sfx = clamp(sfxV, 0, 1);
  audSave(); audApplyVol();
}

// ---------- one-shot voice builder ----------
// A voice is a gain -> (distance lowpass) -> panner -> sfx bus chain shared by every layer of one sound.
function audVoice(pos, vol, wet, range) {
  let gn = vol, pan = 0, cut = 0;
  if (pos) {
    const L = audioListener, dx = pos.x - L.x, dz = pos.z - L.z, dy = (pos.y || 0) - L.y;
    const dh = Math.hypot(dx, dz), d = Math.hypot(dh, dy * 0.5);
    gn *= Math.pow(clamp(1 - (d - 3) / (range - 3), 0, 1), 1.5);
    if (gn < 0.01) return null;
    if (dh > 1.5) pan = clamp((-dx * Math.cos(L.yaw) + dz * Math.sin(L.yaw)) / dh, -1, 1) * 0.8;
    cut = clamp((d - 18) / 70, 0, 1);
  }
  const v = { dst: AC.createGain(), t: AC.currentTime + 0.005, k: 1 };
  v.dst.gain.value = gn;
  let head = v.dst;
  if (cut > 0.05) {
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 14000 - cut * 11500; lp.Q.value = 0.5;
    head.connect(lp); head = lp;
  }
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; head.connect(p); head = p; }
  head.connect(audG.sfxBus);
  if (wet) head.connect(audGain(wet, audG.sfxVerb));
  return v;
}
function audEnv(g, t, peak, a, d) {
  a = Math.min(a, d * 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
}
// tone: { ty, f, f2, d, g, a, dl, fl, fl2, q, am: [hz, depth] }
function audTone(v, o) {
  const t = v.t + (o.dl || 0), d = o.d || 0.3, k = v.k;
  const osc = AC.createOscillator(); osc.type = o.ty || 'sine';
  osc.frequency.setValueAtTime(o.f * k, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2 * k, t + d);
  const g = AC.createGain(); audEnv(g, t, o.g, o.a || 0.004, d);
  let n = osc;
  if (o.fl) {
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.fl, t);
    if (o.fl2) f.frequency.exponentialRampToValueAtTime(o.fl2, t + d);
    n.connect(f); n = f;
  }
  if (o.am) {
    const ag = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
    ag.gain.value = 1 - o.am[1]; lfo.frequency.value = o.am[0]; lg.gain.value = o.am[1];
    lfo.connect(lg); lg.connect(ag.gain); lfo.start(t); lfo.stop(t + d + 0.05);
    n.connect(ag); n = ag;
  }
  n.connect(g); g.connect(v.dst); osc.start(t); osc.stop(t + d + 0.05);
}
// noise: { ty, f, f2, q, d, g, a, dl }
function audNz(v, o) {
  const t = v.t + (o.dl || 0), d = o.d || 0.2;
  const s = AC.createBufferSource(); s.buffer = audNoise.white; s.loop = true;
  s.playbackRate.value = audRnd(0.85, 1.15);
  const f = AC.createBiquadFilter(); f.type = o.ty || 'lowpass'; f.Q.value = o.q || 0.7;
  f.frequency.setValueAtTime(o.f * v.k, t);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2 * v.k, t + d);
  const g = AC.createGain(); audEnv(g, t, o.g, o.a || 0.004, d);
  s.connect(f); f.connect(g); g.connect(v.dst); s.start(t, Math.random() * 1.5); s.stop(t + d + 0.05);
}
function audBell(T, f, dl, g, d) {
  T({ f, dl, g, d, a: 0.006 });
  T({ f: f * 2, dl, g: g * 0.22, d: d * 0.55, a: 0.004 });
}

// ---------- sound effects ----------
// f(T, N): T = tone, N = noise.  r = audible range (m), w = reverb send, j = random pitch jitter (default 0.06).
const AUD_SFX = {
  hit_melee: { r: 40, f: (T, N) => { N({ f: 2200, f2: 180, d: 0.16, g: 0.5 }); T({ f: 160, f2: 55, d: 0.16, g: 0.55 }); } },
  hit_proj: { r: 45, f: (T, N) => { N({ ty: 'bandpass', f: 2400, f2: 700, q: 1.1, d: 0.09, g: 0.4 }); T({ ty: 'triangle', f: 240, f2: 90, d: 0.09, g: 0.3 }); } },
  hit_energy: { r: 45, w: 0.2, f: (T, N) => { T({ f: 900, f2: 300, d: 0.2, g: 0.26 }); T({ ty: 'triangle', f: 1350, f2: 450, d: 0.15, g: 0.12 }); N({ ty: 'bandpass', f: 3000, f2: 1200, q: 1.5, d: 0.1, g: 0.1 }); } },
  crit: { r: 50, w: 0.15, j: 0.02, f: (T, N) => { N({ f: 3000, f2: 150, d: 0.22, g: 0.55 }); T({ f: 140, f2: 45, d: 0.26, g: 0.65 }); T({ ty: 'triangle', f: 1320, d: 0.4, g: 0.14, dl: 0.02 }); T({ ty: 'triangle', f: 1980, d: 0.3, g: 0.08, dl: 0.02 }); } },
  miss: { r: 30, f: (T, N) => { N({ ty: 'bandpass', f: 450, f2: 1500, q: 0.9, d: 0.18, g: 0.22, a: 0.07 }); } },
  shoot_pistol: { r: 90, w: 0.12, f: (T, N) => { N({ ty: 'bandpass', f: 2800, f2: 450, q: 0.7, d: 0.12, g: 0.5 }); T({ f: 210, f2: 70, d: 0.12, g: 0.5 }); } },
  shoot_rifle: { r: 110, w: 0.2, f: (T, N) => { N({ f: 3600, f2: 300, d: 0.22, g: 0.55 }); T({ f: 130, f2: 45, d: 0.2, g: 0.6 }); N({ f: 900, f2: 150, d: 0.5, g: 0.14, dl: 0.03 }); } },
  shoot_smg: { r: 85, w: 0.08, f: (T, N) => { N({ ty: 'bandpass', f: 3200, f2: 600, q: 0.8, d: 0.07, g: 0.42 }); T({ f: 260, f2: 100, d: 0.07, g: 0.4 }); } },
  shoot_shotgun: { r: 110, w: 0.25, f: (T, N) => { N({ f: 4200, f2: 200, d: 0.4, g: 0.7 }); T({ f: 100, f2: 35, d: 0.36, g: 0.7 }); N({ f: 700, f2: 120, d: 0.7, g: 0.14, dl: 0.05 }); } },
  shoot_heavy: { r: 130, w: 0.3, f: (T, N) => { N({ f: 2600, f2: 120, d: 0.6, g: 0.7 }); T({ f: 80, f2: 28, d: 0.55, g: 0.8 }); T({ ty: 'sawtooth', f: 70, f2: 35, d: 0.4, g: 0.12, fl: 300 }); N({ f: 600, f2: 90, d: 1.0, g: 0.14, dl: 0.06 }); } },
  shoot_energy: { r: 90, w: 0.25, f: (T, N) => { T({ f: 1400, f2: 280, d: 0.22, g: 0.3 }); T({ ty: 'triangle', f: 2100, f2: 500, d: 0.16, g: 0.12 }); N({ ty: 'bandpass', f: 3000, f2: 900, q: 2, d: 0.12, g: 0.06 }); } },
  swing: { r: 30, f: (T, N) => { N({ ty: 'bandpass', f: 400, f2: 1800, q: 1, d: 0.22, g: 0.26, a: 0.09 }); } },
  punch: { r: 35, f: (T, N) => { T({ f: 110, f2: 45, d: 0.12, g: 0.6 }); N({ f: 1500, f2: 200, d: 0.08, g: 0.4 }); } },
  cast_start: { r: 40, w: 0.3, f: (T, N) => { T({ f: 330, f2: 660, d: 0.5, g: 0.12, a: 0.15 }); T({ ty: 'triangle', f: 495, f2: 990, d: 0.5, g: 0.07, a: 0.2 }); N({ ty: 'bandpass', f: 1200, f2: 3000, q: 3, d: 0.5, g: 0.04, a: 0.25 }); } },
  cast_done: { r: 40, w: 0.35, j: 0, f: (T) => { [523.25, 659.25, 783.99].forEach((f, i) => audBell(T, f, i * 0.06, 0.14, 0.4)); } },
  cast_fail: { r: 40, f: (T) => { T({ ty: 'triangle', f: 330, f2: 180, d: 0.3, g: 0.2, fl: 1200 }); T({ ty: 'triangle', f: 247, f2: 150, d: 0.3, g: 0.14, dl: 0.05, fl: 1200 }); } },
  heal: { r: 45, w: 0.4, j: 0, f: (T) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => audBell(T, f, i * 0.07, 0.11, 0.55)); } },
  buff: { r: 45, w: 0.35, j: 0, f: (T, N) => { audBell(T, 440, 0, 0.13, 0.4); audBell(T, 659.25, 0.09, 0.13, 0.5); N({ ty: 'highpass', f: 5000, d: 0.3, g: 0.015, dl: 0.1, a: 0.1 }); } },
  debuff: { r: 45, w: 0.2, j: 0, f: (T) => { T({ ty: 'triangle', f: 440, d: 0.35, g: 0.16, fl: 1500 }); T({ ty: 'triangle', f: 329.6, d: 0.45, g: 0.16, dl: 0.1, fl: 1100 }); T({ ty: 'triangle', f: 233, d: 0.5, g: 0.1, dl: 0.2, fl: 900 }); } },
  levelup: { r: 200, w: 0.5, j: 0, f: (T) => { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => audBell(T, f, i * 0.1, 0.15, 0.8)); [523.25, 783.99, 1046.5].forEach((f) => T({ ty: 'triangle', f, dl: 0.6, d: 1.6, g: 0.07, a: 0.05 })); } },
  loot: { r: 60, w: 0.15, j: 0.03, f: (T) => { T({ f: 1760, d: 0.14, g: 0.14 }); T({ f: 2349, d: 0.2, g: 0.1, dl: 0.06 }); } },
  coin: { r: 60, w: 0.12, j: 0.02, f: (T) => { T({ ty: 'triangle', f: 1568, d: 0.08, g: 0.13 }); T({ ty: 'triangle', f: 2093, d: 0.28, g: 0.12, dl: 0.07 }); } },
  ui_click: { f: (T) => { T({ f: 1200, f2: 850, d: 0.05, g: 0.2 }); } },
  ui_open: { f: (T) => { T({ f: 560, f2: 900, d: 0.12, g: 0.12 }); T({ ty: 'triangle', f: 1120, f2: 1800, d: 0.09, g: 0.04 }); } },
  ui_close: { f: (T) => { T({ f: 900, f2: 560, d: 0.12, g: 0.12 }); } },
  error: { j: 0, f: (T) => { T({ ty: 'triangle', f: 220, d: 0.14, g: 0.22, fl: 900 }); T({ ty: 'triangle', f: 185, d: 0.2, g: 0.22, dl: 0.12, fl: 900 }); } },
  death: { r: 120, w: 0.3, f: (T, N) => { T({ ty: 'sawtooth', f: 220, f2: 55, d: 1.6, g: 0.22, fl: 700, fl2: 120 }); N({ f: 500, f2: 80, d: 1.2, g: 0.3 }); T({ f: 55, f2: 30, d: 1.5, g: 0.5 }); } },
  mob_die: { r: 60, w: 0.1, f: (T, N) => { T({ ty: 'triangle', f: 300, f2: 70, d: 0.5, g: 0.3, fl: 1200 }); N({ f: 1200, f2: 150, d: 0.4, g: 0.3 }); } },
  footstep: { r: 18, j: 0.12, f: (T, N) => { N({ f: audRnd(600, 900), f2: 180, d: 0.07, g: 0.2 }); T({ f: 95, f2: 60, d: 0.07, g: 0.2 }); } },
  mission: { r: 200, w: 0.35, j: 0, f: (T) => { audBell(T, 659.25, 0, 0.16, 0.6); audBell(T, 880, 0.14, 0.16, 0.9); } },
  mission_done: { r: 200, w: 0.5, j: 0, f: (T) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => audBell(T, f, i * 0.11, 0.15, 0.7)); [523.25, 659.25, 783.99, 1046.5].forEach((f) => T({ ty: 'triangle', f, dl: 0.5, d: 1.4, g: 0.05, a: 0.04 })); } },
  zone: { r: 200, w: 0.4, j: 0, f: (T, N) => { [220, 329.6, 440].forEach((f) => T({ f, d: 2.0, g: 0.09, a: 0.5 })); N({ f: 300, f2: 800, d: 1.4, g: 0.07, a: 0.5, ty: 'lowpass' }); } },
  hopper: { r: 120, w: 0.3, f: (T, N) => { N({ ty: 'bandpass', f: 200, f2: 1600, q: 2, d: 1.6, g: 0.3, a: 0.5 }); T({ ty: 'sawtooth', f: 60, f2: 220, d: 1.6, g: 0.12, a: 0.5, fl: 500 }); T({ f: 50, f2: 30, d: 1.4, g: 0.4, a: 0.1 }); } },
  chirp: { r: 50, f: (T) => { const n = 2 + Math.floor(Math.random() * 2), f = audRnd(1900, 2500); for (let i = 0; i < n; i++) T({ f, f2: f * 1.35, d: 0.06, g: 0.1, dl: i * 0.085, a: 0.01 }); } },
  growl: { r: 60, w: 0.1, f: (T, N) => { T({ ty: 'sawtooth', f: 64, f2: 52, d: 0.8, g: 0.3, a: 0.1, fl: 420, am: [24, 0.5] }); T({ ty: 'sawtooth', f: 67, f2: 55, d: 0.8, g: 0.2, a: 0.1, fl: 420 }); N({ ty: 'bandpass', f: 220, q: 2, d: 0.7, g: 0.18, a: 0.12 }); } },
  screech: { r: 80, w: 0.2, f: (T, N) => { T({ ty: 'sawtooth', f: 700, f2: 1500, d: 0.55, g: 0.12, a: 0.06, fl: 1700, am: [38, 0.35] }); N({ ty: 'bandpass', f: 1300, f2: 900, q: 4, d: 0.5, g: 0.1, a: 0.05 }); } },
  drone_hum: { r: 70, f: (T) => { T({ ty: 'sawtooth', f: 110, f2: 104, d: 1.0, g: 0.14, a: 0.15, fl: 500, am: [14, 0.4] }); T({ ty: 'sawtooth', f: 111.5, f2: 105.5, d: 1.0, g: 0.1, a: 0.15, fl: 500 }); } },
  golem_stomp: { r: 120, w: 0.12, f: (T, N) => { T({ f: 60, f2: 28, d: 0.6, g: 0.85 }); N({ f: 700, f2: 60, d: 0.5, g: 0.55 }); N({ ty: 'bandpass', f: 1000, f2: 600, q: 1.5, d: 0.2, g: 0.14, dl: 0.1 }); } },
  wyrm: { r: 160, w: 0.35, f: (T, N) => { T({ ty: 'sawtooth', f: 55, f2: 92, d: 1.0, g: 0.3, a: 0.3, fl: 400, fl2: 900, am: [9, 0.45] }); T({ ty: 'sawtooth', f: 92, f2: 40, d: 1.2, g: 0.3, dl: 1.0, a: 0.05, fl: 900, fl2: 200, am: [9, 0.45] }); N({ f: 500, f2: 150, d: 2.0, g: 0.18, a: 0.4 }); T({ f: 40, d: 2.0, g: 0.45, a: 0.4 }); } },
  tell: { j: 0, f: (T) => { T({ ty: 'triangle', f: 988, d: 0.16, g: 0.16, fl: 3000 }); T({ ty: 'triangle', f: 1318.5, d: 0.28, g: 0.16, dl: 0.11, fl: 3000 }); } },
};

function audAllow(name) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const a = audRL[name] || (audRL[name] = []);
  while (a.length && now - a[0] > 100) a.shift();
  while (audRLAll.length && now - audRLAll[0] > 100) audRLAll.shift();
  if (a.length >= 6 || audRLAll.length >= 18) return false;
  a.push(now); audRLAll.push(now);
  return true;
}
function audLive() { return AC && audG && !muted && (audOffline || AC.state === 'running'); }
// name: see AUD_SFX.  pos: optional {x,y,z} world position (attenuation + pan).  vol: optional extra multiplier.
function sfx(name, pos, vol) {
  const def = AUD_SFX[name];
  if (!def || !audLive() || !audAllow(name)) return;
  const v = audVoice(pos, vol == null ? 1 : vol, def.w || 0, def.r || 50);
  if (!v) return;
  const j = def.j == null ? 0.06 : def.j;
  v.k = 1 + (Math.random() - 0.5) * j;
  def.f((o) => audTone(v, o), (o) => audNz(v, o), v);
}

// ---------- music ----------
// Each mood is a step sequencer (16th notes) driven by a lookahead scheduler; a handful of voices per chord.
function audMPad(m, notes, t, dur, vel, bright, wave) {
  const a = Math.min(dur * 0.4, 2.4), r = Math.min(dur * 0.6, 3.2), end = t + dur + r, pk = vel / (notes.length * 1.6);
  const g = AC.createGain(), f = AC.createBiquadFilter();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + a); g.gain.setValueAtTime(pk, t + dur); g.gain.linearRampToValueAtTime(0.0001, end);
  f.type = 'lowpass'; f.Q.value = 0.6;
  f.frequency.setValueAtTime(bright * 0.55, t); f.frequency.linearRampToValueAtTime(bright, t + dur * 0.6); f.frequency.linearRampToValueAtTime(bright * 0.5, end);
  for (const n of notes) for (const det of [-7, 7]) {
    const o = AC.createOscillator(); o.type = wave; o.frequency.value = audMtof(n); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(end + 0.05);
  }
  f.connect(g); g.connect(m.dst);
}
function audMPluck(m, midi, t, vel, dur, ty, bright) {
  const f0 = audMtof(midi), o = AC.createOscillator(), o2 = AC.createOscillator(), fl = AC.createBiquadFilter();
  const g = AC.createGain(), g2 = AC.createGain();
  o.type = ty || 'triangle'; o2.type = 'sine'; o.frequency.value = f0; o2.frequency.value = f0 * 2.003; g2.gain.value = 0.25;
  fl.type = 'lowpass'; fl.Q.value = 1;
  fl.frequency.setValueAtTime(bright || 2800, t); fl.frequency.exponentialRampToValueAtTime(Math.max(300, f0 * 1.2), t + dur * 0.6);
  audEnv(g, t, vel, 0.006, dur);
  o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(m.dst);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}
function audMBass(m, midi, t, dur, vel, ty, cut) {
  const o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
  o.type = ty; o.frequency.value = audMtof(midi); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(Math.max(80, cut * 0.35), t + dur);
  audEnv(g, t, vel, 0.02, dur);
  o.connect(fl); fl.connect(g); g.connect(m.dst); o.start(t); o.stop(t + dur + 0.05);
}
function audMKick(m, t, vel, base) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.frequency.setValueAtTime(base || 110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
  audEnv(g, t, vel, 0.004, 0.3);
  o.connect(g); g.connect(m.dst); o.start(t); o.stop(t + 0.35);
}
function audMNoise(m, t, dur, f1, f2, vel, ty, q) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = audNoise.white; s.loop = true; f.type = ty || 'bandpass'; f.Q.value = q || 1;
  f.frequency.setValueAtTime(f1, t); f.frequency.linearRampToValueAtTime(f2, t + dur);
  audEnv(g, t, vel, dur * 0.4, dur);
  s.connect(f); f.connect(g); g.connect(m.dst); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function audMBell(m, midi, t, vel, dur) {   // inharmonic partials, long decay
  for (const [r, a, d] of [[1, 1, 1], [2.76, 0.3, 0.5], [5.4, 0.1, 0.25]]) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.frequency.value = audMtof(midi) * r; audEnv(g, t, vel * a, 0.004, dur * d);
    o.connect(g); g.connect(m.dst); o.start(t); o.stop(t + dur * d + 0.05);
  }
}
function audEcho(m, midi, t, vel, sd, ty, bright) { audMPluck(m, midi, t + sd * 3, vel * 0.4, 1.4, ty, bright); }

const AUD_CALM = [
  { b: 38, p: [53, 57, 64], s: [62, 65, 69, 72, 76] },   // Dm9
  { b: 34, p: [50, 53, 57], s: [62, 65, 69, 70, 74] },   // Bb maj7
  { b: 43, p: [55, 58, 65], s: [67, 70, 72, 74, 77] },   // Gm7
  { b: 33, p: [52, 57, 60], s: [64, 67, 69, 72, 76] },   // Am
];
const AUD_CITY = [
  { b: 41, p: [57, 60, 64], s: [65, 67, 69, 72, 74] },
  { b: 45, p: [55, 60, 64], s: [64, 67, 69, 72, 76] },
  { b: 38, p: [57, 60, 65], s: [62, 65, 69, 72, 74] },
  { b: 43, p: [60, 64, 67], s: [60, 62, 64, 67, 69] },
];
const AUD_COMB = [
  { b: 33, p: [57, 60, 64] }, { b: 29, p: [53, 57, 60] }, { b: 36, p: [55, 60, 64] }, { b: 31, p: [55, 59, 62] },
];
const AUD_TCH = [
  { b: 38, p: [53, 57, 62] }, { b: 34, p: [50, 53, 58] }, { b: 41, p: [53, 57, 60] }, { b: 36, p: [52, 55, 60] },
  { b: 38, p: [53, 57, 62] }, { b: 34, p: [50, 53, 58] }, { b: 43, p: [55, 58, 62] }, { b: 33, p: [52, 57, 61] },
];
// title melody: [step in 8-bar loop, midi, length in steps]
const AUD_TMEL = {};
[[0, 69, 8], [8, 72, 4], [12, 74, 4], [16, 77, 12], [28, 76, 4], [32, 72, 8], [40, 69, 4], [44, 72, 4], [48, 67, 8], [56, 76, 8],
 [64, 74, 8], [72, 77, 4], [76, 81, 4], [80, 79, 8], [88, 77, 4], [92, 74, 4], [96, 70, 8], [104, 74, 4], [108, 79, 4], [112, 76, 8], [120, 73, 4], [124, 69, 4]]
  .forEach((x) => { AUD_TMEL[x[0]] = x; });

const AUD_MUSIC = {
  // desert dusk: slow pads, sparse melancholic plucks with a dotted echo
  calm: { bpm: 62, wet: 0.75, vol: 1, step(m, n, t, sd) {
    if (n % 32 === 0) {
      const c = m.c = AUD_CALM[(n / 32 | 0) % 4];
      audMPad(m, c.p, t, sd * 30, 0.55, 900, 'triangle');
      audMPad(m, c.p, t, sd * 30, 0.2, 650, 'sawtooth');
      audMBass(m, c.b, t, sd * 28, 0.5, 'sine', 400);
    }
    if (n % 2 === 0 && m.c && n - m.last > 3) {
      if (Math.random() < (n % 8 === 0 ? 0.2 : 0.07)) {
        m.i = clamp((m.i == null ? 2 : m.i) + audPick([-2, -1, -1, 0, 1, 1, 2]), 0, 4);
        const note = m.c.s[m.i], v = audRnd(0.08, 0.13);
        audMPluck(m, note, t, v, 2.4, 'sawtooth', 1800);
        if (Math.random() < 0.5) audEcho(m, note, t, v, sd, 'sawtooth', 1500);
        m.last = n;
      }
    }
  } },
  // warmer, light pulse
  city: { bpm: 96, wet: 0.45, vol: 1.8, step(m, n, t, sd) {
    const c = AUD_CITY[(n / 16 | 0) % 4];
    if (n % 16 === 0) audMPad(m, c.p, t, sd * 15, 0.5, 1000, 'sawtooth');
    if (n % 8 === 0) audMBass(m, c.b + (n % 16 === 8 ? 7 : 0), t, sd * 6, 0.45, 'triangle', 600);
    if (n % 4 === 0) audMKick(m, t, n % 16 === 0 ? 0.28 : 0.2, 90);
    if (n % 4 === 2) audMNoise(m, t, 0.04, 6500, 6500, 0.018, 'highpass', 0.7);
    if (n % 2 === 0 && Math.random() > 0.15) audMPluck(m, c.p[[0, 1, 2, 1, 2, 1, 0, 1][(n / 2) % 8]] + 12, t, 0.1, 0.5, 'triangle', 2400);
    if (n % 16 === 6 && Math.random() < 0.35) audMPluck(m, audPick(c.s) + 12, t, 0.07, 1.2, 'sine', 3000);
  } },
  // low cluster drone, heartbeat, rare cold accents
  tense: { bpm: 70, wet: 0.7, vol: 0.7, step(m, n, t, sd) {
    if (n % 64 === 0) {
      const set = [[40, 41, 47], [39, 40, 46], [38, 44, 45]][(n / 64 | 0) % 3];
      audMPad(m, set, t, sd * 62, 0.6, 380, 'sawtooth');
      audMPad(m, [set[0] - 12], t, sd * 62, 0.5, 200, 'sine');
      audMNoise(m, t + sd * 20, sd * 40, 300, 1400, 0.05, 'bandpass', 2);
    }
    if (n % 8 === 0 && (n / 8 | 0) % 4 !== 3) { audMKick(m, t, 0.5, 60); audMKick(m, t + sd * 2.5, 0.3, 55); }
    if (n % 2 === 0 && Math.random() < 0.035) audMPluck(m, audPick([76, 77, 82, 83]), t, 0.06, 3, 'sine', 2000);
  } },
  // dark, static drones, distant bells
  dungeon: { bpm: 48, wet: 0.85, vol: 1.3, step(m, n, t, sd) {
    if (n % 96 === 0) {
      audMPad(m, [36, 43, 48], t, sd * 92, 0.6, 240, 'sawtooth');
      audMBass(m, 24, t, sd * 90, 0.5, 'sine', 120);
    }
    if (n % 96 === 48) audMPad(m, [36, 42, 48], t, sd * 44, 0.35, 300, 'triangle');
    if (n % 3 === 0 && Math.random() < 0.045) audMBell(m, audPick([60, 63, 66, 67, 70]) + (Math.random() < 0.3 ? 12 : 0), t, 0.05, 5);
    if (n % 4 === 1 && Math.random() < 0.02) audMKick(m, t, 0.5, 50);
  } },
  // driving but soft: gentle four-on-floor, 8th bass, snare on 2/4, pad and stabs
  combat: { bpm: 116, wet: 0.3, vol: 2.6, step(m, n, t, sd) {
    const bar = n / 16 | 0, c = AUD_COMB[bar % 4], s = n % 16;
    if (s === 0) audMPad(m, c.p, t, sd * 15, 0.45, 1000, 'sawtooth');
    if (n % 4 === 0) audMKick(m, t, s === 0 ? 0.38 : 0.28, 120);
    if (s === 10) audMKick(m, t, 0.2, 110);
    if (n % 8 === 4) audMNoise(m, t, 0.11, 1900, 1300, 0.09, 'bandpass', 0.9);
    if (n % 2 === 0 && !((bar >> 2) % 2 && (s === 6 || s === 14))) audMBass(m, c.b + (s === 6 || s === 14 ? 12 : 0), t, sd * 1.6, 0.26, 'sawtooth', 520);
    if (n % 4 === 2) audMNoise(m, t, 0.04, 7000, 7000, 0.025, 'highpass', 0.7);
    else if (n % 2 === 1 && Math.random() < 0.3) audMNoise(m, t, 0.03, 7000, 7000, 0.012, 'highpass', 0.7);
    if ((s === 0 || s === 3 || s === 6 || s === 10 || s === 12) && Math.random() < 0.45) audMPluck(m, audPick(c.p) + 12, t, 0.075, 0.35, 'sawtooth', 2200);
  } },
  // evocative theme: 8-bar minor/major loop with a slow melody and echoes
  title: { bpm: 72, wet: 0.8, vol: 0.9, step(m, n, t, sd) {
    const k = n % 128, bar = k >> 4, c = AUD_TCH[bar], s = k % 16;
    if (s === 0) {
      audMPad(m, c.p, t, sd * 15, 0.55, 1000, 'sawtooth');
      audMPad(m, c.p, t, sd * 15, 0.3, 1500, 'triangle');
      audMBass(m, c.b, t, sd * 15, 0.6, 'sine', 400);
    }
    if (s === 8) audMBass(m, c.b + 12, t, sd * 6, 0.25, 'sine', 400);
    if (k === 0) audMNoise(m, t, sd * 100, 300, 700, 0.025, 'bandpass', 1.5);
    const me = AUD_TMEL[k];
    if (me) {
      audMPluck(m, me[1], t, 0.13, sd * me[2] * 1.3 + 0.8, 'triangle', 3200);
      audEcho(m, me[1], t, 0.13, sd, 'triangle', 2400);
    }
    if (bar >= 4 && n % 2 === 0 && s % 4 !== 0 && Math.random() < 0.5) audMPluck(m, c.p[(n / 2 | 0) % 3] + 24, t, 0.03, 0.9, 'sine', 4000);
  } },
};

function audMusicApply() {
  if (!AC || !audG) return;
  const mood = audWant.music;
  if (mood === audMus.mood) return;
  const now = AC.currentTime, old = audMus.cur;
  audMus.mood = mood; audMus.cur = null;
  if (old) audFadeOut(old.g, old.send, 14000);
  const def = mood && AUD_MUSIC[mood];
  if (!def) return;
  const gn = AC.createGain(), send = AC.createGain();
  gn.gain.value = 0.0001; gn.gain.setTargetAtTime(def.vol || 1, now, 0.8);   // ~3 s crossfade; vol evens out the moods
  send.gain.value = def.wet; gn.connect(audG.musBus); gn.connect(send); send.connect(audG.musVerb);
  audMus.cur = { def, dst: gn, g: gn, send, n: 0, next: now + 0.15, last: -9, c: null, i: null };
}
function audFadeOut(g, extra, ms) {
  const now = AC.currentTime, p = g.gain;
  if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else p.cancelScheduledValues(now);
  p.setTargetAtTime(0, now, 0.7);
  if (!audOffline) setTimeout(() => { try { g.disconnect(); if (extra) extra.disconnect(); } catch (e) { /* gone */ } }, ms);
}
function setMusic(mood) {
  audWant.music = mood && AUD_MUSIC[mood] ? mood : null;
  audMusicApply();
}
// Schedule notes up to `look` seconds ahead of the audio clock (called per frame and from a background timer).
function audMusicTick(look) {
  const m = audMus.cur;
  if (!m || !audLive()) return;
  const now = AC.currentTime, sd = 60 / m.def.bpm / 4;
  if (m.next < now - 0.3) m.next = now + 0.05;           // throttled tab or unmuted: resync
  const end = now + (look || 0.5);
  for (let guard = 0; m.next < end && guard < 1200; guard++) { m.def.step(m, m.n, m.next, sd); m.n++; m.next += sd; }
}

// ---------- ambience beds ----------
function audAmbVoice(a, pan, vol, wet) {   // quiet one-shot positioned randomly in the stereo field
  const g = AC.createGain(); g.gain.value = vol;
  let head = g;
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; g.connect(p); head = p; }
  head.connect(a.out);
  if (wet) head.connect(audGain(wet, audG.sfxVerb));
  return { dst: g, t: AC.currentTime + 0.01, k: 1 };
}
function audLoop(a, ty, f, q, gain) {
  const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = audNoise.pink; s.loop = true; fl.type = ty; fl.frequency.value = f; fl.Q.value = q; g.gain.value = gain;
  s.connect(fl); fl.connect(g); g.connect(a.out); s.start(0, Math.random() * 3); a.srcs.push(s);
  return { flt: fl, g };
}
function audOsc(a, f, gain) {
  const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.value = gain;
  o.connect(g); g.connect(a.out); o.start(); a.srcs.push(o);
  return { o, g };
}
function audLfo(a, rate, depth, param) {
  const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = rate; g.gain.value = depth;
  o.connect(g); g.connect(param); o.start(AC.currentTime + Math.random() / rate); a.srcs.push(o);
}
// timer helper for random one-shot events
function audEvery(lo, hi, fn) {
  let left = audRnd(lo, hi);
  return (dt) => { left -= dt; if (left <= 0) { left = audRnd(lo, hi); fn(); } };
}
const AUD_AMB = {
  desert: (a) => {
    const w = audLoop(a, 'bandpass', 380, 0.5, 0.45); audLfo(a, 0.07, 160, w.flt.frequency); audLfo(a, 0.11, 0.2, w.g.gain);
    const h = audLoop(a, 'bandpass', 1300, 5, 0.05); audLfo(a, 0.05, 400, h.flt.frequency); audLfo(a, 0.13, 0.03, h.g.gain);
    audLoop(a, 'lowpass', 160, 0.7, 0.35);
  },
  forest: (a) => {
    const r = audLoop(a, 'bandpass', 2200, 0.5, 0.06); audLfo(a, 0.19, 0.03, r.g.gain);
    const w = audLoop(a, 'lowpass', 300, 0.6, 0.18); audLfo(a, 0.09, 0.08, w.g.gain);
    const c = audOsc(a, 2600, 0.006); const am = AC.createOscillator(), ag = AC.createGain(); am.frequency.value = 16; ag.gain.value = 0.006;
    am.connect(ag); ag.connect(c.g.gain); am.start(); a.srcs.push(am);
    return audEvery(1.5, 6, () => {
      const v = audAmbVoice(a, audRnd(-0.8, 0.8), 1, 0.2), f = audRnd(2000, 3200), n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) audTone(v, { f: f * (1 + i * 0.06), f2: f * (1.18 + i * 0.06), d: 0.09, g: 0.03, dl: i * 0.12, a: 0.015 });
    });
  },
  city: (a) => {
    const m1 = audLoop(a, 'bandpass', 420, 0.7, 0.5); audLfo(a, 0.21, 0.15, m1.g.gain);
    const m2 = audLoop(a, 'bandpass', 800, 1.0, 0.3); audLfo(a, 0.13, 0.1, m2.g.gain);
    const m3 = audLoop(a, 'bandpass', 1500, 2, 0.07); audLfo(a, 0.31, 0.05, m3.g.gain);
    audOsc(a, 60, 0.02); audOsc(a, 120, 0.012);
  },
  cave: (a) => {
    const r = audLoop(a, 'lowpass', 140, 0.7, 0.5); audLfo(a, 0.08, 0.15, r.g.gain);
    const x = audLoop(a, 'bandpass', 600, 3, 0.02); audLfo(a, 0.17, 0.012, x.g.gain);
    return audEvery(1.2, 4.5, () => {
      const v = audAmbVoice(a, audRnd(-0.9, 0.9), 1, 0.9), f = audRnd(1100, 1900);
      audTone(v, { f, f2: f * 1.4, d: 0.22, g: 0.07, a: 0.004 });
    });
  },
  ocean: (a) => {
    const s1 = audLoop(a, 'lowpass', 900, 0.3, 0.15); audLfo(a, 0.11, 0.13, s1.g.gain);
    const s2 = audLoop(a, 'lowpass', 500, 0.3, 0.1); audLfo(a, 0.073, 0.09, s2.g.gain);
    const h = audLoop(a, 'highpass', 2500, 0.5, 0.02); audLfo(a, 0.11, 0.018, h.g.gain);
    audLoop(a, 'lowpass', 100, 0.5, 0.15);
  },
  scar: (a) => {
    [110, 165.4, 220.7, 330].forEach((f, i) => { const o = audOsc(a, f, 0.05 / (1 + i * 0.4)); audLfo(a, 0.07 + i * 0.03, 0.025 / (1 + i * 0.4), o.g.gain); });
    audOsc(a, 221.6, 0.02);   // beats against 220.7
    const x = audLoop(a, 'bandpass', 1800, 6, 0.015); audLfo(a, 0.1, 0.01, x.g.gain);
    return audEvery(1.5, 5, () => {
      const v = audAmbVoice(a, audRnd(-0.9, 0.9), 1, 0.9);
      audTone(v, { f: audPick([1318.5, 1568, 1760, 2093, 2637]), d: 1.8, g: 0.03, a: 0.01 });
    });
  },
  interior: (a) => {
    audLoop(a, 'lowpass', 250, 0.7, 0.55);
    const h = audLoop(a, 'bandpass', 120, 4, 0.15); audLfo(a, 0.2, 0.04, h.g.gain);
    audOsc(a, 50, 0.03); audOsc(a, 100, 0.02); audOsc(a, 150, 0.008);
    audLoop(a, 'highpass', 4000, 0.5, 0.008);
    return audEvery(6, 15, () => { const v = audAmbVoice(a, audRnd(-0.7, 0.7), 1, 0.3); audNz(v, { ty: 'bandpass', f: 1800, q: 2, d: 0.02, g: 0.04 }); });
  },
};
function audAmbApply() {
  if (!AC || !audG) return;
  const kind = audWant.amb;
  if (kind === audAmbS.kind) return;
  const now = AC.currentTime, old = audAmbS.cur;
  audAmbS.kind = kind; audAmbS.cur = null;
  if (old) {
    audFadeOut(old.out, null, 6000);
    if (!audOffline) setTimeout(() => { for (const s of old.srcs) { try { s.stop(); } catch (e) { /* stopped */ } } }, 5500);
  }
  const build = kind && AUD_AMB[kind];
  if (!build) return;
  const out = AC.createGain(); out.gain.value = 0.0001; out.gain.setTargetAtTime(1, now, 0.8); out.connect(audG.ambBus);
  const a = { out, srcs: [], ev: null };
  a.ev = build(a) || null;
  audAmbS.cur = a;
}
function setAmbience(kind) {
  audWant.amb = kind && AUD_AMB[kind] ? kind : null;
  audAmbApply();
}

// call once per frame; listenerPos {x,y,z} (camera or player), listenerYaw in radians
function audioUpdate(dt, listenerPos, listenerYaw) {
  const L = audioListener;
  if (listenerPos) { L.x = listenerPos.x; L.y = listenerPos.y || 0; L.z = listenerPos.z; }
  if (typeof listenerYaw === 'number') L.yaw = listenerYaw;
  if (!audLive()) return;
  audMusicTick(0.5);
  const a = audAmbS.cur;
  if (a && a.ev) a.ev(Math.min(dt || 0, 0.25));
}
