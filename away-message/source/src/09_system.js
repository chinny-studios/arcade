// System: color schemes, wallpapers, the Control Panel and its applets, Help, the Welcome screen, and the machine's
// life cycle: power on, BIOS, ScanDisk, splash, shut down, restart and the blue screen.
const SCHEMES = {
  standard: { name: 'Windoze Standard', face: '#c0c0c0', tb1: '#000080', tb2: '#1084d0', desk: '#008080' },
  brick: { name: 'Brick', face: '#c2bfa5', tb1: '#800000', tb2: '#c05050', desk: '#400000' },
  desert: { name: 'Desert', face: '#d5ccbb', tb1: '#008080', tb2: '#40b0b0', desk: '#a28d68' },
  eggplant: { name: 'Eggplant', face: '#90b0a8', tb1: '#5c3a60', tb2: '#9070a0', desk: '#588078' },
  lilac: { name: 'Lilac', face: '#ae9fc8', tb1: '#5a4e94', tb2: '#a090d0', desk: '#5a4e94' },
  marine: { name: 'Marine', face: '#88c0b8', tb1: '#000080', tb2: '#4080c0', desk: '#004040' },
  plum: { name: 'Plum', face: '#a89890', tb1: '#483848', tb2: '#906890', desk: '#402840' },
  pumpkin: { name: 'Pumpkin', face: '#e0c088', tb1: '#a04000', tb2: '#e08040', desk: '#202020' },
  rainy: { name: 'Rainy Day', face: '#8899aa', tb1: '#4e6278', tb2: '#90a8c0', desk: '#000000' },
  rose: { name: 'Rose', face: '#d0a0a0', tb1: '#802040', tb2: '#c06080', desk: '#806060' },
  slate: { name: 'Slate', face: '#a0b0c0', tb1: '#203850', tb2: '#6080a0', desk: '#3c5064' },
  spruce: { name: 'Spruce', face: '#a0c8a0', tb1: '#205030', tb2: '#509060', desk: '#305030' },
  storm: { name: 'Storm', face: '#b0b0b0', tb1: '#400040', tb2: '#a040a0', desk: '#000000' },
  wheat: { name: 'Wheat', face: '#d8d0a8', tb1: '#808000', tb2: '#c0c040', desk: '#c0b070' },
  bongo: { name: 'Bongo Pink (by BongoBuddy)', face: '#f0c0d8', tb1: '#c0207a', tb2: '#ff70b8', desk: '#ff8ac4', hidden: true },
};
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function schemeVars(id) {
  const s = SCHEMES[id] || SCHEMES.standard;
  return { '--face': s.face, '--lt': shade(s.face, 0.45), '--hl': '#ffffff', '--sh': shade(s.face, -0.38), '--dk': '#0a0a0a', '--tb1': s.tb1, '--tb2': s.tb2, '--tbi1': '#808080', '--tbi2': '#b5b5b5', '--desk': s.desk, '--sel': s.tb1 };
}
function applyScheme(id = S.scheme, el = document.documentElement) { const v = schemeVars(id); for (const k in v) el.style.setProperty(k, v[k]); }

// ---- wallpapers (drawn in code) ----
const WALLS = {
  none: { name: '(None)' },
  clouds: { name: 'Clouds', light: true, gen(x, W, H) {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d5fc4'); g.addColorStop(1, '#8fc0f2'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const R = mulberry(7);
    for (let i = 0; i < 26; i++) { const cx = R() * W, cy = R() * H * 0.9, s = 30 + R() * 70; for (let j = 0; j < 9; j++) { const gg = x.createRadialGradient(cx + (R() - 0.5) * s * 2.4, cy + (R() - 0.5) * s * 0.6, 0, cx, cy, s); gg.addColorStop(0, 'rgba(255,255,255,.55)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.beginPath(); x.arc(cx + (R() - 0.5) * s * 2.4, cy + (R() - 0.5) * s * 0.6, s * (0.5 + R() * 0.6), 0, 7); x.fill(); } }
  } },
  setup: { name: 'Setup', gen(x, W, H) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0a6a'); g.addColorStop(1, '#2a2ad0'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 0.18; for (let i = 0; i < 18; i++) { x.save(); x.translate(W * Math.random(), H * Math.random()); x.scale(3 + Math.random() * 5, 3 + Math.random() * 5); ICONS.logo(x); x.restore(); } x.globalAlpha = 1; } },
  bubbles: { name: 'Bubbles', tile: 96, gen(x, W) { x.fillStyle = '#108090'; x.fillRect(0, 0, W, W); const R = mulberry(3); for (let i = 0; i < 14; i++) { const cx = R() * W, cy = R() * W, r = 3 + R() * 14; for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) { const g = x.createRadialGradient(cx + dx - r / 3, cy + dy - r / 3, 1, cx + dx, cy + dy, r); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.3, 'rgba(160,240,255,.25)'); g.addColorStop(1, 'rgba(200,255,255,.6)'); x.fillStyle = g; x.beginPath(); x.arc(cx + dx, cy + dy, r, 0, 7); x.fill(); } } } },
  circles: { name: 'Circles', tile: 40, gen(x, W) { x.fillStyle = '#5a7a9a'; x.fillRect(0, 0, W, W); x.strokeStyle = '#3a5a7a'; x.lineWidth = 2; for (let r = 4; r < 30; r += 6) { x.beginPath(); x.arc(W / 2, W / 2, r, 0, 7); x.stroke(); } } },
  stone: { name: 'Carved Stone', tile: 128, gen(x, W) { const d = x.createImageData(W, W); const R = mulberry(11); for (let i = 0; i < W * W; i++) { const v = 120 + R() * 40 + Math.sin(i * 0.002) * 10; d.data[i * 4] = v; d.data[i * 4 + 1] = v * 0.96; d.data[i * 4 + 2] = v * 0.9; d.data[i * 4 + 3] = 255; } x.putImageData(d, 0, 0); x.strokeStyle = 'rgba(60,50,40,.5)'; x.lineWidth = 2; for (let y = 0; y < W; y += 32) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); for (let X = (y / 32) % 2 ? 0 : 32; X < W; X += 64) { x.beginPath(); x.moveTo(X, y); x.lineTo(X, y + 32); x.stroke(); } } } },
  houndstooth: { name: 'Houndstooth', tile: 16, gen(x) { x.fillStyle = '#e8e0d0'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#403830'; x.fillRect(0, 0, 8, 8); x.beginPath(); x.moveTo(8, 0); x.lineTo(16, 0); x.lineTo(8, 8); x.fill(); x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 8); x.lineTo(0, 16); x.fill(); }, light: true },
  waves: { name: 'Waves', tile: 64, gen(x, W) { x.fillStyle = '#0a4a7a'; x.fillRect(0, 0, W, W); x.strokeStyle = '#2a7ab0'; x.lineWidth = 3; for (let y = 8; y < W + 16; y += 16) { x.beginPath(); for (let X = 0; X <= W; X += 2) x.lineTo(X, y + Math.sin(X / W * Math.PI * 2) * 5); x.stroke(); } } },
  thatch: { name: 'Black Thatch', tile: 16, gen(x) { x.fillStyle = '#000'; x.fillRect(0, 0, 16, 16); x.strokeStyle = '#3a3a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 4); x.lineTo(8, 4); x.moveTo(12, 0); x.lineTo(12, 8); x.moveTo(8, 12); x.lineTo(16, 12); x.moveTo(4, 8); x.lineTo(4, 16); x.stroke(); } },
  pinstripe: { name: 'Pinstripe', tile: 8, gen(x) { x.fillStyle = '#3a3a5a'; x.fillRect(0, 0, 8, 8); x.fillStyle = '#5a5a80'; x.fillRect(0, 0, 1, 8); } },
  bongo: { name: 'Bongo Love!!', light: true, hidden: true, tile: 140, gen(x, W) { x.fillStyle = '#ff9ccc'; x.fillRect(0, 0, W, W); x.save(); x.translate(20, 20); x.scale(1.6, 1.6); ICONS.bongo(x); x.restore(); x.save(); x.translate(90, 86); x.scale(1.1, 1.1); ICONS.heart(x); x.restore(); x.font = 'bold 13px Arial'; x.fillStyle = '#fff'; x.fillText('BONGO', 76, 30); } },
};
const _wallCache = {};
function wallURL(id) {
  const w = WALLS[id]; if (!w || !w.gen) return '';
  if (_wallCache[id]) return _wallCache[id];
  const c = document.createElement('canvas'); const W = w.tile || 960, H = w.tile || 600; c.width = W; c.height = H;
  w.gen(c.getContext('2d'), W, H);
  return (_wallCache[id] = c.toDataURL('image/png'));
}
function applyWall(id = S.wall, el = $('#desk')) {
  const w = WALLS[id] || WALLS.none;
  el.style.backgroundImage = w.gen ? `url(${wallURL(id)})` : 'none';
  el.style.backgroundSize = w.tile ? 'auto' : 'cover';
  el.style.backgroundRepeat = w.tile ? 'repeat' : 'no-repeat';
  if (el.id === 'desk') el.classList.toggle('lightwall', !!w.light || !!w.gen);
}
function setWallpaper(id) { S.wall = id; save(); applyWall(); if (!WALLS[id].hidden) unlock('wallpaper'); }

// ---- Control Panel ----
function openControlPanel() {
  const items = [['Add/Remove Programs', 'addrem', openAddRemove], ['Date/Time', 'calendar', openDateTime], ['Display', 'display', openDisplay], ['Folder Options', 'folderopt', openFolderOptions],
    ['Internet Options', 'globe', openInternetOptions], ['Modems', 'phone', openModems], ['Mouse', 'mouse', openMouse], ['Sounds and Multimedia', 'sound', openSounds], ['System', 'computer', aboutWindoze], ['Passwords', 'key', () => msgBox({ title: 'Passwords', icon: 'info', text: 'Your password is ******.\n\nIt is very secure. Nobody will ever guess "password".' })]];
  const view = h('div', { class: 'icons' }, items.map(([n, ic, fn]) => { const e = h('div', { class: 'ficon' }, img(ic, 32), h('span', { text: n })); e.addEventListener('dblclick', fn); e.addEventListener('click', (ev) => { $$('.ficon', view).forEach((x) => x.classList.remove('sel')); e.classList.add('sel'); if (ev.pointerType === 'touch') fn(); }); return e; }));
  openWin({ key: 'control', title: 'Control Panel', icon: 'control', w: 460, h: 330, body: view, status: [items.length + ' object(s)'] });
}
function propSheet(o) {
  // o: { title, icon, pages: [[name, fn(page)]], w, h, onApply }
  const host = h('div', { class: 'tabpage' });
  let w;
  const bar = tabs(o.pages.map((p) => p[0]), (i) => { host.textContent = ''; o.pages[i][1](host); }, o.start || 0);
  const body = h('div', { class: 'col grow pad', style: 'gap:0;min-height:0' }, bar, host,
    h('div', { class: 'btns', style: 'margin-top:8px' }, h('button', { class: 'btn def', onclick: () => { if (o.onApply) o.onApply(); w.close(); } }, 'OK'), h('button', { class: 'btn', onclick: () => w.close() }, 'Cancel'), h('button', { class: 'btn', onclick: () => o.onApply && o.onApply() }, 'Apply')));
  w = openWin({ key: o.key, title: o.title, icon: o.icon, w: o.w || 400, h: o.h || 460, body, resizable: false, small: true });
  return w;
}
function monitorPreview(fill) {
  const scr = h('div', { style: 'position:absolute;left:18px;top:14px;width:154px;height:104px;overflow:hidden;background-color:var(--desk)' });
  const m = h('div', { style: 'position:relative;width:190px;height:150px;margin:0 auto' },
    h('div', { style: 'position:absolute;left:6px;top:2px;width:178px;height:126px;background:#c0c0c0;box-shadow:var(--out);border-radius:3px' }), scr,
    h('div', { style: 'position:absolute;left:66px;top:128px;width:58px;height:10px;background:#a8a49c;box-shadow:var(--out)' }),
    h('div', { style: 'position:absolute;left:40px;top:137px;width:110px;height:10px;background:#c0c0c0;box-shadow:var(--out)' }));
  if (fill) fill(scr);
  m.scr = scr;
  return m;
}
function openDisplay() {
  let wall = S.wall, scheme = S.scheme, saver = S.saver, wait = S.saverWait;
  propSheet({
    key: 'display', title: 'Display Properties', icon: 'display', w: 404, h: 470,
    onApply: () => { const ch = wall !== S.wall; S.saver = saver; S.saverWait = wait; if (scheme !== S.scheme) { S.scheme = scheme; applyScheme(); unlock('scheme'); } if (ch) setWallpaper(wall); save(); },
    pages: [
      ['Background', (p) => {
        const mon = monitorPreview((scr) => applyWall(wall, scr));
        const lst = h('select', { size: 8, style: 'width:100%' }, Object.keys(WALLS).filter((k) => !WALLS[k].hidden || S.wall === k).map((k) => h('option', { value: k, selected: k === wall, text: WALLS[k].name })));
        lst.addEventListener('change', () => { wall = lst.value; applyWall(wall, mon.scr); });
        p.append(mon, h('div', { text: 'Select an HTML Document or a picture:' }), lst);
      }],
      ['Screen Saver', (p) => {
        const mon = monitorPreview((scr) => { scr.style.background = '#000'; scr.append(h('div', { style: 'color:#6f6;font:16px var(--mono);padding:30px 10px;text-align:center', text: SAVERS[saver] ? SAVERS[saver].name : '' })); });
        const sel = h('select', { class: 'grow' }, Object.keys(SAVERS).map((k) => h('option', { value: k, selected: k === saver, text: SAVERS[k].name })));
        sel.addEventListener('change', () => { saver = sel.value; mon.scr.firstChild.textContent = SAVERS[saver].name; });
        const wt = h('input', { type: 'number', min: 1, max: 60, value: Math.round(wait / 60), style: 'width:50px' });
        wt.addEventListener('change', () => { wait = clamp(+wt.value || 2, 1, 60) * 60; });
        p.append(mon, h('fieldset', null, h('legend', { text: 'Screen Saver' }), h('div', { class: 'row' }, sel, h('button', { class: 'btn sm', text: 'Preview', onclick: () => startSaver(saver, true) })), h('div', { class: 'row', style: 'margin-top:8px' }, 'Wait:', wt, 'minutes')));
      }],
      ['Appearance', (p) => {
        const prev = h('div', { style: 'height:150px;position:relative;box-shadow:var(--in);padding:8px;background:var(--desk);overflow:hidden' });
        const draw = () => {
          applyScheme(scheme, prev); prev.textContent = '';
          const mk = (t, act, x, y, w, hh, inner) => { const e = h('div', { class: 'win' + (act ? ' active' : ''), style: `left:${x}px;top:${y}px;width:${w}px;height:${hh}px` }, h('div', { class: 'tb' }, h('div', { class: 'ttl', text: t }), h('button', { class: 'tbtn mn' }), h('button', { class: 'tbtn mx' }), h('button', { class: 'tbtn x' })), inner || null); return e; };
          prev.append(mk('Inactive Window', false, 8, 6, 200, 70), mk('Active Window', true, 24, 30, 240, 96, h('div', { class: 'wbody', style: 'padding:4px' }, h('div', { class: 'menubar' }, h('div', { text: 'Normal' }), h('div', { text: 'Disabled', style: 'color:var(--sh)' }), h('div', { text: 'Selected', style: 'background:var(--sel);color:#fff' })), h('div', { class: 'field', style: 'height:30px', text: 'Window Text' }))),
            h('div', { class: 'win active', style: 'left:150px;top:70px;width:150px;height:70px' }, h('div', { class: 'tb' }, h('div', { class: 'ttl', text: 'Message Box' }), h('button', { class: 'tbtn x' })), h('div', { style: 'padding:4px', text: 'Message Text' }), h('div', { class: 'btns c' }, h('button', { class: 'btn sm', style: 'min-width:50px', text: 'OK' }))));
        };
        const sel = h('select', { class: 'grow' }, Object.keys(SCHEMES).filter((k) => !SCHEMES[k].hidden || k === scheme).map((k) => h('option', { value: k, selected: k === scheme, text: SCHEMES[k].name })));
        sel.addEventListener('change', () => { scheme = sel.value; draw(); });
        draw(); p.append(prev, h('div', { class: 'row' }, 'Scheme:', sel));
      }],
      ['Settings', (p) => {
        p.append(monitorPreview((scr) => applyWall(S.wall, scr)), h('div', { class: 'row' }, h('fieldset', { class: 'grow' }, h('legend', { text: 'Colors' }), h('select', { style: 'width:100%' }, h('option', null, 'High Color (16 bit)'), h('option', null, 'True Color (24 bit)'))), h('fieldset', { class: 'grow' }, h('legend', { text: 'Screen area' }), h('div', { text: innerWidth + ' by ' + innerHeight + ' pixels' }))), h('div', { class: 'dim', text: 'Plug and Play Monitor on Generic 3D Accelerator (8 MB)' }));
      }],
    ],
  });
}
function openFolderOptions() {
  let hide = S.hideExt;
  propSheet({ key: 'folderopt', title: 'Folder Options', icon: 'folderopt', h: 300, onApply: () => { if (S.hideExt !== hide) { S.hideExt = hide; save(); emit('fs'); if (!hide) unlock('showext'); } }, pages: [['View', (p) => {
    p.append(h('fieldset', null, h('legend', { text: 'Advanced settings' }),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: hide, onchange: (e) => (hide = e.target.checked) }), 'Hide file extensions for known file types'),
      h('label', { class: 'row', style: 'margin-top:6px' }, h('input', { type: 'checkbox', checked: true, disabled: true }), 'Hide protected operating system files'),
      h('label', { class: 'row', style: 'margin-top:6px' }, h('input', { type: 'checkbox', checked: true, disabled: true }), 'Remember each folder\'s view settings')),
      h('div', { class: 'dim', text: 'Tip: with extensions hidden, "song.mp3.exe" shows up as "song.mp3". Just saying.' }));
  }]] });
}
function openMouse() {
  propSheet({ key: 'mouse', title: 'Mouse Properties', icon: 'mouse', h: 280, pages: [['Motion', (p) => {
    p.append(h('fieldset', null, h('legend', { text: 'Pointer trail' }), h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: S.trails, onchange: (e) => { S.trails = e.target.checked; save(); if (S.trails) unlock('mousetrails'); } }), 'Show pointer trails')),
      h('fieldset', null, h('legend', { text: 'Pointer speed' }), h('input', { type: 'range', style: 'width:100%' })));
  }]] });
}
function openSounds() {
  propSheet({ key: 'sounds', title: 'Sounds and Multimedia Properties', icon: 'sound', h: 300, pages: [['Sounds', (p) => {
    const r = h('input', { type: 'range', min: 0, max: 100, value: Math.round(S.vol * 100), style: 'width:100%' });
    r.addEventListener('input', () => setVolume(r.value / 100));
    p.append(h('fieldset', null, h('legend', { text: 'Sound Volume' }), r, h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: AU.muted, onchange: (e) => { setMuted(e.target.checked); updateVolIcon(); } }), 'Mute all sounds')),
      h('fieldset', null, h('legend', { text: 'Sound Events' }), h('div', { class: 'row' }, h('button', { class: 'btn sm', text: 'Start Windoze', onclick: SFX.startup }), h('button', { class: 'btn sm', text: 'Exit', onclick: SFX.shutdown }), h('button', { class: 'btn sm', text: 'Ding', onclick: SFX.ding }), h('button', { class: 'btn sm', text: 'Tada', onclick: SFX.tada }))));
  }]] });
}
function openModems() {
  propSheet({ key: 'modems', title: 'Modems Properties', icon: 'phone', h: 300, pages: [['General', (p) => {
    p.append(h('div', { class: 'row' }, img('modem', 32), h('div', null, h('b', { text: 'SuperFast 56K Voice/Fax Modem' }), h('div', { text: 'COM3, V.90 (connects at 44,000 bps on a good day)' }))),
      h('fieldset', null, h('legend', { text: 'Speaker' }), h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: S.modemSound, onchange: (e) => { S.modemSound = e.target.checked; save(); } }), 'Play the handshake while connecting')),
      h('button', { class: 'btn', text: 'Test (play handshake)', onclick: () => { const was = S.modemSound; S.modemSound = true; SFX.modem(); S.modemSound = was; } }));
  }]] });
}
function openInternetOptions() {
  let home = S.homepage;
  propSheet({ key: 'inetopt', title: 'Internet Options', icon: 'globe', h: 300, onApply: () => { S.homepage = home; save(); }, pages: [['General', (p) => {
    const i = h('input', { type: 'text', value: home, style: 'width:100%' }); i.addEventListener('input', () => (home = i.value));
    p.append(h('fieldset', null, h('legend', { text: 'Home page' }), i, h('div', { class: 'row', style: 'margin-top:6px' }, h('button', { class: 'btn sm', text: 'Use Default', onclick: () => { i.value = home = 'www.amerinet.com/'; } }), h('button', { class: 'btn sm', text: 'Use Blank', onclick: () => { i.value = home = 'about:blank'; } }))),
      h('fieldset', null, h('legend', { text: 'Temporary Internet files' }), h('button', { class: 'btn sm', text: 'Delete Files...', onclick: () => msgBox({ icon: 'info', title: 'Internet Options', text: 'Deleted 4,211 cookies. Bongo saved copies for you.' }) })));
  }]] });
}
function openDateTime() {
  propSheet({ key: 'datetime', title: 'Date/Time Properties', icon: 'calendar', h: 340, pages: [['Date & Time', (p) => {
    const d = gameDate();
    const cal = h('div', { style: 'display:grid;grid-template-columns:repeat(7,22px);gap:1px;background:#fff;box-shadow:var(--in);padding:4px;text-align:center' }, 'SMTWTFS'.split('').map((c) => h('b', { text: c })));
    const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    for (let i = 0; i < first; i++) cal.append(h('span'));
    for (let i = 1; i <= 30; i++) cal.append(h('span', { text: i, style: i === d.getDate() ? 'background:var(--sel);color:#fff' : '' }));
    const clk = h('canvas', { width: 110, height: 110 });
    const x = clk.getContext('2d'); x.translate(55, 55);
    C_(x, 0, 0, 50, '#fff', '#000', 2); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R_(x, Math.cos(a) * 42 - 2, Math.sin(a) * 42 - 2, 4, 4, '#008080'); }
    const hh = d.getHours() % 12 + d.getMinutes() / 60, mm = d.getMinutes();
    const hand = (a, l, w) => { x.strokeStyle = '#000'; x.lineWidth = w; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.sin(a) * l, -Math.cos(a) * l); x.stroke(); };
    hand(hh / 12 * Math.PI * 2, 26, 4); hand(mm / 60 * Math.PI * 2, 38, 2.5);
    p.append(h('div', { class: 'row', style: 'align-items:flex-start;gap:14px' }, h('fieldset', null, h('legend', { text: 'Date' }), h('div', { class: 'row' }, h('select', null, h('option', null, 'June')), h('input', { type: 'text', value: '2001', style: 'width:50px', readonly: true })), cal), h('fieldset', null, h('legend', { text: 'Time' }), clk, h('div', { style: 'text-align:center', text: clockStr() }))),
      h('div', { class: 'dim', text: 'Current time zone: Eastern Daylight Time. (Bongo says your clock is perfect. Do not let anyone "fix" it.)' }));
  }]] });
}
function aboutWindoze() {
  msgBox({ title: 'System Properties', icon: 'none', w: 380, html: `<div class="row" style="gap:16px;align-items:flex-start"><img src="${icon('computer')}" width="48" height="48"><div><b>System:</b><br>Microsloth Windoze Millennium Edition<br>4.90.3000<br><br><b>Registered to:</b><br>${esc(S.sn || 'The Family')}<br>55274-OEM-0011903-00102<br><br><b>Computer:</b><br>Pentium III 733 MHz<br>128.0 MB RAM<br>20.4 GB hard disk (412 MB free)</div></div>` });
}

// ---- Add/Remove Programs ----
function programList() {
  const L = [
    { id: 'amerinet', name: 'AmeriNet Online 5.0', size: '48.2MB', rm: () => msgBox({ title: 'AmeriNet', icon: 'warn', text: 'Are you sure? You still have 997 FREE HOURS left on your trial CD!\n\n(Uninstall cancelled.)' }) },
    { id: 'buddy', name: 'BuddyChat 4.7', size: '6.1MB', rm: () => msgBox({ title: 'BuddyChat', icon: 'error', text: 'You can\'t uninstall BuddyChat. Your entire social life is in there.' }) },
    { id: 'ie', name: 'Internet Exploder 5.5', size: '61.0MB', rm: () => { msgBox({ title: 'Add/Remove Programs', icon: 'error', text: 'Internet Exploder is an integral part of Windoze and cannot be removed.' }); unlock('integral'); } },
    { id: 'snapster', name: 'Snapster Beta 10', size: '2.4MB', rm: () => msgBox({ title: 'Snapster', icon: 'question', text: 'Uninstall Snapster? But... the music. Think of the music.', buttons: ['Keep Snapster'] }) },
    { id: 'zapamp', name: 'ZapAmp 2.76', size: '1.9MB', rm: () => msgBox({ title: 'ZapAmp', icon: 'info', text: 'ZapAmp refuses to leave. It really zaps the yak\'s back.' }) },
    { id: 'vb', name: 'VirusBlaster 2001', size: '22.5MB', rm: () => msgBox({ title: 'VirusBlaster', icon: 'warn', text: 'Uninstalling your antivirus with the kind of stuff you download? Bold. No.' }) },
  ];
  if (S.bongo.installed) L.push({ id: 'bongo', name: 'Bongo Buddy 2.0 (Deluxe)', size: '14.7MB', rm: uninstallBongo });
  if (S.bongo.updater) L.push({ id: 'updater', name: 'Bongo Search Assistant', size: '0.9MB', rm: () => { msgBox({ title: 'Add/Remove Programs', icon: 'error', text: 'Cannot remove Bongo Search Assistant.\n\nBONGOUPD.EXE is in use by another program. Close all programs and try again.' }); unlock('cantremove'); } });
  for (const id of S.bongo.adware) { const A = ADWARE[id]; if (A) L.push({ id, name: A.name, size: A.size || '3.3MB', rm: () => removeAdwareManual(id) }); }
  if (S.adbegone) L.push({ id: 'adbegone', name: 'Ad-Be-Gone 1.0', size: '1.1MB', rm: () => { S.adbegone = false; save(); emit('desk'); msgBox({ icon: 'info', title: 'Uninstall', text: 'Ad-Be-Gone was removed.' }); } });
  return L;
}
function openAddRemove() {
  const lv = listView([{ label: 'Program', w: 250 }, { label: 'Size', w: 70 }], { onOpen: (r) => r.p.rm() });
  const refresh = () => lv.set(programList().map((p) => ({ p, cells: [p.name, p.size] })));
  const rm = h('button', { class: 'btn', text: 'Add/Remove...', onclick: () => { const r = lv.selected(); if (r) r.p.rm(); } });
  const body = h('div', { class: 'col grow pad', style: 'min-height:0' }, h('div', { class: 'row' }, img('addrem', 32), h('div', { text: 'To remove a program, select it from the list and click Add/Remove.' })), lv, h('div', { class: 'btns' }, rm, h('button', { class: 'btn', text: 'Close', onclick: () => w.close() })));
  const w = openWin({ key: 'addrem', title: 'Add/Remove Programs Properties', icon: 'addrem', w: 400, h: 380, body });
  refresh();
  on('programs', () => { if (!w.closed) refresh(); });
}

// ---- Help and Welcome ----
const HELP = [
  ['Welcome', `It's <b>Friday night, June 15, 2001</b>. Mom and Dad are watching TV and the family computer is all yours.<br><br>There's no wrong way to spend the evening: dial up, download songs, chat with your buddies, play some Mine Finder. Every throwback thing you find or survive earns an achievement (open <b>My Achievements</b> on the desktop).`],
  ['Getting online', `Double-click <b>AmeriNet Online</b> and click <b>Sign On</b>. The modem has to dial and shake hands first, so give it a few seconds (turn the speaker off in Control Panel &gt; Modems if the screeching is too much).<br><br>You share the phone line with the whole house. When Mom needs the phone, you'll hear about it. Ignore her and she'll pick up the extension and knock you offline.`],
  ['Downloading music', `Open <b>Snapster</b>, search for an artist or a song title, pick a result and click <b>Get Selected Songs</b>. Fast peers (Cable, DSL, T1) download quicker than other people on 28.8 modems. Files land in <b>My Documents\\My Music</b>; double-click one to play it in <b>ZapAmp</b>.<br><br>Not every file is what it says it is. Check the size, the bitrate and especially the extension (Folder Options can show them).`],
  ['BuddyChat', `Sign on to <b>BuddyChat</b> to see who's online. Double-click a buddy to send an IM. Buddies sign on and off through the evening, set away messages, and IM you when they have something to say: tap the suggested replies or type your own. Set your profile and away message from the <b>My BuddyChat</b> menu.<br><br>Join a chat room to hang out with strangers who all seem to be from Ohio.`],
  ['Games', `Start &gt; Programs &gt; Accessories &gt; Games has <b>Mine Finder</b>, <b>Solitaire</b> and <b>3D Pinball</b>. Right-click a Mine Finder square to flag it. In Solitaire, double-click a card to send it to the foundations.`],
  ['Bongo', `<b>Bongo</b> is your desktop buddy! Click him for jokes, facts, songs and dancing. He's free, so he's definitely not up to anything. If you ever want him gone, Add/Remove Programs is where you'd start. Ad-Be-Gone is where you'd finish.`],
  ['Viruses', `Opening strange attachments and .exe files is a great way to meet viruses. <b>VirusBlaster 2001</b> can clean most of them, once you update its definitions online with <b>LiveUpdate</b>.`],
  ['Tips', `Right-click almost anything. Try the Run box (Start &gt; Run) with things like <i>command</i>, <i>winmine</i> or <i>regedit</i>. Never pull the plug: if you close this tab without shutting down, ScanDisk will check your drive on the next boot.<br><br>Wait a couple of minutes without touching anything to see the screen saver.`],
];
function openHelp(topic = 0) {
  const text = h('div', { class: 'grow field sel-text', style: 'overflow:auto;padding:10px;font-size:12px;line-height:1.5' });
  const lst = h('div', { class: 'lv', style: 'flex:none;width:150px' });
  const show = (i) => { text.innerHTML = '<h3 style="margin:0 0 8px">' + HELP[i][0] + '</h3>' + HELP[i][1]; $$('div', lst).forEach((e, j) => { e.style.background = j === i ? 'var(--sel)' : ''; e.style.color = j === i ? '#fff' : ''; }); };
  HELP.forEach((t, i) => lst.append(h('div', { style: 'padding:2px 4px;display:flex;gap:4px;align-items:center', onclick: () => show(i) }, img('help', 16), t[0])));
  openWin({ key: 'help', title: 'Windoze Help', icon: 'help', w: 560, h: 380, body: h('div', { class: 'row grow pad', style: 'align-items:stretch;min-height:0' }, lst, text) });
  show(topic);
}
function openWelcome() {
  const desc = h('div', { class: 'grow', style: 'padding:12px 14px;font-size:12px;line-height:1.5;background:#fff;box-shadow:var(--in)' });
  const items = [
    ['Start the evening', 'logo', () => { desc.innerHTML = HELP[0][1]; }],
    ['Connect to the Internet', 'amerinet', () => { desc.innerHTML = HELP[1][1] + '<br><br><button class="btn" id="wgo">Open AmeriNet</button>'; $('#wgo', desc).onclick = () => openAmeriNet(); }],
    ['Download music', 'snapster', () => { desc.innerHTML = HELP[2][1]; }],
    ['Chat with your buddies', 'buddy', () => { desc.innerHTML = HELP[3][1]; }],
    ['Meet Bongo', 'bongo', () => { desc.innerHTML = HELP[5][1]; bongoSummon(); }],
  ];
  const left = h('div', { class: 'col', style: 'width:190px;flex:none;gap:2px' }, items.map(([t, ic, fn]) => h('button', { class: 'btn', style: 'text-align:left;height:34px;display:flex;align-items:center;gap:6px', onclick: fn }, img(ic, 24), t)));
  const show = h('input', { type: 'checkbox', checked: !S.noWelcome, onchange: (e) => { S.noWelcome = !e.target.checked; save(); } });
  const head = h('div', { style: 'height:58px;background:linear-gradient(90deg,var(--tb1),var(--tb2));color:#fff;display:flex;align-items:center;gap:12px;padding:0 14px;flex:none' }, img('logo', 32), h('div', null, h('div', { style: 'font:bold italic 22px Arial', html: 'Welcome to Windoze <span style="color:#ffd84a">Me</span>' }), h('div', { text: 'Millennium Edition' })));
  const w = openWin({ key: 'welcome', title: 'Welcome to Windoze', icon: 'logo', w: 560, h: 380, small: true, body: h('div', { class: 'col grow', style: 'gap:0;min-height:0' }, head, h('div', { class: 'row grow pad', style: 'align-items:stretch;min-height:0' }, left, desc), h('div', { class: 'row pad', style: 'padding-top:0' }, h('label', { class: 'row grow' }, show, 'Show this screen each time Windoze starts'), h('button', { class: 'btn', text: 'Close', onclick: () => w.close() }))) });
  items[0][2]();
}

// ---- life cycle ----
const SCREEN = () => $('#screen');
let BOOT = { skip: false };
function showScreen(el) { const s = SCREEN(); s.textContent = ''; if (el) { s.append(el); s.classList.add('on'); } else s.classList.remove('on'); }
async function powerOn(o = {}) {
  if (!o.restart) {
    await new Promise((res) => {
      const btn = h('button', { style: 'width:92px;height:92px;border-radius:50%;border:4px solid #555;background:radial-gradient(circle at 40% 35%,#e8e4d8,#a8a49c);box-shadow:0 0 0 6px #222,0 8px 30px #000;cursor:pointer;display:flex;align-items:center;justify-content:center' }, h('span', { style: 'width:30px;height:30px;border:4px solid #2a6a2a;border-top-color:transparent;border-radius:50%;position:relative', html: '<i style="position:absolute;left:9px;top:-10px;width:4px;height:18px;background:#2a6a2a"></i>' }));
      const scr = h('div', { class: 'safe', style: 'flex-direction:column;gap:24px;color:#bbb;font-size:15px;font-weight:normal' }, btn, h('div', { style: 'font: 15px var(--font); text-align:center; line-height:1.6', html: '<b style="font-size:22px;color:#eee">Away Message</b><br>Friday night, June 2001. The family computer is all yours.<br><span style="color:#777">Click the power button to turn it on.</span>' }));
      btn.addEventListener('click', () => { unlockAudio(); res(); });
      showScreen(scr);
    });
  }
  await bootSequence(o);
}
async function bootSequence(o = {}) {
  BOOT.skip = false;
  const b = h('div', { class: 'bios' }, h('div', { class: 'logo', html: 'CHINNY<br><span style="font-size:16px;color:#888">Modular BIOS</span>' }));
  showScreen(b);
  const skipper = () => { BOOT.skip = true; unlockAudio(); };
  SCREEN().addEventListener('pointerdown', skipper); addEventListener('keydown', skipper);
  const d = (s) => (BOOT.skip ? rsleep(0.02) : rsleep(s));
  const line = (t) => { b.append(t + '\n'); };
  tone({ f: 1000, d: 0.18, v: 0.12, type: 'square', lp: 3000 });
  line('Chinny Modular BIOS v4.51PG, A Power Saving Ally\nCopyright (C) 1984-2000, Chinny Studios, Inc.\n\nPENTIUM-III CPU at 733MHz');
  await d(0.4);
  const mem = h('span', { text: 'Memory Test :      0K' }); b.append(mem, '\n');
  for (let k = 0; k <= 131072; k += 8192) { mem.textContent = 'Memory Test : ' + String(k).padStart(6) + 'K' + (k >= 131072 ? ' OK' : ''); await d(0.04); }
  noise({ d: 0.05, v: 0.06, bp: 3000, r: 0.03 }); noise({ t: 0.15, d: 0.04, v: 0.05, bp: 2600, r: 0.03 });
  line('\nDetecting IDE Primary Master   ... IDE HDD 20.4GB'); await d(0.3);
  line('Detecting IDE Primary Slave    ... None'); await d(0.15);
  line('Detecting IDE Secondary Master ... 48X CD-ROM'); await d(0.3);
  line('\n\n\nPress DEL to enter SETUP\n06/15/2001-i440BX-W977-2A69KC4DC-00'); await d(0.6);
  SCREEN().removeEventListener('pointerdown', skipper); removeEventListener('keydown', skipper);
  if (!S.cleanShutdown && S.boots > 0) await runScandisk(false);
  // splash
  const sp = h('div', { class: 'splash' }, h('canvas', { width: 640, height: 400 }), h('div', { class: 'lg' }, h('div', null, h('img', { src: icon('logo', 32), style: 'width:72px;height:72px;vertical-align:-10px;margin-right:8px' }), h('span', { class: 'w', text: 'Windoze' }), h('span', { class: 'me', text: 'Me' })), h('div', { class: 'ed', text: 'MILLENNIUM EDITION' })), h('div', { class: 'run' }, h('i')));
  const cx = sp.firstChild.getContext('2d'); WALLS.clouds.gen(cx, 640, 400);
  showScreen(sp);
  await rsleep(BOOT.skip ? 0.6 : 2.6);
  showScreen(null);
  S.cleanShutdown = false; S.boots++; saveNow();
  CLOCK.t0 = T.t;
  SFX.startup();
  emit('boot');
}
async function runScandisk(manual) {
  const steps = ['Media descriptor', 'File Allocation Tables', 'Directory structure', 'File system', 'Free space', 'Surface scan'];
  const rows = steps.map((s) => h('div', null, h('span', { class: 'pb', text: '   ' }), ' ' + s));
  const pct = h('span', { text: '0' });
  const el = h('div', { class: 'scandisk' }, h('div', { class: 'ttl', text: 'Microsloth ScanDisk' }), manual ? 'ScanDisk is now checking the following areas of drive C:' : 'Because Windoze was not properly shut down, ScanDisk is now checking your drives for errors. To avoid seeing this message again, always shut down your computer by selecting Shut Down from the Start menu.\n\nScanDisk is now checking the following areas of drive C:', h('div', { style: 'margin:16px 0 0 20px' }, rows), h('div', { class: 'bx' }, 'Surface scan: ', pct, '% complete'), h('div', { style: 'position:absolute;left:0;right:0;bottom:0;background:#aaa;color:#000;padding:0 30px', text: '< Pause >  < More Info >  < Exit >' }));
  showScreen(el);
  let skip = false; const sk = () => (skip = true); SCREEN().addEventListener('pointerdown', sk);
  for (let i = 0; i < steps.length; i++) { rows[i].firstChild.textContent = ' » '; await rsleep(skip ? 0.05 : i === 5 ? 0.2 : 0.45); rows[i].firstChild.textContent = ' √ '; }
  for (let p = 0; p <= 100; p += irnd(3, 9)) { pct.textContent = p; await rsleep(skip ? 0.01 : 0.08); }
  pct.textContent = '100';
  await rsleep(skip ? 0.1 : 0.6);
  SCREEN().removeEventListener('pointerdown', sk);
  if (!manual) unlock('scandisk'); else showScreen(null);
}
function openShutdown() {
  let choice = 'shutdown';
  const opt = (v, t) => h('label', { class: 'row', style: 'margin:4px 0' }, h('input', { type: 'radio', name: 'sd', checked: v === choice, onchange: () => (choice = v) }), t);
  const body = h('div', { class: 'pad' }, h('div', { class: 'row', style: 'align-items:flex-start;gap:14px' }, img('shutdown', 32), h('div', null, h('div', { text: 'What do you want the computer to do?', style: 'margin-bottom:6px' }), opt('standby', 'Stand by'), opt('shutdown', 'Shut down'), opt('restart', 'Restart'))),
    h('div', { class: 'btns', style: 'margin-top:10px' }, h('button', { class: 'btn def', text: 'OK', onclick: () => { w.close(); if (choice === 'shutdown') shutDown(); else if (choice === 'restart') restartPC(true); else startSaver('blank', true); } }), h('button', { class: 'btn', text: 'Cancel', onclick: () => w.close() }), h('button', { class: 'btn', text: 'Help', onclick: () => openHelp(7) })));
  const w = openWin({ key: 'shutdown', title: 'Shut Down Windoze', icon: 'shutdown', w: 330, body, resizable: false, center: true, small: true });
}
async function shutDown() {
  emit('shutdown');
  MP.stop(); SPEECH.stop();
  for (const w of [...WM.wins]) w.close(true);
  SFX.shutdown();
  const sp = h('div', { class: 'splash' }, h('canvas', { width: 640, height: 400 }), h('div', { class: 'lg' }, h('div', { class: 'ed', style: 'font-size:26px', text: 'Windoze is shutting down...' })));
  WALLS.clouds.gen(sp.firstChild.getContext('2d'), 640, 400);
  showScreen(sp);
  S.cleanShutdown = true; saveNow(); unlock('shutdown'); saveNow();
  await rsleep(2.2);
  const safe = h('div', { class: 'safe' }, h('div', null, 'It\'s now safe to turn off', h('br'), 'your computer.', h('small', { text: 'Click anywhere to turn it back on.' })));
  showScreen(safe);
  safe.addEventListener('click', () => location.reload());
}
function restartPC(clean) {
  emit('shutdown');
  if (clean) S.cleanShutdown = true;
  saveNow();
  try { sessionStorage.setItem('away-message-restart', '1'); } catch (e) { /* ignore */ }
  location.reload();
}
// The blue screen. o: { code, fatal, why, msg }
function bsod(o = {}) {
  if ($('.bsod')) return;
  SFX.bsod(); MP.stop();
  stat('bsod'); unlock('bsod');
  const code = o.code || pick(['0E', '0D', '06']);
  const addr = '0028:C' + Math.floor(Math.random() * 0xfffffff).toString(16).toUpperCase().padStart(7, '0');
  const el = h('div', { class: 'bsod' }, h('div', { class: 'in' }, h('div', { class: 'hd' }, h('span', { text: 'Windoze' })),
    o.msg || `A fatal exception ${code} has occurred at ${addr} in VXD VMM(01) + 00010E36. The current application will be terminated.`, h('br'), h('br'),
    '*  Press any key to terminate the current application.', h('br'), '*  Press CTRL+ALT+DEL again to restart your computer. You will', h('br'), '   lose any unsaved information in all applications.', h('br'), h('br'),
    h('div', { style: 'text-align:center' }, 'Press any key to continue ', h('span', { class: 'blink', text: '_' }))));
  showScreen(el);
  emit('bsod', o);
  setTimeout(() => {
    const go = () => {
      removeEventListener('keydown', go); SCREEN().removeEventListener('pointerdown', go);
      if (o.fatal) restartPC(false);
      else { showScreen(null); if (WM.active && !WM.active.o.bare) WM.active.close(true); }
    };
    addEventListener('keydown', go); SCREEN().addEventListener('pointerdown', go);
  }, 600);
}
