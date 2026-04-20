const POOL_NORMAL = [
  'line','line','bezOut','bezOut','bezOut','bezOut','bezIn','bezIn',
  'arcOut','arcOut','arcIn','sCurve','bite','bump',
];
const POOL_STAR = [
  'line','line','arcIn','arcIn','bezIn','bezIn','bezDeep','sCurve','bite','bump',
];
const POOL_SYMMETRIC = [
  'line','line','bezOut','bezOut','bezIn','arcOut','arcIn','sCurve','bite','bump',
];
const POOL_NEW = ['zigzag','scallop','scallopIn','stepped'];
const NEW_TREATMENT_CHANCE = 0.07;

function pickTreatment(basePool) {
  return Math.random() < NEW_TREATMENT_CHANCE ? pick(POOL_NEW) : pick(basePool);
}

function buildClassicOuter() {
  const starMode = Math.random() < 0.40;
  const K = starMode
    ? (3 + Math.floor(Math.random() * 5))
    : (3 + Math.floor(Math.random() * 6));
  const totalAnchors = starMode ? K * 2 : K;

  const outerR = BASE_R * rand(0.95, 1.2);
  const innerR = outerR * rand(0.22, 0.55);

  const angleJitter  = starMode ? rand(0.10, 0.28) : rand(0.05, 0.25);
  const radialJitter = starMode ? rand(0.18, 0.40) : rand(0.08, 0.35);

  const armVary   = starMode ? rand(0.25, 0.55) : 0;
  const valleyVary = starMode ? rand(0.15, 0.35) : 0;

  const seed = rand(0, TAU);
  const anchors = [];
  for (let i = 0; i < totalAnchors; i++) {
    const baseA = seed + (i / totalAnchors) * TAU;
    const a = baseA + rand(-angleJitter, angleJitter);
    let r;
    if (starMode) {
      const isOuter = i % 2 === 0;
      const vary = isOuter ? armVary : valleyVary;
      r = (isOuter ? outerR : innerR) * (1 + rand(-vary, vary));
    } else {
      r = outerR * rand(0.55, 1.15);
    }
    r *= (1 + rand(-radialJitter, radialJitter));
    anchors.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
  }

  const pool = starMode ? POOL_STAR : POOL_NORMAL;
  const edges = [];
  for (let i = 0; i < totalAnchors; i++) edges.push(pickTreatment(pool));

  if (edges.every(e => e === edges[0])) {
    const alt = pick(['bezOut','bezIn','bite','bump','sCurve']);
    edges[Math.floor(Math.random() * totalAnchors)] = alt;
  }

  const pts = [];
  for (let i = 0; i < totalAnchors; i++) {
    pts.push(...sampleEdge(anchors[i], anchors[(i + 1) % totalAnchors], edges[i]));
  }

  if (Math.random() < 0.30) {
    applyElongation(pts, rand(0, TAU), rand(1.15, 1.55));
  }
  if (Math.random() < 0.20) {
    applyShear(pts, rand(0, TAU), rand(-0.3, 0.3));
  }

  const hasBiteBump = edges.some(e => e === 'bite' || e === 'bump');
  return { pts, starMode, hasBiteBump };
}

function buildSymmetricOuter() {
  const k = pick([2, 2, 3, 3, 3, 4, 4, 5, 6]);
  const perFold = 2 + Math.floor(Math.random() * 3);

  const baseR = BASE_R * rand(0.85, 1.15);
  const radialJitter = rand(0.1, 0.35);
  const radiiFold = [];
  for (let i = 0; i < perFold; i++) {
    radiiFold.push(baseR * (1 + rand(-radialJitter, radialJitter)));
  }

  const edgesFold = [];
  for (let i = 0; i < perFold; i++) edgesFold.push(pickTreatment(POOL_SYMMETRIC));
  if (edgesFold.every(e => e === edgesFold[0])) {
    edgesFold[Math.floor(Math.random() * perFold)] = pick(['bezOut','bezIn','bite','bump']);
  }

  const seed = rand(0, TAU);
  const foldAngle = TAU / k;
  const stepAngle = foldAngle / perFold;
  const foldAnchors = [];
  for (let i = 0; i <= perFold; i++) {
    const a = seed + i * stepAngle;
    const r = radiiFold[i % perFold];
    foldAnchors.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
  }

  const foldSampled = [];
  for (let i = 0; i < perFold; i++) {
    foldSampled.push(sampleEdge(foldAnchors[i], foldAnchors[i + 1], edgesFold[i]));
  }

  const pts = [];
  for (let j = 0; j < k; j++) {
    const rot = j * foldAngle;
    const ca = Math.cos(rot), sa = Math.sin(rot);
    for (const edgePts of foldSampled) {
      for (const p of edgePts) {
        const dx = p.x - CX, dy = p.y - CY;
        pts.push({
          x: CX + dx * ca - dy * sa,
          y: CY + dx * sa + dy * ca,
        });
      }
    }
  }

  const hasBiteBump = edgesFold.some(e => e === 'bite' || e === 'bump');
  return { pts, starMode: false, hasBiteBump, symmetric: true };
}

function buildCompositeOuter() {
  const blobCount = Math.random() < 0.55 ? 2 : 3;
  const blobs = [];
  const overallScale = BASE_R * rand(0.55, 0.8);
  const spread = overallScale * rand(0.4, 0.75);
  const seedA = rand(0, TAU);
  for (let i = 0; i < blobCount; i++) {
    const a = seedA + (i / blobCount) * TAU;
    const cx = CX + Math.cos(a) * spread;
    const cy = CY + Math.sin(a) * spread;
    const r = overallScale * rand(0.7, 1.2);
    const n = 20 + Math.floor(Math.random() * 10);
    const offset = rand(0, TAU);
    const jitter = rand(0.06, 0.22);
    const radii = [];
    for (let m = 0; m < n; m++) radii.push(r * (1 + rand(-jitter, jitter)));
    blobs.push({ cx, cy, n, offset, radii });
  }

  const blobR = (b, ang) => {
    const tNorm = ((ang - b.offset) / TAU % 1 + 1) % 1;
    const scaled = tNorm * b.n;
    const idx = Math.floor(scaled);
    const t = scaled - idx;
    const r0 = b.radii[idx % b.n];
    const r1 = b.radii[(idx + 1) % b.n];
    return r0 + (r1 - r0) * t;
  };

  const insideUnion = (px, py) => {
    for (const b of blobs) {
      const dx = px - b.cx, dy = py - b.cy;
      const d = Math.hypot(dx, dy);
      if (d < 0.0001) return true;
      const ang = Math.atan2(dy, dx);
      if (d <= blobR(b, ang)) return true;
    }
    return false;
  };

  let startX = 0, startY = 0;
  for (const b of blobs) { startX += b.cx; startY += b.cy; }
  startX /= blobs.length; startY /= blobs.length;
  if (!insideUnion(startX, startY)) {
    startX = blobs[0].cx;
    startY = blobs[0].cy;
  }

  const N = 144;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * TAU;
    const dx = Math.cos(theta), dy = Math.sin(theta);
    let lo = 0, hi = BASE_R * 4;
    for (let iter = 0; iter < 22; iter++) {
      const mid = (lo + hi) / 2;
      if (insideUnion(startX + dx * mid, startY + dy * mid)) lo = mid;
      else hi = mid;
    }
    pts.push({ x: startX + dx * lo, y: startY + dy * lo });
  }

  return { pts, starMode: false, hasBiteBump: false };
}

function generateOuter() {
  const roll = Math.random();
  if (roll < 0.10) return buildCompositeOuter();
  if (roll < 0.25) return buildSymmetricOuter();
  return buildClassicOuter();
}
