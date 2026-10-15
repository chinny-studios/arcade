// Gaki, kappa, ochimusha and an oni lined up in an autumn meadow (the spot is random, so retry for a torii).
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'TK');
  await page.evaluate(async () => {
    localStorage.clear(); await TK.start({ seed: 'test' });
    const F = TK.f, { heightAt, CAM, spawnMob } = F, P = TK.P;
    const aimAt = (x, y, z) => { for (let k = 0; k < 4; k++) { const c = TK.R.camera.position; const dx = x - c.x, dy = y - c.y, dz = z - c.z, l = Math.hypot(dx, dy, dz); CAM.yaw = Math.atan2(dx, dz); CAM.pitch = Math.asin(dy / l); P.yaw = CAM.yaw; TK.sim(1 / 30); } };
    TK.peace(true); TK.god(true); TK.mute(); TK.time(TK.G.time + 200);
    let bx = 0, bz = 0, best = 1e9; // flattest open meadow spot
    for (let k = 0; k < 400; k++) {
      const x = (Math.random() - 0.5) * 500, z = (Math.random() - 0.5) * 500, h = heightAt(x, z);
      if (h < 3 || F.forestAt(x, z) > 0.2) continue;
      let sl = 0; for (let i = -15; i <= 15; i += 5) sl += Math.abs(heightAt(x + i, z) - h) + Math.abs(heightAt(x + i, z - 9) - h);
      if (sl < best) { best = sl; bx = x; bz = z; }
    }
    TK.tp(bx, bz - 10);
    ['deer', 'boar', 'gaki', 'kappa', 'gaki_f', 'gaki_shaman', 'gaki_brute', 'ochimusha', 'ochimusha_archer', 'oni']
      .forEach((t, i) => { const m = spawnMob(t, bx - 13 + i * 2.9, bz, { stars: 0 }); m.yaw = Math.PI; });
    F.MOBS_LIVE.forEach((m) => { m.def = Object.assign({}, m.def, { sight: 0, hear: 0 }); m.wanderT = 999; m.goal = null; });
    TK.sim(0.3); aimAt(bx, heightAt(bx, bz) + 1.5, bz); TK.sim(0.6);
    document.querySelector('#crowBox').style.visibility = 'hidden';
    document.querySelector('#banner').style.visibility = 'hidden';
    TK.sim(0.2);
  });
  await wait(1500); await shot();
};
