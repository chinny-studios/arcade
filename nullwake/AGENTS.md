# Nullwake

A survivors-like in space: move, your weapons fire themselves, collect crystals, pick upgrades, evolve weapons from
chests, survive fifteen minutes and kill the final boss. Three stages, four pilots, a hangar of permanent upgrades.

- **Read first:** `source/DESIGN.md`.
- **Source:** `source/src/01_core.js` … `16_main.js` and `page.html`. A 2D canvas game with no libraries; all art is
  drawn in code (`03_sprites.js`) and all sound is synthesized (`04_audio.js`).
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Data:** weapons, passives, enemies, bosses, stages, waves and hangar upgrades are all in `02_data.js`. A new enemy
  needs a `shape` that exists in `SHAPES`; a new weapon needs a `BEHAV` entry in `08_weapons.js` and a `GLYPH`.
- **Debug hook:** `#debug` → `window.NW`. `NW.start({ stage, pilot, seed })`, `NW.sim(seconds, { still })` (runs
  the autopilot and resolves level-ups and chests), `NW.give(id, level)` for weapons and passives, `NW.spawn(type, n,
  { elite, at })`, `NW.event(kind, arg)` (`swarm`, `ringA`, `elite`, `mid`, `final`), `NW.time(sec)` (skips past
  earlier events), `NW.god()`, `NW.bot()`, `NW.levelUp()`, `NW.chest(kind)`, `NW.pause()`, `NW.end(won)`,
  `NW.killAll()`, `NW.render()`, `NW.stats()`, and `NW.G`, `NW.P`, `NW.E`.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/visual.js` screenshots every stage and menu.
  `test/balance.js` plays a full run with the autopilot (`--stage s1|s2|s3`); `veteran.js` and `endurance.js` are
  variants. A full run takes a minute or two. `test/ui.js` checks menus, unlocks and the hangar.
- **Input:** keyboard, touch (drag anywhere for a floating stick; pause button top right) and gamepad. Menus take
  arrows/WASD + Enter/Esc, or the d-pad + A/B (X rerolls, Y skips on level-up).
- **Gotchas:** the sim RNG `R()` is seeded per run; use `Math.random` only for visuals. Enemy indices in the
  spatial hash are valid until `cleanup()` at the end of each step, so kill enemies by setting `dead`, never splice `E`
  mid-step.
