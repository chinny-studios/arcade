// A real fight with effects on: after 50 s the line of battle should be scorched, burning and venting.
HG.manual(true);
HG.start({ mission: 'broadside', seed: 4 }); HG.god(true);
const p = HG.G.player; p.ai = new (HG.G.ships.find((s) => s.ai).ai.constructor)(p, {});
HG.run(window.__t || 50);
out.e = HG.G.ships.filter((s) => s.alive && s.team === 1).sort((a, b) => a.hull / a.maxHull - b.hull / b.maxHull)[0];
const c = out.e.centre(), d = out.e.fwd.clone();
const side = new c.constructor(d.z, 0, -d.x).normalize();
out.cam = [c.clone().addScaledVector(side, out.e.len * 0.9).addScaledVector(d, out.e.len * 0.3).add(new c.constructor(0, out.e.len * 0.35, 0)).toArray(), c.toArray()];
HG.cam(out.cam[0], out.cam[1]); HG.render();
return { name: out.e.name, cls: out.e.cls, hull: Math.round(out.e.hull / out.e.maxHull * 100), burns: out.e.burns.length, decals: out.e.secs.map((s) => s.dec ? s.dec.count : 0), debris: HG.Damage.debris.length };
//--- shot battered
out.cam[0] = out.cam[0].map((v, i) => v + (i === 1 ? 0 : 0)); const c2 = out.e.centre(); HG.cam([c2.x - (out.cam[0][0] - c2.x), out.cam[0][1], c2.z - (out.cam[0][2] - c2.z)], c2.toArray()); HG.render();
//--- shot battered_far
