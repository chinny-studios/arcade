// Tidebound: Route 2 "Lighthouse Road". Runs north from the cave mouth at the south end to Lumen City. A straight
// tall-grass road (x 16-18) with the sea to the east; a chop cove at the south end with Leftovers and a Great Orb.
// Rows are run-length encoded: "T1.9S1" is one tree, nine grass, one sign.

Maps.def({
  id: 'route2', name: 'ROUTE 2', music: 'route', indoor: false, border: 'tree',
  rows: [
    'T16=3T7',
    'T1.9f2.3S1=3.4f2T1',
    'T1.3T2.5,5=3,3.3T1',
    'T1,10.5=3,6T1',
    'T1.5,7.3=3.4,2T1',
    'T2.4T5.5=3.5T2',
    'T1.4T2.9=3.6T1',
    'T1.2T3.3,6.1=3.3,3T1',
    'T1.4T3.4,3.1=3.2w4T1',
    'T1.6T1.5,3=3.2w4T1',
    'T1.5T2.4,4=3.2w4T1',
    'T1.4T3.5,3=3.1w5T1',
    'T1.2,13=3.2w4T1',
    'T1.9,6=3.2w4T1',
    'T1.3T4.3,5=3.2w4T1',
    'T1.10,5=3.2w4T1',
    'T1.5T2.8=3.3w3T1',
    'T1.9,6=3.3w3T1',
    'T1.7T4.4=3.3w3T1',
    'T1.9,6=3.3w3T1',
    'T1.2,13=3.3w3T1',
    'T1.9f1.5=3.3w3T1',
    'T1.9,6=3.3w3T1',
    'T1.3,12=3.3w3T1',
    'T1.10,5=3.3w3T1',
    'T1.6T2.7=3.3w3T1',
    'T2.2T2.10=3.3w3T1',
    'T1.7,8=3.3w3T1',
    'T1.6,8.1=3T7',
    'T1.5,10=3T7',
    'T1.5,10=3T7',
    'T1.7f1.7=3C1s4T2',
    'T1.7,8=3C1s4T2',
    'T1.9S1.5=3C1s4T2',
    'T1.9,6=3T7',
    'T12E1T3=3T7',
    'T26',
    'T26',
    'T26',
    'T26',
  ].map((s) => s.replace(/(.)(\d*)/g, (_, c, n) => c.repeat(n ? +n : 1))),
  legend: {
    T: 'tree', '.': 'grass', ',': 'tallgrass', '=': 'path', f: 'flowers', S: 'sign', w: 'water', C: 'chop_tree',
    s: 'sand', E: 'cave_entrance',
  },
  warps: [
    // north edge: up to Lumen City (its south edge)
    { x: 16, y: 0, to: 'lumen', tx: 16, ty: 28, dir: 'up' },
    { x: 17, y: 0, to: 'lumen', tx: 17, ty: 28, dir: 'up' },
    { x: 18, y: 0, to: 'lumen', tx: 18, ty: 28, dir: 'up' },
    // the cave mouth (south), leads down into the cave's far exit
    { x: 12, y: 35, to: 'cave', tx: 26, ty: 1, dir: 'down' },
  ],
  npcs: [
    { id: 'rt2_swimmer', x: 19, y: 13, sprite: 'swimmer', dir: 'left', move: 'still',
      trainer: {
        id: 'r2_swimmer', cls: 'SWIMMER', name: 'LENA', music: 'trainer', sight: 4,
        party: [['gullip', 9], ['jellink', 10]], money: 120,
        intro: 'LENA: I swim circles around everyone!',
        lose: 'LENA: Okay, I need a warm towel.',
        after: 'LENA: The sea is wide. Keep swimming!',
      } },
    { id: 'rt2_sailor', x: 14, y: 22, sprite: 'sailor', dir: 'right', move: 'still',
      trainer: {
        id: 'r2_sailor', cls: 'SAILOR', name: 'SALT', music: 'trainer', sight: 4,
        party: [['snipper', 10], ['gullip', 10], ['thistlet', 11]], money: 140,
        intro: 'SALT: Ahoy! Prepare to be scrubbed!',
        lose: 'SALT: Blast it, you sank my ship!',
        after: 'SALT: Watch out for the lighthouse gulls.',
      } },
    { id: 'rt2_lass', x: 21, y: 6, sprite: 'lass', dir: 'left', move: 'still',
      trainer: {
        id: 'r2_lass', cls: 'LASS', name: 'WREN', music: 'trainer', sight: 4,
        party: [['sparkit', 11], ['dunebun', 11]], money: 140,
        intro: 'WREN: Zap! Ha, did you feel that?',
        lose: 'WREN: My sparks went out!',
        after: 'WREN: Keep your TIDELINGS charged up!',
      } },
    { id: 'rt2_fisher', x: 20, y: 20, sprite: 'fisher', dir: 'left', move: 'still',
      talk: async () => {
        if (flag('gift_quickclaw')) {
          return UI.say(['The sea is good to us. Keep', 'your claws sharp, friend!']);
        }
        await UI.say(['Ah, you look like a fighter!', 'Here, take this QUICK CLAW.']);
        await UI.say(['It sometimes lets your TIDELING', 'strike first. Good luck out there!']);
        setFlag('gift_quickclaw');
        await Script.give('quickclaw');
      } },
    { id: 'rt2_boy', x: 4, y: 19, sprite: 'boy', dir: 'right', move: 'still',
      text: ['The lighthouse keeps the ships safe.', 'I want to climb to the top someday!'] },
    { id: 'rt2_oldman', x: 9, y: 30, sprite: 'oldman', dir: 'right', move: 'still',
      text: ['I fished that cove once. There were', 'treasures in there, I swear it!'] },
  ],
  signs: [
    { x: 15, y: 1, text: 'ROUTE 2 — LIGHTHOUSE ROAD. Lumen City is just north.' },
    { x: 10, y: 33, text: 'TIDEWATER CAVE is south. Mind the wet floors.' },
  ],
  items: [
    { x: 5, y: 3, item: 'potion', n: 1, id: 'r2_potion' },
    { x: 4, y: 12, item: 'superpotion', n: 1, id: 'r2_sp' },
    { x: 2, y: 24, item: 'oranberry', n: 1, id: 'r2_oran' },
    { x: 21, y: 32, item: 'leftovers', n: 1, id: 'r2_leftovers', hidden: true },
    { x: 23, y: 31, item: 'greatorb', n: 1, id: 'r2_greatorb', hidden: true },
  ],
  encounters: {
    grass: {
      rate: 0.1,
      list: [
        ['gullip', 8, 11, 25],
        ['sparkit', 8, 11, 20],
        ['dunebun', 8, 11, 20],
        ['thistlet', 8, 11, 15],
        ['snipper', 8, 11, 15],
        ['kelpup', 8, 11, 4],
        ['pelicant', 8, 11, 2],
      ],
    },
  },
  triggers: [],
});
