import pathlib, subprocess, shutil
# Builds Sea of Smoke into one self-contained page: ../index.html (three.js r128 inlined from vendor/).
# All src/*.js files are concatenated in filename order inside one strict-mode IIFE, so they share one scope.
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
js = "(function(){'use strict';\n" + "\n".join(p.read_text() for p in sorted(src.glob('*.js'))) + "\n})();\n"
page = (src / 'page.html').read_text()
i = page.index('<div id="app">')
head, body = page[:i], page[i:]
three = (root / 'vendor' / 'three.min.js').read_text()
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
  + head + '</head>\n<body>\n' + body + '\n<script>' + three + '</script>\n<script>\n' + js + '</script>\n</body>\n</html>\n')
(root.parent / 'index.html').write_text(standalone)
if shutil.which('node'):
  tmp = root / 'test' / 'out' / '_bundle.js'
  tmp.parent.mkdir(parents=True, exist_ok=True)
  tmp.write_text(js)
  r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
  if r.returncode: print(r.stderr); raise SystemExit('syntax error in bundle')
print('js bytes', len(js), 'page bytes', len(standalone))
