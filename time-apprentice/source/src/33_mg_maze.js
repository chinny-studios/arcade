// Minigame "maze": find your way through dark, narrow lanes with a torch, delivering things to doors (the Kowloon
// Walled City's postmen knew every turn by heart). Water pipes along the lane walls and painted signs help.
// params: { w: 13, h: 9, seed, stops: [{ label: 'Dentist', short: 'D', color }], battery: 320, start: 'Gate' }

Minigames.add('maze', {
  title: 'Through the lanes',
  how: 'Walk with the arrows (or tap where you want to go). Find every door on your list before your torch runs out.',
  buttons() {
    return [
      { id: 'L', label: '◀', key: '← / A', keys: ['ArrowLeft', 'KeyA'] },
      { id: 'U', label: '▲', key: '↑ / W', keys: ['ArrowUp', 'KeyW'] },
      { id: 'D', label: '▼', key: '↓ / S', keys: ['ArrowDown', 'KeyS'] },
      { id: 'R', label: '▶', key: '→ / D', keys: ['ArrowRight', 'KeyD'] },
    ];
  },
  init(g, p) {
    const W = g.mw = p.w || 13, H = g.mh = p.h || 9, r = mulberry32(p.seed || 1990);
    // carve a perfect maze, then knock out a few extra walls so there's more than one way round
    const cell = (x, y) => y * W + x;
    g.walls = []; for (let i = 0; i < W * H; i++) g.walls.push({ n: true, s: true, e: true, w: true });
    const seen = new Set([0]), stack = [[0, 0]];
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = [[x, y - 1, 'n', 's'], [x, y + 1, 's', 'n'], [x + 1, y, 'e', 'w'], [x - 1, y, 'w', 'e']].filter(([a, b]) => a >= 0 && b >= 0 && a < W && b < H && !seen.has(cell(a, b)));
      if (!nb.length) { stack.pop(); continue; }
      const [a, b, d1, d2] = nb[Math.floor(r() * nb.length)];
      g.walls[cell(x, y)][d1] = false; g.walls[cell(a, b)][d2] = false; seen.add(cell(a, b)); stack.push([a, b]);
    }
    for (let k = 0; k < W * H * 0.08; k++) { const x = 1 + Math.floor(r() * (W - 2)), y = 1 + Math.floor(r() * (H - 2)); g.walls[cell(x, y)].e = false; g.walls[cell(x + 1, y)].w = false; }
    // distances from the gate, so the doors are spread around and far away
    const dist = new Array(W * H).fill(-1), q = [0]; dist[0] = 0;
    while (q.length) { const c0 = q.shift(), x = c0 % W, y = Math.floor(c0 / W), wl = g.walls[c0]; for (const [dx, dy, d] of [[0, -1, 'n'], [0, 1, 's'], [1, 0, 'e'], [-1, 0, 'w']]) { if (wl[d]) continue; const c1 = cell(x + dx, y + dy); if (dist[c1] < 0) { dist[c1] = dist[c0] + 1; q.push(c1); } } }
    const stops = p.stops || [{ label: 'Door 1' }, { label: 'Door 2' }, { label: 'Door 3' }];
    const cands = []; for (let i = 1; i < W * H; i++) cands.push(i);
    cands.sort((a, b) => dist[b] - dist[a]);
    g.stops = [];
    for (const c0 of cands) {
      if (g.stops.length >= stops.length) break;
      const x = c0 % W, y = Math.floor(c0 / W);
      if (g.stops.some((s) => Math.abs(s.x - x) + Math.abs(s.y - y) < (W + H) / 4)) continue;
      const def = stops[g.stops.length];
      g.stops.push(Object.assign({ x, y, got: false }, def));
    }
    g.x = 0; g.y = 0; g.fx = 0; g.fy = 0; g.moveT = 0; g.mem = new Set([0]);
    g.battery = g.bat0 = (p.battery || 300) + g.assist * 90;
    g.light = 2.3 + g.assist * 0.7;
    // the water pipes run along some lanes, painted signs mark some corners
    g.pipes = []; for (let i = 0; i < W * H; i++) g.pipes.push(r() < 0.3);
    g.drips = []; for (let i = 0; i < 14; i++) g.drips.push({ x: r() * W, y: r() * H, t: r() * 3 });
  },
  tryMove(g, dx, dy) {
    const wl = g.walls[g.y * g.mw + g.x], d = dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n';
    if (wl[d]) { if (g.bumpT <= 0) { AU.ui('miss'); g.bumpT = 0.3; } return; }
    g.x += dx; g.y += dy; g.moveT = 0.14; g.battery--; g.mem.add(g.y * g.mw + g.x); AU.step(0.5);
    const s = g.stops.find((q) => !q.got && q.x === g.x && q.y === g.y);
    if (s) { s.got = true; AU.ui('ok'); g.tip(s.found || `Found: *${s.label}*!`, 2.4); if (g.stops.every((q) => q.got)) { g.doneT = 0.01; } }
    if (g.battery <= 0 && !g.doneT) g.fail(g.p.failText || 'Your torch ran out! Mei came and found you. Try again: follow the water pipes and the signs, and look for dead ends you\'ve already seen.');
  },
  update(g, dt) {
    g.bumpT = (g.bumpT || 0) - dt;
    g.fx = lerp(g.fx, g.x, Math.min(1, dt * 16)); g.fy = lerp(g.fy, g.y, Math.min(1, dt * 16));
    for (const d of g.drips) d.t += dt;
    if (g.doneT) { g.doneT += dt; if (g.doneT > 1.2) g.win(g.p.winText); return; }
    g.moveT -= dt;
    if (g.moveT > 0) return;
    const tapDir = g.tapDir; g.tapDir = null;
    if (g.held('L') || tapDir === 'L') this.tryMove(g, -1, 0);
    else if (g.held('R') || tapDir === 'R') this.tryMove(g, 1, 0);
    else if (g.held('U') || tapDir === 'U') this.tryMove(g, 0, -1);
    else if (g.held('D') || tapDir === 'D') this.tryMove(g, 0, 1);
  },
  geom(g) { const cs = Math.min(820 / g.mw, 430 / g.mh); return { cs, ox: 480 - g.mw * cs / 2, oy: 92 }; },
  tap(g, x, y) {
    const { cs, ox, oy } = this.geom(g), px = ox + (g.x + 0.5) * cs, py = oy + (g.y + 0.5) * cs, dx = x - px, dy = y - py;
    if (Math.hypot(dx, dy) < cs * 0.4) return;
    g.tapDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
  },
  draw(g, c) {
    const p = g.p, { cs, ox, oy } = this.geom(g), W = g.mw, H = g.mh;
    c.fillStyle = '#0c0a0e'; c.fillRect(0, 0, 960, 540);
    c.strokeStyle = 'rgba(200,180,150,.18)'; c.lineWidth = 2; c.setLineDash([6, 6]); c.strokeRect(ox - 4, oy - 4, W * cs + 8, H * cs + 8); c.setLineDash([]);
    const lit = (x, y) => Math.hypot(x + 0.5 - (g.fx + 0.5), y + 0.5 - (g.fy + 0.5));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, d = lit(x, y), mem = g.mem.has(i);
      const k = d < g.light ? 1 - d / g.light * 0.65 : mem ? 0.16 : 0;
      if (k <= 0) continue;
      const X = ox + x * cs, Y = oy + y * cs, wl = g.walls[i];
      c.fillStyle = `rgba(110,100,84,${k})`; c.fillRect(X, Y, cs, cs);
      if (g.pipes[i] && d < g.light) { c.strokeStyle = `rgba(140,150,160,${k})`; c.lineWidth = 3; c.beginPath(); c.moveTo(X + 4, Y + 5); c.lineTo(X + cs - 4, Y + 5); c.moveTo(X + 4, Y + 10); c.lineTo(X + cs - 4, Y + 10); c.stroke(); }
      c.strokeStyle = `rgba(40,30,26,${Math.min(1, k + 0.3)})`; c.lineWidth = Math.max(4, cs * 0.18); c.lineCap = 'square';
      c.beginPath();
      if (wl.n) { c.moveTo(X, Y); c.lineTo(X + cs, Y); }
      if (wl.s) { c.moveTo(X, Y + cs); c.lineTo(X + cs, Y + cs); }
      if (wl.w) { c.moveTo(X, Y); c.lineTo(X, Y + cs); }
      if (wl.e) { c.moveTo(X + cs, Y); c.lineTo(X + cs, Y + cs); }
      c.stroke();
    }
    // doors on the list: you can see them lit up when your torch reaches them
    for (const s of g.stops) {
      const d = lit(s.x, s.y), X = ox + (s.x + 0.5) * cs, Y = oy + (s.y + 0.5) * cs;
      if (d > g.light + 0.6 && !s.got && !(g.assist >= 2)) continue;
      c.fillStyle = s.got ? 'rgba(127,214,106,.8)' : s.color || '#ffcc4a'; D.rr(c, X - cs * 0.32, Y - cs * 0.36, cs * 0.64, cs * 0.72, 4); c.fill();
      D.text(c, s.got ? '✓' : (s.short || '?'), X, Y + cs * 0.14, { size: cs * 0.4, align: 'center', color: '#2a1a10', font: s.cjk ? CJK : undefined });
    }
    // drips of water in the torchlight
    for (const d of g.drips) { const k = (d.t % 3) / 3; if (lit(Math.floor(d.x), Math.floor(d.y)) > g.light) continue; c.fillStyle = `rgba(150,190,230,${1 - k})`; c.fillRect(ox + d.x * cs, oy + d.y * cs + k * cs * 0.5, 2, 5); }
    // the torch beam and you
    const px = ox + (g.fx + 0.5) * cs, py = oy + (g.fy + 0.5) * cs;
    const gr = c.createRadialGradient(px, py, 0, px, py, g.light * cs); gr.addColorStop(0, 'rgba(255,230,160,.22)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(px, py, g.light * cs, 0, TAU); c.fill();
    c.fillStyle = '#ffd25a'; c.beginPath(); c.arc(px, py, cs * 0.26, 0, TAU); c.fill(); c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(px, py, cs * 0.1, 0, TAU); c.fill();
    // the gate where you came in
    D.text(c, p.start || 'Gate', ox + cs * 0.5, oy - 8, { size: 14, align: 'center', color: '#c8b8a0' });
    // the list and the torch
    D.text(c, p.listTitle || 'Deliveries:', 30, 34, { size: 18, color: '#f4e8d0' });
    let lx = 30 + c.measureText(p.listTitle || 'Deliveries:').width + 16;
    for (const s of g.stops) {
      const t = (s.got ? '✓ ' : '') + s.label; c.font = '700 17px Nunito, sans-serif'; const w = c.measureText(t).width + 18;
      D.rr(c, lx, 16, w, 26, 8); c.fillStyle = s.got ? 'rgba(127,214,106,.35)' : 'rgba(255,255,255,.1)'; c.fill();
      D.text(c, t, lx + 9, 35, { size: 17, color: s.got ? '#c8f0b8' : '#fff' }); lx += w + 8;
    }
    D.text(c, 'Torch', 30, 70, { size: 15, color: '#e8dcc8' });
    D.bar(c, 80, 58, 160, 14, g.battery / g.bat0, g.battery / g.bat0 < 0.25 ? '#ff7a5a' : '#ffe08a');
  },
});
