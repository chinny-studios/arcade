# Ricky Rescue

EMT and paramedic simulator. Drive Medic 12 through a procedural city with traffic that yields to lights and sirens,
assess and treat patients with an AI partner, move them with the right device, pick the right hospital, radio ahead
and hand off. Shift-based career with ranks, districts, rigs and cosmetics.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.RR`. `RR.start({ rank, rig, hour, hours, xp, money })` starts a throwaway
  career (never saved) and a shift with no calls queued (returns a promise). `RR.call(type, { district, near, far,
  respond })` dispatches a call (`type` is a key of `RR.CALL`, or `'mci'`) and responds to it. `RR.toScene()` parks the
  rig at the curb (`{ waitPD: true }` waits out police on unsafe scenes), `RR.toPatient()` puts Ricky and Marisol next
  to the patient (inside if need be) and opens care, `RR.act(id, 'ricky'|'partner')` does one action and waits for it
  (ids are keys of `RR.ACT`; `'medic'` is the engine's firefighter-paramedic once on scene), `RR.pack(device)`
  packages and loads, `RR.transport(hospital, driver, alert, ls, medicRides)`, `RR.arrive()` jumps into the bay and
  unloads, `RR.handoff(allRight)` answers the report and returns the review. `RR.respArrive()` puts every dispatched
  fire engine and police car on scene with its crew dismounted, `RR.units()` lists them, and `RR.RESP` / `RR.MEDIC`
  are the unit list and the engine medic's state. Also `sim(seconds)` (fast-forward without rendering), `render()`, `press(action)`, `tp(x, z)`, `time(hour)`,
  `hideHUD()`, `stats()`, getters `C` (the call), `P` (its patient), `RIG`, and internals on `RR.f`.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/play.js` runs one chest-pain call end to end with
  screenshots. `test/systems.js` runs every call type at a sensible standard of care and prints grades, outcomes and
  anything missed (add `--start '{"rank":2}'` for the advanced calls and skills). `test/mci.js` (with `--start
  '{"rank":2}'`) triages and runs a bus crash. `test/responders.js` checks that engines and police are sent when they
  should be, drive in, and that the engine medic works the patient and rides in. `test/career.js` (with `--no-start`) checks promotions, the garage, the
  save and the end of a shift. `test/visual.js` (with `--no-start`) is a screenshot tour, `test/mobile.js` (with
  `--w 390 --h 844` or `--w 844 --h 390`) checks phone layouts, `test/perf.js` prints draw calls. `node test/live.mjs`
  plays with real key presses and clicks; `node test/inputs.mjs` checks a mocked gamepad and touch.
- **Gotchas:** SwiftShader draws a frame or two a second, so live tests wait on conditions, not timers. One real second
  is six game seconds (`TIME_SCALE`); action durations are game seconds. `RR.start` turns off `G.live`, so Ricky's CPR
  doesn't need the tap rhythm in `sim()`. Interiors and the patient compartment are built far west of the city
  (x = −5000) and switched with `setEnv`. The big ground plane is subdivided on purpose: two huge triangles showed
  through the roads. Collisions while Marisol drives don't count against the player.
- **Input:** keyboard and mouse, gamepad (standard mapping, menus with the D-pad) and touch (steer and pedal buttons,
  a stick on foot, tap buttons).
