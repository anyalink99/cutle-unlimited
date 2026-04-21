// Persistence keeps mode-specific field names (sumDiff / bestScore / sumDist)
// so stored localStorage blobs stay readable.
function createModeStats(config) {
  const {
    prefix, variations, sumKey, bestKey, bestInit,
    isBetter, isPerfect, modeName,
    valueRange,
  } = config;

  // valueRange: [min, max] or (variation) => [min, max].
  // Values outside the range (or non-finite) are dropped from record() —
  // guards against crafted localStorage restoring and against accidental
  // NaN/Infinity leaks from a scoring bug.
  function rangeFor(v) {
    if (!valueRange) return null;
    return typeof valueRange === 'function' ? valueRange(v) : valueRange;
  }
  function isValidValue(v, value) {
    if (typeof value !== 'number' || !isFinite(value)) return false;
    const r = rangeFor(v);
    if (!r) return true;
    return value >= r[0] && value <= r[1];
  }

  const buckets = {};
  for (const v of variations) {
    buckets[v] = { attempts: 0, perfect: 0, sum: 0, best: bestInit };
  }
  const keyFor = v => prefix + v + '.v1';

  function load() {
    for (const v of variations) {
      const s = signedStorageGet(keyFor(v));
      if (!s) continue;
      const b = buckets[v];
      b.attempts = s.attempts || 0;
      b.perfect  = s.perfect  || 0;
      b.sum      = s[sumKey]  || 0;
      const best = s[bestKey];
      b.best     = (best != null && isFinite(best)) ? best : bestInit;
      // Repair nonsense states from corrupted / legacy storage.
      if (b.perfect > b.attempts) b.perfect = b.attempts;
      if (b.attempts < 0) b.attempts = 0;
      if (b.perfect  < 0) b.perfect  = 0;
    }
  }

  function save(v) {
    const b = buckets[v];
    if (!b) return;
    const out = { attempts: b.attempts, perfect: b.perfect };
    out[sumKey]  = b.sum;
    out[bestKey] = b.best === bestInit ? null : b.best;
    signedStorageSet(keyFor(v), out);
  }

  function reset(v) {
    const b = buckets[v];
    if (!b) return;
    b.attempts = 0;
    b.perfect  = 0;
    b.sum      = 0;
    b.best     = bestInit;
    save(v);
  }

  function record(v, value) {
    const b = buckets[v];
    if (!b) return;
    if (!isValidValue(v, value)) return;
    b.attempts++;
    b.sum += value;
    if (isBetter(value, b.best)) b.best = value;
    if (isPerfect(v, value)) b.perfect++;
    if (b.perfect > b.attempts) b.perfect = b.attempts;
    save(v);
  }

  function render(els, variation, format) {
    const b = buckets[variation] || { attempts: 0, perfect: 0, sum: 0, best: bestInit };
    els.attempts.textContent = b.attempts;
    els.best.textContent     = b.best === bestInit ? '—' : format(b.best);
    els.avg.textContent      = b.attempts ? format(b.sum / b.attempts) : '—';
    els.perfect.textContent  = b.perfect;
    if (els.dailyWins) els.dailyWins.textContent = dailyWinsFor(modeName, variation);
  }

  return { buckets, load, save, reset, record, render };
}
