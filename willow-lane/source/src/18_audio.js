// Willow Lane — all sound is synthesized: UI blips, household noises, the gibberish voices sims speak in,
// piano notes, and a little lounge music for build mode and the stereo.

const AU = { ctx: null, master: null, sfx: null, voice: null, mus: null, noise: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  const ctx = new C();
  AU.ctx = ctx;
  AU.master = ctx.createGain(); AU.master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  AU.master.connect(comp); comp.connect(ctx.destination);
  AU.sfx = ctx.createGain(); AU.sfx.gain.value = 0.5; AU.sfx.connect(AU.master);
  AU.voice = ctx.createGain(); AU.voice.gain.value = 0.55; AU.voice.connect(AU.master);
  AU.mus = ctx.createGain(); AU.mus.gain.value = 0; AU.mus.connect(AU.master);
  const len = ctx.sampleRate * 1.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = buf;
  music.start();
}
const now = () => AU.ctx.currentTime;
function tone(freq, t0, dur, { type = 'sine', vol = 0.3, attack = 0.005, out = AU.sfx, slide = 0, detune = 0 } = {}) {
  const ctx = AU.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
  o.detune.value = detune;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
  return o;
}
function noise(t0, dur, { vol = 0.2, f = 2000, q = 1, type = 'bandpass', out = AU.sfx, f2 = 0, attack = 0.005 } = {}) {
  const ctx = AU.ctx, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = AU.noise; s.loop = true;
  fl.type = type; fl.frequency.setValueAtTime(f, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur); fl.Q.value = q;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(out); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
}
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

function sfx(name) {
  if (!AU.ctx || !G.options.sound) return;
  const t = now();
  switch (name) {
    case 'click': tone(1300, t, 0.04, { vol: 0.12 }); break;
    case 'select': tone(880, t, 0.08, { vol: 0.14 }); tone(1320, t + 0.06, 0.12, { vol: 0.12 }); break;
    case 'pie': tone(600, t, 0.08, { vol: 0.12, slide: 1.6 }); break;
    case 'open': tone(520, t, 0.1, { vol: 0.12, slide: 1.4 }); break;
    case 'mode': noise(t, 0.3, { vol: 0.12, f: 400, f2: 3000, q: 2 }); tone(660, t + 0.05, 0.15, { vol: 0.08 }); break;
    case 'error': tone(160, t, 0.18, { type: 'square', vol: 0.08 }); break;
    case 'place': tone(140, t, 0.15, { vol: 0.35, slide: 0.5 }); noise(t, 0.08, { vol: 0.15, f: 800 }); break;
    case 'sell': tone(1568, t, 0.15, { vol: 0.14 }); tone(2093, t + 0.08, 0.3, { vol: 0.14 }); break;
    case 'build': noise(t, 0.18, { vol: 0.3, f: 300, q: 0.8 }); tone(90, t, 0.2, { vol: 0.3, slide: 0.6 }); break;
    case 'floor': noise(t, 0.12, { vol: 0.2, f: 1200 }); break;
    case 'paint': noise(t, 0.3, { vol: 0.15, f: 2500, f2: 900, q: 1.5 }); break;
    case 'chime': [72, 76, 79].forEach((n, i) => tone(NOTE(n), t + i * 0.09, 0.5, { vol: 0.1, type: 'triangle' })); break;
    case 'fanfare': [60, 64, 67, 72, 76].forEach((n, i) => tone(NOTE(n), t + i * 0.1, 0.6, { vol: 0.12, type: 'triangle' })); tone(NOTE(84), t + 0.5, 0.9, { vol: 0.08 }); break;
    case 'skill': [67, 71, 74, 79].forEach((n, i) => tone(NOTE(n), t + i * 0.07, 0.3, { vol: 0.1, type: 'triangle' })); break;
    case 'honk': tone(392, t, 0.22, { type: 'square', vol: 0.08 }); tone(330, t + 0.28, 0.3, { type: 'square', vol: 0.08 }); break;
    case 'busHorn': tone(220, t, 0.5, { type: 'sawtooth', vol: 0.06 }); tone(277, t, 0.5, { type: 'sawtooth', vol: 0.05 }); break;
    case 'doorbell': tone(NOTE(76), t, 0.7, { vol: 0.15, type: 'triangle' }); tone(NOTE(72), t + 0.45, 0.9, { vol: 0.15, type: 'triangle' }); break;
    case 'dial': for (let i = 0; i < 4; i++) { tone(697 + i * 80, t + i * 0.1, 0.07, { vol: 0.06 }); tone(1209, t + i * 0.1, 0.07, { vol: 0.05 }); } break;
    case 'flush': noise(t, 1.2, { vol: 0.25, f: 600, f2: 200, q: 0.7, attack: 0.1 }); break;
    case 'shower': noise(t, 1.5, { vol: 0.12, f: 5000, q: 0.5, attack: 0.2 }); break;
    case 'fridge': tone(110, t, 0.12, { vol: 0.2, slide: 0.7 }); break;
    case 'sizzle': noise(t, 1.0, { vol: 0.1, f: 6000, q: 0.6, attack: 0.1 }); break;
    case 'kiss': noise(t, 0.05, { vol: 0.25, f: 3000, q: 3 }); tone(900, t, 0.08, { vol: 0.1, slide: 1.8 }); break;
    case 'alarm': for (let i = 0; i < 6; i++) tone(3000, t + i * 0.3, 0.15, { type: 'square', vol: 0.05 }); break;
    case 'stopAlarm': break;
    case 'pop': noise(t, 0.2, { vol: 0.25, f: 1500 }); tone(80, t, 0.2, { vol: 0.25 }); break;
    case 'wrench': noise(t, 0.06, { vol: 0.15, f: 4000, q: 6 }); break;
    case 'blow': noise(t, 0.5, { vol: 0.15, f: 1200, q: 0.6, attack: 0.05 }); break;
    case 'mail': tone(NOTE(84), t, 0.15, { vol: 0.08 }); tone(NOTE(88), t + 0.12, 0.3, { vol: 0.08 }); break;
    case 'bird': { const f = rrange(2600, 4200); for (let i = 0; i < rint(2, 4); i++) tone(f * rrange(0.9, 1.15), t + i * 0.13, 0.09, { vol: 0.025, slide: rrange(0.7, 1.4) }); break; }
    case 'cricket': for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) tone(4400, t + i * 0.32 + k * 0.025, 0.018, { vol: 0.012 }); break;
    case 'passing': [57, 64, 69, 72].forEach((n, i) => tone(NOTE(n), t + i * 0.35, 2.2, { vol: 0.07, type: 'triangle', attack: 0.3 })); break;
  }
}

// ---------- voices: gibberish built from formant-filtered sawtooth syllables ----------
const VOWELS = [[800, 1200], [400, 2000], [300, 2300], [500, 900], [350, 800], [600, 1700], [450, 1500]];
function babble(s, mood = 0) {
  if (!AU.ctx || !G.options.voices) return;
  let vol = 1, pan = 0;
  if (!s.cas) {
    const p = worldToScreen(s.x, 1.5, s.z);
    if (!p.vis || p.x < -100 || p.x > window.innerWidth + 100) return;
    pan = clamp((p.x / window.innerWidth) * 2 - 1, -1, 1) * 0.6;
    const d = Math.hypot(R.camera.position.x - s.x, R.camera.position.y - 1, R.camera.position.z - s.z);
    vol = clamp(26 / d, 0.15, 1);
    if (G.speed > 2) return;
  }
  const ctx = AU.ctx, t0 = now() + 0.01;
  const base = { baby: 420, child: 330, teen: 220, adult: 150, elder: 140 }[s.age] || 160;
  const f0 = base * (0.75 + (s.voice || 0.5) * 0.7);
  const n = rint(2, 5);
  const out = ctx.createGain(); out.gain.value = 0.32 * vol;
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (panner) { panner.pan.value = pan; out.connect(panner); panner.connect(AU.voice); } else out.connect(AU.voice);
  let t = t0;
  for (let i = 0; i < n; i++) {
    const dur = rrange(0.07, 0.15) * (mood < -0.3 ? 0.85 : 1);
    const [F1, F2] = rpick(VOWELS);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    const last = i === n - 1;
    const p0 = f0 * (1 + (mood > 0 ? 0.08 : -0.05) * i / n) * rrange(0.92, 1.08);
    osc.frequency.setValueAtTime(p0, t);
    osc.frequency.linearRampToValueAtTime(last ? p0 * (mood >= 0 ? 1.25 : 0.8) : p0 * rrange(0.95, 1.06), t + dur);
    const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = F1 * (s.age === 'child' || s.age === 'baby' ? 1.25 : 1); b1.Q.value = 6;
    const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = F2 * (s.age === 'child' || s.age === 'baby' ? 1.2 : 1); b2.Q.value = 9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(mood < -0.3 ? 1.4 : 1, t + 0.015); g.gain.setValueAtTime(mood < -0.3 ? 1.2 : 0.9, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.02);
    if (chance(0.6)) { // consonant
      const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      ns.buffer = AU.noise; nf.type = 'bandpass'; nf.frequency.value = rpick([2500, 4000, 6000]); nf.Q.value = 2;
      ng.gain.setValueAtTime(0.35, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start(t, Math.random()); ns.stop(t + 0.04);
    }
    t += dur + rrange(0.01, 0.04);
  }
}
function pianoNote(s, skill, o) {
  if (!AU.ctx || !G.options.sound || G.speed > 2) return;
  const [x, z] = objCenter(o);
  const d = Math.hypot(R.camera.position.x - x, R.camera.position.z - z, R.camera.position.y);
  const vol = clamp(22 / d, 0.1, 1) * 0.12;
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  o.mel = o.mel == null ? 3 : o.mel;
  // better players step through the scale, beginners jump around
  o.mel = skill > 4 ? clamp(o.mel + rpick([-1, 1, 1, -2, 2]), 0, scale.length - 1) : rint(0, scale.length - 1);
  const n = 60 + scale[o.mel] + (chance(0.15) ? 12 : 0);
  const t = now();
  epiano(NOTE(n), t, 1.2, vol);
  if (skill > 6 && chance(0.3)) epiano(NOTE(n - 12 + (chance(0.5) ? 4 : 7)), t, 1.2, vol * 0.7);
}
// electric-piano-ish voice: a sine carrier with a decaying FM modulator
function epiano(f, t, dur, vol, out = AU.sfx) {
  const ctx = AU.ctx, c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  c.frequency.value = f; m.frequency.value = f * 2;
  mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
  m.connect(mg); mg.connect(c.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  c.connect(g); g.connect(out);
  c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
}

// ---------- music ----------
// A four-bar lounge progression for buy/build mode and the menu; a bouncier groove when a stereo is on.
const music = (() => {
  const PROG = [[48, 52, 55, 59, 62], [45, 48, 52, 55, 59], [50, 53, 57, 60, 64], [43, 47, 50, 53, 57]]; // Cmaj9 Am9 Dm9 G9
  let mode = 'menu', stereo = false, next = 0, step = 0, timer = null, enabled = true;
  function target() { if (!enabled || !G.options.music) return 0; if (mode === 'buy' || mode === 'build' || mode === 'menu' || mode === 'cas') return 0.32; if (stereo) return stereoVol(); return 0; }
  function stereoVol() {
    const st = G.objects.filter((o) => o.type === 'stereo' && o.on);
    if (!st.length) return 0;
    let best = 0; for (const o of st) { const [x, z] = objCenter(o); const d = Math.hypot(R.cam.tx - x, R.cam.tz - z) + R.cam.dist * 0.4; best = Math.max(best, clamp(14 / d, 0.05, 0.5)); }
    return best;
  }
  function sched() {
    if (!AU.ctx) return;
    const ctx = AU.ctx;
    AU.mus.gain.setTargetAtTime(target(), ctx.currentTime, 0.5);
    const groove = stereo && mode === 'live';
    const bpm = groove ? 112 : 84, spb = 60 / bpm / 2; // eighth notes
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % 4, e = step % 8, ch = PROG[bar];
      if (AU.mus.gain.value > 0.001 || target() > 0) {
        if (groove) {
          if (e % 4 === 0) { tone(110, next, 0.25, { vol: 0.5, slide: 0.35, out: AU.mus }); }
          if (e % 4 === 2) noise(next, 0.12, { vol: 0.2, f: 1800, q: 0.8, out: AU.mus });
          noise(next, 0.04, { vol: 0.06, f: 8000, type: 'highpass', out: AU.mus });
          if (e === 0 || e === 3 || e === 6) tone(NOTE(ch[0] - 12), next, spb * 1.8, { type: 'triangle', vol: 0.3, out: AU.mus });
          if (e === 2 || e === 6) for (const n of ch.slice(1, 4)) epiano(NOTE(n + 12), next, spb * 2, 0.04, AU.mus);
          if (chance(0.3)) epiano(NOTE(ch[rint(1, 4)] + 24), next, spb * 2, 0.035, AU.mus);
        } else {
          if (e === 0) { for (const n of ch.slice(1)) epiano(NOTE(n + 12), next + rrange(0, 0.03), spb * 7, 0.035, AU.mus); tone(NOTE(ch[0] - 12), next, spb * 6, { type: 'triangle', vol: 0.22, attack: 0.02, out: AU.mus }); }
          if (e === 4) tone(NOTE(ch[2] - 12), next, spb * 3, { type: 'triangle', vol: 0.16, attack: 0.02, out: AU.mus });
          if ((e === 3 || e === 6 || e === 7) && chance(0.55)) epiano(NOTE(ch[rint(1, 4)] + 24), next, spb * 3, 0.03, AU.mus);
          if (e % 2 === 0) noise(next, 0.05, { vol: 0.03, f: 7000, type: 'highpass', out: AU.mus });
        }
      }
      step++; next += spb;
    }
  }
  return {
    start() { if (!timer) timer = setInterval(sched, 100); },
    mode(m) { mode = m; },
    stereo(on) { stereo = on; },
    enable(b) { enabled = b; },
  };
})();
