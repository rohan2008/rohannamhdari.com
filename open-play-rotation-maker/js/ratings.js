// DUPR (2.00–8.00): checking what was typed, and turning it into a 0–1 skill scale so the rotation can compare players.

// What's wrong with a typed rating, or '' if it's fine. Blank is fine: the player is treated as mid-pack.
function ratingError(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  const r = Number(v);
  if (!isFinite(r)) return 'Not a number. Type a DUPR like 3.75.';
  if (r < 2 || r > 8) return 'DUPR runs 2.00 to 8.00.';
  return '';
}

// The player's DUPR as a number, or null when it's blank or not valid (never clamped).
function duprOf(p) {
  const v = String(p.rating ?? '').trim();
  return v && !ratingError(v) ? Number(v) : null;
}

function rawSkill(p) {
  const r = duprOf(p);
  return r === null ? null : (r - 2) / 6;
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
  const r = duprOf(p);
  return r === null ? 'No rating' : 'DUPR ' + r.toFixed(2);
}
