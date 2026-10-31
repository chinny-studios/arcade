// Bakes per-vertex ambient occlusion and "reach" on the GPU.
// For each of N directions the occluders are rendered into an orthographic depth map; then every vertex of every
// target mesh is drawn as a single point into an accumulation texture (one texel per vertex) that adds up
//   R: visible * cos   G: cos   (AO = R / G)
//   B: visible, for directions a camera can come from   A: count of those directions   (reach = B / A)
// Glass is not an occluder, so dials under a crystal still count as reachable.
function bakeAO(targets, occluders, center, radius, opts = {}) {
  const ND = opts.dirs || 64, RES = opts.res || 1024;
  const cone = opts.cone || [-0.22, 0.95];
  const total = targets.reduce((s, m) => s + m.geometry.attributes.position.count, 0);
  const W = 1024, H = Math.max(1, Math.ceil(total / W));
  const floatBlend = renderer.extensions.has('EXT_float_blend');
  const depthRT = new THREE.WebGLRenderTarget(RES, RES, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const accRT = new THREE.WebGLRenderTarget(W, H, { type: floatBlend ? THREE.FloatType : THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const depthMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uFar: { value: 1 } },
    vertexShader: 'uniform float uFar; varying float vz; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vz = -mv.z / uFar; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vz; void main(){ gl_FragColor = vec4(vz, 0.0, 0.0, 1.0); }',
  });
  const pu = {
    uDepth: { value: depthRT.texture }, uView: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() },
    uDir: { value: V3() }, uFar: { value: 1 }, uAcc: { value: new THREE.Vector2(W, H) }, uBias: { value: radius * 0.006 },
    uCone: { value: new THREE.Vector2(cone[0], cone[1]) }, uOff: { value: 0 },
  };
  const pointMat = new THREE.ShaderMaterial({
    uniforms: pu, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    vertexShader: `
      uniform sampler2D uDepth; uniform mat4 uView, uProj; uniform vec3 uDir; uniform float uFar, uBias, uOff; uniform vec2 uAcc, uCone;
      attribute float vid; varying vec4 vOut;
      void main() {
        vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 wn = normalize(mat3(modelMatrix) * normal);
        float nd = dot(wn, uDir);
        vec4 vp = uView * vec4(wp + wn * uBias, 1.0);
        vec4 cp = uProj * vp;
        vec2 uv = cp.xy / cp.w * 0.5 + 0.5;
        float dz = texture2D(uDepth, uv).r;
        float vis = (-vp.z / uFar) <= dz + uBias / uFar ? 1.0 : 0.0;
        float cw = max(nd, 0.0);
        float inCone = step(uCone.x, uDir.y) * step(uDir.y, uCone.y) * step(0.12, nd);
        vOut = vec4(vis * cw, cw, vis * inCone, inCone);
        float id = vid + uOff;
        float x = mod(id, uAcc.x), y = floor(id / uAcc.x);
        gl_Position = vec4((x + 0.5) / uAcc.x * 2.0 - 1.0, (y + 0.5) / uAcc.y * 2.0 - 1.0, 0.0, 1.0);
        gl_PointSize = 1.0;
      }`,
    fragmentShader: 'varying vec4 vOut; void main(){ gl_FragColor = vOut; }',
  });
  const dScene = new THREE.Scene(), pScene = new THREE.Scene();
  for (const o of occluders) {
    const m = new THREE.Mesh(o.geometry, depthMat);
    m.matrixAutoUpdate = false; m.matrix.copy(o.matrixWorld); m.matrixWorldNeedsUpdate = true;
    dScene.add(m);
  }
  let off = 0;
  const pts = [];
  for (const t of targets) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', t.geometry.attributes.position);
    g.setAttribute('normal', t.geometry.attributes.normal);
    const n = t.geometry.attributes.position.count, vid = new Float32Array(n);
    for (let i = 0; i < n; i++) vid[i] = off + i;
    g.setAttribute('vid', new THREE.BufferAttribute(vid, 1));
    const p = new THREE.Points(g, pointMat);
    p.matrixAutoUpdate = false; p.matrix.copy(t.matrixWorld); p.matrixWorldNeedsUpdate = true; p.frustumCulled = false;
    pScene.add(p); pts.push({ t, off, n, g });
    off += n;
  }
  const cam = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 0.001, radius * 6);
  const prevRT = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  const prevAuto = renderer.autoClear, prevShadow = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  renderer.autoClear = false;
  renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < ND; i++) {
    const y = 1 - (i + 0.5) / ND * 2, rr = Math.sqrt(1 - y * y), th = ga * i;
    const dir = V3(Math.cos(th) * rr, y, Math.sin(th) * rr);
    cam.position.copy(center).addScaledVector(dir, radius * 3);
    cam.up.set(Math.abs(dir.y) > 0.9 ? 1 : 0, Math.abs(dir.y) > 0.9 ? 0 : 1, 0);
    cam.lookAt(center); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    depthMat.uniforms.uFar.value = cam.far;
    renderer.setRenderTarget(depthRT); renderer.setClearColor(0xffffff, 1); renderer.clear(true, true, false);
    renderer.render(dScene, cam);
    pu.uView.value.copy(cam.matrixWorldInverse); pu.uProj.value.copy(cam.projectionMatrix); pu.uDir.value.copy(dir); pu.uFar.value = cam.far;
    renderer.setRenderTarget(accRT);
    renderer.render(pScene, cam);
  }
  let buf;
  if (floatBlend) { buf = new Float32Array(W * H * 4); renderer.readRenderTargetPixels(accRT, 0, 0, W, H, buf); }
  else {
    const hb = new Uint16Array(W * H * 4); renderer.readRenderTargetPixels(accRT, 0, 0, W, H, hb);
    buf = new Float32Array(hb.length); for (let i = 0; i < hb.length; i++) buf[i] = THREE.DataUtils.fromHalfFloat(hb[i]);
  }
  renderer.setRenderTarget(prevRT); renderer.setClearColor(prevClear, prevAlpha); renderer.autoClear = prevAuto; renderer.shadowMap.autoUpdate = prevShadow;
  const out = new Map();
  for (const { t, off: o, n, g } of pts) {
    const ao = new Float32Array(n), reach = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const k = (o + i) * 4;
      ao[i] = buf[k + 1] > 0.01 ? clamp(buf[k] / buf[k + 1], 0, 1) : 1;
      reach[i] = buf[k + 3] > 0.5 ? clamp(buf[k + 2] / buf[k + 3], 0, 1) : 0;
    }
    out.set(t, { ao, reach });
    g.deleteAttribute('position'); g.deleteAttribute('normal'); g.dispose();
  }
  depthRT.dispose(); accRT.dispose(); depthMat.dispose(); pointMat.dispose();
  return out;
}
