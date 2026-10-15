// UI screens. node test/smoke.mjs --steps test/ui.js
TK.peace(true); TK.mute();
for (const [id, n] of [['wood', 37], ['stone', 18], ['flint', 9], ['resin', 14], ['leather_scraps', 7], ['deer_hide', 3], ['raw_boar', 2], ['strawberry', 12], ['bamboo', 20], ['straw', 16]]) TK.give(id, n);
TK.f.craft(TK.f.recipeFor('hammer'), {}); TK.f.craft(TK.f.recipeFor('stone_axe'), {}); TK.f.craft(TK.f.recipeFor('club'), {}); TK.f.craft(TK.f.recipeFor('torch'), {});
TK.equip('stone_axe');
const sh = TK.poi('shrine');
const wx = sh.x + 20, wz = sh.z + 6;
TK.place('workbench', wx, heightAt(wx, wz), wz, 0);
for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) TK.place('wood_pole', wx + dx, heightAt(wx + dx, wz + dz), wz + dz, 0);
const top = Math.max(...[[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].map(([dx, dz]) => heightAt(wx + dx, wz + dz))) + 2;
TK.place('roof26', wx, top, wz, 0);
TK.place('roof26', wx, top, wz - 2, Math.PI);
TK.tp(wx - 2.5, wz - 0.5);
TK.UI.openInventory(null);
TK.sim(0.2);
out.levels = TK.f.BUILD.stationsAt(P.pos.x, P.pos.z, P.pos.y);
return out;
//--- shot u_inventory
TK.UI.closeAll(false);
TK.equip('hammer');
TK.UI.openBuildMenu('hammer');
TK.sim(0.1);
//--- shot u_build
TK.UI.closeAll(false);
document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
TK.sim(0.2);
//--- shot u_map
