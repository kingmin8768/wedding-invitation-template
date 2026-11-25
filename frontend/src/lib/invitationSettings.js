import { INVITATION_CONFIG } from '../config/invitationConfig.js';
import { adminJsonRequest, buildApiUrl, parseApiErrorMessage } from './api.js';

const PUBLIC_SETTINGS_CACHE_KEY = 'public-invitation-settings-cache-v1';

const cloneConfig = (config) => JSON.parse(JSON.stringify(config));

const readString = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const readOptionalString = (value, fallback) =>
  typeof value === 'string' ? value.trim() : fallback;

const readNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const readStringArray = (value, fallback) => {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const readAccountsArray = (value, fallback) => {
  if (!Array.isArray(value)) {
    return fallback.map((item) => ({ ...item }));
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      bank: typeof item.bank === 'string' ? item.bank.trim() : '',
      number: typeof item.number === 'string' ? item.number.trim() : '',
      name: typeof item.name === 'string' ? item.name.trim() : '',
    }))
    .filter((item) => item.bank || item.number || item.name);
};

export const mergeInvitationConfig = (remote) => {
  const base = cloneConfig(INVITATION_CONFIG);
  const source = remote && typeof remote === 'object' ? remote : {};

  return {
    couple: {
      groom: {
        fullName: readString(source.couple?.groom?.fullName, base.couple.groom.fullName),
        firstName: readString(source.couple?.groom?.firstName, base.couple.groom.firstName),
      },
      bride: {
        fullName: readString(source.couple?.bride?.fullName, base.couple.bride.fullName),
        firstName: readString(source.couple?.bride?.firstName, base.couple.bride.firstName),
      },
    },
    parents: {
      groom: {
        father: readString(source.parents?.groom?.father, base.parents.groom.father),
        mother: readString(source.parents?.groom?.mother, base.parents.groom.mother),
        relation: readString(source.parents?.groom?.relation, base.parents.groom.relation),
      },
      bride: {
        father: readString(source.parents?.bride?.father, base.parents.bride.father),
        mother: readString(source.parents?.bride?.mother, base.parents.bride.mother),
        relation: readString(source.parents?.bride?.relation, base.parents.bride.relation),
      },
    },
    wedding: {
      year: Math.round(readNumber(source.wedding?.year, base.wedding.year)),
      month: Math.round(readNumber(source.wedding?.month, base.wedding.month)),
      day: Math.round(readNumber(source.wedding?.day, base.wedding.day)),
      hour: Math.round(readNumber(source.wedding?.hour, base.wedding.hour)),
      minute: Math.round(readNumber(source.wedding?.minute, base.wedding.minute)),
      displayDate: readString(source.wedding?.displayDate, base.wedding.displayDate),
      monthLabel: readString(source.wedding?.monthLabel, base.wedding.monthLabel),
    },
    venue: {
      name: readString(source.venue?.name, base.venue.name),
      floor: readString(source.venue?.floor, base.venue.floor),
      address: readString(source.venue?.address, base.venue.address),
      lat: readNumber(source.venue?.lat, base.venue.lat),
      lng: readNumber(source.venue?.lng, base.venue.lng),
    },
    afterParty: {
      enabled:
        typeof source.afterParty?.enabled === 'boolean'
          ? source.afterParty.enabled
          : base.afterParty.enabled,
      timeText: readOptionalString(source.afterParty?.timeText, base.afterParty.timeText),
      address: readOptionalString(source.afterParty?.address, base.afterParty.address),
      postscript: readOptionalString(source.afterParty?.postscript, base.afterParty.postscript),
    },
    accounts: {
      groom: readAccountsArray(source.accounts?.groom, base.accounts.groom),
      bride: readAccountsArray(source.accounts?.bride, base.accounts.bride),
    },
    transport: {
      subway: readOptionalString(source.transport?.subway, base.transport.subway),
      buses: readStringArray(source.transport?.buses, base.transport.buses),
      shuttleBus: {
        enabled:
          typeof source.transport?.shuttleBus?.enabled === 'boolean'
            ? source.transport.shuttleBus.enabled
            : base.transport.shuttleBus.enabled,
        intro: readStringArray(
          source.transport?.shuttleBus?.intro,
          base.transport.shuttleBus.intro,
        ),
        schedules: readStringArray(
          source.transport?.shuttleBus?.schedules,
          base.transport.shuttleBus.schedules,
        ),
      },
      parking: readOptionalString(source.transport?.parking, base.transport.parking),
      wreathNotice: readStringArray(
        source.transport?.wreathNotice,
        base.transport.wreathNotice,
      ),
    },
    share: {
      title: readString(source.share?.title, base.share.title),
      text: readString(source.share?.text, base.share.text),
    },
  };
};

const writeCache = (config) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PUBLIC_SETTINGS_CACHE_KEY, JSON.stringify(config));
  } catch {
    // Ignore localStorage quota/privacy errors.
  }
};

export const getInitialInvitationConfig = () => {
  if (typeof window === 'undefined') {
    return mergeInvitationConfig(null);
  }

  try {
    const raw = window.localStorage.getItem(PUBLIC_SETTINGS_CACHE_KEY);
    if (!raw) {
      return mergeInvitationConfig(null);
    }

    return mergeInvitationConfig(JSON.parse(raw));
  } catch {
    return mergeInvitationConfig(null);
  }
};

export const fetchPublicInvitationSettings = async () => {
  const response = await fetch(buildApiUrl('/api/invitation-settings/public'));
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  const data = await response.json();
  const merged = mergeInvitationConfig(data);
  writeCache(merged);
  return merged;
};

export const fetchAdminInvitationSettings = async (accessToken) => {
  const data = await adminJsonRequest('/api/invitation-settings/admin', accessToken);
  return mergeInvitationConfig(data);
};

export const saveAdminInvitationSettings = async (accessToken, settings) => {
  const data = await adminJsonRequest('/api/invitation-settings/admin', accessToken, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  const merged = mergeInvitationConfig(data);
  writeCache(merged);
  return merged;
};

export const resetAdminInvitationSettings = async (accessToken) => {
  const data = await adminJsonRequest('/api/invitation-settings/admin/reset', accessToken, {
    method: 'POST',
  });
  const merged = mergeInvitationConfig(data);
  writeCache(merged);
  return merged;
};
