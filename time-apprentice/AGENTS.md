# The Time Apprentice

An educational time-travel game for kids 8–12: from Aunt Clio's workshop, turn the time dial and arrive in the middle of
history as a helper. Four events so far: building the Great Pyramid (about 2560 BC), Gutenberg's press (about 1454),
the Wright brothers' first flight (1903) and the Apollo 11 Moon landing seen from Mission Control (1969).

- **Read first:** `source/DESIGN.md`. **To add an event:** `source/ADDING_EVENTS.md`. Each event is one file in `src/`
  (`5N_name.js`) that calls `Scenarios.add({...})`; the dial, journal, shelf and save pick it up automatically.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.TA`. `TA.start()` wipes the save and starts in the workshop (returns a promise),
  `TA.go(id, chapter)` jumps into an event, `TA.sim(seconds)` fast-forwards, `TA.skip()` does whatever the current step
  needs (finishes dialogue, picks the right answer, walks to the goal, wins the minigame), `TA.auto(n)` keeps skipping
  until the event ends, `TA.where()` reports the current step, `TA.check()` validates every scenario. Also `tp`, `look`,
  `lookAt`, `press`, `solve`, `facts`, `stats`, `render`, and `TA.Stage`, `TA.Story`, `TA.HUD`, `TA.Minigames`,
  `TA.Scenarios`, `TA.SAVE`, plus internals on `TA.f`.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/play.js` plays all events from the dial to the souvenir
  shelf. `test/content.js` runs the scenario checker. `test/inputs.js` checks the touch stick, look drag, tap-to-talk,
  pause and journal. `test/look.js` takes a screenshot of every chapter and `test/minigames.js` one of every minigame.
- **Gotchas:** chapters must set up their own actors in `setup(S)`, because a save resumes at the start of a chapter.
  Under `#debug` pointer lock is off and fades and warps are instant. `speechSynthesis` is disabled by `TA.start()`.
  The `mirror` spell game treats mirror-symmetric letters (A, H, I, M, O, T, U, V, W, X, Y) as always right.
- **Input:** mouse and keyboard, touch (left stick, drag to look, tap or hand button to talk), gamepad (standard mapping:
  A talk/use, Y journal, Start pause, d-pad and bumpers in minigames).
