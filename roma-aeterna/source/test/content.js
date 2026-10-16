// every placard has text, every job has lines, every place has a name; count things
const ids = RA.W.placards.map((p) => p.id);
const miss = ids.filter((id) => !RA.f.PLACARD_TEXT[id]);
const unused = Object.keys(RA.f.PLACARD_TEXT).filter((k) => !ids.includes(k));
const jobs = Object.values(RA.f.JOBS).map((j) => j[2]).filter((k) => !RA.f.LINES[k]);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
return { placards: ids.length, missingText: miss, unusedText: unused, dupPlacards: dup, jobsWithoutLines: [...new Set(jobs)], places: RA.W.places.length, spots: RA.W.spots.length, fountains: RA.W.fountains.length };
