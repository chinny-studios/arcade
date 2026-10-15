// Builds a small hut through the real ghost/snap path. node test/smoke.mjs --steps test/build.js
TK.peace(true); TK.god(true); TK.free(true);
TK.give('hammer', 1); TK.equip('hammer');
const placeAt = (id, x, y, z) => { B.select(id); aimAt(x, y, z); aimAt(x, y, z); const ok = B.tool.valid, why = B.tool.why, pos = B.tool.pos.toArray().map((v) => +v.toFixed(2)), yaw = +B.tool.snapYaw.toFixed(2); TK.click(0); TK.sim(0.5); return { id, ok, why, pos, yaw }; };
// find flat ground
let bx = P.pos.x + 25, bz = P.pos.z - 10;
TK.tp(bx - 6, bz + 3);
const log = [];
const h0 = heightAt(bx, bz);
TK.place('workbench', bx - 4, heightAt(bx - 4, bz + 4), bz + 4, 0);
// floors: aim at the ground, then at the neighbouring edges
log.push(placeAt('wood_floor', bx, h0, bz));
const f0 = B.pieces[B.pieces.length - 1];
log.push(placeAt('wood_floor', f0.x + 1.6, f0.y, f0.z));
log.push(placeAt('wood_floor', f0.x, f0.y, f0.z + 1.6));
log.push(placeAt('wood_floor', f0.x + 1.6, f0.y, f0.z + 2.0));
// walls on the outer edges
const edges = [[-1, 0.5], [-1, 2.5], [0.5, -1], [2.5, -1], [3, 0.5], [3, 2.5], [0.5, 3], [2.5, 3]];
for (const [ex, ez] of edges) log.push(placeAt(ex === 3 && ez === 0.5 ? 'wood_door' : 'wood_wall', f0.x + ex, f0.y + 0.05, f0.z + ez));
// roof: 45° slopes on top of the side walls
const top = f0.y + 2;
B.tool.yaw = 0;
log.push(placeAt('roof45', f0.x + 0.5, top + 0.2, f0.z - 0.9));
log.push(placeAt('roof45', f0.x + 2.5, top + 0.2, f0.z - 0.9));
B.tool.yaw = Math.PI;
log.push(placeAt('roof45', f0.x + 0.5, top + 0.2, f0.z + 2.9));
log.push(placeAt('roof45', f0.x + 2.5, top + 0.2, f0.z + 2.9));
out.log = log.map((l) => (l.ok ? 'OK ' : 'NO ') + l.id + ' ' + l.pos.join(',') + ' yaw ' + l.yaw + (l.why ? ' (' + l.why + ')' : ''));
out.pieces = B.pieces.length;
out.minSupport = Math.min(...B.pieces.map((p) => p.support));
TK.place('campfire', f0.x + 1, f0.y, f0.z + 1, 0);
TK.time(TK.G.time + 400);
TK.tp(f0.x - 5, f0.z + 6); aimAt(f0.x + 1, f0.y + 1, f0.z + 1);
TK.sim(0.5);
return out;
//--- shot build_hut
TK.press('KeyT');
TK.sim(0.2);
//--- shot build_support
