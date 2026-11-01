// Progz: download the prog (and its DLL), punt a buddy, IM bomb, fade an away message, get punted, block a punt
// with anti-punt, scroll a macro in the progz room, and get TOS'd. Segments share state through window.R.
const R = window.R = {};
AM.S.noWelcome = true;
AM.sn('xXpunkr0ckXx');
AM.connect();
AM.open('buddy');
AM.buddyOn('jenny4eva'); AM.buddyOn('cousinTJ'); AM.buddyOn('SkaterDude182');
AM.open('progz'); R.noDllBlocked = !AM.win('progz');
document.querySelectorAll('.dialog').forEach((d) => d._w.close(true));
R.loaded = AM.progz();
AM.place('progz', 20, 20, 440, 450);
const p1 = AM.punt('jenny4eva', 'ultra'); AM.sim(4); R.punt = await p1;
R.jennyAfter = AM.bc.st.jenny4eva.state;
await wait(200);
//--- shot progz-punt
const p2 = AM.bomb('SkaterDude182', 'BOMBED!!!', 25); AM.sim(4); window.R.bomb = await p2; AM.sim(5);
window.R.warn = Math.round(AM.bc.warn);
document.querySelector('.tabs .tab:nth-child(3)').dispatchEvent(new PointerEvent('pointerdown'));
AM.fade('the rain falls... and nobody sees', 'Rainbow');
AM.place('away', 480, 330);
await wait(300);
//--- shot progz-fader
AM.S.antipunt = false;
const p3 = AM.punted('xX_PuNtEr_Xx'); AM.sim(3); window.R.gotPunted = await p3; window.R.bcAfterPunt = AM.bc.on;
await wait(200);
//--- shot progz-punted
document.querySelectorAll('.dialog').forEach((d) => d._w.close(true));
AM.open('buddy'); window.bcSignOnForTest = true;
AM.buddyOn('jenny4eva');
AM.S.antipunt = true;
window.R.blocked = (await AM.punted('l33t_h4x0r')) === false && AM.bc.on;
const s1 = AM.macro(null, 'LOL'); AM.sim(3); window.R.macroNoRoom = await s1;
AM.sim(5);
const ach = ['progz', 'vbdll', 'punt', 'gotpunted', 'antipunt', 'imbomb', 'fader'].filter((k) => !AM.S.ach[k]);
window.R.missing = ach;
window.R.strikes = AM.PROG.strikes;
return window.R;
