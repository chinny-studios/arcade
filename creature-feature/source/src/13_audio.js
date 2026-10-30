// Creature Feature — sound, all synthesized: screams, splats, howls and roars, footsteps, cars, crickets and wind,
// a heartbeat when you're starving, and a theremin-and-organ score that picks up when the town is running

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
    // wind
    amb.wind = noiseSrc(); amb.windF = filt('bandpass', 400, 0.6); amb.windG = gain(0.04);
    amb.wind.connect(amb.windF); amb.windF.connect(amb.windG); amb.windG.connect(sfxBus);
    MUSIC.attach(ctx, musBus);
  }
  const now = () => ctx.currentTime;
  function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(0, Math.random() * 1.5); return s; }
  function filt(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  // where a sound sits relative to the listener (the camera): volume and pan
  function place(x, z, range = 60) {
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
  function sfx(name, x, z) {
    if (!ctx) return;
    const t = now();
    if (busy[name] && t - busy[name] < 0.05) return;
    busy[name] = t;
    const [v, pan] = place(x, z, name === 'howl' || name === 'roar' || name === 'stomp' ? 400 : 70);
    if (v < 0.01) return;
    const o = out(v, pan);
    switch (name) {
      case 'splat': burst(o, 'lowpass', 900, 200, 0.35, 0.9, 1); burst(o, 'bandpass', 2400, 600, 0.15, 0.4, 2); tone(o, 'sine', 120, 50, 0.2, 0.6); break;
      case 'crunch': for (let i = 0; i < 4; i++) burst(o, 'bandpass', 1800 + i * 300, 800, 0.05, 0.6, 3, t + i * 0.04); tone(o, 'sine', 90, 40, 0.2, 0.4); break;
      case 'bite': burst(o, 'lowpass', 1200, 300, 0.25, 0.7, 2); burst(o, 'bandpass', 600, 300, 0.8, 0.25, 4, t + 0.2, 0.1); break;
      case 'choke': tone(o, 'sawtooth', 110, 70, 0.8, 0.12, t, 0.1); burst(o, 'bandpass', 500, 300, 0.7, 0.3, 5, t, 0.1); break;
      case 'feed': for (let i = 0; i < 5; i++) burst(o, 'lowpass', 700, 250, 0.22, 0.5, 2, t + i * 0.3, 0.05); break;
      case 'swipe': burst(o, 'bandpass', 3000, 900, 0.2, 0.5, 1.5); break;
      case 'swingBig': burst(o, 'bandpass', 1400, 300, 0.4, 0.6, 1.2); break;
      case 'thud': case 'land': tone(o, 'sine', 110, 40, 0.25, 0.9); burst(o, 'lowpass', 400, 80, 0.2, 0.6); break;
      case 'stomp': tone(o, 'sine', 70, 25, 1.2, 1.2); burst(o, 'lowpass', 300, 40, 1.4, 1.0); break;
      case 'jump': burst(o, 'bandpass', 600, 1500, 0.25, 0.25, 1); break;
      case 'slam': tone(o, 'sine', 160, 60, 0.15, 0.9); burst(o, 'lowpass', 1200, 200, 0.12, 0.7); break;
      case 'knock': tone(o, 'sine', 140, 70, 0.12, 1); burst(o, 'lowpass', 900, 200, 0.1, 0.8); break;
      case 'smash': for (let i = 0; i < 6; i++) burst(o, 'bandpass', rr(600, 2500), 300, rr(0.1, 0.3), 0.6, 2, t + i * 0.03); tone(o, 'sine', 120, 40, 0.3, 1); break;
      case 'glass': for (let i = 0; i < 8; i++) tone(o, 'sine', rr(2500, 6000), rr(2000, 5000), 0.2, 0.08, t + i * 0.03); burst(o, 'highpass', 4000, 3000, 0.3, 0.5); break;
      case 'crash': burst(o, 'lowpass', 2000, 100, 0.9, 1); for (let i = 0; i < 5; i++) tone(o, 'square', rr(300, 900), rr(200, 500), 0.4, 0.04, t + i * 0.05); tone(o, 'sine', 80, 30, 0.6, 0.9); break;
      case 'horn': tone(o, 'square', 415, 415, 0.45, 0.06); tone(o, 'square', 523, 523, 0.45, 0.05); break;
      case 'engine': tone(o, 'sawtooth', 50, 140, 1.4, 0.1, t, 0.1); break;
      case 'howl': { const os = ctx.createOscillator(), g = gain(0), vib = ctx.createOscillator(), vg = gain(12); os.type = 'triangle'; vib.frequency.value = 5.5; vib.connect(vg); vg.connect(os.frequency);
        os.frequency.setValueAtTime(260, t); os.frequency.linearRampToValueAtTime(560, t + 0.6); os.frequency.linearRampToValueAtTime(520, t + 1.6); os.frequency.linearRampToValueAtTime(380, t + 2.4);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.4); g.gain.linearRampToValueAtTime(0.4, t + 1.8); g.gain.linearRampToValueAtTime(0, t + 2.5);
        const f = filt('lowpass', 1800, 1); os.connect(f); f.connect(g); g.connect(o); os.start(t); vib.start(t); os.stop(t + 2.6); vib.stop(t + 2.6); break; }
      case 'snarl': tone(o, 'sawtooth', 90, 70, 0.5, 0.2); burst(o, 'bandpass', 400, 250, 0.5, 0.6, 3); break;
      case 'roar': tone(o, 'sawtooth', 75, 55, 1.3, 0.3, t, 0.15); tone(o, 'sawtooth', 112, 80, 1.3, 0.15, t, 0.15); burst(o, 'bandpass', 500, 200, 1.3, 0.5, 2, t, 0.15); break;
      case 'sand': burst(o, 'bandpass', 800, 2400, 2.5, 0.5, 0.8, t, 0.4); break;
      case 'lash': burst(o, 'highpass', 3000, 6000, 0.08, 0.8, 1, t + 0.18); burst(o, 'bandpass', 1500, 700, 0.2, 0.3, 1); break;
      case 'hypno': { const os = tone(o, 'sine', 600, 900, 1.2, 0.18, t, 0.2); void os; tone(o, 'sine', 300, 450, 1.2, 0.1, t, 0.2); break; }
      case 'beckon': tone(o, 'sine', 220, 180, 1.4, 0.2, t, 0.3); tone(o, 'sine', 330, 270, 1.4, 0.1, t, 0.3); break;
      case 'bats': for (let i = 0; i < 10; i++) burst(o, 'bandpass', rr(1500, 3000), 1000, 0.05, 0.35, 4, t + i * 0.05); break;
      case 'swoop': burst(o, 'bandpass', 2400, 400, 0.6, 0.5, 1); break;
    }
  }
  // a scream; when cut short it stops halfway
  function scream(x, z, female, vol = 1, cut = false) {
    if (!ctx) return;
    const [v, pan] = place(x, z, 90); if (v < 0.01) return;
    const t = now(), o = out(v * vol, pan), dur = cut ? rr(0.35, 0.6) : rr(0.9, 1.5);
    const f0 = female ? rr(720, 980) : rr(380, 540);
    const os = ctx.createOscillator(); os.type = 'sawtooth';
    os.frequency.setValueAtTime(f0 * 0.8, t); os.frequency.linearRampToValueAtTime(f0 * 1.15, t + 0.12); os.frequency.linearRampToValueAtTime(f0 * 0.95, t + dur * 0.7); os.frequency.linearRampToValueAtTime(f0 * 0.7, t + dur);
    const vib = ctx.createOscillator(), vg = gain(f0 * 0.03); vib.frequency.value = rr(6, 9); vib.connect(vg); vg.connect(os.frequency);
    const g = gain(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.05); g.gain.setValueAtTime(0.2, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    const f1 = filt('bandpass', female ? 1000 : 750, 3), f2 = filt('bandpass', female ? 2600 : 1900, 4), mix = gain(1);
    os.connect(f1); os.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(o);
    os.start(t); vib.start(t); os.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
    burst(o, 'bandpass', 2500, 2000, dur, 0.06, 1, t, 0.05);
  }
  function step(id, running) {
    if (!ctx) return;
    const o = out(id === 'frank' ? 0.7 : 0.3, 0);
    if (id === 'frank') { tone(o, 'sine', 70, 35, 0.3, 0.9); burst(o, 'lowpass', 300, 60, 0.25, 0.6); }
    else burst(o, 'lowpass', running ? 700 : 500, 120, 0.09, 0.5);
  }
  let hbT = 0, crT = 0;
  function update(dt) {
    if (!ctx) return;
    master.gain.setTargetAtTime(OPTS.vol, now(), 0.1);
    musBus.gain.setTargetAtTime(OPTS.music * 0.5, now(), 0.3);
    const playing = document.body.dataset.state === 'play';
    // heartbeat when starving
    hbT -= dt;
    if (playing && P && !G.over && G.hunger < 25 && hbT <= 0) { hbT = 0.55 + G.hunger / 40; const o = out(0.7, 0); tone(o, 'sine', 60, 40, 0.12, 0.9); tone(o, 'sine', 55, 38, 0.12, 0.7, now() + 0.18); }
    // crickets when the town is calm
    crT -= dt;
    if (crT <= 0 && G.panic < 40) { crT = rr(0.25, 0.9); const o = out(0.05 * (1 - G.panic / 40), rr(-0.8, 0.8)); const f = rr(4200, 5200); for (let i = 0; i < 3; i++) tone(o, 'sine', f, f, 0.04, 0.5, now() + i * 0.06); }
    MUSIC.update(dt);
  }
  function music(on) { if (ctx) MUSIC.on(on); }
  return { init, sfx, scream, step, update, music, get ctx() { return ctx; } };
})();

// The score: a theremin wavers over a slow organ and a walking bass; drums and a stabbing brass chord come in when
// people near you are running for their lives.
const MUSIC = (() => {
  let ctx, bus, th, thG, thVib, organ = [], orgG, chase, on = false, t = 0, beat = 0, nextT = 0, bar = 0;
  const A = 220, semi = (n) => A * Math.pow(2, n / 12);
  // a minor-key progression: Am, F, Dm, E
  const CH = [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2]];
  const MEL = [[12, 2], [15, 1], [14, 1], [12, 2], [11, 2], [8, 3], [7, 1], [12, 2], [15, 2], [19, 3], [17, 1], [15, 2], [14, 2], [11, 4]];
  let mi = 0, mt = 0;
  function attach(c, b) {
    ctx = c; bus = b;
    th = ctx.createOscillator(); th.type = 'sine'; thG = ctx.createGain(); thG.gain.value = 0;
    thVib = ctx.createOscillator(); thVib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = 9; thVib.connect(vg); vg.connect(th.frequency);
    const echo = ctx.createDelay(1); echo.delayTime.value = 0.38; const fb = ctx.createGain(); fb.gain.value = 0.35;
    th.connect(thG); thG.connect(bus); thG.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(bus);
    th.start(); thVib.start();
    orgG = ctx.createGain(); orgG.gain.value = 0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; orgG.connect(lp); lp.connect(bus);
    for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(); o.type = 'triangle'; o.start(); o.connect(orgG); organ.push(o); }
    chase = ctx.createGain(); chase.gain.value = 0; chase.connect(bus);
  }
  function setOn(v) { on = v; }
  function hit(type, f, dur, vol, when) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, when); o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.5), when + dur);
    g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(vol, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(type === 'sine' ? chase : bus); o.start(when); o.stop(when + dur + 0.05);
  }
  function update(dt) {
    if (!ctx) return;
    const tn = ctx.currentTime;
    const playing = on || document.body.dataset.state !== 'play';
    thG.gain.setTargetAtTime(playing ? 0.13 : 0, tn, 0.5);
    orgG.gain.setTargetAtTime(playing ? 0.05 : 0, tn, 0.5);
    // how many people are running nearby
    let run = 0;
    if (P && on) for (const v of PEOPLE.list) if ((v.state === 'flee' || v.state === 'held' || v.state === 'snared') && dist2(v.x, v.z, P.x, P.z) < 40 * 40) run++;
    const heat = clamp(run / 4, 0, 1);
    chase.gain.setTargetAtTime(heat * 0.7, tn, 0.6);
    const tempo = 0.62 - heat * 0.22;
    if (nextT < tn) nextT = tn + 0.05;
    while (nextT < tn + 0.2) {
      const ch = CH[bar % 4];
      if (beat === 0) for (let i = 0; i < 3; i++) organ[i].frequency.setTargetAtTime(semi(ch[i] - 12), nextT, 0.08);
      // walking bass
      hit('triangle', semi(ch[beat % 3] - 24), tempo * 0.9, 0.12, nextT);
      // drums when it's a chase
      if (heat > 0.05) { hit('sine', beat % 2 ? 70 : 55, 0.25, 0.9, nextT); if (beat === 3) hit('sine', 140, 0.15, 0.5, nextT + tempo * 0.5); if (beat === 0 && heat > 0.5) hit('sawtooth', semi(ch[0]), tempo * 1.5, 0.07, nextT); }
      // the theremin glides to the next note
      mt -= 1;
      if (mt <= 0) { const [n, l] = MEL[mi]; th.frequency.setTargetAtTime(semi(n - (heat > 0.5 ? 0 : 12)), nextT, 0.09); mt = l; mi = (mi + 1) % MEL.length; }
      beat = (beat + 1) % 4; if (beat === 0) bar++;
      nextT += tempo;
    }
    t += dt;
  }
  return { attach, update, on: setOn };
})();
