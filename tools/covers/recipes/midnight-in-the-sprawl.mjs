// Down the neon street from the start, looking level.
export const patch = [['const player = { x: 0, z: 118', 'const player = window.__P = { x: 0, z: 118']];
export default async ({ page, shot, wait, url }) => {
  await page.goto(url);
  await page.waitForSelector('#start:not([disabled])', { timeout: 180000 }); await wait(500);
  await page.click('#start'); await wait(3000);
  await page.evaluate(() => Object.assign(__P, { yaw: Math.PI, pitch: 0.04 }));
  await wait(1500); await shot();
};
