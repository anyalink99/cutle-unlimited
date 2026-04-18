function massReset() {
  massCentroidReset();
  balanceReset();
}

function updateMassHint() {
  if (massVariation() === 'balance') updateBalanceHint();
  else updateCentroidHint();
}

function confirmMass() {
  if (massVariation() === 'balance') confirmBalance();
  else confirmCentroid();
}
