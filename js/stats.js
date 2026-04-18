function loadStats() {
  loadCutStats();
  loadInscribeStats();
  loadMassStats();
}

function resetStats(mode, variation) {
  if (mode === 'cut')           resetCutStats(variation);
  else if (mode === 'inscribe') resetInscribeStats(variation);
  else if (mode === 'mass')     resetMassStats(variation);
}

function renderStatsInto(els, mode, variation) {
  if (mode === 'cut')           renderCutStats(els, variation);
  else if (mode === 'inscribe') renderInscribeStats(els, variation);
  else if (mode === 'mass')     renderMassStats(els, variation);
}
