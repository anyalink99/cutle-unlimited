// Freezes today's daily per (mode, variation) after Confirm; same UTC day
// replays the locked board. History feeds the "Daily wins" stats row.

const DAILY_LOCK_PREFIX = 'geometric.games.daily-lock.';
const DAILY_HISTORY_PREFIX = 'geometric.games.daily-history.';
const DAILY_HISTORY_MAX = 365;

function dailyLockKey(mode, variation) {
  return DAILY_LOCK_PREFIX + mode + '.' + variation + '.v1';
}

function dailyHistoryKey(mode, variation) {
  return DAILY_HISTORY_PREFIX + mode + '.' + variation + '.v1';
}

function loadDailyLock(mode, variation) {
  try {
    const raw = localStorage.getItem(dailyLockKey(mode, variation));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function saveDailyLockRaw(mode, variation, lock) {
  try {
    localStorage.setItem(dailyLockKey(mode, variation), JSON.stringify(lock));
  } catch (e) {}
}

function getTodayLock(mode, variation) {
  const lock = loadDailyLock(mode, variation);
  if (!lock) return null;
  if (lock.day !== dailyIndex()) return null;
  return lock;
}

function loadDailyHistory(mode, variation) {
  const arr = signedStorageGet(dailyHistoryKey(mode, variation));
  return Array.isArray(arr) ? arr : [];
}

function saveDailyHistory(mode, variation, list) {
  signedStorageSet(dailyHistoryKey(mode, variation), list);
}

function recordDailyResult(mode, variation, snapshot, won) {
  const day = dailyIndex();
  const dateStr = todayUtc();
  saveDailyLockRaw(mode, variation, { day, dateStr, snapshot, won: !!won });
  const hist = loadDailyHistory(mode, variation);
  if (hist.length && hist[hist.length - 1].day === day) {
    hist[hist.length - 1] = { day, dateStr, won: !!won };
  } else {
    hist.push({ day, dateStr, won: !!won });
  }
  if (hist.length > DAILY_HISTORY_MAX) {
    hist.splice(0, hist.length - DAILY_HISTORY_MAX);
  }
  saveDailyHistory(mode, variation, hist);
}

function dailyWinsFor(mode, variation) {
  const hist = loadDailyHistory(mode, variation);
  let n = 0;
  for (const r of hist) if (r.won) n++;
  return n;
}

function msUntilNextUtcDay() {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  );
  return next - now.getTime();
}

function nextDailyCountdownLabel() {
  const ms = msUntilNextUtcDay();
  if (ms <= 0) return 'New shape ready';
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin - h * 60;
    if (m === 0) return 'New shape in ' + h + 'h';
    return 'New shape in ' + h + 'h ' + m + 'm';
  }
  return 'New shape in ' + totalMin + 'm';
}
