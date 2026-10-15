# Signal Front

Turn-based tactics in the classic handheld style: an all-autonomous army against drone swarms, tanks and artillery. Four skirmish maps, six commanders with Powers, fog of war and an AI opponent.

- **Source:** `source/src/01_core.js` … `11_main.js` and `page.html`. It is a 2D canvas game with no three.js; sprites are drawn
  in code (`04_sprites.js`).
- **Build:** `cd source && python3 build.py`, which writes `dist/signal-front.html` and `../index.html`.
- **Rules and AI:** `06_rules.js` (pure game rules on a state object `S`) and `07_ai.js`. Keep rules free of rendering so the
  AI and tests can run them headless.
- **Debug hook:** `#debug` → `window.SF` with `start({ map, coP, coE })`, `sim(opts, maxDays)` (AI vs AI without animation;
  returns winner, day and stats), `place(type, side, x, y, hp)`, `meter(side, v)`, `reveal()`, `gallery()`, the live state `S`,
  and `rules`/`api` for internals.
- **Tests:** `node test/smoke.mjs` serves the page itself, runs the rules checks in `test/rules.js` and four AI-vs-AI games,
  and fails on any page error.
- **Input:** mouse or touch.
