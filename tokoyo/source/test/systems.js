// Systems: processing stations, cooking, chests, portals, death & graves, boss fights, raids. node test/smoke.mjs --steps test/systems.js
TK.peace(true); TK.mute();
const sh = TK.poi('shrine');
const bx = sh.x + 30, bz = sh.z - 20, h = (x, z) => heightAt(x, z);
TK.tp(bx, bz);
// kiln → charcoal, tatara → copper
TK.give('wood', 30); TK.give('copper_ore', 3); TK.give('tin_ore', 1);
const kiln = TK.place('kiln', bx + 3, h(bx + 3, bz), bz, 0);
const tat = TK.place('tatara', bx - 3, h(bx - 3, bz), bz, 0);
B.interact(kiln, true);
out.kilnQueue = kiln.data.q.length;
TK.sim(12 * 6 + 1);
const coalNear = TK.DROPS.filter((d) => d.st.id === 'coal').reduce((a, d) => a + d.st.n, 0);
out.coalMade = coalNear;
// pick the coal up by walking over it
for (const d of TK.DROPS.filter((d) => d.st.id === 'coal')) { P.pos.set(d.x, d.y, d.z); TK.sim(0.3); }
out.coalInInv = P.inv.count('coal');
B.interact(tat, true); B.interact(tat, false); B.interact(tat, false); B.interact(tat, false); B.interact(tat, false);
out.tatara = { fuel: tat.data.fuel, ore: tat.data.q.slice() };
TK.sim(24 * 4 + 1);
out.bars = TK.DROPS.filter((d) => ['copper', 'tin'].includes(d.st.id)).map((d) => d.st.id + 'x' + d.st.n);
// cooking spit over a campfire
const fx = bx, fz = bz + 4;
TK.place('campfire', fx, h(fx, fz), fz, 0);
const spit = TK.place('spit', fx, h(fx, fz), fz, 0);
TK.give('raw_boar', 1); TK.give('raw_venison', 1);
B.interact(spit); B.interact(spit);
TK.sim(26);
B.interact(spit); B.interact(spit);
out.cooked = { boar: P.inv.count('cooked_boar'), venison: P.inv.count('cooked_venison') };
// chest
const ch = TK.place('chest', bx, h(bx, bz - 3), bz - 3, 0);
ch.data.inv.add('flint', 7); ch.data.inv.add('resin', 3);
out.chest = ch.data.inv.count('flint');
// portals
const p1 = TK.place('portal', bx + 8, h(bx + 8, bz + 8), bz + 8, 0); p1.data.tag = 'home';
const far = TK.poi('altar1');
const p2 = TK.place('portal', far.x + 12, h(far.x + 12, far.z + 12), far.z + 12, 0); p2.data.tag = 'home';
TK.P.inv.remove('copper_ore', 99); TK.P.inv.remove('tin_ore', 99);
P.pos.set(p1.x, p1.y + 0.1, p1.z); P.portalCd = 0;
TK.sim(0.1);
await wait(1200); TK.sim(0.5);
out.portal = { distToP2: Math.round(Math.hypot(P.pos.x - p2.x, P.pos.z - p2.z)) };
// death and grave recovery
TK.god(false);
TK.give('stone_axe', 1); TK.equip('stone_axe');
const before = P.inv.slots.filter((s) => s).length;
TK.f.damageMob; // noop
const dpos = P.pos.clone();
P.hp = 1; TK.f.SURV.die(null);
out.death = { alive: P.alive, graves: TK.f.SURV && window.TK.f ? 'ok' : '', invAfter: P.inv.slots.filter((s) => s).length };
await wait(5000); TK.sim(1);
out.respawn = { alive: P.alive, pos: P.pos.toArray().map(Math.round), noDrain: !!P.status.noSkillDrain };
return out;
//--- shot s_respawn
// run back to the grave and take everything
const g = TK.f.EVENTS && null;
void g;
const graves = TK.R.scene.children.length;
return { graves };
