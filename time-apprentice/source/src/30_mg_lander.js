// Minigame "lander": fly the lunar module down past the boulders and land gently on flat ground before the fuel runs out.
// params: { fuel: 60, callouts: true }

Minigames.add('lander', {
  title: 'Fly the Eagle',
  how: 'Hold ▲ to fire the engine and slow down. ◀ ▶ to move sideways. Fly past the boulders and land softly on flat ground!',
  buttons() {
    return [
      { id: 'l', label: '◀', key: '← / A', keys: ['ArrowLeft', 'KeyA'] },
      { id: 'up', label: '▲ Engine', key: '↑ / W / Space', keys: ['ArrowUp', 'KeyW', 'Space'], cls: 'main' },
      { id: 'r', label: '▶', key: '→ / D', keys: ['ArrowRight', 'KeyD'] },
    ];
  },
  init(g, p) {
    g.x = 30; g.y = 140; g.vx = 6; g.vy = -1.5; g.fuel = (p.fuel || 60) + g.assist * 18; g.fuel0 = g.fuel; g.burn = 0; g.side = 0;
    g.said = {}; g.landed = false; g.T = 0;
    // the ground: hummocks, West crater and its boulder field, then a flat patch
    const r = mulberry32(1969);
    g.rocks = []; for (let i = 0; i < 46; i++) { const x = 110 + r() * 230; g.rocks.push([x, 1 + r() * 3.2]); }
    for (let i = 0; i < 10; i++) g.rocks.push([600 + r() * 160, 1 + r() * 2.5]);
    g.flat = [390, 560];
  },
  ground(g, x) {
    let h = Math.sin(x * 0.05) * 1.2 + Math.sin(x * 0.013) * 3;
    if (x > 190 && x < 300) { const k = (x - 245) / 55; h -= (1 - k * k) * 14; h += Math.max(0, Math.abs(k) - 0.85) * 40; }
    if (x > g.flat[0] && x < g.flat[1]) h = h * 0.15 + 0.5;
    return h;
  },
  rockAt(g, x) { for (const rk of g.rocks) if (Math.abs(rk[0] - x) < rk[1] + 3) return rk; return null; },
  update(g, dt) {
    if (g.landed) { g.T += dt; if (g.T > 2.6) { if (g.landed === 'ok') g.win(g.p.winText); else g.fail(g.why); } return; }
    const up = g.held('up') && g.fuel > 0, side = (g.held('r') ? 1 : 0) - (g.held('l') ? 1 : 0);
    g.burn = lerp(g.burn, up ? 1 : 0, Math.min(1, dt * 10)); g.side = side;
    const grav = 1.62;
    g.vy += (-grav + (up ? 3.3 : 0)) * dt;
    g.vx += (g.fuel > 0 ? side * 1.4 : 0) * dt;
    g.vx *= Math.pow(0.97, dt);
    if (up) g.fuel -= dt; if (side && g.fuel > 0) g.fuel -= dt * 0.25;
    g.fuel = Math.max(0, g.fuel);
    g.x += g.vx * dt; g.y += g.vy * dt;
    if (up && Math.random() < dt * 10) AU.burst(0.12, { f: 160, q: 0.4, v: 0.08 });
    const left = g.fuel;
    if (g.p.callouts !== false) for (const s of [60, 30]) if (left < s && g.fuel0 > s + 2 && !g.said[s]) { g.said[s] = 1; g.tip(`"${s} seconds!" Fuel is running low.`, 2.5); AU.ui('quindar'); }
    const gh = this.ground(g, g.x);
    if (g.y - gh <= 0) {
      g.y = gh; g.landed = 'bad'; g.T = 0;
      const rock = this.rockAt(g, g.x), flat = g.x > g.flat[0] && g.x < g.flat[1];
      if (g.vy < -2.4) g.why = `Bump! You came down at ${(-g.vy).toFixed(1)} m/s. Fire the engine to slow down before you touch, under 2 m/s.`;
      else if (Math.abs(g.vx) > 1.5) g.why = 'You were still sliding sideways. Stop moving sideways before touching down.';
      else if (rock) g.why = 'You landed on a boulder! Keep flying past the rocks to the flat ground, just like Neil did.';
      else if (!flat) g.why = 'That ground is too bumpy and steep. Find the smooth, flat patch past the crater.';
      else { g.landed = 'ok'; AU.ui('thud'); }
      if (g.landed !== 'ok') AU.ui('bad');
      return;
    }
    if (g.fuel <= 0 && g.y - gh > 3 && !g.said.empty) { g.said.empty = 1; g.tip('Out of fuel!', 2); }
    if (g.x > 820) { g.landed = 'bad'; g.why = 'You flew too far! The flat patch is just past the crater and the boulders.'; g.T = 1; }
  },
  draw(g, c) {
    const S = 3, camX = clamp(g.x * S - 360, 0, 860 * S - 960);
    const gy = (h) => 470 - h * S * 0.9;
    // sky and Earth
    c.fillStyle = '#000'; c.fillRect(0, 0, 960, 540);
    const r = mulberry32(3); c.fillStyle = '#fff'; for (let i = 0; i < 80; i++) c.fillRect(r() * 960, r() * 300, 1.2, 1.2);
    c.fillStyle = '#3a7ad8'; c.beginPath(); c.arc(820, 90, 30, 0, TAU); c.fill(); c.fillStyle = '#e8f0f8'; c.beginPath(); c.arc(812, 82, 12, 0, TAU); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(838, 90, 30, -Math.PI / 2, Math.PI / 2); c.fill();
    // ground
    c.save(); c.translate(-camX, 0);
    c.fillStyle = '#8a8a86'; c.beginPath(); c.moveTo(0, 540);
    for (let x = 0; x <= 860; x += 2) c.lineTo(x * S, gy(this.ground(g, x)));
    c.lineTo(860 * S, 540); c.fill();
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(g.flat[0] * S, gy(0.5) - 2, (g.flat[1] - g.flat[0]) * S, 4);
    for (const rk of g.rocks) { const x = rk[0] * S, y = gy(this.ground(g, rk[0])); c.fillStyle = '#5a5a58'; c.beginPath(); c.ellipse(x, y - rk[1] * 2, rk[1] * 4, rk[1] * 3, 0, 0, TAU); c.fill(); c.fillStyle = '#b0b0aa'; c.beginPath(); c.ellipse(x - rk[1], y - rk[1] * 3, rk[1] * 2, rk[1] * 1.4, 0, 0, TAU); c.fill(); }
    D.text(c, 'West crater', 245 * S, gy(-14) + 40, { size: 16, align: 'center', color: '#ccc' });
    // the lunar module
    const lx = g.x * S, ly = gy(g.y);
    c.save(); c.translate(lx, ly); c.rotate(g.side * 0.12);
    if (g.burn > 0.05) { c.fillStyle = `rgba(255,220,160,${g.burn * 0.8})`; c.beginPath(); c.moveTo(-6, -8); c.lineTo(6, -8); c.lineTo(0, 10 + g.burn * 26 + Math.random() * 6); c.fill(); }
    c.strokeStyle = '#d8c070'; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -12); c.lineTo(-22, 0); c.moveTo(14, -12); c.lineTo(22, 0); c.stroke();
    c.fillStyle = '#c8a040'; c.fillRect(-14, -22, 28, 14);
    c.fillStyle = '#d0d0cc'; c.beginPath(); c.moveTo(-12, -22); c.lineTo(-10, -36); c.lineTo(10, -36); c.lineTo(14, -26); c.lineTo(12, -22); c.fill();
    c.fillStyle = '#2a2a2a'; c.fillRect(-6, -32, 6, 5);
    c.restore();
    c.restore();
    // instruments
    const alt = Math.max(0, g.y - this.ground(g, g.x));
    c.fillStyle = 'rgba(20,30,20,.75)'; D.rr(c, 16, 16, 250, 120, 10); c.fill();
    D.text(c, 'Height ' + Math.round(alt) + ' m', 30, 44, { size: 18, color: '#9f9', font: '"Courier New", monospace' });
    D.text(c, 'Down speed ' + (-g.vy).toFixed(1) + ' m/s', 30, 70, { size: 18, color: -g.vy > 2.4 ? '#ffb070' : '#9f9', font: '"Courier New", monospace' });
    D.text(c, 'Sideways ' + g.vx.toFixed(1) + ' m/s', 30, 96, { size: 18, color: Math.abs(g.vx) > 1.5 ? '#ffb070' : '#9f9', font: '"Courier New", monospace' });
    D.text(c, 'Fuel', 30, 124, { size: 16, color: '#9f9' }); D.bar(c, 80, 112, 170, 14, g.fuel / g.fuel0, g.fuel < 30 ? '#ffb070' : '#8fdc6a');
    if (g.x < g.flat[0] - 10) D.text(c, 'Flat ground ahead ▶', 940, 40, { size: 18, align: 'right', color: '#ddd' });
    if (g.landed === 'ok') D.text(c, 'The Eagle has landed!', 480, 220, { size: 40, align: 'center', color: '#fff', stroke: '#000' });
  },
});
