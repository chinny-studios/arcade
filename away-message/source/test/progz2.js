// Progz, part 2: the punt wall mid-punt, cousinTJ's anti-punt bounce, the progz room (macro, ad, room punt) and TOS.
window.R = {};
// advance game time in small steps, letting awaited sleeps continue between them
const run = window.run = async (sec) => { for (let i = 0; i < sec * 10; i++) { AM.sim(0.1); await wait(0); } };
AM.S.noWelcome = true;
AM.sn('xXpunkr0ckXx'); AM.connect(); AM.open('buddy');
AM.buddyOn('cousinTJ'); AM.buddyOn('jenny4eva');
AM.progz(); AM.place('progz', 10, 10, 440, 450);
document.querySelectorAll('.dialog').forEach((d) => d._w.close(true));
AM.S.antipunt = false;
const p = AM.punted('ProgMaster2k1'); await run(1); await wait(300);
window.P = p;
//--- shot progz-wall
const run = window.run;
await run(3); await window.P;
document.querySelectorAll('.dialog').forEach((d) => d._w.close(true));
AM.buddyOn('cousinTJ');
const b = AM.punt('cousinTJ', 'mega'); await run(3); window.R.tjPunt = await b;
await run(10); window.R.bcAfterTJ = AM.bc.on;
document.querySelectorAll('.dialog').forEach((d) => d._w.close(true));
AM.buddyOn('jenny4eva');
AM.S.antipunt = true;
// join the progz room through the prog's Macros tab button
document.querySelector('.tabs .tab:nth-child(4)').dispatchEvent(new PointerEvent('pointerdown'));
await wait(50);
[...document.querySelectorAll('button')].find((x) => x.textContent === 'Join Progz 4 Trade').click();
const room = AM.bc.rooms['Progz 4 Trade'];
AM.place(room.key, 470, 250, 540, 360); room.move(470, 300);
const m = AM.macro('Progz 4 Trade', 'PhAnToM Banner'); await run(3); window.R.macro = await m;
window.R.ad = AM.progAd('Progz 4 Trade');
await run(60);
window.R.roomPuntSeen = !!AM.S.ach.antipunt && AM.bc.on;
await wait(300);
//--- shot progz-room
const run = window.run;
const victim = AM.bc.rooms['Progz 4 Trade'].people.find((x) => x !== 'xX_PuNtEr_Xx');
const q = AM.punt(victim, 'ultra'); await run(4); window.R.roomPunt = await q;
window.R.strikesBeforeTOS = AM.PROG.strikes;
for (let i = 0; i < 3; i++) { const z = AM.bomb('jenny4eva', 'hi', 10); await run(3); await z; await run(4); }
await run(8);
window.R.tosd = !!AM.S.ach.tosd; window.R.net = AM.NET.state; window.R.mail = AM.S.mail.map((x) => x.id);
await wait(300);
//--- shot progz-tos
return window.R;
