await wait(1500);
WL.render && 0;
//--- shot menu
F.openCAS();
await wait(1200);
//--- shot cas
document.querySelector('[data-ctab="looks"]').click();
await wait(800);
//--- shot cas_looks
document.querySelector('[data-ctab="pers"]').click();
await wait(500);
//--- shot cas_pers
document.querySelector('#cAdd').click(); await wait(300);
document.querySelector('[data-ctab="basics"]').click();
await wait(800);
//--- shot cas_add
