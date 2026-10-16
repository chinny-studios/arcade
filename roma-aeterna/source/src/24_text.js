// Roma Aeterna — the placards: short notes on the monuments and on everyday life, as they stood in AD 125.
// t: title, l: Latin name, b: body (paragraphs split by a blank line). Where scholars disagree, the text says so.

const PLACARD_TEXT = {
  // ---------- the Forum ----------
  forum: { t: 'The Roman Forum', l: 'Forum Romanum', b: `Once a marshy valley between the Palatine and the Capitol, drained by the Great Drain, this was the heart of the Republic: elections, trials, speeches, funerals and markets all happened here.

By Hadrian's day the business of empire has moved to the bigger imperial fora next door, and this square has become a museum of Rome's past, crowded with temples, statues and memorials. Look for the sacred fig, olive and vine planted in the middle, and the paved circle of the Lacus Curtius, where legend says a young man rode his horse into a chasm to save the city.` },
  rostra: { t: 'The Rostra', l: 'Rostra', b: `The speakers' platform takes its name from the bronze rams (rostra) of enemy warships captured at Antium in 338 BC and fixed to its front.

From here magistrates addressed the people and Mark Antony read Caesar's will. After Cicero was murdered in 43 BC, his head and hands were nailed up here. On most mornings someone is still speaking from it: listen to the crowd.` },
  milliarium: { t: 'The Golden Milestone', l: 'Milliarium Aureum', b: `Augustus set up this gilded bronze column in 20 BC as the symbolic starting point of all the roads of the empire. It listed the distances from Rome's gates to the great cities of the provinces.

"All roads lead to Rome" is a later proverb, but the idea is here. Nearby stood the Umbilicus Urbis, the "navel of the city", its centre.` },
  saturn: { t: 'Temple of Saturn', l: 'Aedes Saturni', b: `One of the oldest temples in Rome, first dedicated around 497 BC. Its tall podium holds the Aerarium, the treasury of the Roman state, where public money and the official records of the treasury are kept.

Saturn's festival, the Saturnalia, begins here every December 17th: a week of feasting and gifts when slaves are served by their masters and everyone wears the felt cap of a freedman.` },
  tabularium: { t: 'The Tabularium', l: 'Tabularium', b: `The great record office built in 78 BC by the consul Quintus Lutatius Catulus closes the Forum against the slope of the Capitol. Behind its arcades were kept bronze tablets of laws, treaties and decrees of the Senate.

Below it stand the Temple of Concord, rebuilt by Tiberius as a museum of Greek art, and the Temple of the deified Vespasian and Titus.` },
  curia: { t: 'The Senate House', l: 'Curia Iulia', b: `Begun by Julius Caesar and finished by Augustus, this tall brick hall is where the Senate meets. Its front is plastered and scored to look like marble blocks, and its doors are of bronze.

About six hundred senators sit on low steps along the side walls. Under the emperors the Senate still passes decrees and judges its own, but everyone knows where power lies: this year the emperor has just returned from four years of travelling the provinces.` },
  aemilia: { t: 'Basilica Aemilia', l: 'Basilica Paulli', b: `A basilica was not a church but a great covered hall for business, banking and law cases. This one was first built in 179 BC and rebuilt many times by the Aemilian family.

Money-changers kept their tables here. In its floor, archaeologists would later find coins melted into the paving from the fire set by the Goths in AD 410, still lying where they fell.` },
  julia: { t: 'Basilica Julia', l: 'Basilica Iulia', b: `Begun by Julius Caesar, this vast hall houses the Centumviral Court, which hears inheritance cases before as many as 180 judges in four panels at once. Pliny the Younger complained of the noise of the crowds and the paid applauders.

Look at the steps: idlers waiting for their cases have scratched gaming boards into the marble, for games of counters and dice. You can still find them today.` },
  castor: { t: 'Temple of Castor and Pollux', l: 'Aedes Castoris', b: `The twin sons of Jupiter were said to have appeared at the battle of Lake Regillus in 496 BC, then ridden to Rome to announce the victory and water their horses at the nearby spring of Juturna.

The temple you see was rebuilt by Tiberius. Its podium holds strongrooms where the state weights and measures are kept and where private citizens deposit valuables, and its front platform is used as a speaker's stand.` },
  divusjulius: { t: 'Temple of the Deified Julius', l: 'Aedes Divi Iulii', b: `After Caesar was murdered in 44 BC, the crowd burned his body here in the Forum on a pyre of benches and furniture. Augustus built this temple on the spot in 29 BC, the first in Rome to a deified man.

The round altar in the niche of the front platform marks where the pyre stood. People still leave flowers.` },
  vesta: { t: 'Temple of Vesta', l: 'Aedes Vestae', b: `The round temple keeps the sacred hearth of Rome, a fire that must never go out. If it did, it was an omen of disaster and the Vestal on duty was whipped.

Inside, only the Vestals may enter the inner store, said to hold the Palladium, the ancient image of Minerva that Aeneas brought from Troy. The round shape recalls the huts of Rome's first villages.` },
  vestals: { t: 'House of the Vestal Virgins', l: 'Atrium Vestae', b: `Six priestesses, chosen as girls between six and ten, served Vesta for thirty years. They were free of a father's authority, could own property and make a will, rode in a carriage, and were escorted by a lictor.

If a condemned man met a Vestal by chance, he was pardoned. But a Vestal who broke her vow of chastity was buried alive in an underground chamber near the Colline Gate. Their house is a long court with pools and statues of the chief Vestals.` },
  titus: { t: 'Arch of Titus', l: 'Arcus Titi', b: `Built by Domitian after his brother Titus' death in AD 81, this arch celebrates the capture of Jerusalem in AD 70. Inside the passage, relief panels show the triumphal procession carrying the spoils of the Temple, including the great seven-branched lampstand.

The inscription reads: "The Senate and People of Rome to the deified Titus, son of the deified Vespasian, Vespasian Augustus".` },
  venusroma: { t: 'Temple of Venus and Rome', l: 'Templum Veneris et Romae', b: `The emperor himself designed this temple, the largest in Rome, begun in 121 on the site of Nero's old palace entrance. Two great halls stand back to back: Venus, mother of the Roman people, facing the Colosseum, and the goddess Roma facing the Forum.

It is still a building site. Notice the carts of marble allowed in by day for public works, and the treadwheel crane. Cassius Dio tells a story that the architect Apollodorus mocked the design, saying the goddesses could not stand up without hitting their heads on the roof, and paid for it with exile and death. Historians doubt it, but people told it.` },
  colossus: { t: 'The Colossus', l: 'Colossus Solis', b: `Nero set up this bronze giant, about 30 m high, as a statue of himself at the door of his Golden House. After his death it was turned into the Sun god, with a crown of rays.

To clear the site for his new temple, Hadrian's architect Decrianus moved it here, upright, with the help of twenty-four elephants. Many think the nickname of the amphitheatre beside it, "the Colosseum", comes from this statue.` },
  metasudans: { t: 'The Meta Sudans', l: 'Meta Sudans', b: `The "sweating turning post": a cone-shaped fountain built under the Flavian emperors, shaped like the turning posts of a racetrack, with water running down its sides into a round basin.

It stands at a crossroads of processions, where triumphal parades turn from the valley of the Colosseum toward the Forum.` },
  // ---------- Capitol and Palatine ----------
  jupiter: { t: 'Temple of Jupiter Best and Greatest', l: 'Aedes Iovis Optimi Maximi', b: `The most important temple of Rome, shared by Jupiter, Juno and Minerva. It was first dedicated in 509 BC, the year the kings were expelled, and has burned and been rebuilt several times. Domitian's rebuilding gave it columns of Greek marble and roof tiles of gilded bronze said to have cost 12,000 talents.

Generals celebrating a triumph ended their procession here to give thanks; the consuls make their vows here every New Year's Day.` },
  moneta: { t: 'Temple of Juno Moneta', l: 'Aedes Iunonis Monetae', b: `On the northern summit of the Capitol, the Arx, stands the temple of Juno "who warns". Her sacred geese are said to have woken the defenders when the Gauls tried to climb the hill by night around 390 BC.

The state mint was beside her temple, and her title gave us the words "money" and "mint".` },
  tarpeian: { t: 'The Tarpeian Rock', l: 'Saxum Tarpeium', b: `From this cliff traitors and murderers were thrown to their deaths. It takes its name from Tarpeia, who in legend betrayed the Capitol to the Sabines for what they wore on their left arms. She expected their gold bracelets; they crushed her under their shields.` },
  palace: { t: 'The Palace of the Caesars', l: 'Domus Flavia', b: `The emperors have lived on the Palatine since Augustus, and the hill's name gave us the word "palace". This vast complex was built for Domitian by his architect Rabirius and finished around AD 92.

This is the official wing: a throne hall where the emperor receives embassies, a peristyle with an octagonal maze fountain, and the banqueting hall called the "Dining Room of Jupiter". The private wing, the Domus Augustana, looks down over the Circus Maximus.` },
  apollo: { t: 'Temple of Apollo on the Palatine', l: 'Aedes Apollinis Palatini', b: `Augustus vowed this temple after his victory over Sextus Pompey and built it next to his own house, finishing in 28 BC. It was of gleaming white Luna marble, with a golden chariot of the Sun on its roof.

Under its foundations the Sibylline Books, the prophecies consulted by the state in times of crisis, were kept in gilded cases.` },
  romulus: { t: 'The Hut of Romulus', l: 'Casa Romuli', b: `Romans kept this thatched hut as the house where Romulus lived when he founded the city in 753 BC. Whenever it was damaged, it was carefully rebuilt as it was.

Archaeologists really have found the post holes of Iron Age huts here, from the time of the first villages on the hill.` },
  // ---------- Colosseum valley ----------
  colosseum: { t: 'The Flavian Amphitheatre', l: 'Amphitheatrum Flavium', b: `Vespasian began it on the site of the lake of Nero's Golden House, and Titus opened it in AD 80 with a hundred days of games. About 50,000 spectators sit by rank: senators at the front, then knights, citizens, and women and slaves at the very top.

Entry is free, with a numbered token (tessera) that tells you which of the 76 numbered arches to use. On hot days sailors from the fleet at Misenum rig a vast awning, the velarium, from the masts round the top. Today there are no games; slaves are raking the sand.` },
  arena: { t: 'The Arena', l: 'Harena', b: `"Arena" is simply the Latin for sand, spread to soak up blood. Under this wooden floor is the hypogeum: two levels of tunnels and cages where animals and fighters wait, and lifts with trapdoors that let a lion or a whole stage set appear in the middle of the show.

Mornings were for wild beast hunts, midday for executions, afternoons for the gladiators.` },
  ludus: { t: 'The Great Gladiator School', l: 'Ludus Magnus', b: `Domitian built the largest training school in Rome next to the Colosseum, with a tunnel linking it to the arena. The practice ring in the courtyard has seats for a few thousand people who come to watch the training.

Gladiators were mostly slaves, prisoners or criminals, but some were free men who signed on for money and fame. Fights were refereed, and most bouts did not end in death: a trained gladiator was expensive.` },
  // ---------- the Circus ----------
  circus: { t: 'The Circus Maximus', l: 'Circus Maximus', b: `The oldest and largest racecourse in Rome, in the valley between the Palatine and the Aventine. Trajan enlarged its seating, and ancient writers give it 150,000 to 250,000 places: the largest building for spectators the world would see for nearly two thousand years.

Four teams race: the Reds, Whites, Greens and Blues. Fans bet, curse rival drivers on lead tablets and riot over results. Seven laps make a race, and there may be twenty-four races in a day.` },
  spina: { t: 'The Central Barrier', l: 'Spina / Euripus', b: `The barrier down the middle of the track carries shrines, statues and water basins. At each end stand the turning posts, three gilded cones each; the tightest, most dangerous moment of a race is the turn around them.

Lap counters stand on top: seven large eggs and seven bronze dolphins, one taken down at each lap. The obelisk in the middle was brought from Heliopolis in Egypt by Augustus in 10 BC.` },
  // ---------- baths and the Caelian ----------
  bathstrajan: { t: 'The Baths of Trajan', l: 'Thermae Traiani', b: `Opened in AD 109 and designed by Apollodorus of Damascus over part of Nero's buried Golden House, these are the largest baths in Rome: hot room, warm room, cold hall, an open-air swimming pool, exercise yards, gardens, libraries and lecture halls.

Entry costs a quadrans, the smallest coin. The emperor Hadrian has ordered that men and women bathe separately, at different hours. Bring a strigil to scrape off the oil and sweat.` },
  // ---------- imperial fora ----------
  caesar: { t: 'The Forum of Caesar', l: 'Forum Iulium', b: `Julius Caesar spent a fortune buying up houses to build a new square when the old Forum became too crowded. At its end is the Temple of Venus Genetrix, Venus the Mother, ancestor of his family through Aeneas.

Trajan restored it, and the Senate House was rebuilt to line up with it.` },
  augustus: { t: 'The Forum of Augustus', l: 'Forum Augustum', b: `At its end stands the Temple of Mars the Avenger, vowed by Augustus at the battle of Philippi where Caesar's murderers were defeated. In the colonnades on both sides, statues of Rome's great men and of Augustus' ancestors look out of curved exedrae.

The huge firewall of grey stone behind it separates the marble of the forum from the wooden tenements of the Subura, which burned often.` },
  peace: { t: 'The Forum of Peace', l: 'Templum Pacis', b: `Vespasian built this garden square after the Jewish War, with rose beds and water channels between porticoes of pink Egyptian granite. In its temple and library he displayed the spoils of Jerusalem and masterpieces of Greek art collected from all over Rome.

It is one of the wonders of the city; Pliny the Elder counted it among the most beautiful buildings in the world.` },
  trajan: { t: 'The Forum of Trajan', l: 'Forum Traiani', b: `The last and largest of the imperial fora, paid for with the gold of the conquered Dacians and designed by Apollodorus of Damascus. A bronze statue of Trajan on horseback stands in the middle of a square paved with white marble.

Across the end rises the Basilica Ulpia, the biggest hall in Rome, and behind it the libraries and the column. Ammianus tells how, two centuries later, a visiting emperor stood here speechless.` },
  column: { t: 'Trajan\'s Column', l: 'Columna Traiani', b: `Dedicated in AD 113, the column is 100 Roman feet high (about 30 m) and carved with a spiral frieze 200 m long showing Trajan's two wars in Dacia, with some 2,500 figures building forts, crossing rivers and fighting. A stair of 185 steps winds up inside.

The inscription says it shows how high the hill was that was cut away to make the forum. Since Trajan's death in 117, his ashes have rested in a golden urn in its base.` },
  markets: { t: 'Trajan\'s Markets', l: 'Mercatus Traiani', b: `Behind the forum, Apollodorus cut a hemicycle of shops into the slope of the Quirinal, rising in terraces with a vaulted hall and a street, about 150 shops in all.

Here you could buy fruit, flowers, oil, wine, spices and fish. Some rooms were probably offices of the administration of the grain supply and the dole.` },
  // ---------- Campus Martius ----------
  pantheon: { t: 'The Pantheon', l: 'Pantheum', b: `Agrippa built the first temple of all the gods here in 27 BC. It burned, and Hadrian has rebuilt it completely, finishing about now. Modestly, he put back Agrippa's original inscription: "Marcus Agrippa, son of Lucius, consul for the third time, made this."

The porch has sixteen columns of grey and pink Egyptian granite, each a single block. Step inside.` },
  oculus: { t: 'The Dome', l: 'Testudo', b: `The dome is 43.3 m across, exactly as high as it is wide, so a perfect sphere would fit inside. It is cast in concrete that gets lighter toward the top, with pumice in place of heavy stone, and thinned by five rings of coffers.

The only light comes through the oculus, the eye, 8 m across. The circle of sunlight moves across the coffers and floor through the day. It stayed the largest unreinforced concrete dome in the world.` },
  saepta: { t: 'The Saepta Julia', l: 'Saepta Iulia', b: `Caesar planned this huge colonnaded enclosure for the people to vote in their assemblies. Once elections stopped mattering, it became a place for gladiator shows and, above all, for luxury shopping.

Martial describes Mamurra spending a whole day here handling everything (bronzes, crystal, tables, slaves) and leaving with two cheap cups.` },
  stadium: { t: 'The Stadium of Domitian', l: 'Stadium Domitiani', b: `Built for Greek-style athletic contests: running, wrestling and boxing, with seats for about 30,000. Its long shape with one curved end survives in the oval of the Piazza Navona.

Many Romans thought naked Greek athletics faintly scandalous, which did not stop them from coming to watch.` },
  pompey: { t: 'The Theatre of Pompey', l: 'Theatrum Pompeii', b: `Rome's first permanent stone theatre, built by Pompey the Great in 55 BC. Permanent theatres were thought bad for morals, so Pompey put a temple of Venus Victrix at the top of the seats and claimed the seats were just steps up to her temple.

Behind the stage lies a great garden portico with plane trees and fountains, a favourite place to stroll.` },
  curiapompey: { t: 'The Curia of Pompey', l: 'Curia Pompeia', b: `In this hall at the end of Pompey's portico the Senate met on the Ides of March, 44 BC, and here Julius Caesar was stabbed twenty-three times at the foot of a statue of Pompey.

Augustus later had the hall walled up as an accursed place.` },
  marcellus: { t: 'The Theatre of Marcellus', l: 'Theatrum Marcelli', b: `Planned by Caesar and finished by Augustus in 13 BC, named after his nephew and heir Marcellus, who died young. About 11,000 spectators watch comedies, tragedies and the dancing mimes that are now more popular than either.

Its curved arcades of Doric and Ionic columns over each other were a model for the Colosseum.` },
  mausoleum: { t: 'The Mausoleum of Augustus', l: 'Mausoleum Augusti', b: `Augustus built his family tomb in 28 BC, a huge round mound planted with cypresses and topped by his bronze statue. Here lie his ashes and those of his family and successors, the last being Nerva.

At the entrance stood two bronze pillars inscribed with his own account of his achievements, the Res Gestae, of which a copy survives in Ankara.` },
  horologium: { t: 'The Sundial of Augustus', l: 'Horologium Augusti', b: `An Egyptian obelisk brought from Heliopolis serves as the pointer of a huge sundial; its shadow falls across bronze lines and letters set into the pavement, marking the days and months.

Pliny says it no longer kept good time in his day: perhaps an earthquake or the river floods shifted it. Some scholars think its shadow pointed toward the Altar of Peace on Augustus' birthday; others doubt it.` },
  arapacis: { t: 'The Altar of Augustan Peace', l: 'Ara Pacis Augustae', b: `The Senate voted this altar in 13 BC to honour Augustus' return from Spain and Gaul, and the peace he had brought. Its marble walls are carved with a procession of the imperial family, priests and children, and with scenes of Rome's origins.

The children tugging at the adults' clothes are among the most human images in Roman art.` },
  // ---------- the river ----------
  island: { t: 'Tiber Island', l: 'Insula Tiberina', b: `In 291 BC, during a plague, the Romans brought the sacred snake of Aesculapius, god of healing, from Epidaurus. It slipped off the ship and swam to this island, so his temple was built here. The island was later faced in travertine like the prow of a ship, with an obelisk as its mast.

Owners used to leave sick and old slaves here instead of paying for their care. The emperor Claudius ruled that any slave abandoned here who recovered would be free.` },
  fabricius: { t: 'Pons Fabricius', l: 'Pons Fabricius', b: `Built in stone in 62 BC by Lucius Fabricius, the commissioner of roads, this bridge links the island to the city. His name is cut on both sides.

It would still carry people across the Tiber two thousand years later, the oldest Roman bridge in the city in its original form.` },
  sublicius: { t: 'The Wooden Bridge', l: 'Pons Sublicius', b: `Rome's oldest bridge, by tradition built under King Ancus Marcius, is still made entirely of wood without iron nails, for religious reasons. It is in the care of the pontifices, the "bridge-makers", whose title the chief priest of Rome bears.

Here, legend says, Horatius held off the Etruscan army alone while the Romans cut down the bridge behind him.` },
  boarium: { t: 'The Cattle Market', l: 'Forum Boarium', b: `By the river harbour, Rome's oldest market trades in cattle and meat. It is one of the places where the city began, where traders from up and down the Tiber met.

The round temple is dedicated to Hercules the Victor, and nearby is the Great Altar of Hercules, where merchants offer a tenth of their profits. Romans told how Hercules killed the monster Cacus here for stealing his cattle.` },
  hercules: { t: 'Temple of Hercules the Victor', l: 'Aedes Herculis Victoris', b: `This round temple of twenty columns, built of Greek marble in the late second century BC, is the oldest marble building still standing in Rome. It was probably paid for by a rich oil merchant.

Beside it stands the little Temple of Portunus, god of harbours, with its columns engaged in the walls.` },
  cloaca: { t: 'The Great Drain', l: 'Cloaca Maxima', b: `The arch in the embankment is the outlet of the Cloaca Maxima, begun under the kings to drain the marsh of the Forum valley into the Tiber. It still carries away the water of the city's fountains, baths and latrines.

Agrippa is said to have sailed through it in a boat to inspect it. Rome even had a goddess of the sewer, Cloacina.` },
  testaccio: { t: 'The Hill of Broken Jars', l: 'Mons Testaceus', b: `Behind the warehouses of the Emporium grows an artificial hill made entirely of broken amphorae. Olive oil arrives from Baetica in southern Spain in jars that cannot be reused, so they are smashed and stacked in neat terraces, with lime spread over them against the smell.

By the time it was finished, it would hold the remains of some fifty million jars.` },
  // ---------- gates, roads and water ----------
  capena: { t: 'Porta Capena', l: 'Porta Capena', b: `The gate in the old Servian wall where the Via Appia begins. Rome has long since spread far beyond these walls, built in the fourth century BC.

An aqueduct crosses above it and drips constantly: Juvenal calls it "the wet Capena". Victorious generals entered the city here, and travellers left for Capua, Brundisium and the boats to Greece and the east.` },
  aqueduct: { t: 'The Aqueduct of Claudius', l: 'Aqua Claudia', b: `Begun by Caligula and finished by Claudius in AD 52, the Aqua Claudia brings water nearly 70 km from springs in the hills, mostly underground, then across the plain on arches up to about 28 m high. Above it runs a second channel, the Anio Novus.

Rome's aqueducts deliver hundreds of thousands of cubic metres of water a day to fountains, baths and the houses of those who pay for a pipe. Frontinus, their commissioner under Trajan, wrote: "Compare these with the idle pyramids, or the useless, famous works of the Greeks."` },
  appia: { t: 'The Via Appia', l: 'Via Appia', b: `The "queen of roads" was begun in 312 BC by the censor Appius Claudius Caecus, to move armies south to Capua. It now runs to Brundisium on the heel of Italy, about 560 km.

Romans were forbidden to bury their dead inside the city, so the roads out are lined with tombs, each trying to catch the eye of passing travellers. In 71 BC six thousand followers of Spartacus were crucified along this road from Capua to Rome.` },
  scipios: { t: 'The Tomb of the Scipios', l: 'Sepulcrum Scipionum', b: `The family tomb of the Cornelii Scipiones, cut into the rock in the early third century BC. Its oldest sarcophagus, of Scipio Barbatus, consul in 298 BC, is carved in the Doric style with one of the earliest Latin poems as its epitaph.

Scipio Africanus, who beat Hannibal, is not here: he died bitter in exile at Liternum.` },
  milestone: { t: 'A Milestone', l: 'Miliarium', b: `Every Roman mile (1,000 paces, about 1.48 km) along the road a stone column gives the distance from the city, often with the name of the emperor who last repaired the road.

In the real world Bovillae lies at the twelfth milestone, about 18 km out. Here the walk has been shortened, and each milestone marks a twelfth of the way.` },
  milestone6: { t: 'Travelling in the Empire', l: 'Iter', b: `A traveller on foot covers some 20 to 30 km a day; a carriage perhaps 40; a courier of the imperial post, changing horses at every station, as much as 75 km.

Inns are often rough. Horace, travelling down this very road to Brundisium, complained of bad water, cheating innkeepers, gnats and frogs keeping him awake all night.` },
  metella: { t: 'The Tomb of Caecilia Metella', l: 'Sepulcrum Caeciliae Metellae', b: `This huge drum faced with travertine was built around 30 BC for Caecilia Metella, daughter of the consul Quintus Caecilius Metellus Creticus and daughter-in-law of Marcus Crassus, the richest man in Rome.

Its frieze of ox skulls would one day give the area its name, Capo di Bove, "the ox's head". In the Middle Ages it became a fortress.` },
  quintilii: { t: 'The Villa of the Quintilii', l: 'Villa Quintiliorum', b: `A grand country house beside the road, so big that later people took its ruins for a town ("Old Rome"). It had its own baths, an aqueduct, a circus-shaped garden and a nymphaeum facing the road to impress travellers.

It belonged to the brothers Quintilius Condianus and Maximus, consuls in 151. Later the emperor Commodus had them executed and took the villa for himself.` },
  mansio: { t: 'The Posting Station', l: 'Mansio', b: `Augustus set up the cursus publicus, a state postal and transport service. Stations along the main roads keep fresh horses, carriages and rooms for officials travelling with a permit (a diploma).

Ordinary travellers stay at private inns, where you might find a bed, a meal, a stable and a reputation for fleas.` },
  farm: { t: 'A Farm on the Campagna', l: 'Villa rustica', b: `Around Rome, farms grow wheat, beans, vines and olives for the city's markets, often worked by slaves under a steward (vilicus). Cato's handbook on farming advises selling old oxen, old tools, and old or sick slaves.

The olive press, the threshing floor and the wine vats were the heart of the farm.` },
  bovillae: { t: 'Bovillae', l: 'Bovillae', b: `An old Latin town at the foot of the Alban Hills, at the twelfth milestone of the Via Appia. It is small now, but proud: it has a forum, baths, a theatre and even its own circus.

In 52 BC Clodius was killed near here in a roadside brawl with the followers of his rival Milo, which set off riots in Rome in which the Senate House burned down.` },
  sacrarium: { t: 'Shrine of the Julian Family', l: 'Sacrarium gentis Iuliae', b: `The Julii, Caesar's family, claimed descent from Iulus, son of Aeneas, who founded Alba Longa in these hills. Their ancestral cult was kept at Bovillae, and Tiberius dedicated a shrine to the Julian family here in AD 16, with a statue of the deified Augustus.` },
  caupona: { t: 'The Inn', l: 'Caupona', b: `Roadside inns offer food, wine, a room and a stable. A famous inscription from Isernia records a guest settling his bill with the innkeeper: wine one as, bread one as, a side dish two asses, hay for the mule two asses.

The sign of an inn was often an animal: the Elephant, the Rooster, the Snake.` },
  // ---------- everyday life in the Subura ----------
  subura: { t: 'The Subura', l: 'Subura', b: `The crowded, noisy, disreputable valley between the Viminal and the Esquiline, just behind the imperial fora. Julius Caesar grew up here in a modest house. Martial calls it "loud" and "dirty with mud", and Juvenal complains that you cannot sleep for the carts and the shouting.

Most Romans live like this: in rented flats above shops, buying cooked food in the street because their rooms have no kitchens, fetching water from the corner fountain.` },
  insula: { t: 'Apartment Blocks', l: 'Insula', b: `About a million people live in Rome, most of them in blocks of flats called insulae, "islands". Ground floors are shops; the best flats are on the first floor; the higher you climb the cheaper, darker and more dangerous the rooms.

Augustus limited their height to 70 feet and Trajan to 60, but jerry-built blocks still collapse or burn. Juvenal: "The rent of a dark garret in Rome would buy you a fine house outright in a country town."` },
  graffiti: { t: 'Writing on the Walls', l: 'Inscriptiones parietariae', b: `Roman walls are covered in writing: election notices painted by professional sign-writers ("the neighbours ask you to elect Marcus Cerrinius Vatia as aedile"), advertisements, jokes, love notes and insults.

One wall at Pompeii carries the line: "I am amazed, O wall, that you have not collapsed, bearing the tedious scrawls of so many writers."` },
  thermopolium: { t: 'A Hot-Food Bar', l: 'Thermopolium', b: `With few kitchens in the flats, most people eat out. Bars like this keep hot food and drink in jars sunk into the counter: lentils, chickpeas, stews, sausages, cheese, and wine mixed with water or honey.

Behind the counter, many bars have a little painted shrine to the household gods. Emperors sometimes banned the sale of hot food in taverns, to stop people gathering there; the bans never lasted.` },
  bakery: { t: 'A Bakery', l: 'Pistrinum', b: `Bakers grind their own flour in hourglass-shaped mills of lava stone, turned by donkeys or by slaves. The round loaves are scored into eight wedges before baking in the domed oven, and some carry the baker's stamp.

Bread is the staple of Rome. About 200,000 citizens receive free grain every month from the state (the annona); Trajan made the bakers a privileged guild to keep the city fed.` },
  fullonica: { t: 'A Fuller\'s Workshop', l: 'Fullonica', b: `Fullers clean and finish woollen cloth. Workers tread the cloth in tubs of water mixed with fuller's earth and urine, whose ammonia removes grease and whitens the wool, then rinse, brush, bleach it with sulphur and press it.

The urine is collected in jars left out in the street. Vespasian taxed it; when his son Titus complained, he held a coin under his nose and said "pecunia non olet": money doesn't smell.` },
  wineshop: { t: 'A Wine Shop', l: 'Taberna vinaria', b: `The sign over this bar copies a real one from Pompeii: "Hedone says: here you drink for one as. Give two and you'll drink better. Give four and you'll drink Falernian."

Romans drank their wine mixed with water, often warmed and spiced. Falernian from Campania was the finest; soldiers and slaves drank posca, sour wine and water.` },
  books: { t: 'The Booksellers', l: 'Librarii', b: `The Argiletum, the street running from the Forum into the Subura, is known for booksellers and cobblers. Shops post the titles they have on the door posts.

Books are scrolls of papyrus copied by slaves. Martial tells his readers that they can buy his first book of epigrams "smoothed with pumice and dressed in purple" at the shop of Atrectus here, for five denarii.` },
  latrine: { t: 'A Public Latrine', l: 'Foricae', b: `Public latrines seat a dozen or more people side by side on marble benches, with no partitions. Water runs in a channel under the seats to carry everything to the drains, and a smaller channel in front is for rinsing the sponge on a stick (tersorium) used instead of paper.

They were social places: you might chat, gossip or even be invited to dinner.` },
  school: { t: 'A School', l: 'Ludus litterarius', b: `Children whose parents can pay go to a schoolmaster from about seven, often in an open shop or under an awning on the street, starting at dawn. They learn reading, writing on wax tablets with a stylus, and arithmetic with counters and fingers.

Discipline is harsh: the poet Horace remembered his teacher Orbilius as "plagosus", fond of the whip. Older boys move on to a grammaticus to read Virgil and Homer.` },
  vigiles: { t: 'The Night Watch', l: 'Vigiles', b: `Augustus created seven cohorts of vigiles, recruited from freedmen, to fight fires and keep order at night. Each cohort covers two of the city's fourteen regions and has stations like this one.

They patrol with buckets, axes, hooks to pull down burning buildings, blankets soaked in vinegar to smother flames, and pumps (siphones). Every flat is supposed to keep water ready.` },
  steppingstones: { t: 'Stepping Stones', l: 'Lapides', b: `The streets carry mud, rubbish and the contents of chamber pots, so raised stones let walkers cross from pavement to pavement without wading. They are spaced so that cart wheels can pass between them.

Carts are banned from the city streets for the first ten hours of daylight, except for building work and public business; at dusk they come rumbling in.` },
  lacus: { t: 'A Neighbourhood Fountain', l: 'Lacus', b: `Rome has hundreds of public fountains fed by the aqueducts. Water flows all day and night from a spout, often carved as a face, into a stone basin; the overflow washes the street and flushes the drains.

Most people fetch their water here in jars and carry it up the stairs. Only the rich pay for a pipe into their homes.` },
  compitum: { t: 'A Crossroads Shrine', l: 'Compitum', b: `At many crossroads stands a little shrine to the Lares Compitales, the guardian spirits of the neighbourhood. Augustus reorganised Rome into 265 neighbourhoods (vici), each with elected officers, often freedmen, who tend the shrine and hold its festival, the Compitalia.

Offerings of flowers, cakes and incense are left here; painted on the wall, the two dancing Lares carry drinking horns.` },
  domus: { t: 'A Town House', l: 'Domus', b: `Behind blank walls and street-front shops, a wealthy family's house opens inward. From the entrance passage you enter the atrium, with an opening in the roof that lets in light and rain, caught in the pool below.

Every morning the master receives his clients here (the salutatio) and gives them a small gift of money, the sportula. Beyond lies the tablinum, his office, and a garden surrounded by columns. "CAVE CANEM", beware of the dog, says the mosaic at the door, copying one in Pompeii.` },
};
