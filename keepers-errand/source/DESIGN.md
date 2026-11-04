# The Keeper's Errand: design notes

An original action-adventure in the style of the mid-90s isometric island games: a cosy, slightly silly world, a hero
with switchable behaviour modes, a bouncing throwable, chatty islanders, light puzzles and one dungeon with a boss.
Nothing here reuses another game's names, characters, places, art or music.

## The pitch

Brindle Isle has had nine days of storm. Tonight the lighthouse went dark. Baron Halcyon Plume, a vain sky-baron in a
gilded airship, has "bought the weather": his Weather Office in Pottle Harbour bills everyone for it, his clockwork
bailiffs (Tickers) have seized the lighthouse, and his Storm Engine sits in the lamp room bottling the island's sunshine
for export to the Sky-Isles. Wick, the young keeper, takes it back. Tone: warm and silly, chunky low-poly people,
comic dialogue, a pompous villain who flies off at the end vowing to send a bill (room for a sequel on the Sky-Isles).

## The four modes

| Mode | Moves | Space does | Pebble throw |
| :--- | :--- | :--- | :--- |
| Normal | 4.2 m/s | talk / search / use; pushes crates by walking into them | medium arc |
| Sporty | 7.2 m/s, footsteps loud | jump (1.3 m high, ~4 m long, with coyote time) | high lob |
| Aggressive | 4.0 m/s | punch, punch, kick combo with a short lunge | hard and flat |
| Sneaky | 2.1 m/s, silent | talk / use | low skim |

E always talks/uses. Islanders refuse to talk while you are in Aggressive mode. Some things need a mode (the lighthouse
valve needs Normal; the quarry boulder needs fists; the cove nest needs a high throw).

The **tide-pebble** (`11_pebble.js`) bounces off walls and the ground up to 3 times (6 once charged), then homes back to
the hand. Gentle auto-aim picks foes, breakables and targets in a 24° cone, and solves a lob for high targets. The
**sun-pebble** (after Cumula charges it) glows, hits harder and is the only thing that breaks the gear-room fuse and the
Storm Engine core.

## Story and flags

Flags live in `G.save.flags`, items in `G.save.items`, one-shot kills and pickups in `G.save.dead`. `Story.goal()` turns
them into the HUD's "Next:" line and `HUD.targets()` into stars on the map.

1. **Cottage** (`intro`): wake in the storm; Grandma's sea chest holds the tide-pebble (`pebble`).
2. **Lighthouse Point** (`sawNotice`): a Ticker nails a seizure notice to the door, then picks a fight (combat tutorial).
   Old Bram explains the modes.
3. **Pottle Harbour** (`metMayor`, `metLedgerby`): the Mayor explains the Baron. Ledgerby, a clockwork clerk, bills you
   9,999 clams and lets slip that complaints need a PAID stamp, kept in the guarded records room.
4. **Thunder Hill** (`metCumula`): Auntie Cumula the weather wizard explains the Storm Engine and asks for three shards
   of sky-glass that fell when lightning struck the Baron's airship.
5. **Shards**: `glass_quarry` (punch open a cracked boulder in the Old Quarry, guarded by Tickers and a Heavy),
   `glass_stack` (jump the stepping stones out to the top of the Needle, a sea stack), `glass_cove` (knock a gull's nest
   off its pole with a lob, return Gubbins' hat: `nestDown`, `hat`, `hatReturned`). Cumula charges the pebble (`pebbleUp`).
6. **Records room** (`stamp`, `stampSafe`, `backUnbolted`): push the loose crate (Normal) next to the bailiffs' barrel stack
   behind the Weather Office, jump up (Sporty) to the annex roof, drop through the skylight (switches to Sneaky), avoid
   two guards' vision cones, take the stamp, leave by the back door. Getting caught throws you out and confiscates the stamp.
7. **The seal** (`lighthouseOpen`): stamp the seal on the lighthouse door PAID.
8. **Lighthouse**: pump room (fight two Tickers, turn the drain valve in Normal mode: `lhDrained`), storeroom (two Heavies
   asleep; Sneaky keeps them asleep), gear room (platforms over a pit, a moving platform, a fuse that only the sun-pebble
   breaks: `fuseBroken`), lamp room (boss).
9. **Boss** (`15_boss.js`): Foreman Gearwhistle holds a ledger shield. Phase 1: hits from the front clang off; he stalks,
   slams (a shockwave you jump or step out of) and charges; a charge into a wall or the engine stuns him with his back
   boiler exposed (8 hp). Phase 2: he cranks the Storm Engine; its cage opens for 3 s every 6.5 s, lightning strikes are
   telegraphed by circles, Tickers join; three sun-pebble hits on the core win (`bossDone`).
10. **Ending**: the weather turns to sun (`G.weather`), the Baron shouts from his airship and flies off, the islanders
    cheer at the lighthouse, end card, then free roam in sunshine with new dialogue everywhere.

## World and coordinates

- x is east, z is south, y is up; sea level is 0. The island is about 170 × 150 m (`06_island.js`). `ISLE.H(x, z)` is
  the height: a union of ellipse lobes with noise, a cove bite, Thunder Hill, a headland plateau with cliffs, a quarry
  rim around a flat pit, a pond, and flat pads under buildings. Landmarks are in `ISLE.P`, roads in `ISLE.roads`.
- Every area (the island and each room) is built in its own coordinates at the origin, inside its own group; only the
  current one is visible. `enterArea(id, [x, z, ry])` switches instantly, `goArea` fades. Doors are boxes the hero walks
  into; arrival points sit outside the destination's door boxes.
- Collision (`09_world.js`) is against colliders: oriented boxes, cylinders and "ring" walls for round rooms. Anything
  whose top is within 0.42 m of your feet is a step; higher is a wall, unless you jump onto it. Terrain steeper than
  1.15 blocks you. Deep sea (ground below -1.15) or pits send you back to the last safe spot for 2 life.

## Cameras

- Outdoors: a fixed-angle isometric follow camera (yaw 45°, pitch ~38°, FOV 30). Buildings between camera and hero fade
  (`Fader`).
- Indoors: each room lists camera zones `{ box, pos, fov, lockLook? }`; the camera sits at `pos` and tracks the hero, and
  cuts when the hero crosses into another zone. Walls near the active camera are hidden (`INT.cutaway`). While the stick
  stays held through a cut, the input basis is kept so you don't suddenly walk backwards.

## Enemies

Tickers (`12_actors.js`): patrol paths, see in a cone (65°, 11 m; much less if you are in Sneaky mode) with line of sight,
hear Sporty footsteps within 7 m and normal ones within 3 m, alert ("!"), chase, wind up and stamp. Heavies are slower,
tougher and only flinch from kicks. Guards in the records room show their cones on the floor and catch rather than fight.
Crabs nip on beaches. Tickers drop clams and sometimes hearts; crates and barrels break for clams.

## Look and sound

Low-poly, flat-shaded, vertex-coloured; static scenery is merged into a few meshes per area (`Batch`). Characters are
rigs of primitives animated procedurally (`animChar`). Blob shadows, rain streaks, lightning bolts and flashes, an
animated sea. All audio is WebAudio: a small sequencer generates each track's melody from a chord progression, plus
rain, wind and surf ambience and synthesized effects.

## Ideas for later

- A second chapter on the Sky-Isles (the Baron's airship, a desert of clouds), reached from the repaired lighthouse.
- More tide-pebble upgrades; a carryable lantern for dark rooms; fishing with Gubbins.
- Sell bottled sunshine back to the islanders as a side quest; a full island festival after the ending.
