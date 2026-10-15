# Hollowmere

PS1-style horror: a deserted 1888 village in a thunderstorm. Find eight pages while something tall hunts you.

- **Source:** `source/src/01_core.js` … `07_main.js` and `page.html`, with three.js vendored.
- **Build:** `cd source && python3 build.py`, which writes `../index.html`.
- **Debug hook:** `#debug` → `window.HM` with `P` (player x/z/yaw/pitch), `M` (monster), `U` (shader uniforms), `LT` (lightning),
  `start()`, `strike()`, `openNote()`, `closeNote()`, `teleportMonster(lvl)`, `caught()`, `ending()` and `state`.
  Pointer-lock loss does not pause under `#debug`.
- **World:** the village square is at (0, 0) and the church at (0, −36). The player starts at (0, 88) facing −z.
  Pages and buildings are in `04_world.js`.
- **Monster:** `M.intro` is the opening glimpse; it vanishes once seen. `M.active` makes him hunt. `fear` builds
  while he is in view.
- **Gotchas:** the scene is very dark by design (ambient `U.uAmbient`, dithering). `start()` shows `#intro` text for 8 s.
  Lightning flashes are brief, so take screenshots about 150 ms after `strike()`.
