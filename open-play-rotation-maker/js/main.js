// Startup: load the example session on first visit, then draw the page.

if (!S) {
  S = fresh();
  SAMPLE_PLAYERS.forEach(([name, rating]) => addPlayer(name, rating));
  S.example = true;
  nextRound(true); // round 1 starts face-down so the Reveal bar is the first thing people see
}
render();
