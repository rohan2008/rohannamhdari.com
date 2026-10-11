// Session state (S), saving to the browser, and adding players.

let loadNotice = ''; // one-time message for the first screen, set by load()
let S = load();

function fresh() {
  return { format: 'doubles', courts: 2, grouping: 'balanced', players: [], names: {}, rounds: [], example: false,
           mode: 'open', tourney: null, bracketSize: null, draftTeams: null, teamMode: 'random', pickedTeams: [], teamNames: {},
           hideCourts: true, timerMin: 0, timerEnd: null };
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) {} }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!s || !Array.isArray(s.players)) return null;
    // Sessions saved when tennis was an option: ratings stay as typed, but they may be UTR numbers.
    if (s.sport === 'tennis') loadNotice = 'Tennis was removed. Check your players’ ratings are DUPR.';
    delete s.sport;
    if (!MODE_NAMES[s.mode]) s.mode = 'open';
    return s;
  }
  catch (e) { return null; }
}

function addPlayer(name, rating) {
  name = name.trim(); if (!name) return;
  const p = { id: uid(), name, rating: (rating || '').trim(), here: true, offset: 0 };
  if (S.rounds.length) p.offset = lateCredit(p.id);
  S.players.push(p);
  S.names[p.id] = name; // kept so history still shows removed players
}

const playerOf = id => S.players.find(p => p.id === id) || { id, name: nameOf(id), rating: '' };
const nameOf = id => (S.players.find(p => p.id === id) || {}).name || S.names[id] || 'Removed player';
