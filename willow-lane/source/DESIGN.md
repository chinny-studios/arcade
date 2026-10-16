# Willow Lane — design notes

A life simulation in the mould of the classic house-and-family sims: create a household of up to four, move them into
a furnished starter cottage or onto an empty lot, and look after their needs while they work, make friends, fall in
love, have children, grow old and leave a memorial. One lot, one street, a neighbourhood of townies who visit and
walk by. All art is built from primitives in code and every sound is synthesized.

## Scope

| Area | What's in |
| :--- | :--- |
| **Create-a-Sim** | Family name, up to four members: name, age (child/teen/adult/elder), body (curvy/broad/slim), pronouns, can-carry toggle, voice pitch, skin, 12 hairstyles, hair colour, outfit type and colours, shoes. 25 personality points over Neat, Outgoing, Active, Playful, Nice (star sign follows), three interests. Relationships to the first member: spouse, partner, child, parent, sibling, grandchild, roommate. Four preset families. |
| **Needs** | Hunger, comfort, hygiene, bladder, energy, fun, social, room (environment). Mood is a weighted sum plus moodlets. |
| **Free will** | Every interaction advertises need gains; sims score them against convex need curves, personality and distance, then pick among the top three. Guests use a restricted set. Can be switched off. |
| **Objects** | ~50 catalog items in 11 categories, each with its own model and interactions (`03_catalog.js`, `10_actions.js`). Cooking chains fridge → counter → stove → platter → plates at tables; dirty plates, puddles, clogs, breakage, repairs, dying plants, trash, fires. |
| **Social** | 30 interactions in five categories with acceptance chances from friendship, romance, mood, personality, star signs and shared interests. Friendship −100..100, romance 0..100, labels from Stranger to Spouse. Going steady → proposal → wedding; ask a townie to move in. |
| **Careers** | Six tracks × eight levels with pay, hours, skill and friend requirements. Carpool an hour early, performance from mood, promotions, missed days, firing, retirement with a pension. Children and teens take the school bus, do homework, get report cards. |
| **Skills** | Cooking, mechanical, charisma, body, logic, creativity (0–10) from bookshelf, mirror, weight bench, chess, easel, piano, telescope, computer… Paintings and novels sell. |
| **Life cycle** | Try for baby in a double bed (or adopt by phone), three-day pregnancy, baby in a bassinet (feed, play, change, sing), birthdays at the end of each stage or by birthday cake, elders pass away and leave a memorial stone. Social worker for neglected babies. |
| **The street** | Townies walk by, drop in, can be invited by phone, and a welcome party rings the bell on day one. Pizza delivery, the bills every three days and the repo officer. |
| **Build / buy** | Walls on tile edges (drag), erase, doors (3), windows (3), 16 floors, 16 wallpapers (Shift paints a room), place/move/rotate/sell objects, undo/redo. Time stops in these modes. Cutaway walls follow the camera. |
| **Presentation** | Pie menus, action queue, thought and speech bubbles with emoji, a mood gem over the active sim, notifications, gibberish voices (formant-filtered sawtooth syllables), procedural lounge music in build mode and a groove for the stereo. |

## Systems

- **Time.** `G.t` is game minutes. One game minute per real second at speed 1; speeds ×3 and ×10, and ×40 automatically
  when every household member is asleep or away. `simulate(dtMin)` steps in ≤0.75-minute substeps; slower bookkeeping
  (`everyMinute`) runs once per game minute.
- **Lot** (`06_lot.js`). 30×26 tiles. Walls live on tile edges keyed `h:x:z` (north edge of tile x,z) and `v:x:z` (west
  edge). Rooms are flood fills where any wall (door or window included) separates; room 0 is outdoors. Room score mixes
  size, windows by day or lamps by night, decor, and dirt. Cutaway lowers a wall when the tile behind it (away from the
  camera) is indoors.
- **Objects** (`07_objects.js`). Footprints rotate with `r` (front faces `DIRS[r]`). Use spots: stand spots in front,
  seat spots with an approach tile, lie spots (bed, sofa nap, weight bench) with the root at the foot end. Wall-mounted
  objects need a plain wall behind them and hide when that wall is cut away.
- **Pathfinding** (`08_path.js`). A* on an 8-connected grid covering the lot, neighbouring lawns and the sidewalk;
  walls block edges, doors don't; diagonal moves can't cut corners. Paths are smoothed with a three-line width test.
- **Actions** (`10_actions.js`). Each interaction's `run` is a generator stepped with `dt` (game minutes). Loops wind down
  when `act.cancel` is set (the player cancelled, or a social pulled the sim away); `hardStop` calls `it.return()` so
  `finally` blocks release seats. An action that stops its own sim just ends (generators can't return themselves).
- **Socials** (`11_social.js`). The initiator walks over, the target gets a front-queued `beSocial` that cancels what it
  was doing, the pair talk in alternating speech bubbles, then the outcome applies relationship and need deltas.
- **Saving** (`19_save.js`). localStorage key `willow-lane.save`: lot, objects, items, every sim (actions are dropped),
  money, bills, flags, log and camera. Autosave at 6 am and when the page is hidden.

## Modules

`01_core` helpers & clock · `02_data` needs, traits, careers, names, moodlets · `03_catalog` buy catalog ·
`04_render` renderer, camera, sky, textures, neighbourhood · `05_models` furniture, sim rig & poses, cars, items,
`mergeStatic` · `06_lot` · `07_objects` · `08_path` · `09_sims` · `10_actions` · `11_social` · `12_autonomy` ·
`13_world` careers, school, visitors, services, bills, fire, daily clock · `14_build` · `15_ui` · `16_home` starter
cottage & presets · `17_cas` menu & Create-a-Sim · `18_audio` · `19_save` · `20_main` loop, input, `#debug` hook.

## Ideas for later

Second storeys and stairs, roofs, pools, pets, community lots, more careers and aspirations, toddlers as a stage,
outfits per occasion, a neighbourhood view with several households.
