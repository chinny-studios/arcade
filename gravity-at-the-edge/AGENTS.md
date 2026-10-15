# Gravity at the Edge

A bigger take on Rimward in 3D: explorer ship, galaxy map, honking systems, neutron jets, selling data for credits.

- **Source:** `source/src/*.js` ES modules, bundled with esbuild. This is the only game with npm dependencies
  (`source/package.json`: esbuild, three 0.169).
- **Build:** `cd source && npm install && python3 build.py`, which writes `dist/standalone.html`. Copy that over
  `../index.html`. `dist/` and `node_modules/` are git-ignored.
- **Music:** `gravity_at_the_edge.mp3` (not MIT; see THIRD_PARTY.md).
- **Debug hook:** none. The title overlay is `#title`, and the launch button is `#st-launch` (it can report as not
  visible to Playwright, so click it from page script).
- **Input:** mouse flight with pointer lock, W/S throttle, J supercruise, H hyperspace jump, hold Space to honk, M galaxy map. Has a touch layout.
