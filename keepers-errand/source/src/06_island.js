// ---- island: height field, landmarks, roads. Pure functions, no three.js (the outdoor mesh is built in 07_outdoor) ----
// x is east, z is south, y is up. Sea level is y = 0.
const ISLE = {
  // landmark positions (the story and the props refer to these)
  P: {
    cottage: [-74, 20], lighthouse: [-88, 6], village: [48, 8], office: [64, -8], tavern: [42, 24], shop: [36, -6],
    square: [48, 8], hill: [10, -60], windmill: [10, -60], quarry: [-50, -42], cove: [6, 56], gubbins: [20, 50],
    gullPole: [-8, 52], stackBeach: [-50, 56], stack: [-62, 70], pond: [-20, -14], docks: [78, 4],
  },
  roads: [
    [[-80, 13], [-72, 13], [-62, 12], [-48, 10], [-30, 8], [-12, 7], [6, 6], [22, 7], [32, 8], [48, 8], [58, 4], [70, 2]],
    [[6, 6], [4, -14], [-2, -28], [2, -40], [16, -44], [22, -54], [16, -64], [10, -62]],
    [[-30, 8], [-36, -6], [-41, -18], [-43, -28]],
    [[12, 6], [12, 22], [12, 38], [16, 48]],
    [[-12, 7], [-22, 22], [-34, 40], [-46, 52]],
    [[48, 8], [44, 16], [42, 20]],
  ],
};
(function () {
  const P = ISLE.P;
  // signed "islandness" from a union of ellipse lobes, minus the cove bite; > 0 is land
  const lobes = [
    [0, 0, 80, 70], [-80, 8, 24, 24], [12, -58, 34, 30], [46, 6, 27, 28], [-44, 40, 30, 26], [-48, -40, 26, 24], [26, 40, 26, 24],
  ];
  function landness(x, z) {
    let s = -1;
    for (const [cx, cz, rx, rz] of lobes) {
      const d = Math.hypot((x - cx) / rx, (z - cz) / rz);
      s = Math.max(s, 1 - d);
    }
    // the cove: a bite out of the south coast
    const cd = Math.hypot((x - 6) / 20, (z - 68) / 15);
    s = Math.min(s, cd - 1 + 0.02);
    s += (fbm(x * 0.045, z * 0.045) - 0.5) * 0.16;
    return s;
  }
  function gauss(x, z, cx, cz, r) { const d2 = ((x - cx) ** 2 + (z - cz) ** 2) / (r * r); return Math.exp(-d2); }
  function segDist(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
    const t = l2 ? clamp(((px - ax) * vx + (pz - az) * vz) / l2, 0, 1) : 0;
    return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
  }
  function roadDist(x, z) {
    let best = 1e9;
    for (const r of ISLE.roads) for (let i = 0; i < r.length - 1; i++) best = Math.min(best, segDist(x, z, r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]));
    return best;
  }
  ISLE.roadDist = roadDist;
  ISLE.landness = landness;

  // flat pads for buildings: [x, z, radius, height]. Each pad pulls the ground to its height.
  const pads = [];
  ISLE.pads = pads;
  ISLE.pad = (x, z, r, h) => pads.push([x, z, r, h]);

  function rawH(x, z) {
    const s = landness(x, z);
    let h;
    if (s < 0) h = Math.max(-9, -0.6 + s * 9 - Math.max(0, -s - 0.1) * 45);
    else h = -0.6 + smooth(0, 0.07, s) * 2.0 + smooth(0.05, 0.4, s) * 1.6 + (fbm(x * 0.07 + 40, z * 0.07) - 0.5) * 1.6 * smooth(0.05, 0.25, s);
    const inland = smooth(0.02, 0.2, s);
    // Thunder Hill
    h += 17 * gauss(x, z, P.hill[0], P.hill[1], 19) * inland;
    h += 4 * gauss(x, z, -14, -44, 14) * inland;
    // the lighthouse headland: a plateau with cliffs to the sea, ramping down to the east
    {
      const dx = x - (-84), dz = z - 9;
      const rx = dx > 0 ? 36 : 20;
      const d = Math.hypot(dx / rx, dz / 17);
      const p = 1 - smooth(0.62, 1.0, d);
      h += 6.0 * p * smooth(-0.1, 0.06, s);
    }
    // the quarry: a rocky rim around a flat pit, open to the south-east
    {
      const [qx, qz] = P.quarry, dq = Math.hypot(x - qx, z - qz);
      const a = Math.atan2(z - qz, x - qx), notch = Math.exp(-(angDiff(a, Math.atan2(1, 0.55)) ** 2) / 0.12);
      const rim = 7.5 * Math.exp(-(((dq - 16) / 5.5) ** 2)) * (1 - notch * 0.95);
      h += rim * inland;
      const pit = 1 - smooth(11, 14.5, dq);
      h = lerp(h, 2.4, pit);
    }
    // the pond in the meadow
    { const d = Math.hypot(x - P.pond[0], (z - P.pond[1]) * 1.3); h = lerp(h, -0.8, 1 - smooth(5, 9, d)); }
    // roads are gently levelled
    const rd = roadDist(x, z);
    if (s > 0.02) h = lerp(h, h * 0.92 + 0.15, 1 - smooth(1.5, 3.5, rd));
    return h;
  }
  function H(x, z) {
    let h = rawH(x, z);
    for (const [px, pz, r, ph] of pads) {
      const d = Math.hypot(x - px, z - pz);
      if (d < r + 5) h = lerp(h, ph, 1 - smooth(r, r + 5, d));
    }
    return h;
  }
  ISLE.rawH = rawH;
  ISLE.H = H;
  // surface colour at a point (used by the terrain mesh and the map)
  ISLE.color = function (x, z, h, slope) {
    const s = landness(x, z), rd = roadDist(x, z);
    if (h < -0.35) return [0.78, 0.7, 0.48];                                // wet sand / sea floor
    if (h < 0.9 && s < 0.12) return [0.93, 0.84, 0.58];                     // beach
    if (slope > 1.05) return [0.52, 0.48, 0.44];                            // cliff rock
    if (slope > 0.7) return [0.42, 0.5, 0.3];                               // steep grass
    if (rd < 2.2) return [0.64, 0.54, 0.34];                                // path
    const qd = Math.hypot(x - P.quarry[0], z - P.quarry[1]);
    if (qd < 15) return [0.62, 0.56, 0.48];                                 // quarry gravel
    const n = fbm(x * 0.12, z * 0.12);
    return [0.36 + n * 0.1, 0.56 + n * 0.1 + h * 0.004, 0.27 + n * 0.05];   // meadow grass
  };
})();
