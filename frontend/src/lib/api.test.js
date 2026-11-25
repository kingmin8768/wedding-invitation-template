import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SESSION_EXPIRED_MESSAGE,
  adminBlobRequest,
  adminJsonRequest,
  isSessionExpiredError,
  resetAdminRequestStateForTests,
  setSessionExpiredHandler,
} from './api.js';

const createJsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  resetAdminRequestStateForTests();
  globalThis.fetch = originalFetch;
});

test('retries one admin request after refresh succeeds', async () => {
  let adminRequestCount = 0;
  let refreshRequestCount = 0;

  globalThis.fetch = async (url) => {
    if (url === '/api/auth/refresh') {
      refreshRequestCount += 1;
      return createJsonResponse({ user: { id: 1 } }, 201);
    }

    if (url === '/api/admin/overview') {
      adminRequestCount += 1;

      if (adminRequestCount === 1) {
        return createJsonResponse({ message: '유효하지 않은 토큰입니다.' }, 401);
      }

      return createJsonResponse({ message: 'ok' });
    }

    throw new Error(`unexpected url: ${url}`);
  };

  const response = await adminJsonRequest('/api/admin/overview', 'cookie-session');

  assert.deepEqual(response, { message: 'ok' });
  assert.equal(adminRequestCount, 2);
  assert.equal(refreshRequestCount, 1);
});

test('coalesces concurrent refresh attempts into a single refresh request', async () => {
  const adminRequestCounts = new Map();
  let refreshRequestCount = 0;

  globalThis.fetch = async (url) => {
    if (url === '/api/auth/refresh') {
      refreshRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return createJsonResponse({ user: { id: 1 } }, 201);
    }

    if (url === '/api/admin/overview' || url === '/api/admin/games/lazygyu/entries') {
      const nextCount = (adminRequestCounts.get(url) || 0) + 1;
      adminRequestCounts.set(url, nextCount);

      if (nextCount === 1) {
        return createJsonResponse({ message: '유효하지 않은 토큰입니다.' }, 401);
      }

      return createJsonResponse({ path: url, ok: true });
    }

    throw new Error(`unexpected url: ${url}`);
  };

  const [overview, entries] = await Promise.all([
    adminJsonRequest('/api/admin/overview', 'cookie-session'),
    adminJsonRequest('/api/admin/games/lazygyu/entries', 'cookie-session'),
  ]);

  assert.deepEqual(overview, { path: '/api/admin/overview', ok: true });
  assert.deepEqual(entries, { path: '/api/admin/games/lazygyu/entries', ok: true });
  assert.equal(refreshRequestCount, 1);
  assert.equal(adminRequestCounts.get('/api/admin/overview'), 2);
  assert.equal(adminRequestCounts.get('/api/admin/games/lazygyu/entries'), 2);
});

test('reports session expiration once refresh fails', async () => {
  let sessionExpiredCallCount = 0;

  setSessionExpiredHandler(() => {
    sessionExpiredCallCount += 1;
  });

  globalThis.fetch = async (url) => {
    if (url === '/api/auth/refresh') {
      return createJsonResponse({ message: '리프레시 토큰이 유효하지 않습니다.' }, 401);
    }

    if (url === '/api/admin/overview') {
      return createJsonResponse({ message: '유효하지 않은 토큰입니다.' }, 401);
    }

    throw new Error(`unexpected url: ${url}`);
  };

  await assert.rejects(
    () => adminJsonRequest('/api/admin/overview', 'cookie-session'),
    (error) => {
      assert.equal(isSessionExpiredError(error), true);
      assert.equal(error.message, SESSION_EXPIRED_MESSAGE);
      return true;
    },
  );

  assert.equal(sessionExpiredCallCount, 1);
});

test('supports blob responses through the admin refresh helper', async () => {
  globalThis.fetch = async (url) => {
    if (url === '/api/admin/event-logs/export') {
      return new Response(new Blob(['csv']), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
        },
      });
    }

    throw new Error(`unexpected url: ${url}`);
  };

  const blob = await adminBlobRequest('/api/admin/event-logs/export', 'cookie-session');

  assert.equal(await blob.text(), 'csv');
});
