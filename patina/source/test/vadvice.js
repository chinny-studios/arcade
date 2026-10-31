// sanding a violin should warn about the original varnish; wire on the ebony should warn about scratches
PA.sim(2); PA.view(0.0, 0.08, 0.5, [0, 0.2, 0]);
const find = (name) => { for (let y = 100; y < 640; y += 16) for (let x = 300; x < 1000; x += 16) { const h = PA.pickAt(x, y); if (h && h.part === name) return [x, y]; } };
const top = find('Top'), eb = find('Ebony fittings'), r = { top, eb };
PA.brush(top[0], top[1], 'sand', 1.5); r.sandTop = PA.lastAdvice();
PA.brush(eb[0], eb[1], 'wire', 1.5); r.wireEbony = PA.lastAdvice();
return r;
