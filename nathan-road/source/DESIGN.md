# Nathan Road — design notes

## The brief

A first-person exploration game of Hong Kong, starting with the area around Milton Mansion in Tsim Sha Tsui, true
to scale. Chosen with the owner: the **TST core plus a harbour view** (Hong Kong Island across the water as a backdrop
you can see but not reach), **today with a day/night cycle**, a **PS1-era look**, no player backstory, a **Star Ferry
round trip**, **busy streets**, and four activities: landmark discovery, going inside Milton Mansion, small errands,
and a photo mode with famous views. Later the owner asked that buildings and shops be real places, true to life,
and then for the MTR: **walk-in stations** (street exit, concourse, gates, escalator, island platform with screen doors,
a ride in a carriage), **four stations on two lines** (Tsim Sha Tsui and Jordan on the Tsuen Wan Line, East Tsim Sha
Tsui and Austin on the Tuen Ma Line, with the Mody Road subway between TST and East TST), an **Octopus card**, and a
**busy, authentic** feel (frequent trains, screen doors, trilingual announcements and the door chime, crowds by hour,
no trains from 1 am to 6 am).

## What is real and what isn't

- **Real:** building footprints, names and (where mapped) heights; streets and their names; pavements, crossings,
  trees, bus stops and traffic signals; the coastline and piers; the hills of Hong Kong Island; the Star Ferry route;
  shop names on signs, placed on the shopfront facing the street in each listing's address; Milton Mansion's tenants
  by floor and unit; the sun's position for 22.3° N in late October; A Symphony of Lights at 8 pm.
- **Approximate:** heights where the data has none (about half the buildings: a plausible guess by size and use), the
  hand-made landmark models, facade textures (the data has colours for only 2 buildings), shop positions (geocodes
  snapped to a frontage), listings that may be stale, the flat ground (the city is flat; only the backdrop has hills).
- **MTR:** the four stations are under their real spots and their exits have their real letters and streets (from
  the MTR exit lists as quoted by Gwulo and news reports: TST A1 Kowloon Park, A2 Humphreys Avenue, B1/C1/D1 Nathan
  Road, B2 Cameron Road, C2 Peking Road, D2 Carnarvon Road; East TST K Middle Road, P1 Mody Road, P3 Chatham Road South;
  Jordan C1 Nathan Road, E Prudential Hotel; Austin F Austin Road West). Approximate: where each exit opens on the
  pavement, the concourse and platform layouts (one generic island-platform station), the 150 s headway and 30 s dwell,
  the fares (about HK$5–6), and the ride times. Leaving the map by train (towards Central, Tsuen Wan, Wu Kai Sha,
  Tuen Mun) brings you back on the next train with the clock moved on 7 minutes.
- **Made up:** every person, their stalls and their errands (no fictional business names; stall signs say only what
  they sell), crowds and traffic, the guard, Milton Mansion's interior layout. The credits panel says this in game.

## Data pipeline (`tools/`)

- `fetch.py` reads Overture Maps GeoParquet straight from the public S3 bucket with HTTP range requests (row groups
  filtered by their bbox statistics), so no DuckDB extensions or downloads are needed. `get_data.sh` fetches buildings,
  building parts, road segments, land, water, land use, infrastructure and places, and `dem.py` the AWS terrain tiles
  (terrarium, z15). Release `2026-10-21.0`.
- `bake.py` projects to metres from Milton Mansion (lon 114.172312, lat 22.299461) with exact metres-per-degree at that
  latitude, and writes `src/02_map.js`. Regions: WALK (where you can go, 1.4 × 1.4 km), DETAIL (full detail, +300 m),
  FAR (backdrop to Mong Kok and the Peak). In DETAIL: buildings with parts and holes; road surfaces are the union of
  road centrelines buffered by a width per class (one-way carriageways narrower), cut back 1.2 m from buildings and
  from mapped sidewalks; pavements are land minus roads, so kerbs fall out of the difference. Green, plazas, pools,
  trees (mapped plus scattered in green areas), shops, crossings, park paths, bus stops, signals, the road graph
  (split at Overture connectors, tunnels and bridges cut out), and the coast. FAR: footprints over 18 m, simplified;
  past 2 km only towers over 35 m as rotated boxes; a 60 m terrain grid where only hills survive the smoothing
  (Overture's city DEM is a surface model, so the city floor is forced flat).
- Shops: places with a ground-floor address (地下, G/F, Shop G…) and confidence ≥ 0.55, not inside the malls (Harbour
  City, K11, iSQUARE, Chungking and Mirador arcades…). The street named in the address picks the frontage. Names are
  cleaned of branch suffixes and split into Chinese and English. One sign per name within 20 m.
- `font.py` subsets Noto Sans TC Black to the Chinese the signs and UI use (about 400 characters, 58 KB).

## Runtime

- **Renderer (03):** a low render target (240 lines by default, 360/480/720 in settings), one ShaderMaterial for
  everything: clip-space vertex snapping, nearest-sampled 64 px atlas tiles with two mips, Gouraud sun + sky light,
  linear fog, 15-bit colour with Bayer dither. Night light comes from window glass in the atlas (alpha 160) lit per
  window by a hash of the window cell, and a 2 m ground light map painted with lamp pools, shop spill and neon. Two
  depth passes keep the 5 km backdrop and the 0.15 m kerbs both correct.
- **City (05):** a 1 m raster of ground classes (road, pavement, building, sea, green) gives ground height (kerbs eased
  over half a metre) and where you can walk; building outlines, the coast, rails and props are collision segments
  in 16 m cells. Buildings get facades by use (tenement tiles, curtain glass, hotel, mall, colonial) with shopfronts on
  street-facing ground floors and rooftop tanks. Signs: real shop names as fascias, hanging signs on the main streets,
  big boards over Nathan Road, and building names over entrances.
- **Landmarks (06):** 28 places with notes (checked where unsure: Milton Mansion's date is from Gwulo). Hand-made: the
  Clock Tower, the Space Museum dome, the Kowloon Mosque on its footprint, the Star Ferry pier, Bruce Lee, flamingos.
- **Milton Mansion (07):** its own scene. The lobby has the tenants' directory written from the listings, mailboxes,
  the guard and the lifts; floors 1–16 share one corridor model with name plates for the listed units; the stairs
  from 16/F lead to the roof (part of the street scene, 50 m up) once you have the key.
- **People (08):** one InstancedMesh; the vertex shader swings limbs and picks colours per part. Lanes run along both
  pavements of every street (kept if 75 % of samples are pavement); lane ends within 14 m link, so people turn corners
  or cross at junctions. Density by hour, thinned on weak settings.
- **Traffic (09):** buses, taxis, minibuses, cars, vans, lorries on the graph, on the left, following, stopping at red
  (junctions near a mapped signal, two phases by heading) and for you, honking. **Ferry (09b):** two boats on the real
  route, 50 s at each pier and 150 s crossing; the ferry space carries you, and you can only leave at TST.
- **Sky (10):** real sun for the date; sky and fog share the horizon colour. The show lights windows of Island towers
  over 45 m on the north shore and sweeps beams from the tallest tower in each 300 m of skyline.
- **MTR (09c):** `STATIONS`, `EXITS` and `FARES` at the top. Street exits are canopies with stairs painted on the
  pavement (the street scene has no holes). Underground is one more scene: per station a concourse at y = −10 with exit
  passages in its walls, gate lines (a collision segment you pass by tapping), a Customer Service Centre and an add
  value machine on the first unpaid side, and an escalator ramp down to an island platform at y = −20 with screen
  doors. One train per track loops arrive (10 s), dwell (30 s, doors open 12–36 s, chime at 33 s), leave (10 s) every
  150 s; screen doors and train doors are separate meshes hidden while open. Boarding moves you to a carriage set at
  x = 4000 with passengers, the line strip and tunnel lights streaming past; on arrival the train you rode is set to
  stand at the far platform. Announcements are captions plus `speechSynthesis` in Cantonese, Mandarin and English
  where the browser has those voices. The Octopus (HK$150, HK$100 on it) pays gates, the Star Ferry and stalls when it
  has the value, and may go HK$35 negative once at the gates.
- **Game (12):** errands are small state machines (`ERRANDS`, `talk(id)`), photos are tested against `VIEWPOINTS`
  (projected points in frame, distance, time, where you stand), and progress saves to `nathan-road-save`.

## Ideas for later

More of Hong Kong (Mong Kok, Central across the ferry, and the MTR stations to get there), walk-in shops from the
listings, the Peninsula's lobby, rain and typhoon signals, minibus rides, footbridges, real station layouts (TST's
concourse runs under Nathan Road from Kowloon Park to Peking Road and its exits come in through long passages, which
the game shortens to a fade), real terrain for Kowloon's slopes.
