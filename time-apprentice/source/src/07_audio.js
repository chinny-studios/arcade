// The Time Apprentice — synthesized sound (UI, footsteps, ambience beds) and read-aloud speech

const AU = {
  ctx: null, master: null, amb: null, ambKind: null, noise: null, ambT: 0, surf: 'sand',
  init() {
    const unlock = () => { this.resume(); };
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock); addEventListener('touchstart', unlock);
  },
  resume() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      try { this.ctx = new C(); } catch (e) { return; }
      this.master = this.ctx.createGain(); this.master.gain.value = SETTINGS.vol; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.5 + b * 2; }
      this.noise = buf;
      if (this.ambKind) { const k = this.ambKind; this.ambKind = null; this.setAmb(k); }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  vol(v) { SETTINGS.vol = v; if (this.master) this.master.gain.value = v; },
  tone(f, dur, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.at || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.v || 0.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || this.master); osc.start(t); osc.stop(t + dur + 0.05);
  },
  burst(dur, o = {}) {
    const c = this.ctx; if (!c || !this.noise) return;
    const t = c.currentTime + (o.at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.playbackRate.value = o.rate || 1;
    f.type = o.ft || 'bandpass'; f.frequency.value = o.f || 800; f.Q.value = o.q || 1;
    const v = o.v || 0.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  ui(k) {
    if (!this.ctx) return;
    const T = (f, d, o) => this.tone(f, d, o);
    switch (k) {
      case 'click': T(880, 0.06, { v: 0.08, type: 'triangle' }); break;
      case 'next': T(660, 0.05, { v: 0.05, type: 'triangle' }); break;
      case 'ok': T(660, 0.1, { v: 0.12, type: 'triangle' }); T(990, 0.16, { v: 0.12, type: 'triangle', at: 0.08 }); break;
      case 'bad': T(220, 0.18, { v: 0.12, type: 'square', to: 160 }); break;
      case 'goal': T(523, 0.12, { v: 0.1 }); T(784, 0.2, { v: 0.1, at: 0.1 }); break;
      case 'fact': [784, 988, 1175, 1568].forEach((f, i) => T(f, 0.25, { v: 0.07, type: 'triangle', at: i * 0.07 })); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => T(f, 0.3, { v: 0.1, type: 'triangle', at: i * 0.1 })); break;
      case 'pick': T(440, 0.08, { v: 0.1, type: 'triangle', to: 660 }); break;
      case 'drop': T(520, 0.1, { v: 0.1, type: 'triangle', to: 300 }); break;
      case 'tick': T(1400, 0.03, { v: 0.05, type: 'square' }); break;
      case 'hit': T(330, 0.08, { v: 0.15, type: 'triangle' }); this.burst(0.08, { f: 1600, v: 0.08 }); break;
      case 'miss': this.burst(0.15, { f: 300, v: 0.08 }); break;
      case 'splash': this.burst(0.5, { f: 1200, q: 0.6, v: 0.15 }); break;
      case 'thud': T(90, 0.25, { v: 0.3, to: 50 }); this.burst(0.12, { f: 200, v: 0.15 }); break;
      case 'shutter': this.burst(0.05, { f: 3000, v: 0.2 }); this.burst(0.06, { f: 2000, v: 0.15, at: 0.08 }); break;
      case 'quindar': T(2525, 0.25, { v: 0.05 }); break;
      case 'quindar2': T(2475, 0.25, { v: 0.05 }); break;
      case 'alarm': for (let i = 0; i < 3; i++) T(1200, 0.12, { v: 0.08, type: 'square', at: i * 0.25 }); break;
      case 'engine': this.burst(1.2, { f: 120, q: 0.5, v: 0.3, rate: 0.5 }); break;
      case 'cheer': for (let i = 0; i < 6; i++) this.burst(0.6 + Math.random() * 0.6, { f: 700 + Math.random() * 900, q: 3, v: 0.05, at: Math.random() * 0.5 }); break;
      case 'warp': T(80, 2.6, { v: 0.2, type: 'sawtooth', to: 1200, att: 0.6 }); T(120, 2.6, { v: 0.15, type: 'sine', to: 2400, att: 0.8 }); this.burst(2.4, { f: 600, q: 0.4, v: 0.15, att: 1 }); break;
      case 'pour': this.burst(0.3, { f: 900, q: 0.8, v: 0.06 }); break;
      case 'creak': T(140, 0.4, { v: 0.06, type: 'sawtooth', to: 110 }); break;
      case 'clack': this.burst(0.04, { f: 2600, q: 2, v: 0.18 }); T(1900, 0.03, { v: 0.05, type: 'square' }); break;
      case 'gong': T(196, 1.6, { v: 0.12, type: 'triangle', to: 180 }); T(311, 1.2, { v: 0.05, type: 'sine' }); this.burst(0.5, { f: 3500, q: 0.7, v: 0.05 }); break;
      case 'cymbal': this.burst(0.35, { f: 6000, q: 0.5, v: 0.09 }); break;
      case 'drum': T(95, 0.18, { v: 0.3, to: 60 }); this.burst(0.06, { f: 400, v: 0.08 }); break;
      case 'ding': T(1568, 0.5, { v: 0.08, type: 'triangle' }); T(1568, 0.5, { v: 0.08, type: 'triangle', at: 0.28 }); break;
      case 'horn': T(98, 1.4, { v: 0.15, type: 'sawtooth', att: 0.15 }); T(147, 1.4, { v: 0.08, type: 'sawtooth', att: 0.15 }); break;
      case 'beep': T(1000, 0.12, { v: 0.06, type: 'square' }); break;
      case 'sizzle': this.burst(0.8, { f: 4000, q: 0.4, v: 0.06 }); break;
      case 'coin': T(2200, 0.08, { v: 0.06, type: 'triangle' }); T(3100, 0.12, { v: 0.05, type: 'triangle', at: 0.05 }); break;
    }
  },
  // a jet going over the rooftops: a roar that swells and fades over `sec` seconds
  jet(sec = 7, v = 0.35) {
    const c = this.ctx; if (!c || !this.noise) return;
    const t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; s.playbackRate.value = 0.7;
    f.type = 'lowpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(200, t); f.frequency.linearRampToValueAtTime(1400, t + sec * 0.45); f.frequency.linearRampToValueAtTime(300, t + sec);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + sec * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + sec + 0.1);
    this.tone(320, sec * 0.9, { v: v * 0.12, type: 'sawtooth', to: 260, att: sec * 0.4 });
  },
  step(k = 1) {
    if (!this.ctx) return;
    const s = this.surf;
    if (s === 'wood') { this.tone(110 + Math.random() * 30, 0.08, { v: 0.05 * k, type: 'triangle' }); this.burst(0.05, { f: 900, v: 0.03 * k }); }
    else if (s === 'stone' || s === 'floor') this.burst(0.05, { f: 2200, q: 1.5, v: 0.05 * k });
    else if (s === 'carpet') this.burst(0.06, { f: 500, q: 0.8, v: 0.03 * k });
    else if (s === 'moon') this.burst(0.1, { f: 400, q: 0.6, v: 0.02 * k });
    else this.burst(0.09, { f: 1300 + Math.random() * 500, q: 0.7, v: 0.05 * k });
  },
  // ambience beds: a filtered noise loop plus occasional sounds, per kind
  setAmb(kind) {
    if (this.ambKind === kind) return;
    this.ambKind = kind;
    const c = this.ctx; if (!c) return;
    if (this.amb) { const old = this.amb; old.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.4); setTimeout(() => { try { old.src.stop(); } catch (e) { /* ignore */ } }, 1500); this.amb = null; }
    const P = { desert: [500, 0.5, 0.05], wind: [380, 0.4, 0.14], workshop: [250, 0.7, 0.03], control: [180, 1.2, 0.035], moon: [90, 0.6, 0.012], hub: [300, 0.7, 0.02], night: [700, 0.6, 0.02],
      city: [420, 0.6, 0.06], lanes: [160, 1.4, 0.03], harbour: [260, 0.5, 0.09], citynight: [300, 0.6, 0.04] }[kind];
    if (!P) return;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = P[0]; f.Q.value = P[1];
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(P[2], c.currentTime, 0.8);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = kind === 'wind' ? 0.13 : 0.07; lg.gain.value = P[0] * 0.5;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.amb = { src, g, f };
  },
  update(dt) {
    if (!this.ctx) return;
    this.ambT -= dt; if (this.ambT > 0) return;
    this.ambT = 1.5 + Math.random() * 4;
    const k = this.ambKind;
    if (k === 'desert' && Math.random() < 0.5) { const f = 300 + Math.random() * 120; this.tone(f, 0.5, { v: 0.015, type: 'triangle', att: 0.2 }); this.tone(f * 1.5, 0.5, { v: 0.01, type: 'triangle', att: 0.2, at: 0.5 }); }
    if (k === 'wind' && Math.random() < 0.6) this.burst(2 + Math.random() * 2, { f: 250, q: 0.3, v: 0.05, att: 0.8 });
    if (k === 'workshop' && Math.random() < 0.5) { if (Math.random() < 0.5) this.ui('creak'); else this.burst(0.03, { f: 3000, v: 0.03 }); }
    if (k === 'control' && Math.random() < 0.6) { this.tone(1800 + Math.floor(Math.random() * 4) * 200, 0.06, { v: 0.015, type: 'square' }); }
    if (k === 'hub' && Math.random() < 0.6) { this.tone(1500, 0.02, { v: 0.02, type: 'square' }); this.tone(1200, 0.02, { v: 0.02, type: 'square', at: 0.5 }); }
    if (k === 'night' && Math.random() < 0.7) for (let i = 0; i < 3; i++) this.tone(4200, 0.03, { v: 0.008, type: 'square', at: i * 0.08 });
    // Hong Kong: car horns and a far-off bus, drips and a radio in the Walled City lanes, gulls and engines on the harbour
    if ((k === 'city' || k === 'citynight') && Math.random() < 0.5) { const f = 380 + Math.random() * 200; this.tone(f, 0.25, { v: 0.012, type: 'square' }); if (Math.random() < 0.4) this.tone(f, 0.15, { v: 0.012, type: 'square', at: 0.32 }); }
    if (k === 'city' && Math.random() < 0.3) this.burst(2.5, { f: 180, q: 0.6, v: 0.04, att: 0.8, rate: 0.6 });
    if (k === 'lanes' && Math.random() < 0.8) { this.tone(1700 + Math.random() * 900, 0.05, { v: 0.02, type: 'sine', to: 900 }); if (Math.random() < 0.3) this.tone(60, 1.2, { v: 0.01, type: 'sawtooth' }); }
    if (k === 'harbour' && Math.random() < 0.4) { const f = 1800 + Math.random() * 600; this.tone(f, 0.18, { v: 0.012, type: 'triangle', to: f * 0.7 }); this.tone(f * 0.9, 0.2, { v: 0.01, type: 'triangle', to: f * 0.6, at: 0.25 }); }
  },
};

// Read-aloud with the browser's own speech synthesis: no audio files, works offline where the system has voices.
const Voice = {
  voices: [], ok: typeof speechSynthesis !== 'undefined',
  init() {
    if (!this.ok) return;
    const load = () => { try { this.voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); } catch (e) { this.voices = []; } };
    load(); try { speechSynthesis.onvoiceschanged = load; } catch (e) { /* ignore */ }
  },
  say(text, v = {}) {
    if (!this.ok || !SETTINGS.voice) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain(text));
      const vs = this.voices;
      if (vs.length) u.voice = vs[(v.voice || 0) % vs.length];
      u.pitch = v.pitch || 1; u.rate = (v.rate || 1) * 0.95; u.volume = SETTINGS.vol;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  },
  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } },
};
