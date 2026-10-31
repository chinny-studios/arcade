// Camera and input. The camera never orbits: dragging sideways turns the turntable, so the piece rotates under
// fixed studio lights and the highlights travel across it. Dragging up and down tilts, scrolling zooms toward the
// cursor, shift-drag pans. Dragging on the piece works it with the current tool.
const CAM = { yaw: 0.5, pitch: 0.12, dist: 0.2, target: V3(0, 0.05, 0), tYaw: 0.5, tPitch: 0.12, tDist: 0.2, tTarget: V3(0, 0.05, 0), shift: 0, tShift: 0, shiftY: 0, tShiftY: 0 };
const PTR = { ndc: new THREE.Vector2(), last: new THREE.Vector2(), x: 0, y: 0, mode: null, pointers: new Map(), speed: 0, inside: false, hover: null, pinch: 0, fx: null, fxT: 0 };

function resetView(instant) {
  const p = G.piece; if (!p) return;
  CAM.tYaw = Math.round(CAM.tYaw / TAU) * TAU + 0.35; CAM.tPitch = p.pitch; CAM.tDist = p.dist; CAM.tTarget.copy(p.focus);
  if (instant) { CAM.yaw = CAM.tYaw; CAM.pitch = CAM.tPitch; CAM.dist = CAM.tDist; CAM.target.copy(CAM.tTarget); }
}
function updateCamera(dt) {
  const p = G.piece;
  if (p) {
    CAM.tPitch = clamp(CAM.tPitch, -0.25, 1.15);
    CAM.tDist = clamp(CAM.tDist, p.minDist, p.maxDist);
    const off = CAM.tTarget.clone().sub(p.focus), lim = p.radius * 0.9;
    if (off.length() > lim) CAM.tTarget.copy(p.focus).addScaledVector(off.normalize(), lim);
  }
  CAM.yaw = damp(CAM.yaw, CAM.tYaw, 9, dt);
  CAM.pitch = damp(CAM.pitch, CAM.tPitch, 9, dt);
  CAM.dist = Math.exp(damp(Math.log(CAM.dist), Math.log(CAM.tDist), 9, dt));
  CAM.target.lerp(CAM.tTarget, 1 - Math.exp(-9 * dt));
  CAM.shift = damp(CAM.shift, CAM.tShift, 4, dt); CAM.shiftY = damp(CAM.shiftY, CAM.tShiftY, 4, dt);
  R.platter.rotation.y = CAM.yaw;
  camera.position.set(CAM.target.x, CAM.target.y + Math.sin(CAM.pitch) * CAM.dist, CAM.target.z + Math.cos(CAM.pitch) * CAM.dist);
  camera.lookAt(CAM.target);
  const w = window.innerWidth, h = window.innerHeight;
  if (Math.abs(CAM.shift) > 1e-4 || Math.abs(CAM.shiftY) > 1e-4) camera.setViewOffset(w, h, -CAM.shift * w, CAM.shiftY * h, w, h);
  else camera.clearViewOffset();
  camera.updateMatrixWorld();
}

function setNdc(x, y) {
  const r = canvas.getBoundingClientRect();
  PTR.x = x; PTR.y = y;
  // the framing offset is in the projection matrix, so plain canvas NDC already lines up with what is drawn
  PTR.ndc.set(((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1));
}
function brushRadius() { const b = G.piece.brush; return lerp(b[0], b[1], Math.pow(G.size, 1.6)); }

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  auInit();
  canvas.setPointerCapture(e.pointerId);
  PTR.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  setNdc(e.clientX, e.clientY);
  PTR.last.copy(PTR.ndc);
  if (PTR.pointers.size === 2) { endStroke(); PTR.mode = 'pinch'; PTR.pinch = pinchDist(); return; }
  if (PTR.pointers.size > 2) return;
  const canWork = G.state === 'play' && G.piece && G.piece.settle === undefined;
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) PTR.mode = 'pan';
  else if (e.button === 2 || !canWork) PTR.mode = 'orbit';
  else {
    const hit = pick(PTR.ndc);
    if (hit && hit.part.paint) { PTR.mode = 'paint'; PTR.fx = newFx(); PTR.fxT = 0; }
    else PTR.mode = 'orbit';
  }
  document.body.classList.toggle('orbiting', PTR.mode === 'orbit' || PTR.mode === 'pan');
});
function pinchDist() { const a = [...PTR.pointers.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
canvas.addEventListener('pointermove', (e) => {
  const prev = PTR.pointers.get(e.pointerId);
  const dx = prev ? e.clientX - prev.x : 0, dy = prev ? e.clientY - prev.y : 0;
  if (prev) { prev.x = e.clientX; prev.y = e.clientY; }
  PTR.inside = true;
  if (PTR.mode === 'pinch') {
    if (PTR.pointers.size < 2) return;
    const d = pinchDist();
    if (PTR.pinch > 0) CAM.tDist *= PTR.pinch / Math.max(1, d);
    PTR.pinch = d;
    panBy(dx * 0.5, dy * 0.5);
    return;
  }
  if (PTR.pointers.size > 1 && prev && e.pointerId !== [...PTR.pointers.keys()][0]) return;
  setNdc(e.clientX, e.clientY);
  PTR.speed = Math.max(PTR.speed, Math.hypot(dx, dy) / 0.016);
  if (PTR.mode === 'orbit') { CAM.tYaw += dx * 0.0085; CAM.tPitch += dy * 0.006; }
  else if (PTR.mode === 'pan') panBy(dx, dy);
});
function panBy(dx, dy) {
  const k = CAM.dist * 0.0012;
  const right = V3().setFromMatrixColumn(camera.matrixWorld, 0), up = V3().setFromMatrixColumn(camera.matrixWorld, 1);
  CAM.tTarget.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
}
function pointerEnd(e) {
  PTR.pointers.delete(e.pointerId);
  if (PTR.mode === 'paint') endStroke();
  if (PTR.pointers.size === 0) PTR.mode = null;
  else if (PTR.mode === 'pinch') PTR.mode = 'orbit';
  document.body.classList.remove('orbiting');
}
canvas.addEventListener('pointerup', pointerEnd);
canvas.addEventListener('pointercancel', pointerEnd);
canvas.addEventListener('pointerleave', () => { PTR.inside = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (!G.piece || G.state === 'title' || G.state === 'loading') return;
  setNdc(e.clientX, e.clientY);
  const d0 = CAM.tDist, d1 = clamp(d0 * Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0012)), G.piece.minDist, G.piece.maxDist);
  if (d1 < d0) { const hit = pick(PTR.ndc); if (hit) CAM.tTarget.lerp(hit.point, (1 - d1 / d0) * 0.95); }
  else if (d1 > d0) CAM.tTarget.lerp(G.piece.focus, Math.min(1, (1 - d0 / d1) * 1.2));
  CAM.tDist = d1;
}, { passive: false });

// paint along the pointer path every frame
let _ps = 0;
function paintStep(dt) {
  const speed = PTR.speed; PTR.speed *= Math.exp(-dt * 12);
  if (PTR.mode !== 'paint' || !G.piece) { auBrush(0, G.tool, dt); return; }
  const r = canvas.getBoundingClientRect();
  const px = Math.hypot((PTR.ndc.x - PTR.last.x) * r.width / 2, (PTR.ndc.y - PTR.last.y) * r.height / 2);
  const steps = clamp(Math.ceil(px / 5), 1, 8);
  // scrubbing works faster than holding still
  const k = 0.4 + Math.min(1, speed / 500) * 0.9;
  const rad = brushRadius(), nd = new THREE.Vector2();
  let any = false;
  for (let s = 1; s <= steps; s++) {
    nd.lerpVectors(PTR.last, PTR.ndc, s / steps);
    const hit = pick(nd);
    if (hit && hit.part.paint) { brushAt(hit, rad, G.tool, (dt / steps) * k, PTR.fx); any = true; }
  }
  PTR.last.copy(PTR.ndc);
  for (const p of G.piece.parts) if (p.dirty) { upload(p); p.dirty = false; p.progDirty = true; }
  if (any) G.workTime += dt;
  auBrush(any ? 0.25 + Math.min(1, speed / 700) * 0.75 : 0, G.tool, dt);
  PTR.fxT += dt;
  if (PTR.fxT > 1.3) { advise(PTR.fx); PTR.fx = newFx(); PTR.fxT = 0; }
}
function endStroke() {
  if (PTR.mode === 'paint' && PTR.fx) advise(PTR.fx);
  PTR.fx = null;
}

// the brush cursor: a ring lying on the surface
const cursor = new THREE.Group();
{
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthTest: false, toneMapped: false }));
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), ring.material);
  cursor.add(ring, dot); cursor.renderOrder = 10; ring.renderOrder = 10; dot.renderOrder = 10;
  cursor.visible = false; scene.add(cursor);
  cursor.userData.mat = ring.material;
}
let _hoverT = 0;
function hoverStep(dt) {
  _hoverT += dt;
  const show = G.state === 'play' && PTR.inside && G.piece && G.piece.settle === undefined && PTR.mode !== 'orbit' && PTR.mode !== 'pan' && PTR.mode !== 'pinch';
  if (!show) { cursor.visible = false; setHover(null); return; }
  if (_hoverT < 0.03 && PTR.mode !== 'paint') return;
  _hoverT = 0;
  const hit = pick(PTR.ndc);
  if (!hit || !hit.part.paint) { cursor.visible = false; setHover(null); return; }
  cursor.visible = true;
  cursor.position.copy(hit.point).addScaledVector(hit.normal, 0.0002);
  cursor.quaternion.setFromUnitVectors(V3(0, 0, 1), hit.normal);
  cursor.scale.setScalar(brushRadius());
  cursor.userData.mat.color.setHex(TOOL[G.tool].col);
  setHover(hit.part);
}

window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
  const k = e.key.toLowerCase();
  if (G.state === 'play') {
    const t = TOOLS.find((t) => t.key === e.key);
    if (t) { setTool(t.id); return; }
    if (k === '[') setSize(G.size - 0.08);
    else if (k === ']') setSize(G.size + 0.08);
    else if (k === 'l') toggleLamp();
    else if (k === 'o' && G.piece.setOpen) toggleOpen();
    else if (k === 'r') resetView();
    else if (k === 'escape') toShelf();
  } else if (k === 'escape') {
    if (G.state === 'ba') closeBA(); else if (G.state === 'photo') closePhoto(); else if (G.state === 'reveal') toShelf();
  }
});
