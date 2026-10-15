// Boss fights, trophies, blessings, raids. node test/smoke.mjs --steps test/bosses.js
TK.mute();
TK.give('bronze_sword', 1, 4); TK.give('bronze_shield', 1, 3); TK.equip('bronze_sword'); TK.equip('bronze_shield');
TK.give('cooked_venison', 5); TK.give('jam', 5); TK.give('nabe', 5);
const fight = async (altarType, item, n, bossType, maxT) => {
  const a = TK.poi(altarType);
  const o = EVENTS.S.pois.find((q) => q.p.type === altarType);
  const front = EVENTS.local(o, 0, 0, altarType === 'altar2' ? 9 : 6);
  TK.tp(front.x, front.z);
  TK.give(item, n);
  const it = EVENTS.interactables(P.pos.x, P.pos.z).find((x) => x.prompt().includes('Offer'));
  if (!it) return { error: 'no altar interactable', prompts: EVENTS.interactables(P.pos.x, P.pos.z).map((x) => x.prompt()) };
  it.use();
  await wait(1500);
  TK.sim(3);
  const boss = MOBS_LIVE.find((m) => m.type === bossType && !m.dead);
  if (!boss) return { error: 'no boss' };
  let t = 0, hurt = 0, swings = 0, minHp = 999, attacks = {};
  const hpStart = boss.hp;
  while (!boss.dead && t < maxT) {
    // eat when we can, heal a little to emulate potions
    for (const id of ['nabe', 'jam', 'cooked_venison']) { const s = P.inv.slots.find((x) => x && x.id === id); if (s && TK.f.maxHp() < 100) TK.f.useItem(s); }
    const d = Math.hypot(boss.pos.x - P.pos.x, boss.pos.z - P.pos.z);
    CAM.yaw = P.yaw = Math.atan2(boss.pos.x - P.pos.x, boss.pos.z - P.pos.z); CAM.pitch = 0;
    if (boss.act) attacks[boss.act.at.id] = (attacks[boss.act.at.id] || 0) + 1;
    if (d > 2.2 + boss.def.r * boss.scale) {
      const before = d;
      Input.press('KeyW'); if (window.__stuck > 2) Input.press('KeyA'); TK.sim(0.25); Input.release('KeyW'); Input.release('KeyA');
      const after = Math.hypot(boss.pos.x - P.pos.x, boss.pos.z - P.pos.z);
      window.__stuck = after > before - 0.2 ? (window.__stuck || 0) + 1 : 0; if (window.__stuck > 6) window.__stuck = 0;
    }
    else { TK.click(0); TK.sim(0.5); swings++; }
    const h0 = P.hp; minHp = Math.min(minHp, P.hp);
    if (!P.alive) { await wait(5000); TK.sim(0.5); return { died: true, t, bossHp: Math.round(boss.hp) }; }
    P.hp = Math.min(TK.f.maxHp(), P.hp + 4); P.st = 200;
    t += 0.5; void h0;
  }
  TK.sim(4);
  return { type: bossType, dead: boss.dead, t, swings, hpStart, minHp: Math.round(minHp), attacks: Object.keys(attacks), drops: TK.DROPS.filter((d) => ['great_tusk', 'shirokiba_trophy', 'sacred_rope', 'osugi_trophy'].includes(d.st.id)).map((d) => d.st.id) };
};
window.__fight = fight;
out.b1 = await fight('altar1', 'boar_tusk', 2, 'shirokiba', 240);
for (const d of TK.DROPS.slice()) { P.pos.set(d.x, d.y, d.z); TK.sim(0.2); }
out.got = { tusk: P.inv.count('great_tusk'), trophy: P.inv.count('shirokiba_trophy') };
// offer the trophy, use the blessing
const sh = TK.poi('shrine');
TK.tp(sh.x, sh.z);
const ped = EVENTS.interactables(P.pos.x, P.pos.z).find((x) => x.prompt().includes('Offer'));
if (ped) ped.use();
TK.press('KeyF');
out.blessing = { blessing: P.blessing, active: !!P.status.shirokiba, flags: EVENTS.S.flags };
return out;
//--- shot b_after1
const fight = window.__fight;
out.b2 = await fight('altar2', 'kami_seed', 3, 'osugi', 400);
return { b2: out.b2 };
//--- shot b_after2
// a night parade at a base
TK.peace(false); TK.god(true);
const bx = P.pos.x + 20, bz = P.pos.z;
TK.tp(bx, bz);
TK.place('workbench', bx + 2, heightAt(bx + 2, bz), bz, 0);
for (let i = 0; i < 14; i++) TK.place('wood_floor', bx - 6 + (i % 4) * 2, heightAt(bx - 6 + (i % 4) * 2, bz + 4 + Math.floor(i / 4) * 2) + 0.25, bz + 4 + Math.floor(i / 4) * 2, 0);
EVENTS.startRaid();
let seen = 0;
for (let k = 0; k < 40; k++) { TK.sim(3); seen = Math.max(seen, MOBS_LIVE.filter((m) => m.raid && !m.dead).length); }
return { raidMobsPeak: seen, raidOver: !EVENTS.S.raid, pieces: B.pieces.length };
