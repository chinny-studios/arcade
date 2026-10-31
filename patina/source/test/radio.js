PA.sim(2);
return PA.stats();
//--- shot r_front
PA.view(Math.PI + 0.5, 0.25, 0.9, [0, 0.12, 0]);
//--- shot r_back
PA.view(0.25, 0.08, 0.42, [0.04, 0.12, 0.05]);
//--- shot r_close
PA.workAll('solvent', 2); PA.workAll('sand', 2, ['Cabinet', 'Grille frame']);
PA.view(0.35, 0.16, 0.95, [0, 0.125, 0]);
//--- shot r_sanded
PA.workAll('finish', 2); PA.workAll('polish', 3, ['Chrome trim', 'Knobs', 'Dial glass']); PA.workAll('wire', 2, ['Chassis']);
return PA.progress();
//--- shot r_done
PA.finish(); PA.sim(4); PA.settle(); PA.sim(3); PA.view(0.3, 0.12, 0.8, [0, 0.125, 0]);
//--- shot r_reveal
PA.view(Math.PI + 0.6, 0.3, 0.75, [0, 0.12, 0]);
//--- shot r_revealback
