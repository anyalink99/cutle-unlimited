function cavityFitsInside(pts, outer, margin) {
  for (const p of pts) {
    if (!pointInPolygon(p, outer)) return false;
    if (distPointToPolygon(p, outer) < margin) return false;
  }
  return true;
}

function makeCircleCavity(cx, cy, r) {
  const N = Math.max(32, Math.min(72, Math.round(r * 1.4)));
  const angOff = rand(0, TAU);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = angOff + (i / N) * TAU;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function makeLensCavity(cx, cy, len, ang, bulge) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const px = -dy, py = dx;
  const a = { x: cx - dx * len / 2, y: cy - dy * len / 2 };
  const b = { x: cx + dx * len / 2, y: cy + dy * len / 2 };
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const c1 = { x: mx + px * bulge, y: my + py * bulge };
  const c2 = { x: mx - px * bulge, y: my - py * bulge };
  const pts = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const t = i / N, u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * c1.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c1.y + t * t * b.y,
    });
  }
  for (let i = 0; i < N; i++) {
    const t = i / N, u = 1 - t;
    pts.push({
      x: u * u * b.x + 2 * u * t * c2.x + t * t * a.x,
      y: u * u * b.y + 2 * u * t * c2.y + t * t * a.y,
    });
  }
  return pts;
}

function tryMakeCavity(outer) {
  const { minX, maxX, minY, maxY } = getBounds(outer);
  for (let tries = 0; tries < 50; tries++) {
    const cx = rand(minX, maxX);
    const cy = rand(minY, maxY);
    if (!pointInPolygon({ x: cx, y: cy }, outer)) continue;
    const interiorDist = distPointToPolygon({ x: cx, y: cy }, outer);
    if (interiorDist < 20) continue;
    const margin = 9;
    const maxR = Math.min(interiorDist - margin, 30);
    if (maxR < 9) continue;
    const typeRoll = Math.random();
    let type;
    if (typeRoll < 0.5) type = 'circle';
    else if (typeRoll < 0.8) type = 'lens';
    else type = 'slit';
    let pts;
    if (type === 'circle') {
      const r = rand(9, maxR);
      pts = makeCircleCavity(cx, cy, r);
    } else if (type === 'lens') {
      const ang = rand(0, TAU);
      const len = rand(22, Math.min(64, (interiorDist - margin) * 2 * 0.85));
      const bulge = len * rand(0.22, 0.42);
      if (bulge > maxR) continue;
      pts = makeLensCavity(cx, cy, len, ang, bulge);
    } else {
      const ang = rand(0, TAU);
      const maxLen = (interiorDist - margin) * 2 * 0.9;
      if (maxLen < 40) continue;
      const len = rand(40, Math.min(130, maxLen));
      const bulge = Math.min(maxR * 0.7, len * rand(0.06, 0.14));
      if (bulge < 3) continue;
      pts = makeLensCavity(cx, cy, len, ang, bulge);
    }
    if (cavityFitsInside(pts, outer, margin)) return pts;
  }
  return null;
}

function tryMakeSmallHoleAvoiding(outer, existing) {
  const { minX, maxX, minY, maxY } = getBounds(outer);
  const margin = 7;
  for (let tries = 0; tries < 80; tries++) {
    const cx = rand(minX, maxX);
    const cy = rand(minY, maxY);
    const center = { x: cx, y: cy };
    if (!pointInPolygon(center, outer)) continue;
    let blocked = false;
    for (const h of existing) {
      if (pointInPolygon(center, h)) { blocked = true; break; }
    }
    if (blocked) continue;
    let minDist = distPointToPolygon(center, outer);
    for (const h of existing) {
      minDist = Math.min(minDist, distPointToPolygon(center, h));
    }
    if (minDist < 12) continue;
    const maxR = Math.min(minDist - margin, 14);
    if (maxR < 6) continue;
    const r = rand(6, maxR);
    const pts = makeCircleCavity(cx, cy, r);
    if (!cavityFitsInside(pts, outer, margin)) continue;
    let overlaps = false;
    for (const h of existing) {
      for (const p of pts) {
        if (pointInPolygon(p, h)) { overlaps = true; break; }
      }
      if (overlaps) break;
    }
    if (overlaps) continue;
    return pts;
  }
  return null;
}

function tryMakeClusterHoles(outer) {
  const count = 3 + Math.floor(Math.random() * 4);
  const holes = [];
  for (let i = 0; i < count; i++) {
    const hole = tryMakeSmallHoleAvoiding(outer, holes);
    if (!hole) break;
    holes.push(hole);
  }
  return holes.length >= 3 ? holes : null;
}

function tryMakeSymmetricBreakingHoles(outer) {
  const count = 1 + Math.floor(Math.random() * 3);
  const targetRatio = 0.10 + Math.random() * 0.20;
  const outerArea = polygonArea(outer);
  const targetHoleArea = outerArea * targetRatio;
  const tol = outerArea * 0.05;
  const lo = Math.max(outerArea * 0.08, targetHoleArea - tol);
  const hi = Math.min(outerArea * 0.32, targetHoleArea + tol);
  return tryPlaceHolesInOuter(outer, count, targetHoleArea, lo, hi, 15);
}

function sampleBalanceHoleCount() {
  const roll = Math.random() * 100;
  if (roll < 20)   return 1;
  if (roll < 40)   return 2;
  if (roll < 60)   return 3;
  if (roll < 70)   return 4;
  if (roll < 77.5) return 5;
  if (roll < 85)   return 6;
  if (roll < 90)   return 7;
  if (roll < 94)   return 8;
  if (roll < 97)   return 9;
  if (roll < 98.5) return 10;
  if (roll < 99.5) return 11;
  return 12;
}

function placeBalanceHole(outer, existing, targetArea, minX, maxX, minY, maxY) {
  for (let tries = 0; tries < 120; tries++) {
    const cx = rand(minX, maxX);
    const cy = rand(minY, maxY);
    const slack = rand(1.15, 1.9);
    const unclippedArea = targetArea * slack;
    const r = Math.sqrt(unclippedArea / Math.PI);
    if (r < 8 || r > 220) continue;

    let pts;
    if (Math.random() < 0.7) {
      pts = makeCircleCavity(cx, cy, r);
    } else {
      const len = r * 1.8;
      const ang = rand(0, TAU);
      const bulge = len * rand(0.22, 0.4);
      pts = makeLensCavity(cx, cy, len, ang, bulge);
    }

    let hasOutside = false, hasInside = false;
    for (const p of pts) {
      if (pointInPolygon(p, outer)) hasInside = true;
      else hasOutside = true;
      if (hasOutside && hasInside) break;
    }
    if (!hasOutside || !hasInside) continue;

    const clipped = intersectPolygonWithConvex(outer, pts);
    if (!clipped || clipped.length < 3) continue;
    const area = polygonArea(clipped);
    if (area < 80) continue;

    let overlaps = false;
    for (const h of existing) {
      if (polygonsOverlap(clipped, h)) { overlaps = true; break; }
    }
    if (overlaps) continue;

    return clipped;
  }
  return null;
}

function tryBalanceShapeWithCount(targetHoleCount) {
  const targetRatio = 0.30 + Math.random() * 0.60;

  for (let outerAttempt = 0; outerAttempt < 12; outerAttempt++) {
    const built = generateOuter();
    const normalized = normalizeShapeArea(centerShapeObject({ outer: built.pts, holes: [] }));
    if (!normalized) continue;

    const outer = normalized.outer;
    const outerArea = polygonArea(outer);
    const targetHoleArea = outerArea * targetRatio;
    const tol = outerArea * 0.10;
    const lo = Math.max(outerArea * 0.28, targetHoleArea - tol);
    const hi = Math.min(outerArea * 0.92, targetHoleArea + tol);

    const result = tryPlaceHolesInOuter(outer, targetHoleCount, targetHoleArea, lo, hi, 15);
    if (result) return result;
  }
  return null;
}

function generateBalanceShape() {
  let count = sampleBalanceHoleCount();
  for (let round = 0; round < 4; round++) {
    const result = tryBalanceShapeWithCount(count);
    if (result) return result;
    if (count <= 1) break;
    count = Math.max(1, Math.floor(count * 0.6));
  }
  return generateShape();
}

function placeIndentAndMerge(outer, targetArea) {
  const b = getBounds(outer);
  const padX = (b.maxX - b.minX) * 0.3;
  const padY = (b.maxY - b.minY) * 0.3;
  const minX = b.minX - padX, maxX = b.maxX + padX;
  const minY = b.minY - padY, maxY = b.maxY + padY;
  for (let tries = 0; tries < 10; tries++) {
    const placed = placeBalanceHole(outer, [], targetArea, minX, maxX, minY, maxY);
    if (!placed) continue;
    const { merged } = mergeBoundaryHoleIntoOuter(outer, placed, 1.2);
    if (merged) return merged;
  }
  return null;
}

function generateInscribeBalanceShape() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const built = generateOuter();
    if (built.symmetric) continue;
    const start = normalizeShapeArea(centerShapeObject({ outer: built.pts, holes: [] }));
    if (!start) continue;

    let current = start.outer;
    const count = 1 + Math.floor(Math.random() * 2);
    const ratio = 0.10 + Math.random() * 0.15;
    const perHole = polygonArea(current) * ratio / count;

    let ok = true;
    for (let i = 0; i < count; i++) {
      const next = placeIndentAndMerge(current, perHole);
      if (!next) { ok = false; break; }
      current = next;
    }
    if (!ok) continue;
    if (!isSimplePolygon(current)) continue;
    return { outer: current, holes: [] };
  }
  return null;
}
