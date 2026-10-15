// A small house, a tree, flowers and a car built on the baseplate, with the brick palette in view.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'SW'); await wait(1500);
  await page.getByText('Start building').click().catch(() => {});
  await page.evaluate(() => {
    const A = (t, c, x, y, z, rot = 0) => SW.add(t, c, x, y, z, rot);
    const x0 = 9, z0 = 11, W = 12, D = 8, wall = 'red';
    for (let L = 0; L < 4; L++) {
      const y = L * 3, win = L === 1 || L === 2;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * 4;
        if (!(i === 1 && L < 2)) A('brick-1x4', win && i !== 1 ? 'tclear' : wall, x, y, z0);
        A('brick-1x4', win && i !== 1 ? 'tclear' : wall, x, y, z0 + D - 1);
      }
      A('brick-1x6', win ? 'tclear' : wall, x0, y, z0 + 1, 1);
      A('brick-1x6', wall, x0 + W - 1, y, z0 + 1, 1);
    }
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * 4;
      A('slope45-2x4', 'dbg', x, 12, z0); A('slope45-2x4', 'dbg', x, 12, z0 + 6, 2);
      A('brick-2x4', 'dbg', x, 12, z0 + 2); A('brick-2x4', 'dbg', x, 12, z0 + 4);
      A('slope45-2x4', 'dbg', x, 15, z0 + 2); A('slope45-2x4', 'dbg', x, 15, z0 + 4, 2);
    }
    for (let z = 0; z < z0; z += 2) A('tile-2x2', 'tan', x0 + 5, 0, z);
    for (let L = 0; L < 4; L++) A('brick-1x1', 'brown', 25, L * 3, 6);
    A('plate-4x4', 'green', 24, 12, 5); A('brick-2x2', 'bgreen', 24, 13, 5); A('brick-2x2', 'green', 26, 13, 7); A('brick-2x2', 'lime', 25, 16, 6);
    for (const [x, z, c] of [[4, 6, 'red'], [5, 8, 'yellow'], [3, 9, 'orange'], [6, 4, 'pink'], [27, 18, 'yellow'], [28, 20, 'red'], [26, 22, 'lavender']]) A('plate-1x1', c, x, 0, z);
    A('plate-2x6', 'blue', 2, 1, 22, 1); A('brick-2x2', 'blue', 2, 2, 24); A('slope45-2x2', 'tclear', 2, 2, 22, 2);
    A('plate-1x2', 'black', 2, 0, 22); A('plate-1x2', 'black', 2, 0, 26);
    SW.orbit(-0.6, 0.5, 44);
  });
  await wait(1500); await shot();
};
