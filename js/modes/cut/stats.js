const cutStatsBundle = createModeStats({
  prefix: CUT_STATS_PREFIX,
  variations: CUT_VARIATIONS,
  sumKey: 'sumDiff',
  bestKey: 'bestDiff',
  bestInit: Infinity,
  isBetter: (value, cur) => value < cur,
  isPerfect: (_v, diff) => diff < 0.5,
  modeName: 'cut',
  valueRange: [0, 100],
});

const cutStats       = cutStatsBundle.buckets;
const loadCutStats   = cutStatsBundle.load;
const saveCutStats   = cutStatsBundle.save;
const resetCutStats  = cutStatsBundle.reset;
const recordCutDiff  = cutStatsBundle.record;

function renderCutStats(els, variation) {
  cutStatsBundle.render({
    attempts:   els.attempts,
    best:       els.best,
    avg:        els.avg,
    perfect:    els.perfect,
    dailyWins:  els.dailyWins,
  }, variation, d => d.toFixed(2) + '%');
}

registerModeAPI('cut', {
  loadStats: loadCutStats,
  resetStats: resetCutStats,
  renderStats: renderCutStats,
});
