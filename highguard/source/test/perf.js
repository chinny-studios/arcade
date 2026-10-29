HG.manual(true);
HG.start({ mission: 'aster', seed: 2 });
HG.god(true);
const p = HG.G.player; p.ai = new (HG.G.ships[1].ai.constructor)(p, {});
HG.sim(40);
let t0 = performance.now();
for (let i = 0; i < 60; i++) HG.mission.update(1 / 60);
const upd = (performance.now() - t0) / 60;
HG.run(0.3);
t0 = performance.now();
for (let i = 0; i < 10; i++) { HG.Fx.update(1 / 60); HG.G.ships.forEach((s) => s.draw(1 / 60)); HG.Craft.draw(); HG.combat.draw(); HG.Fx.flushGlows(); HG.Fx.flushBolts(); }
const drw = (performance.now() - t0) / 10;
HG.look(30, -10, 1.4);
HG.render();
return { updMs: upd.toFixed(2), drawMs: drw.toFixed(2), state: HG.state(), fx: [HG.Fx.add.n, HG.Fx.smoke.n] };
//--- shot aster
