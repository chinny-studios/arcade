// The living room on New Year's Eve: TV cabinet, party hats, couch.
export const patch = [['const P={x:6.45', 'const P=window.__P={x:6.45']];
export default async ({ page, shot, wait, url }) => {
  await page.goto(url); await wait(4000);
  await page.click('#play'); await wait(3000);
  await page.evaluate(() => Object.assign(__P, { x: 5.0, z: 9.5, yaw: Math.PI / 4, pitch: -0.12 }));
  await wait(1000); await shot();
};
