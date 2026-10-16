// Roma Aeterna — conversations. Each person has a key; LINES[key] is a list of conversations, each a list of lines.
// A line is "text" or "text|gloss" (the gloss explains the Latin). *words* are Latin, shown in italics.
// A conversation may begin with '@day', '@night' or '@morning' to limit when it's used.

const LINES = {
  // ----- shops and trades -----
  baker: [
    ['*Salve!* Fresh bread, still warm. Eight wedges to a loaf, and my stamp on every one, so nobody can say Felix sold him chalk.|Salve: hello', 'We grind our own grain at the back. The donkey has been turning that mill since before dawn, poor beast.'],
    ['The grain comes from Egypt and Africa, up the river from the harbour at Portus. If the ships are late, the whole city gets angry, and it\'s the bakers they blame.', 'The emperor Trajan made us a proper guild, mind. Rome can go without games for a while, but not without bread.'],
    ['@morning', 'Up since the third watch. You sleep, we bake. That\'s the arrangement.'],
  ],
  cook: [
    ['*Ave!* Hot lentils, chickpeas, sausage, a bit of cheese, wine warm or cold. Sit or stand, your choice.|Ave: hail, hello', 'Nobody cooks at home round here. One brazier in a top-floor flat and the whole block goes up. So they eat with me.'],
    ['Try the wine with honey. *Mulsum.* Or the fish sauce on your chickpeas: *garum* from Spain, the real thing.|garum: fermented fish sauce, the ketchup of Rome', 'Every so often some emperor bans selling hot food in taverns, to stop people gathering. Never lasts.'],
  ],
  wine: [
    ['Read the sign, friend. One as for the ordinary, two for better, four for Falernian. Hedone\'s prices, and Hedone\'s honest.', 'Mix it with water, mind. Only barbarians drink it neat.'],
    ['This is from the Alban Hills, that\'s Setinian, and in the back I keep the Falernian for gentlemen.', 'Soldiers drink *posca*: sour wine and water. Keeps them sharp, they say. Keeps them cheap, I say.|posca: vinegar-wine'],
  ],
  butcher: [
    ['Pork, mostly. Romans love pork: sausages, ham, sow\'s udder if you\'re rich. Beef? Oxen are for ploughing, not for eating.', 'The best meat in the city comes from the sacrifices. After the gods have had their share, the rest gets sold.'],
  ],
  cobbler: [
    ['Sandals, boots, slippers for the house. Senators wear red shoes with a little crescent, but they don\'t buy them here.', 'This street has always been booksellers and cobblers. Paper and leather. Both get walked on, eventually.'],
    ['Soldiers\' boots have iron hobnails. You can hear a patrol coming two streets away.'],
  ],
  grocer: [
    ['Cabbage, leeks, beans, lettuce, turnips, figs from Tusculum. Cato said cabbage cures everything. Cato never tried my figs.', 'Market day is every eighth day, the *nundinae*. Then the farmers come in and prices drop, worse luck for me.|nundinae: the nine-day market cycle'],
  ],
  potter: [
    ['Cooking pots, jugs, lamps, bowls. The fine red tableware comes from Arretium and Gaul; I make the everyday stuff.', 'Break a pot, buy a pot. That\'s my whole philosophy.'],
  ],
  smith: [
    ['Knives, hinges, nails, the iron tyres for cart wheels. If it\'s metal and it broke, bring it here.', 'Vulcan\'s my god. Hot work in summer, mind.'],
  ],
  weaver: [
    ['Wool from Tarentum, linen from Egypt, and silk, if you\'re very rich, from beyond the end of the world. The Seres, they call the people who make it.|Seres: the Chinese', 'Most women still spin at home, though. A good wife spins wool: they put it on the tombstones.'],
  ],
  vendor: [
    ['Everything you need, nothing you don\'t. Well. Some things you don\'t.', 'Prices? Ask me nicely and they\'ll be nicer.'],
    ['I came from Syria twenty years ago. Half the shopkeepers in this street are from somewhere else. Rome eats the whole world.'],
  ],
  barber: [
    ['Sit down, sit down. A shave? A trim? Since the emperor grew his beard, half my customers only want the edges tidied. It\'s ruining me.', 'Hadrian, they say, grows it to hide a scar. Or because he loves the Greeks. Either way, the fashion\'s followed him.'],
    ['A barber\'s shop hears everything. Who\'s in debt, who\'s in love, which senator got thrown off his horse. You want news, come to me, not the Forum.', 'A boy\'s first shave is a big day: the first whiskers go in a little box as an offering to the gods.'],
  ],
  lamps: [
    ['Clay lamps, bronze lamps, lamps with gladiators on, lamps with dolphins. Olive oil burns cleanest.', 'Without me the city goes to bed at sunset. With me you can read till midnight. Not that anyone round here reads.'],
  ],
  fish: [
    ['Mullet, eel, sea bream, oysters from Lake Lucrinus! Fresh this morning, or fresh-ish this afternoon.', 'Rich men keep fish ponds at their villas. Some put earrings on their favourite eels, they say.'],
  ],
  books: [
    ['Scrolls! Virgil, Ovid, Horace, the new poems of Martial, a fine copy of Livy in many volumes. Titles are on the doorpost.', 'Martial used to send his readers down this very street to the shop of Atrectus. Five denarii for a book, polished with pumice. Robbery, he said, then took his cut.'],
    ['The emperor writes poetry himself, you know. Not bad, either. He likes it when you notice.', 'We copy them by hand, in the back, slaves who can read. A good scribe is worth more than a horse.'],
  ],
  slavetrader: [
    ['Every one with a label round the neck: where they\'re from, their skills, their faults. The law says I must declare them.', 'Greek tutors are the expensive ones. Cooks too. You\'d be amazed what a good cook costs.'],
  ],
  banker: [
    ['I change coin and lend money. A denarius is four sesterces, a sestertius four asses. An aureus, if you ever see one, is twenty-five denarii.', 'Twelve per cent a year is the legal limit for interest. One per cent a month. Anyone who charges more is a crook. Mostly.'],
  ],
  fuller: [
    ['Don\'t make that face. Yes, it\'s urine. Nothing gets the grease out of wool like it. We collect it in jars on the street corners.', 'The emperor Vespasian put a tax on it. His son complained and he held a coin to his nose. *Pecunia non olet.* Money doesn\'t smell.|pecunia non olet: money doesn\'t stink'],
    ['A white toga for an election, that\'s fuller\'s work. *Candidatus*, they call a man running for office: "the brilliant white one".|candidatus: from candidus, gleaming white'],
  ],
  // ----- the town house -----
  patron: [
    ['@morning', 'Another one. Yes, yes, *salve*. You may wait with the others; my steward will give you your *sportula*.|sportula: the patron\'s small daily gift to his clients', 'In return my clients walk with me to the Forum, applaud my friends in court and vote as I advise. That is how Rome works.'],
    ['This house belonged to my grandfather. Behind those blank walls, an atrium, a garden, a household of forty. Out there, the Subura. One learns not to hear it.'],
  ],
  client: [
    ['@morning', 'Up before dawn, best toga on, to stand in a queue and say good morning to a man who doesn\'t know my name.', 'Six and a quarter sesterces, the sportula. Sometimes a dinner invitation. Sometimes he\'s out and you\'ve walked across the city for nothing.'],
    ['Martial complained about this all his life. He was a client too. Even poets have to eat.'],
  ],
  doorkeeper: [
    ['The master is not receiving. Or he is. That depends entirely on who you are.', 'I used to be chained to the door, like a dog. Now I just sit here. Progress.'],
    ['Mind the mosaic. *Cave canem.* There\'s no dog, mind. The mosaic does the job.|cave canem: beware of the dog'],
  ],
  housemaid: [
    ['Water to fetch, floors to wash, the mistress\'s hair to dress. Her hairstyles have more curls than a bunch of grapes.', 'If I serve well, perhaps one day they\'ll free me. Many are freed. Some of the richest men in Rome were slaves once.'],
  ],
  // ----- school and learning -----
  teacher: [
    ['@morning', 'Silence! You there, read me the line. No, from the beginning. *Arma virumque cano...*|"Arms and the man I sing", the first line of Virgil\'s Aeneid', 'I teach letters and numbers to anyone whose father pays. Eight asses a month. Most fathers pay late.'],
    ['@morning', 'Orbilius beat Horace and Horace became a poet. I have hopes for these ones yet.'],
  ],
  pupil: [
    ['We write on wax with a stylus, and rub it out with the other end. Look, I can write my name.', 'School starts before sunrise. The baker\'s boy says it\'s not fair that he gets to sleep while I learn the eight times table.'],
    ['After this I\'ll go to the *grammaticus* and read Homer in Greek. My father says it\'ll make me a gentleman.|grammaticus: a secondary-school teacher'],
  ],
  philosopher: [
    ['The Stoics teach that only virtue is good, and that what happens to you matters less than how you bear it. Epictetus was a slave, and freer than his master.', 'The emperor loves Greek learning. They call him *Graeculus*, "the little Greek", behind his back.|Graeculus: little Greek'],
    ['Everyone in Rome wants a philosopher at dinner and nobody wants to listen to one. I eat well, at least.'],
  ],
  poet: [
    ['Listen: "Rome, where the rent is high, the walls are thin, the carts never stop and the neighbours never sleep..." No? Juvenal did it better. Juvenal does everything better.', 'A poet needs a patron. A patron needs a poet who praises him. It\'s a fair trade. Mostly.'],
  ],
  // ----- building site -----
  mason: [
    ['Marble from Greece and Asia, columns from Egypt, all coming up the Tiber on barges. Then onto carts, then up here. My back knows every block.', 'The emperor drew this temple himself. Comes to look at it, too. Asks questions. Clever man. Don\'t tell him I said so.'],
    ['Carts can come in by day for work like ours. Everybody else waits till dusk.'],
  ],
  architect: [
    ['Two halls back to back, one for Venus, one for Rome. Ten columns across the front. The largest temple in the city. The emperor\'s own design.', 'They say Apollodorus mocked the plans: said the goddesses couldn\'t stand up without banging their heads. They say a lot of things. I wouldn\'t repeat it, if I were you.'],
  ],
  // ----- arena and races -----
  arenaslave: [
    ['Raking sand. There\'s a show next month. You\'d not want to see this sand after.', 'Under the floor there are cages and lifts. A whole forest can come up through the trapdoors, with the animals in it.'],
  ],
  arenaguard: [
    ['No games today, citizen. The arena\'s being made ready.', 'When there are games, you show your token at your arch: the numbers are painted over every entrance. Senators at the front, women at the top.'],
  ],
  gladiator: [
    ['I fight as a *murmillo*: big shield, short sword, fish on my helmet. Against a Thracian, mostly.|murmillo: a heavily armed gladiator type', 'Most fights don\'t end in death. We\'re expensive to train. But you never know which day the crowd will want blood.'],
    ['I swore the oath: to be burned, bound, beaten and killed by the sword. It\'s still better than the mines.', 'Some of the boys came here free, for the money. And the girls in the stands. Mad.'],
  ],
  lanista: [
    ['I own them, I train them, I hire them out. If one dies in the arena, the man who put on the games pays me for him. Fifty times the hire, sometimes.', 'The new ones practise on the wooden post. The palus. Thousands of blows before they hold a real sword.'],
  ],
  athlete: [
    ['Running, wrestling, boxing. The Greek games. Romans watch and pretend to be shocked that we train naked.', 'Hadrian loves the Greek games. Maybe one day there\'ll be an Olympics in Rome.'],
  ],
  charioteer: [
    ['Seven laps, four horses, a whip and a knife in my belt to cut myself free of the reins if I crash. That\'s the job.', 'Scorpus won over two thousand races and was dead at twenty-six. Martial wrote his epitaph. I mean to win as many and live longer.'],
  ],
  gamer: [
    ['Dice? Latrunculi? It\'s soldiers and thieves on a board. There\'s one scratched right here in the step. Waiting for my case to be called, you see.|latrunculi: a Roman strategy board game', 'Gambling\'s only legal during the Saturnalia. Everybody does it anyway.'],
  ],
  advocate: [
    ['Inheritance case. A hundred and eighty judges in four panels and a crowd paid to applaud. Pliny the Younger hated it. He also won a lot of money.', 'Never speak more than two water clocks unless you\'re paid by the hour.'],
  ],
  // ----- markets and river -----
  docker: [
    ['Oil from Spain, wine from Gaul, grain from Egypt, marble from Greece, all up the river from Portus on barges pulled by oxen along the towpath.', 'See that hill behind the warehouses? Broken oil jars. Millions. Nobody wants a jar that smelled of old oil.'],
  ],
  drover: [
    ['Cattle in from the hills, out as beef or sacrifices. This is the oldest market in Rome. Hercules himself drove cattle through here, they say.'],
  ],
  sick: [
    ['I am waiting for the god to send me a dream. You sleep in the temple porch, and Aesculapius tells you the cure.', 'The doctors are all Greeks, and all expensive. The god is cheaper.'],
  ],
  // ----- the street -----
  gossip: [
    ['Did you hear? Her husband\'s a freedman and now he\'s richer than the senator upstairs. Bought the whole block.', 'The emperor\'s back from his travels. Four years he\'s been away. Britannia, Spain, Greece, everywhere. Built a wall across Britannia to keep the painted people out.'],
    ['The block on the next street fell down last month. Just fell down. The landlord propped it with a beam and put the rent up.'],
  ],
  beggar: [
    ['An as, citizen? An as for a man who fought in Dacia under the divine Trajan?', 'The grain dole is for citizens on the list. I\'m not on the list.'],
  ],
  customer: [
    ['Lentils again. They have the cheek to call it a stew.', 'My flat has no kitchen. Nobody\'s does. You cook in an insula, you burn down the insula.'],
  ],
  drinker: [
    ['Sit down, friend. Have a cup. The Falernian here is from the jar they keep the Setinian in. Nobody can tell.'],
    ['@night', 'Can\'t sleep anyway. The carts. Every night the carts. Juvenal was right: in Rome, only the rich can afford to sleep.'],
  ],
  latrine: [
    ['Ah. Good day to you. Yes, it\'s a public latrine. Take a seat. There\'s plenty of room.', 'Mind the sponge. Rinse it in the channel first.'],
  ],
  shaved: [
    ['Careful with that razor, Eros. Last time you cut me so badly I looked like I\'d been in the arena.'],
  ],
  child: [
    ['We\'re playing knucklebones. You throw them up and catch them on the back of your hand. Want to try?', 'I have a *bulla*. Look, it\'s gold. It keeps bad spirits away until I\'m grown up.|bulla: an amulet worn by freeborn children'],
    ['My nurse says the Lamia eats children who don\'t go to sleep. I don\'t believe her. Mostly.'],
  ],
  water: [
    ['Three trips up four flights of stairs before breakfast. The rich have water piped in. We have legs.', 'This fountain never stops. The water comes from the hills, miles away, on those great arches.'],
  ],
  // ----- citizens of all kinds -----
  citizen: [
    ['*Salve.* You look lost. Everybody is, the first week. Hardly a street here has its name written up. You ask for "the fountain of the fishmonger, behind the Temple of Flora". Good luck.|Salve: greetings', 'If you\'re hungry, the bars are cheap. If you\'re rich, you won\'t be for long.'],
    ['I\'m on the grain list. Five measures a month, free, from the Porticus Minucia. My grandfather fought for that.', 'Bread and circuses, the poets sneer. Well, I like bread. And circuses.'],
    ['The Blues will win today, mark my words. The Greens have nothing but a lucky horse.'],
    ['@night', 'At this hour? Get home before the carts run you over. Or before someone empties a chamber pot on your head. Juvenal says to make your will before going out to dinner.'],
  ],
  woman: [
    ['*Salve.* I\'m off to the baths before they open for the men. The emperor has made them separate us, you know. Some of us liked it better before.|Salve: greetings', 'My husband sells pottery. I keep the accounts. He thinks he runs the business.'],
    ['My mother wore her curls stacked up like a tower on a wire frame. Now the empress Sabina wears hers simply, and so do we. My maid is very relieved.', 'Have you seen the Pantheon? The emperor\'s new temple. There\'s a hole in the roof. On purpose!'],
    ['@night', 'I\'m going home. Rome at night is no place to be wandering.'],
  ],
  freedman: [
    ['I was a slave once, from Bithynia. My master freed me in his will. Now I own a workshop and three slaves of my own. Rome is like that.', 'This felt cap is the *pileus*. The cap of freedom. When they free you, they shave your head and give you one.|pileus: the cap of a freed slave'],
    ['My son will be born free and can stand for office in our town. Mine is the last generation with the mark of the chain.'],
  ],
  slave: [
    ['Can\'t stop. If I\'m late with this, it\'s my back.', 'Not all masters are cruel. Mine\'s just careless. Seneca wrote that slaves are men too. Not many read Seneca.'],
    ['I\'m saving my *peculium*, the money they let me keep. One day I\'ll buy my freedom.|peculium: a slave\'s own savings'],
  ],
  slavegirl: [
    ['Water for the kitchen, flowers for the mistress, then back for more water. *Vale!*|Vale: farewell'],
  ],
  senator: [
    ['A senator\'s broad purple stripe, citizen. Six hundred of us. We still debate. We still vote. The emperor still decides.', 'Hadrian has been away four years. Now he\'s back, and full of plans. Building temples, rebuilding the Pantheon, a villa at Tibur bigger than some towns.'],
    ['Do not stand in my way, I am late for the Curia. The emperor is to speak.'],
  ],
  equestrian: [
    ['A knight. A gold ring, a narrow stripe on the tunic, and four hundred thousand sesterces to my name, which is what it takes.', 'We run the empire\'s business while the senators make speeches. Tax collecting, the grain supply, the governorship of Egypt.'],
  ],
  magistrate: [
    ['A consul. Twelve lictors with the fasces walk ahead of me: the rods for punishment, and outside the city\'s sacred boundary the axe as well.', 'One of the two consuls of the year. The year is named after us, you know. Make way, citizen.'],
  ],
  lictor: [
    ['Make way! Make way for the consul!', 'The fasces: rods bound together with an axe. Power, citizen. You don\'t touch them, you step aside.'],
  ],
  priest: [
    ['We cover our heads when we sacrifice, so as not to see an evil omen. The ritual must be perfect. One wrong word and you start again.', 'The gods of Rome have kept the city safe for nearly nine hundred years. They must be doing something right.'],
  ],
  vestal: [
    ['The fire of Vesta has burned for longer than anyone can remember. If it goes out, Rome is in danger.', 'Thirty years of service. Ten to learn, ten to serve, ten to teach. Then I may go, though few of us do.'],
  ],
  soldier: [
    ['Twenty-five years\' service, three hundred denarii a year, and not allowed to marry. Can\'t complain. Well, we do. All the time.', 'I was on the Danube. The divine Trajan crossed it on a stone bridge more than half a mile long. You\'ll see it on his column.'],
    ['Twenty miles a day with sixty pounds on your back. They call us Marius\' mules.'],
  ],
  praetorian: [
    ['The Praetorian Guard. Sixteen years\' service, triple a legionary\'s pay, and we guard the emperor\'s person. Move along.'],
  ],
  arenaguard2: [['Keep moving.']],
  merchant: [
    ['Fine wool from Patavium, glass from Alexandria, pepper from India! Two months by sea, the pepper. And they say it\'s too expensive.', 'Pliny worked out that India, China and Arabia take a hundred million sesterces a year from us. He thought it was scandalous. I think it\'s business.'],
  ],
  porter: [
    ['Heavy? This? You should see the amphorae of oil from Spain. Sixty pounds each.', 'Move, move, coming through!'],
  ],
  courier: [
    ['The imperial post. Fresh horse at every station, eighty miles a day if the road\'s good. Letters for the governor at Brundisium.'],
  ],
  carter: [
    ['@night', 'Can\'t come into the city till the tenth hour. So we come at night. Everyone hates us. Can\'t be helped: Rome eats.', 'Wine, oil, grain, bricks. All of it on the night roads.'],
    ['@day', 'On the road out here there\'s no ban. In the city, we wait for dusk, all of us, lined up at the gates.'],
  ],
  bearer: [
    ['Six of us usually. We\'re matched for height, see, so the litter doesn\'t tip. A rich man\'s litter is a show of wealth.'],
  ],
  vigil: [
    ['@night', 'The watch. Fire is the great danger. One lamp knocked over in a garret and half a street goes up.', 'We carry buckets, axes, hooks and a pump. If a man didn\'t keep water ready in his flat, he gets a beating. Orders.'],
    ['@day', 'Day shift is quieter. At night we\'re out till dawn.'],
  ],
  orator: [
    ['Citizens! Romans! The city has never been so great, nor the empire so wide!', 'From the Rostra spoke Cicero, from the Rostra spoke Caesar. Hear me now!'],
  ],
  listener: [
    ['He\'s been going for an hour. I\'m only here for the free wine after.', 'A good speaker! Better than most. Cicero, people say, could make a crowd weep or riot, as he chose.'],
  ],
  bath: [
    ['Entry\'s a *quadrans*, the smallest coin. Oil and strigil extra, or bring your own slave.|quadrans: a quarter of an as', 'Hot room, warm room, cold plunge. Then the exercise yard, then a massage, then a drink, then home. A civilised afternoon.'],
  ],
  innkeeper: [
    ['A bed, a meal, wine, and hay for the mule. Pay before you sleep. Some of my guests forget in the morning.', 'Horace stayed in an inn down this road once. Wrote a whole poem complaining about it. Bad water, gnats, frogs. As if that were my fault.'],
  ],
  groom: [
    ['These are the post horses. Fresh for the couriers. A tired horse here gets swapped for a fresh one, and off they go.'],
  ],
  gardener: [
    ['Roses, myrtle, box hedges clipped into shapes. My master likes a garden that looks like a painting.'],
  ],
  vilicus: [
    ['I run the villa for my masters. The brothers Quintilii, very rich, very proud of their fountain. It\'s meant to impress you.', 'Two hundred slaves, the baths, the aqueduct of our own. A town, really.'],
  ],
  farmer: [
    ['Wheat, beans, vines, olives. I sell in Rome on market days. Twelve miles each way with the mule.', 'The city eats everything. Grain from Egypt, but vegetables and wine from us.'],
    ['Cato said a farmer should be a seller, not a buyer. Cato never had a bad harvest.'],
  ],
  farmwife: [
    ['The olives come in after the first frost. Everyone helps, children too.', 'Chickens, a pig, a goat, the vegetable plot. And spinning in the evening. Always the spinning.'],
  ],
  shepherd: [
    ['Summer in the hills, winter down here on the plain. My grandfather walked this flock\'s ancestors the same way.', 'Romulus was a shepherd, you know. So was Remus. That ended badly.'],
  ],
  traveller: [
    ['Off to Capua, then Brundisium and the boat to Greece. Athens! The emperor\'s favourite city.', 'The tombs along this road keep you company. Every one wants you to stop and read it. That\'s the point.'],
    ['Twelve miles from Rome to Bovillae. They say on a clear day from the Alban hills you can see the sea.'],
  ],
  // Bovillae
  bovillae: [['Bovillae is small, but it\'s old. Older than Rome, we say. Caesar\'s family had their shrine here.']],
};
// people who are busy or brief: fallbacks by base role
const FALLBACK = { shopkeeper: 'vendor', worker: 'citizen', orator: 'orator' };

const DIALOG = {
  a: null, lines: null, i: 0,
  start(a) {
    this.a = a; a.talk = true;
    const key = a.who.key;
    let convs = LINES[key] || LINES[FALLBACK[key]] || LINES.citizen;
    const tag = G.hour >= 5 && G.hour < 10 ? '@morning' : SKY.night > 0.5 ? '@night' : '@day';
    const ok = convs.filter((c) => !c[0].startsWith('@') || c[0] === tag || (c[0] === '@day' && tag === '@morning'));
    if (ok.length) convs = ok;
    a.convI = (a.convI == null ? Math.floor(Math.random() * convs.length) : a.convI + 1) % convs.length;
    this.lines = convs[a.convI].filter((l) => !l.startsWith('@'));
    this.i = 0;
    AU.ui('talk');
    this.show();
  },
  show() {
    const [text, gloss] = this.lines[this.i].split('|');
    const h = HUD.$dlg;
    h.querySelector('.who').innerHTML = this.a.who.title.replace(/^([^,]+)/, '$1') + '';
    h.querySelector('.say').innerHTML = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    h.querySelector('.gloss').textContent = gloss || '';
    h.querySelector('.more').textContent = this.i < this.lines.length - 1 ? (Input.touch.on ? 'tap · continue' : 'E · continue') : (Input.touch.on ? 'tap · farewell' : 'E · vale');
  },
  next() { if (!this.a) return; this.i++; if (this.i >= this.lines.length) HUD.close(); else this.show(); },
  end() { if (this.a) this.a.talk = false; this.a = null; },
};
