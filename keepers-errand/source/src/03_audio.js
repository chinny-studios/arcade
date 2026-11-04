// ---- audio: everything synthesized with WebAudio. Music is generated from chord progressions per track. ----
const Audio2 = (() => {
  let ctx = null, master, musicBus, sfxBus, ambBus, ambFilter, noiseBuf, verb;
  let unlocked = false, muted = false;
  const A = {};
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.connect(comp);
    ambFilter = ctx.createBiquadFilter(); ambFilter.type = 'lowpass'; ambFilter.frequency.value = 6000; ambFilter.connect(comp);
    ambBus = ctx.createGain(); ambBus.connect(ambFilter);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a small feedback-delay "room" for music
    verb = ctx.createDelay(1); verb.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.28; const vf = ctx.createBiquadFilter(); vf.type = 'lowpass'; vf.frequency.value = 2200;
    verb.connect(vf); vf.connect(fb); fb.connect(verb); const vo = ctx.createGain(); vo.gain.value = 0.35; vf.connect(vo); vo.connect(musicBus);
    applyVolumes();
  }
  function applyVolumes() {
    if (!ctx) return;
    musicBus.gain.value = muted ? 0 : OPTS.music * 0.55;
    sfxBus.gain.value = muted ? 0 : OPTS.sfx;
    ambBus.gain.value = muted ? 0 : OPTS.sfx * 0.9;
  }
  A.applyVolumes = applyVolumes;
  A.unlock = () => {
    if (DEBUG && window.__mute) return;
    init(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!unlocked) { unlocked = true; startAmbience(); if (wantTrack) playTrack(wantTrack, true); }
  };
  A.mute = (m = true) => { muted = m; applyVolumes(); };
  const now = () => ctx.currentTime;

  // ---------- voices ----------
  function env(g, t, a, peak, dec, sus, rel, len) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + dec);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + Math.max(a + dec, len));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + dec, len) + rel);
  }
  function osc(type, f, t, len, vol, dest, o = {}) {
    const g = ctx.createGain(), s = ctx.createOscillator();
    s.type = type; s.frequency.setValueAtTime(f, t);
    if (o.slide) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.slideT || len));
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t + len + 0.6); }
    let node = s;
    if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.q || 0.7; s.connect(fl); node = fl; }
    node.connect(g); g.connect(dest);
    env(g, t, o.a || 0.005, vol, o.d || 0.1, o.s == null ? 0.5 : o.s, o.r || 0.08, len);
    s.start(t); s.stop(t + len + (o.r || 0.08) + 0.6);
    return g;
  }
  function noise(t, len, vol, dest, o = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t); f.Q.value = o.q || 1;
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + len);
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(dest);
    env(g, t, o.a || 0.002, vol, o.d || len * 0.5, o.s || 0.2, o.r || 0.05, len);
    s.start(t, Math.random()); s.stop(t + len + (o.r || 0.05) + 0.1);
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- music ----------
  // A track is a key, scale, chord progression (scale degrees), tempo and an instrument palette.
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };
  const TRACKS = {
    title:      { key: 62, scale: 'dorian', prog: [0, 6, 3, 4, 0, 6, 4, 4], bpm: 92, lead: 'flute', pad: true, bass: 'soft', drums: 'brush', swing: 0.1, seed: 11 },
    storm:      { key: 57, scale: 'dorian', prog: [0, 0, 6, 6, 3, 3, 4, 4], bpm: 104, lead: 'accordion', bass: 'pluck', drums: 'folk', swing: 0.16, seed: 3 },
    village:    { key: 60, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], bpm: 124, lead: 'whistle', bass: 'tuba', drums: 'folk', swing: 0.22, seed: 7, chords: 'accordion' },
    indoors:    { key: 65, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], bpm: 96, lead: 'celesta', bass: 'soft', drums: null, swing: 0.12, seed: 5 },
    windmill:   { key: 64, scale: 'mixo', prog: [0, 6, 0, 6, 3, 4, 0, 0], bpm: 88, lead: 'celesta', pad: true, bass: 'soft', drums: null, swing: 0.1, seed: 19 },
    sneak:      { key: 57, scale: 'minor', prog: [0, 0, 5, 5, 3, 3, 4, 4], bpm: 84, lead: 'pizz', bass: 'pizz', drums: 'tick', swing: 0, seed: 23, sparse: true },
    lighthouse: { key: 55, scale: 'minor', prog: [0, 5, 2, 6, 0, 5, 3, 4], bpm: 96, lead: 'organ', pad: true, bass: 'soft', drums: 'tick', swing: 0, seed: 29 },
    boss:       { key: 52, scale: 'minor', prog: [0, 0, 5, 6, 0, 0, 3, 4], bpm: 150, lead: 'square', bass: 'drive', drums: 'march', swing: 0, seed: 31, chords: 'organ' },
    sun:        { key: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], bpm: 118, lead: 'whistle', bass: 'tuba', drums: 'folk', swing: 0.2, seed: 41, chords: 'accordion', pad: true },
    victory:    { key: 60, scale: 'major', prog: [3, 4, 0, 0], bpm: 100, lead: 'flute', bass: 'soft', drums: null, swing: 0, seed: 43, pad: true, once: true },
  };
  // pre-generate an AABA melody per track: 16th-note grid, 8 bars
  function genMelody(tr) {
    srand(tr.seed * 7919);
    const sc = SCALES[tr.scale];
    const phrase = (bars, startDeg) => {
      const notes = []; let deg = startDeg;
      for (let b = 0; b < bars; b++) {
        const rhythm = pick2([[4, 2, 2, 4, 4], [2, 2, 2, 2, 4, 4], [6, 2, 4, 4], [4, 4, 2, 2, 4], [3, 3, 2, 4, 4], [8, 4, 4]]);
        let pos = 0;
        for (const len of rhythm) {
          const strong = pos % 8 === 0;
          if (strong) { const ch = tr.prog[b % tr.prog.length]; const tones = [ch, ch + 2, ch + 4]; deg = tones.reduce((a, c) => (Math.abs(c - deg) < Math.abs(a - deg) ? c : a), tones[0]) + (srnd() < 0.3 ? 7 * (srnd() < 0.5 ? 1 : -1) : 0); }
          else deg += pick2([-1, 1, -2, 2, -1, 1, 0]);
          deg = clamp(deg, -2, 11);
          const rest = !strong && srnd() < (tr.sparse ? 0.35 : 0.12);
          notes.push({ step: b * 16 + pos, len, deg: rest ? null : deg });
          pos += len;
        }
      }
      return notes;
    };
    const pick2 = (a) => a[Math.floor(srnd() * a.length)];
    const Aph = phrase(2, 4), Bph = phrase(2, 2);
    const shift = (ph, by) => ph.map((n) => ({ ...n, step: n.step + by }));
    const total = tr.prog.length >= 8 ? 8 : 4;
    const mel = total === 8 ? [...Aph, ...shift(Aph, 32), ...shift(Bph, 64), ...shift(Aph, 96)] : [...Aph, ...shift(Bph, 32)];
    tr.mel = mel; tr.bars = total;
    const degToMidi = (d) => { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return tr.key + 12 + o * 12 + sc[i]; };
    tr.midi = degToMidi;
    tr.chordMidi = (deg, n) => { const out = []; for (let i = 0; i < n; i++) out.push(degToMidi(deg + i * 2) - 12); return out; };
  }
  for (const k in TRACKS) genMelody(TRACKS[k]);

  function lead(kind, m, t, dur, vol) {
    const f = mtof(m), dest = musicBus;
    const v = vol;
    switch (kind) {
      case 'flute': osc('sine', f, t, dur, v * 0.5, dest, { a: 0.04, d: 0.1, s: 0.8, r: 0.12, vib: 5 }); osc('triangle', f * 2, t, dur, v * 0.06, dest, { a: 0.05, s: 0.6 }); break;
      case 'whistle': osc('sine', f * 2, t, dur, v * 0.32, dest, { a: 0.02, d: 0.08, s: 0.7, r: 0.06, vib: 6.5 }); noise(t, Math.min(dur, 0.06), v * 0.04, dest, { f: f * 2, q: 8 }); break;
      case 'accordion': osc('sawtooth', f, t, dur, v * 0.16, dest, { a: 0.03, d: 0.1, s: 0.8, r: 0.08, lp: 1800, vib: 5.5 }); osc('sawtooth', f * 1.004, t, dur, v * 0.12, dest, { a: 0.03, s: 0.8, lp: 1500 }); break;
      case 'celesta': osc('sine', f * 2, t, 0.05, v * 0.4, dest, { a: 0.002, d: 0.6, s: 0.01, r: 0.4 }); osc('sine', f * 4, t, 0.05, v * 0.1, dest, { a: 0.002, d: 0.25, s: 0.01, r: 0.2 }); break;
      case 'pizz': osc('triangle', f, t, 0.03, v * 0.5, dest, { a: 0.002, d: 0.18, s: 0.01, r: 0.1, lp: 2400 }); break;
      case 'organ': osc('square', f, t, dur, v * 0.08, dest, { a: 0.02, s: 0.9, r: 0.1, lp: 1400 }); osc('sine', f / 2, t, dur, v * 0.2, dest, { a: 0.02, s: 0.9, r: 0.1 }); break;
      case 'square': osc('square', f, t, dur, v * 0.11, dest, { a: 0.005, d: 0.08, s: 0.6, r: 0.05, lp: 2600 }); break;
    }
  }
  function bassNote(kind, m, t, dur) {
    const f = mtof(m - 12);
    if (kind === 'pluck') osc('triangle', f, t, 0.05, 0.5, musicBus, { a: 0.003, d: 0.3, s: 0.05, r: 0.1 });
    else if (kind === 'tuba') osc('sawtooth', f, t, dur * 0.7, 0.32, musicBus, { a: 0.02, d: 0.1, s: 0.7, r: 0.06, lp: 500 });
    else if (kind === 'pizz') osc('triangle', f, t, 0.02, 0.5, musicBus, { a: 0.002, d: 0.2, s: 0.01, r: 0.1 });
    else if (kind === 'drive') osc('sawtooth', f, t, dur * 0.8, 0.28, musicBus, { a: 0.005, d: 0.06, s: 0.6, r: 0.04, lp: 700 });
    else osc('sine', f, t, dur * 0.8, 0.45, musicBus, { a: 0.02, d: 0.1, s: 0.8, r: 0.1 });
  }
  function drum(kind, step, t) {
    const s = step % 16;
    if (kind === 'folk') {
      if (s === 0 || s === 8) osc('sine', 110, t, 0.05, 0.6, musicBus, { slide: 45, slideT: 0.12, d: 0.15, s: 0.01 });
      if (s === 4 || s === 12) noise(t, 0.08, 0.18, musicBus, { f: 1800, q: 0.8, d: 0.08 });
      if (s % 2 === 0) noise(t, 0.02, 0.05, musicBus, { f: 8000, q: 1, type: 'highpass' });
    } else if (kind === 'brush') {
      if (s % 4 === 2) noise(t, 0.12, 0.04, musicBus, { f: 5000, q: 0.5, a: 0.04 });
      if (s === 0) osc('sine', 90, t, 0.05, 0.35, musicBus, { slide: 45, d: 0.2, s: 0.01 });
    } else if (kind === 'tick') {
      if (s % 4 === 0) osc('sine', 1800, t, 0.01, 0.06, musicBus, { d: 0.03, s: 0.01 });
      if (s === 0) osc('sine', 70, t, 0.05, 0.4, musicBus, { slide: 40, d: 0.3, s: 0.01 });
    } else if (kind === 'march') {
      if (s % 4 === 0) osc('sine', 100, t, 0.05, 0.7, musicBus, { slide: 40, slideT: 0.1, d: 0.15, s: 0.01 });
      if (s === 4 || s === 12 || s === 14) noise(t, 0.1, 0.22, musicBus, { f: 1500, q: 0.7 });
      if (s % 2 === 1) noise(t, 0.02, 0.05, musicBus, { f: 9000, type: 'highpass' });
    }
  }
  let track = null, wantTrack = null, step = 0, nextT = 0, trackGain = null, timer = null;
  function playTrack(name, force) {
    wantTrack = name;
    if (!ctx || !unlocked) return;
    if (track && track.name === name && !force) return;
    const tr = TRACKS[name]; if (!tr) return;
    track = Object.assign({ name }, tr);
    step = 0; nextT = now() + 0.15;
    if (!timer) timer = setInterval(tick, 50);
  }
  A.music = (name) => { if (!name) { wantTrack = null; track = null; return; } playTrack(name); };
  A.track = () => (track ? track.name : null);
  function tick() {
    if (!track || !ctx) return;
    const spb = 60 / track.bpm / 4;
    while (nextT < now() + 0.2) {
      const tr = track, total = tr.bars * 16, s = step % total;
      if (tr.once && step >= total) { track = null; return; }
      const bar = Math.floor(s / 16), ch = tr.prog[bar % tr.prog.length];
      const sw = (s % 2 === 1) ? tr.swing * spb : 0;
      const t = nextT + sw;
      // melody
      for (const n of tr.mel) if (n.step === s && n.deg != null) lead(tr.lead, tr.midi(n.deg), t, n.len * spb * 0.92, 0.9);
      // bass
      if (tr.bass) {
        const root = tr.chordMidi(ch, 1)[0];
        if (tr.bass === 'drive') { if (s % 2 === 0) bassNote('drive', root + (s % 8 === 4 ? 7 : 0), t, spb * 2); }
        else if (s % 16 === 0) bassNote(tr.bass, root, t, spb * 6);
        else if (s % 16 === 8) bassNote(tr.bass, root + 7, t, spb * 6);
      }
      // comping chords
      if (tr.chords && (s % 8 === 4)) for (const m of tr.chordMidi(ch, 3)) lead(tr.chords, m + 12, t, spb * 2.5, 0.35);
      if (tr.pad && s % 16 === 0) for (const m of tr.chordMidi(ch, 3)) osc('triangle', mtof(m + 12), t, spb * 15, 0.05, musicBus, { a: 0.6, d: 0.5, s: 0.8, r: 0.8, lp: 1200 });
      if (tr.drums) drum(tr.drums, s, t);
      step++; nextT += spb;
    }
  }

  // ---------- ambience ----------
  let rainG, windG, waveG, waveLfo;
  function loopNoise(type, f, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(ambBus); s.start();
    return { g, fl };
  }
  function startAmbience() {
    const r = loopNoise('highpass', 2500, 0.5); rainG = r.g;
    const w = loopNoise('bandpass', 400, 0.8); windG = w.g;
    const wl = ctx.createOscillator(), wlg = ctx.createGain(); wl.frequency.value = 0.11; wlg.gain.value = 250; wl.connect(wlg); wlg.connect(w.fl.frequency); wl.start();
    const wv = loopNoise('lowpass', 500, 0.5); waveG = wv.g;
    waveLfo = ctx.createOscillator(); const lg = ctx.createGain(); lg.gain.value = 0.05; waveLfo.frequency.value = 0.13; waveLfo.connect(lg); lg.connect(wv.g.gain); waveLfo.start();
    A.ambience(ambState.rain, ambState.wind, ambState.waves, ambState.indoor);
  }
  const ambState = { rain: 0, wind: 0, waves: 0, indoor: false };
  A.ambience = (rain, wind, waves, indoor) => {
    Object.assign(ambState, { rain, wind, waves, indoor });
    if (!rainG) return;
    const t = now();
    rainG.gain.setTargetAtTime(rain * 0.16, t, 0.5);
    windG.gain.setTargetAtTime(wind * 0.12, t, 0.5);
    waveG.gain.setTargetAtTime(waves * 0.07, t, 0.5);
    ambFilter.frequency.setTargetAtTime(indoor ? 500 : 7000, t, 0.3);
  };

  // ---------- sound effects ----------
  const S = {
    step: () => noise(now(), 0.03, 0.05, sfxBus, { f: 900 + Math.random() * 300, q: 1.5 }),
    jump: () => osc('square', 300, now(), 0.1, 0.08, sfxBus, { slide: 620, lp: 1800, d: 0.1 }),
    land: () => noise(now(), 0.06, 0.12, sfxBus, { f: 400, q: 1 }),
    throw: () => noise(now(), 0.16, 0.12, sfxBus, { f: 900, fTo: 2800, q: 2 }),
    bounce: (n = 0) => osc('sine', 520 + n * 90, now(), 0.04, 0.16, sfxBus, { d: 0.08, s: 0.05 }),
    catch: () => osc('triangle', 880, now(), 0.04, 0.1, sfxBus, { slide: 1320, d: 0.08, s: 0.1 }),
    punch: () => { noise(now(), 0.07, 0.25, sfxBus, { f: 600, q: 0.8 }); osc('sine', 140, now(), 0.05, 0.3, sfxBus, { slide: 60, d: 0.1, s: 0.01 }); },
    swing: () => noise(now(), 0.1, 0.07, sfxBus, { f: 1400, fTo: 600, q: 1.5 }),
    clang: () => { const t = now(); [523, 1187, 1690, 2490].forEach((f, i) => osc('sine', f, t, 0.02, 0.12 / (i + 1), sfxBus, { d: 0.5, s: 0.01, r: 0.3 })); },
    hurt: () => osc('square', 420, now(), 0.18, 0.12, sfxBus, { slide: 160, lp: 1500, d: 0.15 }),
    coin: () => { const t = now(); osc('square', 988, t, 0.06, 0.07, sfxBus, { lp: 4000, d: 0.05 }); osc('square', 1319, t + 0.07, 0.14, 0.07, sfxBus, { lp: 4000, d: 0.1, s: 0.2 }); },
    heart: () => { const t = now(); [660, 880, 1100].forEach((f, i) => osc('triangle', f, t + i * 0.06, 0.08, 0.12, sfxBus, { d: 0.1 })); },
    pickup: () => { const t = now(); [523, 659, 784, 1047].forEach((f, i) => osc('triangle', f, t + i * 0.08, 0.12, 0.13, sfxBus, { d: 0.15 })); },
    fanfare: () => { const t = now(); [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.75], [1047, 0.9]].forEach(([f, d]) => { osc('square', f, t + d, d === 0.9 ? 0.6 : 0.12, 0.08, sfxBus, { lp: 3000, d: 0.1, s: 0.6 }); osc('triangle', f / 2, t + d, 0.15, 0.1, sfxBus); }); },
    alert: () => { const t = now(); osc('square', 1400, t, 0.06, 0.08, sfxBus, { lp: 3000 }); osc('square', 1400, t + 0.12, 0.06, 0.08, sfxBus, { lp: 3000 }); },
    gears: () => { const t = now(); for (let i = 0; i < 7; i++) osc('square', 300 + Math.random() * 900, t + i * 0.03, 0.02, 0.06, sfxBus, { d: 0.05, s: 0.01, lp: 3000 }); noise(t, 0.3, 0.2, sfxBus, { f: 2500, q: 2 }); },
    splash: () => noise(now(), 0.4, 0.25, sfxBus, { f: 1200, fTo: 300, q: 0.6, a: 0.01 }),
    creak: () => osc('sawtooth', 90, now(), 0.5, 0.06, sfxBus, { slide: 130, lp: 600, a: 0.1, vib: 9 }),
    door: () => { noise(now(), 0.25, 0.12, sfxBus, { f: 300, q: 1 }); osc('sine', 80, now(), 0.1, 0.15, sfxBus, { d: 0.2 }); },
    chest: () => { const t = now(); osc('sawtooth', 150, t, 0.25, 0.05, sfxBus, { slide: 220, lp: 900 }); S.pickup(); },
    magic: () => { const t = now(); for (let i = 0; i < 8; i++) osc('sine', 1200 + i * 220, t + i * 0.04, 0.05, 0.05, sfxBus, { d: 0.2, s: 0.05 }); },
    zap: () => { noise(now(), 0.25, 0.2, sfxBus, { f: 3000, q: 4 }); osc('sawtooth', 120, now(), 0.2, 0.08, sfxBus, { slide: 60, lp: 2000 }); },
    roar: () => { osc('sawtooth', 70, now(), 0.8, 0.22, sfxBus, { slide: 45, lp: 500, a: 0.05, vib: 7 }); noise(now(), 0.8, 0.15, sfxBus, { f: 300, q: 0.7 }); },
    boom: () => { osc('sine', 90, now(), 0.4, 0.6, sfxBus, { slide: 30, d: 0.6, s: 0.1 }); noise(now(), 1.2, 0.5, sfxBus, { type: 'lowpass', f: 1200, fTo: 120, q: 0.5, d: 0.8 }); },
    thunder: (dist = 0.5) => { const t = now() + dist * 1.2; noise(t, 2.5, 0.5 * (1.2 - dist), sfxBus, { type: 'lowpass', f: 900 - dist * 500, fTo: 80, q: 0.4, a: 0.02, d: 1.6, s: 0.3 }); },
    blip: (pitch = 1) => osc('square', 300 * pitch + Math.random() * 40, now(), 0.03, 0.035, sfxBus, { lp: 2200, d: 0.03 }),
    menu: () => osc('triangle', 660, now(), 0.03, 0.08, sfxBus, { d: 0.05 }),
    select: () => { osc('triangle', 660, now(), 0.04, 0.08, sfxBus); osc('triangle', 990, now() + 0.06, 0.06, 0.08, sfxBus); },
    mode: (i) => osc('triangle', [523, 659, 392, 330][i] || 523, now(), 0.08, 0.1, sfxBus, { d: 0.1 }),
    snore: () => osc('sawtooth', 70, now(), 0.6, 0.05, sfxBus, { slide: 55, lp: 400, a: 0.2 }),
    stamp: () => { osc('sine', 120, now(), 0.05, 0.5, sfxBus, { slide: 50, d: 0.12, s: 0.01 }); noise(now(), 0.1, 0.3, sfxBus, { f: 800 }); },
    tick: () => osc('square', 2200, now(), 0.005, 0.03, sfxBus, { d: 0.02, s: 0.01 }),
  };
  A.sfx = (name, ...a) => { if (!ctx || !unlocked || muted) return; const f = S[name]; if (f) f(...a); };
  return A;
})();
