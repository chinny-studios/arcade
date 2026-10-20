// Tidebound: building interiors. Every room is 10x8 (or larger where noted). Walls are wall_in, the exit mat sits
// in the bottom row and sends you to the tile just outside the matching door. Stairs are on the same x as the
// stairs on the other floor, so you arrive one tile below them.

// ---------- Shellport: the player's house ----------
Maps.def({
  id: 'player_house_1f', name: "KAI'S HOUSE", music: 'town', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'WCCCCCCCUW',
    'W........W',
    'W..TT....W',
    'W........W',
    'Wp......pW',
    'W..rrr...W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', C: 'counter', U: 'stairs_up', '.': 'floor', T: 'table', p: 'plant', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'shellport', tx: 6, ty: 7, dir: 'down' },
    { x: 8, y: 1, to: 'player_house_2f', tx: 8, ty: 2, dir: 'down' },
  ],
  npcs: [
    { id: 'mom', x: 6, y: 2, sprite: 'mom', dir: 'down', move: 'still', talk: () => Story.mom() },
  ],
  signs: [],
  items: [{ x: 8, y: 4, item: 'potion', n: 1, id: 'ph1_potion' }],
  encounters: {},
  triggers: [],
});

Maps.def({
  id: 'player_house_2f', name: "KAI'S ROOM", music: 'town', indoor: true, border: 'wall_in',
  rows: [
    'WWWNWWWWNW',
    'WKKK....DW',
    'W.B......W',
    'W........W',
    'W........W',
    'W....V..pW',
    'W..rrr...W',
    'WWWWWWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', K: 'bookshelf', D: 'stairs_down', '.': 'floor', B: 'bed', V: 'tv', p: 'plant', r: 'rug' },
  warps: [
    { x: 8, y: 1, to: 'player_house_1f', tx: 8, ty: 2, dir: 'up' },
  ],
  npcs: [],
  signs: [],
  items: [{ x: 7, y: 6, item: 'potion', n: 1, id: 'ph2_potion' }],
  encounters: {},
  triggers: [],
});

// ---------- Shellport: Coral's lab ----------
Maps.def({
  id: 'lab', name: "PROF. CORAL'S LAB", music: 'lab', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWNWWWW',
    'WLLL....LW',
    'WKKK...KKW',
    'W..TT....W',
    'W........W',
    'W.rrr....W',
    'W........W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', L: 'lab_machine', K: 'bookshelf', T: 'table', '.': 'floor', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'shellport', tx: 19, ty: 7, dir: 'down' },
  ],
  npcs: [
    { id: 'coral_lab', x: 5, y: 2, sprite: 'prof', dir: 'down', move: 'still', talk: () => Story.coralLab() },
    {
      id: 'rival_lab', x: 7, y: 3, sprite: 'rival', dir: 'left', move: 'still',
      cond: () => flag('rival_here') && !flag('rival1'),
      text: 'Get ready to lose, {P}!',
    },
    {
      id: 'lab_sci', x: 8, y: 5, sprite: 'scientist', dir: 'left', move: 'still',
      text: ['Every TIDELING has a type.', 'Water beats fire, fire beats grass.', 'Grass beats water. Round we go!'],
    },
  ],
  signs: [],
  items: [{ x: 1, y: 6, item: 'antidote', n: 1, id: 'lab_antidote', hidden: true }],
  encounters: {},
  triggers: [],
});

// ---------- Shellport: two houses ----------
Maps.def({
  id: 'shellport_house_a', name: 'SALT HOUSE', music: 'town', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'WKKKK....W',
    'W........W',
    'W..TT....W',
    'W.p......W',
    'W........W',
    'W.rrr....W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', K: 'bookshelf', '.': 'floor', T: 'table', p: 'plant', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'shellport', tx: 4, ty: 13, dir: 'down' },
  ],
  npcs: [
    {
      id: 'sa_oldwoman', x: 6, y: 2, sprite: 'oldwoman', dir: 'down', move: 'still',
      text: ['Nets, nets, and more nets!', 'The cave exit has a sailor who', 'knows how to cut a tree, dear.'],
    },
  ],
  signs: [],
  items: [{ x: 8, y: 5, item: 'potion', n: 1, id: 'sa_potion', hidden: true }],
  encounters: {},
  triggers: [],
});

Maps.def({
  id: 'shellport_house_b', name: 'DUNE HOUSE', music: 'town', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'WKKKKKKKKW',
    'W........W',
    'W..V.....W',
    'W.B......W',
    'W........W',
    'W.rrr....W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', K: 'bookshelf', '.': 'floor', V: 'tv', B: 'bed', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'shellport', tx: 24, ty: 13, dir: 'down' },
  ],
  npcs: [
    {
      id: 'sb_boy', x: 7, y: 2, sprite: 'boy', dir: 'down', move: 'still',
      text: ['I want to be a SEA CAPTAIN!', 'Grandpa says the cave is spooky.'],
    },
  ],
  signs: [],
  items: [],
  encounters: {},
  triggers: [],
});

// ---------- Route 1: rest hut ----------
Maps.def({
  id: 'route1_rest', name: 'REST HUT', music: 'route', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'WHH......W',
    'W........W',
    'W..TT....W',
    'W........W',
    'W.....rr.W',
    'W........W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', H: 'heal_machine', '.': 'floor', T: 'table', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'route1', tx: 19, ty: 20, dir: 'down' },
  ],
  npcs: [
    {
      id: 'rest_sailor', x: 6, y: 2, sprite: 'oldman', dir: 'down', move: 'still',
      talk: async () => {
        await UI.say(['Ahoy, traveler! Weary feet?', 'Sit a spell. The tea is on me.']);
        await Script.heal();
        await UI.say(['There! Your TIDELINGS are fresh', 'as sea spray. Off you go!']);
      },
    },
  ],
  signs: [{ x: 1, y: 1, text: 'A HEALING MACHINE. Free for weary travelers.', run: () => Story.healMachine() }],
  items: [],
  encounters: {},
  triggers: [],
});

// ---------- Lumen: Care Center ----------
Maps.def({
  id: 'lumen_center', name: 'CARE CENTER', music: 'center', indoor: true, border: 'wall_in',
  rows: [
    'WWWWWWWWWWWW',
    'W..........W',
    'WHH.......PW',
    'W..........W',
    'WCCCCCCCC..W',
    'W..........W',
    'W..........W',
    'W..........W',
    'W..........W',
    'WWWWWMWWWWWW',
  ],
  legend: { W: 'wall_in', H: 'heal_machine', P: 'pc', C: 'counter', '.': 'floor', M: 'mat' },
  warps: [
    { x: 5, y: 9, to: 'lumen', tx: 6, ty: 15, dir: 'down' },
  ],
  npcs: [
    { id: 'nurse', x: 6, y: 3, sprite: 'nurse', dir: 'down', move: 'still', talk: () => Story.nurse() },
  ],
  signs: [
    { x: 10, y: 2, text: "SOMEONE'S PC.", run: () => Script.pc() },
    { x: 1, y: 2, text: 'A HEALING MACHINE.', run: () => Story.healMachine() },
  ],
  items: [],
  encounters: {},
  triggers: [],
});

// ---------- Lumen: Mart ----------
Maps.def({
  id: 'lumen_mart', name: 'MART', music: 'city', indoor: true, border: 'wall_in',
  rows: [
    'WWWWWWWWWWWW',
    'WhhhhhhhhhhW',
    'W..........W',
    'W..........W',
    'WCCCCCCCC..W',
    'W..........W',
    'W..........W',
    'W..........W',
    'W.........pW',
    'WWWWWMWWWWWW',
  ],
  legend: { W: 'wall_in', h: 'shelf', C: 'counter', '.': 'floor', p: 'plant', M: 'mat' },
  warps: [
    { x: 5, y: 9, to: 'lumen', tx: 27, ty: 15, dir: 'down' },
  ],
  npcs: [
    {
      id: 'clerk', x: 6, y: 3, sprite: 'clerk', dir: 'down', move: 'still',
      talk: async () => {
        const stock = ['orb', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'repel', 'escaperope'];
        if (flag('badge1')) stock.push('greatorb');
        await UI.say(['Welcome to the MART! Anything', 'for your TIDELING journey?']);
        await Script.mart(stock);
      },
    },
  ],
  signs: [],
  items: [],
  encounters: {},
  triggers: [],
});

// ---------- Lumen: houses ----------
Maps.def({
  id: 'lumen_house_a', name: 'SAILOR HOUSE', music: 'city', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'WKKKKKKKKW',
    'W........W',
    'W..TT....W',
    'W.B......W',
    'W........W',
    'W.rrr....W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', K: 'bookshelf', '.': 'floor', T: 'table', B: 'bed', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'lumen', tx: 6, ty: 23, dir: 'down' },
  ],
  npcs: [
    {
      id: 'la_girl', x: 6, y: 2, sprite: 'girl', dir: 'down', move: 'still',
      text: ['Grandpa sails out past the lighthouse', 'every morning. Watch the tide!'],
    },
  ],
  signs: [],
  items: [{ x: 1, y: 6, item: 'potion', n: 1, id: 'la_potion', hidden: true }],
  encounters: {},
  triggers: [],
});

Maps.def({
  id: 'lumen_house_b', name: 'TIDE HOUSE', music: 'city', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'W........W',
    'W.pp.....W',
    'W........W',
    'W..TT....W',
    'W........W',
    'W.rrr....W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', '.': 'floor', p: 'plant', T: 'table', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'lumen', tx: 13, ty: 23, dir: 'down' },
  ],
  npcs: [
    {
      id: 'lb_kid', x: 7, y: 2, sprite: 'youngster', dir: 'down', move: 'still',
      text: ['The gym leader is MARINA!', 'She can tame the wind itself, I bet.'],
    },
  ],
  signs: [],
  items: [{ x: 8, y: 6, item: 'orb', n: 2, id: 'lb_orbs', hidden: true }],
  encounters: {},
  triggers: [],
});

Maps.def({
  id: 'lumen_house_c', name: 'GRANNY HOUSE', music: 'city', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'WKKKK....W',
    'W........W',
    'W..TT....W',
    'W.p......W',
    'W........W',
    'W.rrr....W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', K: 'bookshelf', '.': 'floor', T: 'table', p: 'plant', r: 'rug', M: 'mat' },
  warps: [
    { x: 4, y: 7, to: 'lumen', tx: 29, ty: 23, dir: 'down' },
  ],
  npcs: [
    {
      id: 'lc_granny', x: 6, y: 2, sprite: 'oldwoman', dir: 'down', move: 'still',
      talk: async (npc) => {
        if (flag('gift_expshare')) {
          return UI.say(['My husband sailed with that', 'charm on his neck. Keep it safe.']);
        }
        await UI.say(['Oh, a young trainer! My husband', 'carried this when he sailed.']);
        await UI.say(['It shares the battle XP with', 'your TIDELINGS. Take it, dear.']);
        setFlag('gift_expshare');
        await Script.give('expshare');
      },
    },
  ],
  signs: [],
  items: [],
  encounters: {},
  triggers: [],
});

// ---------- Lumen: gym ----------
Maps.def({
  id: 'lumen_gym', name: 'LUMEN CITY GYM', music: 'gym', indoor: true, border: 'wall_in',
  rows: [
    'WWWWWWWWWWWWWW',
    'Wy..........yW',
    'W............W',
    'W............W',
    'W..oooooo....W',
    'W..oooooo....W',
    'W............W',
    'W............W',
    'W............W',
    'W............W',
    'W...........gW',
    'WWWWWWMWWWWWWW',
  ],
  legend: { W: 'wall_in', y: 'gym_statue', o: 'gym_pool', '.': 'gym_floor', g: 'gym_floor', M: 'mat' },
  warps: [
    { x: 6, y: 11, to: 'lumen', tx: 20, ty: 13, dir: 'down' },
  ],
  npcs: [
    {
      id: 'marina', x: 6, y: 2, sprite: 'leader', dir: 'down', move: 'still',
      talk: () => Story.gymLeader(),
    },
    {
      id: 'gym_swimmer', x: 2, y: 7, sprite: 'swimmer', dir: 'right', move: 'still',
      trainer: {
        id: 'gym_swim1', cls: 'SWIMMER', name: 'NILO', music: 'trainer', sight: 4,
        party: [['gullip', 11], ['jellink', 12]], money: 80,
        intro: "NILO: You can't pass me! I'm a champion swimmer!",
        lose: 'NILO: Gah, my waves are all wet!',
        after: 'NILO: The leader will sweep you away.',
      },
    },
    {
      id: 'gym_sailor', x: 11, y: 7, sprite: 'sailor', dir: 'left', move: 'still',
      trainer: {
        id: 'gym_sail1', cls: 'SAILOR', name: 'BOSUN HAL', music: 'trainer', sight: 4,
        party: [['gullip', 11], ['snipper', 12]], money: 80,
        intro: 'HAL: Ahoy! Permission to sink you!',
        lose: 'HAL: Shiver me timbers!',
        after: 'HAL: Go on, the leader is waiting.',
      },
    },
    {
      id: 'gym_guide', x: 11, y: 10, sprite: 'gymguide', dir: 'up', move: 'still',
      text: [
        "MARINA's TIDELINGS use WATER and FLYING moves.",
        'ELECTRIC and ROCK types are your friends!',
      ],
    },
  ],
  signs: [],
  items: [{ x: 2, y: 2, item: 'superpotion', n: 1, id: 'gym_sp', hidden: true }],
  encounters: {},
  triggers: [],
});

// ---------- Lighthouse ----------
Maps.def({
  id: 'lighthouse_1f', name: 'LIGHTHOUSE', music: 'lighthouse', indoor: true, border: 'wall_in',
  rows: [
    'WWNWWWWNWW',
    'WKKKKKK.UW',
    'W........W',
    'W..TT....W',
    'W........W',
    'Wp......pW',
    'W..rrr...W',
    'WWWWMWWWWW',
  ],
  legend: { W: 'wall_in', N: 'window_in', K: 'bookshelf', U: 'stairs_up', '.': 'floor', T: 'table', p: 'plant', r: 'rug', M: 'mat' },
  warps: [
    { x: 8, y: 1, to: 'lighthouse_top', tx: 8, ty: 2, dir: 'down' },
    { x: 4, y: 7, to: 'lumen', tx: 32, ty: 7, dir: 'down' },
  ],
  npcs: [
    {
      id: 'lh_keeper', x: 6, y: 2, sprite: 'scientist', dir: 'down', move: 'still',
      text: [
        'The lamp keeps the ships safe.',
        'Up top sleeps a great sea serpent.',
        'Her light is LUMARINE. Be gentle!',
      ],
    },
  ],
  signs: [],
  items: [],
  encounters: {},
  triggers: [],
});

Maps.def({
  id: 'lighthouse_top', name: 'LIGHT ROOM', music: 'lighthouse', indoor: true, border: 'wall_in',
  rows: [
    'WWWWWWWWWW',
    'W....L..DW',
    'W........W',
    'W........W',
    'W........W',
    'W........W',
    'W........W',
    'WWWWWWWWWW',
  ],
  legend: { W: 'wall_in', L: 'lamp', D: 'stairs_down', '.': 'floor' },
  warps: [
    { x: 8, y: 1, to: 'lighthouse_1f', tx: 8, ty: 2, dir: 'up' },
  ],
  npcs: [
    {
      id: 'lumarine', x: 5, y: 2, sprite: 'mon:lumarine', dir: 'down', move: 'still',
      cond: () => flag('rival2') && !flag('lumarine'),
      talk: () => Story.lumarine(),
    },
  ],
  signs: [],
  items: [],
  encounters: {},
  triggers: [],
});
