import { buildAuthorizationHeaders } from './sessionAuth.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL?.trim() ?? '';

export const SESSION_EXPIRED_MESSAGE = '세션이 만료되었습니다. 다시 로그인해 주세요.';

export class ApiError extends Error {
  constructor(message, status, code = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let sessionExpiredHandler = null;
let refreshSessionPromise = null;

const isLoopbackHostname = (hostname) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '::1';

export const buildApiUrl = (path) => {
  if (!API_BASE_URL) {
    return path;
  }

  try {
    const target = new URL(path, API_BASE_URL);

    if (typeof window !== 'undefined') {
      if (target.origin === window.location.origin) {
        return `${target.pathname}${target.search}${target.hash}`;
      }

      // When the frontend is opened from another device on the LAN,
      // a localhost API base would point to the phone/tablet itself.
      // In dev, prefer the current origin + proxy path instead.
      if (
        isLoopbackHostname(target.hostname) &&
        !isLoopbackHostname(window.location.hostname)
      ) {
        return path;
      }
    }

    return target.toString();
  } catch {
    return path;
  }
};

export const parseApiErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.message || data.error || '요청을 처리하지 못했습니다.';
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
};

const createApiError = async (response, code = null, fallbackMessage) =>
  new ApiError(
    fallbackMessage || (await parseApiErrorMessage(response)),
    response.status,
    code,
  );

const normalizeSessionExpiredError = (error) => {
  if (error instanceof ApiError && error.code === 'SESSION_EXPIRED') {
    return error;
  }

  if (error instanceof ApiError) {
    return new ApiError(SESSION_EXPIRED_MESSAGE, error.status, 'SESSION_EXPIRED');
  }

  return new ApiError(SESSION_EXPIRED_MESSAGE, 401, 'SESSION_EXPIRED');
};

const notifySessionExpired = (error) => {
  sessionExpiredHandler?.(error);
};

const refreshAdminSession = async () => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      const response = await fetch(buildApiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw await createApiError(
          response,
          'SESSION_EXPIRED',
          SESSION_EXPIRED_MESSAGE,
        );
      }

      return response;
    })()
      .catch((error) => {
        const sessionExpiredError = normalizeSessionExpiredError(error);
        notifySessionExpired(sessionExpiredError);
        throw sessionExpiredError;
      })
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
};

const buildAdminHeaders = (accessToken, headers, body) => {
  const nextHeaders = {
    ...(headers ?? {}),
  };
  const isFormDataBody =
    typeof FormData !== 'undefined' && body instanceof FormData;

  if (
    !isFormDataBody &&
    !Object.keys(nextHeaders).some((key) => key.toLowerCase() === 'content-type')
  ) {
    nextHeaders['Content-Type'] = 'application/json';
  }

  return {
    ...buildAuthorizationHeaders(accessToken),
    ...nextHeaders,
  };
};

const parseAdminResponse = async (response, responseType) => {
  if (response.status === 204 || responseType === 'none') {
    return null;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  return response.json();
};

export const adminRequest = async (
  path,
  accessToken,
  {
    responseType = 'json',
    retryOnUnauthorized = true,
    headers,
    ...options
  } = {},
) => {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: 'include',
    headers: buildAdminHeaders(accessToken, headers, options.body),
  });

  if (response.status === 401 && retryOnUnauthorized) {
    await refreshAdminSession();
    return adminRequest(path, accessToken, {
      responseType,
      retryOnUnauthorized: false,
      headers,
      ...options,
    });
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  return parseAdminResponse(response, responseType);
};

export const adminJsonRequest = (path, accessToken, options = {}) =>
  adminRequest(path, accessToken, { ...options, responseType: 'json' });

export const adminBlobRequest = (path, accessToken, options = {}) =>
  adminRequest(path, accessToken, { ...options, responseType: 'blob' });

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = typeof handler === 'function' ? handler : null;
};

export const isSessionExpiredError = (error) =>
  error instanceof ApiError && error.code === 'SESSION_EXPIRED';

export const isAuthorizationError = (error) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const resetAdminRequestStateForTests = () => {
  sessionExpiredHandler = null;
  refreshSessionPromise = null;
};
