import { buildApiUrl, parseApiErrorMessage } from './api';

const LAZYGYU_CLIENT_KEY_STORAGE = 'lazygyuClientKey';

export const getLazygyuClientKey = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = window.localStorage.getItem(LAZYGYU_CLIENT_KEY_STORAGE);
  if (existing) {
    return existing;
  }

  const next =
    window.crypto?.randomUUID?.() ||
    `lazygyu-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

  window.localStorage.setItem(LAZYGYU_CLIENT_KEY_STORAGE, next);
  return next;
};

const request = async (path, options = {}) => {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const getLazygyuState = (clientKey = getLazygyuClientKey()) =>
  request(`/api/lazygyu-room/state?clientKey=${encodeURIComponent(clientKey)}`);

export const addLazygyuEntry = (
  displayName,
  clientKey = getLazygyuClientKey(),
) =>
  request('/api/lazygyu-room/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, clientKey }),
  });

export const getLazygyuAdminState = () => request('/api/lazygyu-room/admin/state');

export const updateLazygyuControl = (payload) =>
  request('/api/lazygyu-room/admin/control', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const startLazygyuRound = () =>
  request('/api/lazygyu-room/admin/start', { method: 'POST' });

export const finishLazygyuRound = (winnerName) =>
  request('/api/lazygyu-room/admin/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winnerName }),
  });

export const resetLazygyuRoom = () =>
  request('/api/lazygyu-room/admin/reset', { method: 'POST' });

export const removeLazygyuEntry = (id) =>
  request(`/api/lazygyu-room/admin/entries/${id}`, { method: 'DELETE' });

export const stopLazygyuStream = () =>
  request('/api/lazygyu-room/admin/stream/stop', { method: 'POST' });

export const uploadLazygyuFrame = async (blob, filename = 'frame.jpg') => {
  const formData = new FormData();
  formData.append('frame', blob, filename);

  const response = await fetch(buildApiUrl('/api/lazygyu-room/admin/frame'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  return response.json();
};

export const createLazygyuEventStream = () =>
  new EventSource(buildApiUrl('/api/lazygyu-room/events'));

export const createLazygyuFrameSocket = () => {
  const target = buildApiUrl('/api/lazygyu-room/frame-stream');
  const socketUrl = new URL(
    target,
    typeof window !== 'undefined' ? window.location.href : 'http://localhost',
  );

  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  return new WebSocket(socketUrl.toString());
};

export const buildLazygyuFrameUrl = (sequence) =>
  buildApiUrl(`/api/lazygyu-room/frame${sequence ? `?sequence=${sequence}` : ''}`);
