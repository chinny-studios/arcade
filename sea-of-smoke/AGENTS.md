# Sea of Smoke

Fleet battles under sail in the style of World of Warships, set among Caribbean pirates around 1715: seven ships a
side (sloop, fireship, brigantine, frigate, two men-o'-war) fight for capture points with forts, in a third-person
chase camera with a spyglass. Broadsides with round, chain and grape shot, fires and leaks, boarding and capture,
fire rafts and smoke screens, fog banks and a squall. Three maps, about nine minutes a battle, no progression.

- **Read first:** `source/DESIGN.md` (module contract, rules, numbers).
- **Build:** `cd source && python3 build.py`, which writes `../index.html` and runs `node --check` on the bundle.
- **Debug hook:** `#debug` → `window.SS`. `SS.start({ cls, map, seed, countdown, noPlayer, fleet, squallAt })` starts a
  battle (countdown 0 by default), `SS.sim(seconds, dt)` fast-forwards without effects, `SS.run(seconds)` steps with
  effects (for screenshots), `SS.render()`, `SS.manual(true)` stops the real-time loop so a test owns the clock.
  Player: `tp(x, z, h)`, `helm(tele, rudder)`, `aim(yaw, dist)`, `aimAt(ship)` (perfect lead), `fire()`, `weapon(i)`,
  `look(yaw, dist, zoom)`, `god()`. Ships: `ships()`, `me()`, `enemy(i)`, `ally(i)`, `place(ship, dist, bearing, h)`
  relative to the player, `broadside(shooter, target)`, `peace()` (freezes every bot with sails furled), `killAll(team)`,
  `squall(on)`. Internals: `SS.match`, `SS.world`, `SS.combat`, `SS.pc`, `SS.hud`, `SS.ui`, `SS.input`, `SS.G`.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/player.js` (broadside, chain shot, boarding and capture,
  repair, squall), `--start '{"cls":"fireship"}' --steps test/fireship.js` (fire rafts, smoke screen, ramming),
  `--steps test/play.js` and `test/full.js` (a battle on fast forward), `--no-start --steps test/balance.js` (AI-only
  battles on every map: length, result, losses), `test/flow.js` (sink, spectate, skip to results), `test/inputs.js`
  (real DOM key and mouse events), `test/visual.js` and
  `test/look.js` (fort, fog bank, spyglass, port, results screenshots). Screenshots land in `test/out/`.
- **Gotchas:** SwiftShader runs the real-time loop at a few frames a second, so a test that waits in real time sees
  little game time; use `sim` or `run`, or `manual(true)`. `peace()` must also furl sails: bots set sail on the first
  real frame after `start`. Ship heading h points the bow along (sin h, cos h), and increasing h turns to port.
  Enemies nobody on your side has spotted are not drawn (`model.root.visible`), like the original.
- **Input:** mouse and keyboard (pointer lock), or a gamepad (standard mapping). No touch.
