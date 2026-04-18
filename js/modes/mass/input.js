function initMassInput() {
  const hit = dom.hitPad;

  hit.addEventListener('pointerdown', e => {
    if (state.mode !== 'mass') return;
    if (massVariation() === 'balance') { handleBalancePointerDown(e); return; }
    if (massState.confirmed) return;
    if (massState.activePointerId !== null) return;
    e.preventDefault();
    massState.pointerType = e.pointerType;
    const p = clampToBoard(svgPoint(e));
    const grabR = e.pointerType !== 'mouse' ? POINT_GRAB_R * 3 : POINT_GRAB_R;
    if (!isNearGuess(p, grabR)) {
      massState.guess = p;
      drawMassGuessPoint(p);
      updateMassHint();
      updateActionButton();
    }
    massState.dragging = true;
    massState.activePointerId = e.pointerId;
    hit.setPointerCapture(e.pointerId);
    massState.hover = null;
    dom.massHover.innerHTML = '';
    updateMassCursor(true);
  });

  hit.addEventListener('pointermove', e => {
    if (state.mode !== 'mass') return;
    if (massVariation() === 'balance') { handleBalancePointerMove(e); return; }
    if (massState.confirmed) return;
    e.preventDefault();
    massState.pointerType = e.pointerType;
    const p = clampToBoard(svgPoint(e));
    if (massState.dragging && e.pointerId === massState.activePointerId) {
      massState.guess = p;
      drawMassGuessPoint(p);
    } else if (e.pointerType === 'mouse') {
      massState.hover = p;
      drawMassHover(p);
    }
  });

  function endMassDrag(e) {
    if (state.mode !== 'mass') return;
    if (massVariation() === 'balance') { handleBalancePointerUp(e); return; }
    if (e.pointerId !== massState.activePointerId) return;
    if (hit.hasPointerCapture && hit.hasPointerCapture(e.pointerId)) {
      hit.releasePointerCapture(e.pointerId);
    }
    massState.activePointerId = null;
    massState.dragging = false;
    updateMassCursor(false);
  }
  hit.addEventListener('pointerup', endMassDrag);
  hit.addEventListener('pointercancel', endMassDrag);

  hit.addEventListener('pointerleave', e => {
    if (state.mode !== 'mass') return;
    if (massVariation() === 'balance') {
      if (balanceState.confirmed) return;
      if (e.pointerType !== 'mouse') return;
      balanceState.hover = null;
      drawBalanceHover(null);
      return;
    }
    if (massState.confirmed) return;
    if (e.pointerType !== 'mouse') return;
    massState.hover = null;
    drawMassHover(null);
  });

  function handleBalancePointerDown(e) {
    if (balanceState.confirmed) return;
    if (balanceState.activePointerId !== null) return;
    e.preventDefault();
    balanceState.pointerType = e.pointerType;
    const p = svgPoint(e);
    const x = clampPoleX(p.x);
    const grabR = e.pointerType !== 'mouse' ? POINT_GRAB_R * 3 : POINT_GRAB_R;
    if (!isNearPole(x, grabR)) {
      balanceState.pole = x;
      drawBalancePole(x);
      updateBalanceHint();
      updateActionButton();
    }
    balanceState.dragging = true;
    balanceState.activePointerId = e.pointerId;
    hit.setPointerCapture(e.pointerId);
    balanceState.hover = null;
    dom.massHover.innerHTML = '';
    updateBalanceCursor(true);
  }

  function handleBalancePointerMove(e) {
    if (balanceState.confirmed) return;
    e.preventDefault();
    balanceState.pointerType = e.pointerType;
    const p = svgPoint(e);
    const x = clampPoleX(p.x);
    if (balanceState.dragging && e.pointerId === balanceState.activePointerId) {
      balanceState.pole = x;
      drawBalancePole(x);
    } else if (e.pointerType === 'mouse') {
      balanceState.hover = x;
      drawBalanceHover(x);
    }
  }

  function handleBalancePointerUp(e) {
    if (e.pointerId !== balanceState.activePointerId) return;
    if (hit.hasPointerCapture && hit.hasPointerCapture(e.pointerId)) {
      hit.releasePointerCapture(e.pointerId);
    }
    balanceState.activePointerId = null;
    balanceState.dragging = false;
    updateBalanceCursor(false);
  }
}
