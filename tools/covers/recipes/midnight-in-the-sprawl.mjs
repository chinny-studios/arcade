// Down the neon street from the start, looking level.
import { hideText } from './_lib.mjs';
export const patch = [['const player = { x: 0, z: 118', 'const player = window.__P = { x: 0, z: 118']];
export default async ({ page, shot, wait, url }) => {
  await page.goto(url);
  await page.waitForSelector('#start:not([disabled])', { timeout: 180000 }); await wait(500);
  await page.click('#start'); await wait(8000); // let the camera settle after the start
  await page.evaluate(() => Object.assign(__P, { yaw: Math.PI, pitch: 0.04 }));
  await wait(2500);
  await hideText(page, ['Switched to lighter graphics']); // the auto-quality toast under SwiftShader
  await wait(500); await shot();
};
