# Apogee

A 1960s orbital spy shooter that copies the look and feel of the 1997 console classics: three missions with
difficulty-dependent objectives, hit-location reactions, alarms, gadgets in a wristwatch menu, all rendered through an
N64-style pipeline (320×240, 3-point filtering, vertex light, fog, dithered 16-bit colour).

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Levels:** ASCII maps of 2 m cells in `src/06_levels.js`, with the legend at the top of `src/04_level.js`. Per-level
  `marks` add objective props, named guards and scenery; `zones` override the ceiling height and floor textures.
- **Debug hook:** `#debug` → `window.AP`. `AP.start(mission, diff)` builds a mission, `AP.sim(seconds)` fast-forwards,
  `AP.freeze()` stops the real-time loop (it keeps drawing) so headless steps stay deterministic. Also `tp(col, row, yaw)`,
  `tpXZ(x, z)`, `look(yaw, pitch)`, `aimAt(x, y, z)`, `press(code)`, `hold(code, s)`, `fire(n)`, `select(id)`, `give(id)`,
  `all()`, `god()`, `peace()`, `killAll()`, `spawn(type, col, row)`, `alarm()`, `useNow()`, `complete()`, `objectives()`,
  `state()`, `reach()`, `audio()`, `render()`, and internals on `AP.f`.
- **Tests (in `source/`):** `node test/smoke.mjs --no-start --steps test/reach.js` checks reachability in all missions; run
  it after any map edit. `test/play1.js` (default mission), `play2.js` (`--mission 1 --diff 2`) and `play3.js`
  (`--mission 2 --diff 2`) complete each mission. `ai.js` checks combat and reinforcements, `anim.js` and `vm.js` take
  screenshots of people and view models, `look1-3.js`, `views.js` and `ui.js` are screenshot tours, `audio.js` plays
  every sound and song. `node test/live.mjs` drives the menus, movement, the watch and both control schemes with real
  key presses.
- **Gotchas:** gameplay delays use `later()` on the game clock, not `setTimeout`. Props register boxes in grid cells.
  A prop that doesn't touch a wall gets an arbitrary facing, so wall-mounted letters (`c k l u A`) need a wall beside
  them. Digits `1`–`4` are raised floors, not marks.
- **Input:** mouse and keyboard, or a gamepad (standard mapping). No touch.
