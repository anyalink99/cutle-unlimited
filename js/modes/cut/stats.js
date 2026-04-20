const cutStats = {};
for (const v of CUT_VARIATIONS) {
  cutStats[v] = { attempts: 0, perfect: 0, sumDiff: 0, bestDiff: Infinity };
}

function cutStatsKey(v) { return CUT_STATS_PREFIX + v + '.v1'; }

function loadCutStats() {
  for (const v of CUT_VARIATIONS) {
    try {
      const raw = localStorage.getItem(cutStatsKey(v));
      if (raw) {
        const s = JSON.parse(raw);
        const bucket = cutStats[v];
        bucket.attempts = s.attempts || 0;
        bucket.perfect = s.perfect || 0;
        bucket.sumDiff = s.sumDiff || 0;
        bucket.bestDiff = (s.bestDiff != null && isFinite(s.bestDiff)) ? s.bestDiff : Infinity;
      }
    } catch (e) {}
  }
}

function saveCutStats(v) {
  const b = cutStats[v];
  if (!b) return;
  try {
    localStorage.setItem(cutStatsKey(v), JSON.stringify({
      attempts: b.attempts,
      perfect: b.perfect,
      sumDiff: b.sumDiff,
      bestDiff: b.bestDiff === Infinity ? null : b.bestDiff,
    }));
  } catch (e) {}
}

function resetCutStats(variation) {
  const b = cutStats[variation];
  if (!b) return;
  b.attempts = 0;
  b.perfect = 0;
  b.sumDiff = 0;
  b.bestDiff = Infinity;
  saveCutStats(variation);
}

function recordCutDiff(variation, diff) {
  const b = cutStats[variation];
  if (!b) return;
  b.attempts++;
  b.sumDiff += diff;
  if (diff < b.bestDiff) b.bestDiff = diff;
  if (diff < 0.5) b.perfect++;
  saveCutStats(variation);
}

function renderCutStats(els, variation) {
  const b = cutStats[variation] || { attempts: 0, perfect: 0, sumDiff: 0, bestDiff: Infinity };
  els.attempts.textContent = b.attempts;
  els.best.textContent = b.bestDiff === Infinity ? '—' : b.bestDiff.toFixed(2) + '%';
  els.avg.textContent = b.attempts ? (b.sumDiff / b.attempts).toFixed(2) + '%' : '—';
  els.perfect.textContent = b.perfect;
  if (els.dailyWins) els.dailyWins.textContent = dailyWinsFor('cut', variation);
}
