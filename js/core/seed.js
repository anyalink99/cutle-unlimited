function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateHash() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

function withSeed(seed, fn) {
  const orig = Math.random;
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = orig; }
}

// 2026-04-20 (UTC) = Daily #1.
const DAILY_EPOCH_MS = Date.UTC(2026, 3, 20);

function todayUtc(now) {
  const d = now ? new Date(now) : new Date();
  return d.getUTCFullYear() + '-'
    + String(d.getUTCMonth() + 1).padStart(2, '0') + '-'
    + String(d.getUTCDate()).padStart(2, '0');
}

function dailyIndex(now) {
  const ms = now || Date.now();
  return Math.floor((ms - DAILY_EPOCH_MS) / 86400000) + 1;
}

// Lexical `const` (not `function`) so this doesn't become a window.* property —
// casual `window.dailyHashFor(...)` from DevTools misses. It's still reachable
// as a bare identifier from another script, which is fine: game.js needs it.
// The dateStr parameter was dropped so there's no way to ask for a future day
// even if the function is called directly.
const dailyHashFor = function(mode, variation) {
  const key = todayUtc() + ':' + mode + ':' + variation;
  const a = seedFromString(key).toString(16).padStart(8, '0');
  const b = seedFromString(key + ':b').toString(16).padStart(8, '0');
  return a + b;
};
