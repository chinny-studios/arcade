// Farhold — discoveries: planets, fauna, flora and minerals; naming; uploading for nanites

const DISC = { planets: {} };
// entry per planet: { name, visited, uploaded, sp: { [id]: { name, cat, uploaded } } }
function discEntry(pl) {
  let e = DISC.planets[pl.id];
  if (!e) { e = DISC.planets[pl.id] = { name: pl.name, sys: pl.sys.name, star: pl.sys.star.i, type: pl.type, visited: false, uploaded: false, sp: {} }; }
  return e;
}
function isDiscovered(pl, sp) { const e = DISC.planets[pl.id]; return !!(e && e.sp[sp.id]); }
function displayName(pl, sp) { const e = DISC.planets[pl.id]; return e && e.sp[sp.id] ? e.sp[sp.id].name : sp.name; }
function planetDisplayName(pl) { const e = DISC.planets[pl.id]; return e ? e.name : pl.name; }
const REWARD = { fauna: { Common: 900, Uncommon: 1800, Rare: 4200 }, flora: { Common: 280, Uncommon: 520, Rare: 900 }, mineral: { Common: 160, Uncommon: 320, Rare: 700 } };
function discover(pl, sp) {
  const e = discEntry(pl);
  if (e.sp[sp.id]) return false;
  e.sp[sp.id] = { name: sp.name, cat: sp.cat, uploaded: false };
  const u = REWARD[sp.cat] ? REWARD[sp.cat][sp.rarity || 'Common'] : 200;
  giveItem('units', u, true);
  HUD.discovery(sp, pl, u);
  AU.sfx('discover');
  bus.emit('discovered', pl, sp);
  // complete set bonus
  const fauna = planetFauna(pl);
  if (sp.cat === 'fauna' && fauna.length && fauna.every((f) => e.sp[f.id])) {
    giveItem('nanites', 60, true); giveItem('units', 12000, true);
    HUD.banner('All fauna discovered', 'win');
    HUD.msg('Zoological survey complete: 12,000 units and 60 nanites.', 'good');
  }
  return true;
}
function visitPlanet(pl) {
  const e = discEntry(pl);
  if (e.visited) return;
  e.visited = true;
  giveItem('units', 1000, true);
  HUD.banner(planetDisplayName(pl), 'win');
  HUD.msg('Planet discovered: ' + pl.name + ' (+1,000 units). Rename it from the discovery log.', 'good');
  bus.emit('planetDiscovered', pl);
}
function uploadPlanet(id) {
  const e = DISC.planets[id];
  if (!e) return 0;
  let nan = 0;
  if (!e.uploaded && e.visited) { e.uploaded = true; nan += 20; }
  for (const k in e.sp) { const s = e.sp[k]; if (!s.uploaded) { s.uploaded = true; nan += s.cat === 'fauna' ? 12 : 4; } }
  if (nan) { giveItem('nanites', nan); AU.sfx('upload'); bus.emit('uploaded', nan); }
  return nan;
}
function discoveryCounts() {
  let fauna = 0, flora = 0, mineral = 0, planets = 0, pending = 0;
  for (const id in DISC.planets) { const e = DISC.planets[id]; if (e.visited) planets++; if (e.visited && !e.uploaded) pending++; for (const k in e.sp) { const s = e.sp[k]; if (s.cat === 'fauna') fauna++; else if (s.cat === 'flora') flora++; else mineral++; if (!s.uploaded) pending++; } }
  return { fauna, flora, mineral, planets, pending };
}
