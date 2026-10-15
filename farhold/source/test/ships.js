FH.mute();
window.__showcase = (mk, n, cols, dist, ry) => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x6a7890);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x404050, 0.8)); const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(3, 5, 2); sc.add(dl);
  for (let i = 0; i < n; i++) { const o = mk(i); o.position.set((i % cols - (cols - 1) / 2) * dist, -Math.floor(i / cols) * dist * 0.7, 0); o.rotation.y = ry; sc.add(o); }
  const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 2000); cam.position.set(0, dist * 0.8, dist * 2.3); cam.lookAt(0, -dist * 0.2, 0);
  FH.R.renderer.render(sc, cam);
};
FH.G.state = 'test'; document.getElementById('hud').style.display = 'none'; FH.render = () => window.__showcase((i) => F.makeShipObject(['shuttle', 'fighter', 'explorer', 'hauler'][i % 4], 1234 + i * 77).root, 8, 4, 20, 0.7);
return 1;
//--- shot ships
