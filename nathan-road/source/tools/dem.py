"""Download AWS Terrain Tiles (terrarium PNG, zoom 15) around Tsim Sha Tsui into raw/dem.npz."""
import math, io, sys, pathlib, requests, numpy as np
HERE = pathlib.Path(__file__).resolve().parent
from PIL import Image
Z = 15
def tile(lon, lat):
    n = 2 ** Z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
x0, y0 = tile(114.135, 22.335); x1, y1 = tile(114.205, 22.262)
tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
W = (tx1 - tx0 + 1) * 256; H = (ty1 - ty0 + 1) * 256
img = np.zeros((H, W), np.float32)
s = requests.Session()
for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        r = s.get(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png', timeout=60)
        a = np.asarray(Image.open(io.BytesIO(r.content)).convert('RGB')).astype(np.float32)
        e = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        img[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = e
np.savez(HERE / 'raw' / 'dem.npz', e=img, tx0=tx0, ty0=ty0, z=Z)
print(img.shape, img.min(), img.max())
v = np.clip(img, 0, 100) / 100 * 255
Image.fromarray(v.astype(np.uint8)).save(HERE / 'raw' / 'dem.png')
