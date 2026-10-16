# Roma Aeterna

A first-person walk through Rome in AD 125: the Forum, Capitol, Palatine, Colosseum, Circus Maximus, imperial fora,
Pantheon and Campus Martius, a hand-made street of the Subura with shops you can walk into, and the Via Appia out past
the tombs to the town of Bovillae. Crowds, carts, riders and litters follow the time of day; people can be talked to and
placards explain what you see.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.RA`. `RA.start({ hour })` builds the world and begins (returns a promise),
  `RA.sim(seconds)` fast-forwards without rendering, `RA.go(placeId)` travels to a place (`RA.places()` lists them),
  `RA.tp(x, z, yaw)` / `RA.tpFF(u, v)` teleport, `RA.time(hour)` sets the clock. Also `look`, `lookAt`, `cam` (free
  camera), `free()`, `press(code)`, `hold(code, s)`, `audio()`, `render()`, `stats()`, and internals on `RA.f`
  (`groundAt`, `surfaceAt`, `makePerson`, `PLACARD_TEXT`, `LINES` …). `RA.NPC`, `RA.W` (world registry) and `RA.HUD`
  are exposed too.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/play.js` walks, talks to a shopkeeper, reads a placard,
  opens the map and checks that carts only enter the city after the tenth hour. `test/content.js` checks every placard
  has text and every person has lines. `inputs.js` checks audio start-up and the touch stick. Screenshot tours:
  `look.js`, `look2.js`, `look3.js`, `tour.js`, `tour2.js`, `people.js`, `faces.js`, `vehicles.js`, `stands.js`.
  Start time is `--hour N` (default 9).
- **Gotchas:** the world is built once, deterministically (`rseed(name)` per area), so editing one area doesn't reshuffle
  the others. Monuments must `reserve()` their ground or the district generator builds over them; streets reserve their
  own strip. Faces are oriented by a reference point (`gb.quad(..., ref, sgn)`): a face that's invisible from where you
  expect probably has the wrong `sgn`. The hero street and the lictor procession are big crowds; check fps after
  changing densities.
- **Input:** mouse and keyboard, touch (left stick, drag to look, on-screen buttons) and gamepad (standard mapping).
