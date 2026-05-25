function syncBackdrop() {
  const anyActive = !!document.querySelector('.modal-back.open:not(.closing)');
  document.body.classList.toggle('modals-open', anyActive);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  // --- niokit modal pipeline (disabled for now; kept as reference) ---
  // If a modal's markup uses .k-modal, route it to niokit (focus-trap, scroll-lock…).
  // Convert that modal's markup to k-modal/__backdrop/__panel to enable it:
  // if (m.classList.contains('k-modal') && window.Kit && Kit.modal) { Kit.modal.open(m); return; }
  m.classList.remove('closing');
  m.classList.add('open');
  syncBackdrop();
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  // if (m.classList.contains('k-modal') && window.Kit && Kit.modal) { Kit.modal.close(m); return; }
  if (!m.classList.contains('open')) return;
  m.classList.add('closing');
  syncBackdrop();
  setTimeout(() => {
    m.classList.remove('open');
    m.classList.remove('closing');
    syncBackdrop();
  }, 220);
}

function bindModalDismissers() {
  document.querySelectorAll('.modal-back').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
  });
}
