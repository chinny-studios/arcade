// Music: every downloaded "MP3" is a song composed on the spot from a seed (artist + title + version) in the style
// of its genre, then played by a small look-ahead sequencer (MP). Low-bitrate files are low-passed.
const GENRES = {
  poppunk: { bpm: [168, 190], minor: false, prog: [[0, 4, 5, 3], [0, 4, 5, 3], [5, 3, 0, 4]], k: 'x.......x.x.....', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'gtr8', bass: 'root8', lead: 'vox', long: true },
  numetal: { bpm: [94, 108], minor: true, prog: [[0, 0, 5, 6], [0, 5, 6, 4], [0, 6, 5, 6]], k: 'x..x..x.x..x....', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'chug', bass: 'chug', lead: 'vox', scratch: true, low: true },
  teenpop: { bpm: [96, 112], minor: false, prog: [[5, 3, 0, 4], [0, 4, 5, 3], [3, 4, 2, 5]], k: 'x.....x...x.....', s: '....x.......x...', hh: 'x.xxx.x.x.xxx.x.', chord: 'padpluck', bass: 'synth', lead: 'vox', clap: true },
  boyband: { bpm: [100, 116], minor: true, prog: [[0, 5, 2, 6], [5, 6, 0, 0], [3, 4, 0, 5]], k: 'x..x..x...x.....', s: '....x.......x...', hh: 'xxx.xxx.xxx.xxx.', chord: 'stabs', bass: 'synth', lead: 'vox', clap: true },
  eurodance: { bpm: [128, 140], minor: true, prog: [[0, 5, 2, 6], [0, 5, 2, 6], [5, 6, 0, 0]], k: 'x...x...x...x...', s: '....x.......x...', hh: '..x...x...x...x.', chord: 'offsaw', bass: 'offbeat', lead: 'saw', long: true },
  trance: { bpm: [134, 140], minor: true, prog: [[0, 0, 5, 6], [0, 0, 5, 6], [3, 3, 4, 4]], k: 'x...x...x...x...', s: '....x.......x...', hh: '..x...x...x...x.', chord: 'pad', bass: 'offbeat', lead: 'riff', long: true, novox: true },
  rnb: { bpm: [84, 96], minor: false, prog: [[1, 4, 0, 5], [3, 2, 1, 4], [1, 4, 0, 0]], k: 'x......x..x.....', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'keys', bass: 'sub', lead: 'vox', swing: 0.15, sevenths: true },
  hiphop: { bpm: [88, 98], minor: true, prog: [[0, 0, 3, 3], [0, 5, 3, 4], [0, 0, 3, 3]], k: 'x.....x..x......', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'keys', bass: 'sub', lead: 'pluck', swing: 0.12, rap: true, scratch: true },
  altrock: { bpm: [118, 138], minor: false, prog: [[0, 3, 5, 4], [5, 3, 0, 4], [3, 0, 4, 5]], k: 'x.......x.x.....', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'gtr4', bass: 'root8', lead: 'vox' },
  grunge: { bpm: [84, 100], minor: true, prog: [[0, 6, 5, 6], [0, 3, 6, 5], [5, 6, 0, 0]], k: 'x.......x.x.....', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'gtr4', bass: 'root8', lead: 'vox', low: true },
  latin: { bpm: [168, 178], minor: false, prog: [[0, 3, 4, 3], [0, 4, 0, 4], [3, 4, 0, 0]], k: 'x..x....x..x....', s: '..x..x....x.x...', hh: 'x.xxx.xxx.xxx.xx', chord: 'brass', bass: 'tumbao', lead: 'vox', rim: true },
  ballad: { bpm: [70, 80], minor: false, prog: [[0, 4, 5, 3], [3, 4, 0, 5], [5, 3, 0, 4]], k: 'x.......x.......', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'piano', bass: 'sub', lead: 'vox', soft: true },
  ska: { bpm: [150, 170], minor: false, prog: [[0, 3, 4, 3], [0, 5, 3, 4], [3, 4, 0, 0]], k: 'x.......x.......', s: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', chord: 'skank', bass: 'walk', lead: 'vox', horns: true },
};
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const SYLS = ['oh', 'yeah', 'ba', 'by', 'na', 'hey', 'ooh', 'whoa', 'I', 'you', 'love', 'night', 'time', 'so', 'go', 'girl', 'boy', 'now', 'way', 'say', 'all', 'day', 'feel', 'my', 'heart', 'dance', 'back', 'run', 'away', 'tonight'];

// ---- instruments: f(at, dest, ...args) ----
const INST = {
  kick(at, dest, v = 1) { tone({ at, f: 150, f2: 42, glide: 0.11, d: 0.12, v: 0.55 * v, r: 0.08, dest }); },
  snare(at, dest, v = 1) { noise({ at, d: 0.09, v: 0.3 * v, bp: 2400, q: 0.7, r: 0.09, dest }); tone({ at, f: 190, f2: 160, d: 0.05, v: 0.18 * v, r: 0.05, type: 'triangle', dest }); },
  clap(at, dest, v = 1) { for (let i = 0; i < 3; i++) noise({ at: at + i * 0.012, d: 0.012, v: 0.22 * v, bp: 1500, q: 1.2, r: 0.02, dest }); noise({ at: at + 0.036, d: 0.05, v: 0.2 * v, bp: 1400, q: 1, r: 0.1, dest }); },
  rim(at, dest, v = 1) { tone({ at, f: 1700, d: 0.01, v: 0.12 * v, r: 0.03, type: 'square', bp: 1700, q: 3, dest }); },
  hat(at, dest, v = 1, open) { noise({ at, d: open ? 0.12 : 0.02, v: 0.09 * v, hp: 7500, r: open ? 0.12 : 0.03, dest }); },
  crash(at, dest, v = 1) { noise({ at, d: 0.05, v: 0.14 * v, hp: 4500, r: 1.4, dest }); },
  scratch(at, dest, v = 1) { noise({ at, d: 0.09, v: 0.16 * v, bp: 900, bp2: 2600, q: 4, r: 0.02, dest }); noise({ at: at + 0.1, d: 0.08, v: 0.14 * v, bp: 2400, bp2: 700, q: 4, r: 0.02, dest }); },
  bass(at, dest, m, d, v = 1, kind = 'pick') {
    const f = mtof(m);
    if (kind === 'sub') { tone({ at, f, d, v: 0.32 * v, r: 0.08, type: 'sine', dest }); tone({ at, f: f * 2, d: d * 0.6, v: 0.05 * v, r: 0.05, type: 'triangle', dest }); }
    else if (kind === 'synth') tone({ at, f, d, v: 0.18 * v, r: 0.04, type: 'square', lp: 700, q: 6, dest });
    else tone({ at, f, d, v: 0.2 * v, r: 0.05, type: 'sawtooth', lp: kind === 'chug' ? 500 : 900, q: 2, sus: 0.5, dest });
  },
  gtr(at, dest, notes, d, v = 1, mute) {
    const c = ac(); if (!c) return;
    const sh = c.createWaveShaper(); sh.curve = AU.curve;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = mute ? 1400 : 3200;
    const g = c.createGain(); const dd = mute ? Math.min(d, 0.09) : d;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.09 * v, at + 0.004);
    g.gain.setValueAtTime(0.08 * v, at + dd * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + dd + 0.06);
    sh.connect(lp); lp.connect(g); g.connect(dest);
    for (const m of notes) for (const det of [-7, 7]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const og = c.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(sh); o.start(at); o.stop(at + dd + 0.1);
    }
  },
  pad(at, dest, notes, d, v = 1) { for (const m of notes) for (const det of [-9, 9]) tone({ at, f: mtof(m), d, a: Math.min(0.4, d * 0.3), r: 0.3, v: 0.03 * v, type: 'sawtooth', lp: 1300, det, dest }); },
  keys(at, dest, notes, d, v = 1) { for (const m of notes) { tone({ at, f: mtof(m), d, v: 0.07 * v, r: 0.25, sus: 0.35, type: 'sine', dest }); tone({ at, f: mtof(m) * 2, d: d * 0.3, v: 0.025 * v, r: 0.1, sus: 0.2, type: 'triangle', dest }); } },
  piano(at, dest, notes, d, v = 1) { for (const m of notes) { tone({ at, f: mtof(m), d, v: 0.08 * v, r: 0.4, sus: 0.15, type: 'triangle', dest }); tone({ at, f: mtof(m) * 2, d: d * 0.2, v: 0.03 * v, r: 0.2, sus: 0.1, type: 'sine', dest }); } },
  pluck(at, dest, m, d, v = 1) { tone({ at, f: mtof(m), d: Math.min(d, 0.25), v: 0.09 * v, r: 0.1, sus: 0.1, type: 'square', lp: 2600, dest }); },
  saw(at, dest, m, d, v = 1) { for (const det of [-14, -5, 5, 14]) tone({ at, f: mtof(m), d, v: 0.03 * v, r: 0.1, type: 'sawtooth', lp: 3500, det, dest }); },
  brass(at, dest, notes, d, v = 1) { for (const m of notes) tone({ at, f: mtof(m), d, a: 0.03, v: 0.05 * v, r: 0.06, type: 'sawtooth', lp: 2200, q: 1, dest }); },
  vox(at, dest, m, d, v = 1, syl = 'oh') { singSyl(syl, mtof(m), at, Math.max(0.08, d), { v: 0.13 * v, dest, shift: 1.12, glide: 0.97 }); },
  crowd(at, dest, d, v = 1) { noise({ at, d, a: d * 0.3, v: 0.05 * v, bp: 1100, q: 0.4, r: 0.6, dest }); },
};

function compileSong(track) {
  const t = track.realOf ? Object.assign({}, track, findSong(track.realOf) || {}, { kind: 'song', kbps: track.kbps }) : track;
  const g = GENRES[t.genre] || GENRES.altrock;
  const R = mulberry(hash32((t.artist || '') + '|' + (t.title || '') + '|' + (t.version || '')));
  const rpick = (a) => a[Math.floor(R() * a.length)];
  const remix = /remix/i.test(t.version || ''), live = /live/i.test(t.version || '') || track.kind === 'live', acoustic = /acoustic/i.test(t.version || '');
  let bpm = Math.round(g.bpm[0] + R() * (g.bpm[1] - g.bpm[0]));
  if (remix) bpm = Math.round(bpm < 110 ? bpm * 1.3 : bpm + 6);
  const key = 40 + Math.floor(R() * 12) - 2, scale = g.minor ? MIN : MAJ;
  const spb = 60 / bpm, step = spb / 4;
  const ev = [];
  const add = (time, i, ...a) => ev.push({ t: time, i, a });
  if (track.kind === 'silence') return { ev, dur: 34, bpm: 120, track };
  if (track.kind === 'talk') return { ev, dur: 14, bpm: 120, track, talk: true };
  const long = g.long || bpm >= 110;
  const sections = long
    ? [['intro', 4], ['verse', 8], ['chorus', 8], ['verse', 8], ['chorus', 8], ['bridge', 4], ['chorus', 8], ['outro', 4]]
    : [['intro', 2], ['verse', 8], ['chorus', 8], ['verse', 4], ['chorus', 8], ['outro', 2]];
  const chordOf = (deg, oct = 0) => {
    const n = [0, 2, 4].concat(g.sevenths ? [6] : []).map((k) => { const i = deg + k; return key + 12 + scale[i % 7] + 12 * Math.floor(i / 7) + oct; });
    return n;
  };
  const rootOf = (deg) => key + scale[deg % 7] - (g.low ? 12 : 0) + (deg >= 5 && g.low ? 0 : 0);
  // melody motifs per section kind
  const RHY = ['x.x.x.x.x...x...', 'x..x..x.x.x.....', '..x.x.x.x.x.x...', 'x...x...x.x.x...', 'x.xx.x..x.x.....', 'x.x.x...x.x.x.x.', '....x.x.x.x.x...', 'x..x..x...x.x...'];
  const titleSyl = (t.title || 'oh yeah').toLowerCase().replace(/\(.*?\)/g, '').match(/[a-z']+/g) || ['oh'];
  function motif(kind) {
    const bars = [];
    let p = kind === 'chorus' ? 4 : 2;
    for (let b = 0; b < 2; b++) {
      const r = rpick(RHY), notes = [];
      for (let s = 0; s < 16; s++) if (r[s] === 'x') {
        const strong = s % 4 === 0;
        p += strong ? rpick([-2, 0, 2, 0]) : rpick([-1, 1, 1, -1, 2, -2, 0]);
        p = clamp(p, 0, 9);
        notes.push([s, p]);
      }
      bars.push(notes);
    }
    return bars;
  }
  const motifs = { verse: motif('verse'), chorus: motif('chorus'), bridge: motif('verse') };
  const melodyMidi = (p) => key + 24 + scale[p % 7] + 12 * Math.floor(p / 7) - (g.low ? 0 : 0);
  let bar = 0, time = 0, sylI = 0;
  const swing = (s) => (g.swing && s % 2 === 1 ? g.swing * step * 2 : 0);
  for (const [kind, nb] of sections) {
    const prog = kind === 'chorus' ? g.prog[1] : kind === 'bridge' ? g.prog[2] : g.prog[0];
    for (let b = 0; b < nb; b++, bar++) {
      const t0 = time, deg = prog[b % 4];
      const ch = chordOf(deg), root = rootOf(deg);
      const loud = kind === 'chorus' ? 1 : kind === 'verse' ? 0.8 : 0.65;
      const drums = !(kind === 'intro' && b < (long ? 2 : 1)) && kind !== 'bridge' && !acoustic;
      const last = b === nb - 1;
      if ((kind === 'chorus' || kind === 'verse') && b === 0) add(t0, 'crash', 0.9);
      // drums
      for (let s = 0; s < 16; s++) {
        const ts = t0 + s * step + swing(s);
        if (drums) {
          if (g.k[s] === 'x') add(ts, 'kick', g.soft ? 0.7 : 1);
          if (g.s[s] === 'x') add(ts, g.rim ? 'rim' : 'snare', g.soft ? 0.6 : 1);
          if (g.clap && g.s[s] === 'x' && kind === 'chorus') add(ts, 'clap', 0.8);
          if (g.hh[s] === 'x') add(ts, 'hat', (s % 4 === 0 ? 1 : 0.7) * (g.soft ? 0.6 : 1), g.chord === 'offsaw' && s % 4 === 2);
          if (last && s >= 12 && kind !== 'outro' && R() < 0.5) add(ts, 'snare', 0.7);
        } else if (kind === 'bridge' && s % 8 === 0) add(ts, 'kick', 0.6);
      }
      if (g.scratch && drums && b % 4 === 3) add(t0 + 12 * step, 'scratch', 0.8);
      // bass
      const bk = g.bass;
      if (kind !== 'intro' || b >= nb / 2) {
        if (bk === 'root8') for (let s = 0; s < 16; s += 2) add(t0 + s * step, 'bass', root, step * 1.8, loud, 'pick');
        else if (bk === 'chug') { for (let s = 0; s < 16; s++) if (g.k[s] === 'x' || s % 4 === 0) add(t0 + s * step, 'bass', root, step * 0.9, 1, 'chug'); }
        else if (bk === 'offbeat') for (let s = 2; s < 16; s += 4) add(t0 + s * step, 'bass', root + 12, step * 1.6, 1, 'synth');
        else if (bk === 'synth') { for (const s of [0, 3, 6, 10, 12]) add(t0 + s * step, 'bass', root + (s === 12 ? 7 : 0), step * 2.5, 1, 'synth'); }
        else if (bk === 'sub') { add(t0, 'bass', root, step * 6, 1, 'sub'); add(t0 + 7 * step + swing(7), 'bass', root, step * 3, 0.9, 'sub'); add(t0 + 10 * step, 'bass', root + (R() < 0.5 ? 7 : 12), step * 4, 0.8, 'sub'); }
        else if (bk === 'tumbao') { for (const s of [3, 6, 11, 14]) add(t0 + s * step, 'bass', root + (s > 8 ? 7 : 0), step * 2.5, 1, 'pick'); }
        else if (bk === 'walk') { const w = [0, 4, 7, 9]; for (let s = 0; s < 16; s += 4) add(t0 + s * step, 'bass', root + w[s / 4], step * 3.5, 1, 'pick'); }
      }
      // chords
      const c = g.chord, power = [root + 12, root + 19, root + 24];
      if (c === 'gtr8') for (let s = 0; s < 16; s += 2) add(t0 + s * step, 'gtr', power, step * 2, loud, kind === 'verse');
      else if (c === 'gtr4') { if (kind === 'verse' && !g.low) { for (let s = 0; s < 16; s += 4) add(t0 + s * step, 'gtr', power, step * 1, 0.6, true); } else { add(t0, 'gtr', power, step * 7.5, loud); add(t0 + 8 * step, 'gtr', power, step * 7.5, loud); } }
      else if (c === 'chug') { for (let s = 0; s < 16; s++) if (g.k[s] === 'x' || (kind === 'chorus' && s % 2 === 0)) add(t0 + s * step, 'gtr', [root + 12, root + 19], step, 1, kind !== 'chorus'); }
      else if (c === 'pad') add(t0, 'pad', ch, step * 16, loud);
      else if (c === 'padpluck') { add(t0, 'pad', ch, step * 16, loud * 0.8); for (let s = 0; s < 16; s += 2) add(t0 + s * step, 'pluck', ch[(s / 2) % ch.length] + 12, step * 2, 0.5); }
      else if (c === 'stabs') { for (const s of [0, 3, 6, 8, 11]) add(t0 + s * step, 'brass', ch, step * 1.2, 0.6); if (kind === 'chorus') add(t0, 'pad', ch, step * 16, 0.6); }
      else if (c === 'offsaw') for (let s = 2; s < 16; s += 4) add(t0 + s * step, 'saw', ch[0] + 12, step * 1.5, loud), add(t0 + s * step, 'saw', ch[2] + 12, step * 1.5, loud * 0.8);
      else if (c === 'keys') { add(t0 + swing(0), 'keys', ch, step * 6, loud); add(t0 + 7 * step + swing(7), 'keys', ch, step * 8, loud * 0.8); }
      else if (c === 'piano') { for (let s = 0; s < 16; s += 4) add(t0 + s * step, 'piano', s === 0 ? ch : [ch[(s / 4) % ch.length] + 12], step * 4, loud); }
      else if (c === 'brass') { for (const s of [0, 3, 6, 10, 12]) add(t0 + s * step, 'brass', ch, step * (s === 12 ? 3 : 1.4), loud); }
      else if (c === 'skank') { for (let s = 2; s < 16; s += 4) add(t0 + s * step, 'gtr', ch, step * 0.6, 0.5, true); if (g.horns && kind === 'chorus' && b % 2 === 0) add(t0, 'brass', ch.map((m) => m + 12), step * 3, 0.9); }
      // lead
      if (kind === 'verse' || kind === 'chorus' || kind === 'bridge' || (g.lead === 'riff' && kind !== 'intro')) {
        if (g.lead === 'riff') {
          const riff = [0, 2, 4, 2, 7, 4, 2, 4, 0, 2, 4, 7, 9, 7, 4, 2];
          if (kind !== 'verse' || b % 2 === 0) for (let s = 0; s < 16; s++) add(t0 + s * step, 'saw', ch[0] + 12 + riff[(s + deg) % 16] % 12, step * 0.9, kind === 'chorus' ? 0.9 : 0.6);
        } else {
          const mot = motifs[kind][b % 2];
          const vox = g.lead === 'vox' || (kind === 'chorus' && !g.novox);
          for (let j = 0; j < mot.length; j++) {
            const [s, p] = mot[j], nxt = j + 1 < mot.length ? mot[j + 1][0] : 16;
            const d = Math.min(nxt - s, 6) * step * 0.95;
            const pp = b === nb - 1 && j === mot.length - 1 ? p - (p % 7 === 0 ? 0 : 1) : p;
            const m = melodyMidi(pp);
            if (vox && !(g.rap && kind === 'verse')) add(t0 + s * step + swing(s), 'vox', m, d, loud, kind === 'chorus' ? titleSyl[sylI++ % titleSyl.length] : SYLS[Math.floor(R() * SYLS.length)]);
            else if (g.rap && kind === 'verse') add(t0 + s * step + swing(s), 'vox', key + 26 + (s % 8 === 0 ? 2 : 0), step * 0.8, 0.8, SYLS[Math.floor(R() * SYLS.length)]);
            else add(t0 + s * step + swing(s), g.lead === 'saw' ? 'saw' : 'pluck', m, d, 0.8);
          }
        }
      }
      time += step * 16;
    }
  }
  add(time, 'crash', 1); add(time, 'kick', 1);
  if (g.chord.startsWith('gtr') || g.chord === 'chug') add(time, 'gtr', [rootOf(0) + 12, rootOf(0) + 19, rootOf(0) + 24], spb * 3, 1);
  else add(time, g.chord === 'piano' ? 'piano' : 'pad', chordOf(0), spb * 3, 1);
  let dur = time + spb * 3.5;
  if (live) { for (let x = 0; x < dur; x += 4) add(x, 'crowd', 4.5, x < 4 || x > dur - 6 ? 3 : 0.6); add(dur, 'crowd', 4, 4); dur += 4; }
  ev.sort((a, b) => a.t - b.t);
  if (track.kind === 'incomplete') { const cut = dur * (track.cut || 0.42); return { ev: ev.filter((e) => e.t < cut), dur: cut, bpm, track, incomplete: true }; }
  return { ev, dur, bpm, track };
}

// ---- the sequencer ----
const MP = {
  song: null, playing: false, offset: 0, t0: 0, idx: 0, sess: null, iv: 0, wall0: 0, onEnd: null,
  load(track) { this.stop(); this.song = compileSong(track); this.offset = 0; return this.song; },
  clock() { return ac() ? AU.ctx.currentTime : performance.now() / 1000; },
  pos() { return this.playing ? clamp(this.clock() - this.t0, 0, this.song ? this.song.dur : 0) : this.offset; },
  play() {
    if (!this.song || this.playing) return;
    const c = ac();
    if (c) {
      unlockAudio();
      this.sess = c.createGain(); this.sess.gain.value = 1;
      let out = this.sess;
      const kb = this.song.track.kbps || 128;
      if (kb < 128) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kb <= 64 ? 3200 : kb <= 96 ? 6000 : 9000; out.connect(lp); out = lp; }
      out.connect(AU.music);
    }
    this.t0 = this.clock() + 0.06 - this.offset;
    this.idx = 0; while (this.idx < this.song.ev.length && this.song.ev[this.idx].t < this.offset) this.idx++;
    this.playing = true;
    clearInterval(this.iv); this.iv = setInterval(() => this.tick(), 40); this.tick();
  },
  tick() {
    if (!this.playing) return;
    const pos = this.pos(), ev = this.song.ev;
    if (this.sess) {
      const lim = this.clock() + 0.3 - this.t0, nowc = this.clock();
      while (this.idx < ev.length && ev[this.idx].t < lim) {
        const e = ev[this.idx++], at = this.t0 + e.t;
        if (at >= nowc - 0.03) try { INST[e.i](Math.max(at, nowc), this.sess, ...e.a); } catch (err) { /* node limit */ }
      }
    }
    if (pos >= this.song.dur - 0.01) { this.kill(); this.playing = false; this.offset = 0; if (this.onEnd) this.onEnd(); }
  },
  kill() {
    clearInterval(this.iv);
    if (this.sess && AU.ctx) { const s = this.sess; s.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.015); setTimeout(() => { try { s.disconnect(); } catch (e) { /* gone */ } }, 400); }
    this.sess = null;
  },
  pause() { if (!this.playing) return; this.offset = this.pos(); this.kill(); this.playing = false; },
  stop() { this.kill(); this.playing = false; this.offset = 0; },
  seek(s) { const was = this.playing; this.kill(); this.playing = false; this.offset = clamp(s, 0, this.song ? this.song.dur - 0.1 : 0); if (was) this.play(); },
  beat() { if (!this.song || !this.playing) return null; const b = this.pos() * this.song.bpm / 60; return { beat: b, phase: b % 1, bpm: this.song.bpm }; },
};
