const cutStats = {};
for (const v of CUT_VARIATIONS) {
  cutStats[v] = { attempts: 0, perfect: 0, sumDiff: 0, bestDiff: Infinity };
}

const inscribeStats = {};
for (const v of INSCRIBE_VARIATIONS) {
  inscribeStats[v] = { attempts: 0, perfect: 0, sumScore: 0, bestScore: -Infinity };
}

const massStats = {};
for (const v of MASS_VARIATIONS) {
  massStats[v] = { attempts: 0, perfect: 0, sumDist: 0, bestDist: Infinity };
}

function cutStatsKey(v) { return CUT_STATS_PREFIX + v + '.v1'; }
function inscribeStatsKey(v) { return INSCRIBE_STATS_PREFIX + v + '.v1'; }
function massStatsKey(v) { return MASS_STATS_PREFIX + v + '.v1'; }

function loadStats() {
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
  for (const v of INSCRIBE_VARIATIONS) {
    try {
      const raw = localStorage.getItem(inscribeStatsKey(v));
      if (raw) {
        const s = JSON.parse(raw);
        const bucket = inscribeStats[v];
        bucket.attempts = s.attempts || 0;
        bucket.perfect = s.perfect || 0;
        bucket.sumScore = s.sumScore || 0;
        bucket.bestScore = (s.bestScore != null && isFinite(s.bestScore)) ? s.bestScore : -Infinity;
      }
    } catch (e) {}
  }
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

function saveInscribeStats(v) {
  const b = inscribeStats[v];
  if (!b) return;
  try {
    localStorage.setItem(inscribeStatsKey(v), JSON.stringify({
      attempts: b.attempts,
      perfect: b.perfect,
      sumScore: b.sumScore,
      bestScore: b.bestScore === -Infinity ? null : b.bestScore,
    }));
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

function resetStats(mode, variation) {
  if (mode === 'inscribe') {
    const b = inscribeStats[variation];
    if (!b) return;
    b.attempts = 0;
    b.perfect = 0;
    b.sumScore = 0;
    b.bestScore = -Infinity;
    saveInscribeStats(variation);
  } else if (mode === 'mass') {
    const b = massStats[variation];
    if (!b) return;
    b.attempts = 0;
    b.perfect = 0;
    b.sumDist = 0;
    b.bestDist = Infinity;
    saveMassStats(variation);
  } else if (mode === 'cut') {
    const b = cutStats[variation];
    if (!b) return;
    b.attempts = 0;
    b.perfect = 0;
    b.sumDiff = 0;
    b.bestDiff = Infinity;
    saveCutStats(variation);
  }
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

function recordInscribeScore(variation, score) {
  const b = inscribeStats[variation];
  if (!b) return;
  b.attempts++;
  b.sumScore += score;
  if (score > b.bestScore) b.bestScore = score;
  if (score > 96) b.perfect++;
  saveInscribeStats(variation);
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

function renderStatsInto(els, mode, variation) {
  if (mode === 'cut') {
    const b = cutStats[variation] || { attempts: 0, perfect: 0, sumDiff: 0, bestDiff: Infinity };
    els.attempts.textContent = b.attempts;
    els.best.textContent = b.bestDiff === Infinity ? '—' : b.bestDiff.toFixed(2) + '%';
    els.avg.textContent = b.attempts ? (b.sumDiff / b.attempts).toFixed(2) + '%' : '—';
    els.perfect.textContent = b.perfect;
  } else if (mode === 'inscribe') {
    const b = inscribeStats[variation] || { attempts: 0, perfect: 0, sumScore: 0, bestScore: -Infinity };
    els.sqAttempts.textContent = b.attempts;
    els.sqBest.textContent = b.bestScore === -Infinity ? '—' : b.bestScore.toFixed(1) + '%';
    els.sqAvg.textContent = b.attempts ? (b.sumScore / b.attempts).toFixed(1) + '%' : '—';
    els.sqPerfect.textContent = b.perfect;
  } else if (mode === 'mass') {
    const b = massStats[variation] || { attempts: 0, perfect: 0, sumDist: 0, bestDist: Infinity };
    els.msAttempts.textContent = b.attempts;
    els.msBest.textContent = b.bestDist === Infinity ? '—' : b.bestDist.toFixed(1);
    els.msAvg.textContent = b.attempts ? (b.sumDist / b.attempts).toFixed(1) : '—';
    els.msPerfect.textContent = b.perfect;
  }
}
