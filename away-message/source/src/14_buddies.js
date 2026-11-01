// BuddyChat people: your buddy list (with profiles, away messages and conversation scripts), chat rooms, their
// regulars. Conversation nodes: { say: [lines], opts: [[reply, next, rel]],
// fx(), quest: { kind: 'file', song } | { kind: 'guestbook' } }. A node without opts ends the thread.
const BUDDIES = [
  { sn: 'jenny4eva', group: 'Buddies', color: '#c000c0', on: [5, 1e9], likes: ['teenpop', 'boyband'],
    profile: '<div style="color:#c000c0;text-align:center"><b>~*~*~ JeNnY ~*~*~</b><br>14 \u2022 8th grade (9th in the fall!!)<br><br><i>"if u love something let it go, if it comes back its yours"</i><br><br>BFFs: {sn} &lt;3 ashley &lt;3 meg<br>fave: *NSYNK!!! JC 4 ever<br><br>~*~ IM me ~*~</div>',
    aways: ['~*~ at the mall ~*~ call my cell!!! (if i had one lol)', 'eating dinner. brb!!!', 'on the phone w/ ashley. IM me tho!', '*NSYNK is on TRL omg brb'],
    threads: {
      hi: { at: 25, start: 'a', nodes: {
        a: { say: ['heyyyy!!! ur online!! :)', 'omg guess what happened at the mall today'], opts: [['what??', 'b', 1], ['brb', 'brb', 0], ['not now jen', 'x', -1]] },
        b: { say: ['ok so ashley saw sam_i_am88 at the food court', 'and sam asked if u were gonna be at the movies friday!!!!', 'do u like sam?? tell me the truth!!!'], opts: [['...maybe', 'yes', 1], ['ew no', 'no', 0], ['who wants to know', 'tease', 0]] },
        yes: { say: ['OMG I KNEW IT!!!!', 'ur secret is safe w/ me ;)', 'u should IM sam!! sam is online like every nite'], fx: () => { S.crush++; save(); } },
        no: { say: ['suuuure', 'ur face is red. i can tell thru the computer'] },
        tease: { say: ['lol i cant tell u', '...sam wants to know', 'I MEAN NOBODY. brb!!!!'], fx: () => { S.crush++; save(); } },
        brb: { say: ['k hurry!!!'] }, x: { say: ['fine. :('] } } },
      song: { at: 170, start: 'a', nodes: {
        a: { say: ['can u snapster me Bye Bye Bye Bye by *NSYNK??', 'my computer takes like 2 hrs to download anything. my dad says its "the ram"'], opts: [['sure!', 'ok', 1], ['get it urself', 'no', -1]] },
        ok: { say: ['yay!!! u can send it right in the IM, click Send File'], quest: { kind: 'file', song: 'nsynk', done: 'thx' } },
        thx: { say: ['OMG IT WORKED!!!', 'ur the best!!!! <3 <3 <3', 'im gonna listen to it 400 times'], fx: () => { relAdd('jenny4eva', 2); } },
        no: { say: ['ok MEAN'] } } },
      later: { at: 520, start: 'a', nodes: {
        a: { say: ['r u still on?? my mom says i have to go to bed in like 10 min', 'did u IM sam yet???'], opts: [['yeah!', 'y', 0], ['not yet', 'n', 0]] },
        y: { say: ['AND???', 'tell me tomorrow!!! gnite!!! *hugs*'] }, n: { say: ['DO IT!!! gnite!!'] } } },
    },
    small: ['lol', 'omg', 'totally', 'hehe :)', 'brb my brother is being SO annoying', 'did u see TRL today?', 'i ❤ this song', 'whatever!!'],
  },
  { sn: 'SkaterDude182', group: 'Buddies', color: '#0040c0', on: [40, 1e9], likes: ['poppunk', 'ska', 'altrock'],
    profile: '<b>skater</b><br>sk8 or die<br><br>bands: blink-183, the offsprung, smash mouse<br>quote: "dude"<br><br>if ur reading this ur a poser jk',
    aways: ['skating. leave a msg', 'at tonys house', 'eating pizza rolls', 'playing tony hawk. dont bug me'],
    threads: {
      hey: { at: 55, start: 'a', nodes: {
        a: { say: ['sup', 'dude did u get the new blink-183 yet? its so sick'], opts: [['yeah its awesome', 'y', 1], ['no whats it called', 'n', 0], ['blink sucks', 'bad', -2]] },
        y: { say: ['nice', 'the live version is even better'] },
        n: { say: ['all the small thongs', 'get it on snapster. find somebody on cable tho, 56k ppl take forever'] },
        bad: { say: ['wow ok poser'] } } },
      req: { at: 400, start: 'a', nodes: {
        a: { say: ['yo can u send me Pretty Fly (For a Housefly)?', 'the offsprung. my snapster keeps crashing'], opts: [['k', 'ok', 1], ['nah', 'no', -1]] },
        ok: { say: ['sweet'], quest: { kind: 'file', song: 'offsprung', done: 'thx' } },
        thx: { say: ['DUDE yes', 'ur legit'], fx: () => relAdd('SkaterDude182', 2) },
        no: { say: ['k whatever'] } } },
    },
    small: ['dude', 'sweet', 'lol', 'thats sick', 'brb gotta feed my dog', 'word', 'nah', 'haha nice'],
  },
  { sn: 'xXDarkAngelXx', group: 'Buddies', color: '#800000', on: [100, 1e9], likes: ['grunge', 'numetal', 'ballad'],
    profile: '<div style="background:#000;color:#c00;padding:6px">~ angel ~<br><br><i>i am the rain that nobody sees</i><br><br>bands: creeed, lincoln parking, the goo goo bolls<br>dislikes: preps, britnee spearz, mornings</div>',
    aways: ['...', 'the darkness is my away message', 'listening to creeed. dont.', 'gone. maybe forever. (back at 9)'],
    threads: {
      poem: { at: 120, start: 'a', nodes: {
        a: { say: ['hi.', 'do u ever feel like ur just... a background program', 'in the computer of life'], opts: [['all the time', 'deep', 2], ['deep', 'deep', 1], ['lol what', 'lol', -1]] },
        deep: { say: ['finally. someone gets it.', 'i wrote a poem about it. its on my geopages'] },
        lol: { say: ['forget it. nobody understands.'] } } },
      guest: { at: 460, start: 'a', nodes: {
        a: { say: ['did u read my poem', 'u can sign my guestbook if u want. or dont. whatever.', 'www.geopages.com/area51/7734'], opts: [['ok i will', 'ok', 1], ['maybe later', 'x', 0]] },
        ok: { say: ['ok.', '...thanks.'], quest: { kind: 'guestbook', done: 'thx' } },
        thx: { say: ['u signed it.', 'thats... the first one. :)', 'dont tell anyone i used a smiley'], fx: () => relAdd('xXDarkAngelXx', 3) },
        x: { say: ['whatever'] } } },
    },
    small: ['...', 'whatever', 'i guess', 'thats so fake', 'sigh', 'k', 'thats actually kinda cool', 'no.'],
  },
  { sn: 'bballstar23', group: 'Buddies', color: '#008000', on: [300, 900], likes: ['hiphop', 'rnb'],
    profile: '<b>#23</b> varsity next year<br>dont IM me during the game',
    aways: ['at practice', 'watching the game', 'gym'],
    threads: { game: { at: 330, start: 'a', nodes: {
      a: { say: ['yo', 'u comin to the game saturday'], opts: [['yeah', 'y', 1], ['what game', 'w', -1]] },
      y: { say: ['bet'] }, w: { say: ['wow'] } } } },
    small: ['yo', 'bet', 'lol', 'k', 'word', 'aight', 'u good?'],
  },
  { sn: 'sam_i_am88', group: 'Buddies', color: '#c06000', on: [280, 1e9], likes: ['altrock', 'eurodance', 'ska'],
    profile: '<i>"i do not like green eggs and ham"</i> - me, every day<br><br>band: semisonix, wheezer<br>i like: movies, drawing, ppl who make me laugh',
    aways: ['drawing. IM anyway :)', 'at the movies (not THE movies, the other ones)', 'brb dinner'],
    threads: { crush: { at: 300, start: 'a', nodes: {
      a: { say: ['hey :)', 'jenny said u wanted to talk to me?? lol'], opts: [['jenny is so random lol', 'neutral', 0], ['maybe i did ;)', 'flirt', 1], ['no?? why would i', 'awk', -1]] },
      neutral: { say: ['haha yeah she is', 'so r u going to the movies friday? everybody is going'], opts: [['only if ur going', 'date', 2], ['idk maybe', 'meh', 0]] },
      flirt: { say: ['lol ;)', 'so r u going to the movies friday?'], opts: [['only if ur going', 'date', 2], ['idk maybe', 'meh', 0]] },
      awk: { say: ['oh ok', 'nvm then lol'] },
      date: { say: ['ok then its a date', 'i mean. not a DATE date', 'unless', 'ok bye!!!!!'], fx: () => { unlock('crush'); relAdd('sam_i_am88', 3); after(2, () => buddySignOff('sam_i_am88', 70)); } },
      meh: { say: ['cool cool', 'well maybe ill see u there'] } } } },
    small: ['haha', 'lol thats funny', 'really?', ':)', 'cool', 'nice', 'i was just drawing a dragon lol'],
  },
  { sn: 'auntlinda_quilts', group: 'Family', color: '#606060', on: [200, 700], likes: ['ballad', 'latin'],
    profile: 'LINDA. QUILTER. GRANDMOTHER OF 3. I LOVE MY GRANDKIDS AND MY CATS. GOD BLESS.',
    aways: ['I AM AWAY FROM THE COMPUTER', 'AT BINGO'],
    threads: { caps: { at: 220, start: 'a', nodes: {
      a: { say: ['HELLO DEAR IS THIS THE INTERNET', 'HOW DO I TURN OFF THE CAPITALS'], opts: [['press caps lock aunt linda', 'cl', 1], ['who is this', 'who', 0]] },
      cl: { say: ['THANK YOU DEAR', 'IT DID NOT WORK', 'DID YOU GET MY EMAIL ABOUT BILL GRATES. WE ARE GOING TO BE RICH'] },
      who: { say: ['ITS AUNT LINDA. I AM ON THE INTERNET NOW. YOUR MOTHER SET IT UP', 'LOVE YOU'] } } } },
    small: ['OK DEAR', 'THAT IS NICE', 'I DO NOT KNOW WHAT LOL MEANS', 'HOW IS SCHOOL', 'TELL YOUR MOTHER TO CALL ME', 'GOD BLESS'],
  },
  { sn: 'cousinTJ', group: 'Family', color: '#008080', on: [150, 1e9], likes: ['numetal', 'hiphop'],
    profile: 'TJ 11 yrs old<br>i like video games and pizza<br>my cousin is ' + '{sn}' + ' lol',
    aways: ['hacking', 'eating', 'grounded lol'],
    threads: { game: { at: 260, start: 'a', nodes: {
      a: { say: ['hi', 'do u know any good games', 'i beat mine finder on beginner. its SO hard'], opts: [['try solitaire', 'sol', 1], ['try pinball', 'pin', 1], ['ur 11 go to bed', 'bed', -1]] },
      sol: { say: ['solitaire is for grandmas lol', 'ok fine ill try it'] }, pin: { say: ['PINBALL!!!! brb'] }, bed: { say: ['NO U go to bed'] } } } },
    small: ['lol', 'ur a n00b', 'hahahahahahaha', 'i am bored', 'do u have any games', 'can i have ur password lol jk', 'brb'],
  },
];
const BUDDY = (sn) => BUDDIES.find((b) => b.sn.toLowerCase() === String(sn).toLowerCase());
function relOf(sn) { return S.rel[sn] || 0; }
function relAdd(sn, n) { S.rel[sn] = clamp((S.rel[sn] || 0) + n, -10, 10); save(); emit('rel', sn); }

// chat rooms
const ROOMS = {
  'Teen Chat 14': { users: ['kewlgurl14', 'Br1tn3yFan', 'bored_in_ohio', 'popcorn_kid', 'sunflowerzzz', 'dj_tunez', 'rollerblade_ray', 'Mallrat01'],
    lines: ['anyone here like *NSYNK', 'hiiii everybody', 'this room is so dead', 'whos watching TRL', 'lol', 'brb', 'ne1 wanna talk', 'i just got snapster its SO cool', 'my mom is yelling at me to get off', 'any1 from ohio??', 'sing w/ me: bye bye bye bye', 'omg the new britnee video!!!', 'who has the best away message'] },
  'Snapster Fans': { users: ['mp3king', 'downloadz4life', 'T1_Tony', 'rip_master', 'cdburner99', 'bitrate_snob', 'leech_lord', 'kbps_kevin'],
    lines: ['anyone have the daroot remix', 'who has a T1 i need a fast peer', 'my download keeps getting cancelled', '128 kbps is fine stop complaining', 'everything is labeled Wired Al again', 'i have 4000 songs', 'snapster is the future man', 'metallicuh is suing everyone lol', 'my cd burner made a coaster again'] },
  'Skaters': { users: ['sk8ordie', 'kickflip_kid', 'grindrail', 'tony_fan_900', 'ollie_ollie', 'bailed_hard'],
    lines: ['sk8 or die', 'just landed a kickflip', 'tony hawk 2 is the best game ever', 'blink-183 rules', 'who wants to go to the skatepark sat', 'my board snapped lol', 'dude', 'that ollie was sick'] },
  'Lobby 182': { users: ['Guest_4421', 'Guest_8890', 'newbie_2001', 'lost_in_chat', 'helpme_plz', 'grandpa_joe'],
    lines: ['how do i leave this room', 'hello?', 'is this the internet', 'what is a buddy list', 'why is everyone typing so fast', 'HOW DO I MAKE THE LETTERS SMALLER', 'test', 'test test', 'brb'] },
};
// small-talk responses by keyword (when no thread is running)
function buddyReply(b, text) {
  const t = text.toLowerCase();
  const song = SONGS.find((s) => t.includes(s.artist.toLowerCase()) || t.includes(s.title.toLowerCase()));
  if (song) return b.likes.includes(song.genre) ? pick(['omg i LOVE ' + song.artist, song.title + ' is my jam', 'turn it up!!! lol', 'yes. YES.']) : pick([song.artist + '? really?', 'eww ' + song.artist + ' lol', 'not my thing', 'i guess its ok']);
  if (/\b(bye|g2g|gtg|ttyl|cya|gnite|good night)\b/.test(t)) return pick(['bye!!!', 'ttyl', 'cya', 'nite!']);
  if (/\bbrb\b/.test(t)) return pick(['k', 'ok', 'kk']);
  if (/\b(hi|hey|sup|yo|hello|hiya)\b/.test(t)) return pick(['hey', 'hiii', 'sup', 'heyy :)']);
  if (/\b(lol|haha|lmao|rofl|hehe)\b/.test(t)) return pick(['lol', 'haha', ':-P', 'hehe']);
  if (/\bbongo\b/.test(t)) return pick(['the pink monkey thing? my dad says its spyware lol', 'omg i have him too he wont stop singing', 'bongo is creepy']);
  if (/\b(snapster|mp3)\b/.test(t)) return pick(['snapster is the best', 'my snapster takes forever', 'did u get anything good?']);
  if (/\?$/.test(t)) return pick(['idk', 'maybe', 'y?', 'hmm', 'i dunno lol']);
  if (/[a-z]/.test(t) && t === t.toUpperCase() && t.length > 4) return pick(['why r u yelling lol', 'CAPS LOCK', 'ok ok!!']);
  return pick(b.small);
}
