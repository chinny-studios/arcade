HG.manual(true);
HG.start({ mission: 'broadside', seed: 2 });
HG.god(true);
HG.sim(8);
out.e = HG.find('Ashen Oath');
HG.place(out.e, 900, 85, 4, HG.G.player.yaw / (Math.PI / 180) + 180);
HG.reload();
HG.aimAt(out.e);
HG.render();
//--- shot aim
out.f = HG.fire(); HG.run(0.5); HG.aimAt(out.e); HG.render();
//--- shot volley
HG.run(0.6); HG.look(null, null, 0.8); HG.render();
return out.f;
//--- shot hits
