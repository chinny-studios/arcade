# Revenant Protocol

A 1995-style first-person shooter in the sector-engine tradition: four missions, keycards, lifts, ten weapons with alt fire, an automap and a boss.

- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Levels:** ASCII maps with a per-level legend in `src/06_levels.js`. Format notes are at the top of `src/05_level.js`.
  Enemies are sprites baked from low-poly models in eight directions (`07_sprites.js`).
- **Debug hook:** `#debug` → `window.RP` with `start(mission, diff)`, `sim(seconds)`, `tp(col, row, yaw)`, `look(yaw, pitch)`,
  `press`/`hold(code)`, `fire()`, `give(id)`, `all()` (every weapon and key), `god()`, `peace()`, `killAll()`, `shot()`
  (render a frame), `complete()`, `state()` and `reach()`.
- **Tests (in `source/`):** `node test/smoke.mjs --no-start --steps test/reach.js` checks that every key, switch, goal and
  exit is reachable in all four missions. Run it after any map edit. `test/play1.js`, `plat.js`, `boss.js`, `ai.js` and
  `flow.js` drive the game, and `look*.js` take screenshots (`--mission N` picks the mission).
- **Input:** mouse and keyboard, or twin-stick touch (`14_touch.js`).
