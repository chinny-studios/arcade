# Rimward

2D space survey game: fly past charted space, scan worlds, ride gravity wells, skim stars for fuel, bank data at a relay.

- **Source:** single file. `index.html` is the source; edit it directly. It is a 2D canvas game with no libraries.
- **Music:** `gravity_at_the_edge.mp3` (a copy of Gravity at the Edge's track, not MIT; see THIRD_PARTY.md). Serve the folder over HTTP for audio.
- **Saves:** `localStorage['rimward.save.v1']` (the survey) and `'rimward.prefs'`.
- **Debug hook:** none. The title screen is `#titleScreen` and `#btnNew` starts a survey.
- **Input:** W thrust, A/D turn, S brake, Shift boost, M star chart. On touch, drag anywhere to steer (`.touch` class on the game element).
