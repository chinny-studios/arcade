// 11_audio: everything is synthesised with WebAudio, so the game needs no sound files. Sound effects are short
// node graphs (noise bursts, swept oscillators, formant-filtered "voices"), panned and attenuated by distance from
// the player. Music is a tiny step sequencer playing sample-free imitations of a cartridge soundfont: surf guitar,
// plucked bass, strings, vibraphone, brass and a drum kit.
const AU = { ctx: null, master: null, sfxG: null, musG: null, noise: null, loops: {}, song: null, songT: 0, step: 0, timer: null, verb: null };

function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = AU.ctx = new AC();
  AU.master = ctx.createGain(); AU.master.gain.value = 0.9; AU.master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(AU.master);
  AU.sfxG = ctx.createGain(); AU.sfxG.connect(comp);
  AU.musG = ctx.createGain(); AU.musG.connect(comp);
  // a short spring-ish reverb for the music (feedback delay)
  const d = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
  d.delayTime.value = 0.11; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2400;
  d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(AU.musG);
  AU.verb = d;
  const len = ctx.sampleRate * 1.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  AU.noise = buf;
  applyVolumes();
}
function applyVolumes() {
  if (!AU.ctx) return;
  AU.sfxG.gain.value = SET.sfx * 0.9;
  AU.musG.gain.value = SET.music * 0.32;
}

// ---------------------------------------------------------------- building blocks
function nz(t, dur, out, f0, f1, type = 'lowpass', q = 0.7, vol = 1, rate = 1) {
  const ctx = AU.ctx, s = ctx.createBufferSource(); s.buffer = AU.noise; s.playbackRate.value = rate;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function tone(t, dur, out, type, f0, f1, vol = 1, attack = 0.002) {
  const ctx = AU.ctx, o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
// a vowel-ish voice: sawtooth through two band-pass formants
function voice(t, dur, out, f0, f1, formants, vol = 1) {
  const ctx = AU.ctx, o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 7; vg.gain.value = f0 * 0.03; vib.connect(vg); vg.connect(o.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  for (const [f, q, k] of formants) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const fg = ctx.createGain(); fg.gain.value = k; o.connect(bp); bp.connect(fg); fg.connect(g); }
  g.connect(out); o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
}

const SFX = {
  pistol: (t, o) => { nz(t, 0.2, o, 4000, 300, 'lowpass', 0.7, 1.1); tone(t, 0.12, o, 'sine', 150, 45, 0.9); nz(t, 0.03, o, 6000, 3000, 'highpass', 0.5, 0.5); },
  silenced: (t, o) => { nz(t, 0.07, o, 1800, 500, 'bandpass', 1.2, 0.8); nz(t, 0.02, o, 5000, 3000, 'highpass', 0.5, 0.25); tone(t, 0.05, o, 'square', 300, 120, 0.06); },
  smg: (t, o) => { nz(t, 0.12, o, 5000, 500, 'lowpass', 0.7, 0.8); tone(t, 0.07, o, 'sine', 180, 60, 0.5); },
  rifle: (t, o) => { nz(t, 0.24, o, 5000, 250, 'lowpass', 0.8, 1.1); tone(t, 0.14, o, 'sine', 120, 38, 1); nz(t, 0.04, o, 7000, 4000, 'highpass', 0.5, 0.4); },
  shotgun: (t, o) => { nz(t, 0.45, o, 3000, 120, 'lowpass', 0.8, 1.3); tone(t, 0.25, o, 'sine', 90, 30, 1.2); },
  ray: (t, o) => { tone(t, 0.28, o, 'square', 1900, 260, 0.22); tone(t, 0.2, o, 'sawtooth', 950, 120, 0.15); nz(t, 0.1, o, 8000, 2000, 'highpass', 0.5, 0.2); },
  swish: (t, o) => nz(t, 0.16, o, 800, 2600, 'bandpass', 2, 0.35),
  throw: (t, o) => nz(t, 0.2, o, 600, 2000, 'bandpass', 2, 0.3),
  chopHit: (t, o) => { nz(t, 0.08, o, 900, 200, 'lowpass', 1, 1); tone(t, 0.08, o, 'sine', 120, 60, 0.7); },
  flesh: (t, o) => { nz(t, 0.09, o, 700, 150, 'lowpass', 1, 0.9); tone(t, 0.06, o, 'sine', 90, 50, 0.5); },
  thud: (t, o) => { nz(t, 0.2, o, 500, 80, 'lowpass', 1, 1); },
  ric: (t, o) => { tone(t, 0.3, o, 'sine', 2600 + Math.random() * 800, 900, 0.12); nz(t, 0.03, o, 6000, 3000, 'highpass', 1, 0.25); },
  ping: (t, o) => { tone(t, 0.5, o, 'sine', 1700, 1650, 0.25); tone(t, 0.4, o, 'sine', 2750, 2700, 0.15); },
  glass: (t, o) => {
    nz(t, 0.5, o, 7000, 2500, 'highpass', 0.8, 0.7);
    for (let k = 0; k < 9; k++) tone(t + Math.random() * 0.5, 0.12, o, 'sine', 3000 + Math.random() * 4000, 2800, 0.12);
  },
  boom: (t, o) => { nz(t, 1.6, o, 1400, 60, 'lowpass', 0.9, 1.6); tone(t, 0.9, o, 'sine', 70, 25, 1.4); nz(t + 0.05, 0.9, o, 3000, 400, 'bandpass', 0.6, 0.4, 0.5); },
  smash: (t, o) => { nz(t, 0.4, o, 4000, 800, 'bandpass', 0.7, 0.8); for (let k = 0; k < 5; k++) tone(t + k * 0.06, 0.05, o, 'square', 2000 + k * 300, 400, 0.08); },
  door: (t, o) => { nz(t, 0.7, o, 900, 2000, 'bandpass', 1.5, 0.25); tone(t, 0.7, o, 'sawtooth', 70, 110, 0.06, 0.05); },
  deny: (t, o) => { tone(t, 0.12, o, 'square', 220, 220, 0.18); tone(t + 0.16, 0.18, o, 'square', 165, 165, 0.18); },
  alert: (t, o) => voice(t, 0.28, o, 190, 150, [[700, 6, 1], [1150, 7, 0.6]], 0.55),
  die: (t, o) => voice(t, 0.75, o, 170, 85, [[650, 5, 1], [1050, 6, 0.6], [2600, 8, 0.15]], 0.6),
  dieCiv: (t, o) => voice(t, 0.6, o, 260, 140, [[800, 5, 1], [1300, 6, 0.6]], 0.5),
  hurt: (t, o) => { voice(t, 0.22, o, 150, 110, [[550, 5, 1], [900, 6, 0.6]], 0.5); nz(t, 0.06, o, 600, 150, 'lowpass', 1, 0.6); },
  empty: (t, o) => tone(t, 0.03, o, 'square', 1800, 1200, 0.15),
  reload: (t, o) => { nz(t, 0.05, o, 3000, 1500, 'bandpass', 3, 0.4); nz(t + 0.45, 0.05, o, 2500, 1200, 'bandpass', 3, 0.5); nz(t + 0.8, 0.07, o, 3500, 1800, 'bandpass', 3, 0.45); },
  switch: (t, o) => { nz(t, 0.04, o, 2500, 1200, 'bandpass', 3, 0.3); nz(t + 0.2, 0.04, o, 3000, 1500, 'bandpass', 3, 0.3); },
  pickup: (t, o) => { nz(t, 0.04, o, 3000, 1500, 'bandpass', 3, 0.5); nz(t + 0.09, 0.05, o, 3500, 2000, 'bandpass', 3, 0.5); },
  pickupKey: (t, o) => { [0, 4, 7, 12].forEach((s, k) => tone(t + k * 0.07, 0.15, o, 'square', 523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 0.1)); },
  objective: (t, o) => { [0, 7, 12, 16].forEach((s, k) => tone(t + k * 0.09, 0.4, o, 'triangle', 392 * Math.pow(2, s / 12), 392 * Math.pow(2, s / 12), 0.25)); },
  failed: (t, o) => { [0, -1, -5].forEach((s, k) => tone(t + k * 0.18, 0.4, o, 'sawtooth', 220 * Math.pow(2, s / 12), 210 * Math.pow(2, s / 12), 0.12)); },
  shutter: (t, o) => { nz(t, 0.03, o, 5000, 3000, 'highpass', 1, 0.5); nz(t + 0.05, 0.05, o, 4000, 2000, 'bandpass', 2, 0.4); tone(t + 0.1, 0.25, o, 'sine', 900, 1400, 0.05); },
  plant: (t, o) => { tone(t, 0.08, o, 'square', 1200, 1200, 0.12); tone(t + 0.12, 0.08, o, 'square', 1600, 1600, 0.12); },
  stick: (t, o) => { nz(t, 0.05, o, 1200, 400, 'lowpass', 1, 0.6); tone(t, 0.08, o, 'square', 900, 900, 0.05); },
  beep: (t, o) => tone(t, 0.1, o, 'square', 1500, 1500, 0.15),
  alarmStart: (t, o) => { tone(t, 0.3, o, 'square', 600, 600, 0.12); tone(t + 0.3, 0.3, o, 'square', 800, 800, 0.12); },
  menu: (t, o) => tone(t, 0.05, o, 'square', 880, 880, 0.08),
  menuOk: (t, o) => { tone(t, 0.06, o, 'square', 880, 880, 0.08); tone(t + 0.06, 0.1, o, 'square', 1320, 1320, 0.08); },
  heart: (t, o) => tone(t, 0.12, o, 'sine', 70, 40, 0.5),
};
const SFX_RANGE = { pistol: 70, rifle: 80, shotgun: 80, smg: 70, ray: 60, boom: 120, glass: 50, silenced: 25, alert: 35, die: 40, dieCiv: 40, door: 25, ric: 30, flesh: 30 };
function sfx(name, pos) {
  if (!AU.ctx || !SFX[name] || G.state === 'boot') return;
  const ctx = AU.ctx, t = ctx.currentTime + 0.005;
  let out = AU.sfxG;
  if (pos && G.player && pos.x !== undefined) {
    const p = G.player, dx = pos.x - p.x, dz = pos.z - p.z, d = Math.hypot(dx, dz, (pos.y || 0) - p.y);
    const range = SFX_RANGE[name] || 40;
    if (d > range) return;
    const g = ctx.createGain(); g.gain.value = Math.pow(1 - d / range, 1.6);
    out = g;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      const rel = angDiff(p.yaw, yawTo(dx, dz));
      pan.pan.value = d < 0.5 ? 0 : clamp(-Math.sin(rel), -0.85, 0.85);
      g.connect(pan); pan.connect(AU.sfxG);
    } else g.connect(AU.sfxG);
  }
  SFX[name](t, out);
}
function loopSfx(name) {
  if (!AU.ctx || AU.loops[name]) return;
  const ctx = AU.ctx;
  if (name === 'alarm') {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = 700; lfo.type = 'square'; lfo.frequency.value = 1.5; lg.gain.value = 120;
    lfo.connect(lg); lg.connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 1800; g.gain.value = 0.06;
    o.connect(f); f.connect(g); g.connect(AU.sfxG); o.start(); lfo.start();
    AU.loops[name] = { stop: () => { try { o.stop(); lfo.stop(); } catch (e) { /* already stopped */ } g.disconnect(); } };
  }
}
function stopLoop(name) { const l = AU.loops[name]; if (l) { l.stop(); delete AU.loops[name]; } }
function stopAllLoops() { for (const k in AU.loops) stopLoop(k); }

// ---------------------------------------------------------------- music
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function midi(n) { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return m ? NOTE[m[1]] + (+m[2] + 1) * 12 : null; }
const mhz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// "E4:2 G4:1 r:1" -> [[step, midi, len]]
function seq(str) {
  const out = []; let s = 0;
  for (const tok of str.trim().split(/\s+/)) { const [n, l] = tok.split(':'); const len = +(l || 1); if (n !== 'r') out.push([s, midi(n), len]); s += len; }
  return { notes: out, len: s };
}
function inst(name, t, m, dur, vel, out) {
  const ctx = AU.ctx, f = mhz(m);
  const env = (g, a, d, s, r, v) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * s), t + a + d); g.gain.setValueAtTime(Math.max(0.0002, v * s), t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r); };
  const osc = (type, fr, det = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = det; return o; };
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  g.connect(out);
  let oscs = [], stopAt = t + dur + 0.6;
  switch (name) {
    case 'bass': oscs = [osc('triangle', f), osc('sawtooth', f, 4)]; lp.frequency.value = 700; env(g, 0.005, 0.25, 0.4, 0.08, 0.5 * vel); break;
    case 'gtr': {
      oscs = [osc('sawtooth', f), osc('square', f, 8)];
      lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.4); lp.Q.value = 2;
      env(g, 0.004, 0.35, 0.35, 0.15, 0.18 * vel);
      const vib = osc('sine', 5.5), vg = ctx.createGain(); vg.gain.value = 9; vib.connect(vg); for (const o of oscs) vg.connect(o.detune); vib.start(t); vib.stop(stopAt);
      g.connect(AU.verb);
      break;
    }
    case 'brass': oscs = [osc('sawtooth', f), osc('sawtooth', f, -7)]; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(2200, t + 0.06); lp.frequency.linearRampToValueAtTime(1400, t + 0.3); env(g, 0.03, 0.2, 0.7, 0.12, 0.13 * vel); break;
    case 'str': oscs = [osc('sawtooth', f, -9), osc('sawtooth', f, 9)]; lp.frequency.value = 1500; env(g, 0.18, 0.3, 0.8, 0.4, 0.07 * vel); g.connect(AU.verb); break;
    case 'vib': {
      oscs = [osc('sine', f), osc('sine', f * 4, 0)]; lp.frequency.value = 5000; env(g, 0.003, 0.8, 0.15, 0.5, 0.2 * vel);
      const trem = osc('sine', 6), tg = ctx.createGain(); tg.gain.value = 0.06; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(stopAt);
      g.connect(AU.verb);
      break;
    }
    case 'org': oscs = [osc('square', f), osc('sine', f * 2)]; lp.frequency.value = 1800; env(g, 0.01, 0.1, 0.7, 0.08, 0.07 * vel); break;
    case 'kick': { const o = osc('sine', 120); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); oscs = [o]; lp.frequency.value = 800; env(g, 0.002, 0.18, 0.01, 0.05, 0.8 * vel); stopAt = t + 0.3; break; }
    case 'snare': nz(t, 0.16, out, 4000, 1500, 'bandpass', 0.8, 0.35 * vel); tone(t, 0.08, out, 'triangle', 220, 160, 0.25 * vel); return;
    case 'roll': for (let k = 0; k < 4; k++) nz(t + k * dur / 4, 0.06, out, 4500, 2000, 'bandpass', 0.8, 0.15 * vel * (0.6 + k * 0.1)); return;
    case 'hat': nz(t, 0.04, out, 9000, 7000, 'highpass', 0.7, 0.12 * vel); return;
    case 'tom': tone(t, 0.25, out, 'sine', f, f * 0.6, 0.45 * vel); return;
    case 'bongo': tone(t, 0.1, out, 'sine', f, f * 0.8, 0.35 * vel); return;
    default: return;
  }
  for (const o of oscs) { o.connect(lp); o.start(t); o.stop(stopAt); }
  lp.connect(g);
}
// Songs: tracks of [inst, seq string] that loop over `bars` bars of 16 steps.
const SONGS = {
  title: {
    bpm: 118, bars: 4, tracks: [
      ['bass', 'E2:2 E2:1 E3:1 r:2 E2:2 G2:2 A2:2 Bb2:2 A2:2 | C2:2 C2:1 C3:1 r:2 C2:2 E2:2 G2:2 A2:2 G2:2 | A1:2 A1:1 A2:1 r:2 A1:2 C2:2 E2:2 G2:2 E2:2 | B1:2 B1:1 B2:1 r:2 B1:2 D#2:2 F#2:2 A2:2 F#2:2'],
      ['gtr', 'E4:3 G4:1 B4:4 A4:2 G4:2 F#4:2 G4:2 | E4:3 G4:1 C5:4 B4:2 A4:2 G4:4 | A4:3 C5:1 E5:4 D5:2 C5:2 B4:2 A4:2 | B4:4 A4:2 G4:2 F#4:2 D#4:2 E4:4'],
      ['str', 'B3:16 | C4:16 | C4:16 | B3:16'],
      ['str', 'G3:16 | G3:16 | A3:16 | D#4:16'],
      ['kick', 'C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:2 C2:2'],
      ['snare', 'r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:2 C3:1 C3:1'],
      ['hat', 'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2'],
    ],
  },
  steppe: {
    bpm: 124, bars: 8, tracks: [
      ['bass', 'E2:2 r:1 E2:1 B2:2 E2:2 r:1 E2:1 G2:2 F#2:2 E2:2 | E2:2 r:1 E2:1 B2:2 E2:2 r:1 E2:1 Bb2:2 A2:2 G2:2 | C2:2 r:1 C2:1 G2:2 C2:2 r:1 C2:1 E2:2 D2:2 C2:2 | B1:2 r:1 B1:1 F#2:2 B1:2 r:1 B1:1 A2:2 F#2:2 D#2:2 | E2:2 r:1 E2:1 B2:2 E2:2 r:1 E2:1 G2:2 F#2:2 E2:2 | A1:2 r:1 A1:1 E2:2 A1:2 r:1 A1:1 C2:2 B1:2 A1:2 | C2:2 r:1 C2:1 G2:2 C2:2 B1:2 B1:2 F#2:2 B1:2 | E2:2 r:2 E2:2 r:2 B1:2 r:2 E2:4'],
      ['gtr', 'r:8 E4:2 F#4:1 G4:1 B4:4 | A4:2 G4:2 F#4:4 E4:8 | r:8 C5:2 B4:1 A4:1 G4:4 | F#4:3 G4:1 A4:4 B4:8 | E5:4 D5:2 B4:2 G4:4 A4:2 B4:2 | C5:4 B4:2 A4:2 E4:8 | G4:2 A4:2 B4:4 D#5:4 F#5:4 | E5:12 r:4'],
      ['brass', 'r:16 | r:16 | r:16 | r:12 B3:2 B3:2 | E4:2 r:6 E4:2 r:6 | r:16 | E4:2 r:2 E4:2 r:2 D#4:4 F#4:4 | E4:8 r:8'],
      ['str', 'B3:16 | B3:16 | G3:16 | F#3:16 | B3:16 | C4:16 | G3:8 F#3:8 | G3:16'],
      ['kick', 'C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4 | C2:4 C2:4 C2:4 C2:4'],
      ['roll', 'r:4 C3:2 r:2 r:4 C3:2 r:2 | r:4 C3:2 r:2 r:4 C3:2 C3:2 | r:4 C3:2 r:2 r:4 C3:2 r:2 | r:4 C3:2 r:2 C3:2 C3:2 C3:2 C3:2 | r:4 C3:2 r:2 r:4 C3:2 r:2 | r:4 C3:2 r:2 r:4 C3:2 C3:2 | r:4 C3:2 r:2 r:4 C3:2 r:2 | r:4 C3:2 r:2 C3:2 C3:2 C3:2 C3:2'],
      ['hat', 'C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2'],
    ],
  },
  station: {
    bpm: 96, bars: 8, tracks: [
      ['vib', 'D4:2 F4:2 A4:2 D5:2 A4:2 F4:2 A4:2 F4:2 | D4:2 F4:2 A4:2 D5:2 A4:2 F4:2 A4:2 F4:2 | Bb3:2 D4:2 F4:2 A4:2 F4:2 D4:2 F4:2 D4:2 | Bb3:2 D4:2 F4:2 A4:2 F4:2 D4:2 F4:2 D4:2 | G3:2 Bb3:2 D4:2 G4:2 D4:2 Bb3:2 D4:2 Bb3:2 | G3:2 Bb3:2 D4:2 G4:2 D4:2 Bb3:2 D4:2 Bb3:2 | A3:2 C#4:2 E4:2 A4:2 E4:2 C#4:2 E4:2 C#4:2 | A3:2 C#4:2 E4:2 G4:2 E4:2 C#4:2 A3:4'],
      ['bass', 'D2:4 r:2 D2:2 A2:4 D2:4 | D2:4 r:2 D2:2 C3:4 A2:4 | Bb1:4 r:2 Bb1:2 F2:4 Bb1:4 | Bb1:4 r:2 Bb1:2 A2:4 F2:4 | G1:4 r:2 G1:2 D2:4 G1:4 | G1:4 r:2 G1:2 F2:4 D2:4 | A1:4 r:2 A1:2 E2:4 A1:4 | A1:4 r:2 A1:2 C#2:4 E2:4'],
      ['str', 'A3:16 | A3:16 | F3:16 | F3:16 | D3:16 | D3:16 | E3:16 | C#3:16'],
      ['gtr', 'r:16 | r:8 A4:2 G4:2 F4:2 E4:2 | D4:8 r:8 | r:8 F4:2 G4:2 A4:2 C5:2 | Bb4:6 A4:2 G4:8 | r:8 D5:4 C5:2 Bb4:2 | A4:6 G4:2 E4:4 C#4:4 | D4:4 E4:4 r:8'],
      ['kick', 'C2:8 C2:8 | C2:8 C2:8 | C2:8 C2:8 | C2:8 C2:8 | C2:8 C2:8 | C2:8 C2:8 | C2:8 C2:8 | C2:8 C2:4 C2:4'],
      ['hat', 'r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2 | r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2 | r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2 | r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2 | r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2 | r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2 | r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2 | r:2 C5:2 r:2 C5:2 r:2 C5:2 r:2 C5:2'],
      ['bongo', 'r:6 G4:1 G4:1 r:4 D5:2 G4:2 | r:6 G4:1 G4:1 r:4 D5:2 G4:2 | r:6 G4:1 G4:1 r:4 D5:2 G4:2 | r:6 G4:1 G4:1 r:4 D5:2 G4:2 | r:6 G4:1 G4:1 r:4 D5:2 G4:2 | r:6 G4:1 G4:1 r:4 D5:2 G4:2 | r:6 G4:1 G4:1 r:4 D5:2 G4:2 | r:6 G4:1 G4:1 r:4 D5:2 G4:2'],
    ],
  },
  moon: {
    bpm: 136, bars: 8, tracks: [
      ['bass', 'A1:1 A1:1 A2:1 A1:1 A1:1 A1:1 G2:1 A1:1 A1:1 A1:1 E2:1 A1:1 C2:1 A1:1 D2:1 E2:1 | A1:1 A1:1 A2:1 A1:1 A1:1 A1:1 G2:1 A1:1 A1:1 A1:1 E2:1 A1:1 C2:1 A1:1 Eb2:1 E2:1 | F1:1 F1:1 F2:1 F1:1 F1:1 F1:1 Eb2:1 F1:1 F1:1 F1:1 C2:1 F1:1 A1:1 F1:1 C2:1 D2:1 | E1:1 E1:1 E2:1 E1:1 E1:1 E1:1 D2:1 E1:1 E1:1 E1:1 B1:1 E1:1 G#1:1 E1:1 B1:1 D2:1 | A1:1 A1:1 A2:1 A1:1 A1:1 A1:1 G2:1 A1:1 A1:1 A1:1 E2:1 A1:1 C2:1 A1:1 D2:1 E2:1 | D2:1 D2:1 D3:1 D2:1 D2:1 D2:1 C3:1 D2:1 D2:1 D2:1 A2:1 D2:1 F2:1 D2:1 A2:1 C3:1 | F1:1 F1:1 F2:1 F1:1 F1:1 F1:1 Eb2:1 F1:1 E1:1 E1:1 E2:1 E1:1 E1:1 E1:1 G#1:1 B1:1 | A1:2 r:2 A1:2 r:2 E1:2 r:2 A1:4'],
      ['brass', 'A3:2 r:2 A3:1 A3:1 C4:2 r:4 B3:2 G3:2 | A3:2 r:2 A3:1 A3:1 E4:2 r:4 Eb4:2 D4:2 | C4:2 r:2 C4:1 C4:1 F4:2 r:4 Eb4:2 C4:2 | B3:2 r:2 B3:1 B3:1 E4:2 r:4 D4:2 G#3:2 | A3:2 r:2 A3:1 A3:1 C4:2 r:4 B3:2 G3:2 | D4:2 r:2 D4:1 D4:1 F4:2 r:4 E4:2 C4:2 | C4:4 Eb4:4 B3:4 G#3:4 | A3:8 r:8'],
      ['gtr', 'E5:4 D5:2 C5:2 B4:4 A4:4 | G4:2 A4:2 B4:2 C5:2 E5:8 | F5:4 E5:2 D5:2 C5:4 A4:4 | G#4:4 B4:4 E5:8 | E5:4 D5:2 C5:2 B4:4 A4:4 | F5:4 E5:2 D5:2 A5:8 | G5:4 F5:2 Eb5:2 E5:4 G#5:4 | A5:8 r:8'],
      ['str', 'E3:16 | E3:16 | C3:16 | B2:16 | E3:16 | F3:16 | C3:8 B2:8 | A2:16'],
      ['kick', 'C2:4 C2:4 C2:4 C2:2 C2:2 | C2:4 C2:4 C2:4 C2:2 C2:2 | C2:4 C2:4 C2:4 C2:2 C2:2 | C2:4 C2:4 C2:4 C2:2 C2:2 | C2:4 C2:4 C2:4 C2:2 C2:2 | C2:4 C2:4 C2:4 C2:2 C2:2 | C2:4 C2:4 C2:4 C2:2 C2:2 | C2:4 C2:4 C2:4 C2:4'],
      ['snare', 'r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:2 C3:2 | r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:4 | r:4 C3:4 r:4 C3:4 | C3:2 C3:2 C3:2 C3:2 C3:1 C3:1 C3:1 C3:1 C3:4'],
      ['tom', 'r:16 | r:16 | r:16 | r:12 A3:2 E3:2 | r:16 | r:16 | r:16 | r:8 A3:2 G3:2 E3:2 D3:2'],
      ['hat', 'C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 | C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 C5:1 | C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2 C5:2'],
    ],
  },
  win: { bpm: 120, bars: 2, once: true, tracks: [['brass', 'E4:2 G4:2 B4:2 E5:10 | D#5:4 E5:12'], ['str', 'G3:16 | G3:16'], ['str', 'B3:16 | B3:16'], ['bass', 'E2:4 E2:4 E2:4 E2:4 | B1:4 E2:12'], ['snare', 'C3:1 C3:1 C3:2 r:12 | r:16']] },
  lose: { bpm: 80, bars: 2, once: true, tracks: [['brass', 'E4:4 D#4:4 D4:4 C#4:4 | C4:16'], ['str', 'G3:16 | F#3:16'], ['bass', 'E2:8 Eb2:8 | D2:16']] },
};
// compile "|"-separated bars into absolute steps
for (const k in SONGS) {
  const s = SONGS[k];
  s.parts = s.tracks.map(([ins, str]) => {
    const notes = []; let bar = 0;
    for (const chunk of str.split('|')) { const q = seq(chunk); for (const n of q.notes) notes.push([bar * 16 + n[0], n[1], n[2]]); bar++; }
    return { ins, notes };
  });
  s.steps = s.bars * 16;
}
function playMusic(name) {
  if (!AU.ctx) { AU.pending = name; return; }
  if (AU.song && AU.song.name === name) return;
  stopMusic();
  const s = SONGS[name];
  if (!s) return;
  AU.song = { name, s, step: 0, t: AU.ctx.currentTime + 0.1 };
  AU.timer = setInterval(scheduleMusic, 30);
  scheduleMusic();
}
function stopMusic() { if (AU.timer) clearInterval(AU.timer); AU.timer = null; AU.song = null; }
function scheduleMusic() {
  const S = AU.song;
  if (!S || !AU.ctx) return;
  const stepDur = 60 / S.s.bpm / 4;
  while (S.t < AU.ctx.currentTime + 0.2) {
    const st = S.step % S.s.steps;
    for (const p of S.s.parts) for (const n of p.notes) if (n[0] === st) inst(p.ins, S.t, n[1] === null ? 60 : n[1], n[2] * stepDur * 0.92, 1, AU.musG);
    S.t += stepDur; S.step++;
    if (S.s.once && S.step >= S.s.steps) { stopMusic(); return; }
  }
}
