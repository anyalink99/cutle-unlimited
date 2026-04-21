const GHOST_STORAGE_KEY = 'gg:onboarded:cut:half';
const GHOST_LINE_ID = 'cut-ghost-bisector';
const GHOST_CANDIDATE_ANGLES = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI / 6, Math.PI / 3];

function cutGhostOnboarded() {
  try { return localStorage.getItem(GHOST_STORAGE_KEY) === '1'; }
  catch { return false; }
}

function markCutGhostSeen() {
  try { localStorage.setItem(GHOST_STORAGE_KEY, '1'); } catch {}
}

// Binary-search a 50/50 area bisector for `shape` at direction angle `ang`.
// Returns a chord {a, b} clipped to the outer polygon, or null if no clean
// split exists at this angle (e.g. line never splits the shape into two parts).
function computeHalfBisectorAt(shape, ang) {
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const nx = -uy, ny = ux;

  let tMin = Infinity, tMax = -Infinity;
  for (const p of shape.outer) {
    const t = nx * p.x + ny * p.y;
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
  }
  if (tMax - tMin < 10) return null;

  const EXT = 2000;
  function makeCutAt(tVal) {
    const ax = nx * tVal, ay = ny * tVal;
    return {
      a: { x: ax - ux * EXT, y: ay - uy * EXT },
      b: { x: ax + ux * EXT, y: ay + uy * EXT },
    };
  }

  function signedAreaDiff(tVal) {
    const pieces = applyCutsToShape(shape, [makeCutAt(tVal)]);
    if (pieces.length !== 2) return null;
    return pieceArea(pieces[0]) - pieceArea(pieces[1]);
  }

  const margin = (tMax - tMin) * 0.02;
  let lo = tMin + margin, hi = tMax - margin;
  const dLo = signedAreaDiff(lo);
  const dHi = signedAreaDiff(hi);
  if (dLo === null || dHi === null) return null;
  if (Math.sign(dLo) === Math.sign(dHi)) return null;

  for (let iter = 0; iter < 32; iter++) {
    const mid = (lo + hi) / 2;
    const d = signedAreaDiff(mid);
    if (d === null) return null;
    if (Math.sign(d) === Math.sign(dLo)) lo = mid;
    else hi = mid;
    if (Math.abs(hi - lo) < 0.05) break;
  }

  const tFinal = (lo + hi) / 2;
  const anchorX = nx * tFinal, anchorY = ny * tFinal;
  const p0 = { x: anchorX, y: anchorY };
  const p1 = { x: anchorX + ux * 10, y: anchorY + uy * 10 };
  return lineShapeChord(p0, p1, shape.outer);
}

function computeGhostBisector(shape) {
  if (!shape || !shape.outer || shape.outer.length < 3) return null;
  for (const ang of GHOST_CANDIDATE_ANGLES) {
    const chord = computeHalfBisectorAt(shape, ang);
    if (chord) return chord;
  }
  return null;
}

function removeGhostBisector() {
  const existing = document.getElementById(GHOST_LINE_ID);
  if (existing) existing.remove();
}

function shouldShowGhostBisector() {
  if (state.mode !== 'cut') return false;
  if (cutVariation() !== 'half') return false;
  if (cutGhostOnboarded()) return false;
  if (cutState.confirmed) return false;
  if (cutState.cuts.length > 0) return false;
  return true;
}

function renderGhostBisector() {
  removeGhostBisector();
  if (!shouldShowGhostBisector()) return;
  const chord = computeGhostBisector(state.shape);
  if (!chord) return;

  const ln = document.createElementNS(SVG_NS, 'line');
  ln.setAttribute('id', GHOST_LINE_ID);
  ln.setAttribute('class', 'cut-ghost');
  ln.setAttribute('x1', chord.a.x.toFixed(2));
  ln.setAttribute('y1', chord.a.y.toFixed(2));
  ln.setAttribute('x2', chord.b.x.toFixed(2));
  ln.setAttribute('y2', chord.b.y.toFixed(2));
  dom.cutLayer.appendChild(ln);
}

function dismissGhostBisector() {
  const el = document.getElementById(GHOST_LINE_ID);
  if (!el) return;
  el.classList.add('dismissing');
  setTimeout(() => el.remove(), 300);
}
