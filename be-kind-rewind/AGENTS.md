# Be Kind, Rewind

New Year's Eve 1999, home alone: walk a two-storey house in first person and find 38 hidden memories before midnight.

- **Source:** single file. `index.html` is the source; edit it directly. All code sits in one IIFE.
- **Libraries:** three.js r128 from cdnjs (a `<script>` tag), so the game needs network on first load.
  When the CDN is blocked it shows "The 3D engine did not load".
- **Debug hook:** none. For scripted runs, patch the served HTML to expose state, as
  `tools/covers/recipes/be-kind-rewind.mjs` does (`const P=` → `const P=window.__P=`; `P.x/z/yaw/pitch`).
- **World:** rooms are declared with `room(name, floor, x0, z0, x1, z1, floorKey)` and items with `item({...})`.
  The memory list order is `ROOMORDER`.
- **Input:** pointer lock with drag-to-look fallback; touch layout under `body.touch`. The `RETRO` button toggles a low-res filter.
