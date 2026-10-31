PA.sim(2);
return [PA.stats(), [...PA.G.piece.parts, ...PA.G.piece.props].map((p) => p.name + ':' + p.n).join(' ')];
//--- shot v_front
PA.view(Math.PI + 0.4, 0.12, 1.3, [0, 0.31, -0.03]);
//--- shot v_back
PA.view(0.5, 0.15, 0.45, [0, 0.2, 0.0]);
//--- shot v_close
PA.view(0.9, 0.05, 0.4, [0, 0.52, -0.06]);
//--- shot v_scroll
PA.workAll('solvent', 2); PA.workAll('finish', 2); PA.workAll('polish', 3);
PA.finish(); PA.sim(4); PA.settle(); PA.sim(1); PA.view(0.45, 0.1, 1.4, [0, 0.31, -0.03]);
//--- shot v_reveal
PA.view(Math.PI - 0.5, 0.15, 0.7, [0, 0.22, -0.04]);
//--- shot v_revealback
