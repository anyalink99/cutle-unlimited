function centerShape(pts) {
  const c = polygonCentroid(pts);
  const dx = CX - c.x, dy = CY - c.y;
  return pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

// Uniformly scale the (already centered) polygon so its area equals TARGET_AREA.
// Returns null if the resulting shape would exceed MAX_R.
function normalizeArea(pts) {
  const a = polygonArea(pts);
  if (a < 1) return null;
  const scale = Math.sqrt(TARGET_AREA / a);
  const out = pts.map(p => ({ x: CX + (p.x - CX) * scale, y: CY + (p.y - CY) * scale }));
  let maxD = 0;
  for (const p of out) {
    const d = Math.hypot(p.x - CX, p.y - CY);
    if (d > maxD) maxD = d;
  }
  if (maxD > MAX_R) return null;
  return out;
}

// --- Edge treatments: each samples a polyline from a (inclusive) toward b (exclusive) ---

function sampleLine(a, b, N = 6) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

// Quadratic bezier with control point pushed perpendicular to chord by `bulge`
// (positive = outward from polygon center, negative = inward).
function sampleBez(a, b, bulge, N = 18) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = mx - CX, dy = my - CY;
  const dl = Math.hypot(dx, dy) || 1;
  const cx_ = mx + (dx / dl) * bulge;
  const cy_ = my + (dy / dl) * bulge;
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i / N, u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * cx_ + t * t * b.x,
      y: u * u * a.y + 2 * u * t * cy_ + t * t * b.y,
    });
  }
  return out;
}

function sampleSCurve(a, b, amp, N = 22) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const c1 = { x: a.x + dx / 3 + px * amp,  y: a.y + dy / 3 + py * amp };
  const c2 = { x: a.x + 2 * dx / 3 - px * amp, y: a.y + 2 * dy / 3 - py * amp };
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i / N, u = 1 - t;
    out.push({
      x: u*u*u*a.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*b.x,
      y: u*u*u*a.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*b.y,
    });
  }
  return out;
}

// Circular arc through a and b. sign: +1 convex outward, -1 concave inward.
function sampleArc(a, b, sign, N = 22) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const chord = Math.hypot(dx, dy) || 1;
  const px = -dy / chord, py = dx / chord;
  const inwardSign = (px * (CX - mx) + py * (CY - my)) > 0 ? 1 : -1;
  const centerSide = sign > 0 ? inwardSign : -inwardSign;
  const offset = chord * rand(0.28, 0.6);
  const acx = mx + px * centerSide * offset;
  const acy = my + py * centerSide * offset;
  const radius = Math.hypot(a.x - acx, a.y - acy);
  const sa = Math.atan2(a.y - acy, a.x - acx);
  const ea = Math.atan2(b.y - acy, b.x - acx);
  let delta = ea - sa;
  while (delta >  Math.PI) delta -= TAU;
  while (delta < -Math.PI) delta += TAU;
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const ang = sa + delta * t;
    out.push({ x: acx + Math.cos(ang) * radius, y: acy + Math.sin(ang) * radius });
  }
  return out;
}

// Straight line with one circular semicircle notch (bite if sign=-1, bump if sign=+1).
function sampleNotchedLine(a, b, sign) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 60) return sampleLine(a, b, 6);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const inSign = (px * (CX - mx) + py * (CY - my)) > 0 ? 1 : -1;
  const t = rand(0.35, 0.65);
  const r = Math.min(len * rand(0.13, 0.20), BASE_R * 0.35);
  const t1 = t * len - r, t2 = t * len + r;
  if (t1 < 6 || t2 > len - 6) return sampleLine(a, b, 6);
  const cx_ = a.x + ux * t * len, cy_ = a.y + uy * t * len;
  // bite (sign<0) protrudes inward (= +inSign); bump (sign>0) protrudes outward (= -inSign)
  const dxn = (sign < 0 ? inSign : -inSign);
  const out = [];
  for (let k = 0; k < 4; k++) {
    const f = k / 4 * (t1 / len);
    out.push({ x: a.x + dx * f, y: a.y + dy * f });
  }
  out.push({ x: a.x + ux * t1, y: a.y + uy * t1 });
  const arcN = 18;
  for (let i = 1; i < arcN; i++) {
    const th = Math.PI * i / arcN;
    const c = Math.cos(th), s = Math.sin(th);
    out.push({
      x: cx_ + r * (-ux * c + dxn * px * s),
      y: cy_ + r * (-uy * c + dxn * py * s),
    });
  }
  out.push({ x: a.x + ux * t2, y: a.y + uy * t2 });
  for (let k = 1; k < 4; k++) {
    const f = t2 / len + (k / 4) * (1 - t2 / len);
    out.push({ x: a.x + dx * f, y: a.y + dy * f });
  }
  return out;
}

function sampleEdge(a, b, treatment) {
  switch (treatment) {
    case 'line':    return sampleLine(a, b, 6);
    case 'bezOut':  return sampleBez(a, b, +BASE_R * rand(0.18, 0.42));
    case 'bezIn':   return sampleBez(a, b, -BASE_R * rand(0.15, 0.35));
    case 'arcOut':  return sampleArc(a, b, +1);
    case 'arcIn':   return sampleArc(a, b, -1);
    case 'sCurve':  return sampleSCurve(a, b, BASE_R * rand(0.18, 0.4) * (Math.random() < 0.5 ? 1 : -1));
    case 'bite':    return sampleNotchedLine(a, b, -1);
    case 'bump':    return sampleNotchedLine(a, b, +1);
  }
  return sampleLine(a, b, 6);
}

const EDGE_POOL = [
  'line', 'line', 'line',
  'bezOut', 'bezOut', 'bezOut', 'bezOut',
  'bezIn', 'bezIn',
  'arcOut', 'arcOut',
  'arcIn',
  'sCurve',
  'bite',
  'bump',
];

function generateShape() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const K = 3 + Math.floor(Math.random() * 4);
    const seed = rand(0, TAU);
    const anchors = [];
    for (let i = 0; i < K; i++) {
      const a = seed + (i / K) * TAU + rand(-0.45, 0.45);
      const r = BASE_R * rand(0.55, 1.2);
      anchors.push({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r });
    }

    const edges = [];
    for (let i = 0; i < K; i++) edges.push(pick(EDGE_POOL));

    if (!edges.some(t => t === 'line' || t === 'bite' || t === 'bump')) {
      edges[Math.floor(Math.random() * K)] = 'line';
    }
    if (!edges.some(t => t === 'bezOut' || t === 'arcOut' || t === 'sCurve')) {
      edges[Math.floor(Math.random() * K)] = 'bezOut';
    }
    if (edges.every(t => t === edges[0])) edges[0] = 'bezOut';

    const pts = [];
    for (let i = 0; i < K; i++) {
      pts.push(...sampleEdge(anchors[i], anchors[(i + 1) % K], edges[i]));
    }

    const centered = centerShape(pts);
    const normalized = normalizeArea(centered);
    if (normalized) return normalized;
  }
  // Fallback: a plain bezier blob, normalized to target area.
  const fallback = centerShape(sampleBez({x:CX-100,y:CY},{x:CX+100,y:CY}, BASE_R*0.4, 30)
    .concat(sampleBez({x:CX+100,y:CY},{x:CX-100,y:CY}, -BASE_R*0.4, 30)));
  return normalizeArea(fallback) || fallback;
}
