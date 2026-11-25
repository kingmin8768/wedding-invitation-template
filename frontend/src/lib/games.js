import {
  adminJsonRequest,
  buildApiUrl,
  parseApiErrorMessage,
} from './api';
import { buildAuthorizationHeaders } from './sessionAuth';
import { io } from 'socket.io-client';

const authorizedJsonRequest = async (path, accessToken, options = {}) => {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthorizationHeaders(accessToken),
      ...(options.headers || {}),
    },
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

export const fetchRouletteState = () =>
  fetch(buildApiUrl('/api/games/lazygyu/state'), {
    credentials: 'include',
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseApiErrorMessage(response));
    }

    return response.json();
  });

export const fetchMyRouletteEntry = (accessToken) =>
  authorizedJsonRequest('/api/games/lazygyu/me', accessToken);

export const upsertMyRouletteEntry = (displayName, accessToken) =>
  authorizedJsonRequest('/api/games/lazygyu/entries', accessToken, {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });

export const deleteMyRouletteEntry = (accessToken) =>
  authorizedJsonRequest('/api/games/lazygyu/me/entries', accessToken, {
    method: 'DELETE',
  });

export const updateRouletteSubmissionStatus = (status, accessToken) =>
  adminJsonRequest('/api/admin/games/lazygyu/submission', accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const updateRouletteWinnerMode = (
  winnerMode,
  customWinnerRank,
  accessToken,
) =>
  adminJsonRequest('/api/admin/games/lazygyu/winner-mode', accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ winnerMode, customWinnerRank }),
  });

export const fetchAdminRouletteEntries = (accessToken) =>
  adminJsonRequest('/api/admin/games/lazygyu/entries', accessToken);

export const fetchLazygyuHostTicket = (accessToken) =>
  adminJsonRequest('/api/admin/games/lazygyu/host-ticket', accessToken);

export const startRouletteRound = (accessToken) =>
  adminJsonRequest('/api/admin/games/lazygyu/start', accessToken, {
    method: 'POST',
  });

export const resetRouletteEvent = (accessToken, clearEntries = false) =>
  adminJsonRequest('/api/admin/games/lazygyu/reset', accessToken, {
    method: 'POST',
    body: JSON.stringify({ clearEntries }),
  });

export const removeAdminRouletteEntry = (entryId, accessToken) =>
  adminJsonRequest(`/api/admin/games/lazygyu/entries/${entryId}`, accessToken, {
    method: 'DELETE',
  });

export const createLazygyuRoomSocket = (onEvent, options = {}) => {
  const socket = io('/games', {
    transports: ['websocket'],
    withCredentials: true,
    auth: options.hostToken ? { hostToken: options.hostToken } : undefined,
  });

  [
    'state_sync',
    'room_state_changed',
    'entry_added',
    'entry_removed',
    'round_locked',
    'round_started',
    'round_finished',
    'room_reset',
  ].forEach((eventName) => {
    socket.on(eventName, (payload) => {
      onEvent?.(eventName, payload);
    });
  });

  return socket;
};
