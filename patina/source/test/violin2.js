PA.sim(2); PA.workAll('solvent', 2); PA.workAll('finish', 2); PA.workAll('polish', 3);
PA.finish(); PA.sim(4); PA.settle(); PA.sim(1); document.querySelector('#reveal').hidden = true;
PA.G.state = 'photo';
PA.view(Math.PI + 0.25, 0.05, 0.42, [0.0, 0.2, -0.05]);
//--- shot v_backclose
PA.view(Math.PI + 0.75, 0.05, 0.42, [0.0, 0.2, -0.05]);
//--- shot v_backclose2
PA.view(0.2, 0.15, 0.4, [0.0, 0.18, 0.0]);
//--- shot v_topclose
