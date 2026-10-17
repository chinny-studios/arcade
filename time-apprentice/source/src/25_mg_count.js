// Minigame "count": read a number written in Egyptian numerals and hand out that many loaves.
// params: { rounds: [3, 12, 24], who: ['crew names'], item: 'loaf' | 'jar' }

// Egyptian numerals: a stroke for 1, a heel bone (an arch) for 10, a coil of rope for 100
function drawEgyptNumber(c, n, x, y, s = 1, col = '#2a2018') {
  const hund = Math.floor(n / 100), tens = Math.floor((n % 100) / 10), ones = n % 10;
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 5; c.lineCap = 'round';
  let cx = 0;
  for (let i = 0; i < hund; i++) { c.beginPath(); c.arc(cx + 16, -26, 14, 0.6, TAU + 0.2); c.stroke(); c.beginPath(); c.moveTo(cx + 16, -12); c.lineTo(cx + 20, 0); c.stroke(); cx += 40; }
  for (let i = 0; i < tens; i++) { c.beginPath(); c.moveTo(cx + 2, 0); c.lineTo(cx + 2, -26); c.quadraticCurveTo(cx + 13, -44, cx + 24, -26); c.lineTo(cx + 24, 0); c.stroke(); cx += 32; }
  // ones in stacks of up to four
  for (let i = 0; i < ones; i++) { const col4 = Math.floor(i / 4), row = i % 4; const sx = cx + col4 * 14; if (ones > 4) { c.beginPath(); c.moveTo(sx + 4, -row * 11 - 2); c.lineTo(sx + 4, -row * 11 - 10); c.stroke(); } else { c.beginPath(); c.moveTo(cx + i * 13 + 4, 0); c.lineTo(cx + i * 13 + 4, -36); c.stroke(); } }
  c.restore();
  return cx + (ones > 4 ? Math.ceil(ones / 4) * 14 : ones * 13);
}

function egyptW(n) { const ones = n % 10; return Math.floor(n / 100) * 40 + Math.floor((n % 100) / 10) * 32 + (ones > 4 ? Math.ceil(ones / 4) * 14 : ones * 13); }

Minigames.add('count', {
  title: 'Hand out the bread',
  how: 'Read the number on each tally. Add loaves to the basket, then press Give.',
  buttons() {
    return [
      { id: 'minus', label: '− Take one back', key: '←', keys: ['ArrowLeft', 'KeyA', 'ArrowDown'] },
      { id: 'plus', label: '+ Add a loaf', key: '→', keys: ['ArrowRight', 'KeyD', 'ArrowUp'] },
      { id: 'ten', label: '+10', key: 'T', keys: ['KeyT'] },
      { id: 'give', label: 'Give the bread', key: 'E', keys: ['KeyE', 'Enter', 'Space'], cls: 'main' },
    ];
  },
  init(g, p) {
    g.rounds = p.rounds || [3, 12, 24]; g.r = 0; g.n = 0; g.ok = 0; g.bounce = 0; g.happy = 0;
  },
  update(g, dt) {
    const want = g.rounds[g.r];
    g.bounce = Math.max(0, g.bounce - dt * 4);
    if (g.happy > 0) { g.happy -= dt; if (g.happy <= 0) { g.r++; g.n = 0; if (g.r >= g.rounds.length) g.win(g.p.winText); } return; }
    if (g.hit('plus')) { if (g.n < 60) { g.n++; g.bounce = 1; AU.ui('tick'); } }
    if (g.hit('ten')) { g.n = Math.min(60, g.n + 10); g.bounce = 1; AU.ui('pick'); }
    if (g.hit('minus') && g.n > 0) { g.n--; AU.ui('tick'); }
    if (g.hit('give')) {
      if (g.n === want) { AU.ui('ok'); g.happy = 1.4; g.tip('Just right! Thank you!', 1.4); }
      else {
        AU.ui('bad');
        const tens = Math.floor(want / 10), ones = want % 10;
        g.tip((g.n < want ? 'Not enough bread! ' : 'That\'s too many! ') + (g.assist > 0 ? `Count the signs: ${tens ? tens + ' arch' + (tens > 1 ? 'es' : '') + ' (tens)' : ''}${tens && ones ? ' and ' : ''}${ones ? ones + ' stroke' + (ones > 1 ? 's' : '') + ' (ones)' : ''}.` : 'Each arch means ten. Each stroke means one.'), 4);
      }
    }
  },
  tap(g, x, y) {
    if (x > 600 && y > 250 && y < 470) { if (g.n < 60) { g.n++; g.bounce = 1; AU.ui('tick'); } }
    else if (x > 120 && x < 470 && y > 290 && y < 480 && g.n > 0) { g.n--; AU.ui('tick'); }
  },
  draw(g, c) {
    const want = g.rounds[Math.min(g.r, g.rounds.length - 1)], p = g.p;
    D.sky(c, '#e8c88a', '#c89a5a');
    // the tally on a pottery shard
    c.fillStyle = '#d8b088'; c.beginPath(); c.moveTo(330, 40); c.lineTo(640, 30); c.lineTo(660, 190); c.lineTo(310, 200); c.closePath(); c.fill();
    c.strokeStyle = '#a07850'; c.lineWidth = 3; c.stroke();
    const who = (p.who || [])[g.r] || 'Work crew ' + (g.r + 1);
    D.text(c, who, 485, 72, { size: 20, align: 'center', color: '#5a3a1a' });
    const w = egyptW(want);
    c.save(); c.translate(485 - w * 0.75, 170); drawEgyptNumber(c, want, 0, 0, 1.5, '#2a2018'); c.restore();
    if (g.assist > 1) D.text(c, '= ' + want, 640, 180, { size: 22, color: '#5a3a1a' });
    D.text(c, `Crew ${g.r + 1} of ${g.rounds.length}`, 900, 40, { size: 18, align: 'right', color: '#5a3a1a' });
    // key
    c.save(); c.translate(40, 70); D.text(c, 'Egyptian numbers', 0, 0, { size: 16, color: '#5a3a1a' });
    drawEgyptNumber(c, 1, 0, 48, 0.8, '#5a3a1a'); D.text(c, '= 1', 22, 40, { size: 18, color: '#5a3a1a' });
    drawEgyptNumber(c, 10, 70, 48, 0.8, '#5a3a1a'); D.text(c, '= 10', 100, 40, { size: 18, color: '#5a3a1a' });
    c.restore();
    // the basket, with loaves in rows of ten
    c.fillStyle = '#9a6a34'; c.beginPath(); c.moveTo(130, 300); c.lineTo(460, 300); c.lineTo(430, 480); c.lineTo(160, 480); c.closePath(); c.fill();
    c.strokeStyle = '#7a4a1e'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(140 + i * 3, 320 + i * 30); c.lineTo(450 - i * 3, 320 + i * 30); c.stroke(); }
    for (let i = 0; i < g.n; i++) {
      const row = Math.floor(i / 10), col = i % 10, x = 162 + col * 27 + row * 4, y = 462 - row * 24 + (i === g.n - 1 ? -g.bounce * 10 : 0);
      c.fillStyle = '#c8823a'; c.beginPath(); c.ellipse(x + 12, y, 13, 10, 0, Math.PI, 0); c.fill(); c.fillStyle = '#a8662a'; c.fillRect(x - 1, y - 1, 26, 4);
    }
    D.text(c, String(g.n), 295, 520, { size: 26, align: 'center', color: '#3a2410' });
    D.text(c, 'loaves in the basket', 295, 538, { size: 13, align: 'center', color: '#5a3a1a' });
    // the bread pile
    for (let i = 0; i < 22; i++) { const x = 640 + (i % 6) * 40 + (Math.floor(i / 6) % 2) * 20, y = 450 - Math.floor(i / 6) * 28; c.fillStyle = '#c8823a'; c.beginPath(); c.ellipse(x, y, 20, 15, 0, Math.PI, 0); c.fill(); }
    D.text(c, 'Tap the pile to add a loaf', 760, 490, { size: 15, align: 'center', color: '#5a3a1a' });
    if (g.happy > 0) D.text(c, 'Thank you!', 480, 260, { size: 40, align: 'center', color: '#fff', stroke: '#7a4a1e' });
  },
});
