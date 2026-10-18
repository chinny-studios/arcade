// Geometry audit instrumentation, spliced into the bundle just before boot() by test/audit.mjs (never shipped).
// Tags every triangle with the source line of the outermost kit call that made it, and gives a material that paints
// back faces magenta: a magenta pixel means you are looking at the inside of something (a missing or reversed face).
(() => {
  const SITES = [], siteIx = new Map();
  let depth = 0, cur = 0;
  const lineOf = (l) => { const m = l && l.match(/:(\d+):\d+\)?$/); return m ? +m[1] : 0; };
  function enter() {
    if (depth++ > 0) return;
    const s = new Error().stack.split('\n');
    const key = [lineOf(s[3]), lineOf(s[4]), lineOf(s[5])].join(',');
    let i = siteIx.get(key);
    if (i == null) { i = SITES.length; SITES.push(key); siteIx.set(key, i); }
    cur = i;
  }
  const wrap = (obj, name) => {
    const f = obj[name];
    obj[name] = function (...a) { enter(); try { return f.apply(this, a); } finally { depth--; } };
  };
  for (const k of Object.keys(K)) if (typeof K[k] === 'function') wrap(K, k);
  for (const k of ['quad', 'triR']) wrap(GB.prototype, k);
  const tri0 = GB.prototype.tri;
  GB.prototype.tri = function (...a) {
    enter();
    try { const n0 = this.n; tri0.apply(this, a); if (this.n > n0) (this.tags || (this.tags = []))[n0 / 3] = cur; } finally { depth--; }
  };
  const geo0 = GB.prototype.geometry;
  GB.prototype.geometry = function () { const g = geo0.call(this); g.userData.tags = this.tags || []; return g; };

  // back faces as a second, magenta mesh pushed slightly back in depth, so that a front face always wins a near tie
  // (silhouettes seen edge-on) and only a back face with nothing in front of it shows
  const backMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.BackSide, fog: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
  const BACKS = [];
  const A = window.__AUDIT = {
    SITES,
    // call after boot, before RA.start(): the static batches pick these materials up as they are made
    prepare() { R.renderer.setPixelRatio(1); },
    // after the world is built: a magenta back-face twin for every single-sided static batch
    backs() {
      const L = [];
      R.scene.traverse((m) => { if (m.isMesh && !m.isInstancedMesh && m.geometry.userData.tags && m.material.side === THREE.FrontSide) L.push(m); });
      for (const m of L) { const b = new THREE.Mesh(m.geometry, backMat); b.matrixAutoUpdate = false; b.castShadow = b.receiveShadow = false; m.add(b); BACKS.push(b); }
      return L.length;
    },
    showBacks(on) { for (const b of BACKS) b.visible = on; },
    quiet() { NPC.agents.length = 0; NPC.spawnT = 1e9; NPC.spotT = 1e9; NPC.scanT = 1e9; for (const m of R.scene.children) if (m.isInstancedMesh) m.count = 0; },
    pos(x, y, z, yaw, pitch) {
      PL.free = true; PL.x = x; PL.y = y - PL.eye; PL.z = z; PL.yaw = yaw; PL.pitch = pitch;
      updateCamera(); updateCells(x, z); R.camera.updateMatrixWorld();
    },
    // feet height at a walkable point (podiums and paving included) and whether an eye there would be inside a solid
    // where the player would stand there (on a bridge, the deck rather than the riverbed under it)
    feet(x, z, y) { if (y != null) return y; const f = floorAt(x, z); return f < WATER_Y ? surfaceAt(x, z, groundAt(x, z) + 12) : f; },
    buried(x, y, z) { for (const s of solidsNear(x, z, 1)) if (s.y0 < y + 0.15 && s.y1 > y - 0.15 && insideSolid(s, x, z, 0.15)) return true; return false; },
    // render into a target without multisampling, so that edges come out the same in every pass
    shoot() {
      const sz = R.renderer.getDrawingBufferSize(new THREE.Vector2()), w = sz.x, h = sz.y;
      if (!A.rt || A.rt.width !== w || A.rt.height !== h) A.rt = new THREE.WebGLRenderTarget(w, h, { stencilBuffer: true }); // a stencil buffer gets 24-bit depth (16 otherwise)
      R.renderer.setRenderTarget(A.rt); R.renderer.render(R.scene, R.camera);
      const px = new Uint8Array(w * h * 4); R.renderer.readRenderTargetPixels(A.rt, 0, 0, w, h, px);
      R.renderer.setRenderTarget(null);
      return { w, h, px };
    },
    // the detector's own picture (no multisampling, back faces magenta) as a PNG data URL
    png() {
      A.showBacks(true); const { w, h, px } = A.shoot();
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'), im = g.createImageData(w, h);
      for (let j = 0; j < h; j++) im.data.set(px.subarray((h - 1 - j) * w * 4, (h - j) * w * 4), j * w * 4);
      g.putImageData(im, 0, 0); return cv.toDataURL('image/png');
    },
    // where a pixel (x, y from the bottom) lands: the hits along that ray, nearest first
    hits(x, y, w, h, n = 3, backs = false) {
      A.showBacks(backs);
      const rc = new THREE.Raycaster();
      rc.setFromCamera({ x: (x + 0.5) / w * 2 - 1, y: (y + 0.5) / h * 2 - 1 }, R.camera);
      rc.far = R.camera.far;
      const meshes = [];
      R.scene.traverse((m) => { if (m.isMesh && !m.isInstancedMesh && m.visible && m.geometry.userData.tags && (m.material === backMat) === backs) meshes.push(m); });
      return rc.intersectObjects(meshes, false).slice(0, n).map((i) => ({
        d: i.distance, site: i.object.geometry.userData.tags[i.faceIndex], p: [i.point.x, i.point.y, i.point.z].map((v) => Math.round(v * 10) / 10),
        back: i.face.normal.clone().transformDirection(i.object.matrixWorld).dot(rc.ray.direction) > 0, n: [i.face.normal.x, i.face.normal.y, i.face.normal.z].map((v) => Math.round(v * 100) / 100),
      }));
    },
    // one view: render, find magenta (inside-out) pixels and pixels that flicker when the depth range shifts (z-fighting)
    view(x, y, z, yaw, pitch, o = {}) {
      A.pos(x, y, z, yaw, pitch);
      const cam = R.camera, near0 = cam.near;
      const T = [performance.now()];
      A.showBacks(true);
      const a = A.shoot(), { w, h } = a; T.push(performance.now());
      cam.near = near0 * 1.6; cam.updateProjectionMatrix();
      A.showBacks(false);
      const b = A.shoot(); T.push(performance.now());
      cam.near = near0; cam.updateProjectionMatrix();
      const TX = 16, TY = 9, mag = new Map(), zf = new Map();
      let nMag = 0, nZ = 0;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = (j * w + i) * 4, P = a.px, Q = b.px;
        const t = Math.floor(i / w * TX) + Math.floor(j / h * TY) * TX;
        if (P[k] > 250 && P[k + 1] < 6 && P[k + 2] > 250) { nMag++; const c = mag.get(t); if (c) c.n++; else mag.set(t, { i, j, n: 1 }); continue; }
        const d = Math.abs(P[k] - Q[k]) + Math.abs(P[k + 1] - Q[k + 1]) + Math.abs(P[k + 2] - Q[k + 2]);
        if (d > 60 && !(Q[k] > 250 && Q[k + 1] < 6 && Q[k + 2] > 250)) { nZ++; const c = zf.get(t); if (c) c.n++; else zf.set(t, { i, j, n: 1 }); }
      }
      const res = { nMag, nZ, mag: [], zf: [] };
      const top = (m, minN) => [...m.values()].filter((c) => c.n >= minN).sort((p, q) => q.n - p.n).slice(0, o.rays || 5);
      // a magenta pixel is a back face: name that face (the nearest one along the ray), not what lies behind it
      for (const c of top(mag, 4)) res.mag.push({ n: c.n, px: [c.i, c.j], hits: A.hits(c.i, c.j, w, h, 3, true) });
      for (const c of top(zf, 6)) res.zf.push({ n: c.n, px: [c.i, c.j], hits: A.hits(c.i, c.j, w, h) });
      T.push(performance.now()); res.ms = T.slice(1).map((t, i) => Math.round(t - T[i]));
      return res;
    },
  };
})();
