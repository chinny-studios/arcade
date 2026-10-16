document.querySelector('#banner').style.visibility = 'hidden';
RA.time(13); RA.go('circus'); RA.sim(1);
const S = RA.W.circus.F;
RA.cam(S.wx(-40, -20), S.y + 4, S.wz(-40, -20), S.wx(-60, -55), S.y + 10, S.wz(-60, -55)); RA.render();
//--- shot t_stands
const S = RA.W.circus.F; RA.cam(S.wx(-40, -44), S.y + 9, S.wz(-40, -44), S.wx(-50, -56), S.y + 14, S.wz(-50, -56)); RA.render();
const pts = RA.W.seatPts.filter((p) => p.circus).slice(0, 5).map((p) => [p.y.toFixed(2), RA.f.surfaceAt(p.x, p.z, p.y + 0.3).toFixed(2)]);
return pts;
//--- shot t_stands2
