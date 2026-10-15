AP.god(); AP.peace(); AP.all();
AP.tp(13, 7, -Math.PI / 2); AP.sim(0.1);
for (const id of ['pk9', 'ar62', 'zeus', 'camera']) { AP.select(id); AP.render(); await new Promise(r => setTimeout(r, 400)); window.__shots = (window.__shots || 0) + 1; }
AP.select('pk9'); AP.render();
//--- shot vm_pk9
AP.select('ar62'); AP.render();
//--- shot vm_ar62
AP.select('zeus'); AP.render();
//--- shot vm_zeus
AP.select('vektor'); AP.render();
//--- shot vm_vektor
