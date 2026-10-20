// A wild battle with autoBattle, screenshots along the way.
TB.noEncounters = true;
await TB.tp('route1', 13, 30); await TB.sim(0.5);
TB.auto(false); TB.autoText = true; TB.autoBattle = true;
out.p = TB.battle('dunebun', 3); out.p.then(r => out.r = r);
await TB.sim(2.5);
//--- shot b_intro
TB.autoBattle = true;
await TB.sim(3);
//--- shot b_mid
for (let i = 0; i < 60 && out.r === undefined; i++) await TB.sim(1);
return { r: out.r, scenes: TB.scenes(), party: TB.G().party.map(m => [m.sp, m.lv, m.hp, m.xp]) };
//--- shot b_after
