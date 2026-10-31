// Piece 3: a violin, c. 1870, on a display stand. Local frame: Y runs from the end button (y = 0) to the scroll,
// the top plate faces +Z, X is across the body. The body is 356 mm long.
const VL = 0.356;
function violinOutline(step) {
  // right half from the bottom of the lower bout to the top, corners as tight turns; the left half mirrors it
  const R = [[0.03, 0.002], [0.06, 0.012], [0.085, 0.03], [0.1, 0.055], [0.104, 0.08], [0.101, 0.105], [0.092, 0.125], [0.082, 0.137], [0.085, 0.146],
    [0.072, 0.149], [0.062, 0.16], [0.056, 0.18], [0.056, 0.2], [0.06, 0.217], [0.068, 0.227], [0.077, 0.233],
    [0.073, 0.24], [0.08, 0.252], [0.084, 0.27], [0.083, 0.29], [0.077, 0.31], [0.064, 0.33], [0.044, 0.346], [0.02, 0.354]];
  const pts = [V3(0, 0, 0), ...R.map(([x, y]) => V3(x, y, 0)), V3(0, VL, 0), ...R.slice().reverse().map(([x, y]) => V3(-x, y, 0))];
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const sp = c.getSpacedPoints(Math.ceil(c.getLength() / step));
  sp.pop();
  return sp.map((p) => new THREE.Vector2(p.x, p.y));
}
// plate arching: flat at the edge, a scooped channel just inside it, then a long rise to the middle
function plateArch(loop, zE, A, sign) {
  return (x, y) => {
    const d = distToLoop(loop, x, y), t = sat((d - 0.003) / 0.042);
    return sign * (zE + A * t * t * (3 - 2 * t) - 0.0007 * Math.exp(-(((d - 0.0065) / 0.0028) ** 2)));
  };
}
// purfling (and f-holes on the top) painted into a full-colour map projected straight down onto the plate
const VMAP = { w: 0.22, l: 0.37, oy: 0.178 };
function violinPlateTexture(loop, fholes) {
  const cw = 768, ch = Math.round(cw * VMAP.l / VMAP.w), c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const x = c.getContext('2d'), k = cw / VMAP.w;
  const px = (v) => (v / VMAP.w + 0.5) * cw, py = (v) => (1 - ((v - VMAP.oy) / VMAP.l + 0.5)) * ch;
  const path = (lp) => { x.beginPath(); lp.forEach((p, i) => (i ? x.lineTo(px(p.x), py(p.y)) : x.moveTo(px(p.x), py(p.y)))); x.closePath(); };
  const purf = offsetLoop(loop, -0.0042);
  x.lineJoin = 'round';
  path(purf); x.strokeStyle = '#0b0805'; x.lineWidth = 0.0013 * k; x.stroke();
  path(purf); x.strokeStyle = '#d9c7a2'; x.lineWidth = 0.00045 * k; x.stroke();
  if (fholes) {
    x.fillStyle = x.strokeStyle = '#050302';
    for (const s of [-1, 1]) {
      x.beginPath(); x.arc(px(s * 0.037), py(0.224), 0.0026 * k, 0, TAU); x.fill();
      x.beginPath(); x.arc(px(s * 0.051), py(0.152), 0.0034 * k, 0, TAU); x.fill();
      x.lineCap = 'round'; x.lineWidth = 0.0019 * k;
      x.beginPath(); x.moveTo(px(s * 0.0385), py(0.222));
      x.bezierCurveTo(px(s * 0.047), py(0.205), px(s * 0.041), py(0.172), px(s * 0.0495), py(0.155)); x.stroke();
      // the little nicks halfway down each f
      x.lineWidth = 0.0008 * k;
      x.beginPath(); x.moveTo(px(s * 0.0405), py(0.19)); x.lineTo(px(s * 0.0485), py(0.188)); x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const fbTop = (y) => 0.0325 + (0.356 - y) * 0.149;
const fbW = (y) => lerp(0.024, 0.042, sat((0.486 - y) / 0.27));
const fbTh = (y) => lerp(0.005, 0.0075, sat((0.486 - y) / 0.27));
const crown = (x, w) => { const R = 0.042; return Math.sqrt(R * R - x * x) - Math.sqrt(R * R - (w / 2) ** 2); };
// a rounded-rectangle ring (superellipse) in the XZ plane at height y
function seRing(y, w, h, zc, n = 24, e = 0.35) {
  const r = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    r.push(V3((w / 2) * Math.sign(c) * Math.abs(c) ** e, y, zc + (h / 2) * Math.sign(s) * Math.abs(s) ** e));
  }
  return r;
}

PIECES.push({
  id: 'violin', title: 'Violin', era: 'Flamed maple, c. 1870',
  blurb: 'Rosin caked under the strings, the varnish dull and worn through where it was played, the ebony grey.',
  done: 'It sings again. Amber varnish over flamed maple that shimmers as it turns, and ebony black as ink.',
  build() {
    const piece = { id: 'violin', parts: [], props: [], root: new THREE.Group(), noiseF: 45, seed: 37,
      brush: [0.003, 0.03], focus: V3(0, 0.31, -0.025), dist: 1.45, minDist: 0.15, maxDist: 2.4, pitch: 0.1, table: 0.16, rig: 2.0 };
    const vg = new THREE.Group(); vg.position.set(0, 0.03, 0); vg.rotation.x = -0.14; piece.root.add(vg);
    piece.table = 0.17;
    const loop = violinOutline(0.002);
    const ribLoop = offsetLoop(loop, -0.0025);
    const topZ = plateArch(loop, 0.019, 0.0155, 1), backZ = plateArch(loop, 0.019, 0.0145, -1);
    const rimProf = [[0, 0.019], [0.0006, 0.0188], [0.001, 0.0182], [0.0012, 0.0172], [0.001, 0.0162], [0.0006, 0.0157], [0, 0.0155], [-0.0025, 0.0155]];
    const grime = { dirt: lin(0.055, 0.04, 0.025), dust: lin(0.6, 0.56, 0.46) };
    const varnish = { fin: 'varnish', finT: lin(0.66, 0.3, 0.1), polishWood: true, rough: 0.5, roughPol: 0.3 };
    const mapping = { mapRGB: true, mapAxis: V3(0, 0, 1), mapOrigin: V3(0, VMAP.oy, 0), mapXf: [-1 / VMAP.w, -1 / VMAP.l] };
    const maple = (o) => Object.assign({ kind: 'wood', col: lin(0.62, 0.46, 0.25), col2: lin(0.5, 0.34, 0.17), scale: 50, pat: 'wood',
      axis: V3(0, 1, 0), origin: V3(0, 0, -0.8), patP: [90, 0.6, 2, 0.00001], flame: TAU * 95 }, varnish, grime, { dust: lin(0.3, 0.26, 0.2) }, o);
    const plateJob = { surf: 'wood', fin: 'Varnish', polish: true };
    // where a player's chin, hands and shoulder have worn the varnish through to bare wood
    const wearAt = (spots, edge) => (lp, v, n, m, o, cav, n1) => {
      let w = 0;
      for (const [x, y, r, k] of spots) w = Math.max(w, k * Math.exp(-((lp.x - x) ** 2 + (lp.y - y) ** 2) / (r * r)));
      if (edge) { const d = distToLoop(loop, lp.x, lp.y); w = Math.max(w, edge * (1 - smoothstep(0.002, 0.007, d))); }
      w += (n1 - 0.5) * 0.9;
      if (w > 0.5) { m[o + 3] = 0; m[o] += 0.45; }
    };

    // top plate: spruce, arched, with purfling and f-holes; rosin dust under the strings
    const top = merge([heightCap(loop, 0.0024, topZ, true), sweepLoop(loop, rimProf, -0.01, 0.017)]);
    const wearTop = wearAt([[-0.055, 0.05, 0.03, 0.9], [0.06, 0.2, 0.012, 0.6]], 0.55);
    addPart(piece, { name: 'Top', geom: top, parent: vg, job: plateJob,
      mat: Object.assign({ kind: 'wood', col: lin(0.66, 0.5, 0.28), col2: lin(0.4, 0.25, 0.11), scale: 60, pat: 'wood', axis: V3(0, 1, 0),
        origin: V3(0, 0, -0.35), patP: [650, 0.18, 2, 0.000012], map: violinPlateTexture(loop, true) }, varnish, grime, mapping),
      init: { grime: [0.2, 0.7, 0.2, 0.3], polish: [0.18, 0.12], fin: 1,
        post(lp, v, n, m, o, cav, n1) {
          wearTop(lp, v, n, m, o, cav, n1);
          const r = Math.exp(-((lp.x / 0.03) ** 2) - (((lp.y - 0.2) / 0.035) ** 2));
          m[o] += r * 0.7;
        } } });
    const back = merge([heightCap(loop, 0.0024, backZ, false), sweepLoop(loop, rimProf.map(([o, z]) => [o, -z]), -0.01, -0.017)]);
    addPart(piece, { name: 'Back', geom: back, parent: vg, job: plateJob,
      mat: maple(Object.assign({ map: violinPlateTexture(loop, false) }, mapping)),
      init: { grime: [0.15, 0.6, 0.1, 0.3], polish: [0.18, 0.12], fin: 1, post: wearAt([[0, 0.3, 0.04, 0.85], [-0.06, 0.06, 0.025, 0.6]], 0.45) } });
    const ribProf = []; for (let z = -0.0157; z <= 0.01571; z += 0.002) ribProf.push([0, z]);
    addPart(piece, { name: 'Ribs', geom: sweepLoop(ribLoop, ribProf), parent: vg, job: plateJob, mat: maple(),
      init: { grime: [0.2, 0.7, 0.2, 0.3], polish: [0.18, 0.12], fin: 1, post: wearAt([[-0.08, 0.03, 0.035, 0.8], [0.084, 0.146, 0.012, 0.8], [-0.084, 0.146, 0.012, 0.8], [0.077, 0.233, 0.012, 0.7]], 0) } });

    // neck, pegbox and scroll: one piece of maple
    const neckR = [];
    for (let k = 0; k <= 60; k++) {
      const y = 0.34 + (k / 60) * 0.148, yc = Math.max(y, 0.356), top2 = fbTop(yc) - fbTh(yc), w = fbW(yc) * 0.96;
      const dn = y < 0.375 ? lerp(0.046, 0.021, (y - 0.34) / 0.035) : lerp(0.021, 0.0185, (y - 0.375) / 0.111);
      const r = [];
      for (let i = 1; i < 5; i++) r.push(V3(-w / 2 + (w * i) / 5, y, top2));
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; r.push(V3((w / 2) * Math.cos(a), y, top2 - dn * Math.sin(a))); }
      neckR.push(r);
    }
    const boxR = [];
    for (let k = 0; k <= 30; k++) { const t = k / 30; boxR.push(seRing(0.484 + t * 0.078, lerp(0.0235, 0.021, t), 0.027, -0.002)); }
    const scR = [], ph0 = Math.PI, turns = 2.25, C = [0.5745, -0.002];
    for (let k = 0; k <= 150; k++) {
      const f = k / 150, ph = ph0 + f * turns * TAU, r = 0.0165 * Math.exp(-0.15 * (ph - ph0));
      const uy = Math.cos(ph), uz = Math.sin(ph), py = C[0] + r * uy, pz = C[1] + r * uz;
      const wx = lerp(0.0105, 0.0035, Math.pow(f, 0.8)), tr = Math.min(0.0047, r * 0.5);
      const ring = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * TAU, c = Math.cos(a), s = Math.sin(a), xx = wx * Math.sign(c) * Math.abs(c) ** 0.4, rr = tr * Math.sign(s) * Math.abs(s) ** 0.4;
        ring.push(V3(xx, py + uy * rr, pz + uz * rr));
      }
      scR.push(ring);
    }
    addPart(piece, { name: 'Neck and scroll', geom: merge([tess(loft(neckR), 0.003), tess(loft(boxR), 0.003), tess(loft(scR), 0.003)]), parent: vg,
      job: { surf: 'wood', polish: true }, mat: maple(),
      init: { grime: [0.2, 0.7, 0.2, 0.3], polish: [0.15, 0.1], fin: 1, post(lp, v, n, m, o) { if (lp.y > 0.37 && lp.y < 0.49) m[o] += 0.3; } } });
    const cav = roundBox(0.012, 0.055, 0.002, 0.0009, 0.0015); cav.translate(0, 0.524, 0.0115);
    addPart(piece, { name: 'Interior', geom: cav, parent: vg, paint: false, init: {}, mat: { kind: 'paint', col: lin(0.012, 0.008, 0.005), rough: 0.8, scale: 60 } });

    // ebony: fingerboard, nut, pegs, tailpiece, end button
    const fbR = [];
    for (let k = 0; k <= 90; k++) {
      const y = 0.486 - (k / 90) * 0.27, w = fbW(y), t = fbTop(y), th = fbTh(y), r = [];
      for (let i = 0; i <= 12; i++) { const x = -w / 2 + (w * i) / 12; r.push(V3(x, y, t + crown(x, w))); }
      for (let i = 0; i <= 6; i++) { const x = w / 2 - (w * i) / 6; r.push(V3(x, y, t - th)); }
      fbR.push(r);
    }
    const ebony = Object.assign({ kind: 'wood', col: lin(0.02, 0.017, 0.015), col2: lin(0.006, 0.005, 0.005), rough: 0.6, roughPol: 0.12, scale: 90, pat: 'wood',
      axis: V3(0, 1, 0), origin: V3(0, 0, -0.2), patP: [1200, 0.3, 0, 0.000006], polishWood: true }, grime, { dust: lin(0.4, 0.37, 0.3) });
    const ebJob = { surf: 'wood', polish: true }, ebInit = { grime: [0.28, 0.8, 0.2, 0.3], polish: [0.06, 0.06] };
    const nut = roundBox(0.024, 0.004, 0.006, 0.0012, 0.001); nut.translate(0, 0.4875, fbTop(0.486) - 0.0015);
    const tp = new THREE.Shape([[-0.012, 0.035], [0.012, 0.035], [0.019, 0.095], [0.016, 0.108], [0.008, 0.112], [-0.008, 0.112], [-0.016, 0.108], [-0.019, 0.095]].map(([x, y]) => new THREE.Vector2(x, y)));
    const tail = slab([tp], 0.005, 0, 0.0012, 0.0025);
    tail.translate(0, -0.035, 0); tail.rotateX(0.2); tail.translate(0, 0.035, 0.034);
    const button = lathe([[0, -0.007], [0.0045, -0.007, 0.001], [0.006, -0.004, 0.0015], [0.0045, -0.001], [0.0035, 0.003], [0, 0.003]], 0.0003, 48);
    const pegs = [];
    [0.497, 0.512, 0.527, 0.542].forEach((y, i) => {
      const g = lathe([[0, -0.014], [0.0028, -0.014, 0.0006], [0.0034, 0.014], [0.0045, 0.0155, 0.0005], [0.0045, 0.019, 0.0005], [0.004, 0.0205],
        [0.0095, 0.026, 0.004], [0.0105, 0.032, 0.004], [0.007, 0.038, 0.003], [0, 0.0405]], 0.0005, 40);
      g.scale(1, 1, 0.38); g.rotateZ(i % 2 ? -Math.PI / 2 : Math.PI / 2); g.translate(0, y, -0.002);
      pegs.push(g);
    });
    addPart(piece, { name: 'Ebony fittings', geom: merge([tess(loft(fbR), 0.003), nut, tail, button, ...pegs]), parent: vg, job: ebJob, mat: ebony, init: ebInit });

    // bridge, standing on the arch between the f-hole nicks
    const zb = topZ(0.017, 0.195), Hb = 0.0625 - zb;
    const bs = new THREE.Shape();
    bs.moveTo(-0.0205, 0); bs.lineTo(-0.011, 0); bs.quadraticCurveTo(0, 0.009, 0.011, 0); bs.lineTo(0.0205, 0); bs.lineTo(0.0195, 0.003);
    bs.quadraticCurveTo(0.011, 0.007, 0.0125, 0.011); bs.quadraticCurveTo(0.017, 0.015, 0.016, 0.019); bs.lineTo(0.0165, Hb - 0.0035);
    bs.quadraticCurveTo(0, Hb + 0.0025, -0.0165, Hb - 0.0035); bs.lineTo(-0.016, 0.019); bs.quadraticCurveTo(-0.017, 0.015, -0.0125, 0.011);
    bs.quadraticCurveTo(-0.011, 0.007, -0.0195, 0.003); bs.closePath();
    for (const [hx, hy, hr] of [[0, Hb * 0.58, 0.0022], [-0.0085, 0.0105, 0.0017], [0.0085, 0.0105, 0.0017]]) { const h = new THREE.Path(); h.absarc(hx, hy, hr, 0, TAU, true); bs.holes.push(h); }
    const bridge = slab([bs], 0.0032, -0.0016, 0.0003, 0.0012);
    bridge.rotateX(Math.PI / 2); bridge.translate(0, 0.195, zb);
    addPart(piece, { name: 'Bridge', geom: bridge, parent: vg, job: { surf: 'wood' }, init: { grime: [0.35, 0.6, 0.2, 0.3] },
      mat: Object.assign({ kind: 'wood', col: lin(0.72, 0.58, 0.38), col2: lin(0.56, 0.42, 0.25), rough: 0.6, scale: 80, pat: 'wood',
        axis: V3(1, 0, 0), origin: V3(0, 0.195, -0.3), patP: [300, 0.4, 0, 0.000008] }, grime) });

    // strings (new, so props): tailpiece, over the bridge, over the nut, into the pegbox
    const strG = [];
    for (let i = 0; i < 4; i++) {
      const xt = -0.00975 + 0.0065 * i, xb = -0.0165 + 0.011 * i, xn = -0.00825 + 0.0055 * i;
      const zt = 0.034 + 0.073 * Math.sin(0.2) + 0.0058, zbr = 0.0625 - (0.042 - Math.sqrt(0.042 ** 2 - xb * xb)) + 0.0003;
      const pts = [V3(xt, 0.106, zt), V3(xb, 0.195, zbr), V3(xn, 0.487, fbTop(0.486) + 0.0007 + crown(xn, 0.024)), V3(xn * 0.5, 0.505 + 0.012 * i, -0.002)];
      const path = new THREE.CurvePath();
      for (let k = 0; k < 3; k++) path.add(new THREE.LineCurve3(pts[k], pts[k + 1]));
      strG.push(weld(new THREE.TubeGeometry(path, 140, [0.00045, 0.00038, 0.00032, 0.00026][i], 6, false)));
    }
    addPart(piece, { name: 'Strings', geom: merge(strG), parent: vg, paint: false, init: { polish: [1, 0] },
      mat: { kind: 'metal', col: lin(0.72, 0.7, 0.66), rough: 0.3, roughPol: 0.18, scale: 200 } });

    // display stand: walnut foot, a felt-padded rest under the end button, a brass rod up the back to a padded yoke
    vg.updateMatrix();
    const yoke = V3(0, 0.42, -0.003).applyMatrix4(vg.matrix);
    const walnut = { kind: 'wood', col: lin(0.12, 0.06, 0.03), col2: lin(0.05, 0.022, 0.01), rough: 0.5, scale: 40, pat: 'wood',
      axis: V3(1, 0, 0.2).normalize(), origin: V3(0, -0.1, 0.3), patP: [300, 1.2, 0, 0.00002], fin: 'oil', finT: lin(0.9, 0.7, 0.5) };
    const foot = lathe([[0, 0], [0.13, 0], [0.132, 0.005, 0.004], [0.124, 0.012, 0.004], [0, 0.0125]], 0.0008, 200); foot.translate(0, 0, -0.02);
    addPart(piece, { name: 'Stand', geom: foot, paint: false, mat: walnut, init: { grime: [0.04, 0.1, 0.1, 0.05], fin: 1 } });
    const felt = { kind: 'felt', col: lin(0.06, 0.02, 0.02), col2: lin(0.3, 0.12, 0.1), scale: 120 };
    const rest = roundBox(0.05, 0.012, 0.04, 0.004, 0.002); rest.translate(0, 0.0125 + 0.006, 0);
    const pad = new THREE.CylinderGeometry(0.005, 0.005, 0.04, 24, 8).rotateZ(Math.PI / 2).translate(0, yoke.y - 0.004, yoke.z - 0.005);
    addPart(piece, { name: 'Stand', geom: merge([rest, weld(pad)]), paint: false, mat: felt, init: {} });
    // the rod rises beside the body (so the back stays in view) and arcs in over the upper bout to the yoke
    const rx = -0.125, rz = yoke.z - 0.012, rp = new THREE.CurvePath();
    rp.add(new THREE.LineCurve3(V3(rx, 0.006, -0.05), V3(rx, yoke.y - 0.06, rz)));
    rp.add(new THREE.QuadraticBezierCurve3(V3(rx, yoke.y - 0.06, rz), V3(rx, yoke.y - 0.008, rz), V3(-0.03, yoke.y - 0.008, rz)));
    rp.add(new THREE.LineCurve3(V3(-0.03, yoke.y - 0.008, rz), V3(0.022, yoke.y - 0.008, rz)));
    const rod = weld(new THREE.TubeGeometry(rp, 220, 0.0028, 16, false));
    addPart(piece, { name: 'Stand', geom: rod, paint: false, init: { grime: [0.03, 0.1, 0.1, 0.05], corr: [0.1, 0.15, 0.2], polish: [0.8, 0.1] },
      mat: { kind: 'metal', col: lin(0.92, 0.72, 0.38), rough: 0.3, roughPol: 0.1, scale: 80, corr: 'tarnish' } });

    piece.onReveal = () => auViolin();
    return piece;
  },
});
