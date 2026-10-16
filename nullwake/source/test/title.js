// Screenshots of the title, pilot, stage and hangar menus. Run with --no-start.
await wait(800);
//--- shot title
document.querySelector('[data-act="launch"]').click(); await wait(300);
//--- shot pilots
document.querySelector('[data-arg="ryn"]').click(); await wait(300);
//--- shot stages
NW.UI.title(); document.querySelector('[data-act="hangar"]').click(); await wait(300);
//--- shot hangar
