const balanceStatsBundle = createModeStats({
  prefix: BALANCE_STATS_PREFIX,
  variations: BALANCE_VARIATIONS,
  sumKey: 'sumDist',
  bestKey: 'bestDist',
  bestInit: Infinity,
  isBetter: (value, cur) => value < cur,
  isPerfect: (variation, dist) =>
    dist <= (variation === 'pole' ? BALANCE_PERFECT_THRESHOLD : 5),
  modeName: 'balance',
  valueRange: v => v === 'pole' ? [0, 200] : [0, 400],
});

const balanceStats        = balanceStatsBundle.buckets;
const loadBalanceStats    = balanceStatsBundle.load;
const saveBalanceStats    = balanceStatsBundle.save;
const resetBalanceStats   = balanceStatsBundle.reset;
const recordBalanceDist   = balanceStatsBundle.record;

function renderBalanceStats(els, variation) {
  balanceStatsBundle.render({
    attempts:  els.blAttempts,
    best:      els.blBest,
    avg:       els.blAvg,
    perfect:   els.blPerfect,
    dailyWins: els.blDailyWins,
  }, variation, d => d.toFixed(1));
}

registerModeAPI('balance', {
  loadStats: loadBalanceStats,
  resetStats: resetBalanceStats,
  renderStats: renderBalanceStats,
});
