import assert from 'node:assert/strict';
import test from 'node:test';
import { getVisitorName, persistVisitorName } from './visitorSession.js';

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

test('returns empty name when window is unavailable', () => {
  const previousWindow = globalThis.window;

  globalThis.window = undefined;

  assert.equal(getVisitorName(), '');
  assert.equal(persistVisitorName('하객 이름'), '');

  globalThis.window = previousWindow;
});

test('stores and returns the trimmed visitor name in session storage', () => {
  const previousWindow = globalThis.window;
  const sessionStorage = createStorage();

  globalThis.window = { sessionStorage };

  assert.equal(persistVisitorName('  하객 이름  '), '하객 이름');
  assert.equal(getVisitorName(), '하객 이름');

  globalThis.window = previousWindow;
});

test('clears the stored visitor name when an empty value is provided', () => {
  const previousWindow = globalThis.window;
  const sessionStorage = createStorage();

  globalThis.window = { sessionStorage };

  persistVisitorName('하객 이름');
  assert.equal(getVisitorName(), '하객 이름');
  assert.equal(persistVisitorName('   '), '');
  assert.equal(getVisitorName(), '');

  globalThis.window = previousWindow;
});
