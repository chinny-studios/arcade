// Copter City — the cockpit radio: three stations of procedurally generated 90s-style music, scheduled a little
// ahead on the audio clock. Every few minutes a station starts a new song with a new seed, key and title.
// R cycles stations (off, rock, smooth, dance).

const STATIONS = [
  { id: 'off', name: 'Radio off' },
  { id: 'rock', name: 'KRTR 98.1 Rotor Rock', bpm: 132 },
  { id: 'smooth', name: 'WAVE 103.5 Smooth Sky', bpm: 92 },
  { id: 'dance', name: 'PULSE 92.7 Hi-NRG', bpm: 126 },
];
const SONG_A = ['Night', 'Highway', 'Neon', 'Chrome', 'Rotor', 'Skyline', 'Midnight', 'Thunder', 'Velvet', 'Electric', 'Summer', 'Downtown', 'Heartbeat', 'Satellite', 'Turbo'];
const SONG_B = ['Patrol', 'Dreams', 'Heat', 'Rain', 'Hover', 'Motion', 'Lights', 'Fever', 'Avenue', 'Romance', 'Overdrive', 'Signal', 'Sunset', 'Groove', 'Rescue'];
const ARTISTS = ['The Downdrafts', 'Tailrotor', 'Collective Pitch', 'DJ Autorotate', 'Skids', 'Marla & The Mayday', 'Big Bucket', 'Vertical Lift', 'The Hover Kids', 'Searchlight', 'Rooftop Romeos'];

const MUSIC = (() => {
  let ctx = null, out = null, radio = null, next = 0, step = 0, song = null, dist = null;
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function attach(c, bus) {
    ctx = c;
    // a radio speaker: band-limited and a touch overdriven
    radio = ctx.createBiquadFilter(); radio.type = 'bandpass'; radio.frequency.value = 1400; radio.Q.value = 0.35;
    out = ctx.createGain(); out.gain.value = 0.55; out.connect(radio); radio.connect(bus);
    dist = ctx.createWaveShaper(); const k = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; k[i] = Math.tanh(x * 4); } dist.curve = k; dist.connect(out);
  }
  function newSong() {
    const st = STATIONS[OPTS.station];
    const r = RNG(Math.floor(Math.random() * 1e9));
    const key = r.int(40, 47);
    const progs = { rock: [[0, 7, 9, 5], [0, 5, 7, 5], [9, 5, 0, 7], [0, 10, 5, 0]], smooth: [[2, 7, 0, 0], [9, 2, 7, 0], [5, 4, 9, 2]], dance: [[9, 5, 0, 7], [0, 7, 9, 5], [9, 7, 5, 7]] };
    song = { st: st.id, bpm: st.bpm + r.int(-6, 6), key, prog: r.pick(progs[st.id]), seed: r, bars: 0, len: r.int(24, 40), title: `"${r.pick(SONG_A)} ${r.pick(SONG_B)}" by ${r.pick(ARTISTS)}`, mel: [], fill: r.int(0, 3) };
    // a melody motif reused through the song
    const scale = st.id === 'smooth' ? [0, 2, 3, 5, 7, 9, 10] : [0, 2, 4, 7, 9];
    for (let i = 0; i < 16; i++) song.mel.push(r.chance(st.id === 'dance' ? 0.6 : 0.45) ? scale[r.int(0, scale.length - 1)] + (r.chance(0.2) ? 12 : 0) : null);
    HUD.nowPlaying(st.name, song.title);
  }
  function setStation(i) {
    OPTS.station = i; saveOpts();
    song = null; step = 0;
    if (ctx) next = ctx.currentTime + 0.1;
    if (i === 0) HUD.nowPlaying('Radio off', ''); else newSong();
  }
  // ---------- instruments ----------
  function env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, f, t, dur, v, dest = out, detune = 0, cut = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    let n = o; if (cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, cut * 0.25), t + dur); o.connect(fl); n = fl; }
    n.connect(g); g.connect(dest); env(g, t, 0.005, dur, v); o.start(t); o.stop(t + dur + 0.1);
  }
  let nb = null;
  function hit(t, dur, f, v, type = 'highpass') {
    if (!nb) { nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; fl.type = type; fl.frequency.value = f;
    s.connect(fl); fl.connect(g); g.connect(out); env(g, t, 0.002, dur, v); s.start(t); s.stop(t + dur + 0.05);
  }
  function kick(t, v = 0.7) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g); g.connect(out); env(g, t, 0.002, 0.25, v); o.start(t); o.stop(t + 0.3); }
  function snare(t, v = 0.35) { hit(t, 0.16, 1200, v, 'bandpass'); osc('triangle', 190, t, 0.08, v * 0.5); }
  function hat(t, v = 0.12, open) { hit(t, open ? 0.18 : 0.04, 7000, v); }
  function chordNotes(root, kind) { const k = { maj: [0, 4, 7], min: [0, 3, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], d7: [0, 4, 7, 10], pow: [0, 7, 12] }[kind]; return k.map((i) => root + i); }
  // ---------- one sixteenth note of each style ----------
  function play16(t, s16) {
    const sg = song, r = sg.seed, sp = 60 / sg.bpm / 4;
    const bar = Math.floor(s16 / 16), b16 = s16 % 16, ci = bar % sg.prog.length;
    const deg = sg.prog[ci], root = sg.key + deg;
    const minor = [9, 2, 4].includes(deg);
    if (sg.st === 'rock') {
      if (b16 === 0 || b16 === 8 || (b16 === 10 && sg.fill === 1) || (b16 === 6 && sg.fill === 2)) kick(t, 0.75);
      if (b16 === 4 || b16 === 12) snare(t, 0.42);
      if (b16 % 2 === 0) hat(t, 0.08);
      if (bar % 8 === 7 && b16 >= 12) snare(t, 0.25);
      if (b16 % 2 === 0) osc('sawtooth', NOTE(root - 12), t, sp * 1.6, 0.16, out, 0, 900);
      // palm-muted power chords on eighths, open on the downbeat
      if (b16 % 2 === 0) for (const n of chordNotes(root, 'pow')) { osc('sawtooth', NOTE(n), t, b16 === 0 ? sp * 7 : sp * 1.2, b16 === 0 ? 0.05 : 0.035, dist, rr(-8, 8), 2800); }
      const m = sg.mel[b16]; if (m !== null && bar % 4 >= 2) osc('square', NOTE(sg.key + 12 + m), t, sp * 2, 0.04, dist, 0, 3000);
    } else if (sg.st === 'smooth') {
      if (b16 === 0 || (b16 === 10 && r.chance(0.5))) kick(t, 0.35);
      if (b16 === 4 || b16 === 12) hit(t, 0.12, 2500, 0.08, 'bandpass');
      if (b16 % 4 === 2 || b16 % 4 === 0) hat(t, b16 % 4 === 2 ? 0.07 : 0.04);
      if (b16 % 4 === 0) { const walk = [0, 4, 7, 9][b16 / 4]; osc('triangle', NOTE(root - 12 + walk), t, sp * 3.6, 0.22); }
      if (b16 === 0 || b16 === 7) for (const n of chordNotes(root, minor ? 'm7' : deg === 7 ? 'd7' : 'M7')) { osc('sine', NOTE(n + 12), t, sp * 9, 0.05); osc('sine', NOTE(n + 24), t, sp * 3, 0.012); }
      const m = sg.mel[(b16 + bar * 3) % 16]; if (m !== null && bar % 8 >= 4 && b16 % 2 === 0) { osc('square', NOTE(sg.key + 12 + m), t, sp * 2.6, 0.03, out, Math.sin(t * 30) * 12, 1800); }
    } else {
      if (b16 % 4 === 0) kick(t, 0.7);
      if (b16 % 4 === 2) hat(t, 0.14, true);
      if (b16 === 4 || b16 === 12) hit(t, 0.12, 1500, 0.25, 'bandpass');
      osc('sawtooth', NOTE(root - 24 + (b16 % 2 ? 12 : 0)), t, sp * 0.9, 0.12, out, 0, 1200);
      const ch = chordNotes(root, minor ? 'min' : 'maj');
      osc('square', NOTE(ch[b16 % 3] + 24), t, sp * 0.8, 0.03, out, 0, 4000);
      if (b16 === 0) for (const n of ch) osc('sawtooth', NOTE(n + 12), t, sp * 15, 0.02, out, rr(-10, 10), 1800);
      const m = sg.mel[b16]; if (m !== null && bar % 8 >= 4) osc('triangle', NOTE(sg.key + 24 + m), t, sp * 1.5, 0.06);
    }
    if (b16 === 15) { sg.bars++; if (sg.bars >= sg.len) { song = null; } }
  }
  function update() {
    if (!ctx || OPTS.station === 0 || document.body.dataset.state !== 'play') return;
    if (!song) { newSong(); next = Math.max(next, ctx.currentTime + 1.2); step = 0; }
    const sp = 60 / song.bpm / 4;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.25) { if (!song) break; try { play16(next, step); } catch (e) { /* */ } step++; next += sp; }
  }
  return { attach, update, setStation, cycle() { setStation((OPTS.station + 1) % STATIONS.length); }, get song() { return song; } };
})();
