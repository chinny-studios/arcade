// the Kowloon Park side of Nathan Road, opposite Milton Mansion: single-storey shops with the park above
const d = NR.W.LP.miltonDoor; NR.tp(d[0] - 1.5, d[1] + 2); NR.lookAt(-60, 3, -10); NR.sim(1); NR.render();
const near = NR.W.buildings.filter(b => b.cx < -40 && b.cx > -90 && b.cz > -300 && b.cz < 130 && !b.custom).map(b => [b.cx | 0, b.cz | 0, b.h]);
return { tallest: Math.max(...near.map(b => b[2])), near };
//--- shot park_from_milton
NR.cam(-30, 30, 60, -70, 0, -60); NR.render();
//--- shot park_aerial
NR.go('mosque'); NR.sim(0.5); NR.render();
//--- shot park_mosque
