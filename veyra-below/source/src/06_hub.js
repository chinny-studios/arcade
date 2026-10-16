// Veyra Below — the Meridian deck: shops, artificer, bureau, lab and the teleporter down

const HUB_PAL = { floor: [0x5a6474, 0x525c6c, 0x626c7c], wall: 0x8a94a4, wall2: 0x6a7484, fog: 0x0a1020, bg: 0x04060c, hemiSky: 0xc0d4f0, hemiGnd: 0x2a3240, hemiI: 0.6, key: 0xf0f4ff, keyI: 0.6, glow: 0x60d8ff, pl: 0xc8e8ff };
const HUB_SPOTS = {
  commander: [15, 3.6, 0], shop: [6, 4.6, 0.6], artificer: [24, 4.6, -0.6], bank: [26.4, 11, -Math.PI / 2], bureau: [3.6, 11, Math.PI / 2],
  spritelab: [6, 17.4, Math.PI - 0.6], medic: [24, 17.4, Math.PI + 0.6], lobby: [15, 18.4, Math.PI],
};

function genHub() {
  const L = newLevel(30, 22, 'hub');
  L.area = 'hub'; L.style = 'grid'; L.seed = 'hub';
  const rm = { id: 0, x0: 2, y0: 2, x1: 27, y1: 19, type: 'hub' };
  for (let j = rm.y0; j <= rm.y1; j++) for (let i = rm.x0; i <= rm.x1; i++) {
    const cx = Math.min(i - rm.x0, rm.x1 - i), cy = Math.min(j - rm.y0, rm.y1 - j);
    if (cx + cy < 3) continue; // chamfered corners
    const k = tIdx(L, i, j); L.cells[k] = 1; L.room[k] = 0;
  }
  rm.ci = 15; rm.cj = 11; rm.doors = []; rm.links = []; L.rooms.push(rm);
  L.start = { x: tileCenter(15), z: tileCenter(15) };
  return L;
}

function planetTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#02030a'; g.fillRect(0, 0, 1024, 512);
  const r = RNG('stars');
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${r.range(0.2, 0.9)})`; const s = r() < 0.05 ? 2 : 1; g.fillRect(r() * 1024, r() * 512, s, s); }
  // Veyra: a blue-green world with a violet scar where the dome was
  const px = 512, py = 760, pr = 600;
  const grad = g.createRadialGradient(px - 160, py - 300, 60, px, py, pr);
  grad.addColorStop(0, '#6ac0e0'); grad.addColorStop(0.5, '#2a6a8a'); grad.addColorStop(1, '#0a1a2a');
  g.save(); g.beginPath(); g.arc(px, py, pr, 0, TAU); g.clip();
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 70; i++) {
    const a = r.range(-2.4, -0.7), d = r.range(0.3, 0.98) * pr, x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
    g.fillStyle = r() < 0.7 ? `rgba(70,${120 + r.int(0, 60)},60,0.55)` : 'rgba(150,120,80,0.45)';
    g.beginPath(); g.ellipse(x, y, r.range(10, 50), r.range(6, 22), r.range(0, 3), 0, TAU); g.fill();
  }
  for (let i = 0; i < 40; i++) { const a = r.range(-2.6, -0.5), d = r.range(0.2, 1) * pr; g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(px + Math.cos(a) * d, py + Math.sin(a) * d, r.range(30, 90), r.range(4, 10), r.range(-0.3, 0.3), 0, TAU); g.fill(); }
  const sg = g.createRadialGradient(470, 240, 2, 470, 240, 40); sg.addColorStop(0, 'rgba(220,120,255,0.95)'); sg.addColorStop(1, 'rgba(160,60,255,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(470, 240, 40, 0, TAU); g.fill();
  g.restore();
  // atmosphere rim
  g.strokeStyle = 'rgba(120,200,255,0.5)'; g.lineWidth = 8; g.beginPath(); g.arc(px, py, pr + 2, 0, TAU); g.stroke();
  return new THREE.CanvasTexture(c);
}

function buildHubMeshes(L) {
  const grp = buildLevelMeshes(L, HUB_PAL);
  // the observation window over Veyra, behind the north wall
  const win = mesh(GM.plane(), new THREE.MeshBasicMaterial({ map: planetTexture(), fog: false }), 15 * T, 6, 0.6 * T, 30 * T, 15 * T * 0.5, 1);
  grp.add(win);
  const winL = mesh(GM.plane(), new THREE.MeshBasicMaterial({ map: win.material.map, fog: false }), 0.6 * T, 6, 11 * T, 22 * T, 11 * T * 0.5, 1);
  winL.rotation.y = Math.PI / 2; grp.add(winL);
  // central dais with the teleporter
  const tele = makeTeleporter(0x60d8ff);
  tele.position.set(tileCenter(15), 0, tileCenter(10)); grp.add(tele);
  L.objects.push({ kind: 'tele', id: 'descend', x: tele.position.x, z: tele.position.z, r: 2.2, obj: tele, label: 'Teleporter: descend to Veyra' });
  // floor markings
  const ring = mesh(GM.ring(), mat(0x60d8ff, { basic: true, t: true, o: 0.5, add: true }), tileCenter(15), 0.02, tileCenter(10), 5.5, 5.5, 1);
  ring.rotation.x = -Math.PI / 2; grp.add(ring);
  // counters, NPCs and terminals
  L.npcs = [];
  for (const [id, [i, j, yaw]] of Object.entries(HUB_SPOTS)) {
    const n = NPCS[id], x = (i + 0.5) * T, z = (j + 0.5) * T;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let obj;
    if (n.terminal) {
      obj = PROPS.console(HUB_PAL, rnd); obj.position.set(x, 0, z); obj.rotation.y = yaw; grp.add(obj);
      const holo = mesh(GM.oct(), glowMat(0x60d8ff, 0.5), x, 2.0, z, 0.5, 0.7, 0.5); grp.add(holo); obj.userData.holo = holo;
    } else {
      const counter = new THREE.Group();
      part(counter, GM.box(), mat(0xd8dee8), 0, 0.5, 0, 2.6, 1.0, 0.7); part(counter, GM.box(), mat(0x60d8ff, { e: 0x60d8ff, ei: 0.8 }), 0, 1.02, 0.36, 2.6, 0.05, 0.04);
      counter.position.set(x + fx * 1.0, 0, z + fz * 1.0); counter.rotation.y = yaw; grp.add(counter);
      L.colliders.push({ x: x + fx * 1.0 - fz * 0.8, z: z + fz * 1.0 + fx * 0.8, r: 0.6 }, { x: x + fx * 1.0 + fz * 0.8, z: z + fz * 1.0 - fx * 0.8, r: 0.6 }, { x: x + fx * 1.0, z: z + fz * 1.0, r: 0.6 });
      const rig = makeHumanoid({ suit: n.color, suit2: 0x2a2e38, hair: n.hair || 0x2a2018, race: n.construct ? 'construct' : 'human', role: id === 'spritelab' ? 'psion' : id === 'artificer' ? 'vanguard' : 'none', glow: 0x60d8ff });
      rig.g.position.set(x, 0, z); rig.g.rotation.y = yaw; grp.add(rig.g);
      obj = rig.g; L.npcs.push({ id, rig, t: Math.random() * 5 });
    }
    L.colliders.push({ x, z, r: 0.5 });
    L.objects.push({ kind: 'npc', id, x: x + fx * 2.2, z: z + fz * 2.2, r: 2.0, obj, label: `${n.name} — ${n.role}` });
  }
  // decor: pillars with light strips, planters
  for (const [i, j] of [[9, 8], [21, 8], [9, 14], [21, 14]]) {
    const p = new THREE.Group(); part(p, GM.cyl6(), mat(0xc8d0dc), 0, 1.6, 0, 0.9, 3.2, 0.9); part(p, GM.cyl6(), mat(0x60d8ff, { e: 0x60d8ff }), 0, 1.6, 0, 0.95, 0.12, 0.95);
    p.position.set(tileCenter(i), 0, tileCenter(j)); grp.add(p); L.colliders.push({ x: p.position.x, z: p.position.z, r: 0.55 });
  }
  for (const [i, j] of [[12, 6], [18, 6], [12, 15], [18, 15]]) {
    const p = new THREE.Group(); part(p, GM.box(), mat(0x5a6470), 0, 0.3, 0, 1.2, 0.6, 1.2); const b = PROPS.bush(HUB_PAL, rnd); b.position.y = 0.4; b.scale.setScalar(0.8); p.add(b);
    p.position.set(tileCenter(i), 0, tileCenter(j)); grp.add(p); L.colliders.push({ x: p.position.x, z: p.position.z, r: 0.75 });
  }
  return grp;
}
function updateHub(L, dt, t) {
  if (!L.npcs) return;
  for (const n of L.npcs) { n.t += dt; animHumanoid(n.rig, { t: n.t, move: 0, state: 'talk' }, dt); }
  for (const o of L.objects) {
    if (o.kind === 'tele' && o.obj.userData.ring) { o.obj.userData.ring.rotation.z += dt; o.obj.userData.beam.material.opacity = 0.14 + Math.sin(t * 3) * 0.05; }
    if (o.obj && o.obj.userData.holo) { o.obj.userData.holo.rotation.y += dt * 1.5; o.obj.userData.holo.position.y = 2.0 + Math.sin(t * 2) * 0.1; }
  }
}
