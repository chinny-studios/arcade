# Act of God

A god's-eye sandbox over a randomly generated modern city, from a crossroads town to a megacity of 20 million.
Fifteen powers of wrath and thirteen of grace; the city lives, panics, sends its fire engines and ambulances, and
reports everything on the news.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.AG`. `AG.start({ size, seed, hour })` makes a city (`size` is `mega`, `metro`,
  `city`, `town` or `small`) and starts play, returning its name, population and counts. `AG.sim(seconds)`
  fast-forwards without drawing, `AG.render()` draws a frame, `AG.cast(id, x, z, size, extra)` uses a power (ids are
  the keys of `AG.PW`; `size` is the slider value 0..1, returns the radius; `part` needs `{ bx, bz }`, hold powers take
  `{ dt }`), `AG.look(x, z, dist, pitch, yaw)` moves the camera, `AG.centre()` gives the main city centre,
  `AG.stats()`, `AG.news()`, `AG.select(id)`, `AG.side('wrath' | 'grace')`, `AG.pick(sx, sy)`, `AG.hideHUD()`.
  Internals on `AG.W` (world), `AG.G` (state), `AG.SIM`, `AG.WATER`, `AG.TR` (traffic), `AG.FX`, `AG.BAT`.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/wrath.js` casts tornado, meteor and volcano;
  `test/wrath2.js` finds a coastal city for quake, sinkhole, smite and tsunami; `test/wrath3.js` does lightning,
  wildfire, locusts, blizzard, plague, a night blackout, hurricane and deluge in a town; `test/grace.js` covers every
  grace power; `test/ui.js --no-start` clicks through the title, dock and menu with pointer events; `test/mobile.js
  --no-start --w 390 --h 844` (and `--w 844 --h 390`) checks phone layouts; `node test/touch.mjs` taps powers and the map with real touch input on an emulated phone; `test/water.js` measures how much of each city's centre is water; `test/gen.js --pretty` generates fifty
  cities and lists them; `test/perf.js` times generation and a step; `test/look.js`, `look2.js`, `look3.js`, `mega.js` are
  screenshot tours. Screenshots land in `test/out/`.
- **Gotchas:** Steps files split by `//--- shot` run as separate evaluations: share values through `out`, and never
  name a variable `c` without declaring it (the canvas has `id="c"`, so a bare `c` is the canvas). Buildings are
  instanced parts: change one by editing its record and calling `bUpdate(b)`, never by touching meshes. Water and
  lava are height fields on the terrain grid (`07_water.js`); the sim sleeps when still, so call `WATER.wake()` after
  editing `WATER.d`. Terrain edits go through `editTerrain` (the outer cells never move). Toasts and the breaking-news
  banner fade on real-time timers.
- **Input:** mouse and keyboard (left click or hold to use a power, right drag turns, wheel zooms, drag with no power
  or Shift pans) and touch (tap or hold to use, two fingers pan, pinch and twist, ✋ to put the power down).
