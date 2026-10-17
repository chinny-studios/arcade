// Phone-sized layouts (run with --w 390 --h 844, and --w 844 --h 390): driving HUD with touch controls, the care panel.
RR.Input.setMode('touch');
RR.toPost(); RR.sim(0.5); RR.render();
//--- shot mob0_post
RR.call('chest', { respond: false }); RR.sim(0.5); RR.render(); await wait(1500);
//--- shot mob0_pager
RR.f.respond(); RR.sim(3); RR.render();
//--- shot mob1_drive
RR.toScene(); RR.toPatient(); RR.act('ppe'); RR.act('impression'); RR.act('monitor', 'partner', false); RR.sim(1); RR.render();
//--- shot mob2_care
RR.f.closeCare(); RR.UI.show('help'); RR.sim(0.2);
//--- shot mob3_help
