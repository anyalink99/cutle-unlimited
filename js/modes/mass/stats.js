const massStats = {};
for (const v of MASS_VARIATIONS) {
  massStats[v] = { attempts: 0, perfect: 0, sumDist: 0, bestDist: Infinity };
}

function massStatsKey(v) { return MASS_STATS_PREFIX + v + '.v1'; }

function loadMassStats() {
  for (const v of MASS_VARIATIONS) {
    try {
      const raw = localStorage.getItem(massStatsKey(v));
      if (raw) {
        const s = JSON.parse(raw);
        const bucket = massStats[v];
        bucket.attempts = s.attempts || 0;
        bucket.perfect = s.perfect || 0;
        bucket.sumDist = s.sumDist || 0;
        bucket.bestDist = (s.bestDist != null && isFinite(s.bestDist)) ? s.bestDist : Infinity;
      }
    } catch (e) {}
  }
  try {
    const legacy = localStorage.getItem(MASS_STATS_LEGACY_KEY);
    if (legacy && !localStorage.getItem(massStatsKey('centroid'))) {
      const s = JSON.parse(legacy);
      const bucket = massStats.centroid;
      bucket.attempts = s.attempts || 0;
      bucket.perfect = s.perfect || 0;
      bucket.sumDist = s.sumDist || 0;
      bucket.bestDist = (s.bestDist != null && isFinite(s.bestDist)) ? s.bestDist : Infinity;
      saveMassStats('centroid');
      localStorage.removeItem(MASS_STATS_LEGACY_KEY);
    }
  } catch (e) {}
}

function saveMassStats(v) {
  const b = massStats[v];
  if (!b) return;
  try {
    localStorage.setItem(massStatsKey(v), JSON.stringify({
      attempts: b.attempts,
      perfect: b.perfect,
      sumDist: b.sumDist,
      bestDist: b.bestDist === Infinity ? null : b.bestDist,
    }));
  } catch (e) {}
}

function resetMassStats(variation) {
  const b = massStats[variation];
  if (!b) return;
  b.attempts = 0;
  b.perfect = 0;
  b.sumDist = 0;
  b.bestDist = Infinity;
  saveMassStats(variation);
}

function recordMassDist(variation, dist) {
  const b = massStats[variation];
  if (!b) return;
  b.attempts++;
  b.sumDist += dist;
  if (dist < b.bestDist) b.bestDist = dist;
  const threshold = variation === 'balance' ? BALANCE_PERFECT_THRESHOLD : 5;
  if (dist <= threshold) b.perfect++;
  saveMassStats(variation);
}

function renderMassStats(els, variation) {
  const b = massStats[variation] || { attempts: 0, perfect: 0, sumDist: 0, bestDist: Infinity };
  els.msAttempts.textContent = b.attempts;
  els.msBest.textContent = b.bestDist === Infinity ? '—' : b.bestDist.toFixed(1);
  els.msAvg.textContent = b.attempts ? (b.sumDist / b.attempts).toFixed(1) : '—';
  els.msPerfect.textContent = b.perfect;
}
