function balanceVariation() {
  return state.balanceVariation || 'pole';
}

registerModeAPI('balance', {
  pickShape() { return generateBalanceShape(); },
  nudge(dx, dy) {
    if (balanceVariation() === 'pole') {
      if (poleState.confirmed || poleState.pole == null) return;
      const next = Math.max(poleState.xMin, Math.min(poleState.xMax, poleState.pole + dx));
      poleState.pole = next;
      drawPole(next);
      updatePoleHint();
      updateActionButton();
    } else {
      if (centroidState.confirmed || !centroidState.guess) return;
      const g = centroidState.guess;
      centroidState.guess = clampToBoard({ x: g.x + dx, y: g.y + dy });
      drawCentroidGuess(centroidState.guess);
      updateCentroidHint();
      updateActionButton();
    }
  },
});

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
