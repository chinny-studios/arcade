CF.start({ monster: 'werewolf' });
CF.tp(10, 2); CF.face(Math.PI);
const vs = [];
for (let i = 0; i < 3; i++) vs.push(CF.spawn(null, 9.4 + 0.7 * i, 4.3));
CF.aimAt(vs[1]); CF.press('atk'); CF.sim(0.45);
CF.CAM.yaw += 2.4; CF.CAM.pitch = 0.3; CF.CAM.snap = true; CF.sim(0.05); CF.render();
return vs.map((v) => v.state);
//--- shot kill2
CF.start({ monster: 'frank' });
CF.tp(-60, 2); CF.face(Math.PI);
const ws = [];
for (let i = 0; i < 5; i++) ws.push(CF.spawn(null, -66 + i * 3, 6));
CF.f.stomp(); CF.sim(0.4);
CF.CAM.yaw = 0.4; CF.CAM.pitch = 0.45; CF.CAM.snap = true; CF.sim(0.05); CF.render();
return ws.map((v) => v.state);
//--- shot stomp
CF.start({ monster: 'mummy' });
CF.tp(60, -2); CF.face(0);
CF.press('a2'); CF.sim(2);
CF.render();
return CF.stats();
//--- shot storm
