// Let free will run the family for a week: daily moods, money, accidents and errors
const rep = [];
F.takeJob(S[0], 'science'); F.takeJob(S[1], 'culinary');
for (let d = 0; d < 7; d++) {
  const moods = [];
  for (let h = 0; h < 24; h++) { WL.sim(60, 2); moods.push(WL.sims().map(s => Math.round(s.mood))); }
  const avg = WL.sims().map((s, i) => Math.round(moods.reduce((a, m) => a + (m[i] || 0), 0) / 24));
  const low = WL.sims().map(s => { const n = Object.entries(s.needs).sort((a, b) => a[1] - b[1])[0]; return n[0] + Math.round(n[1]); });
  rep.push({ day: d + 1, avg, low, money: G.money, items: G.items.map(i => i.kind).join(','), jobs: WL.sims().map(s => s.job ? s.job.level + ':' + Math.round(s.job.perf) : s.school ? 'g' + s.school.grade : '-') });
}
const L = G.log.map(l => l.text);
rep.push({ accidents: L.filter(t => t.includes('hold it')).length, passOut: L.filter(t => t.includes('passed out')).length, missed: L.filter(t => t.includes('missed')).length, promoted: L.filter(t => t.includes('promoted')).length, starving: L.filter(t => t.includes('starving')).length, fires: L.filter(t => t.includes('Fire')).length, died: L.filter(t => t.includes('died')).length });
rep.push(G.log.slice(0, 30).map(l => 'D' + Math.floor(l.t / 1440 + 1) + ' ' + l.text.slice(0, 90)));
return rep;
