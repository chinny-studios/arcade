// Tidebound: audio. Everything is synthesized live with WebAudio in a Game Boy / GBA chiptune style:
// two pulse channels (12.5 / 25 / 50% duty), a triangle bass and a noise channel for drums.
// Tracks are note strings per channel, played by a look-ahead scheduler (setInterval, 0.15 s ahead).
// Sound.play(name) fires one-shot effects. Music.play(name) loops a track; 'heal' and 'caught' are jingles.
// Nothing here throws: with no AudioContext, or a locked one, the game is simply silent.

const Sound = {};
const Music = {};

(() => {
  const TAU = Math.PI * 2;
  const LOOK = 0.15;        // seconds scheduled ahead of the audio clock
  const TICK_MS = 25;

  let actx = null;          // created on the first gesture (Sound.unlock, via Audio_unlock)
  let masterG = null, musicOut = null, sfxOut = null, noiseBuf = null;
  const waves = {};         // pulse PeriodicWaves, keyed by duty
  const compiled = {};      // compiled track cache
  const insts = [];         // playing instances: the background track and any jingle
  let timer = null;
  let bgName = null;        // Music.current
  let bg = null;            // background instance; null while a jingle holds it, or while silent
  let jing = null;          // { name, inst, res, p } while a jingle plays

  const opt = (k) => { try { return !G || !G.options || G.options[k] !== false; } catch (_) { return true; } };
  const musicOn = () => opt('music');
  const sfxOn = () => opt('sfx');
  const canPlay = () => !!actx && musicOn();

  // ---------- note and pattern helpers ----------
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(n) {                       // 'C#4', 'Bb3', 'A4' -> Hz (0 when not a note)
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    if (!m) return 0;
    const midi = (+m[3] + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const rep = (x, n) => Array(n).fill(x);
  const times = (arr, k) => [].concat(...Array(k).fill(arr));
  // tile('C4 E4 G4 E4', 2, 2): each token gets length d, the whole sequence repeats n times (one bar string)
  const tile = (seq, d, n) => rep(seq.split(' ').map((x) => x + ':' + d).join(' '), n).join(' ');

  // ---------- tracks ----------
  // A channel is a list of bar strings (bars are concatenated). A token is NOTE or NOTE:steps.
  // Steps are 16ths; the default length is 2 (an eighth). '.' is a rest. Drums: k kick, s snare, h hat, o open hat.
  // Keys: p1 lead pulse (duty d1), p2 harmony pulse (duty d2), tr triangle bass, nz noise drums.
  // Jingles set jingle: true and play once.
  const tiA = ['D5:4 F#5:4 A5:8', 'B5:4 A5:4 G5:4 F#5:4', 'E5:4 D5:4 B4:8', 'A4:4 A4:4 D5:8'];
  const tiB = ['G5:4 A5:4 B5:4 D6:4', 'C#6:6 B5:2 A5:4 G5:4', 'F#5:4 G5:4 A5:4 B5:4', 'A5:8 F#5:4 D5:4'];
  const toA = ['G5:4 B5:2 D6:2 B5:4 G5:4', 'A5:4 G5:2 F#5:2 G5:4 E5:4', 'D5:4 E5:2 G5:2 B5:4 D5:4', 'C5:8 B4:4 G4:4'];
  const toB = ['E5:4 F#5:2 G5:2 A5:4 C6:4', 'B5:6 A5:2 G5:4 A5:4', 'G5:4 E5:4 D5:4 C5:4', 'D5:8 G5:4 G4:4'];
  const roA = ['C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 A5:2 G5:2', 'F5:2 A5:2 C6:2 A5:2 G5:2 F5:2 E5:2 D5:2',
    'E5:2 G5:2 C6:2 E6:2 D6:4 C6:4', 'G5:4 A5:4 G5:2 F5:2 E5:2 D5:2'];
  const caA = ['A4:8 .:8', 'C5:4 .:4 B4:4 .:4', 'E4:8 G4:4 .:4', 'D5:6 .:2 C5:4 .:4'];
  const ciB1 = ['F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 G5:2 F5:2', 'E5:2 G5:2 C6:2 G5:2 D6:2 C6:2 B5:2 A5:2',
    'Bb5:1 C6:1 D6:2 F6:4 E6:4 D6:4', 'C6:4 A5:4 F5:4 .:4'];
  const ciB2 = ['F5:2 A5:2 C6:2 A5:2 G5:2 F5:2 G5:2 A5:2'];
  const laA = ['A4:2 C5:2 .:2 E5:2 G5:2 .:2 A5:2 .:2', 'G5:2 F5:2 E5:2 D5:2 C5:4 B4:4',
    'F#4:2 A4:2 D5:2 F5:2 E5:4 .:4', 'E5:3 D5:1 C5:2 B4:2 A4:4 G4:4'];
  const ceA = ['Bb4:4 D5:4 F5:8', 'Eb5:4 D5:4 C5:8', 'Bb4:6 C5:2 D5:4 F5:4', 'D5:8 C5:4 Bb4:4'];
  const ceB = ['G4:4 Bb4:4 D5:8', 'C5:4 Bb4:4 A4:8', 'F4:4 G4:4 Bb4:4 C5:4', 'Bb4:8 F4:8'];
  const gyA = ['B4:2 B4:2 D5:4 C#5:4 B4:2 A4:2', 'F#4:2 F#4:2 G4:4 F#4:4 E4:2 D4:2',
    'C5:4 .:4 B4:2 A#4:2 B4:4', 'F#5:8 E5:4 D5:4'];
  const baA = ['E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 E5:2', 'F#5:2 A5:2 C6:2 A5:2 G5:2 E5:2 D5:2 B4:2',
    'E5:1 F#5:1 G5:1 A5:1 B5:2 E6:2 D6:4 B5:4', 'C6:4 B5:2 A5:2 G5:4 E5:4'];
  const trA = ['D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 D5:2', 'C5:4 D5:4 F5:4 A5:2 G5:2',
    'Bb4:4 A4:4 G5:2 F5:2 E5:2 D5:2', 'A4:2 D5:2 F5:4 A5:4 G5:2 F5:2'];
  const gbA = ['F#5:1 G5:1 F#5:1 E5:1 D5:2 C#5:2 D5:2 E5:2 F#5:2 A5:2', 'C#6:2 B5:2 A5:2 G#5:2 A5:2 B5:2 C#6:4',
    'E5:4 D#5:4 E5:2 F#5:2 G#5:2 A5:2', 'C#5:8 F#4:4 G#4:4'];
  const rvA = ['A5:3 A5:1 G5:2 A5:2 E5:4 C#5:2 E5:2', 'B5:2 A5:2 G#5:3 .:1 A5:4 E5:4',
    'C#6:3 B5:1 A5:2 G#5:2 A5:4 .:4', 'E5:2 G#5:2 A5:2 B5:2 C#6:4 B5:2 A5:2'];
  const vyA = ['C5:2 E5:2 G5:4 E5:4 G5:4', 'C6:6 G5:2 C6:4 B5:4', 'A5:4 F5:4 G5:4 E5:4', 'F5:2 G5:2 A5:2 B5:2 C6:8'];
  const vtA = ['D5:4 F#5:4 A5:4 D6:4', 'B5:6 A5:2 G5:4 F#5:4', 'E5:4 F#5:4 G5:4 A5:4', 'D5:2 E5:2 F#5:2 A5:2 D6:8'];
  const bA = ['E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 E5:2', 'F#5:2 A5:2 C6:2 A5:2 G5:2 E5:2 D5:2 B4:2',
    'E5:1 F#5:1 G5:1 A5:1 B5:2 E6:2 D6:4 B5:4', 'C6:4 B5:2 A5:2 G5:4 E5:4'];
  const lhA = ['C6:8 B5:4 A5:4', 'F5:6 G5:2 A5:4 B5:4', 'E5:8 D5:4 C5:4', 'B4:4 A4:4 F4:8'];
  const evA = [tile('E6 G#6 B6 G#6', 1, 4), tile('B5 D#6 F#6 D#6', 1, 4), tile('A5 C#6 E6 C#6', 1, 4)];
  const enA = ['G5:4 B5:4 D6:8', 'C6:4 B5:4 A5:4 G5:4', 'E5:4 G5:4 A5:4 B5:4', 'D6:8 B5:4 G5:4',
    'A5:4 G5:4 F#5:4 E5:4', 'D5:8 E5:4 G5:4', 'C6:8 B5:4 A5:4'];

  const TRACKS = {
    title: {
      bpm: 92, d1: 0.5, d2: 0.25,
      p1: [...tiA, ...tiB, ...tiA, ...tiB.slice(0, 3), 'D5:16'],
      p2: times([tile('D4 F#4 A4 D5', 2, 2), tile('E4 A4 C#5 A4', 2, 2), tile('B3 D4 F#4 D4', 2, 2), tile('G3 B3 D4 B3', 2, 2)], 4),
      tr: times([tile('D2 D3', 4, 2), tile('A1 A2', 4, 2), tile('B1 B2', 4, 2), tile('G1 G2', 4, 2)], 4),
      nz: rep('k:8 .:4 h:4', 16),
    },
    town: {
      bpm: 100, d1: 0.5, d2: 0.25,
      p1: [...toA, ...toB, ...toA, ...toB.slice(0, 3), 'G5:16'],
      p2: times([tile('G4 B4 D5 B4', 2, 2), tile('E4 G4 B4 G4', 2, 2), tile('C4 E4 G4 E4', 2, 2), tile('D4 F#4 A4 F#4', 2, 2)], 4),
      tr: times([tile('G2 G3', 4, 2), tile('E2 E3', 4, 2), tile('C2 C3', 4, 2), tile('D2 D3', 4, 2)], 4),
      nz: rep('k:8 h:4 h:4', 16),
    },
    route: {
      bpm: 138, d1: 0.5, d2: 0.25,
      p1: [...roA, ...roA, ...roA, roA[0], roA[1], roA[2], 'C6:16'],
      p2: times([tile('C4 E4 G4 E4', 2, 2), tile('F4 A4 C5 A4', 2, 2), tile('G3 B3 D4 B3', 2, 2), tile('A3 C4 E4 C4', 2, 2)], 4),
      tr: times([tile('C2 C3', 2, 4), tile('F2 F3', 2, 4), tile('G2 G3', 2, 4), tile('A2 A3', 2, 4)], 4),
      nz: rep('k:4 h:4 s:4 h:4', 16),
    },
    cave: {
      bpm: 80, d1: 0.125, d2: 0.125,
      p1: times(caA, 4),
      p2: times(['A3:16', 'F3:16', 'C4:16', 'E4:16'], 4),
      tr: times(['A2:8 E2:8', 'F2:8 C3:8', 'C3:8 G2:8', 'E2:8 B2:8'], 4),
      nz: times(['k:8 .:8', '.:8 k:4 .:4', 'k:8 .:8', '.:4 k:4 o:8'], 4),
    },
    city: {
      bpm: 128, d1: 0.5, d2: 0.25,
      p1: [ciB1[0], ciB1[1], ciB1[2], ciB1[3], ciB1[0], ciB2[0], ciB1[2], ciB1[3],
        ciB1[0], ciB1[1], ciB1[2], ciB1[3], ciB1[0], ciB2[0], ciB1[2], ciB1[3]],
      p2: times([tile('F4 A4 C5 A4', 2, 2), tile('D4 F4 A4 F4', 2, 2), tile('Bb3 D4 F4 D4', 2, 2), tile('C4 E4 G4 E4', 2, 2)], 4),
      tr: times([tile('F2 F3', 2, 4), tile('D2 D3', 2, 4), tile('Bb1 Bb2', 2, 4), tile('C2 C3', 2, 4)], 4),
      nz: rep('k:2 h:2 s:2 h:2 k:2 h:2 s:2 h:2', 16),
    },
    lab: {
      bpm: 110, d1: 0.125, d2: 0.25,
      p1: times(laA, 4),
      p2: times(['A3:4 .:4 E4:4 .:4', 'D3:4 .:4 A3:4 .:4', 'F3:4 .:4 C4:4 .:4', 'E3:4 .:4 B3:4 .:4'], 4),
      tr: times(['A2:4 E2:4 A2:4 E2:4', 'D2:4 A2:4 D2:4 A2:4', 'F2:4 C3:4 F2:4 C3:4', 'E2:4 B2:4 E2:4 B2:4'], 4),
      nz: rep('k:4 h:2 h:2 s:4 h:4', 16),
    },
    center: {
      bpm: 84, d1: 0.5, d2: 0.25,
      p1: [...ceA, ...ceB, ...ceA, ...ceB],
      p2: times(['Bb3:8 D4:8', 'G3:8 Bb3:8', 'Eb3:8 G3:8', 'F3:8 A3:8'], 4),
      tr: times(['Bb2:16', 'G2:16', 'Eb2:16', 'F2:16'], 4),
      nz: rep('k:8 h:8', 16),
    },
    gym: {
      bpm: 120, d1: 0.5, d2: 0.25,
      p1: times(gyA, 4),
      p2: times([tile('B3 F#3', 2, 4), tile('G3 D4', 2, 4), tile('E3 B3', 2, 4), tile('F#3 C#4', 2, 4)], 4),
      tr: times(['B1:8 B2:8', 'G1:8 G2:8', 'E1:8 E2:8', 'F#1:8 F#2:8'], 4),
      nz: rep('k:4 s:4 k:4 s:4', 16),
    },
    battle: {
      bpm: 168, d1: 0.5, d2: 0.25,
      p1: [bA[0], bA[1], bA[2], bA[3], bA[0], bA[1], bA[2], bA[3], bA[0], bA[1], bA[2], bA[3], bA[0], bA[1], bA[2], 'E5:16'],
      p2: times([tile('E4 E5', 2, 4), tile('C4 C5', 2, 4), tile('D4 D5', 2, 4), tile('B3 B4', 2, 4)], 4),
      tr: times([tile('E2', 2, 8), tile('C2', 2, 8), tile('D2', 2, 8), tile('B1', 2, 8)], 4),
      nz: rep('k:2 h:2 s:2 h:2 k:2 h:2 s:2 h:2', 16),
    },
    trainer: {
      bpm: 144, d1: 0.5, d2: 0.25,
      p1: times(trA, 4),
      p2: times([tile('D4 F4 A4 F4', 4, 1), tile('Bb3 D4 F4 D4', 4, 1), tile('C4 E4 G4 E4', 4, 1), tile('A3 C#4 E4 C#4', 4, 1)], 4),
      tr: times([tile('D2', 4, 4), tile('Bb1', 4, 4), tile('C2', 4, 4), tile('A1', 4, 4)], 4),
      nz: rep('k:4 h:4 s:4 h:4', 16),
    },
    gymbattle: {
      bpm: 160, d1: 0.5, d2: 0.25,
      p1: times(gbA, 4),
      p2: times([tile('F#4 A4 C#5 A4', 1, 4), tile('D4 F#4 A4 F#4', 1, 4), tile('A3 C#4 E4 C#4', 1, 4), tile('C#4 E4 G#4 E4', 1, 4)], 4),
      tr: times([tile('F#2 F#3', 2, 4), tile('D2 D3', 2, 4), tile('A1 A2', 2, 4), tile('C#2 C#3', 2, 4)], 4),
      nz: rep('k:2 h:2 s:2 h:2 k:2 h:2 s:2 o:2', 16),
    },
    rival: {
      bpm: 120, d1: 0.25, d2: 0.25,
      p1: times(rvA, 4),
      p2: times([tile('. A4', 2, 4), tile('. E4', 2, 4), tile('. D4', 2, 4), tile('. E4', 2, 4)], 4),
      tr: times(['A2:4 A2:4 E2:4 A2:4', 'E2:4 E2:4 B2:4 E2:4', 'D2:4 D2:4 A2:4 D2:4', 'E2:4 E2:4 B2:4 E2:4'], 4),
      nz: rep('k:3 h:1 s:2 k:2 s:4 h:2 h:2', 16),
    },
    victory: {
      bpm: 140, d1: 0.5, d2: 0.25,
      p1: times(vyA, 4),
      p2: times(['E4:4 G4:4 C5:4 G4:4', 'B3:4 D4:4 G4:4 D4:4', 'C4:4 E4:4 A4:4 E4:4', 'A3:4 C4:4 F4:4 C4:4'], 4),
      tr: times(['C3:8 G2:8', 'G2:8 D3:8', 'A2:8 E3:8', 'F2:8 C3:8'], 4),
      nz: rep('k:4 h:4 s:4 h:4', 16),
    },
    victoryTrainer: {
      bpm: 130, d1: 0.5, d2: 0.25,
      p1: times(vtA, 4),
      p2: times([tile('D4 F#4 A4 F#4', 4, 1), tile('G3 B3 D4 B3', 4, 1), tile('A3 C#4 E4 C#4', 4, 1), tile('D4 F#4 A4 F#4', 4, 1)], 4),
      tr: times([tile('D2', 4, 4), tile('G1', 4, 4), tile('A1', 4, 4), tile('D2', 4, 4)], 4),
      nz: rep('k:4 h:4 s:4 h:4', 16),
    },
    evolve: {
      bpm: 100, d1: 0.125, d2: 0.125,
      p1: [evA[0], evA[1], evA[2], 'E6:8 B6:8', evA[0], evA[1], evA[2], 'E6:8 B6:8',
        evA[0], evA[1], evA[2], 'E6:8 B6:8', evA[0], evA[1], evA[2], 'E6:8 B6:8'],
      p2: times([tile('E5 G#5 B5 G#5', 2, 2), tile('B4 D#5 F#5 D#5', 2, 2), tile('C#5 E5 G#5 E5', 2, 2), tile('A4 C#5 E5 C#5', 2, 2)], 4),
      tr: times(['E2:16', 'B1:16', 'C#2:16', 'A1:16'], 4),
      nz: rep('h:4 .:4 h:4 .:4', 16),
    },
    lighthouse: {
      bpm: 76, d1: 0.5, d2: 0.125,
      p1: times(lhA, 4),
      p2: times(['F4:8 A4:8', 'C4:8 E4:8', 'D4:8 F4:8', 'Bb3:8 D4:8'], 4),
      tr: times(['F2:16', 'C2:16', 'D2:16', 'Bb1:16'], 4),
      nz: rep('o:8 .:8', 16),
    },
    ending: {
      bpm: 104, d1: 0.5, d2: 0.25,
      p1: [...enA, 'G5:16', ...enA, 'G5:16'],
      p2: times([tile('G4 B4 D5 B4', 2, 2), tile('E4 G4 B4 G4', 2, 2), tile('C4 E4 G4 E4', 2, 2), tile('D4 F#4 A4 F#4', 2, 2)], 4),
      tr: times([tile('G2 G3', 4, 2), tile('E2 E3', 4, 2), tile('C2 C3', 4, 2), tile('D2 D3', 4, 2)], 4),
      nz: rep('k:8 h:4 h:4', 16),
    },
    heal: {
      jingle: true, bpm: 128, d1: 0.5, d2: 0.25,
      p1: ['C5:2 E5:2 G5:2 C6:2 E6:2 G6:2 C7:4'],
      p2: ['E4:4 G4:4 C5:4 E5:4'],
      tr: ['C3:8 G2:8'],
    },
    caught: {
      jingle: true, bpm: 128, d1: 0.5, d2: 0.25,
      p1: ['G4:2 C5:2 E5:2 G5:2 C6:4 E6:2 G6:4 E6:2 C6:4'],
      p2: ['C5:4 E5:4 G5:4 C6:4 G5:4 E5:4'],
      tr: ['C3:6 G2:6 C3:6 G2:6'],
      nz: ['k:6 h:6 s:6 h:6'],
    },
  };

  // channel specs: which track key, how it sounds
  const CHANS = [
    { key: 'p1', kind: 'pulse', duty: 'd1', vol: 0.3 },
    { key: 'p2', kind: 'pulse', duty: 'd2', vol: 0.2 },
    { key: 'tr', kind: 'tri', vol: 0.45 },
    { key: 'nz', kind: 'nz', vol: 0.35 },
  ];

  function compile(name) {
    if (compiled[name]) return compiled[name];
    const def = TRACKS[name];
    if (!def) return null;
    const stepDur = 60 / def.bpm / 4;
    const chans = [];
    let len = 0;
    for (const spec of CHANS) {
      const bars = def[spec.key];
      if (!bars) continue;
      const ev = [];        // ev[step] = note starting on that step
      let pos = 0;
      for (const bar of [].concat(bars)) {
        for (const tok of bar.split(/\s+/)) {
          if (!tok) continue;
          const parts = tok.split(':');
          const n = parts[0];
          const dur = parts[1] ? +parts[1] : 2;
          if (n !== '.') {
            if (spec.kind === 'nz') ev[pos] = { k: n, d: dur };
            else { const f = hz(n); if (f) ev[pos] = { f, d: dur }; }
          }
          pos += dur;
        }
      }
      len = Math.max(len, pos);
      chans.push({ spec, ev, duty: spec.duty ? def[spec.duty] : 0.5 });
    }
    return (compiled[name] = { stepDur, len, chans, jingle: !!def.jingle });
  }

  // ---------- synthesis ----------
  function pulseWave(duty) {
    const key = String(duty);
    if (!waves[key]) {
      // Fourier series of a pulse that is high for `duty` of the cycle (DC removed)
      const N = 48, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) {
        re[n] = 2 * Math.sin(TAU * n * duty) / (n * Math.PI);
        im[n] = 2 * (1 - Math.cos(TAU * n * duty)) / (n * Math.PI);
      }
      waves[key] = actx.createPeriodicWave(re, im);
    }
    return waves[key];
  }

  function getNoise() {
    if (!noiseBuf) {
      const len = actx.sampleRate;
      noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  // one oscillator with a short envelope; type 'triangle' or a pulse with the given duty
  function voice(type, duty, f, t, dur, vol, dest) {
    const o = actx.createOscillator();
    if (type) o.type = type; else o.setPeriodicWave(pulseWave(duty));
    o.frequency.setValueAtTime(f, t);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // a pitch sweep (or a fixed tone when f1 equals f0)
  function tone(type, duty, t, f0, f1, dur, vol) {
    const o = actx.createOscillator();
    if (type) o.type = type; else o.setPeriodicWave(pulseWave(duty));
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = actx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxOut);
    o.start(t); o.stop(t + dur + 0.03);
  }
  const blip = (t, f0, f1, dur, duty, vol) => tone(null, duty, t, f0, f1, dur, vol);

  // filtered white noise, optional filter sweep
  function hiss(t, dur, vol, type, f0, f1, dest, q) {
    const src = actx.createBufferSource();
    src.buffer = getNoise();
    const flt = actx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f0, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    flt.Q.value = q || 0.8;
    const g = actx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(dest || sfxOut);
    src.start(t, Math.random() * 0.8);
    src.stop(t + dur + 0.03);
  }

  function drum(k, t, vol, dest) {
    if (k === 'k') {
      const o = actx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      const g = actx.createGain();
      g.gain.setValueAtTime(vol * 1.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 0.18);
    } else if (k === 's') {
      hiss(t, 0.14, vol, 'bandpass', 1800, null, dest, 1.2);
    } else if (k === 'h') {
      hiss(t, 0.04, vol * 0.7, 'highpass', 7000, null, dest, 0.7);
    } else if (k === 'o') {
      hiss(t, 0.2, vol * 0.6, 'highpass', 6000, null, dest, 0.7);
    }
  }

  // arpeggio of notes (names), each `step` long, the last one `tail` long
  function arp(t, notes, step, duty, vol, tail) {
    notes.forEach((n, i) => {
      const f = hz(n);
      const last = i === notes.length - 1;
      blip(t + i * step, f, f, last ? tail : step * 1.1, duty, vol);
    });
  }

  // ---------- scheduler ----------
  function playStep(it, pos, t) {
    for (const ch of it.c.chans) {
      const e = ch.ev[pos];
      if (!e) continue;
      const dur = e.d * it.c.stepDur;
      if (ch.spec.kind === 'nz') drum(e.k, t, ch.spec.vol, it.bus);
      else voice(ch.spec.kind === 'tri' ? 'triangle' : null, ch.duty, e.f, t, dur * 0.9, ch.spec.vol, it.bus);
    }
  }

  function tick() {
    if (!actx) return;
    const now = actx.currentTime;
    for (let i = insts.length - 1; i >= 0; i--) {
      const it = insts[i];
      if (it.next < now) it.next = now + 0.02;   // woke up late: do not burst the backlog
      while (!it.done && it.next < now + LOOK) {
        if (it.pos >= it.c.len) {
          if (!it.loop) { it.done = true; break; }
          it.pos = 0;
        }
        playStep(it, it.pos, it.next);
        it.next += it.c.stepDur;
        it.pos++;
      }
      if (it.done) {
        insts.splice(i, 1);
        const b = it.bus;
        setTimeout(() => { try { b.disconnect(); } catch (_) {} }, 1500);
      }
    }
    if (!insts.length && timer) { clearInterval(timer); timer = null; }
  }

  function startInst(name, loop, fade) {
    const c = compile(name);
    if (!c || !c.len || !actx) return null;
    const now = actx.currentTime;
    const bus = actx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + Math.max(0.005, fade));
    bus.connect(musicOut);
    const it = { c, loop, bus, pos: 0, next: now + 0.05, done: false, dead: false };
    insts.push(it);
    if (!timer) timer = setInterval(tick, TICK_MS);
    tick();
    return it;
  }

  function stopInst(it, fade) {
    if (!it || it.dead) return;
    it.dead = true;
    const i = insts.indexOf(it);
    if (i >= 0) insts.splice(i, 1);
    const now = actx.currentTime;
    it.bus.gain.cancelScheduledValues(now);
    it.bus.gain.setValueAtTime(it.bus.gain.value, now);
    it.bus.gain.linearRampToValueAtTime(0, now + Math.max(0.005, fade));
    setTimeout(() => { try { it.bus.disconnect(); } catch (_) {} }, (fade + 0.3) * 1000);
  }

  function startBg(name, fade) {
    if (canPlay()) bg = startInst(name, true, fade);
  }

  function endJingle(resume, fade) {
    const j = jing;
    if (!j) return;
    jing = null;
    stopInst(j.inst, fade);
    j.res();
    if (resume && bgName && !bg) startBg(bgName, 0.4);
  }

  // ---------- one-shot effects ----------
  const SFX = {
    select: (t) => blip(t, 988, 1319, 0.05, 0.5, 0.2),
    cancel: (t) => blip(t, 740, 330, 0.09, 0.5, 0.2),
    bump: (t) => { blip(t, 220, 90, 0.09, 0.5, 0.32); hiss(t, 0.05, 0.14, 'lowpass', 600, null, null, 0.7); },
    door: (t) => { blip(t, 500, 720, 0.07, 0.25, 0.22); blip(t + 0.08, 720, 480, 0.09, 0.25, 0.2); },
    stairs: (t) => arp(t, ['C5', 'E5', 'G5', 'C6'], 0.055, 0.25, 0.22, 0.09),
    hit: (t) => { hiss(t, 0.16, 0.4, 'lowpass', 1400, 300, null, 0.7); blip(t, 320, 90, 0.17, 0.5, 0.3); },
    hitweak: (t) => { hiss(t, 0.09, 0.22, 'lowpass', 1000, 400, null, 0.7); blip(t, 260, 150, 0.1, 0.5, 0.18); },
    hitsuper: (t) => {
      hiss(t, 0.2, 0.45, 'bandpass', 1500, 400, null, 1.2);
      blip(t, 440, 110, 0.22, 0.125, 0.32);
      blip(t + 0.12, 300, 80, 0.2, 0.5, 0.26);
    },
    faint: (t) => tone('triangle', 0.5, t, 380, 60, 0.7, 0.5),
    levelup: (t) => arp(t, ['C5', 'E5', 'G5', 'C6', 'E6'], 0.09, 0.5, 0.22, 0.3),
    heal: (t) => arp(t, ['G5', 'B5', 'D6', 'G6'], 0.07, 0.125, 0.2, 0.2),
    ball: (t) => { blip(t, 1200, 420, 0.06, 0.5, 0.24); blip(t + 0.06, 700, 1500, 0.06, 0.25, 0.18); },
    throw: (t) => { blip(t, 260, 900, 0.2, 0.5, 0.14); hiss(t, 0.26, 0.22, 'bandpass', 700, 3000, null, 1.2); },
    shake: (t) => { blip(t, 1500, 1500, 0.03, 0.5, 0.22); blip(t + 0.28, 1500, 1500, 0.03, 0.5, 0.22); blip(t + 0.56, 1700, 1700, 0.05, 0.5, 0.24); },
    caught: (t) => arp(t, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.07, 0.5, 0.2, 0.25),
    evolve: (t) => {
      blip(t, 300, 1800, 0.9, 0.125, 0.16);
      tone('triangle', 0.5, t, 200, 900, 0.9, 0.3);
    },
    save: (t) => { blip(t, 660, 660, 0.08, 0.5, 0.2); blip(t + 0.1, 990, 990, 0.14, 0.5, 0.2); },
    item: (t) => arp(t, ['E5', 'A5', 'E6'], 0.06, 0.25, 0.2, 0.1),
    keyitem: (t) => arp(t, ['C5', 'E5', 'G5', 'E5', 'C6'], 0.1, 0.25, 0.22, 0.2),
    money: (t) => { blip(t, 988, 988, 0.07, 0.5, 0.2); blip(t + 0.07, 1319, 1319, 0.2, 0.5, 0.2); },
    encounter: (t) => { for (let i = 0; i < 6; i++) blip(t + i * 0.09, 300, 1200, 0.08, 0.125, 0.2); },
    ledge: (t) => blip(t, 380, 820, 0.12, 0.5, 0.22),
    chop: (t) => { hiss(t, 0.08, 0.4, 'highpass', 1800, null, null, 0.7); blip(t, 230, 110, 0.09, 0.125, 0.25); },
    smash: (t) => { hiss(t, 0.36, 0.55, 'lowpass', 900, 200, null, 0.7); blip(t, 180, 40, 0.36, 0.5, 0.4); },
    denied: (t) => { blip(t, 170, 140, 0.12, 0.5, 0.26); blip(t + 0.16, 170, 140, 0.12, 0.5, 0.26); },
    statup: (t) => arp(t, ['C5', 'E5', 'G5'], 0.09, 0.5, 0.2, 0.14),
    statdown: (t) => arp(t, ['G5', 'E5', 'C5'], 0.09, 0.5, 0.2, 0.14),
    flee: (t) => blip(t, 1400, 280, 0.24, 0.125, 0.18),
    lowhp: (t) => blip(t, 1000, 1000, 0.06, 0.25, 0.12),
  };

  // ---------- public API ----------
  Object.assign(Sound, {
    play(name) {
      try {
        if (!actx || !sfxOn()) return;
        const fn = SFX[name];
        if (fn) fn(actx.currentTime + 0.01);
      } catch (_) {}
    },
    // called on the first gesture: creates the AudioContext and starts any pending background track
    unlock() {
      try {
        if (!actx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          actx = new AC();
          const comp = actx.createDynamicsCompressor();
          comp.threshold.value = -14;
          comp.knee.value = 8;
          comp.ratio.value = 4;
          comp.attack.value = 0.003;
          comp.release.value = 0.25;
          masterG = actx.createGain();
          masterG.gain.value = 0.3;
          masterG.connect(comp);
          comp.connect(actx.destination);
          musicOut = actx.createGain();
          musicOut.gain.value = 0.8;
          musicOut.connect(masterG);
          sfxOut = actx.createGain();
          sfxOut.gain.value = 0.9;
          sfxOut.connect(masterG);
        }
        if (actx.state !== 'running' && actx.resume) actx.resume().catch(() => {});
        if (!bg && !jing && bgName) startBg(bgName, 0.4);
      } catch (_) {}
    },
  });

  Object.defineProperty(Music, 'current', { get() { return bgName; }, enumerable: true });
  Object.assign(Music, {
    play(name) {
      try {
        if (!TRACKS[name]) return;
        if (TRACKS[name].jingle) return Music.jingle(name);
        if (jing) endJingle(false, 0.1);
        if (name === bgName && bg) return;
        bgName = name;
        if (bg) { stopInst(bg, 0.4); bg = null; }
        startBg(name, 0.4);
      } catch (_) {}
    },

    // plays a short jingle over the background track, which resumes afterwards. Resolves when done.
    jingle(name) {
      const def = TRACKS[name];
      if (!def || !def.jingle) return Promise.resolve();
      try {
        if (jing) endJingle(false, 0.1);
        if (bg) { stopInst(bg, 0.05); bg = null; }
        const j = { name, inst: null, res: null, p: null };
        j.p = new Promise((r) => { j.res = r; });
        jing = j;
        if (canPlay()) j.inst = startInst(name, false, 0.01);
        const c = compile(name);
        const secs = c ? c.len * c.stepDur + 0.1 : 1;
        wait(secs).then(() => { if (jing === j) endJingle(true, 0.05); });
        return j.p;
      } catch (_) {
        return Promise.resolve();
      }
    },

    stop() {
      try {
        if (jing) endJingle(false, 0.3);
        bgName = null;
        if (bg) { stopInst(bg, 0.4); bg = null; }
      } catch (_) {}
    },

    // call after G.options.music changes: stops or restarts the music to match
    refresh() {
      try {
        if (!actx) return;
        if (!musicOn()) {
          if (bg) { stopInst(bg, 0.2); bg = null; }
          if (jing && jing.inst) { stopInst(jing.inst, 0.1); jing.inst = null; }
          return;
        }
        if (!bg && !jing && bgName) startBg(bgName, 0.4);
      } catch (_) {}
    },

    _tracks: TRACKS,   // for tests: the raw note data
  });
})();

DBG.music = Music;
DBG.sound = Sound;

// The real unlock: the first key, pointer or touch creates the AudioContext (see Input in 01_core.js).
Audio_unlock = () => Sound.unlock();
