# Cover screenshots

Makes the 800×450 `<game>/cover.webp` images shown on the arcade index. Each game is driven to a good moment by
a recipe in `recipes/<game>.mjs`, screenshotted at 1280×720 in headless Chromium, and converted to WebP.

```sh
node tools/covers/capture.mjs tokoyo                  # writes tokoyo/cover.webp
node tools/covers/capture.mjs --all                   # every game (about 15 minutes)
node tools/covers/capture.mjs --out /tmp/c tokoyo     # write /tmp/c/tokoyo.png only, to try a recipe
node tools/covers/capture.mjs --keep tokoyo           # also keep the PNG in tools/covers/out/
```

**Needs:** Playwright with Chromium (it falls back to `/opt/node22/lib/node_modules/playwright`), and `python3`
with Pillow or `ffmpeg` for the WebP. WebGL runs on SwiftShader, so a game takes 10 s to 4 min. Don't run
more than two at once.

The tool serves the repo over HTTP itself, so relative paths behave as they do on GitHub Pages. three.js
requests to cdnjs, jsDelivr or unpkg are answered from the npm registry tarball of the same version, cached in
`.cache/`, because sandboxes often block CDNs. Google Fonts are fetched with `curl`. Everything else goes to the
network as usual.

## Writing a recipe

```js
// One line saying what the shot shows.
import { hook, hold, drag, hideText } from './_lib.mjs';
export const crop = [x0, y0, x1, y1];   // optional, in 1280×720 pixels; centre-cropped to 16:9 afterwards
export const patch = [['find', 'replace']]; // optional, applied to the served index.html only (never the repo)
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'TK');   // games with a debug hook
  await page.evaluate(() => { /* start, teleport, sim(), hide overlays */ });
  await wait(1500);
  await shot('candidate'); // extra shots are named, for comparison with --out
  await shot();            // the unnamed shot becomes the cover
};
```

Tips:
- Use the game's `#debug` hook (see `<game>/AGENTS.md`) to start, teleport, spawn and `sim()` ahead, then wait a
  second or two of real time so the render loop draws the new state.
- Hide tips, dialogs and zone titles before the final shot. Keep the HUD: it shows what kind of game it is.
- For games without a hook, use `patch` to expose a state object hidden in an IIFE (see `be-kind-rewind.mjs`)
  or drive them with real input (`hold`, `drag`).
- Some recipes use randomness (Tokoyo picks a random meadow). Run them again if a shot is weak, and always look
  at the result before committing.
