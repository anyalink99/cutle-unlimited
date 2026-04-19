const statsEls = {
  attempts: document.getElementById('s-attempts'),
  best: document.getElementById('s-best'),
  avg: document.getElementById('s-avg'),
  perfect: document.getElementById('s-perfect'),
  inAttempts: document.getElementById('in-attempts'),
  inBest: document.getElementById('in-best'),
  inAvg: document.getElementById('in-avg'),
  inPerfect: document.getElementById('in-perfect'),
  blAttempts: document.getElementById('bl-attempts'),
  blBest: document.getElementById('bl-best'),
  blAvg: document.getElementById('bl-avg'),
  blPerfect: document.getElementById('bl-perfect'),
};

const MODES = ['cut', 'inscribe', 'balance'];

document.getElementById('new-btn').addEventListener('click', () => {
  const action = dom.newBtn.dataset.action;
  if (action === 'confirm') {
    if (state.mode === 'inscribe') confirmInscribe();
    else if (state.mode === 'balance') confirmBalance();
    else if (state.mode === 'cut') finalizeCut();
  } else {
    newShape();
  }
});
document.getElementById('gamemode-btn').addEventListener('click', () => openModal('gamemode-modal'));
document.getElementById('help-btn').addEventListener('click', () => openModal('help-modal'));
document.getElementById('close-help').addEventListener('click', () => closeModal('help-modal'));
document.getElementById('close-gamemode').addEventListener('click', () => closeModal('gamemode-modal'));
document.getElementById('close-stats').addEventListener('click', () => closeModal('stats-modal'));
document.getElementById('close-variations').addEventListener('click', () => closeModal('variations-modal'));

const variationsBtn = document.getElementById('variations-btn');
const cutVarPicker = document.getElementById('cut-var-picker');
const inscribeVarPicker = document.getElementById('inscribe-var-picker');
const variationsTitle = document.getElementById('variations-title');
const variationsDesc = document.getElementById('variations-desc');

function refreshVariationsBtn() {
  variationsBtn.style.display = (state.mode === 'cut' || state.mode === 'inscribe' || state.mode === 'balance') ? '' : 'none';
}
variationsBtn.addEventListener('click', () => {
  refreshVarCards();
  closeModal('gamemode-modal');
  openModal('variations-modal');
});
document.querySelectorAll('.var-card').forEach(card => {
  card.addEventListener('click', () => {
    const v = card.dataset.var;
    closeModal('variations-modal');
    setCutVariation(v);
  });
});
document.querySelectorAll('.inscribe-var-card').forEach(card => {
  card.addEventListener('click', () => {
    const v = card.dataset.inscvar;
    closeModal('variations-modal');
    setInscribeVariation(v);
  });
});
document.querySelectorAll('.balance-var-card').forEach(card => {
  card.addEventListener('click', () => {
    const v = card.dataset.balancevar;
    closeModal('variations-modal');
    setBalanceVariation(v);
  });
});
const balanceVarPicker = document.getElementById('balance-var-picker');
function refreshVarCards() {
  const isCut = state.mode === 'cut';
  const isInscribe = state.mode === 'inscribe';
  const isBalance = state.mode === 'balance';
  cutVarPicker.style.display = isCut ? '' : 'none';
  inscribeVarPicker.style.display = isInscribe ? '' : 'none';
  balanceVarPicker.style.display = isBalance ? '' : 'none';
  if (isCut) {
    variationsTitle.textContent = 'CUT VARIATIONS';
    variationsDesc.textContent = 'Same cut mechanics, new goals.';
  } else if (isInscribe) {
    variationsTitle.textContent = 'INSCRIBE VARIATIONS';
    variationsDesc.textContent = 'Same placement mechanics, different inscribed shape.';
  } else if (isBalance) {
    variationsTitle.textContent = 'BALANCE VARIATIONS';
    variationsDesc.textContent = 'Same shape, different way to find the balance.';
  }
  document.querySelectorAll('.var-card').forEach(c => {
    c.classList.toggle('active', c.dataset.var === state.cutVariation);
  });
  document.querySelectorAll('.inscribe-var-card').forEach(c => {
    c.classList.toggle('active', c.dataset.inscvar === state.inscribeVariation);
  });
  document.querySelectorAll('.balance-var-card').forEach(c => {
    c.classList.toggle('active', c.dataset.balancevar === state.balanceVariation);
  });
}
const statsCutSection = document.getElementById('stats-cut-section');
const statsInscribeSection = document.getElementById('stats-inscribe-section');
const statsBalanceSection = document.getElementById('stats-balance-section');
const statsSubtitle = document.getElementById('stats-subtitle');

const CUT_VARIATION_LABELS = {
  half: 'Half',
  ratio: 'Target Ratio',
  quad: 'Quad Cut',
  tri: 'Tri Cut',
  angle: 'Constrained Angle',
};
const INSCRIBE_VARIATION_LABELS = {
  square: 'Square',
  triangle: 'Equilateral Triangle',
};
const BALANCE_VARIATION_LABELS = {
  centroid: 'Centroid',
  pole: 'Pole Balance',
};

function currentStatsVariation() {
  if (state.mode === 'cut') return state.cutVariation;
  if (state.mode === 'inscribe') return state.inscribeVariation;
  if (state.mode === 'balance') return state.balanceVariation;
  return null;
}

function updateStatsSubtitle() {
  if (!statsSubtitle) return;
  if (state.mode === 'cut') {
    statsSubtitle.textContent = 'Cut · ' + (CUT_VARIATION_LABELS[state.cutVariation] || state.cutVariation);
  } else if (state.mode === 'inscribe') {
    statsSubtitle.textContent = 'Inscribe · ' + (INSCRIBE_VARIATION_LABELS[state.inscribeVariation] || state.inscribeVariation);
  } else if (state.mode === 'balance') {
    statsSubtitle.textContent = 'Balance · ' + (BALANCE_VARIATION_LABELS[state.balanceVariation] || state.balanceVariation);
  }
}

function openStatsModal() {
  statsCutSection.style.display = state.mode === 'cut' ? '' : 'none';
  statsInscribeSection.style.display = state.mode === 'inscribe' ? '' : 'none';
  statsBalanceSection.style.display = state.mode === 'balance' ? '' : 'none';
  updateStatsSubtitle();
  renderStatsInto(statsEls, state.mode, currentStatsVariation());
  openModal('stats-modal');
}

document.getElementById('reset-stats').addEventListener('click', () => {
  if (confirm('Reset stats?')) {
    resetStats(state.mode, currentStatsVariation());
    renderStatsInto(statsEls, state.mode, currentStatsVariation());
  }
});
document.getElementById('stats-btn').addEventListener('click', openStatsModal);

document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    const m = card.dataset.mode;
    closeModal('gamemode-modal');
    setMode(m);
  });
});

function refreshModeCards() {
  document.querySelectorAll('.mode-card').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === state.mode);
  });
  refreshVariationsBtn();
}
document.getElementById('gamemode-btn').addEventListener('click', refreshModeCards);

bindModalDismissers();
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });

initCutInput();
initInscribeInput();
initBalanceInput();

loadStats();

const initialRoute = parseLocation();

// Authoritative source for mode+variation is the HTML file that was served.
// Each generated page exposes window.__INITIAL_MODE / __INITIAL_VARIATION.
// parseLocation() is used as a fallback (e.g. if 404 redirected us here) and
// always to pull the ?s= hash.
let initialMode = window.__INITIAL_MODE || initialRoute.mode;
if (!initialMode || !MODES.includes(initialMode)) {
  try { initialMode = localStorage.getItem(MODE_KEY); } catch (e) {}
  if (!initialMode || !MODES.includes(initialMode)) initialMode = 'cut';
}
state.mode = initialMode;
try { localStorage.setItem(MODE_KEY, state.mode); } catch (e) {}
document.body.dataset.mode = state.mode;

function pickInitialVariation(mode, urlVar, validList, storageKey, fallback) {
  // URL/HTML explicit for current mode wins; localStorage for other modes.
  if (state.mode === mode && window.__INITIAL_VARIATION && validList.includes(window.__INITIAL_VARIATION)) {
    return window.__INITIAL_VARIATION;
  }
  if (state.mode === mode && urlVar && validList.includes(urlVar)) {
    return urlVar;
  }
  try {
    const v = localStorage.getItem(storageKey);
    if (v && validList.includes(v)) return v;
  } catch (e) {}
  return fallback;
}

state.cutVariation = pickInitialVariation('cut', initialRoute.variation, CUT_VARIATIONS, CUT_VARIATION_KEY, 'half');
document.body.dataset.cutVariation = state.cutVariation;

state.inscribeVariation = pickInitialVariation('inscribe', initialRoute.variation, INSCRIBE_VARIATIONS, INSCRIBE_VARIATION_KEY, 'square');
document.body.dataset.inscribeVariation = state.inscribeVariation;

state.balanceVariation = pickInitialVariation('balance', initialRoute.variation, BALANCE_VARIATIONS, BALANCE_VARIATION_KEY, 'pole');
document.body.dataset.balanceVariation = state.balanceVariation;

refreshModeCards();
newShape(initialRoute.hash || undefined, 'replace');

window.addEventListener('popstate', () => {
  const loc = parseLocation();
  const targetMode = loc.mode || state.mode;
  if (targetMode !== state.mode) {
    state.mode = targetMode;
    document.body.dataset.mode = state.mode;
    try { localStorage.setItem(MODE_KEY, state.mode); } catch (e) {}
    refreshModeCards();
  }
  if (loc.variation) {
    if (state.mode === 'cut' && loc.variation !== state.cutVariation) {
      state.cutVariation = loc.variation;
      document.body.dataset.cutVariation = loc.variation;
    } else if (state.mode === 'inscribe' && loc.variation !== state.inscribeVariation) {
      state.inscribeVariation = loc.variation;
      document.body.dataset.inscribeVariation = loc.variation;
    } else if (state.mode === 'balance' && loc.variation !== state.balanceVariation) {
      state.balanceVariation = loc.variation;
      document.body.dataset.balanceVariation = loc.variation;
    }
  }
  updateMeta(state.mode, currentVariation());
  if (loc.hash && loc.hash !== state.hash) {
    newShape(loc.hash, 'skip');
  } else if (!loc.hash) {
    newShape(undefined, 'replace');
  } else {
    // Same hash, mode/variation may have changed — re-render without new seed.
    newShape(state.hash, 'skip');
  }
});
