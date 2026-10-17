// Willow Lane — static data: needs, personality, skills, interests, star signs, careers, names, looks, moodlets

// ---------- needs ----------
// decay is points lost per game hour (0..100 scale). weight feeds the mood; urgency is the autonomy curve exponent.
const NEEDS = [
  { id: 'hunger', label: 'Hunger', icon: '🍔', decay: 5.2, weight: 1.4, urgency: 2.6 },
  { id: 'comfort', label: 'Comfort', icon: '🛋️', decay: 5, weight: 0.8, urgency: 1.6 },
  { id: 'hygiene', label: 'Hygiene', icon: '🧼', decay: 3.6, weight: 1, urgency: 2 },
  { id: 'bladder', label: 'Bladder', icon: '🚽', decay: 8.5, weight: 1.1, urgency: 3.2 },
  { id: 'energy', label: 'Energy', icon: '💤', decay: 5.4, weight: 1.3, urgency: 2.6 },
  { id: 'fun', label: 'Fun', icon: '🎈', decay: 4.6, weight: 1, urgency: 2.1 },
  { id: 'social', label: 'Social', icon: '💬', decay: 3.6, weight: 1, urgency: 2 },
  { id: 'room', label: 'Room', icon: '🖼️', decay: 0, weight: 0.8, urgency: 1.4 },
];
const NEED = Object.fromEntries(NEEDS.map((n) => [n.id, n]));

// ---------- personality (Neat, Outgoing, Active, Playful, Nice), 0..10 each, 25 points for adults ----------
const TRAITS = [
  { id: 'neat', lo: 'Sloppy', hi: 'Neat', icon: '🧹', tip: 'Neat sims tidy up and mind a messy room. Sloppy ones leave plates everywhere.' },
  { id: 'outgoing', lo: 'Shy', hi: 'Outgoing', icon: '🎉', tip: 'Outgoing sims need company more often and make friends quicker.' },
  { id: 'active', lo: 'Lazy', hi: 'Active', icon: '🏃', tip: 'Active sims like to work out and dance. Lazy ones love the sofa.' },
  { id: 'playful', lo: 'Serious', hi: 'Playful', icon: '🃏', tip: 'Playful sims get bored faster and love games, jokes and tickling. Serious sims like books and chess.' },
  { id: 'nice', lo: 'Grouchy', hi: 'Nice', icon: '😊', tip: 'Nice sims are kind and forgiving. Grouchy ones insult, tease and pick fights.' },
];
const TRAIT_POINTS = 25;

// ---------- skills ----------
const SKILLS = [
  { id: 'cooking', label: 'Cooking', icon: '🍳' },
  { id: 'mechanical', label: 'Mechanical', icon: '🔧' },
  { id: 'charisma', label: 'Charisma', icon: '🗣️' },
  { id: 'body', label: 'Body', icon: '💪' },
  { id: 'logic', label: 'Logic', icon: '🧠' },
  { id: 'creativity', label: 'Creativity', icon: '🎨' },
];
const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
// game minutes of practice needed to go from level L to L+1
const skillNeed = (L) => 70 + L * 34;

// ---------- interests (conversation topics) ----------
const INTERESTS = [
  { id: 'sports', label: 'Sports', icon: '⚽' }, { id: 'food', label: 'Food', icon: '🍕' }, { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'fashion', label: 'Fashion', icon: '👗' }, { id: 'travel', label: 'Travel', icon: '✈️' }, { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'nature', label: 'Nature', icon: '🌿' }, { id: 'movies', label: 'Movies', icon: '🎬' }, { id: 'politics', label: 'Politics', icon: '🏛️' },
  { id: 'art', label: 'Art', icon: '🖌️' }, { id: 'science', label: 'Science', icon: '🔬' }, { id: 'animals', label: 'Animals', icon: '🐶' },
  { id: 'weather', label: 'Weather', icon: '⛅' }, { id: 'money', label: 'Money', icon: '💰' }, { id: 'spooky', label: 'Ghosts', icon: '👻' },
];
const INTEREST = Object.fromEntries(INTERESTS.map((i) => [i.id, i]));

// ---------- star signs: the sign whose ideal point spread is closest to the personality ----------
// p = [neat, outgoing, active, playful, nice]
const SIGNS = [
  { id: 'aries', label: 'Aries', icon: '♈', p: [5, 8, 6, 3, 3] },
  { id: 'taurus', label: 'Taurus', icon: '♉', p: [5, 5, 3, 3, 9] },
  { id: 'gemini', label: 'Gemini', icon: '♊', p: [4, 7, 8, 3, 3] },
  { id: 'cancer', label: 'Cancer', icon: '♋', p: [6, 3, 6, 4, 6] },
  { id: 'leo', label: 'Leo', icon: '♌', p: [4, 10, 4, 4, 3] },
  { id: 'virgo', label: 'Virgo', icon: '♍', p: [9, 2, 6, 4, 4] },
  { id: 'libra', label: 'Libra', icon: '♎', p: [2, 8, 2, 7, 6] },
  { id: 'scorpio', label: 'Scorpio', icon: '♏', p: [6, 5, 8, 3, 3] },
  { id: 'sagittarius', label: 'Sagittarius', icon: '♐', p: [2, 3, 9, 7, 4] },
  { id: 'capricorn', label: 'Capricorn', icon: '♑', p: [7, 4, 2, 8, 4] },
  { id: 'aquarius', label: 'Aquarius', icon: '♒', p: [4, 4, 4, 9, 4] },
  { id: 'pisces', label: 'Pisces', icon: '♓', p: [5, 3, 3, 7, 7] },
];
// pairs that get along (+) or clash (-): a small bonus or malus on every friendly interaction
const SIGN_LIKE = { aries: ['gemini', 'taurus'], taurus: ['aries', 'libra'], gemini: ['pisces', 'capricorn'], cancer: ['taurus', 'scorpio'],
  leo: ['sagittarius', 'cancer'], virgo: ['aquarius', 'sagittarius'], libra: ['virgo', 'cancer'], scorpio: ['pisces', 'leo'],
  sagittarius: ['aries', 'pisces'], capricorn: ['leo', 'aquarius'], aquarius: ['libra', 'virgo'], pisces: ['scorpio', 'gemini'] };
const SIGN_DISLIKE = { aries: ['cancer', 'libra'], taurus: ['virgo', 'gemini'], gemini: ['scorpio', 'leo'], cancer: ['aries', 'gemini'],
  leo: ['taurus', 'scorpio'], virgo: ['aries', 'pisces'], libra: ['capricorn', 'aries'], scorpio: ['virgo', 'aquarius'],
  sagittarius: ['taurus', 'virgo'], capricorn: ['sagittarius', 'cancer'], aquarius: ['taurus', 'cancer'], pisces: ['libra', 'leo'] };
function signFor(p) {
  const v = [p.neat, p.outgoing, p.active, p.playful, p.nice];
  let best = SIGNS[0], bd = 1e9;
  for (const s of SIGNS) { let d = 0; for (let i = 0; i < 5; i++) d += (s.p[i] - v[i]) ** 2; if (d < bd) { bd = d; best = s; } }
  return best.id;
}
const SIGN = Object.fromEntries(SIGNS.map((s) => [s.id, s]));

// ---------- ages ----------
// days: lifespan of each stage at 'normal'. scale is the body size.
const AGES = {
  baby: { label: 'Baby', days: 3, scale: 0.36, next: 'child' },
  child: { label: 'Child', days: 7, scale: 0.64, next: 'teen' },
  teen: { label: 'Teen', days: 7, scale: 0.92, next: 'adult' },
  adult: { label: 'Adult', days: 20, scale: 1, next: 'elder' },
  elder: { label: 'Elder', days: 9, scale: 0.97, next: null },
};
const LIFESPAN = { short: 0.5, normal: 1, long: 2 };
const isGrown = (s) => s.age === 'adult' || s.age === 'elder';
const romanceGroup = (s) => (s.age === 'teen' ? 'teen' : isGrown(s) ? 'adult' : null);

// ---------- careers ----------
// Each level: [title, pay per day, start hour, hours, requirements {skill: level}, friends needed]
const CAREERS = [
  { id: 'culinary', label: 'Culinary', icon: '🍳', car: 0xd94a3a, levels: [
    ['Dishwasher', 140, 9, 6, {}, 0], ['Fast Food Cook', 190, 9, 6, { cooking: 1 }, 0], ['Line Cook', 260, 10, 7, { cooking: 2 }, 0],
    ['Sous Chef', 350, 11, 7, { cooking: 3, charisma: 1 }, 1], ['Pastry Chef', 450, 11, 7, { cooking: 5, creativity: 2 }, 2],
    ['Head Chef', 580, 12, 7, { cooking: 6, creativity: 3, charisma: 2 }, 3], ['Restaurateur', 760, 12, 7, { cooking: 8, creativity: 5, charisma: 4 }, 4],
    ['Celebrity Chef', 1050, 13, 6, { cooking: 10, creativity: 6, charisma: 6 }, 6]] },
  { id: 'business', label: 'Business', icon: '💼', car: 0x2a4a8a, levels: [
    ['Mailroom Clerk', 130, 9, 8, {}, 0], ['Office Assistant', 180, 9, 8, { charisma: 1 }, 0], ['Junior Executive', 250, 9, 8, { logic: 1, charisma: 2 }, 1],
    ['Account Manager', 340, 9, 8, { logic: 2, charisma: 3 }, 2], ['Department Head', 460, 9, 8, { logic: 3, charisma: 4 }, 3],
    ['Vice President', 620, 9, 8, { logic: 5, charisma: 6 }, 4], ['CEO', 820, 9, 7, { logic: 7, charisma: 7 }, 6],
    ['Business Tycoon', 1100, 10, 5, { logic: 9, charisma: 9 }, 8]] },
  { id: 'science', label: 'Science', icon: '🔬', car: 0x2a9a8a, levels: [
    ['Lab Assistant', 150, 8, 7, {}, 0], ['Research Tech', 200, 8, 7, { logic: 1 }, 0], ['Junior Scientist', 280, 8, 7, { logic: 2, mechanical: 1 }, 0],
    ['Project Lead', 370, 9, 7, { logic: 3, mechanical: 2 }, 1], ['Senior Researcher', 480, 9, 7, { logic: 5, mechanical: 3, creativity: 1 }, 2],
    ['Inventor', 620, 10, 6, { logic: 6, mechanical: 5, creativity: 3 }, 3], ['Chief Scientist', 800, 10, 6, { logic: 8, mechanical: 6, creativity: 4 }, 4],
    ['Nobel Laureate', 1080, 11, 5, { logic: 10, mechanical: 7, creativity: 6 }, 5]] },
  { id: 'arts', label: 'Arts', icon: '🎨', car: 0x9a4ac8, levels: [
    ['Street Sketcher', 110, 10, 5, {}, 0], ['Gallery Intern', 160, 10, 6, { creativity: 1 }, 0], ['Illustrator', 230, 11, 6, { creativity: 2 }, 1],
    ['Studio Artist', 320, 11, 6, { creativity: 3, charisma: 1 }, 2], ['Exhibited Painter', 440, 12, 6, { creativity: 5, charisma: 2 }, 3],
    ['Art Director', 590, 12, 6, { creativity: 6, charisma: 4, logic: 2 }, 4], ['Acclaimed Artist', 780, 14, 5, { creativity: 8, charisma: 5 }, 6],
    ['Living Legend', 1150, 15, 4, { creativity: 10, charisma: 7 }, 8]] },
  { id: 'athletics', label: 'Athletics', icon: '🏅', car: 0xe08a20, levels: [
    ['Team Mascot', 150, 8, 6, {}, 0], ['Minor Leaguer', 210, 8, 6, { body: 1 }, 0], ['Rookie', 290, 8, 6, { body: 3 }, 1],
    ['Starter', 380, 9, 6, { body: 4, charisma: 1 }, 2], ['All-Star', 500, 9, 6, { body: 6, charisma: 2 }, 3],
    ['MVP', 650, 10, 6, { body: 7, charisma: 4 }, 4], ['Team Captain', 820, 10, 5, { body: 8, charisma: 5, logic: 2 }, 6],
    ['Hall of Famer', 1120, 11, 4, { body: 10, charisma: 7 }, 7]] },
  { id: 'law', label: 'Law Enforcement', icon: '🚓', car: 0x203a5a, levels: [
    ['Security Guard', 160, 20, 8, {}, 0], ['Cadet', 210, 9, 7, { body: 1 }, 0], ['Patrol Officer', 280, 9, 7, { body: 2, logic: 1 }, 1],
    ['Detective', 370, 9, 7, { body: 3, logic: 3 }, 1], ['Sergeant', 470, 9, 7, { body: 4, logic: 4, mechanical: 2 }, 2],
    ['Lieutenant', 600, 9, 7, { body: 5, logic: 5, mechanical: 3, charisma: 3 }, 3], ['Captain', 760, 10, 6, { body: 7, logic: 6, mechanical: 4, charisma: 5 }, 4],
    ['Police Chief', 1000, 10, 6, { body: 8, logic: 8, mechanical: 5, charisma: 7 }, 5]] },
];
const CAREER = Object.fromEntries(CAREERS.map((c) => [c.id, c]));
const careerLevel = (job) => { const L = CAREER[job.track].levels[job.level]; return { title: L[0], pay: L[1], start: L[2], hours: L[3], req: L[4], friends: L[5] }; };
const SCHOOL = { start: 8, hours: 7, bus: 7 }; // weekdays; the bus comes an hour early
const GRADES = ['F', 'D−', 'D', 'D+', 'C−', 'C', 'C+', 'B−', 'B', 'B+', 'A−', 'A', 'A+'];

// ---------- names ----------
const NAMES_F = ['Ada', 'Bea', 'Clara', 'Dina', 'Eve', 'Freya', 'Greta', 'Hana', 'Iris', 'June', 'Kira', 'Lena', 'Mara', 'Nell', 'Olive',
  'Pia', 'Rosa', 'Sasha', 'Tess', 'Uma', 'Vera', 'Wren', 'Yara', 'Zoe', 'Maya', 'Lucia', 'Noor', 'Amara', 'Esme', 'Priya', 'Mei', 'Ines'];
const NAMES_M = ['Abe', 'Ben', 'Cal', 'Dev', 'Eli', 'Finn', 'Gus', 'Hugo', 'Ivan', 'Jude', 'Kofi', 'Leo', 'Milo', 'Nico', 'Otto',
  'Paolo', 'Rafi', 'Sam', 'Theo', 'Vic', 'Wes', 'Yusuf', 'Zeke', 'Omar', 'Ravi', 'Kenji', 'Mateo', 'Arlo', 'Tomas', 'Idris', 'Bram', 'Luca'];
const NAMES_X = ['Alex', 'Ash', 'Blair', 'Charlie', 'Dakota', 'Ellis', 'Emery', 'Frankie', 'Jamie', 'Jessie', 'Jordan', 'Kai', 'Kit',
  'Lane', 'Morgan', 'Noel', 'Quinn', 'Reese', 'Riley', 'Robin', 'Rowan', 'Sage', 'Sky', 'Tatum', 'River', 'Remy'];
const SURNAMES = ['Alder', 'Birch', 'Calloway', 'Dunmore', 'Ellery', 'Fairweather', 'Goodwin', 'Hartley', 'Ingram', 'Jansen', 'Kowalski',
  'Lindqvist', 'Moreau', 'Nakamura', 'Okafor', 'Pemberton', 'Quill', 'Ramirez', 'Sorensen', 'Thistle', 'Underhill', 'Vance', 'Whitlock',
  'Yamada', 'Zielinski', 'Abara', 'Bellweather', 'Castellano', 'Delacroix', 'Featherstone', 'Mbeki', 'Novak', 'Osei', 'Patel', 'Rossi', 'Haddad'];

// ---------- looks ----------
const SKINS = [0xfbe0cc, 0xf3cfb3, 0xe8b48f, 0xd49a6a, 0xb97a4e, 0x9a5f38, 0x7a4a2a, 0x583420];
const HAIR_COLORS = [0x1a1410, 0x3b2416, 0x6a4022, 0x9a6234, 0xc89048, 0xe8c878, 0xb04a26, 0x8a8a8a, 0xe8e4dc, 0x5a3a8a, 0x2a6aa8, 0xd8508a];
const HAIRS = [
  { id: 'short', label: 'Short crop' }, { id: 'buzz', label: 'Buzz cut' }, { id: 'side', label: 'Side part' }, { id: 'bob', label: 'Bob' },
  { id: 'long', label: 'Long' }, { id: 'pony', label: 'Ponytail' }, { id: 'bun', label: 'Top bun' }, { id: 'curly', label: 'Curls' },
  { id: 'afro', label: 'Afro' }, { id: 'mohawk', label: 'Mohawk' }, { id: 'pigtails', label: 'Pigtails' }, { id: 'bald', label: 'Bald' },
];
const CLOTH_COLORS = [0xe8e4dc, 0x2a2e38, 0xc83a3a, 0xe8883a, 0xe8c840, 0x5aa850, 0x2a8a7a, 0x3a7ac8, 0x2a3a7a, 0x8a4ac8, 0xd86aa0,
  0x8a5a3a, 0xa8a08a, 0x6a7a5a, 0x5a5a62, 0xf0b0a0];
const OUTFITS = [{ id: 'pants', label: 'Top & trousers' }, { id: 'shorts', label: 'Top & shorts' }, { id: 'skirt', label: 'Top & skirt' }, { id: 'dress', label: 'Dress' }];
const BODIES = [{ id: 'f', label: 'Curvy' }, { id: 'm', label: 'Broad' }, { id: 'x', label: 'Slim' }];

// ---------- moodlets ----------
const MOODLETS = {
  rested: { label: 'Well rested', icon: '😌', mood: 10, hours: 6 },
  greatMeal: { label: 'Great meal', icon: '😋', mood: 12, hours: 4 },
  badMeal: { label: 'Burnt dinner', icon: '🤢', mood: -10, hours: 3 },
  promoted: { label: 'Promoted!', icon: '🎉', mood: 25, hours: 24 },
  fired: { label: 'Lost the job', icon: '😞', mood: -25, hours: 24 },
  newBaby: { label: 'New baby', icon: '👶', mood: 25, hours: 48 },
  married: { label: 'Just married', icon: '💍', mood: 35, hours: 48 },
  engaged: { label: 'Engaged', icon: '💍', mood: 25, hours: 24 },
  grieving: { label: 'Grieving', icon: '🖤', mood: -35, hours: 48 },
  embarrassed: { label: 'Embarrassed', icon: '😳', mood: -15, hours: 4 },
  rejected: { label: 'Rejected', icon: '💔', mood: -12, hours: 4 },
  heartbroken: { label: 'Heartbroken', icon: '💔', mood: -30, hours: 24 },
  smitten: { label: 'Smitten', icon: '😍', mood: 15, hours: 6 },
  fought: { label: 'Had a fight', icon: '😠', mood: -12, hours: 5 },
  partied: { label: 'Danced the night away', icon: '🕺', mood: 10, hours: 5 },
  birthday: { label: 'Birthday!', icon: '🎂', mood: 20, hours: 24 },
  goodGrades: { label: 'Great report card', icon: '📝', mood: 15, hours: 24 },
  scared: { label: 'Fire!', icon: '🔥', mood: -20, hours: 4 },
  inspired: { label: 'Inspired', icon: '💡', mood: 10, hours: 4 },
  workedOut: { label: 'Endorphins', icon: '🏋️', mood: 8, hours: 3 },
  newFriend: { label: 'New friend', icon: '🤝', mood: 10, hours: 8 },
  bestDay: { label: 'Great day at work', icon: '🌟', mood: 10, hours: 6 },
  badDay: { label: 'Bad day at work', icon: '🌧️', mood: -10, hours: 6 },
  missedBaby: { label: 'Baby taken away', icon: '😢', mood: -40, hours: 72 },
  hotShower: { label: 'Squeaky clean', icon: '🫧', mood: 6, hours: 3 },
  wantMet: { label: 'Wish come true', icon: '⭐', mood: 12, hours: 6 },
  greatParty: { label: 'Great party', icon: '🎊', mood: 18, hours: 12 },
  lameParty: { label: 'Party flopped', icon: '😬', mood: -10, hours: 8 },
};
