// Valor Bay — sound, all synthesized: punches and swooshes, web thwips, energy bolts, fire and ice, explosions,
// cars and horns, sirens, a city hum; and a brassy heroic score that swells in a fight and turns dark when a
// supervillain is about

const AUDIO = (() => {
  let ctx = null, master, sfxBus, musBus, noiseBuf, amb = {};
  const busy = {};
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = OPTS.vol; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(comp);
    musBus = ctx.createGain(); musBus.gain.value = OPTS.music * 0.5; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // city hum and wind (louder up high and at speed)
    amb.city = noiseSrc(); amb.cityF = filt('lowpass', 300, 0.7); amb.cityG = gain(0.05);
    amb.city.connect(amb.cityF); amb.cityF.connect(amb.cityG); amb.cityG.connect(sfxBus);
    amb.wind = noiseSrc(); amb.windF = filt('bandpass', 600, 0.8); amb.windG = gain(0);
    amb.wind.connect(amb.windF); amb.windF.connect(amb.windG); amb.windG.connect(sfxBus);
    MUSIC.attach(ctx, musBus, noiseBuf);
  }
  const now = () => ctx.currentTime;
  function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(0, Math.random() * 1.5); return s; }
  function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function place(x, z, range = 70) {
    if (x === undefined) return [1, 0];
    const c = R.camera.position, d = dist(x, z, c.x, c.z);
    const v = clamp(1 - d / range, 0, 1) ** 1.5;
    const a = angWrap(yawOf(x - c.x, z - c.z) - CAM.yaw);
    return [v, clamp(-Math.sin(a), -1, 1) * 0.8];
  }
  function out(v, pan) {
    const g = gain(v), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; g.connect(p); p.connect(sfxBus); } else g.connect(sfxBus);
    return g;
  }
  function env(g, t0, a, peak, dec) { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec); }
  function tone(dst, type, f0, f1, dur, vol, t0 = now(), a = 0.01) {
    const o = ctx.createOscillator(), g = gain(0); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    env(g, t0, a, vol, dur); o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + dur + a + 0.05);
    return o;
  }
  function burst(dst, type, f0, f1, dur, vol, q = 1, t0 = now(), a = 0.005) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = filt(type, f0, q), g = gain(0);
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    env(g, t0, a, vol, dur); s.connect(f); f.connect(g); g.connect(dst); s.start(t0, Math.random()); s.stop(t0 + dur + a + 0.05);
  }
  const LOUD = { boom: 300, roar: 300, stomp: 250, villain: 9999, thunder: 400, nova: 300, crash: 140, alarmBell: 120, win: 9999, down: 9999, slowmo: 9999 };
  function sfx(name, x, z) {
    if (!ctx) return;
    const t = now();
    if (busy[name] && t - busy[name] < 0.045) return;
    busy[name] = t;
    const [v, pan] = place(x, z, LOUD[name] || 80);
    if (v < 0.01) return;
    const o = out(v, pan);
    switch (name) {
      case 'punch': burst(o, 'lowpass', 1600, 300, 0.12, 0.9, 1); tone(o, 'sine', 160, 60, 0.12, 0.8); break;
      case 'punchBig': burst(o, 'lowpass', 2400, 200, 0.25, 1, 1); tone(o, 'sine', 120, 35, 0.3, 1); burst(o, 'bandpass', 3000, 900, 0.08, 0.4, 2); break;
      case 'swish': burst(o, 'bandpass', 2600, 900, 0.14, 0.3, 1.8); break;
      case 'whoosh': burst(o, 'bandpass', 500, 2400, 0.35, 0.5, 1.2); break;
      case 'thud': case 'land': tone(o, 'sine', 110, 40, 0.25, 0.9); burst(o, 'lowpass', 400, 80, 0.2, 0.6); break;
      case 'jump': burst(o, 'bandpass', 600, 1600, 0.2, 0.25, 1); break;
      case 'leap': tone(o, 'sine', 90, 30, 0.5, 1); burst(o, 'lowpass', 900, 100, 0.5, 0.8); burst(o, 'bandpass', 400, 2000, 0.6, 0.4, 1); break;
      case 'stomp': tone(o, 'sine', 70, 25, 1.0, 1.2); burst(o, 'lowpass', 400, 40, 1.2, 1.0); break;
      case 'clap': burst(o, 'highpass', 1500, 600, 0.15, 1, 0.7); tone(o, 'sine', 80, 30, 0.6, 1); burst(o, 'lowpass', 800, 60, 0.9, 0.8); break;
      case 'thwip': burst(o, 'bandpass', 3800, 1200, 0.09, 0.6, 3); tone(o, 'sine', 1800, 900, 0.07, 0.15); break;
      case 'grab': burst(o, 'bandpass', 1200, 600, 0.08, 0.4, 2); break;
      case 'webBomb': for (let i = 0; i < 6; i++) burst(o, 'bandpass', rr(2500, 4500), 1000, 0.1, 0.5, 3, t + i * 0.03); tone(o, 'sine', 200, 80, 0.3, 0.6); break;
      case 'bolt': tone(o, 'square', 1400, 300, 0.12, 0.12); burst(o, 'highpass', 4000, 2000, 0.1, 0.25, 1); break;
      case 'beamStart': tone(o, 'sawtooth', 200, 900, 0.4, 0.15); break;
      case 'beam': tone(o, 'sawtooth', 320 + Math.random() * 30, 300, 0.16, 0.09); burst(o, 'bandpass', 2000, 1800, 0.16, 0.15, 3); break;
      case 'zap': for (let i = 0; i < 5; i++) burst(o, 'highpass', 3000, 1500, 0.04, 0.6, 1, t + i * 0.025); tone(o, 'square', 90, 60, 0.25, 0.2); break;
      case 'thunder': burst(o, 'lowpass', 1500, 60, 1.6, 1.2, 0.8); tone(o, 'sine', 60, 25, 1.2, 0.8); break;
      case 'flame': burst(o, 'lowpass', 1800, 400, 0.4, 0.6, 0.7); break;
      case 'fireball': burst(o, 'lowpass', 2000, 120, 0.6, 1, 0.7); tone(o, 'sine', 100, 40, 0.4, 0.7); break;
      case 'freeze': for (let i = 0; i < 6; i++) tone(o, 'sine', rr(2000, 4500), rr(1500, 3000), 0.15, 0.08, t + i * 0.04); burst(o, 'highpass', 5000, 3000, 0.3, 0.4); break;
      case 'shatter': for (let i = 0; i < 10; i++) tone(o, 'sine', rr(2500, 6000), rr(2000, 5000), 0.2, 0.09, t + i * 0.02); burst(o, 'highpass', 3500, 2000, 0.35, 0.7); break;
      case 'tornado': burst(o, 'bandpass', 300, 1200, 2.2, 0.6, 0.8, t, 0.3); break;
      case 'nova': tone(o, 'sawtooth', 80, 1200, 0.5, 0.2); burst(o, 'lowpass', 3000, 80, 1.6, 1.2, 0.6); tone(o, 'sine', 60, 25, 1.4, 1); break;
      case 'slowmo': tone(o, 'sawtooth', 600, 80, 1.2, 0.2); burst(o, 'lowpass', 1000, 100, 1.2, 0.4); break;
      case 'crunch': for (let i = 0; i < 4; i++) burst(o, 'bandpass', 1500 + i * 300, 600, 0.06, 0.6, 3, t + i * 0.05); tone(o, 'sine', 90, 40, 0.25, 0.5); break;
      case 'clang': tone(o, 'triangle', 420, 380, 0.4, 0.3); tone(o, 'triangle', 1130, 1100, 0.3, 0.15); burst(o, 'bandpass', 2500, 1500, 0.08, 0.5, 3); break;
      case 'crash': burst(o, 'lowpass', 2500, 100, 0.8, 1); for (let i = 0; i < 5; i++) tone(o, 'square', rr(300, 900), rr(200, 500), 0.35, 0.05, t + i * 0.04); tone(o, 'sine', 80, 30, 0.6, 0.9); break;
      case 'boom': burst(o, 'lowpass', 1800, 50, 1.4, 1.3, 0.7); tone(o, 'sine', 70, 25, 1.0, 1.1); break;
      case 'missile': burst(o, 'bandpass', 800, 2500, 0.5, 0.4, 1); break;
      case 'gun': burst(o, 'lowpass', 3000, 300, 0.12, 1, 0.8); burst(o, 'bandpass', 1200, 300, 0.25, 0.3, 1, t + 0.03); break;
      case 'laser': tone(o, 'square', 1800, 400, 0.12, 0.08); break;
      case 'alert': tone(o, 'square', 600, 600, 0.08, 0.05); tone(o, 'square', 800, 800, 0.08, 0.05, t + 0.1); break;
      case 'horn': tone(o, 'square', 415, 415, 0.4, 0.05); tone(o, 'square', 523, 523, 0.4, 0.04); break;
      case 'splash': burst(o, 'lowpass', 2500, 300, 0.6, 0.7, 0.7); burst(o, 'bandpass', 1200, 600, 0.3, 0.3, 2, t + 0.1); break;
      case 'hurt': tone(o, 'sawtooth', 300, 120, 0.15, 0.12); burst(o, 'lowpass', 900, 200, 0.12, 0.5); break;
      case 'down': tone(o, 'sawtooth', 400, 60, 1.2, 0.18); tone(o, 'sine', 200, 40, 1.4, 0.3); break;
      case 'roar': { const os = ctx.createOscillator(), g = gain(0), f = filt('lowpass', 900, 2); os.type = 'sawtooth'; os.frequency.setValueAtTime(90, t); os.frequency.linearRampToValueAtTime(140, t + 0.4); os.frequency.linearRampToValueAtTime(70, t + 1.4); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 1.5); os.connect(f); f.connect(g); g.connect(o); os.start(t); os.stop(t + 1.6); burst(o, 'bandpass', 500, 300, 1.4, 0.5, 2, t, 0.2); break; }
      case 'alarmBell': for (let i = 0; i < 10; i++) tone(o, 'square', 1250, 1250, 0.05, 0.05, t + i * 0.1); break;
      case 'villain': [0, 0.25, 0.5].forEach((d2, i) => { tone(o, 'sawtooth', [110, 104, 98][i], [110, 104, 98][i], 0.5, 0.15, t + d2); tone(o, 'sawtooth', [165, 156, 147][i], [165, 156, 147][i], 0.5, 0.1, t + d2); }); tone(o, 'sine', 55, 40, 1.5, 0.6, t + 0.75); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(o, 'square', f, f, 0.18, 0.06, t + i * 0.09)); break;
      case 'siren': { const os = ctx.createOscillator(), g = gain(0.06); os.type = 'square'; for (let i = 0; i < 4; i++) { os.frequency.setValueAtTime(700, t + i * 0.5); os.frequency.linearRampToValueAtTime(1000, t + i * 0.5 + 0.25); os.frequency.linearRampToValueAtTime(700, t + i * 0.5 + 0.5); } g.gain.setValueAtTime(0.06, t); g.gain.linearRampToValueAtTime(0, t + 2); os.connect(g); g.connect(o); os.start(t); os.stop(t + 2.1); break; }
    }
  }
  function update(dt) {
    if (!ctx) return;
    master.gain.value = OPTS.vol;
    musBus.gain.value = OPTS.music * 0.5;
    if (P) {
      const sp = Math.hypot(P.vx, P.vy, P.vz), hgt = clamp((P.y - 20) / 150, 0, 1);
      amb.windG.gain.value = damp(amb.windG.gain.value, clamp(sp / 50, 0, 1) * 0.25 + hgt * 0.06, 4, dt);
      amb.windF.frequency.value = 300 + sp * 25;
      amb.cityG.gain.value = damp(amb.cityG.gain.value, 0.05 * (1 - hgt), 2, dt);
    }
    MUSIC.update(dt);
  }
  return { init, sfx, update, music: (on) => MUSIC.on(on), get ctx() { return ctx; } };
})();

// ---------- the score: four bars of a bright progression with brass stabs and drums; a darker minor turn for villains ----------
const MUSIC = (() => {
  let ctx = null, bus = null, noise = null, playing = false, nextT = 0, step = 0, inten = 0, villain = 0;
  const BPM = 132, S = 60 / BPM / 4;
  // chord roots (semitones from C) and qualities, one per bar
  const HERO = [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']];
  const DARK = [[9, 'm'], [5, 'M'], [2, 'm'], [4, 'M']];
  const MEL = [12, -1, 14, 16, -1, 19, -1, 16, 17, -1, 16, 14, 12, -1, -1, -1, 19, -1, 17, 16, -1, 14, -1, 12, 14, -1, 16, -1, 12, -1, -1, -1];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function attach(c, b, n) { ctx = c; bus = b; noise = n; }
  function on(v) { playing = v; if (v && ctx) nextT = ctx.currentTime + 0.1; }
  function note(type, f, t, dur, vol, cutoff = 2400) {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(kind, t, vol) {
    if (kind === 'k') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.25); return; }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 's' ? 0.18 : 0.05));
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + 0.2);
  }
  function update(dt) {
    if (!ctx || !playing) return;
    // louder drums in a fight, the dark progression when a villain is loose
    const fight = FOES.list.some((f) => f.aggro && !f.ko && P && dist(f.x, f.z, P.x, P.z) < 60);
    const vill = FOES.list.some((f) => f.boss && !f.ko && P && dist(f.x, f.z, P.x, P.z) < 160);
    inten = damp(inten, fight ? 1 : 0.25, 0.5, dt); villain = vill ? 1 : 0;
    while (nextT < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 16) % 4, s16 = step % 16, prog = villain ? DARK : HERO;
      const [root, q] = prog[bar], base = 48 + root;
      const third = q === 'M' ? 4 : 3;
      const t = nextT;
      // bass: root on the beat, octave on the off-beat
      if (s16 % 4 === 0) note('triangle', mtof(base - 12), t, S * 3, 0.32, 900);
      if (s16 % 4 === 2) note('triangle', mtof(base), t, S * 1.5, 0.2, 900);
      // brass stabs: the chord on 1 and the "and" of 2, sustained pad otherwise
      if (s16 === 0 || s16 === 6 || (inten > 0.6 && s16 === 12)) for (const iv of [0, third, 7, 12]) note('sawtooth', mtof(base + 12 + iv), t, S * (s16 === 0 ? 3.5 : 1.8), 0.045 + inten * 0.02, 1800);
      if (s16 === 0) for (const iv of [0, third, 7]) note('triangle', mtof(base + 24 + iv), t, S * 15, 0.03, 3000);
      // melody: the hero motif, only when things are lively
      const m = MEL[(step % 32)];
      if (m >= 0 && inten > 0.5 && !villain) note('square', mtof(60 + m + (bar === 2 ? -3 : bar === 3 ? -7 : bar === 1 ? -5 : 0) + (bar ? 0 : 0)), t, S * 1.8, 0.05, 2600);
      if (villain && s16 % 8 === 4) note('sawtooth', mtof(base + 12 + 6), t, S * 2, 0.05, 1200);
      // drums
      if (s16 % 4 === 0) drum('k', t, 0.5 * (0.5 + inten * 0.5));
      if (s16 === 4 || s16 === 12) drum('s', t, 0.18 + inten * 0.15);
      if (s16 % 2 === 0) drum('h', t, 0.05 + inten * 0.05);
      if (inten > 0.7 && s16 === 14) drum('k', t, 0.4);
      nextT += S; step++;
    }
  }
  return { attach, on, update };
})();
