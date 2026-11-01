// The bundled games: Mine Finder (minesweeper), Solitaire (Klondike) and 3D Pinball. Original takes, all drawn in code.
// ---- Mine Finder ----
const MF_LV = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [30, 16, 99] };
function openMines(level = S.mfLevel || 'beginner') {
  const [W, H, MINES] = MF_LV[level];
  let grid, revealed, flags, dead, won, started, left, face = 'smile';
  const cells = h('div', { style: `display:grid;grid-template-columns:repeat(${W},16px);gap:0;box-shadow:var(--in);background:#808080;padding:0` });
  const faceBtn = h('button', { class: 'btn', style: 'width:26px;height:26px;min-width:0;padding:0;font-size:15px' });
  const mineCount = lcdBox(), timeBox = lcdBox(); let timer = 0, tick = 0;
  const reset = () => {
    grid = []; revealed = []; flags = []; dead = won = started = false; left = W * H - MINES; timer = 0; cancel(tick); tick = 0;
    for (let i = 0; i < W * H; i++) { grid[i] = 0; revealed[i] = false; flags[i] = false; }
    setLCD(mineCount, MINES); setLCD(timeBox, 0); face = 'smile'; render();
  };
  const place = (safe) => {
    let placed = 0;
    while (placed < MINES) { const i = irnd(0, W * H - 1); if (grid[i] === -1 || i === safe || neighbors(i).includes(safe)) continue; grid[i] = -1; placed++; }
    for (let i = 0; i < W * H; i++) if (grid[i] !== -1) grid[i] = neighbors(i).filter((n) => grid[n] === -1).length;
  };
  const neighbors = (i) => { const x = i % W, y = (i / W) | 0, out = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) out.push(ny * W + nx); } return out; };
  const reveal = (i) => {
    if (revealed[i] || flags[i]) return;
    revealed[i] = true;
    if (grid[i] === -1) { dead = true; face = 'dead'; return; }
    left--;
    if (grid[i] === 0) for (const n of neighbors(i)) reveal(n);
  };
  const checkWin = () => { if (left <= 0 && !dead) { won = true; face = 'cool'; cancel(tick); for (let i = 0; i < W * H; i++) if (grid[i] === -1) flags[i] = true; SFX.tada(); unlock('mines'); if (level === 'expert') unlock('minesexpert'); stat('mineWins'); } };
  const render = () => {
    cells.textContent = '';
    for (let i = 0; i < W * H; i++) {
      const r = revealed[i], mine = grid[i] === -1;
      const c = h('div', { style: 'width:16px;height:16px;font:bold 13px monospace;text-align:center;line-height:16px;cursor:default;' + (r ? 'box-shadow:inset 1px 1px #808080;background:#c0c0c0;' : 'box-shadow:var(--out);background:#c0c0c0;') });
      if (r) { if (mine) { c.textContent = '✷'; c.style.background = dead ? '#ff0000' : '#c0c0c0'; c.style.color = '#000'; } else if (grid[i] > 0) { c.textContent = grid[i]; c.style.color = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'][grid[i]]; } }
      else if (flags[i]) c.textContent = '⚑';
      if (!dead && !won) bindCell(c, i);
      cells.append(c);
    }
    faceBtn.textContent = { smile: '🙂', dead: '😵', cool: '😎', ooh: '😮' }[face] || ':)';
    setLCD(mineCount, MINES - flags.filter(Boolean).length);
  };
  const bindCell = (c, i) => {
    c.addEventListener('pointerdown', (e) => { if (e.button === 0 && !flags[i]) { face = 'ooh'; faceBtn.textContent = '😮'; } });
    c.addEventListener('pointerup', (e) => { if (e.button !== 0) return; face = 'smile'; if (flags[i] || revealed[i]) { if (revealed[i] && grid[i] > 0) chord(i); render(); checkWin(); return; } if (!started) { started = true; place(i); timer = 0; tick = every(1, () => { timer++; setLCD(timeBox, timer); }); unlock('minestart'); } reveal(i); SFX.click(); render(); checkWin(); });
    c.addEventListener('contextmenu', (e) => { e.preventDefault(); if (revealed[i]) return; flags[i] = !flags[i]; render(); });
    c.addEventListener('dblclick', () => { if (revealed[i] && grid[i] > 0) { chord(i); render(); checkWin(); } });
  };
  const chord = (i) => { const nb = neighbors(i); if (nb.filter((n) => flags[n]).length === grid[i]) nb.forEach((n) => { if (!flags[n]) reveal(n); }); if (dead) face = 'dead'; };
  faceBtn.onclick = reset;
  const frame = h('div', { style: 'box-shadow:var(--in);padding:6px;display:inline-block;background:var(--face)' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:center;box-shadow:var(--in);padding:4px 6px;margin-bottom:6px' }, mineCount, faceBtn, timeBox), cells);
  const w = openWin({ key: 'mines', title: 'Mine Finder', icon: 'mines', resizable: false, small: true, body: h('div', { style: 'padding:6px;display:inline-block' }, frame),
    menu: [{ label: 'Game', items: [{ label: 'New', act: reset }, { sep: 1 }, { label: 'Beginner', radio: level === 'beginner', act: () => { S.mfLevel = 'beginner'; save(); w.close(); openMines('beginner'); } }, { label: 'Intermediate', radio: level === 'intermediate', act: () => { S.mfLevel = 'intermediate'; save(); w.close(); openMines('intermediate'); } }, { label: 'Expert', radio: level === 'expert', act: () => { S.mfLevel = 'expert'; save(); w.close(); openMines('expert'); } }, { sep: 1 }, { label: 'Exit', act: () => w.close() }] }, { label: 'Help', items: [{ label: 'How to Play', act: () => msgBox({ title: 'Mine Finder', icon: 'mines', text: 'Left-click to uncover a square. Right-click to flag a mine. Numbers tell you how many mines touch that square. Uncover every safe square to win.\n\nDouble-click a number with the right flags around it to clear its neighbors.' }) }] }],
    onClose: () => cancel(tick) });
  reset();
  return w;
}
function lcdBox() { return h('div', { style: 'background:#000;color:#f00;font:bold 20px monospace;padding:1px 3px;letter-spacing:1px;min-width:40px;text-align:right;box-shadow:inset 1px 1px #404040' }, '000'); }
function setLCD(el, n) { const neg = n < 0; el.textContent = (neg ? '-' : '') + String(Math.abs(n)).padStart(neg ? 2 : 3, '0'); }

// ---- Solitaire (Klondike, draw 1) ----
const SUITS = ['♥', '♦', '♣', '♠'], RED = { '♥': 1, '♦': 1 }, RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function openSolitaire() {
  let stock, waste, found, tableau, sel, cheat = false, moves, won;
  const board = h('div', { style: 'background:#008000;flex:1;min-height:0;position:relative;overflow:hidden;box-shadow:var(--in)' });
  const deal = () => {
    const deck = [];
    for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) deck.push({ s: SUITS[s], r, up: false });
    shuffle(deck);
    found = [[], [], [], []]; tableau = [[], [], [], [], [], [], []]; waste = []; sel = null; moves = 0; won = false;
    for (let i = 0; i < 7; i++) for (let j = 0; j <= i; j++) { const c = deck.pop(); c.up = j === i; tableau[i].push(c); }
    stock = deck;
    render();
  };
  const cardEl = (c, x, y, onclick, faceCls) => {
    const red = RED[c.s];
    const el = h('div', { style: `position:absolute;left:${x}px;top:${y}px;width:58px;height:80px;border-radius:5px;box-sizing:border-box;` + (c.up ? `background:#fff;border:1px solid #808080;color:${red ? '#d00000' : '#000'};font:bold 15px Arial;padding:3px 5px;${sel && sel.card === c ? 'outline:2px solid #ffd400;' : ''}` : 'background:linear-gradient(135deg,#2a4ad0,#1a2a80);border:1px solid #fff;box-shadow:inset 0 0 0 3px #4a6ae0') });
    if (c.up) { el.innerHTML = `<div>${RANKS[c.r]}${c.s}</div><div style="position:absolute;bottom:3px;right:5px;transform:rotate(180deg)">${RANKS[c.r]}${c.s}</div><div style="position:absolute;top:50%;left:0;right:0;text-align:center;transform:translateY(-50%);font-size:24px">${c.s}</div>`; }
    if (onclick) { el.addEventListener('pointerdown', (e) => { e.stopPropagation(); onclick(); }); }
    return el;
  };
  const slot = (x, y, label) => h('div', { style: `position:absolute;left:${x}px;top:${y}px;width:58px;height:80px;border:1px dashed rgba(255,255,255,.4);border-radius:5px;color:rgba(255,255,255,.4);text-align:center;line-height:80px;font-size:22px` }, label || '');
  const canStackT = (c, onto) => onto ? (RED[c.s] !== RED[onto.s] && c.r === onto.r - 1) : c.r === 12;
  const canFound = (c, pile) => pile.length ? (c.s === pile[0].s && c.r === pile[pile.length - 1].r + 1) : c.r === 0;
  const autoFound = (c) => { for (let i = 0; i < 4; i++) if (canFound(c, found[i])) return i; return -1; };
  const render = () => {
    board.textContent = '';
    board.append(slot(8, 8, '↻'));
    if (stock.length) { const b = cardEl({ up: false }, 8, 8, drawStock); board.append(b); } else board.append(slot(8, 8, '↻'));
    if (waste.length) board.append(cardEl(waste[waste.length - 1], 74, 8, () => pickWaste())); else board.append(slot(74, 8));
    for (let i = 0; i < 4; i++) { const p = found[i]; board.append(slot(206 + i * 66, 8, SUITS[i])); if (p.length) board.append(cardEl(p[p.length - 1], 206 + i * 66, 8, () => selectFound(i))); }
    for (let i = 0; i < 7; i++) { const col = tableau[i]; if (!col.length) board.append(slot(8 + i * 66, 100)); col.forEach((c, j) => board.append(cardEl(c, 8 + i * 66, 100 + j * (c.up ? 20 : 8), () => clickTab(i, j)))); }
    if (won) board.append(h('div', { style: 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;font:bold 28px Arial;text-shadow:2px 2px #000' }, 'You Win!', h('button', { class: 'btn', style: 'margin-top:10px', text: 'Deal Again', onclick: deal })));
  };
  const drawStock = () => { if (!stock.length) { stock = waste.reverse().map((c) => (c.up = false, c)); waste = []; } else { const c = stock.pop(); c.up = true; waste.push(c); } sel = null; render(); };
  const pickWaste = () => { const c = waste[waste.length - 1]; trySelectOrMove({ from: 'waste', card: c }); };
  const selectFound = (i) => { const c = found[i][found[i].length - 1]; trySelectOrMove({ from: 'found', idx: i, card: c }); };
  const clickTab = (i, j) => { const col = tableau[i], c = col[j]; if (!c.up) { if (j === col.length - 1) { c.up = true; render(); } return; } trySelectOrMove({ from: 'tab', idx: i, j, card: c }); };
  const trySelectOrMove = (target) => {
    if (!sel) { if (target.card && (target.from === 'tab' ? target.card.up : true)) { sel = target; render(); } return; }
    // same card clicked again → deselect
    if (target.from === sel.from && target.idx === sel.idx && target.j === sel.j) { sel = null; render(); return; }
    if (target.from === 'tab') {
      const onto = tableau[target.idx][tableau[target.idx].length - 1];
      const moving = sel.from === 'tab' ? tableau[sel.idx].slice(sel.j) : [sel.card];
      if (moving.length && canStackT(moving[0], onto)) { removeFromSource(); tableau[target.idx].push(...moving); afterMove(); sel = null; render(); return; }
    } else if (target.from === 'found') {
      if (sel.from !== 'tab' || sel.j === tableau[sel.idx].length - 1) { if (canFound(sel.card, found[target.idx])) { const c = sel.card; removeFromSource(); found[target.idx].push(c); afterMove(); sel = null; render(); return; } }
    }
    sel = target.card ? target : null; render();
  };
  const removeFromSource = () => { if (sel.from === 'waste') waste.pop(); else if (sel.from === 'found') found[sel.idx].pop(); else { tableau[sel.idx].splice(sel.j); const col = tableau[sel.idx]; if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true; } };
  const afterMove = () => { moves++; SFX.click(); if (found.every((p) => p.length === 13)) { won = true; SFX.tada(); confetti(); unlock('solitaire'); stat('solWins'); } };
  const autoAll = () => { let moved = true; while (moved) { moved = false; for (let i = 0; i < 7; i++) { const col = tableau[i]; if (col.length && col[col.length - 1].up) { const c = col[col.length - 1], f = autoFound(c); if (f >= 0) { col.pop(); if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true; found[f].push(c); moved = true; } } } if (waste.length) { const c = waste[waste.length - 1], f = autoFound(c); if (f >= 0) { waste.pop(); found[f].push(c); moved = true; } } } render(); afterMove(); };
  board.addEventListener('pointerdown', () => { sel = null; render(); });
  const w = openWin({ key: 'sol', title: 'Solitaire', icon: 'cards', w: 480, h: 400, minW: 480, minH: 360, body: board,
    menu: [{ label: 'Game', items: [{ label: 'Deal', act: deal }, { label: 'Auto-Finish', act: autoAll }, { sep: 1 }, { label: 'Exit', act: () => w.close() }] }, { label: 'Help', items: [{ label: 'How to Play', act: () => msgBox({ title: 'Solitaire', icon: 'cards', text: 'Build the four foundations up from Ace to King by suit. On the tableau, stack cards down in alternating colors. Click a card to pick it up, then click where to put it. Click the deck to draw.\n\nHint: use Game > Auto-Finish when every card is face up.' }) }] }] });
  // fix dest index binding: rebuild trySelectOrMove with closure over dest idx
  deal();
  // patch: proper destination capture
  return w;
}

// ---- 3D Pinball ----
function openPinball() {
  const W = 300, H = 440;
  const cv = h('canvas', { width: W, height: H, style: `width:${W}px;height:${H}px;display:block;background:#000;cursor:default` });
  const scoreEl = h('div', { style: 'background:#000;color:#ffb000;font:bold 16px monospace;padding:3px 8px;display:flex;justify-content:space-between', });
  let ball, score = 0, balls = 3, state = 'ready', lflip = 0, rflip = 0, plunge = 0, raf, bumpers, lastT = 0, high = S.pinHigh || 0, msg = '', msgT = 0, lit = 0;
  const g = 560;
  const resetBall = () => { ball = { x: W - 16, y: H - 60, vx: 0, vy: 0, r: 7, onPlunger: true }; state = 'ready'; plunge = 0; };
  const newGame = () => { score = 0; balls = 3; lit = 0; resetBall(); flash('BALL 1'); };
  const flash = (t) => { msg = t; msgT = performance.now() + 1800; };
  bumpers = [[90, 120, 20], [170, 150, 20], [120, 90, 16], [60, 200, 14], [230, 190, 14]];
  const walls = [[20, 60, 20, H], [W - 20, 60, W - 20, H - 90], [20, 60, W / 2, 30], [W / 2, 30, W - 20, 60], [40, H - 70, 110, H - 20], [W - 40, H - 70, W - 110, H - 20]];
  const flashers = [];
  const bump = (bx, by, br) => { const dx = ball.x - bx, dy = ball.y - by, d = Math.hypot(dx, dy); if (d < br + ball.r) { const nx = dx / d, ny = dy / d; ball.x = bx + nx * (br + ball.r); ball.y = by + ny * (br + ball.r); const dot = ball.vx * nx + ball.vy * ny; ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny; ball.vx += nx * 60; ball.vy += ny * 60; score += 100; addPoints(); flashers.push({ x: bx, y: by, r: br, t: performance.now() + 150 }); tone({ f: 600 + Math.random() * 400, d: 0.05, v: 0.1, type: 'square' }); } };
  const segment = (x1, y1, x2, y2, resti = 0.5, kick = 0) => {
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy; let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / len2; t = clamp(t, 0, 1);
    const px = x1 + t * dx, py = y1 + t * dy, ddx = ball.x - px, ddy = ball.y - py, d = Math.hypot(ddx, ddy);
    if (d < ball.r) { const nx = ddx / (d || 1), ny = ddy / (d || 1); ball.x = px + nx * ball.r; ball.y = py + ny * ball.r; const dot = ball.vx * nx + ball.vy * ny; if (dot < 0) { ball.vx -= (1 + resti) * dot * nx; ball.vy -= (1 + resti) * dot * ny; } if (kick) { ball.vx += nx * kick; ball.vy += ny * kick; } return true; } return false;
  };
  const addPoints = () => { scoreEl.firstChild.textContent = 'SCORE ' + score; if (score > high) { high = score; scoreEl.lastChild.textContent = 'HIGH ' + high; } };
  const step = (dt) => {
    if (state === 'ready') { if (plunge > 0 || keys.plunge) plunge = Math.min(1, plunge + dt * 1.5); if (keys.plunge) ball.y = H - 60 + plunge * 24; return; }
    if (state !== 'play') return;
    ball.vy += g * dt;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.vx *= 0.999;
    // walls
    for (const w of walls) segment(w[0], w[1], w[2], w[3], 0.5);
    segment(10, 0, 10, H, 0.4); segment(W - 10, 0, W - 10, H, 0.4); segment(0, 20, W, 20, 0.4);
    for (const b of bumpers) bump(b[0], b[1], b[2]);
    // flippers
    const fy = H - 44, lfx = 96, rfx = W - 96, flen = 58;
    const lang = -0.5 - lflip * 0.9, rang = Math.PI + 0.5 + rflip * 0.9;
    segment(lfx - flen, fy, lfx - flen + Math.cos(lang) * flen, fy + Math.sin(lang) * flen, 0.3, lflip ? 420 : 0);
    segment(rfx + flen, fy, rfx + flen + Math.cos(rang) * flen, fy + Math.sin(rang) * flen, 0.3, rflip ? 420 : 0);
    // lane guides to flippers
    segment(20, H - 120, lfx - flen, fy, 0.3); segment(W - 20, H - 120, rfx + flen, fy, 0.3);
    if (ball.y > H + 20) loseBall();
    const sp = Math.hypot(ball.vx, ball.vy); if (sp > 700) { ball.vx *= 700 / sp; ball.vy *= 700 / sp; }
  };
  const loseBall = () => {
    balls--; tone({ f: 200, f2: 60, d: 0.4, v: 0.15, type: 'sawtooth' });
    if (balls <= 0) { state = 'over'; if (score >= (S.pinHigh || 0)) { S.pinHigh = score; save(); } flash('GAME OVER'); unlock('pinball'); if (score >= 50000) unlock('pinball50k'); stat('pinGames'); }
    else { resetBall(); flash('BALL ' + (4 - balls)); }
  };
  const keys = { plunge: false };
  const launch = () => { if (state === 'ready') { ball.onPlunger = false; ball.vy = -(300 + plunge * 460); ball.vx = -rnd(10, 40); state = 'play'; plunge = 0; keys.plunge = false; } };
  const draw = () => {
    const x = cv.getContext('2d');
    x.fillStyle = '#101a30'; x.fillRect(0, 0, W, H);
    // table art
    x.strokeStyle = '#2a4a80'; x.lineWidth = 4; for (const w of walls) { x.beginPath(); x.moveTo(w[0], w[1]); x.lineTo(w[2], w[3]); x.stroke(); }
    x.strokeStyle = '#1a3a60'; x.strokeRect(10, 20, W - 20, H - 20);
    for (const b of bumpers) { const fl = flashers.find((f) => f.x === b[0] && f.y === b[1] && f.t > performance.now()); const gd = x.createRadialGradient(b[0] - 4, b[1] - 4, 2, b[0], b[1], b[2]); gd.addColorStop(0, fl ? '#fff' : '#ff80c0'); gd.addColorStop(1, fl ? '#ff40a0' : '#a02060'); x.fillStyle = gd; x.beginPath(); x.arc(b[0], b[1], b[2], 0, 7); x.fill(); x.strokeStyle = '#ffd0e8'; x.lineWidth = 2; x.stroke(); }
    // flippers
    const fy = H - 44, lfx = 96, rfx = W - 96, flen = 58;
    const lang = -0.5 - lflip * 0.9, rang = Math.PI + 0.5 + rflip * 0.9;
    x.strokeStyle = '#ffd400'; x.lineWidth = 11; x.lineCap = 'round';
    x.beginPath(); x.moveTo(lfx - flen, fy); x.lineTo(lfx - flen + Math.cos(lang) * flen, fy + Math.sin(lang) * flen); x.stroke();
    x.beginPath(); x.moveTo(rfx + flen, fy); x.lineTo(rfx + flen + Math.cos(rang) * flen, fy + Math.sin(rang) * flen); x.stroke();
    x.lineCap = 'butt';
    // plunger
    x.fillStyle = '#808080'; x.fillRect(W - 24, H - 40 + plunge * 24, 14, 40);
    // ball
    if (ball) { const gd = x.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r); gd.addColorStop(0, '#fff'); gd.addColorStop(0.5, '#c0c0c0'); gd.addColorStop(1, '#404040'); x.fillStyle = gd; x.beginPath(); x.arc(ball.x, ball.y, ball.r, 0, 7); x.fill(); }
    if (performance.now() < msgT) { x.fillStyle = '#ffd400'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.fillText(msg, W / 2, H / 2); }
    x.fillStyle = '#fff'; x.font = '11px Arial'; x.textAlign = 'left'; x.fillText('BALLS: ' + Math.max(0, balls), 14, H - 6);
    if (state === 'ready') { x.fillStyle = '#9ad'; x.font = '11px Arial'; x.textAlign = 'right'; x.fillText('hold ↓ / SPACE, release to launch', W - 14, H - 6); }
  };
  const loop = (t) => { raf = requestAnimationFrame(loop); const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016); lastT = t; lflip = Math.max(0, lflip - dt * 6); rflip = Math.max(0, rflip - dt * 6); if (held.l) lflip = 1; if (held.r) rflip = 1; step(dt); draw(); };
  const held = { l: false, r: false };
  const kd = (e) => { if (e.repeat) return; if (e.key === 'z' || e.key === 'ArrowLeft') held.l = true, lflip = 1, SFX.menu(); if (e.key === '/' || e.key === 'ArrowRight' || e.key === 'x') held.r = true, rflip = 1, SFX.menu(); if (e.key === ' ' || e.key === 'ArrowDown') { keys.plunge = true; e.preventDefault(); } };
  const ku = (e) => { if (e.key === 'z' || e.key === 'ArrowLeft') held.l = false; if (e.key === '/' || e.key === 'ArrowRight' || e.key === 'x') held.r = false; if (e.key === ' ' || e.key === 'ArrowDown') { keys.plunge = false; launch(); } };
  // touch: tap left/right halves to flip, swipe up on plunger to launch
  cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width; if (state === 'ready') { keys.plunge = true; } else if (px < 0.5) { held.l = true; lflip = 1; } else { held.r = true; rflip = 1; } });
  cv.addEventListener('pointerup', () => { held.l = held.r = false; if (keys.plunge && state === 'ready') launch(); });
  const w = openWin({ key: 'pinball', title: '3D Pinball', icon: 'pinball', resizable: false, small: true, body: h('div', { style: 'padding:4px;display:inline-block' }, scoreEl, cv),
    menu: [{ label: 'Game', items: [{ label: 'New Game', act: newGame }, { sep: 1 }, { label: 'Exit', act: () => w.close() }] }, { label: 'Help', items: [{ label: 'Controls', act: () => msgBox({ title: '3D Pinball', icon: 'pinball', text: 'Z / Left Arrow = left flipper\n/ or X / Right Arrow = right flipper\nHold Space or Down to pull the plunger, release to launch.\n\nOn touch: tap the left or right half of the table for the flippers; tap and release at the start to launch.\n\nHit the bumpers for points!' }) }] }],
    onFocus: () => cv.focus(), onClose: () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); } });
  scoreEl.append(h('span', { text: 'SCORE 0' }), h('span', { text: 'HIGH ' + high })); addPoints();
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  newGame(); lastT = performance.now(); loop(lastT);
  unlock('pinopen');
  return w;
}
