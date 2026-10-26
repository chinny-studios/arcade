import base64, pathlib
# Builds Nathan Road into one self-contained page: ../index.html
# three.js r128 and the sign font subset (vendor/signfont.woff2, made by tools/font.py) are inlined.
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
font = root / 'vendor' / 'signfont.woff2'
font_js = "const SIGN_FONT_B64 = '%s';\n" % (base64.b64encode(font.read_bytes()).decode() if font.exists() else '')
js = "(function(){'use strict';\n" + font_js + "\n".join(p.read_text() for p in sorted(src.glob('*.js'))) + "\n})();\n"
page = (src / 'page.html').read_text()
i = page.index('<div id="app">')
head, body = page[:i], page[i:]
three = (root / 'vendor' / 'three.min.js').read_text()
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
  + head + '</head>\n<body>\n' + body + '\n<script>' + three + '</script>\n<script>\n' + js + '</script>\n</body>\n</html>\n')
(root.parent / 'index.html').write_text(standalone)
print('js bytes', len(js), 'page bytes', len(standalone))
