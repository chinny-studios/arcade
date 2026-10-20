# Tidebound

A short monster-collecting RPG in the style of the GBA handheld classics, with original monsters (Tidelings), names
and art. Coastal islands: Shellport → Route 1 → Tidewater Cave → Route 2 → Lumen City (gym, lighthouse). Pick a
starter, beat your rival, catch Tidelings, earn the Wave Badge, then the final rival battle and credits; the legendary
Lumarine waits post-game at the top of the lighthouse. Plain canvas 2D at 320x180, no libraries, all art drawn from
pixel strings in code and all music synthesized.

- **Read first:** `source/DESIGN.md`. It is the module contract: every file's API, the data shapes (species, moves,
  items, monster instances), the map format and the story. Keep it in sync when an API changes.
- **Build:** `cd source && python3 build.py`, which writes `../index.html` and runs `node --check` on the bundle.
- **Files:** `01_core` (canvas, input, scenes, timers, G state, save), `02_font`/`03_ui` (bitmap font, dialog, menus),
  `05_audio`, `10`–`15` data and `Mon` helpers, `18`/`19` monster pixel art (`MON_ART`), `20_monsprites`,
  `21_tiles`, `22_chars`, `30_world`/`31_script` (overworld, `Maps.def`, script helpers), `40`–`42` battle and
  evolution, `50_menus`/`51_title`, `60`–`65` maps, `69_story`, `90_main`.
- **Debug hook:** `#debug` → `window.TB`. Nothing starts until `TB.start({ starter, lv, map, x, y })` (no starter →
  a fresh game in the bedroom). `TB.sim(sec)` fast-forwards, `TB.tap(btn)`, `TB.step(dir, n)` walks with simulated
  input, `TB.tp(map, x, y)`, `TB.give(item, n)`, `TB.giveMon(sp, lv)`, `TB.boost(lv)`, `TB.battle(sp, lv)`,
  `TB.choose(i)` answers the open menu, `TB.dialogText()`, `TB.scenes()`, `TB.where()`, `TB.flags()`, and module
  objects (`TB.world`, `TB.menus`, `TB.title`, `TB.sprites`, `TB.tiles`, `TB.data`, `TB.checkData()`).
  `TB.autoText` makes dialogs instant, `TB.autoBattle` plays battles (strongest move, no nicknames),
  `TB.noEncounters` turns off wild encounters.
- **Tests (in `source/`):** `node test/smoke.mjs --start '{}' --steps test/play.js` plays the whole story from the
  bedroom to Lumarine with a pathfinding driver and prints the flags it reached. `test/battle.js` runs one wild
  battle, `test/look.js` screenshots every map, `test/menus.js` the title and menus. Screenshots land in `test/out/`.
- **Gotchas:** all files share one scope, so private helpers live in IIFEs. Map rows may be run-length encoded
  (`'T2.15G7'`). `shore_X` tiles are water with sand on side X. Edge warps fire when walking off the map from that
  tile; door warps when stepping onto the door. `World.enter()` runs the map's `onEnter`, so it must be safe on load.
  Battle does not set trainer flags or handle blackout: `Script.trainerBattle` and the encounter code do.
- **Input:** keyboard (arrows/WASD, Z/Space/Enter = A, X/Shift = B and run, Esc/Tab = START), on-screen D-pad and
  buttons on touch screens, gamepad (standard mapping).
