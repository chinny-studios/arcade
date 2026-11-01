// Voices: a little formant synthesizer that sings vowels (Bongo's singing, the "singer" in downloaded songs, babble
// when the browser has no speech engine), and a wrapper around speechSynthesis for talking.
const VOWELS = { a: [760, 1150, 2650], e: [520, 1780, 2550], i: [330, 2250, 3000], o: [500, 860, 2600], u: [360, 760, 2450], er: [500, 1380, 1750] };
function vowelOf(syl) {
  const s = syl.toLowerCase().replace(/[^a-z]/g, '');
  if (/ee|ea|ie|y$|i$/.test(s) && !/ai|ay/.test(s)) return 'i';
  if (/oo|ew|ue|ou$|you/.test(s)) return 'u';
  if (/ai|ay|ei|e$|ey/.test(s)) return 'e';
  if (/ow|oa|o$|ou/.test(s)) return 'o';
  if (/er|ir|ur/.test(s)) return 'er';
  const m = s.match(/[aeiou]/);
  return m ? (m[0] === 'u' ? 'a' : m[0]) : 'a';
}
const CONS = /^(s|sh|ch|t|k|c|p|f|th|z|j|x)/;

// voiceNote: one sung syllable. f in Hz, at = ctx time, d = seconds.
function voiceNote({ at, f, d, vowel = 'a', v = 0.2, dest, vib = 5.5, shift = 1, cons = '', glide = 0 }) {
  const c = ac(); if (!c) return;
  const t0 = at ?? c.currentTime;
  const src = c.createOscillator(); src.type = 'sawtooth';
  src.frequency.setValueAtTime(glide ? f * glide : f, t0);
  if (glide) src.frequency.exponentialRampToValueAtTime(f, t0 + Math.min(0.08, d * 0.4));
  const lfo = c.createOscillator(); lfo.frequency.value = vib;
  const lg = c.createGain(); lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(f * 0.018, t0 + Math.min(d, 0.45));
  lfo.connect(lg); lg.connect(src.frequency);
  const env = c.createGain();
  const a = Math.min(0.04, d * 0.3), rel = Math.min(0.12, d * 0.4);
  env.gain.setValueAtTime(0.0001, t0); env.gain.linearRampToValueAtTime(v, t0 + a);
  env.gain.setValueAtTime(v, t0 + Math.max(a, d - rel)); env.gain.linearRampToValueAtTime(0.0001, t0 + d);
  const F = VOWELS[vowel] || VOWELS.a, G = [6, 4.5, 2.5];
  for (let i = 0; i < 3; i++) {
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = F[i] * shift; bp.Q.value = F[i] * shift / (70 + i * 50);
    const g = c.createGain(); g.gain.value = G[i];
    src.connect(bp); bp.connect(g); g.connect(env);
  }
  const body = c.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 600; const bg = c.createGain(); bg.gain.value = 0.25;
  src.connect(body); body.connect(bg); bg.connect(env);
  env.connect(dest || AU.voice);
  src.start(t0); src.stop(t0 + d + 0.05); lfo.start(t0); lfo.stop(t0 + d + 0.05);
  if (cons) noise({ at: t0, d: 0.035, v: v * 0.5, hp: cons === 's' || cons === 'sh' ? 4500 : 2000, r: 0.03, dest: dest || AU.voice });
}
function singSyl(syl, f, at, d, o = {}) {
  const m = syl.toLowerCase().match(CONS);
  voiceNote(Object.assign({ at, f, d, vowel: vowelOf(syl), cons: m ? m[1] : '' }, o));
}

// Gibberish talk for when there is no speech engine: one formant blip per syllable with a sing-song pitch.
function babble(text, o = {}) {
  const c = ac(); if (!c) return text.length * 0.06;
  const words = text.split(/\s+/).filter(Boolean);
  let t = c.currentTime + 0.05; const base = o.pitch || 150;
  for (const w of words) {
    const syls = Math.max(1, Math.round(w.replace(/[^a-z]/gi, '').length / 3));
    for (let i = 0; i < syls; i++) {
      const d = rnd(0.07, 0.12);
      singSyl(w.slice(i * 3, i * 3 + 3) || 'a', base * Math.pow(2, rnd(-3, 5) / 12), t, d, { v: 0.12, vib: 0, shift: o.shift || 1.15, dest: o.dest });
      t += d + 0.015;
    }
    t += /[.!?,]$/.test(w) ? 0.18 : 0.05;
  }
  return t - c.currentTime;
}

// SPEECH.say(text, { pitch, rate, voice:'bongo'|'system' }) → estimated seconds. Uses the browser's speech engine when
// it has voices, otherwise babble.
const SPEECH = {
  voices: [], ok: 'speechSynthesis' in window,
  init() {
    if (!this.ok) return;
    const load = () => { this.voices = speechSynthesis.getVoices(); };
    load(); speechSynthesis.onvoiceschanged = load;
  },
  pickVoice(kind) {
    const vs = this.voices.filter((v) => /^en/i.test(v.lang));
    if (!vs.length) return null;
    if (kind === 'bongo') return vs.find((v) => /male|david|daniel|fred|alex|george|guy/i.test(v.name) && !/female/i.test(v.name)) || vs[0];
    return vs.find((v) => /female|zira|samantha|susan|karen|hazel|google us/i.test(v.name)) || vs[0];
  },
  say(text, o = {}) {
    const clean = text.replace(/<[^>]+>/g, '').replace(/[~*^]/g, '');
    const est = 0.35 + clean.length * 0.065 / (o.rate || 1);
    if (AU.muted) return est;
    if (this.ok && this.voices.length && !o.babble) {
      try {
        const u = new SpeechSynthesisUtterance(clean);
        const v = this.pickVoice(o.voice); if (v) u.voice = v;
        u.pitch = o.pitch ?? 1; u.rate = o.rate ?? 1; u.volume = Math.min(1, S.vol * 1.1);
        if (o.onend) u.onend = o.onend;
        speechSynthesis.speak(u);
        return est;
      } catch (e) { /* fall through to babble */ }
    }
    return babble(clean, { pitch: o.voice === 'bongo' ? 120 : 210, shift: o.voice === 'bongo' ? 1.05 : 1.25 });
  },
  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } },
};
