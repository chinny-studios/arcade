// click through the screens with the real DOM
VB.sim(2);
return document.body.dataset.state;
//--- shot ui_title
document.querySelector('#btnPatrol').click(); VB.sim(1.5);
return [document.body.dataset.state, document.querySelectorAll('#cards .card').length];
//--- shot ui_select
document.querySelector('#cards .card[data-id="bulwark"]').dispatchEvent(new Event('mouseenter')); VB.sim(1.5);
return document.querySelector('#selBlurb').textContent;
//--- shot ui_select2
document.querySelector('#goBtn').click(); VB.sim(1);
const st = [document.body.dataset.state, VB.P && VB.P.id];
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); VB.sim(0.1); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
st.push(!document.querySelector('#pause').hidden);
return st;
//--- shot ui_pause
document.querySelector('#pHero').click(); VB.sim(0.2);
const n = document.querySelectorAll('#hcards .card').length;
return n;
//--- shot ui_heroes
document.querySelector('#hcards .card[data-id="blitz"]').click(); VB.sim(0.5);
const r = [VB.P.id, document.querySelector('#heroes').hidden, VB.UI.paused()];
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); VB.sim(0.1); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM' }));
r.push(!document.querySelector('#map').hidden);
return r;
//--- shot ui_map
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' })); VB.sim(0.1); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyM' }));
document.querySelector('#hudPause') && 0;
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); VB.sim(0.1); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
document.querySelector('#pOptions').click(); VB.sim(0.2);
return document.querySelectorAll('#optList > *').length;
//--- shot ui_options
document.querySelector('#optBack').click(); document.querySelector('#pHelp').click(); VB.sim(0.2);
return 1;
//--- shot ui_help
document.querySelector('#helpBack').click(); document.querySelector('#pQuit').click(); VB.sim(0.5);
return [document.body.dataset.state, !!VB.P];
