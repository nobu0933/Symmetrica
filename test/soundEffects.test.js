import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundEffects } from '../src/ui/soundEffects.js';

test('each gameplay cue uses its assigned sound and permits overlapping playback', () => {
  const instances = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.plays = 0;
      instances.push(this);
    }
    play() { this.paused = false; this.plays++; return Promise.resolve(); }
  }
  const effects = createSoundEffects(FakeAudio);
  effects.preload('unlock');
  effects.preload('unlock');
  effects.play('switch');
  effects.play('switch');
  effects.play('put');
  effects.play('symbol');
  effects.play('crown');
  effects.play('error');
  effects.play('clear');
  effects.play('arrivals');
  effects.play('unlock');
  effects.play('nextWorld');
  effects.play('unknown');

  assert.equal(instances.length, 10);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/switch6.mp3') && audio.plays).length, 2);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/put5.mp3') && audio.plays).length, 1);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/put2.mp3') && audio.plays).length, 1);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/crown.mp3') && audio.plays).length, 1);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/error.mp3') && audio.plays).length, 1);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/clear.mp3') && audio.plays).length, 1);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/put5-arrivals.wav') && audio.plays && audio.volume === 0.6).length, 1);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/pon-unlock.wav') && audio.plays).length, 1);
  assert.equal(instances.filter((audio) => audio.src.endsWith('/pon-next-world.wav') && audio.plays).length, 1);
});

test('audio playback failure does not interrupt gameplay', async () => {
  class BlockedAudio {
    constructor() { this.paused = true; }
    play() { return Promise.reject(new Error('autoplay blocked')); }
  }
  const effects = createSoundEffects(BlockedAudio);
  effects.play('switch');
  await Promise.resolve();
});
