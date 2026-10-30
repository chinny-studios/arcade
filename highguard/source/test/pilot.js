// The remote strike fighter: launch, fly toward an enemy bomber and shoot it, torpedo a ship, lose the link,
// fly home and dock, relaunch, and lose the fighter.
HG.manual(true);
HG.start({ mission: 'broadside', seed: 3 }); HG.god(true);
const p = HG.G.player, I = HG.input, PC = HG.pc, r = {};
// Fly n seconds the way a player does: aim the camera at a point, hold the trigger if asked.
const fly = (sec, aimFn, fire) => { if (fire) I.press('M0'); else I.release('M0'); for (let t = 0; t < sec; t += 1 / 30) { if (aimFn && PC.pilot) { const d = aimFn().clone().sub(PC.camPos).normalize(); PC.yaw = Math.atan2(d.x, d.z); PC.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); } PC.update(1 / 30); HG.mission.update(1 / 30); PC.camera(1 / 30); I.endFrame(); } I.release('M0'); };
r.launched = HG.pilot(); r.ai = !!p.ai;
const f = PC.pilot; out.f = f;
fly(2.5);
r.flying = { mode: f.mode, speed: Math.round(f.speed), out: f.pos.distanceTo(p.pos) | 0 };
// A bomber placed ahead of the fighter, flying across its nose.
const bq = HG.enemy(0).squads.find((q) => q.type === 'bmb') || HG.enemy(1).squads.find((q) => q.type === 'bmb');
const C = HG.Craft; const b = new (f.constructor)('bmb', 1, bq); b.pos.copy(f.pos).addScaledVector(f.fwd, 600); b.fwd.set(1, 0, 0); b.want.set(1, 0, 0); b.mode = 'break'; b.timer = 99;
HG.G.craft.push(b); C.byTeam[1].push(b); out.b = b;
fly(4, () => PC.flead || b.pos, true);
r.bomber = { alive: b.alive, hp: Math.round(b.hp), kills: f.stats.kills, hitsDmg: Math.round(f.stats.dmg) };
// Torpedo run on the battleship's engines.
const e = HG.find('Ashen Oath'); HG.target(e, 'engines'); e.place(f.pos.x + f.fwd.x * 1300, f.pos.y + f.fwd.y * 1300, f.pos.z + f.fwd.z * 1300, 90);
fly(0.5, () => e.toWorld(e.subs.engines.p));
I.press('Space'); fly(1 / 30); I.release('Space'); fly(0.6); I.press('Space'); fly(1 / 30); I.release('Space');
r.torps = { left: f.torps, inFlight: HG.combat.torps.filter((t) => t.from === f).length };
HG.render();
return r;
//--- shot pilot_view
const f2 = out.f, p2 = HG.G.player, PC2 = HG.pc;
f2.pos.copy(p2.pos).add(new f2.pos.constructor(7600, 0, 0));
PC2.update(1 / 30);
const r2 = { pilotAfterLinkLoss: !!PC2.pilot, mode: f2.mode, shipAi: !!p2.ai };
f2.pos.copy(p2.pos).add(new f2.pos.constructor(1500, 0, 0));
HG.sim(25);
const q = p2.squads.find((s) => s.type === 'strike');
r2.docked = { alive: f2.alive, ready: q.ready, out: q.out.length };
r2.relaunch = HG.pilot();
const f3 = PC2.pilot; f3.hp = 1; f3.shield = 0; HG.G.god = false; HG.combat.craftDamage(f3, 50, HG.enemy(0)); PC2.update(1 / 30);
r2.afterDeath = { pilot: !!PC2.pilot, ready: q.ready, total: q.total };
HG.sim(31); r2.rebuilt = q.ready;
return r2;
