const statsEls = {
  attempts: document.getElementById('s-attempts'),
  best: document.getElementById('s-best'),
  avg: document.getElementById('s-avg'),
  perfect: document.getElementById('s-perfect'),
};

document.getElementById('new-btn').addEventListener('click', () => {
  const action = dom.newBtn.dataset.action;
  if (action === 'confirm') {
    confirmSquare();
  } else {
    newShape();
  }
});
document.getElementById('gamemode-btn').addEventListener('click', () => openModal('gamemode-modal'));
document.getElementById('help-btn').addEventListener('click', () => openModal('help-modal'));
document.getElementById('close-help').addEventListener('click', () => closeModal('help-modal'));
document.getElementById('close-gamemode').addEventListener('click', () => closeModal('gamemode-modal'));
document.getElementById('close-stats').addEventListener('click', () => closeModal('stats-modal'));
document.getElementById('reset-stats').addEventListener('click', () => {
  if (confirm('Reset all stats?')) {
    resetStats();
    renderStatsInto(statsEls);
  }
});
document.getElementById('stats-btn').addEventListener('click', () => {
  renderStatsInto(statsEls);
  openModal('stats-modal');
});

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
}
document.getElementById('gamemode-btn').addEventListener('click', refreshModeCards);

bindModalDismissers();
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });

loadStats();

let savedMode = 'cut';
try { savedMode = localStorage.getItem(MODE_KEY) || 'cut'; } catch (e) {}
state.mode = savedMode === 'square' ? 'square' : 'cut';
document.body.dataset.mode = state.mode;
refreshModeCards();
newShape();
