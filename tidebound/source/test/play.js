// Plays the whole story headless: bedroom → lab (starter + rival) → Route 1 → cave (CHOP) → Route 2 → Lumen gym →
// rival at the lighthouse → credits → Lumarine. Run with: node test/smoke.mjs --start '{}' --steps test/play.js
// Uses autoText + autoBattle; menus are answered with the first option. Party levels are boosted before the gym
// so the run doesn't depend on grinding.
const W = TB.world;
TB.autoBattle = true;
TB.G().flags.intro_done = true;
out.log = [];
const top = () => { const s = TB.scenes(); return s[s.length - 1]; };
// keep the game moving until the world is idle: answer menus, tap through anything else
out.pump = async (max = 60) => {
  let idle = 0;
  for (let t = 0; t < max; t += 0.25) {
    const s = top();
    if (s === 'choose') TB.choose(out.picks && out.picks.length ? out.picks.shift() : 0);
    else if (s !== 'world' && s !== 'battle' && s !== 'dialog' && s !== 'evolve') TB.tap('a');
    await TB.sim(0.25);
    if (top() === 'world' && !W.isBusy()) { const m = TB.G().party[0]; if (m && m.hp < 25) { out.heals = (out.heals || 0) + 1; TB.boost(0); } }
    if (top() === 'world' && !W.isBusy()) { if (++idle >= 2) return true; } else idle = 0;
  }
  out.log.push('pump timeout at ' + JSON.stringify(TB.where()) + ' ' + TB.scenes().join('>') + ' ' + TB.dialogText());
  return false;
};
// BFS walk to (x, y) on the current map; stops early if the map changes
out.go = async (x, y, depth = 0) => {
  if (depth > 40) { out.log.push(`stuck going to ${x},${y} at ${JSON.stringify(TB.where())} ${TB.scenes().join('>')}`); return false; }
  const m0 = TB.G().map, p = W.player, key = (a, b) => a + ',' + b;
  const prev = new Map([[key(p.x, p.y), null]]), q = [[p.x, p.y]];
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  while (q.length) {
    const [cx, cy] = q.shift();
    if (cx === x && cy === y) break;
    for (const d in D) {
      const nx = cx + D[d][0], ny = cy + D[d][1], k = key(nx, ny);
      if (prev.has(k) || !(W._walkable(nx, ny) || (nx === x && ny === y))) continue;
      prev.set(k, [cx, cy, d]); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(x, y))) { out.log.push(`no path on ${m0} to ${x},${y} from ${p.x},${p.y}`); return false; }
  const dirs = [];
  for (let k = key(x, y); prev.get(k); ) { const [px, py, d] = prev.get(k); dirs.unshift(d); k = key(px, py); }
  let i = 0;
  while (i < dirs.length) {
    let n = 1; while (dirs[i + n] === dirs[i]) n++;
    await TB.step(dirs[i], n);
    await out.pump();
    if (TB.G().map !== m0) return true;
    if (W.player.x === x && W.player.y === y) return true;
    if (W.player.x !== x || W.player.y !== y) return out.go(x, y, depth + 1);   // interrupted (trainer, script): re-plan
    i += n;
  }
  return true;
};
// walk next to an npc, face it and press A
out.talk = async (id) => {
  const n = W.npc(id);
  if (!n) { out.log.push('no npc ' + id); return false; }
  for (const [dx, dy, dir] of [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down'], [0, 2, 'up']]) {
    if (!W._walkable(n.x + dx, n.y + dy)) continue;
    await out.go(n.x + dx, n.y + dy);
    W.player.dir = dir;
    await TB.tap('a');
    await out.pump(120);
    return true;
  }
  out.log.push('cannot reach ' + id);
  return false;
};
out.state = () => ({ where: TB.where(), party: TB.G().party.map((m) => `${m.sp} L${m.lv} ${m.hp}hp`), heals: out.heals, money: TB.G().money, flags: Object.keys(TB.G().flags).filter((f) => !f.includes(':')), log: out.log });
// bedroom → downstairs → outside
await out.go(8, 1); await out.pump();
await out.go(4, 7); await TB.step('down', 1); await out.pump();
//--- shot p1_shellport
// walking north without a starter is blocked
await out.go(13, 0); await TB.step('up', 1); await out.pump();
out.log.push('blocked: ' + TB.G().map);
await out.go(19, 6); await out.pump();
out.picks = [1];   // EMBIT
await out.talk('coral_lab');
await out.pump(120);
//--- shot p2_lab
await out.talk('coral_lab');
await out.go(4, 7); await TB.step('down', 1); await out.pump();
// Route 1 (the test checks the story, not balance: boost so a lone starter survives every encounter)
TB.boost(14);
await out.go(13, 0); await TB.step('up', 1); await out.pump();
//--- shot p3_route1
await out.go(13, 1); await out.pump();
// cave → Brine → exit
await out.talk('cv_brine');
out.log.push('chop: ' + TB.flags().got_chop);
//--- shot p4_cave
await out.go(26, 0); await out.pump();
// Route 2 → Lumen
await out.go(17, 0); await TB.step('up', 1); await out.pump();
//--- shot p5_lumen
// boost and heal before the gym so the test does not depend on grinding
TB.boost(22);
// gym: two trainers spot us on the way, then Marina
await out.go(20, 13); await out.go(20, 12); await out.pump();
//--- shot p6_gym
await out.talk('marina');
out.log.push('badge: ' + TB.G().badges.join(','));
await out.go(6, 11); await TB.step('down', 1); await out.pump();
// the rival waits at the lighthouse, then the credits
await out.go(32, 11); await out.pump(200);
for (let i = 0; i < 60 && TB.G().map !== 'lumen_center'; i++) await out.pump(5);
out.log.push('after rival2: ' + JSON.stringify(TB.where()));
//--- shot p7_after_credits
out.log.push('before exit: ' + JSON.stringify(TB.where()) + TB.scenes().join('>'));
await out.pump(30);
await out.go(5, 9); await TB.step('down', 1); await out.pump();
out.log.push('after exit: ' + JSON.stringify(TB.where()));
await out.go(32, 6); await out.pump();
await out.go(8, 1); await out.pump();
TB.boost(32);
await out.talk('lumarine'); await out.pump(120);
//--- shot p8_top
return out.state();
