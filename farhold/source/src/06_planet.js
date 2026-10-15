// Farhold — runtime planets: a spinning group per planet, cube-sphere quadtree terrain with water, atmosphere and clouds

// shared index buffers per segment count (grid + double-sided skirts)
const _idxCache = {};
function chunkIndex(N) {
  if (_idxCache[N]) return _idxCache[N];
  const idx = [], NV = (N + 1) * (N + 1);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  // skirts: rows bottom (j=0), top (j=N), cols left (i=0), right (i=N)
  const sBase = [NV, NV + (N + 1), NV + 2 * (N + 1), NV + 3 * (N + 1)];
  const edgeV = [(i) => i, (i) => N * (N + 1) + i, (j) => j * (N + 1), (j) => j * (N + 1) + N];
  for (let e = 0; e < 4; e++) for (let i = 0; i < N; i++) {
    const a = edgeV[e](i), b = edgeV[e](i + 1), sa = sBase[e] + i, sb = sBase[e] + i + 1;
    idx.push(a, sa, b, b, sa, sb, a, b, sa, b, sb, sa);
  }
  const ia = new THREE.BufferAttribute(NV + 4 * (N + 1) > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1);
  return (_idxCache[N] = ia);
}
function waterIndex(WS) {
  const k = 'w' + WS;
  if (_idxCache[k]) return _idxCache[k];
  const idx = [];
  for (let j = 0; j < WS; j++) for (let i = 0; i < WS; i++) { const a = j * (WS + 1) + i, b = a + 1, c = a + WS + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  return (_idxCache[k] = new THREE.BufferAttribute(new Uint16Array(idx), 1));
}

// ---------- terrain quadtree node ----------
class TNode {
  constructor(pl, face, u0, v0, size, depth, parent) {
    this.pl = pl; this.face = face; this.u0 = u0; this.v0 = v0; this.size = size; this.depth = depth; this.parent = parent;
    this.kids = null; this.mesh = null; this.water = null; this.state = 0; // 0 none, 1 requested, 2 ready
    const d = [0, 0, 0]; K.cubeDir(face, u0 + size / 2, v0 + size / 2, d);
    this.dir = new V3(d[0], d[1], d[2]);
    this.arc = size / 2 * (Math.PI / 2) * pl.R; // approximate edge length in metres
    this.center = this.dir.clone().multiplyScalar(pl.R);
    this.hmax = pl.P.amp; this.hmin = -pl.P.amp;
    this.gen = 0;
  }
  request(sync) {
    if (this.state) return;
    this.state = 1;
    const pl = this.pl, N = pl.N;
    const gen = ++this.gen;
    TERRAIN_POOL.request(pl.P, { face: this.face, u0: this.u0, v0: this.v0, size: this.size, N, skirt: Math.max(2, this.arc * 0.03), ws: Math.max(4, N / 2) }, (res) => {
      if (this.state !== 1 || gen !== this.gen || !pl.live) return;
      this.build(res, N);
    }, () => this.state !== 1 || !pl.live, sync);
  }
  build(res, N) {
    const pl = this.pl;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(res.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(res.nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(res.col, 3));
    g.setAttribute('pl', new THREE.BufferAttribute(res.pl, 3));
    g.setIndex(chunkIndex(N));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, pl.terrMat);
    m.position.set(res.center[0], res.center[1], res.center[2]);
    m.receiveShadow = true;
    m.visible = false; m.matrixAutoUpdate = false; m.updateMatrix();
    pl.group.add(m);
    this.mesh = m;
    this.center.set(res.center[0], res.center[1], res.center[2]);
    this.hmin = res.hmin; this.hmax = res.hmax;
    if (res.wpos) {
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.BufferAttribute(res.wpos, 3));
      wg.setAttribute('normal', new THREE.BufferAttribute(res.wnor, 3));
      wg.setAttribute('wdep', new THREE.BufferAttribute(res.wdep, 1));
      wg.setIndex(waterIndex(Math.max(4, N / 2)));
      wg.computeBoundingSphere();
      const w = new THREE.Mesh(wg, pl.waterMat);
      w.position.copy(m.position); w.visible = false; w.matrixAutoUpdate = false; w.updateMatrix(); w.renderOrder = 2;
      pl.group.add(w);
      this.water = w;
    }
    this.state = 2;
  }
  setVisible(v) { if (this.mesh) this.mesh.visible = v; if (this.water) this.water.visible = v; }
  dispose() {
    if (this.kids) { for (const k of this.kids) k.dispose(); this.kids = null; }
    if (this.mesh) { this.pl.group.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh = null; }
    if (this.water) { this.pl.group.remove(this.water); this.water.geometry.dispose(); this.water = null; }
    this.state = 0; this.gen++;
  }
}

// ---------- planet runtime ----------
const PLANETS = { list: [], cur: null };
function makePlanetRuntime(pl) {
  pl.live = true;
  pl.N = Qset().N;
  pl.maxDepth = Math.max(3, Math.ceil(Math.log2(pl.R * Math.PI / 2 / 34)));
  pl.group = new THREE.Group();
  pl.group.position.copy(pl.pos);
  pl.spin = pl.phase0;
  pl.tiltQ = new Q4().setFromAxisAngle(new V3(1, 0, 0), pl.tilt);
  updatePlanetSpin(pl, 0);
  R.scene.add(pl.group);
  pl.terrMat = terrainMat();
  pl.terrMat.fog = true;
  if (pl.P.sea != null) pl.waterMat = waterMat(pl.pal.water, pl.pal.deep);
  pl.roots = [];
  for (let f = 0; f < 6; f++) { const n = new TNode(pl, f, -1, -1, 2, 0, null); pl.roots.push(n); n.request(true); n.setVisible(true); }
  if (pl.atmo) makeAtmosphere(pl);
  pl.lod = { t: 0 };
  // children rendered in the planet frame (flora cells, creatures, buildings, bases)
  pl.content = new THREE.Group(); pl.group.add(pl.content);
  return pl;
}
function disposePlanetRuntime(pl) {
  if (!pl.live) return;
  pl.live = false;
  for (const n of pl.roots) n.dispose();
  R.scene.remove(pl.group);
  pl.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  pl.terrMat.dispose(); if (pl.waterMat) pl.waterMat.dispose();
  if (pl.atmoMesh) pl.atmoMesh.material.dispose();
  TERRAIN_POOL.forget(pl.P.id);
}
function updatePlanetSpin(pl, dt) {
  pl.spin += dt * TAU / pl.day;
  _q1.setFromAxisAngle(UP, pl.spin);
  pl.group.quaternion.copy(pl.tiltQ).multiply(_q1);
  pl.group.updateMatrixWorld(true);
}

// LOD traversal: decide which nodes are visible given the camera's planet-local position
const _camL = new V3();
function updatePlanetLOD(pl, camLocal, budget) {
  const q = Qset();
  const k = q.split;
  const camR = camLocal.length();
  const alt = camR - pl.R;
  let requests = 0;
  const horizonCos = camR > pl.R ? pl.R / camR : 1;
  const visit = (n) => {
    // distance from camera to the node's surface patch (approximate)
    const d = Math.max(0, camLocal.distanceTo(n.center) - n.arc * 0.7);
    const wantSplit = n.depth < pl.maxDepth && d < n.arc * k;
    if (wantSplit) {
      if (!n.kids) {
        const h = n.size / 2;
        n.kids = [new TNode(pl, n.face, n.u0, n.v0, h, n.depth + 1, n), new TNode(pl, n.face, n.u0 + h, n.v0, h, n.depth + 1, n),
          new TNode(pl, n.face, n.u0, n.v0 + h, h, n.depth + 1, n), new TNode(pl, n.face, n.u0 + h, n.v0 + h, h, n.depth + 1, n)];
      }
      let ready = true;
      for (const c of n.kids) {
        if (c.state === 0 && requests < budget) {
          // nearer patches first: horizon-culled chunks still get built, just later
          c.request(false); requests++;
        }
        if (c.state !== 2) ready = false;
      }
      if (ready) { n.setVisible(false); for (const c of n.kids) visit(c); }
      else { n.setVisible(true); for (const c of n.kids) hideTree(c); }
    } else {
      n.setVisible(true);
      if (n.kids) {
        // keep children around briefly for hysteresis, then drop them
        if (d > n.arc * k * 1.35) { for (const c of n.kids) c.dispose(); n.kids = null; }
        else for (const c of n.kids) hideTree(c);
      }
    }
  };
  const hideTree = (n) => { n.setVisible(false); if (n.kids) for (const c of n.kids) hideTree(c); };
  for (const r of pl.roots) visit(r);
  return requests;
}
function planetChunkCount(pl) { let n = 0; const v = (x) => { if (x.mesh) n++; if (x.kids) x.kids.forEach(v); }; pl.roots.forEach(v); return n; }
function planetPending(pl) { let n = 0; const v = (x) => { if (x.state === 1) n++; if (x.kids) x.kids.forEach(v); }; pl.roots.forEach(v); return n; }

// ---------- atmosphere shell ----------
// Rendered from inside or outside: analytic ray/sphere maths give the in-scatter colour and opacity.
function makeAtmosphere(pl) {
  const g = new THREE.SphereGeometry(1, 48, 24);
  const pal = pl.pal;
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new V3() }, uSun: { value: new V3(1, 0, 0) }, uR: { value: pl.R }, uA: { value: pl.atmoR },
      uZen: { value: new THREE.Color(pal.zenith) }, uHor: { value: new THREE.Color(pal.horizon) }, uSet: { value: new THREE.Color(pal.sunset) },
      uSunCol: { value: new THREE.Color(STAR_CLASS[pl.sys.cls].light) }, uDens: { value: 1 }, uStorm: { value: 0 }, uStormCol: { value: new THREE.Color(0x806040) },
    },
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vP;
      void main(){ vP = position * ${pl.atmoR.toFixed(1)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uCam, uSun, uZen, uHor, uSet, uSunCol, uStormCol; uniform float uR, uA, uDens, uStorm; varying vec3 vP;
      vec2 sph(vec3 o, vec3 d, float r){ float b = dot(o, d); float c = dot(o, o) - r * r; float h = b * b - c; if (h < 0.0) return vec2(1e9, -1e9); h = sqrt(h); return vec2(-b - h, -b + h); }
      void main(){
        vec3 d = normalize(vP - uCam);
        vec2 a = sph(uCam, d, uA);
        if (a.y < 0.0) discard;
        float t0 = max(a.x, 0.0), t1 = a.y;
        vec2 p = sph(uCam, d, uR);
        bool hitP = p.x > 0.0 && p.x < t1;
        if (hitP) t1 = p.x;
        float H = uA - uR;
        float camAltU = (length(uCam) - uR) / H; float camAlt = clamp(camAltU, 0.0, 1.0);
        // optical depth with exponential falloff (to the ground, and through the whole shell)
        float od = 0.0, odF = 0.0, seg = (t1 - t0) / 8.0, segF = (a.y - t0) / 8.0;
        for (int i = 0; i < 8; i++) {
          float t = t0 + (float(i) + 0.5) * seg; float h = max(0.0, (length(uCam + d * t) - uR) / H); od += exp(-h * 5.0) * seg;
          float tf = t0 + (float(i) + 0.5) * segF; float hf = max(0.0, (length(uCam + d * tf) - uR) / H); odF += exp(-hf * 5.0) * segF;
        }
        od /= H; odF /= H;
        vec3 mid = uCam + d * (t0 + t1) * 0.5; vec3 mn = normalize(mid);
        vec3 up = normalize(uCam);
        float midSun = dot(mn, uSun);
        float day = smoothstep(-0.25, 0.25, midSun);
        float viewUp = dot(d, up);
        float horiz = 1.0 - clamp(abs(viewUp), 0.0, 1.0);
        vec3 sky = mix(uZen, uHor, pow(horiz, 2.5) * (1.0 - camAlt * 0.6));
        float sd = max(dot(d, uSun), 0.0);
        float sunset = smoothstep(0.4, -0.05, abs(midSun));
        sky = mix(sky, uSet, sunset * (0.25 + 0.75 * pow(sd, 2.0)) * 0.9);
        sky += uSunCol * (pow(sd, 6.0) * 0.3 + pow(sd, 300.0) * 0.8) * day;
        sky = mix(sky, uStormCol, uStorm * 0.7);
        vec3 col = sky * day;
        float kk = mix(16.0, 2.2, smoothstep(0.3, 2.5, camAltU));
        float alpha = (1.0 - exp(-od * kk * uDens)) * day;
        if (hitP) {
          // near the ground the planet-hit rays are just sky over low basins; from orbit, haze over the surface
          float hz = smoothstep(0.02, 0.5, camAlt);
          float aSky = (1.0 - exp(-odF * kk * uDens)) * day;
          vec3 hn = normalize(uCam + d * t1);
          float lit = smoothstep(-0.15, 0.35, dot(hn, uSun));
          vec3 haze = mix(uHor, uZen, 0.5) * lit + uSet * smoothstep(0.3, 0.0, abs(dot(hn, uSun))) * 0.5 * lit;
          float aHaze = (1.0 - exp(-od * 1.6 * uDens)) * mix(0.2, 1.0, lit);
          col = mix(col, haze, hz);
          alpha = mix(aSky, aHaze, hz);
        }
        gl_FragColor = vec4(col * alpha, alpha);
        #include <logdepthbuf_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = 5; mesh.scale.setScalar(pl.atmoR);
  pl.group.add(mesh);
  pl.atmoMesh = mesh;
  // a cloud shell
  if (Qset().clouds) {
    const cg = new THREE.SphereGeometry(1, 64, 32);
    const cm = new THREE.ShaderMaterial({
      uniforms: { uNoise: { value: R.noiseTex }, uSun: { value: new V3(1, 0, 0) }, uCol: { value: new THREE.Color(pal.cloud) }, uCov: { value: 0.5 }, uT: { value: 0 }, uCamR: { value: 0 }, uShell: { value: pl.R + pl.P.amp * 2.2 + 120 } },
      vertexShader: `#include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vN;
        void main(){ vN = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `#include <common>
        #include <logdepthbuf_pars_fragment>
        uniform sampler2D uNoise; uniform vec3 uSun, uCol; uniform float uCov, uT, uCamR, uShell; varying vec3 vN;
        void main(){
          vec3 n = normalize(vN);
          vec3 w = pow(abs(n), vec3(3.0)); w /= w.x + w.y + w.z;
          vec2 o = vec2(uT * 0.004, uT * 0.0013);
          float c1 = texture2D(uNoise, n.yz * 1.7 + o).g * w.x + texture2D(uNoise, n.xz * 1.7 + o).g * w.y + texture2D(uNoise, n.xy * 1.7 + o).g * w.z;
          float c2 = texture2D(uNoise, n.yz * 6.0 - o).r * w.x + texture2D(uNoise, n.xz * 6.0 - o).r * w.y + texture2D(uNoise, n.xy * 6.0 - o).r * w.z;
          float c = c1 * 0.7 + c2 * 0.3;
          float a = smoothstep(0.62 - uCov * 0.25, 0.75 - uCov * 0.2, c);
          float lit = smoothstep(-0.2, 0.4, dot(n, uSun));
          vec3 col = uCol * (0.25 + 0.85 * lit);
          // fade out when the camera flies through the layer
          a *= 0.85 * smoothstep(40.0, 260.0, abs(uCamR - uShell));
          gl_FragColor = vec4(col * a, a);
          #include <logdepthbuf_fragment>
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const cmesh = new THREE.Mesh(cg, cm);
    cmesh.renderOrder = 4; cmesh.scale.setScalar(pl.R + pl.P.amp * 2.2 + 120);
    pl.group.add(cmesh);
    pl.cloudMesh = cmesh;
  }
}

// ---------- the active system ----------
const SYS = { cur: null, star: null };
function loadSystem(star) {
  unloadSystem();
  const S = genSystem(star);
  SYS.cur = S; SYS.star = star;
  for (const p of S.planets) makePlanetRuntime(p);
  PLANETS.list = S.planets;
  R.sunMesh.position.set(0, 0, 0);
  R.sunMesh.material.uniforms.uCol.value.setHex(S.col);
  R.sunMesh.material.uniforms.uSize.value = S.starR * 1.5;
  R.sun.color.setHex(STAR_CLASS[S.cls].light);
  // nebula tint per system
  const rr = RNG(hashN(star.seed, 9));
  R.nebula.material.uniforms.uA.value.setHSL(rr(), 0.6, 0.18);
  R.nebula.material.uniforms.uB.value.setHSL(rr(), 0.6, 0.14);
  bus.emit('system', S);
  return S;
}
function unloadSystem() {
  if (!SYS.cur) return;
  bus.emit('systemUnload', SYS.cur);
  for (const p of SYS.cur.planets) disposePlanetRuntime(p);
  TERRAIN_POOL.clear();
  SYS.cur = null; PLANETS.list = []; PLANETS.cur = null;
}
// nearest planet whose sphere of influence contains a world-space point
function planetAt(world) {
  let best = null, bd = Infinity;
  for (const p of PLANETS.list) { const d = world.distanceTo(p.pos); if (d < p.soi && d < bd) { bd = d; best = p; } }
  return best;
}
function nearestPlanet(world) {
  let best = null, bd = Infinity;
  for (const p of PLANETS.list) { const d = world.distanceTo(p.pos) - p.R; if (d < bd) { bd = d; best = p; } }
  return { p: best, d: bd };
}
