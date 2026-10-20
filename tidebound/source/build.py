import pathlib, subprocess, sys
# Builds Tidebound into one self-contained page: ../index.html (plain 2D canvas, no libraries)
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
files = sorted(src.glob('*.js'))
js = "(function(){'use strict';\n" + "\n".join('// ---- ' + p.name + '\n' + p.read_text() for p in files) + "\n})();\n"
page = (src / 'page.html').read_text()
i = page.index('<div id="app">')
head, body = page[:i], page[i:]
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
  + head + '</head>\n<body>\n' + body + '\n<script>\n' + js + '</script>\n</body>\n</html>\n')
out = root.parent / 'index.html'
out.write_text(standalone)
# syntax check when node is around
tmp = root / 'test' / 'out'
tmp.mkdir(parents=True, exist_ok=True)
(tmp / 'bundle.js').write_text(js)
r = subprocess.run(['node', '--check', str(tmp / 'bundle.js')], capture_output=True, text=True) if sys.platform != 'win32' else None
if r is not None and r.returncode != 0:
  print(r.stderr); sys.exit(1)
print('js bytes', len(js), 'page bytes', len(standalone))
