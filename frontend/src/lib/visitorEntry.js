const FRIEND_VISITOR_KEY = 'wedding-invitation-visitor-entry';

export const markFriendVisitor = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    FRIEND_VISITOR_KEY,
    JSON.stringify({
      type: 'friend',
      markedAt: new Date().toISOString(),
    }),
  );
};

export const isFriendVisitor = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const raw = localStorage.getItem(FRIEND_VISITOR_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw);
    return parsed?.type === 'friend';
  } catch {
    return localStorage.getItem(FRIEND_VISITOR_KEY) === 'friend';
  }
};
