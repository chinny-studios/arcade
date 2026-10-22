// phone layouts with the touch controls showing
CC.Input.setMode('touch'); CC.tp(CC.HELI.x, CC.HELI.z, 30); CC.call('fire'); CC.sim(1); CC.render();
//--- shot m_play
CC.f.selectEquip('ladder'); CC.tp(CC.HELI.x, CC.HELI.z, 0); CC.f.exitHeli(); CC.sim(1); CC.render();
//--- shot m_foot
CC.UI.show('hangar'); CC.f.hangarTab('helis'); CC.sim(0.2); CC.render();
//--- shot m_hangar
return { w: innerWidth, h: innerHeight };
