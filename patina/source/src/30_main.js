// Boot, the main loop and the #debug hook (window.PA).
let _last = performance.now();
G.lightAng = 0.25;

function update(dt) {
  G.t += dt;
  LAYER.time.value = G.t;
  LAYER.hint.value = damp(LAYER.hint.value, G.lamp && G.state === 'play' ? 1 : 0, 10, dt);
  if (G.state === 'title') CAM.tYaw += dt * 0.16;
  if (G.state === 'reveal' || G.state === 'ba') {
    G.revealT = (G.revealT || 0) + dt;
    if (G.state === 'reveal') CAM.tYaw += dt * 0.22;
    // a slow sweep of the key light across the finished piece
    G.lightAng = 0.25 + 0.35 * Math.sin(G.revealT * 0.35);
  }
  // key light swings around the bench
  const a = (G.lightAng - 0.25) * 2.4, k = R.rig || 1;
  R.key.position.set((KEY_POS.x * Math.cos(a) - KEY_POS.z * Math.sin(a)) * k, KEY_POS.y * k, (KEY_POS.x * Math.sin(a) + KEY_POS.z * Math.cos(a)) * k);
  if (G.piece) { if (G.piece.update) G.piece.update(dt); stepSettle(G.piece, dt); }
  if (G.state === 'play') paintStep(dt); else auBrush(0, G.tool, dt);
  updateCamera(dt);
  hoverStep(dt);
  uiStep(dt);
}
function draw() {
  if (G.state === 'ba') drawBA(); else renderer.render(scene, camera);
}
function frame(now) {
  const dt = Math.min(0.05, (now - _last) / 1000); _last = now;
  if (!DEBUG || !window.PA.paused) { update(dt); draw(); }
  requestAnimationFrame(frame);
}

async function boot() {
  if (!renderer || !renderer.capabilities.isWebGL2) {
    $('#title').hidden = true;
    $('#err').hidden = false;
    $('#err').textContent = 'Patina needs WebGL 2. Try a recent Chrome, Firefox, Safari or Edge.';
    return;
  }
  showScreen('loading');
  setLoad('Laying out the bench', 0.05);
  await frameWait();
  initRenderer();
  requestAnimationFrame(frame);
  const next = PIECES.find((p, i) => pieceUnlocked(i) && !pieceDone(p.id)) || PIECES[0];
  await loadPiece(next.id);
  buildShelf();
  showScreen('title');
  resetView(true);
  CAM.tPitch = CAM.pitch = 0.08;
  window.__ready = true;
  if (window.PA) window.PA.ready = true;
}

if (DEBUG) {
  const at = (x, y) => { setNdc(x, y); return PTR.ndc.clone(); };
  let PA_last = null;
  window.PA = {
    G, CAM, R, PTR, PIECES, LAYER, scene, camera, renderer, paused: false,
    start: async (id = 'watch') => { await startPiece(id); update(0); return G.piece.parts.length; },
    sim(sec, step = 1 / 30) { for (let t = 0; t < sec; t += step) update(step); },
    render() { scene.updateMatrixWorld(); draw(); },
    view(yaw, pitch, dist, target) {
      CAM.tYaw = CAM.yaw = yaw; CAM.tPitch = CAM.pitch = pitch; CAM.tDist = CAM.dist = dist;
      if (target) { CAM.tTarget.set(...target); CAM.target.set(...target); }
      CAM.shift = CAM.tShift; CAM.shiftY = CAM.tShiftY;
      updateCamera(0);
    },
    // work the piece at a screen point for a while, as if scrubbing
    brush(x, y, tool, secs = 1, size) {
      if (tool) setTool(tool); if (size !== undefined) setSize(size);
      const nd = at(x, y), fx = newFx();
      const hit = pick(nd); if (!hit || !hit.part.paint) return null;
      for (let t = 0; t < secs; t += 1 / 30) brushAt(hit, brushRadius(), G.tool, (1 / 30) * 1.2, fx);
      advise(fx); PA_last = { part: hit.part.name, useful: +fx.useful.toFixed(2), harm: +fx.harm.toFixed(2), toast: $('#toast').textContent };
      for (const p of G.piece.parts) if (p.dirty) { upload(p); p.dirty = false; p.progDirty = true; }
      renderJob();
      return { part: hit.part.name, useful: +fx.useful.toFixed(3), harm: +fx.harm.toFixed(3) };
    },
    lastAdvice() { return PA_last; },
    pickAt(x, y) { const h = pick(at(x, y)); return h && { part: h.part.name, point: h.point.toArray().map((v) => +v.toFixed(4)) }; },
    // apply a tool to every vertex of the named parts (or all), w per vertex; `where(x, y, z)` (piece space,
    // the watch's dial faces +Z) limits it to part of the piece
    workAll(tool, w = 1, names, where) {
      const fx = newFx(), v = V3();
      for (const p of G.piece.parts) {
        if (names && !names.includes(p.name)) continue;
        const P = p.geom.attributes.position.array;
        for (let i = 0; i < p.n; i++) {
          if (where) { v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(p.rel); if (!where(v.x, v.y, v.z)) continue; }
          applyTool(p, i, w, tool, fx);
        }
        upload(p, true); p.progDirty = true;
      }
      renderJob();
      return +fx.useful.toFixed(1);
    },
    progress() { return jobGroups(G.piece).map((g) => [g.name, +g.all.toFixed(3), Object.fromEntries([...g.tasks].map(([k, v]) => [k, +v.toFixed(2)]))]); },
    lamp(on) { if (G.lamp !== on) toggleLamp(); LAYER.hint.value = on ? 1 : 0; },
    open(on) { G.piece.setOpen(on, true); G.open = on; },
    finish() { finishPiece(); },
    settle() { if (G.piece.settle !== undefined) { G.piece.settle = 0.999; stepSettle(G.piece, 1); } },
    ba(x) { openBA(); BA.x = x; placeBA(); },
    photo() { openPhoto(); },
    shelf() { toShelf(); },
    stats() {
      let v = 0, t = 0;
      for (const p of [...G.piece.parts, ...G.piece.props]) { v += p.n; t += p.geom.index.count / 3; }
      return { verts: v, tris: t, calls: renderer.info.render.calls, progs: renderer.info.programs.length };
    },
  };
}

boot().catch((e) => {
  console.error(e);
  $('#err').hidden = false; $('#err').textContent = 'Something went wrong setting up the bench: ' + e.message;
});
