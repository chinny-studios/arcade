// Willow Lane — the furnished starter cottage, the empty lot, and preset families

// Walls are listed as runs: [x0, z0, x1, z1] along one axis. Openings by edge.
const STARTER = {
  walls: [[6, 7, 20, 7], [6, 17, 20, 17], [6, 7, 6, 17], [20, 7, 20, 17], [6, 12, 20, 12], [12, 7, 12, 12], [15, 7, 15, 12]],
  doors: [['h', 10, 17, 1], ['h', 9, 12, 1], ['h', 13, 12, 1], ['h', 17, 12, 1]],
  windows: [['h', 7, 17, 1], ['h', 13, 17, 1], ['h', 15, 17, 2], ['h', 18, 17, 1], ['h', 8, 7, 1], ['h', 10, 7, 1], ['h', 13, 7, 3], ['h', 17, 7, 1],
    ['v', 6, 9, 1], ['v', 6, 15, 1], ['v', 20, 9, 1], ['v', 20, 10, 1]],
  // representative tile of each room -> [floor, paper]
  rooms: [[[8, 9], 7, 10], [[13, 9], 6, 12], [[17, 9], 9, 3], [[10, 14], 1, 2]],
  extraFloors: [[[15, 12, 19, 16], 4]],
  paths: [[10, 17, 10, 25], [9, 25, 11, 25]],
  objects: [
    ['bed_double', 8, 7, 0], ['lamp_table', 10, 7, 0], ['dresser', 6, 10, 1], ['plant', 11, 11, 0], ['mirror', 6, 8, 1],
    ['toilet', 12, 7, 0], ['shower', 14, 7, 0], ['sink', 12, 10, 1],
    ['bed_kids', 19, 7, 0], ['desk', 15, 7, 0], ['toybox', 16, 7, 0], ['lamp_floor', 18, 7, 0],
    ['tv', 6, 14, 1], ['sofa', 10, 13, 3], ['coffee_table', 8, 14, 1], ['bookshelf', 12, 16, 2], ['lamp_floor', 6, 16, 0], ['plant_big', 6, 12, 0],
    ['painting_b', 6, 13, 1], ['phone', 11, 16, 2], ['painting_a', 7, 11, 2],
    ['fridge', 19, 12, 3], ['counter', 19, 13, 3], ['stove', 19, 14, 3], ['ksink', 19, 15, 3], ['trash', 19, 16, 3],
    ['table', 15, 14, 0], ['chair', 15, 13, 0], ['chair', 16, 13, 0], ['chair', 15, 15, 2], ['chair', 16, 15, 2], ['plant', 14, 12, 0],
    ['mailbox', 12, 25, 0], ['garbage', 7, 25, 0], ['tree', 3, 4, 0], ['tree', 25, 5, 0], ['tree', 26, 21, 0],
    ['shrub', 7, 18, 0], ['shrub', 13, 18, 0], ['flowers', 8, 18, 0], ['flowers', 12, 18, 0], ['flamingo', 4, 20, 0], ['bench', 22, 15, 3],
  ],
};

function buildLot(kind) {
  for (const o of G.objects) if (o.model) R.scene.remove(o.model);
  for (const it of G.items) if (it.model) R.scene.remove(it.model);
  G.objects = []; G.items = [];
  lotClear();
  if (kind === 'starter') {
    for (const [x0, z0, x1, z1] of STARTER.walls) for (const [o, x, z] of wallSegmentsBetween([x0, z0], [x1, z1])) wallSet(o, x, z, { a: 1, b: 1, open: null });
    for (const [o, x, z, st] of STARTER.doors) wallGet(o, x, z).open = { type: 'door', style: st };
    for (const [o, x, z, st] of STARTER.windows) wallGet(o, x, z).open = { type: 'window', style: st };
    computeRooms();
    const roomOf = (x, z) => LOT.room[tidx(x, z)];
    const plan = {};
    for (const [[x, z], f, p] of STARTER.rooms) plan[roomOf(x, z)] = [f, p];
    for (let z = 0; z < LOT_D; z++) for (let x = 0; x < LOT_W; x++) { const r = roomOf(x, z); if (r && plan[r]) LOT.floor[tidx(x, z)] = plan[r][0]; }
    for (const [[x0, z0, x1, z1], f] of STARTER.extraFloors) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) LOT.floor[tidx(x, z)] = f;
    for (const [x0, z0, x1, z1] of STARTER.paths) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) LOT.floor[tidx(x, z)] = 13;
    for (const [k, w] of LOT.walls) {
      const [o, xs, zs] = k.split(':'); const x = +xs, z = +zs;
      const [ax, az] = o === 'h' ? [x, z - 1] : [x - 1, z];
      const ra = inLot(ax, az) ? roomOf(ax, az) : 0, rb = inLot(x, z) ? roomOf(x, z) : 0;
      w.a = ra && plan[ra] ? plan[ra][1] : 14; w.b = rb && plan[rb] ? plan[rb][1] : 14;
    }
    rebuildLot();
    for (const [t, x, z, r] of STARTER.objects) { const why = canPlace(CAT[t], x, z, r); if (why) console.warn('starter', t, x, z, why); placeObject(t, x, z, r, { boughtDay: 0 }); }
  } else {
    rebuildLot();
    placeObject('mailbox', 12, 25, 0, { boughtDay: 0 }); placeObject('garbage', 7, 25, 0, { boughtDay: 0 });
    placeObject('tree', 3, 4, 0, { boughtDay: 0 }); placeObject('tree', 26, 21, 0, { boughtDay: 0 });
  }
  rebuildOcc(); rebuildLot();
}
function lotValue() {
  let v = 0;
  for (const o of G.objects) if (!o.def.fixed) v += o.price;
  for (const [, w] of LOT.walls) { v += WALL_PRICE + (PAPER[w.a] ? PAPER[w.a].price : 0) + (PAPER[w.b] ? PAPER[w.b].price : 0); if (w.open) v += (w.open.type === 'door' ? DOOR[w.open.style] : WINDOW[w.open.style]).price; }
  for (let i = 0; i < LOT.floor.length; i++) if (LOT.floor[i]) v += FLOOR[LOT.floor[i]].price;
  return v;
}
const STARTER_PRICE_FACTOR = 0.82; // a second-hand house with second-hand furniture
const START_FUNDS = 20000;

// ---------- preset families ----------
const PRESETS = [
  { name: 'Alder', blurb: 'Two parents and a curious kid, fresh to the lane.', members: [
    { first: 'Maya', age: 'adult', body: 'f', pronoun: 'she', pers: { neat: 6, outgoing: 6, active: 4, playful: 4, nice: 5 }, look: { skin: SKINS[2], hair: 'pony', hairColor: HAIR_COLORS[1], top: 0x2a8a7a, bottom: 0x2a2e38, outfit: 'pants', shoes: 0x6a4a30 }, interests: ['food', 'travel', 'nature'], canCarry: true },
    { first: 'Ben', age: 'adult', body: 'm', pronoun: 'he', rel: 'spouse', pers: { neat: 3, outgoing: 5, active: 6, playful: 7, nice: 4 }, look: { skin: SKINS[4], hair: 'short', hairColor: HAIR_COLORS[0], top: 0xe8883a, bottom: 0x3a7ac8, outfit: 'pants', shoes: 0x2a2a2e }, interests: ['sports', 'tech', 'movies'], canCarry: false },
    { first: 'Juniper', age: 'child', body: 'x', pronoun: 'she', rel: 'child', pers: { neat: 2, outgoing: 7, active: 7, playful: 8, nice: 1 }, look: { skin: SKINS[3], hair: 'pigtails', hairColor: HAIR_COLORS[1], top: 0xe8c840, bottom: 0x8a4ac8, outfit: 'skirt', shoes: 0xa83a3a }, interests: ['animals', 'spooky', 'art'] },
  ] },
  { name: 'Okafor', blurb: 'Newlyweds with big plans and a small budget.', members: [
    { first: 'Kofi', age: 'adult', body: 'm', pronoun: 'he', pers: { neat: 5, outgoing: 8, active: 5, playful: 3, nice: 4 }, look: { skin: SKINS[6], hair: 'afro', hairColor: HAIR_COLORS[0], top: 0xe8e4dc, bottom: 0x2a3a7a, outfit: 'pants', shoes: 0x2a2a2e }, interests: ['money', 'politics', 'music'], canCarry: false },
    { first: 'Amara', age: 'adult', body: 'f', pronoun: 'she', rel: 'spouse', pers: { neat: 4, outgoing: 4, active: 5, playful: 6, nice: 6 }, look: { skin: SKINS[5], hair: 'bun', hairColor: HAIR_COLORS[0], top: 0xc83a3a, bottom: 0xc83a3a, outfit: 'dress', shoes: 0xe8e4dc }, interests: ['fashion', 'art', 'science'], canCarry: true },
  ] },
  { name: 'Quill', blurb: 'One artist, one dream, one very quiet house.', members: [
    { first: 'Rowan', age: 'adult', body: 'x', pronoun: 'they', pers: { neat: 3, outgoing: 3, active: 3, playful: 9, nice: 7 }, look: { skin: SKINS[0], hair: 'side', hairColor: HAIR_COLORS[6], top: 0x6a7a5a, bottom: 0xa8a08a, outfit: 'shorts', shoes: 0xe8e4dc }, interests: ['art', 'music', 'spooky'], canCarry: false },
  ] },
  { name: 'Moreau', blurb: 'A widowed grandmother taking in her teenage grandson.', members: [
    { first: 'Ines', age: 'elder', body: 'f', pronoun: 'she', pers: { neat: 9, outgoing: 4, active: 2, playful: 3, nice: 7 }, look: { skin: SKINS[1], hair: 'bob', hairColor: 0xe8e4dc, top: 0x8a4ac8, bottom: 0x5a5a62, outfit: 'skirt', shoes: 0x2a2a2e }, interests: ['food', 'weather', 'nature'], canCarry: false },
    { first: 'Luca', age: 'teen', body: 'm', pronoun: 'he', rel: 'grandchild', pers: { neat: 1, outgoing: 6, active: 8, playful: 7, nice: 3 }, look: { skin: SKINS[1], hair: 'mohawk', hairColor: HAIR_COLORS[0], top: 0x2a2e38, bottom: 0x5a5a62, outfit: 'pants', shoes: 0xa83a3a }, interests: ['music', 'sports', 'tech'] },
  ] },
];
// Create the household sims from member specs (CAS or preset) and link their relationships
function createHousehold(family, members) {
  G.family = family;
  const sims = members.map((m, i) => {
    const s = makeSim({ first: m.first, last: family, age: m.age, body: m.body || m.look.body, pronoun: m.pronoun, pers: Object.assign({}, m.pers), look: Object.assign({ body: m.body || m.look.body }, m.look), interests: m.interests.slice(), household: true, canCarry: m.canCarry, voice: m.voice });
    s.ageDays = m.age === 'adult' ? rint(0, 4) : m.age === 'elder' ? rint(0, 2) : 0;
    for (const n of NEEDS) s.needs[n.id] = rrange(70, 92);
    s.rel0 = m.rel;
    return s;
  });
  const head = sims[0];
  for (let i = 1; i < sims.length; i++) {
    const s = sims[i];
    switch (s.rel0) {
      case 'spouse': setPartners(head, s, 'spouse'); break;
      case 'partner': setPartners(head, s, 'partner'); break;
      case 'child': setFamily(head, s, 'Child', 'Parent'); break;
      case 'parent': setFamily(head, s, 'Parent', 'Child'); break;
      case 'sibling': setFamily(head, s, 'Sibling', 'Sibling'); break;
      case 'grandchild': setFamily(head, s, 'Grandchild', 'Grandparent'); break;
      default: rel(head, s).f = rel(s, head).f = 40; rel(head, s).met = rel(s, head).met = true;
    }
  }
  // children of the head are also children of the head's partner, and siblings of each other
  const partner = sims.find((s) => s.rel0 === 'spouse' || s.rel0 === 'partner');
  const kids = sims.filter((s) => s.rel0 === 'child');
  for (const k of kids) { if (partner) setFamily(partner, k, 'Child', 'Parent'); for (const k2 of kids) if (k2 !== k) setFamily(k, k2, 'Sibling', 'Sibling'); }
  for (const a of sims) for (const b of sims) if (a !== b && !relGet(a, b).met) { rel(a, b).met = true; rel(a, b).f = 30; }
  for (const s of sims) delete s.rel0;
  return sims;
}
