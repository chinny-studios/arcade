// Tidebound: Shellport, the fishing village where you start. Houses and Coral's lab sit on the north side of the
// square; the north path leads to Route 1, the dock and beach are to the south. A chop tree guards a little beach with
// a Rare Candy to the east (needs HM01 CHOP, which you get later at the cave exit).

Maps.def({
  id: 'shellport', name: 'SHELLPORT', music: 'town', indoor: false, border: 'water',
  rows: [
    'TTTTTTTTTTTT===TTTTTTTTTTTTT',
    'T..fff......===......ff....T',
    'T...........===....b....ff.T',
    'T...12223...===..LLLLL.....T',
    'T...12223...===..LLLLL.....T',
    'T...oOoOo...===..NNNNN.....T',
    'T...oodoo...===..NNJNN.....T',
    'T...........===....f.......T',
    'T..........S===............T',
    'T.45556.....===.......12223T',
    'T.45556.....===.......12223T',
    'T.oOoOo.....===.......oOoOoT',
    'T.oodoo.....===.......oodooT',
    'T...........===...f........T',
    'T..b........===.........ff.T',
    'T.........ff===......CsssssT',
    'T.........ff===......TsssssT',
    'T.........ff===......TsssssT',
    'Tsssssssssss' + 'DDD' + 'ssssss' + 'wwwwwww',
    'wwwwwwwwwwwwDDDwwwwwwwwwwwww',
    'wwwwwwwwwwwpDDDpwwwwwwwwwwww',
    'wwwwwwwwwwwwDDDwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwww',
  ],
  legend: {
    T: 'tree', '.': 'grass', '=': 'path', f: 'flowers', b: 'bush', s: 'sand', w: 'water', D: 'dock', p: 'pier_post',
    S: 'sign', C: 'chop_tree',
    1: 'roof_l', 2: 'roof_m', 3: 'roof_r', 4: 'roof_red_l', 5: 'roof_red_m', 6: 'roof_red_r',
    o: 'wall', O: 'wall_window', d: 'door',
    L: 'lab_roof', N: 'lab_wall', J: 'lab_door',
  },
  warps: [
    // north edge: walking off these tiles goes up to Route 1 (the south edge of Route 1)
    { x: 12, y: 0, to: 'route1', tx: 12, ty: 42, dir: 'up' },
    { x: 13, y: 0, to: 'route1', tx: 13, ty: 42, dir: 'up' },
    { x: 14, y: 0, to: 'route1', tx: 14, ty: 42, dir: 'up' },
    // doors
    { x: 6, y: 6, to: 'player_house_1f', tx: 4, ty: 6, dir: 'up' },
    { x: 19, y: 6, to: 'lab', tx: 4, ty: 6, dir: 'up' },
    { x: 4, y: 12, to: 'shellport_house_a', tx: 4, ty: 6, dir: 'up' },
    { x: 24, y: 12, to: 'shellport_house_b', tx: 4, ty: 6, dir: 'up' },
  ],
  npcs: [
    { id: 'sp_girl', x: 17, y: 10, sprite: 'girl', dir: 'left', move: 'still',
      text: ['The fishermen say the sea is', 'calm today. Lucky us!'] },
    { id: 'sp_boy', x: 9, y: 13, sprite: 'boy', dir: 'right', move: 'still',
      text: ['Wild TIDELINGS live in the tall grass', 'north of town. Be careful!'] },
    { id: 'sp_lass', x: 10, y: 7, sprite: 'lass', dir: 'right', move: 'still',
      text: ['The dock is a great place to watch', 'the TIDELINGS swim by.'] },
    { id: 'sp_oldman', x: 9, y: 15, sprite: 'oldman', dir: 'down', move: 'still',
      text: ['Back in my day we fished with', 'nothing but a stick and a song.'] },
    { id: 'sp_sailor', x: 23, y: 16, sprite: 'sailor', dir: 'left', move: 'still',
      text: ['A chop tree? Ha! There is a sailor', 'at the cave exit with HM CHOP.'] },
    { id: 'sp_fisher', x: 14, y: 21, sprite: 'fisher', dir: 'up', move: 'still',
      text: ['The sea is big, and the catches', 'are bigger. Just wait and see!'] },
  ],
  signs: [
    { x: 11, y: 8, text: 'SHELLPORT — A salty breeze carries hope.' },
    { x: 19, y: 15, text: 'A chop tree blocks the little beach. Someone with CHOP could clear it.' },
  ],
  items: [
    { x: 1, y: 12, item: 'potion', n: 1, id: 'sh_potion' },
    { x: 25, y: 17, item: 'rarecandy', n: 1, id: 'sh_candy' },
  ],
  encounters: {},
  triggers: [
    {
      x: 12, y: 0, w: 3, h: 1,
      cond: () => flag('intro_done') && !flag('got_starter'),
      run: () => Story.northBlock(),
    },
  ],
});
