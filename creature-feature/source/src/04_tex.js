// Creature Feature — canvas textures: the moon, glows, blood splats, neon signs, the drive-in's movie and the
// mummy's bandages

const TEX = {};
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.anisotropy = 2; return t; }

function makeTextures() {
  // moon: a pale disc with maria and a soft halo
  {
    const [c, x] = cnv(256, 256);
    const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, 'rgba(220,230,255,0.55)'); g.addColorStop(0.3, 'rgba(160,180,255,0.18)'); g.addColorStop(1, 'rgba(120,140,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#f4f2e4'; x.beginPath(); x.arc(128, 128, 38, 0, TAU); x.fill();
    x.fillStyle = 'rgba(160,160,150,0.45)';
    for (const [a, b, r] of [[116, 118, 11], [138, 112, 8], [132, 140, 13], [112, 140, 6], [146, 132, 5]]) { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }
    TEX.moon = canvasTex(c);
  }
  // a soft round glow for light pools and halos
  {
    const [c, x] = cnv(64, 64);
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    TEX.glow = canvasTex(c);
  }
  // a soft puff for dust, sand and mist
  {
    const [c, x] = cnv(64, 64);
    for (let i = 0; i < 7; i++) {
      const px = 20 + Math.random() * 24, py = 20 + Math.random() * 24, r = 12 + Math.random() * 10;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    }
    TEX.puff = canvasTex(c);
  }
  // blood splats: a 2x2 atlas of irregular pools
  {
    const [c, x] = cnv(256, 256);
    for (let k = 0; k < 4; k++) {
      const ox = (k % 2) * 128 + 64, oy = Math.floor(k / 2) * 128 + 64;
      x.fillStyle = 'rgba(120,0,4,0.95)';
      x.beginPath();
      for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, r = 30 + Math.sin(a * 3 + k) * 6 + Math.random() * 10; x.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r); }
      x.fill();
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * TAU, d = 34 + Math.random() * 24, r = 2 + Math.random() * 7;
        x.beginPath(); x.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d, r, 0, TAU); x.fill();
      }
      x.fillStyle = 'rgba(70,0,0,0.5)';
      x.beginPath(); x.arc(ox - 4, oy + 3, 16, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,80,80,0.25)';
      x.beginPath(); x.arc(ox + 8, oy - 9, 7, 0, TAU); x.fill();
    }
    TEX.blood = canvasTex(c);
  }
  // the mummy's bandages: overlapping off-white strips
  {
    const [c, x] = cnv(64, 64);
    x.fillStyle = '#c9bc98'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 22; i++) {
      const y = Math.random() * 64, h = 3 + Math.random() * 5, s = (Math.random() - 0.5) * 18;
      x.fillStyle = `hsl(42, ${18 + Math.random() * 18}%, ${58 + Math.random() * 22}%)`;
      x.beginPath(); x.moveTo(0, y); x.lineTo(64, y + s); x.lineTo(64, y + s + h); x.lineTo(0, y + h); x.fill();
      x.strokeStyle = 'rgba(60,45,20,0.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, y); x.lineTo(64, y + s); x.stroke();
    }
    TEX.bandage = canvasTex(c);
    TEX.bandage.wrapS = TEX.bandage.wrapT = THREE.RepeatWrapping;
  }
  // werewolf fur: dark streaks
  {
    const [c, x] = cnv(64, 64);
    x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 260; i++) {
      const px = Math.random() * 64, py = Math.random() * 64, l = 3 + Math.random() * 6;
      x.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.15 + Math.random() * 0.25})`;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 2, py + l); x.stroke();
    }
    TEX.fur = canvasTex(c);
    TEX.fur.wrapS = TEX.fur.wrapT = THREE.RepeatWrapping;
  }
  TEX.movie = makeMovie();
}

// a neon sign texture: glowing text on transparent, returns { tex, aspect }
function neonTex(text, color, o = {}) {
  const font = o.font || 'bold 64px "Bangers", Impact, "Arial Black", sans-serif';
  const [m, mx] = cnv(8, 8); mx.font = font;
  const w = Math.ceil(mx.measureText(text).width + 40), h = 100;
  const [c, x] = cnv(w, h);
  if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, w, h); x.strokeStyle = color; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8); }
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = 18; x.fillStyle = color;
  x.fillText(text, w / 2, h / 2 + 4); x.fillText(text, w / 2, h / 2 + 4);
  x.shadowBlur = 0; x.fillStyle = o.core || '#ffffff'; x.globalAlpha = 0.7; x.fillText(text, w / 2, h / 2 + 4);
  return { tex: canvasTex(c), aspect: w / h };
}
// a sign board with dark letters on a lit face
function boardTex(lines, o = {}) {
  const w = o.w || 512, h = o.h || 128;
  const [c, x] = cnv(w, h);
  x.fillStyle = o.bg || '#f4ecd0'; x.fillRect(0, 0, w, h);
  if (o.bulbs) { x.fillStyle = '#ffe9a0'; for (let i = 8; i < w; i += 22) { x.beginPath(); x.arc(i, 7, 4, 0, TAU); x.arc(i, h - 7, 4, 0, TAU); x.fill(); } }
  x.fillStyle = o.ink || '#1a1a1a'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lh = (h - 20) / lines.length;
  lines.forEach((t, i) => { x.font = `bold ${Math.floor(lh * 0.78)}px "Bangers", Impact, "Arial Black", sans-serif`; x.fillText(t, w / 2, 10 + lh * (i + 0.55)); });
  return canvasTex(c);
}

// the drive-in picture: a black-and-white flying saucer menacing a town, redrawn a few times a second
function makeMovie() {
  const [c, x] = cnv(256, 128);
  const tex = canvasTex(c);
  let t = 0;
  tex.tick = (dt) => {
    t += dt;
    const sc = Math.floor(t / 9) % 3;
    const flick = 0.85 + Math.random() * 0.15;
    x.fillStyle = `rgb(${30 * flick},${30 * flick},${34 * flick})`; x.fillRect(0, 0, 256, 128);
    if (sc === 0) {
      // a saucer over the skyline with a death ray
      x.fillStyle = '#4a4a4c'; for (let i = 0; i < 12; i++) x.fillRect(i * 22, 80 - (i * 37 % 30), 18, 60);
      const sx = 128 + Math.sin(t * 0.7) * 70, sy = 34 + Math.sin(t * 1.3) * 6;
      x.fillStyle = '#d8d8d8'; x.beginPath(); x.ellipse(sx, sy, 34, 8, 0, 0, TAU); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(sx, sy - 6, 14, 9, 0, Math.PI, TAU); x.fill();
      if (Math.sin(t * 2) > 0.3) { x.fillStyle = 'rgba(255,255,255,0.75)'; x.beginPath(); x.moveTo(sx - 4, sy + 6); x.lineTo(sx + 4, sy + 6); x.lineTo(sx + 26, 128); x.lineTo(sx - 26, 128); x.fill(); }
    } else if (sc === 1) {
      // close-up: a screaming face
      x.fillStyle = '#bcbcbc'; x.beginPath(); x.ellipse(128, 70, 40, 52, 0, 0, TAU); x.fill();
      x.fillStyle = '#2a2a2a'; x.beginPath(); x.ellipse(112, 58, 7, 9, 0, 0, TAU); x.ellipse(144, 58, 7, 9, 0, 0, TAU); x.fill();
      const mo = 12 + Math.abs(Math.sin(t * 9)) * 8;
      x.beginPath(); x.ellipse(128, 96, 11, mo, 0, 0, TAU); x.fill();
      x.fillStyle = '#5a5a5a'; x.fillRect(80, 10, 96, 22);
    } else {
      // a giant ant over the hills
      x.fillStyle = '#5a5a5a'; x.beginPath(); x.moveTo(0, 128); x.quadraticCurveTo(80, 70, 256, 110); x.lineTo(256, 128); x.fill();
      const ax = 60 + (t % 9) * 14;
      x.fillStyle = '#101010';
      x.beginPath(); x.ellipse(ax, 70, 18, 11, 0, 0, TAU); x.ellipse(ax + 26, 64, 10, 9, 0, 0, TAU); x.ellipse(ax + 44, 56, 9, 7, 0, 0, TAU); x.fill();
      x.strokeStyle = '#101010'; x.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const k = Math.sin(t * 8 + i * 2) * 5; x.beginPath(); x.moveTo(ax + 20 + i * 6, 68); x.lineTo(ax + 10 + i * 10 + k, 96); x.stroke(); }
      x.beginPath(); x.moveTo(ax + 48, 52); x.lineTo(ax + 60, 36); x.stroke();
    }
    // scratches and grain
    x.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * 256, Math.random() * 128, 1, 1);
    if (Math.random() < 0.3) { x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(Math.random() * 256, 0, 1, 128); }
    tex.needsUpdate = true;
  };
  tex.tick(0);
  return tex;
}
