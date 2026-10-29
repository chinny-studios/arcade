# Calamity Bay

Kaiju rampage: play Tidemaw (sea), Orogen (mountain) or Umbra (an alien mothership) and topple a city of breakable towers while the military fights back.

- **Source:** `source/src/01_core.js` … `13_main.js` and `page.html`, with three.js vendored. The walkers live in `09_monster.js`;
  Umbra, the flying saucer, is `11_mothership.js` and hooks into the shared code wherever `MON.def.fly` is checked.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.CB`. `CB.sim(seconds)` fast-forwards. Also `startGame()`, `skipIntro()`,
  `selectMonster(id)`, attacks (`primary`, `heavy`, `grabThrow`, `special`, `roarAct`), spawners (`spawnHeli`, `spawnJets`,
  `spawnGround`), `MON`, `STATS`, `BLD`, `keys`, `audioOff()` and `state`. For Umbra: `SHIP` (flight, shield, destroyer
  state), `WING` (fighters), `BOLTS`, `shipFire()`, `launchFighters()`, `tractorGrab()`, `toggleShipCam()` (V: chase or belly camera) and `hurtMonster(dmg, pos)`.
- **Gotchas:** `skipIntro()` does nothing until the intro has run 0.8 s, so `sim(1)` first. Umbra's camera aims past the
  hull, so `AIM.p` depends on `CAM.pitch`; set it before firing in tests. Its destroyer beam takes over the camera for a
  few seconds. Buildings break into physics blocks (`05_physics.js`), and the HUD shows the body count.
- **City size:** `NROAD` and `R0` at the top of `03_world.js` set the grid (13×13 lots plus the port strip). The
  coast, mountain, map bounds, building grid and intro positions all follow from `CITY_HALF`, so change those two
  rather than hunting for coordinates. Tower heights are in `fillLot` (`04_buildings.js`); Umbra's `SHIP_ALT` must
  stay above every tower but Meridian Tower, which the hull is meant to shear.
- **Input:** keyboard and mouse with pointer lock (`#debug` skips the pause on unlock). Touch layout under `body.touch`.
