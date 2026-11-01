# Away Message — design notes

A nostalgic sandbox: a whole early-2000s PC desktop you can play with, framed as one Friday evening in June 2001.
No win/lose; the goal is to rediscover the era and tick off **achievements**. Parody throughout, 100% original
assets (no real brands, logos, sounds or songs). Plain DOM + canvas, no libraries.

## Pillars (what the player does)

- **Dial up** with AmeriNet: the modem handshake plays, three connect steps, then you're online. You share the
  phone line — **Mom** interrupts and, if ignored, picks up the extension and drops the connection.
- **Download music** on Snapster: search parody bands, pick peers (fast ones are on Cable/DSL/T1), watch transfers
  race on the Transfer tab while other people leech off you. Files aren't always real: fakes (silence / some guy
  talking), mislabeled songs, half-finished rips, low bitrate, and the occasional virus-with-a-`.exe`.
- **Play** downloads in ZapAmp: a skinnable player with a real spectrum analyzer wired to the Web Audio graph.
- **Chat** on BuddyChat: buddies sign on/off, set away messages, and run scripted storylines (a crush subplot, a
  song request, a guestbook). Write your profile and away messages (with song lyrics and the survey), and rank
  everyone's away messages on the **Deep-o-Meter**.
- **Bongo Buddy**: a pink gorilla drawn live on canvas who walks around, sits on windows, dances to the music,
  tells jokes and facts, **sings** (formant voice + lyrics), and keeps installing "free" adware. Removing him takes
  Ad-Be-Gone (to disable his updater) **and** Add/Remove Programs — and he gets stuck at 99%.

- **Progz** (`24_progz.js`): PhAnToM 3.2, a parody Visual Basic "prog" from a GeoPages warez site (it needs
  `vb40032.dll` from the same site, like they all did). A **punter** sends an IM stuffed with thousands of tags that
  older BuddyChat clients choke on while drawing, which signs the victim off (4.7 shrugs off small punts; buddies
  with anti-punt bounce it and punt you back). The **IM bomber** hits flood control at 20 and gets you warned. The
  **fader** wraps each letter in its own `<font color>` for away messages and profiles. **Macros** scroll ASCII art
  into a chat room, and **anti-punt** (only while the prog is open) throws punts away. Someone in the Progz 4 Trade
  room always tries to punt you. Every punt, bomb or scroll is a TOS report: three brings a warning e-mail, five and
  AmeriNet ends your session. All of it is simulated; nothing real is sent anywhere.

## Architecture

One build concatenates `src/NN_*.js` into a single IIFE, so every file shares one scope (names are global across
files; private helpers hide in their own closures). `src/page.html` holds the shell (classic Windows CSS, the
desktop/taskbar DOM) and is split on `<div id="app">`.

### Time

Everything deferred runs on **game time** `T.t`, driven by `stepWorld(dt)` from the frame loop in `99_main.js`.
`after(sec, fn)`, `every(sec, fn, jitter)`, `onTick(fn)` and `sleep(sec)` all use it, so `AM.sim(sec)` can
fast-forward the whole simulation headlessly, and time pauses under a full-screen `#screen` (boot, BSOD, ScanDisk).
The in-game wall clock starts 7:30 PM, Fri Jun 15 2001.

### Audio (all synthesized)

`02_audio.js` builds one AudioContext with sfx / music / voice buses and an analyser on the music bus. `tone()` and
`noise()` are the primitives; `SFX` has every system sound, including the ~9 s dial-up handshake. `03_voice.js` is a
3-formant singing synth (`voiceNote`/`singSyl`) plus a `SPEECH` wrapper over `speechSynthesis` (falls back to
`babble()` gibberish when no engine). `04_music.js` composes a full song from a seed (`artist|title|version`) in one
of ~13 genre templates (chords, drums, bass, lead, "vox" syllables), then plays it with a look-ahead sequencer `MP`;
low "bitrate" files get low-passed. The ZapAmp analyzer and Bongo's dancing read `MP.beat()`.

### Files & windows

`07_fs.js` is a tiny virtual FS in `S.files` ({ id, name, dir, size, track?, payload?, app? }) with Explorer,
Notepad, a surprisingly complete DOS prompt and Run. `06_wm.js` is the window manager (drag, resize, minimize/
maximize with zoom animation, taskbar buttons, drop-down + context menus, message/input boxes, list views, tabs,
property sheets).

### The "virus" model (all cosmetic)

A bad download carries a `payload`. Running it (unless VirusBlaster has current defs and blocks it) triggers a
harmless effect in `19_virus.js`/`20_fx.js`: pop-up ads, a flipped desktop, mouse trails, a "melt", a runaway
cursor, or a fake BSOD. Nothing touches real browser state or storage. VirusBlaster scans `S.files` and clears
`payload`; Ad-Be-Gone removes Bongo's adware and disables his reinstaller. Keep every "virus" purely cosmetic.

## Adding content

- **A song:** add `[id, artist, title, genre]` to `SONGS` in `11_catalog.js` (genre must exist in `GENRES` in
  `04_music.js`). The generator does the rest. Blocked bands (the Metallicuh gag) go in `BLOCKED`.
- **A genre:** add a template to `GENRES` (bpm range, chord progressions, drum patterns, instrument picks).
- **A buddy / storyline:** add to `BUDDIES` in `14_buddies.js` (profile, away messages, `threads` of conversation
  nodes `{ say, opts:[[reply,next,rel]], fx, quest }`). Small-talk replies come from `buddyReply()`.
- **A Bongo song:** add to `BONGO_SONGS` (`[syllable, midi, beats]` + display lines) in `17_bongo.js`.
- **An app / adware / download site:** register in `APPS` (`08_desktop.js`), `ADWARE` (`17_bongo.js`), or
  `SITES`/`DOWNLOADS` (`18_web.js`/`23_install.js`).
- **An achievement:** add to `ACH` in `22_achievements.js` and call `unlock('id')` where it's earned.

## Things to keep true to the era

Shared dial-up phone line; "You've got mail"; chain letters and surveys; mislabeled MP3s; backwards-cap mascots;
guestbooks and GeoPages; 800×600; "best viewed in Internet Exploder"; ScanDisk after a bad shutdown; the blue
screen. When in doubt, make it a joke, not a real hazard.
