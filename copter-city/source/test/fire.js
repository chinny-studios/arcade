// take off, fly forward, then a fire call: fill at the lake, dump on the fire until it's out
const H = CC.HELI;
let r = {};
r.lift = CC.hold({ lift: 1 }, 4);
r.fwd = CC.hold({ fwd: 1 }, 6);
r.turn = CC.hold({ turn: 1 }, 2);
const c = CC.call('fire');
r.call = { title: c.title, x: c.x, z: c.z, h: c.B.h };
// find water: the nearest lake cell
let best = null, bd = 1e12;
for (let x = 0; x < CC.CITY.size; x += 8) for (let z = 0; z < CC.CITY.size; z += 8) if (CC.f.isWaterAt(x, z)) { const d = (x - c.x) ** 2 + (z - c.z) ** 2; if (d < bd) { bd = d; best = { x, z }; } }
r.water = best;
out.c = c; out.best = best;
for (let trip = 0; trip < 8 && c.state === 'open'; trip++) {
  CC.fly(best.x, best.z, 30, { max: 60 });
  CC.G.ap = { x: best.x, z: best.z, alt: 8.5 }; CC.sim(6); CC.G.ap = null;
  const w = H.bucket.water;
  CC.fly(c.B.cx, c.B.cz, c.B.h + 16, { max: 60 });
  CC.G.ap = { x: c.B.cx, z: c.B.cz, alt: c.B.h + 16 }; CC.sim(2);
  CC.f.useEquip(); CC.sim(4); CC.G.ap = null;
  r['trip' + trip] = { w, fireI: c.B.fireRef ? +c.B.fireRef.I.toFixed(2) : 0, state: c.state };
}
r.end = CC.stats(); r.dmg = CC.G.dmgLog; r.hit = CC.G.lastHit;
return r;
//--- shot fire_end
