"""Subset Noto Sans TC Black to the Chinese characters the game uses, for the shop signs.

    python3 tools/font.py path/to/NotoSansTC_900Black.ttf

Writes vendor/signfont.woff2 (inlined by build.py). The TTF comes from the npm package
@expo-google-fonts/noto-sans-tc (SIL Open Font License). Needs fonttools and brotli (pip install fonttools brotli).
Run it again whenever you add Chinese text to src/.
"""
import json, pathlib, re, sys
from fontTools import subset

root = pathlib.Path(__file__).resolve().parent.parent
text = ''.join(p.read_text() for p in sorted((root / 'src').glob('*')) if p.suffix in ('.js', '.html') and p.name != '02_map.js')
# from the baked map: the names that go on signs (shops, Milton's tenants, building names)
m = json.loads(re.search(r'const MAP = (\{.*\});', (root / 'src' / '02_map.js').read_text()).group(1))
names = m['names']
text += ''.join(names[s[3]] for s in m['shops']) + ''.join(t[2] for t in m['milton']) + ''.join(names[b[4]] for b in m['b'] if b[4] >= 0)
chars = sorted(set(re.findall(r'[　-〿㐀-鿿豈-﫿＀-￯]', text)))
chars += list('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,&\'-!?:/()+')
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = []; opts.hinting = False; opts.desubroutinize = True
font = subset.load_font(sys.argv[1], opts)
s = subset.Subsetter(opts); s.populate(text=''.join(chars)); s.subset(font)
out = root / 'vendor' / 'signfont.woff2'
subset.save_font(font, str(out), opts)
print(len(chars), 'characters,', out.stat().st_size, 'bytes ->', out)
