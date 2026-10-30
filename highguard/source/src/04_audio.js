// ---- 04_audio: synthesized sound ----
// Space is silent, but the films are not: every gun and blast is heard, quieter with distance.
const Sfx = (() => {
  let ctx = null, master = null, noise = null, engGain = null, engFilt = null, humGain = null, voices = 0;
  const L = new V3();
  const last = {};
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = settings.vol * 0.8;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5;
    master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2; noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Engine rumble of your own ship, rising with throttle.
    const eng = loopNoise(); engFilt = ctx.createBiquadFilter(); engFilt.type = 'lowpass'; engFilt.frequency.value = 120;
    engGain = ctx.createGain(); engGain.gain.value = 0; eng.connect(engFilt); engFilt.connect(engGain); engGain.connect(master);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 46; const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 140;
    humGain = ctx.createGain(); humGain.gain.value = 0; o.connect(of); of.connect(humGain); humGain.connect(master); o.start();
  }
  function loopNoise() { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, Math.random() * 1.5); return s; }
  const ok = () => ctx && !G.simming && ctx.state === 'running';
  function gainAt(p, ref) { return p ? 1 / (1 + p.distanceTo(L) / (ref || 500)) : 1; }
  function limit(key, gap) { const t = ctx.currentTime; if (last[key] && t - last[key] < gap) return false; last[key] = t; return true; }
  function burst(t, dur, f0, f1, gain, type, q) {
    if (voices > 46 || gain < 0.004) return;
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; if (q) f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
    voices++; s.onended = () => voices--;
  }
  function tone(t, dur, f0, f1, gain, type) {
    if (voices > 46 || gain < 0.004) return;
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05); voices++; o.onended = () => voices--;
  }
  const S = {};
  S.init = init;
  S.setVolume = (v) => { if (master) master.gain.value = v * 0.8; };
  S.listen = (p) => L.copy(p);
  // Heavy turbolaser battery shot: a thump and a falling zap. mine = fired by the player's ship.
  S.battery = (p, mine) => {
    if (!ok()) return; const g = gainAt(p, 700) * (mine ? 1 : 0.7); if (g < 0.03 || !limit(mine ? 'batM' : 'bat', mine ? 0.045 : 0.07)) return;
    const t = ctx.currentTime;
    tone(t, 0.32, 520 + Math.random() * 120, 70, 0.16 * g, 'sawtooth'); tone(t, 0.4, 90, 38, 0.35 * g);
    burst(t, 0.25, 2600, 300, 0.12 * g, 'bandpass', 1.2);
  };
  S.blaster = (p, team) => {
    if (!ok()) return; const g = gainAt(p, 220); if (g < 0.05 || !limit('bl' + team, 0.06)) return;
    const t = ctx.currentTime, f = team ? 1300 : 1700;
    tone(t, 0.11, f + Math.random() * 300, f * 0.35, 0.07 * g, 'square');
  };
  // The remote fighter's cannons: a short, punchy double crack.
  S.cannon = (p) => {
    if (!ok() || !limit('cannon', 0.05)) return; const g = gainAt(p, 300), t = ctx.currentTime;
    tone(t, 0.09, 900 + Math.random() * 100, 240, 0.09 * g, 'square'); burst(t, 0.07, 3200, 900, 0.07 * g, 'bandpass', 2);
  };
  S.flak = (p) => { if (!ok()) return; const g = gainAt(p, 300); if (g < 0.06 || !limit('flak', 0.05)) return; burst(ctx.currentTime, 0.12, 1800, 500, 0.12 * g, 'bandpass', 2); };
  S.hit = (p, shield, big) => {
    if (!ok()) return; const g = gainAt(p, 500) * (big ? 1.4 : 1); if (g < 0.04 || !limit(shield ? 'hs' : 'hh', 0.05)) return;
    const t = ctx.currentTime;
    if (shield) { tone(t, 0.35, 300 + Math.random() * 60, 180, 0.09 * g, 'triangle'); burst(t, 0.2, 4000, 1500, 0.04 * g, 'highpass'); }
    else { burst(t, 0.4, 1500, 120, 0.25 * g); tone(t, 0.2, 140, 50, 0.18 * g, 'square'); }
  };
  S.explosion = (p, size) => {
    if (!ok()) return; const s = size || 1, g = gainAt(p, 600 * s); if (g < 0.02) return;
    const t = ctx.currentTime;
    burst(t, 0.8 + 1.4 * s, 2200, 50, Math.min(0.9, 0.5 * g * s), 'lowpass'); tone(t, 0.7 + s, 70, 22, Math.min(0.9, 0.55 * g * s));
    if (s > 1.5) for (let i = 1; i < 4; i++) burst(t + i * (0.15 + Math.random() * 0.3), 1.2, 1500, 60, 0.3 * g, 'lowpass');
  };
  S.small = (p) => { if (!ok()) return; const g = gainAt(p, 250); if (g < 0.05 || !limit('sm', 0.04)) return; const t = ctx.currentTime; burst(t, 0.5, 2400, 200, 0.25 * g); };
  S.torp = (p) => { if (!ok()) return; const g = gainAt(p, 400); if (g < 0.05) return; const t = ctx.currentTime; burst(t, 0.9, 400, 2500, 0.14 * g, 'bandpass', 3); tone(t, 0.6, 220, 660, 0.05 * g, 'sawtooth'); };
  S.launch = (p) => { if (!ok()) return; const g = gainAt(p, 300); if (g < 0.05 || !limit('ln', 0.15)) return; burst(ctx.currentTime, 0.7, 300, 3000, 0.1 * g, 'bandpass', 2); };
  S.jump = (p) => { if (!ok()) return; const g = Math.max(0.25, gainAt(p, 2000)); const t = ctx.currentTime; tone(t, 1.2, 1600, 60, 0.18 * g, 'sawtooth'); burst(t, 1.6, 6000, 80, 0.3 * g); };
  S.alarm = () => { if (!ok() || !limit('alarm', 1.2)) return; const t = ctx.currentTime; tone(t, 0.18, 880, 860, 0.07, 'square'); tone(t + 0.22, 0.18, 660, 650, 0.07, 'square'); };
  S.ui = () => { if (!ok()) return; tone(ctx.currentTime, 0.06, 1400, 1000, 0.05, 'triangle'); };
  S.lock = () => { if (!ok()) return; const t = ctx.currentTime; tone(t, 0.05, 1800, 1800, 0.05, 'sine'); tone(t + 0.07, 0.07, 2400, 2400, 0.05, 'sine'); };
  S.deny = () => { if (!ok()) return; tone(ctx.currentTime, 0.12, 220, 200, 0.06, 'square'); };
  S.engine = (on, thr) => {
    if (!ctx) return; const t = ctx.currentTime, a = on ? 1 : 0;
    engGain.gain.setTargetAtTime(a * (0.08 + 0.12 * Math.abs(thr)), t, 0.4);
    engFilt.frequency.setTargetAtTime(90 + 160 * Math.abs(thr), t, 0.5);
    humGain.gain.setTargetAtTime(a * (0.015 + 0.03 * Math.abs(thr)), t, 0.4);
  };
  return S;
})();
