HG.manual(true);
HG.start({ mission: 0, seed: 3 }); HG.peace();
for (const s of HG.G.ships) if (s !== HG.G.player) { s.place(0, 0, 20000 + s.id * 2000, 0); }
HG.G.player.place(0, 0, -30000, 0);
const classes = ['corvette', 'frigate', 'cruiser', 'heavy', 'battlecruiser', 'battleship', 'carrier', 'dreadnought'];
let z = 0;
out.list = [];
for (const team of [0, 1]) {
  let x = 0;
  for (const c of classes) {
    if (team === 0 && c === 'dreadnought') continue;
    const L = HG.CLASSES[c].len;
    out.list.push(HG.spawn(c, team, x + L / 2, team * 700, 0, 90));
    x += L * 1.25;
  }
}
HG.spawn('transport', 0, -400, 0, 0, 90); HG.spawn('station', 0, -1400, 0, 0, 0);
HG.cam([2400, 900, -2600], [2400, 300, 0]); HG.run(0.1); HG.render();
//--- shot models_side
HG.cam([2400, 1800, 1900], [2400, 300, 0]); HG.render();
//--- shot models_top
HG.cam([700, 260, -520], [600, 0, 0]); HG.render();
//--- shot model_cruiser
HG.cam([1900, 960, -640], [1700, 700, 0]); HG.render();
//--- shot model_heg
HG.cam([-1400, 500, -1200], [-1100, 0, 0]); HG.render();
//--- shot model_station
