// The Firehawk dumping its bucket on a burning building in Port Halley at sunset, chase camera, HUD hidden.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'CC');
  await page.evaluate(() => {
    localStorage.clear();
    CC.start({ city: 'halley', heli: 'firehawk', hour: 17.9 });
    CC.f.setRes(480);
    // a mid-rise near the middle of town, burning hard
    const S = CC.CITY.size, cands = CC.CITY.buildings.filter((b) => !b.noFire && !b.gable && b.h > 14 && b.h < 30 && Math.hypot(b.cx - S * 0.45, b.cz - S * 0.4) < 160);
    const B = cands[0];
    CC.call('fire', { B, I: 0.9 });
    CC.sim(20);
    CC.f.selectEquip('bucket'); CC.HELI.bucket.water = 1400;
    CC.tp(B.cx + 6, B.cz + 16, B.h + 14, 0.25);
    CC.sim(0.6);
    CC.CAM.userYaw = 0.9; CC.CAM.userPitch = -0.08; CC.CAM.zoom = 1.05; CC.CAM.orbitT = 99; CC.CAM.snap = true;
    CC.OPTS.markers = false;
    CC.f.useEquip(); CC.sim(0.45);
    CC.hideHUD(true);
  });
  await wait(1500); await shot();
};
