// the menus, driven by clicks in real time
await wait(1500);
return SH.state;
//--- shot ui_title
document.querySelector('#btnPlay').click(); await wait(800);
document.querySelector('.mapc[data-id="saratoga"]').click();
document.querySelector('#segMode button[data-v="breakthrough"]').click(); await wait(500);
return SH.state;
//--- shot ui_setup
document.querySelector('#setupGo').click();
for (let i = 0; i < 60 && SH.state !== 'deploy'; i++) await wait(250);
await wait(1500);
return { state: SH.state, map: SH.MATCH.map.id, mode: SH.MATCH.mode };
//--- shot ui_deploy
document.querySelectorAll('.clsc')[1].click(); await wait(300);
document.querySelector('#deployBtn').click(); await wait(2500);
return { state: SH.state, cls: P.s.cls, alive: P.s.state };
//--- shot ui_play
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); await wait(800);
return SH.state;
//--- shot ui_pause
document.querySelector('#pSet').click(); await wait(500);
//--- shot ui_settings
document.querySelector('#setDone').click(); document.querySelector('#pHelp').click(); await wait(500);
//--- shot ui_help
document.querySelector('#helpDone').click(); SH.f.finishMatch(P.s.team); SH.manual(true); SH.sim(7); SH.manual(false); await wait(800);
return SH.state;
//--- shot ui_end
