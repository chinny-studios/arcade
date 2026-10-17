// Checks every scenario for unknown speakers, facts, sets and minigames (Scenarios.check), that each fact can be
// unlocked, and that each event has the fields the time dial, the journal and the shelf need.
// node test/smoke.mjs --steps test/content.js
const problems = TA.check(), res = { scenarios: TA.Scenarios.sorted().map((s) => s.id + ' ' + s.when) };
for (const sc of TA.Scenarios.sorted()) {
  for (const k of ['blurb', 'role', 'color', 'souvenir', 'homeLine']) if (!sc[k]) (problems[sc.id] = problems[sc.id] || []).push('missing ' + k);
  if (sc.souvenir && typeof sc.souvenir.build !== 'function') problems[sc.id].push('souvenir.build is not a function');
  res[sc.id] = { chapters: sc.chapters.length, facts: Object.keys(sc.facts).length, cast: Object.keys(sc.cast).length, minigames: sc.chapters.flatMap((c) => c.steps.filter((s) => s.play).map((s) => s.play)).join(' ') };
}
const bad = Object.entries(problems).filter(([, p]) => p.length);
if (bad.length) throw new Error(JSON.stringify(Object.fromEntries(bad), null, 1));
return res;
