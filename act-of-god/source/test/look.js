const c = AG.centre();
AG.look(c.x, c.z, 900, 0.65);
AG.sim(2);
AG.render();
return AG.stats();
//--- shot city
AG.look(c.x, c.z, 300, 0.45);
AG.sim(1);
AG.render();
//--- shot close
