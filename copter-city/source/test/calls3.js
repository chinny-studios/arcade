// riot, flood, chemical spill, tornado and earthquake (whichever the city has), in the Raptor
const H = CC.HELI, G = CC.G, r = {};
// teleport close, then fly the last stretch
const near = (x, z) => { if (Math.hypot(H.x - x, H.z - z) > 80) CC.tp(x + 50, z + 50, 25 + Math.max(0, F.roofBelow(x + 50, z + 50) > 0 ? F.roofBelow(x + 50, z + 50) : 0)); };
const land = (x, z) => { near(x, z); CC.fly(x, z, 45, { land: true, max: 100 }); CC.sim(1.5); return CC.stats(); };
const dropAtPad = () => { const p = F.nearestPad(H.x, H.z, ['home', 'hospital', 'police']); return land(p.x, p.z); };
const d0 = (P) => Math.hypot(H.x - P.x, H.z - P.z);
function ladderRescue(list) {
  F.selectEquip('ladder');
  for (let i = 0; i < 400; i++) {
    const P = list.find((q) => !q.state);
    if (!P || H.seats.length >= H.st.seats) break;
    if (d0(P) > 80) CC.tp(P.x + 20, P.z + 20, Math.max(P.baseY + 14, F.roofBelow(P.x + 20, P.z + 20) + 10));
    G.ap = { x: P.x, z: P.z, alt: P.baseY + 12.3, exact: d0(P) < 25 }; CC.sim(0.5);
  }
  G.ap = null;
}
const has = (t) => CC.CITY.def.calls.includes(t);
if (has('riot')) {
  const c = CC.call('riot');
  near(c.x, c.z); CC.fly(c.x, c.z, 30, { max: 80 });
  for (let i = 0; i < 8 && c.state === 'open'; i++) {
    const P = c.rioters.find((q) => !q.state); if (!P) break;
    G.ap = { x: P.x, z: P.z, alt: 25 }; CC.sim(2);
    if (i % 2) { F.selectEquip('mega'); F.useEquip(); } else { F.selectEquip('gas'); F.useEquip(); }
    CC.sim(3);
  }
  G.ap = null; CC.sim(6);
  r.riot = { state: c.state, left: c.rioters.filter((q) => !q.state).length, gas: H.gas, calls: CC.stats().calls };
}
if (has('flood')) {
  const c = CC.call('flood');
  ladderRescue(c.victims);
  r.flood1 = { seats: H.seats.length, left: c.victims.filter((q) => !q.state).length };
  dropAtPad(); CC.sim(1);
  if (c.state === 'open') { ladderRescue(c.victims); dropAtPad(); CC.sim(1); }
  r.flood = { state: c.state, saved: c.saved };
}
if (has('spill')) {
  const c = CC.call('spill');
  ladderRescue(c.victims); dropAtPad(); CC.sim(1);
  F.selectEquip('bucket');
  let wx = null; for (let a = 0; a < 6.3 && !wx; a += 0.2) for (let d = 40; d < 900 && !wx; d += 20) { const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; if (F.isWaterAt(x, z) && F.isWaterAt(x + 15, z) && F.isWaterAt(x - 15, z)) wx = { x, z }; }
  for (let trip = 0; trip < 6 && c.state === 'open' && wx; trip++) {
    near(wx.x, wx.z); CC.fly(wx.x, wx.z, 40, { max: 90 }); G.ap = { x: wx.x, z: wx.z, alt: 9, exact: true }; CC.sim(6);
    near(c.x, c.z); CC.fly(c.x, c.z, 25, { max: 90 }); G.ap = { x: c.x, z: c.z, alt: 25 }; CC.sim(1); F.useEquip(); CC.sim(3); G.ap = null;
  }
  r.spill = { state: c.state, tox: +c.tox.toFixed(2), saved: c.saved, water: wx };
}
if (has('twister')) {
  const c = CC.call('twister');
  for (let i = 0; i < 3; i++) { const P = c.victims.find((q) => !q.state); if (!P) break; land(P.x + 10, P.z + 10); CC.sim(5); }
  dropAtPad();
  for (let i = 0; i < 24 && c.state === 'open'; i++) { if (Math.hypot(H.x - c.x, H.z - c.z) < 120) { const p = F.nearestPad(c.x + 400, c.z, ['hospital', 'home', 'police']); CC.tp(p.x, p.z, 0); } CC.sim(5); }
  r.twister = { state: c.state, saved: c.saved, wrecked: c.wrecked || 0, calls: CC.stats().calls };
}
if (has('quake')) {
  const c = CC.call('quake');
  r.quake = { kids: c.kids.map((k) => k.type), calls: CC.stats().calls };
}
r.hit = G.lastHit; r.hp = Math.round(H.hp); r.money = G.career.money; r.dmg = G.dmgLog.slice(-6);
return r;
//--- shot calls3_end
