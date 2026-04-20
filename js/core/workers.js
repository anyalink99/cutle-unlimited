const __workerPool = {};
const __workerHandlers = {};
const __workerMeta = {};

const WORKER_MAX_RETRIES = 3;
const WORKER_COOLDOWN_MS = 30000;

function ensureWorker(type) {
  const now = Date.now();
  const meta = __workerMeta[type] || (__workerMeta[type] = { failures: 0, cooldownUntil: 0 });
  if (__workerPool[type]) return __workerPool[type];
  if (meta.cooldownUntil > now) return null;
  const base = (typeof window !== 'undefined' && window.__ASSET_BASE) || '';
  try {
    const w = new Worker(base + 'js/workers/' + type + '-worker.js');
    w.onmessage = (e) => {
      const h = __workerHandlers[type];
      if (h) h(e);
    };
    w.onerror = () => {
      const dead = __workerPool[type];
      __workerPool[type] = null;
      try { if (dead) dead.terminate(); } catch (_) {}
      meta.failures += 1;
      if (meta.failures >= WORKER_MAX_RETRIES) {
        meta.cooldownUntil = Date.now() + WORKER_COOLDOWN_MS;
        meta.failures = 0;
      }
    };
    __workerPool[type] = w;
    meta.failures = 0;
    return w;
  } catch (e) {
    meta.failures += 1;
    if (meta.failures >= WORKER_MAX_RETRIES) {
      meta.cooldownUntil = Date.now() + WORKER_COOLDOWN_MS;
      meta.failures = 0;
    }
    return null;
  }
}

function setWorkerHandler(type, fn) {
  __workerHandlers[type] = fn;
}
