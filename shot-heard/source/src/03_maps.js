// Shot Heard — the four fields. Maps are authored in metres: x east, z south (north on the compass is -z).
// Terrain = height(x, z) + rivers + ravines + earthworks + trenches, then building pads. See 05_terrain.js.

const gauss = (x, z, cx, cz, r, h) => { const d2 = ((x - cx) * (x - cx) + (z - cz) * (z - cz)) / (r * r); return d2 > 9 ? 0 : h * Math.exp(-d2); };
const rect = (x, z, w, d) => [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]];
// a polyline shifted sideways by d metres (positive = to the right of travel)
function offsetLine(pts, d) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return [p[0] - (dz / l) * d, p[1] + (dx / l) * d];
  });
}
function subLine(pts, i0, i1) { return pts.slice(i0, i1 + 1); }
// signed coast distance for maps with a sea: positive on land
function coastDist(x, z, poly) { const d = distPolyEdge(x, z, poly); return pointInPoly(x, z, poly) ? d : -d; }

const LIGHTS = {
  dawn: { sun: [0.62, 0.22, -0.5], sunC: 0xffd2a0, sunI: 1.05, sky: 0xc8d2e0, gnd: 0x5c5444, hemiI: 0.78, fog: 0xd9cbb4, near: 40, far: 620,
    hor: 0xf2d6b0, zen: 0x7c9cc8, smoke: 0xf4ece0, grade: [1.06, 1.0, 0.92], sat: 0.92, warm: 0.04 },
  afternoon: { sun: [-0.35, 0.72, 0.45], sunC: 0xfff0d8, sunI: 1.1, sky: 0xc4d4ea, gnd: 0x6a6048, hemiI: 0.74, fog: 0xc9d1d6, near: 90, far: 1000,
    hor: 0xd9e2e8, zen: 0x4c7cc0, smoke: 0xf0f0f0, grade: [1.03, 1.0, 0.95], sat: 0.95, warm: 0.02 },
  autumn: { sun: [-0.55, 0.45, 0.35], sunC: 0xffe0b8, sunI: 1.08, sky: 0xc8cfe0, gnd: 0x6a5838, hemiI: 0.76, fog: 0xd2c6aa, near: 60, far: 760,
    hor: 0xeadcbc, zen: 0x6a8cbc, smoke: 0xf2ece2, grade: [1.06, 1.0, 0.9], sat: 0.98, warm: 0.04 },
  dusk: { sun: [-0.8, 0.14, 0.3], sunC: 0xff9858, sunI: 0.95, sky: 0x8a90b8, gnd: 0x4a3a30, hemiI: 0.66, fog: 0x8c7a7c, near: 50, far: 700,
    hor: 0xf0a060, zen: 0x2c3a6a, smoke: 0xd8c4b8, grade: [1.08, 0.97, 0.9], sat: 0.95, warm: 0.06 },
};

// ---------- Lexington & Concord ----------
const LEX_ROAD = [[-300, -165], [-240, -160], [-176, -150], [-120, -118], [-70, -60], [-40, -22], [20, 18], [60, 40], [110, 52], [140, 90], [170, 130], [212, 158], [290, 212], [320, 225]];
const LEX_RIVER = [[-200, 340], [-186, 200], [-200, 100], [-176, 0], [-190, -100], [-176, -150], [-170, -175], [-186, -250], [-172, -340]];
const MAP_LEX = {
  id: 'lexington', name: 'Lexington & Concord', date: '19 April 1775', light: 'dawn', size: 600, seed: 1775,
  blurb: 'Dawn on the Battle Road. Militia gather at the North Bridge while the regulars march out of Lexington. Stone walls, farmhouses and woodlots.',
  militia: 0.92, hessians: 0, flagStyle: { US: 'pine', GB: 'union' }, water: 0,
  grass: [0x7d9c4a, 0x93a85a, 0x6a8a40], field: 0x7a5e3e, forestFloor: 0x55663a, leaf: [0x557a32, 0x6a8a3a, 0x7c9a48, 0x4a6a30], pines: 0.3, autumn: 0,
  height(x, z) {
    let h = 4 + (fbm(x * 0.006 + 3, z * 0.006) - 0.5) * 10 + (fbm(x * 0.03, z * 0.03) - 0.5) * 1.2;
    h += gauss(x, z, -255, -235, 70, 13) + gauss(x, z, -10, -80, 45, 8) + gauss(x, z, 95, -50, 60, 7) + gauss(x, z, 150, 200, 55, 6) + gauss(x, z, -110, 210, 80, 7) + gauss(x, z, 260, -60, 80, 9);
    return h;
  },
  rivers: [{ pts: LEX_RIVER, w: 15, depth: 2.6, bank: 10 }],
  roads: [{ pts: LEX_ROAD, w: 5 }, { pts: [[-40, -22], [-62, 120], [-80, 330]], w: 4 }, { pts: [[212, 158], [232, -40], [240, -330]], w: 4 }, { pts: [[-240, -160], [-262, -205], [-268, -300]], w: 4 }, { pts: [[60, 40], [70, 180], [40, 330]], w: 3.5 }],
  fields: [
    { kind: 'plow', poly: [[-140, -40], [-80, -10], [-100, 60], [-160, 40]] },
    { kind: 'plow', poly: [[10, 60], [50, 70], [40, 140], [-10, 130]] },
    { kind: 'pasture', poly: [[80, 70], [130, 110], [110, 160], [70, 150]] },
    { kind: 'plow', poly: [[-20, -160], [60, -170], [70, -110], [0, -100]] },
    { kind: 'pasture', poly: [[-150, -230], [-80, -220], [-100, -160], [-150, -180]] },
    { kind: 'wheat', poly: [[150, -10], [210, 0], [200, 60], [150, 50]] },
    { kind: 'plow', poly: [[240, 80], [300, 80], [300, 140], [250, 130]] },
    { kind: 'orchard', poly: [[-110, 70], [-60, 80], [-70, 120], [-115, 110]] },
    { kind: 'orchard', poly: [[245, 40], [290, 45], [285, 75], [245, 70]] },
    { kind: 'pasture', poly: [[-270, 0], [-215, 10], [-220, 90], [-275, 80]] },
  ],
  forests: [
    { poly: [[95, -10], [150, -20], [165, 40], [130, 70], [95, 45]], d: 0.9 },
    { poly: [[150, 60], [175, 75], [190, 120], [160, 110]], d: 0.8 },
    { poly: [[90, -300], [250, -300], [260, -150], [150, -120], [90, -180]], d: 0.75 },
    { poly: [[-160, 150], [-40, 170], [-20, 320], [-170, 320]], d: 0.75 },
    { poly: [[-300, 60], [-215, 110], [-220, 320], [-300, 320]], d: 0.65 },
    { poly: [[-160, -330], [-20, -330], [-40, -230], [-150, -260]], d: 0.6 },
    { poly: [[120, 230], [320, 290], [320, 330], [100, 330]], d: 0.6 },
    { poly: [[270, -300], [330, -300], [330, 40], [280, 20]], d: 0.6 },
  ],
  trees: 900,
  walls: [
    { kind: 'stone', pts: subLine(offsetLine(LEX_ROAD, 7), 5, 11) },
    { kind: 'stone', pts: subLine(offsetLine(LEX_ROAD, -7), 6, 10) },
    { kind: 'stone', pts: [[-140, -40], [-80, -10], [-100, 60]] },
    { kind: 'stone', pts: [[10, 60], [50, 70], [40, 140]] },
    { kind: 'stone', pts: [[-20, -160], [60, -170], [70, -110]] },
    { kind: 'stone', pts: [[150, -10], [210, 0], [200, 60]] },
    { kind: 'stone', pts: [[-150, -230], [-80, -220], [-100, -160]] },
    { kind: 'stone', pts: [[-270, 0], [-215, 10], [-220, 90]] },
    { kind: 'stone', pts: [[80, 70], [130, 110], [110, 160]] },
    { kind: 'rail', pts: [[195, 138], [245, 150], [216, 196], [195, 138]] },
    { kind: 'rail', pts: [[-58, -48], [-6, -50], [-4, -2], [-56, 2]] },
    { kind: 'worm', pts: [[240, 80], [300, 80], [300, 140]] },
    { kind: 'worm', pts: [[-110, 70], [-60, 80], [-70, 120], [-115, 110], [-110, 70]] },
    { kind: 'stone', pts: [[-200, -150], [-200, -120], [-230, -95]] },
    { kind: 'stone', pts: [[-150, -170], [-150, -130]] },
  ],
  buildings: [
    { x: -30, z: -40, yaw: 0.05, w: 14, d: 20, floors: 2, kind: 'church', style: 'clap' },
    { x: -8, z: -6, yaw: 0.6, w: 10, d: 8, floors: 2, style: 'clapred' },
    { x: -62, z: -28, yaw: 0.7, w: 9, d: 7, floors: 2, style: 'clap' },
    { x: -78, z: -2, yaw: 0.7, w: 8, d: 7, floors: 1, style: 'clapgrey' },
    { x: -22, z: 22, yaw: -0.2, w: 9, d: 7, floors: 2, style: 'clap' },
    { x: 14, z: -32, yaw: 0.7, w: 8, d: 6, floors: 2, style: 'clapgrey' },
    { x: -52, z: 32, yaw: 0.2, w: 10, d: 8, floors: 1, kind: 'barn', style: 'barn' },
    { x: 6, z: 44, yaw: 0.6, w: 8, d: 7, floors: 2, style: 'clapred' },
    { x: -98, z: -82, yaw: 0.7, w: 9, d: 7, floors: 2, style: 'clap' },
    { x: -262, z: -185, yaw: 0.1, w: 10, d: 8, floors: 2, style: 'clapred' },
    { x: -240, z: -205, yaw: 0.1, w: 12, d: 9, floors: 1, kind: 'barn', style: 'barn' },
    { x: -150, z: -105, yaw: 0.9, w: 8, d: 7, floors: 2, style: 'clap' },
    { x: 56, z: 62, yaw: 0.35, w: 10, d: 8, floors: 2, style: 'clapred' },
    { x: 78, z: 72, yaw: 0.35, w: 11, d: 8, floors: 1, kind: 'barn', style: 'barn' },
    { x: 40, z: 24, yaw: 0.6, w: 8, d: 6, floors: 1, style: 'clapgrey' },
    { x: 118, z: 34, yaw: 0.3, w: 10, d: 7, floors: 2, style: 'clap' },
    { x: 150, z: 118, yaw: 0.9, w: 8, d: 7, floors: 2, style: 'clapgrey' },
    { x: 222, z: 168, yaw: 0.6, w: 13, d: 18, floors: 2, kind: 'church', style: 'clap' },
    { x: 196, z: 126, yaw: 0.6, w: 12, d: 9, floors: 2, style: 'clapred' },
    { x: 242, z: 122, yaw: 0.6, w: 9, d: 7, floors: 2, style: 'clap' },
    { x: 262, z: 176, yaw: 0.6, w: 9, d: 7, floors: 2, style: 'clapgrey' },
    { x: 184, z: 188, yaw: 0.6, w: 8, d: 7, floors: 1, style: 'clap' },
    { x: 228, z: 108, yaw: 0.6, w: 10, d: 8, floors: 1, kind: 'barn', style: 'barn' },
    { x: 270, z: 150, yaw: 0.4, w: 9, d: 8, floors: 2, style: 'clapred' },
  ],
  bridges: [{ x: -176, z: -150, yaw: Math.PI / 2 - 0.25, len: 26, w: 4.2 }],
  flags: [
    { id: 'A', name: 'North Bridge', x: -165, z: -148, r: 16 },
    { id: 'B', name: 'Concord', x: -28, z: -22, r: 22 },
    { id: 'C', name: "Meriam's Corner", x: 38, z: 28, r: 18 },
    { id: 'D', name: 'Bloody Angle', x: 122, z: 70, r: 18 },
    { id: 'E', name: 'Lexington Green', x: 216, z: 160, r: 20 },
  ],
  hq: [{ x: -226, z: -224, r: 22 }, { x: 282, z: 272, r: 22 }],
  breakthrough: { attacker: GB, sectors: [['E'], ['D', 'C'], ['B'], ['A']] },
  cannons: [{ team: GB, x: 250, z: 232, yaw: -2.3 }, { team: GB, x: 262, z: 222, yaw: -2.3 }, { team: US, x: -236, z: -222, yaw: 0.8 }],
  horses: [{ team: GB, x: 290, z: 252 }, { team: GB, x: 294, z: 258 }, { team: US, x: -244, z: -240 }, { team: US, x: -250, z: -234 }],
  ships: [],
  camps: [{ team: GB, x: 286, z: 282, n: 4 }, { team: US, x: -240, z: -252, n: 2 }],
};

// ---------- Bunker Hill ----------
const BH_LAND = [[-360, -70], [-280, -60], [-230, -130], [-140, -200], [-20, -240], [110, -245], [210, -205], [280, -130], [305, -30], [295, 80], [255, 175], [175, 235], [50, 255], [-70, 225], [-170, 150], [-240, 60], [-285, 15], [-360, 20]];
const MAP_BH = {
  id: 'bunker', name: 'Bunker Hill', date: '17 June 1775', light: 'afternoon', size: 640, seed: 617,
  blurb: 'Provincials dig in on Breed\'s Hill as the regulars land from the harbour. Charlestown burns below the redoubt; gunboats work the shore.',
  militia: 0.85, hessians: 0, flagStyle: { US: 'pine', GB: 'union' }, water: 0, coast: (x, z) => coastDist(x, z, BH_LAND),
  grass: [0x7f9a40, 0x9aa858, 0x6c8a38], field: 0x9a8a4a, forestFloor: 0x52643a, leaf: [0x4f7230, 0x5f823a, 0x6a8c40], pines: 0.1, autumn: 0,
  height(x, z) {
    let h = 3 + (fbm(x * 0.007, z * 0.007 + 7) - 0.5) * 6 + (fbm(x * 0.03, z * 0.03) - 0.5) * 0.8;
    h += gauss(x, z, 20, -10, 80, 22) + gauss(x, z, -130, -100, 85, 30) + gauss(x, z, 210, 120, 50, 5) + gauss(x, z, -50, -50, 60, 8);
    const c = coastDist(x, z, BH_LAND);
    if (c < 30) h = lerp(-7, h, smooth(-25, 30, c));
    return h;
  },
  works: [
    { pts: [[0, -32], [42, -32], [44, 10], [2, 12], [0, -32]], inside: [21, -10], h: 2.3, ditch: 1.6, gaps: [[2, 12]] },
    { pts: [[44, -14], [66, -60], [92, -108]], inside: [20, -60], h: 1.9, ditch: 1.0 },
  ],
  roads: [{ pts: [[-340, -20], [-250, -10], [-170, -40], [-90, -40], [-20, 30], [40, 110], [80, 160], [140, 200]], w: 4.5 }, { pts: [[0, 140], [180, 160]], w: 4 }, { pts: [[70, 110], [80, 220]], w: 4 }, { pts: [[20, 200], [150, 120], [230, 130]], w: 3.5 }],
  fields: [
    { kind: 'hay', poly: [[60, -40], [160, -60], [230, 20], [180, 80], [80, 40]] },
    { kind: 'hay', poly: [[-60, -160], [60, -200], [90, -120], [-10, -90]] },
    { kind: 'pasture', poly: [[-250, -40], [-190, -100], [-120, -30], [-200, 30]] },
    { kind: 'hay', poly: [[-100, 40], [0, 60], [-20, 140], [-120, 120]] },
    { kind: 'pasture', poly: [[120, -200], [200, -190], [230, -100], [150, -100]] },
    { kind: 'orchard', poly: [[-60, 70], [-10, 80], [-20, 120], [-70, 110]] },
  ],
  forests: [{ poly: [[-240, 20], [-180, 60], [-200, 100], [-250, 60]], d: 0.5 }, { poly: [[-100, -200], [-40, -220], [-30, -180], [-90, -170]], d: 0.4 }],
  trees: 220,
  walls: [
    { kind: 'rail', pts: [[95, -112], [125, -142], [155, -172], [186, -204]], hay: true },
    { kind: 'rail', pts: [[100, -118], [130, -148], [160, -178], [190, -208]], hay: true },
    { kind: 'stone', pts: [[188, -208], [208, -226]] },
    { kind: 'worm', pts: [[60, -40], [160, -60], [230, 20]] },
    { kind: 'worm', pts: [[-60, -160], [60, -200], [90, -120]] },
    { kind: 'worm', pts: [[-250, -40], [-190, -100], [-120, -30]] },
    { kind: 'rail', pts: [[-100, 40], [0, 60], [-20, 140]] },
    { kind: 'stone', pts: [[120, -200], [200, -190], [230, -100]] },
  ],
  villages: [{ x0: 0, z0: 120, x1: 175, z1: 225, n: 30, yaw: 0.35, styles: ['clap', 'clapgrey', 'clapred', 'brick', 'clap'], burn: 0.45 }],
  buildings: [{ x: 70, z: 148, yaw: 0.35, w: 14, d: 20, floors: 2, kind: 'church', style: 'clap' }, { x: -150, z: -40, yaw: 0.2, w: 10, d: 8, floors: 2, style: 'clapgrey' }, { x: -175, z: -60, yaw: 0.2, w: 11, d: 8, floors: 1, kind: 'barn', style: 'barn' }],
  flags: [
    { id: 'A', name: 'Bunker Hill', x: -128, z: -98, r: 20 },
    { id: 'B', name: 'The Redoubt', x: 21, z: -10, r: 20 },
    { id: 'C', name: 'Breastwork', x: 74, z: -64, r: 15 },
    { id: 'D', name: 'Rail Fence', x: 146, z: -164, r: 18 },
    { id: 'E', name: 'Charlestown', x: 92, z: 176, r: 24 },
  ],
  hq: [{ x: -300, z: -24, r: 22 }, { x: 232, z: 132, r: 22 }],
  breakthrough: { attacker: GB, sectors: [['E', 'D'], ['C', 'B'], ['A']] },
  cannons: [{ flag: 'B', x: 12, z: -24, yaw: 0.6 }, { flag: 'B', x: 36, z: 4, yaw: 0.9 }, { team: GB, x: 216, z: 112, yaw: -2.2 }, { team: GB, x: 228, z: 104, yaw: -2.2 }, { flag: 'A', x: -112, z: -100, yaw: 1.4 }],
  horses: [{ team: GB, x: 250, z: 120 }, { team: GB, x: 254, z: 126 }, { team: US, x: -310, z: -40 }],
  ships: [
    { team: GB, x: 300, z: 200, yaw: -2.4, path: [[300, 200], [240, 270], [120, 296], [0, 286], [-100, 262], [0, 286], [120, 296], [240, 270]] },
    { team: US, x: -80, z: -285, yaw: 1.5, path: [[-80, -285], [60, -292], [190, -262], [262, -205], [190, -262], [60, -292]] },
  ],
  boats: [{ x: 262, z: 168, yaw: -0.4 }, { x: 270, z: 150, yaw: -0.2 }, { x: 280, z: 130, yaw: -0.1 }],
  camps: [{ team: GB, x: 240, z: 150, n: 3 }, { team: US, x: -315, z: -10, n: 3 }],
};

// ---------- Saratoga ----------
const SAR_RIVER = [[300, -380], [292, -200], [306, -50], [296, 100], [310, 250], [300, 380]];
const MAP_SAR = {
  id: 'saratoga', name: 'Saratoga', date: '7 October 1777', light: 'autumn', size: 700, seed: 1777,
  blurb: 'Burgoyne\'s last push through the autumn woods. Fight from Freeman\'s Farm to the Bemis Heights line, then storm the Balcarres and Breymann redoubts.',
  militia: 0.25, hessians: 0.38, flagStyle: { US: 'stars', GB: 'union' }, water: 0,
  grass: [0x8e9448, 0xa49a52, 0x7c8640], field: 0xc0a050, forestFloor: 0x7a5a32, leaf: [0xc8582a, 0xe0902c, 0xd8b03a, 0x9a4422, 0x7a8a34, 0xb87a2a], pines: 0.28, autumn: 1,
  height(x, z) {
    let h = 4 + 15 * smooth(252, 175, x) + (fbm(x * 0.006 + 11, z * 0.006 - 4) - 0.5) * 12 + (fbm(x * 0.03, z * 0.03) - 0.5) * 1.4;
    h += gauss(x, z, 110, 230, 70, 6) + gauss(x, z, -40, -160, 70, 5) + gauss(x, z, -230, -170, 50, 4) + gauss(x, z, -260, 60, 90, 8);
    return h;
  },
  rivers: [{ pts: SAR_RIVER, w: 64, depth: 4, bank: 18 }],
  ravines: [{ pts: [[-360, 90], [-220, 70], [-100, 92], [20, 78], [130, 96], [210, 84], [290, 100]], w: 34, depth: 8 }],
  works: [
    { pts: [[-90, -192], [10, -202], [32, -152], [2, -118], [-82, -124], [-90, -192]], inside: [-40, -160], h: 2.1, ditch: 1.2, gaps: [[-90, -192]], logs: true },
    { pts: [[-256, -196], [-256, -150], [-204, -150], [-204, -196]], inside: [-230, -175], h: 2.0, ditch: 1.0, logs: true },
    { pts: [[-40, 214], [40, 206], [110, 196], [180, 202], [232, 196]], inside: [100, 260], h: 2.0, ditch: 1.2, logs: true },
  ],
  roads: [{ pts: [[236, -360], [230, -150], [240, 0], [232, 200], [238, 360]], w: 4.5 }, { pts: [[0, 0], [-30, -120], [-30, -330]], w: 3.5 }, { pts: [[110, 215], [60, 130], [20, 40], [0, 0]], w: 3.5 }, { pts: [[-30, -130], [-150, -160], [-205, -172]], w: 3 }, { pts: [[0, 0], [120, -20], [230, -40]], w: 3.5 }, { pts: [[110, 215], [100, 360]], w: 3.5 }],
  fields: [
    { kind: 'stubble', poly: [[-80, -60], [70, -70], [90, 50], [-70, 60]] },
    { kind: 'wheat', poly: [[-220, 110], [-110, 100], [-100, 170], [-210, 180]] },
    { kind: 'pasture', poly: [[180, -320], [260, -320], [262, 320], [200, 320], [200, -100]] },
    { kind: 'clear', poly: [[-130, -230], [60, -235], [60, -100], [-130, -100]] },
    { kind: 'clear', poly: [[-290, -220], [-180, -220], [-180, -130], [-290, -130]] },
    { kind: 'clear', poly: [[-60, 180], [250, 170], [250, 330], [-60, 330]] },
    { kind: 'clear', poly: [[-80, -350], [160, -350], [160, -270], [-80, -270]] },
  ],
  forests: [{ poly: [[-350, -350], [190, -350], [190, 350], [-350, 350]], d: 0.85 }],
  clearings: [[0, 0, 95], [-40, -160, 75], [-230, -172, 55], [110, 240, 90], [-160, 140, 70], [60, -315, 70], [40, 320, 70]],
  trees: 2600,
  walls: [
    { kind: 'worm', pts: [[-80, -60], [70, -70], [90, 50], [-70, 60], [-80, -60]] },
    { kind: 'worm', pts: [[-220, 110], [-110, 100], [-100, 170]] },
    { kind: 'worm', pts: [[-40, -30], [40, -36]] },
  ],
  buildings: [
    { x: 12, z: -12, yaw: 0.1, w: 10, d: 8, floors: 2, style: 'log' },
    { x: -22, z: 18, yaw: 0.1, w: 12, d: 9, floors: 1, kind: 'barn', style: 'barn' },
    { x: 34, z: 26, yaw: -0.3, w: 7, d: 6, floors: 1, style: 'log' },
    { x: -150, z: 120, yaw: 0.2, w: 9, d: 7, floors: 1, style: 'log' },
    { x: -40, z: -150, yaw: 0, w: 8, d: 6, floors: 1, style: 'log' },
    { x: -230, z: -168, yaw: 0, w: 7, d: 6, floors: 1, style: 'log' },
    { x: 150, z: 250, yaw: 0, w: 10, d: 8, floors: 2, style: 'clapgrey' },
    { x: 222, z: -120, yaw: 0, w: 9, d: 7, floors: 2, style: 'clap' },
    { x: 230, z: 60, yaw: 0.1, w: 9, d: 7, floors: 1, style: 'log' },
  ],
  flags: [
    { id: 'A', name: 'Breymann Redoubt', x: -230, z: -173, r: 18 },
    { id: 'B', name: 'Balcarres Redoubt', x: -40, z: -160, r: 22 },
    { id: 'C', name: "Freeman's Farm", x: 4, z: 2, r: 24 },
    { id: 'D', name: 'Barber Wheatfield', x: -160, z: 140, r: 20 },
    { id: 'E', name: 'Bemis Heights', x: 110, z: 228, r: 22 },
  ],
  hq: [{ x: 40, z: 318, r: 24 }, { x: 60, z: -318, r: 24 }],
  breakthrough: { attacker: US, sectors: [['D', 'C'], ['B'], ['A']] },
  cannons: [{ flag: 'B', x: -60, z: -128, yaw: 0.2 }, { flag: 'B', x: -10, z: -126, yaw: -0.1 }, { flag: 'A', x: -222, z: -156, yaw: 0.5 }, { flag: 'E', x: 70, z: 214, yaw: Math.PI }, { flag: 'E', x: 160, z: 206, yaw: Math.PI }, { flag: 'C', x: 30, z: -40, yaw: 0 }],
  horses: [{ team: US, x: 20, z: 330 }, { team: US, x: 26, z: 334 }, { team: US, x: 32, z: 330 }, { team: GB, x: 80, z: -332 }, { team: GB, x: 86, z: -328 }, { team: GB, x: 74, z: -330 }],
  ships: [
    { team: GB, x: 300, z: -300, yaw: 0, path: [[300, -300], [300, -100], [302, 100], [304, 250], [302, 100], [300, -100]] },
    { team: US, x: 304, z: 300, yaw: Math.PI, path: [[304, 300], [302, 100], [300, -100], [298, -260], [300, -100], [302, 100]] },
  ],
  camps: [{ team: US, x: 60, z: 290, n: 8 }, { team: GB, x: 30, z: -300, n: 8 }],
};

// ---------- Yorktown ----------
const YT_COAST = (x) => -228 + 10 * Math.sin(x * 0.012) + 6 * Math.sin(x * 0.031 + 1);
const YT_LINE = [[-218, -226], [-228, -120], [-160, -40], [-60, 22], [30, -30], [90, -110], [110, -200], [116, -232]];
const MAP_YT = {
  id: 'yorktown', name: 'Yorktown', date: '14 October 1781', light: 'dusk', size: 660, seed: 1781,
  blurb: 'The siege at dusk. From the allied parallels, storm Redoubts 9 and 10, break the British line and take the town above the York River.',
  militia: 0.1, hessians: 0.3, flagStyle: { US: 'stars', GB: 'union' }, water: 0, coast: (x, z) => z - YT_COAST(x),
  grass: [0x7e8448, 0x948c56, 0x6e7444], field: 0x8a6a46, forestFloor: 0x5a5032, leaf: [0x6a7a34, 0x8a8a3a, 0xa07a30, 0x5a6a2c], pines: 0.45, autumn: 0.4,
  height(x, z) {
    let h = 3 + 10 * smooth(-232, -196, z) + (fbm(x * 0.007 - 5, z * 0.007 + 2) - 0.5) * 7 + (fbm(x * 0.03, z * 0.03) - 0.5) * 1.2;
    const c = z - YT_COAST(x);
    if (c < 8) h = lerp(-6, h, smooth(-26, 8, c));
    return h;
  },
  ravines: [{ pts: [[-310, -240], [-300, -100], [-312, 60], [-296, 340]], w: 40, depth: 7 }, { pts: [[320, -240], [292, -120], [300, 0]], w: 36, depth: 6 }],
  works: [
    { pts: YT_LINE, inside: [-60, -140], h: 2.4, ditch: 1.6, gaps: [[-160, -40]], fraise: true },
    { pts: [[-276, -186], [-234, -188], [-230, -144], [-272, -138], [-276, -186]], inside: [-252, -164], h: 2.2, ditch: 1.4, gaps: [[-276, -186]] },
    { pts: [[100, 8], [142, 8], [148, 52], [120, 64], [98, 50], [100, 8]], inside: [121, 32], h: 2.2, ditch: 1.4, gaps: [[100, 8]], fraise: true },
    { pts: [[180, -142], [222, -142], [224, -100], [182, -98], [180, -142]], inside: [201, -121], h: 2.2, ditch: 1.4, gaps: [[180, -142]], fraise: true },
  ],
  trenches: [
    { pts: [[-40, 150], [40, 118], [110, 116], [190, 68], [248, -24], [268, -110]], w: 3.6, depth: 1.7, enemy: [-60, -140] },
    { pts: [[-130, 290], [40, 238], [180, 208], [300, 130]], w: 3.6, depth: 1.7, enemy: [-60, -140] },
    { pts: [[60, 236], [84, 196], [52, 160], [80, 120]], w: 3, depth: 1.6, enemy: [-60, -140] },
    { pts: [[222, 186], [244, 140], [212, 102], [232, 70]], w: 3, depth: 1.6, enemy: [-60, -140] },
  ],
  roads: [{ pts: [[-200, -150], [40, -150]], w: 5 }, { pts: [[-100, -150], [-120, 100], [-140, 340]], w: 4 }, { pts: [[0, -150], [80, 120], [150, 340]], w: 4 }, { pts: [[-60, -200], [-60, -100]], w: 4 }, { pts: [[-140, -190], [20, -190]], w: 3.5 }],
  fields: [
    { kind: 'trampled', poly: [[-200, -20], [260, -20], [300, 260], [-200, 260]] },
    { kind: 'plow', poly: [[-280, 120], [-180, 110], [-170, 220], [-280, 230]] },
    { kind: 'pasture', poly: [[160, 240], [320, 230], [320, 330], [170, 330]] },
  ],
  forests: [{ poly: [[-330, 40], [-220, 60], [-200, 330], [-330, 330]], d: 0.7 }, { poly: [[250, 160], [330, 110], [330, 330], [280, 330]], d: 0.6 }, { poly: [[-330, -80], [-270, -60], [-260, 30], [-330, 30]], d: 0.5 }],
  trees: 650, stumps: [[-200, -40, 300, 220, 260]],
  walls: [{ kind: 'rail', pts: [[-160, -170], [20, -170]] }, { kind: 'rail', pts: [[-160, -130], [20, -130]] }, { kind: 'worm', pts: [[-280, 120], [-180, 110], [-170, 220]] }],
  villages: [{ x0: -175, z0: -205, x1: 30, z1: -100, n: 26, yaw: 0, styles: ['brick', 'clap', 'brick', 'clapgrey', 'clapred'], burn: 0.25, grid: true }],
  buildings: [{ x: -44, z: -126, yaw: 0, w: 14, d: 11, floors: 2, style: 'brick' }, { x: -96, z: -176, yaw: 0, w: 12, d: 18, floors: 2, kind: 'church', style: 'stone' }],
  flags: [
    { id: 'A', name: "Fusiliers' Redoubt", x: -252, z: -164, r: 16 },
    { id: 'B', name: 'Yorktown', x: -60, z: -140, r: 26 },
    { id: 'C', name: 'The Hornwork', x: -60, z: 2, r: 18 },
    { id: 'D', name: 'Redoubt No. 9', x: 122, z: 32, r: 16 },
    { id: 'E', name: 'Redoubt No. 10', x: 202, z: -120, r: 16 },
  ],
  hq: [{ x: 196, z: 236, r: 24 }, { x: -150, z: -210, r: 22 }],
  breakthrough: { attacker: US, sectors: [['E', 'D'], ['C'], ['B', 'A']] },
  cannons: [{ team: US, x: 20, z: 128, yaw: Math.PI - 0.3 }, { team: US, x: 150, z: 104, yaw: Math.PI - 0.2 }, { team: US, x: 232, z: 30, yaw: -2.4 }, { team: US, x: 100, z: 238, yaw: Math.PI - 0.4 },
    { flag: 'C', x: -78, z: 6, yaw: 0.2 }, { flag: 'C', x: -40, z: 0, yaw: -0.2 }, { flag: 'E', x: 210, z: -108, yaw: 0.6 }, { flag: 'D', x: 126, z: 44, yaw: 0.4 }, { flag: 'B', x: -10, z: -110, yaw: 0.4 }],
  horses: [{ team: US, x: 248, z: 300 }, { team: US, x: 254, z: 296 }, { team: GB, x: -166, z: -196 }, { team: GB, x: -172, z: -200 }],
  ships: [
    { team: GB, x: -60, z: -282, yaw: Math.PI / 2, path: [[-60, -282], [120, -290], [260, -280], [120, -290], [-60, -282], [-240, -278]] },
    { team: US, x: 280, z: -282, yaw: -Math.PI / 2, path: [[280, -282], [100, -292], [-100, -286], [-250, -280], [-100, -286], [100, -292]] },
  ],
  wrecks: [{ x: 40, z: -300, yaw: 0.4, fire: true }],
  camps: [{ team: US, x: 230, z: 262, n: 8 }, { team: GB, x: -120, z: -215, n: 2 }],
  bombard: [-170, -210, 40, -80],
};

const MAPS = [MAP_LEX, MAP_BH, MAP_SAR, MAP_YT];
const MAP_BY_ID = Object.fromEntries(MAPS.map((m) => [m.id, m]));
