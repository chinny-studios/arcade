PA.sim(2); PA.view(0.55, 0.3, 0.5, [0.03, 0.3, 0.04]);
//--- shot k_close
PA.workAll('solvent', 2); PA.workAll('sand', 2, ['Bowl', 'Neck guard', 'Visor and turnbacks']); PA.workAll('wire', 2, ['Bowl', 'Neck guard', 'Visor and turnbacks']); PA.workAll('finish', 2); PA.workAll('polish', 3);
PA.finish(); PA.sim(4); PA.settle(); PA.sim(1); document.querySelector('#reveal').hidden = true; PA.view(0.45, 0.2, 1.3, [0, 0.25, 0]);
//--- shot k_reveal
