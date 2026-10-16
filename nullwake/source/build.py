import pathlib
# Builds Nullwake into one self-contained page: ../index.html (a 2D canvas game, no libraries)
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
js = "(function(){'use strict';\n" + "\n".join(p.read_text() for p in sorted(src.glob('*.js'))) + "\n})();\n"
page = (src / 'page.html').read_text()
i = page.index('<div id="app">')
head, body = page[:i], page[i:]
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
  + head + '</head>\n<body data-state="boot">\n' + body + '\n<script>\n' + js + '</script>\n</body>\n</html>\n')
(root.parent / 'index.html').write_text(standalone)
print('js bytes', len(js), 'page bytes', len(standalone))
