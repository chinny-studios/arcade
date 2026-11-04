# The Keeper's Errand

An isometric island adventure in the style of the mid-90s classics, with an original world, hero, story, art and
music. Wick, a young lighthouse keeper on Brindle Isle, takes the lighthouse back from Baron Halcyon Plume, a sky-baron
who "bought the weather" and put a Storm Engine where the lamp was. Four modes (Normal, Sporty, Aggressive, Sneaky), a
bouncing tide-pebble, an outdoor island with an isometric follow camera, and interiors with fixed camera cuts.
three.js r128, vendored; all models built from primitives in code; all music and sound synthesized.

- **Read first:** `source/DESIGN.md` (the story, quest flags, module map, coordinates and camera rules).
- **Build:** `cd source && python3 build.py`, which writes `../index.html` and runs `node --check` on the bundle.
- **Files:** `01_core` (helpers, noise, `G` state, save, `Timers`, area registry), `02_input`, `03_audio`, `04_render`
  (renderer, sky presets, camera rig, `Fader` for buildings in the way), `05_models` (`Batch` merger, `PROPS`, `makeChar`,
  `animChar`), `06_island` (height field `ISLE.H`, landmarks `ISLE.P`, roads), `07_outdoor` (the island area), `08_interiors`
  (every room), `09_world` (collision, doors, interactables, `enterArea`/`goArea`), `10_hero`, `11_pebble`, `12_actors`
  (islanders, Tickers, crabs, breakables, pickups, push crate, targets), `13_fx`, `14_dialog`, `15_boss`, `16_story`
  (dialogue, flags, populate functions, cutscenes), `17_hud` (HUD, menus, map, touch), `20_main` (loop and `#debug` hook).
- **Debug hook:** `#debug` → `window.KE` (wait for `KE.ready`). `KE.start({ area, at: [x, z, ry], flags, items, mode, intro })`
  starts a game (`intro: true` runs the real New Game), `KE.sim(sec)` fast-forwards, `KE.render()` snaps the camera and draws,
  `KE.walkTo(x, z)` and `KE.jumpTo(x, z)` drive the hero's own controller, `KE.talk(id, choice)` and `KE.finishDialog(choice)`
  click through dialog, `KE.tp(area, x, z)`, `KE.give(item)`, `KE.flag(k)`, `KE.mode(m)`, `KE.press(action)`, `KE.use()`,
  `KE.god()`, `KE.peace()`, `KE.ents()`, `KE.state()`, and internals on `KE.f` (`W`, `Hero`, `Story`, `Boss`, `OUT`, `ISLE` …).
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/play.js` plays the whole story with the hero's controller (about
  4 minutes on SwiftShader) and prints each chapter. `look.js` (title, island, village, cottage), `look2.js` (boss phases),
  `look3.js` (sunny ending), `boss.js` (both boss phases, every throw style), `ui.js` (title, pause, continue, map) and `look4.js --w 390 --h 800` (touch UI). Screenshots land in
  `test/out/`. Steps segments get `KE`, `F` (= `KE.f`), `H` (the hero), `S()`, `say(choice)` and `log`.
- **Gotchas:** every area is built at the origin and only the current one is visible; positions are per area. Door boxes must
  sit where the hero's collider can reach them, and arrival points must be outside every door box (doors also have a 0.5 s
  grace after arriving). `KE.sim()` doesn't move the camera: call `KE.render()` before a screenshot. Guards in the records room
  catch you rather than fight; the boss core is a separate pebble target wider than the engine's collider.
- **Input:** keyboard and mouse (WASD, Space mode action, E use, F or click throw, 1-4/Tab modes, H tonic, M map, Esc pause),
  gamepad (standard mapping) and touch (joystick plus buttons). Save data in `localStorage` under `keepers-errand-save-v1`.
