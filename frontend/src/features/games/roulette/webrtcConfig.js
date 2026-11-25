const DEFAULT_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const parseIceServerList = (value) => {
  if (!value?.trim()) {
    return DEFAULT_ICE_SERVERS;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
};

export const WEBRTC_ICE_SERVERS = parseIceServerList(
  import.meta.env.VITE_WEBRTC_ICE_SERVERS,
);
