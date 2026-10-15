# Vyrium

A looter shooter: 58 zones, 5 professions, procedurally generated guns.

- **Source:** `source/src/NN_*.js` and `src/page.html`, with three.js r128 vendored in `source/vendor/`.
- **Build:** `cd source && mkdir -p dist && python3 build.py`, then copy `dist/vyrium.html` over `../index.html`. The build
  also writes `dist/vyrium-artifact.html`, a CDN-loading variant for claude.ai. Unlike the newer games, it does not write
  `../index.html` itself.
- **Debug hook:** none. Title menu buttons have `data-a="new|continue|settings"`, and `#cGo` drops you into the world after
  character creation.
- **Data:** zones, professions and loot tables are in `02_data.js` and `06_loot.js`. World generation is in `05_world.js`.
- **Input:** keyboard and mouse with pointer lock. There is a touch layout and a rotate-your-phone prompt in portrait.
