// Piece 2: a 1938 walnut table radio, the "Aurelia Super Seven". Local frame: origin at the bottom centre,
// front +Z. The back is open: turn it round to see the chassis, the valves and the speaker.
function radioDialTexture() {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d'), R = S / 2;
  x.translate(R, R);
  x.fillStyle = x.strokeStyle = '#000';
  const ring = (r, lw, a0 = 0, a1 = TAU) => { x.lineWidth = lw; x.beginPath(); x.arc(0, 0, r, a0, a1); x.stroke(); };
  const A0 = -Math.PI * 0.75, A1 = Math.PI * 0.75;      // the scale runs 270 degrees, clockwise from bottom left
  const arc = (r, lw) => ring(r, lw, A0 - Math.PI / 2, A1 - Math.PI / 2);
  arc(R * 0.93, 4); arc(R * 0.86, 2);
  for (let i = 0; i <= 90; i++) {
    const a = A0 + (A1 - A0) * (i / 90);
    x.save(); x.rotate(a); x.lineWidth = i % 5 ? 2 : 4.5;
    x.beginPath(); x.moveTo(0, -R * 0.86); x.lineTo(0, -R * (i % 5 ? 0.9 : 0.93)); x.stroke(); x.restore();
  }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `600 ${Math.round(R * 0.06)}px Georgia, serif`;
  for (let i = 0; i <= 6; i++) {
    const a = A0 + (A1 - A0) * (i / 6);
    x.save(); x.rotate(a); x.fillText(String(200 + i * 60), 0, -R * 0.79); x.restore();
  }
  const stations = ['BUDAPEST', 'BERLIN', 'WIEN', 'PRAHA', 'HILVERSUM', 'BRUXELLES', 'PARIS', 'ROMA', 'OSLO', 'DROITWICH', 'LUXEMBOURG'];
  x.font = `600 ${Math.round(R * 0.042)}px "Inter", system-ui, sans-serif`;
  stations.forEach((s, i) => {
    const a = A0 + (A1 - A0) * ((i + 0.5) / stations.length);
    x.save(); x.rotate(a); x.translate(0, -R * 0.63); x.rotate(-Math.PI / 2); x.fillText(s, 0, 0); x.restore();
  });
  arc(R * 0.42, 1.5);
  x.font = `italic 600 ${Math.round(R * 0.13)}px "Cormorant Garamond", Georgia, serif`;
  x.fillText('Aurelia', 0, -R * 0.1);
  x.font = `600 ${Math.round(R * 0.045)}px "Inter", system-ui, sans-serif`;
  x.fillText('S U P E R   S E V E N', 0, R * 0.08);
  x.fillText('MEDIUM WAVE  ·  METRES', 0, R * 0.6);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function nameplateTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'italic 600 96px "Cormorant Garamond", Georgia, serif';
  x.fillText('Aurelia', 256, 66);
  x.fillRect(24, 60, 60, 5); x.fillRect(428, 60, 60, 5);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
// a valve's glass envelope as a thin closed solid around +Y: base, straight wall, domed top
function valveGlass(R, h, tk) {
  const pts = [[R * 0.9 - tk, 0], [R * 0.9, 0], [R, 0.008], [R, h - R]];
  for (let k = 1; k <= 10; k++) { const a = (k / 10) * Math.PI / 2; pts.push([R * Math.cos(a), h - R + R * Math.sin(a)]); }
  pts.push([0, h - tk]);
  for (let k = 9; k >= 0; k--) { const a = (k / 10) * Math.PI / 2; pts.push([(R - tk) * Math.cos(a), h - R + (R - tk) * Math.sin(a)]); }
  pts.push([R - tk, 0.008], [R * 0.9 - tk, 0]);
  return lathe(pts, 0.0008, 72);
}

PIECES.push({
  id: 'radio', title: 'Valve radio', era: 'Walnut and Bakelite, 1938',
  blurb: 'Crazed, nicotine-brown varnish, a grille cloth gone yellow, dull knobs and a rusty chassis behind.',
  done: 'It plays again. Walnut under new varnish, the Bakelite back to a deep shine, the dial lit and the valves glowing in the back.',
  build() {
    const W = 0.42, H = 0.25, D = 0.21, T = 0.012, bev = 0.004, DX = 0.105, DY = 0.15;
    const piece = { id: 'radio', parts: [], props: [], root: new THREE.Group(), noiseF: 18, seed: 23,
      brush: [0.004, 0.034], focus: V3(0, 0.125, 0), dist: 0.95, minDist: 0.2, maxDist: 1.8, pitch: 0.16, table: 0.27, rig: 2.1 };
    const nicotine = { dirt: lin(0.085, 0.05, 0.02), dust: lin(0.3, 0.25, 0.17) };
    const woodJob = { surf: 'wood', old: true, fin: 'Varnish' };
    const woodInit = { grime: [0.15, 0.7, 0.35, 0.3], old: [0.9, 0.12], scratch: [0.6, 0.3], fin: 0 };
    const veneer = (o) => Object.assign({ kind: 'wood', rough: 0.5, scale: 30, pat: 'wood', old: true, oldT: lin(0.42, 0.25, 0.1),
      fin: 'varnish', finT: lin(0.8, 0.6, 0.42) }, nicotine, o);

    // cabinet: a rounded tube of walnut veneer, open at the back
    const outer = rrect(W - 2 * bev, H - 2 * bev, 0.06, 0.014, 0, H / 2);
    outer.holes.push(rrect(W - 2 * T, H - 2 * T, 0.05, 0.006, 0, H / 2, new THREE.Path()));
    const shell = slab([outer], D - 2 * bev, -D / 2 + bev, bev, 0.004, 24);
    // the front baffle sits 12 mm back in the opening (its back is bare board)
    const Wi = W - 2 * T - 2 * bev + 0.001, Hi = H - 2 * T - 2 * bev + 0.001;
    const baffle = slab([rrect(Wi, Hi, 0.05 - bev, 0.004, 0, H / 2)], 0.006, 0.087, 0, 0.004, 24);
    const inside = (v, n) => v.z < 0.086 && n.x * v.x + n.y * (v.y - H / 2) < 0 && Math.abs(n.z) < 0.7;
    addPart(piece, { name: 'Cabinet', geom: shell, job: woodJob,
      mat: veneer({ col: lin(0.2, 0.09, 0.035), col2: lin(0.07, 0.03, 0.012), axis: V3(1, 0, 0), origin: V3(0, -0.35, -0.5), patP: [150, 2.4, 1, 0.00003] }),
      init: Object.assign({ exclude: inside, excl: [0.15, 0, 0, 0, 0, 1] }, woodInit) });
    addPart(piece, { name: 'Cabinet', geom: baffle, job: woodJob,
      mat: veneer({ col: lin(0.24, 0.12, 0.05), col2: lin(0.09, 0.04, 0.015), axis: V3(0, 1, 0), origin: V3(-0.6, 0, -0.3), patP: [220, 1.6, 0, 0.00003] }),
      init: Object.assign({ exclude: (v, n) => n.z < -0.5, excl: [0.15, 0, 0, 0, 0, 1] }, woodInit) });

    // grille: striped cloth behind a frame of dark wood bars
    const GX = -0.075, GY = 0.14;
    const cloth = slab([rrect(0.2, 0.15, 0.008, 0.008, GX, GY)], 0.0015, 0.093, 0, 0.003);
    addPart(piece, { name: 'Grille cloth', geom: cloth, job: { surf: 'fabric' },
      mat: Object.assign({ kind: 'felt', pat: 'weave', col: lin(0.4, 0.31, 0.18), col2: lin(0.11, 0.055, 0.022), axis: V3(0, 0, 1),
        origin: V3(GX, GY, 0), patP: [650, 55, 0, 0.00025], scale: 60 }, nicotine),
      init: { grime: [0.42, 0.4, 0.25, 0.35] } });
    const frame = rrect(0.218, 0.168, 0.012, 0.012, GX, GY);
    frame.holes.push(rrect(0.2, 0.15, 0.008, 0.008, GX, GY, new THREE.Path()));
    const bars = [frame, ...[-0.05, 0, 0.05].map((dx) => rrect(0.009, 0.152, 0.002, 0.002, GX + dx, GY))];
    addPart(piece, { name: 'Grille frame', geom: slab(bars, 0.006, 0.0935, 0.0015, 0.003), job: woodJob,
      mat: veneer({ col: lin(0.09, 0.04, 0.017), col2: lin(0.025, 0.011, 0.005), axis: V3(0, 1, 0), origin: V3(0.3, 0, -0.4), patP: [260, 1.2, 0, 0.00003] }),
      init: woodInit });

    // dial: printed card, needle, domed glass, chrome bezel and a nameplate
    const card = zlathe([[0, 0.0932], [0.0505, 0.0932], [0.0505, 0.0942], [0, 0.0942]], 0.0008, 160); card.translate(DX, DY, 0);
    const cardPart = addPart(piece, { name: 'Dial card', geom: card, paint: false, init: { grime: [0.04, 0, 0, 0] },
      mat: { kind: 'paint', col: lin(0.62, 0.52, 0.35), col2: lin(0.06, 0.035, 0.02), rough: 0.7, scale: 60, map: radioDialTexture(), mapXf: [-1 / 0.1],
        axis: V3(0, 0, 1), origin: V3(DX, DY, 0), emit: new THREE.Color(0, 0, 0) } });
    const needlePiv = new THREE.Group(); needlePiv.position.set(DX, DY, 0.0952); piece.root.add(needlePiv);
    const needle = merge([new THREE.BoxGeometry(0.0012, 0.046, 0.0005).translate(0, 0.019, 0), zlathe([[0, 0], [0.003, 0], [0.003, 0.0012, 0.0005], [0, 0.0014]], 0.0003, 32)]);
    addPart(piece, { name: 'Needle', geom: needle, parent: needlePiv, paint: false, cast: false, mat: { kind: 'paint', col: lin(0.5, 0.06, 0.02), rough: 0.35, scale: 80 } });
    const gl = [[0, 0.0978]];
    for (let i = 1; i <= 16; i++) { const r = (i / 16) * 0.0495; gl.push([r, 0.096 + 0.0018 * (1 - (r / 0.0495) ** 2)]); }
    for (let i = 16; i >= 0; i--) { const r = (i / 16) * 0.0495; gl.push([r, 0.0972 + 0.003 * (1 - (r / 0.0495) ** 2)]); }
    const dglass = zlathe(gl, 0.0012, 160); dglass.translate(DX, DY, 0);
    addPart(piece, { name: 'Dial glass', glass: true, geom: dglass, job: { surf: 'glass' },
      mat: { kind: 'glass', col: lin(1, 0.98, 0.95), scale: 60, thick: 0.0015, dirt: lin(0.2, 0.12, 0.04), dust: lin(0.32, 0.26, 0.17) },
      init: { grime: [0.3, 0, 0.15, 0.4], scratch: [0.7, 0.4] } });
    const chrome = (o) => Object.assign({ kind: 'metal', col: lin(0.6, 0.61, 0.63), rough: 0.32, roughPol: 0.035, scale: 60, corr: 'tarnish' }, nicotine, o);
    const chromeJob = { surf: 'soft', corr: 'tarnish', polish: true }, chromeInit = { grime: [0.2, 0.8, 0.2, 0.3], corr: [0.5, 0.4, 0.35] };
    const bez = zlathe([[0.048, 0.0928], [0.057, 0.0928], [0.0575, 0.098, 0.003], [0.0515, 0.1035, 0.002], [0.0485, 0.1015, 0.0008], [0.048, 0.0928]], 0.0004, 220);
    bez.translate(DX, DY, 0);
    addPart(piece, { name: 'Chrome trim', geom: bez, mat: chrome(), job: chromeJob, init: chromeInit });
    const plate = roundBox(0.066, 0.017, 0.003, 0.0012, 0.0012); plate.translate(DX, 0.08, 0.0945);
    addPart(piece, { name: 'Chrome trim', geom: plate, job: chromeJob, init: chromeInit,
      mat: chrome({ map: nameplateTexture(), col2: lin(0.015, 0.012, 0.01), mapXf: [-1 / 0.066, -1 / 0.017], axis: V3(0, 0, 1), origin: V3(DX, 0.08, 0) }) });

    // three Bakelite knobs with knurled skirts
    for (const kx of [GX, 0.06, 0.15]) {
      const knob = zlathe([[0, 0], [0.017, 0], [0.017, 0.006, 0.001], [0.0155, 0.016, 0.002], [0.0115, 0.0205, 0.003], [0, 0.021]], 0.0004, 96);
      knob.translate(kx, 0.036, 0.093);
      addPart(piece, { name: 'Knobs', geom: knob, job: { surf: 'soft', polish: true },
        mat: { kind: 'bakelite', col: lin(0.09, 0.03, 0.01), col2: lin(0.2, 0.07, 0.022), rough: 0.65, roughPol: 0.1, scale: 70,
          pat: 'knurl', axis: V3(0, 0, 1), origin: V3(kx, 0.036, 0.093), patP: [28, 0.0004, 0.0008, 0.0125], dirt: nicotine.dirt, dust: nicotine.dust },
        init: { grime: [0.3, 0.9, 0.2, 0.3], polish: [0.08, 0.08] } });
    }

    // inside: chassis, valves, transformer, can and speaker (seen through the open back)
    const CY = 0.0475;
    const chassis = roundBox(0.34, 0.005, 0.13, 0.002, 0.004); chassis.translate(0.02, CY - 0.0025, -0.03);
    addPart(piece, { name: 'Chassis', geom: chassis, job: { surf: 'hard', corr: 'rust' },
      mat: Object.assign({ kind: 'metal', col: lin(0.66, 0.63, 0.55), rough: 0.45, roughPol: 0.22, scale: 50, corr: 'rust' }, nicotine),
      init: { grime: [0.3, 0.6, 0.4, 0.3], corr: [0.45, 0.4, 0.45] } });
    const valves = [[0.0, -0.06, 0.012, 0.075], [0.045, -0.065, 0.011, 0.062], [0.09, -0.06, 0.011, 0.062], [0.14, -0.055, 0.015, 0.092]];
    const glassG = [], baseG = [], anodeG = [], heatG = [];
    for (const [vx, vz, r, h] of valves) {
      const y0 = CY + 0.012;
      glassG.push(valveGlass(r, h, 0.0008).translate(vx, y0, vz));
      baseG.push(lathe([[0, CY], [r * 0.95, CY, 0.001], [r * 0.95, y0 + 0.001, 0.002], [0, y0 + 0.001]], 0.0008, 48).translate(vx, 0, vz));
      anodeG.push(lathe([[0, y0 + 0.006], [r * 0.5, y0 + 0.006], [r * 0.5, y0 + h * 0.62], [0, y0 + h * 0.62]], 0.001, 32).translate(vx, 0, vz));
      heatG.push(lathe([[0, y0 + h * 0.62], [r * 0.2, y0 + h * 0.62], [r * 0.2, y0 + h * 0.72, 0.001], [0, y0 + h * 0.72]], 0.0006, 24).translate(vx, 0, vz));
    }
    addPart(piece, { name: 'Valves', glass: true, geom: merge(glassG), job: { surf: 'glass' },
      mat: { kind: 'glass', col: lin(0.96, 0.97, 1), scale: 80, thick: 0.0008, dirt: lin(0.12, 0.1, 0.08), dust: lin(0.3, 0.28, 0.24) },
      init: { grime: [0.3, 0, 0.35, 0.3] } });
    const dusty = { grime: [0.05, 0.25, 0.2, 0.05] };
    addPart(piece, { name: 'Interior', geom: merge(baseG), paint: false, init: dusty, mat: { kind: 'paint', col: lin(0.02, 0.018, 0.016), rough: 0.4, scale: 60 } });
    addPart(piece, { name: 'Interior', geom: merge(anodeG), paint: false, init: dusty, mat: { kind: 'metal', col: lin(0.14, 0.14, 0.15), rough: 0.6, roughPol: 0.6, scale: 60 } });
    const heat = addPart(piece, { name: 'Interior', geom: merge(heatG), paint: false, init: {}, mat: { kind: 'paint', col: lin(0.2, 0.1, 0.05), rough: 0.6, scale: 60, emit: new THREE.Color(0, 0, 0) } });
    const tr = roundBox(0.055, 0.05, 0.045, 0.004, 0.003); tr.translate(-0.1, CY + 0.025, -0.055);
    addPart(piece, { name: 'Interior', geom: tr, paint: false, init: dusty, mat: { kind: 'paint', col: lin(0.02, 0.02, 0.02), rough: 0.5, scale: 60 } });
    const can = lathe([[0, CY], [0.012, CY, 0.001], [0.012, CY + 0.05, 0.002], [0, CY + 0.051]], 0.001, 48); can.translate(-0.035, 0, -0.07);
    addPart(piece, { name: 'Interior', geom: can, paint: false, init: dusty, mat: { kind: 'metal', col: lin(0.7, 0.71, 0.72), rough: 0.35, roughPol: 0.35, scale: 60 } });
    const cone = zlathe([[0.015, 0.056], [0.067, 0.0865]], 0.002, 96); cone.translate(GX, GY, 0);
    addPart(piece, { name: 'Interior', geom: cone, paint: false, init: dusty, mat: { kind: 'paint', col: lin(0.3, 0.22, 0.13), rough: 0.9, scale: 60, side: THREE.DoubleSide } });
    const magnet = zlathe([[0, 0.03], [0.022, 0.03, 0.002], [0.022, 0.057, 0.002], [0, 0.057]], 0.001, 64); magnet.translate(GX, GY, 0);
    addPart(piece, { name: 'Interior', geom: magnet, paint: false, init: dusty, mat: { kind: 'metal', col: lin(0.2, 0.2, 0.21), rough: 0.5, roughPol: 0.5, scale: 60 } });
    const glow = new THREE.PointLight(0xff9450, 0, 0.6, 2); glow.position.set(0.07, 0.12, -0.06); piece.root.add(glow);

    // power: off until the reveal, then the dial lights, the heaters glow and the needle finds a station
    piece.power = 0; piece.on = false; piece.needle = -1.6; needlePiv.rotation.z = -piece.needle;
    piece.update = (dt) => {
      piece.power = damp(piece.power, piece.on ? 1 : 0, 1.2, dt);
      const p = piece.power;
      cardPart.mesh.material.userData.U.uEmit.value.setRGB(1.0, 0.6, 0.28).multiplyScalar(p * 1.6);
      heat.mesh.material.userData.U.uEmit.value.setRGB(1.0, 0.35, 0.08).multiplyScalar(p * 9);
      glow.intensity = p * 0.25;
      if (piece.on) {
        piece.needleT = Math.min(1, (piece.needleT || 0) + dt / 2.4);
        const k = piece.needleT, ease = 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.06;
        needlePiv.rotation.z = -lerp(-1.6, 0.62, ease);
      }
    };
    piece.onReveal = () => { piece.on = true; piece.needleT = 0; auRadio(true); };
    piece.dispose = () => auRadio(false);
    return piece;
  },
});
