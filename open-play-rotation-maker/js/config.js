// Fixed settings: rating systems per sport, help text, and the example roster.

const STORAGE_KEY = 'openplay-rotation-v2'; // bumped so saved sessions from older versions start fresh at round 1

const SPORTS = {
  pickleball: { rating: 'DUPR', ph: '3.75', help: 'DUPR runs 2.00 to 8.00. Leave it blank if a player doesn’t have one; they’re treated as mid-pack.' },
  tennis:     { rating: 'UTR',  ph: '6.40', help: 'UTR runs 1.00 to 16.50. Leave it blank if a player doesn’t have one; they’re treated as mid-pack.' }
};

// What the club is running, and bracket rounds named by how many teams are left.
const MODE_NAMES = { open: 'Open play', rr: 'Round robin', bracket: 'Bracket', combo: 'Round robin + bracket' };
const STAGE_NAMES = { 2: 'Final', 4: 'Semifinals', 8: 'Quarterfinals', 16: 'Round of 16', 32: 'Round of 32' };
const BRACKET_SIZES = [2, 4, 8, 16, 32];

// One color per team, in order. Mid-tone so they read on both the light and dark themes.
const TEAM_COLORS = ['#E4572E', '#2E86DE', '#F4B400', '#8E44AD', '#27AE60', '#E84393',
                     '#16A3A3', '#A0522D', '#5D6DFF', '#9ACD32', '#FF8C42', '#708090'];

const GROUP_HELP = {
  balanced: 'Anyone can land on any court. Teams on each court are balanced by rating.',
  level: 'Players with similar ratings share a court. Teams are still balanced.'
};

const SAMPLE_PLAYERS = [
  ['Maya Chen', '4.21'], ['Jordan Ellis', '3.58'], ['Priya Raman', '3.92'], ['Sam Okafor', '3.05'], ['Lena Kowalski', '4.65'],
  ['Diego Ramos', '3.34'], ['Tasha Brooks', '2.87'], ['Ken Ito', '3.71'], ['Ruth Adler', '3.12'], ['Omar Haddad', '4.02']
];
