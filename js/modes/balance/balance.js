function balanceVariation() {
  return state.balanceVariation || 'pole';
}

function balanceReset() {
  centroidReset();
  poleReset();
}

function updateBalanceHint() {
  if (balanceVariation() === 'pole') updatePoleHint();
  else updateCentroidHint();
}

function confirmBalance(opts) {
  if (balanceVariation() === 'pole') confirmPole(opts);
  else confirmCentroid(opts);
}
