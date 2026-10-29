// Off point A in Serpent Keys: the frigate Hesper trades broadsides with a man-o'-war and a frigate, gunsmoke drifting.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'SS'); await wait(500);
  await page.evaluate(() => {
    SS.manual(true);
    SS.start({ map: 0, cls: 'frigate', seed: 5 }); SS.peace(); SS.god(true);
    const p = SS.G.player; SS.tp(-760, -320, 0.25); p.tele = 3; p.v = 12;
    const foes = SS.G.ships.filter((s) => s.team === 1);
    const big = foes.find((s) => s.cls === 'galleon'), fr = foes.find((s) => s.cls === 'frigate');
    SS.place(big, 330, 0.75, p.h + Math.PI - 0.15); big.tele = 3; big.v = 9;
    SS.place(fr, 470, 0.45, p.h + Math.PI - 0.1); fr.tele = 3; fr.v = 10;
    const mates = SS.G.ships.filter((s) => s.team === 0 && s !== p && (s.cls === 'galleon' || s.cls === 'brig')).slice(0, 2);
    mates.forEach((m, i) => { SS.place(m, 120 + i * 95, Math.PI - 0.12, p.h); m.tele = 3; m.v = 11; });
    SS.run(1);
    for (const s of SS.G.ships) s.seen = [true, true];
    SS.broadside(big, mates[0]); SS.run(0.5); SS.broadside(p, big); mates.forEach((m) => SS.broadside(m, big)); SS.run(0.9);
    SS.broadside(fr, mates[1]); SS.run(1.4);
    big.startFire(0, p); big.hp = big.maxHp * 0.55; SS.run(2.6);
    SS.look(Math.atan2(big.x - p.x, big.z - p.z) - 0.18, 330, 0.75);
    document.querySelector('#banner').style.display = 'none'; document.querySelector('#feed').style.display = 'none'; document.querySelector('#ribbons').style.display = 'none';
    SS.render();
  });
  await wait(1200);
  await shot();
};
