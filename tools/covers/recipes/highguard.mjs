// Above Aster: the heavy cruiser Resolute fires a port broadside into the battleship Ashen Oath, fighters weaving between.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'HG'); await wait(500);
  await page.evaluate(() => {
    HG.manual(true);
    HG.start({ mission: 'broadside', seed: 2 }); HG.god(true);
    HG.sim(8);
    const e = HG.find('Ashen Oath'), p = HG.G.player;
    HG.place(e, 900, 85, 4, p.yaw / (Math.PI / 180) + 180);
    HG.squad(0, 'escort'); HG.squad(1, 'attack', e);
    HG.run(3);
    HG.reload(); HG.aimAt(e, 'shields'); HG.fire(); HG.run(0.7);
    HG.reload(); HG.aimAt(e, 'port'); HG.fire(); HG.run(0.5);
    HG.reload(); HG.aimAt(e, 'stbd'); HG.fire(); HG.run(0.25);
    // Look down the gap between the two hulls, from behind and above the Resolute.
    const f = p.fwd.clone(), port = new p.pos.constructor(f.z, 0, -f.x).normalize().multiplyScalar(-1);
    const toE = e.pos.clone().sub(p.pos); if (toE.dot(port) < 0) port.negate();
    const at = p.pos.clone().lerp(e.pos, 0.5).addScaledVector(f, 250);
    const from = p.pos.clone().addScaledVector(f, -1250).addScaledVector(port, 420).add(new p.pos.constructor(0, 330, 0));
    HG.cam(from.toArray(), at.toArray());
    for (const id of ['tip', 'banner', 'feed', 'ribbons', 'warn', 'torpwarn']) document.getElementById(id).style.display = 'none';
    HG.render();
  });
  await wait(1200);
  await shot();
};
