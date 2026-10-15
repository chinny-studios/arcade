RP.god(); RP.peace(); RP.all(); RP.P.cur='fists'; RP.tp(30, 15, -Math.PI/2); RP.sim(0.6);
const ids = ['fists','pistol','carbine','thermal','repeater','fusion','mine','mortar','concussion','cannon'];
out.i = 0;
//--- shot vm_fists
RP.give('pistol'); RP.sim(0.6);
//--- shot vm_pistol
RP.give('carbine'); RP.sim(0.6);
//--- shot vm_carbine
RP.give('repeater'); RP.sim(0.6);
//--- shot vm_repeater
RP.give('cannon'); RP.sim(0.6); RP.fire(true); RP.sim(0.05);
//--- shot vm_cannon
RP.fire(false); RP.press('Digit4'); RP.sim(0.6);
//--- shot vm_thermal
