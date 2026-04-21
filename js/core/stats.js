function loadStats() {
  for (const m of MODE_LIST) MODE_REGISTRY[m].api.loadStats();
}

function resetStats(mode, variation) {
  const api = MODE_REGISTRY[mode] && MODE_REGISTRY[mode].api;
  if (api && api.resetStats) api.resetStats(variation);
}

function renderStatsInto(els, mode, variation) {
  const api = MODE_REGISTRY[mode] && MODE_REGISTRY[mode].api;
  if (api && api.renderStats) api.renderStats(els, variation);
}
