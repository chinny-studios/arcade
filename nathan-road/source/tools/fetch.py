"""Pull Overture Maps rows inside a bbox using HTTP range requests (no DuckDB extensions needed).

usage: python fetch.py <type path e.g. buildings/type=building> <out.parquet> minx miny maxx maxy
"""
import io, os, re, sys, json, concurrent.futures as cf
import requests, pyarrow as pa, pyarrow.parquet as pq

REL = 'release/2026-10-21.0'
BASE = 'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/'
sess = requests.Session()


class RangeFile(io.RawIOBase):
    def __init__(self, url, size):
        self.url, self.size, self.pos = url, size, 0
        self.cache = {}

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def read(self, n=-1):
        if n < 0: n = self.size - self.pos
        if n == 0 or self.pos >= self.size: return b''
        end = min(self.size, self.pos + n) - 1
        r = sess.get(self.url, headers={'Range': f'bytes={self.pos}-{end}'}, timeout=120)
        r.raise_for_status()
        self.pos += len(r.content)
        return r.content

    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)


def list_files(prefix):
    out, token = [], None
    while True:
        p = {'list-type': '2', 'prefix': prefix}
        if token: p['continuation-token'] = token
        x = sess.get(BASE, params=p, timeout=60).text
        for k, s in re.findall(r'<Key>([^<]+)</Key>.*?<Size>(\d+)</Size>', x):
            if k.endswith('.parquet') or 'part-' in k: out.append((k, int(s)))
        m = re.search(r'<NextContinuationToken>([^<]+)</NextContinuationToken>', x)
        if not m: return out
        token = m.group(1)


def stats_overlap(rg, schema, bb):
    minx, miny, maxx, maxy = bb
    want = {'bbox.xmin': None, 'bbox.xmax': None, 'bbox.ymin': None, 'bbox.ymax': None}
    for i in range(rg.num_columns):
        c = rg.column(i)
        if c.path_in_schema in want and c.statistics is not None and c.statistics.has_min_max:
            want[c.path_in_schema] = (c.statistics.min, c.statistics.max)
    if None in want.values(): return True
    return not (want['bbox.xmin'][0] > maxx or want['bbox.xmax'][1] < minx or
                want['bbox.ymin'][0] > maxy or want['bbox.ymax'][1] < miny)


def scan(kv, bb):
    key, size = kv
    f = RangeFile(BASE + key, size)
    pf = pq.ParquetFile(io.BufferedReader(f, buffer_size=1 << 20))
    md = pf.metadata
    hits = [i for i in range(md.num_row_groups) if stats_overlap(md.row_group(i), pf.schema, bb)]
    tabs = []
    for i in hits:
        t = pf.read_row_group(i)
        bx = t.column('bbox').combine_chunks()
        import pyarrow.compute as pc
        xmin, xmax = bx.field('xmin'), bx.field('xmax')
        ymin, ymax = bx.field('ymin'), bx.field('ymax')
        m = pc.and_(pc.and_(pc.less_equal(xmin, bb[2]), pc.greater_equal(xmax, bb[0])),
                    pc.and_(pc.less_equal(ymin, bb[3]), pc.greater_equal(ymax, bb[1])))
        t = t.filter(m)
        if t.num_rows: tabs.append(t)
    return key, len(hits), tabs


if __name__ == '__main__':
    os.makedirs(os.path.dirname(sys.argv[2]) or '.', exist_ok=True)
    typ, out = sys.argv[1], sys.argv[2]
    bb = tuple(map(float, sys.argv[3:7]))
    files = list_files(f'{REL}/theme={typ}/')
    print(len(files), 'files', file=sys.stderr)
    tabs = []
    with cf.ThreadPoolExecutor(16) as ex:
        for key, nh, ts in ex.map(lambda kv: scan(kv, bb), files):
            if nh: print(key.split('/')[-1][:20], 'rowgroups', nh, 'rows', sum(t.num_rows for t in ts), file=sys.stderr)
            tabs += ts
    if not tabs: sys.exit('no rows')
    t = pa.concat_tables(tabs, promote_options='default')
    pq.write_table(t, out)
    print(out, t.num_rows, file=sys.stderr)
