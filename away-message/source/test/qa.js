// QA pass: render the mini-games, Control Panel, a virus effect, mail, and the Bongo uninstall dialog.
AM.sn('qatester');
AM.open('mines');
AM.open('sol');
AM.open('pinball');
await wait(500);
//--- shot games
AM.win('mines') && AM.win('mines').close(true);
AM.win('sol') && AM.win('sol').close(true);
AM.win('pinball') && AM.win('pinball').close(true);
AM.open('control');
await wait(300);
AM.open('display');
await wait(300);
//--- shot control
AM.win('control') && AM.win('control').close(true);
AM.win('display') && AM.win('display').close(true);
AM.connect();
AM.open('mail');
AM.sim(140);
await wait(400);
//--- shot mail
AM.win('mail') && AM.win('mail').close(true);
AM.virus('popups');
await wait(300);
AM.bongo();
AM.adware('bongobar');
AM.adware('casino');
await wait(300);
//--- shot adware
return { wins: AM.wins().length };
