// Copter City — equipment: the water bucket on its cable (swings, fills when dipped, dumps on F), the rope ladder,
// tear gas canisters and their clouds, the megaphone, the searchlight and siren, and the seats.

const GEAR = { cable: null, bucket: null, bucketWater: null, ladder: null, drops: [], cans: [], clouds: [], megaT: 0, dumpT: 0, fillSnd: 0 };
const BUCKET_LEN = 12, LADDER_LEN = 13;

function buildGear() {
  for (const k of ['cable', 'bucket', 'ladder']) if (GEAR[k]) R.scene.remove(GEAR[k]);
  GEAR.cable = mesh(GM.box(), mat(0x202020), 0, 0, 0, 0.08, 1, 0.08); GEAR.cable.frustumCulled = false;
  const b = new THREE.Group();
  const big = HELI.st.bucket > 1500 ? 1.5 : HELI.st.bucket > 700 ? 1.25 : 1;
  b.add(mesh(new THREE.CylinderGeometry(1.1 * big, 0.8 * big, 1.6 * big, 8, 1, true), mat(0xe87a20, { ds: true, flat: true }), 0, 0.8 * big, 0));
  b.add(mesh(GM.disc(), mat(0x6a3a10), 0, 0.02, 0, 1.6 * big, 1, 1.6 * big));
  const w = mesh(GM.disc(), mat(0x4a8ac8, { basic: true }), 0, 0.8 * big, 0, 1.9 * big, 1, 1.9 * big); b.add(w); GEAR.bucketWater = w;
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; const s = mesh(GM.box(), mat(0x202020), Math.cos(a) * 0.5 * big, 2.2 * big, Math.sin(a) * 0.5 * big, 0.05, 1.4 * big, 0.05); s.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); b.add(s); }
  b.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  GEAR.bucket = b; GEAR.bucketH = 2.9 * big;
  const L = new Merger();
  for (const sx of [-0.35, 0.35]) L.box(sx, -LADDER_LEN, 0, 0.06, LADDER_LEN, 0.06, 0xc8b070);
  for (let y = 0.4; y < LADDER_LEN; y += 0.5) L.box(0, -y, 0, 0.7, 0.06, 0.08, 0x9a7a40);
  GEAR.ladder = new THREE.Mesh(L.build(), new THREE.MeshLambertMaterial({ vertexColors: true })); GEAR.ladder.frustumCulled = false;
  R.scene.add(GEAR.cable, GEAR.bucket, GEAR.ladder);
  GEAR.cable.visible = GEAR.bucket.visible = GEAR.ladder.visible = false;
  const h = hookPos();
  Object.assign(HELI.bucket, { x: h.x, y: h.y - BUCKET_LEN, z: h.z, vx: 0, vz: 0 });
  HELI.ladder.x = h.x; HELI.ladder.z = h.z;
}
function hookPos() { const m = HELI.model; return _v3.copy(m.hook).applyMatrix4(m.group.matrixWorld).clone(); }

function selectEquip(id) {
  const H = HELI;
  if (id && !H.st.equip.includes(id)) { toast(`The ${H.st.name} has no ${EQUIP[id].name.toLowerCase()}.`); AUDIO.sfx('deny'); return; }
  if (H.equip === id) return;
  H.equip = id;
  H.bucket.out = id === 'bucket';
  H.ladder.out = id === 'ladder';
  if (id) toast(EQUIP[id].name + (OPTS.tips ? ': ' + EQUIP[id].help : ''));
  AUDIO.sfx('click');
}
function cycleEquip(dir = 1) {
  const list = HELI.st.equip, i = list.indexOf(HELI.equip);
  selectEquip(list[(i + dir + list.length) % list.length]);
}
function useEquip() {
  const H = HELI;
  if (H.crashing || G.where !== 'heli') return;
  switch (H.equip) {
    case 'bucket':
      if (H.bucket.water > 5) { GEAR.dumpT = 1.4; GEAR.dumpRate = H.bucket.water / 1.4; AUDIO.sfx('dump'); }
      else toast('The bucket is empty. Dip it in the water to fill it.');
      break;
    case 'spot': H.spot = !H.spot; AUDIO.sfx('click'); toast(H.spot ? 'Searchlight on' : 'Searchlight off'); break;
    case 'mega': megaphone(); break;
    case 'gas':
      if (H.gas <= 0) { toast('Out of tear gas. Restock at the hangar.'); AUDIO.sfx('deny'); break; }
      H.gas--; dropCanister(); break;
    case 'ladder': toast(H.ladder.len > 2 ? 'Hover low over people so they can climb on.' : 'Lowering the ladder.'); break;
    default: toast('Pick some equipment: keys 1 to 5.');
  }
}
function toggleSiren() {
  if (!HELI.st.siren) { toast('No siren on this helicopter.'); return; }
  HELI.siren = !HELI.siren; AUDIO.siren(HELI.siren);
}

// ---------- each frame ----------
function updateGear(dt) {
  const H = HELI, h = hookPos();
  const showBucket = H.bucket.out && !H.crashed && H.st.bucket > 0;
  // the bucket hangs on its cable and swings behind when you fly
  const b = H.bucket;
  if (showBucket) {
    const tx = h.x - H.vx * 0.18, tz = h.z - H.vz * 0.18;
    b.vx += ((tx - b.x) * 6 - b.vx * 2.2) * dt; b.vz += ((tz - b.z) * 6 - b.vz * 2.2) * dt;
    b.x += b.vx * dt; b.z += b.vz * dt;
    let dx = b.x - h.x, dz = b.z - h.z; const dl = Math.hypot(dx, dz), mx = BUCKET_LEN * 0.8;
    if (dl > mx) { b.x = h.x + dx / dl * mx; b.z = h.z + dz / dl * mx; dx = b.x - h.x; dz = b.z - h.z; }
    let by = h.y - Math.sqrt(Math.max(1, BUCKET_LEN * BUCKET_LEN - dx * dx - dz * dz));
    const floor = surfaceY(b.x, b.z, by + 2);
    const wet = isWaterAt(b.x, b.z) && floor <= WATER_Y + 0.01;
    const bottom = wet ? WATER_Y - 0.9 : floor;
    if (by < bottom) by = bottom;
    b.y = by;
    // filling
    if (wet && by < WATER_Y + 0.7 && b.water < H.st.bucket) {
      b.water = Math.min(H.st.bucket, b.water + 520 * dt);
      if (Math.random() < 0.5) splash(b.x, WATER_Y, b.z, 3, 0.8);
      GEAR.fillSnd = 0.25;
      if (b.water >= H.st.bucket && !b.fullSaid) { b.fullSaid = true; toast('Bucket full'); AUDIO.sfx('ding'); }
    }
    if (b.water < H.st.bucket) b.fullSaid = false;
    GEAR.bucket.position.set(b.x, b.y, b.z);
    GEAR.bucket.rotation.set(dz * 0.06, 0, -dx * 0.06);
    GEAR.bucketWater.visible = b.water > 10; GEAR.bucketWater.scale.setScalar(1 + 0.2 * b.water / Math.max(1, H.st.bucket));
    stretchCable(h, b.x, b.y + GEAR.bucketH, b.z);
  } else { b.x = h.x; b.y = h.y - 2; b.z = h.z; b.vx = b.vz = 0; }
  GEAR.bucket.visible = showBucket;
  GEAR.fillSnd = Math.max(0, GEAR.fillSnd - dt);
  // dumping
  if (GEAR.dumpT > 0) {
    GEAR.dumpT -= dt;
    const out = Math.min(b.water, GEAR.dumpRate * dt);
    b.water -= out;
    GEAR.dumpAcc = (GEAR.dumpAcc || 0) + out;
    const sx = showBucket ? b.x : h.x, sy = showBucket ? b.y : h.y - 1, sz = showBucket ? b.z : h.z;
    for (let i = 0; i < 5; i++) spark({ x: sx + rr(-0.8, 0.8), y: sy + rr(-0.5, 0.5), z: sz + rr(-0.8, 0.8), vx: H.vx * 0.9 + rr(-1.5, 1.5), vy: H.vy - rr(0, 3), vz: H.vz * 0.9 + rr(-1.5, 1.5), life: 2.2, s0: 1.4, s1: 3.4, c0: [0.75, 0.85, 1, 0.75], c1: [0.85, 0.9, 1, 0.1], grav: 11, floor: surfaceY(sx, sz, sy) });
    if (GEAR.dumpAcc > 60 || (GEAR.dumpT <= 0 && GEAR.dumpAcc > 0)) {
      GEAR.drops.push({ x: sx, y: sy, z: sz, vx: H.vx * 0.9, vy: H.vy, vz: H.vz * 0.9, L: GEAR.dumpAcc });
      GEAR.dumpAcc = 0;
    }
    if (b.water <= 0) GEAR.dumpT = 0;
  }
  for (let i = GEAR.drops.length - 1; i >= 0; i--) {
    const d = GEAR.drops[i];
    d.vy -= 11 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    const s = surfaceY(d.x, d.z, d.y + 1);
    if (d.y <= s) { GEAR.drops.splice(i, 1); splash(d.x, s + 0.2, d.z, 8, 1.4); bus.emit('water', d.x, s, d.z, d.L); }
  }
  // the ladder unrolls when selected and rolls up when not, unless someone's on it
  const L = H.ladder;
  const want = L.out && !H.crashed ? LADDER_LEN : 0;
  if (!L.busy) L.len = want > L.len ? Math.min(want, L.len + 7 * dt) : Math.max(want, L.len - 9 * dt);
  if (L.len > 0.2) {
    L.x = damp(L.x || h.x, h.x - H.vx * 0.12, 5, dt); L.z = damp(L.z || h.z, h.z - H.vz * 0.12, 5, dt);
    L.y = Math.max(h.y - L.len, surfaceY(L.x, L.z, h.y) + 0.1);
    const len = h.y - L.y;
    GEAR.ladder.position.copy(h);
    GEAR.ladder.scale.set(1, len / LADDER_LEN, 1);
    GEAR.ladder.rotation.set((L.z - h.z) / Math.max(1, len) * 0.9, H.yaw, -(L.x - h.x) / Math.max(1, len) * 0.9, 'YXZ');
    GEAR.ladder.visible = true;
  } else { GEAR.ladder.visible = false; L.x = h.x; L.z = h.z; L.y = h.y; }
  GEAR.cable.visible = showBucket;
  // canisters and gas clouds
  for (let i = GEAR.cans.length - 1; i >= 0; i--) {
    const c = GEAR.cans[i];
    c.vy -= GRAV * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    c.mesh.position.set(c.x, c.y, c.z); c.mesh.rotation.x += dt * 8;
    gasPuff(c.x, c.y, c.z, 0.2);
    bus.emit('canister', c);
    const s = surfaceY(c.x, c.z, c.y + 1);
    if (c.y <= s) {
      R.scene.remove(c.mesh); GEAR.cans.splice(i, 1);
      const cl = { x: c.x, y: s, z: c.z, r: 10, t: 0, life: 14 };
      GEAR.clouds.push(cl); AUDIO.sfx('pop'); bus.emit('gas', cl);
    }
  }
  for (let i = GEAR.clouds.length - 1; i >= 0; i--) {
    const cl = GEAR.clouds[i];
    cl.t += dt;
    if (cl.t > cl.life) { GEAR.clouds.splice(i, 1); continue; }
    const k = 1 - cl.t / cl.life;
    for (let j = 0; j < 2; j++) if (Math.random() < k) gasPuff(cl.x + rr(-cl.r, cl.r) * 0.7, cl.y, cl.z + rr(-cl.r, cl.r) * 0.7, 1.2);
  }
  GEAR.megaT = Math.max(0, GEAR.megaT - dt);
}
function stretchCable(h, x, y, z) {
  const c = GEAR.cable, L = Math.max(0.1, dist3(h.x, h.y, h.z, x, y, z));
  c.position.set((h.x + x) / 2, (h.y + y) / 2, (h.z + z) / 2);
  c.scale.set(0.08, L, 0.08);
  c.lookAt(x, y, z); c.rotateX(Math.PI / 2);
}
function dropCanister() {
  const h = hookPos(), H = HELI;
  const m = mesh(GM.cyl(), mat(0x5a6a3a, { flat: true }), h.x, h.y, h.z, 0.35, 0.7, 0.35);
  R.scene.add(m);
  GEAR.cans.push({ x: h.x, y: h.y - 0.5, z: h.z, vx: H.vx, vy: H.vy - 9, vz: H.vz, mesh: m });
  AUDIO.sfx('thunk');
}
function inGas(x, z, pad = 0) { for (const c of GEAR.clouds) if (dist2(x, z, c.x, c.z) < (c.r + pad) ** 2) return c; return null; }
const MEGA_LINES = ['This is the city helicopter. Clear the area!', 'Move along, please. Nothing to see here.', 'Attention! Disperse immediately!', 'Pull over and let traffic through!', 'Stay calm. Help is on the way.', 'Hey you! Yes, you! Move it!'];
function megaphone() {
  if (GEAR.megaT > 0) return;
  GEAR.megaT = 2.2;
  const H = HELI, line = pick(MEGA_LINES);
  bubble(line);
  AUDIO.sfx('mega');
  bus.emit('mega', H.x, H.z, altAGL());
  G.fleePoints = [{ x: H.x, z: H.z, r: 30 }]; setTimeout(() => { G.fleePoints = []; }, 500);
}
// where people grab the ladder from: its bottom rung, if it's down far enough
function ladderTip() { const L = HELI.ladder; return L.len > 6 && !HELI.crashing ? { x: L.x, y: L.y, z: L.z } : null; }

// ---------- seats ----------
const seatsFree = () => HELI.st.seats - HELI.seats.length;
function board(kind, o = {}) { if (seatsFree() <= 0) return false; HELI.seats.push(Object.assign({ kind, t: 0 }, o)); bus.emit('seats'); return true; }
function unboard(filter) { const out = HELI.seats.filter(filter); HELI.seats = HELI.seats.filter((s) => !filter(s)); if (out.length) bus.emit('seats'); return out; }
