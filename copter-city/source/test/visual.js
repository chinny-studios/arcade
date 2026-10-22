// screenshot tour: every city from the air, then the look of each kind of call.
// Each segment runs on its own, so helpers live on `out`.
out.city = (id, hour = 11) => { CC.f.startCity({ city: id, heli: 'raptor', free: true, hour, dispatch: false, quiet: true }); };
out.view = (x, z, alt, yaw, mode = 'chase') => { CC.tp(x, z, alt, yaw); CC.CAM.mode = mode; CC.CAM.snap = true; CC.sim(0.3); CC.render(); };
out.city('halley', 15); out.view(CC.CITY.size * 0.3, CC.CITY.size * 0.3, 90, -2.3, 'far');
//--- shot v_halley
out.city('granite', 17.5); out.view(CC.CITY.size * 0.45, CC.CITY.size * 0.8, 80, 0, 'far');
//--- shot v_granite
out.city('sunset', 12); out.view(CC.CITY.size * 0.5, CC.CITY.size * 0.5, 100, 1.2, 'far');
//--- shot v_sunset
out.city('metro', 19); out.view(CC.CITY.size * 0.3, CC.CITY.size * 0.75, 120, -0.6, 'far');
//--- shot v_metro
out.city('metro', 11);
out.c = CC.call('fire'); CC.sim(25);
const B = out.c.B; out.view(B.cx + 40, B.cz + 40, B.h + 15, Math.atan2(40, 40)); CC.sim(0.5); CC.render();
//--- shot v_fire
const B = out.c.B; CC.f.selectEquip('bucket'); CC.HELI.bucket.water = 1000; CC.tp(B.cx, B.cz + 20, B.h + 12, 0); CC.f.useEquip(); CC.sim(0.8); CC.render();
//--- shot v_dump
CC.f.finishCall(out.c, true, 0, ''); CC.FIRE.list.splice(0);
out.c = CC.call('medevac'); out.view(out.c.x + 22, out.c.z + 22, 10, Math.atan2(22, 22));
//--- shot v_medevac
out.c = CC.call('riot'); out.view(out.c.x + 25, out.c.z + 25, 14, Math.atan2(25, 25)); CC.sim(1); CC.render();
//--- shot v_riot
out.c = CC.call('ship'); out.view(out.c.x + 30, out.c.z + 30, 14, Math.atan2(30, 30)); CC.sim(2); CC.render();
//--- shot v_ship
out.c = CC.call('twister'); CC.sim(20); out.view(out.c.x + 140, out.c.z + 140, 40, Math.atan2(140, 140)); CC.sim(1); CC.render();
//--- shot v_twister
out.c = CC.call('spill'); CC.sim(10); out.view(out.c.x + 30, out.c.z + 30, 18, Math.atan2(30, 30)); CC.sim(1); CC.render();
//--- shot v_spill
out.c = CC.call('flood'); out.view(out.c.x + 30, out.c.z + 30, 18, Math.atan2(30, 30)); CC.f.selectEquip('ladder'); CC.sim(2); CC.render();
//--- shot v_flood
CC.f.setTimeOfDay(22, true); CC.G.hour = 22; out.c = CC.call('crime'); CC.sim(3); CC.f.selectEquip('spot'); CC.f.useEquip(); out.view(out.c.car.x + 30, out.c.car.z + 30, 35, Math.atan2(30, 30)); CC.sim(1); CC.render();
//--- shot v_crime_night
CC.f.setTimeOfDay(11, true); CC.G.hour = 11; CC.tp(CC.HELI.x, CC.HELI.z, 0); CC.f.exitHeli(); CC.sim(1); CC.render();
//--- shot v_foot
return CC.stats();
