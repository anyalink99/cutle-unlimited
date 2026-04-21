/* Frame capture pipeline for share-GIF.
   Snapshots the user's confirmed answer, replays it through modeRunner with
   a body.gif-capturing flag that suppresses the fresh-shape pop, and samples
   the live SVG at fixed intervals. The same tight viewBox PNG share uses is
   applied to every snapshot so framing stays consistent across frames. */

const CAPTURE_WIDTH = 540;
const CAPTURE_HEIGHT = 540;
const CAPTURE_DURATION_MS = 1600;
const CAPTURE_FRAME_COUNT = 22;
const HOLD_FRAME_COUNT = 22;
const REVEAL_FRAME_DELAY_MS = CAPTURE_DURATION_MS / CAPTURE_FRAME_COUNT;
const HOLD_FRAME_DELAY_MS = 70;

// Apply a pre-computed tight viewBox to every captured snapshot so all frames
// are framed identically (matching the PNG share's crop). xmlns:xlink is set
// because drop-to-load custom shapes paint via <image xlink:href="data:..."/>
// (main.js#paintImageInto) — without the namespace declaration the serialized
// SVG is invalid XML and <img>-decoding fails with "svg image decode failed".
// XMLSerializer (not innerHTML) is required: the HTML serializer silently
// drops namespaced attributes like xlink:href.
function serializeBoardSnapshot(srcSvg, viewBox) {
  const clone = srcSvg.cloneNode(true);
  inlineSvgStyles(srcSvg, clone);
  const preview = clone.querySelector('#cut-preview');
  if (preview) preview.remove();
  const hitPad = clone.querySelector('#hit-pad');
  if (hitPad) hitPad.remove();
  clone.querySelectorAll('.sp-hover, .centroid-hover, .pole-hover').forEach(el => el.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('overflow', 'visible');
  if (viewBox) {
    clone.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
    clone.setAttribute('width', viewBox.w);
    clone.setAttribute('height', viewBox.h);
  }
  return new XMLSerializer().serializeToString(clone);
}

function resetForCapture() {
  state.locked = false;
  document.body.classList.add('gif-capturing');
  resetAllModes();
  renderShape(state.shape);
  modeRunner[state.mode].onShapeReady();
}

function readVerdictState() {
  const verdictEl = document.querySelector('#score-line .verdict');
  const statsEl = document.querySelector('#score-line .score-stats');
  return {
    verdictText: verdictEl ? verdictEl.textContent.trim() : '',
    verdictOpacity: verdictEl ? parseFloat(getComputedStyle(verdictEl).opacity) || 0 : 0,
    verdictClass: verdictEl ? (verdictEl.className || '') : '',
    statsText: statsEl ? statsEl.textContent.trim() : '',
    statsOpacity: statsEl ? parseFloat(getComputedStyle(statsEl).opacity) || 0 : 0,
  };
}

async function captureRevealFrames() {
  const board = document.getElementById('board');
  if (!board) throw new Error('capture: #board not found');

  // Compute the tight viewBox NOW, using the current confirmed DOM — pieces
  // are at their max extent (Cut) or steady (inscribe/balance), so this
  // bbox holds across every upcoming replay frame.
  const viewBox = (typeof computeBoardViewBox === 'function') ? computeBoardViewBox(board) : null;

  const snap = modeRunner[state.mode].snapshot();
  resetForCapture();

  modeRunner[state.mode].restoreSnapshot(snap);
  modeRunner[state.mode].confirm({ replay: true });

  const out = [];
  const t0 = performance.now();
  for (let i = 0; i < CAPTURE_FRAME_COUNT; i++) {
    const target = t0 + (i + 1) * REVEAL_FRAME_DELAY_MS;
    const wait = Math.max(0, target - performance.now());
    await new Promise(res => setTimeout(res, wait));
    out.push({
      svg: serializeBoardSnapshot(board, viewBox),
      verdict: readVerdictState(),
    });
  }
  return out;
}

function stopCaptureMode() {
  document.body.classList.remove('gif-capturing');
}
