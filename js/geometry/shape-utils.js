function getBounds(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function integrateHolesIntoShape(outer, clippedHoles) {
  let currentOuter = outer;
  const interiorHoles = [];
  for (const hole of clippedHoles) {
    const { merged, leftover } = mergeBoundaryHoleIntoOuter(currentOuter, hole, 1.2);
    if (merged) { currentOuter = merged; continue; }
    if (!leftover) continue;
    let touchesBoundary = false;
    for (const p of leftover) {
      if (locateOnPolygonBoundary(p, currentOuter, 2.0)) { touchesBoundary = true; break; }
    }
    if (!touchesBoundary) interiorHoles.push(leftover);
  }
  return { outer: currentOuter, holes: interiorHoles };
}

function tryPlaceHolesInOuter(outer, count, targetHoleArea, lo, hi, layouts) {
  const b = getBounds(outer);
  const padX = (b.maxX - b.minX) * 0.3;
  const padY = (b.maxY - b.minY) * 0.3;
  const minX = b.minX - padX, maxX = b.maxX + padX;
  const minY = b.minY - padY, maxY = b.maxY + padY;
  for (let layout = 0; layout < layouts; layout++) {
    const clippedHoles = [];
    let totalArea = 0;
    for (let h = 0; h < count; h++) {
      const remaining = Math.max(0, targetHoleArea - totalArea);
      const slots = count - h;
      const perHoleTarget = Math.max(300, remaining / slots);
      const placed = placeBalanceHole(outer, clippedHoles, perHoleTarget, minX, maxX, minY, maxY);
      if (!placed) break;
      clippedHoles.push(placed);
      totalArea += polygonArea(placed);
    }
    if (clippedHoles.length !== count) continue;
    if (totalArea < lo || totalArea > hi) continue;
    return integrateHolesIntoShape(outer, clippedHoles);
  }
  return null;
}

function centerPoints(pts, cx, cy) {
  const dx = CX - cx, dy = CY - cy;
  return pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

function centerShapeObject(shape) {
  const c = polygonCentroid(shape.outer);
  return {
    outer: centerPoints(shape.outer, c.x, c.y),
    holes: shape.holes.map(h => centerPoints(h, c.x, c.y)),
  };
}

function normalizeShapeArea(shape) {
  const net = shapeArea(shape);
  if (net < 1) return null;
  const scale = Math.sqrt(TARGET_AREA / net);
  const scalePts = pts => pts.map(p => ({ x: CX + (p.x - CX) * scale, y: CY + (p.y - CY) * scale }));
  const outer = scalePts(shape.outer);
  let maxD = 0;
  for (const p of outer) {
    const d = Math.hypot(p.x - CX, p.y - CY);
    if (d > maxD) maxD = d;
  }
  if (maxD > MAX_R) return null;
  return { outer, holes: shape.holes.map(scalePts) };
}
