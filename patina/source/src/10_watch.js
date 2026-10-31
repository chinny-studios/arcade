// Piece 1: a gold-filled open-face pocket watch, c. 1895, hanging from a brass watch stand.
// Local frame: the dial faces +Z, the crown is at +Y. Units are metres (the case is 48 mm across).
function dialTexture() {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const R = S / 2;
  x.translate(R, R);
  x.fillStyle = x.strokeStyle = '#000';
  const ring = (r, lw) => { x.lineWidth = lw; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); };
  ring(R * 0.935, 3); ring(R * 0.86, 2.2);
  for (let i = 0; i < 60; i++) {
    x.save(); x.rotate((i / 60) * TAU);
    x.lineWidth = i % 5 ? 2.4 : 5;
    x.beginPath(); x.moveTo(0, -R * 0.86); x.lineTo(0, -R * 0.935); x.stroke();
    if (i % 5 === 0) { x.beginPath(); x.arc(0, -R * 0.965, 4.5, 0, TAU); x.fill(); }
    x.restore();
  }
  const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', '', 'VII', 'VIII', 'IX', 'X', 'XI'];
  x.font = `600 ${Math.round(R * 0.15)}px "Cormorant Garamond", Georgia, "Times New Roman", serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    if (!roman[i]) continue;
    x.save(); x.rotate((i / 12) * TAU);
    x.save(); x.translate(0, -R * 0.715); x.scale(0.82, 1.18); x.fillText(roman[i], 0, 0); x.restore();
    x.restore();
  }
  // small seconds at six o'clock
  x.save(); x.translate(0, R * 0.45);
  ring(R * 0.2, 2); ring(R * 0.165, 1.5);
  for (let i = 0; i < 60; i++) {
    x.save(); x.rotate((i / 60) * TAU); x.lineWidth = i % 5 ? 1.4 : 3;
    x.beginPath(); x.moveTo(0, -R * 0.165); x.lineTo(0, -R * (i % 5 ? 0.185 : 0.2)); x.stroke(); x.restore();
  }
  x.font = `600 ${Math.round(R * 0.05)}px Georgia, serif`;
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * TAU; x.fillText(String(i * 10), Math.sin(a) * R * 0.125, -Math.cos(a) * R * 0.125); }
  x.restore();
  x.font = `500 ${Math.round(R * 0.058)}px "Cormorant Garamond", Georgia, serif`;
  x.fillText('A.  V A L L I E R', 0, -R * 0.36);
  x.font = `italic 500 ${Math.round(R * 0.045)}px "Cormorant Garamond", Georgia, serif`;
  x.fillText('Genève', 0, -R * 0.28);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Breguet-style hand pointing +Y: tapered shaft, an open "moon" near the tip, a spear point, a round hub
function handGeom(len, w, moonR, moonAt, tail, depth) {
  const shapes = [];
  const shaft = new THREE.Shape();
  if (!moonR) {
    // plain tapered needle
    shaft.moveTo(-w, -tail); shaft.lineTo(w, -tail); shaft.lineTo(w * 0.6, len * 0.8); shaft.lineTo(0, len); shaft.lineTo(-w * 0.6, len * 0.8); shaft.closePath();
    const hub = new THREE.Shape(); hub.absarc(0, 0, w * 3, 0, TAU, false);
    return tess(new THREE.ExtrudeGeometry([shaft, hub], { depth, bevelEnabled: false, curveSegments: 24 }), 0.0004);
  }
  shaft.moveTo(-w, -tail); shaft.lineTo(w, -tail); shaft.lineTo(w * 0.55, moonAt - moonR * 0.85); shaft.lineTo(-w * 0.55, moonAt - moonR * 0.85); shaft.closePath();
  shapes.push(shaft);
  const moon = new THREE.Shape(); moon.absarc(0, moonAt, moonR, 0, TAU, false);
  const hole = new THREE.Path(); hole.absarc(0, moonAt + moonR * 0.12, moonR * 0.62, 0, TAU, true);
  moon.holes.push(hole); shapes.push(moon);
  const tip = new THREE.Shape();
  tip.moveTo(-w * 0.75, moonAt + moonR * 0.8); tip.lineTo(w * 0.75, moonAt + moonR * 0.8); tip.lineTo(0, len); tip.closePath();
  shapes.push(tip);
  const hub = new THREE.Shape(); hub.absarc(0, 0, w * 2.3, 0, TAU, false); shapes.push(hub);
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 28 });
  return tess(g, 0.0005);
}
// lathe around the watch axis (+Z)
function zlathe(pts, step, segs) { const g = lathe(pts, step, segs); g.rotateX(Math.PI / 2); return g; }

PIECES.push({
  id: 'watch', title: 'Pocket watch', era: 'Gold-filled open face, c. 1895',
  blurb: 'Tarnished, grimy, the crystal fogged with old fingerprints and the hands freckled with rust.',
  done: 'It keeps time again. Clean enamel, blued hands, and the engine-turned back catching every light in the room.',
  build() {
    const H = 0.040, Rb = 0.0241;
    const piece = { id: 'watch', parts: [], props: [], root: new THREE.Group(), noiseF: 130, seed: 11,
      brush: [0.0012, 0.009], focus: V3(0, H + 0.004, 0), dist: 0.16, minDist: 0.034, maxDist: 0.42, pitch: 0.1 };
    const watch = new THREE.Group(); watch.position.set(0, H, 0); piece.root.add(watch);

    const gold = (o = {}) => Object.assign({ kind: 'metal', col: lin(0.96, 0.76, 0.42), rough: 0.36, roughPol: 0.06, scale: 110, corr: 'tarnish',
      dirt: lin(0.05, 0.04, 0.03), dust: lin(0.26, 0.23, 0.19) }, o);
    const brassJob = { surf: 'soft', corr: 'tarnish', polish: true };

    // case band: a softly convex ring
    // counter-clockwise: out along the bottom, up the outside, in across the top, down the inside
    const bandPts = [[0.0221, -0.0042]];
    for (let i = 0; i <= 24; i++) { const z = -0.0042 + (i / 24) * 0.0084; bandPts.push([0.0234 + 0.00075 * Math.cos((z / 0.0042) * Math.PI / 2), z]); }
    bandPts.push([0.0221, 0.0042], [0.0221, -0.0042]);
    // with the hinge knuckle on the left
    const hingeG = lathe([[0, -0.0024], [0.0009, -0.0024, 0.0003], [0.0009, 0.0024, 0.0003], [0, 0.0024]], 0.0002, 32);
    hingeG.translate(-0.02405, 0, 0.0041);
    addPart(piece, { name: 'Case band', geom: merge([zlathe(bandPts, 0.00025, 256), hingeG]), parent: watch, mat: gold(), job: brassJob,
      init: { grime: [0.18, 0.9, 0.25, 0.3], corr: [0.5, 0.35, 0.35], scratch: [0.7, 0.35] } });

    // back cover, domed and engine-turned
    const back = [[0, -0.0077]];
    for (let i = 1; i <= 30; i++) { const r = (i / 30) * 0.0226; back.push([r, -0.0044 - 0.0033 * Math.pow(1 - (r / 0.0226) ** 2, 0.85)]); }
    back.push([0.0236, -0.0043, 0.0006], [0.0236, -0.0039], [0.0, -0.0039]);
    addPart(piece, { name: 'Case back', geom: zlathe(back, 0.00022, 288), parent: watch, job: brassJob,
      mat: gold({ pat: 'guilloche', axis: V3(0, 0, 1), origin: V3(0, 0, 0), patP: [0.0226, 4300, 44, 0.000028] }),
      init: { grime: [0.25, 1.1, 0.25, 0.3], corr: [0.72, 0.35, 0.3], scratch: [0.5, 0.25] } });

    // hinged bezel with the crystal
    const hinge = new THREE.Group(); hinge.position.set(-0.02405, 0, 0.0041); watch.add(hinge);
    const bez = zlathe([[0.0205, 0.004], [0.0236, 0.004], [0.0239, 0.0052, 0.0012], [0.0213, 0.0068, 0.0008], [0.0205, 0.0062, 0.0003], [0.0205, 0.004]], 0.00022, 256);
    bez.translate(0.02405, 0, -0.0041);
    addPart(piece, { name: 'Bezel', geom: bez, parent: hinge, hinged: true, mat: gold(), job: brassJob,
      init: { grime: [0.2, 0.9, 0.25, 0.3], corr: [0.5, 0.35, 0.35], scratch: [0.6, 0.3] } });
    const cr = [[0, 0.0071]];
    for (let i = 1; i <= 20; i++) { const r = (i / 20) * 0.0207; cr.push([r, 0.0057 + 0.0014 * (1 - (r / 0.0207) ** 2)]); }
    for (let i = 20; i >= 0; i--) { const r = (i / 20) * 0.0207; cr.push([r, 0.0061 + 0.0029 * (1 - (r / 0.0207) ** 2)]); }
    const crys = zlathe(cr, 0.0004, 256); crys.translate(0.02405, 0, -0.0041);
    addPart(piece, { name: 'Crystal', glass: true, hinged: true, geom: crys, parent: hinge, job: { surf: 'glass' },
      mat: { kind: 'glass', col: lin(1, 1, 1), scale: 140, thick: 0.0012, ior: 1.52, dirt: lin(0.12, 0.1, 0.08), dust: lin(0.26, 0.24, 0.21) },
      init: { grime: [0.1, 0.0, 0.06, 0.4], scratch: [0.9, 0.55] } });

    // enamel dial
    const dial = zlathe([[0, 0.0027], [0.0219, 0.0027], [0.0219, 0.0033, 0.0002], [0, 0.0033]], 0.0003, 256);
    addPart(piece, { name: 'Dial', geom: dial, parent: watch, job: { surf: 'enamel' },
      mat: { kind: 'enamel', col: lin(0.8, 0.775, 0.71), col2: lin(0.01, 0.01, 0.012), rough: 0.35, scale: 140, map: dialTexture(), mapXf: [-1 / 0.0438],
        axis: V3(0, 0, 1), dirt: lin(0.16, 0.09, 0.03), dust: lin(0.5, 0.36, 0.15) },
      init: { grime: [0.35, 0.8, 0.1, 0.35] } });

    // hands
    const blued = { kind: 'metal', col: lin(0.1, 0.2, 0.62), rough: 0.2, roughPol: 0.07, irid: 0.45, iridT: 300, scale: 160, corr: 'rust', env: 1.3 };
    const handJob = { surf: 'hard', corr: 'rust' };
    const handInit = { grime: [0.25, 0.4, 0.2, 0.3], corr: [0.38, 0.4, 0.5] };
    const pivH = new THREE.Group(); pivH.position.z = 0.00345; watch.add(pivH);
    const pivM = new THREE.Group(); pivM.position.z = 0.0039; watch.add(pivM);
    const pivS = new THREE.Group(); pivS.position.set(0, -0.00986, 0.00338); watch.add(pivS);
    addPart(piece, { name: 'Hour hand', geom: handGeom(0.0118, 0.00042, 0.0016, 0.0085, 0.002, 0.00028), parent: pivH, mat: blued, job: handJob, init: handInit });
    addPart(piece, { name: 'Minute hand', geom: handGeom(0.0178, 0.00034, 0.0012, 0.0138, 0.0024, 0.00028), parent: pivM, mat: blued, job: handJob, init: handInit });
    addPart(piece, { name: 'Seconds hand', geom: handGeom(0.0038, 0.00014, 0.0, 0.0, 0.0011, 0.0002), parent: pivS, mat: blued, job: handJob, init: handInit });
    piece.pivots = [pivH, pivM, pivS];

    // pendant, crown and bow (axis +Y)
    const pend = lathe([[0, 0.0225], [0.003, 0.0225], [0.003, 0.026, 0.0003], [0.0037, 0.0264, 0.0003], [0.0037, 0.0272, 0.0003], [0, 0.0272]], 0.0002, 128);
    addPart(piece, { name: 'Pendant', geom: pend, parent: watch, mat: gold(), job: brassJob, init: { grime: [0.3, 1.0, 0.25, 0.3], corr: [0.65, 0.4, 0.3] } });
    const crown = lathe([[0, 0.0272], [0.003, 0.0272], [0.0043, 0.0277, 0.0004], [0.0043, 0.0309, 0.0005], [0.003, 0.0318, 0.0007], [0, 0.032]], 0.00018, 160);
    addPart(piece, { name: 'Crown', geom: crown, parent: watch, job: brassJob,
      mat: gold({ pat: 'knurl', axis: V3(0, 1, 0), origin: V3(0, 0, 0), patP: [36, 0.00012, 0.0279, 0.0308] }),
      init: { grime: [0.3, 1.1, 0.25, 0.3], corr: [0.65, 0.45, 0.3] } });
    const bowCurve = new THREE.CatmullRomCurve3([[-0.0033, 0.0262], [-0.0082, 0.0268], [-0.0107, 0.0305], [-0.0086, 0.0350], [0, 0.0377], [0.0086, 0.0350], [0.0107, 0.0305], [0.0082, 0.0268], [0.0033, 0.0262]].map(([x, y]) => V3(x, y, 0)));
    const bow = weld(new THREE.TubeGeometry(bowCurve, 180, 0.00105, 18, false));
    addPart(piece, { name: 'Bow', geom: bow, parent: watch, mat: gold(), job: brassJob, init: { grime: [0.25, 0.9, 0.25, 0.3], corr: [0.6, 0.4, 0.35] } });

    // centre boss (prop)
    const boss = zlathe([[0, 0.0039], [0.0011, 0.0039], [0.0011, 0.0043, 0.0003], [0.0005, 0.0046, 0.0003], [0, 0.0046]], 0.0001, 48);
    addPart(piece, { name: 'Boss', geom: boss, parent: watch, paint: false, mat: gold({ rough: 0.2 }), init: { polish: [0.9, 0] } });

    // the stand: walnut foot, brass post bent into a pin that runs through the bow
    const walnut = { kind: 'wood', col: lin(0.12, 0.06, 0.03), col2: lin(0.05, 0.022, 0.01), rough: 0.5, scale: 60, pat: 'wood',
      axis: V3(1, 0, 0.2).normalize(), origin: V3(0, -0.1, 0.3), patP: [420, 1.2, 0, 0.00002], fin: 'oil', finT: lin(0.9, 0.7, 0.5) };
    const foot = lathe([[0, 0], [0.031, 0, 0.0], [0.032, 0.0035, 0.0025], [0.026, 0.0075, 0.002], [0, 0.0078]], 0.0004, 160);
    foot.translate(0, 0, -0.012);
    addPart(piece, { name: 'Stand', geom: foot, paint: false, mat: walnut, init: { grime: [0.05, 0.12, 0.15, 0.08], fin: 1 } });
    const pinY = H + 0.03545, zp = -0.019;
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(V3(0, 0.006, zp), V3(0, pinY - 0.007, zp)));
    path.add(new THREE.QuadraticBezierCurve3(V3(0, pinY - 0.007, zp), V3(0, pinY, zp), V3(0, pinY, zp + 0.007)));
    path.add(new THREE.LineCurve3(V3(0, pinY, zp + 0.007), V3(0, pinY, 0.0035)));
    const post = weld(new THREE.TubeGeometry(path, 260, 0.0012, 16, false));
    const knob = lathe([[0, -0.0012], [0.0018, -0.0008, 0.0006], [0.0018, 0.0008, 0.0006], [0, 0.0014]], 0.0002, 32);
    knob.rotateX(Math.PI / 2); knob.translate(0, pinY, 0.0042);
    const brassP = gold({ rough: 0.3, roughPol: 0.1 }), brassI = { grime: [0.03, 0.1, 0.1, 0.05], corr: [0.12, 0.15, 0.2], polish: [0.75, 0.15] };
    addPart(piece, { name: 'Stand', geom: post, paint: false, mat: brassP, init: brassI });
    addPart(piece, { name: 'Stand', geom: knob, paint: false, mat: brassP, init: brassI });

    // hinge
    piece.hinge = hinge; piece.openAmt = 0;
    piece.openLabel = ['Open case', 'Close case'];
    piece.setOpen = (on, instant) => { G.open = on; if (instant) { piece.openAmt = on ? 1 : 0; hinge.rotation.y = -1.95 * piece.openAmt; } };
    // a stopped watch reads ten past ten; restored, it runs on local time
    piece.clock = 10 * 3600 + 9 * 60 + 36; piece.running = false;
    piece.setHands = (sec) => {
      const s = sec % 43200;
      pivH.rotation.z = -(s / 43200) * TAU;
      pivM.rotation.z = -((s % 3600) / 3600) * TAU;
      pivS.rotation.z = -((Math.floor(s) % 60) / 60) * TAU;
    };
    piece.setHands(piece.clock);
    piece.update = (dt) => {
      piece.openAmt = damp(piece.openAmt, G.open ? 1 : 0, 5, dt);
      hinge.rotation.y = -1.95 * smoothstep(0, 1, piece.openAmt);
      if (piece.running) {
        const d = new Date();
        const now = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
        const prev = Math.floor(piece.clock);
        // sweep the hour and minute hands to the time, then let the seconds tick
        piece.clock = piece.sweep < 1 ? lerp(piece.clockFrom, now + (now < piece.clockFrom ? 43200 : 0), smoothstep(0, 1, piece.sweep)) : now;
        piece.sweep = Math.min(1, (piece.sweep || 0) + dt / 2.2);
        piece.setHands(piece.clock);
        if (piece.sweep >= 1 && Math.floor(piece.clock) !== prev) auTick();
      }
    };
    piece.onReveal = () => { piece.running = true; piece.clockFrom = piece.clock; piece.sweep = 0; };
    return piece;
  },
});
