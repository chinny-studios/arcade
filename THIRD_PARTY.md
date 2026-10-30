# Third-party material

The games' code is MIT-licensed (see [LICENSE](LICENSE)). Everything below is
not covered by that license, or is covered by its own.

## three.js

[three.js](https://threejs.org/) is MIT-licensed, © 2010-2021 three.js authors.

- Vendored (and inlined into each built `index.html`, with its license header
  kept) in: `act-of-god`, `apogee`, `ashreach`, `calamity-bay`, `copter-city`, `creature-feature`, `farhold`, `highguard`, `hollowmere`, `iron-saber`, `mud-and-iron`, `nathan-road`, `revenant-protocol`, `ricky-rescue`, `roma-aeterna`, `sea-of-smoke`, `shot-heard`, `studworks`, `time-apprentice`, `tokoyo`, `veyra-below`, `vyrium`, `willow-lane`
  (`*/source/vendor/three.min.js`).
- Loaded from public CDNs (cdnjs, jsDelivr) by the other 3D games.

## Fonts

Several games load fonts from [Google Fonts](https://fonts.google.com/) at
runtime (nothing is bundled here). Those families are published under the SIL
Open Font License or the Apache License 2.0; each family's license is on its
Google Fonts page.

One font is bundled: The Time Apprentice embeds a small subset of **Noto Sans TC**
(Bold; only the Chinese characters its signs and tiles use), © Google LLC, under
the [SIL Open Font License 1.1](https://openfontlicense.org/). It comes from the
`@fontsource/noto-sans-tc` npm package and is made by
`time-apprentice/source/tools/cjk_font.py` into `time-apprentice/source/vendor/cjk/`.

Nathan Road embeds a subset of **Noto Sans TC** (Black; only the Chinese characters on its signs), © Google LLC,
under the [SIL Open Font License 1.1](https://openfontlicense.org/). It comes from the
`@expo-google-fonts/noto-sans-tc` npm package and is made by `nathan-road/source/tools/font.py` into
`nathan-road/source/vendor/signfont.woff2`.

## Map data

Nathan Road's map (`nathan-road/source/src/02_map.js`, inlined into its `index.html`) is derived from
[Overture Maps](https://overturemaps.org/) release 2026-10-21. The buildings, roads, land, water and infrastructure
come mostly from [OpenStreetMap](https://www.openstreetmap.org/copyright), © OpenStreetMap contributors, available
under the [Open Database License](https://opendatacommons.org/licenses/odbl/) (ODbL); some building footprints and
the places (shop names and positions) come from other Overture sources under CDLA-Permissive-2.0. The derived map
data in that file is under the ODbL. Hills come from the [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
(Mapzen; sources and attribution listed there). The game credits these on its "About the map" panel.

## Music

The music files were generated with Google Gemini (Lyria) and carry a SynthID
watermark:

- `gravity-at-the-edge/gravity_at_the_edge.mp3` (an identical copy is in `rimward/`)
- `midnight-in-the-sprawl/midnight_in_the_sprawl.mp3`

Google does not claim ownership of generated output. **These files are not
covered by this repository's MIT license**, and as fully AI-generated audio they
may not be copyrightable. They are included for use in these games. Check
Google's current terms before using them elsewhere.
