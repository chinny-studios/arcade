PA.view(0.0, 0.08, 0.13, [0, 0.042, 0]);
//--- shot front
PA.view(Math.PI, 0.08, 0.13, [0, 0.042, 0]);
//--- shot back
PA.view(0.0, 0.08, 0.13, [0, 0.042, 0]); PA.render();
out.r = [PA.brush(640, 330, 'solvent', 1.5, 0.6), PA.brush(700, 420, 'solvent', 1.5, 0.6), PA.brush(640, 330, 'polish', 2, 0.6)];
return out.r;
//--- shot brushed
PA.workAll('solvent', 2); PA.workAll('polish', 3); PA.workAll('wire', 2, ['Hour hand', 'Minute hand', 'Seconds hand']); PA.workAll('polish', 2);
return PA.progress();
//--- shot clean
PA.view(Math.PI * 0.8, 0.15, 0.13, [0, 0.042, 0]);
//--- shot cleanback
PA.open(true); PA.view(-0.3, 0.12, 0.14, [0, 0.042, 0.005]);
//--- shot open
