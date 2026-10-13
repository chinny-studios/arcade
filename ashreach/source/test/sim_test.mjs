// Sim population harness: node test/sim_test.mjs [seconds-per-zone]
import { load } from './load.mjs';
import fs from 'fs';
// work around a known engine bug (updateBuffs reads past a buff list replaced by kill()) until 13_combat is fixed
const cmb = fs.readFileSync(new URL('../src/13_combat.js', import.meta.url), 'utf8');
const fixed = cmb.includes('if (!b) continue;') ? cmb : cmb.replace('const b = e.buffs[i];', 'const b = e.buffs[i];\n    if (!b) continue;');
fs.writeFileSync(new URL('./_combat_tmp.js', import.meta.url), fixed);
process.on('exit', () => { try { fs.unlinkSync(new URL('./_combat_tmp.js', import.meta.url)); } catch (e) {} });
const names = ['ENTS', 'TEAM', 'EV', 'SM', 'ZONE_DEFS', 'makeEnt', 'addEnt', 'removeEnt', 'loadZone', 'setupSpawners', 'spawnNpc', 'updateEnts', 'updateSpawners', 'newCharacter', 'simStart', 'simTick', 'simZoneChanged', 'simTravellers', 'simSaveState', 'simChatCommand', 'teamInvite', 'teamAccept', 'teamLeave', 'simList', 'simPylons', 'sm_buildChar', 'NANOS', 'nanoReqMet', 'computeStats', 'gearMods', 'setPlayer', 'getZone', 'stubTick'];
const M = load(['03_stats.js', '04_nanos.js', '05_items.js', '06_mobs.js', '../test/sim_stub.js', '12_entities.js', '../test/_combat_tmp.js', '14_ai.js', '16_sim.js',
  '../test/sim_tail.js'], names);
const secs = +(process.argv[2] || 120);
const chat = [], errs = [];
M.EV.on('chat', (ch, from, text, to) => chat.push(`[${ch}${to ? '>' + to : ''}] ${from}: ${text}`));
const ow = console.warn; console.warn = (...a) => { errs.push(a.map(String).join(' ')); ow(...a); };
let kills = 0; M.EV.on('kill', (k, v) => { if (k && (k.kind === 'sim' || (k.owner && k.owner.kind === 'sim')) && v.kind === 'mob') kills++; });
let simDeaths = 0, pvpHits = 0; M.EV.on('death', (e) => { if (e.kind === 'sim') simDeaths++; }); M.EV.on('dmg', (s, t, a) => { if (s && t && s.kind === 'sim' && t.kind === 'sim' && a > 0) pvpHits++; });
const P = M.setPlayer('medic', 18, 'meridian');
M.simStart(null);
function changeZone(id) {
  const keep = new Set([P, ...P.pets]); for (const e of M.simTravellers()) { keep.add(e); for (const p of e.pets) keep.add(p); }
  for (const e of M.ENTS.slice()) if (!keep.has(e)) M.removeEnt(e);
  const spot = M.loadZone(id); M.setupSpawners(M.getZone().def); for (const poi of M.getZone().def.pois) M.spawnNpc(poi);
  P.pos.set(spot.x, 0, spot.z);
  for (const e of keep) if (e !== P) { e.pos.set(spot.x + 2, 0, spot.z + 2); }
  M.simZoneChanged(id);
}
function run(sec) { const dt = 1 / 30, t0 = Date.now(); for (let t = 0; t < sec; t += dt) { M.stubTick(dt); M.updateEnts(dt); M.updateSpawners(dt); M.simTick(dt); } return Date.now() - t0; }
function report(tag) {
  const sims = M.ENTS.filter((e) => e.kind === 'sim');
  const modes = {}; for (const e of sims) modes[e.ai.mode] = (modes[e.ai.mode] || 0) + 1;
  const mobsDead = M.ENTS.filter((e) => e.kind === 'mob' && e.dead).length;
  console.log(tag, 'sims', sims.length, 'dead', sims.filter((e) => e.dead).length, 'modes', JSON.stringify(modes), 'deadmobs', mobsDead, 'pets', M.ENTS.filter((e) => e.kind === 'pet').length, 'simkills', kills, 'simdeaths', simDeaths, 'pvphits', pvpHits);
}
let t0 = Date.now(); changeZone('halden'); console.log('halden load ms', Date.now() - t0); report('halden0');
console.log('sim ms', run(secs)); report('halden');
t0 = Date.now(); changeZone('dustbowl'); console.log('dustbowl load ms', Date.now() - t0); report('dust0');
console.log('sim ms', run(secs)); report('dust');
const xpBefore = M.SM.pop.filter((r) => r.ent).map((r) => r.ent.char.level + r.ent.char.xp / 1e6).reduce((a, b) => a + b, 0);
// team up
const cand = M.ENTS.filter((e) => e.kind === 'sim' && !e.dead && Math.abs(e.level - P.level) < 5);
for (const c of cand.slice(0, 4)) { c.sim.pers = 'helpful'; M.teamInvite(c.name); }
run(10); console.log('team', M.TEAM.members.map((m) => m.name + ':' + m.level));
// player fights a mob with team
const mob = M.ENTS.find((e) => e.kind === 'mob' && !e.dead && e.level >= 12 && e.level <= 18);
if (mob) { P.pos.set(mob.pos.x + 10, 0, mob.pos.z); P.target = mob; P.attacking = true; }
run(30); console.log('mob after team fight', mob && mob.dead, mob && Math.round(mob.hp));
changeZone('greenhollow'); console.log('travellers in greenhollow', M.TEAM.members.length); run(30); report('green');
M.simChatCommand('who', []);
M.EV.emit('playerchat', 'ooc', 'where are the scorpods?');
M.EV.emit('playerchat', 'ooc', 'lft 18 medic');
M.EV.emit('playerchat', 'tell', 'hi there, want to team?', M.SM.pop[3].name.split(' ')[0]);
M.EV.emit('playerchat', 'team', 'heal pls');
run(20);
M.teamLeave();
// pvp
P.char.level = 40; P.level = 40;
changeZone('lumen_scar'); report('scar0'); run(secs); report('scar'); console.log(JSON.stringify(M.simPylons()));
console.log('save bytes', JSON.stringify(M.simSaveState()).length);
const lv = {}; for (const r of M.SM.pop) lv[Math.floor((r.level - 1) / 10) * 10 + 1] = (lv[Math.floor((r.level - 1) / 10) * 10 + 1] || 0) + 1;
console.log('levels', JSON.stringify(lv), 'names', M.SM.pop.slice(0, 30).map((r) => r.name).join(', '));
console.log('--- chat sample (' + chat.length + ') ---'); console.log(chat.slice(0, 40).join('\n')); console.log('...'); console.log(chat.slice(-60).join('\n'));
console.log('warnings', errs.length);
// save -> restore round trip
const st = M.simSaveState();
const before = M.SM.pop.map((r) => r.level + ':' + r.zone).join(',');
st.t = Date.now();
M.simStart(st);
const after = M.SM.pop.map((r) => r.level + ':' + r.zone).join(',');
console.log('save/restore levels+zones identical:', before === after);
st.t = Date.now() - 4 * 3600 * 1000;
M.simStart(st);
console.log('after 4h away, avg level', (M.SM.pop.reduce((a, r) => a + r.level, 0) / M.SM.pop.length).toFixed(2));
