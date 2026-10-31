// A tileable 64^3 RGBA noise volume. Every procedural surface in the game samples it in object space, so
// nothing needs UVs: R and G are independent gradient noise (8 cells per tile), B is finer gradient noise
// (16 cells), A is Worley F2-F1 (8 cells), which is 0 on cell borders and makes crackle and crazing.
function makeNoise3D(N = 64) {
  const data = new Uint8Array(N * N * N * 4);
  const perm = new Uint8Array(512);
  const r = mulberry(9127);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const G3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],[1,1,0],[0,-1,1],[-1,1,0],[0,-1,-1]];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const md = (a, P) => ((a % P) + P) % P;
  function perlin(x, y, z, P, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const g = (a, b, c, dx, dy, dz) => {
      const h = perm[perm[perm[(md(xi + a, P) + seed) & 255] + md(yi + b, P)] + md(zi + c, P)] & 15;
      const q = G3[h]; return q[0] * dx + q[1] * dy + q[2] * dz;
    };
    const n000 = g(0, 0, 0, xf, yf, zf), n100 = g(1, 0, 0, xf - 1, yf, zf), n010 = g(0, 1, 0, xf, yf - 1, zf), n110 = g(1, 1, 0, xf - 1, yf - 1, zf);
    const n001 = g(0, 0, 1, xf, yf, zf - 1), n101 = g(1, 0, 1, xf - 1, yf, zf - 1), n011 = g(0, 1, 1, xf, yf - 1, zf - 1), n111 = g(1, 1, 1, xf - 1, yf - 1, zf - 1);
    return lerp(lerp(lerp(n000, n100, u), lerp(n010, n110, u), v), lerp(lerp(n001, n101, u), lerp(n011, n111, u), v), w);
  }
  // Worley feature points, one per cell
  const WP = 8, fp = new Float32Array(WP * WP * WP * 3);
  for (let i = 0; i < WP * WP * WP; i++) { fp[i * 3] = r(); fp[i * 3 + 1] = r(); fp[i * 3 + 2] = r(); }
  function worley(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let f1 = 9, f2 = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const cx = xi + a, cy = yi + b, cz = zi + c;
      const k = (md(cx, WP) + md(cy, WP) * WP + md(cz, WP) * WP * WP) * 3;
      const dx = cx + fp[k] - x, dy = cy + fp[k + 1] - y, dz = cz + fp[k + 2] - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    return f2 - f1;
  }
  let o = 0;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = x / N, fy = y / N, fz = z / N;
    data[o++] = clamp(128 + 190 * perlin(fx * 8, fy * 8, fz * 8, 8, 0), 0, 255);
    data[o++] = clamp(128 + 190 * perlin(fx * 8 + 0.5, fy * 8, fz * 8, 8, 91), 0, 255);
    data[o++] = clamp(128 + 190 * perlin(fx * 16, fy * 16, fz * 16, 16, 173), 0, 255);
    data[o++] = clamp(worley(fx * WP, fy * WP, fz * WP) * 2.2 * 255, 0, 255);
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false; tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}
