// Valor Bay — canvas textures: comic clouds, soft blobs for shadows and particles, the hit-spark star, the web
// splat and the shockwave ring. The street map is drawn by the city (05_city.js).

const TEX = {};
function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (o.aniso) t.anisotropy = Math.min(8, R.renderer.capabilities.getMaxAnisotropy());
  t.canvas = c;
  return t;
}
function makeTextures() {
  // a puffy comic cloud with a dark ink outline
  TEX.cloud = canvasTex(256, 128, (g, w, h) => {
    const rnd = RNG(3), puffs = [];
    for (let i = 0; i < 9; i++) puffs.push([rnd.range(50, 206), rnd.range(54, 80), rnd.range(22, 40)]);
    puffs.push([128, 82, 44]);
    g.fillStyle = '#2a2a40';
    for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r + 4, 0, TAU); g.fill(); }
    g.fillRect(40, 86, 176, 18);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillRect(44, 86, 168, 14);
    g.fillStyle = '#dfe8f6';
    for (const [x, y, r] of puffs) { g.beginPath(); g.arc(x + r * 0.2, y + r * 0.35, r * 0.6, 0, TAU); g.fill(); }
    g.clearRect(0, 100, w, h);
  });
  TEX.blob = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  TEX.soft = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  // a hard-edged round puff for smoke and dust (reads as a cartoon cloud)
  TEX.puff = canvasTex(64, 64, (g) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(38, 40, 18, 0, TAU); g.fill();
  });
  // an eight-point comic star for hits
  TEX.star = canvasTex(128, 128, (g) => {
    const pts = (r1, r2, n) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, r = i % 2 ? r2 : r1; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); };
    pts(62, 26, 9); g.fillStyle = '#1a1424'; g.fill();
    pts(55, 22, 9); g.fillStyle = '#ffd820'; g.fill();
    pts(34, 14, 9); g.fillStyle = '#fff8d0'; g.fill();
  });
  TEX.web = canvasTex(128, 128, (g) => {
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); g.stroke(); }
    g.lineWidth = 2;
    for (let r = 12; r < 64; r += 12) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * TAU; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); }
  });
  TEX.ring = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 30, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.85, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}
