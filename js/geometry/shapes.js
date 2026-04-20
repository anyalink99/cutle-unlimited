function _sampleGenericHoleCount() {
  const r = Math.random();
  if (r < 0.55) return 0;
  if (r < 0.80) return 1;
  if (r < 0.93) return 2;
  return 3;
}

function _fallbackCircle() {
  const pts = [];
  const R = 100;
  const N = 48;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    pts.push({ x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R });
  }
  return { outer: pts, holes: [] };
}

function generateShape(opts) {
  const noHoles = !!(opts && opts.noHoles);
  const noSymmetry = !!(opts && opts.noSymmetry);
  let start = null, built = null;
  for (let tries = 0; tries < 15 && !start; tries++) {
    const candidate = generateOuter();
    if (noSymmetry && candidate.symmetric) continue;
    const normalized = normalizeShapeArea(centerShapeObject({ outer: candidate.pts, holes: [] }));
    if (!normalized) continue;
    built = candidate;
    start = normalized;
  }
  if (!start) return _fallbackCircle();
  if (noHoles) return start;

  // K-fold (symmetric) outers need asymmetric carving so the puzzle isn't
  // trivially solvable by the shape's symmetry axis. Use balance-style bites
  // at 10-30% area.
  if (built.symmetric) {
    const outerArea = polygonArea(start.outer);
    const targetRatio = 0.10 + Math.random() * 0.20;
    const count = 1 + Math.floor(Math.random() * 3);
    const result = integrateBitesAndHoles(start.outer, count, outerArea * targetRatio);
    if (result.outer !== start.outer || result.holes.length) {
      return { outer: result.outer, holes: result.holes };
    }
  }

  const count = _sampleGenericHoleCount();
  if (count === 0) return start;
  const holes = makeHolesSimple(start.outer, count, { minDist: 10, maxR: 30 });
  if (!holes.length) return start;
  const withHoles = { outer: start.outer, holes };
  return normalizeShapeArea(withHoles) || start;
}
