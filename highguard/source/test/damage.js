// Hull damage visuals: fresh glowing scorch marks, chunks flying, charred hull, a wrecked subsystem, fires and vents.
HG.manual(true);
HG.start({ mission: 'broadside', seed: 2 }); HG.god(true); HG.peace();
const p = HG.G.player;
out.e = HG.find('Ashen Oath');
for (const s of HG.G.ships) if (s !== p && s !== out.e) s.place(s.pos.x + 20000, s.pos.y, s.pos.z, 0);
HG.place(out.e, 950, 85, 3, p.yaw / (Math.PI / 180) + 180);
for (const f of ['fore', 'aft', 'port', 'stbd']) out.e.shield[f] = 0;
out.e.shieldBase = 1;
for (const k of [null, 'engines', 'shields', 'hangar', null, 'engines']) { HG.reload(); HG.aimAt(out.e, k); HG.fire(); HG.run(1.1); }
HG.reload(); HG.aimAt(out.e, 'port'); HG.fire(); HG.run(0.35);
const c = out.e.centre(), pp = p.pos;
out.side = c.clone().sub(pp).normalize(); const side = out.side;
out.cam = [c.clone().addScaledVector(side, -380).add(new pp.constructor(0, 160, 0)).toArray(), c.toArray()];
HG.cam(out.cam[0], out.cam[1]); HG.render();
//--- shot dmg_fresh
for (const k of ['port', 'bridge']) { const sub = out.e.subs[k]; out.e.damage(sub.hp + 50, sub.p.clone(), HG.G.player, "bolt"); }
HG.combat.torpedo(HG.G.player, out.e.centre().addScaledVector(out.side, -300), out.e);
HG.run(1.4); HG.cam(out.cam[0], out.cam[1]); HG.render();
//--- shot dmg_wreck
HG.run(9); HG.cam(out.cam[0], out.cam[1]); HG.render();
return { burns: out.e.burns.map((b) => b.kind), hull: Math.round(out.e.hull) };
//--- shot dmg_cooled
