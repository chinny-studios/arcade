// screenshot tour: the title, then a few spots on the island and indoors
KE.render(); await wait(300);
//--- shot title
await KE.start({ area: 'isle', at: [-74, 14, Math.PI], items: { pebble: 1 }, flags: { sawNotice: true, intro: true } });
KE.sim(0.5); KE.render();
return KE.state();
//--- shot isle_start
KE.tp('isle', 46, 14, Math.PI); KE.sim(0.5);
return KE.ents().length;
//--- shot village
KE.tp('cottage', 0, 1.2, Math.PI); KE.sim(0.3);
//--- shot cottage
