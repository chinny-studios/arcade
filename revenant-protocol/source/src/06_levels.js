// Revenant Protocol — the four missions. Maps are ASCII (see 05_level.js for the legend fields).
// Things: P start, T Legionnaire, O Overseer, C Shade commando, B brute, H Skrell hunter, S seeker drone, I interrogator orb,
// U ceiling turret, R Revenant Mk I, M Revenant Mk II, Z Vossk, G sump-maw, E energy, W power, K shield, V med-gel,
// A battery, D thermals, N mines, Q mortar shells, L plasma, X missiles. Per-level `things` add or override.
// `d` on a thing: lowest difficulty it appears on (0 recruit, 1 mercenary, 2 revenant).

const MAP_KESH = `
############################################################
############################################################
#############################################gggggcEcccccc##
####################################....T....gggggccccOc$c##
##########################%#########.........ggTggccccccc^##
##########################%#########..#######gggggcccccccc##
##########################%#########..#######ggggggg22gggg##
##########################%#########rr#######ggggggggggggg##
##############,,,,,,,,,,,,%####Emmmmmmmmmmmm#ggggg&ggggSgg##
##############,E,,,,,,O,pp%####m&mmmmmUmmm&m#giigg&ggggggg##
##############,,,pp,,,,,pp%####mmTmmmmmmmmmm#giiggggFgiigg##
##############,,,pp,,,,,,,%####mmmsssssssTmm#gggTgggggiigg##
##############,,T,,,,,,,,,%####mmmskkkkksmmm#gVggggggggggE##
##############,,,,,,,,,,,,%####mmmskkkYksmmm################
##############,,,,,,T,,,,,-aaE.mmmskkJkksmmm################
##############,,,,,,,,,,,,-aaT.mmmskkkkksmmm################
##############,,,,,Y,,,,,,%####mmmskkkkksmmm#%%%%%%%%%%%%%%#
##############,,,,,,,,,,,,%####mmmskkkkksmmm#hEhhhhhhhhhhuu#
#####,,,,,,,,,,,,,,,,pp,,,%####mmmsssssssFmm#hhhhhhhhhhhhuu#
#####,,,T,,,F,,,,,,,,,,,,,%####mmTmmmmmmmmmm#hhhxxy+hhhhhuu#
#####,,,,,,,,,,,,,,,,,,T,,%####m&mmmmmmmmm&m#hhhxxhhhhhhhuu#
#####,,,,,,T,,,,,,,,,,,,V,%####mmmmmmmmmmmmK#hhhhhhhhhhhhuu#
#####,,,,,,,,Y,,,,,,,,,,,,%#########--#######hhhhhhThhhh1uu#
#####,,,S,,,,,,,,,,,,,,,,,%#########..#######hhhhhhhhhhh1uu#
#####,,,;,,,,#############%#########T.#######hhThhhhhhhhhuu#
#qKq#,,,;,,,,#############%#########nn#######hhhhhhhhhhFhuK#
#qDqz,,,;,,###############%#########.....U..-hhhhhhhhhhhhuu#
#qqA#,,,,,,#########################........-hhhhhhhhhhhhuV#
#####,,,,,,#########################..#######hhhhhhhxxhhhuu#
#####,,,,,,#########################..#######hhhhhhhxxhhhuu#
#####,,,,,,#########################..#######hhhhhOhhhhhhuu#
#####,,,,,,#########################bb#######hhhhhhhhhhhhhh#
#####,,,,,,#####################vvvvFvvvvv###hhhhhhhhhhhhhh#
#####,,,,,,#####################vTvvvvvvvv###hhxxhhhhhThhhh#
##,,,,,,,,,,;;:::###############vvvvvvvvTv###hhxxhhhhhhhhhh#
##,,,,,,,,,,;;;;;###############vvvvvvvvvv###hhxxhhhhhhhhhh#
##,,,,,,,,,,;;;;;##################ffff######hhhhhhhShhhhhh#
##,,,,,,,,,,,,,,,#################wwwwww#####hhhhhhhhhhhhhh#
##,,,,,,,,,,,,,,,#################ww*www#####hhhhThhhhhhhhh#
##,,,,,,,,,,,,,,,#################VwwwwA#####hhhhhhhhhhhhhh#
##,,,,,,,E,,,,,,,############################hhhhhhhheeeeeh#
##,,,P,,,,,,,,,,,############################hhhhhhhheeeeeh#
##,,,,,,,,,,,,,,,############################hYhhhhhheeeeeh#
##,,,,,,,,,,,,,,,############################hhhhhVhheeeeeh#
#############################################hhhhhhhhhhhhhh#
############################################################
`;

const LEVELS = {};
LEVELS.kesh = {
  map: MAP_KESH,
  sky: { top: 0x5f8fcf, hor: 0xe6c49a, haze: 0xc89a6a, planet: { dir: [0.45, 0.32, -0.83], size: 0.11, col: 0xd8dce8 } },
  fog: [0xd6b48a, 70, 260], cue: 0.3,
  title: [9, 38, 3.2],
  legend: {
    ',': { f: 0, c: 18, sky: true, fl: 'sand', w: 'cliff', l: 1 },
    ';': { x: ',', f: 1, s: 'cliff' },
    ':': { x: ',', f: 2, s: 'cliff' },
    'p': { x: ',', f: 1.5, fl: 'cratetop', s: 'crate' },
    'z': { f: 0, c: 3, door: true, secret: true, fl: 'sand', cl: 'rock', w: 'cliff', l: 0.6 },
    'q': { f: 0, c: 3, fl: 'sand', cl: 'rock', w: 'rock', l: 0.45, secret: true },
    '%': { solid: true, w: 'trim' },
    '&': { solid: true, w: 'tech' },
    '-': { f: 0, c: 3.5, door: true, w: 'panel2', cl: 'ceil2', l: 0.8 },
    'r': { x: '-', door: 'r' },
    'b': { x: '-', door: 'b' },
    '.': { f: 0, c: 4, fl: 'floor', cl: 'ceil', w: 'panel', l: 0.75 },
    'a': { x: '.', check: true },
    'n': { x: '.', check: true },
    'm': { f: 0, c: 7, fl: 'plate', cl: 'ceil', w: 'panel2', l: 0.85 },
    's': { x: 'm', f: 0.5, s: 'hazard' },
    'k': { x: 'm', f: 1, fl: 'grate', s: 'panel' },
    'g': { f: 0, c: 8, fl: 'floor', cl: 'ceil2', w: 'panel', l: 0.7 },
    'c': { x: 'g', f: 4, fl: 'grate', w: 'tech', s: 'trim', l: 0.85 },
    '2': { x: 'g', lift: [0, 4] },
    'i': { x: 'g', f: 1.5, fl: 'cratetop', s: 'crate2' },
    'v': { f: 0, c: 5, fl: 'grate', cl: 'ceil2', w: 'panel2', l: 0.5 },
    'f': { x: 'v', field: true, id: 'vaultfield' },
    'w': { x: 'v', f: 0.5, fl: 'plate', w: 'screen', s: 'trim', l: 0.9 },
    'h': { f: 0, c: 14, sky: true, fl: 'plate', w: 'panel2', l: 0.95 },
    'u': { x: 'h', f: 4, s: 'trim' },
    '1': { x: 'h', lift: [0, 4] },
    'x': { x: 'h', f: 1, fl: 'cratetop', s: 'crate' },
    'y': { x: 'h', f: 2, fl: 'cratetop', s: 'crate', secret: true },
    'e': { x: 'h', f: 0.3, fl: 'lifttop', s: 'hazard', tag: 'exit', l: 1 },
  },
  things: {
    F: { t: 'trooper', d: 1 }, Y: { t: 'trooper', d: 2 }, J: { t: 'officer', drop: 'key_r' },
    $: 'key_b', '*': 'plans', '+': 'life',
    '^': { t: 'switch', target: 'vaultfield', dir: 'e', msg: 'VAULT FORCE FIELD DISABLED' },
  },
  lights: [[37, 1.5, 38, 6, 0x60c0ff, 0.6, 3]],
  events: {
    start: (A) => A.msg('GET INSIDE THE GARRISON'),
    'goal:plans': (A) => {
      A.sfx('alarm'); A.msg('ALARM - THE GARRISON IS ON ALERT'); A.msg('GET TO THE SHUTTLE IN THE HANGAR');
      A.later(1.5, () => { A.spawn('trooper', 36, 26); A.spawn('trooper', 37, 28); A.spawn('officer', 40, 27); });
      A.later(4, () => { A.spawn('trooper', 47, 28); A.spawn('trooper', 50, 41); A.spawn('trooper', 55, 42); A.spawn('seeker', 52, 30); });
    },
  },
};

const MAP_TALMOR = `
############################################################
#######################################################~~###
##pppppppppppp#########################################~~###
##ppyypppppppp#####hhhhOhhhhhh######eeeeeeeeeeeeeeeeeee~~e##
##pppppppppppp#####hhmmhhhmmhh######eaaaaaaaaaaaaaaaaae))e##
##pppppppppppp#####hTmmhhhmmhh######eaaaaaaaaaaaaaaaaae))e##
##ppPppppppppp12345hhhhhhhhhhhsKs###eaaaaaaaaaaaaaaaaaeeee##
##pppppppppppp12345hhhhhhhhhhzsAs###eaaaiiiiaaaaaaaaaaaaae##
##pEppppppyypp#####hhhhhhhhhhhss&###eaaaiWiiaaaaaaaaaaaaae##
##pppppppppppK#####hEhhhYhhhTh######eaaaiiiiaaaaaaaaaaaaae##
###################hhhhhhhhhhh######eaaaaaaaaGaaaaaaaaaaae##
######################wwwwww########eaaaaaaaaaaaiiiiaaaaae##
###rArrrrrr%##########woooow########eaaaaaaaaaaaiiiiGaaaae##
###$rrrrrrrr##########woooow########eaaaaaaaaaaaiiiiaaaaae##
###rrrrrrrBr##########woooow########eaaaaaaaaaaaaaaaaaaaae##
###rrrrrrrrr##########Eoooow########eaaaaaaaaaaaaaaaaaaaae##
###rrrrrrrrr##########woooow########eaaaaaaaaaaaaaaaaaaaae##
########dd############woooow########eaaaaaaaaaaaaaaaaaaaae##
########dA############woGoow########eeeeeeeeeeeeeeeeeeeeee##
########dd############woooow############################vv##
########ddddddddddddddwoooow############################cc##
########dddddddddBddddwoooow############################cV##
##############((######woooow###########################Tcc##
#############tttt#####woooow############################cc##
#############tDtt#####wooooE############################cc##
#############tt+t#####woooow############################cc##
######################woooow#########################nn#cc##
######################wooGow#################nn##nn##*n#Fc##
######################woooow#################n!##nn##nn#cc##
######################woooow#################nn##nn##nn#cc##
######################woooow#################--##bb##qq#cc##
####################jjjoooojjjjgggggggYgggg#cccccccTcccccc##
####################jjjoooojjjjgggllllllgIg-cTcccYccUccccc##
####################jTjoooojjjjggggBggggggg#Eccccccccccccc##
####################jjjjSjjjjFj###############--######xx####
####################VjjjjjjjjjE#############kkkkkkk###uu####
############################################Vkkkkkk#uuuuuu##
############################################kkkkTkk#uuuuu^##
############################################kkkkkkk#uuuuCu##
############################################FkkkkkJ#uuuuuE##
############################################kkkkkkk#uNuuuu##
############################################################
############################################################
############################################################
############################################################
############################################################
############################################################
############################################################
`;
LEVELS.talmor = {
  map: MAP_TALMOR,
  sky: { top: 0x05070f, hor: 0x2c2240, haze: 0x3a2630, stars: 0.6 },
  fog: [0x080a10, 26, 80], cue: 0.6,
  legend: {
    'p': { f: 3, c: 15, sky: true, fl: 'concrete', w: 'citywall', l: 0.65 },
    'y': { x: 'p', f: 4, fl: 'rock', s: 'brick' },
    '1': { f: 2.5, c: 7, fl: 'concrete', cl: 'concrete', w: 'grime', s: 'concrete', l: 0.5 },
    '2': { x: '1', f: 2 }, '3': { x: '1', f: 1.5 }, '4': { x: '1', f: 1 }, '5': { x: '1', f: 0.5 },
    'h': { f: 0, c: 6, fl: 'grate', cl: 'ceil2', w: 'pipe', l: 0.6 },
    'm': { x: 'h', f: 2, fl: 'plate', s: 'vent' },
    'z': { f: 0, c: 3, door: true, secret: true, fl: 'concrete', cl: 'concrete', w: 'pipe', l: 0.4 },
    's': { f: 0, c: 3, fl: 'concrete', cl: 'concrete', w: 'concrete', l: 0.4, secret: true },
    'w': { f: 0, c: 5, fl: 'grate', cl: 'ceil2', w: 'grime', s: 'brick', l: 0.4 },
    'o': { x: 'w', f: -0.3, fl: 'water', liq: 'water', sink: 0.3 },
    'd': { f: 0, c: 3.5, fl: 'concrete', cl: 'concrete', w: 'brick', l: 0.12 },
    'r': { f: 0, c: 4, fl: 'concrete', cl: 'concrete', w: 'brick', l: 0.3 },
    '(': { f: 0, c: 3, door: true, secret: true, fl: 'concrete', cl: 'concrete', w: 'brick', l: 0.15 },
    't': { f: 0, c: 3, fl: 'concrete', cl: 'concrete', w: 'brick', l: 0.3, secret: true },
    'j': { x: 'w', l: 0.45 },
    'g': { f: 0, c: 3.5, fl: 'grime', cl: 'concrete', w: 'grime', l: 0.35, gas: true, tag: 'gaswarn' },
    'l': { x: 'g', f: -0.2, fl: 'sludge', liq: 'sludge', sink: 0.25 },
    '-': { f: 0, c: 3.5, door: true, w: 'cellbars', cl: 'ceil2', l: 0.8 },
    'b': { x: '-', door: true, locked: true, lockMsg: 'THE CELL IS SEALED' },
    'q': { x: '-', door: true, locked: true, id: 'senncell', lockMsg: 'THIS CELL IS CONTROLLED FROM THE DETENTION CONSOLE' },
    'x': { x: '-', door: 'r' },
    'v': { x: '-', door: true, locked: true, id: 'outflow', w: 'grime', lockMsg: 'THE OUTFLOW HATCH IS SEALED' },
    'c': { f: 0, c: 4, fl: 'floor', cl: 'ceil', w: 'cellbars', l: 0.85 },
    'n': { f: 0, c: 3.5, fl: 'floor', cl: 'ceil2', w: 'cellbars', l: 0.5 },
    'k': { f: 0, c: 4, fl: 'plate', cl: 'ceil', w: 'panel', l: 0.75, check: true },
    'u': { f: 0, c: 4, fl: 'grate', cl: 'ceil', w: 'screen', l: 0.8 },
    'e': { f: 0, c: 8, fl: 'grate', cl: 'ceil2', w: 'grime', s: 'brick', l: 0.3 },
    'a': { x: 'e', f: -0.3, fl: 'water', liq: 'water', sink: 0.3 },
    'i': { x: 'e', f: 0.5, fl: 'concrete', s: 'brick' },
    ')': { f: 0, c: 14, sky: true, lift: [0, 6], w: 'grime', l: 0.5 },
    '~': { f: 6, c: 14, sky: true, fl: 'lifttop', w: 'grime', s: 'grime', l: 0.8, tag: 'exit' },
  },
  things: {
    F: { t: 'trooper', d: 1 }, Y: { t: 'trooper', d: 2 }, J: { t: 'officer', drop: 'key_r' },
    '!': 'w_repeater', '*': 'datacore', '+': 'life', '%': 'mask', '$': 'medbig', '&': 'shieldbig',
    '^': { t: 'console', target: 'senncell', dir: 'e', event: 'release', msg: 'CELL 3 UNLOCKED' },
  },
  scriptOpens: [['senncell', 'outflow']],
  lights: [[36, 1, 32, 7, 0x70ff40, 0.45, 2], [40, 1, 32, 6, 0x70ff40, 0.4, 3], [24, 4, 6, 8, 0xffa040, 0.35, 0], [55, 2, 37, 6, 0x4080ff, 0.4, 0]],
  events: {
    start: (A) => { A.msg('FIND THE DETENTION BLOCK BELOW THE CITY'); A.msg('[F] TOGGLES YOUR HEADLAMP'); },
    'enter:gaswarn': (A) => A.msg('TOXIC GAS AHEAD'),
    release: (A) => { A.obj('release'); A.msg('SENN: "TOO LATE FOR ME... TAKE THE CORE..."'); },
    'goal:core': (A) => {
      A.sfx('alarm'); A.msg('THE OUTFLOW HATCH IS OPEN - GET TO THE LIFT IN THE SUMP'); A.open('outflow');
      A.later(2, () => { A.spawn('raider', 47, 32); A.spawn('raider', 52, 31); A.spawn('trooper', 56, 24); });
      A.later(6, () => { A.spawn('brute', 40, 16); A.spawn('seeker', 46, 6); });
    },
  },
};

const MAP_KETHRA = `
################################################################
################################################################
################################################################
######################ccppccccccccppccccccccI#qqqqqqE###########
######################ccppccccYcccppccFcccccc#qq?qqq$###########
######################ccccccppccccppccccccccc-qqqqqqq###########
######################ccTcccppcccccccccppcccc-qqqTqq3###########
######################ccccccppcccccccccppcccc#qqqqqqq###########
######################ccccccccccccppcccppcccc#qqqqCqq###########
######################ccccccccEcccppcccppcccc#qWqqqVq###########
##########################--####################################
####################wwwwwHwwwwwwwwwwwwwwwwCwwww#################
####################wwwwwwwwwwwwwwwwwwwwwwwwwwD#################
###############s*+s#wwvvvvvvvvvvvgvvvvvvvvvvvww#################
###############ssss(wCvvvvvvvvvvvgvvvvvvvvvvvww#################
####################wwvvvvvvvvvvvgvvvvvvvvvvvTw#################
####################wwvvvvvvvvvvvgvvvvvvvvvvvww#################
####################wwvvvvvvvvvvvgvvvvvvvvvvvww#################
####################wwvvvvvvvvvvvgvvvvSvvvvvvww#################
##bbbbbbbb#hhhhhhhhKwwvvvvvvvvvvvgvvvvvvvvvvvww#################
##brrbbbVb#hxxhhhhhhwTvvvvvvvvvvvgvvvvvvvvvvvwE#################
##brrbbbbb#hxxhhhhOhwwvvvvvvvviiiiiiWvvvvvvvvww#################
##bbbbbbbb#hhhhhFhhhwwvvvvvvvviiiiiHivvvvvvvvww#################
##bbbbbbbb-hhhhhhhhhhhvvvvvvvvii&&&iivvvvvvvvww#################
##bbPbbbbb-%hhhUhhhhhhvvvvvvvvi1&&&iivvvvkk&vww#################
##bbbbbbbb#hhhThhhhhwwvvvvvvvvii&&&iivvvvk2&vww#################
##bbbbbbbb#hhhhhhhhhwwvvvvvvvviiiiiiivvvvkW&vww#################
##bbbbEbbb#hhAhhhxxhwwvvvvvvvvKiiiii@vvvvkk&vww#################
##bbbbbbbb#hhhhhhxxhwwvvvvvvvvvvvvvvvvvvvvvvvww#################
##bbbbbbbb#WhhhhhhhEwwvvvvvvvvvvvvvvvvvvvvvvvww#################
####################wwvvvvvvvvSvvvvvvvvvvvvvvwV#################
####################wYvvvvvvvvvvvvvvvvvvvvvvvww#################
####################wwvvvvvvvvvvvvvvvvvvvvvvvww#################
####################wwvvvvvvvvvvvvvvvvvvvvvvvFw#################
####################wwvvvvvvvvvvvvvvvvvvvvvvvww#################
####################wwvvvvvvvvvvvvvvvvvvvvvvvww#################
####################WwwwwwwwwwwTwwwwwwwwHwwwwww#################
####################wwwwwwwwwwwwwwwwwwwwwwwwwww#################
################################yy##############################
################################ll##############################
################################ll##############eeeeeeeeeeeeee##
######################dddWdddddddddddddddddddWd#eeeeeeeeeeeeee##
######################ddNddddddddddddddRddddddd#Eeeeeeezzzzzee##
######################ddddmmddddddddmmdddmmdddd#eeeeeeezzzzzee##
######################ddddmmddRdddddmmdddmmddddoeeeeeeezzzzzee##
######################ddddmmddddddddmmdddmmddddoeeeeeeezzzzzee##
######################ddddmmddddddddmmdddmmdYdd#eeeeeeezzzzzee##
######################dddddddddddd!dddddddddddd#eeeeeeeeeeeeKe##
######################Vdddddddddddddddddddddddd#eeeeeeeeeeeeee##
################################################################
`;
LEVELS.kethra = {
  map: MAP_KETHRA,
  sky: { top: 0x1a0606, hor: 0x9a3a14, haze: 0x5a1a0a, stars: 0.2, planet: { dir: [-0.5, 0.4, -0.75], size: 0.22, col: 0x8a7a6a } },
  fog: [0x2a0c06, 40, 130], cue: 0.45,
  legend: {
    'b': { f: 4, c: 20, sky: true, fl: 'basalt', w: 'basalt', s: 'basalt', l: 0.85 },
    'r': { x: 'b', f: 5, fl: 'rock' },
    '-': { f: 4, c: 7.5, door: true, w: 'foundry', cl: 'ceil2', l: 0.7 },
    'h': { f: 4, c: 9, fl: 'plate', cl: 'ceil', w: 'foundry', l: 0.75, check: true },
    'x': { x: 'h', f: 5.5, fl: 'cratetop', s: 'crate2' },
    'w': { f: 4, c: 16, fl: 'grate', cl: 'ceil2', w: 'foundry', s: 'foundry', l: 0.8 },
    'v': { f: 0, c: 16, fl: 'lava', cl: 'ceil2', w: 'basalt', liq: 'lava', sink: 0.2, kill: true, l: 1 },
    'i': { x: 'w', fl: 'plate', s: 'basalt' },
    'g': { x: 'w', fl: 'grate', s: 'lift' },
    'k': { x: 'w', fl: 'plate', s: 'basalt' },
    '&': { solid: true, w: 'trim' },
    '(': { f: 4, c: 7, door: true, secret: true, w: 'foundry', fl: 'plate', cl: 'ceil2', l: 0.5 },
    's': { f: 4, c: 7, fl: 'plate', cl: 'ceil2', w: 'pipe', l: 0.5, secret: true },
    'c': { f: 4, c: 8, fl: 'ice', cl: 'ceil2', w: 'ice', ice: true, l: 0.65 },
    'p': { x: 'c', f: -30, fl: 'basalt', w: 'ice', kill: true, ice: false, l: 0.2 },
    'q': { f: 4, c: 8, fl: 'grate', cl: 'ceil', w: 'pipe', l: 0.75, check: true },
    'y': { f: 4, c: 7.5, door: 'b', w: 'foundry', cl: 'ceil2', l: 0.7 },
    'l': { f: 0, c: 8, lift: [4, 0], w: 'foundry', l: 0.7 },
    'd': { f: 0, c: 10, fl: 'plate', cl: 'ceil', w: 'panel2', l: 0.6, check: true, tag: 'cradle' },
    'o': { f: 0, c: 3.5, door: true, w: 'panel2', cl: 'ceil2', l: 0.7 },
    'm': { x: 'd', f: 1, fl: 'grate', s: 'hazard' },
    'e': { f: 0, c: 20, sky: true, fl: 'basalt', w: 'basalt', l: 0.85 },
    'z': { x: 'e', f: 0.3, fl: 'lifttop', s: 'hazard', tag: 'exit', l: 1 },
  },
  things: {
    F: { t: 'trooper', d: 1 }, Y: { t: 'trooper', d: 2 },
    '1': { t: 'pump', dir: 'e' }, '2': { t: 'pump', dir: 'e' }, '3': { t: 'pump', dir: 'e' },
    '%': 'cleats', '$': 'key_b', '@': 'w_fusion', '?': 'w_mortar', '!': 'supers', '*': 'shieldbig', '+': 'life',
  },
  plats: [{ x0: 37, z0: 25, x1: 39, z1: 27, top: 4, path: [[0, 0], [2, 0]], speed: 1.8, wait: 1.6 }],
  links: [[36, 25, 41, 25]],
  lights: [[28, 2, 18, 14, 0xff6a20, 0.45, 1.3], [38, 2, 30, 14, 0xff6a20, 0.45, 1.7], [26, 2, 30, 12, 0xff5a10, 0.4, 2.1], [40, 2, 16, 12, 0xff5a10, 0.4, 1.1], [33, 6, 5, 10, 0x80c8ff, 0.3, 0]],
  events: {
    start: (A) => { A.msg('PLANT A CHARGE ON EACH COOLANT PUMP'); A.msg('[V] TOGGLES ICE CLEATS ONCE YOU FIND THEM'); },
    pump: (A) => { A.sfx('alarm'); },
    'goal:pumps': () => {},
    'enter:cradle': (A) => A.msg('REVENANT CRADLES - WATCH YOURSELF'),
  },
  repeat: ['pump'],
};

const MAP_LITANY = `
####################################################################
####################################$s+#############################
#####################################(##############bbbbbbbbbbb#####
#############lllllmmllllllllll1122lllllllllllmmllll#bbbbbbbbbbb#####
#############lllllmmlllYllllll1122lllllllllllmmlQll#bEbbUdKbbbb#####
#############lllTllllllllEllll1122lllCllllMllllllIlibbbbdddbbTb#####
#############lllllllllllllllll1122llllllllllllRllllibbbbdddbbbb#####
#############llllllllCllllllll1122llllllmmlllllllll#bbbYbbbbbbb#####
#############lllllllllllllTlll1122llllllmmlllllLlll#bbbbbbbbbbb#####
#############llHllRlllllllllWl1122lUllllllllClllFlV#bbbbbbbyybb#####
#############lllllllllllllllll1122lllllllllllllllll#bTbbbb&nn&b#####
#######################uu###########################bbbbbb&n*&b#####
#######################uu###########################bbbbbb&!I&b#####
#############hhhhhhhhhhhhhhhhhhhhhhh################bbbbbCbbbbW#####
#############hhhhhhhhhhhhhhhhChhhhVh################Vbbbbbbbbbb#####
#############hhhxxhhhhhhhhhhhhhhhhhh##################vv############
#############hhhxxhhhLhhhhhhhhhhhThh##################vv############
#############hhhhhhhhhhhhhhhhhhhhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
#############hhhhhhhhhjjjjjjhhhhhhhh##rVErrrrrrrrrrrrrrrrrrrrrWr####
#############hhhhhhhhhjjjjjjhhhhhhhh##rrrrrrrrFrrrrrrrrrrrrrrrrr####
#############hhThhhhhhjjjjjjhhhhhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
##aaaaaaaaaa#hhhhhhhhhjjjjjjhhhhhhhh##rrrr&&rrrrrrrrrrrrrr&&rrrr####
##aEaaaaaaWa#hhhhhhhhhjjjjjjhhhhhhhh##rrrr&&rrrrrrrrrrrrrr&&rrrr####
##aaaaaaaaaa#hhhhhhhhhhhhhhhhhhhhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
##aaaaaaaaaaohhhhhhhhhhhhhhhhhUhhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
##aaPaaaaaaaohhhhhhShhhhhhhhhhhhhhhh##rrrrrrrrrrrr&&rrrrrrrrrrrr####
##aaaaaaaaaa#hhhhhhhhhhhhMhhhhhhhhhh##rrrrrrrrrrrr&&rrrrrrrrrrrr####
##aaaaaaaaaa#hhhhhhhhhhhhhhhhhhhhhFh##rrrrrrXrrrrrrrrrrrrrrXrrrr####
##aaaaaaaaaa#hhhhhhhhhhhhhhhhhhhhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
##aVaaaaaaaa#hhhhhhhhhhhhhhhhhhhhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
#############hChhhhhxhhhhhhhThhhhhhh##rppppprrrrrrrrrrrrrppppprr####
########kAkk#hhhhhhhxhhhhhhhhhhhhhhh##rppKppqrrrrrrrrrrrqpppKprr####
########NkkQ#hhhhhhhhhhhhhhhhhhhhhhh##rpVpppqrrrrrrrrrrrqpppppVr####
########kkkkohhhhhhhhhhhhhhhhhxxhhhh##rpppppqrrrrrrrrrrrqppppprr####
########kJkkohhhhhhhhhhhhhhIhhxxhhhh##rppppprrrrrrrZrrrrrppppprr####
########kkkk#hhhhhYhhhhhhhhhhhxxhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
########kkDk#hEhhhhhhhhhhhhhhKhhhhWh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
#############hhhhhhhhhhhhhhhhhhhhhhh##rrrrrrrrrrrrrrrrrrrrrrrrrr####
################:::::::::::::::::#####rrrrrrrrrrrrrrrrrrrrrrrrrr#eee
######################################rrrrrrrrrrrr&&rrrrrrrrrrrr#eee
######################################rrrrrrrrrrrr&&rrrrrrrrrrrrweee
######################################rrrrrrrrrrrrrrrrrrrrrrrrrrweee
######################################rrrrrrrrrrrrrrrrrrrrrrrrrr#eee
######################################rrrr&&rrrrrrrrrrrrrr&&rrrr#eee
######################################rrrr&&rrrrrrrrrrrrrr&&rrrr####
######################################rCrrrrrrrrrrrrrrrrrrrrrrrr####
######################################rLrrrrrrrrrrrrrrrrrrrrrLYr####
######################################rrrrrrrrrrrrrrrrrrrrrrrrrr####
####################################################################
####################################################################
####################################################################
####################################################################
`;
LEVELS.litany = {
  map: MAP_LITANY,
  sky: { top: 0x000000, hor: 0x000000 },
  fog: [0x000000, 50, 160], cue: 0.55,
  legend: {
    'a': { f: 0, c: 8, fl: 'plate', cl: 'ceil', w: 'hull', l: 0.7 },
    'o': { f: 0, c: 3.5, door: true, w: 'hull', cl: 'ceil2', l: 0.7 },
    'h': { f: 0, c: 14, fl: 'plate', cl: 'ceil', w: 'hull', l: 0.75, check: true },
    ':': { solid: true, w: 'window' },
    '&': { solid: true, w: 'trim' },
    'x': { x: 'h', f: 1.5, fl: 'cratetop', s: 'crate2' },
    'j': { x: 'h', f: 3, fl: 'hull', s: 'hull' },
    'k': { f: 0, c: 4, fl: 'floor', cl: 'ceil', w: 'panel', l: 0.8 },
    'u': { f: 0, c: 12, lift: [0, 6], w: 'hull', l: 0.75 },
    'l': { f: 6, c: 12, fl: 'grate', cl: 'ceil2', w: 'panel2', s: 'hazard', l: 0.7, check: true },
    '1': { x: 'l', lift: [6, 3], mode: 'cycle', wait: 1.3, speed: 2.4, s: 'lift' },
    '2': { x: 'l', lift: [3, 6], mode: 'cycle', wait: 1.3, speed: 2.4, s: 'lift' },
    'm': { x: 'l', f: 7, fl: 'grate', s: 'hazard' },
    '(': { f: 6, c: 9, door: true, secret: true, w: 'panel2', fl: 'grate', cl: 'ceil2', l: 0.5 },
    's': { f: 6, c: 9, fl: 'grate', cl: 'ceil2', w: 'pipe', l: 0.5, secret: true },
    'i': { f: 6, c: 9.5, door: true, w: 'shipwall', cl: 'ceil2', l: 0.7 },
    'b': { f: 6, c: 10, fl: 'floor', cl: 'ceil', w: 'screen', l: 0.85, check: true },
    'd': { x: 'b', f: 6.5, fl: 'plate', s: 'trim' },
    'y': { f: 6, c: 9, door: 'y', w: 'shipwall', cl: 'ceil2', l: 0.7 },
    'n': { f: 6, c: 9, fl: 'grate', cl: 'ceil', w: 'tech', l: 0.9 },
    'v': { f: 0, c: 18, lift: [6, 0], locked: true, id: 'arenalift', lockMsg: 'THE LIFT IS LOCKED DOWN - TAKE THE NAV CARD FIRST', w: 'shipwall', l: 0.7 },
    'r': { f: 0, c: 18, fl: 'plate', cl: 'ceil2', w: 'shipwall', l: 0.6, tag: 'arena' },
    'p': { x: 'r', f: 2, fl: 'grate', s: 'hull' },
    'q': { x: 'r', f: 1, fl: 'plate', s: 'hazard' },
    'w': { f: 0, c: 3.5, door: true, locked: true, id: 'pods', w: 'hull', cl: 'ceil2', lockMsg: 'THE POD BAY IS SEALED WHILE VOSSK LIVES', l: 0.7 },
    'e': { f: 0, c: 4, fl: 'lifttop', cl: 'lightpanel', w: 'tech', l: 1, tag: 'exit' },
  },
  things: {
    F: { t: 'trooper', d: 1 }, Y: { t: 'trooper', d: 2 }, J: { t: 'officer', drop: 'key_y' },
    '*': 'navcard', '$': 'shieldbig', '+': 'life', '!': 'supers',
    Z: { t: 'boss', ambush: true },
  },
  scriptOpens: [['*', 'pods']],
  lights: [[44, 8, 23, 16, 0xff3020, 0.35, 0.8], [56, 8, 41, 16, 0xff3020, 0.35, 1.1], [50, 6, 32, 12, 0x6080ff, 0.3, 0], [24, 8, 25, 14, 0x8090b0, 0.25, 0]],
  events: {
    start: (A) => A.msg('TAKE THE LIFT TO THE ASSEMBLY DECK'),
    'goal:nav': (A) => { A.unlock('arenalift'); A.sfx('alarm'); A.msg('THE ARENA LIFT IS UNLOCKED - VOSSK IS WAITING BELOW'); },
    'enter:arena': (A) => { A.msg('VOSSK: "THE PROTOCOL CANNOT BE STOPPED, MERCENARY."'); A.flag('arena'); },
    boss: (A) => { A.obj('boss'); A.open('pods'); A.msg('VOSSK IS DOWN - GET TO THE ESCAPE POD'); },
  },
};
