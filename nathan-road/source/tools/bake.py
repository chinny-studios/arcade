"""Bake Overture Maps + terrain tiles into src/02_map.js for Nathan Road.

Run tools/get_data.sh first (it fills tools/raw/ with parquet extracts and dem.npz), then:
    python3 tools/bake.py            (needs shapely, pyarrow, numpy; see tools/README.md)
Writes src/02_map.js (const MAP = {...}) and tools/raw/bake.png, a top-down check image.

Coordinates: metres from the centre of Milton Mansion, x east, z south, stored as decimetre integers.
"""
import json, math, hashlib, pathlib, re, sys
import numpy as np
import pyarrow.parquet as pq
import shapely
from shapely import wkb
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, box, mapping
from shapely.ops import unary_union, substring

HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE / 'raw'
OUT = HERE.parent / 'src' / '02_map.js'

LON0, LAT0 = 114.172312, 22.299461           # Milton Mansion, 96 Nathan Road
P = math.radians(LAT0)
MX = 111412.84 * math.cos(P) - 93.5 * math.cos(3 * P)       # metres per degree of longitude here
MZ = 111132.92 - 559.82 * math.cos(2 * P) + 1.175 * math.cos(4 * P)


def proj(lon, lat):
    return (lon - LON0) * MX, (LAT0 - lat) * MZ


def pgeom(g):
    return shapely.transform(g, lambda c: np.column_stack(((c[:, 0] - LON0) * MX, (LAT0 - c[:, 1]) * MZ)))


def rect(lon0, lat0, lon1, lat1):
    x0, z1 = proj(lon0, lat0); x1, z0 = proj(lon1, lat1)
    return [round(x0), round(z0), round(x1), round(z1)]


WALK = rect(114.1655, 22.2925, 114.1790, 22.3050)      # where you can walk
DETAIL = rect(114.1620, 22.2895, 114.1825, 22.3080)    # full-detail city
FAR = rect(114.1350, 22.2620, 114.2050, 22.3350)       # everything fetched
walk_box, detail_box, far_box = box(*WALK), box(*DETAIL), box(*FAR)


def load(name):
    return pq.read_table(RAW / f'{name}.parquet').to_pylist()


def h01(s):
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16) / 0xffffffff


def dm(v):
    return int(round(v * 10))


def ring_out(coords, close_drop=True):
    pts = list(coords)
    if close_drop and len(pts) > 1 and pts[0] == pts[-1]: pts = pts[:-1]
    out = []
    for x, z in pts: out += [dm(x), dm(z)]
    return out


def polys(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    if g.geom_type in ('MultiPolygon', 'GeometryCollection'):
        r = []
        for x in g.geoms: r += polys(x)
        return r
    return []


def poly_out(p):
    p = shapely.geometry.polygon.orient(p, 1.0)       # outer CCW in (x, z) maths terms
    return [ring_out(p.exterior.coords)] + [ring_out(i.coords) for i in p.interiors]


names, name_ix = [], {}


def nm(s):
    if not s: return -1
    if s not in name_ix: name_ix[s] = len(names); names.append(s)
    return name_ix[s]


def primary(r):
    return ((r.get('names') or {}).get('primary') or '').strip()


# ------------------------------------------------------------------ land and sea
land_rows = load('land')
land_parts = []
for r in land_rows:
    if r['class'] in ('land', 'island'):
        g = pgeom(wkb.loads(r['geometry'])).intersection(far_box.buffer(50))
        land_parts += polys(g)
infra = load('infrastructure')
decks = []                                   # piers and the Avenue of Stars deck count as land
for r in infra:
    g = wkb.loads(r['geometry'])
    if g.geom_type == 'Polygon' and (r['class'] in ('pier',) or primary(r).endswith('Avenue of Stars') or 'Star Ferry Pier' in primary(r)):
        decks.append(pgeom(g))
land = unary_union(land_parts + decks).buffer(0)
land = unary_union([Polygon(p.exterior, [i for i in p.interiors if Polygon(i).area > 30000]) for p in polys(land)])   # fill ponds and pools
land = land.simplify(0.4)
print('land area km2', round(land.area / 1e6, 2), file=sys.stderr)

# ------------------------------------------------------------------ roads
VEH = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'living_street'}
W2 = {'motorway': 11, 'trunk': 11, 'primary': 13, 'secondary': 11.5, 'tertiary': 9, 'residential': 7, 'unclassified': 7,
      'service': 4.5, 'living_street': 6}
W1 = {'motorway': 10.5, 'trunk': 10.5, 'primary': 10.5, 'secondary': 10, 'tertiary': 8, 'residential': 6.8, 'unclassified': 7.2,
      'service': 4.2, 'living_street': 5}
CLS = ['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'service', 'trunk', 'motorway', 'living_street']

segs = load('segment')


def ranges_bad(r):
    """fractions of the segment that are tunnels or bridges (not at street level)"""
    bad = []
    for lr in r.get('level_rules') or []:
        if lr['value'] and lr['value'] != 0:
            bad.append(tuple(lr['between'] or (0.0, 1.0)))
    for f in r.get('road_flags') or []:
        if 'is_tunnel' in f['values'] or 'is_bridge' in f['values']:
            bad.append(tuple(f['between'] or (0.0, 1.0)))
    return bad


def ground_pieces(r, line):
    bad = sorted(ranges_bad(r))
    if not bad: return [(0.0, 1.0)]
    keep, t = [], 0.0
    for a, b in bad:
        if a > t + 1e-6: keep.append((t, a))
        t = max(t, b)
    if t < 1 - 1e-6: keep.append((t, 1.0))
    return keep


def oneway(r):
    for a in r.get('access_restrictions') or []:
        w = a.get('when') or {}
        if a['access_type'] == 'denied' and w.get('heading') and not w.get('mode') and not w.get('using'):
            return 1 if w['heading'] == 'backward' else -1
    return 0


road_lines = []        # (line, cls, ow, width, name, connector ids at ends)
sidewalks, crossings, paths, steps_l, ferry = [], [], [], [], None
for r in segs:
    g = wkb.loads(r['geometry'])
    if r['subtype'] == 'water':
        if 'Central - Tsim Sha Tsui' in primary(r): ferry = pgeom(g)
        continue
    if r['subtype'] != 'road': continue
    line = pgeom(g)
    if not line.intersects(detail_box.buffer(100)): continue
    c = r['class']
    if c in VEH:
        ow = oneway(r)
        if c in ('motorway', 'trunk') and not ow: ow = 1
        wid = (W1 if ow else W2)[c]
        if r.get('subclass') == 'link': wid = 6.5
        if r.get('subclass') in ('driveway', 'parking_aisle'): wid = 3.6
        for wr in r.get('width_rules') or []:
            if wr['value'] and 3 < wr['value'] < 30 and not wr.get('between'): wid = wr['value']
        conns = r.get('connectors') or []
        for a, b in ground_pieces(r, line):
            if b - a < 1e-4: continue
            piece = substring(line, a, b, normalized=True)
            if piece.length < 0.5: continue
            cs = sorted([(x['at'], x['connector_id']) for x in conns if a - 1e-6 <= x['at'] <= b + 1e-6])
            road_lines.append(dict(line=piece, cls=c, ow=ow, w=wid, name=primary(r), a=a, b=b, conns=cs,
                                   full=line, sub=r.get('subclass')))
    elif c in ('footway', 'pedestrian', 'path', 'steps', 'cycleway'):
        if ranges_bad(r): continue
        if r.get('subclass') == 'crosswalk': crossings.append(line)
        elif r.get('subclass') == 'sidewalk' or (primary(r) and c == 'footway'): sidewalks.append(line)
        elif c == 'steps': steps_l.append(line)
        else: paths.append((line, c))
print('road pieces', len(road_lines), 'sidewalks', len(sidewalks), 'crossings', len(crossings), file=sys.stderr)

# ------------------------------------------------------------------ buildings
brows = load('building')
parts = load('building_part')
parts_by = {}
for p in parts: parts_by.setdefault(p['building_id'], []).append(p)

KIND = {'residential': 0, 'apartments': 0, 'commercial': 1, 'office': 1, 'hotel': 2, 'civic': 3, 'government': 3,
        'education': 3, 'outbuilding': 4, 'service': 4, 'retail': 5, 'entertainment': 5, 'religious': 6,
        'transportation': 7, 'industrial': 4, 'medical': 3}


def guess_height(r, area, kind):
    k = h01(r['id'])
    if kind == 4: return 3.5 + 4 * k
    if kind == 7: return 8 + 6 * k
    if kind == 6: return 12 + 8 * k
    if area < 60: return 4 + 4 * k                       # kiosks, huts
    if area < 200: return 20 + 25 * k
    if area > 4000: return 25 + 35 * k                    # podiums, malls
    return 35 + 40 * k                                   # typical TST composite building, 12-24 floors


def hgt(r, area, kind):
    h = r.get('height')
    if h and h > 1: return h, 'h'
    f = r.get('num_floors')
    if f: return f * 3.2 + 1.5, 'f'
    return guess_height(r, area, kind), 'g'


FORCE = {   # real figures where the data has none
    'Milton Mansion': (16 * 3.0 + 2.0, 0),
    'Chungking Mansions': (17 * 3.0 + 2.5, 0),
    'Mirador Mansion': (17 * 3.0 + 2.5, 0),
}

bout, fout, landmarks = [], [], []
detail_polys = []
nb = {'h': 0, 'f': 0, 'g': 0}
for r in brows:
    if r.get('is_underground'): continue
    g0 = pgeom(wkb.loads(r['geometry']))
    if not g0.intersects(far_box): continue
    name = primary(r)
    en = re.sub(r'^[^A-Za-z]*', '', name).strip()
    cl = r.get('class') or r.get('subtype') or ''
    kind = KIND.get(cl, KIND.get(r.get('subtype') or '', 0 if 'Mansion' in name else 1 if r.get('subtype') == 'commercial' else 0))
    if 'Hotel' in name: kind = 2
    pieces = []
    if r.get('has_parts') and r['id'] in parts_by:
        for p in parts_by[r['id']]:
            pg = pgeom(wkb.loads(p['geometry']))
            pieces.append((pg, p))
    else:
        pieces.append((g0, r))
    detail = g0.intersects(detail_box)
    for pg, src in pieces:
        for poly in polys(pg):
            if not poly.is_valid: poly = poly.buffer(0)
            for poly in polys(poly):
                area = poly.area
                h, how = hgt(src, area, kind)
                if src is r and en in FORCE: h = FORCE[en][0]; how = 'f'
                nb[how] += 1
                mh = src.get('min_height') or 0
                if src.get('min_floor') and not mh: mh = src['min_floor'] * 3.2
                if detail:
                    sp = poly.simplify(0.25)
                    if sp.is_empty or sp.area < 2: continue
                    flags = 1 if how == 'g' else 0
                    rings = poly_out(sp)
                    pn = primary(src) if src is not r else ''
                    pen = re.sub(r'^[^A-Za-z]*', '', pn).strip()
                    bout.append([kind, dm(h), dm(mh), flags, nm(en or name or pen or pn)] + [len(rings)] + [len(x) // 2 for x in rings] + sum(rings, []))
                    if src is r or pieces[0][1] is src: detail_polys.append(sp)
                else:
                    if h < 18 or area < 150: continue           # the backdrop only needs what shows over the harbour
                    c0 = poly.centroid
                    if math.hypot(c0.x, c0.y) > 2000:           # far away: tall ones only, as boxes
                        if h < 35: continue
                        bx = poly.minimum_rotated_rectangle
                        if bx.geom_type != 'Polygon': continue
                        c = list(shapely.geometry.polygon.orient(bx, 1.0).exterior.coords)[:-1]
                        fout.append([kind, round(h), round(mh)] + [round(v) for xz in c for v in xz])
                        continue
                    sp = poly.simplify(2.0)
                    if sp.is_empty or sp.area < 60: continue
                    if len(sp.exterior.coords) > 13: sp = sp.convex_hull if sp.convex_hull.area < sp.area * 1.2 else sp.simplify(5)
                    if sp.is_empty or sp.geom_type != 'Polygon': continue
                    c = list(shapely.geometry.polygon.orient(sp, 1.0).exterior.coords)[:-1]
                    fout.append([kind, round(h), round(mh)] + [round(v) for xz in c for v in xz])   # whole metres
    if name and detail and g0.intersects(walk_box):
        c = g0.representative_point()
        landmarks.append([nm(name), dm(c.x), dm(c.y), dm(math.sqrt(g0.area))])
print('buildings detail', len(bout), 'far', len(fout), nb, file=sys.stderr)
bunion = unary_union(detail_polys).buffer(0)

# ------------------------------------------------------------------ road surfaces and pavements
side_cut = unary_union([s.buffer(0.6, cap_style=2) for s in sidewalks if s.intersects(detail_box)])
pieces = []
for rl in road_lines:
    if not rl['line'].intersects(detail_box.buffer(60)): continue
    pieces.append(rl['line'].buffer(rl['w'] / 2, cap_style=1, join_style=1, quad_segs=4))
roads = unary_union(pieces)
roads = roads.difference(bunion.buffer(1.2, join_style=2)).difference(side_cut)
roads = roads.intersection(land).intersection(detail_box)
roads = unary_union([p for p in polys(roads) if p.area > 6]).buffer(0.3).buffer(-0.3).simplify(0.2)
pave = land.intersection(detail_box).difference(roads).buffer(0)
pave = unary_union([p for p in polys(pave) if p.area > 3])
print('roads km2', round(roads.area / 1e6, 3), 'pavement blocks', len(polys(pave)), file=sys.stderr)

# ------------------------------------------------------------------ green, plazas, water features
lu = load('land_use')
green, plaza = [], []
for r in lu:
    g = pgeom(wkb.loads(r['geometry']))
    if not g.intersects(detail_box) or g.geom_type not in ('Polygon', 'MultiPolygon'): continue
    if r['class'] in ('park', 'garden', 'grass', 'flowerbed', 'village_green', 'recreation_ground') or r['subtype'] == 'park':
        if r['class'] == 'park': continue        # whole parks are mostly paved here; their gardens and lawns are mapped separately
        green.append(g)
    elif r['class'] in ('pitch', 'playground', 'track'):
        plaza.append(g)
for r in land_rows:
    if r['class'] in ('wood', 'grassland', 'scrub', 'grass'):
        g = pgeom(wkb.loads(r['geometry']))
        if g.intersects(detail_box) and g.geom_type in ('Polygon', 'MultiPolygon'): green.append(g)
greenU = unary_union(green).intersection(pave).buffer(-0.3).buffer(0.3).simplify(0.3)
plazaU = unary_union(plaza).intersection(pave).difference(greenU).simplify(0.3)
pools = []
for r in load('water'):
    g = pgeom(wkb.loads(r['geometry']))
    if g.geom_type == 'Polygon' and g.area < 20000 and g.intersects(detail_box) and r['class'] not in ('bay', 'strait', 'ocean'):
        pools += polys(g.intersection(pave))

# ------------------------------------------------------------------ trees
trees = []
for r in land_rows:
    g = pgeom(wkb.loads(r['geometry']))
    if r['class'] == 'tree' and g.geom_type == 'Point' and detail_box.contains(g):
        trees.append((g.x, g.y))
    elif r['class'] == 'tree_row' and g.intersects(detail_box):
        L = g.length
        for i in range(int(L // 7) + 1): p = g.interpolate(i * 7); trees.append((p.x, p.y))
# scatter trees in green areas (deterministic)
rng = np.random.default_rng(7)
for p in polys(greenU):
    n = int(p.area / 90)
    x0, z0, x1, z1 = p.bounds
    k = 0
    while n > 0 and k < n * 6:
        k += 1
        x, z = rng.uniform(x0, x1), rng.uniform(z0, z1)
        if p.contains(Point(x, z)) and not bunion.contains(Point(x, z)): trees.append((x, z)); n -= 1
trees = [t for t in trees if not bunion.buffer(1.5).contains(Point(*t))]
print('trees', len(trees), file=sys.stderr)

# ------------------------------------------------------------------ street furniture
stops, signals, xing = [], [], []
for r in infra:
    g = wkb.loads(r['geometry'])
    if g.geom_type != 'Point': continue
    q = pgeom(g)
    if not detail_box.contains(q): continue
    if r['class'] == 'bus_stop': stops.append([dm(q.x), dm(q.y), nm(primary(r))])
    elif r['class'] == 'traffic_signals': signals.append([dm(q.x), dm(q.y)])

# ------------------------------------------------------------------ shops (ground-floor places)
CAT = ['shop', 'food', 'cafe', 'bar', 'hotel', 'bank', 'pharmacy', 'jewel', 'fashion', 'tech', 'beauty', 'conv', 'travel', 'other']


def cat_of(r):
    t = (r.get('taxonomy') or {})
    hier = ' '.join(t.get('hierarchy') or []) + ' ' + (r.get('basic_category') or '')
    for key, c in [('jewel', 'jewel'), ('watch', 'jewel'), ('pharmac', 'pharmacy'), ('drugstore', 'pharmacy'), ('cosmetic', 'beauty'),
                   ('beauty', 'beauty'), ('bakery', 'cafe'), ('coffee', 'cafe'), ('cafe', 'cafe'), ('tea', 'cafe'), ('dessert', 'cafe'),
                   ('bar', 'bar'), ('pub', 'bar'), ('restaurant', 'food'), ('food', 'food'), ('hotel', 'hotel'), ('hostel', 'hotel'),
                   ('guest', 'hotel'), ('bank', 'bank'), ('currency', 'bank'), ('atm', 'bank'), ('money', 'bank'), ('electronic', 'tech'),
                   ('phone', 'tech'), ('camera', 'tech'), ('computer', 'tech'), ('clothing', 'fashion'), ('fashion', 'fashion'),
                   ('shoe', 'fashion'), ('tailor', 'fashion'), ('convenience', 'conv'), ('supermarket', 'conv'), ('travel', 'travel'),
                   ('shop', 'shop'), ('retail', 'shop'), ('store', 'shop')]:
        if key in hier: return c
    return None


# Real shop names from the listings, placed on the shopfront facing the street named in each address.
# Shops inside the malls (Harbour City, K11 and so on) are left out: their fronts are indoors.
MALLS = re.compile(r'Harbour City|海港城|Ocean Terminal|海運大廈|Ocean Centre|海洋中心|Gateway|港威|K11|Victoria Dockside|iSQUARE|國際廣場|Chungking|重慶大廈|'
                   r'Mirador|美麗都|Elements|圓方|Star House|星光行|China Hong Kong City|中港城|Mira Place|美麗華|The ONE|Peninsula Arcade|半島酒店商場|Silvercord|新港中心', re.I)
SUFFIX = re.compile(r'\s*(\(.*?\)|（.*?）|【.*?】|\[.*?\])\s*')
PLACE_WORDS = re.compile(r'(尖沙咀|尖沙嘴|尖東|佐敦)(店|分店|旗艦店)?|\b(Tsim Sha Tsui|Tsimshatsui|TST East|TST|Hong Kong|HK|Kowloon)\b\s*(Branch|Shop|Store)?', re.I)


def clean_name(n, maxzh=8, maxen=26):
    n = n.split('|')[0].split(' - ')[0]
    n = SUFFIX.sub(' ', n)
    n = PLACE_WORDS.sub(' ', n)
    zh = ''.join(re.findall(r'[㐀-鿿豈-﫿]+', n))
    en = ' '.join(re.findall(r"[A-Za-z0-9][A-Za-z0-9&'.\-]*", n))
    en = re.sub(r'\s+', ' ', en).strip(" -.&")
    if len(zh) > maxzh: zh = zh[:maxzh]
    if len(en) > maxen: en = ' '.join(en[:maxen].split(' ')[:-1]) or en[:maxen]
    en = re.sub(r'\s+(and|&|of|the|for|by|-)$', '', en, flags=re.I)
    return zh, en


# street tokens: "彌敦道 Nathan Road" -> ("彌敦道", "nathan")
street_lines = {}
for rl in road_lines:
    nmx = rl['name']
    if not nmx: continue
    zh = ''.join(re.findall(r'[㐀-鿿]+', nmx))
    en = re.sub(r'\s+(Road|Rd|Street|St|Avenue|Ave|Drive|Lane|Terrace|Circuit|Court|Square|Road West|Road East|Road South)\b.*$', '', re.sub(r'^[^A-Za-z]*', '', nmx)).strip()
    key = (zh, en.lower())
    street_lines.setdefault(key, []).append(rl['line'])
streets = [(k, unary_union(v)) for k, v in street_lines.items() if k[1] or k[0]]


def street_of(ad):
    a = ad.lower()
    best = None
    for (zh, en), geom in streets:
        if (zh and zh in ad) or (en and len(en) > 2 and re.search(r'\b' + re.escape(en) + r'\b\s*(rd|road|st|street|ave|avenue|drive|lane|terrace|circuit|court|sq)', a)):
            if not best or len(zh) + len(en) > len(best[0][0]) + len(best[0][1]): best = ((zh, en), geom)
    return best[1] if best else None


bpolys = [p for p in detail_polys if p.intersects(walk_box.buffer(40))]
btree = shapely.STRtree(bpolys)
shops, raw_n, skipped = [], 0, 0
for r in load('places'):
    ad = ' '.join((a.get('freeform') or '') for a in (r.get('addresses') or []))
    if not re.search(r'地下|G/F|G/f|Ground|地舖|地鋪|Shop G', ad): continue
    if MALLS.search(ad) or (r.get('confidence') or 0) < 0.55 or r.get('operating_status') == 'permanently_closed': continue
    c = cat_of(r)
    if not c: continue
    q = pgeom(wkb.loads(r['geometry']))
    if not walk_box.contains(q): continue
    zh, en = clean_name(primary(r))
    if not zh and not en: continue
    raw_n += 1
    st = street_of(ad)
    near = [bpolys[i] for i in btree.query(q.buffer(35))]
    if not near: skipped += 1; continue
    if st is not None:
        if st.distance(q) > 60: skipped += 1; continue
        sp = shapely.ops.nearest_points(st, q)[0]          # the place's spot on its street
        b = min(near, key=lambda p: p.distance(sp))
        if b.distance(sp) > 22: skipped += 1; continue
        pt = shapely.ops.nearest_points(b.boundary, sp)[0]
    else:
        b = min(near, key=lambda p: p.distance(q))
        if b.distance(q) > 20: skipped += 1; continue
        pt = shapely.ops.nearest_points(b.boundary, q)[0]
    shops.append((pt.x, pt.y, CAT.index(c), nm(zh + '|' + en)))
# one sign per name per spot
kept = []
for s2 in shops:     # one sign per name within 20 m, and no two signs on the same 2.5 m of frontage
    d2 = lambda k: (s2[0] - k[0]) ** 2 + (s2[1] - k[1]) ** 2
    if any(d2(k) < 6.25 or (k[3] == s2[3] and d2(k) < 400) for k in kept): continue
    kept.append(s2)
shops = [[dm(x), dm(z), c, n] for x, z, c, n in kept]
print('shops', len(shops), 'of', raw_n, 'skipped', skipped, file=sys.stderr)

# Milton Mansion's listed tenants, by floor and unit
milton = []
for r in load('places'):
    ad = ' '.join((a.get('freeform') or '') for a in (r.get('addresses') or []))
    if not re.search(r'美敦|Milton Mansion|96 ?Nathan|彌敦道\s*96|Nathan Rd, 96|96號 Nathan|96號美敦', ad): continue
    if (r.get('confidence') or 0) < 0.4: continue
    zh, en = clean_name(primary(r), 14, 34)
    if 'Milton' in en and not zh: continue
    m = re.search(r'(\d+)\s*樓\s*([A-Z])', ad) or re.search(r'Unit\s*(\d+)([A-Z])', ad) or re.search(r'Flat\s*([A-Z]),\s*(\d+)/F', ad) or re.search(r'96號\s*(\d+)([A-Z])', ad) or re.search(r'(\d+)/F\s*([A-Z])?', ad)
    floor = unit = ''
    if m:
        g1, g2 = m.group(1), m.group(2) if m.lastindex and m.lastindex >= 2 else ''
        if g1.isalpha(): floor, unit = g2, g1
        else: floor, unit = g1, g2 or ''
    else:
        m2 = re.search(r'(\d+)\s*樓', ad)
        if m2: floor = m2.group(1)
    milton.append([floor, unit or '', zh, en])
print('milton tenants', milton, file=sys.stderr)

# ------------------------------------------------------------------ road graph (for traffic and markings)
nodes, node_ix = [], {}


def node(cid, x, z):
    if cid not in node_ix: node_ix[cid] = len(nodes); nodes.append([dm(x), dm(z)])
    return node_ix[cid]


edges = []
for rl in road_lines:
    if not rl['line'].intersects(detail_box.buffer(30)): continue
    full = rl['full']
    cs = rl['conns']
    # split this ground-level piece at every connector inside it
    cuts = [rl['a']] + [a for a, _ in cs if rl['a'] + 1e-6 < a < rl['b'] - 1e-6] + [rl['b']]
    ids = {}
    for a, cid in cs: ids[round(a, 6)] = cid
    for i in range(len(cuts) - 1):
        a, b = cuts[i], cuts[i + 1]
        part = substring(full, a, b, normalized=True)
        if part.length < 0.3: continue
        pts = list(part.coords)
        ca = ids.get(round(a, 6)) or f'e{id(rl)}_{a:.5f}'
        cb = ids.get(round(b, 6)) or f'e{id(rl)}_{b:.5f}'
        na, nb2 = node(ca, *pts[0]), node(cb, *pts[-1])
        flat = []
        for x, z in pts[1:-1]: flat += [dm(x), dm(z)]
        edges.append([na, nb2, CLS.index(rl['cls']), rl['ow'], dm(rl['w']), nm(rl['name'])] + flat)
print('graph nodes', len(nodes), 'edges', len(edges), file=sys.stderr)

# ------------------------------------------------------------------ terrain for the backdrop (hills of Hong Kong Island)
dem = np.load(RAW / 'dem.npz')
E, TX0, TY0, Z = dem['e'], int(dem['tx0']), int(dem['ty0']), int(dem['z'])


def dem_at(lon, lat):
    n = 2 ** Z
    px = ((lon + 180) / 360 * n - TX0) * 256
    py = ((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n - TY0) * 256
    i, j = int(np.clip(py, 0, E.shape[0] - 1)), int(np.clip(px, 0, E.shape[1] - 1))
    return float(E[i, j])


TS = 60
tw, th = (FAR[2] - FAR[0]) // TS + 1, (FAR[3] - FAR[1]) // TS + 1
raw = np.zeros((th, tw))
for j in range(th):
    for i in range(tw):
        x, z = FAR[0] + i * TS, FAR[1] + j * TS
        lon, lat = LON0 + x / MX, LAT0 - z / MZ
        raw[j, i] = dem_at(lon, lat)
# smooth (box blur x2) and keep only the hills; the city floor is flat
k = np.ones(5) / 5
sm = raw.copy()
for _ in range(2):
    sm = np.apply_along_axis(lambda v: np.convolve(np.pad(v, 2, mode='edge'), k, 'valid'), 1, sm)
    sm = np.apply_along_axis(lambda v: np.convolve(np.pad(v, 2, mode='edge'), k, 'valid'), 0, sm)
t = np.clip((sm - 25) / 45, 0, 1)
terr = np.where(t > 0, sm * t * t * (3 - 2 * t), 0)
landmask = np.zeros_like(terr, bool)
pl = shapely.prepared.prep(land.buffer(-20))
for j in range(th):
    for i in range(tw):
        landmask[j, i] = pl.contains(Point(FAR[0] + i * TS, FAR[1] + j * TS))
terr = np.where(landmask, terr, -12)
terr[(landmask) & (terr < 0.5)] = -1                  # flat city: hidden under the city floor
# no hills inside the detail area
for j in range(th):
    for i in range(tw):
        x, z = FAR[0] + i * TS, FAR[1] + j * TS
        if detail_box.buffer(80).contains(Point(x, z)) and landmask[j, i]: terr[j, i] = -1


def base_at(x, z):
    i, j = (x - FAR[0]) / TS, (z - FAR[1]) / TS
    i0, j0 = int(np.clip(i, 0, tw - 2)), int(np.clip(j, 0, th - 2))
    fx, fz = np.clip(i - i0, 0, 1), np.clip(j - j0, 0, 1)
    v = (terr[j0, i0] * (1 - fx) * (1 - fz) + terr[j0, i0 + 1] * fx * (1 - fz) + terr[j0 + 1, i0] * (1 - fx) * fz + terr[j0 + 1, i0 + 1] * fx * fz)
    return max(0.0, v)


for f in fout:      # sit far buildings on the hills: base = lowest corner
    xs, zs = f[3::2], f[4::2]
    b = min(base_at(x, z) for x, z in zip(xs, zs))
    f.insert(3, round(b))

# ------------------------------------------------------------------ coastline (for sea walls and the far city floor)
far_land = land.intersection(far_box)
coast = []
for p in polys(far_land.simplify(0.6)):
    for ring in [p.exterior] + list(p.interiors):
        ln = ring.intersection(far_box.buffer(-1))
        for seg in ([ln] if ln.geom_type == 'LineString' else list(getattr(ln, 'geoms', []))):
            if seg.length > 2: coast.append(ring_out(seg.coords, False))
far_floor = []                 # cut into 500 m tiles so each piece triangulates quickly and reliably
ff = far_land.difference(detail_box).simplify(2.0)
for tx in range(FAR[0], FAR[2], 500):
    for tz in range(FAR[1], FAR[3], 500):
        for p in polys(ff.intersection(box(tx, tz, tx + 500, tz + 500))):
            if p.area > 50: far_floor.append(poly_out(p))
detail_floor = [poly_out(p) for p in polys(land.intersection(detail_box)) if p.area > 2]

MAP = dict(
    origin=[LON0, LAT0], mx=round(MX, 2), mz=round(MZ, 2), walk=WALK, detail=DETAIL, far=FAR,
    names=names,
    b=bout, bf=fout, lm=landmarks,
    floor=detail_floor, farFloor=far_floor, coast=coast,
    pave=[poly_out(p) for p in polys(pave)],
    green=[poly_out(p) for p in polys(greenU) if p.area > 4],
    plaza=[poly_out(p) for p in polys(plazaU) if p.area > 4],
    pools=[poly_out(p) for p in pools if p.area > 4],
    cross=[ring_out(c.coords, False) for c in crossings if c.intersects(detail_box)],
    paths=[[1 if c == 'steps' else 0] + ring_out(l.coords, False) for l, c in paths if l.intersects(detail_box)],
    trees=sum([[dm(x), dm(z)] for x, z in trees], []),
    stops=stops, signals=signals, shops=shops, milton=milton,
    nodes=sum(nodes, []), edges=edges,
    ferry=ring_out(ferry.coords, False) if ferry else [],
    terr=dict(x0=FAR[0], z0=FAR[1], step=TS, w=tw, h=th, v=[int(round(v)) for v in terr.flatten()]),
)
js = json.dumps(MAP, separators=(',', ':'), ensure_ascii=False)
OUT.write_text('// GENERATED by tools/bake.py from Overture Maps (OpenStreetMap and others, ODbL) and AWS terrain tiles. Do not edit.\n'
               'const MAP = ' + js + ';\n')
print('wrote', OUT, len(js) // 1024, 'KB', file=sys.stderr)

# ------------------------------------------------------------------ check image
try:
    from PIL import Image, ImageDraw
    S = 2.0
    W, H = int((DETAIL[2] - DETAIL[0]) / S * 1), int((DETAIL[3] - DETAIL[1]) / S)
    im = Image.new('RGB', (W, H), (30, 60, 110))
    d = ImageDraw.Draw(im)
    T = lambda x, z: ((x - DETAIL[0]) / S, (z - DETAIL[1]) / S)
    def fill(p, col):
        d.polygon([T(*c) for c in p.exterior.coords], fill=col)
        for i in p.interiors: d.polygon([T(*c) for c in i.coords], fill=(60, 60, 64))
    for p in polys(land.intersection(detail_box)): fill(p, (60, 60, 64))
    for p in polys(pave): fill(p, (150, 145, 135))
    for p in polys(greenU): fill(p, (70, 130, 60))
    for p in detail_polys: fill(p, (200, 120, 90) if p.intersects(walk_box) else (170, 110, 90))
    for c in crossings: d.line([T(*q) for q in c.coords], fill=(255, 255, 255), width=2)
    for x, z in trees: d.ellipse([T(x - 2, z - 2), T(x + 2, z + 2)], fill=(30, 90, 30))
    d.rectangle([T(WALK[0], WALK[1]), T(WALK[2], WALK[3])], outline=(255, 255, 0))
    im.save(RAW / 'bake.png')
except Exception as e:
    print('no check image', e, file=sys.stderr)
