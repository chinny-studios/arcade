import base64, json, pathlib, re
# Builds The Time Apprentice into one self-contained page: ../index.html (three.js r128 inlined from vendor/, and the
# Chinese font subset from vendor/cjk/, made by tools/cjk_font.py)
root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
js = "(function(){'use strict';\n" + "\n".join(p.read_text() for p in sorted(src.glob('*.js'))) + "\n})();\n"
page = (src / 'page.html').read_text()
i = page.index('<div id="app">')
head, body = page[:i], page[i:]
three = (root / 'vendor' / 'three.min.js').read_text()
# the Chinese font: one @font-face per subset file, each limited to its own characters
cjk = root / 'vendor' / 'cjk' / 'chars.json'
fonts, have = '', ''
if cjk.exists():
    files = json.loads(cjk.read_text())['files']
    for name, chars in files.items():
        b64 = base64.b64encode((cjk.parent / name).read_bytes()).decode()
        rng = ','.join('U+%X' % ord(c) for c in chars)
        fonts += '@font-face{font-family:"TA CJK";font-weight:100 900;src:url(data:font/woff2;base64,%s) format("woff2");unicode-range:%s}\n' % (b64, rng)
        have += chars
    fonts = '<style>\n' + fonts + '</style>\n<meta name="ta-cjk" content="' + have + '">\n'
used = set(re.findall('[⺀-⿿　-〿㐀-䶿一-鿿豈-﫿＀-￯]', js))
missing = ''.join(sorted(used - set(have)))
if missing:
    print('WARNING: characters not in the Chinese font (run tools/cjk_font.py):', missing)
standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
  + head + fonts + '</head>\n<body>\n' + body + '\n<script>' + three + '</script>\n<script>\n' + js + '</script>\n</body>\n</html>\n')
(root.parent / 'index.html').write_text(standalone)
print('js bytes', len(js), 'page bytes', len(standalone))
