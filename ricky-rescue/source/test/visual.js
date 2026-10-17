// A screenshot tour (run with --no-start): title, station tabs, driving by day and night, a crash scene with the fire
// engine, an indoor care scene, the back of the rig, the hospital bay, the review and the map.
await wait(1500);
//--- shot v01_title
document.querySelector('#titleMenu button').click(); await wait(300);
//--- shot v02_create
document.querySelector('#crGo') && document.querySelector('#crGo').click(); await wait(800);
//--- shot v03_station
[...document.querySelectorAll('#stTabs button')].find((b) => b.textContent === 'Garage').click(); await wait(800);
//--- shot v04_garage
[...document.querySelectorAll('#stTabs button')].find((b) => b.textContent === 'Career').click(); await wait(300);
//--- shot v05_career
await RR.start({ rank: 2, hour: 10 });
RR.call('chest', { district: 'eastgate' });
RR.sim(14); RR.render(); await wait(800);
//--- shot v06_drive_day
RR.time(21.5); RR.RIG.siren = true; RR.sim(6); RR.render(); await wait(800);
//--- shot v07_drive_night
RR.time(16.5); RR.UI.hide('review');
RR.G.call = null; RR.f.backInService(); RR.sim(0.5);
RR.call('mvc'); RR.toScene(); RR.C.fireEta = 0; RR.sim(1); RR.f.exitCab();
RR.PLAYER.x = RR.P.where.x + 3; RR.PLAYER.z = RR.P.where.z + 3; RR.sim(1.5); RR.render(); await wait(800);
//--- shot v08_mvc
RR.toPatient(); RR.act('ppe'); RR.act('impression'); RR.act('abc'); RR.act('collar', 'partner', false); RR.sim(1); RR.render(); await wait(800);
//--- shot v09_mvc_care
RR.UI.hide('review'); RR.G.call = null; RR.f.backInService(); RR.sim(0.5);
RR.call('stroke'); RR.toScene(); RR.toPatient(); RR.act('ppe'); RR.act('impression'); RR.act('monitor', 'partner', false); RR.act('stroke'); RR.sim(1); RR.render(); await wait(800);
//--- shot v10_interior_care
RR.f.closeCare(); RR.sim(0.5); RR.render(); await wait(600);
//--- shot v11_interior
RR.pack('chair'); RR.sim(0.5); RR.render(); await wait(600);
//--- shot v12_transport_panel
RR.transport('mercy', 'partner', 'stroke', true); RR.sim(6); RR.render(); await wait(800);
//--- shot v13_back
RR.arrive(); RR.sim(1); RR.render(); await wait(800);
//--- shot v14_bay
RR.handoff(true); await wait(500);
//--- shot v15_review
RR.UI.hide('review'); RR.f.backInService(); RR.UI.show('mapBig'); RR.sim(0.3); await wait(500);
//--- shot v16_map
