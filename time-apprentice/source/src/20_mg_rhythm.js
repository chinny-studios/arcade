// Minigame "rhythm": press in time with the crew. Notes slide to a line; one or two lanes.
// params: { lanes: [{ label, key, color }], pattern: '0.0.1.', bpm, need (0..1), scene: 'sledge' | 'press' | fn(c, g, k), chant: [...] }

Minigames.add('rhythm', {
  title: 'Keep the rhythm',
  how: 'Press when a circle reaches the line.',
  buttons(g) {
    const L = g.lanes;
    if (L.length === 1) return [{ id: 'l0', label: L[0].label, key: L[0].key || 'Space / E', keys: ['Space', 'KeyE', 'Enter', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'] }];
    return [
      { id: 'l0', label: L[0].label, key: L[0].key || '← / A', keys: ['ArrowLeft', 'KeyA', 'KeyZ', 'KeyF'] },
      { id: 'l1', label: L[1].label, key: L[1].key || '→ / D', keys: ['ArrowRight', 'KeyD', 'KeyX', 'KeyE'] },
    ];
  },
  init(g, p) {
    g.lanes = p.lanes || [{ label: 'Pull!', color: '#e8a33c' }];
    const beat = 60 / (p.bpm || 84);
    g.beat = beat; g.lead = 2.2;
    g.win0 = 0.17 + g.assist * 0.05;
    g.need = clamp((p.need || 0.65) - g.assist * 0.1, 0.35, 1);
    g.notes = [];
    [...(p.pattern || '0.0.0.0.0.0.0.0.')].forEach((ch, i) => { if (ch !== '.') g.notes.push({ t: 1.5 + i * beat, lane: +ch, hit: false, miss: false }); });
    g.end = g.notes[g.notes.length - 1].t + 1.2;
    g.score = 0; g.flash = [0, 0]; g.pulse = 0; g.lastBeat = -1; g.prog = 0; g.fx = []; g.act = [0, 0];
  },
  update(g, dt) {
    const t = g.t;
    // a drum on every beat
    const b = Math.floor((t - 1.5) / g.beat);
    if (b > g.lastBeat && t > 1.5 - 0.01) { g.lastBeat = b; AU.tone(b % 2 ? 110 : 82, 0.15, { v: 0.18 }); g.pulse = 1; }
    g.pulse = Math.max(0, g.pulse - dt * 4);
    for (let L = 0; L < g.lanes.length; L++) {
      g.flash[L] = Math.max(0, g.flash[L] - dt * 4); g.act[L] = Math.max(0, g.act[L] - dt * 2.5);
      if (!g.hit('l' + L)) continue;
      let best = null, bd = 1e9;
      for (const n of g.notes) { if (n.lane !== L || n.hit || n.miss) continue; const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } }
      if (best && bd <= g.win0) { best.hit = true; g.score++; g.flash[L] = 1; g.act[L] = 1; AU.ui('hit'); g.fx.push({ L, t: 0, ok: true }); }
      else { AU.ui('miss'); g.fx.push({ L, t: 0, ok: false }); }
    }
    for (const n of g.notes) if (!n.hit && !n.miss && t - n.t > g.win0) n.miss = true;
    g.fx = g.fx.filter((f) => (f.t += dt) < 0.5);
    g.prog = lerp(g.prog, g.score / g.notes.length, Math.min(1, dt * 4));
    if (t > g.end) {
      const k = g.score / g.notes.length;
      if (k >= g.need) g.win(g.p.winText); else g.fail(g.p.failText || `You kept time on ${g.score} of ${g.notes.length} beats. Watch the circles and press just as they touch the line.`);
    }
  },
  draw(g, c) {
    const p = g.p, k = g.prog;
    // the scene in the upper part
    c.save(); c.beginPath(); c.rect(0, 0, 960, 340); c.clip();
    const scene = typeof p.scene === 'function' ? p.scene : RHYTHM_SCENES[p.scene] || RHYTHM_SCENES.sledge;
    scene(c, g, k);
    c.restore();
    // lanes
    const L = g.lanes, y0 = 350, lh = L.length === 1 ? 150 : 82;
    c.fillStyle = '#1e1a2a'; c.fillRect(0, 340, 960, 200);
    const hitX = 190;
    for (let i = 0; i < L.length; i++) {
      const y = y0 + 12 + i * (lh + 10), cy = y + lh / 2;
      D.rr(c, 20, y, 920, lh, 16); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill();
      c.strokeStyle = L[i].color || '#e8a33c'; c.lineWidth = 4 + g.flash[i] * 6;
      c.beginPath(); c.arc(hitX, cy, 30, 0, TAU); c.stroke();
      D.text(c, L[i].label, 40, cy + 8, { size: 20, color: L[i].color || '#e8a33c', align: 'left' });
      for (const n of g.notes) {
        if (n.lane !== i) continue;
        const x = hitX + (n.t - g.t) / g.lead * (960 - hitX);
        if (x < hitX - 80 || x > 990) continue;
        c.globalAlpha = n.hit ? Math.max(0, 1 - (g.t - n.t) * 3) : n.miss ? 0.3 : 1;
        c.fillStyle = n.hit ? '#fff' : L[i].color || '#e8a33c';
        c.beginPath(); c.arc(n.hit ? hitX : x, cy, n.hit ? 30 + (g.t - n.t) * 60 : 24, 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
      for (const f of g.fx) if (f.L === i) D.text(c, f.ok ? 'Great!' : 'Wait for it…', hitX, cy - 38 - f.t * 30, { size: 18, align: 'center', color: f.ok ? '#ffe680' : '#aab', stroke: '#1e1a2a' });
    }
    D.bar(c, 640, 20, 300, 18, k, '#8fdc6a');
    D.text(c, 'Progress', 630, 35, { size: 16, align: 'right', stroke: 'rgba(0,0,0,.5)' });
    if (p.chant && g.lastBeat >= 0 && g.t < g.end - 1) D.text(c, p.chant[g.lastBeat % p.chant.length], 480, 70, { size: 34 + g.pulse * 10, align: 'center', color: '#fff8e0', stroke: 'rgba(60,30,10,.6)', lw: 7 });
  },
});

const RHYTHM_SCENES = {
  // Giza: a block on a wooden sledge hauled over sand, with a man wetting the sand in front of it
  sledge(c, g, k) {
    D.sky(c, '#5aa0e0', '#f3dfb0', 300);
    c.fillStyle = '#e8d2a0'; c.beginPath(); c.moveTo(560, 250); c.lineTo(760, 90); c.lineTo(960, 250); c.fill();
    c.fillStyle = '#d6bd88'; c.beginPath(); c.moveTo(760, 90); c.lineTo(960, 250); c.lineTo(860, 250); c.fill();
    c.fillStyle = '#e2c48c'; c.fillRect(0, 250, 960, 90);
    const off = (k * 500) % 120;
    c.fillStyle = 'rgba(160,120,70,.25)'; for (let i = -1; i < 10; i++) c.fillRect(i * 120 - off, 300, 50, 6);
    const sx = 120 + k * 260, sy = 300;
    // wet sand in front of the sledge
    c.fillStyle = 'rgba(120,90,50,.45)'; c.beginPath(); c.ellipse(sx + 190, sy + 6, 50 + g.act[1] * 20, 8, 0, 0, TAU); c.fill();
    // sledge + block
    c.fillStyle = '#7a4f2a'; c.fillRect(sx, sy - 14, 170, 12); c.beginPath(); c.moveTo(sx + 170, sy - 14); c.quadraticCurveTo(sx + 195, sy - 14, sx + 190, sy - 2); c.lineTo(sx + 170, sy - 2); c.fill();
    c.fillStyle = '#efe8d8'; c.fillRect(sx + 20, sy - 104, 130, 90); c.fillStyle = '#d9d0bc'; c.fillRect(sx + 20, sy - 104, 130, 12);
    // rope and haulers
    c.strokeStyle = '#a07a40'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx + 185, sy - 10); c.lineTo(sx + 560, sy - 52); c.stroke();
    for (let i = 0; i < 5; i++) {
      const px = sx + 290 + i * 62, ph = g.t * 6 + i;
      D.person(c, px, sy, 74, '#f2ecdc', '#9a6a44', { phase: ph * (0.3 + g.act[0] * 0.7), lean: 0.35 + g.act[0] * 0.2, arms: Math.PI + 0.5, hair: '#1a120c' });
    }
    // water pourer
    const wx = sx + 215;
    D.person(c, wx, sy, 72, '#f2ecdc', '#8a5a34', { lean: -0.2, arms: -0.4 - g.act[1], hair: '#1a120c' });
    c.fillStyle = '#b5683a'; c.beginPath(); c.ellipse(wx + 20, sy - 82 + g.act[1] * 10, 11, 14, 0.5, 0, TAU); c.fill();
    if (g.act[1] > 0.1) { c.strokeStyle = 'rgba(90,160,220,.85)'; c.lineWidth = 5; c.beginPath(); c.moveTo(wx + 28, sy - 72); c.quadraticCurveTo(wx + 45, sy - 40, wx + 40, sy); c.stroke(); }
  },
  // Mainz: the pressman swings the bar of the screw press
  press(c, g, k) {
    c.fillStyle = '#3a2a1e'; c.fillRect(0, 0, 960, 340);
    c.fillStyle = '#efe6d0'; c.fillRect(40, 30, 880, 230);
    c.strokeStyle = '#3a2a1e'; c.lineWidth = 14; for (const x of [40, 260, 480, 700, 920]) { c.beginPath(); c.moveTo(x, 30); c.lineTo(x, 260); c.stroke(); }
    c.fillStyle = '#6a4a2e'; c.fillRect(0, 260, 960, 80);
    // the press
    const px = 520;
    c.fillStyle = '#5a3a20'; c.fillRect(px - 120, 40, 34, 260); c.fillRect(px + 86, 40, 34, 260); c.fillRect(px - 130, 40, 260, 30); c.fillRect(px - 130, 150, 260, 22);
    c.fillStyle = '#8a6a40'; c.fillRect(px - 10, 70, 20, 80 + g.act[0] * 14);
    c.fillStyle = '#7a5a34'; c.fillRect(px - 80, 150 + g.act[0] * 14, 160, 16);
    c.fillStyle = '#4a3020'; c.fillRect(px - 140, 222, 280, 24);
    c.fillStyle = '#f4ecd8'; c.fillRect(px - 100, 214, 200, 8);
    const a = -0.3 + g.act[0] * 1.1;
    c.save(); c.translate(px, 112); c.rotate(a); c.fillStyle = '#9a7a50'; c.fillRect(0, -6, 170, 12); c.restore();
    D.person(c, px + 170 + Math.cos(a) * 10, 300, 120, '#5a6a8a', '#e8b996', { lean: 0.3 * g.act[0], arms: a - 0.2, hair: '#5a3a1a' });
    // printed sheets stack up as you go
    for (let i = 0; i < Math.floor(k * 8); i++) { c.fillStyle = i % 2 ? '#f8f2e2' : '#efe6d2'; c.fillRect(120, 296 - i * 5, 120, 4); }
  },
};
