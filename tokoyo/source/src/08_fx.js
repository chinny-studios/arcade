// Tokoyo — particles (chips, dust, sparks, fire, smoke, blood, magic), hit flashes, floating text

const FX = (() => {
  // two pools of point sprites: normal blending (smoke, dust, chips, blood) and additive (flame, sparks, magic)
  function pool(MAX, additive) {
    const P = { MAX, head: 0, pos: new Float32Array(MAX * 3), col: new Float32Array(MAX * 3), size: new Float32Array(MAX), alpha: new Float32Array(MAX),
      vel: new Float32Array(MAX * 3), life: new Float32Array(MAX), max: new Float32Array(MAX), grav: new Float32Array(MAX), grow: new Float32Array(MAX), live: 0 };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(P.col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(P.size, 1));
    g.setAttribute('alpha', new THREE.BufferAttribute(P.alpha, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true, fog: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 400 } }]),
      vertexShader: `attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float uScale;
        #include <fog_pars_vertex>
        void main(){ vC = color; vA = alpha; vec4 mvPosition = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(size * uScale / max(-mvPosition.z, 0.5), 96.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        #include <fog_pars_fragment>
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d); if (r > 0.25) discard; float f = ${additive ? 'pow(1.0 - r * 4.0, 1.5)' : 'smoothstep(0.25, 0.08, r)'}; gl_FragColor = vec4(vC * ${additive ? 'f' : '1.0'}, vA * f);
        #include <fog_fragment>
        }`,
    });
    P.pts = new THREE.Points(g, m);
    P.pts.frustumCulled = false; P.pts.renderOrder = additive ? 6 : 5;
    for (let i = 0; i < MAX; i++) P.pos[i * 3 + 1] = -9999;
    return P;
  }
  let A, N;
  const texts = [];
  function init() { N = pool(3000, false); A = pool(3000, true); R.scene.add(N.pts); R.scene.add(A.pts); }
  function emit(x, y, z, vx, vy, vz, c, s, l, g = 9, gr = 0, gl = 0) {
    const P = gl ? A : N;
    const i = P.head; P.head = (P.head + 1) % P.MAX;
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
    P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
    const cc = typeof c === 'number' ? hex3(c) : c;
    P.col[i * 3] = cc[0]; P.col[i * 3 + 1] = cc[1]; P.col[i * 3 + 2] = cc[2];
    P.size[i] = s; P.life[i] = P.max[i] = l; P.grav[i] = g; P.grow[i] = gr; P.alpha[i] = 1;
  }
  function stepPool(P, dt) {
    for (let i = 0; i < P.MAX; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt;
      if (P.life[i] <= 0) { P.pos[i * 3 + 1] = -9999; P.alpha[i] = 0; continue; }
      P.vel[i * 3 + 1] -= P.grav[i] * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      P.size[i] = Math.max(0.01, P.size[i] + P.grow[i] * dt);
      const t = P.life[i] / P.max[i];
      P.alpha[i] = Math.min(1, t * 3);
    }
    const g = P.pts.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.alpha.needsUpdate = true;
    P.pts.material.uniforms.uScale.value = innerHeight * 0.6;
  }
  function update(dt) {
    stepPool(N, dt); stepPool(A, dt);
    for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.t -= dt; t.y += dt * 0.8; if (t.t <= 0) texts.splice(i, 1); }
  }
  const r = (a) => (Math.random() - 0.5) * a;
  return {
    init, update, emit, texts, debug() { const o = []; for (const P of [N, A]) for (let i = 0; i < P.MAX; i++) if (P.life[i] > 0) o.push([P === A ? 'A' : 'N', +P.pos[i * 3].toFixed(1), +P.pos[i * 3 + 1].toFixed(1), +P.pos[i * 3 + 2].toFixed(1), +P.size[i].toFixed(2), +P.life[i].toFixed(1), P.col.slice(i * 3, i * 3 + 3).map((v) => +v.toFixed(2))]); return o; },
    chips(x, y, z, c, n = 6) { for (let i = 0; i < n; i++) emit(x + r(0.4), y + r(0.4), z + r(0.4), r(5), 2 + Math.random() * 3, r(5), c, 0.08 + Math.random() * 0.06, 0.6 + Math.random() * 0.4, 14); },
    dust(x, y, z, n = 8) { for (let i = 0; i < n; i++) emit(x + r(2.5), y + 0.15, z + r(2.5), r(1.6), 0.4 + Math.random() * 0.8, r(1.6), [0.62, 0.58, 0.5], 0.25 + Math.random() * 0.3, 1.1, -0.1, 0.35); },
    blood(x, y, z, c = 0x8a1a1a, n = 8) { for (let i = 0; i < n; i++) emit(x + r(0.3), y + r(0.3), z + r(0.3), r(4), 1 + Math.random() * 3, r(4), c, 0.07 + Math.random() * 0.05, 0.5 + Math.random() * 0.3, 12); },
    sparks(x, y, z, n = 10) { for (let i = 0; i < n; i++) emit(x, y, z, r(7), Math.random() * 5, r(7), [1, 0.8, 0.4], 0.05, 0.3 + Math.random() * 0.3, 10, 0, 1); },
    fire(x, y, z, k = 1, smoke = true) {
      for (let i = 0; i < 2; i++) { const hot = Math.random(); emit(x + r(0.35 * k), y + Math.random() * 0.1, z + r(0.35 * k), r(0.25), 0.9 + Math.random() * 0.9, r(0.25), hot < 0.3 ? [0.9, 0.75, 0.35] : hot < 0.7 ? [0.85, 0.38, 0.08] : [0.6, 0.16, 0.03], (0.22 + Math.random() * 0.16) * k, 0.35 + Math.random() * 0.35, -0.6, -0.5 * k, 1); }
      if (smoke && Math.random() < 0.18 * Math.min(1, k * 1.5)) emit(x + r(0.3 * k), y + 0.9 * k, z + r(0.3 * k), r(0.3) + WIND.dir.value.x * 0.6, 0.7, r(0.3) + WIND.dir.value.y * 0.6, [0.45, 0.44, 0.42], 0.3 * k, 2.2, -0.1, 0.35 * k);
      if (Math.random() < 0.1) emit(x, y + 0.2, z, r(1.2), 1.5 + Math.random() * 2, r(1.2), [1, 0.6, 0.2], 0.035, 0.9, 0.6, 0, 1);
    },
    magic(x, y, z, c = [0.5, 0.85, 1], n = 10, spd = 2) { for (let i = 0; i < n; i++) emit(x + r(0.5), y + r(0.5), z + r(0.5), r(spd), r(spd), r(spd), c, 0.15 + Math.random() * 0.1, 0.6 + Math.random() * 0.5, -0.5, -0.1, 1); },
    splash(x, z, n = 12) { for (let i = 0; i < n; i++) emit(x + r(0.6), 0.1, z + r(0.6), r(3), 2 + Math.random() * 3, r(3), [0.8, 0.9, 0.95], 0.12, 0.6, 12); },
    poison(x, y, z) { for (let i = 0; i < 3; i++) emit(x + r(0.4), y + r(0.6), z + r(0.4), r(0.3), 0.6, r(0.3), [0.4, 0.8, 0.2], 0.15, 0.7, -0.2, 0.1, 1); },
    text(x, y, z, s, color = '#fff', big = false) { texts.push({ x, y, z, s: String(s), c: color, t: 1.2, big }); if (texts.length > 40) texts.shift(); },
  };
})();
