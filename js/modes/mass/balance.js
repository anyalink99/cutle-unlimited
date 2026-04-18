const balanceState = {
  pole: null,
  hover: null,
  confirmed: false,
  pointerType: null,
  dragging: false,
  activePointerId: null,
  pivotY: FLOOR_Y,
  xMin: 0,
  xMax: BOARD_W,
  animFrame: 0,
};

const POLE_HALF_W = 2.5;

function balanceReset() {
  balanceState.pole = null;
  balanceState.hover = null;
  balanceState.confirmed = false;
  balanceState.pointerType = null;
  balanceState.dragging = false;
  balanceState.activePointerId = null;
  balanceState.pivotY = FLOOR_Y;
  if (balanceState.animFrame) {
    cancelAnimationFrame(balanceState.animFrame);
    balanceState.animFrame = 0;
  }
  dom.massPole.innerHTML = '';
  const g = dom.shapeLayer.firstElementChild;
  if (g) g.removeAttribute('transform');
}

function shapeBottomAtX(shape, x) {
  const outer = shape.outer;
  let maxY = -Infinity;
  for (let i = 0, n = outer.length; i < n; i++) {
    const a = outer[i], b = outer[(i + 1) % n];
    const xMin = Math.min(a.x, b.x);
    const xMax = Math.max(a.x, b.x);
    if (x < xMin - 1e-6 || x > xMax + 1e-6) continue;
    if (Math.abs(b.x - a.x) < 1e-9) {
      if (a.y > maxY) maxY = a.y;
      if (b.y > maxY) maxY = b.y;
    } else {
      const t = (x - a.x) / (b.x - a.x);
      const y = a.y + t * (b.y - a.y);
      if (y > maxY) maxY = y;
    }
  }
  return maxY === -Infinity ? null : maxY;
}

function onBalanceShapeReady() {
  let minX = Infinity, maxX = -Infinity;
  for (const p of state.shape.outer) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  balanceState.xMin = minX;
  balanceState.xMax = maxX;
  balanceState.pivotY = shapeBottomAtX(state.shape, (minX + maxX) / 2) ?? FLOOR_Y;
}

function clampPoleX(x) {
  const pad = 2;
  const lo = balanceState.xMin + pad;
  const hi = balanceState.xMax - pad;
  if (hi < lo) return (balanceState.xMin + balanceState.xMax) / 2;
  return Math.max(lo, Math.min(hi, x));
}

function drawBalancePole(x) {
  dom.massPole.innerHTML = '';
  const pivotY = shapeBottomAtX(state.shape, x);
  if (pivotY == null) return;
  balanceState.pivotY = pivotY;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'balance-pole');
  const shaft = document.createElementNS(SVG_NS, 'rect');
  shaft.setAttribute('x', x - POLE_HALF_W);
  shaft.setAttribute('y', pivotY);
  shaft.setAttribute('width', POLE_HALF_W * 2);
  shaft.setAttribute('height', FLOOR_Y - pivotY);
  shaft.setAttribute('class', 'bp-shaft');
  g.appendChild(shaft);
  const tip = document.createElementNS(SVG_NS, 'circle');
  tip.setAttribute('cx', x); tip.setAttribute('cy', pivotY);
  tip.setAttribute('r', 3.5);
  tip.setAttribute('class', 'bp-tip');
  g.appendChild(tip);
  dom.massPole.appendChild(g);
}

function drawBalanceHover(x) {
  dom.massHover.innerHTML = '';
  if (x == null) { updateBalanceCursor(false); return; }
  const overExisting = isNearPole(x);
  updateBalanceCursor(overExisting);
  if (overExisting) return;
  const hoverPivotY = shapeBottomAtX(state.shape, x);
  if (hoverPivotY == null) return;
  const ln = document.createElementNS(SVG_NS, 'line');
  ln.setAttribute('x1', x); ln.setAttribute('y1', hoverPivotY);
  ln.setAttribute('x2', x); ln.setAttribute('y2', FLOOR_Y);
  ln.setAttribute('class', 'bp-hover');
  dom.massHover.appendChild(ln);
}

function isNearPole(x, grabR) {
  if (balanceState.pole == null) return false;
  return Math.abs(x - balanceState.pole) < (grabR ?? POINT_GRAB_R);
}

function updateBalanceCursor(overExisting) {
  if (state.mode !== 'mass' || massVariation() !== 'balance') { dom.hitPad.style.cursor = ''; return; }
  if (balanceState.confirmed) { dom.hitPad.style.cursor = 'default'; return; }
  if (balanceState.dragging) dom.hitPad.style.cursor = 'grabbing';
  else if (overExisting)     dom.hitPad.style.cursor = 'ew-resize';
  else                       dom.hitPad.style.cursor = 'crosshair';
}

function updateBalanceHint() {
  if (balanceState.confirmed) return;
  const msg = balanceState.pole != null
    ? 'Drag the pole to adjust, or press Confirm'
    : 'Tap anywhere to place the pole';
  dom.scoreLine.innerHTML = `<div class="hint" id="hint">${msg}</div>`;
}

function showBalanceVerdict(dx, tipped) {
  let cls, text;
  if (tipped) {
    cls = 'fair';
    text = `Tipped — off by ${Math.abs(dx).toFixed(1)}`;
  } else {
    cls = 'perfect';
    text = `Balanced — off by ${Math.abs(dx).toFixed(1)}`;
  }
  dom.scoreLine.innerHTML = `<div class="verdict ${cls}" id="verdict">${text}</div>`;
  const v = document.getElementById('verdict');
  v.getBoundingClientRect();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => v.classList.add('show'));
  });
}

function confirmBalance() {
  if (balanceState.confirmed) return;
  if (balanceState.pole == null) return;
  balanceState.confirmed = true;
  balanceState.hover = null;
  dom.massHover.innerHTML = '';
  const actual = shapeCentroid(state.shape);
  const pivotX = balanceState.pole;
  const pivotY = balanceState.pivotY;
  const dx = actual.x - pivotX;
  const absDx = Math.abs(dx);
  const tipped = absDx > BALANCE_PERFECT_THRESHOLD;
  recordMassDist('balance', absDx);
  showBalanceVerdict(dx, tipped);
  state.locked = true;
  dom.hitPad.style.cursor = 'default';
  updateActionButton();
  if (tipped) runBalanceFall(pivotX, pivotY, actual);
  else        runBalanceSway(pivotX, pivotY, actual);
}

function runBalanceSway(pivotX, pivotY, centroid) {
  const shapeG = dom.shapeLayer.firstElementChild;
  if (!shapeG) return;
  const dx = centroid.x - pivotX;
  const dy = Math.max(1, pivotY - centroid.y);
  let theta = Math.atan2(dx, dy);
  let omega = 0;
  const wn = 6.2;
  const zeta = 0.22;
  let lastT = performance.now();

  function step(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const alpha = -wn * wn * Math.sin(theta) - 2 * zeta * wn * omega;
    omega += alpha * dt;
    theta += omega * dt;
    shapeG.setAttribute('transform', `rotate(${theta * 180 / Math.PI} ${pivotX} ${pivotY})`);
    if (Math.abs(theta) < 0.0015 && Math.abs(omega) < 0.02) {
      shapeG.removeAttribute('transform');
      balanceState.animFrame = 0;
      setTimeout(() => dom.newBtn.classList.add('pulse'), 400);
      return;
    }
    balanceState.animFrame = requestAnimationFrame(step);
  }
  balanceState.animFrame = requestAnimationFrame(step);
}

function runBalanceFall(pivotX, pivotY, centroid) {
  const shapeG = dom.shapeLayer.firstElementChild;
  if (!shapeG) return;
  const rx0 = centroid.x - pivotX;
  const ry0 = centroid.y - pivotY;
  const L = Math.hypot(rx0, ry0);
  const G = 1400;
  const FLOOR = FLOOR_Y;
  const theta0Vert = Math.atan2(rx0, -ry0);
  const POLE_XMIN = pivotX - POLE_HALF_W;
  const POLE_XMAX = pivotX + POLE_HALF_W;
  const CONTACT_MARGIN = 1.5;

  let theta = 0;
  let omega = 0;
  let phase = 'pivoted';
  let comX = centroid.x, comY = centroid.y;
  let vx = 0, vy = 0;
  let lastT = performance.now();

  function applyTransform() {
    if (phase === 'pivoted') {
      shapeG.setAttribute('transform', `rotate(${theta * 180 / Math.PI} ${pivotX} ${pivotY})`);
    } else {
      const dx = comX - centroid.x, dy = comY - centroid.y;
      shapeG.setAttribute('transform',
        `translate(${dx} ${dy}) rotate(${theta * 180 / Math.PI} ${centroid.x} ${centroid.y})`);
    }
  }

  function stopAnim() {
    applyTransform();
    balanceState.animFrame = 0;
    setTimeout(() => dom.newBtn.classList.add('pulse'), 400);
  }

  function rotatedPt(p) {
    const c = Math.cos(theta), s = Math.sin(theta);
    const dx = p.x - pivotX, dy = p.y - pivotY;
    return { x: pivotX + dx * c - dy * s, y: pivotY + dx * s + dy * c };
  }

  function transformedPt(p) {
    const c = Math.cos(theta), s = Math.sin(theta);
    const dx = p.x - centroid.x, dy = p.y - centroid.y;
    return {
      x: centroid.x + dx * c - dy * s + (comX - centroid.x),
      y: centroid.y + dx * s + dy * c + (comY - centroid.y),
    };
  }

  function inPoleRect(x, y) {
    return x > POLE_XMIN && x < POLE_XMAX && y > pivotY + CONTACT_MARGIN && y < FLOOR;
  }

  const outerN = state.shape.outer.length;
  const wasInside = new Array(outerN);
  for (let i = 0; i < outerN; i++) {
    const p = state.shape.outer[i];
    wasInside[i] = inPoleRect(p.x, p.y);
  }

  function shaftCollision() {
    let hit = false;
    for (let i = 0; i < outerN; i++) {
      const a = rotatedPt(state.shape.outer[i]);
      const nowIn = inPoleRect(a.x, a.y);
      if (nowIn && !wasInside[i]) hit = true;
      wasInside[i] = nowIn;
    }
    return hit;
  }

  function maxShapeYWorld() {
    let maxY = -Infinity;
    if (phase === 'pivoted') {
      for (const p of state.shape.outer) {
        const pt = rotatedPt(p);
        if (pt.y > maxY) maxY = pt.y;
      }
    } else {
      for (const p of state.shape.outer) {
        const pt = transformedPt(p);
        if (pt.y > maxY) maxY = pt.y;
      }
    }
    return maxY;
  }

  function step(now) {
    const dt = Math.min(0.016, (now - lastT) / 1000);
    lastT = now;

    if (phase === 'pivoted') {
      const angleFromVertical = theta0Vert + theta;
      const alpha = (G / L) * Math.sin(angleFromVertical);
      omega += alpha * dt;
      theta += omega * dt;

      if (maxShapeYWorld() > FLOOR) { stopAnim(); return; }

      if (shaftCollision()) {
        const c = Math.cos(theta), s = Math.sin(theta);
        const relX = rx0 * c - ry0 * s;
        const relY = rx0 * s + ry0 * c;
        comX = pivotX + relX;
        comY = pivotY + relY;
        vx = -omega * relY;
        vy =  omega * relX;
        phase = 'free';
      } else if (Math.abs(theta) >= Math.PI) {
        stopAnim();
        return;
      }
    } else {
      vy += G * dt;
      comX += vx * dt;
      comY += vy * dt;
      theta += omega * dt;

      if (maxShapeYWorld() > FLOOR) {
        comY -= (maxShapeYWorld() - FLOOR);
        stopAnim();
        return;
      }

      if (comY > FLOOR + 200 || Math.abs(theta) > Math.PI * 4) { stopAnim(); return; }
    }

    applyTransform();
    balanceState.animFrame = requestAnimationFrame(step);
  }
  balanceState.animFrame = requestAnimationFrame(step);
}
