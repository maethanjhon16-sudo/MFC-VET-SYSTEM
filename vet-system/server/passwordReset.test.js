import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RESET_TOKEN_TTL_MS,
  createResetToken,
  isWellFormedResetToken,
  passwordProblem,
} from './passwordReset.js';

test('reset tokens are well formed, unique, and expire after the TTL', () => {
  const now = Date.UTC(2026, 10, 15);
  const a = createResetToken(now);
  const b = createResetToken(now);
  assert.ok(isWellFormedResetToken(a.token));
  assert.notEqual(a.token, b.token);
  assert.equal(a.expiresAt.getTime(), now + RESET_TOKEN_TTL_MS);
});

test('malformed reset tokens are rejected', () => {
  for (const value of [undefined, null, 42, '', 'short', 'a'.repeat(44), `${'a'.repeat(42)}!`, `${'a'.repeat(42)} `]) {
    assert.equal(isWellFormedResetToken(value), false);
  }
});

test('new passwords follow the sign-up rules', () => {
  assert.equal(passwordProblem('longenough'), null);
  assert.ok(passwordProblem('short'));
  assert.ok(passwordProblem(undefined));
  assert.ok(passwordProblem('x'.repeat(129)));
});
