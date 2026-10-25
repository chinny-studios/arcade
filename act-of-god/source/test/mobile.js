// phone layout: title, then play with a power selected
await wait(300);
//--- shot m_title
AG.start({ size: 'city', seed: 39595 });
document.body.classList.add('touch');
AG.select('meteor');
const c = AG.centre();
AG.look(c.x, c.z, 900, 0.6);
AG.cast('tornado', c.x, c.z, 0.5);
AG.sim(4);
AG.render();
return AG.stats();
//--- shot m_play
