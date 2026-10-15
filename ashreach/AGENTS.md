# Ashreach

Offline sci-fi MMO homage: 4 breeds, 14 professions, nano programs, implants, tab-target combat, mission terminals, six zones and two dungeons to level 50, with simulated players.

- **Read first:** `source/DESIGN.md` (game design) and `source/API.md` (module contracts). It is the largest game here (30 modules).
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.AR`. Wait for `AR.ready`. `AR.quick('medic')` starts a character, `AR.sim(seconds)`
  fast-forwards, `AR.manual(true)` pauses the frame loop, so you step with `AR.tick(dt)` and `AR.render()`. Also `changeZone`,
  `spawnMob(tpl, level, x, z)`, `setTarget`, `startAttack(attacker, target)`, `castNano`, `giveXp`, `makeItem`, `addItem`,
  `equip`, `tp(x, z)`, `setTimeOfDay(0–1)`, `ents(kind)`, `CAM`, `PLAYER`, `ZONE_DEFS` and `MOB_T`.
- **Tests (in `source/`):** `node test/smoke.mjs` (headless page check). Pure-module tests run without a browser through
  `test/load.mjs`: `stats_test`, `items_test`, `nanos_test`, `missions_test` and `audio_test`. `sim_test.mjs` exercises the
  simulated-player population, `play.mjs` is a real-input playthrough, and `world_shots`/`ui_shots`/`models_shots` render
  the viewer pages (`test/*_view.html`) for visual review.
- **Gotchas:** `#fps` shows a debug stats line under `#debug`. Zone titles fade in over the view on arrival.
- **Input:** keyboard and mouse only (no touch).
