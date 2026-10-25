// A volcano rising out of a coastal city at dusk while a tornado and lightning tear through the next district.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'AG');
  await page.evaluate(() => {
    AG.start({ size: 'metro', seed: 39595 });
    AG.G.hour = 16.9;
    const c = AG.centre();
    AG.cast('volcano', c.x + 250, c.z - 150, 0.6);
    AG.cast('tornado', c.x - 450, c.z + 250, 0.75);
    AG.sim(13);
    AG.side('wrath'); AG.select('lightning');
    AG.look(c.x - 100, c.z + 60, 1700, 0.36, 1.2);
    AG.sim(0.2);
  });
  await wait(800);
  await page.evaluate(() => { const c = AG.centre(); for (let i = 0; i < 3; i++) AG.cast('lightning', c.x - 300 + i * 90, c.z + 200, 0.3); AG.sim(0.05); });
  await wait(300);
  await shot();
};
