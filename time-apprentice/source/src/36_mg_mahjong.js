// Minigame "mahjong": learn how a winning mahjong hand works. A winning hand is four sets and a pair: a set is three
// of the same tile (a pung) or three in a row in one suit (a chow). Rounds:
//   'sets'  sort your fourteen tiles into four sets and a pair, three tiles at a time
//   'wait'  you have thirteen tiles: which tile on the table would win?
// params: { rounds: ['sets', 'wait'], seed }

const MJ = {
  SUITS: { d: 'dots', b: 'bamboo', c: 'characters' },
  NUM: ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'],
  HONOR: ['', '東', '南', '西', '北', '中', '發', '白'],
  HNAME: ['', 'East wind', 'South wind', 'West wind', 'North wind', 'Red dragon', 'Green dragon', 'White dragon'],
  key: (t) => t.s + t.n,
  name(t) { return t.s === 'z' ? this.HNAME[t.n] : t.n + ' of ' + this.SUITS[t.s]; },
  order: { d: 0, b: 1, c: 2, z: 3 },
  sort(a) { return a.slice().sort((p, q) => this.order[p.s] - this.order[q.s] || p.n - q.n); },
  // can these tiles (sorted) all be split into sets?
  sets(a) {
    if (!a.length) return true;
    const t = a[0], same = a.filter((q) => q.s === t.s && q.n === t.n);
    if (same.length >= 3) { const r = a.slice(); for (let k = 0; k < 3; k++) r.splice(r.findIndex((q) => q.s === t.s && q.n === t.n), 1); if (this.sets(r)) return true; }
    if (t.s !== 'z') {
      const i1 = a.findIndex((q) => q.s === t.s && q.n === t.n + 1), i2 = a.findIndex((q) => q.s === t.s && q.n === t.n + 2);
      if (i1 > 0 && i2 > 0) { const r = a.filter((q, i) => i !== 0 && i !== i1 && i !== i2); if (this.sets(r)) return true; }
    }
    return false;
  },
  // four sets and a pair (or fewer sets and a pair, for a partly sorted hand)
  wins(a) {
    a = this.sort(a); if (a.length % 3 !== 2) return false;
    const seen = new Set();
    for (let i = 0; i < a.length - 1; i++) {
      const k = this.key(a[i]); if (seen.has(k)) continue; seen.add(k);
      const j = a.findIndex((q, jj) => jj > i && this.key(q) === k); if (j < 0) continue;
      if (this.sets(a.filter((q, ii) => ii !== i && ii !== j))) return true;
    }
    return false;
  },
  kind(three) {
    const s = this.sort(three);
    if (s.every((q) => this.key(q) === this.key(s[0]))) return 'pung';
    if (s[0].s !== 'z' && s.every((q) => q.s === s[0].s) && s[1].n === s[0].n + 1 && s[2].n === s[0].n + 2) return 'chow';
    return null;
  },
  deal(r) {
    for (let tries = 0; tries < 200; tries++) {
      const out = [], count = {};
      const add = (s, n) => { const k = s + n; count[k] = (count[k] || 0) + 1; out.push({ s, n }); };
      for (let i = 0; i < 4; i++) {
        const suit = 'dbc'[Math.floor(r() * 3)];
        if (r() < 0.6) { const n = 1 + Math.floor(r() * 7); add(suit, n); add(suit, n + 1); add(suit, n + 2); }
        else if (r() < 0.3) { const n = 1 + Math.floor(r() * 7); for (let k = 0; k < 3; k++) add('z', n); }
        else { const n = 1 + Math.floor(r() * 9); for (let k = 0; k < 3; k++) add(suit, n); }
      }
      const ps = r() < 0.25 ? 'z' : 'dbc'[Math.floor(r() * 3)], pn = 1 + Math.floor(r() * (ps === 'z' ? 7 : 9)); add(ps, pn); add(ps, pn);
      if (Object.values(count).every((v) => v <= 4)) return out;
    }
    return null;
  },
};

Minigames.add('mahjong', {
  title: 'Mahjong with Grandma',
  how: 'A winning hand is *four sets and a pair*. A set is three the same, or three in a row in the same suit.',
  init(g, p) {
    g.rounds = p.rounds || ['sets', 'wait']; g.ri = 0; g.mist = 0; g.r = mulberry32((p.seed || 7) + g.tries * 13);
    this.round(g);
  },
  round(g) {
    g.kind = g.rounds[g.ri]; g.sel = 0; g.pick = []; g.melds = []; g.doneT = 0; g.shake = 0;
    const deal = MJ.deal(g.r);
    if (g.kind === 'sets') { g.hand = MJ.sort(deal); g.table = []; }
    else {
      // take away one tile that the hand is waiting for, and offer it with two that wouldn't help
      const full = MJ.sort(deal);
      let wi = 0; for (let k = 0; k < 30; k++) { wi = Math.floor(g.r() * full.length); if (full[wi].s !== 'z' || g.r() < 0.2) break; }
      const win = full[wi]; g.hand = full.filter((q, i) => i !== wi);
      const wrong = [];
      for (let k = 0; k < 200 && wrong.length < 2; k++) {
        const s = 'dbcz'[Math.floor(g.r() * 4)], t = { s, n: 1 + Math.floor(g.r() * (s === 'z' ? 7 : 9)) };
        if (MJ.wins(g.hand.concat([t])) || wrong.some((w) => MJ.key(w) === MJ.key(t))) continue;
        wrong.push(t);
      }
      g.table = shuffle([Object.assign({ win: true }, win)].concat(wrong), g.r);
    }
  },
  mistake(g, text) { g.mist++; AU.ui('bad'); g.shake = 0.4; g.tip(text, 3.6); if (g.mist >= 7) g.fail('Mahjong takes practice! Remember: three the same, or three in a row in the same suit, and one pair.'); },
  pickTile(g, i) {
    if (g.doneT) return;
    AU.ui('clack');
    if (g.kind === 'wait') {
      const t = g.table[i]; if (!t) return;
      if (t.win) { g.hand = MJ.sort(g.hand.concat([t])); g.table = []; g.doneT = 0.01; AU.ui('ok'); g.tip('*Sik wu!* That tile makes four sets and a pair. You win the hand!', 2.6); }
      else this.mistake(g, `The *${MJ.name(t)}* doesn't finish your hand. Look for the set or the pair that is one tile short.`);
      return;
    }
    const k = g.pick.indexOf(i);
    if (k >= 0) { g.pick.splice(k, 1); return; }
    g.pick.push(i);
    if (g.pick.length < 3) return;
    const three = g.pick.map((j) => g.hand[j]), kind = MJ.kind(three);
    const rest = g.hand.filter((q, j) => !g.pick.includes(j));
    if (!kind) {
      const s = MJ.sort(three);
      this.mistake(g, s.every((q) => q.s === s[0].s) && s[0].s !== 'z' ? 'Those are the same suit, but not *three in a row* (like 4, 5, 6).' : 'A set must be *three the same* or *three in a row in one suit*. Those don\'t match.');
      g.pick = []; return;
    }
    if (!MJ.wins(rest)) { this.mistake(g, `That is a real ${kind === 'pung' ? 'pung (three the same)' : 'chow (three in a row)'}, but then the other tiles can't all fit together. Try a different set!`); g.pick = []; return; }
    AU.ui('ok'); g.melds.push(MJ.sort(three)); g.hand = rest; g.pick = []; g.sel = 0;
    g.tip(kind === 'pung' ? '*Pung!* Three the same.' : '*Chow!* Three in a row.', 1.4);
    if (g.hand.length === 2) { g.melds.push(g.hand); g.hand = []; g.doneT = 0.01; g.tip('And the last two are a *pair*. *Sik wu!* That\'s a winning hand!', 2.6); }
  },
  update(g, dt) {
    g.shake = Math.max(0, g.shake - dt);
    if (g.doneT) { g.doneT += dt; if (g.doneT > 2.4) { g.ri++; if (g.ri >= g.rounds.length) g.win(g.p.winText); else { this.round(g); g.tip(g.rounds[g.ri] === 'wait' ? 'Now you have *thirteen* tiles. Which tile on the table would win?' : 'Another hand!', 3); } } return; }
    const list = g.kind === 'wait' ? g.table : g.hand, n = list.length; if (!n) return;
    if (Input.hit('ArrowRight') || Input.hit('KeyD')) g.sel = (g.sel + 1) % n;
    if (Input.hit('ArrowLeft') || Input.hit('KeyA')) g.sel = (g.sel + n - 1) % n;
    if (Input.hit('KeyE') || Input.hit('Space') || Input.hit('Enter')) this.pickTile(g, g.sel);
    if (Input.hit('KeyQ')) g.pick = [];
  },
  layout(g) {
    const n = g.hand.length, w = Math.min(58, 860 / Math.max(1, n) - 4);
    return { w, h: w * 1.36, x0: 480 - (n * (w + 4) - 4) / 2, y: 330 };
  },
  tap(g, x, y) {
    if (g.kind === 'wait') { g.table.forEach((t, i) => { const tx = 330 + i * 110; if (x > tx && x < tx + 80 && y > 140 && y < 250) { g.sel = i; this.pickTile(g, i); } }); return; }
    const L = this.layout(g);
    const i = Math.floor((x - L.x0) / (L.w + 4));
    if (y > L.y - 20 && y < L.y + L.h && i >= 0 && i < g.hand.length) { g.sel = i; this.pickTile(g, i); }
  },
  tile(c, t, x, y, w, o = {}) {
    const h = w * 1.36;
    D.rr(c, x, y + 4, w, h, w * 0.12); c.fillStyle = '#2a7a5a'; c.fill();
    D.rr(c, x, y, w, h - 2, w * 0.12); c.fillStyle = o.hl ? '#fff8d8' : '#f4eedc'; c.fill();
    c.strokeStyle = o.on ? '#ff8a2a' : 'rgba(0,0,0,.25)'; c.lineWidth = o.on ? 4 : 1.5; c.stroke();
    const cx = x + w / 2, cy = y + h / 2 - 2;
    if (t.s === 'd') {
      const pos = { 1: [[0, 0]], 2: [[0, -1], [0, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
        7: [[-1, -1.2], [0, -0.9], [1, -0.6], [-1, 0.4], [1, 0.4], [-1, 1.2], [1, 1.2]], 8: [[-1, -1.2], [1, -1.2], [-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4], [-1, 1.2], [1, 1.2]], 9: [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] }[t.n];
      const s = t.n === 1 ? w * 0.3 : t.n <= 4 ? w * 0.15 : w * 0.11;
      pos.forEach(([a, b], i) => { c.fillStyle = ['#2a5aa8', '#c8302a', '#2a8a4a'][(i + t.n) % 3]; c.beginPath(); c.arc(cx + a * w * 0.26, cy + b * h * 0.28, s, 0, TAU); c.fill(); c.fillStyle = '#f4eedc'; c.beginPath(); c.arc(cx + a * w * 0.26, cy + b * h * 0.28, s * 0.45, 0, TAU); c.fill(); });
    } else if (t.s === 'b') {
      const cols = t.n <= 3 ? t.n : t.n <= 6 ? 3 : t.n === 9 ? 3 : 4, rows = Math.ceil(t.n / cols);
      for (let i = 0; i < t.n; i++) {
        const r = Math.floor(i / cols), k = i % cols, rowN = Math.min(cols, t.n - r * cols);
        const bx = cx + (k - (rowN - 1) / 2) * w * 0.22, by = cy + (r - (rows - 1) / 2) * h * (0.6 / rows);
        c.fillStyle = t.n === 1 || (t.n >= 5 && i === Math.floor(t.n / 2)) ? '#c8302a' : '#2a8a4a';
        D.rr(c, bx - w * 0.06, by - h * 0.25 / rows * 1.6, w * 0.12, h * 0.5 / rows * 1.4, 3); c.fill();
      }
    } else if (t.s === 'c') {
      D.text(c, MJ.NUM[t.n], cx, cy - h * 0.06, { size: w * 0.42, align: 'center', color: '#1a1a2a', font: CJK });
      D.text(c, '萬', cx, cy + h * 0.32, { size: w * 0.42, align: 'center', color: '#c8302a', font: CJK });
    } else {
      if (t.n === 7) { c.strokeStyle = '#2a5aa8'; c.lineWidth = 3; c.strokeRect(x + w * 0.2, y + h * 0.18, w * 0.6, h * 0.6); }
      else D.text(c, MJ.HONOR[t.n], cx, cy + w * 0.2, { size: w * 0.6, align: 'center', color: t.n === 5 ? '#c8302a' : t.n === 6 ? '#2a8a4a' : '#1a1a2a', font: CJK });
    }
  },
  draw(g, c) {
    // the green baize of the mahjong table
    c.fillStyle = '#2a6a4a'; c.fillRect(0, 0, 960, 540);
    c.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 40; i++) c.fillRect((i * 97) % 960, (i * 53) % 540, 3, 3);
    D.text(c, `Hand ${g.ri + 1} of ${g.rounds.length}`, 30, 36, { size: 20, color: '#e8f4e0' });
    D.text(c, g.kind === 'sets' ? 'Tap three tiles to make a set: three the same, or three in a row in one suit.' : 'Grandma and her friends put these on the table. Which one wins your hand?', 480, 72, { size: 18, align: 'center', color: '#fff8e0' });
    // sets you've made
    let mx = 40;
    for (const m of g.melds) { m.forEach((t, i) => this.tile(c, t, mx + i * 42, 100, 40)); mx += m.length * 42 + 18; }
    if (g.kind === 'wait') {
      g.table.forEach((t, i) => { const dx = i === g.sel && g.shake > 0 ? Math.sin(g.shake * 60) * 5 : 0; this.tile(c, t, 330 + i * 110 + dx, 140, 80, { hl: i === g.sel }); });
    }
    const L = this.layout(g);
    g.hand.forEach((t, i) => {
      const on = g.pick.includes(i), dx = on && g.shake > 0 ? Math.sin(g.shake * 60) * 5 : 0;
      this.tile(c, t, L.x0 + i * (L.w + 4) + dx, L.y - (on ? 18 : 0), L.w, { on, hl: g.kind === 'sets' && i === g.sel });
    });
    // a key to the suits
    const ky = 470;
    this.tile(c, { s: 'd', n: 3 }, 60, ky, 30); D.text(c, 'dots', 98, ky + 26, { size: 15, color: '#e8f4e0' });
    this.tile(c, { s: 'b', n: 3 }, 170, ky, 30); D.text(c, 'bamboo', 208, ky + 26, { size: 15, color: '#e8f4e0' });
    this.tile(c, { s: 'c', n: 3 }, 300, ky, 30); D.text(c, 'characters (三 = 3)', 338, ky + 26, { size: 15, color: '#e8f4e0' });
    this.tile(c, { s: 'z', n: 5 }, 510, ky, 30); D.text(c, 'dragons and winds', 548, ky + 26, { size: 15, color: '#e8f4e0' });
    for (let i = 0; i < 7; i++) { c.fillStyle = i < g.mist ? '#c8302a' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(760 + i * 22, ky + 20, 7, 0, TAU); c.fill(); }
  },
});
