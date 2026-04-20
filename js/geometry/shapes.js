function _sampleGenericHoleCount() {
  const r = Math.random();
  if (r < 0.55) return 0;
  if (r < 0.80) return 1;
  if (r < 0.93) return 2;
  return 3;
}

function generateShape(opts) {
  const noHoles = !!(opts && opts.noHoles);
  const noSymmetry = !!(opts && opts.noSymmetry);
  let built, start;
  for (let tries = 0; tries < 15; tries++) {
    const candidate = generateOuter();
    if (noSymmetry && candidate.symmetric) continue;
    const normalized = normalizeShapeArea(centerShapeObject({ outer: candidate.pts, holes: [] }));
    if (normalized) { built = candidate; start = normalized; break; }
  }
  if (!start) {
    // Nothing passed the strict extent filter. Force-clamp any outer — produces
    // a smaller shape but always valid, which beats returning a placeholder.
    for (let tries = 0; tries < 10; tries++) {
      const candidate = generateOuter();
      if (noSymmetry && candidate.symmetric && tries < 5) continue;
      const normalized = normalizeShapeArea(centerShapeObject({ outer: candidate.pts, holes: [] }), true);
      if (normalized) { built = candidate; start = normalized; break; }
    }
  }
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
