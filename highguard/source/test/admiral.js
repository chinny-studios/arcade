// The boarding mission: knock out the Mandate's engines and shield generator, the shuttle docks, the timer runs out.
HG.manual(true);
HG.start({ mission: 'admiral', seed: 5 });
HG.god(true);
const F = HG.find('Iron Mandate');
out.s = [];
HG.sim(20);
out.s.push(HG.state().objs);
// Strip the generator and engines directly, the way a well-aimed broadside would.
for (const k of ['shields', 'engines']) { const sub = F.subs[k]; F.damage(sub.hp + 10, sub.p.clone(), HG.G.player, 'bolt'); for (const f of ['fore', 'aft', 'port', 'stbd']) F.shield[f] = 0; F.damage(sub.max + 10, sub.p.clone(), HG.G.player, 'bolt'); }
out.dis = F.disabled;
HG.sim(3);
out.s.push(HG.state().objs, HG.craft().filter((c) => c.type === 'shuttle'));
for (let i = 0; i < 12; i++) { const st = HG.sim(10); out.s.push([st.time, st.phase, HG.craft().filter((c) => c.type === 'shuttle').map((c) => c.mode + ':' + c.hp).join(','), st.objs[2]]); if (st.phase !== 'play') break; }
out.final = HG.state();
out.hull = Math.round(F.hull);
return out;
