// Turns DUPR / UTR / BWF ranking into one 0–1 skill scale so the rotation can compare players.

function rawSkill(p) {
  const r = parseFloat(String(p.rating).replace('#', ''));
  if (!isFinite(r)) return null;
  const clamp = v => Math.max(0, Math.min(1, v));
  if (S.sport === 'pickleball') return clamp((r - 2) / 6);
  if (S.sport === 'tennis') return clamp((r - 1) / 15.5);
  return clamp(1 - Math.log10(Math.max(1, r)) / Math.log10(3000)); // badminton rank: lower number = stronger
}

// Skill for every player in the list; unrated players get the group's median.
function skillMap(list) {
  const known = list.map(rawSkill).filter(v => v !== null).sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 0.5;
  const m = {};
  list.forEach(p => { const v = rawSkill(p); m[p.id] = v === null ? median : v; });
  return m;
}

function fmtRating(p) {
  const r = parseFloat(String(p.rating).replace('#', ''));
  if (!isFinite(r)) return S.sport === 'badminton' ? 'Unranked' : 'No rating';
  if (S.sport === 'badminton') return 'World #' + Math.round(r);
  return (S.sport === 'tennis' ? 'UTR ' : 'DUPR ') + r.toFixed(2);
}
