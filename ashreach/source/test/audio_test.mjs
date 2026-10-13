// Node smoke test for 18_audio.js without a browser: API surface and graceful no-AudioContext behaviour.
// Real rendering checks (peak levels, non-silence) run in the browser: see test/audio_view.html (audioSelfTest()).
import { load } from './load.mjs';
const A = load(['18_audio.js'], ['audioInit', 'sfx', 'setMusic', 'setAmbience', 'setMuted', 'setVolume', 'audioUpdate', 'AC', 'muted', 'AUD_SFX', 'AUD_MUSIC', 'AUD_AMB', 'audioListener', 'audVol']);
const need = ['hit_melee','hit_proj','hit_energy','crit','miss','shoot_pistol','shoot_rifle','shoot_smg','shoot_shotgun','shoot_heavy','shoot_energy','swing','punch','cast_start','cast_done','cast_fail','heal','buff','debuff','levelup','loot','coin','ui_click','ui_open','ui_close','error','death','mob_die','footstep','mission','mission_done','zone','hopper','chirp','growl','screech','drone_hum','golem_stomp','wyrm','tell'];
const miss = need.filter((n) => !A.AUD_SFX[n]);
if (miss.length) throw new Error('missing sfx ' + miss);
for (const m of ['calm','city','tense','dungeon','combat','title']) if (!A.AUD_MUSIC[m]) throw new Error('missing mood ' + m);
for (const k of ['desert','forest','city','cave','ocean','scar','interior']) if (!A.AUD_AMB[k]) throw new Error('missing ambience ' + k);
A.audioInit(); A.sfx('hit_melee'); A.sfx('nope', { x: 1, y: 0, z: 1 }); A.setMusic('calm'); A.setAmbience('desert');
A.setVolume(2, -1, 0.5); A.setMuted(true); A.audioUpdate(0.016, { x: 1, y: 2, z: 3 }, 0.5);
if (A.audVol.master !== 1 || A.audVol.music !== 0) throw new Error('volume clamp');
if (A.audioListener.x !== 1 || A.audioListener.yaw !== 0.5) throw new Error('listener');
console.log('audio api ok');
