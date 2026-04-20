function sampleLine(a, b, N = 6) {
  const out = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

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

function sampleZigzag(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 50) return sampleLine(a, b, 6);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const inSign = (px * (CX - mx) + py * (CY - my)) > 0 ? 1 : -1;
  const outSign = -inSign;
  const teeth = 3 + Math.floor(Math.random() * 4);
  const amp = Math.min(len * rand(0.06, 0.13), BASE_R * 0.14);
  const pts = [];
  pts.push(a);
  for (let i = 0; i < teeth; i++) {
    const baseT = i / teeth;
    const peakT = (i + 0.5) / teeth;
    if (i > 0) pts.push({ x: a.x + dx * baseT, y: a.y + dy * baseT });
    pts.push({
      x: a.x + dx * peakT + px * amp * outSign,
      y: a.y + dy * peakT + py * amp * outSign,
    });
  }
  return pts;
}

function sampleScallop(a, b, sign) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 50) return sampleLine(a, b, 6);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const inSign = (px * (CX - mx) + py * (CY - my)) > 0 ? 1 : -1;
  const outSign = sign > 0 ? -inSign : inSign;
  const bumps = 3 + Math.floor(Math.random() * 3);
  const segLen = len / bumps;
  const bulge = segLen * rand(0.28, 0.46) * outSign;
  const pts = [];
  pts.push(a);
  const arcN = 8;
  for (let i = 0; i < bumps; i++) {
    const t0 = i / bumps, t1 = (i + 1) / bumps;
    const a0x = a.x + dx * t0, a0y = a.y + dy * t0;
    const b0x = a.x + dx * t1, b0y = a.y + dy * t1;
    const mx2 = (a0x + b0x) / 2, my2 = (a0y + b0y) / 2;
    const cx_ = mx2 + px * bulge;
    const cy_ = my2 + py * bulge;
    for (let s = 1; s <= arcN; s++) {
      const t = s / arcN, u = 1 - t;
      pts.push({
        x: u * u * a0x + 2 * u * t * cx_ + t * t * b0x,
        y: u * u * a0y + 2 * u * t * cy_ + t * t * b0y,
      });
    }
  }
  return pts;
}

function sampleStepped(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 70) return sampleLine(a, b, 6);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const inSign = (px * (CX - mx) + py * (CY - my)) > 0 ? 1 : -1;
  const outSign = -inSign;
  const notches = 2 + Math.floor(Math.random() * 3);
  const amp = Math.min(len * rand(0.05, 0.10), BASE_R * 0.11);
  const pts = [];
  pts.push(a);
  const segCount = notches * 2;
  let raised = false;
  for (let i = 1; i <= segCount; i++) {
    const t = i / (segCount + 1);
    const bx = a.x + dx * t, by = a.y + dy * t;
    const prevOff = raised ? amp * outSign : 0;
    raised = !raised;
    const newOff = raised ? amp * outSign : 0;
    pts.push({ x: bx + px * prevOff, y: by + py * prevOff });
    pts.push({ x: bx + px * newOff, y: by + py * newOff });
  }
  return pts;
}

function sampleEdge(a, b, treatment) {
  switch (treatment) {
    case 'line':    return sampleLine(a, b, 6);
    case 'bezOut':  return sampleBez(a, b, +BASE_R * rand(0.18, 0.42));
    case 'bezIn':   return sampleBez(a, b, -BASE_R * rand(0.15, 0.35));
    case 'bezDeep': return sampleBez(a, b, -BASE_R * rand(0.35, 0.55));
    case 'arcOut':  return sampleArc(a, b, +1);
    case 'arcIn':   return sampleArc(a, b, -1);
    case 'sCurve':  return sampleSCurve(a, b, BASE_R * rand(0.18, 0.4) * (Math.random() < 0.5 ? 1 : -1));
    case 'bite':    return sampleNotchedLine(a, b, -1);
    case 'bump':    return sampleNotchedLine(a, b, +1);
    case 'zigzag':  return sampleZigzag(a, b);
    case 'scallop': return sampleScallop(a, b, +1);
    case 'scallopIn': return sampleScallop(a, b, -1);
    case 'stepped': return sampleStepped(a, b);
  }
  return sampleLine(a, b, 6);
}

function applyElongation(pts, angle, factor) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const inv = 1 / Math.sqrt(factor);
  for (const p of pts) {
    const dx = p.x - CX, dy = p.y - CY;
    const u =  dx * ca + dy * sa;
    const v = -dx * sa + dy * ca;
    const u2 = u * factor;
    const v2 = v * inv;
    p.x = CX + u2 * ca - v2 * sa;
    p.y = CY + u2 * sa + v2 * ca;
  }
}

function applyShear(pts, angle, amount) {
  const ca = Math.cos(angle), sa = Math.sin(angle);
  for (const p of pts) {
    const dx = p.x - CX, dy = p.y - CY;
    const u =  dx * ca + dy * sa;
    const v = -dx * sa + dy * ca;
    const u2 = u + v * amount;
    const v2 = v;
    p.x = CX + u2 * ca - v2 * sa;
    p.y = CY + u2 * sa + v2 * ca;
  }
}
