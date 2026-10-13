// Logic test for 17_missions.js with stubbed world/entity layers.  node test/missions_test.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';
import vm from 'vm';
import assert from 'assert';
const here = path.dirname(url.fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(here, '..', 'src', f), 'utf8');
const ctx = { console, location: { hash: '' }, performance: { now: () => Date.now() }, Math, Date, JSON };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '..', 'vendor', 'three.min.js'), 'utf8'), ctx);

const prelude = `
const ENTS = []; let PLAYER = null; const INV_MAX = 60; const scene = new THREE.Group(); const zoneRoot = new THREE.Group();
let ZONE = null; const ZONE_DEFS = {}; const LOG = []; const CALLS = [];
EV.on('log', (t, c) => LOG.push(t)); EV.on('chat', (ch, f, t) => LOG.push(t));
function registerZone(d) { d.pois = d.pois || []; d.spawns = d.spawns || []; d.exits = d.exits || []; ZONE_DEFS[d.id] = d; return d; }
function groundY() { return 0; }
function randomDoorIn(z, rng) { const d = ZONE_DEFS[z] && ZONE_DEFS[z].doors; return d && d.length ? Object.assign({}, d[Math.floor(rng.f() * d.length)]) : null; }
function makeInteriorDef(o) {
  const rooms = []; for (let i = 0; i < 3 + o.size; i++) rooms.push({ x: i * 14, z: (i % 2) * 6, w: 10, d: 10, kind: 'room' });
  return { id: o.id, name: o.name, kind: 'interior', rooms, pois: [{ id: 'arrive', type: 'arrive', x: 0, z: 0, yaw: 0 }, { id: 'exit', type: 'door', x: -4, z: 0, yaw: 1, name: 'Exit', data: { to: 'halden' } }], size: 100 };
}
function spawnMob(id, lvl, x, z) {
  const T = MOB_T[id]; if (!T) return null;
  const e = { id: uid(), kind: 'mob', name: T.name, level: lvl, tpl: T, tplId: id, pos: new V3(x, 0, z), S: {}, hp: 1, buffs: [], hate: new Map(), rig: { root: new THREE.Group() } };
  e.mob = mobStats(T, lvl); e.S = { maxHp: e.mob.maxHp }; e.hp = e.S.maxHp; ENTS.push(e); return e;
}
function spawnNpc(poi) {
  const e = { id: uid(), kind: 'npc', name: poi.name, role: poi.type, poi, pos: new V3(poi.x, 0, poi.z), rig: { root: new THREE.Group(), height: 3, radius: 2 }, S: {} };
  ENTS.push(e); return e;
}
function removeEnt(e) { const i = ENTS.indexOf(e); if (i >= 0) ENTS.splice(i, 1); e.removed = true; }
function refreshStats(e) { e.S = { maxHp: e.mob.maxHp }; }
function addItem(e, it) { if (e.char.inv.length >= INV_MAX) return false; e.char.inv.push(it); return true; }
function removeItem(e, it) { const i = e.char.inv.indexOf(it); if (i < 0) return false; e.char.inv.splice(i, 1); return true; }
function giveXp(e, a) { e.char.xp += a; LOG.push('xp ' + a); }
function changeZone(id, at) { CALLS.push(['changeZone', id, at]); const prev = ZONE ? ZONE.id : null; for (const e of ENTS.slice()) if (e !== PLAYER) removeEnt(e); ZONE = { id, def: ZONE_DEFS[id], root: zoneRoot }; zoneRoot.children.length = 0; missionZoneChanged(id, prev); }
function travel(d) { CALLS.push(['travel', d]); changeZone(d.zone, d.at || d.poi); }
function saveGame() {}
function sfx() {}
function setup() {
  registerZone({ id: 'landfall', name: 'Landfall Isle', kind: 'island', lvl: [1, 10], doors: [{ id: 'd1', x: 30, z: 40, yaw: 0.5 }, { id: 'd2', x: -20, z: 10, yaw: 2 }], pois: [{ id: 'q1', type: 'npc', name: 'Recruiter Hale', x: 0, z: 0 }, { id: 'q2', type: 'npc', name: 'Dock Pilot Rho', x: 5, z: 0 }, { id: 'q3', type: 'npc', name: 'Quartermaster Ives', x: 9, z: 0 }, { id: 'q4', type: 'npc', name: 'Deckhand', x: 12, z: 0 }] });
  registerZone({ id: 'halden', name: 'Halden Crossing', kind: 'city', safe: true, doors: [{ id: 'h1', x: 10, z: 10, yaw: 1 }] });
  registerZone({ id: 'dustbowl', name: 'Dustbowl Flats', kind: 'outdoor', lvl: [5, 20], doors: [{ id: 'b1', x: 100, z: 100, yaw: 3 }] });
  const char = newCharacter({ name: 'Tester', breed: 'baseline', prof: 'trooper', faction: 'unaligned', sex: 'f' });
  char.flags = {};
  PLAYER = { id: uid(), kind: 'player', name: 'Tester', level: 1, char, pos: new V3(0, 0, 0), S: {}, hp: 100, buffs: [], team: null };
  ZONE = { id: 'landfall', def: ZONE_DEFS.landfall, root: zoneRoot };
}
`;
const names = ['requestMissions', 'acceptMission', 'abandonMission', 'missionZoneChanged', 'missionDoor', 'missionTick', 'missionMarkers', 'questList', 'setup', 'ENTS', 'LOG', 'CALLS', 'EV', 'ZONE_DEFS', 'getP', 'getZ', 'ms_qAccept', 'ms_qComplete', 'ms_npcQuest', 'MS', 'ms_giver', 'changeZone', 'spawnMob', 'kill', 'mobStats', 'ms_get', 'ms_useObj'];
const body = ['01_core.js', '03_stats.js', '04_nanos.js', '05_items.js', '06_mobs.js'].map(src).join('\n') + '\n' + prelude + '\n' + src('17_missions.js') +
  '\nfunction getP() { return PLAYER; } function getZ() { return ZONE; } function kill(k, v) { v.dead = true; EV.emit("kill", k, v); }\n' +
  'return {' + names.map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};';
const M = vm.runInContext('(function(){\'use strict\';\n' + body + '\n})()', ctx, { filename: 'bundle.js' });
M.setup();
const P = M.getP();

// ---- offers
const sl = (o) => Object.assign({ good_bad: 0, order_chaos: 0, open_hidden: 0, physical_mystical: 0, headon_stealth: 0, credits_xp: 0, easy_hard: 0 }, o);
const offers = M.requestMissions(null, sl({}));
assert.strictEqual(offers.length, 5);
for (const o of offers) {
  assert(o.title && o.desc && o.reward.item && o.reward.item.name, 'offer fields');
  assert(['assassinate', 'retrieve', 'repair', 'find', 'deliver'].includes(o.type));
  assert(o.location && M.ZONE_DEFS[o.location.zone]);
  JSON.parse(JSON.stringify(o));
}
console.log(offers.map((o) => `${o.type.padEnd(11)} L${o.lvl} ${o.theme.padEnd(9)} ${o.title}  | ${o.reward.credits}cr ${o.reward.xp}xp ${o.reward.item.name} QL${o.reward.item.ql}`).join('\n'));
console.log('sample desc:', offers[0].desc);
// slider statistics
const stat = (s, n = 60) => { const c = {}, th = {}, lv = []; let cr = 0, xp = 0, myst = 0; for (let i = 0; i < n; i++) for (const o of M.requestMissions(null, s)) { c[o.type] = (c[o.type] || 0) + 1; th[o.theme] = (th[o.theme] || 0) + 1; lv.push(o.lvl); cr += o.reward.credits; xp += o.reward.xp; if (['nanocrystal', 'cluster', 'implant'].includes(o.reward.item.kind)) myst++; } return { c, th, lvl: lv.reduce((a, b) => a + b) / lv.length, cr: Math.round(cr / n / 5), xp: Math.round(xp / n / 5), myst: myst / n / 5 }; };
const A = stat(sl({ good_bad: -1 })), B = stat(sl({ good_bad: 1 }));
console.log('good', JSON.stringify(A.c), 'bad', JSON.stringify(B.c));
assert((B.c.assassinate || 0) > (A.c.assassinate || 0), 'bad -> more assassinations');
assert((A.c.find || 0) > (B.c.find || 0), 'good -> more finds');
const E = stat(sl({ easy_hard: -1 })), H = stat(sl({ easy_hard: 1 }));
console.log('easy lvl', E.lvl.toFixed(1), 'hard lvl', H.lvl.toFixed(1)); assert(H.lvl > E.lvl + 3);
const C = stat(sl({ credits_xp: -1 })), X = stat(sl({ credits_xp: 1 }));
console.log('credits mode', C.cr, C.xp, 'xp mode', X.cr, X.xp); assert(C.cr > X.cr * 2 && X.xp > C.xp * 2);
const PH = stat(sl({ physical_mystical: -1 })), MY = stat(sl({ physical_mystical: 1 }));
console.log('myst frac', PH.myst.toFixed(2), MY.myst.toFixed(2), JSON.stringify(PH.th), JSON.stringify(MY.th)); assert(MY.myst > PH.myst + 0.4);
const OR = stat(sl({ order_chaos: -1 })), CH = stat(sl({ order_chaos: 1 }));
console.log('order', JSON.stringify(OR.th), 'chaos', JSON.stringify(CH.th));

// ---- run every mission type end-to-end
function runType(type) {
  P.char.missions.length = 0; P.char.inv.length = 0;
  let o; for (let i = 0; i < 400 && (!o || o.type !== type); i++) o = M.requestMissions(null, sl({}))[0] && M.requestMissions(null, sl({})).find((x) => x.type === type) || o;
  assert.strictEqual(o.type, type);
  const cr0 = P.char.credits, xp0 = P.char.xp;
  const m = M.acceptMission(null, o);
  assert(m && P.char.missions.length === 1 && P.char.inv.some((i) => i.mission === m.id));
  JSON.parse(JSON.stringify(P.char));
  // go to the entrance zone
  M.changeZone(m.location.zone, null);
  const door = M.ENTS.find((e) => e.role === 'door' && e.poi.data.mission === m.id);
  assert(door, 'entrance door spawned');
  M.missionDoor(door);
  assert.strictEqual(M.getZ().id, 'mission');
  const mobs = M.ENTS.filter((e) => e.kind === 'mob'); assert(mobs.length >= 4, 'mobs ' + mobs.length);
  const obj = M.ENTS.find((e) => e.poi && e.poi.data && e.poi.data.obj);
  if (type === 'assassinate') { const t = mobs.find((e) => e.missionRole === 'target'); assert(t && t.name === m.target.name); M.kill(P, t); }
  else if (type === 'retrieve' && m.target.where === 'guard') { const t = mobs.find((e) => e.missionRole === 'holder'); assert(t); M.kill(P, t); }
  else {
    assert(obj, 'objective object');
    M.missionDoor(obj);
    if (type === 'repair') { assert.strictEqual(m.state, 'active'); P.pos.copy(obj.pos); for (let i = 0; i < 120; i++) M.missionTick(0.1); }
  }
  assert.strictEqual(m.state, 'done', type + ' completes');
  assert(P.char.credits > cr0 && P.char.xp > xp0);
  assert(P.char.inv.includes(m.reward.item), 'reward item given');
  assert(!P.char.inv.some((i) => i.mission === m.id), 'mission items removed');
  // clear the rest for the bonus
  for (const e of M.ENTS.filter((e) => e.kind === 'mob' && !e.dead)) M.kill(P, e);
  M.missionTick(1);
  assert(m.progress.bonus, 'clear bonus');
  // exit door returns next to the entrance
  const exit = M.ENTS.find((e) => e.role === 'door' && !(e.poi.data && e.poi.data.obj)) || { poi: { data: {} } };
  M.CALLS.length = 0;
  M.missionDoor({ poi: { data: {} } });
  const t = M.CALLS.find((c) => c[0] === 'travel'); assert(t && t[1].zone === m.location.zone && t[1].at && Math.hypot(t[1].at.x - m.location.x, t[1].at.z - m.location.z) < 6, 'exit returns outside');
  assert(!M.ENTS.some((e) => e.role === 'door' && e.poi.data.mission === m.id), 'no entrance after completion');
  console.log('ok', type, m.title);
}
for (const t of ['assassinate', 'retrieve', 'retrieve', 'repair', 'find', 'deliver']) runType(t);

// ---- max 3, abandon
P.char.missions.length = 0;
const os = M.requestMissions(null, sl({}));
assert(M.acceptMission(null, os[0]) && M.acceptMission(null, os[1]) && M.acceptMission(null, os[2]));
assert(M.acceptMission(null, os[3]).ok === false, 'max 3');
M.abandonMission(P.char.missions[0]);
assert.strictEqual(P.char.missions.length, 2);

// ---- starter quests
P.char.missions.length = 0; P.char.inv.length = 0;
M.changeZone('landfall', null);
const Q = () => M.questList().map((q) => q.id + ':' + q.state).join(' ');
console.log(Q(), '| givers', M.questList().map((q) => q.giver).join(', '));
const npc = (i) => M.ENTS.find((e) => e.poi && e.poi.id === 'q' + (i + 1));
assert.strictEqual(M.ms_npcQuest(M.ZONE_DEFS.landfall && { poi: { id: M.ms_giver(0).id } }), 0);
assert(M.ms_qAccept(0));
for (let i = 0; i < 6; i++) { const e = M.spawnMob('chitterling', 2, 1, 1); M.kill(P, e); }
assert(Q().startsWith('pest:ready'), Q());
assert(M.ms_qComplete(0)); assert(P.char.inv.some((i) => i.t === 'health_kit'));
assert(M.ms_qAccept(1));
const mm = M.acceptMission(null, M.requestMissions(null, sl({easy_hard:-1}))[0]);
M.changeZone(mm.location.zone, null);
M.missionDoor(M.ENTS.find((e) => e.role === 'door' && e.poi.data.mission === mm.id));
{ const t = M.ENTS.find((e) => e.missionRole === 'target' || e.missionRole === 'holder'); if (t) M.kill(P, t); else { const o = M.ENTS.find((e) => e.poi && e.poi.data && e.poi.data.obj); M.missionDoor(o); P.pos.copy(o.pos); for (let i = 0; i < 120; i++) M.missionTick(0.1); } }
assert(Q().includes('contract:ready'), Q());
assert(M.ms_qComplete(1)); assert(P.char.inv.some((i) => i.kind === 'weapon'), 'weapon reward');
M.changeZone('landfall', null);
assert(M.ms_qAccept(2));
for (let i = 0; i < 20; i++) M.missionTick(0.5);
assert(Q().includes('kit:active'));
P.char.equip.rhand = P.char.inv.find((i) => i.kind === 'weapon'); P.char.abil.str = (P.char.abil.str || 0) + 1;
M.missionTick(1);
assert(Q().includes('kit:ready'), Q()); assert(M.ms_qComplete(2));
const cr = P.char.credits;
assert(M.ms_qAccept(3)); assert(P.char.credits === cr + 150);
M.changeZone('halden', null);
assert(Q().includes('halden:done'), Q());
console.log(Q());
console.log('ALL OK');
