SH.start({ map: 'lexington' }); SH.sim(3);
const cam = SH.camera; cam.updateMatrixWorld(); const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
const rows = {};
SH.scene.traverse((o) => {
  if (!o.isMesh || !o.visible) return;
  let p = o; while (p) { if (!p.visible) return; p = p.parent; }
  if (o.frustumCulled && !fr.intersectsObject(o)) return;
  const g = o.geometry, tri = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1) * (g.isInstancedBufferGeometry ? g.instanceCount : 1);
  const key = o.isInstancedMesh ? 'inst:' + g.attributes.position.count + (o.castShadow ? ':sh' : '') : o.type + ':' + (g.type) + ':' + g.attributes.position.count;
  rows[key] = rows[key] || [0, 0]; rows[key][0]++; rows[key][1] += Math.round(tri);
});
return Object.entries(rows).sort((a, b) => b[1][1] - a[1][1]).slice(0, 24).map(([k, v]) => k + ' calls=' + v[0] + ' tris=' + v[1]);
