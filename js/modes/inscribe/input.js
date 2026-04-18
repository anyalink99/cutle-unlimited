function initInscribeInput() {
  const hit = dom.hitPad;

  hit.addEventListener('pointerdown', e => {
    if (state.mode !== 'inscribe') return;
    if (inscribeState.confirmed) return;
    if (inscribeState.activePointerId !== null) return;
    e.preventDefault();
    const p = svgPoint(e);
    inscribeState.pointerType = e.pointerType;
    const outer = state.shape.outer;
    const grabR = e.pointerType !== 'mouse' ? POINT_GRAB_R * 3 : POINT_GRAB_R;
    const lineThr = e.pointerType !== 'mouse' ? LINE_GRAB_THRESHOLD * 1.5 : LINE_GRAB_THRESHOLD;
    const existing = pickExistingPoint(p, grabR);
    const linePair = existing >= 0 ? null : pickInscribeLine(p, lineThr);
    if (existing >= 0) {
      inscribeState.dragIdx = existing;
    } else if (linePair) {
      inscribeState.dragLineIdxs = linePair;
      inscribeState.dragInitialPoints = [
        { ...inscribeState.points[linePair[0]] },
        { ...inscribeState.points[linePair[1]] },
      ];
      inscribeState.dragOrigin = { x: p.x, y: p.y };
    } else if (inscribeState.points.length < inscribeN()) {
      const proj = projectToOutline(p, outer);
      if (!proj) return;
      inscribeState.points.push(proj);
      inscribeState.dragIdx = inscribeState.points.length - 1;
    } else {
      return;
    }
    inscribeState.activePointerId = e.pointerId;
    hit.setPointerCapture(e.pointerId);
    inscribeState.hover = null;
    inscribeState.hoverRaw = null;
    renderInscribeAll();
  });

  hit.addEventListener('pointermove', e => {
    if (state.mode !== 'inscribe') return;
    if (inscribeState.confirmed) return;
    e.preventDefault();
    inscribeState.pointerType = e.pointerType;
    const p = svgPoint(e);
    const outer = state.shape.outer;
    if (e.pointerId === inscribeState.activePointerId) {
      if (inscribeState.dragLineIdxs) {
        const delta = {
          x: p.x - inscribeState.dragOrigin.x,
          y: p.y - inscribeState.dragOrigin.y,
        };
        translateInscribeLine(delta);
        renderInscribeLines();
        renderInscribePoints();
      } else if (inscribeState.dragIdx >= 0) {
        const proj = projectToOutline(p, outer);
        if (proj) {
          inscribeState.points[inscribeState.dragIdx] = proj;
          renderInscribeLines();
          renderInscribePoints();
        }
      }
    } else if (e.pointerType === 'mouse') {
      inscribeState.hoverRaw = p;
      inscribeState.hover = projectToOutline(p, outer);
      renderInscribeHover();
    }
  });

  function endInscribeDrag(e) {
    if (state.mode !== 'inscribe') return;
    if (e.pointerId !== inscribeState.activePointerId) return;
    if (hit.hasPointerCapture && hit.hasPointerCapture(e.pointerId)) {
      hit.releasePointerCapture(e.pointerId);
    }
    inscribeState.activePointerId = null;
    inscribeState.dragIdx = -1;
    inscribeState.dragLineIdxs = null;
    inscribeState.dragInitialPoints = null;
    inscribeState.dragOrigin = null;
    renderInscribeAll();
  }
  hit.addEventListener('pointerup', endInscribeDrag);
  hit.addEventListener('pointercancel', endInscribeDrag);

  hit.addEventListener('pointerleave', e => {
    if (state.mode !== 'inscribe') return;
    if (e.pointerType !== 'mouse') return;
    inscribeState.hover = null;
    inscribeState.hoverRaw = null;
    renderInscribeHover();
  });
}
