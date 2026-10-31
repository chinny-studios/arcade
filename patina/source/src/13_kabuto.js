// Piece 4: a kabuto, an Edo-period samurai helmet, on its stand. Local frame: origin at the centre of the bowl's
// rim, Y up, the front (visor and crest) faces +Z. The riveted bowl is 25 cm across.
function monTexture() {
  // mitsudomoe: three comma shapes swirling in a ring, inlaid black on the gilt
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d'), R = S / 2;
  x.translate(R, R); x.fillStyle = x.strokeStyle = '#000';
  x.lineWidth = R * 0.07; x.beginPath(); x.arc(0, 0, R * 0.9, 0, TAU); x.stroke();
  for (let k = 0; k < 3; k++) {
    x.save(); x.rotate((k / 3) * TAU);
    x.beginPath(); x.arc(0, -R * 0.36, R * 0.24, 0, TAU); x.fill();
    // the tail sweeps round the outside, thinning as it goes
    for (let i = 0; i < 24; i++) {
      const a0 = -Math.PI / 2 + (i / 24) * 2.3, a1 = a0 + 2.3 / 24 + 0.02, w = R * 0.24 * (1 - i / 24) + R * 0.02;
      x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.arc(R * 0.12 * Math.cos(-0.2), R * 0.12 * Math.sin(-0.2), R * 0.48 - w * 0.25, a0, a1); x.stroke();
    }
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
// a horn (kuwagata) outline in the XY plane: rises from (0, 0) and sweeps outward to x = side * 0.09 at the top
function hornShape(side) {
  const pts = [], back = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, cx = side * (0.008 + 0.085 * Math.pow(t, 1.7)), cy = 0.23 * t;
    const tx = side * 0.085 * 1.7 * Math.pow(Math.max(t, 0.02), 0.7), ty = 0.23, l = Math.hypot(tx, ty);
    const nx = ty / l, ny = -tx / l, w = lerp(0.011, 0.003, t);
    pts.push(new THREE.Vector2(cx + nx * w, cy + ny * w)); back.push(new THREE.Vector2(cx - nx * w, cy - ny * w));
  }
  return new THREE.Shape(pts.concat(back.reverse()));
}

PIECES.push({
  id: 'kabuto', title: 'Kabuto helmet', era: 'Iron and urushi lacquer, Edo period',
  blurb: 'Flaking black lacquer over a riveted iron bowl, rust blooming where it has lifted, the gilt crest dull and the silk lacing grey with dust.',
  done: 'Mirror-black urushi over the rivets, the gilt horns and crests bright again, and the silk lacing back to its deep indigo.',
  build() {
    const piece = { id: 'kabuto', parts: [], props: [], root: new THREE.Group(), noiseF: 30, seed: 53,
      brush: [0.003, 0.03], focus: V3(0, 0.25, 0), dist: 1.4, minDist: 0.15, maxDist: 2.2, pitch: 0.18, table: 0.28, rig: 2.0 };
    const kg = new THREE.Group(); kg.position.set(0, 0.22, 0); piece.root.add(kg);
    const dust = { dirt: lin(0.05, 0.04, 0.03), dust: lin(0.34, 0.31, 0.26) };
    // iron under black urushi: old lacquer crazed and lifting, rust where it has gone
    const lacquer = (o) => Object.assign({ kind: 'metal', col: lin(0.3, 0.29, 0.28), rough: 0.5, roughPol: 0.3, scale: 40, corr: 'rust',
      old: true, oldT: lin(0.045, 0.032, 0.024), fin: 'urushi', finT: lin(0.012, 0.009, 0.008), opaque: true }, dust, o);
    const lacJob = { surf: 'hard', corr: 'rust', old: true, fin: 'Urushi' };
    // where lacquer has flaked: bare, rusting iron. Elsewhere old lacquer over a little hidden rust
    const flaking = (k) => (lp, v, n, m, o, cav, n1, n2) => {
      const f = n1 + (n2 - 0.5) * 0.5 + cav * 0.25 - k;
      if (f > 0.55) { m[o + 2] = 0; m[o + 1] = sat(0.55 + (f - 0.55) * 2); m[o] += 0.15; }
      else { m[o + 2] = sat(0.85 + (n1 - 0.5) * 0.3); m[o + 1] = 0.1; }
    };
    const lacInit = (k) => ({ grime: [0.08, 0.7, 0.12, 0.2], fin: 0, post: flaking(k) });

    // bowl (hachi): a dome of 32 riveted plates over a plain rim band, with a hole at the crown for the rosette
    const bowl = [[0.122, 0], [0.125, 0]];
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * 1.39; bowl.push([0.125 * Math.cos(a), 0.012 + 0.114 * Math.sin(a)]); }
    bowl.push([0.019, 0.122]);
    for (let i = 20; i >= 0; i--) { const a = (i / 20) * 1.39; bowl.push([0.122 * Math.cos(a), 0.012 + 0.111 * Math.sin(a)]); }
    bowl.push([0.122, 0]);
    addPart(piece, { name: 'Bowl', geom: lathe(bowl, 0.002, 288), parent: kg, job: lacJob, init: lacInit(0),
      mat: lacquer({ pat: 'suji', axis: V3(0, 1, 0), origin: V3(0, 0, 0), patP: [32, 85, 0.0007, 0.0028] }) });

    // neck guard (shikoro): five flaring lames round the back and sides, open at the front
    const lames = [], lameGeo = [];
    for (let i = 0; i < 5; i++) {
      const r0 = 0.127 + i * 0.021, y0 = -0.002 - i * 0.027, r1 = r0 + 0.03, y1 = y0 - 0.032;
      lames.push([r0, y0, r1, y1]);
      lameGeo.push(plathe(plateProf(r0, y0, r1, y1, 0.0025, 0.002), 0.002, 260 - i * 8, 0.95, TAU - 1.9));
    }
    addPart(piece, { name: 'Neck guard', geom: merge(lameGeo), parent: kg, job: lacJob, init: lacInit(0.05), mat: lacquer() });
    // visor (mabizashi) and the turnbacks (fukigaeshi) folded out at the front ends of the top lame
    const visor = plathe(plateProf(0.124, 0.004, 0.168, -0.024, 0.0025, 0.003), 0.0015, 160, -1.05, 2.1);
    const flaps = [];
    for (const s of [-1, 1]) {
      const f = slab([rrect(0.052, 0.046, 0.012, 0.006, 0, 0)], 0.003, -0.0015, 0.0008, 0.002);
      f.rotateY(s * 0.62); f.translate(s * 0.124, -0.018, 0.09);
      flaps.push(f);
    }
    addPart(piece, { name: 'Visor and turnbacks', geom: merge([visor, ...flaps]), parent: kg, job: lacJob, init: lacInit(-0.05), mat: lacquer() });

    // gilt: the horns (kuwagata) on their mount, the crown rosette (tehen), and a crest (mon) on each turnback
    const gilt = (o) => Object.assign({ kind: 'metal', col: lin(0.95, 0.66, 0.25), rough: 0.45, roughPol: 0.3, scale: 60, corr: 'tarnish', env: 0.75 }, dust, o);
    const giltJob = { surf: 'soft', corr: 'tarnish', polish: true }, giltInit = { grime: [0.3, 0.9, 0.3, 0.3], corr: [0.55, 0.4, 0.35] };
    const horns = [];
    for (const s of [-1, 1]) { const h = slab([hornShape(s)], 0.0022, -0.0011, 0.0007, 0.0025); horns.push(h); }
    const hornG = merge(horns);
    hornG.rotateX(-0.32); hornG.translate(0, 0.042, 0.136);
    const mount = slab([rrect(0.064, 0.036, 0.012, 0.004, 0, 0.026)], 0.003, 0.124, 0.001, 0.002);
    const socket = lathe([[0, 0], [0.007, 0, 0.002], [0.006, 0.014, 0.002], [0, 0.016]], 0.0005, 48); socket.translate(0, 0.03, 0.131);
    addPart(piece, { name: 'Gilt crest', geom: merge([hornG, mount, socket]), parent: kg, job: giltJob, init: giltInit, mat: gilt() });
    const teh = lathe([[0, 0.112], [0.027, 0.112], [0.029, 0.116, 0.002], [0.021, 0.12], [0.019, 0.124, 0.002], [0.012, 0.128], [0.01, 0.131, 0.002], [0.005, 0.1335], [0, 0.134]], 0.0008, 128);
    addPart(piece, { name: 'Gilt crest', geom: teh, parent: kg, job: giltJob, init: giltInit,
      mat: gilt({ pat: 'knurl', axis: V3(0, 1, 0), origin: V3(0, 0, 0), patP: [16, 0.0009, 0.1125, 0.1165] }) });
    const monTex = monTexture();
    for (const s of [-1, 1]) {
      const d = zlathe([[0, 0], [0.017, 0], [0.0175, 0.0012, 0.0008], [0.0165, 0.0022, 0.0008], [0, 0.0024]], 0.0004, 96);
      d.rotateY(s * 0.62); const c = V3(s * 0.124, -0.018, 0.09).add(V3(Math.sin(s * 0.62), 0, Math.cos(s * 0.62)).multiplyScalar(0.0023));
      d.translate(c.x, c.y, c.z);
      addPart(piece, { name: 'Gilt crest', geom: d, parent: kg, job: giltJob, init: giltInit,
        mat: gilt({ map: monTex, col2: lin(0.012, 0.009, 0.008), mapAxis: V3(Math.sin(s * 0.62), 0, Math.cos(s * 0.62)), mapOrigin: c, mapXf: [-1 / 0.034] }) });
    }

    // silk lacing (odoshi): paired indigo cords down every column of the neck guard, red edge cords along each lame
    const cords = [], edges = [];
    const onLame = (L, t, out) => {
      const [r0, y0, r1, y1] = L, ux = r0 - r1, uy = y0 - y1, l = Math.hypot(ux, uy), nx = uy / l, ny = -ux / l, b = 0.002 * 4 * t * (1 - t);
      return [r1 + ux * t + nx * (b + out), y1 + uy * t + ny * (b + out)];
    };
    for (let ph = 1.02; ph <= TAU - 1.02 + 1e-6; ph += 0.125) {
      for (const dp of [-0.011, 0.011]) {
        const path = new THREE.CurvePath(), p = ph + dp, pts = [];
        for (const L of lames) for (const t of [0.95, 0.5, 0.06]) { const [r, y] = onLame(L, t, 0.0016); pts.push(V3(r * Math.sin(p), y, r * Math.cos(p))); }
        for (let k = 0; k < pts.length - 1; k++) path.add(new THREE.LineCurve3(pts[k], pts[k + 1]));
        cords.push(weld(new THREE.TubeGeometry(path, 42, 0.0013, 6, false)));
      }
    }
    for (const L of lames) {
      const [r, y] = onLame(L, 0.0, 0.0014), pts = [];
      for (let k = 0; k <= 60; k++) { const p = 0.97 + (k / 60) * (TAU - 1.94); pts.push(V3(r * Math.sin(p), y, r * Math.cos(p))); }
      edges.push(weld(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.0017, 7, false)));
    }
    const silkInit = { grime: [0.45, 0.6, 0.35, 0.35] }, silkJob = { surf: 'fabric' };
    addPart(piece, { name: 'Silk lacing', geom: merge(cords), parent: kg, job: silkJob, init: silkInit,
      mat: Object.assign({ kind: 'felt', col: lin(0.02, 0.035, 0.12), col2: lin(0.12, 0.18, 0.42), scale: 300 }, dust) });
    addPart(piece, { name: 'Silk lacing', geom: merge(edges), parent: kg, job: silkJob, init: silkInit,
      mat: Object.assign({ kind: 'felt', col: lin(0.42, 0.04, 0.03), col2: lin(0.7, 0.2, 0.15), scale: 300 }, dust) });

    // stand: black lacquered base and post, a brocade cushion inside the bowl
    const blackLac = { kind: 'paint', col: lin(0.012, 0.01, 0.009), rough: 0.25, cc: 1, scale: 40 };
    const post = lathe([[0, 0], [0.14, 0], [0.142, 0.008, 0.004], [0.135, 0.016, 0.004], [0.03, 0.02, 0.006], [0.018, 0.04, 0.01], [0.016, 0.17], [0.03, 0.19, 0.008], [0, 0.195]], 0.004, 128);
    addPart(piece, { name: 'Stand', geom: post, paint: false, mat: blackLac, init: { grime: [0.04, 0.2, 0.15, 0.05] } });
    const cushion = lathe([[0, 0.185], [0.085, 0.19, 0.03], [0.1, 0.25, 0.03], [0.06, 0.3, 0.03], [0, 0.31]], 0.002, 120);
    addPart(piece, { name: 'Stand', geom: cushion, paint: false, init: {}, mat: { kind: 'felt', col: lin(0.25, 0.04, 0.03), col2: lin(0.6, 0.3, 0.12), scale: 80 } });

    piece.onReveal = () => auBell();
    return piece;
  },
});
