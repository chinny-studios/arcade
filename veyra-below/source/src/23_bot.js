// Veyra Below — autoplay bot for tests (#debug only): plays the player like an ally, explores, loots and gears up

function botEnsureAI(a) {
  return a.ai || (a.ai = { think: 0, target: null, chatT: 1e9, moon: 0, reviveT: 0, healCd: 0, buffCd: 0, skillCd: 1, techCd: 0, stuckT: 0, lastPos: { x: a.x, z: a.z }, explore: null, goalT: 0, skip: new Set() });
}
// how good a piece of gear is for the bot, compared within a slot
function botScore(c, it) {
  if (!it || it.unid || canEquip(c, it)) return -1;
  const st = itemStats(it);
  if (it.kind === 'weapon') {
    const d = weaponDamage(it), wt = WTYPES[it.base];
    const speed = wt.cls === 'melee' ? wt.speed : wt.speed * 0.9;
    let v = (d.min + d.max) / 2 * speed * (wt.hits || 1) * (wt.pellets ? 2.2 : 1) * (wt.burst || 1) * (1 + (st.dmgPct || 0));
    if (c.role === 'psion') v = v * 0.3 + (st.techPct || 0) * 400 + (st.mst || 0) * 3;
    return v;
  }
  return (st.dfp || 0) * 2 + (st.hp || 0) + (st.atp || 0) * 2 + (st.mst || 0) * (c.role === 'psion' ? 3 : 0.5) + (st.evp || 0) + (st.resAll || 0) * 200 + (st.hpPct || 0) * 400;
}
function botGearUp(c) {
  let changed = false;
  for (const it of [...c.inv]) {
    if (!isEquip(it) || it.unid || canEquip(c, it)) continue;
    const slot = it.kind === 'unit' ? (!c.equip.unit1 ? 'unit1' : !c.equip.unit2 ? 'unit2' : botScore(c, c.equip.unit1) < botScore(c, c.equip.unit2) ? 'unit1' : 'unit2') : it.kind;
    if (botScore(c, it) > botScore(c, c.equip[slot]) * 1.02) { invRemove(c.inv, it); const old = c.equip[slot]; c.equip[slot] = it; if (old) c.inv.push(old); changed = true; }
  }
  // learn arts and spend skill points
  for (const it of [...c.inv]) if (it.kind === 'disc' && !discProblem(c, it)) { c.techs[it.base] = it.lv; invRemove(c.inv, it); }
  for (let k = 0; k < 20 && c.skillPts > 0; k++) {
    const opts = classSkills(c).filter(([id, s]) => skillTierOpen(c, s) && (c.skills[id] || 0) < s.max).sort((p, q) => (p[1].type === 'active' ? 0 : 1) - (q[1].type === 'active' ? 0 : 1) || (c.skills[p[0]] || 0) - (c.skills[q[0]] || 0));
    if (!opts.length) break;
    c.skills[opts[0][0]] = (c.skills[opts[0][0]] || 0) + 1; c.skillPts--; changed = true;
  }
  // drop what isn't useful so the bag never fills
  for (const it of [...c.inv]) if (isEquip(it) && !it.unid && it.rar < 2) { c.credits += sellPrice(it); invRemove(c.inv, it); }
  if (changed && PL) refreshPartyActor(PL, false);
}
function botPickGoal(a) {
  const L = LV, ai = a.ai;
  // loot first, when nothing is fighting us
  const loot = GROUND.filter((d) => !d.credits && dist2(d.x, d.z, a.x, a.z) < 14 * 14 && !ai.skip.has(d));
  if (loot.length && !GAME.inCombat) { const d = loot.sort((p, q) => dist2(p.x, p.z, a.x, a.z) - dist2(q.x, q.z, a.x, a.z))[0]; return { x: d.x, z: d.z, loot: d }; }
  if (L.kind === 'boss') {
    const home = L.objects.find((o) => o.kind === 'home' && o.after);
    if (home) return { x: home.x, z: home.z, obj: home };
    return { x: L.bossCenter.x, z: L.bossCenter.z };
  }
  // the nearest room that isn't cleared yet (by walking distance)
  const f = updateFlow(L, a.x, a.z, 400);
  let best = null, bd = Infinity;
  for (const rm of L.rooms) {
    if (rm.cleared || rm.type === 'start' || ai.skip.has(rm)) continue;
    if (rm.type === 'exit' && L.rooms.some((r) => r !== rm && !r.cleared && r.type !== 'start' && !ai.skip.has(r))) continue;
    const d = f[tIdx(L, rm.ci, rm.cj)]; if (d < bd) { bd = d; best = rm; }
  }
  if (best) return { x: tileCenter(best.ci), z: tileCenter(best.cj), room: best };
  const ex = L.objects.find((o) => o.kind === 'next');
  if (ex) return { x: ex.x, z: ex.z, obj: ex };
  return null;
}
function botUpdate(a, dt) {
  const ai = botEnsureAI(a), c = GAME.char;
  if (a.downed) { if (invCount(c.inv, 'reviveShot')) selfRevive(a); updateAlly(a, dt); return; }
  if (!a.act) {
    if (a.hp < a.maxHp * 0.4) { const id = bestTool(c, ['medgel1', 'medgel2', 'medgel3'], 1 - a.hp / a.maxHp); if (id) startItem(a, id); }
    else if (a.tp < a.maxTp * 0.2 && a.role === 'psion') { const id = bestTool(c, ['psicell1', 'psicell2', 'psicell3'], 1 - a.tp / a.maxTp); if (id) startItem(a, id); }
  }
  if (c.sprite.pbCharge >= 100 && GAME.inCombat) usePB(a);
  ai.goalT -= dt;
  if (ai.goalT <= 0 || !ai.goal) { ai.goalT = 0.5; ai.goal = botPickGoal(a); ai.explore = ai.goal; }
  const g = ai.goal;
  if (g) {
    const d2 = dist2(a.x, a.z, g.x, g.z);
    if (g.loot && !GROUND.includes(g.loot)) ai.goal = null;
    else if (g.loot && d2 < 1.6 * 1.6) { if (!pickUp(g.loot)) ai.skip.add(g.loot); else botGearUp(c); ai.goal = null; }
    if (g.obj && d2 < 1.6 * 1.6) { GAME.botReached = g.obj; }
    // give up on goals we can't reach (in or out of combat), and on targets we can't hurt
    ai.progT = (ai.progT || 0) + dt;
    if (ai._lastGoal !== g.room && ai._lastGoal !== g.loot && ai._lastGoal !== g.obj) { ai._lastGoal = g.room || g.loot || g.obj; ai.bestD = d2; ai.progT = 0; }
    if (d2 < ai.bestD - 1 || GAME.char.stats.kills !== ai.lastKills) { ai.bestD = Math.min(ai.bestD, d2); ai.progT = 0; ai.lastKills = GAME.char.stats.kills; }
    if (ai.progT > 40) { ai.skip.add(g.room || g.loot || g.obj); ai.progT = 0; ai.goal = null; GAME.botSkips = (GAME.botSkips || 0) + 1; }
  }
  updateAlly(a, dt);
}
