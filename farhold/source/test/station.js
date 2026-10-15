FH.mute();
F.boardShip(); S.state = 'flight';
F.shipChangeFrame(null);
const st = FH.STATION;
S.pos.copy(st.obj.localToWorld(new THREE.Vector3(260, 140, -700)));
const look = st.pos.clone().sub(S.pos).normalize();
S.q.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), look)); S.camQ.copy(S.q); S.speed = 0; S.vel.set(0, 0, 0);
FH.sim(0.2); S.speed = 0;
return 1;
//--- shot st_ext
F.dockInstant(); F.exitShip(); FH.sim(0.3);
P.pos.set(20, 0.5, -10); FH.sim(0.5);
FH.aimAt(new THREE.Vector3(-10, 6, 40));
FH.sim(0.1);
return { frame: P.frame.kind, y: P.pos.y };
//--- shot st_int
P.pos.set(0, 3.1, 30); FH.sim(0.5);
FH.aimAt(new THREE.Vector3(0, 4, 44)); FH.sim(0.1);
return 1;
//--- shot st_deck
