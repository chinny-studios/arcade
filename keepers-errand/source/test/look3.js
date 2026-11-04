// the sunny ending outdoors, then a phone-sized view of the harbour
await KE.start({ area: 'isle', at: [-78, 9, Math.PI / 2], items: { pebble: 1 }, flags: { sawNotice: true, intro: true, pebbleUp: true, lighthouseOpen: true, bossDone: true } });
KE.sim(1.0);
//--- shot s_sun
KE.tp('isle', 50, 5, Math.PI / 4); KE.sim(0.6);
//--- shot s_harbour_sun
