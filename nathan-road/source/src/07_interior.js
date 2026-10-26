// 07_interior: inside Milton Mansion. A lobby runs back from Nathan Road past the mailboxes and the tenants' directory
// to the guard's desk and the lifts. Upstairs, each floor has a lift lobby and a corridor of four units, A to D; the
// tenants listed in the map data (clinics, physiotherapists, Chinese medicine practitioners, small offices) have their
// names on their doors and on the directory downstairs. The stairs at the top come out on the roof, once the guard
// lets you up. Interiors are their own small scene, lit by fluorescent tubes. The roof is in the street scene.
const MILTON = { scene: null, floor: 'G', segs: [], up: 100, plaques: {} };
const FLOORS = ['G', ...Array.from({ length: 16 }, (_, i) => String(i + 1)), 'R'];
const UNITS = [{ u: 'A', x: 4, s: -1 }, { u: 'B', x: 4, s: 1 }, { u: 'C', x: 11, s: -1 }, { u: 'D', x: 11, s: 1 }];

function miltonTenants() { return (MAP.milton || []).map(([floor, unit, zh, en]) => ({ floor, unit, zh, en, name: zh + '|' + en })); }

function buildMilton() {
  const sc = MILTON.scene = new THREE.Scene();
  const g = new Geo(), sg = new Geo();
  const seg = (ax, az, bx, bz) => MILTON.segs.push([ax, az, bx, bz]);
  const room = (x0, z0, x1, z1, y0, h, floorT, wallT, ceilT = T.whiteRender, open = '') => {
    g.col = [1, 1, 1];
    g.quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [x0 / 1.5, z1 / 1.5, x1 / 1.5, z1 / 1.5, x1 / 1.5, z0 / 1.5, x0 / 1.5, z0 / 1.5], floorT, [0, 1, 0]);
    g.col = [0.92, 0.92, 0.9];
    g.quad([x0, y0 + h, z0], [x1, y0 + h, z0], [x1, y0 + h, z1], [x0, y0 + h, z1], [0, 0, (x1 - x0) / 2, 0, (x1 - x0) / 2, (z1 - z0) / 2, 0, (z1 - z0) / 2], ceilT, [0, -1, 0]);
    g.col = [1, 1, 1];
    if (!open.includes('n')) g.wall(x1, z0, x0, z0, y0, y0 + h, wallT, 2, 2);
    if (!open.includes('s')) g.wall(x0, z1, x1, z1, y0, y0 + h, wallT, 2, 2);
    if (!open.includes('w')) g.wall(x0, z0, x0, z1, y0, y0 + h, wallT, 2, 2);
    if (!open.includes('e')) g.wall(x1, z1, x1, z0, y0, y0 + h, wallT, 2, 2);
  };
  const tube = (x0, z0, x1, z1, y) => { g.aux = [1.6, 0]; g.col = [1, 1, 0.97]; g.box(x0, y - 0.06, z0, x1, y, z1, T.lamp); g.aux = [0, 0]; g.col = [1, 1, 1]; };
  // ---------------- ground floor: the lobby from the Nathan Road door (x = 0) to the lifts (x = 31)
  const H = 3.1;
  room(0, -1.8, 22, 1.8, 0, H, T.terrazzo, T.tiles, T.whiteRender, 'we');
  room(22, -4, 31, 4, 0, H, T.terrazzo, T.tilesGreen, T.whiteRender, 'w');
  g.wall(22, -4, 22, -1.8, 0, H, T.tilesGreen, 2, 2); g.wall(22, 1.8, 22, 4, 0, H, T.tilesGreen, 2, 2);
  g.wall(0, -1.8, 0, 1.8, 2.6, H, T.tiles, 2, 2);
  g.aux = [0.9, 0]; g.quad([-0.2, 0, 1.8], [-0.2, 0, -1.8], [-0.2, 2.6, -1.8], [-0.2, 2.6, 1.8], [0, 0, 1, 0, 1, 1, 0, 1], T.shopOpen, [1, 0, 0]); g.aux = [0, 0];
  seg(0, -1.8, 0, 1.8);
  for (let x = 2; x < 22; x += 3.5) tube(x, -0.15, x + 1.4, 0.15, H);
  tube(25, -2, 28, -1.7, H); tube(25, 1.7, 28, 2, H);
  // mailboxes down one side, a granite dado down the other
  g.wall(12, -1.78, 4, -1.78, 0.5, 2.1, T.mailbox, 1, 1);
  g.col = [0.7, 0.68, 0.64]; g.wall(2, 1.78, 20, 1.78, 0, 1.0, T.granite, 2, 1); g.col = [1, 1, 1];
  seg(0, -1.8, 22, -1.8); seg(0, 1.8, 22, 1.8);
  // the lifts on the east wall, the guard's desk, the stair door, the earth-god shrine
  g.col = [0.75, 0.76, 0.78];
  for (const z of [-2.2, 1.0]) g.wall(30.98, z + 1.2, 30.98, z, 0, 2.2, T.doorMetal, 1.2, 2.2);
  g.col = [1, 1, 1];
  g.aux = [1.2, 0]; g.box(30.9, 1.2, -0.5, 31, 1.5, -0.3, T.lamp); g.aux = [0, 0];
  g.col = [0.55, 0.42, 0.3]; g.box(23.5, 0, 2.2, 26.5, 1.05, 3.2, T.white); g.col = [0.3, 0.3, 0.32]; g.box(23.4, 1.05, 2.1, 26.6, 1.12, 3.3, T.white); g.col = [1, 1, 1];
  seg(23.5, 2.2, 26.5, 2.2); seg(23.5, 2.2, 23.5, 3.2); seg(26.5, 2.2, 26.5, 3.2);
  g.wall(29.6, 3.98, 31, 3.98, 0, 2.1, T.doorMetal, 1.4, 2.1);
  g.col = [0.8, 0.12, 0.1]; g.aux = [0.6, 0]; g.box(30.4, 0, -3.95, 31, 0.7, -3.4, T.white); g.aux = [0, 0]; g.col = [1, 1, 1];
  seg(22, -1.8, 22, -4); seg(22, -4, 31, -4); seg(31, -4, 31, 4); seg(31, 4, 22, 4); seg(22, 4, 22, 1.8);
  // the directory: a header over a board of the listed tenants, by floor
  board(sg, 26.5, 2.75, -3.97, 1, 0, 3.6, 0.45, SIGNS.special.directory, 0.8);
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ map: directoryTexture() }));
  dm.position.set(26.5, 1.45, -3.96); sc.add(dm);
  MILTON.guardPos = [25, 3.0];
  MILTON.liftPos = [30.2, -0.6];
  MILTON.doorPos = [0.6, 0];
  MILTON.dirPos = [26.5, -3.0];
  // ---------------- the floors above (one model at y = MILTON.up): lift lobby, and a corridor of units A to D
  const U = MILTON.up;
  room(22, -3, 31, 3, U, 2.9, T.tiles, T.tilesGreen, T.whiteRender, 'w');
  room(2, -1.4, 22, 1.4, U, 2.8, T.terrazzo, T.whiteRender, T.whiteRender, 'e');
  g.wall(22, -3, 22, -1.4, U, U + 2.9, T.tilesGreen, 2, 2); g.wall(22, 1.4, 22, 3, U, U + 2.9, T.tilesGreen, 2, 2);
  for (const z of [-1.8, 0.6]) g.wall(30.98, z + 1.2, 30.98, z, U, U + 2.2, T.doorMetal, 1.2, 2.2);
  g.aux = [1.0, 0]; g.wall(2.02, -1.0, 2.02, 1.0, U + 0.9, U + 2.3, T.office1, 2, 1.4); g.aux = [0, 0];   // window onto Nathan Road
  for (let x = 4; x < 22; x += 4) tube(x, -0.12, x + 1.2, 0.12, U + 2.8);
  tube(25, -0.15, 28, 0.15, U + 2.9);
  for (const D of UNITS) {
    const z = D.s * 1.4, x = D.x;
    if (D.s < 0) g.wall(x + 1.3, z + 0.01, x, z + 0.01, U, U + 2.15, T.doorMetal, 1.3, 2.15); else g.wall(x, z - 0.01, x + 1.3, z - 0.01, U, U + 2.15, T.doorMetal, 1.3, 2.15);
    D.cx = x + 0.65; D.cz = z - D.s * 0.6;
  }
  // a fire door to the stairs at the street end
  g.col = [0.75, 0.3, 0.25]; g.wall(2.2, -1.4, 2.2, -0.3, U, U + 2.1, T.doorMetal, 1.1, 2.1); g.col = [1, 1, 1];
  MILTON.stairsPos = [3, -0.8];
  MILTON.segsUp = [[22, -1.4, 2, -1.4], [2, 1.4, 22, 1.4], [2, -1.4, 2, 1.4], [22, -1.4, 22, -3], [22, -3, 31, -3], [31, -3, 31, 3], [31, 3, 22, 3], [22, 3, 22, 1.4]];
  sc.add(g.mesh(makeMat({ nolm: true })));
  const smat = makeMat({ span: true, nolm: true, uniforms: { uA0: { value: SIGNS.tex } } });
  sc.add(sg.mesh(smat));
  // name plates on each floor's doors, shown for the floor you're on
  for (const f of FLOORS) {
    if (f === 'G' || f === 'R') continue;
    const pg = new Geo();
    for (const D of UNITS) {
      const tn = miltonTenants().find((t) => t.floor === f && t.unit === D.u);
      const sh = signH(tn ? tn.name : `|${f}${D.u}`, tn ? 'building' : 'other');
      board(pg, D.x + 0.65, U + 2.35, D.s * 1.4 - D.s * 0.03, D.s < 0 ? 1 : -1, 0, 1.3, 0.33, sh.uv, 0.5);
    }
    board(pg, 26.5, U + 2.4, 2.97, -1, 0, 1.2, 0.3, signH(`|${f}/F`, 'building').uv, 0.6);
    const m = pg.mesh(smat); m.visible = false; sc.add(m);
    MILTON.plaques[f] = m;
  }
  MILTON.npcs = {};
  MILTON.npcs.guard = makePerson({ shirt: [0.32, 0.38, 0.5], pants: [0.15, 0.17, 0.22], hair: [0.45, 0.45, 0.45], skin: 0.12, h: 0.97 }, 25, 0, 2.7, Math.PI, sc);
}
// the tenants' board in the lobby, written from the listings
function directoryTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 144;
  const x = c.getContext('2d');
  x.fillStyle = '#1b1a18'; x.fillRect(0, 0, 256, 144);
  x.strokeStyle = '#8a7a50'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 253, 141);
  const list = miltonTenants().slice().sort((a, b) => (+a.floor || 99) - (+b.floor || 99));
  const lh = Math.min(13, 132 / Math.max(8, list.length));
  x.textBaseline = 'middle';
  list.forEach((t, i) => {
    const y = 6 + lh * (i + 0.5);
    x.fillStyle = '#e8d8a0'; x.font = `700 ${lh - 2 | 0}px ${SIGN_FONT}`; x.textAlign = 'left';
    x.fillText(t.floor ? `${t.floor}/F ${t.unit}` : '—', 8, y);
    x.fillStyle = '#f2efe6'; const nmx = [t.zh, t.en].filter(Boolean).join(' ');
    fitFont(x, nmx, 190, lh - 2, 700); x.fillText(nmx, 58, y);
  });
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}
function tenantAt(floor, unit) { return miltonTenants().find((t) => t.floor === floor && t.unit === unit); }
const MILTON_SPACE = {
  name: 'milton', speed: 0.6,
  ground() { return MILTON.floor === 'G' ? 0 : MILTON.up; },
  collide(x, z, r) {
    const S = MILTON.floor === 'G' ? MILTON.segs : MILTON.segsUp;
    for (let it = 0; it < 2; it++) for (const s of S) {
      const d2 = segDist2(x, z, s[0], s[1], s[2], s[3]);
      if (d2 < r * r) {
        const dx = s[2] - s[0], dz = s[3] - s[1], l = dx * dx + dz * dz, t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / l, 0, 1);
        const nx = x - (s[0] + dx * t), nz = z - (s[1] + dz * t), d = Math.sqrt(d2) || 1e-4;
        x += nx / d * (r - d); z += nz / d * (r - d);
      }
    }
    return [x, z];
  },
  allowed(x, z) { return MILTON.floor === 'G' ? (x > 0.1 && x < 30.9 && z > -3.9 && z < 3.9) : (x > 2.1 && x < 30.9 && z > -2.9 && z < 2.9); },
  scene: () => MILTON.scene,
  light() {
    UNI.uAmb.value.setRGB(0.78, 0.8, 0.78); UNI.uSunCol.value.setRGB(0.18, 0.18, 0.17); UNI.uSunDir.value.set(0.2, 0.9, 0.1).normalize();
    UNI.uFogCol.value.setRGB(0.1, 0.1, 0.1); UNI.uFogNear.value = 20; UNI.uFogFar.value = 60;
  },
};
// the roof: walk inside Milton's footprint, fifty metres over Nathan Road
const ROOF = {
  name: 'roof', speed: 0.8,
  ground() { return MILTON.roofY; },
  collide(x, z, r) { return collide(x, z, r); },
  allowed(x, z) { return pointInRing(x, z, MILTON.roofRing); },
  scene: () => scene,
};
function enterMilton(floor = 'G') {
  MILTON.floor = floor;
  for (const k in MILTON.plaques) MILTON.plaques[k].visible = k === floor;
  PL.space = MILTON_SPACE;
  if (floor === 'G') { PL.x = 1.2; PL.z = 0; PL.yaw = -Math.PI / 2; }
  else { PL.x = 29.6; PL.z = 0; PL.yaw = Math.PI / 2; }
  PL.y = MILTON_SPACE.ground(); PL.pitch = 0;
}
function exitMilton() {
  const d = W.LP.miltonDoor;
  placePlayer(d[0] - 0.5, d[1], d[2] + Math.PI, STREET);
}
function enterRoof() {
  const B = W.byName['Milton Mansion'];
  MILTON.roofY = B.h; MILTON.roofRing = B.rings[0];
  PL.space = ROOF;
  // by the parapet over Nathan Road, looking south down the street towards the harbour
  const f = facadeFacing(B, -1, 0);
  PL.x = f[6] - f[4] * 2.2; PL.z = f[7] - f[5] * 2.2; PL.y = B.h; PL.yaw = Math.PI; PL.pitch = -0.08;
}
// a parapet and some rooftop clutter on Milton for when you're up there
function buildMiltonRoof() {
  const B = W.byName['Milton Mansion']; if (!B) return;
  const g = new Geo(), r = B.rings[0], y = B.h;
  for (let i = 0, n = r.length; i < n; i += 2) {
    const j = (i + 2) % n;
    g.wall(r[j], r[j + 1], r[i], r[i + 1], y, y + 1.1, T.concrete, 2, 1.1);
    g.wall(r[i], r[i + 1], r[j], r[j + 1], y, y + 1.1, T.concrete, 2, 1.1);
    g.col = [0.7, 0.7, 0.7];
    const ax = r[i], az = r[i + 1], bx = r[j], bz = r[j + 1];
    g.quad([ax, y + 1.1, az], [bx, y + 1.1, bz], [bx + (B.cx - bx) * 0.02, y + 1.1, bz + (B.cz - bz) * 0.02], [ax + (B.cx - ax) * 0.02, y + 1.1, az + (B.cz - az) * 0.02], [0, 0, 1, 0, 1, 1, 0, 1], T.concrete);
    g.col = [1, 1, 1];
  }
  g.box(B.cx + 4, y, B.cz - 2, B.cx + 8, y + 3, B.cz + 2, { side: T.concrete, top: T.roof }, 2);
  g.wall(B.cx + 4, B.cz + 0.8, B.cx + 4, B.cz - 0.8, y, y + 2.1, T.doorMetal, 1.6, 2.1);
  g.col = [0.85, 0.85, 0.8]; g.cyl(B.cx - 6, y, B.cz - 1, 1.3, 2.4, 8, T.metal, T.metal); g.cyl(B.cx - 2.5, y, B.cz + 2, 1.1, 2.0, 8, T.metal, T.metal);
  g.col = [1, 1, 1];
  const m = g.mesh(MAT.world); m.name = 'miltonRoof'; scene.add(m);
  MILTON.roofDoor = [B.cx + 3.4, B.cz];
  addBox(B.cx + 6, B.cz, 2, 2, 0, 9); addCircle(B.cx - 6, B.cz - 1, 1.4, 6, 9); addCircle(B.cx - 2.5, B.cz + 2, 1.2, 6, 9);
}
