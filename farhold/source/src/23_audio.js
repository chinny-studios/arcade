// Farhold — procedural audio: synthesized effects, engine/beam/wind loops, and a generative ambient score

const AU = {
  ctx: null, master: null, sfxG: null, musG: null, verb: null, loops: {}, muted: false, loopOn: true, noiseBuf: null,
  mus: { t: 0, chordT: 0, arpT: 0, step: 0, mood: null, voices: [] },
  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = SETTINGS.vol; this.master.connect(c.destination);
    this.sfxG = c.createGain(); this.sfxG.connect(this.master);
    this.musG = c.createGain(); this.musG.gain.value = SETTINGS.music * 0.5; this.musG.connect(this.master);
    // reverb
    const len = c.sampleRate * 3, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const vg = c.createGain(); vg.gain.value = 0.55; this.verb.connect(vg); vg.connect(this.master);
    // delay for arpeggios
    this.dly = c.createDelay(1); this.dly.delayTime.value = 0.42; const fb = c.createGain(); fb.gain.value = 0.38; this.dly.connect(fb); fb.connect(this.dly); this.dly.connect(this.verb); this.dly.connect(this.musG);
    // white noise
    this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.makeLoops();
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVol() { if (!this.ctx) return; this.master.gain.value = this.muted ? 0 : SETTINGS.vol; this.musG.gain.value = SETTINGS.music * 0.5; },
  toggleMute() { this.muted = !this.muted; this.setVol(); },
  now() { return this.ctx.currentTime; },
  // ---------- building blocks ----------
  tone(f, dur, o = {}) {
    const c = this.ctx, t = this.now() + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    const g = c.createGain(); const v = (o.vol || 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = osc;
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; n.connect(fl); n = fl; }
    n.connect(g); g.connect(o.bus || this.sfxG); if (o.verb) g.connect(this.verb);
    osc.start(t); osc.stop(t + dur + 0.05);
  },
  noise(dur, o = {}) {
    const c = this.ctx, t = this.now() + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = o.ft || 'lowpass'; fl.frequency.setValueAtTime(o.f || 1000, t); fl.Q.value = o.q || 1;
    if (o.to) fl.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + dur);
    const g = c.createGain(); const v = o.vol || 0.3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(o.bus || this.sfxG); if (o.verb) g.connect(this.verb);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },
  sfx(name, vol = 1) {
    if (!this.ctx || this.muted) return;
    const T = (f, d, o) => this.tone(f, d, Object.assign({}, o, { vol: (o && o.vol || 0.3) * vol }));
    const N = (d, o) => this.noise(d, Object.assign({}, o, { vol: (o && o.vol || 0.3) * vol }));
    switch (name) {
      case 'click': T(1400, 0.04, { type: 'square', vol: 0.06 }); break;
      case 'deny': T(220, 0.12, { type: 'square', vol: 0.1 }); T(160, 0.16, { type: 'square', vol: 0.1, delay: 0.1 }); break;
      case 'jump': N(0.25, { ft: 'bandpass', f: 600, to: 1500, vol: 0.12 }); break;
      case 'craft': T(520, 0.1, { type: 'triangle', vol: 0.15 }); T(780, 0.15, { type: 'triangle', vol: 0.15, delay: 0.08 }); N(0.2, { ft: 'highpass', f: 3000, vol: 0.05 }); break;
      case 'recharge': T(300, 0.5, { type: 'sine', to: 900, vol: 0.15 }); T(450, 0.5, { type: 'triangle', to: 1350, vol: 0.06, delay: 0.05 }); break;
      case 'pickup': T(880, 0.07, { type: 'sine', vol: 0.12 }); T(1320, 0.09, { type: 'sine', vol: 0.1, delay: 0.05 }); break;
      case 'scan': T(180, 1.2, { type: 'sine', to: 1400, vol: 0.18, verb: true }); T(1760, 0.6, { type: 'sine', vol: 0.1, delay: 1.0, verb: true }); break;
      case 'scanBeep': T(1200, 0.1, { type: 'square', vol: 0.06 }); T(1200, 0.1, { type: 'square', vol: 0.06, delay: 0.2 }); break;
      case 'visorOn': T(600, 0.15, { type: 'sine', to: 1200, vol: 0.1 }); break;
      case 'visorOff': T(1200, 0.15, { type: 'sine', to: 600, vol: 0.1 }); break;
      case 'visorTick': T(2400, 0.02, { type: 'square', vol: 0.03 }); break;
      case 'discover': [523, 659, 784, 1046].forEach((f, i) => T(f, 0.6, { type: 'triangle', vol: 0.12, delay: i * 0.09, verb: true })); break;
      case 'bolt': T(1400, 0.14, { type: 'sawtooth', to: 180, vol: 0.12, lp: 4000 }); N(0.08, { ft: 'highpass', f: 2000, vol: 0.06 }); break;
      case 'reload': T(300, 0.08, { type: 'square', vol: 0.06 }); T(500, 0.08, { type: 'square', vol: 0.06, delay: 0.5 }); N(0.1, { f: 2000, vol: 0.06, delay: 0.9 }); break;
      case 'melee': N(0.15, { ft: 'bandpass', f: 800, to: 300, vol: 0.2 }); break;
      case 'overheat': N(0.9, { ft: 'highpass', f: 3000, to: 1200, vol: 0.12 }); T(200, 0.4, { type: 'square', vol: 0.05 }); break;
      case 'hit': N(0.18, { f: 900, to: 200, vol: 0.25 }); T(120, 0.2, { type: 'sawtooth', vol: 0.1 }); break;
      case 'shieldhit': T(900, 0.18, { type: 'sine', to: 300, vol: 0.15 }); N(0.12, { ft: 'highpass', f: 4000, vol: 0.06 }); break;
      case 'death': T(300, 1.6, { type: 'sawtooth', to: 40, vol: 0.2, lp: 1200 }); break;
      case 'board': N(0.3, { ft: 'bandpass', f: 400, vol: 0.15 }); T(200, 0.3, { type: 'sine', to: 400, vol: 0.1 }); break;
      case 'takeoff': N(2.5, { f: 200, to: 1200, vol: 0.3, att: 0.4 }); T(55, 2.5, { type: 'sawtooth', to: 110, vol: 0.12, lp: 400, att: 0.4 }); break;
      case 'landing': N(2.5, { f: 1200, to: 200, vol: 0.2, att: 0.3 }); break;
      case 'touchdown': N(0.35, { f: 300, to: 80, vol: 0.4 }); T(60, 0.3, { type: 'sine', vol: 0.3 }); break;
      case 'cannon': T(700, 0.1, { type: 'square', to: 120, vol: 0.1, lp: 2500 }); break;
      case 'explode': N(1.6, { f: 2000, to: 60, vol: 0.5, att: 0.01 }); T(70, 1.2, { type: 'sine', to: 30, vol: 0.4 }); break;
      case 'hullhit': N(0.3, { f: 600, to: 100, vol: 0.35 }); break;
      case 'scrape': N(0.5, { ft: 'bandpass', f: 1500, to: 400, vol: 0.25, q: 3 }); break;
      case 'alarm': for (let i = 0; i < 3; i++) { T(880, 0.18, { type: 'square', vol: 0.08, delay: i * 0.4 }); T(660, 0.18, { type: 'square', vol: 0.08, delay: i * 0.4 + 0.2 }); } break;
      case 'warn': T(1000, 0.1, { type: 'square', vol: 0.07 }); T(1000, 0.1, { type: 'square', vol: 0.07, delay: 0.25 }); break;
      case 'storm': N(4, { f: 200, to: 900, vol: 0.25, att: 1.5, verb: true }); break;
      case 'growl': T(90, 0.7, { type: 'sawtooth', to: 60, vol: 0.18, lp: 600 }); N(0.6, { ft: 'bandpass', f: 300, vol: 0.1 }); break;
      case 'bite': N(0.12, { ft: 'bandpass', f: 1200, vol: 0.2 }); break;
      case 'hurt': T(500 + Math.random() * 300, 0.18, { type: 'triangle', to: 250, vol: 0.12 }); break;
      case 'chirp': for (let i = 0; i < 3; i++) T(1500 + Math.random() * 800, 0.08, { type: 'sine', to: 2400, vol: 0.08, delay: i * 0.1 }); break;
      case 'talk': for (let i = 0; i < 5; i++) T(300 + Math.random() * 400, 0.06, { type: 'square', vol: 0.04, delay: i * 0.07, lp: 1500 }); break;
      case 'save': T(660, 0.2, { type: 'triangle', vol: 0.12 }); T(990, 0.3, { type: 'triangle', vol: 0.12, delay: 0.15, verb: true }); break;
      case 'unlock': [440, 554, 659, 880].forEach((f, i) => T(f, 0.25, { type: 'square', vol: 0.05, delay: i * 0.06, lp: 2000 })); break;
      case 'ruin': [220, 277, 330, 415].forEach((f, i) => T(f, 3, { type: 'sine', vol: 0.08, delay: i * 0.25, att: 0.5, verb: true })); break;
      case 'objective': T(784, 0.3, { type: 'triangle', vol: 0.12 }); T(1175, 0.5, { type: 'triangle', vol: 0.1, delay: 0.12, verb: true }); break;
      case 'place': N(0.15, { f: 600, to: 150, vol: 0.3 }); T(150, 0.15, { type: 'sine', vol: 0.2 }); break;
      case 'dismantle': N(0.3, { ft: 'bandpass', f: 1200, to: 300, vol: 0.2 }); break;
      case 'upload': for (let i = 0; i < 6; i++) T(600 + i * 150, 0.08, { type: 'square', vol: 0.04, delay: i * 0.05, lp: 3000 }); break;
      case 'teleport': T(200, 1.2, { type: 'sine', to: 2000, vol: 0.2, verb: true }); N(1.2, { ft: 'highpass', f: 2000, vol: 0.1 }); break;
      case 'warp': T(60, 2.0, { type: 'sawtooth', to: 600, vol: 0.25, lp: 2000, att: 0.3 }); N(2.5, { f: 300, to: 6000, vol: 0.3, att: 0.5, verb: true }); break;
      case 'warpout': N(1.5, { f: 6000, to: 200, vol: 0.3, verb: true }); T(400, 1.5, { type: 'sine', to: 80, vol: 0.2 }); break;
      case 'laser': T(1800, 0.15, { type: 'sawtooth', to: 400, vol: 0.08, lp: 3000 }); break;
      case 'hitmark': T(1600, 0.04, { type: 'square', vol: 0.05 }); break;
      case 'rockbreak': N(0.6, { f: 1500, to: 100, vol: 0.4 }); break;
    }
  },
  // ---------- loops ----------
  makeLoops() {
    const c = this.ctx;
    const mk = (name, build) => { const g = c.createGain(); g.gain.value = 0; g.connect(this.sfxG); const n = build(g); this.loops[name] = Object.assign({ g, v: 0 }, n); };
    const noiseSrc = () => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.start(0, Math.random()); return s; };
    mk('beam', (g) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 180; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2; o.connect(f); const n = noiseSrc(); const nf = c.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 3000; n.connect(nf); nf.connect(g); f.connect(g); o.start(); const lfo = c.createOscillator(); lfo.frequency.value = 13; const lg = c.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency); lfo.start(); return { o }; });
    mk('engine', (g) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; o.connect(f); f.connect(g); o.start(); const n = noiseSrc(); const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 700; const ng = c.createGain(); ng.gain.value = 0.8; n.connect(nf); nf.connect(ng); ng.connect(g); return { o, f, nf }; });
    mk('pulse', (g) => { const n = noiseSrc(); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7; n.connect(f); f.connect(g); const o = c.createOscillator(); o.frequency.value = 110; const og = c.createGain(); og.gain.value = 0.4; o.connect(og); og.connect(g); o.start(); return {}; });
    mk('wind', (g) => { const n = noiseSrc(); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2; n.connect(f); f.connect(g); const lfo = c.createOscillator(); lfo.frequency.value = 0.15; const lg = c.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); return { f }; });
    mk('rain', (g) => { const n = noiseSrc(); const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; n.connect(f); f.connect(g); return {}; });
    mk('jet', (g) => { const n = noiseSrc(); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8; n.connect(f); f.connect(g); return {}; });
  },
  loop(name, vol, rate) {
    const L = this.loops[name];
    if (!L) return;
    L.target = vol;
    if (rate != null && L.o) L.o.frequency.setTargetAtTime(name === 'engine' ? 40 + rate * 50 : 180, this.now(), 0.1);
    if (rate != null && L.f && name === 'engine') L.f.frequency.setTargetAtTime(300 + rate * 600, this.now(), 0.1);
  },
  // ---------- generative score ----------
  musicMood() {
    if (PLAYER.inShip && !SHIP.frame) return 'space';
    if (PLAYER.frame && PLAYER.frame.kind === 'station') return 'station';
    const pl = ENV.pl;
    if (!pl) return 'space';
    return { lush: 'warm', frozen: 'cold', scorched: 'tense', toxic: 'eerie', radioactive: 'eerie', barren: 'warm', dead: 'cold', exotic: 'strange' }[pl.type] || 'warm';
  },
  updateMusic(dt) {
    const M = this.mus, c = this.ctx;
    M.t += dt; M.chordT -= dt; M.arpT -= dt;
    const mood = this.musicMood();
    const SC = { warm: [0, 2, 4, 7, 9], cold: [0, 2, 3, 7, 10], tense: [0, 1, 5, 7, 8], eerie: [0, 3, 6, 7, 10], strange: [0, 2, 6, 7, 11], space: [0, 2, 4, 6, 7, 11], station: [0, 4, 7, 9, 11] }[mood];
    const root = { warm: 50, cold: 45, tense: 47, eerie: 44, strange: 49, space: 41, station: 52 }[mood];
    if (M.chordT <= 0) {
      M.chordT = 9 + Math.random() * 6;
      const deg = Math.floor(Math.random() * SC.length);
      const notes = [0, 2, 4].map((k) => root + SC[(deg + k) % SC.length] + 12 * Math.floor((deg + k) / SC.length));
      if (Math.random() < 0.5) notes.push(root - 12 + SC[deg]);
      for (const n of notes) this.pad(440 * Math.pow(2, (n - 69) / 12), M.chordT + 4);
    }
    if (M.arpT <= 0) {
      M.arpT = mood === 'station' ? 0.45 : mood === 'space' ? 1.6 : 0.9 + Math.random() * 1.2;
      if (Math.random() < (mood === 'tense' || mood === 'eerie' ? 0.4 : 0.65)) {
        const n = root + 12 + SC[Math.floor(Math.random() * SC.length)] + (Math.random() < 0.3 ? 12 : 0);
        const f = 440 * Math.pow(2, (n - 69) / 12), t = this.now();
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.connect(g); g.connect(this.dly); g.connect(this.musG); o.start(t); o.stop(t + 1.5);
      }
    }
  },
  pad(f, dur) {
    const c = this.ctx, t = this.now();
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900; fl.Q.value = 0.5;
    fl.connect(g); g.connect(this.musG); g.connect(this.verb);
    for (const det of [-7, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(fl); o.start(t); o.stop(t + dur + 0.1); }
  },
  update(dt) {
    if (!this.ctx) return;
    // ambience
    const pl = ENV.pl, W = pl ? WEATHER.get(pl) : null;
    const outside = !PLAYER.inShip && PLAYER.frame && PLAYER.frame.kind === 'planet';
    this.loop('wind', outside ? 0.08 + (W ? W.k * 0.35 : 0) : PLAYER.inShip && ENV.inAtmo ? Math.min(0.3, SHIP.speed / 600) : 0);
    this.loop('rain', outside && W && /Rain|Acid/.test(W.name) ? W.k * 0.2 : 0);
    this.loop('jet', PLAYER.jetting && !PLAYER.inShip ? 0.18 : 0);
    for (const k in this.loops) { const L = this.loops[k]; const tv = L.target || 0; if (Math.abs(L.v - tv) > 0.001) { L.v = lerp(L.v, tv, Math.min(1, dt * 8)); L.g.gain.setTargetAtTime(L.v, this.now(), 0.05); } }
    if (SETTINGS.music > 0) this.updateMusic(dt);
  },
};
