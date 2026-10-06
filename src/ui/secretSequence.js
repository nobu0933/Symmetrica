export function createSecretSequence(sequence, timeoutMs = 3000) {
  const target = sequence.toLowerCase();
  let typed = '';
  let lastAt = 0;

  return {
    push(key, at = performance.now()) {
      if (!/^[a-z]$/i.test(key)) { typed = ''; return false; }
      if (at - lastAt > timeoutMs) typed = '';
      typed = (typed + key.toLowerCase()).slice(-target.length);
      lastAt = at;
      if (typed !== target) return false;
      typed = '';
      return true;
    },
    reset() { typed = ''; lastAt = 0; },
  };
}
