// Tokoyo — game data: items, recipes, building pieces, creatures, skills, hints

const WORLD = { size: 2048, half: 1024, sea: 0, chunk: 64 };
const DAY_LEN = 1200;          // seconds per in-game day
const BASE_HP = 25, BASE_ST = 50;

// ---------- skills ----------
const SKILLS = {
  swords: 'Swords', knives: 'Knives', clubs: 'Clubs', spears: 'Spears', axes: 'Axes', bows: 'Bows', unarmed: 'Unarmed',
  blocking: 'Blocking', woodcutting: 'Woodcutting', pickaxes: 'Pickaxes', running: 'Running', jumping: 'Jumping', swimming: 'Swimming', sneak: 'Sneak',
};

// ---------- items ----------
// type: mat | food | weapon | tool | shield | armor | ammo | trophy | potion
const ITEMS = {};
function item(id, o) { ITEMS[id] = Object.assign({ id, stack: 50, weight: 1, type: 'mat', desc: '' }, o); }

// materials
item('wood', { name: 'Wood', weight: 2, desc: 'Plain timber. Everything starts here.' });
item('stone', { name: 'Stone', weight: 2, desc: 'Grey river stone.' });
item('flint', { name: 'Flint', desc: 'Sharp-edged stone found by the water.' });
item('resin', { name: 'Resin', weight: 0.3, stack: 100, desc: 'Sticky pine resin. Burns slow and bright.' });
item('bamboo', { name: 'Bamboo', desc: 'Light, straight and strong. Good for arrows and fences.' });
item('straw', { name: 'Susuki straw', weight: 0.3, desc: 'Dry pampas grass, for thatch and weaving.' });
item('leather_scraps', { name: 'Leather scraps', weight: 0.5, desc: 'Ragged pieces of boar hide.' });
item('deer_hide', { name: 'Deer hide', desc: 'Soft and supple.' });
item('boar_tusk', { name: 'Boar tusk', type: 'trophy', stack: 20, desc: 'A curved tusk. The white boar god answers an offering of these.' });
item('gaki_eye', { name: 'Gaki eye', weight: 0.2, desc: 'It still looks hungry.' });
item('kappa_shell', { name: 'Kappa shell', desc: 'A piece of kappa carapace. Hard as bronze, light as wood.' });
item('oni_hide', { name: 'Oni hide', desc: 'Thick red hide, warm to the touch.' });
item('bone_fragments', { name: 'Bone fragments', weight: 0.5, desc: 'What is left of a fallen warrior.' });
item('kami_seed', { name: 'Kami seed', type: 'trophy', stack: 20, weight: 0.5, desc: 'A cedar seed humming with old power. The elder cedar wakes for three.' });
item('fire_orb', { name: 'Hi-no-tama', weight: 0.5, stack: 20, desc: 'A sleeping spirit flame. Furnaces and gates need its heat.' });
item('copper_ore', { name: 'Copper ore', weight: 6, stack: 30, ore: true, desc: 'Greenish ore. Smelt it in a tatara.' });
item('tin_ore', { name: 'Tin ore', weight: 6, stack: 30, ore: true, desc: 'Dull grey ore from the forest shores.' });
item('copper', { name: 'Copper', weight: 6, stack: 30, desc: 'A copper bar.' });
item('tin', { name: 'Tin', weight: 6, stack: 30, desc: 'A tin bar.' });
item('bronze', { name: 'Bronze', weight: 6, stack: 30, desc: 'Two parts copper, one part tin.' });
item('coal', { name: 'Charcoal', weight: 2, desc: 'Fuel for the furnace.' });
item('hinoki', { name: 'Hinoki wood', weight: 2, desc: 'Pale fragrant cypress. Only a bronze axe bites it.' });
item('heartwood', { name: 'Cedar heartwood', weight: 2, desc: 'Dense red wood from old cedars.' });
item('great_tusk', { name: 'Great tusk', weight: 2, stack: 20, desc: 'Shirokiba\'s tusk. Hard enough to break ore.' });
item('sacred_rope', { name: 'Sacred rope', weight: 1, stack: 10, desc: 'The shimenawa of the elder cedar. The way beyond the mist will open to whoever holds it.' });
item('yomogi', { name: 'Yomogi', weight: 0.2, desc: 'Mugwort. A healing herb.' });
item('raw_boar', { name: 'Raw boar meat', weight: 1, stack: 20, desc: 'Cook it on a spit.' });
item('raw_venison', { name: 'Raw venison', weight: 1, stack: 20, desc: 'Cook it on a spit.' });
// trophies for the shrine
item('shirokiba_trophy', { name: 'Shirokiba trophy', type: 'trophy', stack: 1, weight: 5, desc: 'Place it at the spirit shrine to receive Shirokiba\'s blessing.' });
item('osugi_trophy', { name: 'Ōsugi trophy', type: 'trophy', stack: 1, weight: 5, desc: 'Place it at the spirit shrine to receive Ōsugi\'s blessing.' });

// food: hp, st, regen (per 10 s tick), dur (s)
item('strawberry', { name: 'Wild strawberries', type: 'food', stack: 50, weight: 0.1, food: { hp: 7, st: 20, regen: 1, dur: 600 } });
item('kokemomo', { name: 'Kokemomo berries', type: 'food', stack: 50, weight: 0.1, food: { hp: 8, st: 25, regen: 1, dur: 600 } });
item('matsutake', { name: 'Matsutake', type: 'food', stack: 50, weight: 0.1, food: { hp: 15, st: 15, regen: 1, dur: 900 } });
item('cucumber', { name: 'Kappa cucumber', type: 'food', stack: 20, weight: 0.2, food: { hp: 6, st: 22, regen: 1, dur: 600 }, desc: 'Kappa never go anywhere without one.' });
item('cooked_boar', { name: 'Grilled boar', type: 'food', stack: 20, weight: 1, food: { hp: 30, st: 10, regen: 2, dur: 1200 } });
item('cooked_venison', { name: 'Grilled venison', type: 'food', stack: 20, weight: 1, food: { hp: 35, st: 12, regen: 2, dur: 1200 } });
item('burnt_meat', { name: 'Charred meat', type: 'mat', stack: 20, desc: 'Left on the fire too long.' });
item('jam', { name: 'Kokemomo jam', type: 'food', stack: 10, weight: 1, food: { hp: 14, st: 40, regen: 2, dur: 1200 } });
item('nabe', { name: 'Venison nabe', type: 'food', stack: 10, weight: 1, food: { hp: 45, st: 15, regen: 3, dur: 1500 } });
item('matsutake_soup', { name: 'Matsutake soup', type: 'food', stack: 10, weight: 1, food: { hp: 18, st: 45, regen: 2, dur: 1500 } });
item('boar_skewers', { name: 'Boar skewers', type: 'food', stack: 10, weight: 1, food: { hp: 50, st: 12, regen: 3, dur: 1500 } });
item('tonic', { name: 'Yomogi tonic', type: 'potion', stack: 10, weight: 0.5, potion: { heal: 50, time: 10, cd: 120 }, desc: 'Restores 50 health over 10 seconds.' });

// weapons & tools. dmg: { blunt, slash, pierce, fire, chop, pick }; tier = chop/mine tier
function weapon(id, o) { item(id, Object.assign({ type: 'weapon', stack: 1, weight: 1.5, hands: 1, maxQ: 4, dur: 100, stam: 6, knock: 30, block: 4, parry: 2, anim: 'swing' }, o)); }
weapon('club', { name: 'Wooden club', skill: 'clubs', dmg: { blunt: 12 }, per: { blunt: 6 }, knock: 50, stagger: 1.4, desc: 'A heavy knot of wood.' });
weapon('torch', { name: 'Torch', skill: 'clubs', dmg: { blunt: 4, fire: 6 }, per: {}, maxQ: 1, dur: 24, durDrain: 1, light: true, desc: 'Burns down slowly while held. Lights the night.' });
weapon('stone_axe', { name: 'Stone axe', skill: 'axes', dmg: { slash: 15, chop: 15 }, per: { slash: 4, chop: 3 }, tier: 0, desc: 'Fells most trees in time.' });
weapon('flint_axe', { name: 'Flint axe', skill: 'axes', dmg: { slash: 25, chop: 25 }, per: { slash: 5, chop: 5 }, tier: 1 });
weapon('bronze_axe', { name: 'Bronze ono', skill: 'axes', dmg: { slash: 34, chop: 40 }, per: { slash: 6, chop: 6 }, tier: 2, dur: 150, weight: 2 });
weapon('flint_knife', { name: 'Flint tantō', skill: 'knives', dmg: { slash: 8, pierce: 8 }, per: { slash: 3, pierce: 3 }, stam: 4, speed: 1.6, backstab: 10, anim: 'stab', block: 2 });
weapon('bamboo_spear', { name: 'Bamboo spear', skill: 'spears', dmg: { pierce: 20 }, per: { pierce: 5 }, anim: 'thrust', throwable: true, range: 2.6, desc: 'Middle mouse to throw.' });
weapon('bronze_spear', { name: 'Bronze yari', skill: 'spears', dmg: { pierce: 35 }, per: { pierce: 6 }, anim: 'thrust', throwable: true, range: 2.8, dur: 150 });
weapon('bronze_sword', { name: 'Bronze tachi', skill: 'swords', dmg: { slash: 35 }, per: { slash: 6 }, stam: 8, dur: 150, block: 8, desc: 'Middle mouse for a lunging cut.' });
weapon('bronze_mace', { name: 'Bronze mace', skill: 'clubs', dmg: { blunt: 35 }, per: { blunt: 6 }, stam: 8, knock: 70, stagger: 1.6, dur: 150 });
weapon('crude_bow', { name: 'Hankyū', skill: 'bows', dmg: { pierce: 22 }, per: { pierce: 4 }, anim: 'bow', hands: 2, draw: 1.6, stam: 6, block: 0, desc: 'Hold left mouse to draw, release to loose.' });
weapon('hinoki_bow', { name: 'Hinoki yumi', skill: 'bows', dmg: { pierce: 32 }, per: { pierce: 4 }, anim: 'bow', hands: 2, draw: 1.3, stam: 7, block: 0, dur: 150 });
weapon('tusk_pick', { name: 'Tusk pickaxe', type: 'tool', skill: 'pickaxes', dmg: { pierce: 5, pick: 18 }, per: { pick: 4 }, tier: 1, stam: 6, hands: 2, dur: 100, desc: 'Breaks rock, copper and tin. Digs the ground.' });
weapon('bronze_pick', { name: 'Bronze pickaxe', type: 'tool', skill: 'pickaxes', dmg: { pierce: 6, pick: 27 }, per: { pick: 5 }, tier: 2, stam: 6, hands: 2, dur: 150 });
weapon('hammer', { name: 'Hammer', type: 'tool', skill: 'unarmed', dmg: {}, per: {}, maxQ: 1, dur: 100, build: 'hammer', desc: 'Right mouse for the build menu. Left mouse to place, middle mouse or Q to take down.' });
weapon('hoe', { name: 'Hoe', type: 'tool', skill: 'unarmed', dmg: {}, per: {}, maxQ: 1, dur: 100, build: 'hoe', desc: 'Right mouse for the menu: level ground, raise ground, paths.' });
// shields
function shield(id, o) { item(id, Object.assign({ type: 'shield', stack: 1, weight: 3, maxQ: 3, dur: 100, hands: 1 }, o)); }
shield('wood_shield', { name: 'Wooden tate', block: 10, perBlock: 5, parry: 1.5 });
shield('kappa_buckler', { name: 'Kappa-shell buckler', block: 7, perBlock: 3, parry: 2.5, weight: 1.5, desc: 'Small. Rewards perfect timing.' });
shield('bronze_shield', { name: 'Bronze-banded tate', block: 20, perBlock: 5, parry: 1.5, dur: 150, weight: 4 });
// armour
function armor(id, o) { item(id, Object.assign({ type: 'armor', stack: 1, weight: 2, maxQ: 3, dur: 200, per: 1 }, o)); }
armor('straw_hat', { name: 'Sugegasa', slot: 'head', armor: 1, per: 0, maxQ: 1, weight: 0.5, desc: 'A conical straw hat.' });
armor('mino', { name: 'Mino raincoat', slot: 'cape', armor: 1, per: 1, rainproof: true, weight: 1, desc: 'A straw cape. Rain runs right off it: you will not get wet.' });
armor('rag_tunic', { name: 'Hemp kosode', slot: 'chest', armor: 1, per: 1 });
armor('rag_pants', { name: 'Hemp hakama', slot: 'legs', armor: 1, per: 1 });
armor('leather_helm', { name: 'Leather hood', slot: 'head', armor: 2, per: 2 });
armor('leather_tunic', { name: 'Leather haori', slot: 'chest', armor: 2, per: 2 });
armor('leather_pants', { name: 'Leather hakama', slot: 'legs', armor: 2, per: 2 });
armor('oni_helm', { name: 'Oni-hide hood', slot: 'head', armor: 6, per: 2, sneak: 0.15 });
armor('oni_tunic', { name: 'Oni-hide jacket', slot: 'chest', armor: 6, per: 2, sneak: 0.15 });
armor('oni_pants', { name: 'Oni-hide leggings', slot: 'legs', armor: 6, per: 2, sneak: 0.15 });
armor('bronze_helm', { name: 'Bronze kabuto', slot: 'head', armor: 8, per: 2, weight: 4 });
armor('bronze_chest', { name: 'Bronze dō', slot: 'chest', armor: 8, per: 2, weight: 8, move: -0.05 });
armor('bronze_legs', { name: 'Bronze suneate', slot: 'legs', armor: 8, per: 2, weight: 6, move: -0.05 });
// ammo
function ammo(id, o) { item(id, Object.assign({ type: 'ammo', stack: 100, weight: 0.1 }, o)); }
ammo('arrow_bamboo', { name: 'Bamboo arrows', dmg: { pierce: 22 } });
ammo('arrow_flint', { name: 'Flint arrows', dmg: { pierce: 26 } });
ammo('arrow_fire', { name: 'Fire arrows', dmg: { pierce: 11, fire: 22 } });
ammo('arrow_bronze', { name: 'Bronze-head arrows', dmg: { pierce: 32 } });

// ---------- recipes ----------
// st: station id (null = by hand), lv: station level. Upgrades cost half the base materials (rounded up) and +1 level per quality.
const RECIPES = [];
function rec(id, st, lv, req, n = 1) { RECIPES.push({ id, st, lv, req, n }); }
rec('hammer', null, 0, { wood: 3, stone: 2 });
rec('club', null, 0, { wood: 6 });
rec('torch', null, 0, { wood: 1, resin: 1 });
rec('stone_axe', null, 0, { wood: 5, stone: 4 });
rec('hoe', 'workbench', 1, { wood: 5, stone: 2 });
rec('wood_shield', 'workbench', 1, { wood: 10, leather_scraps: 4 });
rec('crude_bow', 'workbench', 1, { wood: 10, leather_scraps: 8 });
rec('arrow_bamboo', 'workbench', 1, { bamboo: 6 }, 20);
rec('bamboo_spear', 'workbench', 1, { bamboo: 5, flint: 5, leather_scraps: 2 });
rec('flint_knife', 'workbench', 1, { wood: 2, flint: 4, leather_scraps: 2 });
rec('flint_axe', 'workbench', 1, { wood: 6, flint: 4 });
rec('tusk_pick', 'workbench', 1, { great_tusk: 1, wood: 10 });
rec('straw_hat', 'workbench', 1, { straw: 10 });
rec('rag_tunic', 'workbench', 1, { leather_scraps: 5 });
rec('rag_pants', 'workbench', 1, { leather_scraps: 5 });
rec('mino', 'workbench', 2, { straw: 20, leather_scraps: 2 });
rec('arrow_flint', 'workbench', 2, { bamboo: 8, flint: 2 }, 20);
rec('arrow_fire', 'workbench', 2, { bamboo: 8, resin: 8 }, 20);
rec('leather_helm', 'workbench', 2, { deer_hide: 6 });
rec('leather_tunic', 'workbench', 2, { deer_hide: 6 });
rec('leather_pants', 'workbench', 2, { deer_hide: 6 });
rec('kappa_buckler', 'workbench', 2, { kappa_shell: 4, wood: 4, leather_scraps: 2 });
rec('oni_helm', 'workbench', 3, { oni_hide: 5, bone_fragments: 3 });
rec('oni_tunic', 'workbench', 3, { oni_hide: 5, bone_fragments: 3 });
rec('oni_pants', 'workbench', 3, { oni_hide: 5, bone_fragments: 3 });
rec('hinoki_bow', 'workbench', 3, { hinoki: 10, bronze: 1, deer_hide: 2 });
rec('bronze', 'forge', 1, { copper: 2, tin: 1 });
rec('bronze_axe', 'forge', 1, { wood: 4, bronze: 8, leather_scraps: 2 });
rec('bronze_sword', 'forge', 1, { wood: 2, bronze: 8, leather_scraps: 2 });
rec('bronze_mace', 'forge', 1, { wood: 4, bronze: 8, leather_scraps: 3 });
rec('bronze_spear', 'forge', 1, { wood: 2, bronze: 6, deer_hide: 2 });
rec('bronze_pick', 'forge', 1, { wood: 3, bronze: 3 });
rec('bronze_shield', 'forge', 1, { wood: 4, bronze: 10 });
rec('arrow_bronze', 'forge', 1, { bamboo: 8, bronze: 1 }, 20);
rec('bronze_helm', 'forge', 1, { bronze: 5, deer_hide: 2 });
rec('bronze_chest', 'forge', 2, { bronze: 5, deer_hide: 2 });
rec('bronze_legs', 'forge', 2, { bronze: 5, deer_hide: 2 });
rec('jam', 'cauldron', 1, { kokemomo: 8, strawberry: 6 });
rec('nabe', 'cauldron', 1, { cooked_venison: 1, matsutake: 2, kokemomo: 2 });
rec('matsutake_soup', 'cauldron', 1, { matsutake: 3, cucumber: 2 });
rec('boar_skewers', 'cauldron', 1, { cooked_boar: 2, matsutake: 1, yomogi: 2 });
rec('tonic', 'cauldron', 1, { yomogi: 5, kokemomo: 3, resin: 1 });

// ---------- building pieces ----------
// mat: wood | stone | hard. size [w,h,d] in local axes; origin at the bottom centre unless `oy` given.
// kind decides snap points & collider shape. cat: build | craft | furniture | misc
const MATS = {
  wood: { max: 100, min: 10, vLoss: 0.125, hLoss: 0.2 },
  hard: { max: 140, min: 10, vLoss: 0.1, hLoss: 0.16 },
  stone: { max: 1000, min: 100, vLoss: 0.1, hLoss: 1 },
  ground: { max: 100, min: 0, vLoss: 0, hLoss: 0 },
};
const PIECES = {};
function piece(id, o) { PIECES[id] = Object.assign({ id, cat: 'build', mat: 'wood', hp: 200, st: 'workbench', kind: 'box', snap: true }, o); }
piece('wood_floor', { name: 'Wood floor 2×2', req: { wood: 2 }, kind: 'floor', size: [2, 0.25, 2], hp: 300 });
piece('wood_floor_s', { name: 'Wood floor 1×1', req: { wood: 1 }, kind: 'floor', size: [1, 0.25, 1], hp: 200 });
piece('wood_wall', { name: 'Wood wall', req: { wood: 2 }, kind: 'wall', size: [2, 2, 0.24], hp: 300 });
piece('wood_wall_half', { name: 'Wood wall, half', req: { wood: 1 }, kind: 'wall', size: [2, 1, 0.24], hp: 200 });
piece('wood_wall_narrow', { name: 'Wood wall, narrow', req: { wood: 1 }, kind: 'wall', size: [1, 2, 0.24], hp: 200 });
piece('shoji', { name: 'Shoji screen', req: { wood: 1, straw: 1 }, kind: 'wall', size: [2, 2, 0.12], hp: 120, look: 'shoji', comfort: ['shoji', 1] });
piece('wood_door', { name: 'Wood door', req: { wood: 4 }, kind: 'door', size: [2, 2, 0.16], hp: 300 });
piece('wood_beam', { name: 'Wood beam 2m', req: { wood: 1 }, kind: 'beam', size: [2, 0.24, 0.24], hp: 200 });
piece('wood_beam_s', { name: 'Wood beam 1m', req: { wood: 1 }, kind: 'beam', size: [1, 0.24, 0.24], hp: 150 });
piece('wood_pole', { name: 'Wood pole 2m', req: { wood: 1 }, kind: 'pole', size: [0.26, 2, 0.26], hp: 200 });
piece('wood_pole_s', { name: 'Wood pole 1m', req: { wood: 1 }, kind: 'pole', size: [0.26, 1, 0.26], hp: 150 });
piece('roof45', { name: 'Thatch roof 45°', req: { wood: 1, straw: 2 }, kind: 'roof', size: [2, 2, 2], rise: 2, hp: 200, look: 'thatch' });
piece('roof26', { name: 'Thatch roof 26°', req: { wood: 1, straw: 2 }, kind: 'roof', size: [2, 1, 2], rise: 1, hp: 200, look: 'thatch' });
piece('ridge45', { name: 'Thatch ridge 45°', req: { wood: 1, straw: 2 }, kind: 'ridge', size: [2, 1, 2], rise: 1, hp: 200, look: 'thatch' });
piece('ridge26', { name: 'Thatch ridge 26°', req: { wood: 1, straw: 2 }, kind: 'ridge', size: [2, 0.5, 2], rise: 0.5, hp: 200, look: 'thatch' });
piece('wood_stairs', { name: 'Wood stairs', req: { wood: 3 }, kind: 'stairs', size: [2, 2, 2], hp: 250 });
piece('bamboo_fence', { name: 'Bamboo fence', req: { bamboo: 3 }, kind: 'wall', size: [2, 1.3, 0.14], hp: 150, look: 'fence' });
piece('bamboo_stakes', { name: 'Bamboo stakes', req: { bamboo: 4 }, kind: 'stakes', size: [2, 1.2, 0.8], hp: 150, cat: 'misc', snap: false, damage: 20, look: 'stakes' });
piece('stone_wall', { name: 'Stone wall', req: { stone: 6 }, kind: 'wall', mat: 'stone', st: 'stonecutter', size: [2, 2, 0.5], hp: 1200, look: 'stone' });
piece('stone_floor', { name: 'Stone floor', req: { stone: 6 }, kind: 'floor', mat: 'stone', st: 'stonecutter', size: [2, 0.5, 2], hp: 1200, look: 'stone' });
piece('stone_pillar', { name: 'Stone pillar', req: { stone: 5 }, kind: 'pole', mat: 'stone', st: 'stonecutter', size: [0.6, 2, 0.6], hp: 1000, look: 'stone' });
piece('stone_stairs', { name: 'Stone stairs', req: { stone: 8 }, kind: 'stairs', mat: 'stone', st: 'stonecutter', size: [2, 1, 2], hp: 1000, look: 'stone' });
piece('hinoki_beam', { name: 'Hinoki beam 2m', req: { hinoki: 1 }, kind: 'beam', mat: 'hard', size: [2, 0.26, 0.26], hp: 300, look: 'hinoki' });
piece('hinoki_pole', { name: 'Hinoki pole 2m', req: { hinoki: 1 }, kind: 'pole', mat: 'hard', size: [0.28, 2, 0.28], hp: 300, look: 'hinoki' });
// crafting
piece('workbench', { name: 'Workbench', cat: 'craft', req: { wood: 10 }, st: null, kind: 'obj', size: [2, 1, 1], snap: false, station: 'workbench', range: 20, hp: 400 });
piece('chopping_block', { name: 'Chopping block', cat: 'craft', req: { wood: 10, flint: 10 }, kind: 'obj', size: [0.8, 0.8, 0.8], snap: false, ext: 'workbench', hp: 300 });
piece('tanning_rack', { name: 'Tanning rack', cat: 'craft', req: { wood: 10, flint: 20, leather_scraps: 5, deer_hide: 2 }, kind: 'obj', size: [2, 1.8, 0.6], snap: false, ext: 'workbench', hp: 300 });
piece('forge', { name: 'Forge', cat: 'craft', req: { stone: 4, coal: 4, wood: 10, copper: 6 }, kind: 'obj', size: [2, 1.6, 1.6], snap: false, station: 'forge', range: 20, hp: 600, mat: 'stone' });
piece('anvil', { name: 'Anvil', cat: 'craft', req: { wood: 5, bronze: 5 }, kind: 'obj', size: [1.2, 0.8, 0.6], snap: false, ext: 'forge', hp: 400 });
piece('kiln', { name: 'Charcoal kiln', cat: 'craft', req: { stone: 20 }, kind: 'obj', size: [1.6, 2.2, 1.6], snap: false, proc: 'kiln', hp: 600, mat: 'stone' });
piece('tatara', { name: 'Tatara furnace', cat: 'craft', req: { stone: 40, fire_orb: 5 }, kind: 'obj', size: [2, 2.6, 2], snap: false, proc: 'tatara', hp: 800, mat: 'stone' });
piece('cauldron', { name: 'Cauldron', cat: 'craft', req: { tin: 10 }, kind: 'obj', size: [1, 0.9, 1], snap: false, station: 'cauldron', range: 3, needFire: true, hp: 300 });
piece('spit', { name: 'Cooking spit', cat: 'craft', req: { wood: 2 }, kind: 'obj', size: [1.6, 1.2, 0.3], snap: false, proc: 'spit', hp: 100, solid: false });
piece('stonecutter', { name: 'Stonecutter', cat: 'craft', req: { wood: 10, bronze: 2, stone: 4 }, kind: 'obj', size: [1.4, 1.2, 1], snap: false, station: 'stonecutter', range: 20, hp: 500 });
// furniture
piece('campfire', { name: 'Campfire', cat: 'furniture', req: { stone: 5, wood: 2 }, st: null, kind: 'obj', size: [1.4, 0.4, 1.4], snap: false, fire: { max: 10, burn: 150 }, comfort: ['fire', 1], hp: 100, solid: false });
piece('irori', { name: 'Irori hearth', cat: 'furniture', req: { stone: 15 }, kind: 'obj', size: [2, 0.3, 2], snap: false, fire: { max: 20, burn: 180 }, comfort: ['fire', 2], hp: 300, mat: 'stone', solid: false });
piece('futon', { name: 'Futon', cat: 'furniture', req: { wood: 8, deer_hide: 1 }, kind: 'obj', size: [1.1, 0.3, 2.1], snap: false, bed: true, comfort: ['bed', 1], hp: 100, solid: false });
piece('chest', { name: 'Tansu chest', cat: 'furniture', req: { wood: 10 }, kind: 'obj', size: [1.2, 0.8, 0.7], snap: false, chest: 10, hp: 200 });
piece('chabudai', { name: 'Chabudai table', cat: 'furniture', req: { wood: 4 }, kind: 'obj', size: [1.2, 0.4, 1.2], snap: false, comfort: ['table', 1], hp: 100 });
piece('zabuton', { name: 'Zabuton cushion', cat: 'furniture', req: { leather_scraps: 2, straw: 2 }, kind: 'obj', size: [0.7, 0.15, 0.7], snap: false, seat: true, comfort: ['seat', 1], hp: 50, solid: false });
piece('tatami', { name: 'Tatami mat', cat: 'furniture', req: { straw: 6, wood: 1 }, kind: 'obj', size: [1, 0.06, 2], snap: false, comfort: ['tatami', 1], hp: 50, solid: false });
piece('noren', { name: 'Noren curtain', cat: 'furniture', req: { leather_scraps: 2, wood: 1 }, kind: 'obj', size: [1.4, 1.2, 0.06], snap: false, comfort: ['noren', 1], hp: 50, solid: false, hang: true });
piece('andon', { name: 'Andon lamp', cat: 'furniture', req: { wood: 2, resin: 2, straw: 1 }, kind: 'obj', size: [0.5, 1.1, 0.5], snap: false, lamp: { max: 10, burn: 300, fuel: 'resin' }, comfort: ['lamp', 1], hp: 50 });
piece('toro', { name: 'Stone lantern', cat: 'furniture', req: { stone: 8, resin: 2 }, kind: 'obj', size: [0.8, 2, 0.8], snap: false, lamp: { max: 10, burn: 300, fuel: 'resin' }, hp: 400, mat: 'stone' });
piece('torii', { name: 'Torii gate', cat: 'furniture', req: { wood: 12, resin: 4 }, kind: 'obj', size: [4.6, 4.4, 0.6], snap: false, comfort: ['torii', 2], hp: 400, solid: 'posts' });
piece('portal', { name: 'Torii portal', cat: 'misc', req: { hinoki: 20, fire_orb: 2, gaki_eye: 10 }, kind: 'obj', size: [3.2, 3.6, 0.6], snap: false, portal: true, hp: 400, solid: 'posts' });
piece('raft', { name: 'Raft (ikada)', cat: 'misc', req: { wood: 20, leather_scraps: 6, resin: 6 }, kind: 'raft', size: [3, 1, 4.5], snap: false, water: true, hp: 300 });
piece('repair', { name: 'Repair', cat: 'build', req: {}, st: null, tool: 'repair' });

const HOE_MODES = [
  { id: 'level', name: 'Level ground', req: {}, desc: 'Flattens the ground to the height you stand on.' },
  { id: 'raise', name: 'Raise ground', req: { stone: 2 }, desc: 'Builds up the ground by half a metre.' },
  { id: 'path', name: 'Dirt path', req: {}, desc: 'Clears grass and marks a path.' },
  { id: 'paved', name: 'Stone path', req: { stone: 1 }, desc: 'Lays flat stones. Stops grass growing.' },
];

// ---------- creatures ----------
// at: attacks [{ id, dmg, range, arc (rad half-angle), cd, wind (s), dur (s), anim, knock, stagger?, proj? }]
// res: damage multipliers per type; drops [id, min, max, chance]
const MOBS = {
  deer: { name: 'Shika', hp: 10, speed: 2.4, run: 9, mood: 'flee', sight: 30, hear: 22, r: 0.5, h: 1.5, mass: 1,
    drops: [['raw_venison', 1, 2, 1], ['deer_hide', 1, 2, 1]], at: [] },
  boar: { name: 'Inoshishi', hp: 15, speed: 2, run: 6.5, mood: 'neutral', sight: 14, hear: 10, r: 0.5, h: 0.9, mass: 1,
    drops: [['raw_boar', 1, 2, 1], ['leather_scraps', 1, 2, 1], ['boar_tusk', 1, 1, 0.25]],
    at: [{ id: 'gore', dmg: { pierce: 7 }, range: 1.4, arc: 0.7, cd: 1.6, wind: 0.35, dur: 0.8, anim: 'gore', knock: 40 }] },
  gaki: { name: 'Lesser gaki', hp: 22, speed: 2.4, run: 5.4, mood: 'hostile', sight: 22, hear: 16, r: 0.35, h: 1.2, mass: 0.6,
    res: { fire: 1.5 }, drops: [['resin', 1, 1, 0.65]],
    at: [{ id: 'claw', dmg: { slash: 5 }, range: 1.2, arc: 0.8, cd: 1.3, wind: 0.35, dur: 0.75, anim: 'claw', knock: 20 }] },
  kappa: { name: 'Kappa', hp: 12, speed: 2.2, run: 5, mood: 'hostile', sight: 16, hear: 12, r: 0.35, h: 1.0, mass: 0.6, water: true,
    drops: [['cucumber', 1, 1, 0.7], ['kappa_shell', 1, 1, 0.35]],
    at: [{ id: 'bite', dmg: { pierce: 6 }, range: 1.1, arc: 0.7, cd: 1.2, wind: 0.3, dur: 0.6, anim: 'claw', knock: 15 }] },
  gaki_f: { name: 'Gaki', hp: 40, speed: 2.4, run: 5.6, mood: 'hostile', sight: 26, hear: 18, r: 0.4, h: 1.5, mass: 0.8,
    res: { fire: 1.5 }, drops: [['resin', 1, 2, 0.7], ['gaki_eye', 1, 1, 0.5], ['stone', 1, 1, 0.3]],
    at: [{ id: 'claw', dmg: { slash: 10 }, range: 1.4, arc: 0.8, cd: 1.4, wind: 0.4, dur: 0.8, anim: 'claw', knock: 25 },
      { id: 'rock', dmg: { blunt: 8 }, range: 18, min: 5, arc: 0.3, cd: 4, wind: 0.6, dur: 1.0, anim: 'throw', proj: 'rock' }] },
  gaki_brute: { name: 'Gaki brute', hp: 150, speed: 2, run: 4.6, mood: 'hostile', sight: 24, hear: 18, r: 0.65, h: 2.3, mass: 2,
    res: { fire: 1.5 }, drops: [['resin', 2, 3, 1], ['gaki_eye', 1, 2, 1], ['kami_seed', 1, 1, 0.3]],
    at: [{ id: 'smash', dmg: { blunt: 22 }, range: 2.2, arc: 0.9, cd: 2.4, wind: 0.75, dur: 1.4, anim: 'smash', knock: 70, stagger: true }] },
  gaki_shaman: { name: 'Gaki shaman', hp: 60, speed: 2.2, run: 5, mood: 'hostile', sight: 26, hear: 18, r: 0.4, h: 1.4, mass: 0.8, keep: 9,
    res: { fire: 1.5 }, drops: [['resin', 1, 2, 1], ['gaki_eye', 1, 1, 0.7], ['yomogi', 1, 2, 0.6]],
    at: [{ id: 'spit', dmg: { poison: 18 }, range: 16, min: 3, arc: 0.3, cd: 4.5, wind: 0.7, dur: 1.1, anim: 'throw', proj: 'poison' },
      { id: 'heal', heal: 30, range: 12, cd: 9, wind: 0.8, dur: 1.4, anim: 'heal', self: true }] },
  oni: { name: 'Oni', hp: 600, speed: 2.4, run: 6.4, mood: 'hostile', sight: 30, hear: 24, r: 1.1, h: 4.6, mass: 8,
    res: { pierce: 1.5, blunt: 0.8 }, drops: [['oni_hide', 4, 6, 1], ['bone_fragments', 1, 3, 0.5]],
    at: [{ id: 'slam', dmg: { blunt: 60 }, range: 3.6, arc: 0.6, cd: 3, wind: 1.0, dur: 1.8, anim: 'smash', knock: 140, stagger: true, aoe: 2.2 },
      { id: 'sweep', dmg: { blunt: 45 }, range: 3.4, arc: 1.4, cd: 2.6, wind: 0.8, dur: 1.5, anim: 'sweep', knock: 100 },
      { id: 'boulder', dmg: { blunt: 50 }, range: 26, min: 9, arc: 0.3, cd: 9, wind: 1.1, dur: 1.8, anim: 'throw', proj: 'boulder' }] },
  ochimusha: { name: 'Ochimusha', hp: 60, speed: 2.4, run: 5, mood: 'hostile', sight: 24, hear: 16, r: 0.4, h: 1.8, mass: 0.9, undead: true,
    res: { blunt: 1.5, fire: 1.5, pierce: 0.5, slash: 0.9, poison: 0 }, drops: [['bone_fragments', 1, 3, 1]],
    at: [{ id: 'cut', dmg: { slash: 16 }, range: 1.8, arc: 0.8, cd: 1.5, wind: 0.45, dur: 0.9, anim: 'cut', knock: 30 }] },
  ochimusha_archer: { name: 'Ochimusha archer', hp: 50, speed: 2.4, run: 4.8, mood: 'hostile', sight: 30, hear: 16, r: 0.4, h: 1.8, mass: 0.9, undead: true, keep: 12,
    res: { blunt: 1.5, fire: 1.5, pierce: 0.5, slash: 0.9, poison: 0 }, drops: [['bone_fragments', 1, 3, 1], ['arrow_bamboo', 2, 6, 0.6]],
    at: [{ id: 'shoot', dmg: { pierce: 18 }, range: 28, min: 4, arc: 0.2, cd: 3, wind: 1.0, dur: 1.4, anim: 'bow', proj: 'arrow' }] },
  shirokiba: { name: 'Shirokiba', boss: true, hp: 500, speed: 3.4, run: 7, mood: 'hostile', sight: 60, hear: 60, r: 1.5, h: 2.6, mass: 20,
    drops: [['great_tusk', 3, 3, 1], ['shirokiba_trophy', 1, 1, 1]],
    at: [{ id: 'tusks', dmg: { slash: 18, blunt: 12 }, range: 3.4, arc: 0.9, cd: 2.2, wind: 0.6, dur: 1.2, anim: 'gore', knock: 90 },
      { id: 'stomp', dmg: { blunt: 20 }, range: 6, arc: 3.2, cd: 6, wind: 0.9, dur: 1.6, anim: 'stomp', knock: 120, aoe: 6, stagger: true },
      { id: 'charge', dmg: { blunt: 30 }, range: 22, min: 6, arc: 0.4, cd: 9, wind: 0.8, dur: 2.2, anim: 'charge', knock: 160 },
      { id: 'thunder', dmg: { lightning: 24 }, range: 24, min: 4, arc: 0.3, cd: 5, wind: 0.8, dur: 1.3, anim: 'roar', proj: 'thunder' }] },
  osugi: { name: 'Ōsugi', boss: true, hp: 2500, speed: 1.6, run: 2.6, mood: 'hostile', sight: 70, hear: 70, r: 2.2, h: 9, mass: 100,
    res: { fire: 1.5, pierce: 0.5, poison: 0, chop: 1 }, drops: [['sacred_rope', 1, 1, 1], ['osugi_trophy', 1, 1, 1], ['heartwood', 10, 10, 1], ['kami_seed', 2, 4, 1]],
    at: [{ id: 'slam', dmg: { blunt: 55 }, range: 5.5, arc: 0.7, cd: 3, wind: 1.1, dur: 2.0, anim: 'smash', knock: 160, aoe: 3, stagger: true },
      { id: 'roots', dmg: { pierce: 30 }, range: 30, min: 3, arc: 3.2, cd: 7, wind: 0.9, dur: 2.2, anim: 'roar', proj: 'roots' },
      { id: 'vines', dmg: { pierce: 20 }, range: 22, min: 5, arc: 0.3, cd: 6, wind: 0.8, dur: 1.4, anim: 'throw', proj: 'vine' },
      { id: 'summon', range: 40, cd: 22, wind: 1.2, dur: 2.0, anim: 'roar', summon: 'root' }] },
  root: { name: 'Grasping root', hp: 40, speed: 0, run: 0, mood: 'hostile', sight: 20, hear: 20, r: 0.4, h: 2.2, mass: 99, fixed: true, res: { fire: 2, pierce: 0.5 },
    drops: [['wood', 1, 2, 0.6]],
    at: [{ id: 'whip', dmg: { blunt: 14 }, range: 4, arc: 3.2, cd: 2.8, wind: 0.6, dur: 1.0, anim: 'smash', knock: 60 }] },
};

// ---------- hints from Yatagarasu ----------
const HINTS = {
  arrive: 'Caw! You have died, wanderer, and I have carried you to Tokoyo, the eternal land. Its kami have grown wild. Calm them, and you may yet be reborn. Start by gathering: branches, stones, flint.',
  wood: 'Wood and stone make a hammer. Open your inventory with Tab to craft one by hand.',
  hammer: 'With the hammer in hand, press right mouse for the build menu. A workbench lets you build and craft much more.',
  workbench: 'A workbench needs a roof over it before it will work. Build walls, a thatch roof, and a fire to rest by.',
  night: 'Night falls. The gaki wander more boldly in the dark. Stay by a fire or keep a torch close.',
  rested: 'Sit by a fire beneath a roof and you will become Rested: your stamina recovers faster and you learn more quickly.',
  tusk: 'A boar tusk! The white boar god Shirokiba answers an offering of two at its shrine. Look for an ema plaque to find the way.',
  boss1: 'Shirokiba is calmed. Its great tusk can split the rock and ore of the cedar forest. Carry its trophy back to the spirit shrine.',
  forest: 'The cedar forest is darker and more dangerous. Oni walk here. Copper sleeps in the great rocks; tin lies along its shores.',
  copper: 'Copper ore. Build a charcoal kiln and a tatara furnace. The tatara needs hi-no-tama, sleeping spirit flames kept in the haunted shrines.',
  wet: 'You are wet. Rain soaks you through, and healing comes slowly. A mino raincoat keeps the rain off.',
  death: 'Death is not the end here. Your belongings lie in your grave marker. Go back and claim them.',
  seed: 'A kami seed. Three will wake the elder cedar, Ōsugi, in its grove across the water. You will need a raft.',
  raft: 'A raft can be built on the water with your hammer. Press E at its stern to steer, W and S to set the sail.',
  boss2: 'Ōsugi bows its crown. The forest is calm again. The mist beyond is still thick, but you have proven yourself. Rest now, or keep building. Tokoyo is yours.',
};
