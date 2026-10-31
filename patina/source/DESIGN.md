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
| `04_geom.js` | `prof`/`lathe` (resampled, filleted profiles), `weld`, `tess` (crack-free longest-edge bisection), `roundBox`, `merge`, a BVH for picking, a vertex grid for brushing, `creaseNormals`, `rrect`, and `slab` (evenly meshed extrusions with Delaunay caps) |
| `05_render.js` | renderer, the procedural studio environment, lights, workbench, turntable |
| `06_bake.js` | GPU bake of per-vertex AO and reach |
| `07_piece.js` | parts, starting wear, tools, brushing, progress, the settle animation, picking |
| `10_watch.js` | piece 1, the pocket watch (dial texture, Breguet hands, hinged bezel, stand) |
| `11_radio.js` | piece 2, the valve radio (cabinet shell, baffle, grille, dial, knobs, chassis and valves, power-on) |
| `12_violin.js` | piece 3, the violin (outline, arched plates, ribs, neck and scroll, ebony fittings, bridge, strings, stand) |
| `13_kabuto.js` | piece 4, the kabuto (riveted bowl, neck guard lames, visor, turnbacks, gilt horns, rosette and crests, silk lacing, stand) |
| `20_audio.js` | procedural scrub sounds, chimes, the watch tick, the radio's static and waltz, the violin's phrase, the kabuto's temple bell |
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
  (`K_METAL`, `K_ENAMEL`, `K_GLASS`, `K_WOOD`, `K_FELT`, `K_PAINT`, `K_BAKELITE`), relief (`P_GUILLOCHE`, `P_KNURL`,
  `P_WOOD`, `P_WEAVE`, and `P_SUJI` for a riveted helmet bowl: raised seams between the plates, a rivet head every
  so far up each seam),
  corrosion (`C_TARNISH` with iridescent thin film and verdigris in crevices, `C_RUST` with bumpy crust and stain
  halo), an old finish (`O_OLD`, crazed varnish from the Worley channel) and a new finish (`F_COAT`, clear coat).
  Grime sits on top as a dulling film plus crusts that collect in cavities. Bare wood under `F_COAT` is pale and
  dry until the finish wets it. With `uPat.z` set, wood turned sideways gets grain running front to back (veneered
  side panels); with `uPat.z` 2 it is quarter-sawn and book-matched (rings straight along the axis, spaced by
  distance from the centre line). `W_FLAME` adds flamed figure that is chatoyant: alternate bands brighten or darken
  with the viewing angle, so they swap as the piece turns. `W_POLISH` lets the polish mask drive oiled sheen (ebony)
  or varnish gloss. `L_MAPRGB` takes the map's own colours (purfling, f-holes), and maps have their own projection
  axis and origin (`mapAxis`, `mapOrigin`). `L_OPAQUE` makes the old and new finishes opaque lacquer that hides the
  metal (urushi) rather than a tinted clear coat. Every noisy layer edge is scaled by its own mask, so a cleaned
  surface never shows specks of a layer it no longer has. Bakelite uses the polish mask for oxidation: dull olive-brown until polished back to gloss. `uEmit`
  adds glow (the radio dial, the valve heaters), masked by printed ink. The shader overrides albedo,
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

## The valve radio

A 42 cm walnut table radio, the "Aurelia Super Seven" (1938). The cabinet is one `slab`: a rounded-rectangle frame
extruded 21 cm deep with bevelled edges, open at the back, with flat-cut walnut whose sides turn their grain. A
quarter-cut baffle sits 12 mm inside the front. Also: striped woven grille cloth behind dark wood bars, a printed
dial card (wavelengths and European stations) under a domed glass in a chrome bezel, a chrome nameplate with the
name inlaid in black, three knurled Bakelite knobs. Through the open back: a cadmium-plated chassis, four valves
(glass envelopes, anodes, heaters), a transformer, a can and the speaker. Insides of the cabinet and the back of
the baffle are left out of the job (`init.exclude`) and start as dusty bare board. About 266k vertices.

Job: wash the nicotine off, sand the crazed varnish back to bare wood, varnish it, polish the chrome, Bakelite and
dial glass, wire-brush the chassis and clean the valves. The finish brush refuses dirty or unstripped wood. On the
reveal the radio powers up: the dial glows, the heaters light a point light inside, the needle swings to a
station, and static gives way to a small waltz filtered like medium wave (`auRadio`). The turntable is rebuilt
larger (`piece.table`) and the light rig scaled (`piece.rig`) for it.

## The violin

A violin of about 1870 on a display stand, leaning back against a padded yoke. The 356 mm outline is a centripetal
Catmull-Rom through bout and corner points, mirrored. Each plate is a `heightCap` (Delaunay-meshed outline, lifted by
an arching function of the distance to the edge, with the scooped channel) plus a `sweepLoop` rounded edge; the
ribs are swept 2.5 mm inside the outline. The spruce top is quarter-sawn; the maple back, ribs and neck are flamed.
Purfling and f-holes are painted into colour maps projected onto the plates. The neck, pegbox and scroll are
`loft`s: the scroll is a section swept along a logarithmic spiral, 2.25 turns. Ebony fingerboard, nut, pegs,
tailpiece and end button; a maple bridge with its heart and kidneys; four strings (props, new). About 143k
vertices. Job: clean off grime and the rosin caked under the strings, retouch the varnish where it is worn through
to bare wood (chin, shoulder, edges, corners), French-polish everything, clean the bridge and bring the ebony back
to black. Sanding warns that it takes original varnish off. The reveal plays a short phrase on a synthesised violin
(`auViolin`).

## The kabuto

An Edo-period helmet on a lacquered stand with a brocade cushion. The bowl is a lathed dome of 32 plates over a
plain rim band; the seams and rows of rivet heads are `P_SUJI` relief, so they cost no vertices. Five neck-guard
lames and the visor are `plathe`s (part-turn lathes of a thin curved plate profile, with capped ends); the turnbacks
are slabs folded out at the front. Gilt: two sweeping horns (slabs of a generated outline) on a mount, the crown
rosette (knurled into petals) and a mitsudomoe crest inlaid on each turnback. Indigo silk cords run down every
column of lames in pairs, with red edge cords along each lame. About 223k vertices. Job: the iron is under old black
urushi that is crazed and has flaked away in patches where rust has bloomed. Clean it, strip the old lacquer,
wire-brush the rust, lay new urushi (which also fills the scuffs from stripping), polish the gilt and dust the silk.
The reveal strikes a temple bell (`auBell`).

## Adding a piece

Push a definition onto `PIECES` with `build()` returning `{ id, parts, props, root, noiseF, seed, brush: [min, max]
radius in metres, focus, dist, minDist, maxDist, pitch }` and optional `table` (platter radius), `rig` (light
scale), `setOpen`, `openLabel`, `update(dt)`, `onReveal`, `dispose`. Use `addPart(piece, { name, geom, mat, job, init, parent, hinged, glass, paint })`; parts with the same
name share a job-card row. `init.post(localPos, piecePos, n, m, o, cav, n1, n2)` adjusts the starting masks
per vertex (worn varnish, rosin). `init.exclude(v, n)` (piece-space position and normal) leaves vertices out of the job
with the state `init.excl`. `UPCOMING` in `22_ui.js` lists planned pieces (shown as "In the post");
it is empty now that all four are built.
