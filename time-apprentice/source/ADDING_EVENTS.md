# Adding a new event

Every historical event is **one file** in `src/` that calls `Scenarios.add({...})`. The engine never needs to change:
the time dial, the journal, the souvenir shelf and the save file all read from the registry, so a new file shows up
everywhere as soon as you rebuild.

1. Copy the template below to `src/5N_name.js`. Any number from 41 to 89 works (the build concatenates files in name
   order, after the engine and the minigames; the dial sorts events by `year`, not by file name).
2. Fill in the data, build the set, and write the chapters.
3. `python3 build.py`, then `node test/smoke.mjs --steps test/content.js`. It lists unknown speakers, facts, sets and
   minigames, and facts that are never unlocked. Opening the page with `#debug` prints the same list in the console.
4. `node test/smoke.mjs --steps test/play.js` plays every event through to its souvenir. To try only yours, open
   `index.html#debug` and run `await TA.start(); await TA.go('yourid'); await TA.auto()` in the console, or jump to a
   chapter with `TA.go('yourid', 2)`.
5. Look at it: take screenshots of every chapter (see `test/look.js`) and play it once for real.

## The template

```js
// Event: one line on what and when. One line on who you are.
(() => {
  function buildMain(S) {
    S.bounds(-60, -60, 60, 60);                 // where the player may walk
    S.ground((x, z) => 0);                      // height of the ground (tiers, dunes, ramps…)
    S.add(terrainMesh(-80, -80, 80, 80, 4, (x, z) => 0, () => 0xc8b890));
    const m = S.gb('main');                     // static geometry that casts shadows ('shell' for walls and roofs)
    m.box(0, 0, -10, 6, 3, 4, 0x8a6a4a);        // box(x, baseY, z, w, h, d, colour, { ry })
    S.solidBox(0, -10, 6, 4);                   // and make it solid
    S.spot('door', 0, -7, { r: 2 });            // a named place for goals ("to", "use")
    S.actor('host', 2, -6, Math.PI);            // a person from `cast`, by id
  }

  Scenarios.add({
    id: 'yourid', title: 'Short title', place: 'Town, Country', when: 'About 1600', year: 1600, color: 0x3a8a6a,
    blurb: 'One or two sentences for the time dial card: what you will do there.',
    role: "You're … (who the player is).",
    homeLine: 'What Aunt Clio says when you come back.',
    souvenir: { name: 'a little something', text: 'What it is.', build(b) { b.box(0, 0, 0, 0.2, 0.2, 0.2, 0xffffff); } },
    note: 'Who in the story was real and who is made up, and anything historians are unsure about.',
    cast: {
      host: { name: 'Somebody', title: 'their job', real: true, about: 'One line for the journal.',
        look: { skin: SKIN.tan, hairStyle: 'short', top: 0x8a3a3a, topStyle: 'tunic', bottom: 0x4a3a2a },
        voice: { pitch: 1, rate: 1 },
        lines: ['Things they say if you talk to them between goals.', { t: 'A line that unlocks a fact.', fact: 'extra' }] },
    },
    facts: {
      first: { t: 'Journal page title', x: 'Two or three sentences a 9-year-old can read. *Stars* mark key words.' },
      extra: { t: 'An optional page', x: 'Found only by talking to people.' },
    },
    sets: {
      main: { env: { top: 0x3a7ad0, hor: 0xe8e0c8, sun: [0.4, 0.8, 0.3] }, amb: 'desert', surf: 'sand', build: buildMain },
    },
    chapters: [
      { title: 'Arrival', set: 'main', start: [0, 5, 'host'], steps: [
        { chat: [['host', 'Welcome!'], ['you', 'Where am I?'], ['host', 'Somewhere *wonderful*.']], fact: 'first' },
        { goal: 'Go to the *door*', to: 'door' },
        { play: 'order', title: 'Do the job', steps: [{ t: 'First thing' }, { t: 'Second thing', hint: 'Why it comes second' }] },
      ] },
    ],
  });
})();
```

## Steps

A chapter is a list of steps that run in order. The keys decide the kind of step:

| Step | What happens |
| :--- | :--- |
| `{ say: who, text }` (or `lines: [...]`) | One person speaks; click or E to continue. `who` is a cast id, `'you'` or `'narrator'`. |
| `{ chat: [[who, text], [who, text, { radio: true }], ...] }` | A conversation. |
| `{ ask: who, q, a: [[text, true, reply], [text, false, reply]] }` | A question. Wrong answers get their reply and you try again (answers are shuffled). |
| `{ goal: text, to: spotId }` | Walk to a spot (within its `r`). |
| `{ goal: text, talk: actorId }` | Talk to someone. |
| `{ goal: text, use: spotId }` | Press E at a spot that has a `label`. |
| `{ goal: text, take: itemId }` | Pick something up. |
| `{ goal: text, bring: itemIdOrKind, use: spotId, hint }` | Carry an item to a spot. `bring` matches an item's id or its `kind`. |
| `{ goal: text, each: [{ talk }, { to }, { bring, use }, ...] }` | Several sub-goals in any order. Each may have `say: [who, text]`, `fact` and `then(S)`. |
| `{ play: minigameId, ...params }` | A minigame (below). |
| `{ fact: id }` | Unlock a journal page. Most steps also take `fact` and unlock it when they finish. |
| `{ banner: text, sub }` | A big title over the view. |
| `{ look: actorOrSpotId }` | Turn the player's view. |
| `{ scene: setId, at: [x, z, yawOrId], setup(S) }` | Fade to another set of the same event (day to night, inside to outside). |
| `{ do: (S, Story) => promise, wait }` | Anything else: move people, play an animation. Waits for the promise and/or `wait` seconds. |
| `{ wait: seconds }` | A pause. |

A chapter can have `setup(S)` to put people where they should be. It runs when the chapter starts, so the game can
resume at any chapter from a save. Keep everything a chapter needs in its `setup`, not in earlier chapters' steps.
`start: [x, z, yaw]` places the player; use an actor or spot id instead of the yaw to face them.

## The stage (`S`)

Set `build(S)` functions, `setup(S)` and `do(S)` steps all get the stage:

- `S.gb('main' | 'shell' | 'glow' | 'ds')`: batched static geometry. `GB` methods: `box`, `cbox`, `cyl`, `cone`, `ball`,
  `frustum`, `rod(a, b, r)`, `shape(points2D, depth)`, `lathe(profile)`, `geo(threeGeometry)`. Sizes are metres, colours hex.
- `S.obj(build, x, y, z, ry)`: a movable object built the same way (returns a `THREE.Group`).
- `S.solidBox(x, z, w, d, ry, { y0, y1 })`, `S.solidCircle(x, z, r)`, `S.bounds(...)`, `S.ground(fn)`.
- `S.spot(id, x, z, { r, label, dy, use, place, onDrop })`: a named place. With `label` it can be used with E;
  `use: fn` makes it usable at any time (like the workshop's journal desk).
- `S.item(id, object, { label, kind, carryScale })`: something to pick up.
- `S.actor(id, x, z, yaw, { anim, seated, y })`: a cast member. `S.extra(look, x, z, yaw, { anim })`: a background person.
  Actors have `walkTo(x, z)` (a promise), `path(points)`, `face(x, z)`, `tp(x, z, yaw)`, `set(anim)`, `hold(object)`,
  `show(bool)`. Animations: `idle, walk, talk, wave, point, cheer, clap, pull, haul, carry, work, kneel, sit, type, write,
  stand, hands, pour, lie, sleep, push`.
- `S.emitter(x, y, z, { color, size, rise, life, n, add })`: smoke, steam, sparks.
- `S.tick((dt, t) => ...)`: per-frame updates. `S.data`: a place for a set's own functions, for `do` steps to call.
- `terrainMesh(x0, z0, x1, z1, step, heightFn, colourFn)`, `canvasTex(w, h, draw)` and `texPlane(tex, w, h)` for signs
  and screens.
- People are dressed with a `look` (see the top of `src/04_people.js`): `skin` (`SKIN.light` … `SKIN.dark`), `hairStyle`,
  `beard`, `top`/`topStyle`, `bottom`/`bottomStyle`, `hat`, `collar`, `vest`, `tie`, `apron`, `glasses`, `h`, `kid` …
- Environments are data: `{ top, hor, bot, sun: [x, y, z], sunCol, sunI, hemiSky, hemiGround, hemiI, amb, fog, fogD,
  stars, clouds, sky: false }` (see `ENV_DEFAULT` in `src/02_render.js`). Ambience beds: `desert, wind, workshop,
  control, moon, hub, night, city, lanes, harbour, citynight`; `AU.jet(seconds)` roars a plane overhead. Footstep sounds: `sand, wood, stone, carpet, moon`.

## Minigames

Minigames are generic and take their words and numbers from the step, so most new events can reuse them:

| id | What you do | Main params |
| :--- | :--- | :--- |
| `rhythm` | Press on the beat, one or two lanes | `lanes: [{label, color}]`, `pattern: '0.0.1.'`, `bpm`, `need`, `chant`, `scene: 'sledge' | 'press' | fn(c, g, k)` |
| `spell` | Fill slots in order from a palette of tiles | `target: [...]`, `tiles: {id: {label, glyph, sound, mean}}`, `decoys`, `mirror`, `frame: 'cartouche' | 'stick' | 'sign'`, `prompt`, `wrong` |
| `order` | Put the steps of a job in order | `steps: [{t, hint}]`, `prompt` |
| `pour` | Hold to pour, stop in the band | `rounds`, `labels`, `band`, `speed`, `scene: fn(c, g)` |
| `align` | Line up a plumb line with two turning stars | `stars`, `speed` |
| `count` | Read Egyptian numerals, hand out that many | `rounds: [n, ...]`, `who: [...]` |
| `tunnel` | Test options, record results, choose the best | `wings: [{name, camber, aspect, lift, note}]`, `need` |
| `kite` | Keep a glider level in gusts | `time`, `gust` |
| `photo` | Press the shutter at the right moment | `speed` |
| `lookup` | Find a code on a list | `codes: [[code, text, explanation]]`, `alarms: [...]` |
| `lander` | Land gently on flat ground | `fuel` |
| `milktea` | Pull milk tea: lift the pot into a band, keep the stream in the cup | `pours`, `need` |
| `neon` | Heat a glass tube, turn it to match a pattern, bend; then it lights | `pattern: [[x, y]]` (600 × 360), `color`, `gas`, `label` |
| `maze` | Walk dark lanes with a torch to find doors | `w`, `h`, `seed`, `stops: [{label, short, cjk, color, found}]`, `battery`, `start`, `listTitle` |
| `approach` | Fly the checkerboard turn into Kai Tak on a map | `wind` |
| `minibus` | Shout your stop in time, then pay the exact fare in coins | `rides: [{stop, sign, before: [...], after, fare, who, thanks, intro}]` |
| `mahjong` | Sort tiles into four sets and a pair; find the winning tile | `rounds: ['sets', 'wait']`, `seed` |

Every minigame also takes `title`, `how`, `intro`, `winText` and `fact`. Failing makes the next try easier
(`g.assist` goes up), and after three tries a Skip button appears: history is fixed, so no one gets stuck.

A new minigame is a file `src/3N_mg_name.js` with `Minigames.add('name', { title, how, buttons(g), init(g, p),
update(g, dt), draw(g, c), tap(g, x, y) })`, drawing on a 960 × 540 canvas. Copy a short one (`order` or `pour`) to
start. Use `D.*` helpers for rounded boxes, wrapped text and bars, and `g.win()`, `g.fail(text)`, `g.tip(text)`.

## Dates, places, Chinese text

- A chapter can move the story: `{ title, set, when: '5 July 1998', place: 'Kowloon City', year: 1998, ... }`. The
  banner shows the new date when it changes, and the time-travel animation uses the chapter's `year` when a save
  resumes there. To jump in the middle of an event, end a chapter with `{ do: () => warpTo(1998, 'label') }` and start
  the next with `{ do: () => warpEnd() }` (see `54_kowloon.js`).
- Chinese characters work in signs and minigames (draw them with the `CJK` font stack). Run
  `python3 tools/cjk_font.py` after adding new ones, so they are in the embedded font.

## Extras: a photo album and odd jobs

Both are optional and live in `src/11_extras.js`.

**Album.** `album: { title, text, shots: { id: { t: 'what to photograph', x: 'caption' } } }`, and in a set
`S.shot(id, x, z, { dy, reach, when })` where the shot is taken from: look at `(x, y + dy, z)` within `reach` and press E.
`when(S)` may return a hint string while the shot isn't possible yet (no plane overhead, say). A story step can take a
shot too: `{ goal, use: spotId, then: () => Album.snap('yourid', 'shotId') }`. The journal shows the photos.

**Odd jobs.** `jobs: { id: { t, giver, set, fact, intro: [[who, text]], busy, steps: [...], end: [[who, text]] } }`.
Talking to the giver (marked with a floating "!") offers the job; steps are `{ goal, talk, bring?, say? }`,
`{ goal, use, bring?, say? }` or `{ play: minigameId, ...params }` (starts at once). Job items are ordinary `S.item()`s
that can be picked up while a job wants them. Jobs only run in their own set, alongside the main story, so keep `bring`
goals out of the chapters that offer jobs. Finishing a job unlocks its `fact`; the journal lists the jobs.

## Writing for this game

- Readers are 8 to 12. Short sentences, friendly people, one idea per line. Mark key words with `*stars*`.
- Real people get `real: true` and an `about` line. Say in `note` who is made up.
- When historians aren't sure (how the pyramid ramps worked, what Gutenberg looked like), say so in the text.
- The player is a helper. They never change what happened; they help it happen and learn why.
- Aim for 15–20 minutes: about four or five chapters, three or four activities, 12–15 journal pages, with a couple of
  pages hidden in people's `lines` for explorers.
