// Tidebound: the title screen. An animated dusk sea with a lighthouse and its rotating beam, the TIDEBOUND logo,
// a Lumarine swimming past now and then, and the CONTINUE / NEW GAME / OPTIONS menu.
// Title.show() resolves with 'new' or 'continue'. Only `Title` is declared at top level.

const Title = (() => {
  const INK = '#404040';
  let logo = null;
  let wave = null;
  let lumarine = null;
  let stars = null;

  function sfx(name) { try { if (typeof Sound !== 'undefined') Sound.play(name); } catch (_) {} }
  function center(g, s, xc, y, color, shadow) { drawText(g, s, Math.round(xc - textWidth(s) / 2), y, color, shadow); }
  function panel(g, x, y, w, h) { UI.box(g, x, y, w, h, 'white'); }

  // A copy of src filled with one colour (only where src is opaque).
  function tinted(src, color, w, h) {
    return makeCanvas(w, h, (c, g) => {
      g.drawImage(src, 0, 0, w, h);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, w, h);
    });
  }

  // The logo: 'TIDEBOUND' at 3x with a gold-to-orange gradient, a dark-blue outline and a drop shadow.
  function buildLogo() {
    const text = 'TIDEBOUND';
    const S = 3, OW = 2, pad = OW + 2;
    // letters spaced 2px wider than the font so the outlines don't merge at 3x
    const adv = [...text].map((ch) => textWidth(ch) + 3);
    const mask = makeCanvas(adv.reduce((a, b) => a + b, 0) + 4, 12, (c, g) => {
      let x = 2;
      [...text].forEach((ch, i) => { drawText(g, ch, x, 2, '#ffffff', null); x += adv[i]; });
    });
    const bw = mask.width * S, bh = mask.height * S;
    const fill = makeCanvas(bw, bh, (c, g) => {
      const grd = g.createLinearGradient(0, 0, 0, bh);
      grd.addColorStop(0, '#fff8c0');
      grd.addColorStop(0.5, '#ffc83c');
      grd.addColorStop(1, '#e8601c');
      g.fillStyle = grd;
      g.fillRect(0, 0, bw, bh);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(mask, 0, 0, bw, bh);
    });
    const ink = tinted(mask, '#16224e', bw, bh);
    const shadow = tinted(mask, 'rgba(8,12,30,0.55)', bw, bh);
    const offsets = [[-OW, 0], [OW, 0], [0, -OW], [0, OW], [-OW, -OW], [OW, -OW], [-OW, OW], [OW, OW]];
    return makeCanvas(bw + pad * 2 + 2, bh + pad * 2 + 2, (c, g) => {
      g.drawImage(shadow, pad + 2, pad + 3);
      for (const [dx, dy] of offsets) g.drawImage(ink, pad + dx, pad + dy);
      g.drawImage(fill, pad, pad);
    });
  }

  // Summary of the saved game for the CONTINUE box, or null when there is no readable save.
  function saveSummary() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      const caught = d.dex && d.dex.caught ? Object.keys(d.dex.caught).filter((k) => d.dex.caught[k]).length : 0;
      return { name: d.name || 'KAI', dex: caught, time: d.time || 0, badges: (d.badges || []).length };
    } catch (_) {
      return null;
    }
  }

  function drawSky(g) {
    const grd = g.createLinearGradient(0, 0, 0, 112);
    grd.addColorStop(0, '#0e1a40');
    grd.addColorStop(0.55, '#3c3a78');
    grd.addColorStop(1, '#e8845a');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, 112);
  }
  function drawStars(g, t) {
    if (!stars) {
      stars = [];
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 36; i++) stars.push([Math.floor(rnd() * W), Math.floor(rnd() * 60), rnd() * 6]);
    }
    for (const [x, y, ph] of stars) {
      const a = 0.35 + 0.35 * Math.sin(t * 1.5 + ph);
      g.fillStyle = `rgba(255,255,240,${a.toFixed(2)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  function drawLighthouse(g, t) {
    const x = 44;
    g.fillStyle = '#161a30';
    for (let y = 68; y <= 112; y++) {
      const hw = Math.round(4 + ((y - 68) / 44) * 4);
      g.fillRect(x - hw, y, hw * 2, 1);
    }
    g.fillRect(x - 6, 64, 12, 4);   // gallery
    g.fillRect(x - 4, 56, 8, 8);    // lamp room
    g.fillRect(x - 3, 52, 6, 4);    // roof
    g.fillStyle = '#ffe79a';
    g.fillRect(x - 3, 58, 6, 4);    // lit windows
    // the rotating beam: two opposite wedges
    const ang = t * 0.8;
    g.save();
    g.globalAlpha = 0.22;
    g.fillStyle = '#fff2b0';
    for (const a of [ang, ang + Math.PI]) {
      const spread = 0.13, len = 240;
      g.beginPath();
      g.moveTo(x, 60);
      g.lineTo(x + Math.cos(a - spread) * len, 60 + Math.sin(a - spread) * len);
      g.lineTo(x + Math.cos(a + spread) * len, 60 + Math.sin(a + spread) * len);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  function drawSea(g, t) {
    const grd = g.createLinearGradient(0, 112, 0, H);
    grd.addColorStop(0, '#3a6aa8');
    grd.addColorStop(1, '#0c1e40');
    g.fillStyle = grd;
    g.fillRect(0, 112, W, H - 112);
    if (!wave) {
      wave = makeCanvas(16, 4, (c, gw) => {
        gw.fillStyle = '#9cc8ec';
        gw.fillRect(1, 1, 5, 1);
        gw.fillRect(9, 2, 5, 1);
        gw.fillStyle = '#6aa0d8';
        gw.fillRect(4, 2, 2, 1);
      });
    }
    const pat = g.createPattern(wave, 'repeat');
    [116, 124, 133, 143, 155, 168].forEach((y, i) => {
      g.save();
      const dir = i % 2 ? 1 : -1;
      g.translate(dir * ((t * (6 + i * 2)) % 16), 0);
      g.fillStyle = pat;
      g.fillRect(-16, y, W + 32, 4);
      g.restore();
    });
  }
  // Lumarine swims right to left, every 20 seconds, for 11 of them.
  function drawSwimmer(g, t) {
    const period = 20, on = 11;
    const k = t % period;
    if (k > on) return;
    if (!lumarine) lumarine = Sprites.mon('lumarine');
    const p = k / on;
    const x = W + 6 - p * (W + 90);
    const y = 114 + Math.sin(t * 2) * 3;
    g.drawImage(lumarine, Math.round(x), Math.round(y));
  }
  function drawLogo(g, t) {
    if (!logo) logo = buildLogo();
    g.drawImage(logo, Math.round((W - logo.width) / 2), 8 + Math.round(Math.sin(t * 1.6)));
  }
  function drawSaveBox(g, sum) {
    panel(g, 4, 112, 128, 58);
    const hours = Math.floor(sum.time / 3600);
    const mins = String(Math.floor(sum.time / 60) % 60).padStart(2, '0');
    drawText(g, sum.name, 12, 118, INK);
    drawText(g, `DEX ${sum.dex}/${DEX_ORDER.length}`, 12, 131, INK);
    drawText(g, `TIME ${hours}:${mins}`, 12, 144, INK);
    drawText(g, `BADGES ${sum.badges}`, 12, 157, INK);
  }
  function drawScreen(g, s) {
    const t = Timers.time;
    drawSky(g);
    drawStars(g, t);
    g.fillStyle = '#f4ecd0';
    g.beginPath();
    g.arc(282, 26, 9, 0, Math.PI * 2);
    g.fill();
    drawLighthouse(g, t);
    drawSea(g, t);
    drawSwimmer(g, t);
    drawLogo(g, t);
    if (s.phase === 'idle') {
      if (Math.floor(t * 2) % 2 === 0) center(g, 'PRESS START', 160, 96, '#fff8e0', '#101828');
      g.fillStyle = 'rgba(8,14,32,0.6)';
      g.fillRect(0, 160, W, 20);
      center(g, "(C) Chinny's Arcade - fan-style original", 160, 162, '#e8e8f0', '#101020');
      center(g, 'Z/Space: A  X/Shift: B  Esc/Tab: START  arrows/WASD', 160, 171, '#c8d0e0', '#101020');
    } else if (s.summary) {
      drawSaveBox(g, s.summary);
    }
  }

  // The CONTINUE / NEW GAME / OPTIONS menu. Resolves with 'continue' or 'new'.
  async function menu(s) {
    for (;;) {
      s.phase = 'menu';
      s.summary = saveSummary();
      const labels = s.summary ? ['CONTINUE', 'NEW GAME', 'OPTIONS'] : ['NEW GAME', 'OPTIONS'];
      const label = labels[await UI.choose(labels, { x: 206, y: 112, w: 100 })];
      if (label === 'CONTINUE') return 'continue';
      if (label === 'NEW GAME') {
        if (!s.summary || (await UI.yesno('Start a new game? Your saved game will be overwritten.'))) return 'new';
      } else if (label === 'OPTIONS') {
        await Menus.options();
      }
    }
  }

  // Shows the title screen. Resolves with 'new' or 'continue'; the caller loads the save for 'continue'.
  function show() {
    return new Promise((resolve) => {
      const s = { name: 'title', opaque: true, phase: 'idle', busy: false, summary: null };
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        Scenes.pop(s);
        resolve(v);
      };
      s.update = () => {
        if (s.busy || s.phase !== 'idle') return;
        if (Input.pressed('a') || Input.pressed('start')) {
          s.busy = true;
          sfx('select');
          menu(s).then(finish);
        }
      };
      s.draw = (g) => drawScreen(g, s);
      Scenes.push(s);
      try { if (typeof Music !== 'undefined') Music.play('title'); } catch (_) {}
    });
  }

  return { show };
})();
DBG.title = Title;
