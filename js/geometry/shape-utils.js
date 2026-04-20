function getBounds(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
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

// forceClamp skips the extent-overshoot reject and just clamps into MAX_R —
// used on a last-resort retry when the strict pass couldn't find a clean outer.
function normalizeShapeArea(shape, forceClamp) {
  const net = shapeArea(shape);
  if (net < 1) return null;
  let scale = Math.sqrt(TARGET_AREA / net);
  let maxD = 0;
  for (const p of shape.outer) {
    const d = Math.hypot(p.x - CX, p.y - CY);
    if (d > maxD) maxD = d;
  }
  const wanted = maxD * scale;
  if (wanted > MAX_R) {
    if (!forceClamp && wanted > MAX_R * 1.35) return null;
    scale = MAX_R / maxD;
  }
  const scalePts = pts => pts.map(p => ({ x: CX + (p.x - CX) * scale, y: CY + (p.y - CY) * scale }));
  return { outer: scalePts(shape.outer), holes: shape.holes.map(scalePts) };
}
