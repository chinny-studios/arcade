# Copter City

A 1996-style city helicopter sim: answer dispatch calls (fires, medevac, passengers, jams, getaway cars, rooftop and
flood rescues, a ship fire, chemical spills, tornadoes, earthquakes) with a water bucket, rope ladder, searchlight,
megaphone and tear gas, across a five-city career with six helicopters, or in free flight.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.CC`. `CC.start({ city, heli, hour, money, free, dispatch, flight })` starts a
  throwaway career (never saved, every city unlocked, no calls unless `dispatch: true`). `CC.sim(seconds)`
  fast-forwards, `CC.render()` draws a frame, `CC.tp(x, z, alt, yaw)` puts the helicopter `alt` metres above whatever is
  below (0 lands it, and sets the pad it's on), `CC.fly(x, z, alt, { land, max })` flies there on the autopilot,
  `CC.hold(inputs, seconds)` holds flight inputs (`fwd`, `turn`, `strafe`, `lift`; sim: `roll`, `pedal`, `coll`),
  `CC.call(type, o)` starts a call (types are keys of `CC.CALL`; returns the call), `CC.press(action)`, `CC.god()`,
  `CC.hideHUD()`, `CC.stats()`. Internals on `CC.f` (`startCity`, `selectEquip`, `useEquip`, `exitHeli`,
  `switchHeli`, `buyHeli`, `damageHeli`, `igniteBuilding`, `nearestPad`, `surfaceY`, `roofBelow`, `isWaterAt` …) and
  `CC.G.ap = { x, z, alt, land, exact }` drives the autopilot directly. `CC.G.dmgLog` lists recent damage.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/calls.js` plays medevac, passenger and jam in Dover.
  `test/fire.js` flies bucket trips to put out a fire. `test/calls2.js --start '{"city":"halley","heli":"raptor"}'`
  does a car chase, a rooftop rescue and the ship. `test/calls3.js` with `--start '{"city":"metro","heli":"raptor"}'`
  (or granite, sunset) does riot, flood, spill, tornado and quake. `test/collide.js` (with `--start '{"city":"metro"}'`) checks that walls stop every helicopter's rotor tips, fast flight doesn't tunnel, and cars, the pilot, the bucket, the ladder and the ship collide. `test/systems.js` covers sim flight, audio and the
  radio, on foot, a crash and draw calls; `test/soak.js` runs live dispatch for ten minutes; `test/ui.js --no-start`
  clicks through the menus and the hangar; `test/visual.js` is a screenshot tour; `test/mobile.js` (with `--w 390 --h
  844` or `--w 844 --h 390`) checks phone layouts; `test/pad.js` mocks a gamepad. `node test/live.mjs` uses real key
  presses. `--pretty` prints results indented.
- **Gotchas:** Steps files split by `//--- shot` run as separate evaluations: share helpers through `out`. The
  autopilot is for tests and can clip towers at street level in Metro Heights; teleport close first. Toasts and
  speech bubbles fade on real-time timers, so they linger in `sim()` screenshots. Bucket filling needs the bucket's
  bottom below the water line (hover about 8–9 m over water). Buildings are merged per chunk: change one with
  `burnDown(B)` or by editing its record and calling `rebuildChunk(B.chunk)`, never by touching meshes.
- **Input:** keyboard and mouse, gamepad (standard mapping) and touch (stick, climb/descend, strafe and tap buttons).
