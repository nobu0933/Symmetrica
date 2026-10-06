import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecretSequence } from '../src/ui/secretSequence.js';

test('the developer phrase opens only after the complete ordered sequence', () => {
  const secret = createSecretSequence('kaihatusha');
  for (const [index, letter] of [...'kaihatush'].entries()) {
    assert.equal(secret.push(letter, index * 100), false);
  }
  assert.equal(secret.push('A', 900), true);
  assert.equal(secret.push('a', 1000), false);
});

test('the developer phrase resets on interruption or a long pause', () => {
  const secret = createSecretSequence('kaihatusha');
  for (const letter of 'kaiha') secret.push(letter, 100);
  secret.push('Escape', 200);
  for (const letter of 'tusha') assert.equal(secret.push(letter, 300), false);
  secret.reset();
  for (const letter of 'kaiha') secret.push(letter, 400);
  for (const letter of 'tusha') assert.equal(secret.push(letter, 4000), false);
});
