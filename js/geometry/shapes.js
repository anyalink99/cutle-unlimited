function generateShape(opts) {
  const noHoles = !!(opts && opts.noHoles);
  const noSymmetry = !!(opts && opts.noSymmetry);
  for (let attempt = 0; attempt < 30; attempt++) {
    let built = generateOuter();
    if (noSymmetry) {
      let guard = 0;
      while (built.symmetric && guard < 20) { built = generateOuter(); guard++; }
      if (built.symmetric) continue;
    }
    let shape = { outer: built.pts, holes: [] };
    shape = centerShapeObject(shape);
    const normalized = normalizeShapeArea(shape);
    if (!normalized) continue;

    if (noHoles) return normalized;

    if (built.symmetric) {
      const breaking = tryMakeSymmetricBreakingHoles(normalized.outer);
      if (breaking) {
        const holes = breaking.holes.slice();
        if (Math.random() < 0.4) {
          const extra = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < extra; i++) {
            const small = tryMakeSmallHoleAvoiding(breaking.outer, holes);
            if (!small) break;
            holes.push(small);
          }
        }
        const withHoles = { outer: breaking.outer, holes };
        const renormalized = normalizeShapeArea(withHoles);
        if (renormalized) return renormalized;
      }
      const cavity = tryMakeCavity(normalized.outer);
      if (cavity) {
        const withHole = { outer: normalized.outer, holes: [cavity] };
        const renormalized = normalizeShapeArea(withHole);
        if (renormalized) return renormalized;
      }
      continue;
    }

    let cavityChance = 0.15;
    const needsExtra = built.starMode && !built.hasBiteBump;
    if (needsExtra) cavityChance = 0.6;

    const clusterRoll = Math.random();
    if (!needsExtra && clusterRoll < 0.08) {
      const cluster = tryMakeClusterHoles(normalized.outer);
      if (cluster) {
        const withHoles = { outer: normalized.outer, holes: cluster };
        const renormalized = normalizeShapeArea(withHoles);
        if (renormalized) return renormalized;
      }
    }

    if (Math.random() < cavityChance) {
      const cavity = tryMakeCavity(normalized.outer);
      if (cavity) {
        const withHole = { outer: normalized.outer, holes: [cavity] };
        const renormalized = normalizeShapeArea(withHole);
        if (renormalized) return renormalized;
      }
      if (needsExtra) continue;
    } else if (needsExtra) {
      continue;
    }

    return normalized;
  }
}
