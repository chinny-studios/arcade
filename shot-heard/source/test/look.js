// visual tour: a house up close, soldiers up close, the viewmodel while aiming and loading
SH.peace(true); SH.god(true); SH.sim(5);
const b = SH.BLD[0].b;
SH.tp(b.x + 14, b.z + 10); SH.aimAt(b.x, b.y + 3, b.z); SH.sim(0.1);
return { b: [b.x, b.y, b.z, b.style], ground: F.heightAt(b.x, b.z) };
//--- shot look_house
const friends = SH.SOLDIERS.filter((s) => s.team === P.s.team && s.alive && !s.isPlayer && !s.mount);
const f = friends[0];
SH.tp(f.pos.x + 3, f.pos.z + 3); SH.aimAt(f.pos.x, f.pos.y + 1.2, f.pos.z); SH.sim(0.05);
return friends.length;
//--- shot look_men
SH.holdMouse('R', true); SH.sim(0.6);
//--- shot look_aim
SH.holdMouse('R', false); P.s.wp.loaded = 0; SH.press('KeyR'); SH.sim(0.1); SH.sim(5.5);
//--- shot look_ram
SH.sim(2.4);
//--- shot look_ram2
