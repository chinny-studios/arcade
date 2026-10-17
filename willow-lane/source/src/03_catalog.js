// Willow Lane — the buy-mode catalog. Footprint w×d is in tiles; the object's front faces local +z.
// seats: sit spots {x, z, h, a} in local tile units (a = facing in local radians, 0 = toward the front)
// beds:  lie spots {x, z} along local z with the head toward -z
// stats: shown as bars in the catalog (0..10). room: how much the object lifts the room score.
// acts:  interaction ids (see 10_actions.js). wall: hangs on a wall behind it. noblock: sims walk over it.

const CATS = [
  { id: 'seating', label: 'Seating', icon: '🪑' }, { id: 'beds', label: 'Beds', icon: '🛏️' }, { id: 'surfaces', label: 'Surfaces', icon: '🍽️' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳' }, { id: 'bath', label: 'Bathroom', icon: '🛁' }, { id: 'electronics', label: 'Electronics', icon: '📺' },
  { id: 'hobbies', label: 'Hobbies & Skills', icon: '🎨' }, { id: 'kids', label: 'Kids', icon: '🧸' }, { id: 'decor', label: 'Decor', icon: '🖼️' },
  { id: 'lighting', label: 'Lighting', icon: '💡' }, { id: 'outdoor', label: 'Outdoor', icon: '🌳' },
];

const CATALOG = [
  // seating
  { id: 'chair', name: 'Bentwood Dining Chair', cat: 'seating', price: 80, w: 1, d: 1, room: 0, stats: { comfort: 2 },
    desc: 'A sturdy chair for the dinner table. Sims eat sitting down when a chair faces a table.', seats: [{ x: 0, z: 0, h: 0.46, a: 0 }], acts: ['sit'] },
  { id: 'chair_modern', name: 'Molded Café Chair', cat: 'seating', price: 160, w: 1, d: 1, room: 1, stats: { comfort: 3, room: 1 },
    desc: 'Bright plastic curves and steel legs. Very Scandinavian, says the label.', seats: [{ x: 0, z: 0, h: 0.46, a: 0 }], acts: ['sit'] },
  { id: 'armchair', name: 'Plush Armchair', cat: 'seating', price: 320, w: 1, d: 1, room: 1, stats: { comfort: 6, room: 1 },
    desc: 'Overstuffed and forgiving. A favourite of lazy sims and their naps.', seats: [{ x: 0, z: 0.05, h: 0.42, a: 0 }], acts: ['sit'] },
  { id: 'loveseat', name: 'Corduroy Loveseat', cat: 'seating', price: 480, w: 2, d: 1, room: 1, stats: { comfort: 6, room: 1 },
    desc: 'Room for two, if they are friendly.', seats: [{ x: -0.5, z: 0.05, h: 0.42, a: 0 }, { x: 0.5, z: 0.05, h: 0.42, a: 0 }], beds: [{ x: 0, z: 0, nap: true }], acts: ['sit', 'nap'] },
  { id: 'sofa', name: 'Cloud Nine Sofa', cat: 'seating', price: 1100, w: 3, d: 1, room: 2, stats: { comfort: 9, room: 2 },
    desc: 'Deep cushions, three seats and a nap waiting to happen.', seats: [{ x: -1, z: 0.05, h: 0.42, a: 0 }, { x: 0, z: 0.05, h: 0.42, a: 0 }, { x: 1, z: 0.05, h: 0.42, a: 0 }], beds: [{ x: 0, z: 0, nap: true }], acts: ['sit', 'nap'] },
  { id: 'bench', name: 'Park Bench', cat: 'outdoor', price: 150, w: 2, d: 1, room: 1, stats: { comfort: 3, room: 1 },
    desc: 'Slatted wood and cast iron, for watching the lane go by.', seats: [{ x: -0.5, z: 0, h: 0.44, a: 0 }, { x: 0.5, z: 0, h: 0.44, a: 0 }], acts: ['sit'] },

  // beds
  { id: 'bed_single', name: 'Maple Twin Bed', cat: 'beds', price: 350, w: 1, d: 2, room: 0, stats: { energy: 6, comfort: 5 },
    desc: 'A simple bed for one. Good enough for most nights.', beds: [{ x: 0, z: 0 }], acts: ['sleep', 'nap'] },
  { id: 'bed_double', name: 'Snoozeland Double Bed', cat: 'beds', price: 1200, w: 2, d: 2, room: 2, stats: { energy: 8, comfort: 7, room: 2 },
    desc: 'Plenty of room for two. Couples can cuddle here, or try for a baby.', beds: [{ x: -0.5, z: 0 }, { x: 0.5, z: 0 }], acts: ['sleep', 'nap', 'tryBaby', 'cuddle'] },
  { id: 'bed_kids', name: 'Rocket Ship Kids Bed', cat: 'kids', price: 450, w: 1, d: 2, room: 2, stats: { energy: 7, comfort: 5, room: 2, fun: 1 },
    desc: 'Blast off to dreamland. Fits children and teens.', beds: [{ x: 0, z: 0 }], acts: ['sleep', 'nap'], kidsOnly: true },
  { id: 'crib', name: 'Wicker Bassinet', cat: 'kids', price: 250, w: 1, d: 1, room: 1, stats: { room: 1 },
    desc: 'Where the newest member of the family sleeps, eats and cries. Babies need feeding, playing and changing.', acts: ['babyFeed', 'babyPlay', 'babyChange', 'babySing'] },

  // surfaces
  { id: 'counter', name: 'Butcher Block Counter', cat: 'kitchen', price: 160, w: 1, d: 1, room: 0, surface: 0.9, stats: {},
    desc: 'Every kitchen needs somewhere to chop. Sims prepare food on counters before cooking.', acts: [] },
  { id: 'counter_marble', name: 'Marble Counter', cat: 'kitchen', price: 450, w: 1, d: 1, room: 1, surface: 0.9, stats: { room: 1 },
    desc: 'Cool white stone. Neat sims swoon.', acts: [] },
  { id: 'table', name: 'Farmhouse Dining Table', cat: 'surfaces', price: 350, w: 2, d: 1, room: 1, surface: 0.76, stats: { room: 1 },
    desc: 'Pull up some chairs: sims eat sitting at a table when a chair faces it.', acts: [] },
  { id: 'table_round', name: 'Bistro Table', cat: 'surfaces', price: 180, w: 1, d: 1, room: 0, surface: 0.76, stats: {},
    desc: 'A small round table for two.', acts: [] },
  { id: 'coffee_table', name: 'Low Coffee Table', cat: 'surfaces', price: 140, w: 2, d: 1, room: 1, surface: 0.42, stats: { room: 1 },
    desc: 'Somewhere to put your feet up. Sims on the sofa put their plates here.', acts: [] },
  { id: 'end_table', name: 'End Table', cat: 'surfaces', price: 70, w: 1, d: 1, room: 0, surface: 0.6, stats: {},
    desc: 'Small, square and dependable.', acts: [] },
  { id: 'desk', name: 'Study Desk', cat: 'surfaces', price: 260, w: 1, d: 2, room: 0, stats: { fun: 0 }, seats: [{ x: 0, z: 0.5, h: 0.46, a: Math.PI, desk: true }],
    desc: 'A desk with its own chair. Children do their homework here, and anyone can sit and write.', acts: ['homework', 'write'] },

  // kitchen
  { id: 'fridge', name: 'Frostline Fridge', cat: 'kitchen', price: 650, w: 1, d: 1, room: 0, stats: { hunger: 6 },
    desc: 'Snacks, quick meals and the start of every home-cooked dinner. Cooking a meal also needs a stove.', acts: ['snack', 'quickMeal', 'cookMeal', 'bakeCake'] },
  { id: 'stove', name: 'Range Stove', cat: 'kitchen', price: 550, w: 1, d: 1, room: 0, surface: 0.92, stats: { hunger: 3 },
    desc: 'Four burners and an oven. Unskilled cooks sometimes set it on fire.', acts: ['repair', 'clean'], breaks: 0.01 },
  { id: 'ksink', name: 'Kitchen Sink', cat: 'kitchen', price: 280, w: 1, d: 1, room: 0, surface: 0.9, stats: { hygiene: 1 },
    desc: 'Wash the dishes and your hands. Dirty plates go here.', acts: ['washHands', 'washDishes'] },
  { id: 'trash', name: 'Pedal Bin', cat: 'kitchen', price: 50, w: 1, d: 1, room: 0, stats: {},
    desc: 'Leftovers and dirty plates. Empty it into the garbage bin outside before it starts to smell.', acts: ['emptyTrash'] },

  // bathroom
  { id: 'toilet', name: 'Porcelain Toilet', cat: 'bath', price: 350, w: 1, d: 1, room: 0, stats: { bladder: 10, comfort: 2 },
    desc: 'Self-explanatory. Clogs now and then.', seats: [{ x: 0, z: 0.05, h: 0.44, a: 0 }], acts: ['useToilet', 'clean', 'unclog'], breaks: 0.02 },
  { id: 'shower', name: 'Glass Shower', cat: 'bath', price: 700, w: 1, d: 1, room: 1, stats: { hygiene: 7, room: 1 },
    desc: 'Hot water, good pressure. Neat sims leave fewer puddles.', acts: ['shower', 'clean', 'repair'], breaks: 0.015 },
  { id: 'tub', name: 'Clawfoot Bathtub', cat: 'bath', price: 950, w: 1, d: 2, room: 2, stats: { hygiene: 8, comfort: 4, room: 2 },
    desc: 'A long soak is good for the body and better for the mood.', acts: ['bath', 'clean'] },
  { id: 'sink', name: 'Pedestal Sink', cat: 'bath', price: 180, w: 1, d: 1, room: 0, stats: { hygiene: 2 },
    desc: 'Wash your hands. Please.', acts: ['washHands'] },

  // electronics
  { id: 'tv', name: 'Tubeview Television', cat: 'electronics', price: 500, w: 1, d: 1, room: 0, stats: { fun: 4 },
    desc: 'Cooking shows, romance, action and the weather. Sims watch from a seat facing the screen.', acts: ['watchTV'], breaks: 0.01, light: 0x8ab8ff },
  { id: 'tv_big', name: 'Widescreen TV', cat: 'electronics', price: 2600, w: 2, d: 1, room: 2, stats: { fun: 8, room: 2 },
    desc: 'Bigger is better. Everyone wants to watch.', acts: ['watchTV'], breaks: 0.006, light: 0x8ab8ff },
  { id: 'computer', name: 'Home Computer', cat: 'electronics', price: 1200, w: 1, d: 2, room: 0, stats: { fun: 6 }, seats: [{ x: 0, z: 0.5, h: 0.46, a: Math.PI, desk: true }],
    desc: 'Play games, chat with friends online, look for a job or write a novel. Kids do homework here too.', acts: ['playGames', 'chatOnline', 'findJob', 'writeNovel', 'homework'], breaks: 0.01 },
  { id: 'stereo', name: 'Boombox Stereo', cat: 'electronics', price: 300, w: 1, d: 1, room: 0, stats: { fun: 4 },
    desc: 'Put on a record and dance. Others will join in.', acts: ['dance', 'stereoOff'] },
  { id: 'phone', name: 'Wall Phone', cat: 'electronics', price: 60, w: 1, d: 1, room: 0, wall: true, noblock: true, stats: { social: 2 },
    desc: 'Call friends, invite them over, order a pizza or ask about adoption.', acts: ['callFriend', 'invite', 'party', 'pizza', 'adopt'] },

  // hobbies & skills
  { id: 'bookshelf', name: 'Oak Bookcase', cat: 'hobbies', price: 280, w: 1, d: 1, room: 1, stats: { fun: 2, room: 1 },
    desc: 'Read for fun, or study cooking and mechanics from the manuals on the bottom shelf.', acts: ['read', 'studyCooking', 'studyMechanical'] },
  { id: 'mirror', name: 'Oval Wall Mirror', cat: 'hobbies', price: 150, w: 1, d: 1, room: 1, wall: true, noblock: true, stats: { room: 1 },
    desc: 'Practise speeches to build charisma.', acts: ['practiceSpeech'] },
  { id: 'gym', name: 'Weight Bench', cat: 'hobbies', price: 700, w: 1, d: 2, room: 0, stats: { fun: 2 }, beds: [{ x: 0, z: 0.1, bench: true }],
    desc: 'Builds body skill. Leaves sims hungry and sweaty.', acts: ['workout'] },
  { id: 'chess', name: 'Chess Table', cat: 'hobbies', price: 500, w: 3, d: 1, room: 1, stats: { fun: 4, room: 1 },
    seats: [{ x: -1, z: 0, h: 0.46, a: Math.PI / 2 }, { x: 1, z: 0, h: 0.46, a: -Math.PI / 2 }],
    desc: 'Builds logic. Two sims can play each other.', acts: ['chess'] },
  { id: 'easel', name: 'Artist Easel', cat: 'hobbies', price: 350, w: 1, d: 1, room: 0, stats: { fun: 3 },
    desc: 'Builds creativity. Skilled painters sell their canvases.', acts: ['paint'] },
  { id: 'piano', name: 'Upright Piano', cat: 'hobbies', price: 3000, w: 2, d: 1, room: 3, stats: { fun: 6, room: 3 }, seats: [{ x: 0, z: 0.75, h: 0.48, a: Math.PI, stool: true }],
    desc: 'Builds creativity. Good players draw a crowd.', acts: ['piano'] },
  { id: 'telescope', name: 'Brass Telescope', cat: 'hobbies', price: 600, w: 1, d: 1, room: 1, stats: { fun: 3, room: 1 },
    desc: 'Builds logic. Best at night under a clear sky.', acts: ['stargaze'] },
  { id: 'aquarium', name: 'Tropical Aquarium', cat: 'decor', price: 450, w: 2, d: 1, room: 3, stats: { fun: 2, room: 3 },
    desc: 'Bubbling, glowing and calming. Feed the fish now and then.', acts: ['watchFish', 'feedFish'], light: 0x60c8ff },

  // kids
  { id: 'toybox', name: 'Toy Chest', cat: 'kids', price: 90, w: 1, d: 1, room: 0, stats: { fun: 4 },
    desc: 'Blocks, cars and a plush rabbit with one ear.', acts: ['playToys'] },
  { id: 'dollhouse', name: 'Doll House', cat: 'kids', price: 220, w: 1, d: 1, room: 1, stats: { fun: 5, room: 1 },
    desc: 'A tiny house with tiny furniture. Builds creativity.', acts: ['playDollhouse'] },

  // decor
  { id: 'plant', name: 'Potted Fern', cat: 'decor', price: 70, w: 1, d: 1, room: 1, stats: { room: 1 },
    desc: 'Water it or watch it wilt.', acts: ['water'], plant: true },
  { id: 'plant_big', name: 'Fiddle-Leaf Fig', cat: 'decor', price: 180, w: 1, d: 1, room: 2, stats: { room: 2 },
    desc: 'Tall, glossy and a little dramatic.', acts: ['water'], plant: true },
  { id: 'painting_a', name: 'Seaside Watercolour', cat: 'decor', price: 120, w: 1, d: 1, room: 1, wall: true, noblock: true, stats: { room: 1 },
    desc: 'Someone, somewhere, painted a boat.', acts: [] },
  { id: 'painting_b', name: 'Abstract in Orange', cat: 'decor', price: 450, w: 1, d: 1, room: 3, wall: true, noblock: true, stats: { room: 3 },
    desc: 'Bold shapes. Visitors pretend to understand it.', acts: [] },
  { id: 'painting_c', name: 'Portrait of a Dog', cat: 'decor', price: 1400, w: 1, d: 1, room: 5, wall: true, noblock: true, stats: { room: 5 },
    desc: 'An oil portrait of a very good boy in a gilt frame.', acts: [] },
  { id: 'rug', name: 'Woven Rug', cat: 'decor', price: 220, w: 2, d: 2, room: 2, noblock: true, flat: true, stats: { room: 2 },
    desc: 'Ties the room together. Furniture can stand on it.', acts: [] },
  { id: 'dresser', name: 'Six-Drawer Dresser', cat: 'decor', price: 300, w: 1, d: 1, room: 1, stats: { room: 1 },
    desc: 'Change clothes and hairstyle.', acts: ['changeLook'] },

  // lighting
  { id: 'lamp_floor', name: 'Arc Floor Lamp', cat: 'lighting', price: 110, w: 1, d: 1, room: 1, lamp: 1, stats: { room: 1 },
    desc: 'Lights up a dark room. Rooms without light feel gloomy at night.', acts: [] },
  { id: 'lamp_table', name: 'Lamp on a Side Table', cat: 'lighting', price: 90, w: 1, d: 1, room: 1, lamp: 1, surface: 0.6, stats: { room: 1 },
    desc: 'A small table with a warm lamp on it.', acts: [] },
  { id: 'lamp_wall', name: 'Brass Wall Sconce', cat: 'lighting', price: 80, w: 1, d: 1, room: 1, lamp: 1, wall: true, noblock: true, stats: { room: 1 },
    desc: 'Mounted on a wall, out of the way.', acts: [] },

  // outdoor
  { id: 'tree', name: 'Oak Tree', cat: 'outdoor', price: 300, w: 1, d: 1, room: 2, outdoorOnly: true, stats: { room: 2 },
    desc: 'Shade, birdsong and leaves in autumn.', acts: [] },
  { id: 'shrub', name: 'Boxwood Shrub', cat: 'outdoor', price: 60, w: 1, d: 1, room: 1, stats: { room: 1 },
    desc: 'Clipped into a tidy ball.', acts: [] },
  { id: 'flowers', name: 'Flower Bed', cat: 'outdoor', price: 90, w: 1, d: 1, room: 2, noblock: true, flat: true, stats: { room: 2 },
    desc: 'Tulips and marigolds. Water them now and then.', acts: ['water'], plant: true },
  { id: 'flamingo', name: 'Lawn Flamingo', cat: 'outdoor', price: 15, w: 1, d: 1, room: 1, noblock: true, stats: { room: 1 },
    desc: 'Pink, plastic and absolutely essential.', acts: [] },
  { id: 'swing', name: 'Swing Set', cat: 'outdoor', price: 450, w: 2, d: 1, room: 1, outdoorOnly: true, stats: { fun: 6, room: 1 },
    desc: 'Kids love it. So do some grown-ups.', acts: ['swing'] },
  { id: 'mailbox', name: 'Mailbox', cat: 'outdoor', price: 40, w: 1, d: 1, room: 0, fixed: true, stats: {},
    desc: 'Bills and the job pages arrive here.', acts: ['payBills', 'jobAds'] },
  { id: 'garbage', name: 'Garbage Bin', cat: 'outdoor', price: 60, w: 1, d: 1, room: 0, fixed: true, stats: {},
    desc: 'Where the household trash goes.', acts: [] },
  { id: 'urn', name: 'Memorial Stone', cat: 'outdoor', price: 5, w: 1, d: 1, room: 0, hidden: true, stats: {},
    desc: 'In loving memory.', acts: ['mourn'] },
];
const CAT = Object.fromEntries(CATALOG.map((c) => [c.id, c]));
