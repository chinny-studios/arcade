// Checks specific flows render: AmeriNet portal, a Snapster search with results, the mail window, achievements.
AM.sn('tester01');
AM.connect();
AM.open('ie');
await wait(900);
//--- shot portal
AM.open('snapster');
await wait(200);
// run a real search via the UI hook
window.__n = AM.search('nsynk', '');
AM.S.files.push({ id: 'z1', dir: 'music', name: '*NSYNK - Bye Bye.mp3', size: 3200000, track: { songId: 'nsynk', artist: '*NSYNK', title: 'Bye Bye Bye Bye', genre: 'boyband', kind: 'song', kbps: 128 }, date: '6/15/01', fromUser: 'dj_tunez' });
AM.unlock('dl1');
await wait(200);
AM.open('mail');
await wait(400);
//--- shot mail
AM.unlockAll();
await wait(300);
AM.open('trophy');
await wait(300);
//--- shot trophy
return { searchResults: window.__n };
