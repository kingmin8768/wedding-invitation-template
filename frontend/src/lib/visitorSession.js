const VISITOR_NAME_KEY = 'wedding-invitation-visitor-name';

const getSessionStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage ?? null;
};

export const getVisitorName = () => {
  const storage = getSessionStorage();

  if (!storage) {
    return '';
  }

  return storage.getItem(VISITOR_NAME_KEY)?.trim() ?? '';
};

export const persistVisitorName = (name) => {
  const storage = getSessionStorage();

  if (!storage) {
    return '';
  }

  const normalizedName = typeof name === 'string' ? name.trim() : '';

  if (!normalizedName) {
    storage.removeItem(VISITOR_NAME_KEY);
    return '';
  }

  storage.setItem(VISITOR_NAME_KEY, normalizedName);
  return normalizedName;
};
