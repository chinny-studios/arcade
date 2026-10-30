// a crude bot hunts on foot with each monster until hunger runs out (or 8 minutes): how long, how many kills
const res = {};
for (const m of ['vampire', 'werewolf', 'frank', 'mummy']) {
  CF.start({ monster: m });
  let t = 0;
  while (!CF.G.over && t < 480) {
    const P = CF.P;
    if (CF.P.near && CF.P.near.kind === 'corpse' && CF.G.hunger < 80 && !P.act) { CF.press('use'); CF.sim(1.6); t += 1.6; continue; }
    if (CF.P.near && CF.P.near.kind === 'door' && !CF.P.near.empty && !P.act) { CF.press('use'); CF.sim(0.7); t += 0.7; continue; }
    let v = CF.nearest(['idle', 'walk', 'flee', 'cower', 'down', 'trance', 'blind']);
    let target = v;
    if (!v || Math.hypot(v.x - P.x, v.z - P.z) > 60) { const r = CF.TOWN.refuges.filter((q) => q.occ.length && !q.broken).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; if (r) target = { x: r.x + r.nx, z: r.z + r.nz }; }
    if (!target) { CF.sim(0.5); t += 0.5; continue; }
    const d = Math.hypot(target.x - P.x, target.z - P.z);
    CF.CAM.yaw = Math.atan2(-(target.x - P.x), -(target.z - P.z)); CF.CAM.pitch = 0.2;
    if (v && target === v && d < 3) { CF.press('atk'); CF.sim(0.5); t += 0.5; continue; }
    if (v && target === v && d < 16 && P.cd.a1 <= 0 && m !== 'frank') { CF.aimAt(v); CF.press('a1'); CF.sim(0.5); t += 0.5; continue; }
    if (m === 'frank' && v && d < 12 && P.cd.a2 <= 0) { CF.press('a2'); CF.sim(1); t += 1; continue; }
    CF.hold(['run'], 0.4, { x: 0, y: -1 }); t += 0.4;
  }
  res[m] = { t: Math.round(CF.G.t), kills: CF.G.kills, score: CF.G.score, fed: CF.G.fed, escaped: CF.G.escaped, over: CF.G.over, alive: Object.entries(CF.counts()).map(([k, n]) => k + n).join(' ') };
}
return res;
