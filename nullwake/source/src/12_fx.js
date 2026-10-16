// Nullwake — visual effects: particles, rings, explosions, beams, lightning, slashes, damage numbers and floating
// text. Visual only, so they use Math.random and never touch the simulation.
const FX = (() => {
  const parts = [], nums = [], beams = [], bolts = [], slashes = [], rings = [], texts = [];
  const MAXP = 1400, rnd = Math.random;
  function clear() { for (const a of [parts, nums, beams, bolts, slashes, rings, texts]) a.length = 0; }
  function burst(x, y, col, n, spd, life = 0.4, size = 2.5) {
    for (let i = 0; i < n && parts.length < MAXP; i++) {
      const a = rnd() * TAU, s = spd * (0.3 + rnd() * 0.7), l = life * (0.6 + rnd() * 0.6);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, size: size * (0.6 + rnd() * 0.8), col, drag: 3, smoke: false });
    }
  }
  function puff(x, y) { if (parts.length < MAXP) parts.push({ x, y, vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 20, life: 0.4, max: 0.4, size: 2.5, col: '#c8c0b8', drag: 2, smoke: true }); }
  function ring(x, y, r, col, life = 0.35, w = 3) { if (rings.length < 160) rings.push({ x, y, r, col, life, max: life, w }); }
  let flashes = 0;
  function explode(x, y, r, col) {
    ring(x, y, r, col, 0.35, 4);
    burst(x, y, '#ffd25e', 6, r * 4, 0.3, 2.5); burst(x, y, col, 5, r * 3, 0.45, 2.2);
    if (flashes < 6) { flashes++; rings.push({ x, y, r: r * 0.7, col: '#ffb070', life: 0.12, max: 0.12, w: 0, flash: true }); }
  }
  function num(x, y, v) {
    if (nums.length > 110) nums.splice(0, 10);
    nums.push({ x: x + (rnd() - 0.5) * 10, y, v: v >= 10 ? Math.round(v) : Math.round(v * 10) / 10, life: 0.6 });
  }
  function text(x, y, s, col) { texts.push({ x, y, s, col, life: 1 }); }
  function slash(x, y, side, w, h, col) { slashes.push({ x, y, side, w, h, col, life: 0.2, max: 0.2 }); }
  function beam(x1, y1, x2, y2, w, col, life) { beams.push({ x1, y1, x2, y2, w, col, life, max: life }); }
  function bolt(x1, y1, x2, y2, col) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), n = Math.max(3, Math.round(d / 18)), nx = -dy / (d || 1), ny = dx / (d || 1), pts = [x1, y1];
    for (let i = 1; i < n; i++) { const t = i / n, o = (rnd() - 0.5) * 22; pts.push(x1 + dx * t + nx * o, y1 + dy * t + ny * o); }
    pts.push(x2, y2);
    bolts.push({ pts, col, life: 0.22, max: 0.22 });
    burst(x2, y2, col, 4, 90, 0.25, 2);
  }
  function update(dt) {
    for (const p of parts) { p.life -= dt; const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; p.x += p.vx * dt; p.y += p.vy * dt; if (p.smoke) p.size += dt * 10; }
    compact(parts, (p) => p.life > 0);
    for (const n of nums) { n.life -= dt; n.y -= dt * 30; } compact(nums, (n) => n.life > 0);
    for (const t of texts) { t.life -= dt; t.y -= dt * 24; } compact(texts, (t) => t.life > 0);
    flashes = 0;
    for (const a of [beams, bolts, slashes, rings]) { for (const b of a) b.life -= dt; compact(a, (b) => b.life > 0); }
  }
  return { clear, burst, puff, ring, explode, num, text, slash, beam, bolt, update, parts, nums, beams, bolts, slashes, rings, texts };
})();
