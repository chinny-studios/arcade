// Stand in the open on the pad and let the guards come. Then trigger an alarm and watch reinforcements.
AP.freeze(); AP.tp(30, 12, 0); AP.sim(0.1);
const G = AP.f.G;
const t0 = AP.state();
AP.sim(6);
out.after6 = AP.state();
out.states = G.actors.filter((a) => !a.dead).map((a) => a.state).join(',');
AP.render();
//--- shot ai_fight
AP.f.G.player.hp = 100; AP.god();
AP.alarm();
AP.sim(20);
out.alarm = AP.state();
out.reinf = AP.f.G.actors.filter((a) => a.reinforcement).length;
AP.render();
//--- shot ai_alarm
return out;
