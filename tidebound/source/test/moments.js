// Screenshots of key moments: a trainer battle intro, a catch, an evolution. Real-time text and animations.
TB.noEncounters = true; TB.autoText = false; TB.fast = false;
await TB.tp('route1', 13, 30); await TB.sim(0.5);
TB.trainer({ id: 'x', cls: 'YOUNGSTER', name: 'JOEY', sprite: 'youngster', party: [['dunebun', 4], ['gullip', 5]], money: 20, intro: 'Hi!', lose: 'Aww.' });
await TB.sim(1.8);
//--- shot k_trainer_intro
await TB.tap('a'); await TB.sim(1.2); await TB.tap('a'); await TB.sim(1.5);
//--- shot k_trainer_sendout
for (let i = 0; i < 8; i++) { await TB.tap('a'); await TB.sim(0.6); }
//--- shot k_trainer_more
