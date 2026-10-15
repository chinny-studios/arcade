// Farhold — survival: life support, hazard protection, temperature, shelter, shields and health, storms

const SURV = { sheltered: false, exposed: false, hazK: 0, warnLife: false, warnHaz: false, stormSpawnT: 0, kind: 'none' };
function updateSurvival(dt) {
  const P = PLAYER, st = P.stats;
  if (!P.alive) return;
  const f = P.frame;
  const pl = f && f.kind === 'planet' ? f.pl : null;
  // shelter
  const up = playerUp(new V3());
  SURV.sheltered = P.inShip || (f && f.kind === 'station') || (pl && COLL.sheltered(f, P.pos.clone().addScaledVector(up, 1.2), up));
  // weather on the current planet
  const W = pl ? WEATHER.update(dt, pl) : null;
  // life support
  if (P.inShip || (f && f.kind === 'station')) { if (f && f.kind === 'station') st.life = Math.min(100, st.life + dt * 1.5); }
  else {
    const drain = (100 / (22 * 60)) * (P.jetting ? 2.2 : 1) * techFx('life') * (P.swim ? 1.8 : 1);
    st.life = Math.max(0, st.life - drain * dt);
  }
  // hazard
  let k = 0, kind = 'none';
  if (pl && !SURV.sheltered) {
    const t = ENV.temp;
    if (pl.haz === 'toxic' || pl.haz === 'rad') { k = pl.hazMul; kind = pl.haz; }
    if (t > 45) { k = Math.max(k, (t - 45) / 50 * Math.max(pl.hazMul, 0.6)); kind = 'heat'; }
    else if (t < -15) { k = Math.max(k, (-15 - t) / 50 * Math.max(pl.hazMul, 0.6)); kind = 'cold'; }
    if (W && W.k > 0.3) k = k * (1 + W.k * 3) + W.k * 0.6;
    if (P.swim && pl.type === 'frozen') { k += 1; kind = 'cold'; }
  }
  SURV.hazK = k; SURV.kind = kind; SURV.exposed = k > 0.02;
  if (SURV.exposed) st.haz = Math.max(0, st.haz - dt * k * (100 / 210) * techFx('haz'));
  else if (SURV.sheltered || !pl) st.haz = Math.min(100, st.haz + dt * 3);
  // damage when empty
  if (st.life <= 0 && !P.inShip) hurtSurvival(dt * 3);
  if (st.haz <= 0 && SURV.exposed) hurtSurvival(dt * 4 * clamp(k, 0.5, 2));
  // shield regen and slow healing
  P.sinceHit += dt;
  if (P.sinceHit > 4) st.shield = Math.min(maxShield(), st.shield + dt * 14);
  if (P.sinceHit > 8 && st.life > 0 && (st.haz > 0 || !SURV.exposed)) st.hp = Math.min(100, st.hp + dt * 0.8);
  // warnings
  if (st.life < 20 && !SURV.warnLife) { SURV.warnLife = true; SOLA_say('lowlife'); AU.sfx('warn'); }
  if (st.life > 35) SURV.warnLife = false;
  if (st.haz < 20 && SURV.exposed && !SURV.warnHaz) { SURV.warnHaz = true; SOLA_say('lowhaz'); AU.sfx('warn'); }
  if (st.haz > 35) SURV.warnHaz = false;
  // storm crystals appear during storms
  if (W && W.on && W.k > 0.6 && pl && !P.inShip) {
    SURV.stormSpawnT -= dt;
    if (SURV.stormSpawnT <= 0) {
      SURV.stormSpawnT = 25;
      if (NAT.dyn.length < 4) {
        const sp = stormSpecies(pl);
        const dir = up.clone().addScaledVector(perpOf(up).applyAxisAngle(up, Math.random() * TAU), (25 + Math.random() * 50) / pl.R).normalize();
        const h = surfaceH(pl, dir);
        if (!(pl.P.sea != null && h < pl.P.sea)) natSpawnDyn(pl, sp, dir.clone().multiplyScalar(pl.R + h), dir);
      }
    }
  }
}
function stormSpecies(pl) {
  const fl = planetFlora(pl);
  if (!fl.stormSp) fl.stormSp = { id: 'storm', kind: 'storm', tpl: fl.storm, cat: 'mineral', name: 'Storm Crystal', pick: { item: 'storm', n: [1, 1] }, hp: 10, yield: { item: 'storm', n: [1, 1] }, rarity: 'Rare' };
  return fl.stormSp;
}
function hurtSurvival(amount) {
  const P = PLAYER;
  P.sinceHit = 0;
  const s = Math.min(P.stats.shield, amount); P.stats.shield -= s; amount -= s;
  P.stats.hp = Math.max(0, P.stats.hp - amount);
  if (Math.random() < 0.05) HUD.hurt('hp');
  if (P.stats.hp <= 0) killPlayer('environment');
}
bus.on('stormStart', (pl) => { if (ENV.pl === pl && !PLAYER.inShip) { HUD.banner(pl.storm.name, 'warn'); AU.sfx('storm'); } });
bus.on('stormEnd', (pl) => { if (ENV.pl === pl) HUD.msg('The storm has passed.', 'good'); });
// pickable plants & storm crystals
addInteractProvider((f) => {
  if (!f || f.kind !== 'planet') return null;
  const out = [];
  for (const o of NAT.near) {
    if (!o.alive || !o.sp.pick) continue;
    out.push({ key: o.key, pos: o.pos.clone().addScaledVector(o.up, o.h * 0.7), r: 1.6, prompt: '[interact] Harvest ' + ITEMS[o.sp.pick.item].name, act: () => { const r = natPick(o); if (r) { giveItem(r.item, r.n); AU.sfx('pickup'); bus.emit('harvest', r.item); } } });
  }
  for (const c of FAUNA.live) {
    if (!c.alive || c.fed || c.fly || c.sp.temper === 'predator' || c.state === 'chase') continue;
    out.push({ key: 'feed' + c.id, pos: c.pos.clone().addScaledVector(c.up, c.sp.size * 0.9), r: 1.2 + c.sp.size, prompt: '[interact] Feed (10 Carbon)', act: () => feedCreature(c) });
  }
  return out;
});
