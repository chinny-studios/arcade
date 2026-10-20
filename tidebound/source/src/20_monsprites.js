// Tidebound: monster sprites. Renders MON_ART (18_monart1.js, 19_monart2.js) into cached canvases on first use.
// Missing art gets a placeholder silhouette with a '?'. Nothing here throws: a bad entry just draws the placeholder.

const Sprites = (() => {
  const cache = {};
  const hasKey = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const artOf = (sp) => (typeof MON_ART !== 'undefined' && MON_ART && hasKey(MON_ART, sp) ? MON_ART[sp] : null);
  const colorOf = (sp) => {
    try {
      if (typeof SPECIES !== 'undefined' && SPECIES && SPECIES[sp] && SPECIES[sp].color) return SPECIES[sp].color;
    } catch (_) {}
    return '#8890a0';
  };
  // rows for front/back, falling back to front when a back view is missing
  const rowsOf = (a, back) => {
    if (!a) return null;
    const r = back && Array.isArray(a.back) ? a.back : a.front;
    return Array.isArray(r) && r.length ? r : null;
  };

  // 32x32 native canvas of the art, one fillRect per pixel. black = silhouette mode.
  function nativeCanvas(sp, back, black) {
    const key = 'n' + (black ? 'k' : 'c') + (back ? 'b' : 'f') + sp;
    if (cache[key]) return cache[key];
    const a = artOf(sp);
    const rows = rowsOf(a, back);
    if (!rows) return null;
    const pal = a.pal || {};
    const c = makeCanvas(32, 32, (cv, g) => {
      rows.forEach((row, y) => {
        if (typeof row !== 'string') return;
        for (let x = 0; x < row.length && x < 32; x++) {
          const ch = row[x];
          if (ch === '.' || !hasKey(pal, ch) && !black) continue;
          g.fillStyle = black ? '#000' : pal[ch];
          g.fillRect(x, y, 1, 1);
        }
      });
    });
    cache[key] = c;
    return c;
  }

  // Placeholder silhouette: an egg-ish blob in the species colour with a '?' (or plain black silhouette).
  function placeholder(sp, size, black) {
    return makeCanvas(size, size, (cv, g) => {
      const k = size / 64;
      g.fillStyle = black ? '#000' : colorOf(sp);
      g.beginPath();
      g.ellipse(size / 2, size * 0.55, size * 0.4, size * 0.36, 0, 0, Math.PI * 2);
      g.fill();
      if (black) return;
      g.strokeStyle = '#202028';
      g.lineWidth = Math.max(1, Math.round(2 * k));
      g.stroke();
      g.fillStyle = '#ffffff';
      g.font = 'bold ' + Math.round(30 * k) + 'px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('?', size / 2, size * 0.56);
    });
  }

  // Scale a 32x32 native canvas to 64x64 (nearest neighbour, smoothing off in makeCanvas).
  function scale64(src) {
    return makeCanvas(64, 64, (c, g) => { g.drawImage(src, 0, 0, 64, 64); });
  }

  // Block-majority downsample of the front art to 22x22 for the 24x24 icon.
  function iconCanvas(sp, frame) {
    const a = artOf(sp);
    const rows = rowsOf(a, false);
    const yOff = frame ? 1 : 2;   // frame 1 sits 1px higher: the bob
    if (!rows) return placeholder(sp, 24, false);
    const pal = a.pal || {};
    const S = 22;
    return makeCanvas(24, 24, (c, g) => {
      for (let j = 0; j < S; j++) {
        const sy0 = Math.floor(j * 32 / S), sy1 = Math.max(sy0 + 1, Math.floor((j + 1) * 32 / S));
        for (let i = 0; i < S; i++) {
          const sx0 = Math.floor(i * 32 / S), sx1 = Math.max(sx0 + 1, Math.floor((i + 1) * 32 / S));
          const counts = {};
          let n = 0, total = 0;
          for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
            total++;
            const row = rows[y];
            const ch = typeof row === 'string' ? row[x] : '.';
            if (!ch || ch === '.' || !hasKey(pal, ch)) continue;
            n++;
            counts[ch] = (counts[ch] || 0) + 1;
          }
          if (!n || n < Math.ceil(total / 3)) continue;
          let best = null, bn = -1;
          for (const k in counts) if (counts[k] > bn) { bn = counts[k]; best = k; }
          g.fillStyle = pal[best];
          g.fillRect(i + 1, j + yOff, 1, 1);
        }
      }
    });
  }

  return {
    // 64x64 front (facing left) or back (facing up-right) sprite, with the art scaled x2.
    mon(sp, back = false) {
      const key = 'm' + (back ? 'b' : 'f') + sp;
      if (cache[key]) return cache[key];
      const src = nativeCanvas(sp, !!back, false);
      cache[key] = src ? scale64(src) : placeholder(sp, 64, false);
      return cache[key];
    },

    // 24x24 party/PC/dex icon. frame 0 and 1 bob by one pixel.
    monIcon(sp, frame = 0) {
      const f = frame ? 1 : 0;
      const key = 'i' + f + sp;
      if (cache[key]) return cache[key];
      cache[key] = iconCanvas(sp, f);
      return cache[key];
    },

    // 64x64 all-black version (seen-but-not-caught dex entries, evolution flash).
    silhouette(sp) {
      const key = 's' + sp;
      if (cache[key]) return cache[key];
      const src = nativeCanvas(sp, false, true);
      cache[key] = src ? scale64(src) : placeholder(sp, 64, true);
      return cache[key];
    },

    // List of problems in every MON_ART entry (empty when everything is well formed).
    validate() {
      const probs = [];
      const all = typeof MON_ART !== 'undefined' && MON_ART ? MON_ART : {};
      for (const sp of Object.keys(all)) {
        const a = all[sp];
        if (!a || typeof a !== 'object') { probs.push(sp + ': entry is not an object'); continue; }
        const pal = a.pal || {};
        for (const v of ['front', 'back']) {
          const rows = a[v];
          if (!Array.isArray(rows)) { probs.push(sp + ' ' + v + ': missing rows'); continue; }
          if (rows.length !== 32) probs.push(sp + ' ' + v + ': ' + rows.length + ' rows, want 32');
          rows.forEach((r, y) => {
            if (typeof r !== 'string') { probs.push(sp + ' ' + v + ' row ' + y + ': not a string'); return; }
            if (r.length !== 32) probs.push(sp + ' ' + v + ' row ' + y + ': ' + r.length + ' chars, want 32');
            const bad = new Set();
            for (const ch of r) if (ch !== '.' && !hasKey(pal, ch)) bad.add(ch);
            if (bad.size) probs.push(sp + ' ' + v + ' row ' + y + ': unknown palette key ' + [...bad].map((c) => "'" + c + "'").join(' '));
          });
        }
      }
      return probs;
    },
  };
})();

DBG.sprites = Sprites;
