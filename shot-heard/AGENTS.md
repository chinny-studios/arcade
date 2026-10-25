# Shot Heard

A first-person battle game of the American Revolution in the spirit of Battlefield: Conquest and Breakthrough at
Lexington & Concord, Bunker Hill, Saratoga and Yorktown, 32 against 32 with bots, muzzle-loaders with a real loading
drill, bayonets, field guns, horses and gunboats.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.SH` (the title screen builds a bot battle first; wait for `#btnPlay` to enable).
  `SH.start({ map, mode, side, cls, weapon, size, spawn })` starts a battle with the player deployed (no pointer lock
  needed), `SH.sim(seconds)` fast-forwards, `SH.manual(true)` stops the real-time loop so tests own the clock.
  `SH.dummy(d, side, team)` puts a still enemy (or friend) foot soldier `d` m in front of the player. Also `tp`, `look`,
  `aimAt`, `press(code)`, `hold(code, s)`, `click('L'|'R')`, `holdMouse`, `god()`, `peace()`, `audio()` (live audio at
  near-zero gain), `render()`, `stats()`, `STATS` (shots, hits, melee, charges, misfires), and internals on `SH.f`
  (`hurtSoldier`, `spawnPoints`, `flagById`, `finishMatch`, `sectorFallen`, `fxMusket` …). A bot with `bot.hold` stands
  still; `bot.peace` stops it choosing targets.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/player.js` checks the player's musket, drill, bayonet,
  grenade, gun and horse. Other step files: `systems.js` (gunboat, breakthrough sector, surgeon revive, officer's colours,
  gabion and powder keg, spyglass; run with `--no-start`), `battle.js` and `rate.js` (bot fighting), `round.js` and `bt.js`
  (a whole round on fast forward; `--mode breakthrough --map yorktown --size 16`), `balance.js` (kills by side and class),
  `soak.js`, `audio.js`, `maps.js` (a look at each field), `look.js`, `front.js`, `ui.js` (menus by click, `--no-start`).
  Options: `--map`, `--mode`, `--side`, `--cls`, `--size`.
- **Gotchas:** structures and greenery are chunked InstancedMeshes built by `finalizeSI()` (called from `buildFlags`);
  hold on to the handle `addInst` returns. three.js r128 shares one program per material, so every InstancedMesh on a
  material that uses instance colours needs instance colours too. Flow-field distances must stay `Float64Array`.
- **Input:** mouse and keyboard, or a gamepad (standard Gamepad API). No touch.
