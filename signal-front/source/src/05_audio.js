// Signal Front — WebAudio sound: synthesized effects and a small chiptune sequencer

let AC = null, MASTER = null, SFXG = null, MUSG = null, NOISE = null;
const AUD = { sfx: storeGet('sfx', true), music: storeGet('music', true), song: null, step: 0, next: 0, timer: 0 };

function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  MASTER = AC.createGain(); MASTER.gain.value = 0.5; MASTER.connect(AC.destination);
  SFXG = AC.createGain(); SFXG.gain.value = AUD.sfx ? 1 : 0; SFXG.connect(MASTER);
  MUSG = AC.createGain(); MUSG.gain.value = AUD.music ? 0.32 : 0; MUSG.connect(MASTER);
  const len = AC.sampleRate;
  NOISE = AC.createBuffer(1, len, AC.sampleRate);
  const d = NOISE.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AUD.timer = setInterval(musicTick, 50);
}
function setSfx(on) { AUD.sfx = on; storeSet('sfx', on); if (SFXG) SFXG.gain.value = on ? 1 : 0; }
function setMusic(on) { AUD.music = on; storeSet('music', on); if (MUSG) MUSG.gain.value = on ? 0.32 : 0; }

function tone(type, f0, f1, dur, vol, t = 0, out = SFXG) {
  if (!AC || TIME.fast) return;
  const t0 = AC.currentTime + t;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol, fFrom, fTo, t = 0, q = 0.8, out = SFXG) {
  if (!AC || TIME.fast) return;
  const t0 = AC.currentTime + t;
  const s = AC.createBufferSource(); s.buffer = NOISE;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
  f.frequency.setValueAtTime(fFrom, t0); f.frequency.exponentialRampToValueAtTime(Math.max(40, fTo), t0 + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
}

const SFX = {
  cursor() { tone('square', 1320, 1320, 0.03, 0.04); },
  select() { tone('square', 660, 990, 0.07, 0.07); },
  cancel() { tone('square', 520, 260, 0.08, 0.06); },
  error() { tone('square', 180, 160, 0.14, 0.07); },
  menu() { tone('square', 880, 880, 0.04, 0.05); },
  move(t) { const air = isAir(t); if (air) noise(0.35, 0.08, 2400, 900, 0, 4); else { tone('sawtooth', 70, 55, 0.3, 0.06); noise(0.25, 0.05, 600, 200); } },
  step() { tone('triangle', 140, 120, 0.03, 0.05); },
  mg() { for (let i = 0; i < 5; i++) { noise(0.05, 0.16, 3000, 800, i * 0.06); tone('square', 220, 90, 0.04, 0.05, i * 0.06); } },
  cannon() { noise(0.45, 0.35, 1800, 90); tone('sine', 120, 40, 0.35, 0.3); },
  missile() { noise(0.6, 0.14, 800, 4000, 0, 3); tone('sawtooth', 300, 900, 0.5, 0.03); },
  launch() { noise(0.3, 0.2, 1200, 300); tone('square', 200, 600, 0.25, 0.04); },
  boom() { noise(0.7, 0.4, 1400, 60); tone('sine', 90, 30, 0.6, 0.35); },
  zap() { tone('sawtooth', 1400, 200, 0.25, 0.06); tone('square', 900, 1800, 0.2, 0.03, 0.05); },
  capture() { [523, 659, 784].forEach((f, i) => tone('square', f, f, 0.08, 0.06, i * 0.07)); },
  captured() { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.1, 0.07, i * 0.08)); },
  build() { tone('square', 392, 392, 0.06, 0.06); tone('square', 784, 784, 0.1, 0.06, 0.07); },
  repair() { tone('triangle', 600, 900, 0.12, 0.06); },
  power() { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone('square', f, f * 1.01, 0.09, 0.07, i * 0.05)); noise(0.8, 0.1, 400, 4000, 0.1, 2); },
  turn() { tone('square', 523, 523, 0.08, 0.06); tone('square', 784, 784, 0.16, 0.06, 0.1); },
  win() { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.14, 0.07, i * 0.13)); },
  lose() { [392, 370, 349, 330, 311, 294].forEach((f, i) => tone('square', f, f, 0.2, 0.06, i * 0.18)); },
  trap() { tone('square', 880, 220, 0.25, 0.08); tone('square', 660, 165, 0.25, 0.06, 0.12); },
};
function sfx(name, arg) { if (AC && AUD.sfx && SFX[name]) SFX[name](arg); }

// ---------------- music ----------------
// Each song: bpm, lead/bass as arrays of midi notes per eighth (0 = rest, -1 = hold), drums as a string per eighth.
const SONGS = {
  meridian: { bpm: 132,
    lead: [67, 67, 72, 74, 76, -1, 74, 72, 74, -1, 67, -1, 71, 72, 74, -1, 76, 76, 77, 79, 81, -1, 79, 76, 77, 76, 74, 71, 72, -1, -1, 0,
      72, -1, 76, -1, 79, -1, 76, 74, 72, -1, 69, -1, 71, -1, 67, -1, 69, 71, 72, 74, 76, -1, 79, -1, 77, 76, 74, 72, 74, -1, -1, 0],
    bass: [48, 0, 43, 0, 48, 0, 43, 0, 43, 0, 50, 0, 43, 0, 47, 0, 48, 0, 43, 0, 45, 0, 40, 0, 41, 0, 43, 0, 48, 0, 43, 0,
      45, 0, 40, 0, 45, 0, 40, 0, 41, 0, 48, 0, 43, 0, 50, 0, 41, 0, 45, 0, 48, 0, 43, 0, 41, 0, 43, 0, 43, 0, 47, 0],
    drums: 'k.s.k.s.kks.k.s.k.s.k.s.kks.k.ss' },
  drovic: { bpm: 112,
    lead: [69, -1, 72, 71, 69, -1, 64, -1, 65, -1, 64, 62, 64, -1, -1, 0, 69, -1, 72, 74, 76, -1, 74, 72, 71, 72, 71, 67, 69, -1, -1, 0,
      76, -1, 77, 76, 74, -1, 72, -1, 74, -1, 72, 71, 72, -1, 69, -1, 65, -1, 67, 69, 71, -1, 68, -1, 69, -1, -1, -1, 0, 0, 0, 0],
    bass: [45, 45, 45, 45, 40, 40, 40, 40, 41, 41, 41, 41, 40, 40, 40, 40, 45, 45, 45, 45, 48, 48, 48, 48, 43, 43, 43, 43, 45, 45, 45, 45,
      41, 41, 41, 41, 43, 43, 43, 43, 45, 45, 45, 45, 40, 40, 40, 40, 38, 38, 38, 38, 40, 40, 40, 40, 45, 45, 45, 45, 40, 40, 44, 44],
    drums: 'k...s...k.k.s...k...s...k.k.s.s.' },
  title: { bpm: 96,
    lead: [64, -1, -1, 67, 69, -1, -1, -1, 71, -1, 69, -1, 67, -1, 64, -1, 62, -1, -1, 64, 67, -1, -1, -1, 64, -1, -1, -1, 0, 0, 0, 0,
      64, -1, -1, 67, 69, -1, -1, -1, 71, -1, 74, -1, 76, -1, 74, -1, 72, -1, 71, -1, 69, -1, 67, -1, 69, -1, -1, -1, 0, 0, 0, 0],
    bass: [40, 0, 40, 0, 40, 0, 40, 0, 45, 0, 45, 0, 45, 0, 45, 0, 38, 0, 38, 0, 43, 0, 43, 0, 40, 0, 40, 0, 40, 0, 40, 0,
      40, 0, 40, 0, 40, 0, 40, 0, 43, 0, 43, 0, 43, 0, 43, 0, 41, 0, 41, 0, 38, 0, 38, 0, 45, 0, 45, 0, 45, 0, 45, 0],
    drums: 'k.......s.......k.......s...s...' },
};
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function playSong(name) {
  if (AUD.song === name) return;
  AUD.song = name; AUD.step = 0; AUD.next = AC ? AC.currentTime + 0.1 : 0;
}
function musicTick() {
  if (!AC || !AUD.song || TIME.fast) return;
  const s = SONGS[AUD.song], dt = 60 / s.bpm / 2;
  if (AUD.next < AC.currentTime - 0.5) AUD.next = AC.currentTime + 0.05;
  while (AUD.next < AC.currentTime + 0.2) {
    const i = AUD.step % s.lead.length, t = AUD.next - AC.currentTime;
    const n = s.lead[i];
    if (n > 0) {
      let len = 1; while (s.lead[(i + len) % s.lead.length] === -1 && len < 8) len++;
      note('square', midiHz(n), dt * len * 0.92, 0.09, t);
      note('square', midiHz(n) * 1.004, dt * len * 0.92, 0.035, t);
    }
    const b = s.bass[i % s.bass.length];
    if (b > 0) note('triangle', midiHz(b), dt * 0.9, 0.22, t);
    const d = s.drums[i % s.drums.length];
    if (d === 'k') { tone('sine', 150, 45, 0.12, 0.35, t, MUSG); }
    else if (d === 's') noise(0.1, 0.18, 6000, 1500, t, 0.7, MUSG);
    if (i % 2 === 1) noise(0.025, 0.04, 9000, 6000, t, 0.5, MUSG);
    AUD.next += dt; AUD.step++;
  }
}
function note(type, f, dur, vol, t) {
  const t0 = AC.currentTime + t;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  g.gain.setValueAtTime(vol * 0.8, t0 + dur * 0.6); g.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(g); g.connect(MUSG); o.start(t0); o.stop(t0 + dur + 0.02);
}
