# Midnight in the Sprawl

Walk the rain-soaked neon streets of a cyberpunk city to an original soundtrack.

- **Source:** `src/01-core.js`, `02-city.js`, `03-play.js` and `src/shell.html`. There is no `source/` folder; the build lives at the game root.
- **Build:** `cd midnight-in-the-sprawl && python3 build.py`, which writes `index.html` and `midnight-in-the-sprawl.html`
  (a claude.ai artifact variant, git-ignored).
- **Libraries:** three.js 0.147 and its examples (EffectComposer, UnrealBloomPass, Reflector) from jsDelivr. The page
  needs network, and shows "3D engine didn't load" when the CDN is blocked.
- **Music:** `midnight_in_the_sprawl.mp3` (not MIT; see THIRD_PARTY.md).
- **Debug hook:** none, and the code is wrapped in an IIFE. `player = { x, z, yaw, pitch }` is in `03-play.js`. Expose it by
  patching the served HTML (see `tools/covers/recipes/midnight-in-the-sprawl.mjs`).
- **Gotchas:** `#start` stays disabled until the city is built (slow under SwiftShader). Bloom and the reflective street
  make headless frames take several seconds each.
