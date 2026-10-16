// Phone-sized layout (run with --w 390 --h 844, and --w 844 --h 390)
WL.sim(10);
WL.cam(12, 14, 26, Math.PI / 4);
WL.render();
//--- shot mobile_live
F.setMode('buy'); WL.render();
//--- shot mobile_buy
F.setMode('live');
F.pieFor({ clientX: innerWidth / 2, clientY: innerHeight / 2 }, { type: 'obj', obj: G.objects.find(o => o.type === 'fridge') });
//--- shot mobile_pie
