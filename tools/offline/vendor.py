#!/usr/bin/env python3
"""Copy the playable site and vendor every external asset so it runs with no network.

    python3 tools/offline/vendor.py SRC OUT    # copy SRC (repo root) to OUT, download and rewrite assets
    python3 tools/offline/vendor.py --check OUT # only scan OUT for URLs a page would still fetch

Only the files a player needs are copied: each game's index.html, cover, music and other media, plus the
arcade index, LICENSE and THIRD_PARTY.md. Source folders, build scripts and agent notes are left out.

External assets end up under OUT/_vendor/ and every reference is rewritten to a relative path:
  - Google Fonts stylesheets are fetched as a current Chrome sees them (woff2, every unicode-range subset),
    and their fonts.gstatic.com files are downloaded next to them.
  - jsDelivr and unpkg npm URLs, and cdnjs three.js URLs, are served from the npm registry tarball of the same
    version, checked against the registry's sha512 integrity. This also works where the CDNs are blocked.
  - <link rel="preconnect"> hints to those hosts are dropped.

Python standard library only. Honours HTTPS_PROXY and SSL_CERT_FILE.
"""
import base64
import concurrent.futures
import hashlib
import html
import io
import json
import os
import posixpath
import re
import shutil
import sys
import tarfile
import urllib.parse
import urllib.request

VENDOR = '_vendor'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/130.0.0.0 Safari/537.36')

ROOT_FILES = ['index.html', 'LICENSE', 'THIRD_PARTY.md', '.nojekyll']
SKIP_DIRS = {'source', 'src', 'test', 'dist', 'node_modules', '.cache', '.git', VENDOR}
ASSET_EXTS = {'.html', '.js', '.mjs', '.css', '.json', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
              '.mp3', '.ogg', '.wav', '.m4a', '.glb', '.gltf', '.bin', '.woff', '.woff2', '.ttf', '.otf'}
TEXT_EXTS = {'.html', '.js', '.mjs', '.css'}

CDN_HOSTS = r'(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)'
CDN_URL = re.compile(r'https?://' + CDN_HOSTS + r'''[^\s"'`<>()\\]*''')
HINT_TAG = re.compile(r'''[ \t]*<link\s[^>]*rel=["']?(?:preconnect|dns-prefetch)["']?[^>]*https?://''' + CDN_HOSTS
                      + r'[^>]*>[ \t]*\r?\n?', re.I)
GSTATIC_URL = re.compile(r'url\((https://fonts\.gstatic\.com/[^)\s]+)\)')

# Any http(s) URL left after vendoring is a fetch that fails offline, unless its host is here or it sits on a
# comment line (library code cites papers and docs).
COMMENT_LINE = re.compile(r'^\s*(?://|/?\*|<!--)')
CHECK_URL = re.compile(r'''https?://[^\s"'`<>()\\]+''')
ALLOWED_HOSTS = {
    'www.w3.org',  # XML namespaces (SVG, XHTML), never fetched
    'github.com',  # links to the repo, only followed if the player clicks them
}


def fetch(url, accept_ua=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA if accept_ua else 'arcade-offline-vendor'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


class Vendor:
    def __init__(self, out):
        self.out = out
        self.done = {}      # original URL -> path relative to OUT
        self.tarballs = {}  # (pkg, version) -> TarFile
        self.manifest = []

    def save(self, rel, data, url):
        path = os.path.join(self.out, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(data)
        self.manifest.append((rel, hashlib.sha256(data).hexdigest(), url))
        return rel

    def get(self, url):
        """Download url (once) into OUT/_vendor and return its path relative to OUT."""
        if url not in self.done:
            self.done[url] = self._get(url)
        return self.done[url]

    def _get(self, url):
        u = urllib.parse.urlsplit(url)
        if u.netloc == 'fonts.googleapis.com':
            return self.google_css(url)
        if u.netloc == 'fonts.gstatic.com':
            return self.save(posixpath.join(VENDOR, u.netloc, u.path.lstrip('/')), fetch(url), url)
        m = re.match(r'^/(?:npm/)?((?:@[^/]+/)?[^@/]+)@([^/]+)/(.+)$', u.path)
        if u.netloc in ('cdn.jsdelivr.net', 'unpkg.com') and m and (u.netloc == 'unpkg.com' or u.path.startswith('/npm/')):
            return self.npm(m[1], m[2], m[3], url)
        m = re.match(r'^/ajax/libs/three\.js/r(\d+)/(.+)$', u.path)
        if u.netloc == 'cdnjs.cloudflare.com' and m:
            return self.npm('three', '0.%s.0' % m[1], 'build/' + m[2], url)
        sys.exit('vendor.py: no offline source for %s\n  add a mapping in tools/offline/vendor.py' % url)

    def google_css(self, url):
        # A JS-built URL like '...&text=' + chars needs every glyph, so fetch without the empty text= filter.
        u = urllib.parse.urlsplit(url)
        q = [(k, v) for k, v in urllib.parse.parse_qsl(u.query, keep_blank_values=True) if not (k == 'text' and not v)]
        fetch_url = urllib.parse.urlunsplit(u._replace(query=urllib.parse.urlencode(q, safe=':;,@+')))
        css = fetch(fetch_url, accept_ua=True).decode('utf-8')
        rel = posixpath.join(VENDOR, 'fonts', hashlib.sha1(fetch_url.encode()).hexdigest()[:12] + '.css')
        with concurrent.futures.ThreadPoolExecutor(8) as pool:  # CJK families have hundreds of subset files
            list(pool.map(self.get, dict.fromkeys(GSTATIC_URL.findall(css))))
        css = GSTATIC_URL.sub(lambda m: 'url(%s)' % posixpath.relpath(self.get(m[1]), posixpath.dirname(rel)), css)
        return self.save(rel, css.encode('utf-8'), url)

    def npm(self, pkg, version, file, url):
        key = (pkg, version)
        if key not in self.tarballs:
            meta = json.loads(fetch('https://registry.npmjs.org/%s/%s' % (pkg.replace('/', '%2F'), version)))
            tgz = fetch(meta['dist']['tarball'])
            algo, _, want = meta['dist']['integrity'].partition('-')
            if base64.b64encode(hashlib.new(algo, tgz).digest()).decode() != want:
                sys.exit('vendor.py: integrity mismatch for %s@%s' % key)
            self.tarballs[key] = tarfile.open(fileobj=io.BytesIO(tgz), mode='r:gz')
        member = self.tarballs[key].extractfile('package/' + file)
        return self.save(posixpath.join(VENDOR, 'npm', '%s@%s' % key, file), member.read(), url)

    def rewrite(self, path):
        with open(path, encoding='utf-8') as f:
            text = f.read()
        here = posixpath.dirname(posixpath.relpath(path, self.out).replace(os.sep, '/'))
        new = HINT_TAG.sub('', text)

        def local(m):
            raw = m[0]
            rel = posixpath.relpath(self.get(html.unescape(raw) if path.endswith('.html') else raw), here or '.')
            # Keep a query that ends in '=' so code that appends a value to the string still builds a valid URL.
            return rel + ('?' + raw.split('?', 1)[1] if '?' in raw and raw.endswith('=') else '')

        new = CDN_URL.sub(local, new)
        if new != text:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new)
            print('vendored', posixpath.relpath(path, self.out))

    def write_manifest(self):
        lines = ['# Files downloaded by tools/offline/vendor.py: path  sha256  source URL']
        lines += ['%s  %s  %s' % row for row in sorted(self.manifest)]
        os.makedirs(os.path.join(self.out, VENDOR), exist_ok=True)
        with open(os.path.join(self.out, VENDOR, 'MANIFEST.txt'), 'w') as f:
            f.write('\n'.join(lines) + '\n')


def copy_site(src, out):
    src_abs, out_abs = os.path.realpath(src), os.path.realpath(out)
    if os.path.commonpath([src_abs, out_abs]) in (src_abs, out_abs):
        sys.exit('vendor.py: OUT must be outside SRC (and not contain it)')
    if os.path.exists(out) and os.listdir(out) and not os.path.exists(os.path.join(out, VENDOR, 'MANIFEST.txt')):
        sys.exit('vendor.py: %s is not empty and is not an earlier output; refusing to delete it' % out)
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for name in ROOT_FILES:
        if os.path.exists(os.path.join(src, name)):
            shutil.copy2(os.path.join(src, name), os.path.join(out, name))
    games = sorted(d for d in os.listdir(src)
                   if d not in SKIP_DIRS and os.path.isfile(os.path.join(src, d, 'index.html')))
    for game in games:
        for dirpath, dirnames, filenames in os.walk(os.path.join(src, game)):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith('.')]
            for name in filenames:
                if os.path.splitext(name)[1].lower() in ASSET_EXTS:
                    rel = os.path.relpath(os.path.join(dirpath, name), src)
                    os.makedirs(os.path.dirname(os.path.join(out, rel)), exist_ok=True)
                    shutil.copy2(os.path.join(src, rel), os.path.join(out, rel))
    return games


def text_files(out):
    for dirpath, _, filenames in os.walk(out):
        for name in filenames:
            if os.path.splitext(name)[1].lower() in TEXT_EXTS:
                yield os.path.join(dirpath, name)


def check(out):
    bad = []
    for path in text_files(out):
        with open(path, encoding='utf-8', errors='replace') as f:
            for n, line in enumerate(f, 1):
                if COMMENT_LINE.match(line):
                    continue
                for m in CHECK_URL.finditer(line):
                    if urllib.parse.urlsplit(m[0]).hostname not in ALLOWED_HOSTS:
                        bad.append('%s:%d: %s' % (os.path.relpath(path, out), n, m[0][:120]))
    if bad:
        print('Offline check failed: these URLs would be fetched from the network:', *bad, sep='\n  ')
        return 1
    print('Offline check passed: no external asset URLs in %s' % out)
    return 0


def main(argv):
    if len(argv) == 2 and argv[0] == '--check':
        return check(argv[1])
    if len(argv) != 2:
        print(__doc__.strip())
        return 2
    src, out = argv
    games = copy_site(src, out)
    v = Vendor(out)
    for path in sorted(text_files(out)):
        v.rewrite(path)
    v.write_manifest()
    total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(out) for f in fs)
    print('%d games, %d vendored files, %.1f MB total' % (len(games), len(v.manifest), total / 1e6))
    return check(out)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
