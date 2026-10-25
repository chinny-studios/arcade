// Act of God — names: cities, districts and the newsroom

const NAMES = {
  roots: ['Calder', 'Halvor', 'Marren', 'Ashby', 'Corvin', 'Bellamy', 'Treva', 'Oakmer', 'Selby', 'Dunmore', 'Varela', 'Kestrel', 'Lowry',
    'Arden', 'Brisk', 'Carrow', 'Elden', 'Fenwick', 'Garnet', 'Holt', 'Ivor', 'Jessop', 'Kinross', 'Larch', 'Merrin', 'Norland', 'Orrin', 'Pell',
    'Quill', 'Rowan', 'Stanmer', 'Tolland', 'Upton', 'Vance', 'Wexley', 'Yarrow', 'Zell', 'Alder', 'Brant', 'Coldry', 'Dallow', 'Esker',
    'Faro', 'Glenn', 'Harrow', 'Isel', 'Juno', 'Kirrin', 'Lisle', 'Mabry', 'Nesbit', 'Ostro', 'Penrose', 'Rudd', 'Sorrel', 'Thorne', 'Verity'],
  suf: ['ton', 'ville', 'burg', 'field', 'haven', 'ford', 'mouth', 'wick', 'port', 'stead', 'more', 'dale', 'bridge', 'minster', 'ridge', 'by', 'hurst', 'worth'],
  pre: ['Port ', 'New ', 'San ', 'Fort ', 'East ', 'West ', 'North ', 'South ', 'Mount ', 'Lake ', 'Saint '],
};
function cityName(r, size, water) {
  const root = r.pick(NAMES.roots);
  let n;
  const roll = r();
  if (roll < 0.45) n = root + r.pick(NAMES.suf);
  else if (roll < 0.75) {
    let p = r.pick(NAMES.pre);
    if (p === 'Port ' && water === 'none') p = 'New ';
    if (p === 'Lake ' && water !== 'lake') p = 'Saint ';
    n = p + root + (r.chance(0.4) ? r.pick(NAMES.suf) : '');
  } else n = root + ' ' + r.pick(water === 'none' ? ['Springs', 'Falls', 'Junction', 'Heights', 'Crossing', 'Hills'] : ['Bay', 'Harbor', 'Falls', 'Landing', 'Crossing', 'Point']);
  return n.replace(/(.)\1\1/g, '$1$1');
}

const DISTRICT_WORDS = {
  core: ['Financial District', 'Downtown', 'Midtown', 'Civic Center', 'Union Square', 'Market Square', 'The Exchange', 'Central'],
  water: ['Harborside', 'Riverside', 'The Docks', 'Waterfront', 'Pier District', 'Shore Row', 'Lakeside', 'Canal Quarter'],
  res: ['Elm Park', 'Cedar Hill', 'Maple Heights', 'Oakwood', 'Linden Grove', 'Birch End', 'Willow Bend', 'Hawthorne', 'Rosewood', 'Ashgrove', 'Juniper Flats', 'Larkspur'],
  ind: ['Ironworks', 'Rail Yards', 'Foundry Row', 'Mill District', 'Canal Works', 'The Flats', 'Gasworks'],
  old: ['Old Town', 'Old Quarter', 'Cathedral Hill', 'Saint Agnes', 'Kings Cross', 'Chapel Row', 'Beacon Hill'],
  edge: ['Northgate', 'Eastgate', 'Southgate', 'Westgate', 'Fairview', 'Brookside', 'Summerfield', 'Greenacre', 'Highfield', 'Meadowbank'],
};
function districtName(r, kind, used) {
  const list = DISTRICT_WORDS[kind] || DISTRICT_WORDS.res;
  for (let k = 0; k < 20; k++) { const n = r.pick(list); if (!used.has(n)) { used.add(n); return n; } }
  const n = r.pick(NAMES.roots) + ' ' + r.pick(['Park', 'Hill', 'Heights', 'Village', 'End']);
  used.add(n);
  return n;
}
