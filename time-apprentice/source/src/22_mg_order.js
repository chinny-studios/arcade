// Minigame "order": put the steps of a job in the right order by picking what comes next.
// params: { steps: [{ t: 'text', hint: 'why it comes here', icon?: fn(c, s) }], prompt }

Minigames.add('order', {
  title: 'What comes next?',
  how: 'Pick the steps in the right order.',
  init(g, p) {
    g.steps = p.steps.map((s, i) => Object.assign({ i }, s));
    g.cards = shuffle(g.steps, mulberry32(11 + g.tries));
    // make sure the first card isn't already in place, so there is something to think about
    if (g.cards[0].i === 0) g.cards.push(g.cards.shift());
    g.next = 0; g.sel = 0; g.shake = 0; g.shakeI = -1; g.placed = []; g.doneT = 0;
    const n = g.cards.length, cols = n > 4 ? Math.ceil(n / 2) : n, w = Math.min(270, 900 / cols - 14);
    g.cw = w; g.ch = 92; g.cols = cols;
    g.cards.forEach((cd, k) => { const r = Math.floor(k / cols), cI = k % cols, rowN = Math.min(cols, n - r * cols); cd.x = 480 - (rowN * (w + 14) - 14) / 2 + cI * (w + 14); cd.y = 312 + r * (g.ch + 14); cd.used = false; });
  },
  pick(g, k) {
    const cd = g.cards[k]; if (!cd || cd.used) return;
    if (cd.i === g.next) {
      cd.used = true; g.placed.push(cd); g.next++; AU.ui('ok');
      if (g.next >= g.steps.length) g.doneT = 0.01;
      else { const nx = g.cards.findIndex((q) => !q.used); g.sel = nx; }
    } else {
      AU.ui('bad'); g.shake = 0.4; g.shakeI = k;
      const want = g.steps[g.next];
      g.tip(cd.i < g.next ? 'That one is already done!' : (want.hint || 'Not yet! Think about what has to happen first.'), 3.5);
    }
  },
  update(g, dt) {
    g.shake = Math.max(0, g.shake - dt);
    const n = g.cards.length, step = (d) => { for (let j = 1; j <= n; j++) { const k = (g.sel + d * j + n * 4) % n; if (!g.cards[k].used) { g.sel = k; return; } } };
    if (Input.hit('ArrowRight') || Input.hit('KeyD') || Input.hit('ArrowDown') || Input.hit('KeyS')) step(1);
    if (Input.hit('ArrowLeft') || Input.hit('KeyA') || Input.hit('ArrowUp') || Input.hit('KeyW')) step(-1);
    if (Input.hit('KeyE') || Input.hit('Space') || Input.hit('Enter')) this.pick(g, g.sel);
    if (g.doneT > 0) { g.doneT += dt; if (g.doneT > 0.8) g.win(g.p.winText); }
  },
  tap(g, x, y) {
    const k = g.cards.findIndex((cd) => !cd.used && x >= cd.x && x <= cd.x + g.cw && y >= cd.y && y <= cd.y + g.ch);
    if (k >= 0) { g.sel = k; this.pick(g, k); }
  },
  card(g, c, cd, x, y, w, h, o = {}) {
    D.rr(c, x, y, w, h, 12); c.fillStyle = o.done ? '#d8ecc8' : o.hl ? '#fff6dc' : '#f4ead2'; c.fill();
    c.strokeStyle = o.done ? '#6a9a4a' : '#b8945a'; c.lineWidth = o.hl ? 4 : 2; c.stroke();
    if (o.num) { c.fillStyle = o.done ? '#6a9a4a' : '#b8945a'; c.beginPath(); c.arc(x + 22, y + h / 2, 15, 0, TAU); c.fill(); D.text(c, String(o.num), x + 22, y + h / 2 + 6, { size: 17, align: 'center', color: '#fff' }); }
    D.wrap(c, cd.t, x + (o.num ? 46 : 16), y + 32, w - (o.num ? 58 : 30), 22, { size: 17, color: '#3a2a1a', w: 700 });
  },
  draw(g, c) {
    const p = g.p;
    D.sky(c, p.bg || '#4a3a5a', p.bg2 || '#2a2036');
    D.text(c, p.prompt || 'Put the steps in order', 480, 40, { size: 24, align: 'center', color: '#fff8e8' });
    // the done column
    const n = g.steps.length, w = Math.min(200, 900 / n - 10), x0 = 480 - (n * (w + 10) - 10) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (w + 10), y = 70;
      if (g.placed[i]) this.card(g, c, g.placed[i], x, y, w, 200, { done: true, num: i + 1 });
      else { D.rr(c, x, y, w, 200, 12); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill(); c.strokeStyle = i === g.next ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.stroke(); c.setLineDash([]); D.text(c, String(i + 1), x + w / 2, y + 112, { size: 40, align: 'center', color: 'rgba(255,255,255,.25)' }); }
    }
    g.cards.forEach((cd, k) => {
      if (cd.used) return;
      const dx = k === g.shakeI && g.shake > 0 ? Math.sin(g.shake * 60) * 6 : 0;
      this.card(g, c, cd, cd.x + dx, cd.y, g.cw, g.ch, { hl: k === g.sel });
    });
  },
});
