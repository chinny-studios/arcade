// Ricky Rescue — synthesized sound: siren (wail, yelp, hi-lo), air horn, engine, monitor beeps, the CPR metronome,
// radio squelch and dispatch tones, crashes, UI clicks. Spoken AED prompts use speech synthesis when available.

const AUDIO = (() => {
  let ctx = null, master, sfx, sirenG, sirenOsc, sirenOsc2, sirenF, hornG, hornO, engG, engO, engF, noiseBuf, ambG;
  let sirenT = 0;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = OPTS.volume; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    // white noise for squelch, crashes, ambience
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // siren: two oscillators through a filter whose cutoff depends on where Ricky is
    sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sawtooth';
    sirenOsc2 = ctx.createOscillator(); sirenOsc2.type = 'square';
    const s2g = ctx.createGain(); s2g.gain.value = 0.3;
    sirenF = ctx.createBiquadFilter(); sirenF.type = 'lowpass'; sirenF.frequency.value = 2500;
    sirenG = ctx.createGain(); sirenG.gain.value = 0;
    sirenOsc.connect(sirenF); sirenOsc2.connect(s2g); s2g.connect(sirenF); sirenF.connect(sirenG); sirenG.connect(sfx);
    sirenOsc.start(); sirenOsc2.start();
    // air horn
    hornG = ctx.createGain(); hornG.gain.value = 0;
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 1400;
    for (const f of [233, 294, 349]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(hf); o.start(); }
    hf.connect(hornG); hornG.connect(sfx);
    // engine
    engO = ctx.createOscillator(); engO.type = 'sawtooth'; engO.frequency.value = 45;
    engF = ctx.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 300;
    engG = ctx.createGain(); engG.gain.value = 0;
    engO.connect(engF); engF.connect(engG); engG.connect(sfx); engO.start();
    // city ambience: soft filtered noise
    const an = ctx.createBufferSource(); an.buffer = noiseBuf; an.loop = true;
    const af = ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 500;
    ambG = ctx.createGain(); ambG.gain.value = 0;
    an.connect(af); af.connect(ambG); ambG.connect(sfx); an.start();
  }
  function setVolume(v) { if (master) master.gain.value = v; }
  function tone(f, dur, type = 'sine', vol = 0.15, when = 0, slide = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.2, freq = 1200, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // per frame: siren pitch pattern, horn, engine
  function update(dt) {
    if (!ctx) return;
    const A = RIG, now = ctx.currentTime;
    const playing = G.mode === 'play' && !G.paused;
    // siren loudness: full outside near the rig, muffled in the cab, quieter in the back
    let sv = 0, cut = 3000;
    if (A && A.siren && playing && R.env !== 'interior') {
      if (G.where === 'cab') { sv = 0.07; cut = 1300; }
      else if (G.where === 'back') { sv = 0.05; cut = 900; }
      else { const d = dist(PLAYER.x, PLAYER.z, A.x, A.z); sv = 0.12 / (1 + d * 0.08); }
    } else if (A && A.siren && playing && R.env === 'interior') { sv = 0.015; cut = 600; }
    sirenT += dt;
    let f = 800;
    const tn = A ? A.tone : 'wail';
    if (tn === 'wail') { const p = (sirenT % 4.8) / 4.8; f = 650 + 850 * (p < 0.5 ? smooth(0, 0.5, p) : 1 - smooth(0.5, 1, p)); }
    else if (tn === 'yelp') { const p = (sirenT % 0.34) / 0.34; f = 700 + 800 * (p < 0.5 ? p * 2 : 2 - p * 2); }
    else { f = (sirenT % 1.2) < 0.6 ? 960 : 770; }
    sirenOsc.frequency.setTargetAtTime(f, now, 0.01); sirenOsc2.frequency.setTargetAtTime(f * 0.5, now, 0.01);
    sirenG.gain.setTargetAtTime(sv * OPTS.sirenVol, now, 0.05); sirenF.frequency.setTargetAtTime(cut, now, 0.1);
    const horn = A && A.horn && playing && G.where === 'cab';
    hornG.gain.setTargetAtTime(horn ? 0.07 : 0, now, 0.02);
    const inRig = A && playing && (G.where === 'cab' || G.where === 'back');
    const sp = A ? Math.abs(A.v) : 0;
    engO.frequency.setTargetAtTime(38 + sp * 2.6 + (A && A.thr ? 14 : 0), now, 0.1);
    engG.gain.setTargetAtTime(inRig ? 0.05 + sp * 0.0012 : 0, now, 0.1);
    engF.frequency.setTargetAtTime(220 + sp * 12, now, 0.1);
    ambG.gain.setTargetAtTime(playing && R.env === 'city' && G.where === 'foot' ? 0.018 : playing && R.env === 'city' ? 0.008 : 0, now, 0.3);
  }
  function speak(text) {
    if (!OPTS.voice || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try { const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.pitch = 0.9; u.volume = OPTS.volume; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no voices */ }
  }
  return {
    init, update, setVolume, speak, tone, noise,
    get ready() { return !!ctx; },
    click() { tone(1400, 0.05, 'square', 0.03); },
    beep(spo2) { tone(600 + clamp(spo2 - 80, 0, 20) * 25, 0.09, 'sine', 0.05); },
    cpr() { tone(1800, 0.03, 'square', 0.04); },
    squelch() { noise(0.18, 0.06, 2200); },
    dispatchTone() { tone(1050, 0.35, 'sine', 0.08); tone(1450, 0.6, 'sine', 0.08, 0.38); },
    crash(k) { noise(0.5, Math.min(0.5, 0.1 + k * 0.03), 260); tone(80, 0.3, 'sine', 0.2, 0, -40); },
    alarm() { for (let i = 0; i < 3; i++) tone(980, 0.12, 'square', 0.05, i * 0.18); },
    shock() { tone(200, 0.4, 'sawtooth', 0.12, 0, 800); noise(0.2, 0.2, 3000, 0.4); },
    chime(g) { const s = g === 'A' || g === 'B' ? [523, 659, 784, 1047] : g === 'C' ? [523, 659, 784] : [440, 392, 349]; s.forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, i * 0.12)); },
  };
})();
function radioTone() { AUDIO.dispatchTone(); }
