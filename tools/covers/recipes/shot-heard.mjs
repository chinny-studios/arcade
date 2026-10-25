// From the parapet of the Breed's Hill redoubt: a line of redcoats presents through its own smoke.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'SH'); await wait(1000);
  await page.evaluate(() => {
    SH.manual(true);
    SH.start({ map: 'bunker', side: 0, size: 32 }); SH.god(true); SH.peace(true);
    const F = SH.f, me = SH.PL.s;
    // the east face of the redoubt runs from (42,-32) to (44,10); stand on the step just inside it
    const px = 42.6, pz = -6, tx = 100, tz = 18;
    SH.tp(px, pz); SH.sim(0.1);
    const yaw = Math.atan2(tx - px, tz - pz), fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const reds = SH.SOLDIERS.filter((s) => s.bot && s.team !== me.team && !s.bot.rider && !s.bot.sailor).slice(0, 14);
    reds.forEach((s, i) => {
      const d = 31 + (i % 2) * 2.2, side = (i - 7) * 1.35;
      const x = px + fx * d + rx * side, z = pz + fz * d + rz * side;
      F.spawnSoldier(s, x, z, yaw + Math.PI);
      s.cls = 'line'; s.bot.hold = true; s.wantAim = true; s.pitch = 0.12; s.hand = 'primary';
    });
    const blues = SH.SOLDIERS.filter((s) => s.bot && s.team === me.team && !s.bot.rider && !s.bot.sailor && s.cls === 'line').slice(0, 3);
    blues.forEach((s, i) => {
      const side = [-2.6, 2.4, 4.6][i], x = px + rx * side + fx * 0.3, z = pz + rz * side + fz * 0.3;
      F.spawnSoldier(s, x, z, yaw); s.bot.hold = true; s.wantAim = true; s.pitch = -0.08;
    });
    SH.sim(1.2);
    // half the British line fires: smoke rolls toward the hill
    reds.forEach((s, i) => { if (i % 2 === 0) F.fxMusket(s.muzzle.x, s.muzzle.y, s.muzzle.z, -fx, 0.02, -fz, 1); });
    SH.sim(0.7);
    reds.forEach((s, i) => { if (i % 3 === 1) F.fxMusket(s.muzzle.x, s.muzzle.y, s.muzzle.z, -fx, 0.02, -fz, 1); });
    SH.sim(0.25);
    const mid = reds[6], e = SH.camera.position;
    const pitch = Math.atan2(mid.pos.y + 1.3 - e.y, Math.hypot(mid.pos.x - e.x, mid.pos.z - e.z));
    SH.look(yaw - 0.1, pitch + 0.06); SH.sim(0.5); SH.look(yaw - 0.1, pitch + 0.06); SH.sim(0.05);
    for (const id of ['#keyHint', '#msgs', '#fps', '#prompt']) document.querySelector(id).style.visibility = 'hidden';
    SH.render();
  });
  await wait(800);
  await shot();
};
