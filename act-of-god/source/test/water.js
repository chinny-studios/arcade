// how much of each city's centre is water
const rows = [];
let worst = 0, sum = 0, n = 0;
for (const size of ['mega', 'metro', 'city', 'town', 'small']) for (let s = 1; s <= 14; s++) {
  AG.start({ size, seed: s * 7331 + 17 });
  const W = AG.W, c = AG.centre(), R = W.M * 0.2;
  let wet = 0, all = 0;
  for (let j = 0; j < W.V; j++) for (let i = 0; i < W.V; i++) { const x = i * W.cs, z = j * W.cs; if ((x - c.x) ** 2 + (z - c.z) ** 2 > R * R) continue; all++; if (W.h[j * W.V + i] < 0.2) wet++; }
  const f = wet / all; worst = Math.max(worst, f); sum += f; n++;
  if (f > 0.08) rows.push(size + ' ' + W.gen.water + ' ' + (f * 100).toFixed(0) + '%');
}
return { mean: (sum / n * 100).toFixed(1) + '%', worst: (worst * 100).toFixed(0) + '%', over8: rows };
