// Copter City — sound, all synthesized with Web Audio: the rotor's thump and the turbine's whine, wind, fire,
// the siren, one-shot effects, and the dispatcher's voice (speech synthesis when the browser has it).

const AUDIO = (() => {
  let ctx = null, master, sfxBus, musBus, eng, noiseBuf;
  const L = {};
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = OPTS.vol; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = OPTS.music; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // engine chain: everything goes through a lowpass that closes in the cockpit
    eng = ctx.createBiquadFilter(); eng.type = 'lowpass'; eng.frequency.value = 6000; eng.connect(sfxBus);
    // rotor: band-passed noise chopped by the blade rate, plus a low thump
    L.rotN = noise(); L.rotF = ctx.createBiquadFilter(); L.rotF.type = 'bandpass'; L.rotF.frequency.value = 180; L.rotF.Q.value = 0.8;
    L.rotG = ctx.createGain(); L.rotG.gain.value = 0;
    L.lfo = ctx.createOscillator(); L.lfo.type = 'sawtooth'; L.lfo.frequency.value = 14;
    L.lfoG = ctx.createGain(); L.lfoG.gain.value = 0;
    L.chop = ctx.createGain(); L.chop.gain.value = 0;
    L.lfo.connect(L.lfoG); L.lfoG.connect(L.chop.gain);
    L.rotN.connect(L.rotF); L.rotF.connect(L.chop); L.chop.connect(L.rotG); L.rotG.connect(eng);
    L.thump = ctx.createOscillator(); L.thump.type = 'sine'; L.thump.frequency.value = 48;
    L.thG = ctx.createGain(); L.thG.gain.value = 0; L.thumpAM = ctx.createGain(); L.thumpAM.gain.value = 0;
    L.lfo.connect(L.thumpAM.gain); L.thump.connect(L.thumpAM); L.thumpAM.connect(L.thG); L.thG.connect(eng);
    // turbine whine
    L.tur = ctx.createOscillator(); L.tur.type = 'sawtooth'; L.tur.frequency.value = 300;
    L.turF = ctx.createBiquadFilter(); L.turF.type = 'lowpass'; L.turF.frequency.value = 1400;
    L.turG = ctx.createGain(); L.turG.gain.value = 0;
    L.tur.connect(L.turF); L.turF.connect(L.turG); L.turG.connect(eng);
    // wind and fire
    L.wind = noise(); L.windF = ctx.createBiquadFilter(); L.windF.type = 'bandpass'; L.windF.frequency.value = 600; L.windG = ctx.createGain(); L.windG.gain.value = 0;
    L.wind.connect(L.windF); L.windF.connect(L.windG); L.windG.connect(sfxBus);
    L.fire = noise(); L.fireF = ctx.createBiquadFilter(); L.fireF.type = 'bandpass'; L.fireF.frequency.value = 1800; L.fireF.Q.value = 0.5; L.fireG = ctx.createGain(); L.fireG.gain.value = 0;
    L.fire.connect(L.fireF); L.fireF.connect(L.fireG); L.fireG.connect(sfxBus);
    L.fill = noise(); L.fillF = ctx.createBiquadFilter(); L.fillF.type = 'lowpass'; L.fillF.frequency.value = 900; L.fillG = ctx.createGain(); L.fillG.gain.value = 0;
    L.fill.connect(L.fillF); L.fillF.connect(L.fillG); L.fillG.connect(sfxBus);
    // siren
    L.sir = ctx.createOscillator(); L.sir.type = 'square'; L.sir.frequency.value = 700; L.sirF = ctx.createBiquadFilter(); L.sirF.type = 'lowpass'; L.sirF.frequency.value = 2000;
    L.sirG = ctx.createGain(); L.sirG.gain.value = 0; L.sir.connect(L.sirF); L.sirF.connect(L.sirG); L.sirG.connect(sfxBus);
    for (const o of [L.lfo, L.thump, L.tur, L.sir]) o.start();
    MUSIC.attach(ctx, musBus);
  }
  function noise() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(0, Math.random() * 1.5); return s; }
  const set = (p, v, tc = 0.08) => { if (p) p.setTargetAtTime(v, ctx.currentTime, tc); };
  let sirenOn = false, sirT = 0, crackle = 0;
  function update(dt) {
    if (!ctx) return;
    const H = HELI, on = G.city && document.body.dataset.state === 'play';
    const rpm = on ? H.rpm : 0;
    // further away when you're on foot
    const d = G.where === 'foot' ? dist3(PILOT.x, PILOT.y, PILOT.z, H.x, H.y, H.z) : 0;
    const att = G.where === 'foot' ? clamp(14 / (d + 10), 0.05, 1) : 1;
    const inside = CAM.mode === 'cockpit' && G.where === 'heli';
    set(eng.frequency, inside ? 1100 : G.where === 'foot' ? 2400 : 5000);
    const big = H.st ? H.st.hp / 150 : 1;
    set(L.lfo.frequency, 6 + rpm * (H.model && H.model.rotors.length > 1 ? 9 : 11) / Math.sqrt(big));
    set(L.lfoG.gain, 0.5 * rpm); set(L.chop.gain, 0.5 * rpm);
    set(L.rotG.gain, rpm * 0.55 * att * (1 + 0.3 * Math.min(1, Math.abs(H.vy) / 8)));
    set(L.rotF.frequency, 140 + rpm * 120);
    set(L.thG.gain, rpm * 0.5 * att); set(L.thumpAM.gain, 0.5);
    set(L.tur.frequency, 180 + rpm * 520 + (H.engine ? 0 : -100));
    set(L.turG.gain, (H.engine ? rpm * 0.05 : rpm * 0.015) * att);
    const spd = on && G.where === 'heli' ? speedH() : 0;
    set(L.windG.gain, Math.min(0.25, spd / 220) * (inside ? 0.4 : 1)); set(L.windF.frequency, 400 + spd * 18);
    // fire: the closest blaze
    let fd = 1e9, fi = 0;
    if (on) for (const f of FIRE.list) { const dd = dist(f.x, f.z, R.camera.position.x, R.camera.position.z); if (dd < fd) { fd = dd; fi = f.I; } }
    crackle = Math.random() < 0.3 ? rr(0.4, 1) : crackle * 0.9;
    set(L.fireG.gain, on ? clamp(1 - fd / 160, 0, 1) * fi * 0.35 * crackle : 0, 0.02);
    set(L.fillG.gain, on && GEAR.fillSnd > 0 ? 0.3 : 0);
    // the siren alternates two notes
    if (sirenOn && on) { sirT += dt; set(L.sir.frequency, (sirT % 1.2) < 0.6 ? 760 : 590, 0.02); set(L.sirG.gain, 0.06 * (inside ? 0.6 : 1)); } else set(L.sirG.gain, 0);
    master.gain.value = OPTS.vol;
    musBus.gain.value = OPTS.music;
    MUSIC.update(dt);
  }
  // ---------- one-shots ----------
  function tone(type, f0, f1, dur, vol = 0.2, t0 = 0, dest = sfxBus) {
    const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(dur, f, q, vol = 0.3, type = 'lowpass', t0 = 0, f1) {
    const t = ctx.currentTime + t0, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const SFX = {
    click: () => tone('square', 900, 900, 0.04, 0.05),
    blip: () => { tone('square', 660, 660, 0.05, 0.05); tone('square', 880, 880, 0.05, 0.05, 0.06); },
    deny: () => tone('square', 200, 140, 0.18, 0.08),
    ding: () => tone('sine', 1320, 1320, 0.4, 0.15),
    cash: () => { tone('square', 1046, 1046, 0.08, 0.07); tone('square', 1568, 1568, 0.25, 0.07, 0.08); burst(0.15, 6000, 1, 0.05, 'highpass', 0.02); },
    coin: () => { [988, 1319, 1568, 1976].forEach((f, i) => tone('square', f, f, 0.1, 0.06, i * 0.06)); },
    fail: () => { tone('square', 440, 220, 0.5, 0.06); tone('square', 330, 165, 0.6, 0.05, 0.15); },
    radio: () => { burst(0.12, 2400, 1.5, 0.12, 'bandpass'); tone('sine', 1400, 1400, 0.08, 0.06, 0.14); },
    splash: (v = 1) => burst(0.7, 1200, 0.7, 0.3 * v, 'lowpass', 0, 300),
    dump: () => burst(1.4, 800, 0.5, 0.25, 'lowpass', 0, 200),
    hiss: () => burst(1.2, 5000, 0.5, 0.08, 'highpass'),
    crunch: (v = 1) => { burst(0.4, 500, 1, 0.5 * v, 'lowpass', 0, 120); tone('square', 90, 40, 0.25, 0.15 * v); },
    boom: () => { burst(2.2, 600, 0.6, 0.8, 'lowpass', 0, 60); tone('sine', 70, 25, 1.4, 0.5); },
    alarm: () => { for (let i = 0; i < 3; i++) tone('square', 880, 880, 0.12, 0.07, i * 0.25); },
    pop: () => { burst(0.3, 1500, 1, 0.3, 'bandpass'); burst(1.6, 3000, 0.4, 0.08, 'highpass', 0.1); },
    thunk: () => tone('triangle', 220, 120, 0.12, 0.15),
    shot: () => { burst(0.12, 3000, 0.8, 0.35, 'lowpass', 0, 400); },
    mega: () => { const t = ctx.currentTime; const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; f.type = 'bandpass'; f.Q.value = 4; f.frequency.value = 1200; g.gain.value = 0.0001; o.connect(f); f.connect(g); g.connect(sfxBus); for (let i = 0; i < 9; i++) { const tt = t + i * 0.12; o.frequency.setValueAtTime(rr(140, 220), tt); g.gain.setValueAtTime(0.09, tt); g.gain.setValueAtTime(0.02, tt + 0.09); } g.gain.setValueAtTime(0.0001, t + 1.1); o.start(t); o.stop(t + 1.2); tone('sine', 2400, 2400, 0.2, 0.04); },
    collapse: () => { burst(2.5, 400, 0.6, 0.5, 'lowpass', 0, 60); for (let i = 0; i < 6; i++) burst(0.2, 900, 1, 0.15, 'lowpass', 0.2 + i * 0.25); },
    quake: () => { burst(7, 120, 0.7, 0.9, 'lowpass'); tone('sine', 35, 28, 6, 0.4); },
    siren: () => { const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(900, t + 3); o.frequency.linearRampToValueAtTime(300, t + 6); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.5); g.gain.linearRampToValueAtTime(0.0001, t + 6); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 6.1); },
    door: () => { tone('square', 160, 120, 0.08, 0.08); burst(0.1, 800, 1, 0.1); },
    fanfare: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('square', f, f, i === 5 ? 0.6 : 0.14, 0.07, i * 0.15)); },
  };
  function sfx(name, v) { if (!ctx || !SFX[name]) return; try { SFX[name](v); } catch (e) { /* */ } }
  function siren(on) { sirenOn = on; }
  // ---------- the dispatcher's voice ----------
  let voice = null;
  function say(text) {
    if (!OPTS.voice || !window.speechSynthesis || !G.live) return;
    try {
      if (!voice) { const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); voice = vs.find((v) => /female|zira|samantha|karen|susan/i.test(v.name)) || vs[0] || null; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\$/g, ' dollars ').replace(/"/g, ''));
      if (voice) u.voice = voice;
      u.rate = 1.12; u.pitch = 0.95; u.volume = Math.min(1, OPTS.vol * 0.9);
      speechSynthesis.speak(u);
    } catch (e) { /* */ }
  }
  return { init, update, sfx, siren, say, get ctx() { return ctx; } };
})();
