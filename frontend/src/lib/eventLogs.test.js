import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SESSION_EXPIRED_MESSAGE,
  resetAdminRequestStateForTests,
} from './api.js';
import {
  downloadAdminEventLogsCsv,
  fetchAdminEventLogs,
} from './eventLogs.js';

const LOCAL_EVENT_LOG_KEY = 'weddingInvitationEventLogs';
const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

const createStorage = () => {
  const storage = new Map();

  return {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    removeItem(key) {
      storage.delete(key);
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  };
};

const createJsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const createDomEnvironment = () => {
  const localStorage = createStorage();
  const clickedAnchors = [];

  globalThis.window = {
    URL: {
      createObjectURL(blob) {
        return `blob:${blob.size}`;
      },
      revokeObjectURL() {},
    },
    localStorage,
    location: {
      href: 'https://example.com/admin/logs',
      pathname: '/admin/logs',
    },
  };

  globalThis.document = {
    referrer: '',
    body: {
      appendChild() {},
    },
    createElement() {
      return {
        click() {
          clickedAnchors.push('clicked');
        },
        href: '',
        download: '',
        remove() {},
      };
    },
  };

  return { clickedAnchors, localStorage };
};

test.afterEach(() => {
  resetAdminRequestStateForTests();
  globalThis.document = originalDocument;
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

test('falls back to local admin event logs on non-auth fetch failures', async () => {
  const { localStorage } = createDomEnvironment();
  localStorage.setItem(
    LOCAL_EVENT_LOG_KEY,
    JSON.stringify([
      {
        id: 'local-1',
        eventType: 'click',
        section: 'guestbook',
        action: 'open',
        label: '방명록',
        path: '/admin',
        url: 'https://example.com/admin',
        sessionId: 'session-1',
        userName: '김하객',
        metadata: { source: 'local' },
        createdAt: '2026-04-15T10:00:00.000Z',
      },
    ]),
  );

  globalThis.fetch = async () => {
    throw new TypeError('network failed');
  };

  const response = await fetchAdminEventLogs('cookie-session', { search: '방명록' });

  assert.equal(response.items.length, 1);
  assert.equal(response.items[0].id, 'local-1');
  assert.equal(response.meta.total, 1);
});

test('does not hide session expiration behind admin event log fallback', async () => {
  createDomEnvironment();

  globalThis.fetch = async (url) => {
    if (url === '/api/auth/refresh') {
      return createJsonResponse({ message: '리프레시 토큰이 유효하지 않습니다.' }, 401);
    }

    if (url === '/api/admin/event-logs') {
      return createJsonResponse({ message: '유효하지 않은 토큰입니다.' }, 401);
    }

    throw new Error(`unexpected url: ${url}`);
  };

  await assert.rejects(
    () => fetchAdminEventLogs('cookie-session'),
    (error) => {
      assert.equal(error.message, SESSION_EXPIRED_MESSAGE);
      return true;
    },
  );
});

test('falls back to a local CSV export on non-auth failures', async () => {
  const { clickedAnchors, localStorage } = createDomEnvironment();
  localStorage.setItem(
    LOCAL_EVENT_LOG_KEY,
    JSON.stringify([
      {
        id: 'local-1',
        eventType: 'click',
        section: 'gallery',
        action: 'open',
        label: '사진 보기',
        path: '/admin',
        url: 'https://example.com/admin',
        sessionId: 'session-1',
        userName: '김하객',
        metadata: { source: 'local' },
        createdAt: '2026-04-15T10:00:00.000Z',
      },
    ]),
  );

  globalThis.fetch = async () => {
    throw new TypeError('network failed');
  };

  await downloadAdminEventLogsCsv('cookie-session');

  assert.equal(clickedAnchors.length, 1);
});
