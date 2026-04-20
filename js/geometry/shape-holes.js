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

function pickInteriorPoints(outer, targetCount, minInteriorDist) {
  const { minX, maxX, minY, maxY } = getBounds(outer);
  const w = maxX - minX, h = maxY - minY;
  if (w < 40 || h < 40) return [];
  const cells = Math.max(4, Math.min(7, Math.ceil(Math.sqrt(targetCount * 3))));
  const cellW = w / cells, cellH = h / cells;
  const candidates = [];
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const cx = minX + (i + 0.5) * cellW + rand(-0.35, 0.35) * cellW;
      const cy = minY + (j + 0.5) * cellH + rand(-0.35, 0.35) * cellH;
      const pt = { x: cx, y: cy };
      if (!pointInPolygon(pt, outer)) continue;
      const d = distPointToPolygon(pt, outer);
      if (d < minInteriorDist) continue;
      candidates.push({ pt, d });
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = candidates[i]; candidates[i] = candidates[j]; candidates[j] = t;
  }
  const picked = [];
  for (const c of candidates) {
    if (picked.length >= targetCount) break;
    let ok = true;
    for (const p of picked) {
      const need = (c.d + p.d) * 0.85;
      if (Math.hypot(c.pt.x - p.pt.x, c.pt.y - p.pt.y) < need) { ok = false; break; }
    }
    if (ok) picked.push(c);
  }
  return picked;
}

function shapeHoleAt(cx, cy, interiorDist, maxR) {
  const baseR = Math.max(6, Math.min(maxR, interiorDist - 5));
  const roll = Math.random();
  if (roll < 0.55) {
    return makeCircleCavity(cx, cy, baseR * rand(0.6, 1.0));
  }
  const len = Math.min(baseR * 2.4, (interiorDist - 5) * 1.4);
  if (len < 20) return makeCircleCavity(cx, cy, baseR * rand(0.6, 0.9));
  const ang = rand(0, TAU);
  const thin = roll >= 0.85;
  const bulge = thin
    ? Math.min(baseR * 0.5, len * rand(0.06, 0.14))
    : Math.min(baseR * 0.9, len * rand(0.22, 0.40));
  if (bulge < 3) return makeCircleCavity(cx, cy, baseR * rand(0.6, 0.8));
  return makeLensCavity(cx, cy, len, ang, bulge);
}

function makeHolesSimple(outer, desired, opts) {
  if (desired <= 0) return [];
  const minDist = (opts && opts.minDist) || 10;
  const maxR = (opts && opts.maxR) || 28;
  const points = pickInteriorPoints(outer, desired, minDist);
  const out = [];
  for (const p of points) out.push(shapeHoleAt(p.pt.x, p.pt.y, p.d, maxR));
  return out;
}

// Binary-search the circle radius that makes clip(outer ∩ circle) ≈ targetArea.
// Center is placed just past the outer's farthest point in direction `angle`,
// so the circle straddles the boundary. Converges in ~10 iterations for any
// achievable target (~5%..95% of outer area).
function carveBiteInDirection(outer, angle, targetArea) {
  const centroid = polygonCentroid(outer);
  const dx = Math.cos(angle), dy = Math.sin(angle);

  let tExit = 0;
  for (const p of outer) {
    const t = (p.x - centroid.x) * dx + (p.y - centroid.y) * dy;
    if (t > tExit) tExit = t;
  }

  const baseR = Math.sqrt(targetArea / Math.PI);
  const offset = tExit + baseR * 0.25;
  const cx = centroid.x + dx * offset;
  const cy = centroid.y + dy * offset;

  let rLo = 4;
  let rHi = Math.max(400, baseR * 2.5, tExit * 2.5);
  let best = null, bestAbsDiff = Infinity;

  for (let iter = 0; iter < 12; iter++) {
    const r = (rLo + rHi) / 2;
    const raw = makeCircleCavity(cx, cy, r);
    const clipped = intersectPolygonWithConvex(outer, raw);
    const area = (clipped && clipped.length >= 3) ? polygonArea(clipped) : 0;
    const absDiff = Math.abs(area - targetArea);
    if (absDiff < bestAbsDiff) {
      bestAbsDiff = absDiff;
      best = { clipped, area };
    }
    if (area < targetArea) rLo = r;
    else rHi = r;
  }
  return best;
}

function placeInteriorHole(outer, existing, targetArea) {
  const points = pickInteriorPoints(outer, 6, 8);
  const r = Math.sqrt(targetArea / Math.PI);
  for (const p of points) {
    const useR = Math.min(r, p.d - 5);
    if (useR < 6) continue;
    const hole = makeCircleCavity(p.pt.x, p.pt.y, useR);
    let overlaps = false;
    for (const h of existing) {
      if (polygonsOverlap(hole, h)) { overlaps = true; break; }
    }
    if (overlaps) continue;
    return hole;
  }
  return null;
}

// Single-run merge for a bite chunk: tries both walk directions and picks the
// one whose area matches (outer_area - bite_area). The generic
// mergeBoundaryHoleIntoOuter uses a length-based heuristic that fails for
// bites >50% of outer (the "uneaten" side becomes the shorter arc).
function mergeBiteIntoOuter(outer, biteClipped, biteArea) {
  const eps = 1.5;
  const H = biteClipped.length;
  if (H < 3) return null;

  const locs = biteClipped.map(p => locateOnPolygonBoundary(p, outer, eps));
  const onB = locs.map(l => l !== null);
  if (!onB.some(b => b) || onB.every(b => b)) return null;

  // Find the first (boundary → interior) transition; read one contiguous run.
  let runStart = -1, runEnd = -1;
  for (let i = 0; i < H; i++) {
    if (onB[i] && !onB[(i + 1) % H]) {
      runStart = (i + 1) % H;
      let k = runStart;
      while (!onB[(k + 1) % H]) {
        k = (k + 1) % H;
        if (k === runStart) break;
      }
      runEnd = k;
      break;
    }
  }
  if (runStart < 0) return null;

  // Reject multi-run shapes — bite should produce exactly one run of interior vertices.
  let after = (runEnd + 1) % H;
  while (after !== runStart) {
    if (!onB[after]) return null;
    after = (after + 1) % H;
  }

  const boundaryBefore = biteClipped[(runStart - 1 + H) % H];
  const boundaryAfter = biteClipped[(runEnd + 1) % H];
  const interiorCurve = [boundaryBefore];
  let k = runStart;
  while (true) {
    interiorCurve.push(biteClipped[k]);
    if (k === runEnd) break;
    k = (k + 1) % H;
  }
  interiorCurve.push(boundaryAfter);

  const locStart = locateOnPolygonBoundary(boundaryBefore, outer, eps * 2);
  const locEnd = locateOnPolygonBoundary(boundaryAfter, outer, eps * 2);
  if (!locStart || !locEnd) return null;

  const trySplice = (walkDir) => {
    const outerPath = walkPolygonBetween(outer, locStart, locEnd, walkDir);
    if (!outerPath.length) return null;
    const merged = [locStart.point];
    for (const p of outerPath) merged.push(p);
    merged.push(locEnd.point);
    for (let i = interiorCurve.length - 2; i >= 1; i--) merged.push(interiorCurve[i]);
    const dedup = _dedupRing(merged);
    return dedup.length >= 3 ? dedup : null;
  };

  const s1 = trySplice(1);
  const s2 = trySplice(-1);
  const s1Ok = s1 && isSimplePolygon(s1);
  const s2Ok = s2 && isSimplePolygon(s2);
  if (!s1Ok && !s2Ok) return null;
  if (!s1Ok) return s2;
  if (!s2Ok) return s1;

  const expected = polygonArea(outer) - biteArea;
  const d1 = Math.abs(polygonArea(s1) - expected);
  const d2 = Math.abs(polygonArea(s2) - expected);
  return d1 < d2 ? s1 : s2;
}

function integrateBitesAndHoles(outer, count, targetArea, opts) {
  const outerArea = polygonArea(outer);
  const biteBiasBase = (opts && opts.biteBias != null) ? opts.biteBias : 0.75;
  const ratio = targetArea / outerArea;
  const biteBias = Math.min(1.0, biteBiasBase + ratio * 0.3);

  // Heavier angular jitter — perfect n-fold spacing reads as a shuriken.
  const baseAngle = rand(0, TAU);
  const jitterFrac = count >= 3 ? 0.55 : 0.25;
  const slots = [];
  for (let i = 0; i < count; i++) {
    const frac = (i + rand(-jitterFrac, jitterFrac)) / count;
    slots.push(baseAngle + frac * TAU);
  }

  // Classify each slot upfront so bites can run first: if a hole were placed before
  // a nearby bite, the bite's merge could strip the outer region around the hole,
  // leaving an "orphan" polygon that evenodd-fill renders as a ghost outside the shape.
  const biteSlots = [];
  const holeSlots = [];
  for (const s of slots) {
    if (Math.random() < biteBias) biteSlots.push(s);
    else holeSlots.push(s);
  }
  for (let i = biteSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = biteSlots[i]; biteSlots[i] = biteSlots[j]; biteSlots[j] = t;
  }

  const perSlot = targetArea / count;
  let currentOuter = outer;
  let achieved = 0;

  // Phase 1: bites carve into the running outer.
  for (const angle of biteSlots) {
    const bite = carveBiteInDirection(currentOuter, angle, perSlot);
    if (!bite || !bite.clipped || bite.clipped.length < 3) continue;
    if (bite.area < perSlot * 0.25) continue;
    const merged = mergeBiteIntoOuter(currentOuter, bite.clipped, bite.area);
    if (merged && merged !== currentOuter) {
      currentOuter = merged;
      achieved += bite.area;
    }
  }

  // Phase 2: interior holes land in the final outer — guaranteed inside it.
  const interiorHoles = [];
  for (let i = 0; i < holeSlots.length; i++) {
    const hole = placeInteriorHole(currentOuter, interiorHoles, perSlot);
    if (hole) {
      interiorHoles.push(hole);
      achieved += polygonArea(hole);
    }
  }

  return { outer: currentOuter, holes: interiorHoles, achieved };
}

function sampleBalanceHoleCount() {
  const r = Math.random() * 100;
  if (r < 25) return 1;
  if (r < 50) return 2;
  if (r < 67) return 3;
  if (r < 80) return 4;
  if (r < 89) return 5;
  if (r < 95) return 6;
  if (r < 98) return 7;
  return 8;
}

function generateBalanceShape() {
  let start = null;
  for (let tries = 0; tries < 10 && !start; tries++) {
    const built = generateOuter();
    start = normalizeShapeArea(centerShapeObject({ outer: built.pts, holes: [] }));
  }
  if (!start) return generateShape();

  const outerArea = polygonArea(start.outer);
  const targetRatio = 0.30 + Math.random() * 0.45;
  const targetArea = outerArea * targetRatio;
  const count = sampleBalanceHoleCount();
  const tol = outerArea * 0.06;

  let best = null, bestDiff = Infinity;
  for (let tries = 0; tries < 3; tries++) {
    const result = integrateBitesAndHoles(start.outer, count, targetArea);
    const diff = Math.abs(result.achieved - targetArea);
    if (diff < bestDiff) { bestDiff = diff; best = result; }
    if (diff < tol) break;
  }
  if (!best || (best.outer === start.outer && best.holes.length === 0)) return start;
  return { outer: best.outer, holes: best.holes };
}

function generateInscribeBalanceShape() {
  let start = null;
  for (let tries = 0; tries < 10 && !start; tries++) {
    const built = generateOuter();
    if (built.symmetric) continue;
    start = normalizeShapeArea(centerShapeObject({ outer: built.pts, holes: [] }));
  }
  if (!start) return null;

  const outerArea = polygonArea(start.outer);
  const targetRatio = 0.10 + Math.random() * 0.15;
  const targetArea = outerArea * targetRatio;
  const count = 1 + Math.floor(Math.random() * 2);

  let best = null, bestDiff = Infinity;
  for (let tries = 0; tries < 3; tries++) {
    const result = integrateBitesAndHoles(start.outer, count, targetArea, { biteBias: 1.0 });
    if (result.outer === start.outer) continue;
    if (result.holes.length) continue;
    const diff = Math.abs(result.achieved - targetArea);
    if (diff < bestDiff) { bestDiff = diff; best = result; }
  }
  if (!best) return null;
  return { outer: best.outer, holes: [] };
}
