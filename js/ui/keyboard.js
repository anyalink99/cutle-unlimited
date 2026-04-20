function topOpenModalId() {
  const open = document.querySelectorAll('.modal-back.open:not(.closing)');
  if (!open.length) return null;
  return open[open.length - 1].id;
}

function closeTopModal() {
  const id = topOpenModalId();
  if (id) closeModal(id);
  return !!id;
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function triggerActionButton() {
  const btn = dom.newBtn;
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'confirm') modeRunner[state.mode].confirm();
  else if (action !== 'locked') newShape();
}

function applyNudge(dx, dy) {
  const api = MODE_REGISTRY[state.mode] && MODE_REGISTRY[state.mode].api;
  if (api && typeof api.nudge === 'function') api.nudge(dx, dy);
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (isTypingTarget(e.target)) return;

  const key = e.key;

  if (key === 'Escape') {
    if (closeTopModal()) e.preventDefault();
    return;
  }

  // Shortcuts inside open modals: only allow Enter to confirm default close button.
  if (topOpenModalId()) return;

  if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
    e.preventDefault();
    triggerActionButton();
    return;
  }

  const lower = key.length === 1 ? key.toLowerCase() : key;

  if (lower === 'n') {
    e.preventDefault();
    if (!isCurrentDailyLocked()) newShape();
    return;
  }
  if (lower === 'c') { e.preventDefault(); setMode('cut'); return; }
  if (lower === 'i') { e.preventDefault(); setMode('inscribe'); return; }
  if (lower === 'b') { e.preventDefault(); setMode('balance'); return; }
  if (lower === 's') { e.preventDefault(); openStatsModal(); return; }
  if (key === '?') { e.preventDefault(); openModal('help-modal'); return; }

  const step = e.shiftKey ? 10 : 1;
  if (key === 'ArrowLeft')  { applyNudge(-step, 0); e.preventDefault(); return; }
  if (key === 'ArrowRight') { applyNudge( step, 0); e.preventDefault(); return; }
  if (key === 'ArrowUp')    { applyNudge(0, -step); e.preventDefault(); return; }
  if (key === 'ArrowDown')  { applyNudge(0,  step); e.preventDefault(); return; }
});
