FH.mute(); FH.sim(1);
const scene = FH.R.scene, cam = FH.R.camera;
cam.updateMatrixWorld();
const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
const cat = {};
scene.traverseVisible((o) => {
  if (!o.isMesh && !o.isPoints && !o.isLineSegments) return;
  const g = o.geometry; if (!g) return;
  let tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  if (o.isInstancedMesh) tris *= o.count;
  let k = o.material && o.material.customProgramCacheKey ? o.material.customProgramCacheKey() : o.material.type;
  if (o.geometry.attributes.pl) k = 'terrain';
  if (o.geometry.attributes.wdep) k = 'water';
  if (o.geometry.attributes.sw) k = o.geometry.attributes.position.count > 0 && o.geometry.boundingSphere && o.geometry.boundingSphere.radius < 100 ? 'flora' : 'flora';
  g.boundingSphere || g.computeBoundingSphere();
  const s = g.boundingSphere.clone().applyMatrix4(o.matrixWorld);
  const vis = o.frustumCulled === false || fr.intersectsSphere(s);
  cat[k] = cat[k] || { n: 0, tris: 0, visN: 0, visTris: 0 };
  cat[k].n++; cat[k].tris += tris; if (vis) { cat[k].visN++; cat[k].visTris += tris; }
});
const t0 = performance.now(); for (let i = 0; i < 5; i++) FH.render(); const rt = (performance.now() - t0) / 5;
const t1 = performance.now(); FH.sim(1); const st = (performance.now() - t1) / 30;
return { cat, renderMs: rt, stepMs: st, info: FH.stats() };
