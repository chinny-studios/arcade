// Veyra Below — synthesised sound effects and generative music (Web Audio, no files)

const AUDIO = (() => {
  let ctx = null, master, sfxBus, musBus, verb, verbSend, noiseBuf, comp;
  let vol = { music: 0.5, sfx: 0.7 };
  let track = null, nextBar = 0, bar = 0, timer = null, intensity = 0, tgtIntensity = 0;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = vol.music * 0.5; musBus.connect(master);
    // reverb from a decaying noise impulse
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir; verbSend = ctx.createGain(); verbSend.gain.value = 0.35; verbSend.connect(verb); verb.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    if (track) startTrack(track, true);
  }
  function setVolume(m, s) { vol.music = m; vol.sfx = s; if (ctx) { musBus.gain.value = m * 0.5; sfxBus.gain.value = s; } }
  // ---------- building blocks ----------
  function env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
  function osc(type, f0, f1, t, dur, peak, out, a = 0.005) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, a, peak, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function noise(t, dur, peak, out, type = 'bandpass', f0 = 1200, f1 = 400, q = 1, a = 0.004) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    env(g, t, a, peak, dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
  }
  function out(x, z, v = 1) {
    // distance attenuation and panning relative to the camera focus
    let gain = v, pan = 0;
    if (x !== undefined) {
      const dx = x - CAM.x, dz = z - CAM.z, d = Math.hypot(dx, dz);
      gain *= clamp(1.2 - d / 26, 0, 1);
      const b = camBasis(); pan = clamp((dx * b.rx + dz * b.rz) / 14, -0.8, 0.8);
    }
    if (gain <= 0.01) return null;
    const g = ctx.createGain(); g.gain.value = gain;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(sfxBus); }
    else g.connect(sfxBus);
    return g;
  }
  const last = {};
  // ---------- effects ----------
  const S = {
    swing(t, o) { noise(t, 0.12, 0.35, o, 'bandpass', 2400, 700, 1.4); },
    heavy(t, o) { noise(t, 0.22, 0.45, o, 'bandpass', 1500, 300, 1.2); },
    hit(t, o) { noise(t, 0.08, 0.5, o, 'lowpass', 3000, 600); osc('sine', 160, 55, t, 0.12, 0.6, o); },
    crit(t, o) { S.hit(t, o); osc('square', 1400, 900, t, 0.1, 0.12, o); osc('sine', 2100, 2100, t + 0.03, 0.15, 0.15, o); },
    miss(t, o) { noise(t, 0.1, 0.12, o, 'highpass', 3000, 2000); },
    shoot(t, o) { osc('square', 980, 260, t, 0.08, 0.16, o); noise(t, 0.05, 0.2, o, 'highpass', 4000, 2000); },
    laser(t, o) { osc('sawtooth', 1400, 180, t, 0.14, 0.13, o); },
    rifle(t, o) { osc('sawtooth', 900, 90, t, 0.22, 0.2, o); noise(t, 0.08, 0.3, o, 'lowpass', 2500, 300); },
    shotgun(t, o) { noise(t, 0.2, 0.55, o, 'lowpass', 2400, 200); osc('sine', 120, 40, t, 0.2, 0.4, o); },
    orb(t, o) { osc('sine', 600, 1200, t, 0.15, 0.18, o); osc('triangle', 300, 600, t, 0.15, 0.1, o); },
    chakram(t, o) { osc('sawtooth', 300, 700, t, 0.2, 0.08, o); noise(t, 0.2, 0.15, o, 'bandpass', 1800, 3000, 3); },
    fire(t, o) { noise(t, 0.35, 0.4, o, 'lowpass', 400, 2400, 0.7, 0.03); osc('sawtooth', 90, 60, t, 0.3, 0.12, o); },
    ice(t, o) { for (let k = 0; k < 4; k++) osc('sine', 1800 + k * 420, 2400 + k * 300, t + k * 0.03, 0.18, 0.08, o); noise(t, 0.25, 0.15, o, 'highpass', 5000, 3000); },
    zap(t, o) { for (let k = 0; k < 5; k++) noise(t + k * 0.03, 0.04, 0.35, o, 'bandpass', 3000 + Math.random() * 3000, 1500, 2); osc('square', 220, 110, t, 0.18, 0.12, o); },
    light(t, o) { [0, 4, 7, 12].forEach((n, k) => osc('sine', 660 * Math.pow(2, n / 12), 660 * Math.pow(2, n / 12), t + k * 0.04, 0.6, 0.1, o, 0.01)); },
    dark(t, o) { osc('sawtooth', 70, 40, t, 0.6, 0.2, o, 0.05); noise(t, 0.5, 0.25, o, 'lowpass', 300, 120, 1, 0.08); },
    heal(t, o) { [0, 4, 7, 11, 14].forEach((n, k) => osc('sine', 520 * Math.pow(2, n / 12), 520 * Math.pow(2, n / 12), t + k * 0.06, 0.45, 0.1, o, 0.01)); },
    buff(t, o) { osc('triangle', 330, 660, t, 0.35, 0.15, o, 0.02); osc('triangle', 495, 990, t + 0.05, 0.35, 0.1, o, 0.02); },
    explode(t, o) { noise(t, 0.9, 0.9, o, 'lowpass', 1600, 60, 0.8); osc('sine', 90, 30, t, 0.6, 0.7, o); },
    die(t, o) { noise(t, 0.4, 0.35, o, 'lowpass', 1400, 120); osc('square', 220, 50, t, 0.3, 0.12, o); },
    hurt(t, o) { osc('square', 200, 90, t, 0.12, 0.2, o); noise(t, 0.1, 0.35, o, 'lowpass', 1800, 300); },
    roar(t, o) { const r = osc('sawtooth', 90, 55, t, 1.3, 0.32, o, 0.1); noise(t, 1.2, 0.4, o, 'bandpass', 500, 200, 1.5, 0.1); osc('sawtooth', 135, 70, t, 1.2, 0.18, o, 0.1); },
    pickup(t, o) { osc('square', 880, 880, t, 0.06, 0.1, o); osc('square', 1320, 1320, t + 0.07, 0.08, 0.1, o); },
    credits(t, o) { osc('sine', 1760, 1760, t, 0.08, 0.12, o); osc('sine', 2640, 2640, t + 0.05, 0.14, 0.1, o); },
    rare(t, o) { [0, 7, 12, 16, 19, 24].forEach((n, k) => osc('triangle', 523 * Math.pow(2, n / 12), 523 * Math.pow(2, n / 12), t + k * 0.07, 0.4, 0.12, o, 0.01)); },
    levelup(t, o) { [0, 4, 7, 12, 7, 12, 16].forEach((n, k) => osc('square', 392 * Math.pow(2, n / 12), 392 * Math.pow(2, n / 12), t + k * 0.09, 0.22, 0.09, o, 0.01)); },
    door(t, o) { osc('sawtooth', 120, 480, t, 0.3, 0.12, o, 0.02); noise(t, 0.3, 0.15, o, 'bandpass', 800, 2000, 4); },
    open(t, o) { osc('sawtooth', 480, 120, t, 0.3, 0.12, o, 0.02); },
    tele(t, o) { osc('sine', 200, 1600, t, 0.7, 0.18, o, 0.05); noise(t, 0.7, 0.18, o, 'bandpass', 400, 4000, 2, 0.05); },
    spawn(t, o) { osc('sine', 1200, 300, t, 0.4, 0.1, o, 0.02); noise(t, 0.4, 0.1, o, 'highpass', 6000, 2000); },
    ui(t, o) { osc('square', 1200, 1200, t, 0.03, 0.06, o); },
    uiok(t, o) { osc('square', 900, 900, t, 0.04, 0.07, o); osc('square', 1350, 1350, t + 0.05, 0.05, 0.07, o); },
    uiback(t, o) { osc('square', 700, 500, t, 0.07, 0.06, o); },
    buy(t, o) { S.credits(t, o); },
    error(t, o) { osc('square', 180, 180, t, 0.12, 0.1, o); osc('square', 140, 140, t + 0.13, 0.15, 0.1, o); },
    just(t, o) { osc('sine', 1600, 2400, t, 0.12, 0.14, o); },
    pb(t, o) { osc('sawtooth', 110, 880, t, 0.8, 0.25, o, 0.1); noise(t, 1, 0.3, o, 'bandpass', 300, 5000, 1, 0.2); },
    block(t, o) { osc('square', 600, 500, t, 0.06, 0.2, o); noise(t, 0.05, 0.3, o, 'highpass', 5000, 3000); },
    capsule(t, o) { [12, 7, 4, 0].forEach((n, k) => osc('sine', 440 * Math.pow(2, n / 12), 440 * Math.pow(2, n / 12), t + k * 0.12, 0.5, 0.08, o, 0.02)); },
    step(t, o) { noise(t, 0.04, 0.05, o, 'lowpass', 600, 200); },
  };
  function sfx(name, x, z, v = 1) {
    if (!ctx || !S[name]) return;
    const now = ctx.currentTime;
    if (last[name] && now - last[name] < 0.03) return; // avoid stacking identical sounds
    last[name] = now;
    const o = out(x, z, v); if (!o) return;
    S[name](now + 0.005, o);
    if (['fire', 'ice', 'light', 'dark', 'heal', 'explode', 'roar', 'rare', 'levelup', 'tele', 'pb', 'capsule'].includes(name)) o.connect(verbSend);
  }
  // ---------- music ----------
  const TRACKS = {
    title: { bpm: 66, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 6], pad: 0.9, arp: 0.35, bass: 0.5, drums: 0, lead: 0.3, arpWave: 'sine' },
    hub: { bpm: 84, root: 48, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 4, 5, 3], pad: 0.6, arp: 0.6, bass: 0.6, drums: 0.25, lead: 0.25, arpWave: 'triangle' },
    forest: { bpm: 96, root: 45, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 6, 4], pad: 0.6, arp: 0.7, bass: 0.7, drums: 0.45, lead: 0.3, arpWave: 'triangle' },
    caves: { bpm: 84, root: 40, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 5, 6], pad: 0.8, arp: 0.45, bass: 0.9, drums: 0.4, lead: 0.2, arpWave: 'sawtooth' },
    mines: { bpm: 112, root: 43, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 6, 4], pad: 0.5, arp: 0.9, bass: 0.8, drums: 0.55, lead: 0.15, arpWave: 'square' },
    ruins: { bpm: 70, root: 38, scale: [0, 2, 3, 5, 7, 8, 11], prog: [0, 5, 3, 4], pad: 1.0, arp: 0.4, bass: 0.6, drums: 0.3, lead: 0.35, arpWave: 'sine' },
    boss: { bpm: 144, root: 40, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 0, 5, 6], pad: 0.6, arp: 0.9, bass: 1, drums: 1, lead: 0.4, arpWave: 'sawtooth' },
    victory: { bpm: 100, root: 48, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 0], pad: 0.8, arp: 0.6, bass: 0.6, drums: 0.4, lead: 0.5, arpWave: 'triangle' },
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function note(tr, deg, oct = 0) { const s = tr.scale, n = s.length; const o = Math.floor(deg / n); return tr.root + s[((deg % n) + n) % n] + 12 * (o + oct); }
  function voice(type, f, t, dur, peak, dest, a = 0.01, cutoff = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur - 0.08)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    if (cutoff) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; o.connect(fl); fl.connect(g); } else o.connect(g);
    g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function schedBar(tr, t0) {
    const beat = 60 / tr.bpm, barDur = beat * 4, ch = tr.prog[bar % tr.prog.length];
    const I = intensity;
    const chord = [note(tr, ch), note(tr, ch + 2), note(tr, ch + 4)];
    // pad: detuned saws, filtered
    if (tr.pad) for (const n of chord) for (const det of [-6, 6]) { const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(n + 12); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = 900 + I * 600;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.022 * tr.pad, t0 + barDur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t0 + barDur * 1.02);
      o.connect(f); f.connect(g); g.connect(musBus); g.connect(verbSend); o.start(t0); o.stop(t0 + barDur + 0.1); }
    // bass
    for (let b = 0; b < 4; b++) if (b % 2 === 0 || I > 0.5) voice('triangle', mtof(note(tr, ch, -1)), t0 + b * beat, beat * 0.9, 0.12 * tr.bass, musBus, 0.01);
    // arpeggio in eighths
    const steps = [0, 1, 2, 1, 0, 2, 1, 3];
    for (let s = 0; s < 8; s++) {
      if (Math.random() > 0.55 + tr.arp * 0.45) continue;
      const deg = ch + [0, 2, 4, 7][steps[s]];
      voice(tr.arpWave, mtof(note(tr, deg, 1)), t0 + s * beat / 2, beat * 0.4, 0.028 * tr.arp, musBus, 0.005, 2400);
    }
    // a sparse lead
    if (tr.lead && bar % 2 === 1) { const n = note(tr, ch + [4, 2, 6, 7][(bar >> 1) % 4], 2); voice('sine', mtof(n), t0 + beat * 2, beat * 1.8, 0.035 * tr.lead, verbSend, 0.06); voice('sine', mtof(n), t0 + beat * 2, beat * 1.8, 0.02 * tr.lead, musBus, 0.06); }
    // drums, louder in combat
    const dr = Math.min(1, tr.drums + I * 0.6) * (tr.drums ? 1 : I);
    if (dr > 0.05) for (let s = 0; s < 8; s++) {
      const t = t0 + s * beat / 2;
      if (s % 4 === 0) { osc('sine', 130, 40, t, 0.18, 0.5 * dr, musBus); }
      if (s % 4 === 2 && dr > 0.35) noise(t, 0.12, 0.22 * dr, musBus, 'bandpass', 1800, 900, 0.8);
      if (dr > 0.2) noise(t, 0.03, 0.06 * dr, musBus, 'highpass', 8000, 6000);
    }
  }
  function tick() {
    if (!ctx || !track) return;
    intensity = lerp(intensity, tgtIntensity, 0.15);
    const tr = TRACKS[track];
    while (nextBar < ctx.currentTime + 0.3) { schedBar(tr, nextBar); nextBar += 60 / tr.bpm * 4; bar++; }
  }
  function startTrack(name, force) {
    if (track === name && !force) return;
    track = name;
    if (!ctx) return;
    bar = 0; nextBar = ctx.currentTime + 0.15;
    if (!timer) timer = setInterval(tick, 100);
  }
  function music(name) { startTrack(name); }
  function setIntensity(v) { tgtIntensity = v; }
  return { init, sfx, music, setVolume, setIntensity, get ctx() { return ctx; }, get track() { return track; } };
})();
