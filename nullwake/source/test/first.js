out.r = [NW.stats()];
await wait(300);
//--- shot start
out.r.push(NW.sim(20, { still: true }));
//--- shot t20
out.r.push(NW.sim(60));
return out.r;
//--- shot t80
