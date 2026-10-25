// Act of God — the newsroom: headlines for every incident (first report, rising tolls, the aftermath), the public's
// reaction, quiet-day filler, the scrolling ticker and the breaking-news banner.

const NEWS = { items: [], queue: [], idleT: 25, outlet: '', reactT: 0 };
const n0 = (n) => fmtInt(n);
const HEAD = {
  lightning: { first: (i) => [`Lightning strikes ${i.district}`, `Fires reported after a sudden storm over ${i.district}`], update: (i) => [`Lightning: ${n0(i.mag)} strikes on ${i.district}`, i.deaths ? `${n0(i.deaths)} dead as fires spread` : 'Fire crews stretched across the district'] },
  tornado: { first: (i) => [`EF${i.mag} tornado tears through ${i.district}`, 'Residents told to take shelter below ground'], update: (i) => [`Tornado toll rises to ${n0(i.deaths)}`, `${n0(i.destroyed)} buildings flattened in ${i.district}`] },
  blizzard: { first: (i) => [`Blizzard paralyses ${W.name}`, `Roads closed and power lines down around ${i.district}`], update: (i) => [`${n0(i.deaths)} dead as the cold grips ${W.name}`, 'Shelters open for those without heat'] },
  hurricane: { first: (i) => [`Category ${i.mag} hurricane makes landfall over ${W.name}`, 'Storm surge and flash floods expected'], update: (i) => [`Hurricane: ${n0(i.deaths)} dead, ${n0(i.destroyed)} homes destroyed`, `Damage estimated at ${fmtMoney(i.damage)}`] },
  quake: { first: (i) => [`Magnitude ${i.mag.toFixed(1)} earthquake strikes ${i.district}`, i.mag >= 7.5 ? 'Buildings collapse across the city' : 'Shaking felt across the city'], update: (i) => [`Rescuers search the rubble as the quake toll rises to ${n0(i.deaths)}`, `${n0(i.destroyed)} buildings down, ${n0(i.injured)} injured`] },
  sinkhole: { first: (i) => [`Sinkhole swallows part of ${i.district}`, `A ${i.mag}-metre hole opened without warning`], update: (i) => [`Sinkhole: ${n0(i.deaths)} confirmed dead`, `${n0(i.destroyed)} buildings lost in ${i.district}`] },
  volcano: { first: (i) => [`A volcano has erupted in ${i.district}`, 'Geologists say there was no sign of activity in the area'], update: (i) => [`Lava reaches the streets: ${n0(i.deaths)} dead`, `${n0(i.destroyed)} buildings lost as the eruption continues`] },
  wildfire: { first: (i) => [`Wildfire spreads toward ${i.district}`, 'Residents ordered to leave now'], update: (i) => [`Wildfire: ${n0(i.destroyed)} buildings burned`, i.deaths ? `${n0(i.deaths)} confirmed dead` : 'Crews fight to hold the fire line'] },
  meteor: { first: (i) => [`Meteor strikes ${i.district}`, `The impact left a crater ${n0(i.mag)} metres across`], update: (i) => [`Meteor impact: ${n0(i.deaths)} dead`, `${n0(i.destroyed)} buildings destroyed, ${n0(i.injured)} injured`] },
  meteorShield: { first: (i) => [`Meteor explodes above ${i.district}`, 'Witnesses describe "a dome of light" over the city'], update: () => null },
  tsunami: { first: (i) => [`Tsunami hits ${W.name}: ${n0(i.mag)}-metre wave`, `Water pours into ${i.district}`], update: (i) => [`Tsunami: ${n0(i.deaths)} dead, ${n0(i.destroyed)} buildings swept away`, 'Survivors wait on rooftops for rescue'] },
  flood: { first: (i) => [`Flash floods in ${i.district}`, 'Streets under water after a sudden downpour'], update: (i) => [`Floods: ${n0(i.deaths)} dead`, `${n0(i.destroyed)} buildings lost to the water`] },
  smite: { first: (i) => [`"A column of fire from the sky"`, `Buildings in ${i.district} reduced to ash`], update: (i) => [`Fire from the sky: ${n0(i.deaths)} dead in ${i.district}`, 'No explanation from the authorities'] },
  locusts: { first: (i) => [`Locust swarm descends on ${i.district}`, 'Parks and farmland stripped bare'], update: (i) => [`Locusts: crop losses reach ${fmtMoney(i.damage)}`, 'People urged to stay indoors'] },
  plague: { first: (i) => [`Outbreak of an unknown illness in ${i.district}`, 'Health officials urge residents to stay at home'], update: (i) => [`Outbreak: ${n0(i.deaths)} dead, ${fmtShort(G.stats.infected)} sick`, 'Hospitals near capacity'] },
  blackout: { first: (i) => [`Power fails across ${i.district}`, 'Traffic lights out; hospitals on backup generators'], update: (i) => i.deaths ? [`Blackout: ${n0(i.deaths)} dead in accidents`, 'Engineers work to restore the grid'] : null },
  heal: { first: (i) => [`Patients in ${i.district} recover overnight`, `${n0(i.healed)} people healed. Doctors "cannot explain it"`], update: (i) => [`Recoveries in ${i.district} reach ${n0(i.healed)}`, 'Hospital wards are emptying'] },
  quench: { first: (i) => [`Fires in ${i.district} go out at once`, 'Firefighters describe a sudden calm'], update: () => null },
  restore: { first: (i) => [`Ruined buildings in ${i.district} are standing again`, `${n0(i.built)} restored "as if nothing happened"`], update: (i) => [`${n0(i.built)} buildings restored in ${i.district}`, 'Insurers suspend claims'] },
  shield: { first: (i) => [`A dome of light appears over ${i.district}`, 'Crowds gather at its edge'], update: () => null },
  grow: { first: (i) => [`Building boom in ${i.district}`, `${n0(i.built)} new buildings in days`], update: (i) => [`${i.district} keeps growing: ${n0(i.built)} new buildings`, `${W.name} population now ${fmtBig(G.stats.pop)}`] },
  bloom: { first: (i) => [`${i.district} bursts into bloom`, 'Record harvests and new forest reported'], update: () => null },
  rain: { first: (i) => [`Welcome rain over ${i.district}`, 'Gardens and parks green up'], update: () => null },
  sun: { first: () => [`Skies clear over ${W.name}`, 'Forecasters had predicted storms'], update: () => null },
  rainbow: { first: (i) => [`Crowds gather beneath a vast rainbow over ${i.district}`, 'Strangers embrace in the streets'], update: () => null },
  raise: { first: (i) => [`The ground is rising in ${i.district}`, 'Surveyors record new hills by the hour'], update: () => null },
  part: { first: (i) => [`The waters part off ${i.district}`, 'Thousands walk out onto the seabed'], update: () => null },
  gold: { first: (i) => [`Golden light over ${i.district}`, 'Crime and sickness fall to nothing'], update: () => null },
  resurrect: { first: (i) => [`The dead are walking in ${i.district}`, `${n0(i.healed)} people declared dead are alive, hospitals confirm`], update: () => null },
};
const FILLER = [
  () => [`Commuters face delays on the ring road`, `${W.name} transport authority`],
  () => [`Council approves a new park for ${pick(W.districts).name}`, 'Work to begin in spring'],
  () => [`${W.name} FC win at home`, 'A late goal settles it'],
  () => [`Fair weather expected for the weekend`, `${W.name} forecast`],
  () => [`Rents rise again in ${pick(W.districts).name}`, 'Tenants call for action'],
  () => [`Local bakery celebrates 100 years`, pick(W.districts).name],
  () => [`Mayor opens new library in ${pick(W.districts).name}`, ''],
  () => [`Museum unveils a rare manuscript`, 'Queues around the block'],
];
function initNews() {
  NEWS.items = []; NEWS.queue = []; NEWS.idleT = 18; NEWS.reactT = 0;
  NEWS.outlet = pick([`${W.name} 24`, `Channel 4 ${W.name}`, `${W.name} Herald`, `WKGN ${W.name}`, `${W.name} Today`]);
  push([`${NEWS.outlet}: good morning, ${W.name}`, `Population ${fmtBig(G.stats.pop)}`], 'filler');
  if (!NEWS.bound) { NEWS.bound = true; bus.on('incident', () => { NEWS.idleT = 40; }); }
}
function push(h, kind, inc, breaking) {
  if (!h) return;
  const item = { h: h[0], s: h[1] || '', kind, t: G.t, good: inc && inc.good };
  NEWS.items.unshift(item);
  if (NEWS.items.length > 12) NEWS.items.pop();
  bus.emit('news', item, breaking);
}
// once a second: report incidents, follow their tolls, and the public mood
function newsTick() {
  for (const inc of G.incidents) {
    const H = HEAD[inc.type];
    if (!H) continue;
    const age = G.t - inc.t0;
    if (!inc.reported && age > (inc.good ? 1.5 : 2.5)) {
      inc.reported = 1; inc.lastNews = G.t; inc.last.deaths = inc.deaths; inc.last.destroyed = inc.destroyed;
      const major = !inc.good && (['quake', 'tornado', 'meteor', 'tsunami', 'volcano', 'hurricane', 'smite'].includes(inc.type));
      push(H.first(inc), inc.good ? 'good' : 'bad', inc, major || inc.type === 'resurrect' || inc.type === 'part');
      continue;
    }
    if (!inc.reported) continue;
    const since = G.t - inc.lastNews;
    const grewD = inc.deaths > Math.max(10, inc.last.deaths * 1.35), grewB = inc.destroyed > Math.max(5, inc.last.destroyed * 1.5);
    const grewG = inc.good && (inc.healed > (inc.last.healed || 0) * 1.5 + 20 || inc.built > (inc.last.built || 0) * 1.6 + 5);
    if (since > 16 && (grewD || grewB || grewG)) {
      const h = H.update(inc);
      if (h) {
        inc.lastNews = G.t; inc.last.deaths = inc.deaths; inc.last.destroyed = inc.destroyed; inc.last.healed = inc.healed; inc.last.built = inc.built;
        push(h, inc.good ? 'good' : 'bad', inc, inc.deaths > G.stats.pop0 * 0.002 && inc.deaths > 500);
      }
    }
    // the aftermath
    if (!inc.final && !inc.good && age > 45 && since > 30 && inc.deaths + inc.destroyed > 0) {
      inc.final = true;
      if (inc.deaths > 0) push([`${inc.district} mourns ${n0(inc.deaths)} dead`, `Damage put at ${fmtMoney(inc.damage)}`], 'bad', inc);
    }
  }
  // how the city is taking it
  NEWS.reactT -= 1;
  if (NEWS.reactT <= 0) {
    const S = G.stats, recentBad = G.incidents.filter((i) => !i.good && G.t - i.t0 < 120).length, recentGood = G.incidents.filter((i) => i.good && G.t - i.t0 < 120).length;
    let h = null;
    if (recentBad >= 3 && recentGood === 0) h = pick([[`Churches fill across ${W.name}`, 'People search for answers'], [`"Why us?": ${W.name} asks after a week of disaster`, ''], ['Preachers warn of judgement on the city steps', ''], [`Thousands leave ${W.name}`, 'Roads out of the city jammed']]);
    else if (recentGood >= 3 && recentBad === 0) h = pick([[`Pilgrims flock to ${W.name}`, 'Hotels fully booked'], ['"The city is blessed," says the archbishop', ''], ['Scientists baffled by a run of miracles', '']]);
    else if (recentBad >= 2 && recentGood >= 2) h = pick([['"Is someone up there testing us?"', `${W.name} divided over strange events`], ['Theologians argue live on air', 'Mercy or wrath?']]);
    else if (S.mood < 25) h = [`Vigils held across ${W.name}`, 'Candles for the dead'];
    if (h) { push(h, 'react'); NEWS.reactT = 70; } else NEWS.reactT = 20;
  }
  NEWS.idleT -= 1;
  if (NEWS.idleT <= 0) { push(pick(FILLER)(), 'filler'); NEWS.idleT = 45; }
}
