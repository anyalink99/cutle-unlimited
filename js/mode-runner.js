class ModeInterface {
  constructor(impl) {
    const required = [
      'reset', 'onShapeReady', 'confirm',
      'snapshot', 'restoreSnapshot', 'hasPendingConfirm',
    ];
    for (const m of required) {
      if (typeof impl[m] !== 'function') {
        throw new Error('ModeInterface missing method: ' + m);
      }
    }
    Object.assign(this, impl);
  }
}

const modeRunner = {
  cut: new ModeInterface({
    reset() { cutReset(); },
    onShapeReady() {
      cutOnNewShape();
      dom.hitPad.style.cursor = '';
    },
    confirm(opts) { finalizeCut(opts); },
    snapshot() { return cutSnapshot(); },
    restoreSnapshot(snap) { cutRestoreSnapshot(snap); },
    hasPendingConfirm() {
      if (cutState.confirmed) return false;
      const placed = cutState.cuts.length;
      if (cutVariation() === 'angle') return placed >= 1;
      return placed >= cutRequiredCount();
    },
  }),
  inscribe: new ModeInterface({
    reset() { inscribeReset(); },
    onShapeReady() {
      precomputeIdeal(state.shape.outer);
      renderInscribeAll();
    },
    confirm(opts) { confirmInscribe(opts); },
    snapshot() { return inscribeSnapshot(); },
    restoreSnapshot(snap) { inscribeRestoreSnapshot(snap); },
    hasPendingConfirm() {
      return !inscribeState.confirmed &&
             inscribeState.points.length === inscribeN();
    },
  }),
  balance: new ModeInterface({
    reset() { balanceReset(); },
    onShapeReady() {
      if (balanceVariation() === 'pole') onPoleShapeReady();
      updateBalanceHint();
      dom.hitPad.style.cursor = 'crosshair';
    },
    confirm(opts) { confirmBalance(opts); },
    snapshot() {
      return balanceVariation() === 'pole' ? poleSnapshot() : centroidSnapshot();
    },
    restoreSnapshot(snap) {
      if (balanceVariation() === 'pole') poleRestoreSnapshot(snap);
      else centroidRestoreSnapshot(snap);
    },
    hasPendingConfirm() {
      if (balanceVariation() === 'pole') {
        return !poleState.confirmed && poleState.pole != null;
      }
      return !centroidState.confirmed && centroidState.guess != null;
    },
  }),
};
