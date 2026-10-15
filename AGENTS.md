# Chinny's Arcade: notes for coding agents

A static site of experimental browser games, published from this repo with GitHub Pages at
https://chinny-studios.github.io/arcade/. There is no backend, no package manager at the root and no CI:
every game is a folder whose `index.html` is a complete, self-contained page.

**Before working on a game, read its `<game>/AGENTS.md`.** It has that game's build command, debug hook,
tests and gotchas. This file covers what is shared.

## Repo map

```
index.html            the arcade list (GAMES array in its script); see "The arcade index" below
<game>/index.html     the playable page. For games with a source/ folder this is GENERATED: never edit it by hand
<game>/cover.webp     800x450 screenshot shown on the index card
<game>/AGENTS.md      per-game notes for agents
<game>/source/        build.py, src/ (numbered NN_name.js files + page.html), vendor/three.min.js, test/, DESIGN.md
tools/covers/         headless screenshot tool that makes cover.webp files (see its README)
README.md             human-facing list of games and rebuild commands; keep its table in sync
THIRD_PARTY.md        licenses for three.js, fonts and music
```

Three kinds of game live here:

- **Single-file games** (Be Kind Rewind, Blockhaven, Rimward, Port Calder): `index.html` *is* the source. Edit it directly.
- **Source-built games** (most of them): `cd <game>/source && python3 build.py` concatenates `src/*.js` in
  filename order inside one `(function(){'use strict'; ... })()`, inlines `vendor/three.min.js` (three.js r128),
  wraps `src/page.html`, and writes `../index.html`. All files share one scope, so names are global across files
  and load order is the numeric prefix.
- **Odd ones out:** Gravity at the Edge (esbuild + npm), Midnight in the Sprawl (`build.py` at the game root, three.js
  from jsDelivr), Vyrium (build writes `dist/`, then copy over). Their AGENTS.md files spell it out.

Always rebuild after changing `src/`, and commit the source and the regenerated `index.html` together.

## Debug hooks and headless tests

Most source-built games expose a test hook when opened with `#debug`, for example `window.TK` in Tokoyo or
`window.FH` in Farhold. The hooks usually have `start()`, `sim(seconds)` (fast-forward without rendering),
teleport, give and spawn helpers, and `render()`. Several games also skip pause-on-pointer-unlock under
`#debug`. The per-game notes list the exact API.

Headless tests use Playwright's Chromium with SwiftShader so WebGL works without a GPU:

```js
chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
```

- Playwright may not be in a local `node_modules`. The test scripts fall back to `/opt/node22/lib/node_modules/playwright`.
  In cloud sessions Chromium is preinstalled. Don't run `playwright install`.
- SwiftShader is slow: 1–10 fps, and a scene can take 20 s or more to load. Prefer `sim()` plus a single render over
  waiting in real time, and run no more than two browser jobs at once on a 4-core box.
- Smoke runners (`node test/smoke.mjs --steps test/<file>.js`) load `../../index.html#debug`, run the steps file
  inside the page, and save screenshots to `test/out/` (git-ignored). A steps file can be split with
  `//--- shot NAME` lines; each screenshot is taken *after* the segment above its marker.
- Look at screenshots after a visual change. A test that passes can still render a black screen.

## Rules

- Never hand-edit a generated `<game>/index.html`. Change `src/` and rebuild.
- New games vendor their libraries (`source/vendor/`) and must work offline from a single file. Don't add CDN
  `<script>` tags. Fonts from Google Fonts are the one accepted runtime fetch, and games must look fine without them.
- Games must run from `file://` where possible and from GitHub Pages under `/arcade/<game>/`. Use relative paths only.
- Save data goes in `localStorage` under a key prefixed with the game's name.
- The music files are not MIT-licensed (see THIRD_PARTY.md). Don't copy them into new games without asking.
- Keep `test/out/`, `dist/` and `node_modules/` out of git (already in `.gitignore`).
- Some sandboxes block CDNs (cdnjs, jsDelivr, unpkg) but allow `registry.npmjs.org`. Older games that load three.js
  from a CDN show "3D engine did not load" there. `tools/covers/capture.mjs` shows how to serve the same build from the
  npm tarball instead.

## Adding a new game

Follow the shape of the recent games (Tokoyo, Revenant Protocol and Farhold are good models):

1. `<game>/source/src/NN_name.js` modules, `src/page.html` (with a `<div id="app">` the build splits on),
   `vendor/three.min.js` if it is 3D, and a `build.py` that writes `../index.html`.
2. A `#debug` hook on `window.XX` (two capital letters) with at least `start`, `sim`, `render`, plus a
   `test/smoke.mjs` runner copied from a sibling game.
3. Notes for later work in `source/DESIGN.md`, and a `<game>/AGENTS.md` following the existing ones.
4. A row in the README table and a rebuild line under "Rebuilding".
5. A `GAMES` entry and a cover on the arcade index (next section).
6. If it vendors three.js, add it to the list in THIRD_PARTY.md.

## The arcade index

`index.html` at the root renders every card from its `GAMES` array. Add new games at the end:

```js
{ slug: 'my-game', title: 'My Game', added: 'YYYY-MM-DD',
  blurb: 'One or two sentences, in the voice of the others.',
  genres: ['Action'],              // first one is used for genre grouping; reuse existing genres where they fit
  tags: ['mecha', '3D'],           // flavour tags plus the view: 2D, 2.5D or 3D
  inputs: ['kbm', 'touch', 'pad'] } // only what the game really handles: touch UI, Gamepad API
```

Same-day games sort by array order, so the last entry counts as newest. The four newest games from the last 7
days get a "New" badge automatically.

Then make `<game>/cover.webp` (800×450) with a recipe in `tools/covers/recipes/<game>.mjs`:

```sh
node tools/covers/capture.mjs <game>               # writes <game>/cover.webp
node tools/covers/capture.mjs --out /tmp/c <game>  # try a recipe without touching the cover
```

Open the PNG and check it before committing. A good cover shows the game being played, not a menu, with no tip
boxes or dialogs over it.

## Commits and PRs

- Commit subjects look like `Tokoyo: skippable arrival, auto-quality grace period` or `Add Farhold: a seamless
  procedural universe`. Prefix with the game's name, or `Index:` for the arcade page.
- Describe what changed for the player, not the files touched.
- Work on a branch and open a PR. The owner merges.
