// Third person on foot, cockpit view, building ghost
FH.mute(); FH.sim(0.5);
P.tp = true; FH.sim(0.5);
return { tp: P.tp };
//--- shot view_tp
P.tp = false;
F.boardShip(); FH.sim(0.3); S.cockpit = true; FH.press('Space'); FH.sim(4);
return { state: S.state };
//--- shot view_cockpit
S.cockpit = false; FH.sim(0.5);
return 1;
//--- shot view_chase
