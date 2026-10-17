// Draw calls and triangles in typical views, and simulation cost per frame.
const R = RR.R, res = {};
const measure = (name) => { R.renderer.info.reset(); R.renderer.info.autoReset = false; RR.render(); res[name] = { calls: R.renderer.info.render.calls, tris: R.renderer.info.render.triangles }; R.renderer.info.autoReset = true; };
RR.sim(1); measure('station');
RR.call('mvc', { district: 'maple' }); RR.sim(3); measure('driving');
RR.toScene(); RR.respArrive(); RR.sim(1); RR.f.exitCab(); RR.sim(1); measure('scene');
RR.time(22); RR.sim(0.5); measure('scene night');
const t0 = performance.now(); RR.sim(5); res.simMsPerFrame = +((performance.now() - t0) / 150).toFixed(2);
return res;
