function initCutInput() {
  const { hitPad, cutPreview } = dom;

  function setPreview() {
    if (!cutState.drawing) return;
    const { p0, p1 } = cutState.drawing;
    cutPreview.setAttribute('x1', p0.x);
    cutPreview.setAttribute('y1', p0.y);
    cutPreview.setAttribute('x2', p1.x);
    cutPreview.setAttribute('y2', p1.y);
    cutPreview.classList.toggle('valid', strokeCrossesShape(p0, p1, state.shape.outer));
  }

  function clearPreview() {
    cutPreview.style.display = 'none';
    cutPreview.classList.remove('valid');
  }

  function beginCutLineDrag(e, p, idx, constrainPerp) {
    cutState.dragCutIdx = idx;
    cutState.dragLineMode = true;
    cutState.dragLineConstrained = constrainPerp;
    cutState.dragOrigin = p;
    const c = cutState.cuts[idx];
    cutState.dragInitialCuts = [{ a: { ...c.a }, b: { ...c.b } }];
    cutState.activePointerId = e.pointerId;
    hitPad.setPointerCapture(e.pointerId);
    updateCutCursor(true);
  }

  hitPad.addEventListener('pointerdown', e => {
    if (state.mode !== 'cut') return;
    if (cutState.confirmed) return;
    if (cutState.activePointerId !== null) return;
    e.preventDefault();
    const p = svgPoint(e);
    const v = cutVariation();

    if (v === 'angle') {
      if (cutState.cuts.length > 0) beginCutLineDrag(e, p, 0, true);
      return;
    }

    const grabR = e.pointerType !== 'mouse' ? POINT_GRAB_R * 3 : POINT_GRAB_R;
    const handle = pickCutHandle(p, grabR);
    if (handle) {
      cutState.dragCutIdx = handle.cut;
      cutState.dragEndIdx = handle.end;
      cutState.activePointerId = e.pointerId;
      hitPad.setPointerCapture(e.pointerId);
      updateCutCursor(true);
      return;
    }

    const lineThr = e.pointerType !== 'mouse' ? LINE_GRAB_THRESHOLD * 1.5 : LINE_GRAB_THRESHOLD;
    const lineIdx = pickCutLine(p, lineThr);
    if (lineIdx >= 0) {
      beginCutLineDrag(e, p, lineIdx, false);
      return;
    }

    if (cutState.cuts.length < cutRequiredCount()) {
      cutState.drawing = { p0: p, p1: { ...p }, moved: false };
      cutState.activePointerId = e.pointerId;
      hitPad.setPointerCapture(e.pointerId);
      clearPreview();
      updateCutCursor(false);
    }
  });

  hitPad.addEventListener('pointermove', e => {
    if (state.mode !== 'cut') return;
    e.preventDefault();
    const p = svgPoint(e);

    if (e.pointerId !== cutState.activePointerId) {
      if (e.pointerType === 'mouse' && !cutState.confirmed) {
        const overHandle = !!pickCutHandle(p, POINT_GRAB_R);
        const overLine = !overHandle && pickCutLine(p, LINE_GRAB_THRESHOLD) >= 0;
        updateCutCursor(overHandle || overLine);
      }
      return;
    }

    if (cutState.dragLineMode) {
      const delta = { x: p.x - cutState.dragOrigin.x, y: p.y - cutState.dragOrigin.y };
      const idx = cutState.dragCutIdx >= 0 ? cutState.dragCutIdx : 0;
      translateCutLine(idx, delta, cutState.dragLineConstrained);
      renderCutSegments();
      renderCutHandles();
      return;
    }

    if (cutState.drawing) {
      cutState.drawing.p1 = p;
      if (!cutState.drawing.moved) {
        if (Math.hypot(p.x - cutState.drawing.p0.x, p.y - cutState.drawing.p0.y) < MOVE_THRESHOLD) return;
        cutState.drawing.moved = true;
        cutPreview.style.display = '';
      }
      setPreview();
      return;
    }

    if (cutState.dragCutIdx >= 0) {
      const cut = cutState.cuts[cutState.dragCutIdx];
      if (cutState.dragEndIdx === 0) cut.a = p; else cut.b = p;
      renderCutSegments();
      renderCutHandles();
      return;
    }
  });

  hitPad.addEventListener('pointerleave', e => {
    if (state.mode !== 'cut') return;
    if (e.pointerType !== 'mouse') return;
    if (cutState.activePointerId !== null) return;
    updateCutCursor(false);
  });

  function endCutStroke(e, cancelled) {
    if (state.mode !== 'cut') return;
    if (e.pointerId !== cutState.activePointerId) return;
    cutState.activePointerId = null;
    if (hitPad.hasPointerCapture && hitPad.hasPointerCapture(e.pointerId)) {
      hitPad.releasePointerCapture(e.pointerId);
    }

    if (cutState.dragLineMode) {
      cutState.dragLineMode = false;
      cutState.dragLineConstrained = false;
      cutState.dragCutIdx = -1;
      cutState.dragOrigin = null;
      cutState.dragInitialCuts = null;
      updateActionButton();
      const releasedAt = svgPoint(e);
      const stillOver = !!pickCutHandle(releasedAt, POINT_GRAB_R) ||
                        pickCutLine(releasedAt, LINE_GRAB_THRESHOLD) >= 0;
      updateCutCursor(stillOver);
      return;
    }

    if (cutState.drawing) {
      const d = cutState.drawing;
      cutState.drawing = null;
      clearPreview();
      if (cancelled || !d.moved) { updateCutCursor(false); return; }
      d.p1 = svgPoint(e);
      if (!strokeCrossesShape(d.p0, d.p1, state.shape.outer)) {
        flashCutHint('Stroke must fully cross the shape');
        updateCutCursor(false);
        return;
      }
      const chord = lineShapeChord(d.p0, d.p1, state.shape.outer);
      if (!chord) {
        flashCutHint('Stroke must fully cross the shape');
        updateCutCursor(false);
        return;
      }
      cutState.cuts.push(chord);
      renderCutAll();
      const endP = svgPoint(e);
      updateCutCursor(!!pickCutHandle(endP, POINT_GRAB_R));
      return;
    }

    if (cutState.dragCutIdx >= 0) {
      const cut = cutState.cuts[cutState.dragCutIdx];
      const q = cutState.dragEndIdx === 0 ? cut.a : cut.b;
      cutState.dragCutIdx = -1;
      cutState.dragEndIdx = -1;
      updateActionButton();
      const releasedAt = svgPoint(e);
      const stillOver = Math.hypot(releasedAt.x - q.x, releasedAt.y - q.y) < POINT_GRAB_R;
      updateCutCursor(stillOver);
      return;
    }
  }

  hitPad.addEventListener('pointerup',     e => endCutStroke(e, false));
  hitPad.addEventListener('pointercancel', e => endCutStroke(e, true));
}
