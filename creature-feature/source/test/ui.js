// click through the menus without the debug start
await wait(500);
const st0 = document.body.dataset.state;
document.querySelector('#btnHunt').click();
await wait(2500);
return { st0, st1: document.body.dataset.state, cards: document.querySelectorAll('#cards .card').length };
//--- shot select
document.querySelector('#cards .card[data-id="frank"]').dispatchEvent(new Event('mouseenter'));
await wait(2500);
//--- shot select2
document.querySelector('#goBtn').click();
await wait(1500);
//--- shot intro
await wait(4000);
CF.sim(2);
return CF.stats();
//--- shot playing
CF.G.hunger = 0.5; CF.sim(1); await wait(500);
return { over: CF.G.over, menu: !document.querySelector('#over').hidden };
//--- shot theend
document.querySelector('#again').click(); await wait(500);
return CF.stats();
