// Phone-sized layouts (run with --w 390 --h 844, and --w 844 --h 390): driving HUD with touch controls, the care panel.
RR.Input.setMode('touch');
RR.call('chest'); RR.sim(3); RR.render();
//--- shot mob1_drive
RR.toScene(); RR.toPatient(); RR.act('ppe'); RR.act('impression'); RR.act('monitor', 'partner', false); RR.sim(1); RR.render();
//--- shot mob2_care
RR.f.closeCare(); RR.UI.show('help'); RR.sim(0.2);
//--- shot mob3_help
