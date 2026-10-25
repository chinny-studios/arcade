const rows = [];
for (const size of ['mega', 'metro', 'city', 'town', 'small']) for (let s = 1; s <= 10; s++) {
  const t0 = performance.now();
  const i = AG.start({ size, seed: s * 1013 });
  rows.push([size, i.water, i.relief, i.biome, i.buildings, i.trees, i.edges, Math.round(i.pop), Math.round(performance.now() - t0)].join(' '));
}
return rows;
