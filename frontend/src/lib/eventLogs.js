import {
  adminBlobRequest,
  adminJsonRequest,
  buildApiUrl,
  isAuthorizationError,
  isSessionExpiredError,
  parseApiErrorMessage,
} from './api.js';
import { buildAuthorizationHeaders } from './sessionAuth.js';
import { getVisitorName } from './visitorSession.js';
const SESSION_STORAGE_KEY = 'weddingInvitationEventSessionId';
const LOCAL_EVENT_LOG_KEY = 'weddingInvitationEventLogs';

const readLocalEventLogs = () => {
  try {
    const stored = window.localStorage.getItem(LOCAL_EVENT_LOG_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalEventLogs = (events) => {
  window.localStorage.setItem(LOCAL_EVENT_LOG_KEY, JSON.stringify(events.slice(0, 1000)));
};

const normalizeLocalEvent = (payload = {}) => ({
  id:
    payload.id ||
    (typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `event-${Date.now()}-${Math.random().toString(36).slice(2)}`),
  eventType: payload.eventType || 'click',
  section: payload.section || null,
  action: payload.action || null,
  label: payload.label || null,
  path: payload.path || window.location.pathname,
  url: payload.url || window.location.href,
  referrer: payload.referrer || document.referrer || null,
  sessionId: payload.sessionId || getEventSessionId(),
  userName: payload.userName || getVisitorName() || null,
  metadata: payload.metadata || null,
  createdAt: payload.createdAt || new Date().toISOString(),
});

const storeLocalEvent = (payload) => {
  const nextEvent = normalizeLocalEvent(payload);
  const current = readLocalEventLogs();
  current.unshift(nextEvent);
  writeLocalEventLogs(current);
  return nextEvent;
};

const filterLocalEvents = (events, filters = {}) => {
  const eventType = filters.eventType || '';
  const section = filters.section || '';
  const action = filters.action || '';
  const search = (filters.search || '').trim().toLowerCase();
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;

  return events.filter((event) => {
    const eventDate = new Date(event.createdAt);
    if (Number.isNaN(eventDate.getTime())) {
      return false;
    }

    if (eventType && event.eventType !== eventType) {
      return false;
    }

    if (section && event.section !== section) {
      return false;
    }

    if (action && event.action !== action) {
      return false;
    }

    if (from && eventDate < from) {
      return false;
    }

    if (to && eventDate > to) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = [
      event.eventType,
      event.section,
      event.action,
      event.label,
      event.path,
      event.url,
      event.sessionId,
      event.userName,
      JSON.stringify(event.metadata || {}),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  });
};

const paginateEvents = (events, filters = {}) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.max(1, Number(filters.pageSize) || 20);
  const total = events.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: events.slice(start, start + pageSize),
    meta: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
  };
};

const buildLocalAdminResponse = (filters = {}) => {
  const filtered = filterLocalEvents(readLocalEventLogs(), filters);
  return paginateEvents(filtered, filters);
};

export const getEventSessionId = () => {
  const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId =
    typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
};

export const trackInvitationEvent = async (
  payload,
  { accessToken } = {},
) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const requestBody = {
    eventType: payload.eventType,
    section: payload.section || null,
    action: payload.action || null,
    label: payload.label || null,
    path: payload.path || window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || null,
    sessionId: getEventSessionId(),
    userName: payload.userName || getVisitorName() || null,
    metadata: payload.metadata || null,
  };

  storeLocalEvent(requestBody);

  const response = await fetch(buildApiUrl('/api/event-logs'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthorizationHeaders(accessToken),
    },
    body: JSON.stringify(requestBody),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  return response.json();
};

const buildAdminQuery = (filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

export const fetchAdminEventLogs = async (accessToken, filters = {}) => {
  try {
    return await adminJsonRequest(
      `/api/admin/event-logs${buildAdminQuery(filters)}`,
      accessToken,
    );
  } catch (error) {
    if (isSessionExpiredError(error) || isAuthorizationError(error)) {
      throw error;
    }

    return buildLocalAdminResponse(filters);
  }
};

export const downloadAdminEventLogsCsv = async (accessToken, filters = {}) => {
  try {
    const blob = await adminBlobRequest(
      `/api/admin/event-logs/export${buildAdminQuery(filters)}`,
      accessToken,
    );
    const fileUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = 'wedding-invitation-event-logs.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(fileUrl);
  } catch (error) {
    if (isSessionExpiredError(error) || isAuthorizationError(error)) {
      throw error;
    }

    const localResponse = buildLocalAdminResponse(filters);
    const header = ['createdAt', 'eventType', 'section', 'action', 'label', 'path', 'url', 'sessionId', 'userName', 'metadata'];
    const escapeCsvCell = (value) => {
      let normalized = String(value ?? '');
      if (/^[=+\-@]/.test(normalized) || /^[\t\r]/.test(normalized)) {
        normalized = `'${normalized}`;
      }

      return `"${normalized.replaceAll('"', '""')}"`;
    };
    const csv = [
      header.join(','),
      ...localResponse.items.map((item) =>
        header
          .map((key) => {
            const value = key === 'metadata' ? JSON.stringify(item[key] || {}) : String(item[key] ?? '');
            return escapeCsvCell(value);
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fileUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = 'wedding-invitation-event-logs.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(fileUrl);
  }
};
