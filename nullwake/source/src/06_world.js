// Nullwake — the endless ground of each stage: four pre-rendered 512-unit tile variants per look, picked by a
// hash of the tile coordinate, plus a parallax star layer for the Drift. Decorations stay inside each tile so
// any two variants meet without a seam.
const CH = 512, CPX = 1.25;
const WORLD = { tiles: {}, far: null };
const LOOKS = {
  drift: { bg: '#04060f' },
  brood: { bg: '#1a0d1d' },
  station: { bg: '#121720' },
};

function buildTiles(look) {
  if (WORLD.tiles[look]) return WORLD.tiles[look];
  const arr = [];
  for (let v = 0; v < 4; v++) {
    const c = makeCanvas(CH * CPX, CH * CPX), x = c.getContext('2d');
    x.scale(CPX, CPX); TILE[look](x, artRng(1000 + v * 7919 + look.length * 31), v); arr.push(c);
  }
  if (look === 'drift' && !WORLD.far) WORLD.far = buildFar();
  return (WORLD.tiles[look] = arr);
}

function buildFar() { // distant stars and nebula, wrapped so the tile repeats seamlessly
  const S = 768, c = makeCanvas(S, S), x = c.getContext('2d'), rnd = artRng(42);
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } };
  for (let i = 0; i < 5; i++) {
    const px = rnd() * S, py = rnd() * S, r = 120 + rnd() * 220, col = ['#3a1f6a', '#123a6a', '#5a1a4a', '#0f4a5a'][i % 4];
    wrap(() => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, rgba(col, 0.32)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); });
  }
  for (let i = 0; i < 420; i++) {
    const px = rnd() * S, py = rnd() * S, b = rnd(), s = b > 0.97 ? 1.6 : b > 0.85 ? 1.1 : 0.7;
    x.fillStyle = `rgba(${200 + rnd() * 55 | 0},${210 + rnd() * 45 | 0},255,${0.25 + b * 0.6})`; x.fillRect(px, py, s, s);
    if (b > 0.985) wrap(() => { const g = x.createRadialGradient(px, py, 0, px, py, 6); g.addColorStop(0, 'rgba(200,230,255,.5)'); g.addColorStop(1, 'rgba(200,230,255,0)'); x.fillStyle = g; x.fillRect(px - 6, py - 6, 12, 12); });
  }
  return c;
}

function rockPoly(x, rnd, cx, cy, r, base, n = 9) {
  const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.7 + rnd() * 0.3; pts.push(cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k); }
  poly(x, pts); x.fillStyle = ball(x, cx, cy, r, base); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.stroke();
}

const TILE = {
  drift(x, rnd, v) {
    const M = 30, at = (m = M) => m + rnd() * (CH - m * 2);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${150 + rnd() * 100 | 0},${170 + rnd() * 80 | 0},255,${0.1 + rnd() * 0.35})`; const s = rnd() * 1.4 + 0.4; x.fillRect(at(2), at(2), s, s); }
    for (let i = 0; i < 4; i++) { const px = at(80), py = at(80), r = 40 + rnd() * 40, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(120,140,190,.06)'); g.addColorStop(1, 'rgba(120,140,190,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
    const n = 7 + (rnd() * 6 | 0);
    for (let i = 0; i < n; i++) { const r = 3 + rnd() * 9; x.globalAlpha = 0.55; rockPoly(x, rnd, at(r + 4), at(r + 4), r, ['#4a4440', '#3a3e48', '#544a3e'][i % 3]); }
    x.globalAlpha = 1;
    if (v % 2 === 0) { // a big asteroid lying in the field
      const r = 34 + rnd() * 22, cx = at(r + 8), cy = at(r + 8); x.globalAlpha = 0.6; rockPoly(x, rnd, cx, cy, r, '#3e3a38', 12);
      for (let i = 0; i < 4; i++) { const a = rnd() * TAU, d = rnd() * r * 0.5, cr = 3 + rnd() * r * 0.18; circ(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d, cr); x.fillStyle = 'rgba(0,0,0,.28)'; x.fill(); }
      x.globalAlpha = 1;
    }
    for (let i = 0; i < 3; i++) { // ice shards
      const cx = at(), cy = at(), a = rnd() * TAU, l = 4 + rnd() * 6;
      x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = 'rgba(140,230,255,.45)'; poly(x, [0, -l, l * 0.35, 0, 0, l * 0.7, -l * 0.35, 0]); x.fill(); x.restore();
    }
    if (v === 3) { // a drifting hull plate from your ship
      x.save(); x.translate(at(70), at(70)); x.rotate(rnd() * TAU); x.globalAlpha = 0.6;
      x.fillStyle = '#3a4252'; x.beginPath(); x.roundRect(-38, -16, 76, 32, 3); x.fill(); x.strokeStyle = '#1c222c'; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = 'rgba(255,190,70,.6)'; for (let i = -3; i < 3; i++) { poly(x, [i * 10, -16, i * 10 + 6, -16, i * 10 - 2, -8, i * 10 - 8, -8]); x.fill(); }
      x.fillStyle = 'rgba(94,240,255,.5)'; x.fillRect(-30, 6, 18, 3);
      x.restore(); x.globalAlpha = 1;
    }
  },
  brood(x, rnd, v) {
    const M = 26, at = (m = M) => m + rnd() * (CH - m * 2);
    x.fillStyle = LOOKS.brood.bg; x.fillRect(0, 0, CH, CH);
    for (let i = 0; i < 9; i++) {
      const r = 40 + rnd() * 60, px = at(r), py = at(r), g = x.createRadialGradient(px, py, 0, px, py, r);
      const col = ['#3a1a40', '#2a1030', '#40202a'][i % 3]; g.addColorStop(0, rgba(col, 0.75)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    x.lineCap = 'round';
    for (let i = 0; i < 6; i++) { // veins
      const x0 = at(), y0 = at(), x1 = at(), y1 = at();
      x.strokeStyle = 'rgba(120,30,70,.55)'; x.lineWidth = 2 + rnd() * 3; x.beginPath(); x.moveTo(x0, y0); x.bezierCurveTo(at(), at(), at(), at(), x1, y1); x.stroke();
      x.strokeStyle = 'rgba(255,90,150,.12)'; x.lineWidth = 1; x.stroke();
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${90 + rnd() * 60 | 0},${40 + rnd() * 30 | 0},${80 + rnd() * 40 | 0},${0.25 + rnd() * 0.3})`; circ(x, at(4), at(4), 1 + rnd() * 3); x.fill(); }
    for (let i = 0; i < 2 + (v % 2); i++) { // pits
      const r = 10 + rnd() * 16, px = at(r + 6), py = at(r + 6);
      ell(x, px, py, r * 1.2, r); x.fillStyle = '#0a040c'; x.fill(); x.strokeStyle = 'rgba(160,80,140,.4)'; x.lineWidth = 2.5; x.stroke();
    }
    const eggs = v === 1 ? 2 : 1;
    for (let k = 0; k < eggs; k++) { // egg clusters
      const cx = at(40), cy = at(40), n = 4 + (rnd() * 5 | 0);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, 40); g.addColorStop(0, 'rgba(214,255,94,.18)'); g.addColorStop(1, 'rgba(214,255,94,0)'); x.fillStyle = g; x.fillRect(cx - 40, cy - 40, 80, 80);
      for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = rnd() * 18, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, r = 5 + rnd() * 4; ell(x, px, py, r, r * 1.25, rnd()); x.fillStyle = ball(x, px, py, r, '#c8b85a'); x.fill(); x.strokeStyle = 'rgba(60,40,10,.6)'; x.lineWidth = 0.8; x.stroke(); }
    }
    for (let i = 0; i < 3; i++) { // bone spikes
      const px = at(20), py = at(20), a = rnd() * TAU, l = 10 + rnd() * 14;
      x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = 'rgba(220,200,180,.55)'; x.beginPath(); x.moveTo(0, -3); x.quadraticCurveTo(l * 0.6, -4, l, 0); x.quadraticCurveTo(l * 0.6, 1, 0, 3); x.fill(); x.restore();
    }
  },
  station(x, rnd, v) {
    const T = 64;
    for (let i = 0; i < CH / T; i++) for (let j = 0; j < CH / T; j++) {
      const px = i * T, py = j * T, k = rnd();
      x.fillStyle = k > 0.85 ? '#181e28' : k > 0.4 ? '#141a23' : '#12171f'; x.fillRect(px, py, T, T);
      x.strokeStyle = '#0a0d12'; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, T - 2, T - 2);
      x.strokeStyle = 'rgba(255,255,255,.04)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px + 2, py + T - 2); x.lineTo(px + 2, py + 2); x.lineTo(px + T - 2, py + 2); x.stroke();
      x.fillStyle = 'rgba(160,170,190,.25)'; for (const [a, b] of [[6, 6], [T - 6, 6], [6, T - 6], [T - 6, T - 6]]) { circ(x, px + a, py + b, 1.3); x.fill(); }
      const r2 = rnd();
      if (r2 > 0.9) { // vent
        x.fillStyle = '#0b0f15'; x.fillRect(px + 14, py + 14, T - 28, T - 28);
        x.strokeStyle = '#2a3240'; x.lineWidth = 2; for (let s = 0; s < 5; s++) { x.beginPath(); x.moveTo(px + 16, py + 18 + s * 7); x.lineTo(px + T - 16, py + 18 + s * 7); x.stroke(); }
      } else if (r2 > 0.84) { // hazard stripes
        x.save(); x.beginPath(); x.rect(px + 4, py + 4, T - 8, T - 8); x.clip();
        for (let s = -T; s < T * 2; s += 14) { x.fillStyle = 'rgba(255,190,40,.16)'; poly(x, [px + s, py, px + s + 7, py, px + s + 7 - T, py + T, px + s - T, py + T]); x.fill(); }
        x.restore();
      } else if (r2 > 0.8) { // grate
        x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 1; for (let s = 8; s < T - 4; s += 6) { x.beginPath(); x.moveTo(px + s, py + 6); x.lineTo(px + s, py + T - 6); x.stroke(); }
      }
    }
    const M = 40, at = (m = M) => m + rnd() * (CH - m * 2);
    for (let i = 0; i < 2; i++) { // light strips along panel seams
      const horiz = rnd() > 0.5, a = Math.round(at() / T) * T, b0 = Math.round(at(64) / T) * T, len = T * (2 + (rnd() * 3 | 0));
      const col = rnd() > 0.3 ? '#5ef0ff' : '#ff5e6c';
      x.fillStyle = rgba(col, 0.5); if (horiz) x.fillRect(b0, a - 1.5, Math.min(len, CH - b0 - 8), 3); else x.fillRect(a - 1.5, b0, 3, Math.min(len, CH - b0 - 8));
    }
    x.lineCap = 'round';
    for (let i = 0; i < 1 + v % 2; i++) { // cables
      const x0 = at(), y0 = at(), x1 = at(), y1 = at();
      x.strokeStyle = '#06080c'; x.lineWidth = 5; x.beginPath(); x.moveTo(x0, y0); x.bezierCurveTo(at(), at(), at(), at(), x1, y1); x.stroke();
      x.strokeStyle = 'rgba(80,90,110,.5)'; x.lineWidth = 1.5; x.stroke();
    }
    for (let i = 0; i < 2; i++) { // scorch marks
      const px = at(30), py = at(30), r = 14 + rnd() * 18, g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    if (v === 2) { // floor marking
      x.fillStyle = 'rgba(255,255,255,.07)'; x.font = '700 22px Chakra Petch, sans-serif'; x.fillText('H-' + (10 + (rnd() * 80 | 0)), at(60), at(60));
    }
  },
};

function drawWorld(c, x0, y0, x1, y1) {
  const look = G.stage.look, tiles = buildTiles(look), seed = G.stage.id.charCodeAt(1);
  for (let cy = Math.floor(y0 / CH); cy * CH < y1; cy++) for (let cx = Math.floor(x0 / CH); cx * CH < x1; cx++) {
    c.drawImage(tiles[Math.floor(hash2(cx, cy, seed) * 4)], cx * CH, cy * CH, CH + 0.6, CH + 0.6);
  }
}

// Supply pods: breakable caches scattered through the world. They are enemies with ai 'prop' so every weapon can
// break them, but auto-aim ignores them.
function updatePods(dt) {
  G.podT -= dt;
  if (G.podT > 0) return;
  G.podT = 3;
  let near = 0;
  for (const e of E) if (!e.dead && e.prop) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 2400) e.dead = true; else if (d < 1500) near++; }
  if (near < 7) { const a = rr(0, TAU), d = rr(Math.hypot(G.view.w, G.view.h) / 2 + 60, 1300); spawnEnemy('pod', P.x + Math.cos(a) * d, P.y + Math.sin(a) * d); }
}
ENEMIES.pod = { id: 'pod', name: 'Supply Pod', hp: 1, spd: 0, dmg: 0, r: 12, xp: 0, ai: 'prop', kbRes: 1 };
