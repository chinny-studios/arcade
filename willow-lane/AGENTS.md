# Willow Lane

A life simulation on one leafy street: create a family, move into a starter cottage or build from scratch, keep their
needs up, find jobs, make friends, fall in love, raise children and grow old. Build and buy modes, free will, careers,
school, visitors and gibberish voices.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.WL`. `WL.start({ preset, lot, seed, hour })` starts a family (preset index into
  `WL.PRESETS`, lot `'starter'` or `'empty'`; sound is muted), `WL.sim(minutes)` fast-forwards game minutes,
  `WL.act(i, type|obj, interactionId, arg)` queues an object interaction for household member `i`,
  `WL.social(i, j|sim, socialId)` queues a social, and `WL.needs(i, v|{need: v})`, `WL.time(day, hour)`, `WL.give(n)`,
  `WL.place(type, x, z, r)`, `WL.visitor()`, `WL.cam(tx, tz, dist, yaw)`, `WL.hideUI()`, `WL.render()` and `WL.stats()` do what
  they say. Internals are on `WL.f` (`setMode`, `setTool`, `buildPointer`, `pieFor`, `ageUp`, `passAway`, `startFire`,
  `saveGame`, `loadGame`, `VEH` …). Interaction ids are the keys of `WL.IX`, socials of `WL.SOCIAL`.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/systems.js` cooks, chats, sends a sim to work and a child to
  school, hosts a visitor, has a baby and ages a child up. `life.js` covers a wedding with a neighbour, a fire and old
  age; `build.js` builds a shed with the real tools, buys a fridge, undoes and round-trips a save; `kid.js` logs a child's
  afternoon alone; `soak.js` lets free will run the family for a week and reports daily moods, accidents and messes;
  `visual.js`, `night.js`, `mobile.js` (with `--w 390 --h 844` or `--w 844 --h 390`) and `menus.js` / `cas.js` (with
  `--no-start`) are screenshot tours; `party.js` checks wants and a party. `node test/live.mjs` drives the menus, pie menus,
  camera and build/buy with real mouse and keyboard input.
- **Gotchas:** the frame loop stops the clock in buy and build mode (`WL.sim()` still advances it). The `WL.render()` used before screenshots renders the CAS scene while Create-a-Sim is open.
  Steps segments split by `//--- shot` don't share `const`s; the runner predefines `G`, `F` and `S` (the household) and
  `out` carries values across segments.
- **Input:** mouse and keyboard, or touch (tap, drag to pan, pinch and twist). No gamepad.
