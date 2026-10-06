import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { FINAL_ICON_LANDING_MS, unlockStepDelay } from '../src/ui/unlockAnimation.js';

// One-off build helper: pass the path to an installed Playwright package.
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2]);
const source = await readFile(new URL('../sounds/put5.mp3', import.meta.url));
const encoded = source.toString('base64');

const arrivals = Array.from({ length: 9 }, (_, diagonal) => 340 + diagonal * 50);
let iconStart = 0;
const unlock = Array.from({ length: 17 }, (_, index) => {
  if (index > 0) iconStart += unlockStepDelay(index, 17);
  return iconStart + (index === 16 ? FINAL_ICON_LANDING_MS : 440);
});

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  for (const [name, starts] of [['arrivals', arrivals], ['unlock', unlock]]) {
    const base64 = await page.evaluate(async ({ encoded, starts }) => {
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const context = new AudioContext();
      const sample = await context.decodeAudioData(bytes.buffer);
      await context.close();
      const sampleRate = 44100;
      const duration = Math.max(...starts) / 1000 + sample.duration + 0.03;
      const offline = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);
      for (const start of starts) {
        const voice = offline.createBufferSource();
        voice.buffer = sample;
        const gain = offline.createGain();
        gain.gain.value = 0.7;
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
    }, { encoded, starts });
    await writeFile(new URL(`../sounds/put5-${name}.wav`, import.meta.url), Buffer.from(base64, 'base64'));
  }
} finally {
  await browser.close();
}
