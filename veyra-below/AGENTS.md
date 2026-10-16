# Veyra Below

Dark sci-fi action RPG with an isometric camera. You board the colony ship Meridian, recruit up to three AI wardens and
teleport down to the planet Veyra: four areas (Verdant Reach, Cinder Hollows, Deepworks, the Sunken Nave), two
procedural floors each plus a boss arena, and four difficulties (Initiate, Veteran, Ascendant, Apex).

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.VB`. `VB.start({ name, role, race, level, allies, area, floor, diff, seed })` makes a
  throwaway character (never saved) and boards the ship, or goes straight to a floor when `area` is given.
  `VB.sim(seconds)` fast-forwards without rendering, `VB.render()` draws one frame. Also `tp(x, z)`, `toRoom(i)`,
  `spawn(id, dx, dz, opts)`, `give(kind, id, n)` (`'tool'`, `'disc'`, `'gem'`, `'relic'`, or a slot kind with a weapon
  type), `god()`, `killAll()`, `press(action)`, `stats()`, and internals on `VB.f` (`buildFloor`, `spawnEnemy`,
  `rollDrop`, `interact`, `feedSprite`, `GROUND`, `ZONES` …). `VB.PL`, `VB.LV`, `VB.ALLIES`, `VB.GAME` and `VB.UI` are
  exposed too.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/systems.js` checks every class and origin with their arts
  and skills, every weapon type, 3,000 loot rolls with tooltips, sprite evolution, all four bosses, every menu and
  ship service, a portal round trip and a save round trip. `test/play.js` fights through a room, `test/visual.js` is a
  screenshot tour (use `--no-start`), `test/balance.js` prints hits-to-kill and damage taken by level.
  `node test/live.mjs` plays the title → new character → ship → teleporter → floor flow with real key presses and clicks,
  and `node test/inputs.mjs` checks a mocked gamepad (move, attack, roll, menu focus and tabs) and touch (stick, buttons).
  `test/autoplay.js` (use `--no-start`) lets a bot play the whole campaign with two recruited wardens and no god mode,
  buying supplies between floors, and prints time, levels, downs and wipes per floor: run it after balance changes.
  Set `window.__role`, `__diff` or `__lvl` in a wrapper steps file to try other classes. `test/perf.js` prints draw calls.
  The bot is `23_bot.js`; `GAME.bot = true` hands the player to it.
  `--start '{"role":"psion","area":"ruins"}'` passes options to `VB.start`.
- **Gotchas:** generated names are all original. Don't bring in names from other games. Internal stat keys
  (`atp`, `dfp`, `mst`, `ata`, `evp`, `lck`, `tp`) are shown as ATK, DEF, PSY, ACC, EVA, LUK and PSI. Equipment kinds
  `frame`, `barrier` and `unit` are shown as Armor, Ward and Implant, and arts are `TECHS` in code. The camera cuts
  away walls between it and the player (`updateCutaway`), so screenshots of far walls look normal but near ones are stubs.
  Menus pause the simulation; `UI.isOpen()` decides that.
- **Input:** mouse and keyboard, gamepad (standard mapping, menus navigable with the D-pad) and touch (left-side stick,
  on-screen buttons, tappable palette).
