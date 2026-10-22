// Copter City — fire: buildings and loose objects (cars, a ship) burn, grow, spread to neighbours and burn down;
// water from the bucket knocks them back. Fires hurt a helicopter that hovers in the flames.

const FIRE = { list: [], incidents: [] };
const fireArea = (f) => f.w * f.d;

function newIncident(o = {}) { const I = Object.assign({ fires: [], lost: 0, out: 0, started: G.t }, o); FIRE.incidents.push(I); return I; }
function igniteBuilding(B, I0 = 0.35, inc = null) {
  if (!B || B.burnt || B.noFire || B.fireRef) return B && B.fireRef;
  const f = { kind: 'b', B, x: B.cx, z: B.cz, w: B.x1 - B.x0, d: B.z1 - B.z0, h: B.h, I: I0, dmg: 0, inc, emit: 0 };
  B.fireRef = f; B.fire = I0;
  FIRE.list.push(f); if (inc) inc.fires.push(f);
  bus.emit('fireStart', f);
  return f;
}
// a fire that isn't a building: a car, the ship, a chemical truck. Moves with obj if given.
function igniteSpot(x, y, z, w, d, h, I0 = 0.5, inc = null, obj = null) {
  const f = { kind: 's', x, y, z, w, d, h, I: I0, dmg: 0, inc, obj, emit: 0, noBurn: true };
  FIRE.list.push(f); if (inc) inc.fires.push(f);
  return f;
}
function removeFire(f) {
  const i = FIRE.list.indexOf(f); if (i >= 0) FIRE.list.splice(i, 1);
  if (f.B) { f.B.fireRef = null; f.B.fire = 0; }
}
function clearFires() { for (const f of FIRE.list.slice()) removeFire(f); FIRE.incidents = []; }
function fireBase(f) { return f.kind === 'b' ? 0 : f.y; }

function updateFire(dt) {
  const H = HELI;
  let glow = null, gd = 1e9;
  for (const f of FIRE.list.slice()) {
    if (f.obj) { f.x = f.obj.x; f.z = f.obj.z; }
    // growth
    f.I = Math.min(1, f.I + 0.0045 * (1 + f.I) * dt * (f.inc && f.inc.slow ? 0.5 : 1));
    if (f.B) f.B.fire = f.I;
    if (!f.noBurn) {
      f.dmg += f.I * dt / (90 + Math.sqrt(fireArea(f)) * 4);
      if (f.dmg >= 1) { // it's gone
        removeFire(f); burnDown(f.B);
        if (f.inc) f.inc.lost++;
        bus.emit('burntDown', f);
        for (let i = 0; i < 20; i++) smoke(f.x + rr(-f.w, f.w) * 0.4, f.h * 0.35, f.z + rr(-f.d, f.d) * 0.4, 1.5);
        AUDIO.sfx('collapse');
        continue;
      }
      // spread to neighbours
      if (f.I > 0.6 && Math.random() < 0.02 * f.I * dt * (OPTS.spread === false ? 0 : 1)) {
        const B = f.B;
        const near = CITY.buildings.filter((o) => o !== B && !o.burnt && !o.noFire && !o.fireRef && o.x0 < B.x1 + 9 && o.x1 > B.x0 - 9 && o.z0 < B.z1 + 9 && o.z1 > B.z0 - 9);
        if (near.length) { igniteBuilding(pick(near), 0.15, f.inc); if (f.inc) msg('The fire is spreading to the next building!', 'bad'); }
      }
    }
    // visuals: flames from the roof and the upper windows, smoke above. Far fires emit less.
    const cd = dist(f.x, f.z, R.camera.position.x, R.camera.position.z);
    const lod = cd > 700 ? 0.15 : cd > 350 ? 0.4 : 1;
    const top = f.kind === 'b' ? f.h : f.y + f.h;
    f.emit += dt * (10 + Math.sqrt(fireArea(f)) * 2.4) * (0.25 + f.I) * lod;
    while (f.emit > 1) {
      f.emit -= 1;
      const fx = f.x + rr(-0.45, 0.45) * f.w, fz = f.z + rr(-0.45, 0.45) * f.d;
      if (f.kind === 'b' && Math.random() < 0.35) { // out of a window
        const side = Math.floor(Math.random() * 4), y = rr(Math.max(1, f.h * 0.3), f.h);
        const wx = side === 0 ? f.B.x0 : side === 1 ? f.B.x1 : fx, wz = side === 2 ? f.B.z0 : side === 3 ? f.B.z1 : fz;
        flame(wx, y, wz, 0.9 + f.I);
      } else flame(fx, top, fz, 1.2 + f.I * 1.6);
      if (Math.random() < 0.45) smoke(fx, top + 2, fz, 0.8 + f.I);
    }
    if (cd < gd) { gd = cd; glow = f; }
    // heat: hovering in or just above the flames hurts
    const inX = Math.abs(H.x - f.x) < f.w / 2 + 3, inZ = Math.abs(H.z - f.z) < f.d / 2 + 3;
    if (inX && inZ && H.y < top + 4 + f.I * 10 && H.y > fireBase(f) - 2 && G.where === 'heli') {
      damageHeli(f.I * 7 * dt * (H.type === 'firehawk' || H.type === 'hauler' ? 0.5 : 1), 'fire');
      if ((G.heatT = (G.heatT || 0) - dt) <= 0) { toast('Too hot! Back off the flames.', 'bad'); G.heatT = 4; }
    }
  }
  // the nearest fire lights its surroundings
  if (glow && gd < 260) { R.fill.position.set(glow.x, (glow.kind === 'b' ? glow.h : glow.y + glow.h) + 4, glow.z); R.fill.intensity = glow.I * (0.8 + Math.random() * 0.4) * (0.5 + R.night); }
  else R.fill.intensity = 0;
}
// water lands at (x, y, z): every fire it touches loses intensity
bus.on('water', (x, y, z, L) => {
  for (const f of FIRE.list.slice()) {
    const pad = 2.5 + L / 220;
    if (Math.abs(x - f.x) > f.w / 2 + pad || Math.abs(z - f.z) > f.d / 2 + pad) continue;
    const top = f.kind === 'b' ? f.h : f.y + f.h;
    if (y > top + 3) continue;
    const k = L / (fireArea(f) * 1.5 + 300);
    f.I -= k;
    steam(x, top, z, 0.8 + Math.sqrt(fireArea(f)) / 18);
    AUDIO.sfx('hiss');
    if (f.I <= 0.02) {
      removeFire(f);
      if (f.inc) f.inc.out++;
      bus.emit('fireOut', f);
      for (let i = 0; i < 10; i++) smoke(f.x, top + 1, f.z, 1, 0);
    }
  }
});
function nearestFire(x, z, inc) { let best = null, bd = 1e12; for (const f of FIRE.list) { if (inc && f.inc !== inc) continue; const d = dist2(x, z, f.x, f.z); if (d < bd) { bd = d; best = f; } } return best; }
