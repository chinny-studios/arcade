// Node loader for unit-testing pure modules without a browser.
//   import { load } from './load.mjs';
//   const M = load(['03_stats.js'], ['computeStats', 'newCharacter']);
// Loads three.js + 01_core.js + the listed src files into one function scope (as the build
// does) and returns the requested top-level names.
import fs from 'fs';
import path from 'path';
import url from 'url';
import vm from 'vm';
const here = path.dirname(url.fileURLToPath(import.meta.url));
const src = path.join(here, '..', 'src');
export function load(files, names) {
  const ctx = { console, location: { hash: '' }, performance: { now: () => Date.now() }, Math, Date, JSON };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(here, '..', 'vendor', 'three.min.js'), 'utf8'), ctx);
  const all = ['01_core.js', ...files.filter((f) => f !== '01_core.js')];
  const body = all.map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n') +
    '\nreturn {' + names.map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + '};';
  return vm.runInContext('(function(){\'use strict\';\n' + body + '\n})()', ctx, { filename: 'bundle.js' });
}
