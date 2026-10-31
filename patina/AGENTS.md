# Patina

A restoration workshop: an antique sits on a turntable under studio lights and you scrub, strip, polish and
refinish it with five tools until it looks new, then get a turntable reveal, a before/after wipe and a photo
mode. It is a showcase for procedural models and layered physically based materials. The pocket watch and the
valve radio are built (the radio unlocks when the watch is done; everything is unlocked under `#debug`); the violin
and kabuto are planned (they show as "In the post" on the shelf).

- **Read first:** `source/DESIGN.md`.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`. **three.js is r159**, not the r128 the
  other games use (`vendor/three.min.js`, the last release with a non-module build; its deprecation warning and one
  URL in a warning string are trimmed so the offline image check passes). r159 has physically correct lights by
  default (intensities are candela/lux), `MeshPhysicalMaterial` iridescence, sheen and transmission, and
  `BufferAttribute.addUpdateRange`.
- **Debug hook:** `#debug` → `window.PA` (`PA.ready` once the bench is up). `PA.start(id)` puts a piece on the bench
  (resolves when baked), `PA.sim(seconds)`, `PA.render()`, `PA.view(yaw, pitch, dist, [x,y,z])`,
  `PA.brush(x, y, tool, seconds, size)` scrubs at a screen point, `PA.pickAt(x, y)`,
  `PA.workAll(tool, w, names, where(x,y,z))` applies a tool to every vertex (optionally only some parts or a region),
  `PA.progress()`, `PA.open(on)`, `PA.lamp(on)`, `PA.finish()`, `PA.settle()`, `PA.ba(x)`, `PA.photo()`,
  `PA.shelf()`, `PA.stats()`. Set `PA.paused = true` to stop the render loop in tests.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/look.js` renders the watch dirty, after a few brush
  strokes and fully worked. `--piece radio --steps test/radio.js` does the same for the radio (front, back, sanded,
  varnished, reveal with the valves lit) and `--piece radio --steps test/advice.js` checks the wrong-tool advice;
  `shelf2.js --no-start` finishes the watch and checks the radio comes up on the shelf. Also `open.js` (hinged bezel), `input.js` (real pointer events: scrubbing, turning),
  `reveal.js`, `flow.js --no-start` (shelf → reveal → before/after → photo), `phone.js --no-start --w 390 --h 844`.
  Boot takes 40–70 s on SwiftShader because the AO bake renders the piece from 96 directions, twice for the watch.
- **Input:** mouse (drag on the piece works it, drag elsewhere or right-drag turns and tilts, wheel zooms toward the
  cursor, shift-drag pans) and touch (one finger works or turns, two fingers pinch and pan). Keys 1–5, `[ ]`, L, O,
  R, Esc. No gamepad.
- **Gotchas:** masks live on vertices, so every paintable mesh must be dense and even (use `lathe`, `slab`,
  `roundBox` in `04_geom.js`; `tess` alone turns long slivers into thousands of thinner slivers, which is why `slab`
  remeshes extrusions itself). Keep a piece under about 300k vertices: check with `PA.stats()`. Don't scale part meshes: bump heights are in metres in object space. Glass parts are not AO
  occluders and are brushed separately from what lies under them. Save data is `localStorage['patina.v1']`.
