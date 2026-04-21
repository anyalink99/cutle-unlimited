const inscribeStatsBundle = createModeStats({
  prefix: INSCRIBE_STATS_PREFIX,
  variations: INSCRIBE_VARIATIONS,
  sumKey: 'sumScore',
  bestKey: 'bestScore',
  bestInit: -Infinity,
  isBetter: (value, cur) => value > cur,
  isPerfect: (variation, score) => score >= 95,
  modeName: 'inscribe',
  valueRange: [0, 100],
});

const inscribeStats         = inscribeStatsBundle.buckets;
const loadInscribeStats     = inscribeStatsBundle.load;
const saveInscribeStats     = inscribeStatsBundle.save;
const resetInscribeStats    = inscribeStatsBundle.reset;
const recordInscribeScore   = inscribeStatsBundle.record;

function renderInscribeStats(els, variation) {
  inscribeStatsBundle.render({
    attempts:  els.inAttempts,
    best:      els.inBest,
    avg:       els.inAvg,
    perfect:   els.inPerfect,
    dailyWins: els.inDailyWins,
  }, variation, s => s.toFixed(1) + '%');
}

registerModeAPI('inscribe', {
  loadStats: loadInscribeStats,
  resetStats: resetInscribeStats,
  renderStats: renderInscribeStats,
});
