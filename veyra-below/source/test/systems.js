// Broad systems check. node test/smoke.mjs --steps test/systems.js
const P = () => VB.PL, C = () => VB.GAME.char;
const fight = (sec, near = true) => { const n = Math.round(sec / 0.25); for (let k = 0; k < n; k++) { const es = VB.ENTS.filter((q) => q.team === 1 && !q.dead && !q.box && !q.untargetable); if (!es.length) { VB.sim(0.25); continue; } es.sort((a, b) => (a.x - P().x) ** 2 + (a.z - P().z) ** 2 - (b.x - P().x) ** 2 - (b.z - P().z) ** 2); const e = es[0]; if (near && Math.hypot(e.x - P().x, e.z - P().z) > 2.2) { P().x = e.x - 1.6; P().z = e.z; } P().aimPt = { x: e.x, z: e.z }; VB.Input.acts.add(k % 4 === 3 ? 'atkH' : 'atkN'); VB.sim(0.25); } };
const errs = [];
// --- all classes and races, arts and skills
for (const role of Object.keys(ROLES_)) for (const race of Object.keys(RACES_)) {
  VB.start({ role, race, level: 24, name: role + race });
  F.buildFloor('caves', 1, 0, 'sys' + role + race); VB.god(true);
  const c = C();
  for (const id of Object.keys(TECHS_)) if (techLevelCap_(c, id)) c.techs[id] = 5;
  for (const [id, s] of Object.entries(SKILLS_)) if (s.role === role) c.skills[id] = 3;
  VB.f.equipItem && 0;
  const r0 = VB.LV.rooms.findIndex((r) => r.type === 'pack'); if (r0 >= 0) VB.toRoom(r0);
  VB.spawn('ashhound', 3, 0); VB.spawn('carapace', -3, 1); VB.sim(0.2);
  for (const id of Object.keys(c.techs)) { if (id === 'recall') continue; P().tp = P().maxTp; P().act = null; c.hotbar[0] = { t: 'tech', id }; VB.f.useSlot(P(), 0, { x: P().x + 3, z: P().z }); VB.sim(0.6); }
  for (const [id, r] of Object.entries(c.skills)) { if (SKILLS_[id].type !== 'active') continue; P().tp = P().maxTp; P().act = null; P().cd = {}; c.hotbar[1] = { t: 'skill', id }; VB.f.useSlot(P(), 1, { x: P().x + 3, z: P().z }); VB.sim(1.0); }
  fight(4);
}
out.classes = 'ok';
// --- weapons of every type
VB.start({ role: 'vanguard', level: 20 }); F.buildFloor('mines', 0, 0, 'wpn'); VB.god(true);
for (const w of Object.keys(WTYPES_)) { const it = VB.give('weapon', w, 20); C().equip.weapon = it; C().role = ROLES_.vanguard.weapons.includes(w) ? 'vanguard' : ROLES_.marksman.weapons.includes(w) ? 'marksman' : 'psion'; VB.f.equipItem; VB.PL.char = C(); refreshPartyActor_(P(), true); VB.spawn('crawler', 3, 0); fight(2); }
out.weapons = 'ok';
// --- loot: generate lots and render tooltips
let rel = 0, uni = 0;
for (let k = 0; k < 3000; k++) { const it = F.rollDrop({ ilvl: 1 + (k % 60), mf: 2, sid: STAR_SIGNS_[k % 10], area: 'ruins', role: 'psion', diff: k % 4, source: k % 3 ? 'elite' : 'boss', boss: 'sleeper' }); if (!it) continue; it.unid = false; if (it.rar === 5) rel++; if (it.rar === 4) uni++; tooltipHTML_(it, null, C()); itemName_(it); }
out.loot = { rel, uni };
// --- sprite feeding and evolution
const c = C(); for (let k = 0; k < 400; k++) { c.sprite.feedT = 0; invAdd_(c.inv, F.makeTool('medgel3', 1)); F.feedSprite(c, 'medgel3'); }
out.sprite = { form: c.sprite.form, lvl: spriteLevel_(c.sprite), pbs: c.sprite.pbs };
c.sprite.pbCharge = 100; VB.spawn('crawler', 2, 0); F.usePB(P()); VB.sim(1);
// --- all floors and bosses
for (const area of ['forest', 'caves', 'mines', 'ruins']) {
  VB.start({ role: 'marksman', level: 30, allies: 3 });
  for (const f of [0, 1]) { F.buildFloor(area, f, 0, area + f); VB.sim(0.5); }
  F.buildFloor(area, 2, 0, area + 'boss'); VB.god(true);
  VB.toRoom(1); VB.sim(3);
  const b = VB.GAME.boss; out['boss_' + area] = { hp: b.hp };
  for (let k = 0; k < 40 && !b.dead; k++) { fight(1, true); if (k === 20) b.hp = Math.min(b.hp, b.maxHp * 0.3); }
  if (!b.dead) { b.hp = 1; fight(1); }
  for (let k = 0; k < 10 && !b.dead; k++) { F.dealDamage(P(), b, b.maxHp, {}); VB.sim(0.5); }
  VB.sim(4);
  out['boss_' + area].dead = b.dead; out['boss_' + area].home = VB.LV.objects.some((o) => o.kind === 'home');
}
// --- menus and services render without errors
VB.start({ role: 'psion', race: 'sylph', level: 12, allies: 1 });
for (const t of ['gear', 'char', 'skills', 'arts', 'sprite', 'contract', 'options', 'system']) { VB.UI.openMenu(t); VB.UI.redraw(); }
VB.UI.close(true);
for (const id of ['shop', 'artificer', 'bank', 'bureau', 'spritelab', 'lobby', 'medic']) { VB.UI.openNpc(id); for (const tab of document.querySelectorAll('.tab')) tab.click(); VB.UI.close(true); }
VB.UI.openTeleporter(); VB.UI.close(true);
// buy, accept a contract, descend, portal home and back
VB.UI.openNpc('bureau'); document.querySelector('[data-a^="accept:"]').click(); VB.UI.close(true);
out.quest = C().quest.active && C().quest.active.title;
F.buildFloor('forest', 0, 0, 'portal'); VB.god(true);
VB.give('tool', 'beacon', 1); C().hotbar[2] = { t: 'item', id: 'beacon' }; VB.f.useSlot(P(), 2); VB.sim(1);
const portal = VB.LV.objects.find((o) => o.kind === 'portal'); out.portal = !!portal;
F.interact(portal); VB.sim(0.5); out.afterPortal = VB.GAME.mode;
const ret = VB.LV.objects.find((o) => o.kind === 'return'); F.interact(ret); VB.sim(0.5); out.back = VB.GAME.mode + ' ' + VB.GAME.area;
// save round trip
VB.GAME.slot = 2; SAVE_.save(); const l = SAVE_.load(2); out.save = l && l.name === C().name && l.level === C().level; SAVE_.del(2);
return out;
