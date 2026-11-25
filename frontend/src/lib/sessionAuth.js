export const COOKIE_SESSION_ACCESS_TOKEN = 'cookie-session';

export const hasBearerAccessToken = (accessToken) =>
  typeof accessToken === 'string' &&
  accessToken.length > 0 &&
  accessToken !== COOKIE_SESSION_ACCESS_TOKEN;

export const buildAuthorizationHeaders = (accessToken) =>
  hasBearerAccessToken(accessToken) ? { Authorization: `Bearer ${accessToken}` } : {};
