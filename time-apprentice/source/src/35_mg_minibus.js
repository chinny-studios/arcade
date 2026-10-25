// Minigame "minibus": ride a Hong Kong red minibus. There are no bells and no fixed stops: shout "Yau lok!" (getting
// off!) in time for the driver to stop at the right place, then pay the exact fare in coins.
// params: { rides: [{ stop: 'Star Ferry', sign: '天星碼頭', before: ['Market', 'Temple', ...], fare: 6.5, who: 'for Mrs Lau' }] }

const HK_COINS = [10, 5, 2, 1, 0.5, 0.2, 0.1];
Minigames.add('minibus', {
  title: 'Yau lok!',
  how: 'Watch the street go by. When your stop comes into view, shout *Yau lok!* so the driver can pull in. Then pay the exact fare.',
  buttons() { return [{ id: 'shout', label: 'Yau lok! 有落!', key: 'Space / E', keys: ['Space', 'KeyE', 'Enter'], cls: 'main' }]; },
  init(g, p) {
    g.rides = p.rides || [{ stop: 'Star Ferry', sign: '天星碼頭', before: ['Market', 'Temple', 'Bakery'], fare: 6.5 }];
    g.ri = 0; this.ride(g);
  },
  ride(g) {
    const R = g.rides[g.ri];
    // the street is a list of signs, spaced out; the stop is one of them, and the bus drives past them
    g.signs = R.before.map((t, i) => ({ t, x: 900 + i * 420 }));
    g.stop = { t: R.stop, cjk: R.sign, x: 900 + R.before.length * 420, stop: true };
    g.signs.push(g.stop); g.signs.push({ t: R.after || 'Bus station', x: g.stop.x + 520 });
    g.scroll = 0; g.speed = 150 * (1 - g.assist * 0.12); g.phase = 'ride'; g.brake = 0; g.pay = []; g.sel = 0; g.msgT = 0; g.say = '';
  },
  shout(g) {
    const sx = g.stop.x - g.scroll;
    AU.tone(520, 0.12, { v: 0.08, type: 'square' }); AU.tone(440, 0.18, { v: 0.08, type: 'square', at: 0.12 });
    g.say = 'Yau lok!'; g.sayT = 1.2;
    // the driver needs a moment: the stop must be in sight but not yet alongside
    if (sx > 960) { AU.ui('bad'); g.mist = (g.mist || 0) + 1; g.tip(`The driver pulls in… but this is the *${this.near(g)}*, not your stop! Wait until you can see *${g.stop.t}*.`, 3); g.brake = 0.8; }
    else if (sx < 360) { AU.ui('bad'); g.mist = (g.mist || 0) + 1; g.tip('Too late! The driver can\'t stop that fast. We went past it!', 3); this.again(g); }
    else { g.phase = 'brake'; g.target = g.scroll + Math.max(40, sx - 560); AU.ui('ok'); }
    if ((g.mist || 0) >= 4) g.fail('Shout as soon as you can see your stop on the street ahead, while it is still coming toward you.');
  },
  near(g) { let best = null; for (const s of g.signs) if (!best || Math.abs(s.x - g.scroll - 480) < Math.abs(best.x - g.scroll - 480)) best = s; return best && !best.stop ? best.t : 'wrong place'; },
  again(g) { g.scroll = Math.max(0, g.stop.x - 1500); },
  total(g) { return Math.round(g.pay.reduce((a, b) => a + b, 0) * 10) / 10; },
  coin(g, v) {
    if (g.phase !== 'pay') return;
    const fare = g.rides[g.ri].fare;
    g.pay.push(v); AU.ui('coin');
    const t = this.total(g);
    if (Math.abs(t - fare) < 0.01) { g.phase = 'paid'; g.paidT = 0; AU.ui('ok'); g.tip(`Exactly $${fare.toFixed(1)}. *M goi!* (Thank you!)`, 2); }
    else if (t > fare) { AU.ui('bad'); g.tip(`That's $${t.toFixed(1)}, too much. Minibus drivers like the *exact* fare. Try again!`, 2.6); g.pay = []; g.over = (g.over || 0) + 1; if (g.over >= 4) g.fail('Count the coins up to the fare, a bit at a time: big coins first, then the small ones.'); }
  },
  update(g, dt) {
    g.sayT = (g.sayT || 0) - dt;
    if (g.phase === 'ride') {
      if (g.brake > 0) { g.brake -= dt; g.scroll += g.speed * dt * 0.3; }
      else g.scroll += g.speed * dt;
      if (g.hit('shout')) this.shout(g);
      if (g.stop.x - g.scroll < 250 && g.phase === 'ride') { g.tip('We drove right past! Shout *Yau lok!* when you see your stop coming.', 3); g.mist = (g.mist || 0) + 1; this.again(g); if (g.mist >= 4) g.fail('Shout as soon as you see your stop sign ahead.'); }
      if (Math.random() < dt * 3) AU.burst(0.3, { f: 160, q: 0.5, v: 0.05 });
    } else if (g.phase === 'brake') {
      const target = g.target; g.scroll = lerp(g.scroll, target, Math.min(1, dt * 2.2));
      if (Math.abs(g.scroll - target) < 3) {
        const R = g.rides[g.ri];
        if (R.fare) { g.phase = 'pay'; g.tip(`Fare: *$${R.fare.toFixed(1)}*. Tap the coins to pay the exact amount.`, 3); }
        else { g.phase = 'paid'; g.paidT = 0; g.tip(R.thanks || 'The bus stops right there. *M goi!*', 2.2); }
      }
    } else if (g.phase === 'pay') {
      const n = HK_COINS.length;
      if (Input.hit('ArrowRight') || Input.hit('KeyD')) g.sel = (g.sel + 1) % n;
      if (Input.hit('ArrowLeft') || Input.hit('KeyA')) g.sel = (g.sel + n - 1) % n;
      if (g.hit('shout') || Input.hit('KeyF')) this.coin(g, HK_COINS[g.sel]);
      for (let i = 0; i < n; i++) if (Input.hit('Digit' + (i + 1))) this.coin(g, HK_COINS[i]);
      if (Input.hit('KeyQ') || Input.hit('Backspace')) g.pay = [];
    } else if (g.phase === 'paid') {
      g.paidT += dt;
      if (g.paidT > 1.6) { g.ri++; if (g.ri >= g.rides.length) g.win(g.p.winText); else { this.ride(g); g.tip(g.rides[g.ri].intro || 'Next stop!', 2.5); } }
    }
    // the button doubles as "pay this coin" once we've stopped
    const b = g.blist && g.blist[0] && g.blist[0].el; if (b) { const lbl = g.phase === 'pay' ? 'Pay this coin' : 'Yau lok! 有落!'; if (b.dataset.l !== lbl) { b.dataset.l = lbl; b.querySelector('span').textContent = lbl; } }
  },
  tap(g, x, y) {
    if (g.phase !== 'pay') return;
    HK_COINS.forEach((v, i) => { const cx = 150 + i * 90, cy = 470; if (Math.hypot(x - cx, y - cy) < 38) { g.sel = i; this.coin(g, v); } });
    if (x > 800 && y > 440) g.pay = [];
  },
  draw(g, c) {
    const R = g.rides[g.ri];
    // the street through the minibus window
    D.sky(c, '#8ab8d8', '#e8eef0', 300);
    const r = mulberry32(9), off = g.scroll;
    for (let i = -1; i < 14; i++) {
      const bx = i * 140 - (off * 0.5) % 140, h = 120 + ((i + Math.floor(off * 0.5 / 140)) * 7919 % 5) * 30;
      c.fillStyle = ['#c8b8a8', '#b8c0b8', '#d8c8b0', '#a8a8b0', '#c8a890'][(i + Math.floor(off * 0.5 / 140) + 10) % 5]; c.fillRect(bx, 300 - h, 130, h);
      c.fillStyle = 'rgba(40,60,80,.5)'; for (let k = 0; k < 4; k++) for (let j = 0; j < Math.floor(h / 30) - 1; j++) c.fillRect(bx + 10 + k * 30, 300 - h + 12 + j * 30, 18, 16);
    }
    c.fillStyle = '#6a6a6a'; c.fillRect(0, 300, 960, 60); c.fillStyle = '#e8e0a0'; for (let x = -(off % 80); x < 960; x += 80) c.fillRect(x, 328, 40, 4);
    c.fillStyle = '#b8b0a0'; c.fillRect(0, 286, 960, 16);
    // the shop signs along the street, sticking out over the pavement
    for (const s of g.signs) {
      const x = s.x - off; if (x < -200 || x > 1160) continue;
      c.fillStyle = '#5a4a3a'; c.fillRect(x - 3, 150, 6, 140);
      D.rr(c, x - 90, 150, 180, 70, 8); c.fillStyle = s.stop ? '#1a5a3a' : '#a8221e'; c.fill(); c.strokeStyle = '#ffd76a'; c.lineWidth = 3; c.stroke();
      if (s.cjk) D.text(c, s.cjk, x, 182, { size: 24, align: 'center', color: '#ffe08a', font: CJK });
      D.text(c, s.t, x, s.cjk ? 208 : 194, { size: s.cjk ? 16 : 20, align: 'center', color: '#fff' });
    }
    // inside the minibus: the window frame, the seat backs, the speed display by the driver
    c.fillStyle = '#e8e0d0'; c.fillRect(0, 360, 960, 180); c.fillStyle = '#c8302a'; c.fillRect(0, 0, 960, 26); c.fillRect(0, 352, 960, 14);
    c.fillStyle = '#2a2a2a'; c.fillRect(0, 26, 960, 8);
    for (let i = 0; i < 4; i++) { c.fillStyle = '#3a6a4a'; D.rr(c, 60 + i * 230, 380, 170, 70, 12); c.fill(); }
    D.rr(c, 760, 36, 180, 56, 8); c.fillStyle = '#101010'; c.fill();
    D.text(c, Math.round(g.phase === 'ride' ? 40 + g.speed / 6 : 0) + ' km/h', 850, 74, { size: 26, align: 'center', color: '#ff4a3a', font: '"Courier New", monospace' });
    D.text(c, `Your stop: ${R.stop}${R.who ? ' (' + R.who + ')' : ''}`, 24, 64, { size: 22, color: '#fff', stroke: 'rgba(0,0,0,.55)', lw: 5 });
    if (R.sign) D.text(c, R.sign, 24, 98, { size: 26, color: '#ffe08a', stroke: 'rgba(0,0,0,.55)', lw: 5, font: CJK });
    if (g.sayT > 0) { D.rr(c, 380, 220, 200, 56, 20); c.fillStyle = '#fffaf0'; c.fill(); D.text(c, g.say, 480, 258, { size: 28, align: 'center', color: '#a8221e' }); }
    // paying: coins on the tray
    if (g.phase === 'pay' || g.phase === 'paid') {
      c.fillStyle = 'rgba(30,24,46,.88)'; D.rr(c, 40, 404, 880, 130, 16); c.fill();
      HK_COINS.forEach((v, i) => {
        const cx = 150 + i * 90, cy = 470, big = v >= 1, gold = v >= 5 || v < 1;
        c.fillStyle = v === 10 ? '#d8b850' : gold ? '#d8b860' : '#d0d4d8'; c.beginPath(); c.arc(cx, cy, big ? 34 : 26, 0, TAU); c.fill();
        c.strokeStyle = i === g.sel ? '#fff' : 'rgba(0,0,0,.35)'; c.lineWidth = i === g.sel ? 4 : 2; c.stroke();
        D.text(c, v >= 1 ? '$' + v : v * 100 + '¢', cx, cy + 7, { size: 18, align: 'center', color: '#2a2018' });
      });
      D.text(c, `Paid: $${this.total(g).toFixed(1)} of $${(R.fare || 0).toFixed(1)}`, 760, 438, { size: 18, color: '#fff' });
      D.rr(c, 810, 452, 90, 40, 10); c.fillStyle = '#5a4a5a'; c.fill(); D.text(c, 'Clear', 855, 479, { size: 17, align: 'center', color: '#fff' });
    }
  },
});
