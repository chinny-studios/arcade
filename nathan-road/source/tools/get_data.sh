#!/bin/sh
# Fetch the raw map data for Nathan Road into tools/raw/ (git-ignored), then run bake.py.
# Needs: python3 with pyarrow, requests, numpy, pillow (pip install pyarrow requests numpy pillow shapely).
# Behind a proxy with its own CA, set REQUESTS_CA_BUNDLE.
set -e
cd "$(dirname "$0")"
mkdir -p raw
B="114.135 22.262 114.205 22.335"
for t in buildings/type=building buildings/type=building_part transportation/type=segment base/type=water base/type=land_use base/type=land base/type=infrastructure; do
  n=$(echo $t | sed 's/.*type=//')
  python3 fetch.py $t raw/$n.parquet $B
done
python3 fetch.py places/type=place raw/places.parquet 114.160 22.290 114.182 22.306
python3 dem.py
