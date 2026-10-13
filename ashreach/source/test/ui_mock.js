// Ashreach UI viewer — stand-ins for the world (08–11), main loop (30), save (19), sim (16) and audio (18) modules.
// Loaded after the data/entity modules and before the UI files. Never part of the build.

var state = 'play', clock = 0, showFps = false, SAVE_SLOT = 0;
var ZONE_DEFS = {
  landfall: {
    id: 'landfall', name: 'Landfall Isle', kind: 'island', lvl: [1, 10], size: 600, safe: false,
    pois: [
      { id: 'start', type: 'start', x: 0, z: 0, name: 'Shuttleport' }, { id: 'cb', type: 'clonebay', x: -18, z: 12, name: 'Shuttleport Clone Bay' },
      { id: 'term', type: 'terminal', x: 14, z: 10, name: 'Mission Terminal' }, { id: 'v1', type: 'vendor', x: 6, z: 22, name: 'Dorran Vale', role: 'weapons' },
      { id: 'sh', type: 'shuttle', x: 40, z: -60, name: 'Shuttle Pier', data: { destinations: [{ zone: 'halden', poi: 'pad', name: 'Halden Crossing', cost: 0 }, { zone: 'dustbowl', poi: 'out', name: 'Dustbowl Outpost', cost: 120 }] } },
    ],
    exits: [{ x: 250, z: 40, r: 8, to: 'smugglers_den', label: "Smuggler's Den" }], doors: [{ x: 60, z: 80 }],
  },
  halden: { id: 'halden', name: 'Halden Crossing', kind: 'city', safe: true, size: 800, pois: [], doors: [{ x: 0, z: 0 }] },
  dustbowl: { id: 'dustbowl', name: 'Dustbowl Flats', kind: 'outdoor', lvl: [5, 20], size: 1200, pois: [], doors: [{ x: 0, z: 0 }] },
  smugglers_den: { id: 'smugglers_den', name: "Smuggler's Den", kind: 'interior', lvl: [6, 11], size: 200, pois: [] },
};
var ZONE = { id: 'landfall', def: ZONE_DEFS.landfall, root: scene };
function groundY() { return 0; }
function collideMove(x, z, nx, nz) { return { x: nx, z: nz }; }
function losClear() { return true; }
function randomDoorIn(zone, rng) { return { x: rng.r(-200, 200), z: rng.r(-200, 200), yaw: 0 }; }
function loadZone(id) { ZONE = { id, def: ZONE_DEFS[id], root: scene }; EV.emit('zone', id); return { x: 0, y: 0, z: 0, yaw: 0 }; }
function changeZone(id) { loadZone(id); }
let mk_map = null;
function zoneMapCanvas() {
  if (mk_map) return mk_map;
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#1c3a4a'; g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = x / S - 0.5, ny = y / S - 0.5, d = Math.hypot(nx, ny) + (fbm(x / 60, y / 60) - 0.5) * 0.25;
    const i = (y * S + x) * 4;
    if (d < 0.42) { const h = fbm(x / 30 + 9, y / 30) ; img.data[i] = 150 + h * 60; img.data[i + 1] = 130 + h * 50; img.data[i + 2] = 90 + h * 30; }
    else if (d < 0.45) { img.data[i] = 200; img.data[i + 1] = 185; img.data[i + 2] = 140; }
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(230,214,170,.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(256, 256); g.lineTo(300, 160); g.lineTo(470, 290); g.stroke();
  g.fillStyle = 'rgba(60,50,40,.8)'; for (let i = 0; i < 14; i++) g.fillRect(230 + (i % 4) * 14, 230 + Math.floor(i / 4) * 14, 9, 9);
  mk_map = cv;
  return cv;
}
// main-loop / save / sim / audio stand-ins
const MOCK_SAVES = [
  { slot: 0, name: 'Kestra', level: 14, prof: 'trooper', breed: 'kestrel', faction: 'freehold', zone: 'landfall', time: Date.now() - 1000 * 60 * 25 },
  { slot: 1, name: 'Oberon-7', level: 31, prof: 'nanoshaper', breed: 'savant', faction: 'meridian', zone: 'broken_mesa', time: Date.now() - 1000 * 3600 * 30 },
  { slot: 2, name: 'Grisk', level: 3, prof: 'bruiser', breed: 'bulwark', faction: 'unaligned', zone: 'halden', time: Date.now() - 1000 * 3600 * 24 * 6 },
];
function listSaves() { return MOCK_SAVES.slice(); }
function deleteSave(slot) { const i = MOCK_SAVES.findIndex((s) => s.slot === slot); if (i >= 0) MOCK_SAVES.splice(i, 1); }
function continueSave() { UIV.play(); return true; }
function startGame(ch) { console.log('startGame', ch.name, ch.prof); UIV.play(ch); }
function saveGame() { EV.emit('log', 'Game saved.', 'info'); return true; }
function quitToTitle() { showTitle(); }
function chatCommand(cmd) { if (cmd === 'sit') { PLAYER.sitting = !PLAYER.sitting; return true; } if (cmd === 'who') return 'Nearby: Vexra (12 Medic), Tormund (15 Bruiser)'; return false; }
const audVol = { master: 0.8, music: 0.6, sfx: 0.9 };
function setVolume(a, b, c) { if (a != null) audVol.master = a; if (b != null) audVol.music = b; if (c != null) audVol.sfx = c; }
function setQuality(q) { console.log('quality', q); }
function teamInvite(name) { EV.emit('chat', 'system', '', 'You invited ' + name + ' to your team.'); }
function teamLeave() { EV.emit('chat', 'system', '', 'You left the team.'); }
function teamKick(m) { TEAM.members.splice(TEAM.members.indexOf(m), 1); m.team = null; }
