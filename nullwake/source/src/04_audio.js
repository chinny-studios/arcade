// Nullwake — sound: synthesized effects and a small step sequencer for each stage's music. No audio files.
const AUDIO = (() => {
  let ac = null, sfxBus, musBus, noiseBuf, duck = 1;
  const last = {};
  const mus = { on: false, m: null, step: 0, next: 0, level: 0, timer: 0 };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.connect(comp); musBus = ac.createGain(); musBus.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setVol();
    if (mus.on) { mus.next = ac.currentTime + 0.1; }
    if (!mus.timer) mus.timer = setInterval(schedule, 25);
  }
  function setVol() { if (!ac) return; sfxBus.gain.value = SAVE.opts.sfx * 0.9; musBus.gain.setTargetAtTime(SAVE.opts.music * 0.42 * duck, ac.currentTime, 0.1); }
  function setDuck(v) { duck = v; setVol(); }

  function tone(type, f0, f1, dur, vol, at = 0, bus = sfxBus, filt = 0) {
    const t = (at || ac.currentTime) + 0.005, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = o;
    if (filt) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); out = f; }
    out.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, f0, f1, type = 'bandpass', at = 0, bus = sfxBus, q = 1) {
    const t = (at || ac.currentTime) + 0.005, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const SFX = {
    shoot() { tone('square', 1300, 520, 0.06, 0.035, 0, sfxBus, 3000); },
    lash() { noise(0.16, 0.12, 900, 4200, 'bandpass', 0, sfxBus, 2); },
    beam() { tone('sawtooth', 160, 900, 0.22, 0.06, 0, sfxBus, 2400); noise(0.2, 0.05, 3000, 6000, 'highpass'); },
    missile() { noise(0.25, 0.05, 400, 1600, 'bandpass', 0, sfxBus, 3); },
    zap() { noise(0.12, 0.1, 5000, 1500, 'highpass'); tone('square', 1900, 240, 0.1, 0.03); },
    mine() { tone('triangle', 500, 260, 0.08, 0.05); },
    hit() { noise(0.035, 0.06, 2200, 900, 'bandpass', 0, sfxBus, 1.5); },
    kill() { tone('triangle', 360, 70, 0.09, 0.06); },
    gem(p) { tone('sine', 1050 * p, 1500 * p, 0.07, 0.05); },
    coin() { tone('square', 1580, 1580, 0.05, 0.03); tone('square', 2100, 2100, 0.08, 0.03, ac.currentTime + 0.05); },
    pickup() { [660, 880, 1320].forEach((f, i) => tone('triangle', f, f, 0.12, 0.08, ac.currentTime + i * 0.06)); },
    hurt() { tone('sawtooth', 190, 60, 0.18, 0.12, 0, sfxBus, 900); noise(0.12, 0.1, 600, 200, 'lowpass'); },
    boom() { noise(0.45, 0.22, 900, 80, 'lowpass'); tone('sine', 110, 35, 0.35, 0.22); },
    pop() { noise(0.08, 0.08, 1400, 500, 'lowpass'); },
    level() { [0, 4, 7, 12, 16].forEach((n, i) => tone('square', midi(72 + n), midi(72 + n), 0.16, 0.06, ac.currentTime + i * 0.055, sfxBus, 4000)); },
    chest() { [0, 7, 12, 16, 19, 24].forEach((n, i) => tone('triangle', midi(67 + n), midi(67 + n), 0.3, 0.09, ac.currentTime + i * 0.08)); },
    evolve() { [0, 4, 7, 11, 12, 16, 19, 23, 24].forEach((n, i) => { tone('square', midi(60 + n), midi(60 + n), 0.4, 0.05, ac.currentTime + i * 0.07, sfxBus, 3500); tone('sine', midi(48 + n), midi(48 + n), 0.5, 0.06, ac.currentTime + i * 0.07); }); },
    warn() { for (let i = 0; i < 3; i++) tone('sawtooth', 440, 330, 0.35, 0.08, ac.currentTime + i * 0.45, sfxBus, 1800); },
    ui() { tone('triangle', 900, 1200, 0.05, 0.05); },
    back() { tone('triangle', 700, 450, 0.06, 0.05); },
    deny() { tone('square', 200, 160, 0.12, 0.05, 0, sfxBus, 1200); },
    buy() { [0, 7, 12].forEach((n, i) => tone('triangle', midi(76 + n), midi(76 + n), 0.12, 0.07, ac.currentTime + i * 0.05)); },
    heal() { [0, 5, 9].forEach((n, i) => tone('sine', midi(74 + n), midi(74 + n), 0.2, 0.07, ac.currentTime + i * 0.07)); },
    win() { [0, 4, 7, 12, 7, 12, 16, 24].forEach((n, i) => tone('square', midi(60 + n), midi(60 + n), 0.3, 0.06, ac.currentTime + i * 0.12, sfxBus, 3000)); },
    lose() { [12, 7, 3, 0, -5].forEach((n, i) => tone('triangle', midi(60 + n), midi(60 + n), 0.4, 0.08, ac.currentTime + i * 0.2)); },
  };
  function play(name, arg, gap = 0.035) {
    if (!ac || ac.state !== 'running' || !SFX[name]) return;
    const now = ac.currentTime; if (last[name] && now - last[name] < gap) return; last[name] = now;
    SFX[name](arg);
  }

  // ---- music: four-bar minor progressions; drums and a lead come in as `level` rises ----
  const TITLE = { bpm: 84, root: 45, prog: [0, -4, -7, -5], calm: true };
  function music(m) { mus.m = m; mus.on = !!m; mus.step = 0; if (ac) mus.next = ac.currentTime + 0.12; }
  function schedule() {
    if (!ac || !mus.on || ac.state !== 'running') return;
    const m = mus.m, spb = 60 / m.bpm / 4;
    if (mus.next < ac.currentTime - 0.2) mus.next = ac.currentTime + 0.05;
    while (mus.next < ac.currentTime + 0.15) { playStep(mus.step, mus.next, m, spb); mus.next += spb; mus.step++; }
  }
  function playStep(step, t, m, spb) {
    const bar = Math.floor(step / 16) % 4, s = step % 16, root = m.root + m.prog[bar], lv = m.calm ? -1 : mus.level;
    const chord = [0, 3, 7, 10];
    if (s === 0) for (const n of [0, 3, 7]) tone('triangle', midi(root + 12 + n), midi(root + 12 + n), spb * 16, 0.035, t, musBus, 1400);
    if (lv >= 0) {
      if (s % 4 === 0) { tone('sine', 140, 42, 0.18, 0.32, t, musBus); }
      if (s % 4 === 2) noise(0.04, 0.05, 8000, 8000, 'highpass', t, musBus);
      if (s % 2 === 0) { const n = root - 12 + (s === 6 || s === 14 ? 12 : s === 10 ? 7 : 0); tone('sawtooth', midi(n), midi(n), spb * 1.6, 0.09, t, musBus, 420 + lv * 180); }
    }
    if (lv >= 1 && (s === 4 || s === 12)) { noise(0.14, 0.12, 1800, 900, 'bandpass', t, musBus, 0.8); }
    const arp = chord[(s * (m.calm ? 1 : 3)) % 4] + (s % 8 >= 4 ? 12 : 0);
    if (!m.calm || s % 2 === 0) tone('square', midi(root + 24 + arp), midi(root + 24 + arp), spb * 0.9, m.calm ? 0.018 : 0.022, t, musBus, 2600);
    if (lv >= 2 && (s === 0 || s === 3 || s === 6 || s === 10)) { const n = root + 24 + [0, 7, 3, 10][(s + bar) % 4]; tone('sawtooth', midi(n), midi(n), spb * 2.6, 0.035, t, musBus, 2200); }
  }
  return { init, play, setVol, setDuck, music, title: () => music(TITLE), level: (v) => { mus.level = v; }, get ready() { return !!ac; } };
})();
const sfx = (n, a, g) => AUDIO.play(n, a, g);
