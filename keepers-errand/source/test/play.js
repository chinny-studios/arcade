// Plays the story from the cottage to the credits with the hero's own controller.
// Prints what happened after each chapter. Run: node test/smoke.mjs --steps test/play.js
// (smoke.mjs gives every segment KE, F, H (the hero), S() (state), say(choice) (click through dialog) and log.)
await KE.start({ intro: true });
await say();
log.push(['intro', S().flags.join(','), S().lock]);
H.place(-1.2, -0.9, Math.PI);
KE.use(); await say();
log.push(['chest', S().items.join(',')]);
KE.walkTo(0, 2.9, 6);
KE.sim(0.8);
log.push(['outside', S().area, S().x, S().z]);
await say(); KE.sim(0.3);
return { log, st: S() };
//--- shot p1_bailiff
KE.mode('aggressive');
const b = F.W.ents.find((e) => e.id === 'bailiff');
for (let i = 0; i < 60 && b && !b.dead; i++) { KE.face(b.x, b.z); if (Math.hypot(b.x - H.x, b.z - H.z) > 1.3) KE.walkTo(b.x, b.z, 0.5, 1.2); KE.press('action'); KE.sim(0.3); }
log.push(['bailiff', b && b.dead, S().life, S().clams]);
KE.sim(1.5);
return log.slice(-1);
//--- shot p2_fought
// ---- chapter 2: to Pottle Harbour, the Mayor and the Weather Office ----
KE.god(); KE.mode('sporty');
window.nearest = (pred) => F.W.ents.filter((e) => !e.dead && pred(e)).sort((a, b) => Math.hypot(a.x - H.x, a.z - H.z) - Math.hypot(b.x - H.x, b.z - H.z))[0];
window.grab = (type) => { const g = nearest((e) => e.kind === 'pickup' && e.type === type); if (g) { KE.walkTo(g.x, g.z, 4, 0.2); KE.sim(0.5); } return !!g; };
window.route = (pts, max = 30) => { for (const [x, z] of pts) { const d = KE.walkTo(x, z, max, 0.8); if (d > 1.5) return { stuck: [x, z], at: [H.x, H.z], d }; } return null; };
let r = route([[-62, 12], [-48, 10], [-30, 8], [-12, 7], [6, 6], [22, 7], [32, 8], [46, 9]]);
log.push(['road', r, S().x, S().z, S().life]);
KE.mode('normal');
const tm = await KE.talk('mayor'); log.push(['mayor', tm.flags ? tm.flags.includes('metMayor') : tm, S()]);
r = route([[52, -8], [53.7, -8]]);
KE.sim(1.0);
log.push(['office', S().area]);
const tl = await KE.talk('ledgerby', 1); log.push(['ledgerby', tl.flags ? tl.flags.includes('metLedgerby') : tl]);
return log.slice(-4);
//--- shot p3_office
KE.walkTo(-4.2, 0, 5, 0.3); KE.sim(1.0);
log.push(['outOffice', S().area, S().x, S().z]);
KE.mode('sporty');
r = route([[44, 8], [22, 7], [6, 6], [4, -14], [-2, -28], [2, -40], [16, -44], [22, -54], [16, -58], [10, -56.8]]);
KE.sim(1.0);
log.push(['windmill', r, S().area]);
KE.mode('normal');
const tc = await KE.talk('cumula'); log.push(['cumula', tc.flags ? tc.flags.includes('metCumula') : tc]);
return log.slice(-3);
//--- shot p4_windmill
// ---- chapter 3: the three shards ----
KE.walkTo(0, 5.4, 5, 0.3); KE.sim(1.0);
log.push(['outMill', S().area]);
KE.mode('sporty');
r = route([[16, -58], [22, -54], [16, -44], [2, -40], [-2, -28], [4, -14], [-12, 7], [-30, 8], [-36, -6], [-41, -18], [-43, -28], [-47, -37], [-52, -44]]);
log.push(['quarry', r, S().x, S().z]);
// clear the bailiffs (god mode is on)
KE.mode('aggressive');
for (let k = 0; k < 160; k++) {
  const foes = F.W.ents.filter((e) => e.kind === 'foe' && !e.dead && e.sub !== 'crab' && Math.hypot(e.x - H.x, e.z - H.z) < 16);
  if (!foes.length) break;
  const f = foes[0]; KE.face(f.x, f.z);
  if (Math.hypot(f.x - H.x, f.z - H.z) > 1.4) KE.walkTo(f.x, f.z, 0.6, 1.3);
  KE.press('action'); KE.sim(0.3);
}
log.push(['quarryClear', F.W.ents.filter((e) => e.kind === 'foe' && !e.dead && e.sub !== 'crab' && Math.hypot(e.x - H.x, e.z - H.z) < 16).length, S().clams]);
KE.walkTo(-54.3, -46.1, 6, 0.25); KE.face(-55.5, -47.5);
for (let k = 0; k < 6; k++) { KE.press('action'); KE.sim(0.45); }
KE.sim(1); grab('glass');
log.push(['shardQuarry', S().items.includes('glass_quarry')]);
return log.slice(-4);
//--- shot p5_quarry
KE.mode('sporty');
r = route([[-47, -37], [-43, -28], [-41, -18], [-36, -6], [-30, 8], [-22, 22], [-34, 40], [-46, 52], [-50, 56]]);
log.push(['stackBeach', r, S().x, S().z]);
const pl = F.OUT.pillars, st = F.OUT.stackTop;
// walk into the shallows just before the first pillar
const [p0x, p0z] = pl[0]; const dx = p0x - H.x, dz = p0z - H.z, dd = Math.hypot(dx, dz);
KE.walkTo(p0x - dx / dd * 1.6, p0z - dz / dd * 1.6, 8, 0.3);
const hops = [];
for (const [x, z, top] of pl) hops.push([top, KE.jumpTo(x, z)]);
hops.push(['stack', KE.jumpTo(st[0] - 0.8, st[1] - 0.8)]);
log.push(['hops', hops.map(([t, h]) => [t, +h.y.toFixed(2)])]);
grab('glass');
log.push(['shardStack', S().items.includes('glass_stack')]);
return log.slice(-3);
//--- shot p6_stack
// the cove: knock the nest off the pole, return Gubbins' hat
KE.mode('sporty');
r = route([[-46, 52], [-34, 40], [-22, 22], [-12, 7], [6, 6], [12, 6], [12, 22], [12, 38], [16, 48], [6, 49], [-3.5, 50.5]]);
log.push(['cove', r, S().x, S().z]);
KE.face(-8, 52); KE.press('throw'); KE.sim(2.5);
log.push(['nest', S().flags.includes('nestDown')]);
KE.sim(1.5);
grab('item');
log.push(['hat', S().items.includes('hat')]);
KE.mode('normal');
KE.walkTo(19, 48, 10, 1.2);
const tg = await KE.talk('gubbins'); log.push(['gubbins', tg.items ? tg.items.join(',') : tg]);
return log.slice(-4);
//--- shot p7_cove
KE.mode('sporty');
r = route([[16, 48], [12, 38], [12, 22], [12, 6], [4, -14], [-2, -28], [2, -40], [16, -44], [22, -54], [16, -58], [10, -56.6]]);
KE.sim(1.0);
log.push(['mill2', r, S().area]);
KE.mode('normal');
const tc2 = await KE.talk('cumula'); log.push(['charged', tc2.flags ? tc2.flags.includes('pebbleUp') : tc2, tc2.items]);
return log.slice(-2);
//--- shot p8_charged
// ---- chapter 4: the Weather Office roof, the records room and the stamp ----
KE.walkTo(0, 5.4, 5, 0.3); KE.sim(1.0);
KE.mode('sporty');
r = route([[16, -58], [22, -54], [16, -44], [2, -40], [-2, -28], [4, -14], [6, 6], [22, 7], [32, 8], [44, 4], [52, 3], [58, 4], [70, 2], [71.5, -3.9]]);
log.push(['officeBack', r, S().x, S().z]);
KE.mode('normal');
const crate = window.crate = F.W.ents.find((e) => e.kind === 'push');
const push = (vx, vz, until, max = 8) => { let t = 0; while (t < max && !until()) { F.G.autoMove = [vx, vz]; KE.sim(0.1); t += 0.1; } F.G.autoMove = null; KE.sim(0.1); };
push(0, -1, () => crate.z <= -11.2);
log.push(['pushN', +crate.x.toFixed(2), +crate.z.toFixed(2)]);
KE.walkTo(72.9, -9.8, 4, 0.25); KE.walkTo(72.9, -11.2, 4, 0.25);
push(-1, 0, () => crate.x <= 69.4);
log.push(['pushW', +crate.x.toFixed(2), +crate.z.toFixed(2)]);
KE.walkTo(crate.x + 1.6, crate.z, 3, 0.2);
KE.mode('sporty');
const j1 = KE.jumpTo(crate.x, crate.z), j2 = KE.jumpTo(68.0, -11.2), j3 = KE.jumpTo(65.4, -10.4);
log.push(['climb', +j1.y.toFixed(2), +j2.y.toFixed(2), +j3.y.toFixed(2)]);
KE.walkTo(64.6, -8.9, 3, 0.2);
KE.use(); await say(0); KE.sim(1.0);
log.push(['skylight', S().area, S().x, S().z]);
return log.slice(-5);
//--- shot p9_records
// get caught on purpose first: stomp about in Sporty mode right behind a guard
const crate = window.crate;
KE.mode('sporty');
KE.walkTo(0.4, 2.0, 4, 0.4); KE.sim(2.0); await say(); KE.sim(0.5);
log.push(['caught', S().area, S().x, S().z]);
// back up onto the roof (the crate stays where we pushed it) and in again, this time sneakily with the guards asleep at the wheel
KE.mode('sporty');
KE.walkTo(52, -1, 6, 0.6); KE.walkTo(58, 1, 6, 0.6); KE.walkTo(70, 2, 6, 0.6); KE.walkTo(crate.x + 1.6, crate.z + 1.2, 6, 0.3); KE.walkTo(crate.x + 1.6, crate.z, 3, 0.2);
KE.jumpTo(crate.x, crate.z); KE.jumpTo(68.0, -11.2); KE.jumpTo(65.4, -10.4); KE.walkTo(64.6, -8.9, 3, 0.2);
KE.use(); await say(0); KE.peace(true); KE.sim(1.0);
log.push(['skylight2', S().area, S().mode]);
KE.walkTo(-3.0, -2.6, 8, 0.3); KE.walkTo(-0.2, -3.0, 6, 0.3);
log.push(['atDesk', S(), F.nearestInteract() && F.nearestInteract().label]);
KE.use(); KE.sim(0.3);
log.push(['stamp', S().items.includes('stamp')]);
KE.walkTo(-3.0, -2.6, 8, 0.3); KE.walkTo(-3.0, 0.4, 8, 0.3); KE.walkTo(3.4, 1.0, 8, 0.3); KE.sim(1.2);
KE.peace(false);
log.push(['backDoor', S().area, S().flags.includes('stampSafe')]);
return log.slice(-4);
//--- shot p10_stamp
KE.mode('sporty');
r = route([[70, 2], [58, 4], [52, 3], [44, 4], [32, 8], [22, 7], [6, 6], [-12, 7], [-30, 8], [-48, 10], [-62, 12], [-72, 13], [-82, 9], [-83.2, 6]]);
log.push(['toSeal', r]);
KE.mode('normal'); KE.face(-84, 6);
KE.use(); await say(0); KE.sim(0.5);
log.push(['sealOpen', S().flags.includes('lighthouseOpen')]);
KE.walkTo(-84.2, 6, 3, 0.1); KE.sim(1.2);
log.push(['lh0', S().area]);
return log.slice(-3);
//--- shot p11_lh0
// ---- chapter 5: the lighthouse ----
await say(); KE.sim(0.3);
const fightAll = (range = 14) => {
  KE.mode('aggressive');
  for (let k = 0; k < 200; k++) {
    const f = nearest((e) => e.kind === 'foe' && e.state !== 'dead' && Math.hypot(e.x - H.x, e.z - H.z) < range);
    if (!f) return true;
    KE.face(f.x, f.z);
    if (Math.hypot(f.x - H.x, f.z - H.z) > 1.4) KE.walkTo(f.x, f.z, 0.6, 1.3);
    KE.press('action'); KE.sim(0.3);
  }
  return false;
};
window.fightAll = fightAll;
log.push(['lh0fight', fightAll(), S().clams]);
KE.mode('sneaky');
KE.walkTo(-4.4, 0, 6, 0.3); KE.face(-6, 0); KE.use(); await say(); KE.sim(0.3);
log.push(['valveSneaky', S().flags.includes('lhDrained')]);
KE.mode('normal'); KE.use(); await say(); KE.sim(0.5);
log.push(['valve', S().flags.includes('lhDrained')]);
KE.walkTo(0, -6.6, 8, 0.2); KE.sim(1.2);
log.push(['lh1', S().area]);
await say(); KE.sim(0.2);
return log.slice(-5);
//--- shot p12_lh1
// tiptoe past the sleeping heavies
KE.mode('sneaky');
const path1 = [[-1.2, 4.2], [-3.2, 1.8], [-5.6, 0.8], [-5.8, -2.0], [-3.6, -4.6], [-1.4, -5.2], [0, -6.6]];
const woke = [];
for (const [x, z] of path1) { KE.walkTo(x, z, 6, 0.3); woke.push(F.W.ents.filter((e) => e.sub === 'heavy' && e.state !== 'sleep').length); }
KE.sim(1.2);
log.push(['lh1sneak', S().area, woke.join('')]);
await say(); KE.sim(0.2);
return log.slice(-1);
//--- shot p13_lh2
// the gear room: hop the platforms up to the top ledge, blow the fuse with the sun-pebble
KE.mode('sporty');
const plats = [[2.6, 3.2], [5.0, 0.6]];
const hops2 = [];
KE.walkTo(1.9, 5.3, 3, 0.2);
for (const [x, z] of plats) hops2.push(+KE.jumpTo(x, z).y.toFixed(2));
// wait for the moving platform to come close
let wt = 0; while (wt < 8) { const m = F.W.area.mover.col; if (Math.hypot(m.x - H.x, m.z - H.z) < 3.0) break; KE.sim(0.1); wt += 0.1; }
{ const m = F.W.area.mover.col; hops2.push(+KE.jumpTo(m.x, m.z).y.toFixed(2)); }
wt = 0; while (wt < 8) { const m = F.W.area.mover.col; if (m.x < -0.3) break; KE.sim(0.1); wt += 0.1; }
hops2.push(+KE.jumpTo(-4.8, -1.2).y.toFixed(2));
hops2.push(+KE.jumpTo(-2.6, -3.6).y.toFixed(2));
hops2.push(+KE.jumpTo(-1.6, -5.6).y.toFixed(2));
log.push(['gearHops', hops2, S().life]);
fightAll(16); KE.sim(1.6);
KE.mode('sporty');
if (H.y < 1.9) { const near4 = Math.hypot(H.x + 2.6, H.z + 3.6) < 1.2; if (!near4) { KE.jumpTo(-4.8, -1.2); KE.jumpTo(-2.6, -3.6); } KE.jumpTo(-1.6, -5.6); }
KE.walkTo(1.2, -5.4, 3, 0.2); KE.face(1.8, -7.4);
log.push(['preFuse', S().x, S().y, S().z, KE.ents().filter((e) => e.kind === 'foe' || e.kind === 'target'), F.Actors.aimTarget(H.x, H.z, H.ry, 16) && F.Actors.aimTarget(H.x, H.z, H.ry, 16).kind, F.Pebble.active]);
KE.press('throw'); KE.sim(2.0);
log.push(['fuse', S().flags.includes('fuseBroken')]);
KE.walkTo(0, -7.6, 5, 0.2); KE.sim(1.2);
log.push(['lh3', S().area]);
return log.slice(-4);
//--- shot p14_lamp
// the boss
await say(); KE.sim(0.5);
const B = F.G.boss;
log.push(['bossStart', B && B.state, B && B.hp]);
KE.mode('aggressive');
let tt = 0;
while (tt < 120 && B.phase === 1 && B.hp > 0) {
  if (B.state === 'stunned') {
    const bx = B.x - Math.sin(B.ry) * 2.0, bz = B.z - Math.cos(B.ry) * 2.0;
    KE.walkTo(bx, bz, 1.0, 0.4); KE.face(B.x, B.z); KE.press('action'); KE.sim(0.3);
  } else {
    // stand by the wall opposite him so his charge hits it
    const an = Math.atan2(H.x - B.x, H.z - B.z);
    if (Math.hypot(H.x, H.z) < 6.5) KE.walkTo(Math.sin(an) * 7.6, Math.cos(an) * 7.6, 0.6, 0.5);
    else { F.G.autoMove = [Math.cos(an), -Math.sin(an)]; KE.sim(0.25); F.G.autoMove = null; }
  }
  KE.sim(0.1); tt += 0.5;
}
log.push(['phase1', B.phase, B.hp, B.state, Math.round(tt)]);
KE.sim(3); await say(); KE.sim(1.0);
log.push(['phase2', B.phase, B.state]);
KE.mode('sporty');
tt = 0;
while (tt < 90 && !S().flags.includes('bossDone') && B.coreHp > 0) {
  const e = B.eng;
  if (e.open && !F.Pebble.active) {
    const an = Math.atan2(H.x, H.z); if (Math.hypot(H.x, H.z) > 6) KE.walkTo(Math.sin(an) * 4.5, Math.cos(an) * 4.5, 1.5, 0.5);
    KE.face(0, 0); KE.press('throw');
  }
  KE.sim(0.2); tt += 0.2;
}
log.push(['core', B.coreHp, Math.round(tt)]);
const end = await say(0, 2.5);
KE.sim(2);
log.push(['ending', S().flags.includes('bossDone'), S().area, F.G.state, F.G.weather]);
return log.slice(-4);
//--- shot p15_end
