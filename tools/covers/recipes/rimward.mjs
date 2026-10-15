// The scene behind the title screen: a star in the nebula. The opening flight is mostly empty space.
export default async ({ page, shot, wait, url }) => {
  await page.goto(url); await wait(5000);
  await page.evaluate(() => { document.querySelector('#titleScreen').style.visibility = 'hidden'; });
  await wait(800); await shot();
};
