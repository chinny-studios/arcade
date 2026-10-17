// Minigame "photo": squeeze the camera bulb at the right moment, just as the flying machine leaves the rail.
// params: { speed: 1 }

Minigames.add('photo', {
  title: 'Take the picture',
  how: 'The camera is pointed at the end of the rail. Press the shutter just after the machine lifts off!',
  buttons() { return [{ id: 'snap', label: 'Squeeze the bulb', key: 'Space / E', keys: ['Space', 'KeyE', 'Enter'], cls: 'main' }]; },
  init(g, p) {
    g.x = -120; g.v = 0; g.y = 0; g.air = false; g.snap = null; g.flash = 0; g.wait = 1.2;
    g.k = (p.speed || 1) * (1 - g.assist * 0.15);
    g.lift = 560; g.runner = 0;
  },
  update(g, dt) {
    g.flash = Math.max(0, g.flash - dt * 2);
    if (g.snap) { g.snapT += dt; if (g.snapT > 2.2) { if (g.snap.ok) g.win(g.p.winText); else g.fail(g.snap.why); } return; }
    if (g.wait > 0) { g.wait -= dt; return; }
    g.v = Math.min(g.v + 120 * dt * g.k, 230 * g.k);
    g.x += g.v * dt;
    g.runner = Math.min(g.x, g.lift - 20);
    if (g.x > g.lift) { g.air = true; g.y = Math.min(70, (g.x - g.lift) * 0.35) + Math.sin((g.x - g.lift) / 50) * 8 * Math.min(1, (g.x - g.lift) / 100); }
    if (g.hit('snap')) {
      AU.ui('shutter'); g.flash = 1; g.snapT = 0;
      const inFrame = g.x > 440 && g.x < 820;
      if (!g.air) g.snap = { ok: false, why: 'Too early! The machine was still on the rail. Wait until you see it lift into the air.', x: g.x, y: g.y };
      else if (!inFrame) g.snap = { ok: false, why: 'Too late! It flew out of the picture. Squeeze the bulb as soon as it lifts off.', x: g.x, y: g.y };
      else g.snap = { ok: true, x: g.x, y: g.y };
    }
    if (g.x > 1100 && !g.snap) g.fail('It flew right past! Squeeze the bulb as soon as it lifts off the rail.');
  },
  flyer(c, x, y, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#efe6d0'; c.strokeStyle = '#5a4a3a'; c.lineWidth = 2;
    c.fillRect(-70, -40, 140, 7); c.strokeRect(-70, -40, 140, 7);
    c.fillRect(-70, -6, 140, 7); c.strokeRect(-70, -6, 140, 7);
    c.beginPath(); for (let i = -3; i <= 3; i++) { c.moveTo(i * 22, -33); c.lineTo(i * 22, -6); } c.stroke();
    c.fillRect(90, -28, 34, 5); c.beginPath(); c.moveTo(70, -20); c.lineTo(92, -26); c.stroke(); // elevator in front
    c.fillRect(-104, -38, 5, 30); c.beginPath(); c.moveTo(-70, -22); c.lineTo(-100, -22); c.stroke(); // rudder behind
    c.fillStyle = '#3a3a3a'; c.fillRect(-14, -14, 26, 8);
    c.restore();
  },
  draw(g, c, photo) {
    const sx = photo ? photo.x : g.x, sy = photo ? photo.y : g.y;
    D.sky(c, '#b8c4cc', '#e4e4dc', 360);
    c.fillStyle = '#c8b898'; c.fillRect(0, 360, 960, 180);
    c.fillStyle = 'rgba(120,140,150,.5)'; c.beginPath(); c.ellipse(250, 420, 90, 12, 0, 0, TAU); c.ellipse(820, 470, 120, 14, 0, 0, TAU); c.fill(); // icy puddles
    // the rail
    c.fillStyle = '#6a5034'; c.fillRect(-20, 392, g.lift + 40, 6);
    for (let x = 0; x < g.lift; x += 40) c.fillRect(x, 394, 8, 10);
    // the machine and Wilbur running beside it
    this.flyer(c, sx, 380 - sy, 1.1);
    if (!photo || !photo.ok) D.person(c, Math.min(g.runner, sx) - 30, 430, 90, '#3a3a40', '#e8c4a0', { phase: g.t * 9, lean: 0.25, arms: -1.4, hair: '#2a2a2a' });
    else D.person(c, g.lift - 40, 430, 90, '#3a3a40', '#e8c4a0', { lean: 0.1, arms: -0.3, hair: '#2a2a2a' });
    if (photo) return;
    // viewfinder
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.strokeRect(430, 200, 400, 260);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 0, 430, 540); c.fillRect(830, 0, 130, 540); c.fillRect(430, 0, 400, 200); c.fillRect(430, 460, 400, 80);
    D.text(c, 'camera view', 440, 222, { size: 15, color: 'rgba(255,255,255,.8)' });
    if (g.wait > 0) D.text(c, 'Ready…', 480, 120, { size: 30, align: 'center', color: '#fff', stroke: 'rgba(0,0,0,.4)' });
    if (g.snap) {
      // show the developed picture in black and white
      c.save(); c.fillStyle = 'rgba(20,20,20,.75)'; c.fillRect(0, 0, 960, 540);
      c.translate(260, 90); c.fillStyle = '#f4f0e8'; c.fillRect(-14, -14, 468, 328);
      c.beginPath(); c.rect(0, 0, 440, 300); c.clip();
      c.translate(-430 + 20, -200 + 20);
      c.filter = 'grayscale(1) contrast(1.1) sepia(.2)';
      this.draw(g, c, g.snap);
      c.restore(); c.filter = 'none';
      D.text(c, g.snap.ok ? 'What a picture!' : 'Hmm…', 480, 450, { size: 28, align: 'center', color: '#fff' });
    }
    if (g.flash > 0) { c.fillStyle = `rgba(255,255,255,${g.flash})`; c.fillRect(0, 0, 960, 540); }
  },
});
