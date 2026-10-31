// Procedural sound: filtered noise for each tool (louder the faster you scrub), a soft chime per finished part,
// a chord for the reveal and a watch tick.
const AU = { ctx: null, on: SAVE.sound !== false, lvl: 0 };
const TOOL_SND = {
  solvent: { type: 'bandpass', f: 2600, q: 0.6, g: 0.16, grit: 0.1 },
  wire: { type: 'highpass', f: 4200, q: 0.9, g: 0.22, grit: 0.7 },
  sand: { type: 'bandpass', f: 1300, q: 0.45, g: 0.3, grit: 0.35 },
  polish: { type: 'bandpass', f: 820, q: 2.2, g: 0.2, grit: 0.15 },
  finish: { type: 'bandpass', f: 1900, q: 0.8, g: 0.1, grit: 0.05 },
};
function auInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const ctx = AU.ctx = new C();
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2; }
  AU.master = ctx.createGain(); AU.master.gain.value = AU.on ? 0.9 : 0; AU.master.connect(ctx.destination);
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  AU.filt = ctx.createBiquadFilter(); AU.grit = ctx.createGain(); AU.brush = ctx.createGain(); AU.brush.gain.value = 0;
  src.connect(AU.filt); AU.filt.connect(AU.grit); AU.grit.connect(AU.brush); AU.brush.connect(AU.master);
  src.start();
  AU.noise = buf;
}
function auSetOn(on) { AU.on = on; SAVE.sound = on; writeSave(); if (AU.master) AU.master.gain.setTargetAtTime(on ? 0.9 : 0, AU.ctx.currentTime, 0.05); }
// level 0..1 from scrub speed, called every frame
function auBrush(level, tool, dt) {
  if (!AU.ctx) return;
  const s = TOOL_SND[tool] || TOOL_SND.solvent, t = AU.ctx.currentTime;
  AU.lvl = damp(AU.lvl, level, level > AU.lvl ? 30 : 10, dt);
  if (AU.filt.type !== s.type) AU.filt.type = s.type;
  AU.filt.frequency.setTargetAtTime(s.f * (0.85 + AU.lvl * 0.3), t, 0.03);
  AU.filt.Q.setTargetAtTime(s.q, t, 0.05);
  AU.grit.gain.setTargetAtTime(1 - s.grit + s.grit * Math.random() * 2, t, 0.01);
  AU.brush.gain.setTargetAtTime(AU.lvl * s.g, t, 0.025);
}
function tone(freq, dur, gain, type = 'sine', when = 0) {
  if (!AU.ctx || !AU.on) return;
  const t = AU.ctx.currentTime + when, o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.05);
}
function auClick() { tone(1400, 0.05, 0.05, 'triangle'); }
function auChime() { tone(1318.5, 1.6, 0.06); tone(1975.5, 1.2, 0.03, 'sine', 0.05); tone(2637, 0.8, 0.015, 'sine', 0.05); }
function auReveal() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { tone(f, 3.2, 0.05, 'sine', i * 0.11); tone(f * 2.01, 1.6, 0.012, 'sine', i * 0.11); }); }
function auTick() {
  if (!AU.ctx || !AU.on) return;
  const t = AU.ctx.currentTime, s = AU.ctx.createBufferSource(), f = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain();
  s.buffer = AU.noise; f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 6;
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random()); s.stop(t + 0.04);
}

// The radio's broadcast for its reveal: static while the needle travels, then a little parlour waltz,
// band-limited like medium wave. Scheduled a beat ahead from a timer.
function auRadio(on) {
  if (!AU.ctx) return;
  const ctx = AU.ctx, now = ctx.currentTime;
  if (!on) {
    const r = AU.radio; if (!r) return;
    AU.radio = null; clearInterval(r.timer);
    r.out.gain.setTargetAtTime(0, now, 0.15);
    setTimeout(() => { try { r.st.stop(); r.out.disconnect(); } catch (e) { /* already stopped */ } }, 1200);
    return;
  }
  if (AU.radio) return;
  const out = ctx.createGain(); out.gain.value = 0; out.connect(AU.master);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.8;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
  const mus = ctx.createGain(); mus.gain.value = 0;
  mus.connect(lp); lp.connect(hp); hp.connect(out);
  const st = ctx.createBufferSource(); st.buffer = AU.noise; st.loop = true;
  const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1700; sf.Q.value = 0.6;
  const sg = ctx.createGain(); sg.gain.value = 0.22;
  st.connect(sf); sf.connect(sg); sg.connect(out); st.start();
  out.gain.setTargetAtTime(0.75, now, 0.2);
  sg.gain.setTargetAtTime(0.025, now + 2.4, 0.5);
  mus.gain.setTargetAtTime(1, now + 2.2, 0.7);
  const beat = 60 / 138, bars = [[48, 60, 64, 67], [45, 60, 64, 69], [41, 60, 65, 69], [43, 59, 62, 65], [48, 60, 64, 67], [52, 59, 64, 67], [50, 62, 65, 69], [43, 59, 62, 67]];
  // melody: chord tones, one per beat, with a pick-up turn every other bar
  const shape = [[3, 2, 1], [3, 3, 2], [1, 2, 3], [3, 2, 0], [2, 3, 3], [1, 2, 1], [3, 2, 1], [2, 1, 0]];
  const note = (m, t, dur, g, type = 'triangle') => {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.015); e.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(e); e.connect(mus); o.start(t); o.stop(t + dur + 0.05);
  };
  const r = AU.radio = { out, st, step: 0, next: now + 2.2 };
  r.timer = setInterval(() => {
    while (r.next < ctx.currentTime + 0.6) {
      const bar = Math.floor(r.step / 3) % 8, b = r.step % 3, ch = bars[bar];
      if (b === 0) note(ch[0], r.next, beat * 1.4, 0.16, 'sine');
      else { note(ch[1], r.next, beat * 0.7, 0.05); note(ch[2], r.next, beat * 0.7, 0.05); note(ch[3], r.next, beat * 0.7, 0.04); }
      note(ch[shape[bar][b]] + 12 + (ch[shape[bar][b]] < 55 ? 12 : 0), r.next, beat * 0.95, 0.09);
      r.next += beat; r.step++;
    }
  }, 150);
}

// The violin's reveal: a short phrase on a synthesised violin (two detuned saws through body resonances, with
// vibrato that blooms after the attack).
function auViolin() {
  if (!AU.ctx || !AU.on) return;
  const ctx = AU.ctx, t0 = ctx.currentTime + 1.6;
  const out = ctx.createGain(); out.gain.value = 0.32;
  let node = out;
  for (const [f, q, g] of [[440, 2.2, 7], [1450, 1.6, 5], [2900, 2, 6]]) { const b = ctx.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = q; b.gain.value = g; node.connect(b); node = b; }
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; node.connect(lp); lp.connect(AU.master);
  const tune = [[74, 1], [76, 0.5], [78, 0.5], [79, 1.5], [78, 0.5], [76, 1], [74, 1], [71, 1], [73, 0.5], [74, 0.5], [76, 2], [69, 1], [74, 3]];
  const beat = 0.52;
  let t = t0;
  for (const [m, len] of tune) {
    const d = len * beat, f = 440 * Math.pow(2, (m - 69) / 12), e = ctx.createGain();
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.5, t + 0.09); e.gain.setTargetAtTime(0.38, t + 0.09, 0.2);
    e.gain.setTargetAtTime(0, t + d - 0.02, 0.07);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.5, d * 0.6));
    lfo.connect(lg);
    for (const det of [0, 5]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      lg.connect(o.frequency); o.connect(e); o.start(t); o.stop(t + d + 0.4);
    }
    lfo.start(t); lfo.stop(t + d + 0.4);
    e.connect(out);
    t += d;
  }
  setTimeout(() => out.disconnect(), (t - ctx.currentTime + 1) * 1000);
}

// The kabuto's reveal: a temple bell, struck once (inharmonic partials with long, staggered decays).
function auBell() {
  if (!AU.ctx || !AU.on) return;
  const t = AU.ctx.currentTime + 1.4;
  [[1, 0.12, 9], [2.32, 0.07, 6], [3.01, 0.04, 5], [4.25, 0.05, 3.5], [5.4, 0.025, 2.4], [6.63, 0.025, 2], [9.38, 0.012, 1.2]].forEach(([k, g, d]) => {
    for (const det of [0, 0.7]) tone(98 * k + det, d, g * (det ? 0.6 : 1), 'sine', t - AU.ctx.currentTime);
  });
}
