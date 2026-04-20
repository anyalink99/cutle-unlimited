const __workerPool = {};
const __workerHandlers = {};

function ensureWorker(type) {
  if (__workerPool[type]) return __workerPool[type];
  const base = (typeof window !== 'undefined' && window.__ASSET_BASE) || '';
  try {
    const w = new Worker(base + 'js/workers/' + type + '-worker.js');
    w.onmessage = (e) => {
      const h = __workerHandlers[type];
      if (h) h(e);
    };
    w.onerror = () => {
      __workerPool[type] = null;
    };
    __workerPool[type] = w;
    return w;
  } catch (e) {
    return null;
  }
}

function setWorkerHandler(type, fn) {
  __workerHandlers[type] = fn;
}
