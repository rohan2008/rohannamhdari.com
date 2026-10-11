// Wires buttons, toggles and inputs to the state.

// Copy text for the group chat, with a plain message if the browser blocks it.
async function copyText(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); }
  catch (e) { toast('Your browser blocked copying. Select the text and copy it by hand.'); }
}

// Two-tap confirm for destructive buttons: the first tap changes the label, the second within 3.5s acts.
function confirmTap(btn, armedLabel, act) {
  if (btn.dataset.armed) { delete btn.dataset.armed; return act(); }
  const label = btn.textContent;
  btn.dataset.armed = '1'; btn.textContent = armedLabel;
  setTimeout(() => { if (btn.isConnected && btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = label; } }, 3500);
}

// ---------- settings ----------
document.querySelectorAll('input[name=format]').forEach(el => el.addEventListener('change', () => {
  S.format = el.value; S.draftTeams = null; // a custom pairing doesn't carry across formats
  save(); render();
}));
document.querySelectorAll('input[name=grouping]').forEach(el => el.addEventListener('change', () => { S.grouping = el.value; save(); renderSettings(); }));
$('courtsDown').onclick = () => { S.courts = Math.max(1, S.courts - 1); save(); renderSettings(); renderBoard(); renderTourney(); };
$('courtsUp').onclick = () => { S.courts = Math.min(30, S.courts + 1); save(); renderSettings(); renderBoard(); renderTourney(); };

$('hideCourts').onchange = e => {
  S.hideCourts = e.target.checked;
  // Turning it off also shows the round that's on court now.
  const r = S.rounds[S.rounds.length - 1];
  if (!S.hideCourts && r) r.shown = r.courts.map((c, i) => i);
  save(); renderBoard();
};
$('timerMin').onchange = e => {
  S.timerMin = +e.target.value;
  if (!S.timerMin) S.timerEnd = null;
  save(); renderTimer();
  toast(S.timerMin ? `Round timer set to ${S.timerMin} minutes. It starts when you press Next round.` : 'Round timer off.');
};

// ---------- roster ----------
function showRatingHint(li, value) {
  const err = ratingError(value);
  li.classList.toggle('bad', !!err);
  const input = li.querySelector('[id^="rt-"]'); input.setAttribute('aria-invalid', !!err);
  const hint = li.querySelector('.rhint'); hint.textContent = err; hint.hidden = !err;
}

$('roster').addEventListener('input', e => {
  const li = e.target.closest('li'); if (!li) return;
  const p = S.players.find(x => x.id === li.dataset.id);
  if (e.target.id.startsWith('nm-')) { p.name = e.target.value; if (p.name.trim()) S.names[p.id] = p.name; }
  if (e.target.id.startsWith('rt-')) { p.rating = e.target.value.trim(); showRatingHint(li, p.rating); }
  save(); renderLive();
});

function checkIn(p, here) {
  if (p.here === here) return;
  p.here = here;
  if (here && S.rounds.length) p.offset = Math.max(p.offset || 0, lateCredit(p.id));
}

$('roster').addEventListener('change', e => {
  if (!e.target.id.startsWith('in-')) return;
  const li = e.target.closest('li');
  const p = S.players.find(x => x.id === li.dataset.id);
  checkIn(p, e.target.checked);
  li.classList.toggle('out', !p.here);
  save(); renderLive();
  toast(p.here ? `${p.name} checked in. They’ll be in the next round.` : `${p.name} checked out. They won’t be scheduled.`);
});

$('allIn').onclick = () => {
  const n = S.players.filter(p => !p.here).length;
  S.players.forEach(p => checkIn(p, true));
  save(); render(); toast(n ? `Checked in ${n} player${n > 1 ? 's' : ''}.` : 'Everyone is already checked in.');
};
$('allOut').onclick = () => {
  S.players.forEach(p => checkIn(p, false));
  save(); render(); toast('Everyone checked out. Tick players back in as they arrive.');
};

$('roster').addEventListener('click', e => {
  if (!e.target.classList.contains('x')) return;
  const id = e.target.closest('li').dataset.id;
  const at = S.players.findIndex(x => x.id === id);
  const [p] = S.players.splice(at, 1);
  save(); render();
  toast(`Removed ${p.name}.`, { label: 'Undo', fn: () => { S.players.splice(at, 0, p); save(); render(); toast(`${p.name} is back.`); } });
});

const sameName = n => S.players.find(p => p.name.trim().toLowerCase() === n.trim().toLowerCase());
function addHint(msg) { $('addHint').textContent = msg; $('addHint').hidden = !msg; }

$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('addName').value.trim(), r = $('addRating').value.trim();
  if (!n) { addHint('Type a name first.'); $('addName').focus(); return; }
  const dup = sameName(n);
  if (dup) { addHint(`There’s already a ${dup.name}. Add a last initial so you can tell them apart.`); $('addName').focus(); return; }
  const err = ratingError(r);
  if (err) { addHint(err + ' Or leave it blank.'); $('addRating').focus(); return; }
  addHint('');
  addPlayer(n, r);
  $('addName').value = ''; $('addRating').value = ''; $('addName').focus();
  save(); render();
});
$('addName').addEventListener('input', () => addHint(''));
$('addRating').addEventListener('input', () => addHint(''));

$('bulkAdd').onclick = () => {
  const lines = $('bulk').value.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) { toast('Paste one player per line, like "Maya Chen, 4.21".'); return; }
  let added = 0, dups = 0, bad = 0;
  lines.forEach(l => {
    const m = l.match(/^(.*?)[,\t;]\s*(\S+)?\s*$/);
    const name = (m ? m[1] : l).trim(), rating = m && m[2] ? m[2] : '';
    if (!name) return;
    if (sameName(name)) { dups++; return; }
    if (ratingError(rating)) bad++;
    addPlayer(name, rating); added++;
  });
  $('bulk').value = '';
  save(); render();
  const extra = [dups && `skipped ${dups} duplicate${dups > 1 ? 's' : ''}`, bad && `${bad} rating${bad > 1 ? 's' : ''} need fixing (outlined in red)`].filter(Boolean);
  toast(`Added ${added} player${added === 1 ? '' : 's'}${extra.length ? '; ' + extra.join(', ') : ''}.`);
};

$('clearExamples').onclick = () => {
  const keep = { format: S.format, courts: S.courts, grouping: S.grouping, mode: S.mode, hideCourts: S.hideCourts, timerMin: S.timerMin };
  S = Object.assign(fresh(), keep);
  save(); render(); $('addName').focus();
};

// ---------- rounds ----------
let lastNextTap = 0;
$('next').onclick = () => {
  if (Date.now() - lastNextTap < 1000) return; // ignore an accidental double tap
  lastNextTap = Date.now();
  const before = S.rounds.length;
  nextRound(false);
  if (S.rounds.length > before) {
    S.timerEnd = S.timerMin ? Date.now() + S.timerMin * 60000 : null;
    save(); renderTimer();
  }
};

$('courts').addEventListener('click', e => {
  if (e.target.closest('[data-fill]')) return fillCourt();
  const f = e.target.closest('.flip'); if (f) flipCourt(f);
});
$('courts').addEventListener('keydown', e => {
  const f = e.target.closest('.flip');
  if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flipCourt(f); }
});

// Flip one court. Classes are toggled in place (no re-render) so the flip animates.
function flipCourt(el) {
  const r = S.rounds[S.rounds.length - 1]; if (!r) return;
  const i = +el.dataset.court;
  if (!r.shown) r.shown = r.courts.map((c, k) => k);
  r.shown = r.shown.includes(i) ? r.shown.filter(k => k !== i) : r.shown.concat(i);
  el.style.removeProperty('--d');
  el.classList.toggle('up', r.shown.includes(i));
  save(); updateRevealButton();
}

// Flip every court, one after another.
function setAllShown(show) {
  const r = S.rounds[S.rounds.length - 1]; if (!r) return;
  r.shown = show ? r.courts.map((c, i) => i) : [];
  document.querySelectorAll('#courts .flip').forEach((el, k) => {
    el.style.setProperty('--d', `${k * 140}ms`);
    el.classList.toggle('up', show);
  });
  save(); updateRevealButton();
}
$('revealBar').onclick = () => setAllShown(true);
$('hideAll').onclick = () => setAllShown(false);

$('undo').onclick = () => {
  if (!S.rounds.length) return;
  S.rounds.pop(); S.timerEnd = null;
  save(); render(); toast('Last round removed.');
};

$('reset').onclick = e => {
  const n = S.rounds.length;
  if (!n) { toast('No rounds to clear yet.'); return; }
  confirmTap(e.currentTarget, `Clear ${n} round${n > 1 ? 's' : ''}?`, () => {
    S.rounds = []; S.timerEnd = null; S.players.forEach(p => p.offset = 0);
    save(); render(); toast(`Cleared ${n} round${n > 1 ? 's' : ''}. Players kept.`);
  });
};

$('copy').onclick = () => {
  const r = S.rounds[S.rounds.length - 1]; if (!r) return;
  const t = roundText(r, S.rounds.length - 1);
  copyText([t.head, ...t.lines].join('\n'), `Round ${S.rounds.length} copied. Paste it into your group chat.`);
};
$('history').addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const i = +b.dataset.copy, t = roundText(S.rounds[i], i);
  copyText([t.head, ...t.lines].join('\n'), `Round ${i + 1} copied.`);
});

// ---------- tournaments ----------
document.querySelectorAll('input[name=mode]').forEach(el => el.addEventListener('change', () => { S.mode = el.value; save(); render(); }));

$('tourney').addEventListener('click', e => {
  const t = e.target;
  if (t.id === 'startT') return startTourney();
  if (t.id === 'seedB') return seedBracketFromPool();
  if (t.id === 'repair') { rePairTeams(); save(); renderTourney(); return; }
  if (t.id === 'copyResults') return copyText(resultsText(currentTourney()), 'Results copied. Paste them into your group chat.');
  if (t.id === 'reopenPool') return confirmTap(t, 'Tap again: this deletes the bracket', reopenPool);
  if (t.id === 'endT') return confirmTap(t, 'Tap again to end it', endTourney);
  if (t.id === 'addLate') {
    const a = $('lateA').value, b = $('lateB') && $('lateB').value;
    if ($('lateB')) {
      if (a === b) { toast('Pick two different players for the team.'); return; }
      const name = $('lateName').value.trim();
      if (name) (S.teamNames ||= {})[teamKey([a, b])] = name;
      return addLateEntry([a, b]);
    }
    return addLateEntry([a]);
  }
  const pick = t.closest('[data-pick]'); if (pick) { pickPlayer(pick.dataset.pick); save(); renderTourney(); return; }
  const split = t.closest('[data-split]'); if (split) { splitTeam(+split.dataset.split); save(); renderTourney(); return; }
});

// Remember which finished rounds the organizer opened, so a re-draw doesn't fold them shut.
$('tourney').addEventListener('toggle', e => {
  const d = e.target; if (!d.matches || !d.matches('details.rr-round')) return;
  d.open ? openRounds.add(+d.dataset.r) : openRounds.delete(+d.dataset.r);
}, true);

// Team names save as you type; no re-draw, so the box keeps focus.
$('tourney').addEventListener('input', e => {
  if (!e.target.classList.contains('tname')) return;
  (S.teamNames ||= {})[e.target.dataset.key] = e.target.value;
  save();
});

$('tourney').addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'bsize') { S.bracketSize = +t.value; save(); renderTourney(); return; }
  if (t.id === 'sitPick') { S.sitOut = t.value; rePairTeams(); save(); renderTourney(); return; }
  if (t.id === 'ruleOn' || t.id === 'ruleTo') {
    const to = +$('ruleTo').value;
    S.scoreRule = { on: $('ruleOn').checked, to: GAME_LENGTHS.includes(to) ? to : 11 };
    save(); renderTourney(); return;
  }
  if (t.name === 'teamMode') {
    S.teamMode = t.value; pickSel = null;
    if (t.value === 'random') rePairTeams(); // a fresh random draw each time you switch back
    save(); renderTourney(); return;
  }
  if (t.classList.contains('score')) {
    const upBefore = document.querySelector('.rr-round.next');
    const before = upBefore && upBefore.dataset.r;
    setScore(t.dataset.stage, t.dataset.key, +t.dataset.side, t.value.trim());
    // Re-draw after focus has moved (e.g. Tab to the next score box), then put focus back there.
    setTimeout(() => {
      const id = document.activeElement && document.activeElement.id;
      renderTourney();
      if (id && $(id)) $(id).focus({ preventScroll: true });
      // A round just finished: bring the next one into view.
      const up = document.querySelector('.rr-round.next');
      if (up && up.dataset.r !== before) up.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
});
