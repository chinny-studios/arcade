for (const m of [0, 1, 2]) { AP.start(m, 0); AP.freeze(); AP.peace(); AP.f.startIntro(); AP.sim(1.2); AP.render(); await wait(200); window['__i' + m] = 1; if (m === 0) break; }
//--- shot intro_m1
AP.start(1, 0); AP.freeze(); AP.peace(); AP.f.startIntro(); AP.sim(1.2); AP.render();
//--- shot intro_m2
AP.start(2, 0); AP.freeze(); AP.peace(); AP.f.startIntro(); AP.sim(1.6); AP.render();
//--- shot intro_m3
