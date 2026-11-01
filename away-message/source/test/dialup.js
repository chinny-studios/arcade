// The dial-up "dialing" screen mid-handshake, and a screen saver.
AM.sn('dialer');
AM.open('amerinet');
// enter the dialing state without fully connecting
AM.NET.state = 'dialing'; AM.NET.step = 1; AM.NET.attempts = 1;
AM.win('amerinet').render();
await wait(300);
//--- shot dialing
AM.NET.state = 'off';
AM.saver('starfield');
await wait(600);
//--- shot saver
return 'ok';
