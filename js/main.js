const statsEls = {
  attempts: document.getElementById('s-attempts'),
  best: document.getElementById('s-best'),
  avg: document.getElementById('s-avg'),
  perfect: document.getElementById('s-perfect'),
  sqAttempts: document.getElementById('sq-attempts'),
  sqBest: document.getElementById('sq-best'),
  sqAvg: document.getElementById('sq-avg'),
  sqPerfect: document.getElementById('sq-perfect'),
  msAttempts: document.getElementById('ms-attempts'),
  msBest: document.getElementById('ms-best'),
  msAvg: document.getElementById('ms-avg'),
  msPerfect: document.getElementById('ms-perfect'),
};

const MODES = ['cut', 'inscribe', 'mass'];

document.getElementById('new-btn').addEventListener('click', () => {
  const action = dom.newBtn.dataset.action;
  if (action === 'confirm') {
    if (state.mode === 'inscribe') confirmInscribe();
    else if (state.mode === 'mass') confirmMass();
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
  variationsBtn.style.display = (state.mode === 'cut' || state.mode === 'inscribe') ? '' : 'none';
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
function refreshVarCards() {
  const isCut = state.mode === 'cut';
  const isInscribe = state.mode === 'inscribe';
  cutVarPicker.style.display = isCut ? '' : 'none';
  inscribeVarPicker.style.display = isInscribe ? '' : 'none';
  if (isCut) {
    variationsTitle.textContent = 'CUT VARIATIONS';
    variationsDesc.textContent = 'Same cut mechanics, new goals.';
  } else if (isInscribe) {
    variationsTitle.textContent = 'INSCRIBE VARIATIONS';
    variationsDesc.textContent = 'Same placement mechanics, different inscribed shape.';
  }
  document.querySelectorAll('.var-card').forEach(c => {
    c.classList.toggle('active', c.dataset.var === state.cutVariation);
  });
  document.querySelectorAll('.inscribe-var-card').forEach(c => {
    c.classList.toggle('active', c.dataset.inscvar === state.inscribeVariation);
  });
}
const statsCutSection = document.getElementById('stats-cut-section');
const statsInscribeSection = document.getElementById('stats-inscribe-section');
const statsMassSection = document.getElementById('stats-mass-section');
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

function currentStatsVariation() {
  if (state.mode === 'cut') return state.cutVariation;
  if (state.mode === 'inscribe') return state.inscribeVariation;
  return null;
}

function updateStatsSubtitle() {
  if (!statsSubtitle) return;
  if (state.mode === 'cut') {
    statsSubtitle.textContent = 'Cut · ' + (CUT_VARIATION_LABELS[state.cutVariation] || state.cutVariation);
  } else if (state.mode === 'inscribe') {
    statsSubtitle.textContent = 'Inscribe · ' + (INSCRIBE_VARIATION_LABELS[state.inscribeVariation] || state.inscribeVariation);
  } else if (state.mode === 'mass') {
    statsSubtitle.textContent = 'Center of Mass';
  }
}

function openStatsModal() {
  statsCutSection.style.display = state.mode === 'cut' ? '' : 'none';
  statsInscribeSection.style.display = state.mode === 'inscribe' ? '' : 'none';
  statsMassSection.style.display = state.mode === 'mass' ? '' : 'none';
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
initMassInput();

loadStats();

const initialRoute = parseLocation();
BASE_PATH = initialRoute.base;

let initialMode = initialRoute.mode;
if (!initialMode) {
  try { initialMode = localStorage.getItem(MODE_KEY); } catch (e) {}
  if (!initialMode || !MODES.includes(initialMode)) initialMode = 'cut';
}
state.mode = initialMode;
try { localStorage.setItem(MODE_KEY, state.mode); } catch (e) {}
document.body.dataset.mode = state.mode;

let initialVar = 'half';
try {
  const v = localStorage.getItem(CUT_VARIATION_KEY);
  if (v && CUT_VARIATIONS.includes(v)) initialVar = v;
} catch (e) {}
state.cutVariation = initialVar;
document.body.dataset.cutVariation = initialVar;

let initialInscVar = 'square';
try {
  const v = localStorage.getItem(INSCRIBE_VARIATION_KEY);
  if (v && INSCRIBE_VARIATIONS.includes(v)) initialInscVar = v;
} catch (e) {}
state.inscribeVariation = initialInscVar;
document.body.dataset.inscribeVariation = initialInscVar;

refreshModeCards();
newShape(initialRoute.hash || undefined, 'replace');

window.addEventListener('popstate', () => {
  const loc = parseLocation();
  if (!loc.mode) return;
  if (loc.mode !== state.mode) {
    state.mode = loc.mode;
    document.body.dataset.mode = state.mode;
    try { localStorage.setItem(MODE_KEY, state.mode); } catch (e) {}
    refreshModeCards();
  }
  if (loc.hash && loc.hash !== state.hash) {
    newShape(loc.hash, 'skip');
  } else if (!loc.hash) {
    newShape(undefined, 'replace');
  }
});
