// Win rates for the early game at natural levels: each starter vs the lab rival (lv 5), then each Route 1 trainer
// with the starter at lv 7 (healed between), and the gym (Marina) with a lv 15 evolved starter plus a lv 13 partner.
TB.noEncounters = true; TB.autoBattle = true; TB.auto(true);
const COUNTER = { sproutle: 'embit', embit: 'splishel', splishel: 'sproutle' };
const fight = async (t) => { let r; TB.trainer(t).then((x) => r = x); for (let i = 0; i < 400 && r === undefined; i++) await TB.sim(0.5); return r; };
const res = {};
for (const st of ['sproutle', 'embit', 'splishel']) {
  const row = { rival: 0, route: 0, gym: 0 };
  for (let seed = 1; seed <= 6; seed++) {
    await TB.start({ starter: st, lv: 5, seed, map: 'lumen', x: 18, y: 16 }); TB.noEncounters = true; TB.autoBattle = true;
    if (await fight({ id: 'r', cls: 'RIVAL', name: 'MAREN', party: [[COUNTER[st], 5, 4]], money: 1 }) === 'win') row.rival++;
    TB.boost(7);
    let ok = true;
    for (const p of [[['dunebun', 3], ['gullip', 4]], [['mothlet', 4], ['thistlet', 4]], [['mothlet', 5], ['dunebun', 5]]]) {
      TB.boost(0);
      if (await fight({ id: 't', cls: 'LASS', name: 'X', party: p, money: 1 }) !== 'win') { ok = false; break; }
    }
    if (ok) row.route++;
    TB.boost(15); TB.giveMon('sparkit', 13); TB.boost(13);
    if (await fight({ id: 'g', cls: 'LEADER', name: 'MARINA', party: [['gullip', 12], ['jellink', 12], ['pelicant', 14]], items: ['superpotion', 'superpotion'], money: 1 }) === 'win') row.gym++;
  }
  res[st] = row;
}
return res;
