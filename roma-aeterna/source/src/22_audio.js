// Roma Aeterna — synthesized sound: the murmur of crowds, footsteps on stone, hooves and cart wheels, fountains,
// birds and cicadas by day, crickets by night, the roar of the Circus, and a plucked lyre for discoveries.

const AU = {
  ctx: null, on: false, master: null, layers: {}, noise: null, t: 0, birdT: 2, crickT: 1, hammerT: 0,
  env: { crowd: 0, rural: 0, water: 0, roar: 0, cart: 0, build: 0, night: 0 },
};
AU.init = function () {
  const resume = () => { this.resume(); };
  addEventListener('pointerdown', resume); addEventListener('keydown', resume); addEventListener('touchstart', resume);
};
AU.resume = function () {
  if (!this.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    this.build();
  }
  if (this.ctx.state === 'suspended') this.ctx.resume();
};
AU.setVol = function (v) { if (this.master) this.master.gain.value = v * 0.9; };
AU.build = function () {
  const c = this.ctx;
  this.master = c.createGain(); this.master.gain.value = SETTINGS.vol * 0.9; this.master.connect(c.destination);
  const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.03; b1 = 0.985 * b1 + w * 0.05; b2 = 0.95 * b2 + w * 0.1; d[i] = (b0 + b1 + b2 + w * 0.12) * 0.9; }
  this.noise = buf;
  const loop = (type, f, q, g0 = 0) => {
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random(); s.playbackRate.value = 0.9 + Math.random() * 0.2;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = g0;
    s.connect(fl); fl.connect(g); g.connect(this.master); s.start();
    return { s, fl, g };
  };
  this.layers.crowd = loop('bandpass', 520, 0.6);
  this.layers.crowd2 = loop('bandpass', 1100, 1.2);
  this.layers.wind = loop('lowpass', 380, 0.5);
  this.layers.water = loop('highpass', 1600, 0.4);
  this.layers.roar = loop('bandpass', 700, 0.5);
  this.layers.cart = loop('lowpass', 160, 1.2);
  // crowd murmur wobbles like many voices
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.37; lg.gain.value = 140; lfo.connect(lg); lg.connect(this.layers.crowd.fl.frequency); lfo.start();
  // cicadas: a high buzz pulsed fast
  const ci = c.createOscillator(); ci.type = 'sawtooth'; ci.frequency.value = 4300;
  const cf = c.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 5200; cf.Q.value = 4;
  const cg = c.createGain(); cg.gain.value = 0; const am = c.createOscillator(), amg = c.createGain(); am.frequency.value = 38; amg.gain.value = 0.5; am.connect(amg); amg.connect(cg.gain);
  const cv = c.createGain(); cv.gain.value = 0;
  ci.connect(cf); cf.connect(cg); cg.connect(cv); cv.connect(this.master); ci.start(); am.start();
  this.layers.cicada = { g: cv, pulse: cg };
  this.on = true;
};
const _set = (p, v, c) => p.setTargetAtTime(v, c.currentTime, 0.35);
AU.update = function (dt) {
  if (!this.on || G.state !== 'play') return;
  const c = this.ctx, E = this.env, L = this.layers;
  this.t += dt;
  const night = SKY.night, day = 1 - night;
  const urb = urbanAt(PL.x, PL.z);
  E.rural = 1 - urb;
  const crowd = clamp(NPC.near / 26, 0, 1);
  _set(L.crowd.g.gain, crowd * 0.32, c); _set(L.crowd2.g.gain, crowd * 0.07, c);
  _set(L.wind.g.gain, 0.05 + E.rural * 0.12, c);
  // the Tiber and fountains
  let w = clamp(1 - (riverDist(PL.x, PL.z) - RIVER_HW) / 70, 0, 1) * 0.12;
  for (const f of W.fountains) { const d = Math.hypot(f.x - PL.x, f.z - PL.z); if (d < 22) w = Math.max(w, (1 - d / 22) * 0.16 * (f.big ? 1.5 : 1)); }
  _set(L.water.g.gain, w, c);
  _set(L.roar.g.gain, E.roar * 0.4, c);
  _set(L.cart.g.gain, clamp(NPC.cartNear, 0, 1) * 0.35, c);
  L.cicada.pulse.gain.value = 0.5;
  _set(L.cicada.g.gain, day * E.rural * smooth(9, 12, G.hour) * (1 - smooth(17, 19, G.hour)) * 0.012, c);
  // birds by day (gardens and countryside), crickets at night
  this.birdT -= dt;
  if (this.birdT <= 0) { this.birdT = 1.5 + Math.random() * 5; if (day > 0.5 && (E.rural > 0.3 || Math.random() < 0.25)) this.bird(); }
  this.crickT -= dt;
  if (this.crickT <= 0) { this.crickT = 0.4 + Math.random() * 1.2; if (night > 0.6) this.cricket(0.3 + E.rural * 0.7); }
  // the construction site: a hammer on stone
  if (E.build > 0) { this.hammerT -= dt; if (this.hammerT <= 0) { this.hammerT = 0.5 + Math.random() * 1.4; this.clink(E.build); } }
};
AU.env0 = function () { this.env.roar = 0; this.env.build = 0; };
// short filtered noise burst
AU.burst = function (f, q, dur, gain, type = 'bandpass', when = 0, pan = 0) {
  if (!this.on) return;
  const c = this.ctx, t = c.currentTime + when;
  const s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 1 + Math.random() * 0.3;
  const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = g;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); out = p; }
  s.connect(fl); fl.connect(g); out.connect(this.master);
  s.start(t, Math.random() * 2, dur + 0.05);
};
AU.step = function (k) { this.burst(380 + Math.random() * 260, 1.1, 0.08, 0.16 * k, 'bandpass'); this.burst(2400, 2, 0.03, 0.03 * k, 'bandpass', 0.004); };
// positional one-shots: hooves and the like
AU.at = function (x, z, maxD) {
  const dx = x - PL.x, dz = z - PL.z, d = Math.hypot(dx, dz);
  if (d > maxD) return null;
  const right = Math.cos(PL.yaw) * dx - Math.sin(PL.yaw) * dz;
  return { g: Math.pow(1 - d / maxD, 1.6), pan: clamp(right / Math.max(d, 1), -1, 1) * 0.8 };
};
AU.hoof = function (x, z, k = 1) {
  const p = this.at(x, z, 45); if (!p) return;
  this.burst(900 + Math.random() * 300, 3, 0.05, 0.22 * p.g * k, 'bandpass', 0, p.pan);
  this.burst(220, 2, 0.06, 0.12 * p.g * k, 'lowpass', 0.002, p.pan);
};
AU.clink = function (k) {
  if (!this.on) return;
  const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'triangle'; o.frequency.value = 1800 + Math.random() * 900;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * k, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.2);
  this.burst(1500, 1, 0.05, 0.06 * k);
};
AU.bird = function () {
  const c = this.ctx, t0 = c.currentTime, n = 2 + Math.floor(Math.random() * 5), base = 2200 + Math.random() * 1800;
  const pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(this.master); }
  for (let i = 0; i < n; i++) {
    const t = t0 + i * (0.09 + Math.random() * 0.08), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), t); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.5), t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g); g.connect(pan || this.master); o.start(t); o.stop(t + 0.1);
  }
};
AU.cricket = function (k) {
  const c = this.ctx, t0 = c.currentTime;
  for (let i = 0; i < 3; i++) {
    const t = t0 + i * 0.05, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = 4600 + Math.random() * 200;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012 * k, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.05);
  }
};
// Karplus–Strong plucked string: a lyre
AU.pluck = function (freq, when, gain = 0.15) {
  const c = this.ctx, sr = c.sampleRate, N = Math.round(sr / freq), len = Math.round(sr * 2.2);
  const buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  let p = 0;
  for (let i = 0; i < len; i++) { const a = ring[p], b = ring[(p + 1) % N]; d[i] = a; ring[p] = (a + b) * 0.4985; p = (p + 1) % N; }
  const s = c.createBufferSource(); s.buffer = buf;
  const g = c.createGain(); g.gain.value = gain; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
  s.connect(f); f.connect(g); g.connect(this.master); s.start(c.currentTime + when);
};
AU.ui = function (kind) {
  if (!this.on) return;
  if (kind === 'found') { [293.7, 370, 440, 587.3].forEach((f, i) => this.pluck(f, i * 0.11, 0.13)); }
  else if (kind === 'page') this.burst(3000, 0.6, 0.18, 0.05, 'highpass');
  else if (kind === 'talk') this.pluck(440, 0, 0.05);
};
