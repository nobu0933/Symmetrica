import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { FINAL_ICON_LANDING_MS, unlockStepDelay } from '../src/ui/unlockAnimation.js';

// One-off build helper: pass the path to an installed Playwright package.
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2]);
const arrivals = Array.from({ length: 9 }, (_, diagonal) => 340 + diagonal * 50);
let iconStart = 0;
const unlock = Array.from({ length: 17 }, (_, index) => {
  if (index > 0) iconStart += unlockStepDelay(index, 17);
  return iconStart + (index === 16 ? FINAL_ICON_LANDING_MS : 0);
});
const ponSemitonesPerHit = 0.75;
const finalPonSemitones = (unlock.length - 1) * ponSemitonesPerHit;
const tracks = [
  { output: 'put5-arrivals.wav', source: 'put5.mp3', starts: arrivals, semitonesPerHit: 0, baseSemitones: 0 },
  { output: 'pon-unlock.wav', source: 'pon.mp3', starts: unlock, semitonesPerHit: ponSemitonesPerHit, baseSemitones: 0 },
  { output: 'pon-next-world.wav', source: 'pon.mp3', starts: [0], semitonesPerHit: 0, baseSemitones: finalPonSemitones },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  for (const { output, source, starts, semitonesPerHit, baseSemitones } of tracks) {
    const encoded = (await readFile(new URL(`../sounds/${source}`, import.meta.url))).toString('base64');
    const base64 = await page.evaluate(async ({ encoded, starts, semitonesPerHit, baseSemitones, source }) => {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const context = new AudioContext();
      const sample = await context.decodeAudioData(bytes.buffer);
      await context.close();
      const sampleRate = 44100;
      const duration = Math.max(...starts.map((start, index) =>
        start / 1000 + sample.duration / 2 ** ((baseSemitones + index * semitonesPerHit) / 12))) + 0.03;
      const offline = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);
      for (const [index, start] of starts.entries()) {
        const voice = offline.createBufferSource();
        voice.buffer = sample;
        voice.playbackRate.value = 2 ** ((baseSemitones + index * semitonesPerHit) / 12);
        const gain = offline.createGain();
        gain.gain.value = source === 'pon.mp3' ? 0.85 : 0.7;
        voice.connect(gain).connect(offline.destination);
        voice.start(start / 1000);
      }
      const rendered = await offline.startRendering();
      const samples = rendered.getChannelData(0);
      let peak = 0;
      for (const value of samples) peak = Math.max(peak, Math.abs(value));
      const scale = peak > 0.8 ? 0.8 / peak : 1;
      const wav = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(wav);
      const put = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
      put(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true);
      put(8, 'WAVE'); put(12, 'fmt '); view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      put(36, 'data'); view.setUint32(40, samples.length * 2, true);
      samples.forEach((value, index) => view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, value * scale)) * 32767), true));
      const output = new Uint8Array(wav);
      let binary = '';
      for (let offset = 0; offset < output.length; offset += 8192) {
        binary += String.fromCharCode(...output.subarray(offset, offset + 8192));
      }
      return btoa(binary);
    }, { encoded, starts, semitonesPerHit, baseSemitones, source });
    await writeFile(new URL(`../sounds/${output}`, import.meta.url), Buffer.from(base64, 'base64'));
  }
} finally {
  await browser.close();
}
