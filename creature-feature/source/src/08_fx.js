// Creature Feature — effects: blood droplets and debris (instanced cubes), blood pools on the ground, puffs of dust,
// sand and mist, flying limbs, the splatter on the screen, and camera shake

const FX = { blood: null, debris: null, parts: [], decals: [], decalIM: [], puffs: [], gibs: [], shake: 0, slow: 0 };
const MAX_BITS = 1100, MAX_DECALS = 70;
function initFX() {
  const box = new THREE.BoxGeometry(1, 1, 1);
  FX.blood = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_BITS);
  FX.debris = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), MAX_BITS);
  for (const im of [FX.blood, FX.debris]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.setColorAt(0, _col.setHex(0xffffff));
    im.count = 0; im.frustumCulled = false;
    R.scene.add(im);
  }
  FX.free = { blood: [], debris: [] };
  // blood pools: one instanced mesh per cell of the splat atlas
  for (let k = 0; k < 4; k++) {
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, ox = (k % 2) * 0.5, oy = 0.5 - Math.floor(k / 2) * 0.5;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) * 0.5, oy + uv.getY(i) * 0.5);
    const m = new THREE.MeshLambertMaterial({ map: TEX.blood, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, emissive: 0x300000 });
    const im = new THREE.InstancedMesh(g, m, MAX_DECALS);
    im.count = 0; im.frustumCulled = false; im.renderOrder = 2;
    R.scene.add(im); FX.decalIM.push(im);
  }
  // puffs: a pool of sprites
  for (let i = 0; i < 90; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.puff, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false; R.scene.add(s); FX.puffs.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 1, op: 0.6 });
  }
}
// spray n cubes from (x, y, z). o: { col: [hex...], dx, dz (direction), speed, up, spread, life, size, kind: 'blood' | 'debris', decal }
function spray(x, y, z, n, o = {}) {
  const kind = o.kind || 'blood', list = FX.parts;
  if (kind === 'blood' && OPTS.gore === 'mild') n = Math.ceil(n * 0.3);
  const cols = o.col || [0x8a0008, 0x6a0004, 0xb01018, 0x4a0002];
  for (let i = 0; i < n; i++) {
    if (list.length > MAX_BITS * 2 - 10) break;
    const sp = (o.speed || 4) * rr(0.4, 1.1), spread = o.spread === undefined ? 0.8 : o.spread;
    let dx = (o.dx || 0) + rr(-spread, spread), dz = (o.dz || 0) + rr(-spread, spread), dy = (o.up === undefined ? 0.6 : o.up) + rr(-spread, spread) * 0.6;
    const l = Math.hypot(dx, dy, dz) || 1;
    list.push({ kind, x: x + rr(-0.1, 0.1), y: y + rr(-0.1, 0.1), z: z + rr(-0.1, 0.1), vx: dx / l * sp, vy: dy / l * sp, vz: dz / l * sp, life: (o.life || 1.6) * rr(0.6, 1.2), size: (o.size || 0.07) * rr(0.5, 1.4), col: pick(cols), g: o.g === undefined ? 14 : o.g, decal: o.decal && chance(0.12), rest: false, ry: rr(0, 3) });
  }
}
function bloodBurst(x, y, z, dx, dz, power = 1) {
  spray(x, y, z, Math.round(40 * power), { dx: dx * 0.8, dz: dz * 0.8, speed: 4.5 * power, up: 0.7, spread: 0.9, decal: true });
  spray(x, y, z, Math.round(18 * power), { dx: dx * 1.4, dz: dz * 1.4, speed: 7 * power, up: 0.3, spread: 0.4, size: 0.05 });
}
// a blood pool that spreads over a second or two
function bloodPool(x, z, r, y) {
  if (OPTS.gore === 'mild') r *= 0.6;
  const yy = (y === undefined ? supportY(x, z, 50) : y) + 0.03 + (FX.decals.length % 7) * 0.002;
  if (FX.decals.length >= MAX_DECALS * 4) { const old = FX.decals.shift(); old.dead = true; }
  FX.decals.push({ x, z, y: yy, r, cur: 0.1, k: Math.floor(Math.random() * 4), ry: rr(0, TAU) });
  FX.decalDirty = true;
}
function puff(x, y, z, o = {}) {
  const p = FX.puffs.find((q) => q.life <= 0) || FX.puffs[Math.floor(Math.random() * FX.puffs.length)];
  p.life = p.max = o.life || 1.2; p.vx = o.vx || 0; p.vy = o.vy === undefined ? 0.6 : o.vy; p.vz = o.vz || 0; p.grow = o.grow || 1.5; p.op = o.op || 0.55;
  p.s.position.set(x, y, z); p.s.scale.setScalar(o.size || 1.2); p.s.material.color.setHex(o.col || 0xc8c0b0); p.s.material.opacity = p.op; p.s.visible = true;
}
function dustRing(x, z, r, n = 14, col = 0x9a8a70) {
  const y = supportY(x, z, 50) + 0.4;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; puff(x + Math.cos(a) * r * 0.3, y, z + Math.sin(a) * r * 0.3, { vx: Math.cos(a) * r * 0.9, vz: Math.sin(a) * r * 0.9, vy: 0.4, size: 1.6, grow: 2.4, life: 1.1, col, op: 0.5 }); }
}
// detach a limb (an Object3D in a rig) and send it flying
function gib(part, vx, vy, vz, owner) {
  if (!part.parent) return;
  part.updateWorldMatrix(true, false);
  const p = new V3(), q = new THREE.Quaternion(), s = new V3();
  part.matrixWorld.decompose(p, q, s);
  R.scene.attach(part);
  part.position.copy(p); part.quaternion.copy(q);
  const G2 = { o: part, vx, vy, vz, ax: rr(-12, 12), ay: rr(-8, 8), az: rr(-12, 12), t: 0, rest: false, owner };
  FX.gibs.push(G2);
  return G2;
}
// the splatter on the screen: blobs drawn onto a full-screen canvas, faded by CSS
function screenSplat(amount = 1) {
  if (OPTS.gore === 'mild') return;
  const c = $('#splat'); if (!c) return;
  const w = c.width = Math.min(innerWidth, 900), h = c.height = Math.round(w * innerHeight / innerWidth), x = c.getContext('2d');
  x.clearRect(0, 0, w, h);
  const n = Math.round(4 + amount * 8);
  for (let i = 0; i < n; i++) {
    const edge = Math.random() < 0.7;
    const px = edge ? (Math.random() < 0.5 ? rr(0, w * 0.25) : rr(w * 0.75, w)) : rr(0, w), py = rr(0, h), r = rr(8, 30) * (0.6 + amount * 0.5);
    x.fillStyle = `rgba(${110 + Math.random() * 60},0,${Math.random() * 10},${0.55 + Math.random() * 0.35})`;
    x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    for (let k = 0; k < 6; k++) { const a = Math.random() * TAU, d = r * rr(1, 2.2); x.beginPath(); x.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, r * rr(0.1, 0.35), 0, TAU); x.fill(); }
    if (Math.random() < 0.6) { x.fillRect(px - r * 0.15, py, r * 0.3, rr(r, r * 4)); }
  }
  c.style.transition = 'none'; c.style.opacity = 0.85;
  void c.offsetWidth;
  c.style.transition = 'opacity 2.6s ease-in 0.5s'; c.style.opacity = 0;
}

const _o3 = new THREE.Object3D();
function updateFX(dt) {
  // cubes
  const cnt = { blood: 0, debris: 0 };
  const L = FX.parts;
  for (let i = L.length - 1; i >= 0; i--) {
    const p = L[i];
    p.life -= dt;
    if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
    if (!p.rest) {
      p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const gy = p.gy === undefined || (G.frame + i) % 6 === 0 ? (p.gy = supportY(p.x, p.z, p.y + 0.3)) : p.gy;
      if (p.y < gy + p.size * 0.3) {
        p.y = gy + p.size * 0.3;
        if (p.kind === 'blood') { p.rest = true; p.life = Math.min(p.life + 3, 5); if (p.decal) bloodPool(p.x, p.z, rr(0.25, 0.6), gy); }
        else { p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; if (Math.abs(p.vy) < 0.5) p.rest = true; }
      }
    }
    const im = p.kind === 'blood' ? FX.blood : FX.debris, k = cnt[p.kind]++;
    if (k >= MAX_BITS) continue;
    const sc = p.rest && p.kind === 'blood' ? p.size * 1.3 : p.size;
    _o3.position.set(p.x, p.y, p.z); _o3.rotation.set(p.ry, p.ry * 2, 0);
    _o3.scale.set(sc, p.rest && p.kind === 'blood' ? 0.01 : sc, sc); _o3.updateMatrix();
    im.setMatrixAt(k, _o3.matrix); im.setColorAt(k, _col.setHex(p.col));
  }
  for (const k of ['blood', 'debris']) {
    const im = FX[k]; im.count = Math.min(cnt[k], MAX_BITS);
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
  // pools spread
  let grow = FX.decalDirty;
  for (const d of FX.decals) if (d.cur < d.r) { d.cur = Math.min(d.r, d.cur + dt * d.r * 0.8); grow = true; }
  if (grow) {
    FX.decalDirty = false;
    const n = [0, 0, 0, 0];
    for (const d of FX.decals) {
      const im = FX.decalIM[d.k]; if (n[d.k] >= MAX_DECALS) continue;
      _o3.position.set(d.x, d.y, d.z); _o3.rotation.set(0, d.ry, 0); _o3.scale.set(d.cur * 2, 1, d.cur * 2); _o3.updateMatrix();
      im.setMatrixAt(n[d.k]++, _o3.matrix);
    }
    FX.decalIM.forEach((im, k) => { im.count = n[k]; im.instanceMatrix.needsUpdate = true; });
  }
  // puffs
  for (const p of FX.puffs) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.s.visible = false; continue; }
    const f = p.life / p.max;
    p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
    p.vx *= 1 - dt * 2; p.vz *= 1 - dt * 2;
    p.s.scale.multiplyScalar(1 + dt * p.grow * 0.5);
    p.s.material.opacity = p.op * Math.min(1, f * 2) * Math.min(1, (1 - f) * 6);
  }
  // limbs
  for (const g of FX.gibs) {
    if (g.rest) continue;
    g.t += dt;
    g.vy -= 14 * dt;
    const o = g.o;
    o.position.x += g.vx * dt; o.position.y += g.vy * dt; o.position.z += g.vz * dt;
    o.rotation.x += g.ax * dt; o.rotation.y += g.ay * dt; o.rotation.z += g.az * dt;
    if (g.t < 1.2 && G.frame % 2 === 0) spray(o.position.x, o.position.y, o.position.z, 1, { speed: 0.6, up: 0.2, spread: 0.3, size: 0.06, decal: true });
    const gy = supportY(o.position.x, o.position.z, o.position.y + 0.2);
    if (o.position.y < gy + 0.1) {
      o.position.y = gy + 0.1;
      if (Math.abs(g.vy) > 2) { g.vy *= -0.3; g.vx *= 0.5; g.vz *= 0.5; g.ax *= 0.5; g.az *= 0.5; bloodPool(o.position.x, o.position.z, rr(0.3, 0.5), gy); }
      else { g.rest = true; o.rotation.x = Math.round(o.rotation.x / (Math.PI / 2)) * (Math.PI / 2) + 0.2; }
    }
  }
  FX.shake = Math.max(0, FX.shake - dt * 2.2);
}
// throw away limbs and stains (a new run)
function clearFX() {
  FX.parts.length = 0;
  for (const g of FX.gibs) if (g.o.parent) g.o.parent.remove(g.o);
  FX.gibs.length = 0; FX.decals.length = 0; FX.decalDirty = true;
  for (const p of FX.puffs) { p.life = 0; p.s.visible = false; }
}
