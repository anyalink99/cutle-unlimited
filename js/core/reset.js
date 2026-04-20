function cloneDefault(v) {
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === 'object') return Object.assign({}, v);
  return v;
}

function makeModeReset(spec) {
  return function resetMode() {
    const defaults = typeof spec.defaults === 'function' ? spec.defaults() : spec.defaults;
    if (defaults) {
      for (const k in defaults) {
        spec.state[k] = cloneDefault(defaults[k]);
      }
    }
    const layers = spec.layers || [];
    for (let i = 0; i < layers.length; i++) {
      const el = typeof layers[i] === 'function' ? layers[i]() : layers[i];
      if (el) el.innerHTML = '';
    }
    if (typeof spec.after === 'function') spec.after();
  };
}
