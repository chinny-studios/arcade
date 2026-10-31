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
