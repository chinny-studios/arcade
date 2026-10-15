# Iron Saber

Real-scale mobile suit action: ride the winch into an 18 m suit's cockpit and fight across a breakable city, desert, forest and mountains.

- **Source:** `source/src/01_core.js` … `17_main.js` and `page.html`, with three.js vendored.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.IS`. `IS.sim(seconds)` fast-forwards, `IS.enter('valiant')` jumps into a suit, and
  `IS.board(type)` plays the winch boarding. Also `startGame()`, `startMission(M)` (`MISSIONS`: outpost, relay, forest, city),
  `spawnEnemy(x, z, { yaw, ace })`, `tp(x, z)`, `look(yaw, pitch)`, `lookAt(x, y, z)`, `camMode = 'fp'|'tp'`,
  `setZones(on)`, `audioOff()`, `render()` and `counts()`.
- **World:** the city spans ±700 m (`CITY_HALF`, blocks of 140 m). Terrain, desert, forest and mountains are in `03_terrain.js`.
- **Gotchas:** contextual tips use `#hint` (it stays on for ~4 s). Suits are `HOME_SUITS[type]`. Cockpit styles
  (panoramic or classic) are per suit.
- **Input:** keyboard and mouse only (no touch). V switches first and third person.
