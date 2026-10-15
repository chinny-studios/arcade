# Port Calder

Open-world city by the bay: walk the streets, jack any car you can get into, drift through the cul-de-sacs.

- **Source:** single file. `index.html` is the source; edit it directly. The code is split across two IIFEs.
- **Libraries:** three.js r128 from cdnjs, so the game needs network on first load.
- **Debug hook:** none. `#start` begins the game, F jacks the nearest car, WASD drives.
- **Input:** keyboard and mouse. On touch (`body.touch`) there are on-screen buttons (`#bA` jack, `#bB` run, `#bC` punch).
