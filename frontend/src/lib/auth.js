import { adminJsonRequest, buildApiUrl, parseApiErrorMessage } from './api';
import { COOKIE_SESSION_ACCESS_TOKEN } from './sessionAuth';

const request = async (path, options = {}) => {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
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

export const getCurrentUser = () => request('/api/auth/me');

export const getAdminOverview = (accessToken) =>
  adminJsonRequest('/api/admin/overview', accessToken);

const normalizeSession = async (data) => {
  const tokens = data.user ? { accessToken: COOKIE_SESSION_ACCESS_TOKEN, refreshToken: null } : null;
  let user = data.user ?? null;

  if (!user) {
    user = await getCurrentUser();
  }

  if (!user) {
    throw new Error('사용자 정보를 확인하지 못했습니다.');
  }

  return { user, tokens };
};

export const signupUser = async ({ email, name, password }) => {
  const data = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });

  return normalizeSession(data);
};

export const loginUser = async ({ email, password }) => {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return normalizeSession(data);
};

export const refreshUserSession = async (refreshToken) => {
  const data = await request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });

  return normalizeSession(data);
};

export const logoutUser = () =>
  request('/api/auth/logout', {
    method: 'POST',
  });
