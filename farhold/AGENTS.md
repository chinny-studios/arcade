# Farhold

A seamless procedural universe in the spirit of No Man's Sky: crash-land, mine and craft, fly from surface to orbit with no loading screen, trade at stations, scan fauna, build a base and warp toward the core.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`. Terrain is built in workers (`02_kernel.js`).
- **Debug hook:** `#debug` → `window.FH`. `FH.start({ seed })` begins a journey, `FH.sim(seconds)` fast-forwards,
  `FH.give(id, n)`, `FH.tpPlanet(i, lat, lon)`, and `FH.stream()` builds the surroundings synchronously (call it after a
  teleport). Also `press`, `hold`, `click`, `look`, `aimAt`, `nearest(kind)`, `god()`, `free()`, `render()`, `stats()`, and
  internals on `FH.f` (`arriveSystem`, `boardShip`, `tryTakeoff` …).
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/loop.js` runs the opening on-foot loop headless. Other step
  files are `flight.js` (take-off → orbit → docking → trade → warp), `systems.js`, `planets.js`, `views.js`, `ui.js` and
  `perf.js`. `live.mjs` runs real time with worker terrain.
- **Input:** mouse and keyboard, or a gamepad (standard Gamepad API). No touch.
