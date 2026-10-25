// Act of God — the powers. Each has a side (wrath or grace), a radius range for the brush, a way to use it (tap, hold
// or drag a line) and a cast. Lasting powers add an effect to G.effects whose update(dt) returns false when it is over.

const POWERS = [];
const PW = {};
function power(o) { o.rMax = o.rMax || 200; POWERS.push(o); PW[o.id] = o; return o; }
// the brush radius for the current size slider (0..1); world-scaled powers grow with the city
function brushR(p, size = G.size) {
  const max = p.world ? Math.min(p.rMax, W.M * p.world) : p.rMax;
  return lerp(p.rMin, Math.max(p.rMin + 1, max), Math.pow(size, 1.35));
}
function addEffect(e) { e.t = 0; G.effects.push(e); return e; }
function effectsOf(type) { return G.effects.filter((e) => e.type === type); }

// ---------- storms: cloud decks, rain and the storm cover over the camera ----------
function cloudDeck(e, dt, x, z, R, y, dark, rate) {
  const n = rate * dt * clamp(R / 200, 0.5, 6);
  for (let i = 0; i < n; i++) {
    const a = rr(0, TAU), d = Math.sqrt(Math.random()) * R;
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    const s = rr(60, 140) * clamp(R / 400, 0.6, 2.2);
    FX.smoke.emit(px, y + rr(-30, 30), pz, G.wind.x * 0.5, rr(-0.5, 0.5), G.wind.z * 0.5, rr(5, 9), s, s * 1.4, dark, dark * 1.02, dark * 1.08, 0.85, 0, 0, 0.3);
  }
}
function stormCover() {
  let s = 0, rain = 0, snow = 0;
  const cx = CAM.tx, cz = CAM.tz;
  for (const e of G.effects) {
    if (!e.storm) continue;
    const k = (1 - smooth(e.R * 0.8, e.R * 2.2, dist(cx, cz, e.x, e.z))) * e.k;
    s = Math.max(s, k * e.storm);
    if (e.rain) rain = Math.max(rain, (1 - smooth(e.R * 0.6, e.R, dist(cx, cz, e.x, e.z))) * e.rain * e.k);
    if (e.snow) snow = Math.max(snow, (1 - smooth(e.R * 0.6, e.R, dist(cx, cz, e.x, e.z))) * e.k);
  }
  return [s, rain, snow];
}
G.rainAt = (x, z) => { let r = 0; for (const e of G.effects) if (e.rain && dist2(x, z, e.x, e.z) < e.R * e.R) r = Math.max(r, e.rain * e.k); return r; };
G.coldAt = (x, z) => { for (const e of G.effects) if (e.snow && dist2(x, z, e.x, e.z) < e.R * e.R) return true; return false; };
G.goldAt = (x, z) => { for (const e of G.effects) if (e.type === 'gold' && dist2(x, z, e.x, e.z) < e.R * e.R) return true; return false; };
const life01 = (e, inT, outT) => smooth(0, inT, e.t) * (1 - smooth(e.life - outT, e.life, e.t));

// ======================= WRATH =======================
power({ id: 'lightning', side: 'wrath', group: 'Weather', name: 'Lightning', icon: '⚡', key: '1', mode: 'hold', every: 0.22, rMin: 15, rMax: 260,
  desc: 'Bolts from a clear sky. They seek the tallest thing nearby and set it alight. Hold to keep striking.',
  cast(x, z, r) {
    const a = rr(0, TAU), d = Math.sqrt(Math.random()) * r;
    let px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    let tgt = null;
    forBuildings(px, pz, Math.max(15, r * 0.35), (b) => { if (b.state === 0 && (!tgt || b.h > tgt.h)) tgt = b; });
    let ty;
    if (tgt && tgt.h > 6) { px = tgt.x + rr(-0.2, 0.2) * tgt.w; pz = tgt.z + rr(-0.2, 0.2) * tgt.d; ty = tgt.y + tgt.h; }
    else { tgt = null; ty = Math.max(heightAt(px, pz), waterSurface(px, pz)); }
    bolt(px + rr(-60, 60), ty + 700, pz + rr(-60, 60), px, ty, pz, 2.2 + r * 0.004);
    const inc = stormInc('lightning', x, z);
    if (shielded(px, pz)) { ring(px, pz, 5, 40, 0.6, 0x9ab8ff); AUDIO.thunder(px, pz, 0.8); return; }
    if (tgt) {
      hurt(tgt, tgt.kind === 'tower' ? 0.02 : 0.12, 'fire', inc);
      if (Math.random() < (tgt.kind === 'tower' ? 0.35 : 0.85)) ignite(tgt, 0.35, inc);
      if (Math.random() < 0.15) blackout(px, pz, rr(40, 120), rr(20, 60), true);
    } else {
      forTrees(px, pz, 14, (t) => igniteTree(t));
      igniteCell(px, pz, inc);
      if (urbanI(px, pz) > 0.2 && Math.random() < 0.4) kill(rr(1, 3), px, pz, inc);
    }
    for (let i = 0; i < 12; i++) spark(px, ty + 1, pz, 16, [0.8, 0.85, 1]);
    addThreat(px, pz, 30, 6);
    AUDIO.thunder(px, pz, 1);
  },
});
// lightning, hail and other repeated strikes share one incident per area for 25 s
function stormInc(type, x, z) {
  let inc = G.incidents.find((i) => i.type === type && G.t - i.lastHit < 25 && dist2(i.x, i.z, x, z) < 600 * 600);
  if (!inc) inc = newIncident(type, x, z);
  inc.lastHit = G.t; inc.mag = (inc.mag || 0) + 1;
  return inc;
}

power({ id: 'tornado', side: 'wrath', group: 'Weather', name: 'Tornado', icon: '🌪️', key: '2', mode: 'tap', rMin: 12, rMax: 110,
  desc: 'A funnel drops from the clouds and tears across the ground. Hold the button down to steer it.',
  cast(x, z, r) {
    const ef = clamp(Math.round(1 + (r - 12) / 98 * 4), 1, 5);
    const inc = newIncident('tornado', x, z, { mag: ef });
    const a = G.wind.a + rr(-0.6, 0.6);
    const funnel = makeFunnel(r);
    const e = addEffect({ type: 'tornado', x, z, r, ef, inc, life: rr(35, 55), hd: a, sp: rr(9, 15), funnel, alive: true, vx: 0, vz: 0, spin: 18 + ef * 8, top: 500, R: r * 6, storm: 0.75, rain: 0.6, k: 0, owner: G.holdId,
      update(dt) {
        this.k = life01(this, 3, 6);
        // steer toward the cursor while the cast is held, else wander
        if (G.holding && G.holdId === this.owner && G.cursor.ok) { const d = Math.atan2(G.cursor.z - this.z, G.cursor.x - this.x); this.hd += clamp(angWrap(d - this.hd), -1.5 * dt, 1.5 * dt); }
        else this.hd += (vnoise(G.t * 0.2, this.r, 9) - 0.5) * dt * 0.8;
        let nx = this.x + Math.cos(this.hd) * this.sp * dt, nz = this.z + Math.sin(this.hd) * this.sp * dt;
        const sh = shielded(nx, nz);
        if (sh) { this.hd = Math.atan2(nz - sh.z, nx - sh.x) + rr(-0.5, 0.5); nx = this.x; nz = this.z; }
        if (!inWorld(nx, nz, 40)) { this.hd += Math.PI * 0.6; nx = this.x; nz = this.z; }
        this.vx = (nx - this.x) / dt; this.vz = (nz - this.z) / dt; this.x = nx; this.z = nz;
        const gy = Math.max(heightAt(this.x, this.z), waterSurface(this.x, this.z));
        const k = this.k, RR = this.r * (0.6 + 0.4 * k);
        this.funnel.position.set(this.x, gy - 2, this.z);
        this.funnel.scale.set(RR * 2.2, this.top + 60, RR * 2.2);
        this.funnel.material.uniforms.uA.value = k;
        // damage: buildings, trees, streets
        const str = this.ef * k;
        forBuildings(this.x, this.z, RR * 1.7, (b, d) => {
          if (b.state !== 0) return;
          const f = 1 - smooth(RR * 0.4, RR * 1.7, d);
          const res = { house: 1, shop: 0.7, church: 0.5, ind: 0.6, apt: 0.3, station: 0.5, tower: 0.06, hospital: 0.25, hall: 0.25, stadium: 0.15, bridge: 0.1 }[b.kind] || 0.4;
          if (hurt(b, dt * f * str * res * 0.3, 'tornado', this.inc) && b.kind !== 'tower') { throwDebris(b.x, b.y + 3, b.z, 6, 12, b.parts.map((p) => p.col), 2.2, this); }
          if (Math.random() < dt * f * 2 && FX_NEAR(b.x, b.z)) throwDebris(b.x, b.y + b.h * 0.4, b.z, 1, 8, b.parts[0].col, 1.5, this);
        });
        forTrees(this.x, this.z, RR * 1.3, (t) => { if (t.state === 0 || t.state === 1) { if (Math.random() < dt * str * 0.8) { t.state = 3; tUpdate(t); throwDebris(t.x, t.y + 2, t.z, 1, 10, 0x3a5a2a, 2, this); } } });
        sweepStreets(this.x, this.z, RR * 1.1, 'fling', this);
        if (Math.random() < dt * 0.4 * str) kill(rr(0, 2) * str, this.x, this.z, this.inc);
        // dust skirt and debris cloud
        if (FX_NEAR(this.x, this.z)) {
          for (let i = 0; i < 3; i++) { const a = rr(0, TAU), rd = RR * rr(0.6, 1.6); FX.smoke.emit(this.x + Math.cos(a) * rd, gy + rr(0, 10), this.z + Math.sin(a) * rd, -Math.sin(a) * this.spin * 0.8, rr(4, 12), Math.cos(a) * this.spin * 0.8, rr(2, 4), RR * 0.5, RR * 1.4, 0.38, 0.34, 0.3, 0.6 * k, 0.5, -1); }
          if (waterDepth(this.x, this.z) > 0.5) for (let i = 0; i < 3; i++) steam(this.x + rr(-RR, RR), gy, this.z + rr(-RR, RR));
        }
        cloudDeck(this, dt, this.x, this.z, RR * 5, this.top, 0.22, 8);
        this.th.x = this.x; this.th.z = this.z; this.th.t = 2;
        AUDIO.wind(1.2 * k * proximity(this.x, this.z, 1500), 'tornado');
        if (this.t > this.life) { this.alive = false; R.scene.remove(this.funnel); this.funnel.material.dispose(); return false; }
        return true;
      } });
    e.th = addThreat(x, z, r * 2.5, 999);
    AUDIO.sting('wrath');
  },
});
const FUNNEL_GEO = (() => { const pts = []; for (let i = 0; i <= 24; i++) { const y = i / 24; pts.push(new THREE.Vector2(0.1 + 0.25 * y + 0.65 * Math.pow(y, 3.2), y)); } return new THREE.LatheGeometry(pts, 36); })();
function makeFunnel(r) {
  const m = new THREE.Mesh(FUNNEL_GEO, new THREE.ShaderMaterial({
    uniforms: Object.assign({ uA: { value: 0 } }, U),
    vertexShader: `varying vec2 vUv; varying vec3 vW; uniform float uTime;
      void main(){ vUv = uv; vec3 p = position; float w = sin(uv.y * 6.0 + uTime * 1.3) * 0.08 * (1.0 - uv.y); p.x += w; p.z += cos(uv.y * 5.0 + uTime) * 0.06 * (1.0 - uv.y);
        vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: GLSL_COMMON + `uniform float uA; varying vec2 vUv; varying vec3 vW;
      void main(){
        float a1 = sin(vUv.x * 6.2831 * 5.0 + vUv.y * 30.0 - uTime * 9.0) * 0.5 + 0.5;
        float a2 = sin(vUv.x * 6.2831 * 9.0 - vUv.y * 22.0 - uTime * 13.0) * 0.5 + 0.5;
        float band = mix(a1, a2, 0.5);
        float streak = sin(vUv.x * 6.2831 * 23.0 + vUv.y * 70.0 - uTime * 17.0) * 0.5 + 0.5;
        float a = (0.55 + 0.4 * band * streak) * smoothstep(0.0, 0.03, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y)) * uA;
        float dirt = 1.0 - smoothstep(0.0, 0.25, vUv.y);
        vec3 c = mix(vec3(0.2, 0.19, 0.18), vec3(0.5, 0.49, 0.48), band * streak);
        c = mix(c, vec3(0.32, 0.26, 0.2), dirt * 0.7);
        c *= (mix(uGnd, uSky, 0.6) + uSunCol * 0.45);
        gl_FragColor = vec4(fogit(c, vW), a * 0.9);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  m.frustumCulled = false; m.renderOrder = 4;
  R.scene.add(m);
  return m;
}
function proximity(x, z, range) { return 1 - smooth(range * 0.2, range, dist(x, z, CAM.tx, CAM.tz) + CAM.dist * 0.3); }

power({ id: 'blizzard', side: 'wrath', group: 'Weather', name: 'Blizzard', icon: '❄️', key: '3', mode: 'tap', rMin: 120, rMax: 2000, world: 0.45,
  desc: 'Snow and hail bury the streets for a minute. Traffic crawls, power lines snap and the cold claims the vulnerable.',
  cast(x, z, r) {
    const inc = newIncident('blizzard', x, z);
    addEffect({ type: 'blizzard', x, z, R: r, inc, life: 70, storm: 0.85, snow: 1, k: 0, acc: 0,
      update(dt) {
        this.k = life01(this, 5, 10);
        this.x += G.wind.x * dt * 0.3; this.z += G.wind.z * dt * 0.3;
        cloudDeck(this, dt, this.x, this.z, this.R, 320, 0.55, 5);
        this.acc += dt;
        if (this.acc > 0.5) {
          const d = this.acc; this.acc = 0;
          ovPaint(this.x, this.z, this.R, 0, 0.05 * this.k, 'add', 0.35);
          forBuildings(this.x, this.z, this.R, (b) => { if (b.snow < 1) { b.snow = Math.min(1, b.snow + 0.03 * this.k); if (Math.random() < 0.06) { bUpdate(b); } } if (b.fire > 0) b.fire = Math.max(0, b.fire - 0.02); if (b.kind === 'house' && Math.random() < 0.002 * this.k) hurt(b, 0.1, 'blizzard', this.inc); });
          forTrees(this.x, this.z, this.R, (t) => { if (t.snow < 1) { t.snow = Math.min(1, t.snow + 0.03 * this.k); if (Math.random() < 0.06) tUpdate(t); } });
          const exposed = G.stats.pop * Math.min(1, (this.R * this.R) / (W.M * W.M)) * 0.000012 * this.k * d;
          kill(exposed * (G.hour < 6 || G.hour > 21 ? 2 : 1), this.x, this.z, this.inc);
          injure(exposed * 3, this.x + rr(-this.R, this.R) * 0.5, this.z + rr(-this.R, this.R) * 0.5, this.inc);
          if (Math.random() < 0.08 * this.k) blackout(this.x + rr(-1, 1) * this.R * 0.7, this.z + rr(-1, 1) * this.R * 0.7, rr(80, 220), rr(60, 140), true);
          G.snowAt = true;
        }
        // flakes and hail around the camera when it is inside the storm
        const inside = 1 - smooth(this.R * 0.7, this.R * 1.1, dist(CAM.tx, CAM.tz, this.x, this.z));
        if (inside > 0) {
          const span = clamp(CAM.dist * 0.7, 80, 500), cam = R.camera.position;
          for (let i = 0; i < 60 * inside * this.k; i++) {
            const px = CAM.tx + rr(-span, span), pz = CAM.tz + rr(-span, span), py = Math.max(cam.y, heightAt(px, pz) + 60) + rr(-40, 80);
            const hail = Math.random() < 0.15;
            FX.fine.emit(px, py, pz, G.wind.x * 1.5 + rr(-2, 2), hail ? -30 : -6, G.wind.z * 1.5 + rr(-2, 2), hail ? 4 : 14, hail ? 0.5 : 0.7, hail ? 0.5 : 0.6, 0.95, 0.97, 1, 0.9, hail ? 0 : 0.3, hail ? 9.8 : 0);
          }
        }
        AUDIO.wind(0.7 * this.k * (inside * 0.7 + 0.3 * proximity(this.x, this.z, this.R * 2)), 'blizzard');
        if (this.t > this.life) { G.snowAt = effectsOf('blizzard').length > 1; return false; }
        return true;
      } });
    AUDIO.sting('wrath');
  },
});

power({ id: 'hurricane', side: 'wrath', group: 'Weather', name: 'Hurricane', icon: '🌀', key: '4', mode: 'tap', rMin: 400, rMax: 3200, world: 0.7,
  desc: 'A spiral of wind and rain the size of the city. Roofs and trees go first, the sea rises and the lights go out.',
  cast(x, z, r) {
    const cat = clamp(Math.round(1 + (r - 400) / 2800 * 4), 1, 5);
    const inc = newIncident('hurricane', x, z, { mag: cat });
    const puffs = [];
    for (let i = 0; i < 160; i++) puffs.push({ a: rr(0, TAU), d: Math.pow(Math.random(), 0.7) * r, y: rr(380, 620), s: rr(120, 260) * clamp(r / 1200, 0.6, 1.8), e: rr(0, 1) });
    if (W.gen.coast || W.gen.island) { WATER.seaTarget = 1.5 + cat * 1.1; WATER.seaT = 60; WATER.wake(); }
    addEffect({ type: 'hurricane', x, z, R: r, cat, inc, life: 70, storm: 0.95, rain: 1, k: 0, acc: 0, puffs, rot: 0, hd: G.wind.a,
      update(dt) {
        this.k = life01(this, 6, 12);
        this.x += Math.cos(this.hd) * 6 * dt; this.z += Math.sin(this.hd) * 6 * dt;
        this.rot += dt * 0.12;
        // the spiral: puffs swirl inward toward the eye, which stays clear
        for (const p of this.puffs) {
          p.a += dt * (0.4 + 300 / (p.d + 200)) * 0.18;
          const arm = p.a + Math.log(p.d / 100 + 1) * 2.2;
          const eye = this.R * 0.07;
          if (p.d < eye) p.d = this.R * rr(0.6, 1);
          if (Math.random() < dt * 0.6 && FX_NEAR_BIG(this)) {
            const px = this.x + Math.cos(arm) * p.d, pz = this.z + Math.sin(arm) * p.d;
            FX.smoke.emit(px, p.y, pz, -Math.sin(arm) * 20, 0, Math.cos(arm) * 20, 5, p.s, p.s * 1.3, 0.62, 0.64, 0.68, 0.8 * this.k, 0, 0, 0.3);
          }
        }
        this.acc += dt;
        if (this.acc > 0.5) {
          const d = this.acc; this.acc = 0;
          const str = Math.pow(this.cat / 3, 1.6) * 3 * this.k;
          forBuildings(this.x, this.z, this.R, (b, dd) => {
            if (b.state !== 0) return;
            const wall = 1 - Math.abs(dd / this.R - 0.25) * 1.4; // strongest near the eye wall
            if (wall <= 0) return;
            const res = { house: 1, shop: 0.5, church: 0.4, ind: 0.5, apt: 0.12, station: 0.3, tower: 0.02, hospital: 0.1, hall: 0.1, stadium: 0.2, bridge: 0.15 }[b.kind] || 0.3;
            if (Math.random() < 0.15) hurt(b, d * str * res * wall * 0.06, 'wind', this.inc);
            if (b.fire > 0) b.fire = Math.max(0, b.fire - 0.05);
          });
          forTrees(this.x, this.z, this.R * 0.8, (t) => { if (t.state === 0 && Math.random() < 0.01 * str) { t.fall = 1; t.fallA = G.wind.a; t.state = 4; tUpdate(t); } });
          for (let i = 0; i < 6; i++) { const a = rr(0, TAU), rd = Math.sqrt(Math.random()) * this.R, px = this.x + Math.cos(a) * rd, pz = this.z + Math.sin(a) * rd; if (inWorld(px, pz, 20) && heightAt(px, pz) > 0) addWater(px, pz, 60, 0.12 * str * d); }
          if (Math.random() < 0.08 * this.cat * this.k) blackout(this.x + rr(-1, 1) * this.R * 0.6, this.z + rr(-1, 1) * this.R * 0.6, rr(150, 400), rr(90, 200), true);
          kill(G.stats.pop * 0.000004 * str * d * Math.min(1, this.R * this.R / (W.M * W.M)), this.x, this.z, this.inc);
          injure(G.stats.pop * 0.00001 * str * d * Math.min(1, this.R * this.R / (W.M * W.M)), this.x + rr(-1, 1) * this.R * 0.4, this.z + rr(-1, 1) * this.R * 0.4, this.inc);
        }
        this.th.x = this.x; this.th.z = this.z; this.th.t = 2;
        AUDIO.wind(1.0 * this.k * proximity(this.x, this.z, this.R * 1.5), 'hurricane');
        return this.t < this.life;
      } });
    effectsOf('hurricane').slice(-1)[0].th = addThreat(x, z, r * 0.6, 999);
    AUDIO.sting('wrath');
  },
});
const FX_NEAR_BIG = (e) => dist(e.x, e.z, CAM.tx, CAM.tz) < e.R * 1.5 + CAM.dist * 2;

power({ id: 'quake', side: 'wrath', group: 'Earth & fire', name: 'Earthquake', icon: '〰️', key: '5', mode: 'tap', rMin: 120, rMax: 2600, world: 0.6,
  desc: 'The ground heaves. Brick and old houses fall first, gas lines burst into flame, and a great quake splits the ground.',
  cast(x, z, r) {
    const M = +(5.4 + 3.8 * Math.pow((r - 120) / 2480, 0.7)).toFixed(1);
    const dur = 6 + (M - 5) * 3.5;
    const inc = newIncident('quake', x, z, { mag: M });
    // a fault scarp for the big ones
    if (M >= 7.8) {
      const a = rr(0, TAU), L = r * 1.2, dx = Math.cos(a), dz = Math.sin(a), lift = (M - 7.5) * 2.2;
      for (let s = -L; s <= L; s += W.cs) {
        const px = x + dx * s, pz = z + dz * s;
        editTerrain(px, pz, 50, (h, d, k) => { const i = k % W.V, j = (k / W.V) | 0; const side = ((i * W.cs - x) * -dz + (j * W.cs - z) * dx) > 0; return side ? h + lift * (1 - d / 50) * 0.3 : h; });
        if (Math.random() < 0.5) ovPaint(px + rr(-6, 6), pz + rr(-6, 6), W.cs * 0.8, 1, 0.5);
      }
    }
    // cracks
    for (let c = 0; c < Math.round((M - 5) * 4); c++) {
      let px = x, pz = z, a = rr(0, TAU);
      const L = r * rr(0.3, 0.9);
      for (let s = 0; s < L; s += W.cs) { a += rr(-0.4, 0.4); px += Math.cos(a) * W.cs; pz += Math.sin(a) * W.cs; ovPaint(px, pz, W.cs * 0.7, 1, 0.35); }
    }
    addEffect({ type: 'quake', x, z, R: r, M, inc, life: dur, acc: 0,
      update(dt) {
        const k = smooth(0, 1.2, this.t) * (1 - smooth(this.life * 0.55, this.life, this.t));
        G.quake = Math.max(G.quake, k);
        const camD = dist(CAM.tx, CAM.tz, this.x, this.z);
        G.shake = Math.max(G.shake, k * clamp((this.M - 4.5) / 4, 0.2, 1.2) * (1 - smooth(this.R * 0.5, this.R * 3, camD)));
        this.acc += dt;
        if (this.acc > 0.25) {
          const d = this.acc; this.acc = 0;
          forBuildings(this.x, this.z, this.R * 1.8, (b, dd) => {
            if (b.state !== 0) return;
            const pga = k * Math.pow(1 - clamp(dd / (this.R * 1.8), 0, 1), 1.4) * (this.M - 4.6) / 4;
            const vuln = { house: 0.7, shop: 1.1, church: 1.2, apt: 0.9, ind: 0.7, tower: 0.45, station: 0.7, hospital: 0.6, hall: 0.9, stadium: 0.5, bridge: 1.4 }[b.kind] || 0.8;
            const res = b.kind === 'tower' && dd > this.R * 0.6 ? 1.6 : 1; // tall towers sway in the far field
            if (hurt(b, d * pga * vuln * res * 0.22 * rr(0.4, 1.6), 'quake', this.inc)) return;
            if (pga > 0.25 && Math.random() < d * pga * 0.004 * FLAM(b)) ignite(b, 0.2, this.inc);
          });
          if (FX_NEAR(this.x, this.z)) for (let i = 0; i < 6 * k; i++) { const a = rr(0, TAU), rd = rr(0, this.R), px = CAM.tx + Math.cos(a) * rd * 0.5, pz = CAM.tz + Math.sin(a) * rd * 0.5; puffDust(px, heightAt(px, pz) + 1, pz, rr(6, 14), 4); }
          if (Math.random() < d * k * 2) { const a = rr(0, TAU), rd = rr(0, this.R); forTrees(this.x + Math.cos(a) * rd, this.z + Math.sin(a) * rd, 30, (t) => { if (t.state === 0 && Math.random() < 0.3) { t.state = 4; t.fall = 1; t.fallA = rr(0, TAU); tUpdate(t); } }); }
        }
        AUDIO.rumble(k * clamp((this.M - 5) / 3, 0.3, 1.2) * (1 - smooth(this.R, this.R * 4, camD)));
        return this.t < this.life;
      } });
    addThreat(x, z, r, dur + 20);
    // undersea quakes raise a tsunami
    if (heightAt(x, z) < -3 && M >= 7.6) setTimeout(() => PW.tsunami.cast(x, z, brushR(PW.tsunami, clamp((M - 7.6) / 1.6, 0.2, 1)), { quiet: true, inc }), 1500);
    AUDIO.sting('wrath');
  },
});

power({ id: 'sinkhole', side: 'wrath', group: 'Earth & fire', name: 'Sinkhole', icon: '🕳️', key: '6', mode: 'tap', rMin: 10, rMax: 90,
  desc: 'The ground gives way. Whatever stood here drops into the dark.',
  cast(x, z, r) {
    if (shielded(x, z)) { ring(x, z, 10, r, 0.8, 0x9ab8ff); return; }
    const inc = newIncident('sinkhole', x, z, { mag: Math.round(r * 2) });
    const depth = r * 0.9 + 8;
    const base = heightAt(x, z);
    addEffect({ type: 'sinkhole', x, z, r, inc, life: 3, done: false,
      update(dt) {
        const p = smooth(0, this.life, this.t);
        editTerrain(this.x, this.z, this.r * 1.15, (h, d, k) => { const tgt = base - depth * (1 - Math.pow(Math.min(1, d / this.r), 5)); return d < this.r ? Math.min(h, lerp(W.h0[k], tgt, p)) : h - (1 - (d - this.r) / (this.r * 0.15)) * 0.2 * dt; });
        if (!this.done && this.t > 0.4) {
          this.done = true;
          forBuildings(this.x, this.z, this.r * 1.35, (b, d) => {
            if (b.state !== 0) return;
            if (d < this.r * 0.9) collapse(b, 'sink', this.inc, { sink: depth * 0.8, fast: true });
            else hurt(b, rr(0.4, 1.1), 'sink', this.inc);
            if (b.state === 1) b.tiltA = Math.atan2(this.z - b.z, this.x - b.x) - Math.PI / 2;
          });
          forTrees(this.x, this.z, this.r, (t) => { t.state = 3; tUpdate(t); });
          sweepStreets(this.x, this.z, this.r, 'kill');
          edgesNear(this.x, this.z, this.r + 60, (e) => { if (segDist(this.x, this.z, e) < this.r) { e.open = false; e.crater = true; } });
          G.shake = Math.max(G.shake, 0.5 * proximity(this.x, this.z, 800));
          AUDIO.rumble(0.9);
        }
        if (FX_NEAR(this.x, this.z)) for (let i = 0; i < 4; i++) { const a = rr(0, TAU); puffDust(this.x + Math.cos(a) * this.r, base, this.z + Math.sin(a) * this.r, this.r * 0.4, 6, [0.42, 0.36, 0.3]); }
        if (this.t >= this.life) { if (base < 4) addWater(this.x, this.z, this.r * 0.8, depth * 0.3); return false; }
        return true;
      } });
    addThreat(x, z, r * 2, 15);
    AUDIO.crash(x, z, 1);
  },
});

power({ id: 'volcano', side: 'wrath', group: 'Earth & fire', name: 'Volcano', icon: '🌋', key: '7', mode: 'tap', rMin: 70, rMax: 600, world: 0.2,
  desc: 'A mountain rises out of the city and erupts: rivers of lava, burning bombs and a column of ash.',
  cast(x, z, r) {
    if (shielded(x, z)) { ring(x, z, 10, r, 0.8, 0x9ab8ff); return; }
    const inc = newIncident('volcano', x, z, { mag: Math.round(r * 0.6) });
    const H = r * 0.55, base = heightAt(x, z), crater = r * 0.16;
    const start = W.h.slice(); // the heights before it rose
    addEffect({ type: 'volcano', x, z, r, H, inc, life: 75, bombs: [], acc: 0, risen: 0, R: r * 3, storm: 0.6, k: 1,
      update(dt) {
        const rise = smooth(0, 7, this.t);
        if (rise > this.risen + 0.01 || (rise >= 1 && this.risen < 1)) {
          this.risen = rise;
          editTerrain(this.x, this.z, this.r, (h, d, k) => {
            const cone = Math.pow(1 - d / this.r, 1.6) * this.H;
            const cr = d < crater ? (1 - d / crater) * this.H * 0.28 : 0;
            return Math.max(start[k], base + (cone - cr) * rise + (start[k] - base) * (1 - rise));
          });
          if (this.t < 7.2) {
            G.shake = Math.max(G.shake, 0.6 * proximity(this.x, this.z, this.r * 6));
            AUDIO.rumble(0.9 * proximity(this.x, this.z, this.r * 8));
            forBuildings(this.x, this.z, this.r, (b, d) => {
              if (b.state !== 0) return;
              const lift = Math.pow(1 - clamp(d / this.r, 0, 1), 1.6) * this.H * rise;
              if (lift > 4) collapse(b, 'volcano', this.inc, { leth: 0.4 });
              else if (lift > 1) hurt(b, dt * 0.3, 'quake', this.inc);
            });
            forTrees(this.x, this.z, this.r * 0.8, (t) => { if (t.state === 0) { t.state = 3; tUpdate(t); } });
            sweepStreets(this.x, this.z, this.r * 0.8);
            if (FX_NEAR_BIG(this)) for (let i = 0; i < 4; i++) { const a = rr(0, TAU), d = rr(0, this.r); puffDust(this.x + Math.cos(a) * d, heightAt(this.x + Math.cos(a) * d, this.z + Math.sin(a) * d), this.z + Math.sin(a) * d, this.r * 0.15, 6, [0.4, 0.36, 0.32]); }
          }
        }
        const top = base + this.H * 0.75;
        const erupt = this.t > 7 && this.t < 52;
        if (erupt) {
          if (this.t - dt <= 7) { G.shake = Math.max(G.shake, 1); AUDIO.boom(this.x, this.z, 2.5); ring(this.x, this.z, crater, this.r * 4, 3, 0xff8840, 0.6, top); U.uFlash.value = 0.8; }
          addLava(this.x, this.z, crater * 0.8, dt * (2.2 + this.r * 0.004), 1);
          // ash column
          for (let i = 0; i < 3; i++) FX.smoke.emit(this.x + rr(-crater, crater) * 0.5, top + rr(0, 30), this.z + rr(-crater, crater) * 0.5, G.wind.x * 0.6 + rr(-6, 6), rr(40, 70), G.wind.z * 0.6 + rr(-6, 6), rr(10, 16), crater * 1.2, crater * 6, 0.16, 0.15, 0.14, 0.9, 0.12, -0.5);
          for (let i = 0; i < 3; i++) FX.add.emit(this.x + rr(-crater, crater) * 0.4, top, this.z + rr(-crater, crater) * 0.4, rr(-8, 8), rr(20, 50), rr(-8, 8), rr(0.6, 1.4), crater * 0.6, crater * 0.2, 1, rr(0.3, 0.6), 0.05, 0.9, 0.3, 9.8);
          // lava bombs
          if (Math.random() < dt * (2 + this.r / 150)) {
            const a = rr(0, TAU), sp = rr(30, 60) * Math.sqrt(this.r / 150), e = rr(0.9, 1.3);
            this.bombs.push({ x: this.x, y: top, z: this.z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp, vz: Math.sin(a) * Math.cos(e) * sp });
          }
          ovPaint(this.x + G.wind.x * 40, this.z + G.wind.z * 40, this.r * 3, 1, 0.004 * dt * 60, 'add', 0.6); // ash fall
          AUDIO.rumble(0.5 * proximity(this.x, this.z, this.r * 8));
          AUDIO.fire(0.6 * proximity(this.x, this.z, this.r * 4));
        } else if (this.t > 52 && Math.random() < dt * 4) FX.smoke.emit(this.x, top, this.z, G.wind.x * 0.5, rr(10, 20), G.wind.z * 0.5, 10, crater, crater * 4, 0.3, 0.3, 0.3, 0.6, 0.1, -0.2);
        for (const b of this.bombs) {
          b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          if (FX_NEAR_BIG(this)) { FX.add.emit(b.x, b.y, b.z, 0, 0, 0, 0.5, 6, 2, 1, 0.5, 0.1, 1); if (Math.random() < 0.4) FX.smoke.emit(b.x, b.y, b.z, 0, 1, 0, 3, 4, 10, 0.2, 0.2, 0.2, 0.5); }
          const gy = heightAt(b.x, b.z);
          if (b.y <= gy || !inWorld(b.x, b.z)) {
            b.dead = true;
            if (!inWorld(b.x, b.z)) continue;
            for (let i = 0; i < 8; i++) spark(b.x, gy + 1, b.z, 10, [1, 0.5, 0.1]);
            forBuildings(b.x, b.z, 12, (o) => { hurt(o, 0.2, 'fire', this.inc); ignite(o, 0.4, this.inc); });
            forTrees(b.x, b.z, 12, (t) => igniteTree(t));
            igniteCell(b.x, b.z, this.inc);
            ovPaint(b.x, b.z, 8, 1, 0.6);
          }
        }
        this.bombs = this.bombs.filter((b) => !b.dead);
        this.th.t = 5;
        return this.t < this.life || this.bombs.length > 0;
      } });
    effectsOf('volcano').slice(-1)[0].th = addThreat(x, z, r * 2.5, 999);
    AUDIO.sting('wrath');
  },
});

power({ id: 'wildfire', side: 'wrath', group: 'Earth & fire', name: 'Wildfire', icon: '🔥', key: '8', mode: 'hold', every: 0.08, rMin: 15, rMax: 220,
  desc: 'Paint fire across the land. Grass, forests and houses catch; the wind carries it on.',
  cast(x, z, r) {
    const inc = stormInc('wildfire', x, z);
    for (let i = 0; i < 4; i++) {
      const a = rr(0, TAU), d = Math.sqrt(Math.random()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      igniteCell(px, pz, inc);
      forTrees(px, pz, 10, (t) => igniteTree(t));
      forBuildings(px, pz, 6, (b) => ignite(b, 0.25, inc));
      if (FX_NEAR(px, pz)) flame(px, heightAt(px, pz) + 1, pz, 6);
    }
    addThreat(x, z, r * 1.5, 25);
    AUDIO.fire(0.6);
  },
});

power({ id: 'meteor', side: 'wrath', group: 'Sky & sea', name: 'Meteor', icon: '☄️', key: '9', mode: 'tap', rMin: 12, rMax: 420,
  desc: 'A stone from heaven. Small ones level a block; the largest leave a crater where a district stood.',
  cast(x, z, r) {
    const inc = { deaths: 0, injured: 0, destroyed: 0, damage: 0 };
    const az = rr(0, TAU), el = rr(0.55, 0.95), D = 3500 + r * 4;
    const sx = x + Math.cos(az) * Math.cos(el) * D, sz = z + Math.sin(az) * Math.cos(el) * D, sy = heightAt(x, z) + Math.sin(el) * D;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.scale.setScalar(Math.max(4, r * 0.12)); glow.renderOrder = 9;
    R.scene.add(glow);
    const flight = 2.6 + r / 300;
    addEffect({ type: 'meteor', x, z, r, inc, life: flight, sx, sy, sz, glow, hit: false,
      update(dt) {
        const k = Math.pow(clamp(this.t / this.life, 0, 1), 1.7);
        const ty = Math.max(heightAt(this.x, this.z), waterSurface(this.x, this.z));
        const px = lerp(this.sx, this.x, k), py = lerp(this.sy, ty, k), pz = lerp(this.sz, this.z, k);
        this.glow.position.set(px, py, pz);
        // a shield catches it
        const sh = shielded(px, pz);
        if (sh && dist(px, pz, sh.x, sh.z) < sh.r && py < heightAt(px, pz) + sh.r * 0.95) { this.explode(px, py, pz, true); return false; }
        const s = this.glow.scale.x;
        for (let i = 0; i < 4; i++) FX.add.emit(px + rr(-s, s) * 0.5, py + rr(-s, s) * 0.5, pz + rr(-s, s) * 0.5, rr(-3, 3), rr(-3, 3), rr(-3, 3), rr(0.4, 1.0), s * 2.2, s * 0.5, 1, rr(0.5, 0.8), 0.2, 0.9);
        for (let i = 0; i < 2; i++) FX.smoke.emit(px, py, pz, rr(-2, 2), rr(-2, 2), rr(-2, 2), rr(4, 8), s * 1.5, s * 6, 0.25, 0.22, 0.2, 0.6);
        AUDIO.whoosh(k);
        if (this.t >= this.life) { this.explode(this.x, ty, this.z, false); return false; }
        return true;
      },
      explode(x, y, z, onShield) {
        R.scene.remove(this.glow); this.glow.geometry.dispose(); this.glow.material.dispose();
        const r = this.r;
        U.uFlash.value = clamp(0.5 + r / 200, 0.6, 2);
        G.shake = Math.max(G.shake, clamp(0.4 + r / 150, 0.4, 2) * proximity(x, z, r * 20));
        AUDIO.boom(x, z, clamp(r / 60, 0.5, 4));
        ring(x, z, r * 0.5, r * 7, 2.2 + r / 150, 0xffc080, 0.8, y + 4);
        for (let i = 0; i < 30 + r * 0.2; i++) glowAt(x + rr(-r, r) * 0.6, y + rr(0, r * 0.6), z + rr(-r, r) * 0.6, r * rr(0.5, 1.4), [1, rr(0.5, 0.8), 0.3], rr(0.4, 1.2));
        for (let i = 0; i < 40 + r * 0.3; i++) { const a = rr(0, TAU), d = rr(0, r * 1.5); FX.smoke.emit(x + Math.cos(a) * d, y + rr(0, r * 0.4), z + Math.sin(a) * d, Math.cos(a) * rr(5, 30), rr(5, 40), Math.sin(a) * rr(5, 30), rr(10, 22), r * 0.4 + 8, r * 1.8 + 30, 0.35, 0.3, 0.26, 0.9, 0.3, -0.2); }
        if (onShield) { ring(x, z, 10, r * 2, 1, 0x9ab8ff, 0.9, y); newIncident('meteorShield', x, z, { good: true }); return; }
        this.inc = newIncident('meteor', x, z, { mag: Math.round(r * 2) });
        const inWater = heightAt(x, z) < -1;
        // crater
        if (!inWater || r > 40) editTerrain(x, z, r * 1.5, (h, d) => {
          if (d < r) return Math.min(h, h - r * 0.38 * (1 - Math.pow(d / r, 2)));
          return h + r * 0.07 * (1 - (d - r) / (r * 0.5));
        });
        ovPaint(x, z, r * 2.2, 1, 0.9);
        // blast
        forBuildings(x, z, r * 5, (b, d) => {
          if (b.state !== 0) return;
          if (d < r * 1.1) collapse(b, 'vapor', this.inc, { vapor: true });
          else if (d < r * 2.4) collapse(b, 'meteor', this.inc, { dir: Math.atan2(b.z - z, b.x - x) - Math.PI / 2 });
          else { const k = Math.pow(r * 2.4 / d, 2); hurt(b, k * rr(0.4, 1.0), 'meteor', this.inc); if (Math.random() < k) ignite(b, 0.4, this.inc); b.evac = 1; }
        });
        forTrees(x, z, r * 4.5, (t, d) => { if (d < r * 2) { t.state = 3; } else if (Math.random() < 0.6) { t.state = 4; t.fall = 1; t.fallA = Math.atan2(t.z - z, t.x - x) - Math.PI / 2; if (Math.random() < 0.4) igniteTree(t); } tUpdate(t); });
        for (let i = 0; i < r * 0.5; i++) { const a = rr(0, TAU), d = rr(r, r * 4); igniteCell(x + Math.cos(a) * d, z + Math.sin(a) * d, this.inc); }
        sweepStreets(x, z, r * 3, 'kill');
        edgesNear(x, z, r * 2 + 60, (e) => { if (segDist(x, z, e) < r * 1.4) { e.open = false; e.crater = true; } });
        kill(G.stats.pop * Math.min(1, (r * r * 9) / (W.M * W.M)) * 0.05 * urbanI(x, z), x, z, this.inc); // outdoors
        throwDebris(x, y + 4, z, clamp(Math.round(r / 3), 10, 80), 30 + r * 0.2, [0x6a5a4a, 0x8a7a6a, 0x4a4038], clamp(r * 0.05, 2, 8));
        if (inWater) { for (let i = 0; i < 80; i++) FX.smoke.emit(x + rr(-r, r), y, z + rr(-r, r), rr(-10, 10), rr(30, 90), rr(-10, 10), rr(4, 8), r * 0.3 + 6, r + 20, 0.85, 0.88, 0.92, 0.8, 0.3, 9.8); addWater(x, z, r * 2.5, r * 0.18); }
        addThreat(x, z, r * 4, 40);
      } });
    AUDIO.sting('wrath');
  },
});

power({ id: 'tsunami', side: 'wrath', group: 'Sky & sea', name: 'Tsunami', icon: '🌊', key: '0', mode: 'tap', rMin: 4, rMax: 34,
  desc: 'The sea draws back, then comes ashore as a wall of water. Needs a coast, a lake or a river. Size sets the wave height.',
  radiusLabel: (r) => Math.round(r) + ' m wave',
  ring: (r) => 300,
  cast(x, z, H, o = {}) {
    const hasSea = W.gen.coast || W.gen.island;
    const inc = o.inc || newIncident('tsunami', x, z, { mag: Math.round(H) });
    if (hasSea) {
      WATER.seaTarget = H; WATER.seaT = 9 + H * 0.5; WATER.wake();
      // the wave starts near the shore so it arrives quickly
      const V = W.V;
      for (let k = 0; k < V * V; k++) if (W.h0[k] < -4) WATER.d[k] += H * 0.65 * smooth(-4, -12, W.h0[k]);
    } else {
      // a lake or river surges where you cast
      let any = 0;
      const RAD = 400;
      for (let j = 0; j < W.V; j++) for (let i = 0; i < W.V; i++) { const k = j * W.V + i; if (W.h0[k] < -0.5 && dist2(i * W.cs, j * W.cs, x, z) < RAD * RAD) { WATER.d[k] += H * 0.8; any++; } }
      if (!any) { toast('No water close enough for a wave. Try Deluge instead.', 'bad'); G.incidents.pop(); return; }
      WATER.wake();
    }
    addEffect({ type: 'tsunami', x, z, inc, life: 40, H, update(dt) { G.floodInc = this.inc; return this.t < this.life; } });
    G.floodInc = inc;
    AUDIO.surge(1);
    if (!o.quiet) AUDIO.sting('wrath');
  },
});

power({ id: 'deluge', side: 'wrath', group: 'Sky & sea', name: 'Deluge', icon: '🌧️', key: 'Q', mode: 'hold', every: 0.05, rMin: 30, rMax: 500,
  desc: 'Forty days of rain in a few seconds. Hold to pour; the water runs downhill and pools in the streets.',
  cast(x, z, r, o = {}) {
    const dt = o.dt || 0.05;
    addWater(x, z, r, 2.6 * dt * clamp(200 / r, 0.5, 2.5));
    let e = effectsOf('deluge')[0];
    if (!e) e = addEffect({ type: 'deluge', x, z, R: r, life: 2, rain: 1, storm: 0.6, k: 1, update(dt) { cloudDeck(this, dt, this.x, this.z, this.R * 1.2, 260, 0.3, 6); if (FX_NEAR(this.x, this.z)) for (let i = 0; i < 14; i++) { const a = rr(0, TAU), d = Math.sqrt(Math.random()) * this.R, px = this.x + Math.cos(a) * d, pz = this.z + Math.sin(a) * d; FX.fine.emit(px, heightAt(px, pz) + rr(20, 240), pz, G.wind.x, rr(-60, -40), G.wind.z, rr(1, 4), 0.6, 0.6, 0.7, 0.75, 0.85, 0.35); } return this.t < this.life; } });
    e.x = x; e.z = z; e.R = r; e.life = e.t + 2;
    if (!G.floodInc || G.t - G.floodInc.t0 > 60) G.floodInc = newIncident('flood', x, z);
    AUDIO.rain(0.9);
  },
});

power({ id: 'smite', side: 'wrath', group: 'Sky & sea', name: 'Smite', icon: '☝️', key: 'W', mode: 'tap', rMin: 8, rMax: 80,
  desc: 'A pillar of fire from heaven. Whatever it touches is gone.',
  cast(x, z, r) {
    if (shielded(x, z)) { ring(x, z, 5, r * 2, 0.6, 0x9ab8ff); return; }
    const inc = newIncident('smite', x, z, { mag: 1 });
    beam(x, z, r, 1400, 0xffb050, 2.2, { a: 1.2 });
    beam(x, z, r * 0.4, 1400, 0xffffff, 2.0, { a: 1.5 });
    addEffect({ type: 'smite', x, z, r, inc, life: 2.2, hit: false,
      update(dt) {
        if (FX_NEAR(this.x, this.z)) for (let i = 0; i < 6; i++) { const a = rr(0, TAU), d = rr(0, this.r); flame(this.x + Math.cos(a) * d, heightAt(this.x, this.z) + rr(0, 30), this.z + Math.sin(a) * d, this.r * 0.3 + 4, 0.8); }
        if (!this.hit && this.t > 0.5) {
          this.hit = true;
          U.uFlash.value = 0.7;
          forBuildings(this.x, this.z, this.r, (b) => { if (b.state === 0) collapse(b, 'smite', this.inc, { vapor: true }); });
          forBuildings(this.x, this.z, this.r * 1.8, (b) => { if (b.state === 0) { hurt(b, 0.3, 'fire', this.inc); ignite(b, 0.5, this.inc); } });
          forTrees(this.x, this.z, this.r * 1.4, (t) => { t.state = 3; tUpdate(t); });
          sweepStreets(this.x, this.z, this.r * 1.2);
          editTerrain(this.x, this.z, this.r, (h, d) => h - 3 * (1 - d / this.r));
          ovPaint(this.x, this.z, this.r * 1.6, 1, 1);
          ring(this.x, this.z, this.r, this.r * 4, 1.2, 0xffa040, 0.8);
          G.shake = Math.max(G.shake, 0.4 * proximity(this.x, this.z, 1500));
          AUDIO.boom(this.x, this.z, 1);
        }
        return this.t < this.life;
      } });
    addThreat(x, z, r * 3, 20);
    AUDIO.smite();
  },
});

power({ id: 'locusts', side: 'wrath', group: 'Plagues', name: 'Locusts', icon: '🦗', key: 'E', mode: 'tap', rMin: 60, rMax: 500,
  desc: 'A black cloud of locusts strips every field, park and tree it passes. People shut themselves indoors.',
  cast(x, z, r) {
    const inc = newIncident('locusts', x, z);
    const e = addEffect({ type: 'locusts', x, z, R: r, inc, life: 70, hd: rr(0, TAU), acc: 0, k: 0,
      update(dt) {
        this.k = life01(this, 3, 8);
        // drift toward greener ground
        if (Math.random() < dt * 2) {
          let best = this.hd, bv = -1;
          for (let k = 0; k < 6; k++) { const a = this.hd + rr(-1.2, 1.2), px = this.x + Math.cos(a) * this.R * 1.5, pz = this.z + Math.sin(a) * this.R * 1.5; const v = inWorld(px, pz, 50) ? ovGet(px, pz, 3) + SIM.fuel[cellK(px, pz)] : -1; if (v > bv) { bv = v; best = a; } }
          this.hd += clamp(angWrap(best - this.hd), -0.4, 0.4);
        }
        this.x += Math.cos(this.hd) * 7 * dt; this.z += Math.sin(this.hd) * 7 * dt;
        this.acc += dt;
        if (this.acc > 0.3) {
          this.acc = 0;
          ovPaint(this.x, this.z, this.R * 0.9, 3, 0.06, 'set', 0.4);
          let eaten = 0;
          forTrees(this.x, this.z, this.R * 0.9, (t) => { if (t.leaf > 0 && t.state === 0) { t.leaf = Math.max(0, t.leaf - 0.25); tUpdate(t); eaten++; } });
          const crop = eaten * 400 + this.R * this.R * 0.02;
          G.stats.damage += crop; this.inc.damage += crop;
          forBuildings(this.x, this.z, this.R, (b) => { b.panic = Math.min(1, b.panic + 0.05); });
          if (Math.random() < 0.05) kill(rr(0, 2), this.x, this.z, this.inc);
        }
        // the swarm
        const near = FX_NEAR_BIG(this);
        if (near) for (let i = 0; i < 70 * this.k; i++) {
          const a = rr(0, TAU), d = Math.sqrt(Math.random()) * this.R, h = rr(2, 40) * (1 + d / this.R);
          const px = this.x + Math.cos(a) * d, pz = this.z + Math.sin(a) * d;
          FX.fine.emit(px, heightAt(px, pz) + h, pz, -Math.sin(a) * 9 + rr(-4, 4), rr(-2, 2), Math.cos(a) * 9 + rr(-4, 4), rr(0.6, 1.2), 0.9, 0.7, 0.12, 0.1, 0.06, 0.95);
        }
        this.th.x = this.x; this.th.z = this.z; this.th.t = 2;
        AUDIO.buzz(0.8 * this.k * proximity(this.x, this.z, this.R * 4));
        return this.t < this.life;
      } });
    e.th = addThreat(x, z, r, 999);
    AUDIO.sting('wrath');
  },
});

power({ id: 'plague', side: 'wrath', group: 'Plagues', name: 'Plague', icon: '☣️', key: 'R', mode: 'tap', rMin: 20, rMax: 400,
  desc: 'A sickness takes hold and spreads from home to home. Hospitals slow it. A bigger brush makes a deadlier strain.',
  cast(x, z, r) {
    const vir = lerp(0.7, 2.6, (r - 20) / 380);
    const inc = newIncident('plague', x, z, { mag: vir });
    let n = 0;
    forBuildings(x, z, r, (b) => { if (b.state === 0 && b.pop > 0) { infect(b, 0.12, inc, vir); n++; } });
    if (!n) { const b = buildingAt(x, z); if (b) infect(b, 0.2, inc, vir); }
    for (let i = 0; i < 60; i++) { const a = rr(0, TAU), d = rr(0, r); FX.smoke.emit(x + Math.cos(a) * d, heightAt(x, z) + rr(1, 20), z + Math.sin(a) * d, rr(-1, 1), rr(0, 2), rr(-1, 1), rr(4, 8), 10, 40, 0.45, 0.55, 0.25, 0.4, 0.2); }
    AUDIO.sting('wrath');
  },
});

power({ id: 'blackout', side: 'wrath', group: 'Plagues', name: 'Blackout', icon: '🔌', key: 'T', mode: 'tap', rMin: 80, rMax: 3000, world: 0.75,
  desc: 'The grid fails. Best seen at night: the lights go out, traffic lights die, hospitals run on generators.',
  cast(x, z, r) {
    const inc = newIncident('blackout', x, z, { mag: r });
    blackout(x, z, r, rr(120, 200), false, inc);
    if (G.hour % 24 > 6.5 && G.hour % 24 < 18.5) toast('A blackout is easiest to see at night. Try the clock button.', '');
    AUDIO.powerDown();
  },
});
function blackout(x, z, r, dur, quiet, inc) {
  let n = 0;
  forBuildings(x, z, r, (b) => { if (b.power > 0 && !shielded(b.x, b.z)) { b.power = 0; bUpdate(b); n++; } });
  ovPaint(x, z, r, 2, 0, 'set', 0.15);
  SIM.dark.push({ x, z, r, t: dur, inc });
  if (!quiet) { G.stats.dark = Math.round(n); }
  // a few car crashes in the dark
  if (U.uNight.value > 0.5) for (let i = 0; i < Math.min(8, r / 100); i++) { const a = rr(0, TAU), d = rr(0, r); forBuildings(x + Math.cos(a) * d, z + Math.sin(a) * d, 10, () => {}); if (Math.random() < 0.3) { kill(rr(0, 2), x + Math.cos(a) * d, z + Math.sin(a) * d, inc); injure(rr(1, 3), x + Math.cos(a) * d, z + Math.sin(a) * d, inc); } }
  return n;
}

// ======================= GRACE =======================
power({ id: 'heal', side: 'grace', group: 'Healing & rescue', name: 'Heal', icon: '✚', key: '1', mode: 'hold', every: 0.3, rMin: 25, rMax: 600,
  desc: 'The sick and the injured rise from their beds. Cures the plague and calms the frightened.',
  cast(x, z, r) {
    let cured = 0;
    forBuildings(x, z, r, (b) => {
      if (b.inf > 0) { cured += b.pop * popScale() * b.inf; b.inf = 0; b.rec = 1; bUpdate(b); }
      b.panic = Math.max(0, b.panic - 0.3); b.evac = Math.max(0, b.evac - 0.1);
    });
    const healed = healArea(x, z, r);
    const n = Math.round(cured + healed);
    G.stats.saved += n;
    if (n > 0) { const inc = goodInc('heal', x, z); inc.healed += n; }
    for (const t of G.threats) if (dist2(t.x, t.z, x, z) < r * r) t.calm = true;
    sparkleArea(x, z, r, [1, 0.95, 0.75], 30);
    ring(x, z, r * 0.3, r, 1, 0xfff0c0, 0.4);
    G.joy = Math.min(30, (G.joy || 0) + (n > 0 ? 2 : 0.3));
    AUDIO.chime(0.5);
  },
});
// good deeds in one area share an incident for a while so the news reports totals
function goodInc(type, x, z) {
  let inc = G.incidents.find((i) => i.type === type && G.t - i.lastHit < 30 && dist2(i.x, i.z, x, z) < 800 * 800);
  if (!inc) inc = newIncident(type, x, z, { good: true });
  inc.lastHit = G.t;
  return inc;
}
function sparkleArea(x, z, r, col, n) {
  for (let i = 0; i < n; i++) {
    const a = rr(0, TAU), d = Math.sqrt(Math.random()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    FX.add.emit(px, Math.max(heightAt(px, pz), waterSurface(px, pz)) + rr(0, 10), pz, rr(-0.5, 0.5), rr(3, 9), rr(-0.5, 0.5), rr(1.5, 3), rr(2, 4) * (1 + r / 300), 0.2, col[0], col[1], col[2], 0.9, 0.2, -0.5);
  }
}

power({ id: 'quench', side: 'grace', group: 'Healing & rescue', name: 'Quench', icon: '💦', key: '2', mode: 'hold', every: 0.12, rMin: 20, rMax: 400,
  desc: 'Every flame under your hand goes out, and lava cools to stone.',
  cast(x, z, r) {
    const n = douse(x, z, r, 1) + coolLava(x, z, r, 1);
    if (n) { goodInc('quench', x, z).saved += n; for (let i = 0; i < Math.min(30, n * 2); i++) { const a = rr(0, TAU), d = rr(0, r); steam(x + Math.cos(a) * d, heightAt(x + Math.cos(a) * d, z + Math.sin(a) * d) + 3, z + Math.sin(a) * d); } }
    sparkleArea(x, z, r, [0.6, 0.85, 1], 10);
    AUDIO.hiss(n ? 0.6 : 0.15);
  },
});

power({ id: 'restore', side: 'grace', group: 'Healing & rescue', name: 'Restore', icon: '🏛️', key: '3', mode: 'hold', every: 0.15, rMin: 25, rMax: 500,
  desc: 'Ruins rise back into buildings, craters fill, the land heals and the lights come back on. The dead stay dead.',
  cast(x, z, r) {
    let n = 0, cap = 12;
    forBuildings(x, z, r, (b) => { if (cap > 0 && (b.state !== 0 || b.hp < 0.99 || b.burnt || b.dmg > 0.02)) { if (rebuild(b)) { n++; cap--; } } if (b.power < 1) { b.power = 1; bUpdate(b); } if (b.snow > 0) { b.snow = 0; bUpdate(b); } });
    // the land returns to how it was
    editTerrain(x, z, r, (h, d, k) => { const w = 1 - smooth(r * 0.6, r, d); const t = W.h0[k]; return Math.abs(h - t) < 0.05 ? t : lerp(h, t, 0.25 * w); });
    const cs = W.cs, V = W.V;
    for (let j = Math.max(1, Math.floor((z - r) / cs)); j <= Math.min(V - 2, Math.ceil((z + r) / cs)); j++) for (let i = Math.max(1, Math.floor((x - r) / cs)); i <= Math.min(V - 2, Math.ceil((x + r) / cs)); i++) {
      const k = j * V + i; if (dist2(i * cs, j * cs, x, z) > r * r) continue;
      WATER.L[k] = 0; WATER.T[k] = 0; if (W.h0[k] > 0.3) WATER.d[k] *= 0.6;
      if (SIM.fuel[k] === 0) SIM.fuel[k] = 0.5;
    }
    WATER.lavaOn = true;
    ovPaint(x, z, r, 1, 0, 'set', 0.4); ovPaint(x, z, r, 0, 0, 'set', 0.4); ovPaint(x, z, r, 2, 1, 'set', 0.4); ovPaint(x, z, r, 3, 0.5, 'set', 0.4);
    forTrees(x, z, r, (t) => { if (t.state !== 0 || t.leaf < 1 || t.fall) { t.state = 0; t.leaf = 1; t.fall = 0; t.burn = 0; t.snow = 0; t.y = heightAt(t.x, t.z); tUpdate(t); } });
    for (const s of SIM.dark) if (dist2(s.x, s.z, x, z) < (s.r + r) ** 2) s.t = Math.min(s.t, 0.5);
    reopenEdges(x, z, r);
    if (n) { goodInc('restore', x, z).built += n; G.joy = Math.min(30, (G.joy || 0) + n * 0.4); }
    sparkleArea(x, z, r, [1, 0.85, 0.5], 18);
    AUDIO.chime(n ? 0.5 : 0.15);
  },
});

power({ id: 'shield', side: 'grace', group: 'Healing & rescue', name: 'Shield', icon: '🛡️', key: '4', mode: 'tap', rMin: 40, rMax: 900, world: 0.3,
  desc: 'A dome of light for a minute. Nothing harms what is inside: not fire, flood, lava, storm or stone.',
  cast(x, z, r) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, TAU, 0, Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uTime: U.uTime },
      vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform float uA; uniform float uTime; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
        void main(){ vec3 vd = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(vd, vN)), 2.5);
          float hex = abs(sin(vUv.x * 160.0) * sin(vUv.y * 60.0 - uTime * 2.0));
          float a = (f * 0.8 + 0.06 + 0.12 * smoothstep(0.9, 1.0, hex)) * uA;
          gl_FragColor = vec4(vec3(0.55, 0.75, 1.0) * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    dome.position.set(x, heightAt(x, z) - r * 0.08, z); dome.scale.set(r, r * 0.9, r); dome.renderOrder = 10; dome.frustumCulled = false;
    R.scene.add(dome);
    const sh = { x, z, r, hits: 0 };
    SIM.shields.push(sh);
    setBlockedDisc(x, z, r * 0.95, 1);
    // water and lava already inside are pushed out
    const cells = []; const cs = W.cs, V = W.V;
    for (let j = 1; j < V - 1; j++) for (let i = 1; i < V - 1; i++) if (dist2(i * cs, j * cs, x, z) < (r * 0.95) ** 2) { const k = j * V + i; if (W.h0[k] > 0.2) cells.push(k); else WATER.blk[k]--; }
    pushOutBlocked(cells);
    forBuildings(x, z, r, (b) => { if (b.fire > 0) b.fire = 0; b.panic = 0; bUpdate(b); });
    goodInc('shield', x, z);
    addEffect({ type: 'shield', x, z, r, dome, sh, life: 60,
      update(dt) {
        this.dome.material.uniforms.uA.value = smooth(0, 1, this.t) * (1 - smooth(this.life - 3, this.life, this.t)) * (1 + 0.5 * Math.min(1, sh.hits));
        sh.hits = Math.max(0, sh.hits - dt);
        if (this.t >= this.life) {
          R.scene.remove(this.dome); this.dome.geometry.dispose(); this.dome.material.dispose();
          SIM.shields.splice(SIM.shields.indexOf(sh), 1);
          const cs = W.cs, V = W.V;
          for (let j = 1; j < V - 1; j++) for (let i = 1; i < V - 1; i++) if (dist2(i * cs, j * cs, this.x, this.z) <= (this.r * 0.95) ** 2) { const k = j * V + i; if (W.h0[k] > 0.2) WATER.blk[k] = Math.max(0, WATER.blk[k] - 1); }
          WATER.wake();
          return false;
        }
        return true;
      } });
    AUDIO.chime(1);
  },
});

power({ id: 'grow', side: 'grace', group: 'Growth', name: 'Prosper', icon: '🏙️', key: '5', mode: 'hold', every: 0.15, rMin: 30, rMax: 500,
  desc: 'Bless the land and the city grows: new homes on empty lots, towers rising higher, more people moving in.',
  cast(x, z, r) {
    let made = 0;
    for (let k = 0; k < 3; k++) {
      const a = rr(0, TAU), d = Math.sqrt(Math.random()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const b = buildingAt(px, pz);
      if (b && b.state === 0 && (b.kind === 'tower' || b.kind === 'apt') && Math.random() < 0.5) { if (growTaller(b)) made++; continue; }
      if (b && b.kind === 'house' && Math.random() < 0.25 && urbanI(px, pz) > 0.25) { if (replaceWithMidrise(b)) made++; continue; }
      const nb = newBuildingAt(px, pz);
      if (nb) made++;
    }
    if (made) { goodInc('grow', x, z).built += made; G.joy = Math.min(30, (G.joy || 0) + 0.3); }
    sparkleArea(x, z, r, [1, 0.9, 0.5], 8);
    AUDIO.chime(made ? 0.35 : 0.1);
  },
});
function growTaller(b) {
  const cap = W.def.hmax * 1.35;
  if (b.h > cap) return false;
  const k = rr(1.08, 1.2);
  for (const p of b.parts) { p.y *= k; p.sy *= k; p.m.compose(_p4.set(p.x, p.y, p.z), _q4.setFromAxisAngle(_ax.set(0, 1, 0), p.ry || 0), _s4.set(p.sx, p.sy, p.sz)); }
  b.h *= k;
  const add = Math.round(b.pop0 * (k - 1));
  b.pop += add; b.pop0 += add; W.popCap += add; G.stats.pop += add; G.stats.grown += add;
  bUpdate(b);
  return true;
}
function replaceWithMidrise(b) {
  if (b.state !== 0) return false;
  b.state = 3; bUpdate(b);
  const nb = newBuildingAt(b.x, b.z, 'apt', true);
  return !!nb;
}
// finds room at (x, z) and builds something that suits the neighbourhood, rising out of the ground
function newBuildingAt(x, z, kind, force) {
  if (!inWorld(x, z, 30)) return null;
  const t = tileAt(x, z);
  if (t === T_ROAD || t === T_WATER || heightAt(x, z) < 0.6 || slopeAt(x, z) > 0.2) return null;
  // stay clear of roads
  for (const [dx, dz] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) if (tileAt(x + dx, z + dz) === T_ROAD) return null;
  const I = Math.min(1, urbanI(x, z) + 0.1);
  kind = kind || (I > W.def.core && (W.sizeKey === 'mega' || W.sizeKey === 'metro' || W.sizeKey === 'city') ? 'tower' : I > 0.45 ? 'apt' : 'house');
  const size = kind === 'tower' ? rr(22, 36) : kind === 'apt' ? rr(16, 26) : 10;
  let clash = false;
  forBuildings(x, z, size + 10, (o) => { if (!clash && o.state === 0 && o.kind !== 'bridge' && Math.abs(o.x - x) < (o.w + size) / 2 + 2 && Math.abs(o.z - z) < (o.d + size) / 2 + 2) clash = true; });
  if (clash && !force) return null;
  const n0 = W.buildings.length;
  const r = RNG();
  const b = kind === 'tower' ? makeTower(x, z, size, size * rr(0.8, 1.1), Math.max(I, 0.75), r) : kind === 'apt' ? makeMidrise(x, z, size, size * rr(0.7, 1.1), I, r) : makeHouse(x, z, pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), r, false);
  // make sure there is room in the batches
  for (const p of b.parts) if (BAT[p.g].n >= BAT[p.g].cap) { W.buildings.length = n0; return null; }
  b.district = districtAt(x, z);
  const [cap, val] = capacityOf(b);
  b.pop = b.pop0 = Math.round(cap * (W.popK || 1));
  b.value = val;
  W.popCap += b.pop; G.stats.pop += b.pop; G.stats.grown += b.pop;
  b.c = 1; b.cv = -1;
  registerBuilding(b);
  hashAddB(b);
  SIM.growing.push(b);
  forTrees(x, z, size * 0.7, (t) => { t.state = 3; tUpdate(t); });
  return b;
}

power({ id: 'bloom', side: 'grace', group: 'Growth', name: 'Bloom', icon: '🌳', key: '6', mode: 'hold', every: 0.15, rMin: 30, rMax: 700,
  desc: 'Fields ripen, parks green over and new trees spring up. Brings back what the fire and the locusts took.',
  cast(x, z, r) {
    ovPaint(x, z, r, 3, 0.95, 'set', 0.5);
    ovPaint(x, z, r, 1, 0, 'set', 0.6);
    let n = 0;
    forTrees(x, z, r, (t) => { if (t.state !== 0 || t.leaf < 1) { t.state = 0; t.leaf = 1; t.fall = 0; t.burn = 0; tUpdate(t); n++; } });
    for (let k = 0; k < 6; k++) {
      const a = rr(0, TAU), d = Math.sqrt(Math.random()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const tl = tileAt(px, pz);
      if (tl !== T_GRASS && tl !== T_PARK && tl !== T_YARD && tl !== T_FOREST) continue;
      if (heightAt(px, pz) < 0.8 || buildingAt(px, pz)) continue;
      let close = false; forTrees(px, pz, 5, () => { close = true; });
      if (close) continue;
      const t = addTree(px, pz, null, 1);
      if (!t || BAT.trunk.n >= BAT.trunk.cap || (t.con ? BAT.cone2 : BAT.blob).n >= (t.con ? BAT.cone2 : BAT.blob).cap) { if (t) W.trees.pop(); break; }
      t.leaf = 0.2; registerTree(t); hashAddT(t); SIM.sprout = SIM.sprout || []; SIM.sprout.push(t); n++;
    }
    for (let j = Math.max(1, Math.floor((z - r) / W.cs)); j <= Math.min(W.V - 2, Math.ceil((z + r) / W.cs)); j++) for (let i = Math.max(1, Math.floor((x - r) / W.cs)); i <= Math.min(W.V - 2, Math.ceil((x + r) / W.cs)); i++) { const k = j * W.V + i; if (SIM.fuel[k] === 0 && W.h[k] > 0.5 && tileAt(i * W.cs, j * W.cs) !== T_ROAD) SIM.fuel[k] = 0.4; }
    if (n) goodInc('bloom', x, z).built += n;
    G.joy = Math.min(30, (G.joy || 0) + 0.2);
    sparkleArea(x, z, r, [0.6, 1, 0.5], 14);
    AUDIO.chime(0.15);
  },
});

power({ id: 'rain', side: 'grace', group: 'Weather blessing', name: 'Gentle rain', icon: '🌦️', key: '7', mode: 'tap', rMin: 80, rMax: 1600, world: 0.4,
  desc: 'Soft rain for half a minute. Fires die down, the land greens and the snow washes away.',
  cast(x, z, r) {
    goodInc('rain', x, z);
    addEffect({ type: 'rain', x, z, R: r, life: 32, rain: 0.7, storm: 0.45, k: 0, acc: 0,
      update(dt) {
        this.k = life01(this, 3, 5);
        cloudDeck(this, dt, this.x, this.z, this.R, 280, 0.7, 4);
        this.acc += dt;
        if (this.acc > 0.5) {
          this.acc = 0;
          douse(this.x, this.z, this.R, 0.06 * this.k);
          for (let i = 0; i < 6; i++) { const a = rr(0, TAU), d = Math.sqrt(Math.random()) * this.R; ovPaint(this.x + Math.cos(a) * d, this.z + Math.sin(a) * d, this.R * 0.3, 3, 0.08, 'add', 0.6); }
          ovPaint(this.x, this.z, this.R, 0, -0.03, 'add', 0.5);
          ovPaint(this.x, this.z, this.R, 1, -0.01, 'add', 0.5);
          forTrees(this.x, this.z, this.R, (t) => { if (t.leaf < 1 && t.state === 0 && Math.random() < 0.1) { t.leaf = Math.min(1, t.leaf + 0.1); tUpdate(t); } });
          G.joy = Math.min(30, (G.joy || 0) + 0.1);
        }
        AUDIO.rain(0.5 * this.k * (1 - smooth(this.R * 0.6, this.R * 1.4, dist(CAM.tx, CAM.tz, this.x, this.z))));
        return this.t < this.life;
      } });
    AUDIO.chime(0.4);
  },
});

power({ id: 'sun', side: 'grace', group: 'Weather blessing', name: 'Sunshine', icon: '☀️', key: '8', mode: 'tap', rMin: 120, rMax: 2600, world: 0.7,
  desc: 'The clouds part. Storms, tornadoes and blizzards end, snow melts and floodwater dries away.',
  cast(x, z, r) {
    let ended = 0;
    for (const e of G.effects) if (['tornado', 'blizzard', 'hurricane', 'rain', 'deluge', 'locusts'].includes(e.type) && dist(e.x, e.z, x, z) < r + (e.R || e.r || 0) * 0.5) { if (e.type === 'locusts' && Math.random() < 0.5) continue; e.life = Math.min(e.life, e.t + 4); ended++; }
    if (WATER.seaTarget > 0) { WATER.seaTarget = 0; WATER.seaT = 0; }
    goodInc('sun', x, z).saved += ended;
    for (let i = 0; i < 7; i++) { const a = rr(0, TAU), d = Math.sqrt(Math.random()) * r * 0.7; beam(x + Math.cos(a) * d, z + Math.sin(a) * d, rr(30, 70) * (1 + r / 1000), 900, 0xfff0b0, 8, { a: 0.35 }); }
    addEffect({ type: 'sunny', x, z, R: r, life: 20, acc: 0,
      update(dt) {
        this.acc += dt;
        if (this.acc > 0.4) {
          this.acc = 0;
          ovPaint(this.x, this.z, this.R, 0, -0.15, 'add', 0.5);
          removeWater(this.x, this.z, this.R, 0.12);
          forBuildings(this.x, this.z, this.R, (b) => { if (b.snow > 0) { b.snow = Math.max(0, b.snow - 0.15); bUpdate(b); } });
          forTrees(this.x, this.z, this.R, (t) => { if (t.snow > 0) { t.snow = Math.max(0, t.snow - 0.15); tUpdate(t); } });
        }
        return this.t < this.life;
      } });
    G.sunBoost = 8;
    G.joy = Math.min(30, (G.joy || 0) + 6);
    AUDIO.chime(0.8);
  },
});

power({ id: 'rainbow', side: 'grace', group: 'Weather blessing', name: 'Rainbow', icon: '🌈', key: '9', mode: 'tap', rMin: 150, rMax: 2000, world: 0.5,
  desc: 'A rainbow over the city. Fear lifts, people come out into the streets to look up, and spirits soar.',
  cast(x, z, r) {
    const g = new THREE.TorusGeometry(1, 0.05, 6, 80, Math.PI);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uA; varying vec3 vP;
        vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
        void main(){ float rr = length(vP.xy); float t = clamp((rr - 0.95) / 0.1, 0.0, 1.0); vec3 c = hue(t * 0.8);
          float a = uA * smoothstep(0.0, 0.25, t) * smoothstep(1.0, 0.75, t) * smoothstep(0.0, 0.3, vP.y);
          gl_FragColor = vec4(c * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    const cam = R.camera.position;
    m.position.set(x, heightAt(x, z) - r * 0.1, z);
    m.rotation.y = Math.atan2(cam.x - x, cam.z - z);
    m.scale.set(r, r, r * 0.3);
    m.frustumCulled = false; m.renderOrder = 11;
    R.scene.add(m);
    for (const t of G.threats) if (dist2(t.x, t.z, x, z) < (r * 1.5) ** 2) t.calm = true;
    forBuildings(x, z, r * 1.5, (b) => { b.panic = 0; b.evac = 0; });
    G.gather = { x, z, r: 40, t: 40 };
    const inc = goodInc('rainbow', x, z);
    let healed = 0;
    for (const s of SIM.sites) if (dist2(s.x, s.z, x, z) < r * r) { const k = s.injured * 0.25; s.injured -= k; healed += k; }
    treatInjured(healed); inc.healed += Math.round(healed);
    G.joy = Math.min(40, (G.joy || 0) + 22);
    addEffect({ type: 'rainbow', x, z, m, life: 40, update(dt) { this.m.material.uniforms.uA.value = 0.7 * smooth(0, 3, this.t) * (1 - smooth(this.life - 6, this.life, this.t)); if (this.t >= this.life) { R.scene.remove(this.m); this.m.geometry.dispose(); this.m.material.dispose(); return false; } return true; } });
    AUDIO.choir(1);
  },
});

power({ id: 'raise', side: 'grace', group: 'Miracles', name: 'Raise land', icon: '⛰️', key: '0', mode: 'hold', every: 0.05, rMin: 30, rMax: 500,
  desc: 'Lift the ground. Raise a seawall, an island or a refuge above the flood. Buildings ride up with it.',
  cast(x, z, r, o = {}) {
    const dt = o.dt || 0.05, rate = 6 * dt * clamp(150 / r, 0.4, 2);
    editTerrain(x, z, r, (h, d, k) => { const w = Math.pow(1 - d / r, 1.5); return Math.min(h + rate * w, Math.max(W.h0[k], 0) + 120); });
    if (Math.random() < 0.3) forBuildings(x, z, r, (b) => { if (b.state !== 0) return; const s = reseat(b); if (s.relief > Math.max(6, b.w * 0.3)) hurt(b, 0.02, 'quake'); else bUpdate(b); });
    if (Math.random() < 0.3) forTrees(x, z, r, (t) => { t.y = heightAt(t.x, t.z); tUpdate(t); });
    if (FX_NEAR(x, z) && Math.random() < 0.5) { const a = rr(0, TAU); puffDust(x + Math.cos(a) * r * 0.8, heightAt(x + Math.cos(a) * r * 0.8, z + Math.sin(a) * r * 0.8), z + Math.sin(a) * r * 0.8, r * 0.15, 4, [0.5, 0.45, 0.38]); }
    goodInc('raise', x, z);
    AUDIO.rumble(0.25);
  },
});

power({ id: 'part', side: 'grace', group: 'Miracles', name: 'Part waters', icon: '〽️', key: 'Q', mode: 'line', rMin: 15, rMax: 160,
  desc: 'Drag a line across water to open a dry path for forty seconds. The sea stands up in walls on either side.',
  cast(ax, az, r, o) {
    const bx = o.bx, bz = o.bz;
    if (dist(ax, az, bx, bz) < 30) { toast('Drag a line across the water.', ''); return; }
    const cells = setBlockedStrip(ax, az, bx, bz, r, 1);
    pushOutBlocked(cells);
    goodInc('part', (ax + bx) / 2, (az + bz) / 2);
    addEffect({ type: 'part', x: (ax + bx) / 2, z: (az + bz) / 2, ax, az, bx, bz, r, cells, life: 40,
      update(dt) {
        if (FX_NEAR(this.x, this.z) && this.t < this.life - 2) {
          const L = dist(this.ax, this.az, this.bx, this.bz), dx = (this.bx - this.ax) / L, dz = (this.bz - this.az) / L;
          for (let i = 0; i < 6; i++) {
            const s = rr(0, L), side = Math.random() < 0.5 ? 1 : -1, px = this.ax + dx * s - dz * this.r * side * 1.05, pz = this.az + dz * s + dx * this.r * side * 1.05;
            if (waterDepth(px, pz) > 0.5) FX.smoke.emit(px, waterSurface(px, pz), pz, rr(-1, 1), rr(2, 6), rr(-1, 1), 2, 4, 12, 0.85, 0.9, 0.95, 0.5, 0.3, 2);
          }
        }
        if (this.t >= this.life) { for (const k of this.cells) WATER.blk[k] = Math.max(0, WATER.blk[k] - 1); WATER.wake(); AUDIO.surge(0.6); return false; }
        return true;
      } });
    AUDIO.choir(0.8);
  },
});

power({ id: 'gold', side: 'grace', group: 'Miracles', name: 'Golden age', icon: '✨', key: 'W', mode: 'tap', rMin: 60, rMax: 1400, world: 0.4,
  desc: 'A district glows with blessing for ninety seconds: no sickness, prosperity, joy, and a city that builds itself up.',
  cast(x, z, r) {
    goodInc('gold', x, z);
    beam(x, z, Math.min(160, r * 0.25), 1600, 0xffd060, 12, { a: 0.55 });
    addEffect({ type: 'gold', x, z, R: r, life: 90, acc: 0,
      update(dt) {
        const k = smooth(0, 3, this.t) * (1 - smooth(this.life - 8, this.life, this.t));
        this.acc += dt;
        if (this.acc > 0.5) {
          this.acc = 0;
          forBuildings(this.x, this.z, this.R, (b, d) => { const g = k * (1 - smooth(this.R * 0.7, this.R, d)); if (Math.abs(b.gold - g) > 0.03) { b.gold = g; if (b.inf > 0) { b.inf = 0; b.rec = 1; } b.panic = 0; bUpdate(b); } });
          forTrees(this.x, this.z, this.R, (t) => { const g = k * 0.6; if (Math.abs(t.gold - g) > 0.05) { t.gold = g; tUpdate(t); } });
          healArea(this.x, this.z, this.R * 0.5);
          if (Math.random() < 0.5) PW.grow.cast(this.x + rr(-1, 1) * this.R * 0.6, this.z + rr(-1, 1) * this.R * 0.6, 40);
          G.joy = Math.min(40, (G.joy || 0) + 0.6);
        }
        if (FX_NEAR_BIG({ x: this.x, z: this.z, R: this.R })) sparkleArea(this.x, this.z, this.R, [1, 0.85, 0.4], 3);
        if (this.t >= this.life) { forBuildings(this.x, this.z, this.R, (b) => { if (b.gold) { b.gold = 0; bUpdate(b); } }); forTrees(this.x, this.z, this.R, (t) => { if (t.gold) { t.gold = 0; tUpdate(t); } }); return false; }
        return true;
      } });
    AUDIO.choir(1);
  },
});

power({ id: 'resurrect', side: 'grace', group: 'Miracles', name: 'Resurrection', icon: '✝️', key: 'E', mode: 'tap', rMin: 50, rMax: 2600, world: 0.6,
  desc: 'The dead of this place rise and walk home. Works where people have died.',
  cast(x, z, r) {
    let n = 0;
    const sites = [];
    for (const d of G.deaths) if (d.n > 0 && dist2(d.x, d.z, x, z) < r * r) { n += d.n; sites.push(d); d.n = 0; }
    G.deaths = G.deaths.filter((d) => d.n > 0);
    for (const [k, d] of G.deathMap) if (d.n <= 0) G.deathMap.delete(k);
    if (!n) { toast('No one has died here.', ''); return; }
    const S = G.stats;
    S.pop += n; S.dead -= n; S.revived += n;
    for (const inc of G.incidents) if (!inc.good && dist2(inc.x, inc.z, x, z) < r * r) inc.deaths = Math.max(0, inc.deaths - n);
    const inc = newIncident('resurrect', x, z, { good: true });
    inc.healed = n;
    sites.sort((a, b) => b.n - a.n);
    for (const s of sites.slice(0, 14)) beam(s.x, s.z, clamp(Math.sqrt(s.n) * 2, 8, 50), 1200, 0xfffaf0, 6, { a: 0.8 });
    sparkleArea(x, z, r, [1, 1, 0.95], 60);
    G.gather = { x, z, r: 50, t: 30 };
    G.joy = Math.min(40, (G.joy || 0) + 30);
    AUDIO.choir(1.2);
  },
});

// ---------- hazard damage from water and lava, four times a second ----------
function hazardPass(dt) {
  const V = W.V, cs = W.cs, d = WATER.d, L = WATER.L, T = WATER.T, h0 = W.h0, spd = WATER.spd;
  const inc = G.floodInc;
  let floodPeople = 0;
  if (!WATER.asleep || WATER.lavaOn) for (let k = 0; k < V * V; k++) {
    const lava = L[k] > 0.3 && T[k] > 0.25;
    const flood = d[k] > 0.5 && h0[k] > 0.3;
    if (!lava && !flood) continue;
    if ((k & 3) !== (G.frame & 3)) continue; // a quarter of the cells each pass
    const x = (k % V) * cs, z = ((k / V) | 0) * cs;
    if (lava) {
      forBuildings(x, z, cs * 0.7, (b) => { if (b.state === 0) { ignite(b, 0.6); hurt(b, dt * 4 * 0.8, 'lava', b.fireInc); } });
      forTrees(x, z, cs * 0.7, (t) => { if (t.state === 0) igniteTree(t); });
      if (Math.random() < 0.02 && FX_NEAR(x, z)) puffSmoke(x, W.h[k] + L[k] + 1, z, 8, 0.25, 6, 3);
    } else {
      const dep = d[k], v = spd[k];
      forBuildings(x, z, cs * 0.7, (b) => {
        if (b.state !== 0) return;
        const vuln = { house: 1, shop: 0.6, church: 0.5, ind: 0.5, apt: 0.18, station: 0.4, tower: 0.04, hospital: 0.15, hall: 0.15, stadium: 0.1, bridge: 0.3 }[b.kind] || 0.3;
        const force = dep * 0.004 + Math.max(0, v - 1) * dep * 0.006;
        if (hurt(b, dt * 4 * force * vuln, v > 3 ? 'tsunami' : 'flood', inc)) return;
        if (b.fire > 0) b.fire = 0;
        const occ = occupants(b);
        if (dep > 1.5 && occ > 0) { const kn = occ * dt * 4 * 0.004 * Math.min(1, dep / Math.max(3, b.h)) * (v > 3 ? 3 : 1); kill(kn, b.x, b.z, inc); b.occ = Math.max(0, (b.occ === undefined ? 1 : b.occ) - 0.01); b.evac = Math.min(1, b.evac + 0.05); }
      });
      if (dep > 1.2 && v > 2) forTrees(x, z, cs * 0.7, (t) => { if (t.state === 0 && Math.random() < 0.1) { t.state = 4; t.fall = 1; t.fallA = rr(0, TAU); tUpdate(t); } });
      if (dep > 1) { floodPeople += dep * urbanI(x, z); G.floodX = x; G.floodZ = z; }
      if (dep > 1.4) edgesNear(x, z, cs, (e) => { if (e.open && !e.bridge && segDist(x, z, e) < cs) { e.open = false; e.flooded = true; } });
    }
  }
  // outdoors and in cars: a share of the people in the flooded streets
  if (floodPeople > 0) { const dens = W.popCap / (W.M * W.M * 0.5) * popScale(); kill(floodPeople * cs * cs * dens * 0.05 * 0.01 * dt * 4, G.floodX, G.floodZ, inc); }
  // flooded roads reopen when the water goes down
  if (G.frame % 8 === 0) for (const e of W.edges) if (e.flooded) { const mx = (e.a.x + e.b.x) / 2, mz = (e.a.z + e.b.z) / 2; if (waterDepth(mx, mz) < 0.4) { e.flooded = false; if (!e.rubble && !e.crater && !(e.bridge && e.bridgeB.state !== 0)) e.open = true; } }
}
