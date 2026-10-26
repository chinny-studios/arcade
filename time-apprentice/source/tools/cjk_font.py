"""Makes the small Chinese font that build.py embeds: only the characters that appear in src/*.js, cut from
Noto Sans TC Bold (SIL Open Font License, via the @fontsource/noto-sans-tc npm package).

    pip install fonttools brotli
    python3 tools/cjk_font.py            # writes vendor/cjk/*.woff2 and vendor/cjk/chars.json

Run it again after adding new Chinese characters to an event (build.py warns about any that are missing).
"""
import base64, hashlib, io, json, pathlib, re, sys, tarfile, urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont

PKG, VER, WEIGHT = '@fontsource/noto-sans-tc', '5.3.1', 700
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'vendor' / 'cjk'
CJK = re.compile('[⺀-⿿　-〿㐀-䶿一-鿿豈-﫿＀-￯]')


def used_chars():
    text = ''.join(p.read_text() for p in sorted((root / 'src').glob('*.js')))
    return sorted(set(CJK.findall(text)))


def tarball():
    meta = json.load(urllib.request.urlopen(f'https://registry.npmjs.org/{PKG}/{VER}'))
    data = urllib.request.urlopen(meta['dist']['tarball']).read()
    algo, want = meta['dist']['integrity'].split('-', 1)
    if base64.b64encode(hashlib.new(algo, data).digest()).decode() != want:
        sys.exit('integrity check failed for ' + PKG)
    return tarfile.open(fileobj=io.BytesIO(data))


def main():
    chars = used_chars()
    tf = tarball()
    names = [m for m in tf.getmembers() if re.search(rf'noto-sans-tc-\d+-{WEIGHT}-normal\.woff2$', m.name)]
    left, files = set(chars), {}
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('*.woff2'):
        old.unlink()
    for m in sorted(names, key=lambda m: int(re.search(r'-(\d+)-', m.name.rsplit('/', 1)[1]).group(1))):
        if not left:
            break
        raw = tf.extractfile(m).read()
        font = TTFont(io.BytesIO(raw))
        cmap = font.getBestCmap()
        here = sorted(c for c in left if ord(c) in cmap)
        if not here:
            continue
        opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = []; opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
        sub = subset.Subsetter(opts); sub.populate(text=''.join(here)); sub.subset(font)
        name = f'{len(files):02d}.woff2'
        font.flavor = 'woff2'; font.save(str(out / name))
        files[name] = ''.join(here)
        left -= set(here)
    (out / 'chars.json').write_text(json.dumps({'source': f'{PKG}@{VER} weight {WEIGHT}', 'files': files}, ensure_ascii=False, indent=1))
    size = sum((out / n).stat().st_size for n in files)
    print(f'{len(chars)} characters in {len(files)} files, {size} bytes' + (f'; not in the font: {"".join(sorted(left))}' if left else ''))


if __name__ == '__main__':
    main()
