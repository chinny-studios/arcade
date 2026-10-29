// ---- 12_player: player helm, gunnery and the chase camera ----
// The camera orbits the ship by yaw; mouse up/down sets the aim distance. The camera looks from behind the
// ship at the aim point on the water, so the screen centre is always where the balls will land.
// Spyglass (right mouse / Shift / LT) moves the eye to the masthead and narrows the view.
const PC = { yaw: 0, aimDist: 400, zoom: 1, spy: false, spyK: 0, ax: 0, az: 0, target: null, spect: null, shake: 0, free: 0 };
PC.reset = function () {
  const p = G.player; PC.yaw = p ? p.h : 0; PC.aimDist = p ? p.range() * 0.6 : 400; PC.spy = false; PC.spyK = 0; PC.target = null; PC.spect = p; PC.zoom = 1;
};
PC.subject = () => (G.player && G.player.alive && G.player.isPlayer) ? G.player : PC.spect;

PC.update = function (dt) {
  const p = G.player, alive = p && p.alive && p.isPlayer && Match.phase !== 'over';
  const pad = Input.pad, sens = settings.sens * (PC.spy ? 0.22 : 1);
  // look
  PC.yaw -= Input.mdx * 0.0026 * sens + pad.rx * dt * 2.2 * (PC.spy ? 0.25 : 1);
  const dy = (Input.mdy * 0.0035 * sens + pad.ry * dt * 1.6 * (PC.spy ? 0.3 : 1)) * (settings.invert ? -1 : 1);
  PC.aimDist = clamp(PC.aimDist * Math.exp(-dy), 40, 1150);
  if (Input.wheel) PC.zoom = clamp(PC.zoom * (Input.wheel > 0 ? 1.12 : 0.89), 0.55, 2.2);
  PC.spy = alive && (Input.down('M2') || Input.down('ShiftLeft') || Input.down('ShiftRight') || pad.lt > 0.4);
  PC.spyK = approach(PC.spyK, PC.spy ? 1 : 0, dt * 6);
  if (alive) helm(p, dt);
  else if (Match.phase !== 'none') spectate(dt);
  camera(dt);
};

function helm(p, dt) {
  const pad = Input.pad;
  if (Input.any('KeyW', 'ArrowUp', 'P12')) p.tele = Math.min(4, p.tele + 1);
  if (Input.any('KeyS', 'ArrowDown', 'P13')) p.tele = Math.max(-1, p.tele - 1);
  if (Math.abs(pad.ly) > 0.7) { if (!PC.padTele) { p.tele = clamp(p.tele + (pad.ly < 0 ? 1 : -1), -1, 4); PC.padTele = true; } } else PC.padTele = false;
  let r = 0;
  if (Input.down('KeyA') || Input.down('ArrowLeft')) r -= 1;
  if (Input.down('KeyD') || Input.down('ArrowRight')) r += 1;
  if (Input.down('KeyQ')) r = -0.5; if (Input.down('KeyE')) r = 0.5;
  if (Math.abs(pad.lx) > 0.05) r = pad.lx;
  p.rudderCmd = r;
  // weapons
  for (let i = 0; i < 4; i++) if (Input.hit('Digit' + (i + 1))) p.setWeapon(i);
  if (Input.hit('P5') || Input.hit('P4')) {
    const n = p.C.rafts ? 4 : 3, d = Input.hit('P5') ? 1 : -1;
    p.setWeapon((p.weapon + d + n) % n);
  }
  if (Input.any('KeyR', 'P2')) { if (p.useRepair()) Hud.ribbon('Repair party at work', 'info'); else Hud.deny(p.repair.n ? 'Repair party not ready' : 'No repair parties left'); }
  if (Input.any('KeyT', 'P3')) { if (p.useSpecial()) Hud.ribbon(SPECIALS[p.spec.id].name, 'info'); else Hud.deny(p.spec.n ? SPECIALS[p.spec.id].name + ' not ready' : 'None left'); }
  if (p.C.ignite && Input.any('KeyY', 'P0')) { if (p.ignite()) Hud.ribbon('She burns! Ram an enemy!', 'info'); }
  if (Input.any('KeyG', 'P1')) {
    const t = nearestEnemy(p, 80);
    if (t && p.startBoard(t)) { /* ribbon from startBoard */ } else Hud.deny(t ? p.boardReason(t) : 'No enemy alongside');
  }
  // aim point and target
  PC.ax = p.x + Math.sin(PC.yaw) * PC.aimDist; PC.az = p.z + Math.cos(PC.yaw) * PC.aimDist;
  PC.target = pickTarget(p);
  if ((Input.down('M0') || Input.down('Space') || pad.rt > 0.5) && Match.phase === 'battle') {
    if (p.fire(PC.ax, PC.az) && p.weapon !== RAFT_SLOT) { PC.shake = Math.max(PC.shake, 0.25 + p.C.guns.dmg / 400); Sfx.boom(p.x, p.z, 0.8 + p.C.guns.dmg / 200); }
  }
}
function nearestEnemy(p, max) {
  let best = null, bd = max;
  for (const o of G.ships) if (o.alive && o.team !== p.team) { const d = p.gap(o); if (d < bd) { bd = d; best = o; } }
  return best;
}
// The spotted enemy closest to the aim point, for the lead marker and target panel.
function pickTarget(p) {
  let best = null, bs = 1e9;
  for (const o of G.ships) {
    if (!o.alive || o.team === p.team || !o.seen[p.team]) continue;
    const d = Math.hypot(o.x - PC.ax, o.z - PC.az), dd = Math.hypot(o.x - p.x, o.z - p.z);
    const lim = Math.max(60, dd * 0.3);
    if (d < lim && d < bs) { bs = d; best = o; }
  }
  return best;
}
function spectate(dt) {
  const list = G.ships.filter((s) => s.alive && s.team === Match.viewTeam);
  if (!PC.spect || !PC.spect.alive || PC.spect.team !== Match.viewTeam) {
    if (!PC.spectWait) PC.spectWait = 4;
    PC.spectWait -= dt;
    if (PC.spectWait <= 0 && list.length) { PC.spect = list[0]; PC.spectWait = 0; }
  }
  if (list.length && Input.any('Tab', 'KeyN', 'P5', 'M0')) {
    const i = list.indexOf(PC.spect); PC.spect = list[(i + 1) % list.length];
  }
  const s = PC.subject();
  if (s) { PC.ax = s.x + Math.sin(PC.yaw) * PC.aimDist; PC.az = s.z + Math.cos(PC.yaw) * PC.aimDist; }
}

function camera(dt) {
  const s = PC.subject() || { x: 0, z: 0, y: 0, C: { len: 40, mastH: 40 }, h: 0 };
  const cam = R.camera, L = s.C.len;
  // High enough that the masts sit below the line of sight to the aim point.
  const back = (s.C.mastH * 3.3 + 20 + L * 0.3) * PC.zoom, up = (s.C.mastH * 1.45 + 4) * PC.zoom;
  const fx = Math.sin(PC.yaw), fz = Math.cos(PC.yaw);
  const ax = s.x + fx * PC.aimDist, az = s.z + fz * PC.aimDist;
  // third person
  let cx = s.x - fx * back, cz = s.z - fz * back, cy = up + (s.y || 0);
  // spyglass: eye at the masthead
  const k = smoothstep(0, 1, PC.spyK);
  cx = lerp(cx, s.x + fx * L * 0.6, k); cz = lerp(cz, s.z + fz * L * 0.6, k); cy = lerp(cy, s.C.mastH + 4, k);
  if (s.model && k > 0.6) s.model.root.visible = false;
  else if (s.model && s.alive) s.model.root.visible = true;
  const gh = World.h(cx, cz); if (cy < gh + 6) cy = gh + 6;
  cam.position.set(cx, cy, cz);
  if (PC.shake > 0 && settings.shake) { PC.shake = Math.max(0, PC.shake - dt * 1.6); cam.position.x += rnd(-1, 1) * PC.shake; cam.position.y += rnd(-1, 1) * PC.shake; }
  cam.lookAt(ax, 0, az);
  cam.fov = lerp(55, 11, k); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); // the HUD projects markers before the render
  // fog banks thicken the view from inside
  const fogK = Match.phase !== 'none' ? Match.inFog(cx, cz) : 0;
  const base = R.scene.fog.userData || (R.scene.fog.userData = {});
  if (base.far == null || base.q !== Match.squall) { base.far = lerp(3400, 1100, Match.squall); base.near = lerp(500, 120, Match.squall); base.q = Match.squall; }
  R.scene.fog.far = lerp(base.far, 420, fogK); R.scene.fog.near = lerp(base.near, 30, fogK);
  Sfx.listen(cx, cz);
  if (Match.squall > 0.15 && !G.simming) Fx.rain(cx, cz, Match.squall);
}
