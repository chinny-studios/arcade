// Title, campaign screen, a lost ship and the results screen, then a win and the next mission unlocking.
HG.manual(true);
HG.ui.campaign(); HG.run(2); HG.render();
//--- shot campaign
HG.start({ mission: 0, seed: 1 });
const p = HG.G.player;
p.damage(1e6, p.model.centre.clone(), HG.enemy(0), 'bolt'); p.damage(1e6, p.model.centre.clone(), HG.enemy(0), 'bolt');
HG.run(3); HG.render();
//--- shot dying
HG.run(2.5); HG.render();
out.lost = { state: HG.G.state, title: document.getElementById('restitle').textContent, why: document.getElementById('reswhy').textContent };
//--- shot lost
HG.start({ mission: 0, seed: 1 }); HG.killAll(1); HG.sim(6);
out.win = { state: HG.G.state, grade: HG.mission.grade, open: HG.progress.open, next: !document.getElementById('btnNext').hidden };
return out;
//--- shot won
