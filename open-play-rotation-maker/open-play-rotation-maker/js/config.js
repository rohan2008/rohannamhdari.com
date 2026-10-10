// Fixed settings: rating systems per sport, help text, and the example roster.

const STORAGE_KEY = 'openplay-rotation-v1';

const SPORTS = {
  pickleball: { rating: 'DUPR', ph: '3.75', help: 'DUPR runs 2.00 to 8.00. Leave it blank if a player doesn’t have one; they’re treated as mid-pack.' },
  tennis:     { rating: 'UTR',  ph: '6.40', help: 'UTR runs 1.00 to 16.50. Leave it blank if a player doesn’t have one; they’re treated as mid-pack.' },
  badminton:  { rating: 'BWF #', ph: '412', help: 'Enter the BWF world ranking position (1 is best). Leave it blank for unranked players; they’re treated as mid-pack.' }
};

const GROUP_HELP = {
  balanced: 'Anyone can land on any court. Teams on each court are balanced by rating.',
  level: 'Players with similar ratings share a court. Teams are still balanced.'
};

const SAMPLE_PLAYERS = [
  ['Maya Chen', '4.21'], ['Jordan Ellis', '3.58'], ['Priya Raman', '3.92'], ['Sam Okafor', '3.05'], ['Lena Kowalski', '4.65'],
  ['Diego Ramos', '3.34'], ['Tasha Brooks', '2.87'], ['Ken Ito', '3.71'], ['Ruth Adler', '3.12'], ['Omar Haddad', '4.02']
];
