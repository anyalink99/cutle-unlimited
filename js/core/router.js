const MODE_SLUGS = { cut: 'cut', inscribe: 'inscribe', balance: 'balance' };
const VAR_SLUGS = {
  cut: ['half', 'ratio', 'quad', 'tri', 'angle'],
  inscribe: ['square', 'triangle'],
  balance: ['pole', 'centroid'],
};
const DEFAULT_VAR = { cut: 'half', inscribe: 'square', balance: 'pole' };
const HASH_RE = /^[a-z0-9]{6,64}$/i;

function parseLocation() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const sp = new URLSearchParams(window.location.search);

  let mode = null, variation = null;
  if (parts.length >= 1 && MODE_SLUGS[parts[0]]) {
    mode = parts[0];
    if (parts.length >= 2 && VAR_SLUGS[mode].includes(parts[1])) {
      variation = parts[1];
    }
  }

  let hash = null;
  const s = sp.get('s');
  if (s && HASH_RE.test(s)) hash = s;

  return { mode, variation, hash };
}

function variationPath(mode, variation) {
  if (mode === 'cut' && variation === 'half') return '/';
  if (mode === 'cut') return '/cut/' + variation + '/';
  if (mode === 'inscribe' && variation === 'square') return '/inscribe/';
  if (mode === 'inscribe') return '/inscribe/' + variation + '/';
  if (mode === 'balance' && variation === 'pole') return '/balance/';
  if (mode === 'balance') return '/balance/' + variation + '/';
  return '/';
}

function buildRouteUrl(mode, variation, hash) {
  const p = variationPath(mode, variation);
  return hash ? p + '?s=' + hash : p;
}

function setMetaAttr(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function updateMeta(mode, variation) {
  const meta = (typeof pageMetaFor === 'function') ? pageMetaFor(mode, variation) : null;
  if (!meta) return;
  document.title = meta.title;
  const canonical = 'https://geometric.games' + meta.path;
  setMetaAttr('meta[name="description"]', 'content', meta.description);
  setMetaAttr('meta[property="og:title"]', 'content', meta.title);
  setMetaAttr('meta[property="og:description"]', 'content', meta.description);
  setMetaAttr('meta[name="twitter:title"]', 'content', meta.title);
  setMetaAttr('meta[name="twitter:description"]', 'content', meta.description);
  setMetaAttr('link[rel="canonical"]', 'href', canonical);
  setMetaAttr('meta[property="og:url"]', 'content', canonical);
}

function canPushState() {
  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

function pushRoute(mode, variation, hash) {
  if (canPushState()) {
    const url = buildRouteUrl(mode, variation, hash);
    const current = window.location.pathname + window.location.search;
    if (url !== current) {
      try { history.pushState({ mode, variation, hash }, '', url); } catch (e) {}
    }
  }
  updateMeta(mode, variation);
}

function replaceRoute(mode, variation, hash) {
  if (canPushState()) {
    const url = buildRouteUrl(mode, variation, hash);
    try { history.replaceState({ mode, variation, hash }, '', url); } catch (e) {}
  }
  updateMeta(mode, variation);
}
