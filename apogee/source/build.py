import pathlib
# Builds Apogee into one self-contained page, ../index.html (three.js r128 inlined from vendor/).
# The numbered src/*.js files are concatenated in order inside one strict IIFE, so names are shared across files.
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
print('js bytes', len(js), 'page bytes', len(standalone))
