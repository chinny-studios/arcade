# Patina: design notes

A small, slow game whose job is to show off models and materials up close. One antique at a time sits on a
turntable in a photo studio. Every surface carries several real material layers, and the tools move between
them, so the player watches gloss, colour, relief and reflections change under the cursor.

## Files (`src/`, concatenated in order into one IIFE)

| File | What |
| --- | --- |
| `01_core.js` | helpers, CPU value noise (`vnoise`, `fbm`), save data, the `G` state |
| `02_noise3d.js` | the tileable 64³ RGBA noise volume every shader samples in object space |
| `03_layer.js` | the layered material (`layerMat`) and `fixedMasks` for scenery |
| `04_geom.js` | `prof`/`lathe` (resampled, filleted profiles), `weld`, `tess` (crack-free edge splitting), `roundBox`, `merge`, a BVH for picking, a vertex grid for brushing |
| `05_render.js` | renderer, the procedural studio environment, lights, workbench, turntable |
| `06_bake.js` | GPU bake of per-vertex AO and reach |
| `07_piece.js` | parts, starting wear, tools, brushing, progress, the settle animation, picking |
| `10_watch.js` | piece 1, the pocket watch (dial texture, Breguet hands, hinged bezel, stand) |
| `20_audio.js` | procedural scrub sounds, chimes, the watch tick |
| `21_input.js` | camera (turntable yaw, tilt, zoom to cursor, pan), pointer and touch, the brush cursor, keys |
| `22_ui.js` | shelf, loading, HUD and job card, advice toasts, reveal, before/after, photo mode |
| `30_main.js` | loop, boot, `window.PA` |

## Rendering

- **Lighting:** three.js r159 with ACES tone mapping. The environment is a scene rendered once into a PMREM: a dim
  workshop (vertex-coloured plaster, shelves of clutter, a mullioned window, a warm work lamp) around a studio (two
  softboxes, a rim strip, white scrims behind the camera so polished metal facing you mirrors something bright).
  The same PMREM, blurred and dimmed, is the background. One spot light (the key, matching the big softbox)
  casts PCF soft shadows; a cool directional rim has none. The turntable rotates the piece under fixed lights.
- **Layered material** (`03_layer.js`): `MeshPhysicalMaterial` patched with `onBeforeCompile`. Defines pick the base
  (`K_METAL`, `K_ENAMEL`, `K_GLASS`, `K_WOOD`, `K_FELT`, `K_PAINT`), relief (`P_GUILLOCHE`, `P_KNURL`, `P_WOOD`),
  corrosion (`C_TARNISH` with iridescent thin film and verdigris in crevices, `C_RUST` with bumpy crust and stain
  halo), an old finish (`O_OLD`, crazed varnish from the Worley channel) and a new finish (`F_COAT`, clear coat).
  Grime sits on top as a dulling film plus crusts that collect in cavities. The shader overrides albedo,
  roughness, metalness, clear coat, iridescence, sheen and transmission per fragment.
- **No UVs.** Everything samples the 3D noise volume or analytic patterns in object space. Patterns fade out
  (`lodf`) before they alias and leave a little roughness behind, so engraving reads as satin from afar.
- **Bump:** heights in metres, turned into normals with Mikkelsen's unnormalised surface-gradient method from three
  taps (`p`, `p + dFdx(p)`, `p + dFdy(p)`), so relief stays the right size at every zoom.
- **AO and reach** (`06_bake.js`): for 96 directions the occluders go into an orthographic depth map, then every
  vertex is drawn as one point into a float accumulation texture (one texel per vertex, additive). R/G give
  cosine-weighted AO; B/A give *reach*, the share of camera-possible directions (elevation -13° to 72°) that see
  the vertex. Pieces that open are baked again open: hinged parts take their AO from that pose, reach is the max.
  Glass is not an occluder. AO darkens indirect light, specular (with specular occlusion) and a little direct
  light; reach < 0.02 means the vertex starts clean and counts for nothing.

## Restoration model

- Each part keeps 8 floats per vertex on the CPU (grime, corrosion, old finish, new finish, scratches, polish, 2
  spare), packed into byte attributes `mA`, `mB` and uploaded by changed index range.
- **Starting wear** (`initWear`) comes from the part's `init` spec: grime = base + cavity + facing up + noise;
  corrosion = base + cavity + noise; scratches in patches; old finish; polish. Cavity is `1 - AO`.
- **Tools** (`applyTool`): solvent removes grime; the wire brush removes rust (and grime) but scratches anything
  that is not hard steel; the sanding pad strips old and new finish and scuffs metal; the polishing cloth removes
  tarnish and scratches and raises polish, much less effectively while grime is on it; the finish brush lays a coat
  only on parts that take one and only where it is clean and stripped. A part's `job.surf` (`soft`, `hard`,
  `glass`, `enamel`, `wood`) decides what scratches.
- **Brush:** a flattened sphere (a disc 0.35 r thick along the surface normal) with a facing test, so it follows
  the surface, doesn't reach through thin plates, and working a crystal doesn't clean the dial under it. Glass and
  non-glass parts are never brushed together. Strength rises with scrub speed.
- **Progress:** a vertex is done when grime, corrosion and old finish are < 0.08, scratches < 0.1, polish > 0.85
  where needed and finish > 0.85 where needed, weighted by reach. A part is done at 96.5%. When every part is done
  the player can finish: everything eases to perfect over 1.6 s (`settlePiece`) and the reveal starts.
- **Advice:** every 1.3 s of scrubbing (and at the end of a stroke) the stroke's effect is checked and a toast
  explains a wrong tool ("That will not shift the rust", "Grime is clogging the cloth", scratching warnings).
- **Inspection lamp:** the shader recomputes "work left" from the same thresholds and glows it blue.

## The pocket watch

48 mm gold-filled case: convex band with hinge knuckle, domed engine-turned back (barleycorn guilloché, 0.23 mm
pitch, plain cartouche), hinged bezel holding a domed glass crystal, enamel dial with a canvas-printed chapter ring
(Roman numerals, minute track, small seconds, "A. Vallier, Genève"), Breguet moon hands in blued steel (extruded
shapes, subdivided), pendant, knurled crown, a tube bow, and a walnut-and-brass stand with a pin through the bow.
About 220k vertices. Open the bezel (O) to reach the dial and hands. On the reveal the hands sweep to local time and
the seconds tick.

## Adding a piece

Push a definition onto `PIECES` with `build()` returning `{ id, parts, props, root, noiseF, seed, brush: [min, max]
radius in metres, focus, dist, minDist, maxDist, pitch }` and optional `setOpen`, `openLabel`, `update(dt)`,
`onReveal`. Use `addPart(piece, { name, geom, mat, job, init, parent, hinged, glass, paint })`; parts with the same
name share a job-card row. Then remove its entry from `UPCOMING` in `22_ui.js`. Planned: the valve radio (walnut
veneer under old varnish, Bakelite, chrome, a sheen-fabric grille, glowing valves), the violin (flamed maple with
chatoyance, amber varnish, ebony, steel strings) and the kabuto (urushi lacquer, rusted iron plates, gilt crest,
silk cords).
