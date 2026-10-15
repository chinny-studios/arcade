# Mud & Iron

WWI real-time strategy: four nations, trenches, wire, gas, barrages and early tanks across procedural sectors. Skirmish, Frontline, Survival and a five-mission campaign.

- **Source:** `source/src/01_core.js` … `15_main.js` (touch controls in `14_ui_touch.js`) and `page.html`, with three.js vendored.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Data:** units, weapons, powers and buildings are in `02_data.js` (`UNITS`, `POWERS`, …). Nation-unique units carry `nation:`.
- **Debug hook:** `#debug` → `window.MI` with `start(cfg)` (`{ mode, nation, enemy, size: 's'|'m'|'l', diff, weather, fog, seed }`),
  `sim(seconds)`, `render()`, `units(team)`, `spawnUnit(type, team, x, z)`, `orderMove(list, x, z, queue, attackMove)`,
  `usePower(team, key, x, z)`, `CAM` (`x`, `z`, `yaw`, `pitch`, `dist`, `tdist`), `MAP` (320×320) and `TEAMS`.
- **Gotchas:** a match banner (`#banner`) shows for 3.2 s of game time. `sim()` does not render, so call `render()` after it.
