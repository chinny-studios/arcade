// draw calls and triangles from street level, then the title flyover
CF.tp(-30, 6); CF.face(0.6); CF.sim(0.3); CF.render();
const i = CF.R.renderer.info.render;
return { calls: i.calls, tris: i.triangles };
//--- shot street
CF.f.endRun(); CF.UI.hide('over'); CF.UI.toTitle(); CF.G.tt = 30; CF.sim(0.1); CF.render();
const j = CF.R.renderer.info.render;
document.querySelector('#title').hidden = true;
return { calls: j.calls, tris: j.triangles };
//--- shot overview
