// Iron Saber — procedural Web Audio: footfalls, servos, thrusters, beam rifles, vulcans, missiles, sabers,
// cockpit beeps and alarms, wind, and a combat drum line.

let AC = null, master, sfx, musicG, noiseBuf, muted = false;
const loops = {};
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  AC = new Ctx();
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 5;
  master = AC.createGain(); master.gain.value = muted ? 0 : 0.8;
  master.connect(comp); comp.connect(AC.destination);
  sfx = AC.createGain(); sfx.gain.value = 1; sfx.connect(master);
  musicG = AC.createGain(); musicG.gain.value = 0.28; musicG.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  loops.wind = noiseLoop('lowpass', 420, 0.6, 0.04);
  loops.boost = noiseLoop('bandpass', 700, 0.8, 0);
  loops.hover = noiseLoop('lowpass', 260, 0.7, 0);
  loops.saber = noiseLoop('bandpass', 1900, 6, 0, 37);
  loops.cockpit = noiseLoop('lowpass', 140, 0.5, 0);
  const so = AC.createOscillator(), sg = AC.createGain();
  so.type = 'sawtooth'; so.frequency.value = 110; so.connect(sg); sg.gain.value = 0;
  const sf = AC.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 900; sg.connect(sf); sf.connect(sfx); so.start();
  loops.servo = { g: sg, o: so };
  const ho = AC.createOscillator(), hg = AC.createGain();
  ho.type = 'sine'; ho.frequency.value = 96; ho.connect(hg); hg.gain.value = 0; hg.connect(sfx); ho.start();
  loops.reactor = { g: hg, o: ho };
  musicNext = AC.currentTime + 0.5;
}
function noiseLoop(type, f, q, gain, tremolo) {
  const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const flt = AC.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
  const g = AC.createGain(); g.gain.value = gain;
  src.connect(flt);
  if (tremolo) {
    const t = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
    lfo.frequency.value = tremolo; lg.gain.value = 0.4; t.gain.value = 0.6;
    lfo.connect(lg); lg.connect(t.gain); lfo.start();
    flt.connect(t); t.connect(g);
  } else flt.connect(g);
  g.connect(sfx); src.start();
  return { g, flt };
}
function aSet(param, v, tc = 0.15) { if (AC) param.setTargetAtTime(v, AC.currentTime, tc); }
function setMuted(m) { muted = m; if (AC) aSet(master.gain, m ? 0 : 0.8, 0.05); }

// distance attenuation and stereo pan relative to the camera
function spatial(pos, range = 1400) {
  if (!pos) return [1, 0];
  _v5.copy(pos).sub(camera.position);
  const d = _v5.length();
  const g = Math.pow(clamp(1 - d / range, 0, 1), 1.6);
  _v4.set(1, 0, 0).applyQuaternion(camera.quaternion);
  const pan = d > 1 ? clamp(_v5.dot(_v4) / d, -1, 1) * 0.7 : 0;
  return [g, pan];
}
function out(gain, pan) {
  const g = AC.createGain(); g.gain.value = gain;
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(sfx); }
  else g.connect(sfx);
  return g;
}
function nz({ dur = 0.5, type = 'lowpass', f0 = 800, f1, q = 0.8, gain = 0.5, attack = 0.005, pos, range, delay = 0 }) {
  if (!AC) return;
  const [sg, pan] = spatial(pos, range);
  if (sg * gain < 0.005) return;
  const t = AC.currentTime + delay;
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const flt = AC.createBiquadFilter(); flt.type = type; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t);
  if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = out(0, pan);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain * sg, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}
function tone({ type = 'sine', f0 = 100, f1, dur = 0.4, gain = 0.5, attack = 0.005, pos, range, delay = 0 }) {
  if (!AC) return;
  const [sg, pan] = spatial(pos, range);
  if (sg * gain < 0.005) return;
  const t = AC.currentTime + delay;
  const o = AC.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = out(0, pan);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain * sg, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); o.start(t); o.stop(t + dur + 0.05);
}

// ---------- effects ----------
function stepSound(pos, mass = 1) {
  tone({ f0: 70 / Math.sqrt(mass), f1: 30, dur: 0.45, gain: 0.55 * mass, pos, range: 1600 });
  nz({ f0: 500, f1: 90, dur: 0.3, gain: 0.3 * mass, pos, range: 1400 });
  nz({ type: 'bandpass', f0: 2600, f1: 1400, dur: 0.12, gain: 0.08, q: 4, pos, range: 500, delay: 0.03 });
}
function footSound(soft) { nz({ type: 'bandpass', f0: soft ? 700 : 1100, f1: 400, dur: 0.09, gain: 0.07, q: 1.5 }); }
let impactBudget = 0;
function impactSound(m, v, pos) {
  if (impactBudget <= 0) return;
  impactBudget--;
  const s = clamp(Math.log10(m * v) / 5, 0.1, 1);
  nz({ f0: 1400 - s * 1000, f1: 120, dur: 0.25 + s * 0.6, gain: 0.25 + s * 0.4, pos });
  if (s > 0.6) tone({ f0: 80, f1: 35, dur: 0.4, gain: s * 0.4, pos });
}
function crumbleSound(vol, pos) {
  const s = clamp(Math.log10(1 + vol) / 4, 0.1, 1);
  nz({ f0: 1600, f1: 160, dur: 0.6 + s, gain: 0.35 + s * 0.35, q: 0.6, pos });
  for (let i = 0; i < 3 + s * 6; i++) nz({ type: 'bandpass', f0: 1800 + Math.random() * 2500, dur: 0.06, gain: 0.18, q: 3, pos, delay: Math.random() * (0.4 + s) });
}
function collapseRumble(b, n) {
  const pos = new V3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
  nz({ f0: 260, f1: 50, dur: 4, gain: 0.9, attack: 0.3, pos, range: 2600 });
  tone({ f0: 45, f1: 25, dur: 3.5, gain: 0.6, attack: 0.4, pos, range: 2600 });
  for (let i = 0; i < 14; i++) nz({ type: 'bandpass', f0: 600 + Math.random() * 2400, dur: 0.12, gain: 0.25, q: 2, pos, delay: Math.random() * 3 });
  addShake(0.5, pos, 1200);
}
function boom(pos, size = 1, kind) {
  nz({ f0: 2200, f1: 90, dur: 0.6 + size * 0.6, gain: 0.4 + size * 0.35, pos, range: 2600 });
  tone({ f0: 90, f1: 30, dur: 0.5 + size * 0.5, gain: 0.35 + size * 0.3, pos, range: 2600 });
  if (kind === 'crash') nz({ type: 'bandpass', f0: 900, f1: 300, dur: 1.2, gain: 0.4, q: 1.5, pos });
}
function treeCrack(pos, n) { nz({ type: 'bandpass', f0: 1400, f1: 500, dur: 0.35, gain: Math.min(0.4, 0.12 * n), q: 2, pos, range: 700 }); }
function beamSound(pos, heavy) {
  tone({ type: 'sawtooth', f0: heavy ? 900 : 1500, f1: 120, dur: 0.45, gain: 0.22, pos, range: 2200 });
  tone({ type: 'sine', f0: 2600, f1: 300, dur: 0.3, gain: 0.18, pos, range: 2200 });
  nz({ type: 'highpass', f0: 3000, f1: 800, dur: 0.35, gain: 0.25, pos, range: 2200 });
}
let vulcT = 0;
function vulcanSound(pos) { if (vulcT > 0) return; vulcT = 0.045; nz({ type: 'bandpass', f0: 2200, f1: 900, dur: 0.07, gain: 0.25, q: 1.2, pos, range: 1500 }); tone({ type: 'square', f0: 140, f1: 60, dur: 0.05, gain: 0.08, pos, range: 900 }); }
function mgSound(pos) { nz({ f0: 2600, f1: 300, dur: 0.18, gain: 0.35, pos, range: 2000 }); tone({ f0: 120, f1: 50, dur: 0.15, gain: 0.25, pos, range: 1600 }); }
function cannonSound(pos) { nz({ f0: 3000, f1: 140, dur: 0.8, gain: 0.6, pos, range: 2600 }); tone({ f0: 80, f1: 30, dur: 0.6, gain: 0.5, pos, range: 2600 }); }
function missileSound(pos) { nz({ type: 'bandpass', f0: 2200, f1: 500, dur: 1.1, gain: 0.22, q: 1.4, pos, range: 1600 }); }
function saberSwing(pos) { nz({ type: 'bandpass', f0: 600, f1: 2600, dur: 0.35, gain: 0.45, q: 1.4, pos, range: 1200 }); tone({ type: 'sawtooth', f0: 220, f1: 660, dur: 0.3, gain: 0.12, pos, range: 1200 }); }
function saberIgnite(pos) { tone({ type: 'sawtooth', f0: 90, f1: 400, dur: 0.4, gain: 0.15, pos, range: 900 }); nz({ type: 'bandpass', f0: 400, f1: 2400, dur: 0.4, gain: 0.25, q: 3, pos, range: 900 }); }
function clangSound(pos) { tone({ type: 'triangle', f0: 1200, f1: 700, dur: 0.4, gain: 0.25, pos, range: 1500 }); nz({ type: 'bandpass', f0: 3200, dur: 0.15, gain: 0.3, q: 3, pos, range: 1500 }); }
function hitSound(pos) { nz({ type: 'bandpass', f0: 1800, f1: 500, dur: 0.2, gain: 0.3, q: 2, pos, range: 1800 }); tone({ type: 'square', f0: 300, f1: 120, dur: 0.12, gain: 0.08, pos, range: 900 }); }
function thudLand(pos, s) { tone({ f0: 55, f1: 24, dur: 0.8, gain: 0.7 * s, pos, range: 2000 }); nz({ f0: 900, f1: 80, dur: 0.6, gain: 0.45 * s, pos, range: 1800 }); }
function hatchSound(pos) { nz({ type: 'bandpass', f0: 300, f1: 900, dur: 0.9, gain: 0.25, q: 2, pos, range: 300 }); tone({ type: 'square', f0: 70, dur: 0.12, gain: 0.08, pos, range: 300, delay: 0.85 }); }
function winchSound() { tone({ type: 'sawtooth', f0: 180, f1: 260, dur: 1.8, gain: 0.08, attack: 0.2 }); nz({ type: 'bandpass', f0: 900, dur: 1.8, gain: 0.08, q: 6, attack: 0.2 }); }
function beep(f = 1200, dur = 0.08, gain = 0.08, delay = 0) { tone({ type: 'square', f0: f, dur, gain, delay }); }
function bootSound() { for (let i = 0; i < 6; i++) beep(600 + i * 180, 0.06, 0.06, 0.2 + i * 0.12); tone({ f0: 40, f1: 110, dur: 2.2, gain: 0.25, attack: 1.2 }); }
function lockSound() { beep(1800, 0.05, 0.06); beep(2400, 0.05, 0.06, 0.06); }
let alarmT = 0;
function alarmSound() { if (alarmT > 0) return; alarmT = 0.6; beep(980, 0.12, 0.09); beep(760, 0.12, 0.09, 0.15); }
function uiClick() { beep(1500, 0.03, 0.05); }
function hurtSound() { nz({ f0: 2400, f1: 400, dur: 0.25, gain: 0.25 }); }

// ---------- combat drums ----------
let musicNext = 0, musicBeat = 0;
const BASS = [40, 40, 43, 41, 40, 40, 45, 43];
function drum(t, f, gain, dur) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(musicG); o.start(t); o.stop(t + dur + 0.02);
  const s = AC.createBufferSource(), sf = AC.createBiquadFilter(), sg = AC.createGain();
  s.buffer = noiseBuf; sf.type = 'lowpass'; sf.frequency.value = f * 9;
  sg.gain.setValueAtTime(gain * 0.5, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  s.connect(sf); sf.connect(sg); sg.connect(musicG); s.start(t, Math.random()); s.stop(t + 0.15);
}
function bassNote(t, midi, dur) {
  const o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
  o.type = 'sawtooth'; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  f.type = 'lowpass'; f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(160, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(musicG); o.start(t); o.stop(t + dur + 0.05);
}
function updateMusic(level) {
  if (!AC) return;
  const spb = 60 / 132 / 2;
  while (musicNext < AC.currentTime + 0.25) {
    const t = musicNext, b = musicBeat % 16;
    if (level >= 1) {
      if (b === 0 || b === 3 || b === 8 || b === 11) drum(t, 70, 0.8, 0.5);
      if (b === 4 || b === 12) drum(t, 180, 0.45, 0.2);
      if (b % 2 === 1 && Math.random() < 0.5) drum(t, 260, 0.12, 0.08);
      if (b % 2 === 0) bassNote(t, BASS[(musicBeat >> 3) % 8], spb * 1.7);
    }
    if (level >= 2 && (b === 14 || b === 15)) drum(t, 110, 0.55, 0.25);
    musicNext += spb; musicBeat++;
  }
}
