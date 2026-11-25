export const ACCESS_TOKEN_COOKIE = 'weddingInvitationAccessToken';
export const REFRESH_TOKEN_COOKIE = 'weddingInvitationRefreshToken';

export const parseCookieHeader = (header?: string | string[]) => {
  if (!header || Array.isArray(header)) {
    return {} as Record<string, string>;
  }

  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (!key) {
        return cookies;
      }

      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        return cookies;
      }

      return cookies;
    }, {});
};

export const readCookie = (
  header: string | string[] | undefined,
  name: string,
) => parseCookieHeader(header)[name] ?? null;
