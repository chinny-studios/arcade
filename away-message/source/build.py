import pathlib, subprocess, shutil
# Builds Away Message into one self-contained page: ../index.html (DOM + canvas 2D, no libraries).
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
js = "(function(){'use strict';\n" + "\n".join(p.read_text() for p in sorted(src.glob('*.js'))) + "\n})();\n"
page = (src / 'page.html').read_text()
i = page.index('<div id="app">')
head, body = page[:i], page[i:]
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
  + head + '</head>\n<body>\n' + body + '\n<script>\n' + js + '</script>\n</body>\n</html>\n')
out = root.parent / 'index.html'
out.write_text(standalone)
if shutil.which('node'):
  tmp = root / 'test' / 'out'; tmp.mkdir(parents=True, exist_ok=True)
  (tmp / 'bundle.js').write_text(js)
  r = subprocess.run(['node', '--check', str(tmp / 'bundle.js')], capture_output=True, text=True)
  if r.returncode: print(r.stderr); raise SystemExit('syntax error in bundle')
print('js bytes', len(js), 'page bytes', len(standalone))
