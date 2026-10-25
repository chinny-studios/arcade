// Act of God — sound, all synthesised: looping beds (wind, rumble, rain, fire, the swarm, the city) driven every frame by
// what is happening near the camera, and one-shots (thunder, booms, collapses, stings, chimes and a choir).

const AUDIO = (() => {
  let ctx = null, master = null, on = true, noiseB = null, brownB = null;
  const beds = {}, want = {};
  const BED_NAMES = ['wind', 'rumble', 'rain', 'fire', 'buzz', 'city', 'surge'];
  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    master = ctx.createGain(); master.gain.value = on ? 0.8 : 0;
    master.connect(comp); comp.connect(ctx.destination);
    const n = ctx.sampleRate * 3;
    noiseB = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseB.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    brownB = ctx.createBuffer(1, n, ctx.sampleRate);
    const b = brownB.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    const loop = (buf, type, freq, q) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return { s, f, g, v: 0 }; };
    beds.wind = loop(noiseB, 'bandpass', 500, 0.8);
    beds.rumble = loop(brownB, 'lowpass', 120, 0.7);
    beds.rain = loop(noiseB, 'highpass', 2500, 0.3);
    beds.fire = loop(brownB, 'bandpass', 900, 0.6);
    beds.surge = loop(brownB, 'lowpass', 600, 0.5);
    beds.city = loop(brownB, 'lowpass', 300, 0.5);
    // the swarm: detuned saws through a bandpass
    const bg = ctx.createGain(); bg.gain.value = 0; const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 2;
    for (const f of [180, 183.7, 176.2, 361, 355]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lfo = ctx.createOscillator(); lfo.frequency.value = rr(5, 11); const lg = ctx.createGain(); lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency); o.connect(bf); o.start(); lfo.start(); }
    bf.connect(bg); bg.connect(master);
    beds.buzz = { g: bg, f: bf, v: 0 };
  }
  const t0 = () => ctx.currentTime;
  function env(g, a, peak, d, at = t0()) { g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + d); }
  function noiseHit(type, f0, f1, dur, vol, delay = 0, buf) {
    if (!ctx || !on) return;
    const at = t0() + delay;
    const s = ctx.createBufferSource(); s.buffer = buf || noiseB; s.playbackRate.value = rr(0.8, 1.2);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    const g = ctx.createGain(); env(g, 0.01, vol, dur, at);
    s.connect(f); f.connect(g); g.connect(master); s.start(at, rr(0, 2)); s.stop(at + dur + 0.1);
  }
  function tone(type, f, dur, vol, delay = 0, a = 0.01, f2) {
    if (!ctx || !on) return;
    const at = t0() + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
    const g = ctx.createGain(); env(g, a, vol, dur, at);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + a + dur + 0.1);
  }
  // distance from the camera in metres and a matching delay for sound
  const camDist = (x, z) => Math.hypot(x - CAM.tx, z - CAM.tz) * 0.7 + CAM.dist * 0.6;
  const atten = (d) => clamp(1.2 - d / 3500, 0.08, 1);
  return {
    init, get on() { return on; },
    toggle() { on = !on; if (master) master.gain.value = on ? 0.8 : 0; return on; },
    // beds: called every frame with a level; the loudest call of the frame wins
    wind(v) { want.wind = Math.max(want.wind || 0, v); },
    rumble(v) { want.rumble = Math.max(want.rumble || 0, v); },
    rain(v) { want.rain = Math.max(want.rain || 0, v); },
    fire(v) { want.fire = Math.max(want.fire || 0, v); },
    buzz(v) { want.buzz = Math.max(want.buzz || 0, v); },
    surge(v) { want.surge = Math.max(want.surge || 0, v * 1.2); noiseHit('lowpass', 900, 200, 4, 0.5 * v, 0, brownB); },
    update(dt) {
      if (!ctx) return;
      const cityV = 0.12 * clamp(1 - CAM.dist / 3000, 0.1, 1) * (1 - G.quake);
      want.city = Math.max(want.city || 0, G.state === 'play' || G.state === 'title' ? cityV : 0);
      want.fire = Math.max(want.fire || 0, Math.min(0.6, G.stats ? G.stats.burning / 40 : 0) * clamp(1 - CAM.dist / 2500, 0.2, 1));
      want.surge = Math.max(want.surge || 0, WATER.flooded ? Math.min(0.5, WATER.flooded / 300) * (WATER.asleep ? 0 : 1) : 0);
      for (const k of BED_NAMES) {
        const b = beds[k]; if (!b) continue;
        const v = clamp(want[k] || 0, 0, 1.4);
        b.v = damp(b.v, v, v > b.v ? 4 : 1.5, dt);
        b.g.gain.setTargetAtTime(b.v * (k === 'rumble' ? 1.4 : k === 'buzz' ? 0.12 : k === 'rain' ? 0.35 : k === 'city' ? 0.6 : 0.6), ctx.currentTime, 0.05);
        if (k === 'wind') b.f.frequency.setTargetAtTime(300 + b.v * 700 + Math.sin(G.t * 0.7) * 120, ctx.currentTime, 0.2);
        if (k === 'fire' && b.v > 0.05 && Math.random() < b.v * 0.6) noiseHit('highpass', 3000, 2000, 0.03, b.v * 0.2);
        want[k] = 0;
      }
    },
    thunder(x, z, v = 1) { if (!ctx) return; const d = camDist(x, z), a = atten(d) * v, del = Math.min(2.5, d / 1200); noiseHit('lowpass', 3500, 300, 0.25, 0.9 * a, 0); noiseHit('lowpass', 900, 60, 2.5, 0.8 * a, del + 0.05, brownB); },
    boom(x, z, size = 1) { if (!ctx) return; const d = camDist(x, z), a = atten(d * 0.5) * clamp(size, 0.3, 2), del = Math.min(1.8, d / 1500); noiseHit('lowpass', 1800, 40, 1.5 + size, 1.1 * a, del, brownB); tone('sine', 70, 1.2 + size * 0.5, 0.9 * a, del, 0.01, 25); noiseHit('bandpass', 2000, 400, 0.6, 0.5 * a, del); },
    crash(x, z, size = 1) { if (!ctx) return; const d = camDist(x, z), a = atten(d) * clamp(size, 0.2, 1.5) * 0.7; if (a < 0.05) return; noiseHit('lowpass', 1400, 80, 1.6 + size, a, Math.min(1, d / 2000), brownB); noiseHit('bandpass', 1800, 600, 0.4, a * 0.4, Math.min(1, d / 2000) + 0.1); },
    whoosh(k) { want.wind = Math.max(want.wind || 0, k * 0.8); },
    smite() { noiseHit('lowpass', 400, 3000, 1.2, 0.6); tone('sawtooth', 55, 2.2, 0.25, 0, 0.3); tone('sawtooth', 82.4, 2.2, 0.18, 0, 0.3); },
    sting(side) {
      if (!ctx || !on) return;
      if (side === 'wrath') { for (const [f, v] of [[55, 0.22], [58.3, 0.16], [82.4, 0.14], [110, 0.08]]) tone('sawtooth', f, 1.8, v, 0, 0.05); noiseHit('lowpass', 300, 60, 2, 0.4, 0, brownB); }
    },
    chime(v = 0.5) { if (!ctx || !on) return; const scale = [523.3, 587.3, 659.3, 784, 880, 1046.5]; for (let i = 0; i < 2; i++) tone('sine', pick(scale), 1.2, 0.08 * v, i * 0.08, 0.005); },
    choir(v = 1) {
      if (!ctx || !on) return;
      const at = t0();
      const chord = pick([[220, 277.2, 329.6, 440], [196, 246.9, 293.7, 392], [261.6, 329.6, 392, 523.3]]);
      for (const f of chord) for (const det of [-3, 0, 3]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det * 4;
        const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 800; fl.Q.value = 3;
        const fl2 = ctx.createBiquadFilter(); fl2.type = 'lowpass'; fl2.frequency.value = 2400;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.03 * v, at + 1.2); g.gain.linearRampToValueAtTime(0.025 * v, at + 3); g.gain.exponentialRampToValueAtTime(0.0001, at + 6);
        o.connect(fl); fl.connect(fl2); fl2.connect(g); g.connect(master); o.start(at); o.stop(at + 6.2);
      }
      this.chime(1);
    },
    hiss(v) { noiseHit('highpass', 4000, 2000, 0.5, 0.15 * v); },
    powerDown() { tone('sawtooth', 120, 1.6, 0.15, 0, 0.01, 30); tone('sine', 60, 1.6, 0.2, 0, 0.01, 20); },
    click() { tone('triangle', 900, 0.05, 0.05); },
  };
})();
