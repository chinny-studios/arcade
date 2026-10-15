// Revenant Protocol — synthesized sound effects and a two-layer procedural score (stealth / combat)

const AU = { ctx: null, sfx: null, mus: null, noise: null, intensity: 0, musicOn: false, next: 0, step: 0 };
function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const c = (AU.ctx = new AC());
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(c.destination);
  AU.sfx = c.createGain(); AU.sfx.gain.value = SETTINGS.vol; AU.sfx.connect(comp);
  AU.mus = c.createGain(); AU.mus.gain.value = SETTINGS.music * 0.5; AU.mus.connect(comp);
  AU.calm = c.createGain(); AU.calm.connect(AU.mus);
  AU.fight = c.createGain(); AU.fight.gain.value = 0; AU.fight.connect(AU.mus);
  const len = c.sampleRate;
  AU.noise = c.createBuffer(1, len, c.sampleRate);
  const d = AU.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.next = c.currentTime + 0.1;
  setInterval(musicTick, 90);
}
function applyVolumes() { if (!AU.ctx) return; AU.sfx.gain.value = SETTINGS.vol; AU.mus.gain.value = SETTINGS.music * 0.5; }

// building blocks
function env(g, t, a, peak, dec, sus = 0) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + dec); }
function osc(type, f0, f1, dur, vol, out, t, a = 0.003) {
  const c = AU.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, a, vol, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + dur + 0.05);
  return o;
}
function noise(dur, vol, out, t, type = 'lowpass', f0 = 2000, f1 = f0, q = 1, a = 0.003) {
  const c = AU.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = AU.noise; s.loop = true;
  f.type = type; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = q;
  env(g, t, a, vol, dur); s.connect(f); f.connect(g); g.connect(out);
  s.start(t, Math.random() * 0.5); s.stop(t + a + dur + 0.05);
}

const SFX = {
  pistol: (o, t) => { osc('square', 1500, 160, 0.16, 0.22, o, t); noise(0.08, 0.25, o, t, 'bandpass', 3000, 800, 2); },
  carbine: (o, t) => { osc('sawtooth', 1800, 220, 0.13, 0.18, o, t); osc('square', 900, 120, 0.1, 0.12, o, t); noise(0.07, 0.25, o, t, 'bandpass', 2600, 700, 2); },
  repeater: (o, t) => { osc('square', 2200, 500, 0.07, 0.14, o, t); noise(0.05, 0.2, o, t, 'bandpass', 4000, 1500, 2); },
  fusion: (o, t) => { osc('sawtooth', 500, 90, 0.14, 0.22, o, t); noise(0.1, 0.2, o, t, 'lowpass', 1800, 300); },
  cannon: (o, t) => { osc('sawtooth', 700, 70, 0.12, 0.22, o, t); osc('square', 140, 50, 0.12, 0.2, o, t); noise(0.08, 0.3, o, t, 'lowpass', 2500, 400); },
  ebolt: (o, t) => { osc('square', 1300, 140, 0.18, 0.16, o, t); noise(0.07, 0.15, o, t, 'bandpass', 2400, 600, 2); },
  plasma: (o, t) => { osc('sawtooth', 900, 120, 0.12, 0.16, o, t); },
  pulse: (o, t) => { osc('sine', 220, 40, 0.4, 0.4, o, t); noise(0.3, 0.3, o, t, 'lowpass', 1200, 100); },
  concussion: (o, t) => { osc('sine', 160, 30, 0.6, 0.6, o, t); noise(0.5, 0.5, o, t, 'lowpass', 3000, 80); },
  mortar: (o, t) => { osc('sine', 300, 60, 0.25, 0.4, o, t); noise(0.2, 0.3, o, t, 'lowpass', 1500, 200); },
  missile: (o, t) => { noise(0.8, 0.35, o, t, 'bandpass', 600, 2400, 1.5, 0.02); osc('sawtooth', 120, 60, 0.3, 0.15, o, t); },
  throw: (o, t) => { noise(0.25, 0.25, o, t, 'bandpass', 800, 2500, 2, 0.04); },
  punch: (o, t) => { osc('sine', 160, 50, 0.12, 0.5, o, t); noise(0.06, 0.3, o, t, 'lowpass', 900, 200); },
  whiff: (o, t) => { noise(0.15, 0.15, o, t, 'bandpass', 1200, 400, 1.5, 0.03); },
  explode: (o, t) => { noise(1.4, 0.9, o, t, 'lowpass', 2400, 60, 0.7, 0.005); osc('sine', 90, 28, 0.9, 0.8, o, t); },
  smallboom: (o, t) => { noise(0.6, 0.5, o, t, 'lowpass', 2000, 120, 0.7); osc('sine', 120, 40, 0.4, 0.4, o, t); },
  spark: (o, t) => { noise(0.06, 0.15, o, t, 'highpass', 3000, 3000); },
  hurt: (o, t) => { osc('square', 180, 70, 0.18, 0.3, o, t); noise(0.12, 0.25, o, t, 'lowpass', 900, 200); },
  shieldhit: (o, t) => { osc('sawtooth', 2400, 600, 0.12, 0.12, o, t); osc('sine', 3200, 1500, 0.15, 0.1, o, t); },
  pickup: (o, t) => { osc('square', 880, 880, 0.06, 0.12, o, t); osc('square', 1320, 1320, 0.08, 0.12, o, t + 0.06); },
  weapon: (o, t) => { [523, 659, 784, 1046].forEach((f, i) => osc('square', f, f, 0.08, 0.12, o, t + i * 0.06)); },
  key: (o, t) => { [988, 1319, 1976].forEach((f, i) => osc('sine', f, f, 0.18, 0.2, o, t + i * 0.09)); },
  power: (o, t) => { osc('sawtooth', 200, 1600, 0.5, 0.18, o, t); },
  secret: (o, t) => { [659, 831, 988, 1319].forEach((f, i) => osc('triangle', f, f, 0.25, 0.2, o, t + i * 0.1)); },
  objective: (o, t) => { [392, 523, 659, 784].forEach((f, i) => osc('sawtooth', f, f, 0.3, 0.1, o, t + i * 0.12)); },
  door: (o, t) => { noise(0.8, 0.3, o, t, 'lowpass', 500, 200, 1, 0.05); osc('sawtooth', 70, 60, 0.7, 0.08, o, t, 0.05); noise(0.25, 0.18, o, t + 0.55, 'highpass', 3000, 5000); },
  lift: (o, t) => { osc('sawtooth', 55, 70, 1.4, 0.1, o, t, 0.1); noise(1.2, 0.12, o, t, 'lowpass', 300, 300, 1, 0.1); },
  liftstop: (o, t) => { osc('sine', 110, 50, 0.2, 0.35, o, t); noise(0.1, 0.2, o, t, 'lowpass', 800, 200); },
  switch: (o, t) => { noise(0.03, 0.4, o, t, 'highpass', 2000, 2000); osc('square', 660, 660, 0.1, 0.12, o, t + 0.04); },
  denied: (o, t) => { osc('square', 220, 220, 0.12, 0.15, o, t); osc('square', 180, 180, 0.15, 0.15, o, t + 0.13); },
  empty: (o, t) => { noise(0.03, 0.3, o, t, 'highpass', 1500, 1500); },
  jump: (o, t) => { noise(0.08, 0.08, o, t, 'lowpass', 600, 300); },
  land: (o, t) => { osc('sine', 90, 40, 0.1, 0.3, o, t); },
  step: (o, t) => { noise(0.05, 0.05, o, t, 'lowpass', 500 + Math.random() * 300, 200); },
  splash: (o, t) => { noise(0.3, 0.2, o, t, 'bandpass', 1200, 400, 1); },
  bark: (o, t) => { noise(0.05, 0.3, o, t, 'bandpass', 1500, 1500, 3); osc('square', 330, 300, 0.12, 0.08, o, t + 0.06); osc('square', 260, 240, 0.16, 0.08, o, t + 0.2); noise(0.06, 0.25, o, t + 0.36, 'bandpass', 1500, 1500, 3); },
  grunt: (o, t) => { const x = osc('sawtooth', 90, 60, 0.45, 0.3, o, t, 0.03); x.detune.setValueAtTime(0, t); x.detune.linearRampToValueAtTime(-300, t + 0.45); noise(0.4, 0.15, o, t, 'lowpass', 500, 300); },
  hiss: (o, t) => { noise(0.5, 0.2, o, t, 'highpass', 3000, 5000, 1, 0.08); osc('sawtooth', 150, 110, 0.4, 0.1, o, t); },
  beep: (o, t) => { [1200, 900, 1500].forEach((f, i) => osc('square', f, f, 0.05, 0.08, o, t + i * 0.07)); },
  servo: (o, t) => { osc('sawtooth', 300, 900, 0.3, 0.12, o, t, 0.05); osc('square', 60, 60, 0.3, 0.12, o, t); },
  gurgle: (o, t) => { for (let i = 0; i < 4; i++) osc('sine', 80 + Math.random() * 60, 40, 0.12, 0.3, o, t + i * 0.08); noise(0.4, 0.2, o, t, 'bandpass', 400, 200, 3); },
  die: (o, t) => { noise(0.04, 0.25, o, t, 'bandpass', 1500, 1500, 3); osc('square', 400, 90, 0.4, 0.12, o, t + 0.03); },
  diebig: (o, t) => { osc('sawtooth', 160, 30, 0.8, 0.3, o, t); noise(0.6, 0.3, o, t, 'lowpass', 1200, 100); },
  jet: (o, t) => { noise(0.5, 0.25, o, t, 'bandpass', 900, 600, 1, 0.05); },
  beepmine: (o, t) => { osc('sine', 1800, 1800, 0.05, 0.12, o, t); },
  alarm: (o, t) => { for (let i = 0; i < 4; i++) { osc('square', 620, 620, 0.22, 0.08, o, t + i * 0.5); osc('square', 460, 460, 0.22, 0.08, o, t + i * 0.5 + 0.25); } },
  lamp: (o, t) => { noise(0.02, 0.2, o, t, 'highpass', 2500, 2500); },
  swing: (o, t) => { noise(0.2, 0.25, o, t, 'bandpass', 600, 1800, 2, 0.04); },
  blade: (o, t) => { osc('sawtooth', 2000, 400, 0.2, 0.12, o, t); noise(0.2, 0.2, o, t, 'bandpass', 3000, 1000, 2, 0.03); },
};
function sfx(name, vol = 1, pan = 0) {
  if (!AU.ctx || !SFX[name] || vol < 0.02) return;
  const c = AU.ctx, g = c.createGain(); g.gain.value = vol;
  let out = g;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(AU.sfx); } else g.connect(AU.sfx);
  SFX[name](out, c.currentTime + 0.005);
}
// Positional: falls off with distance and pans by angle relative to the camera.
function sfxAt(name, x, y, z, vol = 1) {
  if (!AU.ctx) return;
  const cp = R.camera.position, dx = x - cp.x, dz = z - cp.z, d = Math.hypot(dx, y - cp.y, dz);
  const att = vol / (1 + d * d * 0.012);
  const yaw = R.camera.rotation.y, rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const pan = d > 0.5 ? ((dx * rx + dz * rz) / d) * 0.8 : 0;
  sfx(name, att, pan);
}

// ---------- music ----------
// 16th-note sequencer. Calm layer: pad + sparse bell. Combat layer: ostinato bass, timpani, snare, brass stabs.
const KEYS = [57, 50, 52, 45]; // A, D, E, A (low) per mission
const PROG = [[0, 3, 7], [-4, 0, 3], [-9, -5, -2], [-2, 2, 5]]; // i, VI, III(as iv-ish), VII in minor
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function musicTick() {
  if (!AU.ctx || !AU.musicOn) return;
  const c = AU.ctx, spb = 60 / 100 / 4; // 16ths at 100 bpm
  const tgt = clamp(AU.intensity, 0, 1);
  AU.fight.gain.setTargetAtTime(tgt * 0.9, c.currentTime, 0.8);
  AU.calm.gain.setTargetAtTime(0.75 - tgt * 0.45, c.currentTime, 0.8);
  while (AU.next < c.currentTime + 0.3) {
    const s = AU.step, t = AU.next, bar = Math.floor(s / 16) % 4, b = s % 16;
    const root = KEYS[G.mission % 4] - 12, ch = PROG[bar];
    if (b === 0) {
      for (const n of ch) { const f = mtof(root + 12 + n); pad(f, t, spb * 16, AU.calm); pad(f * 1.005, t, spb * 16, AU.calm); }
      timp(mtof(root), t, AU.fight);
    }
    if (b % 2 === 0) { const n = (b % 8 === 6) ? ch[2] : (b % 4 === 2 ? 7 : 0); bass(mtof(root + ch[0] + n - (n === 7 ? 0 : 0)), t, spb * 1.6, AU.fight); }
    if (b === 4 || b === 12) snare(t, AU.fight);
    if (b === 10 && bar % 2 === 1) timp(mtof(root + 7), t, AU.fight);
    if ([0, 3, 6].includes(b) && bar === 3) brass(mtof(root + 24 + ch[(b / 3) % 3]), t, spb * 2.5, AU.fight);
    if ((b === 8 || b === 14) && Math.random() < 0.35) bell(mtof(root + 36 + pick(ch)), t, AU.calm);
    AU.next += spb; AU.step++;
  }
}
function pad(f, t, d, out) {
  const c = AU.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 700;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + d * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + d);
  o.connect(fl); fl.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
}
function bass(f, t, d, out) {
  const c = AU.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(200, t + d);
  env(g, t, 0.005, 0.16, d); o.connect(fl); fl.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
}
function timp(f, t, out) { osc('sine', f * 2, f, 0.7, 0.35, out, t); noise(0.15, 0.08, out, t, 'lowpass', 300, 100); }
function snare(t, out) { noise(0.16, 0.18, out, t, 'bandpass', 1800, 1200, 0.8); osc('triangle', 220, 150, 0.08, 0.1, out, t); }
function brass(f, t, d, out) {
  const c = AU.ctx, g = c.createGain(), fl = c.createBiquadFilter();
  fl.type = 'lowpass'; fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(2200, t + 0.08); fl.frequency.exponentialRampToValueAtTime(800, t + d);
  env(g, t, 0.03, 0.09, d); fl.connect(g); g.connect(out);
  for (const det of [-6, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(fl); o.start(t); o.stop(t + d + 0.1); }
}
function bell(f, t, out) { osc('sine', f, f, 1.2, 0.05, out, t); osc('sine', f * 2.76, f * 2.76, 0.5, 0.02, out, t); }
