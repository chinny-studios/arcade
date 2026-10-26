// 13_audio: every sound is synthesized. Beds of filtered noise for traffic, crowds and the harbour; the tick-tock of
// Hong Kong's pedestrian crossings (slow while you wait, fast when it's your turn); footsteps, horns, the lift, the
// ferry; and a small piece of music for A Symphony of Lights.
const AU = { ctx: null, master: null, beds: {}, clickT: 0, stepPhase: 0, showT: 0 };
function audioStart() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = AU.ctx = new AC();
  AU.master = c.createGain(); AU.master.gain.value = OPT.volume; AU.master.connect(c.destination);
  const noise = (type) => {
    const len = c.sampleRate * 4, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    }
    return b;
  };
  const bed = (name, buf, ftype, freq, q) => {
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q || 0.7;
    const g = c.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(AU.master); s.start();
    AU.beds[name] = { g, f };
  };
  const brown = noise('brown'), pink = noise('pink');
  bed('traffic', brown, 'lowpass', 380);
  bed('crowd', pink, 'bandpass', 950, 0.8);
  bed('harbour', pink, 'lowpass', 520);
  bed('wind', pink, 'highpass', 1800);
  // fluorescent hum indoors, and the ferry's diesel
  const hum = c.createOscillator(); hum.frequency.value = 100; const hg = c.createGain(); hg.gain.value = 0; hum.connect(hg); hg.connect(AU.master); hum.start();
  AU.beds.hum = { g: hg };
  const eng = c.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 42; const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 160;
  const eg = c.createGain(); eg.gain.value = 0; eng.connect(ef); ef.connect(eg); eg.connect(AU.master); eng.start();
  AU.beds.engine = { g: eg };
}
function tone(freq, t0, dur, type = 'sine', vol = 0.2, f2) {
  const c = AU.ctx; if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + t0 + dur);
  g.gain.setValueAtTime(0, c.currentTime + t0); g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
  o.connect(g); g.connect(AU.master); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
}
function burst(t0, dur, freq, vol = 0.2, type = 'bandpass') {
  const c = AU.ctx; if (!c) return;
  const len = Math.ceil(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.5;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(c.currentTime + t0);
}
const SFX = {
  coins: () => { tone(2400, 0, 0.12, 'square', 0.04); tone(3200, 0.07, 0.18, 'square', 0.035); },
  shutter: () => { burst(0, 0.05, 3000, 0.4, 'highpass'); burst(0.07, 0.06, 1800, 0.3); },
  ding: () => { tone(1318, 0, 0.9, 'sine', 0.12); tone(988, 0.25, 1.1, 'sine', 0.12); },
  discover: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.5, 'triangle', 0.1)); },
  done: () => { [392, 494, 587, 784].forEach((f) => tone(f, 0, 1.2, 'triangle', 0.07)); tone(988, 0.25, 0.8, 'triangle', 0.06); },
  blip: () => tone(880, 0, 0.06, 'square', 0.03),
  turnstile: () => { burst(0, 0.12, 300, 0.4); tone(180, 0.05, 0.12, 'square', 0.05); },
  liftHum: () => tone(90, 0, 0.9, 'sawtooth', 0.04, 140),
  honk: () => { tone(410, 0, 0.35, 'square', 0.05); tone(520, 0, 0.35, 'square', 0.04); },
  horn: () => { tone(110, 0, 1.6, 'sawtooth', 0.08); tone(138, 0, 1.6, 'sawtooth', 0.06); },
  step: (k) => burst(0, 0.05, k ? 900 : 500, 0.08),
};
bus.on('sfx', (k, a) => { if (AU.ctx && SFX[k]) SFX[k](a); });
bus.on('honk', (car) => { if (AU.ctx && dist2(car.grp.position.x, car.grp.position.z, PL.x, PL.z) < 900) SFX.honk(); });
bus.on('audioStart', audioStart);
bus.on('volume', () => { if (AU.master) AU.master.gain.value = OPT.volume; });
addEventListener('pointerdown', () => { if (GAME.state === 'play') audioStart(); });
addEventListener('keydown', () => { if (GAME.state === 'play') audioStart(); });

// pentatonic music for the light show
const SHOW_NOTES = [0, 3, 5, 7, 10, 12, 15, 17];
function showMusic(dt, vol) {
  AU.showT -= dt;
  if (AU.showT > 0 || vol < 0.02) return;
  AU.showT = 0.32;
  const step = (AU.showStep = (AU.showStep || 0) + 1);
  const root = [220, 196, 174.6, 196][Math.floor(step / 16) % 4];
  const n = SHOW_NOTES[(step * 5 + (step >> 3)) % SHOW_NOTES.length];
  tone(root * Math.pow(2, n / 12) * 2, 0, 0.5, 'triangle', 0.05 * vol);
  if (step % 8 === 0) { tone(root, 0, 2.6, 'sawtooth', 0.025 * vol); tone(root * 1.5, 0, 2.6, 'sine', 0.03 * vol); }
}
const _ab = { lastPhase: 0 };
function updateAudio(dt) {
  if (!AU.ctx || GAME.state !== 'play') return;
  const B = AU.beds, street = PL.space === STREET || PL.space === ROOF, high = PL.space === ROOF;
  const set = (k, v, rate = 2) => { const g = B[k].g.gain; g.value += (v - g.value) * clamp(dt * rate, 0, 1); };
  // traffic: the nearest few cars
  let tr = 0;
  for (const c of TRAFFIC.cars) if (c.on) { const d2 = dist2(c.grp.position.x, c.grp.position.z, PL.x, PL.z); tr += (c.v / 12 + 0.25) / (1 + d2 / 120); }
  let cr = 0;
  for (const p of CROWD.peds) if (p.on) { const d2 = dist2(p.x, p.z, PL.x, PL.z); if (d2 < 900) cr += 1 / (1 + d2 / 40); }
  let sea = 0;
  if (street || PL.space === FERRY_SPACE) { for (const [dx, dz] of [[0, 30], [30, 0], [-30, 0], [0, -30], [0, 12]]) if (gclass(PL.x + dx, PL.z + dz) === G.SEA) sea += 0.25; if (PL.space === FERRY_SPACE) sea = 1; }
  set('traffic', street ? clamp(0.06 + tr * 0.25, 0, 0.6) * (high ? 0.5 : 1) : PL.space === MILTON_SPACE ? 0.03 : 0.02);
  set('crowd', street && !high ? clamp(cr * 0.04, 0, 0.35) : PL.space === MILTON_SPACE && MILTON.floor === 'G' ? 0.05 : 0);
  set('harbour', clamp(sea, 0, 1) * 0.25);
  set('wind', high ? 0.12 : PL.space === FERRY_SPACE ? 0.08 : 0);
  set('hum', PL.space === MILTON_SPACE ? 0.015 : 0);
  set('engine', PL.space === FERRY_SPACE ? 0.12 : 0);
  // crossings: the nearest signalised junction ticks
  if (street && !high) {
    let best = null, bd = 34 * 34;
    for (const N of TRAFFIC.signals) { const d = dist2(N.x, N.z, PL.x, PL.z); if (d < bd) { bd = d; best = N; } }
    if (best) {
      const fast = pedGreen(best);
      AU.clickT -= dt;
      if (AU.clickT <= 0) { AU.clickT = fast ? 0.11 : 0.95; const v = 0.12 * (1 - Math.sqrt(bd) / 34); tone(fast ? 1950 : 1700, 0, 0.025, 'square', v); }
    }
  }
  // footsteps
  const ph = Math.floor(PL.bob / Math.PI);
  if (ph !== _ab.lastPhase && PL.speed > 0.3) { _ab.lastPhase = ph; SFX.step(PL.space === MILTON_SPACE ? 1 : 0); }
  // the light show
  const showVol = SKY.show * (PL.space === FERRY_SPACE || PL.space === ROOF ? 1 : clamp(sea * 1.5, 0, 1));
  showMusic(dt, showVol);
  // the ferry sounds its horn as it leaves
  for (const b of FERRY.boats) { if (b.lastState && b.lastState !== b.state && (b.state === 'toCentral' || b.state === 'toTST') && dist2(b.x, b.z, PL.x, PL.z) < 600 * 600) SFX.horn(); b.lastState = b.state; }
}
