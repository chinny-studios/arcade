// Pirates, menus and the title
FH.mute();
FH.give('ferrite', 120); FH.give('carbon', 80); FH.give('oxygen', 40); FH.give('sodium', 60); FH.give('dihydro', 50); FH.give('copper', 30); FH.give('gold', 12);
FH.UI.open('inventory'); FH.UI.tab = 'suit'; FH.UI.sel = { inv: 'suit', i: 1 }; FH.UI.render();
return FH.UI.cur;
//--- shot inv
FH.UI.tab = 'tech'; FH.UI.render(); return 1;
//--- shot invtech
FH.UI.tab = 'craft'; FH.UI.render(); return 1;
//--- shot invcraft
FH.UI.close(); FH.UI.open('quick'); return 1;
//--- shot quick
FH.UI.close(); FH.UI.open('build'); return 1;
//--- shot build
FH.UI.close(); FH.UI.sel = null; FH.F && 0; FH.UI.open('log'); return 1;
//--- shot log
FH.UI.close(); FH.UI.tab = null; FH.UI.open('pause'); return 1;
//--- shot pause
FH.UI.close();
// pirates in space
FH.give('ferrite', 250); FH.give('carbon', 60); FH.give('dihydro', 200);
F.repairTech('scanner'); F.craft('plate', 3); F.craft('seal', 1); F.craft('jelly', 1);
F.repairTech('thrusters'); F.recharge('lift'); F.repairTech('pulse');
F.boardShip(); FH.press('Space'); FH.sim(3);
F.shipChangeFrame(null);
S.pos.add(new THREE.Vector3(0, 9000, 0)); S.state = 'flight'; S.speed = 200;
FH.QUEST.flags.station = true;
F.spawnPirates(3);
FH.sim(1);
const p0 = FH.PIRATES.list[0];
let fired = 0, n = 0;
while (FH.PIRATES.list.some((p) => p.alive) && n < 30 * 40) {
  const t = FH.PIRATES.list.find((p) => p.alive);
  const d = t.pos.clone().sub(S.pos).normalize();
  S.q.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), d)); S.speed = 150;
  FH.Input.m.b[0] = true; FH.sim(1 / 30); n++;
}
FH.Input.m.b[0] = false;
return { secs: n / 30, left: FH.PIRATES.list.filter((p) => p.alive).length, hull: Math.round(S.cur.hull), shield: Math.round(S.cur.shield), units: P.units };
//--- shot pirates
