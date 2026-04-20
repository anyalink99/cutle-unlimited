function strokeCrossesShape(a, b, polygon) {
  if (Math.hypot(b.x - a.x, b.y - a.y) < MOVE_THRESHOLD) return false;
  if (segIntersectCount(a, b, polygon) < 2) return false;
  if (pointInPolygon(a, polygon) || pointInPolygon(b, polygon)) return false;
  return true;
}

function lineFullyCrossesShape(a, b, polygon) {
  return segIntersectCount(a, b, polygon) >= 2 &&
    !pointInPolygon(a, polygon) && !pointInPolygon(b, polygon);
}

function spliceHoleIntoOuter(outer, hole, chordStart, onLine, t) {
  const H = hole.length;
  const chordEnd = (chordStart + 1) % H;
  const hA = hole[chordStart], hB = hole[chordEnd];
  const tA = t(hA), tB = t(hB);
  const hLo = Math.min(tA, tB), hHi = Math.max(tA, tB);
  const samePt = (p, q) => Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01;

  for (let i = 0, N = outer.length; i < N; i++) {
    const a = outer[i], b = outer[(i + 1) % N];
    if (!(onLine(a) && onLine(b))) continue;
    const ta = t(a), tb = t(b);
    const oLo = Math.min(ta, tb), oHi = Math.max(ta, tb);
    if (hLo < oLo - 0.5 || hHi > oHi + 0.5) continue;

    const outerForward = tb > ta;
    let entryIdx, exitIdx, entryVert, exitVert;
    if (outerForward ? (tA <= tB) : (tA >= tB)) {
      entryIdx = chordStart; exitIdx = chordEnd; entryVert = hA; exitVert = hB;
    } else {
      entryIdx = chordEnd; exitIdx = chordStart; entryVert = hB; exitVert = hA;
    }
    const step = (entryIdx === chordStart) ? -1 : 1;

    const result = [];
    for (let k = 0; k <= i; k++) result.push(outer[k]);
    if (!samePt(a, entryVert)) result.push(entryVert);
    let k = (entryIdx + step + H) % H;
    while (k !== exitIdx) {
      result.push(hole[k]);
      k = (k + step + H) % H;
    }
    if (!samePt(b, exitVert)) result.push(exitVert);
    for (let k2 = i + 1; k2 < N; k2++) result.push(outer[k2]);
    return result;
  }
  return null;
}

function mergeCutHolesIntoOuter(outer, clippedHoles, nx, ny, c) {
  if (!clippedHoles.length) return { outer, holes: [] };
  const EPS = 0.1;
  const ux = -ny, uy = nx;
  const onLine = (p) => Math.abs(nx * p.x + ny * p.y + c) < EPS;
  const t = (p) => p.x * ux + p.y * uy;

  let current = outer.slice();
  const remaining = [];
  for (const hole of clippedHoles) {
    let chordStart = -1;
    for (let i = 0; i < hole.length; i++) {
      const a = hole[i], b = hole[(i + 1) % hole.length];
      if (onLine(a) && onLine(b)) { chordStart = i; break; }
    }
    if (chordStart < 0) {
      remaining.push(hole);
      continue;
    }
    const spliced = spliceHoleIntoOuter(current, hole, chordStart, onLine, t);
    if (spliced) current = spliced;
  }
  return { outer: current, holes: remaining };
}

function splitHalfPlanePolygon(pts, nx, ny, c) {
  const EPS = 0.1;
  const n = pts.length;
  if (n < 3) return [pts];

  const onLineFlags = pts.map(p => Math.abs(nx * p.x + ny * p.y + c) < EPS);
  let onLineCount = 0;
  for (const b of onLineFlags) if (b) onLineCount++;
  if (onLineCount <= 2) return [pts];
  if (onLineCount % 2 !== 0) return [pts];

  const ux = -ny, uy = nx;
  const onLineIdx = [];
  for (let i = 0; i < n; i++) if (onLineFlags[i]) onLineIdx.push(i);
  onLineIdx.sort((a, b) => (pts[a].x * ux + pts[a].y * uy) - (pts[b].x * ux + pts[b].y * uy));

  const pairs = [];
  for (let i = 0; i < onLineIdx.length; i += 2) {
    pairs.push([onLineIdx[i], onLineIdx[i + 1]]);
  }

  const subPolygons = [];
  for (const [a, b] of pairs) {
    let forwardHasOther = false;
    {
      let i = (a + 1) % n;
      while (i !== b) {
        if (onLineFlags[i]) { forwardHasOther = true; break; }
        i = (i + 1) % n;
      }
    }
    const sub = [];
    if (!forwardHasOther) {
      let i = a;
      while (true) {
        sub.push(pts[i]);
        if (i === b) break;
        i = (i + 1) % n;
      }
    } else {
      let i = a;
      while (true) {
        sub.push(pts[i]);
        if (i === b) break;
        i = (i - 1 + n) % n;
      }
    }
    if (sub.length >= 3) subPolygons.push(sub);
  }
  return subPolygons.length ? subPolygons : [pts];
}

function clipShapeHalfPlane(shape, nx, ny, c) {
  const clippedOuter = clipHalfPlane(shape.outer, nx, ny, c);
  const outerPieces = splitHalfPlanePolygon(clippedOuter, nx, ny, c);
  if (!outerPieces.length) return [{ outer: [], holes: [] }];

  const allClippedHoles = [];
  for (const h of shape.holes) {
    const hc = clipHalfPlane(h, nx, ny, c);
    if (hc.length >= 3 && polygonArea(hc) > 1) allClippedHoles.push(hc);
  }

  const results = [];
  for (const outer of outerPieces) {
    const myHoles = [];
    for (const h of allClippedHoles) {
      const ctr = polygonCentroid(h);
      if (pointInPolygon(ctr, outer)) myHoles.push(h);
    }
    results.push(mergeCutHolesIntoOuter(outer, myHoles, nx, ny, c));
  }
  return results;
}

function halfPlaneFromCut(cut) {
  const dx = cut.b.x - cut.a.x, dy = cut.b.y - cut.a.y;
  let nx = -dy, ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len; ny /= len;
  const c = -(nx * cut.a.x + ny * cut.a.y);
  return { nx, ny, c };
}

function lineShapeChord(p0, p1, outer) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const ux = dx / len, uy = dy / len;
  const ts = [];
  for (let i = 0, n = outer.length; i < n; i++) {
    const a = outer[i], b = outer[(i + 1) % n];
    const vx = b.x - a.x, vy = b.y - a.y;
    const denom = ux * (-vy) - uy * (-vx);
    if (Math.abs(denom) < 1e-9) continue;
    const tx = a.x - p0.x, ty = a.y - p0.y;
    const t = (tx * (-vy) - ty * (-vx)) / denom;
    const s = (ux * ty - uy * tx) / denom;
    if (s >= 0 && s <= 1) ts.push(t);
  }
  if (ts.length < 2) return null;
  ts.sort((x, y) => x - y);
  const tmin = ts[0], tmax = ts[ts.length - 1];
  return {
    a: { x: p0.x + ux * (tmin - CUT_HANDLE_PAD), y: p0.y + uy * (tmin - CUT_HANDLE_PAD) },
    b: { x: p0.x + ux * (tmax + CUT_HANDLE_PAD), y: p0.y + uy * (tmax + CUT_HANDLE_PAD) },
  };
}

function linesIntersectInsideShape(cutA, cutB, outer) {
  const d1x = cutA.b.x - cutA.a.x, d1y = cutA.b.y - cutA.a.y;
  const d2x = cutB.b.x - cutB.a.x, d2y = cutB.b.y - cutB.a.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return false;
  const tx = cutB.a.x - cutA.a.x, ty = cutB.a.y - cutA.a.y;
  const t = (tx * d2y - ty * d2x) / denom;
  const ix = cutA.a.x + d1x * t, iy = cutA.a.y + d1y * t;
  return pointInPolygon({ x: ix, y: iy }, outer);
}

function chordSameSideOfLine(cut, otherCut, outer) {
  const c = lineShapeChord(cut.a, cut.b, outer);
  if (!c) return true;
  const { nx, ny, c: k } = halfPlaneFromCut(otherCut);
  const da = nx * c.a.x + ny * c.a.y + k;
  const db = nx * c.b.x + ny * c.b.y + k;
  return (da > 0 && db > 0) || (da < 0 && db < 0);
}

function applyCutsToShape(shape, cuts) {
  let pieces = [{ shapes: [shape] }];
  for (const cut of cuts) {
    const { nx, ny, c } = halfPlaneFromCut(cut);
    const next = [];
    for (const piece of pieces) {
      const posShapes = [];
      const negShapes = [];
      for (const s of piece.shapes) {
        for (const sub of clipShapeHalfPlane(s, nx, ny, c)) {
          if (shapeArea(sub) > 1) posShapes.push(sub);
        }
        for (const sub of clipShapeHalfPlane(s, -nx, -ny, -c)) {
          if (shapeArea(sub) > 1) negShapes.push(sub);
        }
      }
      if (posShapes.length) next.push({ shapes: posShapes });
      if (negShapes.length) next.push({ shapes: negShapes });
    }
    pieces = next;
  }
  return pieces;
}

function pieceArea(piece) {
  let total = 0;
  for (const s of piece.shapes) total += shapeArea(s);
  return total;
}

function pieceCentroid(piece) {
  let totalArea = 0, cx = 0, cy = 0;
  for (const s of piece.shapes) {
    const a = shapeArea(s);
    if (a < 1e-6) continue;
    const c = shapeCentroid(s);
    totalArea += a;
    cx += c.x * a;
    cy += c.y * a;
  }
  return totalArea > 1e-6 ? { x: cx / totalArea, y: cy / totalArea } : { x: CX, y: CY };
}

function pieceTouchesCutLine(piece, cut) {
  const { nx, ny, c } = halfPlaneFromCut(cut);
  const EPS = 0.5;
  for (const s of piece.shapes) {
    const outer = s.outer;
    for (let i = 0, n = outer.length; i < n; i++) {
      const a = outer[i], b = outer[(i + 1) % n];
      if (Math.abs(nx * a.x + ny * a.y + c) < EPS &&
          Math.abs(nx * b.x + ny * b.y + c) < EPS) return true;
    }
  }
  return false;
}

function findTriMiddleIndex(pieces, cuts) {
  for (let i = 0; i < pieces.length; i++) {
    if (pieceTouchesCutLine(pieces[i], cuts[0]) &&
        pieceTouchesCutLine(pieces[i], cuts[1])) return i;
  }
  return -1;
}
