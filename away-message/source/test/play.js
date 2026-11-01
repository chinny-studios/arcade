// Drives a representative play session: connect, download a song, play it, sign on to chat, summon Bongo, open games.
AM.sn('sk8rgrl2001');
AM.connect();
AM.give('blink', 128);
AM.give('nsynk', 320);
AM.open('snapster');
await wait(300);
//--- shot snapster
AM.open('zapamp');
await wait(200);
AM.open('buddy');
AM.buddyOn('jenny4eva');
AM.sim(30);
await wait(300);
//--- shot desktop
AM.bongo();
AM.sing('theme');
await wait(500);
//--- shot bongo
AM.open('mines');
AM.open('pinball');
await wait(300);
//--- shot games
AM.open('ie');
await wait(400);
//--- shot browser
AM.sim(60);
return AM.ach();
