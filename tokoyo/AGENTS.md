# Tokoyo

Survival sandbox in the eternal land of Japanese myth: gather, build with structural support, eat and rest, smelt bronze, sail by raft, fight yokai and calm two great kami.

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.TK` (wait for it). `TK.start({ seed })` begins a world (returns a promise),
  `TK.sim(seconds)` fast-forwards, and `TK.give(id, n)`, `TK.tp(x, z)` and `TK.spawn(type)` do what they say. Also `place`,
  `equip`, `time(t)`, `weather(w)`, `god()`, `peace()`, `free()`, `press(code)`, `hold(code, s)`, `click()`, `poi(type)`,
  `render()`, `stats()`, and internals on `TK.f` (`heightAt`, `CAM`, `spawnMob`, `EVENTS`, `SKY` …).
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/play.js` runs the core loop headless. Other step files are
  `build.js`, `systems.js`, `bosses.js`, `visual.js` (a screenshot tour) and `ui.js`. `node test/saveload.mjs` checks a save
  round trip, and `live.mjs` uses real key presses in real time.
- **Gotchas:** the crow's messages (`#crowBox`) and area titles (`#banner`) overlay the view. Building pieces must be
  supported or they fall (`BUILD.updateSupport()`).
- **Input:** keyboard and mouse only (no touch).
