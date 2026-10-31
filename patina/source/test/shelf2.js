await PA.start('watch'); PA.workAll('solvent', 2); PA.workAll('polish', 3); PA.workAll('wire', 2, ['Hour hand', 'Minute hand', 'Seconds hand']); PA.workAll('polish', 2);
PA.finish(); PA.sim(2); PA.settle();
PA.shelf();
for (let i = 0; i < 200 && (!PA.G.piece || PA.G.piece.id !== 'radio'); i++) await wait(500);
PA.sim(3);
return [PA.G.piece.id, PA.R.ttR, [...document.querySelectorAll('.card')].map((c) => c.textContent.replace(/\s+/g, ' ').trim())];
//--- shot shelf_radio
