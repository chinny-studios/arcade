// Ashreach — personal light sources: lanterns, seraphs, halo strips and glowing back items that follow their wearer

// The player owns one point light; the two nearest lantern-carrying simulated players share two more.
// All three always exist (intensity 0 when unused) so shader programs never change.
const LT_PLAYER = new THREE.PointLight(0xffffff, 0, 12, 2);
const LT_SIMS = [new THREE.PointLight(0xffffff, 0, 10, 2), new THREE.PointLight(0xffffff, 0, 10, 2)];
scene.add(LT_PLAYER, ...LT_SIMS);
const LT_SLOTS = ['util1', 'util2', 'util3', 'back'];
const LT_VIS = new Map();   // ent -> visual { g, core, halo, wings, style, color, pos }
const lt_coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
// soft round glow: a radial-gradient sprite
const lt_glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.55)'); r.addColorStop(0.6, 'rgba(255,255,255,0.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const lt_haloMat = new THREE.SpriteMaterial({ map: lt_glowTex, color: 0xffffff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
const lt_wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const lt_sphere = new THREE.SphereGeometry(1, 12, 8);
const lt_ring = new THREE.TorusGeometry(0.26, 0.035, 6, 24).rotateX(Math.PI / 2);
const lt_wing = new THREE.PlaneGeometry(0.22, 0.12).translate(0.12, 0, 0);
const lt_pack = new THREE.BoxGeometry(0.2, 0.26, 0.07);

// The brightest light source a character is wearing, or null.
function lightOf(e) {
  const c = e && e.char;
  if (!c || !c.equip) return null;
  let best = null;
  for (const s of LT_SLOTS) { const it = c.equip[s]; if (it && it.light && (!best || it.light.dist * it.light.int > best.dist * best.int)) best = it.light; }
  return best;
}
// How much a light matters right now: little at noon, fully at night and indoors.
function lt_dark() {
  if (!ZONE || !ZONE.def) return 0;
  if (ZONE.def.kind === 'interior') return 0.85;
  return Math.max(DN.night, DN.twi * 0.6);
}
function lt_build(e, L) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(lt_sphere, lt_coreMat.clone()), halo = new THREE.Sprite(lt_haloMat.clone());
  const v = { g, core, halo, wings: null, style: L.style, color: L.color, pos: new V3().copy(e.pos), t: Math.random() * 10 };
  core.material.color.setHex(L.color); halo.material.color.setHex(L.color);
  if (L.style === 'halo') { core.geometry = lt_ring; core.scale.setScalar(1); halo.scale.setScalar(0.9); }
  else if (L.style === 'pack') { core.geometry = lt_pack; core.material.color.multiplyScalar(0.7); halo.scale.setScalar(0.75); }
  else if (L.style === 'aura') { core.visible = false; halo.scale.setScalar(2.6); }
  else { core.scale.setScalar(0.06); halo.scale.setScalar(0.8); }
  g.add(core, halo);
  if (L.style === 'seraph') {
    const wm = lt_wingMat.clone(); wm.color.setHex(L.color);
    v.wings = [new THREE.Mesh(lt_wing, wm), new THREE.Mesh(lt_wing, wm)];
    v.wings[1].scale.x = -1;
    g.add(...v.wings);
  }
  g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; o.userData.ent = e; });
  scene.add(g);
  return v;
}
function lt_drop(e) {
  const v = LT_VIS.get(e);
  if (!v) return;
  scene.remove(v.g);
  v.g.traverse((o) => { if (o.material && o.material !== lt_coreMat && o.material !== lt_haloMat && o.material !== lt_wingMat) o.material.dispose(); });
  LT_VIS.delete(e);
}
// Where the light sits relative to its wearer; orbs drift behind the shoulder and bob.
function lt_anchor(e, v, out) {
  const h = (e.rig && e.rig.height) || 1.8, s = Math.sin(e.yaw), c = Math.cos(e.yaw);
  switch (v.style) {
    case 'halo': return out.set(e.pos.x, e.pos.y + h + 0.22, e.pos.z);
    case 'pack': return out.set(e.pos.x - s * 0.2, e.pos.y + h * 0.72, e.pos.z - c * 0.2);
    case 'aura': return out.set(e.pos.x, e.pos.y + h * 0.55, e.pos.z);
  }
  // shoulder: right of and slightly behind the wearer
  return out.set(e.pos.x - c * 0.55 - s * 0.3, e.pos.y + h * 1.02 + Math.sin(v.t * 2.1) * 0.08, e.pos.z + s * 0.55 - c * 0.3);
}
// Sims carry lanterns too: about half of them, decided by name so it is stable between visits.
function lt_simKit(e) {
  if (e.ltChecked || !e.char) return;
  e.ltChecked = true;
  if (lightOf(e) || hash2(strSeed(e.name), 41) > 0.55 || typeof makeItem !== 'function') return;
  const lv = e.char.level, id = lv >= 35 && hash2(strSeed(e.name), 7) < 0.35 ? 'util_seraph' : lv >= 20 ? 'util_lantern_hover' : hash2(strSeed(e.name), 9) < 0.3 ? 'back_glowpack' : 'util_lantern_spark';
  const it = makeItem(id, Math.max(1, Math.round(lv * 1.6)));
  if (!it) return;
  const slot = it.slots.find((s) => !e.char.equip[s]);
  if (slot) e.char.equip[slot] = it;
}
const _lt = new V3();
function updateLights(dt) {
  const dark = lt_dark();
  const sims = [];
  for (const [e, v] of LT_VIS) if (e.removed || !lightOf(e) || lightOf(e).color !== v.color || lightOf(e).style !== v.style) lt_drop(e);
  for (const e of ENTS) {
    if (e.kind === 'sim') lt_simKit(e);
    if (e.kind !== 'player' && e.kind !== 'sim') continue;
    const L = lightOf(e);
    if (!L || e.dead) { if (LT_VIS.has(e)) LT_VIS.get(e).g.visible = false; continue; }
    // other people's lanterns only show once it gets dark; your own is always there
    const show = e === PLAYER || dark > 0.15;
    let v = LT_VIS.get(e);
    if (!show) { if (v) v.g.visible = false; continue; }
    if (!v) { v = lt_build(e, L); LT_VIS.set(e, v); lt_anchor(e, v, v.pos); }
    v.t += dt;
    lt_anchor(e, v, _lt);
    if (v.style === 'orb' || v.style === 'seraph') v.pos.lerp(_lt, 1 - Math.exp(-dt * 6)); else v.pos.copy(_lt);
    v.g.position.copy(v.pos);
    v.g.visible = !(e === PLAYER && e.rig && !e.rig.root.visible) && !e.stealthHidden;
    if (v.style === 'halo') v.g.rotation.y += dt * 0.6;
    else if (v.style === 'pack') v.g.rotation.y = e.yaw;
    if (v.wings) { const f = Math.sin(v.t * 14) * 0.6; v.wings[0].rotation.y = f; v.wings[1].rotation.y = -f; v.g.rotation.y = e.yaw; }
    v.halo.material.opacity = (v.style === 'aura' ? 0.12 + 0.25 * dark : 0.35 + 0.45 * dark);
    if (e !== PLAYER && dark > 0.3) sims.push(e);
  }
  // the player's own light
  const PL = PLAYER && !PLAYER.dead ? lightOf(PLAYER) : null, pv = PLAYER && LT_VIS.get(PLAYER);
  if (PL && pv) {
    LT_PLAYER.color.setHex(PL.color);
    LT_PLAYER.distance = PL.dist;
    LT_PLAYER.intensity = PL.int * (0.1 + 0.9 * dark);
    LT_PLAYER.position.copy(pv.pos);
    if (pv.style === 'pack' || pv.style === 'aura') LT_PLAYER.position.y += 0.6;
  } else LT_PLAYER.intensity = 0;
  // the two nearest lit sims get real light; the rest are just glowing motes in the distance
  if (sims.length > 2 && PLAYER) sims.sort((a, b) => a.pos.distanceToSquared(PLAYER.pos) - b.pos.distanceToSquared(PLAYER.pos));
  for (let i = 0; i < LT_SIMS.length; i++) {
    const e = sims[i], l = LT_SIMS[i];
    if (!e || (PLAYER && e.pos.distanceTo(PLAYER.pos) > 70)) { l.intensity = 0; continue; }
    const L = lightOf(e), v = LT_VIS.get(e);
    l.color.setHex(L.color); l.distance = L.dist; l.intensity = L.int * 0.8 * dark; l.position.copy(v.pos);
  }
}
function lightsOff() {
  for (const [e] of LT_VIS) lt_drop(e);
  LT_PLAYER.intensity = 0;
  for (const l of LT_SIMS) l.intensity = 0;
}
// Leaving play or changing zone: forget visuals of anyone left behind (they are re-made on demand).
EV.on('zone', () => { for (const [e] of LT_VIS) if (e.removed) lt_drop(e); });
