# Creature Feature

A third-person monster hunt in a 1950s small town (Pine Hollow, 1957). Pick the vampire, the werewolf, Frankenstein's
monster or the mummy and stalk the townsfolk: they notice you by lamplight and sound, scream, run for houses (and
bolt the door), jump in cars and drive out of town, freeze, trip and faint. Endless score attack: hunger drains
faster as the night goes on, kills and feeding refill it, chained kills build a combo. Deliberately gory (an option
cuts the blood back).

- **Read first:** `source/DESIGN.md` (module map, rules, numbers).
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.CF`. `CF.start({ monster, empty, god })` starts a throwaway run (never saved, the
  monster already risen, no title card or tips; `empty` skips the townsfolk). `CF.sim(seconds)` fast-forwards without
  rendering, `CF.render()`, `CF.tp(x, z, y)`, `CF.face(yaw)`, `CF.aimAt(personOrPoint)` turns monster and camera to it,
  `CF.press(action)` (`atk`, `a1`, `a2`, `jump`, `use`), `CF.hold(actions, seconds, move)` holds actions and a stick
  vector `{x, y}` (y −1 is forward), `CF.spawn(type, x, z, o)`, `CF.nearest(states)`, `CF.counts()`, `CF.god()`,
  `CF.hideHUD()`, `CF.stats()`. `CF.P` is the monster; internals on `CF.f` (`startRun`, `killPerson`, `startle`,
  `breakRefuge`, `parkCar`, `smashCar`, `stomp`, `howl`, `aimTarget`, `supportY`, `losClear`, `lightAt` …).
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/powers.js` tries every power (hypnotise and bite, bat
  and swoop, pounce, lash, throwing a car, breaking a door). `test/kills.js` checks each monster's attack;
  `test/kills2.js` screenshots claw, stomp and sandstorm; `test/play.js` is a long god-mode hunt logging the town's
  reaction; `test/balance.js` has a crude bot hunt on foot with each monster until hunger runs out; `test/inputs.js`
  sends real DOM key, mouse and mocked gamepad events; `test/ui.js --no-start` clicks through title, select, title
  card and THE END; `test/look.js` reports draw calls; `test/mobile.js --w 844 --h 390` shows the touch layout.
- **Gotchas:** The town is static and built once at boot; a new run calls `resetTown()` (re-parks every car from
  `TOWN.carSpecs`, relights lamps, restores props and doors). Town geometry is merged per 100 m chunk, so change a
  building by editing `05_town.js`, not meshes. Doors, lamp heads, light pools and props are instanced: hide one by
  writing a zero-scale matrix. Yaw 0 faces −z everywhere (`yawOf`, `fwdX/fwdZ`), and rigs use rotation order YXZ so
  tilts happen in the body's own frame. Test placements must be on open ground: Main Street is z = 0, avenues are at
  x = ±30, ±90, ±150; a person spawned inside a shop can't be seen or reached. Under `#debug` the game never asks for
  pointer lock and doesn't pause when it's lost.
- **Input:** mouse and keyboard (pointer lock), gamepad (standard mapping) and touch (stick, drag to look, buttons).
