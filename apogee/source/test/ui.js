await wait(1500);
//--- shot ui_title
AP.unlockAll(); AP.f.toSelect(); await wait(300);
//--- shot ui_select
document.querySelector('.folder').click(); await wait(200);
//--- shot ui_diffs
document.querySelector('#diffs .b:nth-child(2)').click(); await wait(300);
//--- shot ui_brief
document.querySelector('#tabs .b:nth-child(3)').click(); await wait(100);
//--- shot ui_brief_q
AP.start(1, 1); AP.freeze(); AP.sim(0.3); AP.render(); AP.f.openWatch(); await wait(300);
//--- shot ui_watch
document.querySelector('#wtabs .b:nth-child(2)').click(); await wait(200);
//--- shot ui_watch_inv
document.querySelector('#wtabs .b:nth-child(3)').click(); await wait(200);
//--- shot ui_watch_opt
AP.f.closeWatch(); AP.f.G.stats.shots = 40; AP.f.G.stats.hits = 22; AP.f.G.stats.head = 6; AP.f.G.stats.kills = 9; AP.f.G.time = 312; AP.f.showEnd(true); await wait(300);
//--- shot ui_end
