// wrong tools should explain themselves (screen points found with PA.pickAt)
PA.sim(2); PA.view(0.0, 0.1, 0.7, [0, 0.125, 0]);
const find = (name) => { for (let y = 120; y < 620; y += 20) for (let x = 300; x < 1100; x += 20) { const h = PA.pickAt(x, y); if (h && h.part === name) return [x, y]; } };
const cab = find('Cabinet'), knob = find('Knobs'), cloth = find('Grille cloth');
const r = { cab, knob, cloth };
const go = (xy, tool, k, secs = 1.5) => { PA.brush(xy[0], xy[1], tool, secs); r[k] = PA.lastAdvice(); };
go(cab, 'finish', 'finishOnDirtyWood');
go(knob, 'sand', 'sandOnKnob');
go(cloth, 'finish', 'finishOnCloth');
go(knob, 'polish', 'polishGrimyKnob');
PA.brush(cab[0], cab[1], 'solvent', 2); PA.brush(cab[0], cab[1], 'sand', 3);
go(cab, 'finish', 'finishOnStrippedWood');
return r;
