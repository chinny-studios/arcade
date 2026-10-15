# Blockhaven

An endless voxel world: dig and build in first person, with flying.

- **Source:** single file. `index.html` is the source; edit it directly.
- **Libraries:** none. It uses raw WebGL (`getContext('webgl…')`), not three.js. Fonts come from Google Fonts.
- **Debug hook:** none. Drive it in a headless browser with `#playBtn` and real key presses, as `tools/covers/recipes/blockhaven.mjs` does.
- **Input:** keyboard and mouse with pointer lock. Touch buttons (`#bJump`, `#bFly`, `#bInv`…) are enabled on coarse pointers.
