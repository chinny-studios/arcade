// Icons, all drawn in code on a 32×32 grid (scaled for 16 and 24 px). icon(name, size) → data URL; img(name, size).
const ICONS = {};
const _icache = {};
function icon(name, size = 32) {
  const k = name + '@' + size;
  if (_icache[k]) return _icache[k];
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'); x.scale(size / 32, size / 32); x.lineJoin = 'round'; x.lineCap = 'round';
  try { (ICONS[name] || ICONS.app)(x); } catch (e) { console.error('icon', name, e); }
  return (_icache[k] = c.toDataURL());
}
function img(name, size = 32, cls) { return h('img', { src: icon(name, size), width: size, height: size, class: cls, draggable: 'false', alt: '' }); }

// drawing helpers: all take the ctx first
function R_(x, X, Y, w, hh, fill, stroke, lw = 1) { if (fill) { x.fillStyle = fill; x.fillRect(X, Y, w, hh); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw; x.strokeRect(X + 0.5, Y + 0.5, w - 1, hh - 1); } }
function C_(x, cx, cy, r, fill, stroke, lw = 1) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw; x.stroke(); } }
function E_(x, cx, cy, rx, ry, fill, stroke, lw = 1) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw; x.stroke(); } }
function P_(x, pts, fill, stroke, lw = 1, open) { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); if (!open) x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw; x.stroke(); } }
function G_(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function RG_(x, cx, cy, r, stops) { const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
function T_(x, s, X, Y, font, fill, align = 'center') { x.font = font; x.fillStyle = fill; x.textAlign = align; x.textBaseline = 'middle'; x.fillText(s, X, Y); }
function page_(x, fold = true) {
  P_(x, [[6, 2], [21, 2], [27, 8], [27, 30], [6, 30]], '#fff', '#000');
  if (fold) P_(x, [[21, 2], [21, 8], [27, 8]], '#c0c0c0', '#000');
}
function monitor_(x, scr) {
  R_(x, 3, 3, 26, 19, '#d4d0c8', '#000');
  R_(x, 6, 6, 20, 13, scr || G_(x, 0, 6, 0, 19, ['#1c5fd0', '#0a246a']), '#404040');
  R_(x, 11, 22, 10, 3, '#a8a49c', '#000');
  P_(x, [[4, 25], [28, 25], [30, 30], [2, 30]], '#d4d0c8', '#000');
  R_(x, 6, 27, 20, 1, '#808080');
}
function folder_(x, c1 = '#ffe27a', c2 = '#d9a800') {
  P_(x, [[2, 8], [11, 8], [14, 11], [29, 11], [29, 27], [2, 27]], G_(x, 0, 8, 0, 27, [c1, c2]), '#6b5200');
  P_(x, [[2, 13], [29, 13]], null, 'rgba(255,255,255,.7)', 1, true);
}

Object.assign(ICONS, {
  app(x) { R_(x, 3, 5, 26, 22, '#fff', '#000'); R_(x, 4, 6, 24, 4, '#000080'); R_(x, 24, 7, 3, 2, '#c0c0c0'); R_(x, 6, 13, 9, 9, '#c0c0c0', '#808080'); R_(x, 17, 13, 9, 3, '#808080'); R_(x, 17, 18, 7, 2, '#808080'); },
  exe(x) { ICONS.app(x); },
  computer(x) { monitor_(x); P_(x, [[8, 8], [14, 8], [9, 15]], 'rgba(255,255,255,.25)'); },
  recycle(x) {
    P_(x, [[7, 7], [25, 7], [23, 30], [9, 30]], G_(x, 7, 0, 25, 0, ['#e8e8e8', '#9a9a9a']), '#000');
    E_(x, 16, 7, 10, 2.5, '#d0d0d0', '#000');
    x.strokeStyle = '#6a6a6a'; for (const X of [11, 16, 21]) { x.beginPath(); x.moveTo(X, 11); x.lineTo(X + (X - 16) * 0.12, 27); x.stroke(); }
    P_(x, [[13, 16], [16, 12], [19, 16]], null, '#1a8a1a', 2, true); P_(x, [[18, 21], [14, 23], [13, 19]], null, '#1a8a1a', 2, true);
  },
  recyclefull(x) { ICONS.recycle(x); P_(x, [[9, 6], [13, 1], [18, 4], [22, 1], [24, 7]], '#fff', '#000'); P_(x, [[12, 5], [17, 3], [20, 6]], null, '#909090'); },
  folder(x) { folder_(x); },
  docs(x) { folder_(x); P_(x, [[8, 4], [20, 4], [24, 8], [24, 14], [8, 14]], '#fff', '#000'); R_(x, 10, 7, 9, 1, '#000080'); R_(x, 10, 10, 11, 1, '#808080'); folder_(x, 'rgba(255,226,122,.0)', 'rgba(0,0,0,0)'); P_(x, [[2, 14], [29, 14], [29, 27], [2, 27]], G_(x, 0, 14, 0, 27, ['#ffe27a', '#d9a800']), '#6b5200'); },
  music(x) { folder_(x); T_(x, '\u266B', 17, 20, 'bold 13px Arial', '#5a1a8a'); },
  globe(x) {
    C_(x, 16, 16, 12, RG_(x, 16, 16, 13, ['#bfe4ff', '#2c7be0', '#0b3a8a']), '#082a66');
    x.save(); x.beginPath(); x.arc(16, 16, 11.5, 0, 7); x.clip();
    P_(x, [[8, 9], [14, 7], [16, 11], [12, 15], [13, 20], [9, 19], [6, 14]], '#38a838');
    P_(x, [[18, 15], [24, 13], [27, 18], [23, 25], [19, 22]], '#38a838'); x.restore();
    x.save(); x.translate(16, 16); x.rotate(-0.45); E_(x, 0, 0, 15, 5, null, '#ffcc33', 2.2); x.restore();
    C_(x, 16, 16, 12, null, '#082a66');
  },
  snapster(x) {
    // a snapping turtle with headphones
    E_(x, 15, 25, 12, 5, '#6d4c1f', '#2a1a00');
    C_(x, 15, 16, 10, RG_(x, 15, 16, 10, ['#9be05a', '#4f9a20', '#2b5e10']), '#173a05');
    P_(x, [[19, 18], [29, 17], [26, 22], [19, 22]], '#f2d36b', '#3a2a00');
    P_(x, [[20, 20], [27, 19.5]], null, '#3a2a00', 1, true);
    C_(x, 17, 12, 3, '#fff', '#000'); C_(x, 18, 12, 1.4, '#000');
    x.beginPath(); x.arc(15, 15, 11, Math.PI * 1.05, Math.PI * 1.95); x.strokeStyle = '#111'; x.lineWidth = 2.5; x.stroke();
    R_(x, 3, 13, 5, 8, '#d02020', '#000'); R_(x, 23, 7, 5, 6, '#d02020', '#000');
  },
  buddy(x) {
    P_(x, [[4, 4], [28, 4], [28, 20], [14, 20], [8, 26], [9, 20], [4, 20]], G_(x, 0, 4, 0, 20, ['#7fc2ff', '#1a6ad0']), '#0a2a6a');
    C_(x, 19, 19, 9, RG_(x, 19, 19, 9, ['#fff6a0', '#ffd400', '#d09000']), '#6a4a00');
    C_(x, 16, 17, 1.3, '#000'); C_(x, 22, 17, 1.3, '#000');
    x.beginPath(); x.arc(19, 20, 4.5, 0.2, Math.PI - 0.2); x.strokeStyle = '#000'; x.lineWidth = 1.3; x.stroke();
  },
  zapamp(x) {
    R_(x, 2, 6, 28, 20, G_(x, 0, 6, 0, 26, ['#4a4a5a', '#16161e']), '#000');
    R_(x, 4, 8, 24, 2, '#7a7a8a');
    P_(x, [[18, 7], [9, 18], [15, 18], [12, 27], [23, 14], [17, 14], [20, 7]], '#ffd400', '#7a5000');
  },
  bongo(x) {
    C_(x, 6, 16, 4, '#e0569c', '#5a0a34'); C_(x, 26, 16, 4, '#e0569c', '#5a0a34');
    C_(x, 16, 16, 12, RG_(x, 16, 16, 12, ['#ffa0cf', '#ff5aa8', '#c0307a']), '#5a0a34');
    P_(x, [[8, 15], [12, 12], [16, 14], [20, 12], [24, 15], [25, 22], [20, 27], [12, 27], [7, 22]], '#ffd2e8', '#a03070');
    R_(x, 9, 12, 14, 2, '#b02a6c');
    C_(x, 12.5, 16, 2.3, '#fff'); C_(x, 19.5, 16, 2.3, '#fff'); C_(x, 13, 16.3, 1.2, '#000'); C_(x, 20, 16.3, 1.2, '#000');
    E_(x, 16, 21, 3, 1.5, '#a03070'); x.beginPath(); x.arc(16, 23, 3.5, 0.3, Math.PI - 0.3); x.strokeStyle = '#5a0a34'; x.stroke();
    P_(x, [[6, 9], [10, 3], [22, 3], [26, 9]], '#2fb8a8', '#0a4a40'); R_(x, 4, 8, 6, 3, '#2fb8a8', '#0a4a40');
  },
  mine(x) {
    x.strokeStyle = '#000'; x.lineWidth = 2.2;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(16 + Math.cos(a) * 4, 16 + Math.sin(a) * 4); x.lineTo(16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12); x.stroke(); }
    C_(x, 16, 16, 8, '#000'); R_(x, 12, 12, 3, 3, '#fff');
  },
  mines(x) { R_(x, 2, 2, 28, 28, '#c0c0c0', '#808080'); x.save(); x.translate(16, 16); x.scale(0.8, 0.8); x.translate(-16, -16); ICONS.mine(x); x.restore(); R_(x, 4, 4, 5, 6, null, '#ff0000'); },
  cards(x) {
    x.save(); x.translate(10, 18); x.rotate(-0.25); R_(x, -7, -11, 14, 20, '#fff', '#000'); T_(x, '\u2660', 0, -1, 'bold 12px Arial', '#000'); x.restore();
    x.save(); x.translate(20, 15); x.rotate(0.2); R_(x, -7, -11, 14, 20, '#fff', '#000'); T_(x, '\u2665', 0, -1, 'bold 12px Arial', '#d00000'); x.restore();
  },
  pinball(x) {
    P_(x, [[6, 2], [26, 2], [30, 30], [2, 30]], G_(x, 0, 0, 0, 32, ['#1a1a6a', '#5a2aaa']), '#000');
    C_(x, 12, 9, 3, '#ff4040', '#600'); C_(x, 21, 11, 3, '#40c0ff', '#036');
    P_(x, [[7, 25], [14, 27], [13, 29], [6, 27]], '#ffcc00', '#630'); P_(x, [[25, 25], [18, 27], [19, 29], [26, 27]], '#ffcc00', '#630');
    C_(x, 16, 19, 3.2, RG_(x, 16, 19, 3.2, ['#fff', '#b0b0b0', '#404040']), '#000');
  },
  notepad(x) {
    R_(x, 6, 4, 21, 26, '#fff', '#000');
    for (let y = 10; y < 28; y += 3) R_(x, 8, y, 17, 1, '#8ab0e8');
    for (let X = 8; X < 26; X += 3) C_(x, X, 4, 1.4, '#c0c0c0', '#000');
    R_(x, 6, 5, 21, 3, '#3a6ad0');
  },
  txt(x) { page_(x); for (let y = 11; y < 28; y += 3) R_(x, 9, y, y === 26 ? 10 : 15, 1, '#000'); },
  mp3(x) { page_(x); T_(x, '\u266B', 15, 18, 'bold 16px Arial', '#5a1a8a'); R_(x, 6, 25, 21, 5, '#5a1a8a'); T_(x, 'MP3', 16, 27.5, 'bold 5px Arial', '#fff'); },
  vbs(x) { page_(x); R_(x, 9, 12, 15, 12, '#fffbd0', '#806000'); T_(x, 'VB', 16, 18, 'bold 8px Arial', '#004090'); },
  bat(x) { R_(x, 4, 5, 24, 22, '#000', '#808080'); R_(x, 5, 6, 22, 3, '#000080'); T_(x, 'C:\\>', 15, 18, 'bold 8px monospace', '#c0c0c0'); },
  dos(x) { ICONS.bat(x); },
  zip(x) { page_(x); R_(x, 14, 4, 4, 22, '#c08000'); for (let y = 5; y < 26; y += 3) R_(x, 13, y, 6, 1.4, '#806000'); R_(x, 12, 20, 8, 6, '#ffd400', '#806000'); },
  control(x) { folder_(x); C_(x, 20, 20, 5, '#808080', '#000'); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; R_(x, 19 + Math.cos(a) * 6, 19 + Math.sin(a) * 6, 2, 2, '#404040'); } C_(x, 20, 20, 2, '#c0c0c0'); R_(x, 6, 16, 3, 9, '#d02020', '#000'); },
  display(x) { monitor_(x, G_(x, 6, 6, 26, 19, ['#ff5a5a', '#ffd400', '#3ad03a', '#3a8aff'])); },
  addrem(x) { P_(x, [[4, 12], [16, 7], [28, 12], [28, 26], [16, 30], [4, 26]], '#c89a5a', '#4a2a00'); P_(x, [[4, 12], [16, 16], [28, 12]], null, '#4a2a00', 1, true); P_(x, [[16, 16], [16, 30]], null, '#4a2a00', 1, true); C_(x, 21, 9, 7, RG_(x, 21, 9, 7, ['#fff', '#c8d8ff', '#ffd0f0', '#a0a0c0']), '#404060'); C_(x, 21, 9, 1.8, '#fff', '#404060'); },
  sound(x) { P_(x, [[4, 12], [10, 12], [17, 6], [17, 26], [10, 20], [4, 20]], '#d4d0c8', '#000'); x.strokeStyle = '#000'; x.lineWidth = 1.5; for (const r of [5, 9]) { x.beginPath(); x.arc(17, 16, r, -0.8, 0.8); x.stroke(); } },
  soundoff(x) { ICONS.sound(x); x.strokeStyle = '#d00000'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(20, 10); x.lineTo(29, 22); x.moveTo(29, 10); x.lineTo(20, 22); x.stroke(); },
  phone(x) { P_(x, [[4, 20], [8, 13], [24, 13], [28, 20], [28, 28], [4, 28]], '#e8dcc0', '#000'); P_(x, [[2, 9], [8, 5], [24, 5], [30, 9], [30, 12], [24, 12], [24, 9], [8, 9], [8, 12], [2, 12]], '#d4c8a8', '#000'); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R_(x, 11 + i * 4, 17 + j * 3.5, 2.5, 2, '#606060'); },
  modem(x) { R_(x, 1, 10, 13, 10, '#d4d0c8', '#000'); R_(x, 3, 12, 9, 6, '#1a5fd0'); R_(x, 18, 4, 13, 10, '#d4d0c8', '#000'); R_(x, 20, 6, 9, 6, '#1a5fd0'); R_(x, 4, 21, 7, 2, '#808080'); R_(x, 21, 15, 7, 2, '#808080'); P_(x, [[8, 25], [8, 28], [25, 28], [25, 18]], null, '#000', 1.5, true); },
  modemon(x) { ICONS.modem(x); R_(x, 3, 12, 9, 6, '#3ae03a'); R_(x, 20, 6, 9, 6, '#3ae03a'); },
  mail(x) { R_(x, 3, 8, 26, 17, '#fffef0', '#000'); P_(x, [[3, 8], [16, 18], [29, 8]], null, '#000', 1, true); P_(x, [[3, 25], [12, 16]], null, '#808080', 1, true); P_(x, [[29, 25], [20, 16]], null, '#808080', 1, true); },
  amerinet(x) {
    C_(x, 16, 16, 13, RG_(x, 16, 16, 13, ['#7ad0ff', '#1a6ad0', '#0a2a7a']), '#001a4a');
    P_(x, [[16, 6], [24, 25], [20, 25], [16, 15], [12, 25], [8, 25]], '#ffd400', '#5a4000');
    x.save(); x.translate(16, 17); x.rotate(-0.3); E_(x, 0, 0, 15, 4, null, '#fff', 1.6); x.restore();
  },
  error(x) { C_(x, 16, 16, 13, RG_(x, 16, 16, 13, ['#ff8080', '#e00000', '#800000']), '#400000'); x.strokeStyle = '#fff'; x.lineWidth = 3.5; x.beginPath(); x.moveTo(11, 11); x.lineTo(21, 21); x.moveTo(21, 11); x.lineTo(11, 21); x.stroke(); },
  info(x) { P_(x, [[3, 3], [29, 3], [29, 23], [14, 23], [7, 30], [8, 23], [3, 23]], '#fff', '#000'); C_(x, 16, 7.5, 2.2, '#0000c0'); R_(x, 14, 11, 4, 9, '#0000c0'); },
  warn(x) { P_(x, [[16, 3], [30, 28], [2, 28]], '#ffd800', '#000'); R_(x, 14.5, 10, 3, 10, '#000'); R_(x, 14.5, 22, 3, 3, '#000'); },
  question(x) { P_(x, [[3, 3], [29, 3], [29, 23], [14, 23], [7, 30], [8, 23], [3, 23]], '#fff', '#000'); T_(x, '?', 16, 13.5, 'bold 17px Arial', '#0000c0'); },
  help(x) { R_(x, 6, 4, 20, 25, '#2a5ad0', '#000'); R_(x, 8, 4, 3, 25, '#1a3a90'); T_(x, '?', 18, 16, 'bold 16px Arial', '#ffd400'); },
  run(x) { R_(x, 3, 6, 26, 20, '#fff', '#000'); R_(x, 4, 7, 24, 4, '#000080'); P_(x, [[8, 22], [14, 15], [11, 15], [16, 12], [21, 15], [18, 15], [12, 22]], '#3a9a3a', '#000'); },
  find(x) { C_(x, 13, 13, 8, 'rgba(180,220,255,.7)', '#000', 2.5); x.strokeStyle = '#6a3a00'; x.lineWidth = 4.5; x.beginPath(); x.moveTo(19, 19); x.lineTo(28, 28); x.stroke(); },
  settings(x) { folder_(x); ICONS.gear(x); },
  gear(x) { C_(x, 20, 20, 6, '#808080', '#000'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; C_(x, 20 + Math.cos(a) * 6.5, 20 + Math.sin(a) * 6.5, 1.8, '#808080', '#000'); } C_(x, 20, 20, 6, '#909090'); C_(x, 20, 20, 2.2, '#fff', '#000'); },
  programs(x) { folder_(x); R_(x, 12, 14, 14, 10, '#fff', '#000'); R_(x, 13, 15, 12, 2, '#000080'); },
  docsmenu(x) { ICONS.docs(x); },
  shutdown(x) { monitor_(x, '#000'); C_(x, 16, 12, 4.5, '#ffd84a'); C_(x, 18, 11, 4, '#000'); },
  logo(x) {
    // a waving four-pane window (Windoze)
    const cols = ['#ff4a1a', '#3ad03a', '#2a7aff', '#ffd400'];
    const quad = (ox, oy, c) => { x.beginPath(); for (let i = 0; i <= 10; i++) { const X = ox + i * 1.2; x.lineTo(X, oy + Math.sin(X * 0.32) * 1.6); } for (let i = 10; i >= 0; i--) { const X = ox + i * 1.2; x.lineTo(X, oy + 11 + Math.sin(X * 0.32) * 1.6); } x.closePath(); x.fillStyle = c; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 0.8; x.stroke(); };
    quad(3, 3, cols[0]); quad(16, 3, cols[1]); quad(3, 16, cols[2]); quad(16, 16, cols[3]);
  },
  shield(x) { P_(x, [[16, 2], [28, 6], [27, 18], [16, 30], [5, 18], [4, 6]], G_(x, 0, 0, 32, 32, ['#ffe44a', '#e0a000']), '#4a3000', 1.5); P_(x, [[16, 6], [24, 9], [23, 18], [16, 26]], '#d02020'); T_(x, 'V', 13, 15, 'bold 12px Arial', '#d02020'); },
  adbegone(x) { C_(x, 16, 16, 13, '#fff', '#c00000', 3); T_(x, 'AD', 16, 16.5, 'bold 11px Arial', '#000'); x.strokeStyle = '#c00000'; x.lineWidth = 3; x.beginPath(); x.moveTo(7, 7); x.lineTo(25, 25); x.stroke(); },
  trophy(x) { P_(x, [[8, 4], [24, 4], [23, 13], [18, 18], [14, 18], [9, 13]], G_(x, 8, 0, 24, 0, ['#fff2a0', '#ffc400', '#a06a00']), '#5a3a00'); x.strokeStyle = '#a06a00'; x.lineWidth = 2; x.beginPath(); x.arc(8, 9, 4, Math.PI * 0.5, Math.PI * 1.5); x.stroke(); x.beginPath(); x.arc(24, 9, 4, -Math.PI * 0.5, Math.PI * 0.5); x.stroke(); R_(x, 14, 18, 4, 5, '#c08a00'); R_(x, 9, 23, 14, 5, '#6a3a1a', '#2a1000'); },
  star(x) { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5; p.push([16 + Math.cos(a) * r, 17 + Math.sin(a) * r]); } P_(x, p, G_(x, 0, 3, 0, 30, ['#fff6a0', '#ffc400', '#d08a00']), '#6a4000', 1.2); },
  lock(x) { R_(x, 7, 14, 18, 14, '#c0c0c0', '#404040'); x.strokeStyle = '#404040'; x.lineWidth = 2.5; x.beginPath(); x.arc(16, 13, 6, Math.PI, 0); x.stroke(); C_(x, 16, 20, 2, '#404040'); },
  hdd(x) { P_(x, [[3, 12], [8, 8], [29, 8], [29, 20], [24, 24], [3, 24]], '#c0c0c0', '#000'); P_(x, [[3, 12], [24, 12], [29, 8]], null, '#000', 1, true); P_(x, [[24, 12], [24, 24]], null, '#000', 1, true); R_(x, 18, 17, 3, 2, '#3ad03a'); R_(x, 6, 17, 9, 1, '#606060'); },
  cdrom(x) { ICONS.hdd(x); C_(x, 13, 17, 5.5, RG_(x, 13, 17, 5.5, ['#fff', '#d0e0ff', '#ffd0f0']), '#404040'); C_(x, 13, 17, 1.3, '#fff', '#404040'); },
  floppy(x) { P_(x, [[4, 4], [26, 4], [28, 6], [28, 28], [4, 28]], '#2a2a3a', '#000'); R_(x, 9, 4, 13, 9, '#c0c0c0', '#000'); R_(x, 17, 6, 3, 5, '#2a2a3a'); R_(x, 7, 17, 18, 11, '#fff', '#000'); },
  network(x) { x.save(); x.translate(-5, 4); x.scale(0.6, 0.6); monitor_(x); x.restore(); x.save(); x.translate(12, -2); x.scale(0.6, 0.6); monitor_(x); x.restore(); P_(x, [[8, 22], [8, 28], [24, 28], [24, 17]], null, '#000', 1.5, true); },
  printer(x) { R_(x, 9, 3, 14, 10, '#fff', '#000'); P_(x, [[3, 12], [29, 12], [29, 24], [3, 24]], '#c0c0c0', '#000'); R_(x, 8, 22, 16, 7, '#fff', '#000'); R_(x, 24, 15, 3, 2, '#3ad03a'); },
  smiley(x) { C_(x, 16, 16, 12, RG_(x, 16, 16, 12, ['#fffbb0', '#ffe000', '#e0a000']), '#6a4a00'); E_(x, 12, 13, 1.8, 3, '#000'); E_(x, 20, 13, 1.8, 3, '#000'); x.beginPath(); x.arc(16, 17, 6.5, 0.25, Math.PI - 0.25); x.strokeStyle = '#000'; x.lineWidth = 1.6; x.stroke(); T_(x, '\u2726', 27, 5, 'bold 9px Arial', '#ff40c0'); },
  dollar(x) { C_(x, 16, 16, 13, RG_(x, 16, 16, 13, ['#a0ffa0', '#20b020', '#0a5a0a']), '#043004'); T_(x, '$', 16, 17, 'bold 18px Arial', '#fff'); },
  casino(x) { R_(x, 4, 6, 24, 20, '#c00000', '#000'); for (let i = 0; i < 3; i++) { R_(x, 6 + i * 7.5, 10, 6, 10, '#fff', '#000'); T_(x, '7', 9 + i * 7.5, 15.5, 'bold 8px Arial', '#c00000'); } },
  ringtone(x) { R_(x, 10, 3, 12, 26, '#404050', '#000'); R_(x, 12, 6, 8, 8, '#a0d0a0'); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R_(x, 12 + i * 3, 17 + j * 3.5, 2, 2, '#c0c0c0'); T_(x, '\u266A', 26, 8, 'bold 9px Arial', '#ff40c0'); },
  gerbil(x) { E_(x, 16, 20, 10, 7, '#d8a060', '#5a3a10'); C_(x, 23, 14, 6, '#d8a060', '#5a3a10'); C_(x, 21, 9, 2.4, '#f0c0a0', '#5a3a10'); C_(x, 25, 13, 1.3, '#000'); C_(x, 28.5, 15, 1, '#ff8080'); P_(x, [[6, 20], [1, 14]], null, '#5a3a10', 1.5, true); },
  calendar(x) { R_(x, 4, 5, 24, 23, '#fff', '#000'); R_(x, 4, 5, 24, 6, '#c00000'); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) R_(x, 7 + i * 5, 14 + j * 4.5, 3, 3, '#808080'); },
  mouse(x) { E_(x, 16, 18, 8, 11, '#e8e8e8', '#000'); P_(x, [[8, 15], [24, 15]], null, '#000', 1, true); P_(x, [[16, 7], [16, 15]], null, '#000', 1, true); P_(x, [[16, 7], [16, 1]], null, '#000', 1, true); },
  folderopt(x) { folder_(x); R_(x, 15, 15, 12, 10, '#fff', '#000'); R_(x, 17, 18, 8, 1, '#000'); R_(x, 17, 21, 6, 1, '#000'); },
  key(x) { C_(x, 10, 16, 6, '#ffd400', '#5a4000'); C_(x, 10, 16, 2, '#fff', '#5a4000'); R_(x, 15, 15, 14, 3, '#ffd400', '#5a4000'); R_(x, 24, 18, 2, 4, '#ffd400', '#5a4000'); R_(x, 27, 18, 2, 3, '#ffd400', '#5a4000'); },
  movie(x) { R_(x, 3, 7, 26, 18, '#202020', '#000'); for (let X = 5; X < 28; X += 4) { R_(x, X, 8, 2, 2, '#fff'); R_(x, X, 22, 2, 2, '#fff'); } R_(x, 6, 12, 20, 8, '#3a7ad0'); },
  pipes(x) { R_(x, 2, 2, 28, 28, '#000'); x.lineCap = 'butt'; x.lineWidth = 5; [['#e02020', [[4, 8], [20, 8], [20, 26]]], ['#2080e0', [[28, 14], [10, 14], [10, 28]]], ['#20c040', [[4, 22], [26, 22]]]].forEach(([c, pts]) => { x.strokeStyle = c; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); }); },
  heart(x) { P_(x, [[16, 28], [4, 16], [4, 9], [9, 5], [16, 9], [23, 5], [28, 9], [28, 16]], '#ff3a8a', '#6a0030'); },
  user(x) { C_(x, 16, 10, 6, '#ffd0a0', '#5a3010'); P_(x, [[5, 30], [7, 20], [12, 17], [20, 17], [25, 20], [27, 30]], '#3a6ad0', '#0a2a6a'); },
  away(x) { R_(x, 3, 3, 26, 20, '#ffffc0', '#000'); R_(x, 6, 7, 18, 1, '#000'); R_(x, 6, 11, 14, 1, '#000'); R_(x, 6, 15, 16, 1, '#000'); C_(x, 24, 24, 6, '#fff', '#000'); P_(x, [[24, 20], [24, 24], [27, 25]], null, '#000', 1.2, true); },
  chat(x) { P_(x, [[2, 4], [20, 4], [20, 16], [9, 16], [5, 21], [6, 16], [2, 16]], '#fff', '#000'); P_(x, [[12, 12], [30, 12], [30, 24], [27, 24], [27, 29], [22, 24], [12, 24]], '#ffffc0', '#000'); },
  warnlvl(x) { R_(x, 3, 3, 26, 26, '#fff', '#000'); R_(x, 6, 18, 5, 8, '#3ad03a'); R_(x, 13, 12, 5, 14, '#ffd400'); R_(x, 20, 6, 5, 20, '#e02020'); },
  block(x) { C_(x, 16, 16, 12, '#fff', '#c00000', 3); x.strokeStyle = '#c00000'; x.lineWidth = 3; x.beginPath(); x.moveTo(8, 24); x.lineTo(24, 8); x.stroke(); },
  info16(x) { ICONS.info(x); },
});
