PA.view(0.0, 0.08, 0.13, [0, 0.042, 0]);
//--- shot front
PA.open(true); PA.view(-0.3, 0.12, 0.15, [-0.01, 0.042, 0.005]);
//--- shot opendirty
PA.workAll('solvent', 2); PA.workAll('polish', 3); PA.workAll('wire', 2, ['Hour hand', 'Minute hand', 'Seconds hand']); PA.workAll('polish', 2);
//--- shot open
PA.open(false); PA.view(Math.PI * 0.8, 0.15, 0.13, [0, 0.042, 0]);
//--- shot cleanback
