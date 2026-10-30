# Valor Bay

An open-world superhero sandbox in a bright comic-book city. Pick one of five heroes (Spindle the web-slinger,
Skylark the flier, Blitz the speedster, Bulwark the powerhouse, Equinox the elementalist) and patrol a 12 × 12-block
island. A director keeps crimes breaking out around you (muggings, store robberies that turn into getaways, gang
wars, armored-truck heists); a crime-wave meter rises while they go unanswered, and supervillains (Mauler, Kilowatt,
Overclock) turn up every few minutes or when the city reaches chaos. Pure sandbox: no unlocks, just a score with a
combo multiplier, hero ranks and a best score per hero.

- **Read first:** `source/DESIGN.md` (module map, the city layout, numbers, the look).
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.VB`. `VB.start({ hero, at: { x, z }, god, crimes, tod })` starts a throwaway
  patrol (never saved, no tips; the director is off unless `crimes: true`). `VB.sim(seconds)` fast-forwards without
  rendering, `VB.render()`, `VB.tp(x, z, y)`, `VB.face(yaw, pitch)`, `VB.aimAt(foeOrPoint)` turns hero and camera to
  it, `VB.press(action)`, `VB.hold(actions, seconds, move)` holds actions with a stick vector `{x, y}` (y −1 is
  forward), `VB.spawn(type, gang, x, z)`, `VB.boss(id, x, z)`, `VB.crime(type)`, `VB.hero(id)` switches hero in
  place, `VB.tod(hour)`, `VB.god()`, `VB.hideHUD()`, `VB.counts()`, `VB.stats()` (includes draw calls). Actions:
  `atk`, `rmb`, `q`, `e`, `ult`, `travel`, `jump`, `down`, `map`, `hero`, `menu`. `VB.P` is the hero; internals on
  `VB.f` (`startCrime`, `damageFoe`, `hurtHero`, `findAnchor`, `raycast`, `supportY`, `hitCar`, `setTimeOfDay` …).
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/fight.js` runs melee, ranged, both powers and the
  ultimate for every hero. `swing.js` and `swing2.js` trace web-swinging and wall-crawling, `travel.js` flight,
  super speed, running on water and the super leap, `wallrun.js` Blitz up a wall, `crimes.js` every crime type and
  two minutes of the director, `bosses.js` each villain's moves and a fight to the finish, `play.js` a bot patrol of
  four minutes per hero, `ui.js --no-start` clicks through title, select, pause, hero switch, map, options and
  controls, `inputs.js` sends real key and mouse events and a mocked gamepad through the live loop. `look.js`,
  `fightshots.js`, `bossshots.js` and `night.js` are screenshot tours.
- **Gotchas:** The city is static, built once at boot from a fixed seed; buildings are axis-aligned boxes in
  `CITY.boxes` with a 32 m grid (`queryBoxes`, `collide`, `supportY`, `raycast`), and their meshes are merged per
  128 m chunk, so change buildings in `05_city.js`, not meshes. Windows are drawn by the city shader from a `wuv`
  attribute (window cells and a style number), not textures. Road lines are at `L(i) = -384 + 64 i`; a spot like
  `x = 2` is in the road, `x = ±6.5` on a sidewalk, and `x = -32` inside a block (on a roof). Yaw 0 faces −z
  everywhere (`yawOf`, `fwdX/fwdZ`). Characters are skinned meshes (one draw call each); their rig root sits at
  0.55 × height so they can pitch for flight and lie flat. Civilians and cars are fixed pools recycled around the
  camera. Blitz's Speed Force slows everything but the hero through the frame loop (`wdt`), so don't scale time
  again inside foe or car code. Under `#debug` the game never asks for pointer lock and doesn't pause when it's
  lost; steps segments don't share `const`s, so pass things between them on `out`.
- **Input:** mouse and keyboard (pointer lock) and gamepad (standard mapping). No touch controls.
