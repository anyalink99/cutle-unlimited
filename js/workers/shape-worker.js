importScripts(
  '../core/constants.js',
  '../core/random.js',
  '../core/seed.js',
  '../geometry/geometry.js',
  '../geometry/shape-utils.js',
  '../geometry/shape-edges.js',
  '../geometry/shape-outer.js',
  '../geometry/shape-holes.js',
  '../geometry/shapes.js',
);

// Must match each mode's pickShape() exactly — identical Math.random() consumption
// under the same seed produces identical shapes, preserving daily-hash determinism.
function pickShapeFor(mode) {
  if (mode === 'cut') {
    if (Math.random() < 0.15) return generateBalanceShape();
    return generateShape();
  }
  if (mode === 'inscribe') {
    if (Math.random() < 0.25) {
      const bal = generateInscribeBalanceShape();
      if (bal) return bal;
    }
    return generateShape({ noHoles: true, noSymmetry: true });
  }
  if (mode === 'balance') return generateBalanceShape();
  return generateShape();
}

onmessage = (e) => {
  const d = e.data;
  if (!d || d.type !== 'gen') return;
  let shape;
  try {
    shape = withSeed(seedFromString(d.hash), () => pickShapeFor(d.mode));
  } catch (err) {
    postMessage({ type: 'gen', reqId: d.reqId, error: String(err && err.message || err) });
    return;
  }
  if (!shape) {
    postMessage({ type: 'gen', reqId: d.reqId, error: 'no shape' });
    return;
  }
  postMessage({ type: 'gen', reqId: d.reqId, hash: d.hash, shape });
};
