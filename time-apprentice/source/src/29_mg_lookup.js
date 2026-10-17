// Minigame "lookup": an alarm code flashes; find it on the list and read what it means.
// params: { codes: [['1202', 'meaning'], ...], alarms: ['1202', '1201'], sheet: 'title' }

Minigames.add('lookup', {
  title: 'What does the alarm mean?',
  how: 'Find the code that is flashing on the computer, and tap it on the list.',
  init(g, p) {
    g.rows = shuffle(p.codes.slice(), mulberry32(5)).sort((a, b) => a[0].localeCompare(b[0]));
    g.a = 0; g.sel = 0; g.found = null; g.foundT = 0; g.blink = 0;
  },
  pick(g, i) {
    const want = g.p.alarms[g.a], r = g.rows[i]; if (!r || g.found) return;
    if (r[0] === want) { AU.ui('ok'); g.found = r; g.foundT = 0; }
    else { AU.ui('bad'); g.tip(`That's ${r[0]}. The computer is showing *${want}*. Look again!`); }
  },
  update(g, dt) {
    g.blink += dt;
    if (Math.floor(g.blink * 2.5) % 2 === 0 && Math.floor((g.blink - dt) * 2.5) % 2 === 1 && !g.found) AU.ui('alarm');
    if (g.found) {
      g.foundT += dt;
      if (g.foundT > 3.2) { g.a++; g.found = null; if (g.a >= g.p.alarms.length) g.win(g.p.winText); }
      return;
    }
    const n = g.rows.length;
    if (Input.hit('ArrowDown') || Input.hit('KeyS')) g.sel = (g.sel + 1) % n;
    if (Input.hit('ArrowUp') || Input.hit('KeyW')) g.sel = (g.sel + n - 1) % n;
    if (Input.hit('KeyE') || Input.hit('Space') || Input.hit('Enter')) this.pick(g, g.sel);
  },
  tap(g, x, y) { if (x > 400 && x < 920) { const i = Math.floor((y - 90) / 38); if (i >= 0 && i < g.rows.length) { g.sel = i; this.pick(g, i); } } },
  draw(g, c) {
    const p = g.p, want = p.alarms[Math.min(g.a, p.alarms.length - 1)];
    D.sky(c, '#2a3238', '#1a1e22');
    // the computer's display and keyboard (the DSKY)
    c.fillStyle = '#8a8e90'; D.rr(c, 40, 80, 320, 380, 10); c.fill();
    c.fillStyle = '#1a1a1a'; c.fillRect(64, 104, 272, 170);
    const on = Math.floor(g.blink * 2.5) % 2 === 0 || g.found;
    c.fillStyle = on ? '#ffcc33' : '#4a3a10'; c.fillRect(80, 118, 110, 28); D.text(c, 'PROG ALARM', 135, 138, { size: 14, align: 'center', color: '#1a1a1a' });
    D.text(c, want, 300, 236, { size: 50, align: 'right', color: '#7dff7a', font: '"Courier New", monospace' });
    c.fillStyle = '#d8d8d0'; for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { D.rr(c, 70 + k * 46, 296 + r * 50, 38, 40, 4); c.fill(); }
    D.text(c, 'Apollo Guidance Computer', 200, 70, { size: 16, align: 'center', color: '#aab' });
    // the list
    c.fillStyle = '#f4f0e0'; D.rr(c, 390, 40, 540, 470, 6); c.fill();
    c.fillStyle = '#7a6a50'; c.fillRect(600, 30, 120, 24);
    D.text(c, p.sheet || 'Program alarms: what they mean', 660, 78, { size: 18, align: 'center', color: '#2a2a2a', font: '"Comic Sans MS", "Chalkboard SE", cursive' });
    g.rows.forEach((r, i) => {
      const y = 90 + i * 38;
      if (i === g.sel) { c.fillStyle = 'rgba(255,220,100,.45)'; c.fillRect(400, y + 2, 520, 34); }
      if (g.found && g.found === r) { c.fillStyle = 'rgba(120,220,120,.5)'; c.fillRect(400, y + 2, 520, 34); }
      D.text(c, r[0], 414, y + 26, { size: 20, color: '#1a2a5a', font: '"Courier New", monospace' });
      c.font = '600 15px Nunito, sans-serif'; c.fillStyle = '#2a2a2a'; c.textAlign = 'left'; c.fillText(r[1], 486, y + 25);
    });
    if (g.found) {
      c.fillStyle = 'rgba(10,20,10,.88)'; D.rr(c, 60, 470, 840, 62, 10); c.fill();
      D.wrap(c, g.found[0] + ': ' + (g.found[2] || g.found[1]), 80, 496, 800, 22, { size: 17, color: '#d8ffd0' });
    }
  },
});
