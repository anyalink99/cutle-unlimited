const state = {
  polygon: [],
  locked: false,
};

function newShape() {
  state.polygon = generateShape();
  state.locked = false;
  input.reset();
  renderShape(state.polygon);
  setHintResting();
  dom.newBtn.classList.remove('pulse');
}

function performCut(p0, p1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  let nx = -dy, ny = dx;
  const len = Math.hypot(nx, ny);
  nx /= len; ny /= len;
  const c = -(nx * p0.x + ny * p0.y);

  const polyA = clipHalfPlane(state.polygon, nx, ny, c);
  const polyB = clipHalfPlane(state.polygon, -nx, -ny, -c);
  const aA = polygonArea(polyA);
  const aB = polygonArea(polyB);
  const total = aA + aB;
  if (total < 1) return;
  const pctA = (aA / total) * 100;
  const pctB = (aB / total) * 100;
  const diff = Math.abs(pctA - pctB);

  recordDiff(diff);
  state.locked = true;

  dom.shapeLayer.innerHTML = '';
  const pieceA = makePiece(polyA);
  const pieceB = makePiece(polyB);
  dom.shapeLayer.appendChild(pieceA);
  dom.shapeLayer.appendChild(pieceB);

  drawCutFlash(p0, p1);

  const offset = 22;
  requestAnimationFrame(() => {
    pieceA.style.transform = `translate(${(nx * offset).toFixed(2)}px, ${(ny * offset).toFixed(2)}px)`;
    pieceB.style.transform = `translate(${(-nx * offset).toFixed(2)}px, ${(-ny * offset).toFixed(2)}px)`;
  });

  const cA = polygonCentroid(polyA);
  const cB = polygonCentroid(polyB);
  setTimeout(() => {
    addLabel(cA, nx, ny, +1, offset, pctA);
    addLabel(cB, nx, ny, -1, offset, pctB);
  }, 50);

  showVerdict(diff);
  setTimeout(() => dom.newBtn.classList.add('pulse'), 1000);
}

const input = initInput({
  getPolygon: () => state.polygon,
  isLocked: () => state.locked,
  onCut: performCut,
});
