const SVG_NS = 'http://www.w3.org/2000/svg';

const CX = 200;
const CY = 200;
const MAX_R = 196;
const BASE_R = 167;
const TAU = Math.PI * 2;

const TARGET_AREA = 60000;

const MOVE_THRESHOLD = 6;
const MODE_KEY = 'geometric.games.mode.v1';
const POINT_GRAB_R = 11;
const LINE_GRAB_THRESHOLD = 10;

const CUT_STATS_PREFIX = 'geometric.games.stats.cut.';
const INSCRIBE_STATS_PREFIX = 'geometric.games.stats.inscribe.';
const MASS_STATS_KEY = 'geometric.games.stats.mass.v1';

const CUT_VARIATION_KEY = 'geometric.games.cut.variation.v1';
const CUT_VARIATIONS = ['half', 'ratio', 'quad', 'tri', 'angle'];
const INSCRIBE_VARIATION_KEY = 'geometric.games.inscribe.variation.v1';
const INSCRIBE_VARIATIONS = ['square', 'triangle'];
const CUT_HANDLE_PAD = 22;
