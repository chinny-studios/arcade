PA.shelf(); PA.sim(0.5); PA.view(PA.CAM.yaw, 0.08, 0.16, [0, 0.044, 0]);
//--- shot title
await PA.start('watch'); PA.workAll('solvent', 2); PA.workAll('polish', 3); PA.workAll('wire', 2, ['Hour hand', 'Minute hand', 'Seconds hand']); PA.workAll('polish', 2);
PA.finish(); PA.sim(3); PA.settle();
return [PA.G.state, PA.G.piece.running];
//--- shot reveal
PA.ba(0.5); PA.view(0.2, 0.1, 0.14, [0, 0.044, 0]);
//--- shot ba
PA.photo(); PA.G.lightAng = 0.6; PA.sim(0.1);
//--- shot photo
