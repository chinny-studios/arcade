# Calamity Bay

Kaiju rampage: play Tidemaw (sea) or Orogen (mountain) and topple a city of breakable towers while the military fights back.

- **Source:** `source/src/01_core.js` … `12_main.js` and `page.html`, with three.js vendored.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.CB`. `CB.sim(seconds)` fast-forwards. Also `startGame()`, `skipIntro()`,
  `selectMonster(id)`, attacks (`primary`, `heavy`, `grabThrow`, `special`, `roarAct`), spawners (`spawnHeli`, `spawnJets`,
  `spawnGround`), `MON`, `STATS`, `BLD`, `keys`, `audioOff()` and `state`.
- **Gotchas:** `skipIntro()` does nothing until the intro has run 0.8 s, so `sim(1)` first. Buildings break into
  physics blocks (`05_physics.js`), and the HUD shows the body count.
- **Input:** keyboard and mouse with pointer lock (`#debug` skips the pause on unlock). Touch layout under `body.touch`.
