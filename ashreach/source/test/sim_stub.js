// Ashreach — test stub for the sim harness: a tiny fake world (no DOM) standing in for 02/08-11/15
const scene = new THREE.Scene();
const ZONE_DEFS = {};
let ZONE = null;
let clock = 0;
const PC = { autorun: false };
function registerZone(d) { d.pois = d.pois || []; d.spawns = d.spawns || []; d.exits = d.exits || []; ZONE_DEFS[d.id] = d; return d; }
function loadZone(id) { const def = ZONE_DEFS[id]; ZONE = { id, def, root: null }; const p = def.pois.find((q) => q.type === 'start' || q.type === 'arrive') || { x: 0, z: 0 }; return { x: p.x, z: p.z, yaw: 0 }; }
function groundY() { return 0; }
function collideMove(x, z, nx, nz) { const h = ZONE ? ZONE.def.size / 2 - 4 : 200; let rx = clamp(nx, -h, h), rz = clamp(nz, -h, h); if (Math.hypot(rx - 30, rz - 30) < 5) { rx = x; rz = z; } return { x: rx, z: rz }; }
function losClear() { return true; }
function setTarget(t) { if (PLAYER) PLAYER.target = t; }
registerZone({ id: 'halden', name: 'Halden Crossing', kind: 'city', lvl: [1, 50], size: 400, safe: true,
  spawns: [{ x: 100, z: 0, r: 4, mobs: ['guard'], n: 1, lvl: [60, 60] }],
  pois: [{ id: 'h_arr', type: 'arrive', x: 0, z: 100 }, { id: 'h_cb', type: 'clonebay', x: -40, z: -40, name: 'Halden Clone Bay' }, { id: 'h_term', type: 'terminal', x: 0, z: 30, name: 'Mission Terminal' },
    { id: 'h_v', type: 'vendor', role: 'weapons', x: 50, z: -18, name: 'Gunsmith' }, { id: 'h_bank', type: 'bank', x: 60, z: 20, name: 'Concord Savings & Vault' }, { id: 'h_bar', type: 'npc', x: 120, z: 30, name: 'Barkeep Mags' },
    { id: 'h_hop', type: 'hopper', x: -38, z: 142, data: { destinations: [{ zone: 'lumen_scar', poi: 's_arr' }] } }],
  exits: [{ x: 190, z: 0, r: 10, to: 'dustbowl' }] });
registerZone({ id: 'dustbowl', name: 'Dustbowl Flats', kind: 'outdoor', lvl: [5, 20], size: 500,
  spawns: [{ x: 60, z: 60, r: 12, mobs: ['dust_scuttler', 'rust_hound'], n: 6, lvl: [3, 8] }, { x: -80, z: 40, r: 12, mobs: ['scorpod'], n: 6, lvl: [12, 18] }, { x: 0, z: -100, r: 15, mobs: ['dust_raider'], n: 6, lvl: [15, 20], camp: true }, { x: 120, z: -60, r: 10, mobs: ['sand_wyrm'], n: 5, lvl: [8, 14] }],
  pois: [{ id: 'd_arr', type: 'arrive', x: -230, z: 0 }, { id: 'd_cb', type: 'clonebay', x: -200, z: 20, name: 'Outpost Clone Bay' }],
  exits: [{ x: -240, z: 0, r: 10, to: 'halden' }, { x: 240, z: 0, r: 10, to: 'greenhollow' }] });
registerZone({ id: 'landfall', name: 'Landfall Isle', kind: 'island', lvl: [1, 10], size: 400, spawns: [{ x: 40, z: 40, r: 12, mobs: ['chitterling'], n: 6, lvl: [1, 3] }, { x: -60, z: 40, r: 12, mobs: ['dust_scuttler'], n: 5, lvl: [2, 6] }], pois: [{ id: 'l_start', type: 'start', x: 0, z: -150 }, { id: 'l_cb', type: 'clonebay', x: 10, z: -150 }, { id: 'l_sh', type: 'shuttle', x: 0, z: -170, data: { destinations: [{ zone: 'halden' }] } }], exits: [] });
registerZone({ id: 'greenhollow', name: 'Greenhollow', kind: 'outdoor', lvl: [15, 30], size: 500, spawns: [{ x: 0, z: 0, r: 15, mobs: ['spore_beetle'], n: 6, lvl: [18, 25] }], pois: [], exits: [{ x: -240, z: 0, r: 10, to: 'dustbowl' }] });
registerZone({ id: 'lumen_scar', name: 'Lumen Scar', kind: 'outdoor', lvl: [35, 50], size: 500,
  spawns: [{ x: 0, z: 150, r: 15, mobs: ['lumen_wisp'], n: 5, lvl: [36, 44] }],
  pois: [{ id: 's_arr', type: 'arrive', x: 0, z: -200 }, { id: 's_cb', type: 'clonebay', x: 10, z: -200, name: 'Scar Clone Bay' },
    { id: 'py1', type: 'pylon', x: -100, z: 0, name: 'Western Pylon', data: { faction: 'meridian' } }, { id: 'py2', type: 'pylon', x: 0, z: 40, name: 'Central Pylon', data: { faction: 'freehold' } }, { id: 'py3', type: 'pylon', x: 100, z: 0, name: 'Eastern Pylon', data: { faction: 'meridian' } }],
  exits: [] });
// game-time timers (node vm context has no setTimeout)
const STUB_T = []; let stubNow = 0;
function setTimeout(fn, ms) { STUB_T.push({ fn, t: stubNow + (ms || 0) / 1000 }); return STUB_T.length; }
function stubTick(dt) { stubNow += dt; for (let i = STUB_T.length - 1; i >= 0; i--) if (STUB_T[i].t <= stubNow) { const f = STUB_T[i].fn; STUB_T.splice(i, 1); f(); } }
