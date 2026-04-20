// Persistence keeps mode-specific field names (sumDiff / bestScore / sumDist)
// so stored localStorage blobs stay readable.
function createModeStats(config) {
  const {
    prefix, variations, sumKey, bestKey, bestInit,
    isBetter, isPerfect, modeName,
  } = config;

  const buckets = {};
  for (const v of variations) {
    buckets[v] = { attempts: 0, perfect: 0, sum: 0, best: bestInit };
  }
  const keyFor = v => prefix + v + '.v1';

  function load() {
    for (const v of variations) {
      try {
        const raw = localStorage.getItem(keyFor(v));
        if (!raw) continue;
        const s = JSON.parse(raw);
        const b = buckets[v];
        b.attempts = s.attempts || 0;
        b.perfect  = s.perfect  || 0;
        b.sum      = s[sumKey]  || 0;
        const best = s[bestKey];
        b.best     = (best != null && isFinite(best)) ? best : bestInit;
      } catch (e) {}
    }
  }

  function save(v) {
    const b = buckets[v];
    if (!b) return;
    try {
      const out = { attempts: b.attempts, perfect: b.perfect };
      out[sumKey]  = b.sum;
      out[bestKey] = b.best === bestInit ? null : b.best;
      localStorage.setItem(keyFor(v), JSON.stringify(out));
    } catch (e) {}
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
    b.attempts++;
    b.sum += value;
    if (isBetter(value, b.best)) b.best = value;
    if (isPerfect(v, value)) b.perfect++;
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
