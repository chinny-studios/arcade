// Farhold — frames of reference, environment (sun, sky, fog, lights) and weather

// A frame is where a body lives: a planet (radial gravity, spins), a station (flat gravity) or null (open space).
// Positions inside a frame are local to frame.group.
function frameGroup(f) { return f ? f.group : null; }
function toWorld(f, local, out = new V3()) { out.copy(local); if (f) out.applyMatrix4(f.group.matrixWorld); return out; }
const _inv = new THREE.Matrix4();
function toLocal(f, world, out = new V3()) { out.copy(world); if (f) { _inv.copy(f.group.matrixWorld).invert(); out.applyMatrix4(_inv); } return out; }
function dirToWorld(f, local, out = new V3()) { out.copy(local); if (f) out.applyQuaternion(f.group.quaternion); return out; }
function dirToLocal(f, world, out = new V3()) { out.copy(world); if (f) { _q2.copy(f.group.quaternion).invert(); out.applyQuaternion(_q2); } return out; }
function quatToWorld(f, q, out = new Q4()) { return f ? out.copy(f.group.quaternion).multiply(q) : out.copy(q); }
function quatToLocal(f, q, out = new Q4()) { if (!f) return out.copy(q); _q2.copy(f.group.quaternion).invert(); return out.copy(_q2).multiply(q); }
// local "up" for a position in a frame
function frameUp(f, local, out = new V3()) { if (f && f.kind === 'planet') return out.copy(local).normalize(); return out.set(0, 1, 0); }
// planets carry their own frame descriptor
function planetFrame(pl) { if (!pl.frame) pl.frame = { kind: 'planet', pl, group: pl.group }; return pl.frame; }

// ---------- environment ----------
const ENV = { pl: null, alt: 1e9, day: 1, sunElev: 1, inAtmo: 0, temp: 20, sunDir: new V3(), up: new V3(0, 1, 0), camLocal: new V3(), night: 0, localHour: 12 };
const _fogC = new THREE.Color(), _c1 = new THREE.Color(), _c2 = new THREE.Color();
function updateEnvironment(dt, focusWorld) {
  const cam = R.camera;
  const cw = cam.position;
  ENV.sunDir.copy(cw).multiplyScalar(-1).normalize();
  // which planet's atmosphere are we in?
  let pl = null, best = Infinity;
  for (const p of PLANETS.list) { const d = cw.distanceTo(p.pos); if (d < p.R * 3 && d - p.R < best) { best = d - p.R; pl = p; } }
  ENV.pl = pl;
  const sun = R.sun;
  sun.position.copy(focusWorld).addScaledVector(ENV.sunDir, 200);
  sun.target.position.copy(focusWorld);
  sun.target.updateMatrixWorld();
  let fogD = 0, starFade = 1, sunI = 1.5, hemiI = 0.2, ambI = 0.3;
  if (pl) {
    const rel = _v1.copy(cw).sub(pl.pos);
    const r = rel.length();
    ENV.up.copy(rel).divideScalar(r);
    ENV.alt = r - pl.R;
    ENV.sunElev = ENV.up.dot(ENV.sunDir);
    const day = smooth(-0.18, 0.22, ENV.sunElev);
    ENV.day = day; ENV.night = 1 - day;
    const atmoK = pl.atmo ? 1 - smooth(pl.atmoR - pl.R - 200, pl.atmoR - pl.R + 600, ENV.alt) : 0;
    ENV.inAtmo = atmoK;
    const W = WEATHER.get(pl);
    const storm = W ? W.k : 0;
    // light
    sunI = lerp(1.5, lerp(0.0, 1.45, day), atmoK) * (1 - storm * 0.45);
    hemiI = atmoK * lerp(0.3, 0.65, day) + (1 - atmoK) * 0.2;
    ambI = lerp(0.3, lerp(0.22, 0.1, day), atmoK);
    _c1.setHex(pl.pal.zenith).multiplyScalar(lerp(0.25, 1, day));
    _c2.setHex(pl.pal.low).multiplyScalar(lerp(0.15, 0.5, day));
    if (day < 0.5) _c1.lerp(new THREE.Color(0x30406a), (0.5 - day) * 1.2);
    R.hemi.color.copy(_c1); R.hemi.groundColor.copy(_c2);
    // fog toward the horizon colour
    _fogC.setHex(pl.pal.horizon);
    const set = smooth(0.45, 0, Math.abs(ENV.sunElev));
    _fogC.lerp(_c1.setHex(pl.pal.sunset), set * 0.45);
    _fogC.multiplyScalar(lerp(0.06, 1, day));
    if (storm > 0) _fogC.lerp(_c1.setHex(W.col), storm * 0.75);
    fogD = pl.atmo ? (0.0016 + storm * 0.009) * (1 - smooth(300, 1600, ENV.alt)) : 0;
    starFade = 1 - atmoK * day * 0.97 - atmoK * storm * 0.5;
    // temperature: day/night swing and storms
    const swing = pl.type === 'frozen' ? 25 : pl.type === 'dead' ? 70 : 14;
    ENV.temp = pl.temp + (day - 0.5) * swing + (W && W.k > 0.5 ? (pl.storm.temp - pl.temp) * (W.k - 0.5) * 2 : 0);
    // the atmosphere shell
    if (pl.atmoMesh) {
      const u = pl.atmoMesh.material.uniforms;
      toLocal(planetFrame(pl), cw, u.uCam.value);
      dirToLocal(planetFrame(pl), ENV.sunDir, u.uSun.value);
      u.uStorm.value = storm; u.uStormCol.value.setHex(W ? W.col : 0x806040);
    }
    if (pl.cloudMesh) {
      const u = pl.cloudMesh.material.uniforms;
      dirToLocal(planetFrame(pl), ENV.sunDir, u.uSun.value);
      u.uT.value += dt; u.uCov.value = 0.45 + storm * 0.5; u.uCamR.value = cw.distanceTo(pl.pos);
    }
    R.hemi.position.copy(ENV.up);
    // local hour for the HUD clock
    ENV.localHour = (12 + Math.atan2(ENV.up.clone().cross(ENV.sunDir).dot(dirToWorld(planetFrame(pl), _v2.set(0, 1, 0))), ENV.sunElev) / TAU * 24 + 24) % 24;
  } else {
    ENV.alt = 1e9; ENV.inAtmo = 0; ENV.day = 1; ENV.night = 0; ENV.temp = -270;
    R.hemi.color.setHex(0x8090c0); R.hemi.groundColor.setHex(0x302838); R.hemi.position.set(0, 1, 0);
  }
  // other planets' atmosphere shells need their camera/sun too
  for (const p of PLANETS.list) {
    if (p === pl || !p.atmoMesh) continue;
    const u = p.atmoMesh.material.uniforms;
    toLocal(planetFrame(p), cw, u.uCam.value);
    dirToLocal(planetFrame(p), ENV.sunDir, u.uSun.value);
    if (p.cloudMesh) { dirToLocal(planetFrame(p), ENV.sunDir, p.cloudMesh.material.uniforms.uSun.value); p.cloudMesh.material.uniforms.uCamR.value = cw.distanceTo(p.pos); }
  }
  // inside the station hangar: bright, even interior light
  const inStation = (PLAYER.inShip ? SHIP.frame : PLAYER.frame) && (PLAYER.inShip ? SHIP.frame : PLAYER.frame).kind === 'station';
  if (inStation) { ambI = 0.55; hemiI = 0.45; R.hemi.color.setHex(0xe0e8ff); R.hemi.groundColor.setHex(0x404858); R.hemi.position.copy(dirToWorld(STATION.frame, new V3(0, 1, 0))); }
  sun.intensity = sunI;
  R.hemi.intensity = hemiI;
  R.amb.intensity = ambI;
  R.scene.fog.color.copy(_fogC);
  R.scene.fog.density = fogD;
  R.stars.material.uniforms.uFade.value = clamp(starFade, 0, 1);
  R.stars.material.uniforms.uPx.value = R.renderer.getPixelRatio();
  R.nebula.material.uniforms.uFade.value = clamp(starFade, 0, 1);
  R.sunMesh.material.uniforms.uDim.value = 1 - ENV.inAtmo * (WEATHER.get(pl) ? WEATHER.get(pl).k * 0.8 : 0);
  // background colour behind everything (sky shell blends onto this)
  R.renderer.setClearColor(0x000000, 1);
}

// ---------- weather ----------
// Each planet with a storm type alternates calm and storm phases.
const WEATHER = (() => {
  const st = new Map();
  const COL = { 'Superheated Rain': 0xa07060, Blizzard: 0xd0dce8, Firestorm: 0xc06038, 'Acid Rain': 0x8a9a50, 'Radiation Storm': 0x7a9a68, 'Dust Storm': 0xa88a68, 'Static Storm': 0x9a78b0 };
  function get(pl) {
    if (!pl || !pl.storm) return null;
    let w = st.get(pl.id);
    if (!w) { w = { t: 240 + Math.random() * 300, on: false, k: 0, col: COL[pl.storm.name] || 0x806040, name: pl.storm.name }; st.set(pl.id, w); }
    return w;
  }
  function update(dt, pl) {
    const w = get(pl);
    if (!w) return null;
    w.t -= dt;
    if (w.t <= 0) {
      w.on = !w.on;
      w.t = w.on ? 70 + Math.random() * 90 : (360 + Math.random() * 420) / pl.storm.freq;
      bus.emit(w.on ? 'stormStart' : 'stormEnd', pl, w);
    }
    // warning ramps up in the last 20 s before a storm
    w.warn = !w.on && w.t < 20;
    w.k = clamp(w.k + (w.on ? dt / 8 : -dt / 10), 0, 1);
    return w;
  }
  function force(pl, on) { const w = get(pl); if (w) { w.on = on; w.t = on ? 90 : 400; w.k = on ? 1 : 0; } }
  function reset() { st.clear(); }
  return { get, update, force, reset };
})();
