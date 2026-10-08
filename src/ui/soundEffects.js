const SOURCES = Object.freeze({
  switch: new URL('../../sounds/switch6.mp3', import.meta.url).href,
  put: new URL('../../sounds/put5.mp3', import.meta.url).href,
  symbol: new URL('../../sounds/put2.mp3', import.meta.url).href,
  crown: new URL('../../sounds/crown.mp3', import.meta.url).href,
  error: new URL('../../sounds/error.mp3', import.meta.url).href,
  clear: new URL('../../sounds/clear.mp3', import.meta.url).href,
  arrivals: new URL('../../sounds/put5-arrivals.wav', import.meta.url).href,
  unlock: new URL('../../sounds/pon-unlock.wav', import.meta.url).href,
  nextWorld: new URL('../../sounds/pon-next-world.wav', import.meta.url).href,
});

export function createSoundEffects(AudioConstructor = globalThis.Audio) {
  const pools = new Map();
  const next = new Map();

  function poolFor(name) {
    let pool = pools.get(name);
    if (!pool) { pool = []; pools.set(name, pool); }
    return pool;
  }

  function makeAudio(name) {
    const audio = new AudioConstructor(SOURCES[name]);
    audio.preload = 'auto';
    audio.volume = name === 'arrivals' ? 0.6 : 1;
    return audio;
  }

  return {
    preload(name) {
      if (!Object.hasOwn(SOURCES, name) || !AudioConstructor) return;
      try {
        const pool = poolFor(name);
        if (!pool.length) pool.push(makeAudio(name));
        pool[0].load?.();
      } catch { /* Preloading is optional. */ }
    },
    play(name) {
      if (!Object.hasOwn(SOURCES, name) || !AudioConstructor) return;
      try {
        const pool = poolFor(name);
        let chosen = pool.findIndex((audio) => audio.paused || audio.ended);
        if (chosen < 0 && pool.length < 20) {
          chosen = pool.push(makeAudio(name)) - 1;
        } else if (chosen < 0) chosen = next.get(name) || 0;
        next.set(name, (chosen + 1) % pool.length);
        const audio = pool[chosen];
        audio.currentTime = 0;
        audio.play()?.catch(() => {});
      } catch { /* Audio failure must never interrupt gameplay. */ }
    },
  };
}
