// Screenshot tour: close-ups of the family, the living room, a pie menu, buy and build mode, CAS and the menu
const [maya, ben, jun] = S;
WL.sim(20);
WL.cam(maya.x, maya.z, 9, Math.PI / 4);
WL.render();
//--- shot closeup
WL.cam(10, 13, 15, Math.PI / 4 + 0.3);
WL.act(1, 'sofa', 'sit'); WL.act(0, 'tv', 'watchTV'); WL.social(2, 0, 'joke');
WL.sim(14);
WL.render();
//--- shot living
const fr = G.objects.find(o => o.type === 'fridge');
const [x, z] = [fr.x + 0.5, fr.z + 0.5];
WL.cam(x, z, 14, Math.PI / 4);
WL.render();
const p = WL.R.camera.position; // project to screen
const v = new WL.R.camera.position.constructor(x, 1, z).project(WL.R.camera);
const px = (v.x + 1) / 2 * innerWidth, py = (1 - v.y) / 2 * innerHeight;
WL.f.pieFor({ clientX: px, clientY: py }, { type: 'obj', obj: fr });
//--- shot pie
WL.f.closePie();
WL.f.setMode('buy');
WL.render();
//--- shot buy
WL.f.setMode('build');
WL.render();
//--- shot build
