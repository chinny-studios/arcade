// Screenshots: port screen, spyglass view, results screen.
SS.ui.leave(); await wait(1500);
return ['port'];
//--- shot port
SS.start({ cls: 'galleon', map: 1 }); SS.helm(4, 0); SS.sim(70); SS.look(SS.G.player.h, 600); SS.pc.spyK = 1; SS.render(); await wait(400); SS.render();
return [JSON.stringify(SS.state().caps)];
//--- shot spyglass
SS.pc.spyK = 0; SS.sim(10); SS.render(); await wait(300); SS.render();
return ['third person'];
//--- shot galleon
SS.god(true); for (let i = 0; i < 25 && SS.state().phase === 'battle'; i++) SS.sim(30);
SS.match.overT = 99; SS.render(); await wait(800);
return [JSON.stringify(SS.state().result)];
//--- shot results
