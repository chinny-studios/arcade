// Shot Heard — procedural Web Audio: musketry with the speed of sound, cannon, ball whizz, impacts, drill clicks,
// hooves, shouts, ambience, and a fife-and-drum player for the old tunes (Yankee Doodle, The British Grenadiers).

let AC = null, master, sfxG, musicG, ambG, noiseBuf, brownBuf;
const loops = {};
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  AC = new Ctx();
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.25;
  master = AC.createGain(); master.gain.value = SET.vol;
  master.connect(comp); comp.connect(AC.destination);
  sfxG = AC.createGain(); sfxG.gain.value = 1; sfxG.connect(master);
  musicG = AC.createGain(); musicG.gain.value = SET.music * 0.5; musicG.connect(master);
  ambG = AC.createGain(); ambG.gain.value = 0.7; ambG.connect(master);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  brownBuf = AC.createBuffer(1, AC.sampleRate * 3, AC.sampleRate);
  const b = brownBuf.getChannelData(0); let last = 0;
  for (let i = 0; i < b.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
  loops.wind = noiseLoop('lowpass', 380, 0.7, 0.03, ambG, brownBuf);
  loops.water = noiseLoop('bandpass', 500, 0.6, 0, ambG, brownBuf);
  loops.gallop = null;
}
function noiseLoop(type, f, q, gain, dest, buf) {
  const src = AC.createBufferSource(); src.buffer = buf || noiseBuf; src.loop = true;
  const flt = AC.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
  const g = AC.createGain(); g.gain.value = gain;
  src.connect(flt); flt.connect(g); g.connect(dest || sfxG); src.start();
  return { g, flt };
}
function aSet(param, v, tc = 0.15) { if (AC) param.setTargetAtTime(v, AC.currentTime, tc); }
function setVolumes() { if (!AC) return; aSet(master.gain, SET.vol, 0.05); aSet(musicG.gain, SET.music * 0.5, 0.1); }

// distance gain, stereo pan and the delay of sound over distance
function spatial(pos, range) {
  if (!pos) return [1, 0, 0, 0];
  _v5.copy(pos).sub(camera.position);
  const d = _v5.length();
  const g = Math.pow(clamp(1 - d / range, 0, 1), 1.5) / (1 + d * 0.012);
  _v4.set(1, 0, 0).applyQuaternion(camera.quaternion);
  const pan = d > 1 ? clamp(_v5.dot(_v4) / d, -1, 1) * 0.75 : 0;
  return [g, pan, Math.min(1.8, d / 343), d];
}
function outNode(gain, pan, lp) {
  const g = AC.createGain(); g.gain.value = gain;
  let head = g;
  if (lp) { const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); head = f; }
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; head.connect(p); p.connect(sfxG); }
  else head.connect(sfxG);
  return g;
}
// filtered noise burst
function nz({ dur = 0.5, type = 'lowpass', f0 = 800, f1, q = 0.8, gain = 0.5, attack = 0.003, pos, range = 800, delay = 0, lp, buf, rate = 1 }) {
  if (!AC) return;
  const [sg, pan, dl, dist] = spatial(pos, range);
  if (sg * gain < 0.003) return;
  const t = AC.currentTime + delay + dl;
  const src = AC.createBufferSource(); src.buffer = buf || noiseBuf; src.playbackRate.value = rate * (0.85 + Math.random() * 0.3);
  const flt = AC.createBiquadFilter(); flt.type = type; flt.Q.value = q;
  flt.frequency.setValueAtTime(f0, t);
  if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = outNode(0, pan, lp || (dist > 120 ? clamp(9000 - dist * 18, 700, 9000) : 0));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain * sg, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g);
  src.start(t, Math.random() * Math.max(0, src.buffer.duration - dur * src.playbackRate.value - 0.1)); src.stop(t + dur + 0.05);
}
function tone({ f0 = 440, f1, dur = 0.3, type = 'sine', gain = 0.3, attack = 0.005, pos, range = 600, delay = 0, dest }) {
  if (!AC) return;
  const [sg, pan, dl] = spatial(pos, range);
  if (sg * gain < 0.003) return;
  const t = AC.currentTime + delay + dl;
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = dest ? AC.createGain() : outNode(0, pan);
  if (dest) g.connect(dest);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain * sg, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); o.start(t); o.stop(t + dur + 0.05);
}

// ---------- weapons ----------
function sMusket(pos, kind = 'musket', mine = false) {
  if (!AC) return;
  const d = pos ? camera.position.distanceTo(pos) : 0;
  const k = kind === 'pistol' ? 0.7 : kind === 'rifle' ? 1.05 : kind === 'blunder' ? 1.15 : 1;
  const near = mine || d < 25;
  // pan flash, crack, boom and rolling tail
  if (near) nz({ dur: 0.06, type: 'highpass', f0: 3000, gain: 0.25, pos, range: 60 });
  nz({ dur: 0.18, type: 'bandpass', f0: kind === 'rifle' ? 2600 : 1800, f1: 600, q: 0.7, gain: 0.9 * k, pos, range: 1400, delay: near ? 0.03 : 0 });
  nz({ dur: 0.65, type: 'lowpass', f0: 1200, f1: 120, q: 0.6, gain: 1.1 * k, pos, range: 1800, delay: near ? 0.03 : 0, buf: brownBuf, rate: 1.2 });
  nz({ dur: 1.8, type: 'lowpass', f0: 500, f1: 90, q: 0.4, gain: 0.35 * k, pos, range: 2400, delay: 0.1, buf: brownBuf });
  if (d > 150) nz({ dur: 1.2, type: 'lowpass', f0: 300, f1: 80, gain: 0.25, pos, range: 2400, delay: 0.25 + Math.random() * 0.2, buf: brownBuf });
}
function sMisfire(pos) { nz({ dur: 0.05, type: 'highpass', f0: 2500, gain: 0.3, pos, range: 40 }); nz({ dur: 0.25, type: 'bandpass', f0: 900, q: 1, gain: 0.12, pos, range: 40, delay: 0.04 }); }
function sClick(pos) { tone({ f0: 2400, f1: 1800, dur: 0.03, type: 'square', gain: 0.1, pos, range: 30 }); }
function sCannon(pos) {
  if (!AC) return;
  nz({ dur: 0.3, type: 'bandpass', f0: 900, f1: 200, q: 0.5, gain: 1.0, pos, range: 2600 });
  nz({ dur: 2.2, type: 'lowpass', f0: 420, f1: 40, q: 0.7, gain: 1.6, pos, range: 3200, buf: brownBuf });
  tone({ f0: 70, f1: 28, dur: 1.4, type: 'sine', gain: 0.9, pos, range: 2600 });
  nz({ dur: 3.5, type: 'lowpass', f0: 220, f1: 50, q: 0.4, gain: 0.5, pos, range: 3600, delay: 0.4, buf: brownBuf });
}
function sExplode(pos, big = 1) {
  nz({ dur: 0.25, type: 'bandpass', f0: 1200, f1: 200, q: 0.5, gain: 0.9 * big, pos, range: 2200 });
  nz({ dur: 2.4 * big, type: 'lowpass', f0: 600, f1: 40, q: 0.6, gain: 1.4 * big, pos, range: 2800, buf: brownBuf });
  tone({ f0: 60, f1: 25, dur: 1.2, type: 'sine', gain: 0.8 * big, pos, range: 2000 });
}
function sWhiz(pos, heavy) {
  if (heavy) { nz({ dur: 0.7, type: 'bandpass', f0: 500, f1: 180, q: 2, gain: 0.5, pos, range: 60 }); return; }
  nz({ dur: 0.22, type: 'bandpass', f0: frand(2200, 3200), f1: frand(900, 1400), q: 5, gain: 0.32, pos, range: 30 });
}
function sImpact(kind, pos) {
  if (kind === 'flesh') { nz({ dur: 0.12, type: 'lowpass', f0: 600, gain: 0.45, pos, range: 60 }); return; }
  if (kind === 'stone' || kind === 'brick') { nz({ dur: 0.1, type: 'bandpass', f0: 2600, q: 2, gain: 0.35, pos, range: 120 }); tone({ f0: 3200, f1: 1200, dur: 0.12, type: 'triangle', gain: 0.05, pos, range: 80 }); return; }
  if (kind === 'water') { nz({ dur: 0.25, type: 'bandpass', f0: 1200, f1: 400, q: 1, gain: 0.25, pos, range: 120 }); return; }
  if (kind === 'dirt' || kind === 'earth') { nz({ dur: 0.12, type: 'lowpass', f0: 900, gain: 0.3, pos, range: 90 }); return; }
  nz({ dur: 0.1, type: 'bandpass', f0: 1500, q: 1.2, gain: 0.35, pos, range: 120 });
  tone({ f0: 420, f1: 260, dur: 0.08, type: 'triangle', gain: 0.08, pos, range: 60 });
}
function sBreak(pos, mat) {
  if (mat === 'stone' || mat === 'brick') nz({ dur: 1.2, type: 'lowpass', f0: 1400, f1: 200, q: 0.5, gain: 0.7, pos, range: 500, buf: brownBuf, rate: 2 });
  else if (mat === 'earth' || mat === 'hay') nz({ dur: 0.8, type: 'lowpass', f0: 700, f1: 150, gain: 0.5, pos, range: 300 });
  else { nz({ dur: 0.5, type: 'bandpass', f0: 1600, f1: 500, q: 0.8, gain: 0.6, pos, range: 400 }); for (let k = 0; k < 3; k++) nz({ dur: 0.08, type: 'bandpass', f0: frand(800, 2000), q: 2, gain: 0.25, pos, range: 300, delay: k * 0.07 + Math.random() * 0.05 }); }
}
function sCollapse(pos) { nz({ dur: 3, type: 'lowpass', f0: 900, f1: 60, q: 0.5, gain: 1.0, pos, range: 900, buf: brownBuf, rate: 1.5 }); for (let k = 0; k < 8; k++) nz({ dur: 0.15, type: 'bandpass', f0: frand(500, 1500), q: 1.5, gain: 0.3, pos, range: 600, delay: Math.random() * 1.5 }); }
function sMelee(pos, hit, metal) {
  nz({ dur: 0.16, type: 'bandpass', f0: 900, f1: 2200, q: 1.5, gain: 0.25, pos, range: 40 });
  if (hit) nz({ dur: 0.14, type: 'lowpass', f0: 500, gain: 0.55, pos, range: 60, delay: 0.05 });
  if (metal) for (const f of [1820, 2730, 4150]) tone({ f0: f, dur: 0.5, type: 'sine', gain: 0.06, pos, range: 80, delay: 0.04 });
}
// drill noises: each step of the loading drill has its own sound
function sDrill(step, pos) {
  if (!AC) return;
  const p = pos || null, r = 25;
  switch (step) {
    case 'half': case 'cock': tone({ f0: 1700, f1: 1300, dur: 0.04, type: 'square', gain: 0.12, pos: p, range: r }); tone({ f0: 2300, dur: 0.03, type: 'square', gain: 0.08, pos: p, range: r, delay: 0.06 }); break;
    case 'bite': nz({ dur: 0.08, type: 'bandpass', f0: 2500, q: 2, gain: 0.18, pos: p, range: r }); nz({ dur: 0.12, type: 'highpass', f0: 4000, gain: 0.08, pos: p, range: r, delay: 0.12 }); break;
    case 'prime': for (let k = 0; k < 5; k++) nz({ dur: 0.03, type: 'highpass', f0: 5000, gain: 0.06, pos: p, range: r, delay: k * 0.05 }); break;
    case 'shut': case 'close': tone({ f0: 1300, f1: 900, dur: 0.05, type: 'square', gain: 0.14, pos: p, range: r }); break;
    case 'cast': nz({ dur: 0.18, type: 'lowpass', f0: 600, gain: 0.2, pos: p, range: r }); break;
    case 'charge': case 'patch': nz({ dur: 0.35, type: 'highpass', f0: 3500, f1: 6000, gain: 0.08, pos: p, range: r }); break;
    case 'draw': case 'return': nz({ dur: 0.5, type: 'bandpass', f0: 3000, f1: 4800, q: 4, gain: 0.12, pos: p, range: r }); tone({ f0: 3600, dur: 0.12, type: 'sine', gain: 0.04, pos: p, range: r, delay: 0.45 }); break;
    case 'ram': for (const f of [2950, 4420]) tone({ f0: f, dur: 0.18, type: 'sine', gain: 0.06, pos: p, range: r }); nz({ dur: 0.05, type: 'lowpass', f0: 800, gain: 0.15, pos: p, range: r }); break;
    case 'ready': case 'open': tone({ f0: 1900, f1: 1400, dur: 0.04, type: 'square', gain: 0.14, pos: p, range: r }); tone({ f0: 2600, dur: 0.03, type: 'square', gain: 0.1, pos: p, range: r, delay: 0.09 }); break;
    case 'gunload': nz({ dur: 0.6, type: 'lowpass', f0: 500, gain: 0.25, pos: p, range: 60 }); for (const f of [880, 1320]) tone({ f0: f, dur: 0.3, type: 'sine', gain: 0.04, pos: p, range: 60, delay: 0.4 }); break;
  }
}
function sStep(pos, kind, run) {
  const g = run ? 0.12 : 0.07;
  if (kind === 'wood') { nz({ dur: 0.07, type: 'bandpass', f0: 500, q: 1.5, gain: g * 1.5, pos, range: 30 }); return; }
  if (kind === 'water') { nz({ dur: 0.2, type: 'bandpass', f0: 1100, q: 0.8, gain: g * 1.3, pos, range: 30 }); return; }
  nz({ dur: 0.09, type: 'lowpass', f0: kind === 'road' ? 1600 : 900, gain: g, pos, range: 30 });
}
function sHoof(pos, gallop) { nz({ dur: 0.08, type: 'lowpass', f0: 700, gain: gallop ? 0.28 : 0.16, pos, range: 120 }); tone({ f0: 110, f1: 60, dur: 0.07, gain: gallop ? 0.12 : 0.06, pos, range: 80 }); }
function sNeigh(pos) {
  if (!AC) return;
  const [sg, pan, dl] = spatial(pos, 220); if (sg < 0.01) return;
  const t = AC.currentTime + dl, o = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(), g = outNode(0, pan);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(1100, t + 0.25); o.frequency.exponentialRampToValueAtTime(300, t + 1.1);
  lfo.frequency.value = 22; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 2;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25 * sg, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  o.connect(f); f.connect(g); o.start(t); lfo.start(t); o.stop(t + 1.3); lfo.stop(t + 1.3);
}
// A ragged crowd shout ("huzzah") from a few formant voices.
function sHuzzah(pos, n = 5) {
  if (!AC) return;
  const [sg, pan, dl] = spatial(pos, 500); if (sg < 0.01) return;
  for (let v = 0; v < n; v++) {
    const t = AC.currentTime + dl + Math.random() * 0.35, f0 = frand(110, 190), dur = frand(0.7, 1.1);
    const o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.35, t + 0.25); o.frequency.linearRampToValueAtTime(f0 * 1.1, t + dur);
    const g = outNode(0, pan);
    const f1 = AC.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6; f1.frequency.setValueAtTime(300, t); f1.frequency.linearRampToValueAtTime(800, t + 0.3);
    const f2 = AC.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 7; f2.frequency.setValueAtTime(870, t); f2.frequency.linearRampToValueAtTime(1250, t + 0.3);
    const mix = AC.createGain(); mix.gain.value = 1;
    o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * sg, t + 0.12); g.gain.setValueAtTime(0.16 * sg, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }
}
function sGroan(pos) {
  if (!AC) return;
  const [sg, pan, dl] = spatial(pos, 60); if (sg < 0.02) return;
  const t = AC.currentTime + dl, o = AC.createOscillator(), g = outNode(0, pan), f = AC.createBiquadFilter();
  o.type = 'sawtooth'; const f0 = frand(95, 150); o.frequency.setValueAtTime(f0 * 1.3, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.7);
  f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 3;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12 * sg, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(f); f.connect(g); o.start(t); o.stop(t + 0.9);
}
function sHit(head) { if (!AC) return; tone({ f0: head ? 1500 : 1100, f1: head ? 900 : 700, dur: 0.06, type: 'triangle', gain: 0.12 }); }
function sHurt() { nz({ dur: 0.25, type: 'lowpass', f0: 400, gain: 0.5 }); }
function sBird() {
  const f = frand(2400, 4200), n = 2 + Math.floor(Math.random() * 4), pos = _v7.copy(camera.position).add(_v6.set(frand(-40, 40), 8, frand(-40, 40)));
  for (let k = 0; k < n; k++) tone({ f0: f * frand(0.9, 1.1), f1: f * frand(1.1, 1.4), dur: 0.08, gain: 0.05, delay: k * 0.12, pos, range: 120 });
}
function sCricket() { for (let k = 0; k < 4; k++) tone({ f0: 4400, dur: 0.03, type: 'square', gain: 0.012, delay: k * 0.05 }); }

// ---------- music: fife and side drum ----------
// Notes are [midi, beats]; 0 = rest. Traditional tunes, transcribed by ear.
const TUNES = {
  yankee: { bpm: 132, notes: [
    [72, .5], [72, .5], [74, .5], [76, .5], [72, .5], [76, .5], [74, 1], [72, .5], [72, .5], [74, .5], [76, .5], [72, 1], [71, 1],
    [72, .5], [72, .5], [74, .5], [76, .5], [77, .5], [76, .5], [74, .5], [72, .5], [71, .5], [67, .5], [69, .5], [71, .5], [72, 1], [72, 1],
    [69, .75], [71, .25], [69, .5], [67, .5], [69, .5], [71, .5], [72, 1], [67, .75], [69, .25], [67, .5], [65, .5], [64, 1], [67, 1],
    [69, .75], [71, .25], [69, .5], [67, .5], [69, .5], [71, .5], [72, .5], [69, .5], [67, .5], [72, .5], [71, .5], [74, .5], [72, 1], [72, 1]] },
  grenadiers: { bpm: 120, notes: [
    [67, .5], [72, .75], [72, .25], [72, .5], [74, .5], [76, .75], [76, .25], [76, .5], [77, .5], [79, .5], [76, .5], [72, .5], [76, .5], [74, 1], [67, .5], [0, .5],
    [67, .5], [72, .75], [72, .25], [72, .5], [74, .5], [76, .75], [76, .25], [76, .5], [77, .5], [79, .5], [76, .5], [74, .5], [71, .5], [72, 1.5], [0, .5],
    [79, .5], [79, .75], [77, .25], [76, .5], [77, .5], [79, .5], [76, .5], [72, .5], [76, .5], [77, .5], [74, .5], [71, .5], [74, .5], [76, 1], [0, .5], [67, .5],
    [72, .75], [72, .25], [72, .5], [74, .5], [76, .75], [76, .25], [76, .5], [77, .5], [79, .5], [76, .5], [74, .5], [71, .5], [72, 1.5], [0, .5]] },
  call: { bpm: 140, notes: [[0, 2]] },
};
const MUS = { tune: null, i: 0, next: 0, loop: false, drum: true, beat: 0, timer: null };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function fifeNote(f, t, dur) {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), vib = AC.createOscillator(), vg = AC.createGain();
  o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2;
  vib.frequency.value = 5.5; vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(o.frequency);
  const g2 = AC.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g);
  o.connect(g); g.connect(musicG);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.025); g.gain.setValueAtTime(0.14, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.98);
  for (const x of [o, o2, vib]) { x.start(t); x.stop(t + dur + 0.05); }
  // breath
  const src = AC.createBufferSource(); src.buffer = noiseBuf; const bf = AC.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = f * 2; bf.Q.value = 3;
  const bg = AC.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.03, t + 0.02); bg.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.12, dur));
  src.connect(bf); bf.connect(bg); bg.connect(musicG); src.start(t, Math.random()); src.stop(t + 0.15);
}
function drumHit(t, accent, flam) {
  const src = AC.createBufferSource(); src.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
  const g = AC.createGain(); const v = accent ? 0.22 : 0.12;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  src.connect(f); f.connect(g); g.connect(musicG); src.start(t, Math.random()); src.stop(t + 0.2);
  const o = AC.createOscillator(), og = AC.createGain(); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(v * 0.7, t + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(og); og.connect(musicG); o.start(t); o.stop(t + 0.12);
  if (flam) drumHit(t - 0.03, false, false);
}
function playTune(name, loop = false, drum = true) {
  if (!AC) return;
  stopMusic();
  MUS.tune = TUNES[name]; MUS.i = 0; MUS.next = AC.currentTime + 0.3; MUS.loop = loop; MUS.drum = drum; MUS.beat = 0;
  MUS.timer = setInterval(musicTick, 60);
}
function stopMusic() { if (MUS.timer) clearInterval(MUS.timer); MUS.timer = null; MUS.tune = null; }
function musicTick() {
  if (!AC || !MUS.tune) return;
  const T = MUS.tune, spb = 60 / T.bpm;
  while (MUS.next < AC.currentTime + 0.25) {
    if (MUS.i >= T.notes.length) {
      if (!MUS.loop) { stopMusic(); return; }
      MUS.i = 0; MUS.next += spb * 2;
    }
    const [m, b] = T.notes[MUS.i++];
    const dur = b * spb;
    if (m) fifeNote(mtof(m), MUS.next, dur);
    if (MUS.drum) {
      // eighth-note side drum with accents on the beat and a roll at phrase ends
      for (let q = 0; q < b * 2; q++) {
        const tq = MUS.next + q * spb * 0.5, beat = MUS.beat + q * 0.5;
        drumHit(tq, beat % 2 === 0, beat % 4 === 0);
        if (beat % 8 === 7) for (let r = 1; r < 4; r++) drumHit(tq + r * spb * 0.125, false, false);
      }
    }
    MUS.beat += b;
    MUS.next += dur;
  }
}
// drum signal for the start of a round: "To Arms"
function drumCall() {
  if (!AC) return;
  const t0 = AC.currentTime + 0.1;
  for (let k = 0; k < 24; k++) drumHit(t0 + k * 0.07, k % 6 === 0, false);
  for (let k = 0; k < 4; k++) drumHit(t0 + 1.8 + k * 0.35, true, true);
}

// ---------- ambience ----------
const AMB = { bird: 2, cricket: 1, battle: 3 };
function updateAmbience(dt, map, combat) {
  if (!AC || !map) return;
  aSet(loops.wind.g.gain, 0.025 + (camera.position.y - heightAt(camera.position.x, camera.position.z) > 6 ? 0.03 : 0), 0.8);
  let wn = 0;
  if (WATER.mesh) { const wd = Math.abs(waterDepth(camera.position.x, camera.position.z)); wn = clamp(1 - wd / 6, 0, 1) * 0.12; if (map.coast) wn = Math.max(wn, 0.03); }
  aSet(loops.water.g.gain, wn, 0.6);
  AMB.bird -= dt; AMB.cricket -= dt; AMB.battle -= dt;
  if (map.light === 'dawn' || map.light === 'autumn') { if (AMB.bird < 0) { AMB.bird = frand(2, 7) * (combat ? 3 : 1); sBird(); } }
  if (map.light === 'dusk' && AMB.cricket < 0) { AMB.cricket = frand(0.6, 2); sCricket(); }
  // distant battle beyond the field, and bombardment of the town at Yorktown
  if (AMB.battle < 0) {
    AMB.battle = frand(3, 9);
    const a = Math.random() * TAU, p = _v7.set(camera.position.x + Math.cos(a) * 900, 10, camera.position.z + Math.sin(a) * 900);
    if (Math.random() < 0.5) nz({ dur: 2.5, type: 'lowpass', f0: 160, f1: 40, gain: 0.25, buf: brownBuf, pos: p, range: 2000 });
    else for (let k = 0; k < 6; k++) nz({ dur: 0.6, type: 'lowpass', f0: 500, f1: 120, gain: 0.08, pos: p, range: 2000, delay: k * frand(0.05, 0.3), buf: brownBuf });
  }
}
