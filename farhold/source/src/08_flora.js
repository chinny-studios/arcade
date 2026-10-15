// Farhold — flora, rocks and mineral deposits: procedural species per planet, scattered per surface cell,
// merged into one mesh per cell, mineable / pickable, with removals remembered per planet.

// ---------- species templates ----------
function swayAttr(g, h, flex) {
  const P = g.attributes.position, n = P.count, sw = new Float32Array(n);
  for (let i = 0; i < n; i++) { const y = Math.max(0, P.getY(i)) / h; sw[i] = Math.pow(Math.min(1.2, y), 1.6) * flex; }
  g.userData.sway = sw;
  return g;
}
function floraTemplate(style, r, pal, big) {
  const parts = [];
  const leaf = (h0) => (r() < 0.3 ? hsl(r(), r.range(0.5, 0.85), r.range(0.4, 0.6)) : shadeHex(mixHex(pal.low, h0 != null ? hsl(h0, 0.7, 0.5) : pal.low2, r.range(0, 0.5)), r.range(0.85, 1.3)));
  const bark = shadeHex(mixHex(pal.rock, 0x5a3a28, r.range(0.3, 0.8)), r.range(0.7, 1.1));
  const accent = hsl(r(), r.range(0.6, 0.95), r.range(0.5, 0.65));
  let h = 1, flex = 0.15, trunk = 0.3;
  switch (style) {
    case 'round': {
      h = r.range(5, 9); trunk = r.range(0.25, 0.45);
      parts.push(P_.cyl(trunk * 0.7, trunk, h * 0.7, 6, bark, [0, h * 0.35, 0]));
      const c = leaf(); const cr = r.range(1.8, 3.2);
      parts.push(P_.ico(cr, 1, c, [0, h * 0.75, 0], null, [1, r.range(0.7, 1.1), 1]));
      for (let i = 0; i < 3; i++) { const a = r() * TAU; parts.push(P_.ico(cr * 0.6, 0, shadeHex(c, r.range(0.85, 1.15)), [Math.cos(a) * cr * 0.7, h * 0.65 + r.range(-0.5, 0.8), Math.sin(a) * cr * 0.7])); }
      if (r() < 0.4) for (let i = 0; i < 5; i++) { const a = r() * TAU; parts.push(glowPart(P_.sph(0.18, 5, 4, accent, [Math.cos(a) * cr * 0.9, h * 0.7 + r.range(-0.6, 0.6), Math.sin(a) * cr * 0.9]), 0.8)); }
      flex = 0.25; break;
    }
    case 'conifer': {
      h = r.range(7, 13); trunk = r.range(0.2, 0.35);
      parts.push(P_.cyl(trunk * 0.6, trunk, h * 0.4, 6, bark, [0, h * 0.2, 0]));
      const c = leaf(); const tiers = r.int(3, 5), w = r.range(1.6, 2.6);
      for (let i = 0; i < tiers; i++) { const t = i / tiers; parts.push(P_.cone(w * (1 - t * 0.65), h * 0.36, 7, shadeHex(c, 0.9 + t * 0.25), [0, h * (0.28 + t * 0.6), 0])); }
      flex = 0.12; break;
    }
    case 'palm': {
      h = r.range(6, 10); trunk = 0.22;
      const segs = 5, bend = r.range(0.04, 0.12); let x = 0, y = 0, ang = 0;
      for (let i = 0; i < segs; i++) { const l = h / segs; parts.push(P_.cyl(trunk * (1 - i * 0.1), trunk * (1 - i * 0.1 + 0.1), l, 6, shadeHex(bark, 1 + (i % 2) * 0.15), [x + Math.sin(ang) * l / 2, y + Math.cos(ang) * l / 2, 0], [0, 0, -ang])); x += Math.sin(ang) * l; y += Math.cos(ang) * l; ang += bend; }
      const c = leaf(); const n = r.int(6, 9);
      for (let i = 0; i < n; i++) { const a = i / n * TAU; parts.push(P_.tbox(0.7, 0.05, 0.08, 0.02, 3.6, shadeHex(c, r.range(0.85, 1.15)), [x + Math.cos(a) * 1.5, y - 0.4, Math.sin(a) * 1.5], [Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25])); }
      if (r() < 0.6) for (let i = 0; i < 3; i++) parts.push(glowPart(P_.sph(0.25, 5, 4, accent, [x + r.range(-0.3, 0.3), y - 0.5, r.range(-0.3, 0.3)]), 0.6));
      h = y; flex = 0.3; break;
    }
    case 'mushroom': {
      h = r.range(3, 8) * (big ? 1.4 : 1); trunk = r.range(0.25, 0.6);
      const stem = mixHex(0xe8e0d0, accent, 0.25);
      parts.push(P_.cyl(trunk * 0.8, trunk * 1.2, h, 7, stem, [0, h / 2, 0]));
      const capC = r() < 0.5 ? accent : leaf(), cw = r.range(1.5, 3.5);
      parts.push(P_.sph(cw, 10, 5, capC, [0, h, 0], null, [1, r.range(0.35, 0.6), 1]));
      parts.push(glowPart(P_.cyl(cw * 0.95, cw * 0.95, 0.12, 10, shadeHex(capC, 1.4), [0, h - 0.05, 0]), 0.5));
      for (let i = 0; i < 6; i++) { const a = r() * TAU, d = r.range(0.3, 0.8) * cw; parts.push(glowPart(P_.sph(0.2, 5, 4, 0xffffff, [Math.cos(a) * d, h + r.range(0.2, 0.6) * cw * 0.45, Math.sin(a) * d]), 0.4)); }
      flex = 0.05; break;
    }
    case 'bulbtree': {
      h = r.range(4, 8); trunk = 0.18;
      const c = leaf();
      parts.push(P_.cyl(0.1, trunk, h, 6, shadeHex(c, 0.6), [0, h / 2, 0]));
      parts.push(glowPart(P_.ico(r.range(0.8, 1.6), 1, accent, [0, h + 0.4, 0], null, [1, 1.3, 1]), 0.9));
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; parts.push(P_.tbox(0.5, 0.06, 0.05, 0.02, 1.8, c, [Math.cos(a) * 0.6, h * 0.3, Math.sin(a) * 0.6], [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8])); }
      flex = 0.35; break;
    }
    case 'crystal': {
      h = r.range(3, 7); trunk = 0.8;
      const c = r() < 0.5 ? hsl(r.range(0.5, 0.8), 0.6, 0.7) : accent;
      const n = r.int(4, 7);
      for (let i = 0; i < n; i++) { const hh = h * r.range(0.4, 1), a = r() * TAU, tilt = r.range(0, 0.5); parts.push(glowPart(P_.cyl(0.02, r.range(0.25, 0.5), hh, 5, shadeHex(c, r.range(0.8, 1.2)), [Math.cos(a) * 0.4, hh / 2, Math.sin(a) * 0.4], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]), 0.35)); }
      flex = 0; break;
    }
    case 'deadtree': {
      h = r.range(4, 8); trunk = r.range(0.2, 0.35);
      const c = shadeHex(mixHex(bark, 0xb0a090, 0.4), r.range(0.6, 1));
      parts.push(P_.cyl(trunk * 0.6, trunk, h, 6, c, [0, h / 2, 0]));
      for (let i = 0; i < r.int(3, 6); i++) { const y = h * r.range(0.4, 0.95), a = r() * TAU, l = r.range(1, 2.5); parts.push(P_.cyl(0.04, 0.12, l, 4, c, [Math.cos(a) * l * 0.4, y + l * 0.3, Math.sin(a) * l * 0.4], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9])); }
      flex = 0.04; break;
    }
    case 'cactus': {
      h = r.range(2.5, 6); trunk = r.range(0.35, 0.6);
      const c = leaf();
      parts.push(P_.cyl(trunk * 0.9, trunk, h, 8, c, [0, h / 2, 0]));
      parts.push(P_.sph(trunk * 0.9, 8, 4, c, [0, h, 0], null, [1, 0.6, 1]));
      for (let i = 0; i < r.int(1, 3); i++) { const a = r() * TAU, y = h * r.range(0.3, 0.6), l = r.range(0.8, 1.6); parts.push(P_.cyl(trunk * 0.55, trunk * 0.6, 0.9, 6, c, [Math.cos(a) * 0.6, y, Math.sin(a) * 0.6], [Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4])); parts.push(P_.cyl(trunk * 0.5, trunk * 0.55, l, 6, c, [Math.cos(a) * 1.05, y + l / 2, Math.sin(a) * 1.05])); }
      if (r() < 0.5) parts.push(glowPart(P_.sph(0.25, 6, 4, accent, [0, h + trunk * 0.5, 0]), 0.7));
      flex = 0.02; break;
    }
    case 'coral': {
      h = r.range(2.5, 5); trunk = 0.3;
      const c = accent;
      const branch = (x, y, z, l, a, t, d) => { const ex = x + Math.sin(t) * Math.cos(a) * l, ey = y + Math.cos(t) * l, ez = z + Math.sin(t) * Math.sin(a) * l; parts.push(P_.cyl(0.08 + d * 0.04, 0.12 + d * 0.05, l, 5, shadeHex(c, 0.8 + d * 0.15), [(x + ex) / 2, (y + ey) / 2, (z + ez) / 2], [Math.sin(a) * t, 0, -Math.cos(a) * t])); if (d > 0) for (let i = 0; i < 2; i++) branch(ex, ey, ez, l * 0.75, a + r.range(-1.5, 1.5), t + r.range(-0.3, 0.5), d - 1); else parts.push(glowPart(P_.sph(0.14, 5, 4, 0xffffff, [ex, ey, ez]), 0.8)); };
      branch(0, 0, 0, h * 0.4, r() * TAU, 0.1, 2);
      flex = 0.05; break;
    }
    case 'spike': {
      h = r.range(3, 7); trunk = 0.5;
      const c = r() < 0.5 ? leaf() : accent;
      for (let i = 0; i < r.int(3, 6); i++) { const hh = h * r.range(0.5, 1), a = r() * TAU, d = r.range(0, 0.6), tilt = r.range(0, 0.35); parts.push(P_.cone(r.range(0.2, 0.45), hh, 5, shadeHex(c, r.range(0.8, 1.2)), [Math.cos(a) * d, hh / 2, Math.sin(a) * d], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt])); }
      flex = 0.06; break;
    }
    case 'spiral': {
      h = r.range(4, 9); trunk = 0.35;
      const c = accent, c2 = leaf(); const n = r.int(8, 14);
      for (let i = 0; i < n; i++) { const t = i / n; parts.push(P_.box(r.range(0.8, 1.6) * (1 - t * 0.6), h / n * 0.9, 0.3, i % 2 ? c : c2, [0, t * h + h / n / 2, 0], [0, t * r.range(3, 7), 0])); }
      parts.push(glowPart(P_.oct(0.5, accent, [0, h + 0.5, 0]), 1));
      flex = 0.1; break;
    }
    case 'orb': {
      h = r.range(3, 7); trunk = 0.15;
      const c = leaf();
      for (let i = 0; i < r.int(2, 4); i++) { const hh = h * r.range(0.6, 1), a = r() * TAU, d = r.range(0.2, 1.2); parts.push(P_.cyl(0.05, 0.08, hh, 4, c, [Math.cos(a) * d * 0.5, hh / 2, Math.sin(a) * d * 0.5], [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2])); parts.push(glowPart(P_.ico(r.range(0.4, 0.9), 1, accent, [Math.cos(a) * d, hh, Math.sin(a) * d]), 0.6)); }
      flex = 0.4; break;
    }
    case 'tentacle': {
      h = r.range(3, 6); trunk = 0.4;
      const c = leaf();
      for (let k = 0; k < r.int(3, 5); k++) {
        let x = 0, y = 0, a = r() * TAU, t = 0.2; const segs = 6, l = h / segs;
        for (let i = 0; i < segs; i++) { const w = 0.3 * (1 - i / segs) + 0.05; const ex = x + Math.sin(t) * l, ey = y + Math.cos(t) * l; parts.push(P_.cyl(w * 0.8, w, l, 5, shadeHex(i % 2 ? accent : c, 1), [Math.cos(a) * (x + ex) / 2, (y + ey) / 2, Math.sin(a) * (x + ex) / 2], [Math.sin(a) * t, 0, -Math.cos(a) * t])); x = ex; y = ey; t += r.range(0.1, 0.35); }
      }
      flex = 0.35; break;
    }
    case 'fern': default: {
      h = r.range(0.8, 1.8); trunk = 0.3;
      const c = leaf(); const n = r.int(5, 9);
      for (let i = 0; i < n; i++) { const a = i / n * TAU + r() * 0.3, t = r.range(0.4, 0.9); parts.push(P_.tbox(0.35, 0.04, 0.04, 0.02, h * 1.3, shadeHex(c, r.range(0.8, 1.2)), [Math.cos(a) * h * 0.35, h * 0.55, Math.sin(a) * h * 0.35], [Math.sin(a) * t, 0, -Math.cos(a) * t])); }
      if (r() < 0.35) parts.push(glowPart(P_.sph(0.12, 5, 4, accent, [0, h * 0.5, 0]), 0.8));
      flex = 0.4; break;
    }
  }
  const seed = r.int(1, 1e6);
  const g = buildModel(parts, { jitter: 0.1, seed });
  swayAttr(g, h, flex);
  const lo = buildModel(lowParts(parts, h), { jitter: 0.1, seed });
  swayAttr(lo, h, flex);
  return { geo: g, lo, h, trunk, style };
}
// resource objects shared by all planets (colours vary)
function resourceTemplate(kind, r, pal, extra) {
  const parts = [];
  let h = 1, flex = 0;
  switch (kind) {
    case 'rock': { const c = pal.rock; parts.push(P_.dod(0.8, c, [0, 0.35, 0], [r() * 3, r() * 3, 0], [1, r.range(0.55, 0.9), r.range(0.8, 1.2)])); h = 0.8; break; }
    case 'boulder': { const c = pal.rock2; parts.push(P_.dod(2, c, [0, 1, 0], [r() * 3, r() * 3, 0], [1.2, r.range(0.7, 1), 1])); parts.push(P_.dod(1.2, shadeHex(c, 0.9), [1.3, 0.6, 0.4], [r() * 3, r() * 3, 0])); h = 2.4; break; }
    case 'deposit': {
      const c = ITEMS[extra].col, base = shadeHex(pal.rock, 0.8);
      parts.push(P_.dod(2.4, base, [0, 0.9, 0], [0.3, 0.2, 0], [1.4, 0.8, 1.2]));
      for (let i = 0; i < 9; i++) { const a = r() * TAU, d = r.range(0.4, 2), hh = r.range(1.4, 3.6), tilt = r.range(0.1, 0.6); parts.push(glowPart(P_.cyl(0.03, r.range(0.35, 0.7), hh, 5, shadeHex(c, r.range(0.8, 1.2)), [Math.cos(a) * d, 1.2 + hh / 2, Math.sin(a) * d], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]), 0.45)); }
      h = 4.5; break;
    }
    case 'crystal': { const c = ITEMS.dihydro.col; for (let i = 0; i < 4; i++) { const a = i * 1.7, hh = r.range(0.7, 1.5), tilt = r.range(0.1, 0.5); parts.push(glowPart(P_.cyl(0.02, 0.18, hh, 5, shadeHex(c, r.range(0.85, 1.2)), [Math.cos(a) * 0.15, hh / 2, Math.sin(a) * 0.15], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]), 0.8)); } h = 1.4; break; }
    case 'oxy': { const c = shadeHex(pal.low, 0.8); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; parts.push(P_.tbox(0.25, 0.04, 0.03, 0.02, 0.8, c, [Math.cos(a) * 0.25, 0.35, Math.sin(a) * 0.25], [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8])); } parts.push(P_.cyl(0.04, 0.06, 0.7, 5, c, [0, 0.35, 0])); parts.push(glowPart(P_.ico(0.32, 1, ITEMS.oxygen.col, [0, 0.85, 0], null, [1, 1.2, 1]), 0.5)); h = 1.2; flex = 0.3; break; }
    case 'sod': { const c = shadeHex(pal.low2, 0.8); parts.push(P_.cyl(0.05, 0.08, 0.9, 5, c, [0, 0.45, 0])); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; parts.push(glowPart(P_.sph(0.2, 6, 5, ITEMS.sodium.col, [Math.cos(a) * 0.2, 0.95 + i * 0.12, Math.sin(a) * 0.2]), 1)); } h = 1.3; flex = 0.3; break; }
    case 'special': {
      const col = ITEMS[extra].col, c = shadeHex(pal.low, 0.75);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; parts.push(P_.tbox(0.18, 0.05, 0.02, 0.02, 1.1, c, [Math.cos(a) * 0.3, 0.45, Math.sin(a) * 0.3], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6])); }
      parts.push(glowPart(P_.oct(0.35, col, [0, 1.15, 0], [0, 0.4, 0], [1, 1.4, 1]), 0.9)); h = 1.5; flex = 0.25; break;
    }
    case 'storm': { for (let i = 0; i < 5; i++) { const a = i * 1.3, hh = r.range(0.6, 1.2), tilt = r.range(0.2, 0.6); parts.push(glowPart(P_.cyl(0.02, 0.14, hh, 4, ITEMS.storm.col, [Math.cos(a) * 0.1, hh / 2, Math.sin(a) * 0.1], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]), 1.2)); } h = 1.1; break; }
    case 'grass': { const c = pal.low; for (let i = 0; i < 6; i++) { const a = r() * TAU, d = r.range(0, 0.5), hh = r.range(0.35, 0.8); parts.push({ geo: bladeGeo(), c: shadeHex(c, r.range(0.8, 1.25)), p: [Math.cos(a) * d, 0, Math.sin(a) * d], r: [r.range(-0.3, 0.3), a, r.range(-0.3, 0.3)], s: [1, hh, 1] }); } h = 0.7; flex = 0.6; break; }
    case 'pebble': { parts.push(P_.dod(0.25, shadeHex(pal.rock, r.range(0.8, 1.2)), [0, 0.08, 0], [r() * 3, r() * 3, 0], [1, 0.5, 0.8])); h = 0.2; break; }
  }
  const seed = r.int(1, 1e6);
  const g = buildModel(parts, { jitter: 0.12, seed });
  swayAttr(g, h, flex);
  const lo = kind === 'grass' || kind === 'pebble' ? g : buildModel(lowParts(parts, h), { jitter: 0.12, seed });
  if (lo !== g) swayAttr(lo, h, flex);
  return { geo: g, lo, h, kind };
}

// far-away version of a template: fewer segments, small decorations dropped
function lowParts(parts, h) {
  const out = [];
  for (const pt of parts) {
    if (pt.geo) { out.push(pt); continue; }
    const a = pt.a.slice();
    const sc = pt.s ? Math.max(...pt.s) : 1;
    let size = 0;
    switch (pt.g) {
      case 'sph': size = a[0] * 2 * sc; a[1] = Math.min(a[1] || 8, 6); a[2] = Math.min(a[2] || 6, 3); break;
      case 'cyl': size = Math.max(a[0], a[1], a[2] / 2) * 2 * sc; a[3] = Math.min(a[3] || 8, 4); break;
      case 'cone': size = Math.max(a[0], a[1] / 2) * 2 * sc; a[2] = Math.min(a[2] || 8, 4); break;
      case 'ico': size = a[0] * 2 * sc; a[1] = 0; break;
      case 'tor': size = a[0] * 2 * sc; a[2] = 3; a[3] = Math.min(a[3] || 12, 8); break;
      default: size = Math.max(...a.slice(0, 5).filter((v) => typeof v === 'number')) * sc;
    }
    if (size < h * 0.12 && size < 0.5) continue;
    out.push(Object.assign({}, pt, { a }));
  }
  return out.length ? out : parts;
}
// a single-triangle grass blade (flora material is double-sided)
let _blade = null;
function bladeGeo() { if (!_blade) { _blade = new THREE.BufferGeometry(); _blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.06, 0, 0, 0.06, 0, 0, 0, 1, 0], 3)); _blade.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); } return _blade; }

// ---------- per-planet species ----------
// Kinds: tree, bush (mine for carbon) · rock, boulder, deposit, crystal (mine for elements) · oxy, sod, special (pick by hand)
function planetFlora(pl) {
  if (pl.floraSp) return pl.floraSp;
  const r = RNG(hashN(pl.seed, 51));
  const styles = pl.T.floraStyles.slice();
  const pal = pl.pal;
  const sp = { trees: [], bushes: [], res: {}, list: [] };
  const fl = pl.flora;
  const nTrees = fl > 0 ? r.int(2, 3) : 0;
  for (let i = 0; i < nTrees; i++) {
    const style = styles.length ? r.pick(styles.filter((s) => s !== 'fern')) || styles[0] : 'fern';
    const t = floraTemplate(style, r, pal, true);
    const s = { id: 'tree' + i, kind: 'tree', tpl: t, name: NAMEGEN.species(hashN(pl.seed, 70 + i)), w: r.range(0.5, 1.5), scale: [0.7, 1.4], hp: 60, yield: { item: 'carbon', n: [20, 40] }, rarity: r.pick(['Common', 'Common', 'Uncommon']), cat: 'flora', root: r.pick(['Deep roots', 'Shallow roots', 'Tuberous roots', 'Fibrous roots']), note: r.pick(['Slow growing', 'Bioluminescent at dusk', 'Sap is mildly acidic', 'Leaves turn to the sun', 'Seeds drift for kilometres', 'Hums faintly in the wind']) };
    sp.trees.push(s); sp.list.push(s);
  }
  const nB = fl > 0 ? 2 : 0;
  for (let i = 0; i < nB; i++) {
    const style = r() < 0.6 ? 'fern' : r.pick(styles.length ? styles : ['fern']);
    const t = floraTemplate(style, r, pal, false);
    const s = { id: 'bush' + i, kind: 'bush', tpl: t, name: NAMEGEN.species(hashN(pl.seed, 80 + i)), w: 1, scale: style === 'fern' ? [0.8, 1.5] : [0.25, 0.45], hp: 20, yield: { item: 'carbon', n: [8, 16] }, rarity: 'Common', cat: 'flora', root: r.pick(['Shallow roots', 'Creeping runners']), note: r.pick(['Grows in clusters', 'Favoured by grazers', 'Smells sweet', 'Curls up when touched']) };
    sp.bushes.push(s); sp.list.push(s);
  }
  const mk = (id, kind, extra, o) => { const t = resourceTemplate(kind, r, pal, extra); const s = Object.assign({ id, kind, tpl: t, name: o.name || NAMEGEN.species(hashN(pl.seed, id.length * 13 + 5)), rarity: o.rarity || 'Common' }, o); sp.res[id] = s; sp.list.push(s); return s; };
  mk('rock', 'rock', null, { name: 'Ferrous Rock', hp: 15, yield: { item: 'ferrite', n: [10, 20] }, cat: 'mineral', scale: [0.6, 1.4] });
  mk('boulder', 'boulder', null, { name: 'Ferrous Boulder', hp: 70, yield: { item: 'ferrite', n: [60, 110] }, bonus: { item: 'cobalt', n: [8, 20], p: 0.35 }, cat: 'mineral', scale: [0.7, 1.3] });
  const depItems = [pl.metal, pl.metal, 'cobalt', 'gold', 'silver'];
  for (let i = 0; i < 3; i++) { const it = depItems[(i + r.int(0, 4)) % depItems.length]; if (sp.res['dep_' + it]) continue; mk('dep_' + it, 'deposit', it, { name: ITEMS[it].name + ' Deposit', hp: 220, yield: { item: it, n: [140, 260] }, cat: 'mineral', scale: [0.8, 1.2], rarity: it === 'gold' ? 'Rare' : 'Uncommon' }); }
  mk('crystal', 'crystal', null, { name: 'Di-hydrogen Crystal', hp: 18, yield: { item: 'dihydro', n: [25, 40] }, cat: 'mineral', scale: [0.8, 1.3] });
  if (pl.atmo) {
    mk('oxy', 'oxy', null, { name: NAMEGEN.species(hashN(pl.seed, 91)), pick: { item: 'oxygen', n: [25, 40] }, hp: 10, yield: { item: 'carbon', n: [5, 10] }, cat: 'flora', scale: [0.9, 1.3], root: 'Shallow roots', note: 'Bulbs swell with pure oxygen' });
    mk('sod', 'sod', null, { name: NAMEGEN.species(hashN(pl.seed, 92)), pick: { item: 'sodium', n: [25, 40] }, hp: 10, yield: { item: 'carbon', n: [5, 10] }, cat: 'flora', scale: [0.9, 1.3], root: 'Salt-seeking roots', note: 'Glows with crystallised sodium' });
    mk('special', 'special', pl.special, { name: NAMEGEN.species(hashN(pl.seed, 93)), pick: { item: pl.special, n: [30, 55] }, hp: 10, yield: { item: 'carbon', n: [5, 10] }, cat: 'flora', scale: [0.9, 1.3], rarity: 'Uncommon', root: 'Deep taproot', note: 'Concentrates ' + ITEMS[pl.special].name });
  } else {
    mk('special', 'deposit', pl.special, { name: ITEMS[pl.special].name + ' Seam', hp: 120, yield: { item: pl.special, n: [60, 120] }, cat: 'mineral', scale: [0.5, 0.8] });
    mk('salt', 'crystal', null, { name: 'Salt Crystal', hp: 18, yield: { item: 'sodium', n: [20, 35] }, cat: 'mineral', scale: [0.8, 1.2] });
  }
  sp.grass = fl > 0.15 ? resourceTemplate('grass', r, pal) : null;
  sp.pebble = resourceTemplate('pebble', r, pal);
  sp.storm = resourceTemplate('storm', r, pal);
  pl.floraSp = sp;
  return sp;
}

// ---------- scatter cells ----------
const NAT = {
  cells: new Map(), pl: null, removed: new Map(), near: [], nearT: 0, genQ: [], updT: 0,
  windDir: new V3(1, 0, 0), dyn: [],
};
function natRemovedSet(pl) { let s = NAT.removed.get(pl.id); if (!s) { s = new Set(); NAT.removed.set(pl.id, s); } return s; }
function scatterDepth(pl) { return Math.max(2, Math.round(Math.log2(pl.R * Math.PI / 2 / 115))); }
const _fuv = [0, 0, 0], _d3 = [0, 0, 0];
function cellKeyAt(pl, dir) {
  K.dirFace(dir.x, dir.y, dir.z, _fuv);
  const n = 1 << scatterDepth(pl);
  const i = clamp(Math.floor((_fuv[1] + 1) / 2 * n), 0, n - 1), j = clamp(Math.floor((_fuv[2] + 1) / 2 * n), 0, n - 1);
  return _fuv[0] + ':' + i + ':' + j;
}
function natReset() {
  for (const c of NAT.cells.values()) disposeCell(c);
  NAT.cells.clear(); NAT.near = []; NAT.genQ = []; NAT.pl = null;
  for (const d of NAT.dyn) if (d.mesh && d.mesh.parent) d.mesh.parent.remove(d.mesh);
  NAT.dyn = [];
}
function disposeCell(c) {
  if (c.mesh) { c.mesh.parent && c.mesh.parent.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
  if (c.detail) { c.detail.parent && c.detail.parent.remove(c.detail); c.detail.geometry.dispose(); c.detail = null; }
}
// Generate the object list for one cell (deterministic)
function genCell(pl, key) {
  const [f, ci, cj] = key.split(':').map(Number);
  const n = 1 << scatterDepth(pl), sz = 2 / n;
  const u0 = -1 + ci * sz, v0 = -1 + cj * sz;
  const r = RNG(hashN(pl.seed, f, ci, cj, 5));
  const sp = planetFlora(pl), P = pl.P;
  K.seed(P.seed);
  K.cubeDir(f, u0 + sz / 2, v0 + sz / 2, _d3);
  const cdir = new V3(_d3[0], _d3[1], _d3[2]);
  const ch = K.height(P, cdir.x, cdir.y, cdir.z);
  const center = cdir.clone().multiplyScalar(pl.R + ch);
  const removed = natRemovedSet(pl);
  const objs = [];
  const area = (sz * Math.PI / 4 * pl.R) ** 2 / 15000; // relative to a 122 m cell
  // forests and clearings
  const forest = clamp(0.5 + K.fbm(cdir.x * pl.R / 260, cdir.y * pl.R / 260, cdir.z * pl.R / 260, 2) * 1.4, 0, 1.6);
  const crashD = pl.crash ? cdir.distanceTo(pl.crash.dir) * pl.R : 1e9;
  const hot = crashD < 420 ? 1 : 0;
  const counts = [];
  const fl = pl.flora;
  for (const t of sp.trees) counts.push([t, Math.round(fl * 26 * t.w * forest * area * r.range(0.6, 1.3))]);
  for (const b of sp.bushes) counts.push([b, Math.round(fl * 30 * area * r.range(0.5, 1.4))]);
  const R_ = sp.res;
  counts.push([R_.rock, Math.round((14 + hot * 10) * area * r.range(0.6, 1.4))]);
  counts.push([R_.boulder, Math.round(4 * area * r.range(0.4, 1.6))]);
  for (const k in R_) if (k.startsWith('dep_')) counts.push([R_[k], r() < 0.22 * area ? 1 : 0]);
  counts.push([R_.crystal, Math.round((2.5 + hot * 4) * area * r.range(0.3, 1.6))]);
  if (R_.oxy) counts.push([R_.oxy, Math.round((2.2 + hot * 5) * area * r.range(0.3, 1.6))]);
  if (R_.sod) counts.push([R_.sod, Math.round((2 + hot * 4) * area * r.range(0.3, 1.6))]);
  if (R_.special) counts.push([R_.special, Math.round((R_.special.kind === 'deposit' ? 0.5 : 1.6) * area * r.range(0.3, 1.6))]);
  if (R_.salt) counts.push([R_.salt, Math.round(2 * area * r.range(0.3, 1.6))]);
  let idx = 0;
  for (const [s, cnt] of counts) {
    for (let k = 0; k < cnt; k++) {
      const id = idx++;
      const u = u0 + r() * sz, v = v0 + r() * sz, yaw = r() * TAU, sc = r.range(s.scale ? s.scale[0] : 0.8, s.scale ? s.scale[1] : 1.2), rr = r();
      if (removed.has(key + ':' + id)) continue;
      K.cubeDir(f, u, v, _d3);
      const dx = _d3[0], dy = _d3[1], dz = _d3[2];
      const h = K.height(P, dx, dy, dz);
      if (P.sea != null && h < P.sea + 0.4) continue;
      // avoid POIs
      let blocked = false;
      for (const poi of pl.pois) { const dd = Math.hypot(dx - poi.dir.x, dy - poi.dir.y, dz - poi.dir.z) * pl.R; if (dd < POI_TYPES[poi.type].r * 1.3 + 4) { blocked = true; break; } }
      if (blocked) continue;
      // trees thin out with altitude and snow
      if (s.kind === 'tree' && P.snow != null && (h - (P.sea || 0)) / P.amp > P.snow && rr < 0.8) continue;
      const pos = new V3(dx, dy, dz).multiplyScalar(pl.R + h - 0.15 * sc);
      objs.push({ key: key + ':' + id, sp: s, pos, up: new V3(dx, dy, dz), yaw, sc, hp: (s.hp || 20) * (s.kind === 'tree' ? sc : 1), hp0: (s.hp || 20) * (s.kind === 'tree' ? sc : 1), got: 0, alive: true,
        rad: s.kind === 'tree' ? s.tpl.trunk * sc + 0.15 : s.kind === 'boulder' ? 2 * sc : s.kind === 'deposit' ? 2.6 * sc : s.kind === 'rock' ? 0.7 * sc : 0.3 * sc,
        h: s.tpl.h * sc, solid: s.kind === 'tree' || s.kind === 'boulder' || s.kind === 'deposit' || (s.kind === 'rock' && sc > 1.1) });
    }
  }
  return { key, pl, center, cdir, objs, f, ci, cj, u0, v0, sz, mesh: null, detail: null, dirty: false };
}
// Merge the cell's living objects into one mesh (positions relative to the cell centre)
const _qq = new Q4(), _mm2 = new THREE.Matrix4(), _sv = new V3(), _tv = new V3(), _nm3 = new THREE.Matrix3();
function buildCellMesh(c) {
  let nv = 0;
  const lod = c.lod = c.wantLod || 0;
  // far cells keep only the things big enough to see
  const show = (o) => o.alive && (!lod || o.h > 1.6 || o.sp.kind === 'deposit' || o.sp.kind === 'boulder');
  for (const o of c.objs) if (show(o)) nv += (lod ? o.sp.tpl.lo : o.sp.tpl.geo).attributes.position.count;
  if (c.mesh) { c.mesh.parent && c.mesh.parent.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
  if (!nv) return;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), sw = new Float32Array(nv * 4), glow = new Float32Array(nv);
  let o3 = 0, o1 = 0;
  const wind = perpOf(c.cdir, _tv);
  for (const o of c.objs) {
    if (!show(o)) continue;
    const t = o.sp.tpl, g = lod ? t.lo : t.geo, P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, Gl = g.attributes.glow, S = g.userData.sway;
    basisQuat(o.up, perpOf(o.up, _sv).applyAxisAngle(o.up, o.yaw), _qq);
    const k = o.shrink != null ? o.shrink : 1;
    _mm2.compose(_v3.copy(o.pos).sub(c.center), _qq, _sv.set(o.sc * k, o.sc * k, o.sc * k));
    _nm3.getNormalMatrix(_mm2);
    o.v0 = o1; o.vn = P.count;
    const ph = (o.yaw * 7.3) % TAU, tint = 0.92 + (o.yaw % 0.16);
    for (let i = 0; i < P.count; i++) {
      _v1.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(_mm2);
      pos[o3] = _v1.x; pos[o3 + 1] = _v1.y; pos[o3 + 2] = _v1.z;
      _v2.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(_nm3).normalize();
      nor[o3] = _v2.x; nor[o3 + 1] = _v2.y; nor[o3 + 2] = _v2.z;
      col[o3] = C.getX(i) * tint; col[o3 + 1] = C.getY(i) * tint; col[o3 + 2] = C.getZ(i) * tint;
      const w = S[i] * o.sc * k;
      sw[o1 * 4] = wind.x * w; sw[o1 * 4 + 1] = wind.y * w; sw[o1 * 4 + 2] = wind.z * w; sw[o1 * 4 + 3] = ph;
      glow[o1] = Gl ? Gl.getX(i) : 0;
      o3 += 3; o1++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('sw', new THREE.BufferAttribute(sw, 4));
  g.setAttribute('glow', new THREE.BufferAttribute(glow, 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, R.mat.flora);
  m.position.copy(c.center); m.matrixAutoUpdate = false; m.updateMatrix();
  m.castShadow = false; m.receiveShadow = true;
  c.pl.group.add(m);
  c.mesh = m; c.dirty = false;
}
// grass and pebbles near the player
function buildCellDetail(c) {
  const pl = c.pl, sp = planetFlora(pl), P = pl.P;
  const r = RNG(hashN(pl.seed, c.f, c.ci, c.cj, 9));
  const list = [];
  const area = (c.sz * Math.PI / 4 * pl.R) ** 2 / 15000;
  const nG = sp.grass ? Math.round(pl.flora * 700 * area * Qset().grass / 2) : 0, nP = Math.round(60 * area);
  K.seed(P.seed);
  for (let i = 0; i < nG + nP; i++) {
    const tpl = i < nG ? sp.grass : sp.pebble;
    K.cubeDir(c.f, c.u0 + r() * c.sz, c.v0 + r() * c.sz, _d3);
    const h = K.height(P, _d3[0], _d3[1], _d3[2]);
    if (P.sea != null && h < P.sea + 0.3) continue;
    if (i < nG && P.snow != null && (h - (P.sea || 0)) / P.amp > P.snow) continue;
    const up = new V3(_d3[0], _d3[1], _d3[2]);
    list.push({ tpl, pos: up.clone().multiplyScalar(pl.R + h - 0.05), up, yaw: r() * TAU, sc: r.range(0.7, 1.4) });
  }
  if (!list.length) return;
  let nv = 0; for (const o of list) nv += o.tpl.geo.attributes.position.count;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), sw = new Float32Array(nv * 4), glow = new Float32Array(nv);
  let o3 = 0, o1 = 0;
  const wind = perpOf(c.cdir, _tv);
  for (const o of list) {
    const g = o.tpl.geo, Pp = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, S = g.userData.sway;
    basisQuat(o.up, perpOf(o.up, _sv).applyAxisAngle(o.up, o.yaw), _qq);
    _mm2.compose(_v3.copy(o.pos).sub(c.center), _qq, _sv.set(o.sc, o.sc, o.sc));
    _nm3.getNormalMatrix(_mm2);
    const ph = o.yaw * 5;
    for (let i = 0; i < Pp.count; i++) {
      _v1.set(Pp.getX(i), Pp.getY(i), Pp.getZ(i)).applyMatrix4(_mm2);
      pos[o3] = _v1.x; pos[o3 + 1] = _v1.y; pos[o3 + 2] = _v1.z;
      _v2.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(_nm3).normalize();
      nor[o3] = _v2.x; nor[o3 + 1] = _v2.y; nor[o3 + 2] = _v2.z;
      col[o3] = C.getX(i); col[o3 + 1] = C.getY(i); col[o3 + 2] = C.getZ(i);
      const w = S[i] * o.sc;
      sw[o1 * 4] = wind.x * w; sw[o1 * 4 + 1] = wind.y * w; sw[o1 * 4 + 2] = wind.z * w; sw[o1 * 4 + 3] = ph;
      o3 += 3; o1++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('sw', new THREE.BufferAttribute(sw, 4));
  g.setAttribute('glow', new THREE.BufferAttribute(glow, 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, R.mat.flora);
  m.position.copy(c.center); m.matrixAutoUpdate = false; m.updateMatrix(); m.receiveShadow = true;
  pl.group.add(m);
  c.detail = m;
}

// Keep cells within range of the focus point (planet-local) alive; generate a few per frame.
function updateNature(pl, focus, budget = 1, force = false) {
  if (NAT.pl !== pl) { natReset(); NAT.pl = pl; }
  if (!pl) return 0;
  NAT.updT -= 1;
  const range = Qset().flora, detailR = 110;
  const up = _v4.copy(focus).normalize();
  const alt = focus.length() - pl.R - surfaceHcached(pl, up);
  if (alt > range * 1.5) { if (NAT.cells.size) natReset(), NAT.pl = pl; return 0; }
  if (NAT.updT <= 0 || force) {
    NAT.updT = 15;
    const want = new Set();
    const cellArc = pl.R * Math.PI / 2 / (1 << scatterDepth(pl));
    const stepA = cellArc / 2 / pl.R, nr = Math.ceil(range / (cellArc / 2));
    const t1 = perpOf(up, new V3()), t2 = new V3().crossVectors(up, t1);
    const d = new V3();
    for (let a = -nr; a <= nr; a++) for (let b = -nr; b <= nr; b++) {
      if ((a * a + b * b) * (cellArc / 2) ** 2 > range * range) continue;
      d.copy(up).addScaledVector(t1, a * stepA).addScaledVector(t2, b * stepA).normalize();
      want.add(cellKeyAt(pl, d));
    }
    for (const [k, c] of NAT.cells) if (!want.has(k)) { disposeCell(c); NAT.cells.delete(k); }
    NAT.genQ = [...want].filter((k) => !NAT.cells.has(k));
    // nearest first
    const kd = (k) => { const [f, i, j] = k.split(':').map(Number); const n = 1 << scatterDepth(pl), s = 2 / n; K.cubeDir(f, -1 + (i + 0.5) * s, -1 + (j + 0.5) * s, _d3); return (_d3[0] - up.x) ** 2 + (_d3[1] - up.y) ** 2 + (_d3[2] - up.z) ** 2; };
    NAT.genQ.sort((a, b) => kd(a) - kd(b));
  }
  let made = 0;
  while (NAT.genQ.length && made < budget) {
    const k = NAT.genQ.shift();
    if (NAT.cells.has(k)) continue;
    const c = genCell(pl, k);
    NAT.cells.set(k, c);
    c.wantLod = c.center.distanceTo(focus) > 150 ? 1 : 0;
    buildCellMesh(c);
    made++;
  }
  // detail meshes for close cells; rebuild dirty cells
  let det = 0;
  for (const c of NAT.cells.values()) {
    const dist = c.center.distanceTo(focus);
    c.wantLod = dist > 150 ? 1 : 0;
    if (c.dirty || (c.mesh && c.wantLod !== c.lod && det < 2)) { buildCellMesh(c); det++; }
    const near = dist < detailR + 70;
    if (near && !c.detail && det < 2 && Qset().grass > 0) { buildCellDetail(c); det++; }
    else if (!near && c.detail) { c.detail.parent.remove(c.detail); c.detail.geometry.dispose(); c.detail = null; }
    if (c.mesh) c.mesh.castShadow = dist < 90 && R.sun.castShadow;
  }
  // refresh the near list for collisions and targeting
  NAT.nearT -= 1;
  if (NAT.nearT <= 0) {
    NAT.nearT = 6;
    NAT.near.length = 0;
    for (const c of NAT.cells.values()) {
      if (c.center.distanceTo(focus) > 200) continue;
      for (const o of c.objs) if (o.alive && o.pos.distanceToSquared(focus) < 60 * 60) { o.cell = c; NAT.near.push(o); }
    }
    for (const o of NAT.dyn) if (o.alive && o.pos.distanceToSquared(focus) < 60 * 60) NAT.near.push(o);
  }
  return made + NAT.genQ.length;
}
let _shC = { pl: null, k: '', h: 0 };
function surfaceHcached(pl, up) { const k = (up.x * 300 | 0) + ',' + (up.y * 300 | 0) + ',' + (up.z * 300 | 0); if (_shC.pl !== pl || _shC.k !== k) { _shC = { pl, k, h: surfaceH(pl, up) }; } return _shC.h; }

// Ray vs nearby objects (planet-local). Returns { o, t } or null.
function natRaycast(orig, dir, maxD) {
  let best = null, bt = maxD;
  for (const o of NAT.near) {
    if (!o.alive) continue;
    // object as a capsule from base to top along its up, radius ~ visual size
    const rad = o.sp.kind === 'tree' ? Math.max(o.rad * 2.2, 0.8) : Math.max(o.rad, o.h * 0.45);
    const cy = o.sp.kind === 'tree' ? o.h * 0.5 : o.h * 0.45;
    _v1.copy(o.pos).addScaledVector(o.up, cy).sub(orig);
    const tc = _v1.dot(dir);
    if (tc < 0 || tc - rad > bt) continue;
    const d2 = _v1.lengthSq() - tc * tc;
    const rr = o.sp.kind === 'tree' ? rad + o.h * 0.25 : rad;
    if (d2 > rr * rr) continue;
    const t = tc - Math.sqrt(Math.max(0, rr * rr - d2)) * 0.5;
    if (t < bt) { bt = t; best = o; }
  }
  return best ? { o: best, t: bt } : null;
}
// Mine an object: returns { item, n } yielded this call (may be 0)
function natDamage(o, dmg) {
  if (!o.alive) return null;
  o.hp -= dmg;
  const y = o.sp.yield;
  if (!o.total) { const r = RNG(hashN(strSeed(o.key), 3)); o.total = r.int(y.n[0], y.n[1]); if (o.sp.bonus && r() < o.sp.bonus.p) o.bonusN = r.int(o.sp.bonus.n[0], o.sp.bonus.n[1]); }
  const frac = clamp(1 - o.hp / o.hp0, 0, 1);
  const should = Math.floor(o.total * frac);
  const n = should - o.got; o.got = should;
  const out = [];
  if (n > 0) out.push({ item: y.item, n });
  // shrink while mined
  const k = 1 - frac * 0.55;
  if (o.cell && Math.abs((o.shrink || 1) - k) > 0.06) { o.shrink = k; o.cell.dirty = true; }
  if (o.dyn && o.mesh) o.mesh.scale.setScalar(o.sc * k);
  if (o.hp <= 0) {
    if (o.bonusN) out.push({ item: o.sp.bonus.item, n: o.bonusN });
    natRemove(o);
  }
  return out;
}
function natRemove(o) {
  o.alive = false;
  if (o.dyn) { if (o.mesh && o.mesh.parent) o.mesh.parent.remove(o.mesh); NAT.dyn = NAT.dyn.filter((d) => d !== o); }
  else { natRemovedSet(NAT.pl).add(o.key); if (o.cell) o.cell.dirty = true; }
  bus.emit('natRemoved', o);
}
// Pick a plant by hand
function natPick(o) {
  if (!o.alive || !o.sp.pick) return null;
  const r = RNG(hashN(strSeed(o.key), 4));
  const n = r.int(o.sp.pick.n[0], o.sp.pick.n[1]);
  natRemove(o);
  return { item: o.sp.pick.item, n };
}
// Dynamic objects (storm crystals): live outside the cell meshes
function natSpawnDyn(pl, s, pos, up) {
  const m = new THREE.Mesh(s.tpl.geo, R.mat.vc);
  m.position.copy(pos); basisQuat(up, perpOf(up), m.quaternion); m.scale.setScalar(1);
  pl.group.add(m);
  const o = { key: 'dyn' + Math.random(), sp: s, pos: pos.clone(), up: up.clone(), sc: 1, hp: 10, hp0: 10, got: 0, alive: true, rad: 0.4, h: s.tpl.h, solid: false, dyn: true, mesh: m };
  NAT.dyn.push(o);
  return o;
}
// solid-object collision for a sphere at p (planet-local): pushes p out, returns true if hit
function natCollide(p, rad, up) {
  let hit = false;
  for (const o of NAT.near) {
    if (!o.alive || !o.solid) continue;
    _v1.copy(p).sub(o.pos);
    const along = _v1.dot(o.up);
    if (along < -1 || along > o.h + 0.5) continue;
    _v1.addScaledVector(o.up, -along); // horizontal offset
    const d = _v1.length(), rr = o.rad + rad;
    if (d < rr && d > 1e-4) { p.addScaledVector(_v1, (rr - d) / d); hit = true; }
  }
  return hit;
}
