// Fixed settings: the DUPR rating, help text, and the example roster.

const STORAGE_KEY = 'openplay-rotation-v2'; // bumped so saved sessions from older versions start fresh at round 1

const RATING = { name: 'DUPR', help: 'DUPR runs 2.00 to 8.00. Leave it blank if a player doesn’t have one; they’re treated as mid-pack.' };

// Game lengths for the optional score check. All are win by 2.
const GAME_LENGTHS = [11, 15, 21];

// What the club is running, and bracket rounds named by how many teams are left.
const MODE_NAMES = { open: 'Open play', rr: 'Round robin', bracket: 'Bracket', combo: 'Pool + bracket' };
const STAGE_NAMES = { 2: 'Final', 4: 'Semifinals', 8: 'Quarterfinals', 16: 'Round of 16', 32: 'Round of 32' };
const BRACKET_SIZES = [2, 4, 8, 16, 32];

// One color per team, in order: 12 hues spaced apart so neighbours never look alike, each drawn with
// a thin outline so the light ones (mustard, lime, white) still show on the light theme.
const TEAM_COLORS = ['#D62839', '#1E6FD9', '#2A9D3F', '#8B46C9', '#F28C28', '#0FA3B1',
                     '#8C5A3C', '#E255A1', '#C9A400', '#9AD13E', '#5C6F82', '#EDEDED'];

// Optional open-play round timer, in minutes (0 = off).
const TIMER_OPTIONS = [0, 12, 15, 20];

const GROUP_HELP = {
  balanced: 'Anyone can land on any court. Teams on each court are balanced by rating.',
  level: 'Players with similar ratings share a court. Teams are still balanced.'
};

const SAMPLE_PLAYERS = [
  ['Maya Chen', '4.21'], ['Jordan Ellis', '3.58'], ['Priya Raman', '3.92'], ['Sam Okafor', '3.05'], ['Lena Kowalski', '4.65'],
  ['Diego Ramos', '3.34'], ['Tasha Brooks', '2.87'], ['Ken Ito', '3.71'], ['Ruth Adler', '3.12'], ['Omar Haddad', '4.02']
];
