// Tokoyo — procedural audio: effects with distance falloff, ambient beds, generative koto & shakuhachi, taiko for battles

const AU = (() => {
  let ctx = null, master, sfx, amb, mus, noiseBuf, muted = false;
  const beds = {};
  let nextPhrase = 20, drumT = 0, combat = 0;
  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = SETTINGS.vol; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.7; amb.connect(master);
    mus = ctx.createGain(); mus.gain.value = SETTINGS.music; mus.connect(master);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // ambient beds: looping filtered noise with controllable gain
    beds.wind = bed('bandpass', 400, 0.6);
    beds.rain = bed('highpass', 1800, 0.7);
    beds.surf = bed('lowpass', 500, 0.8);
    beds.fire = bed('bandpass', 900, 2);
    beds.insects = bed('bandpass', 4800, 12);
  }
  function bed(type, f, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(amb); s.start();
    return { g, fl };
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  const now = () => ctx.currentTime;
  // ---- building blocks ----
  function out(x, y, z, vol = 1) {
    // distance falloff and stereo pan relative to the camera
    const g = ctx.createGain();
    let v = vol;
    let pan = 0;
    if (x != null) {
      const cp = R.camera.position, dx = x - cp.x, dy = y - cp.y, dz = z - cp.z, d = Math.hypot(dx, dy, dz);
      v *= clamp(1 - d / 45, 0, 1) ** 1.6;
      const yaw = CAM.yaw;
      pan = clamp((-dx * Math.cos(yaw) + dz * Math.sin(yaw)) / Math.max(d, 1), -1, 1) * 0.8;
    }
    if (v < 0.01) return null;
    g.gain.value = v;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(sfx); } else g.connect(sfx);
    return g;
  }
  function noise(dst, t, dur, type, f0, f1, q = 1, a = 0.005, vol = 1) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dst); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(dst, t, dur, type, f0, f1, vol = 1, a = 0.005) {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.05);
  }
  // voice-ish creature sounds: formant-filtered saw
  function voice(dst, t, dur, f0, f1, form, vol = 0.5) {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = form; fl.Q.value = 3;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.05);
  }
  const SFX = {
    chop: (d, t) => { noise(d, t, 0.12, 'bandpass', 900, 300, 2, 0.002, 1); tone(d, t, 0.1, 'triangle', 180, 90, 0.6); },
    pick: (d, t) => { noise(d, t, 0.08, 'highpass', 3000, 2000, 1, 0.001, 0.7); tone(d, t, 0.25, 'square', 1400 + Math.random() * 300, 1300, 0.15); tone(d, t, 0.2, 'triangle', 2100, 2000, 0.15); },
    creak: (d, t) => { for (let i = 0; i < 4; i++) tone(d, t + i * 0.18, 0.25, 'sawtooth', 120 + i * 15, 90, 0.12); noise(d, t + 0.6, 1.4, 'lowpass', 600, 150, 1, 0.3, 0.5); },
    thud: (d, t) => { tone(d, t, 0.6, 'sine', 90, 35, 1); noise(d, t, 0.8, 'lowpass', 400, 80, 1, 0.005, 0.9); },
    swing: (d, t) => noise(d, t, 0.22, 'bandpass', 600, 2200, 1.5, 0.05, 0.4),
    hit: (d, t) => { noise(d, t, 0.12, 'lowpass', 1600, 300, 1, 0.002, 0.9); tone(d, t, 0.12, 'sine', 160, 70, 0.7); },
    hurt: (d, t) => { noise(d, t, 0.15, 'lowpass', 1200, 300, 1, 0.002, 0.8); voice(d, t, 0.25, 220, 160, 900, 0.3); },
    block: (d, t) => { noise(d, t, 0.15, 'bandpass', 1200, 500, 3, 0.001, 0.9); tone(d, t, 0.18, 'triangle', 300, 200, 0.5); },
    parry: (d, t) => { tone(d, t, 0.6, 'triangle', 1800, 1700, 0.4); tone(d, t, 0.6, 'sine', 2700, 2650, 0.25); noise(d, t, 0.1, 'highpass', 4000, 3000, 1, 0.001, 0.6); },
    step: (d, t) => noise(d, t, 0.07, 'lowpass', 700, 200, 1, 0.003, 0.25),
    stepWood: (d, t) => { noise(d, t, 0.06, 'bandpass', 500, 300, 2, 0.002, 0.3); tone(d, t, 0.06, 'triangle', 140, 110, 0.15); },
    stepWater: (d, t) => noise(d, t, 0.18, 'bandpass', 1400, 600, 1, 0.01, 0.35),
    jump: (d, t) => noise(d, t, 0.1, 'lowpass', 900, 400, 1, 0.003, 0.25),
    land: (d, t) => noise(d, t, 0.12, 'lowpass', 500, 150, 1, 0.003, 0.5),
    pickup: (d, t) => { tone(d, t, 0.08, 'triangle', 600, 900, 0.25); tone(d, t + 0.05, 0.1, 'triangle', 900, 1200, 0.2); },
    craft: (d, t) => { for (let i = 0; i < 3; i++) { noise(d, t + i * 0.12, 0.08, 'bandpass', 1500, 800, 2, 0.002, 0.6); tone(d, t + i * 0.12, 0.08, 'triangle', 300, 200, 0.3); } },
    build: (d, t) => { noise(d, t, 0.12, 'bandpass', 700, 300, 2, 0.002, 0.9); tone(d, t, 0.15, 'triangle', 220, 120, 0.5); noise(d, t + 0.12, 0.1, 'bandpass', 800, 400, 2, 0.002, 0.6); },
    destroy: (d, t) => { noise(d, t, 0.5, 'lowpass', 1500, 200, 1, 0.003, 0.9); tone(d, t, 0.3, 'triangle', 200, 60, 0.4); },
    fire: (d, t) => noise(d, t, 0.4, 'lowpass', 2500, 400, 1, 0.01, 0.5),
    eat: (d, t) => { for (let i = 0; i < 3; i++) noise(d, t + i * 0.15, 0.08, 'bandpass', 1000, 600, 2, 0.003, 0.4); },
    drink: (d, t) => { for (let i = 0; i < 3; i++) tone(d, t + i * 0.14, 0.1, 'sine', 400, 260, 0.3); },
    death: (d, t) => { voice(d, t, 1.2, 200, 80, 700, 0.4); noise(d, t + 0.3, 1.0, 'lowpass', 800, 100, 1, 0.01, 0.5); },
    draw: (d, t) => { for (let i = 0; i < 5; i++) tone(d, t + i * 0.08, 0.1, 'sawtooth', 200 + i * 12, 180 + i * 12, 0.05); },
    release: (d, t) => { tone(d, t, 0.18, 'triangle', 110, 70, 0.6); noise(d, t, 0.25, 'bandpass', 2400, 1200, 2, 0.002, 0.3); },
    arrowHit: (d, t) => { noise(d, t, 0.06, 'bandpass', 2000, 800, 2, 0.001, 0.6); tone(d, t, 0.08, 'triangle', 500, 300, 0.2); },
    splash: (d, t) => noise(d, t, 0.5, 'bandpass', 1600, 400, 0.8, 0.01, 0.6),
    door: (d, t) => { tone(d, t, 0.4, 'sawtooth', 160, 120, 0.08); noise(d, t + 0.35, 0.1, 'lowpass', 600, 200, 1, 0.002, 0.5); },
    crow: (d, t) => { voice(d, t, 0.25, 520, 380, 1400, 0.4); voice(d, t + 0.32, 0.25, 500, 360, 1400, 0.35); },
    boar: (d, t) => { voice(d, t, 0.35, 380, 520, 1200, 0.35); voice(d, t + 0.1, 0.25, 300, 200, 800, 0.3); },
    deer: (d, t) => voice(d, t, 0.35, 700, 900, 1800, 0.25),
    gaki: (d, t) => { noise(d, t, 0.45, 'bandpass', 2200, 1200, 4, 0.05, 0.5); voice(d, t, 0.4, 240, 300, 1600, 0.2); },
    kappa: (d, t) => { voice(d, t, 0.15, 900, 600, 1500, 0.3); voice(d, t + 0.18, 0.15, 950, 650, 1500, 0.3); },
    oni: (d, t) => { voice(d, t, 1.0, 90, 60, 400, 0.7); noise(d, t, 1.0, 'lowpass', 300, 100, 1, 0.1, 0.5); },
    bones: (d, t) => { for (let i = 0; i < 5; i++) tone(d, t + i * 0.06 + Math.random() * 0.03, 0.05, 'square', 900 + Math.random() * 800, 600, 0.08); },
    roar: (d, t) => { voice(d, t, 1.6, 140, 70, 500, 0.8); voice(d, t, 1.6, 210, 90, 900, 0.5); noise(d, t, 1.5, 'lowpass', 900, 150, 1, 0.1, 0.6); },
    roots: (d, t) => { noise(d, t, 0.6, 'lowpass', 800, 100, 1, 0.01, 0.9); for (let i = 0; i < 4; i++) noise(d, t + i * 0.1, 0.1, 'bandpass', 1500, 800, 3, 0.002, 0.5); },
    zap: (d, t) => { noise(d, t, 0.4, 'highpass', 5000, 2000, 1, 0.001, 0.8); tone(d, t, 0.4, 'sawtooth', 1200, 80, 0.3); },
    ui: (d, t) => tone(d, t, 0.05, 'triangle', 900, 900, 0.15),
    skill: (d, t) => { [0, 4, 7, 12].forEach((n, i) => tone(d, t + i * 0.08, 0.6, 'triangle', 440 * 2 ** (n / 12), 440 * 2 ** (n / 12), 0.15)); },
    bell: (d, t) => { tone(d, t, 2.5, 'sine', 660, 660, 0.3, 0.003); tone(d, t, 2.0, 'sine', 1660, 1660, 0.1, 0.003); tone(d, t, 3.0, 'sine', 330, 330, 0.2, 0.003); },
  };
  function play(name, x, y, z, vol = 1) {
    if (!ctx || muted) return;
    const f = SFX[name]; if (!f) return;
    const d = out(x, y, z, vol); if (!d) return;
    f(d, now() + 0.01);
  }
  function thunder(v) {
    if (!ctx) return;
    const d = out(null, 0, 0, v), t = now();
    noise(d, t, 3.5, 'lowpass', 400, 40, 1, 0.05, 1); noise(d, t, 0.4, 'lowpass', 2000, 300, 1, 0.005, 0.6);
  }
  // ---- music ----
  const MIYAKO = [0, 1, 5, 7, 8]; // in-scale
  const noteF = (base, deg) => base * 2 ** ((MIYAKO[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5)) / 12);
  function koto(t, f, vol = 0.18) {
    tone(mus, t, 2.2, 'triangle', f, f * 0.998, vol, 0.002);
    tone(mus, t, 1.2, 'sine', f * 2, f * 2, vol * 0.4, 0.002);
    tone(mus, t, 0.5, 'sine', f * 3.01, f * 3, vol * 0.15, 0.002);
  }
  function shaku(t, f, dur, vol = 0.08) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5; const lg = ctx.createGain(); lg.gain.value = f * 0.012; lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.3); g.gain.setValueAtTime(vol, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(mus); o.start(t); o.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    noise(mus, t, dur, 'bandpass', f * 2, f * 2, 6, 0.3, vol * 0.5);
  }
  function phrase() {
    const t = now() + 0.1, base = 196;
    if (Math.random() < 0.55) {
      let deg = 5 + Math.floor(Math.random() * 5), tt = t;
      const n = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < n; i++) {
        koto(tt, noteF(base, deg));
        if (Math.random() < 0.25) koto(tt + 0.08, noteF(base, deg + 2), 0.1);
        deg += [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
        deg = clamp(deg, 2, 12);
        tt += [0.35, 0.5, 0.7, 1.0][Math.floor(Math.random() * 4)];
      }
    } else {
      let deg = 6 + Math.floor(Math.random() * 3), tt = t;
      for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) { const dur = 1.5 + Math.random() * 2; shaku(tt, noteF(base * 2, deg), dur); tt += dur + 0.3; deg += Math.random() < 0.5 ? -1 : 1; }
    }
  }
  function drums(dt) {
    drumT -= dt;
    if (drumT > 0) return;
    const t = now() + 0.05;
    const pat = [1, 0, 0.5, 0, 1, 0.4, 0.7, 0];
    for (let i = 0; i < 8; i++) if (pat[i]) {
      tone(mus, t + i * 0.25, 0.5, 'sine', 70, 42, 0.5 * pat[i] * combat, 0.003);
      noise(mus, t + i * 0.25, 0.15, 'lowpass', 600, 200, 1, 0.002, 0.25 * pat[i] * combat);
    }
    if (Math.random() < 0.5) noise(mus, t + 1.75, 0.08, 'highpass', 3000, 2000, 1, 0.001, 0.15 * combat);
    drumT = 2;
  }
  function update(dt, env) {
    if (!ctx || muted) return;
    master.gain.value = SETTINGS.vol; mus.gain.value = SETTINGS.music;
    const k = Math.min(1, dt * 2);
    const set = (b, v) => { b.g.gain.value = lerp(b.g.gain.value, v, k); };
    set(beds.wind, (0.04 + SKY.windS * 0.12) * (env.inside ? 0.4 : 1) * (1 + (env.height > 25 ? 0.6 : 0)));
    set(beds.rain, SKY.rain * (env.inside ? 0.12 : 0.22));
    set(beds.surf, env.shore * 0.18);
    set(beds.fire, env.fire * 0.12);
    set(beds.insects, SKY.night * (1 - SKY.rain) * 0.035 * (env.biome === 2 ? 0.6 : 1));
    beds.surf.fl.frequency.value = 300 + Math.sin(G.time * 0.5) * 150;
    beds.fire.fl.frequency.value = 600 + Math.random() * 1200;
    // birdsong by day
    if (!SKY.isNight && SKY.rain < 0.3 && env.biome > 0 && Math.random() < dt * 0.25) {
      const t = now(), f = 2400 + Math.random() * 1600, d = out(null, 0, 0, 0.08);
      if (d) for (let i = 0; i < 2 + Math.floor(Math.random() * 4); i++) tone(d, t + i * 0.12, 0.08, 'sine', f, f * (0.8 + Math.random() * 0.5), 1);
    }
    // frogs near ponds at night
    if (SKY.isNight && env.pond && Math.random() < dt * 0.8) { const d = out(null, 0, 0, 0.06); if (d) { const t = now(); tone(d, t, 0.08, 'square', 260, 200, 1); tone(d, t + 0.12, 0.08, 'square', 270, 210, 1); } }
    combat = lerp(combat, env.combat ? 1 : 0, dt * 0.5);
    if (combat > 0.05) drums(dt);
    nextPhrase -= dt;
    if (nextPhrase <= 0 && combat < 0.1) { phrase(); nextPhrase = 35 + Math.random() * 70; }
  }
  return {
    init, resume, play, thunder, update,
    get muted() { return muted; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : SETTINGS.vol; return muted; },
  };
})();
