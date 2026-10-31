// The pocket watch half restored: the right side cleaned and polished, the left still tarnished and grimy.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'PA', 'ready');
  await page.evaluate(async () => {
    localStorage.clear();
    await PA.start('watch');
    const right = (x, y, z) => x + (y - 0.04) * 0.35 + Math.sin(y * 900 + z * 300) * 0.0012 + Math.sin(y * 2300) * 0.0005 > 0.002;
    for (const t of ['solvent', 'polish', 'polish']) PA.workAll(t, 2, null, right);
    PA.workAll('wire', 2, ['Hour hand', 'Minute hand'], right);
    PA.view(0.32, 0.1, 0.15, [0.004, 0.043, 0]);
    PA.G.tool = 'polish'; document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === 'polish'));
    document.querySelector('#toast').classList.remove('on'); document.querySelector('#tooltip').textContent = '';
  });
  await wait(2500); await shot();
};
