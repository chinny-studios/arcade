// Audio: one AudioContext with sfx, music and voice buses, and every system sound (all synthesized, all original).
const AU = { ctx: null, master: null, sfx: null, music: null, voice: null, analyser: null, noise: null, muted: false, curve: null };
function ac() {
  if (AU.ctx) return AU.ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    const c = AU.ctx = new C();
    AU.master = c.createGain(); AU.master.gain.value = AU.muted ? 0 : S.vol; AU.master.connect(c.destination);
    AU.sfx = c.createGain(); AU.sfx.gain.value = 0.55; AU.sfx.connect(AU.master);
    AU.music = c.createGain(); AU.music.gain.value = 0.8;
    AU.analyser = c.createAnalyser(); AU.analyser.fftSize = 1024; AU.analyser.smoothingTimeConstant = 0.72;
    AU.music.connect(AU.analyser); AU.analyser.connect(AU.master);
    AU.voice = c.createGain(); AU.voice.gain.value = 0.9; AU.voice.connect(AU.master);
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = b;
    const n = 1024, cv = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * 6) * 0.8; }
    AU.curve = cv;
  } catch (e) { AU.ctx = null; return null; }
  return AU.ctx;
}
function unlockAudio() { const c = ac(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
function setVolume(v) { S.vol = v; save(); if (AU.master) AU.master.gain.value = AU.muted ? 0 : v; }
function setMuted(m) { AU.muted = m; if (AU.master) AU.master.gain.value = m ? 0 : S.vol; emit('mute', m); }
const now = () => (AU.ctx ? AU.ctx.currentTime : 0);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// tone({ f, f2, type, at, t, d, v, a, r, dest, q, lp, hp, bp, det })  t = delay from now; at = absolute ctx time
function tone(o) {
  const c = ac(); if (!c) return;
  const t0 = o.at != null ? o.at : c.currentTime + (o.t || 0);
  const osc = c.createOscillator(); osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.det) osc.detune.value = o.det;
  const d = o.d ?? 0.2, a = o.a ?? 0.005, r = o.r ?? 0.06, v = o.v ?? 0.3;
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + (o.glide ?? d));
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
  if (o.sus == null) g.gain.setValueAtTime(v, t0 + Math.max(a, d - 0.001)); else g.gain.exponentialRampToValueAtTime(Math.max(1e-4, v * o.sus), t0 + d);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + r);
  let node = osc;
  const filt = (type, f, q) => { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; node.connect(fl); node = fl; };
  if (o.lp) filt('lowpass', o.lp, o.q); if (o.hp) filt('highpass', o.hp); if (o.bp) filt('bandpass', o.bp, o.q || 4);
  node.connect(g); g.connect(o.dest || AU.sfx);
  osc.start(t0); osc.stop(t0 + d + r + 0.05);
  return osc;
}
function noise(o) {
  const c = ac(); if (!c || !AU.noise) return;
  const t0 = o.at != null ? o.at : c.currentTime + (o.t || 0);
  const src = c.createBufferSource(); src.buffer = AU.noise; src.loop = true;
  const d = o.d ?? 0.2, a = o.a ?? 0.003, r = o.r ?? 0.05, v = o.v ?? 0.2;
  let node = src;
  const filt = (type, f, q, f2) => { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + d); if (q) fl.Q.value = q; node.connect(fl); node = fl; };
  if (o.lp) filt('lowpass', o.lp, o.q, o.lp2); if (o.hp) filt('highpass', o.hp, 0, o.hp2); if (o.bp) filt('bandpass', o.bp, o.q || 2, o.bp2);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
  if (o.sus != null) g.gain.exponentialRampToValueAtTime(Math.max(1e-4, v * o.sus), t0 + d); else g.gain.setValueAtTime(v, t0 + Math.max(a, d - 0.001));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + r);
  node.connect(g); g.connect(o.dest || AU.sfx);
  src.start(t0, Math.random() * 1.5); src.stop(t0 + d + r + 0.05);
}
function bell(f, t = 0, v = 0.2, d = 0.9, dest) {
  tone({ f, t, d: 0.02, v, r: d, type: 'sine', dest });
  tone({ f: f * 2.01, t, d: 0.01, v: v * 0.35, r: d * 0.5, type: 'sine', dest });
  tone({ f: f * 3.03, t, d: 0.01, v: v * 0.12, r: d * 0.3, type: 'sine', dest });
}
const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336] };

const SFX = {
  ding() { bell(1318.5, 0, 0.18, 0.7); },
  chord() { bell(523.25, 0, 0.14, 0.9); bell(659.25, 0.07, 0.12, 0.9); bell(783.99, 0.14, 0.12, 1); },
  error() { bell(880, 0, 0.18, 0.5); bell(587.33, 0.12, 0.2, 0.8); },
  exclaim() { bell(987.77, 0, 0.16, 0.4); bell(987.77, 0.14, 0.16, 0.7); },
  question() { bell(783.99, 0, 0.14, 0.4); bell(1046.5, 0.12, 0.14, 0.7); },
  click() { tone({ f: 1800, d: 0.008, v: 0.06, r: 0.01, type: 'square' }); },
  menu() { tone({ f: 2400, d: 0.004, v: 0.03, r: 0.01, type: 'square' }); },
  startup() {
    const c = ac(); if (!c) return;
    // a warm, rising pad with a bell melody on top (original)
    const chords = [[53, 60, 65, 69], [55, 62, 67, 71], [57, 64, 69, 72, 76]];
    chords.forEach((ch, i) => ch.forEach((m) => {
      tone({ f: mtof(m), t: i * 1.1, d: i === 2 ? 2.2 : 1.1, a: 0.35, r: i === 2 ? 1.8 : 0.4, v: 0.045, type: 'sawtooth', lp: 1400, det: rnd(-8, 8) });
      tone({ f: mtof(m), t: i * 1.1, d: i === 2 ? 2.2 : 1.1, a: 0.3, r: i === 2 ? 1.8 : 0.4, v: 0.05, type: 'triangle' });
    }));
    [76, 79, 84, 83, 88].forEach((m, i) => bell(mtof(m), 0.25 + i * 0.55, 0.09, 1.6));
    noise({ t: 2.2, d: 1.6, a: 0.8, r: 1.4, v: 0.03, bp: 3000, q: 0.6 });
  },
  shutdown() { [[72, 0], [67, 0.35], [64, 0.7], [60, 1.05]].forEach(([m, t]) => { bell(mtof(m), t, 0.1, 1.4); tone({ f: mtof(m - 12), t, d: 0.6, a: 0.1, r: 0.8, v: 0.05, type: 'triangle' }); }); },
  tada() {
    [[60, 0], [64, 0.09], [67, 0.18], [72, 0.27]].forEach(([m, t]) => tone({ f: mtof(m), t, d: 0.09, v: 0.08, type: 'sawtooth', lp: 2600, r: 0.05 }));
    [60, 64, 67, 72, 76].forEach((m) => tone({ f: mtof(m), t: 0.38, d: 0.7, a: 0.02, v: 0.05, type: 'sawtooth', lp: 3000, r: 0.6, det: rnd(-6, 6) }));
    noise({ t: 0.38, d: 0.05, v: 0.12, hp: 5000, r: 0.6 });
  },
  recycle() { for (let i = 0; i < 6; i++) noise({ t: i * 0.05 + rnd(0.03), d: 0.03, v: 0.12, bp: rnd(1500, 4000), q: 1.5, r: 0.03 }); },
  doorOpen() {
    // a creaky door: a slow, jittery squeak, then the latch
    const c = ac(); if (!c) return;
    const t0 = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(380, t0);
    for (let i = 1; i < 14; i++) o.frequency.linearRampToValueAtTime(380 + i * 22 + rnd(-40, 40), t0 + i * 0.045);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.13, t0 + 0.05);
    for (let i = 1; i < 14; i++) g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.1, t0 + i * 0.045);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    o.connect(f); f.connect(g); g.connect(AU.sfx); o.start(t0); o.stop(t0 + 0.75);
    noise({ t: 0.66, d: 0.03, v: 0.22, bp: 900, q: 2, r: 0.06 });
  },
  doorClose() { noise({ d: 0.06, v: 0.35, lp: 500, r: 0.18 }); tone({ f: 90, f2: 50, d: 0.12, v: 0.4, r: 0.1 }); noise({ t: 0.09, d: 0.02, v: 0.12, bp: 2500, r: 0.05 }); },
  imIn() { tone({ f: 784, d: 0.07, v: 0.16, type: 'triangle', r: 0.05 }); tone({ f: 1175, t: 0.09, d: 0.12, v: 0.16, type: 'triangle', r: 0.12 }); },
  imOut() { tone({ f: 600, f2: 900, d: 0.08, v: 0.1, type: 'triangle', r: 0.05 }); },
  warn() { tone({ f: 220, d: 0.25, v: 0.15, type: 'square', lp: 900, r: 0.05 }); tone({ f: 196, t: 0.25, d: 0.35, v: 0.15, type: 'square', lp: 900 }); },
  pop() { tone({ f: 500, f2: 1400, d: 0.05, v: 0.12, r: 0.03 }); },
  bsod() { tone({ f: 880, d: 0.3, v: 0.12, type: 'square', lp: 2000 }); },
  coin() { tone({ f: 988, d: 0.07, v: 0.1, type: 'square' }); tone({ f: 1319, t: 0.07, d: 0.25, v: 0.1, type: 'square', r: 0.15 }); },
  mail() {
    bell(880, 0, 0.1, 0.5); bell(1175, 0.15, 0.1, 0.7);
  },
  pickup() {
    // someone picks up the extension: a click, the modem noise breaking up, a dial tone
    noise({ d: 0.03, v: 0.4, bp: 2000, r: 0.05 });
    noise({ t: 0.05, d: 0.6, v: 0.18, bp: 1800, q: 0.7, r: 0.2 });
    tone({ f: 350, t: 0.8, d: 1.2, v: 0.06 }); tone({ f: 440, t: 0.8, d: 1.2, v: 0.06 });
  },
  modem() {
    // a dial-up handshake, about 9 seconds (original synthesis, loosely after the real sequence of tones)
    const c = ac(); if (!c || !S.modemSound) return 0;
    const V = 0.07;
    tone({ f: 350, d: 0.9, v: V }); tone({ f: 440, d: 0.9, v: V });
    let t = 1.0;
    for (const dg of '5550142') { const [a, b] = DTMF[dg]; tone({ f: a, t, d: 0.08, v: V }); tone({ f: b, t, d: 0.08, v: V }); t += 0.13; }
    t += 0.3;
    tone({ f: 440, t, d: 0.8, v: V * 0.7 }); tone({ f: 480, t, d: 0.8, v: V * 0.7 });
    t += 1.2;
    for (let i = 0; i < 3; i++) tone({ f: 2100, t: t + i * 0.4, d: 0.38, v: V * 0.8, r: 0.01 });
    t += 1.3;
    for (let i = 0; i < 10; i++) tone({ f: pick([980, 1180, 1650, 1850]), t: t + i * 0.07, d: 0.065, v: V * 0.8, r: 0.005, type: 'square', lp: 2500 });
    t += 0.8;
    noise({ t, d: 0.5, v: 0.08, bp: 1800, q: 1.2, bp2: 2600 });
    for (let i = 0; i < 4; i++) tone({ f: 600 + i * 120, t: t + 0.5 + i * 0.16, d: 0.12, v: V, type: 'sine' });
    tone({ f: 1200, f2: 2400, t: t + 0.6, d: 0.6, v: V * 0.5, type: 'sawtooth', lp: 3000 });
    t += 1.3;
    noise({ t, d: 1.6, v: 0.09, bp: 1700, q: 0.4, r: 0.1 });
    noise({ t: t + 0.3, d: 1.2, v: 0.06, hp: 2400, r: 0.05 });
    tone({ f: 1800, t, d: 1.6, v: V * 0.4, type: 'square', lp: 2000 });
    return t + 1.7;
  },
};
