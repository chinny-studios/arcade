// ---- 04_audio: synthesized sound. Cannon reports arrive late with distance (speed of sound). ----
const Sfx = (() => {
  let ctx = null, master = null, noise = null, ambGain = null, windGain = null, rainGain = null, fireGain = null, voices = 0;
  const S = { lx: 0, lz: 0 };
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = settings.vol; master.connect(ctx.destination);
    const len = ctx.sampleRate * 2; noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Sea: low noise with a slow swell
    const sea = loopNoise(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    ambGain = ctx.createGain(); ambGain.gain.value = 0; sea.connect(lp); lp.connect(ambGain); ambGain.connect(master);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = ctx.createGain(); lg.gain.value = 0.05; lfo.connect(lg); lg.connect(ambGain.gain); lfo.start();
    const wind = loopNoise(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0; wind.connect(bp); bp.connect(windGain); windGain.connect(master);
    const rain = loopNoise(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    rainGain = ctx.createGain(); rainGain.gain.value = 0; rain.connect(hp); hp.connect(rainGain); rainGain.connect(master);
    const fire = loopNoise(); const fb = ctx.createBiquadFilter(); fb.type = 'bandpass'; fb.frequency.value = 1400; fb.Q.value = 1.5;
    fireGain = ctx.createGain(); fireGain.gain.value = 0; fire.connect(fb); fb.connect(fireGain); fireGain.connect(master);
  }
  function loopNoise() { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.loopStart = Math.random(); s.start(0, Math.random() * 1.5); return s; }
  const ok = () => ctx && !G.simming && ctx.state === 'running';
  function spatial(x, z) {
    const d = Math.hypot(x - S.lx, z - S.lz);
    return { d, g: 1 / (1 + d / 120), delay: Math.min(d / 343, 2.5), lp: clamp(9000 / (1 + d / 90), 300, 9000) };
  }
  function burst(t, dur, f0, f1, gain, type, dest) {
    if (voices > 40) return;
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type || 'lowpass';
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
    voices++; s.onended = () => voices--;
  }
  function tone(t, dur, f0, f1, gain, type) {
    if (voices > 40) return;
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); voices++; o.onended = () => voices--;
  }
  S.init = init;
  S.setVolume = (v) => { if (master) master.gain.value = v; };
  S.listen = (x, z) => { S.lx = x; S.lz = z; };
  S.boom = (x, z, size) => {
    if (!ok()) return; const p = spatial(x, z); if (p.g < 0.03) return;
    const t = ctx.currentTime + p.delay, s = size || 1;
    burst(t, 1.1 + 0.5 * s, Math.min(p.lp, 2400), 90, 0.55 * p.g * s);
    tone(t, 0.5, 70, 32, 0.6 * p.g * s);
  };
  S.splash = (x, z, size) => { if (!ok()) return; const p = spatial(x, z); if (p.g < 0.06) return; burst(ctx.currentTime + p.delay * 0.3, 0.45, 3000, 600, 0.18 * p.g * (size || 1), 'bandpass'); };
  S.crack = (x, z) => { if (!ok()) return; const p = spatial(x, z); if (p.g < 0.05) return; const t = ctx.currentTime + p.delay * 0.3; burst(t, 0.18, 2600, 400, 0.4 * p.g, 'bandpass'); tone(t, 0.12, 180, 60, 0.25 * p.g, 'square'); };
  // Your own ball striking home: a heavy thud and splintering crack, heard at any range.
  S.hit = (dmg) => {
    if (!ok() || ctx.currentTime - (S.hitT || 0) < 0.06) return; S.hitT = ctx.currentTime;
    const t = ctx.currentTime, k = clamp(dmg / 150, 0.5, 1.4);
    tone(t, 0.28, 120, 40, 0.3 * k); burst(t, 0.22, 3200, 500, 0.16 * k, 'bandpass'); tone(t + 0.01, 0.08, 420, 150, 0.06, 'square');
  };
  S.timber = (x, z) => {
    if (!ok()) return; const p = spatial(x, z), t = ctx.currentTime + p.delay * 0.3;
    for (let i = 0; i < 3; i++) burst(t + i * 0.12, 0.25, 2200, 300, 0.35 * p.g, 'bandpass');
    tone(t, 1.4, 160, 60, 0.12 * p.g, 'sawtooth'); burst(t + 1.7, 0.9, 1800, 400, 0.3 * p.g, 'bandpass');
  };
  S.explosion = (x, z) => { if (!ok()) return; const p = spatial(x, z); const t = ctx.currentTime + p.delay; burst(t, 2.6, 1800, 60, 0.9 * p.g); tone(t, 1.4, 55, 22, 0.9 * p.g); };
  S.bell = (n) => { if (!ok()) return; for (let i = 0; i < (n || 2); i++) { const t = ctx.currentTime + i * 0.55; tone(t, 1.6, 880, 870, 0.12); tone(t, 1.2, 2210, 2200, 0.04); } };
  S.clash = () => { if (!ok()) return; const t = ctx.currentTime; for (let i = 0; i < 4; i++) { const k = t + Math.random() * 0.8; tone(k, 0.15, 2400 + Math.random() * 1500, 1800, 0.05, 'triangle'); burst(k, 0.1, 5000, 3000, 0.05, 'highpass'); } burst(t, 1.2, 900, 500, 0.08, 'bandpass'); };
  S.cheer = () => { if (!ok()) return; const t = ctx.currentTime; burst(t, 1.8, 1100, 700, 0.18, 'bandpass'); tone(t, 1.2, 300, 360, 0.05, 'sawtooth'); };
  S.ui = () => { if (!ok()) return; tone(ctx.currentTime, 0.07, 1200, 900, 0.05, 'triangle'); };
  S.alarm = () => { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.25, 660, 650, 0.08, 'square'); tone(t + 0.3, 0.25, 520, 510, 0.08, 'square'); };
  S.ambient = (on, squall, fire) => {
    if (!ctx) return; const t = ctx.currentTime;
    ambGain.gain.setTargetAtTime(on ? 0.16 + 0.08 * squall : 0, t, 0.6);
    windGain.gain.setTargetAtTime(on ? 0.025 + 0.09 * squall : 0, t, 0.8);
    rainGain.gain.setTargetAtTime(on ? 0.06 * squall : 0, t, 0.8);
    fireGain.gain.setTargetAtTime(on ? 0.05 * fire : 0, t, 0.3);
  };
  return S;
})();
