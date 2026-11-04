// title flow with the real buttons: New Game, play a moment, save & quit, Continue
localStorage.clear(); window.__mute = true;
F.Main.toTitle(); KE.sim(0.2);
const r = { title: F.G.state, cont: !document.querySelector('#bContinue').hidden };
document.querySelector('#bNew').click(); KE.sim(0.5);
r.afterNew = [F.G.state, F.G.area];
await say(); KE.sim(0.2);
H.place(-1.2, -0.9, Math.PI); KE.use(); await say();
KE.press('pause'); KE.sim(0.1); r.paused = F.G.state;
document.querySelector('#pTitle').click(); KE.sim(0.2);
r.back = [F.G.state, !document.querySelector('#bContinue').hidden];
document.querySelector('#bContinue').click(); KE.sim(0.5);
r.cont2 = [F.G.state, F.G.area, KE.state().items];
KE.press('map'); KE.sim(0.1); r.map = F.G.state;
return r;
//--- shot u_map
KE.press('map'); KE.sim(0.1);
return F.G.state;
