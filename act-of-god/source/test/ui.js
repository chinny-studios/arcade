// title screen, then choose a size and begin through the buttons, then use a power with pointer events
await wait(500);
return { state: AG.G.state, name: AG.W.name };
//--- shot ui_title
document.querySelector('.size[data-k="small"]').click();
await wait(2500);
return { state: AG.G.state, name: AG.W.name, size: AG.W.sizeKey, b: AG.W.buildings.length };
//--- shot ui_title_small
document.querySelector('#begin').click();
await wait(300);
const help = !document.querySelector('#help').hidden;
document.querySelector('#helpClose').click();
await wait(200);
return { help, state: AG.G.state };
//--- shot ui_play
const cv = document.querySelector('#c');
document.querySelector('.pw[data-id="lightning"]').click();
const x = innerWidth / 2, y = innerHeight * 0.35;
const ev = (t, o = {}) => cv.dispatchEvent(new PointerEvent(t, Object.assign({ clientX: x, clientY: y, button: 0, buttons: 1, pointerId: 1, pointerType: 'mouse', bubbles: true }, o)));
ev('pointermove'); await wait(100);
ev('pointerdown'); await wait(1200); ev('pointerup');
await wait(300);
return { cursor: AG.G.cursor, casts: AG.G.casts, s: AG.stats(), info: document.querySelector('#pName').textContent };
//--- shot ui_cast
document.querySelector('#tabGrace').click();
document.querySelector('.pw[data-id="rainbow"]').click();
const cv = document.querySelector('#c');
const ev = (t, o = {}) => cv.dispatchEvent(new PointerEvent(t, Object.assign({ clientX: innerWidth / 2, clientY: innerHeight * 0.35, button: 0, buttons: 1, pointerId: 1, pointerType: 'mouse', bubbles: true }, o)));
ev('pointermove'); ev('pointerdown'); ev('pointerup');
document.querySelector('#btnMenu').click();
await wait(300);
return { state: AG.G.state, menu: !document.querySelector('#menu').hidden };
//--- shot ui_menu
