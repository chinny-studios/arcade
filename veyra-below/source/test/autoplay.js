// The bot plays the whole Initiate campaign with two recruited wardens, no god mode, buying supplies between floors.
// node test/smoke.mjs --no-start --steps test/autoplay.js [--start '{"role":"psion"}']  (role read from window.__role)
const role = window.__role || 'vanguard', diff = window.__diff || 0, startLvl = window.__lvl || 1;
VB.start({ role, race: 'human', allies: 2, name: 'Botley', level: startLvl });
const c = VB.GAME.char, log = [];
const supply = () => {
  for (const it of c.inv) if (it.unid) { const fee = Math.max(20, Math.round(itemValueX(it) / 10)); if (c.credits >= fee) { c.credits -= fee; it.unid = false; } }
  F.botGearUp(c);
  const want = [['medgel3', 6], ['medgel2', 8], ['medgel1', 10], ['reviveShot', 2]].concat(role === 'psion' ? [['psicell3', 4], ['psicell2', 6], ['psicell1', 8]] : [['psicell1', 3]]);
  for (const [id, n] of want) { const T = window.TOOLS_[id]; if ((T.lvl || 0) > c.level) continue; while (window.invCount_(c.inv, id) < n && c.credits >= T.price * 2) { c.credits -= T.price; window.invAdd_(c.inv, F.makeTool(id, 1)); } }
};
const itemValueX = (it) => window.itemValue_(it);
for (const area of ['forest', 'caves', 'mines', 'ruins']) for (const fl of [0, 1, 2]) {
  supply();
  let wipes = 0, simT = 0, done = false;
  const d0 = c.stats.deaths, k0 = c.stats.kills, lv0 = c.level;
  const build = () => { F.buildFloor(area, fl, diff, 'bot' + role + area + fl + wipes); VB.GAME.bot = true; VB.GAME.botReached = null; };
  build();
  while (simT < 900 && !done) {
    VB.sim(5); simT += 5;
    if (VB.GAME.mode === 'hub') { wipes++; if (wipes > 4) break; supply(); build(); continue; }
    const o = VB.GAME.botReached; VB.GAME.botReached = null;
    if (o && ((o.kind === 'next' && !o.locked) || o.kind === 'home')) done = true;
  }
  const minHp = null;
  log.push(`${area} ${fl === 2 ? 'boss' : 'F' + (fl + 1)}: ${done ? 'done' : 'STUCK'} in ${simT}s · Lv ${lv0}→${c.level} · downs ${c.stats.deaths - d0} · wipes ${wipes} · kills ${c.stats.kills - k0} · medgels ${['medgel1', 'medgel2', 'medgel3'].map((id) => window.invCount_(c.inv, id)).join('/')} · ${c.credits} cr · ${window.itemName_(c.equip.weapon)} (ilvl ${c.equip.weapon.ilvl})`);
  if (!done) break;
}
return log;
