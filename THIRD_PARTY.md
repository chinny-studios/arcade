# Third-party material

The games' code is MIT-licensed (see [LICENSE](LICENSE)). Everything below is
not covered by that license, or is covered by its own.

## three.js

[three.js](https://threejs.org/) is MIT-licensed, © 2010-2021 three.js authors.

- Vendored (and inlined into each built `index.html`, with its license header
  kept) in: `apogee`, `ashreach`, `calamity-bay`, `farhold`, `hollowmere`, `iron-saber`, `mud-and-iron`, `revenant-protocol`, `studworks`, `tokoyo`, `vyrium`
  (`*/source/vendor/three.min.js`).
- Loaded from public CDNs (cdnjs, jsDelivr) by the other 3D games.

## Fonts

Several games load fonts from [Google Fonts](https://fonts.google.com/) at
runtime (nothing is bundled here). Those families are published under the SIL
Open Font License or the Apache License 2.0; each family's license is on its
Google Fonts page.

## Music

The music files were generated with Google Gemini (Lyria) and carry a SynthID
watermark:

- `gravity-at-the-edge/gravity_at_the_edge.mp3` (an identical copy is in `rimward/`)
- `midnight-in-the-sprawl/midnight_in_the_sprawl.mp3`

Google does not claim ownership of generated output. **These files are not
covered by this repository's MIT license**, and as fully AI-generated audio they
may not be copyrightable. They are included for use in these games. Check
Google's current terms before using them elsewhere.
