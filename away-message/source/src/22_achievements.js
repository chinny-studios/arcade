// Achievements: the throwback checklist. unlock(id) marks one done (first time only), pops a toast and plays a
// chime. openAchievements() shows the trophy case, grouped, with a progress bar and a few secrets.
const ACH = [
  // getting around
  { id: 'connect', g: 'Online', name: 'You\'ve Got Dial-Up', desc: 'Connect to the Internet with AmeriNet.' },
  { id: 'mom', g: 'Online', name: 'MOM! I was USING that!', desc: 'Get knocked offline when someone picks up the phone.' },
  { id: 'fivemore', g: 'Online', name: 'Five More Minutes', desc: 'Ask Mom for five more minutes.' },
  { id: 'goodkid', g: 'Online', name: 'Good Kid', desc: 'Sign off nicely when Mom asks for the phone.' },
  { id: 'mail', g: 'Online', name: 'You\'ve Got Mail', desc: 'Read your e-mail.' },
  { id: 'chain', g: 'Online', name: 'Bill Grates Owes You', desc: 'Forward a chain letter to everyone you know.' },
  { id: 'browse', g: 'Online', name: 'Surfing the Web', desc: 'Open Internet Exploder.' },
  { id: 'guestbook', g: 'Online', name: 'Sign My Guestbook', desc: 'Sign someone\'s GeoPages guestbook.' },
  // music
  { id: 'dl1', g: 'Snapster', name: 'First Download', desc: 'Download a song from Snapster.' },
  { id: 'dl10', g: 'Snapster', name: 'Mix CD Material', desc: 'Download 10 songs.' },
  { id: 'dl25', g: 'Snapster', name: 'Fill the Hard Drive', desc: 'Download 25 songs.' },
  { id: 'fake', g: 'Snapster', name: 'That\'s Not the Song', desc: 'Play a fake file: silence, or some guy talking.' },
  { id: 'wrongsong', g: 'Snapster', name: 'Mislabeled', desc: 'Download a song that turned out to be a different song.' },
  { id: 'incomplete', g: 'Snapster', name: 'Unexpected End of File', desc: 'Play a download that cuts off halfway.' },
  { id: 'lowbit', g: 'Snapster', name: 'It\'s Kind of Fuzzy', desc: 'Play a song at 64 kbps or lower.' },
  { id: 'hifi', g: 'Snapster', name: 'Audiophile', desc: 'Download a song at 320 kbps.' },
  { id: 'sharer', g: 'Snapster', name: 'Good Citizen', desc: 'Let five people upload songs from you.' },
  { id: 'leech', g: 'Snapster', name: 'Leech', desc: 'Block all your uploads.', secret: true },
  { id: 'live', g: 'Snapster', name: 'Live Bootleg', desc: 'Play a live version with a cheering crowd.' },
  { id: 'play1', g: 'Snapster', name: 'Crank It Up', desc: 'Play a song in ZapAmp.' },
  { id: 'skin', g: 'Snapster', name: 'Fresh Skin', desc: 'Change the ZapAmp skin.' },
  { id: 'scope', g: 'Snapster', name: 'Oscilloscope', desc: 'Switch ZapAmp\'s visualizer to the scope.', secret: true },
  // buddychat
  { id: 'buddy', g: 'BuddyChat', name: 'Sign On', desc: 'Sign on to BuddyChat.' },
  { id: 'im', g: 'BuddyChat', name: 'brb', desc: 'Send an instant message.' },
  { id: 'away', g: 'BuddyChat', name: 'Away From Keyboard', desc: 'Set an away message.' },
  { id: 'deepaway', g: 'BuddyChat', name: 'So Deep', desc: 'Score 60%+ on the Deep-o-Meter.' },
  { id: 'deepest', g: 'BuddyChat', name: 'Poet Laureate', desc: 'Have the deepest away message on the board.' },
  { id: 'awayboard', g: 'BuddyChat', name: 'Who\'s Away', desc: 'Open the Away Message Board.' },
  { id: 'profile', g: 'BuddyChat', name: 'My Profile', desc: 'Write your BuddyChat profile.' },
  { id: 'lyrics', g: 'BuddyChat', name: 'Song Lyric Profile', desc: 'Quote song lyrics in your profile or away message.' },
  { id: 'survey', g: 'BuddyChat', name: 'Get 2 Know Me', desc: 'Fill out the survey and put it in your profile.' },
  { id: 'sendfile', g: 'BuddyChat', name: 'Sharing is Caring', desc: 'Send a buddy the song they asked for.' },
  { id: 'crush', g: 'BuddyChat', name: 'It\'s a Date', desc: 'Make plans with your crush.', secret: true },
  { id: 'chatroom', g: 'BuddyChat', name: 'A/S/L?', desc: 'Enter a chat room.' },
  { id: 'warnbuddy', g: 'BuddyChat', name: 'Warned!', desc: 'Warn one of your buddies (rude!).', secret: true },
  { id: 'info', g: 'BuddyChat', name: 'Nosy', desc: 'Read someone\'s member info.' },
  { id: 'blocked', g: 'BuddyChat', name: 'Blocked', desc: 'Annoy a buddy until they block you.', secret: true },
  { id: 'sentvirus', g: 'BuddyChat', name: 'Some Friend', desc: 'Send a buddy a file that was actually a virus.', secret: true },
  // bongo
  { id: 'bongo', g: 'Bongo', name: 'Meet Bongo', desc: 'Say hello to Bongo Buddy.' },
  { id: 'bongojoke', g: 'Bongo', name: 'Chocolate Chimp', desc: 'Let Bongo tell you a joke.' },
  { id: 'bongosing', g: 'Bongo', name: 'Bongo\'s Greatest Hit', desc: 'Make Bongo sing a song.' },
  { id: 'bongoall', g: 'Bongo', name: 'Bongo Unplugged', desc: 'Hear Bongo sing every song.' },
  { id: 'bongodance', g: 'Bongo', name: 'Dance, Bongo, Dance', desc: 'Watch Bongo dance to music.' },
  { id: 'bongodrag', g: 'Bongo', name: 'Weeee!', desc: 'Pick Bongo up and throw him around.' },
  { id: 'adware', g: 'Bongo', name: 'It\'s FREE!', desc: 'Let Bongo install something "free" for you.' },
  { id: 'adware6', g: 'Bongo', name: 'Toolbar Collector', desc: 'Have six of Bongo\'s "gifts" installed at once.' },
  { id: 'anyway', g: 'Bongo', name: 'I\'ll Install It Anyway', desc: 'Say no to Bongo and watch him do it anyway.', secret: true },
  { id: 'popups10', g: 'Bongo', name: 'Pop-Up Storm', desc: 'Suffer through 10 pop-up ads.' },
  { id: 'clickad', g: 'Bongo', name: '1,000,000th Visitor', desc: 'Click one of those "You won!" pop-ups.', secret: true },
  { id: 'uninstall', g: 'Bongo', name: 'Finally Free', desc: 'Remove Bongo Buddy for good.' },
  { id: 'bongo99', g: 'Bongo', name: '99% Complete', desc: 'Watch the Bongo uninstaller get stuck at 99%.', secret: true },
  { id: 'bongoback', g: 'Bongo', name: 'Guess Who\'s Back', desc: 'Watch Bongo reinstall himself.', secret: true },
  { id: 'keepbongo', g: 'Bongo', name: 'You Do Love Me', desc: 'Change your mind and keep Bongo.', secret: true },
  { id: 'killupdater', g: 'Bongo', name: 'Cut the Cord', desc: 'Disable Bongo Search Assistant with Ad-Be-Gone.' },
  // viruses & system
  { id: 'virus', g: 'System', name: 'Illegal Operation', desc: 'Catch a virus from a bad download.' },
  { id: 'melt', g: 'System', name: 'It\'s Melting', desc: 'Watch the screen melt.', secret: true },
  { id: 'cleaned', g: 'System', name: 'Disinfected', desc: 'Clean a virus with VirusBlaster.' },
  { id: 'liveupdate', g: 'System', name: 'Up To Date', desc: 'Update your virus definitions with LiveUpdate.' },
  { id: 'blocked2', g: 'System', name: 'Caught in the Act', desc: 'Have VirusBlaster block a virus before it runs.' },
  { id: 'bsod', g: 'System', name: 'Blue Screen of Death', desc: 'See the famous blue screen.' },
  { id: 'shutdown', g: 'System', name: 'It\'s Now Safe', desc: 'Shut down properly from the Start menu.' },
  { id: 'dos', g: 'System', name: 'C:\\>', desc: 'Open the DOS prompt.' },
  { id: 'format', g: 'System', name: 'Just Kidding', desc: 'Try to FORMAT C: in DOS.', secret: true },
  { id: 'regedit', g: 'System', name: 'Don\'t Touch That', desc: 'Open the Registry Editor.', secret: true },
  { id: 'sysfile', g: 'System', name: 'Load-Bearing File', desc: 'Delete a system file. Bold move.', secret: true },
  { id: 'wallpaper', g: 'System', name: 'Make It Yours', desc: 'Change the desktop wallpaper.' },
  { id: 'scheme', g: 'System', name: 'Eggplant', desc: 'Change the color scheme.' },
  { id: 'scandisk', g: 'System', name: 'Checking Drives', desc: 'Sit through a ScanDisk check.' },
  { id: 'pipes', g: 'System', name: '3D Pipes', desc: 'Watch the 3D Pipes screen saver.' },
  { id: 'mousetrails', g: 'System', name: 'Where\'s My Cursor', desc: 'Turn on mouse trails.', secret: true },
  { id: 'showext', g: 'System', name: 'Show Me Everything', desc: 'Turn off "hide file extensions".' },
  // games
  { id: 'mines', g: 'Games', name: 'Minesweeper', desc: 'Win a game of Mine Finder.' },
  { id: 'minesexpert', g: 'Games', name: 'Expert', desc: 'Win Mine Finder on Expert.', secret: true },
  { id: 'solitaire', g: 'Games', name: 'The Waterfall', desc: 'Win a game of Solitaire.' },
  { id: 'pinball', g: 'Games', name: 'Game Over', desc: 'Finish a game of 3D Pinball.' },
  { id: 'pinball50k', g: 'Games', name: 'High Score', desc: 'Score 50,000 in 3D Pinball.', secret: true },
  { id: 'gerbil', g: 'Games', name: 'Dancing Gerbils', desc: 'Run the dancing gerbil program.', secret: true },
  // progz
  { id: 'progz', g: 'Progz', name: 'Elite Haxor', desc: 'Load a prog.' },
  { id: 'vbdll', g: 'Progz', name: 'DLL Not Found', desc: 'Try to run a prog without VB40032.DLL.', secret: true },
  { id: 'punt', g: 'Progz', name: 'Punted', desc: 'Punt someone off BuddyChat.' },
  { id: 'gotpunted', g: 'Progz', name: 'Lamer', desc: 'Get punted off BuddyChat yourself.' },
  { id: 'antipunt', g: 'Progz', name: 'Anti-Punt', desc: 'Block a punt with anti-punt.' },
  { id: 'imbomb', g: 'Progz', name: 'IM Bomber', desc: 'IM bomb someone.' },
  { id: 'fader', g: 'Progz', name: 'Taste the Rainbow', desc: 'Put faded text in your away message.' },
  { id: 'macro', g: 'Progz', name: 'Scroller', desc: 'Scroll a macro in a chat room.' },
  { id: 'tosd', g: 'Progz', name: 'TOS\'d', desc: 'Get kicked off AmeriNet for breaking the Terms of Service.', secret: true },
  // secrets / easter eggs
  { id: 'secretbongo', g: 'Secrets', name: 'He\'s Everywhere', desc: 'Summon Bongo from the Run box.', secret: true },
  { id: 'bongosite', g: 'Secrets', name: 'Bongo HQ', desc: 'Visit a Bongo web site.', secret: true },
  { id: 'trashbongo', g: 'Secrets', name: 'I\'m Not Trash', desc: 'Try to drag Bongo into the Recycle Bin.', secret: true },
  { id: 'notepad', g: 'Secrets', name: 'Dear Diary', desc: 'Save a file in Notepad.', secret: true },
  { id: 'emptybin', g: 'Secrets', name: 'Taking Out the Trash', desc: 'Empty the Recycle Bin.', secret: true },
];
const ACH_BY = {}; for (const a of ACH) ACH_BY[a.id] = a;
const ACH_SEEN = {};
function unlock(id) {
  if (S.ach[id] || ACH_SEEN[id]) return;
  ACH_SEEN[id] = true;
  const a = ACH_BY[id];
  if (!a) { console.warn('unknown achievement', id); return; }
  S.ach[id] = Date.now(); save();
  SFX.tada(); confetti();
  const done = Object.keys(S.ach).filter((k) => ACH_BY[k]).length;
  toast('Achievement Unlocked!', `<b>${esc(a.name)}</b><br><span style="font-size:11px">${esc(a.desc)}</span>`, 'trophy');
  if (BONGO.shown && S.bongo.installed && chance(0.3)) after(2, () => bongoSay(pick(['Yay! You got an achievement!', 'Way to go, ' + (S.sn || 'buddy') + '!', 'Achievement! I\'m so proud!']), { emote: 'love', mute: false }));
  if (done >= ACH.length) unlockAll();
  emit('ach', id);
}
function unlockAll() { if (S.ach._all) return; S.ach._all = Date.now(); save(); after(1.5, () => { confetti(null, null, 160); msgBox({ title: 'Congratulations!', icon: 'trophy', winIcon: 'trophy', text: 'You found EVERYTHING!\n\nYou have unlocked every achievement in Away Message. You truly lived the summer of 2001.\n\nNow go outside. (Just kidding. Stay online.)' }); }); }
function openAchievements() {
  const groups = [...new Set(ACH.map((a) => a.g))];
  const body = h('div', { class: 'col grow', style: 'gap:0;min-height:0' });
  const done = Object.keys(S.ach).filter((k) => ACH_BY[k]).length, total = ACH.length;
  const head = h('div', { class: 'row pad', style: 'flex:none;align-items:center;gap:10px' }, img('trophy', 32), h('div', { class: 'grow' }, h('b', { text: `My Achievements — ${done} of ${total}` }), h('div', { class: 'bar', style: 'margin-top:3px' }, h('i', { style: `width:${done / total * 100}%;background:linear-gradient(90deg,#ffd400,#ff9000)` }))), h('button', { class: 'btn sm', text: 'Reset All Save Data', onclick: () => msgBox({ title: 'Reset', icon: 'warn', text: 'This erases ALL your progress, files, achievements and settings, and restarts the computer. Are you sure?', buttons: ['Yes, erase it', 'Cancel'], def: 1 }).then((b) => { if (b === 'Yes, erase it') { resetSave(); restartPC(true); } }) }));
  const scroll = h('div', { class: 'lv', style: 'padding:6px' });
  for (const g of groups) {
    const list = ACH.filter((a) => a.g === g);
    scroll.append(h('div', { style: 'font-weight:bold;background:var(--face);box-shadow:var(--thin);padding:3px 6px;margin:4px 0 2px', text: `${g} (${list.filter((a) => S.ach[a.id]).length}/${list.length})` }));
    for (const a of list) {
      const got = S.ach[a.id];
      const hidden = a.secret && !got;
      scroll.append(h('div', { style: 'display:flex;gap:8px;padding:4px 6px;align-items:center;' + (got ? '' : 'opacity:.55') }, img(got ? 'trophy' : hidden ? 'help' : 'star', 24),
        h('div', { class: 'grow' }, h('b', { text: hidden ? '??? Secret Achievement' : a.name }), h('div', { style: 'font-size:11px', text: hidden ? 'Keep playing to discover this one.' : a.desc })),
        got ? h('span', { style: 'color:#060;font-size:11px', text: '\u2713 Done' }) : null));
    }
  }
  body.append(head, h('hr', { class: 'etch' }), scroll);
  openWin({ key: 'trophy', title: 'My Achievements', icon: 'trophy', w: 460, h: 420, body });
}
