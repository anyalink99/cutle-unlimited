const state = {
  mode: 'cut',
  cutVariation: 'half',
  inscribeVariation: 'square',
  balanceVariation: 'pole',
  shape: { outer: [], holes: [] },
  locked: false,
  hash: null,
  daily: false,
};

function balanceVariation() {
  return state.balanceVariation || 'pole';
}

function currentVariation() {
  if (state.mode === 'cut') return state.cutVariation;
  if (state.mode === 'inscribe') return state.inscribeVariation;
  if (state.mode === 'balance') return state.balanceVariation;
  return 'half';
}

function updateActionButton() {
  const btn = dom.newBtn;
  let needsConfirm = false;
  if (state.mode === 'inscribe' && inscribeState.points.length === inscribeN() && !inscribeState.confirmed) needsConfirm = true;
  else if (state.mode === 'balance') {
    if (balanceVariation() === 'pole') needsConfirm = !poleState.confirmed && poleState.pole != null;
    else needsConfirm = !centroidState.confirmed && centroidState.guess != null;
  }
  else if (state.mode === 'cut' && !cutState.confirmed) {
    const v = cutVariation();
    const placed = cutState.cuts.length;
    if (v === 'angle') needsConfirm = placed >= 1;
    else needsConfirm = placed >= cutRequiredCount();
  }
  if (needsConfirm) {
    btn.textContent = 'Confirm';
    btn.dataset.action = 'confirm';
  } else {
    btn.textContent = 'New Shape';
    btn.dataset.action = 'new';
  }
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) shareBtn.hidden = !state.locked;
}

function generateShapeForMode() {
  if (state.mode === 'inscribe') {
    for (let i = 0; i < 40; i++) {
      const s = generateShape();
      if (!s.holes || s.holes.length === 0) return s;
    }
    const s = generateShape();
    return { outer: s.outer, holes: [] };
  }
  if (state.mode === 'balance') {
    return generateBalanceShape();
  }
  return generateShape();
}

function newShape(hash, nav = 'push') {
  let h = hash;
  if (!h) {
    h = state.daily
      ? dailyHashFor(state.mode, currentVariation())
      : generateHash();
  }
  state.hash = h;
  state.shape = withSeed(seedFromString(h), generateShapeForMode);
  state.locked = false;
  cutReset();
  renderShape(state.shape);
  if (state.mode === 'inscribe') {
    inscribeReset();
    renderInscribeAll();
    precomputeIdeal(state.shape.outer);
  } else if (state.mode === 'balance') {
    balanceReset();
    updateBalanceHint();
    dom.hitPad.style.cursor = 'crosshair';
    if (balanceVariation() === 'pole') onPoleShapeReady();
  } else {
    cutOnNewShape();
    dom.hitPad.style.cursor = '';
  }
  dom.newBtn.classList.remove('pulse');
  updateActionButton();
  // In daily mode the URL is ?daily=1 (no seed hash — it's derived from the date).
  const urlHash = state.daily ? null : state.hash;
  if (nav === 'replace') replaceRoute(state.mode, currentVariation(), urlHash, state.daily);
  else if (nav === 'push') pushRoute(state.mode, currentVariation(), urlHash, state.daily);
}

function setMode(m) {
  if (m !== 'cut' && m !== 'inscribe' && m !== 'balance') return;
  state.mode = m;
  document.body.dataset.mode = m;
  try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
  newShape();
}

function setCutVariation(v) {
  if (!CUT_VARIATIONS.includes(v)) return;
  if (state.cutVariation === v && state.mode === 'cut') return;
  state.cutVariation = v;
  document.body.dataset.cutVariation = v;
  try { localStorage.setItem(CUT_VARIATION_KEY, v); } catch (e) {}
  if (state.mode === 'cut') {
    state.locked = false;
    cutReset();
    renderShape(state.shape);
    cutOnNewShape();
    dom.newBtn.classList.remove('pulse');
    updateActionButton();
    pushRoute('cut', v, state.daily ? null : state.hash, state.daily);
  }
}

function setBalanceVariation(v) {
  if (!BALANCE_VARIATIONS.includes(v)) return;
  if (state.balanceVariation === v && state.mode === 'balance') return;
  state.balanceVariation = v;
  document.body.dataset.balanceVariation = v;
  try { localStorage.setItem(BALANCE_VARIATION_KEY, v); } catch (e) {}
  if (state.mode === 'balance') {
    state.locked = false;
    balanceReset();
    renderShape(state.shape);
    if (v === 'pole') onPoleShapeReady();
    updateBalanceHint();
    dom.hitPad.style.cursor = 'crosshair';
    dom.newBtn.classList.remove('pulse');
    updateActionButton();
    pushRoute('balance', v, state.daily ? null : state.hash, state.daily);
  }
}

function setInscribeVariation(v) {
  if (!INSCRIBE_VARIATIONS.includes(v)) return;
  if (state.inscribeVariation === v && state.mode === 'inscribe') return;
  state.inscribeVariation = v;
  document.body.dataset.inscribeVariation = v;
  try { localStorage.setItem(INSCRIBE_VARIATION_KEY, v); } catch (e) {}
  if (state.mode === 'inscribe') {
    state.locked = false;
    inscribeReset();
    renderShape(state.shape);
    precomputeIdeal(state.shape.outer);
    renderInscribeAll();
    dom.newBtn.classList.remove('pulse');
    updateActionButton();
    pushRoute('inscribe', v, state.daily ? null : state.hash, state.daily);
  }
}

// Toggle between endless (random each shape) and daily (one shared seed per
// mode+variation per UTC day). URL is the source of truth: ?daily=1 on, absent
// off. Regenerates the current shape to match the new seed source.
function setDailyMode(daily) {
  daily = !!daily;
  if (state.daily === daily) return;
  state.daily = daily;
  newShape();
}

// Apply a combined mode+variation selection from the unified puzzle modal.
// Prefers a single shape regeneration and URL update.
function applyPuzzleChoice(mode, variation) {
  const varsByMode = {
    cut: CUT_VARIATIONS,
    inscribe: INSCRIBE_VARIATIONS,
    balance: BALANCE_VARIATIONS,
  };
  if (!varsByMode[mode] || !varsByMode[mode].includes(variation)) return;

  if (state.mode === mode) {
    if (mode === 'cut') setCutVariation(variation);
    else if (mode === 'inscribe') setInscribeVariation(variation);
    else if (mode === 'balance') setBalanceVariation(variation);
    return;
  }

  // Cross-mode: update the target mode's variation in state + storage first,
  // then switch mode so the new shape is generated with the right variation.
  if (mode === 'cut') {
    state.cutVariation = variation;
    document.body.dataset.cutVariation = variation;
    try { localStorage.setItem(CUT_VARIATION_KEY, variation); } catch (e) {}
  } else if (mode === 'inscribe') {
    state.inscribeVariation = variation;
    document.body.dataset.inscribeVariation = variation;
    try { localStorage.setItem(INSCRIBE_VARIATION_KEY, variation); } catch (e) {}
  } else if (mode === 'balance') {
    state.balanceVariation = variation;
    document.body.dataset.balanceVariation = variation;
    try { localStorage.setItem(BALANCE_VARIATION_KEY, variation); } catch (e) {}
  }
  setMode(mode);
}
