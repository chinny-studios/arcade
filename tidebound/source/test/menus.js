// Screenshots of the title, start menu, party, summary, bag, dex and trainer card.
TB.noEncounters = true; TB.autoText = false;
TB.giveMon('jellink', 8); TB.giveMon('sparkit', 7); TB.give('greatorb', 3); TB.give('oranberry', 2); TB.give('hm_chop');
TB.G().dex.seen.gullip = true;
await TB.tp('shellport', 13, 8); await TB.sim(0.5);
out.m = TB.menus.start(); await TB.sim(0.5);
//--- shot u_start
TB.menus.party({ mode: 'view' }); await TB.sim(0.5);
//--- shot u_party
TB.menus.summary(TB.G().party[0]); await TB.sim(0.5);
//--- shot u_summary1
await TB.tap('right'); await TB.sim(0.3);
//--- shot u_summary2
await TB.tap('right'); await TB.sim(0.3);
//--- shot u_summary3
TB.menus.bag({ mode: 'field' }); await TB.sim(0.5);
//--- shot u_bag
TB.menus.dex(); await TB.sim(0.5);
//--- shot u_dex
TB.title.show(); await TB.sim(1.5);
//--- shot u_title
await TB.tap('a'); await TB.sim(0.6);
//--- shot u_title_menu
