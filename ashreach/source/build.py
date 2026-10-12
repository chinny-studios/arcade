import pathlib, subprocess, sys
# Builds Ashreach into one self-contained page:
#   dist/ashreach.html  and  ../index.html  (three.js r128 inlined from vendor/)
# Every src/*.js file is concatenated in name order inside one IIFE, so top-level
# declarations are shared between files. `python3 build.py --check` also syntax-checks
# the bundle with node.
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
parts = []
for p in sorted(src.glob('*.js')):
  parts.append('// ===== ' + p.name + ' =====\n' + p.read_text())
js = "(function(){'use strict';\n" + "\n".join(parts) + "\n})();\n"
page = (src / 'page.html').read_text()
i = page.index('<div id="app">')
head, body = page[:i], page[i:]
three = (root / 'vendor' / 'three.min.js').read_text()
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
  + head + '</head>\n<body>\n' + body + '\n<script>' + three + '</script>\n<script>\n' + js + '</script>\n</body>\n</html>\n')
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'ashreach.js').write_text(js)
(root / 'dist' / 'ashreach.html').write_text(standalone)
(root.parent / 'index.html').write_text(standalone)
print('js bytes', len(js), 'page bytes', len(standalone))
if '--check' in sys.argv:
  r = subprocess.run(['node', '--check', str(root / 'dist' / 'ashreach.js')])
  sys.exit(r.returncode)
