import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAuthorizationHeaders,
  COOKIE_SESSION_ACCESS_TOKEN,
  hasBearerAccessToken,
} from './sessionAuth.js';

test('treats cookie session placeholder as non-bearer auth', () => {
  assert.equal(hasBearerAccessToken(COOKIE_SESSION_ACCESS_TOKEN), false);
  assert.deepEqual(buildAuthorizationHeaders(COOKIE_SESSION_ACCESS_TOKEN), {});
});

test('builds bearer header only for real access tokens', () => {
  assert.equal(hasBearerAccessToken('real-jwt-token'), true);
  assert.deepEqual(buildAuthorizationHeaders('real-jwt-token'), {
    Authorization: 'Bearer real-jwt-token',
  });
  assert.deepEqual(buildAuthorizationHeaders(''), {});
  assert.deepEqual(buildAuthorizationHeaders(undefined), {});
});
