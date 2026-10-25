// Minigame "pour": hold to pour, let go when the level is in the band. Several rounds.
// params: { rounds: 3, labels: ['G', 'O', 'T'], liquid: '#c8ccd4', band: [0.72, 0.86], speed,
//           scene: fn(c, g) to draw something else than Gutenberg's type mould (g.level, g.band, g.state2, g.round) }

Minigames.add('pour', {
  title: 'Fill it just right',
  how: 'Hold the button to pour. Let go when it reaches the gold band.',
  buttons() { return [{ id: 'pour', label: 'Hold to pour', key: 'Space / E', keys: ['Space', 'KeyE', 'Enter'] }]; },
  init(g, p) {
    g.round = 0; g.rounds = p.rounds || 3; g.level = 0; g.pouring = false; g.state2 = 'ready'; g.waitT = 0; g.made = []; g.splash = 0;
    const b = p.band || [0.72, 0.86], widen = g.assist * 0.04;
    g.band = [b[0] - widen, b[1] + widen];
    g.speed = (p.speed || 0.42) * (1 - g.assist * 0.15);
  },
  update(g, dt) {
    if (g.state2 === 'ready' || g.state2 === 'pour') {
      if (g.held('pour')) {
        g.state2 = 'pour'; g.level += g.speed * dt * (0.7 + g.level * 0.8);
        if (Math.random() < dt * 8) AU.ui('pour');
        if (g.level > 1.0) { g.state2 = 'spill'; g.waitT = 1.4; g.splash = 1; AU.ui('splash'); g.tip(g.p.spillText || 'Too much! It spilled over. Let it cool and try again.'); }
      } else if (g.state2 === 'pour') {
        if (g.level >= g.band[0] && g.level <= g.band[1]) { g.state2 = 'good'; g.waitT = 1.1; AU.ui('ok'); g.made.push(g.round); g.tip(g.p.goodText || 'Perfect!', 1.2); }
        else { g.state2 = 'short'; g.waitT = 1.3; AU.ui('bad'); g.tip(g.p.shortText || 'Not enough! The letter would come out with holes in it. Pour a little longer.'); }
      }
    } else {
      g.waitT -= dt; g.splash = Math.max(0, g.splash - dt);
      if (g.waitT <= 0) {
        if (g.state2 === 'good') g.round++;
        g.level = 0; g.state2 = 'ready';
        if (g.round >= g.rounds) g.win(g.p.winText);
      }
    }
  },
  draw(g, c) {
    const p = g.p;
    D.sky(c, p.bg || '#3a2a20', p.bg2 || '#1e140e');
    D.text(c, `${Math.min(g.round + 1, g.rounds)} of ${g.rounds}`, 480, 40, { size: 22, align: 'center', color: '#ffe2a0' });
    if (typeof p.scene === 'function') { p.scene(c, g); return; }
    // made pieces along the bottom
    for (let i = 0; i < g.rounds; i++) {
      const x = 380 + i * 70 - (g.rounds - 3) * 35, y = 470;
      D.rr(c, x, y, 54, 54, 6); c.fillStyle = i < g.round ? '#a8b0bc' : 'rgba(255,255,255,.08)'; c.fill();
      if (i < g.round && p.labels) { c.save(); c.translate(x + 27, y + 40); c.scale(-1, 1); D.text(c, p.labels[i] || '', 0, 0, { size: 34, align: 'center', color: '#e8ecf0', font: 'Georgia, serif' }); c.restore(); }
    }
    // the mould (a tall cavity) and the ladle
    const mx = 420, my = 140, mw = 120, mh = 280;
    c.fillStyle = '#6a4a2e'; c.fillRect(mx - 60, my - 10, mw + 120, mh + 30);
    c.fillStyle = '#4a3220'; c.fillRect(mx - 60, my - 10, 50, mh + 30); c.fillRect(mx + mw + 10, my - 10, 50, mh + 30);
    c.fillStyle = '#1a120c'; c.fillRect(mx, my, mw, mh);
    // gold band
    const by0 = my + mh * (1 - g.band[1]), by1 = my + mh * (1 - g.band[0]);
    c.fillStyle = 'rgba(255,210,90,.28)'; c.fillRect(mx - 12, by0, mw + 24, by1 - by0);
    c.strokeStyle = '#ffd25a'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx - 16, by0); c.lineTo(mx + mw + 16, by0); c.moveTo(mx - 16, by1); c.lineTo(mx + mw + 16, by1); c.stroke();
    // metal level
    const lv = clamp(g.level, 0, 1.05), ly = my + mh * (1 - lv);
    const hot = g.state2 === 'good' ? Math.max(0, g.waitT / 1.1) : 1;
    c.fillStyle = mixCss(p.liquid || '#d8dce4', '#ffb050', g.state2 === 'pour' || g.state2 === 'ready' ? 0.55 : 0.55 * hot);
    c.fillRect(mx, ly, mw, my + mh - ly);
    if (g.splash > 0) for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(255,190,90,' + g.splash + ')'; c.beginPath(); c.arc(mx + mw / 2 + Math.cos(i) * 90 * (1.5 - g.splash), my - 10 + Math.sin(i * 3) * 20, 8, 0, TAU); c.fill(); }
    // matrix at the bottom (the copper piece with the letter punched in)
    c.fillStyle = '#b87333'; c.fillRect(mx - 10, my + mh, mw + 20, 26);
    if (p.labels) D.text(c, p.labels[Math.min(g.round, g.rounds - 1)] || '', mx + mw / 2, my + mh + 22, { size: 22, align: 'center', color: '#5a2a10', font: 'Georgia, serif' });
    // ladle
    const tilt = g.state2 === 'pour' ? 0.9 : 0.2;
    c.save(); c.translate(mx + mw / 2 + 70, my - 50); c.rotate(-tilt);
    c.fillStyle = '#5a5a60'; c.fillRect(0, -6, 220, 12);
    c.fillStyle = '#3a3a40'; c.beginPath(); c.arc(0, 0, 44, 0, Math.PI); c.fill();
    c.fillStyle = '#ffb050'; c.fillRect(-40, -4, 80, 8);
    c.restore();
    if (g.state2 === 'pour') { c.fillStyle = mixCss(p.liquid || '#d8dce4', '#ffb050', 0.6); c.fillRect(mx + mw / 2 - 6, my - 30, 12, ly - my + 30); }
    D.text(c, p.label || 'Fill the mould to the gold band', 760, 200, { size: 20, align: 'center', color: '#f4e4c4' });
  },
});
function mixCss(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)).getHexString(); }
