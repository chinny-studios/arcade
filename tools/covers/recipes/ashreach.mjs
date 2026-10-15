// A new trooper fighting a Rust Hound outside the Landfall shuttleport, MMO HUD and chat in view.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'AR', 'ready');
  await page.addStyleTag({ content: '#fps{visibility:hidden!important}' });
  await page.evaluate(() => { AR.quick('trooper'); AR.setTimeOfDay(0.42); AR.sim(2); });
  await wait(7000);
  await page.evaluate(() => {
    const P = AR.PLAYER, ids = Object.keys(AR.MOB_T);
    const id = ids.find((k) => /scav|rat|leet|crab|hound|drone|beast/i.test(k)) || ids[0];
    const m = AR.spawnMob(id, 2, P.pos.x + Math.sin(P.yaw || 0) * 9, P.pos.z + Math.cos(P.yaw || 0) * 9);
    AR.setTarget(m); AR.startAttack(P, m); AR.sim(1.5);
  });
  await wait(1500);
  await page.evaluate(() => { AR.CAM.yaw += 0.6; AR.CAM.pitch = 0.25; AR.sim(0.8); });
  await wait(1500); await shot();
};
