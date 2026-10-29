# Highguard

Capital ship battles in orbit above the city world Aster, inspired by a film's opening space battle. The player
captains one Concord warship per mission (light cruiser, heavy cruiser, battlecruiser) in a six-mission campaign
against the Hegemony: broadside batteries aimed with a free-look sight, bow guns, torpedoes, automatic flak, four
shield facings, targetable subsystems, and fighter and bomber squadrons launched from the hangar with orders.

- **Read first:** `source/DESIGN.md` (module contract, rules, numbers, mission format).
- **Build:** `cd source && python3 build.py`, which writes `../index.html` and runs `node --check` on the bundle.
- **Debug hook:** `#debug` → `window.HG`. `HG.start({ mission, seed, noPlayer })` (mission is an index or an id such as
  `'admiral'`), `HG.sim(seconds, dt)` fast-forwards without effects, `HG.run(seconds)` steps with effects (for
  screenshots), `HG.render()`, `HG.manual(true)` stops the real-time loop so a test owns the clock. Player:
  `tp(x, y, z, yaw)`, `helm(thrIdx, yawCmd, pitchCmd)`, `aimAt(ship, sub)` (camera on the lead point), `fire()`,
  `reload()`, `torp()`, `target(ship, sub)`, `shields(facing)`, `squad(i, kind, target)`, `look(yawDeg, pitchDeg, dist)`,
  `cam([x,y,z], [x,y,z])` (fixed camera; `cam()` to release), `god()`. Ships: `ships()`, `me()`, `find(name)`,
  `enemy(i)`, `ally(i)`, `place(ship, dist, bearingDeg, elevDeg, yawDeg)` relative to the player, `spawn(cls, team, x,
  y, z, yaw)`, `peace()` (every AI stops), `killAll(team)`. Internals: `HG.mission`, `HG.combat`, `HG.pc`, `HG.hud`,
  `HG.ui`, `HG.G`, `HG.Fx`, `HG.Craft`.
- **Tests (in `source/`, all `--no-start`):** `node test/smoke.mjs --no-start --steps test/balance.js` (every mission
  with an AI captain in the player's ship: time, result, hull, grade), `test/admiral.js` (disable the dreadnought,
  the shuttle docks, the timer runs out), `test/flow.js` (campaign screen, a lost ship, results, unlocking),
  `test/inputs.js` (real DOM key and mouse events through the menus and controls), `test/broadside.js` and
  `test/look.js` (screenshots of a player volley), `test/models.js` (every hull class side by side), `test/perf.js`
  (update and draw cost in the biggest battle). Screenshots land in `test/out/`.
- **Gotchas:** SwiftShader draws a frame every few hundred ms, so input tests must wait for real frames between key
  presses (see `frames()` in `inputs.js`), and steps files can't share `const`s across `//--- shot` segments (use
  `out.x`). The real-time loop also keeps running unless `HG.manual(true)`. Port is +x in ship space. A craft
  launched inside its own hull is spared collision for its first 3 s (`age`). Pointer-lock loss pauses the game
  except under `#debug`.
- **Input:** mouse and keyboard only (pointer lock; without it the camera still follows the cursor).
