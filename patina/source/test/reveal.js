PA.workAll('solvent', 2); PA.workAll('polish', 3); PA.workAll('wire', 2, ['Hour hand', 'Minute hand', 'Seconds hand']); PA.workAll('polish', 2);
PA.finish(); PA.sim(3); PA.settle(); PA.sim(1);
await wait(3000);
const r = document.querySelector('#reveal'); return [r.hidden, getComputedStyle(r).opacity, getComputedStyle(r).display, r.getBoundingClientRect().height, document.querySelector('#reveal h2').textContent];
//--- shot reveal
