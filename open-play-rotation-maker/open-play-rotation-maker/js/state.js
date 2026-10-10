// Session state (S), saving to the browser, and adding players.

let S = load();

function fresh() {
  return { sport: 'pickleball', format: 'doubles', courts: 2, grouping: 'balanced', players: [], names: {}, rounds: [], example: false };
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) {} }
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); return s && Array.isArray(s.players) ? s : null; }
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
