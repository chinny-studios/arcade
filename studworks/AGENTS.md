# Studworks

Brick-building sandbox: snap bricks, plates, tiles and slopes onto a baseplate in 26 classic colors.

- **Source:** `source/src/01_core.js` … `09_main.js` and `page.html`, with three.js vendored.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Parts:** the colour list and part catalog are at the bottom of `src/01_core.js`. Part and colour `id`s are stored in save
  files, so never rename one. Add new ones instead.
- **Units:** x and z are in studs, y is in plates (a brick is 3 plates). The default baseplate is 32×32.
  `rot` is 0–3; slopes face +z at rot 0.
- **Debug hook:** `#debug` → `window.SW` with `add(type, color, x, y, z, rot)` (returns null if it doesn't fit), `serialize()`,
  `loadBuild()`, `setTool`, `setType`, `setColor`, `undo`, `redo`, `pickAt`, `screenOf(id)`, `frame()` and
  `orbit(yaw, pitch, dist)`.
- **Gotchas:** a welcome dialog ("Start building") opens on first load.
