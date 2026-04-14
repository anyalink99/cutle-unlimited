const stats = {
  attempts: 0,
  perfect: 0,
  sumDiff: 0,
  bestDiff: Infinity,
};

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    stats.attempts = s.attempts || 0;
    stats.perfect = s.perfect || 0;
    stats.sumDiff = s.sumDiff || 0;
    stats.bestDiff = (s.bestDiff != null && isFinite(s.bestDiff)) ? s.bestDiff : Infinity;
  } catch (e) {}
}

function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({
      attempts: stats.attempts,
      perfect: stats.perfect,
      sumDiff: stats.sumDiff,
      bestDiff: stats.bestDiff === Infinity ? null : stats.bestDiff,
    }));
  } catch (e) {}
}

function resetStats() {
  stats.attempts = 0;
  stats.perfect = 0;
  stats.sumDiff = 0;
  stats.bestDiff = Infinity;
  saveStats();
}

function recordDiff(diff) {
  stats.attempts++;
  stats.sumDiff += diff;
  if (diff < stats.bestDiff) stats.bestDiff = diff;
  if (diff < 0.5) stats.perfect++;
  saveStats();
}

function renderStatsInto(els) {
  els.attempts.textContent = stats.attempts;
  els.best.textContent = stats.bestDiff === Infinity ? '—' : stats.bestDiff.toFixed(2) + '%';
  els.avg.textContent = stats.attempts ? (stats.sumDiff / stats.attempts).toFixed(2) + '%' : '—';
  els.perfect.textContent = stats.perfect;
}
