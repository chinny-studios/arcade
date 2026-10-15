RP.god(); RP.peace();
const pl = RP.LV.plats[0];
RP.tp(36, 25, -Math.PI / 2); RP.P.z = 52;
let n = 0; while (!(pl.ox < 0.01 && pl.hold > 1.2) && n++ < 600) RP.sim(1 / 30);
for (let i = 0; i < 12; i++) { RP.hold('KeyW', true); RP.sim(1 / 30); }
RP.hold('KeyW', false); RP.sim(0.3);
const on = { x: RP.P.x / 2, y: RP.P.y, onPlat: !!RP.P.onPlat };
n = 0; while (pl.ox < 3.99 && n++ < 600) RP.sim(1 / 30);
for (let i = 0; i < 20; i++) { RP.hold('KeyW', true); RP.sim(1 / 30); }
RP.hold('KeyW', false); RP.sim(0.2);
return { on, after: { x: RP.P.x / 2, y: RP.P.y, cell: RP.state().cell } };
