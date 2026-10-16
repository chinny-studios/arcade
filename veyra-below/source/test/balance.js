// Numbers check: hits to kill a standard monster and share of HP lost per monster hit, by level.
const rows = [];
for (const role of ['vanguard', 'marksman', 'psion']) for (const L of [1, 5, 10, 15, 20, 28, 40, 60, 80]) {
  VB.start({ role, level: L });
  const c = VB.GAME.char, rng = Math.random;
  c.equip.weapon = F.makeEquip('weapon', L, 1, undefined, { base: ROLES_[role].start }); c.equip.weapon.aff = [];
  c.equip.frame = F.makeEquip('frame', L, 1); c.equip.frame.aff = []; c.equip.barrier = F.makeEquip('barrier', L, 1); c.equip.barrier.aff = [];
  c.sprite.pow = c.sprite.def = c.sprite.dex = c.sprite.mind = L * 0.3;
  refreshPartyActor_(VB.PL, true);
  const S = VB.PL.S, d = c.equip.weapon, wd = (x => (x.min + x.max) / 2)(window.weaponDamage_(d));
  const hit = wd * (1 + S.atp / 400) * (1 + S.dmgPct) * window.WTYPES_[d.base].mult / window.WTYPES_[d.base].mult;
  const tech = window.techPower_(VB.PL, 'ember', Math.max(1, Math.min(ROLES_[role].techMax, Math.floor(L / 2.5) + 1)));
  const ehp = 3 * window.LCURVE_(L) * (1 + L / 80);
  const eatk = window.ECURVE_(L) * 1.0 * 120 / (120 + S.dfp);
  rows.push(`${role} L${L}: hp ${S.maxHp} dfp ${S.dfp} | hit ${Math.round(hit)} ember ${Math.round(tech)} | std foe hp ${Math.round(ehp)} → ${(ehp / hit).toFixed(1)} hits, ${(ehp / tech).toFixed(1)} embers | foe hit ${Math.round(eatk)} = ${(eatk / S.maxHp * 100).toFixed(1)}% hp`);
}
return rows;
