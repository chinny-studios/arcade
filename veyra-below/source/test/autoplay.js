// The bot plays the whole Initiate campaign with two recruited wardens, no god mode, buying supplies between floors.
// node test/smoke.mjs --no-start --steps test/autoplay.js [--start '{"role":"psion"}']  (role read from window.__role)
const role = window.__role || 'vanguard', diff = window.__diff || 0, startLvl = window.__lvl || 1;
VB.start({ role, race: 'human', allies: 2, name: 'Botley', level: startLvl });
const c = VB.GAME.char, log = [];
const supply = () => {
  for (const it of c.inv) if (it.unid) { const fee = Math.max(20, Math.round(itemValueX(it) / 10)); if (c.credits >= fee) { c.credits -= fee; it.unid = false; } }
  // shop for gear like a player would: a few weapons of your class, armour and a ward at your level
  for (let k = 0; k < 8; k++) {
    const kind = k < 5 ? 'weapon' : k === 5 ? 'frame' : k === 6 ? 'barrier' : 'unit';
    const it = F.makeEquip(kind, c.level, 1, undefined, { base: kind === 'weapon' ? ROLES_[role].weapons[k % 4] : undefined }); it.unid = false;
    const price = Math.round(itemValueX(it) * 1.5);
    if (c.credits >= price && window.botScore_(c, it) > window.botScore_(c, c.equip[kind === 'unit' ? 'unit1' : kind]) * 1.05) { c.credits -= price; c.inv.push(it); F.botGearUp(c); }
  }
  F.botGearUp(c);
  const want = [['medgel3', 6], ['medgel2', 8], ['medgel1', 10], ['reviveShot', 2]].concat(role === 'psion' ? [['psicell3', 4], ['psicell2', 6], ['psicell1', 8]] : [['psicell1', 3]]);
  for (const [id, n] of want) { const T = window.TOOLS_[id]; if ((T.lvl || 0) > c.level) continue; while (window.invCount_(c.inv, id) < n && c.credits >= T.price * 2) { c.credits -= T.price; window.invAdd_(c.inv, F.makeTool(id, 1)); } }
};
const itemValueX = (it) => window.itemValue_(it);
campaign: for (const area of ['forest', 'caves', 'mines', 'ruins']) for (const fl of [0, 1, 2]) {
  supply();
  let wipes = 0, simT = 0, done = false;
  const d0 = c.stats.deaths, k0 = c.stats.kills, lv0 = c.level;
  const build = () => { F.buildFloor(area, fl, diff, 'bot' + role + area + fl + wipes); VB.GAME.bot = true; VB.GAME.botReached = null; };
  build();
  while (simT < 900 && !done) {
    VB.sim(5); simT += 5;
    if (VB.GAME.mode === 'hub') { wipes++; for (let k = 0; k < 20 && VB.UI.dlg; k++) document.querySelector('.dlg').click(); if (wipes > 4) break; supply(); build(); continue; }
    const o = VB.GAME.botReached; VB.GAME.botReached = null;
    if (o && ((o.kind === 'next' && !o.locked) || o.kind === 'home')) done = true;
  }
  if (!done) { const P = VB.PL, g = P.ai && P.ai.goal; log.push(`  stuck at ${P.x.toFixed(1)},${P.z.toFixed(1)} room ${VB.GAME.curRoom && VB.GAME.curRoom.type} goal ${g ? JSON.stringify({ x: g.x, z: g.z, room: g.room && g.room.type, loot: !!g.loot, obj: g.obj && g.obj.kind }) : '-'} target ${P.ai && P.ai.target && P.ai.target.name} enemies ${VB.ENTS.filter((e) => e.team === 1 && !e.dead && !e.box).map((e) => e.name + '@' + e.x.toFixed(0) + ',' + e.z.toFixed(0) + (e.untargetable ? 'U' : '')).join(' ')} uncleared ${VB.LV.rooms.filter((r) => !r.cleared && r.type !== 'start').map((r) => r.type + (r.locked ? '(locked)' : '')).join(' ')} downed ${P.downed}`); }
  log.push(`${area} ${fl === 2 ? 'boss' : 'F' + (fl + 1)}: ${done ? 'done' : 'STUCK'} in ${simT}s · Lv ${lv0}→${c.level} · downs ${c.stats.deaths - d0} · wipes ${wipes} · kills ${c.stats.kills - k0} · medgels ${['medgel1', 'medgel2', 'medgel3'].map((id) => window.invCount_(c.inv, id)).join('/')} · ${c.credits} cr · ${window.itemName_(c.equip.weapon)} (ilvl ${c.equip.weapon.ilvl})`);
  if (!done) break campaign;
}
for (let k = 0; k < 20 && VB.UI.dlg; k++) document.querySelector('.dlg').click();
return log;
