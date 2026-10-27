# Calamity Bay

Kaiju rampage: play Tidemaw (sea), Orogen (mountain) or Umbra (an alien mothership) and topple a city of breakable towers while the military fights back.

- **Source:** `source/src/01_core.js` … `13_main.js` and `page.html`, with three.js vendored. The walkers live in `09_monster.js`;
  Umbra, the flying saucer, is `11_mothership.js` and hooks into the shared code wherever `MON.def.fly` is checked.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.CB`. `CB.sim(seconds)` fast-forwards. Also `startGame()`, `skipIntro()`,
  `selectMonster(id)`, attacks (`primary`, `heavy`, `grabThrow`, `special`, `roarAct`), spawners (`spawnHeli`, `spawnJets`,
  `spawnGround`), `MON`, `STATS`, `BLD`, `keys`, `audioOff()` and `state`. For Umbra: `SHIP` (flight, shield, destroyer
  state), `WING` (fighters), `BOLTS`, `shipFire()`, `launchFighters()`, `tractorGrab()` and `hurtMonster(dmg, pos)`.
- **Gotchas:** `skipIntro()` does nothing until the intro has run 0.8 s, so `sim(1)` first. Umbra's camera aims past the
  hull, so `AIM.p` depends on `CAM.pitch`; set it before firing in tests. Its destroyer beam takes over the camera for a
  few seconds. Buildings break into physics blocks (`05_physics.js`), and the HUD shows the body count.
- **Input:** keyboard and mouse with pointer lock (`#debug` skips the pause on unlock). Touch layout under `body.touch`.
