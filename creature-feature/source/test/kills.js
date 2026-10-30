// each monster kills someone with its attack
const res = {};
for (const m of ['vampire', 'werewolf', 'frank', 'mummy']) {
  CF.start({ monster: m });
  const v = CF.spawn('greaser', P_X = CF.P.x + 1.5, CF.P.z - 1.5);
  CF.aimAt(v);
  CF.press('atk');
  CF.sim(1.6);
  res[m] = { st: v.state, score: CF.G.score, kills: CF.G.kills, act: CF.P.act };
}
return res;
//--- shot kill
CF.start({ monster: 'werewolf' });
CF.tp(0, -12); CF.face(Math.PI);
const vs = [];
for (let i = 0; i < 3; i++) vs.push(CF.spawn(null, 0.6 * i - 0.6, -14.2));
CF.aimAt(vs[1]); CF.press('atk'); CF.sim(0.5);
CF.CAM.yaw += 2.2; CF.CAM.pitch = 0.35; CF.sim(0.3); CF.render();
return vs.map((v) => v.state);
//--- shot kill2
