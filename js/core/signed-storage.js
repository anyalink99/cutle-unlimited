// Integrity-tagged localStorage wrapper. Blobs are stored as { d, s } where
// `s` is a keyed hash over the stringified payload + storage key. Hand-edited
// values get a stale signature and are dropped on load. Intended to stop
// casual DevTools tinkering with score buckets — not a security boundary.
//
// Legacy (unsigned) entries written before this wrapper are accepted once and
// re-signed on next save, so existing players keep their stats.

function signedStorageHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Salt pass — interleaved bytes keep trivial JSON edits from re-hashing
  // to the same value without regenerating the tag.
  const salt = [0x9e, 0x37, 0x79, 0xb1, 0x7f, 0x4a, 0x7c, 0x15, 0xa2, 0xc3];
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i) + salt[i % salt.length] + i;
    h = Math.imul(h, 2654435761);
  }
  for (let i = 0; i < salt.length; i++) {
    h ^= salt[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function signedStorageSet(key, value) {
  try {
    const data = JSON.stringify(value);
    const sig = signedStorageHash(key + '|' + data);
    localStorage.setItem(key, JSON.stringify({ d: value, s: sig }));
  } catch (e) {}
}

function signedStorageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const wrapped = JSON.parse(raw);
    if (!wrapped || typeof wrapped !== 'object') return null;
    // Legacy unsigned payload — accept once, next save re-signs.
    if (!('d' in wrapped) || !('s' in wrapped)) return wrapped;
    const data = JSON.stringify(wrapped.d);
    if (signedStorageHash(key + '|' + data) !== wrapped.s) return null;
    return wrapped.d;
  } catch (e) {
    return null;
  }
}
