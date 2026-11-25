import {
  adminJsonRequest,
  buildApiUrl,
  parseApiErrorMessage,
} from './api';

const PUBLIC_MEDIA_CACHE_KEY = 'public-invitation-media-cache-v1';

const FALLBACK_HERO = {
  id: 'fallback-hero',
  slot: 'hero',
  publicUrl: '/images/hero-placeholder.svg',
  targetUrl: '',
  caption: '웨딩 사진',
  isVisible: true,
  displayOrder: 0,
};

const FALLBACK_COUPLE = {
  id: 'fallback-couple',
  slot: 'couple',
  publicUrl: '/images/couple-placeholder.svg',
  targetUrl: '',
  caption: '커플 사진',
  isVisible: true,
  displayOrder: 0,
};

const FALLBACK_FOOTER = {
  id: 'fallback-footer',
  slot: 'footer',
  publicUrl: '/images/footer-placeholder.svg',
  targetUrl: '',
  caption: 'Thank You',
  isVisible: true,
  displayOrder: 0,
};

const FALLBACK_GALLERY = Array.from({ length: 6 }, (_, index) => ({
  id: `fallback-gallery-${index + 1}`,
  slot: 'gallery',
  publicUrl: `/images/gallery-placeholder-${index + 1}.svg`,
  targetUrl: '',
  caption: `샘플 웨딩 사진 ${index + 1}`,
  isVisible: true,
  displayOrder: index,
}));

export const FALLBACK_PUBLIC_INVITATION_MEDIA = {
  hero: FALLBACK_HERO,
  couple: FALLBACK_COUPLE,
  gallery: FALLBACK_GALLERY,
  footer: FALLBACK_FOOTER,
};

const readPublicInvitationMediaCache = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = window.localStorage.getItem(PUBLIC_MEDIA_CACHE_KEY);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  } catch {
    return null;
  }
};

const writePublicInvitationMediaCache = (data) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(PUBLIC_MEDIA_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage failures and keep the in-memory result.
  }
};

const normalizeMediaItem = (item, slotFallback = 'gallery', index = 0) => ({
  id: item?.id ?? `${slotFallback}-${index}`,
  slot: item?.slot ?? item?.mediaSlot ?? slotFallback,
  assetId: item?.assetId ?? item?.asset?.id ?? null,
  publicUrl: item?.publicUrl ?? item?.asset?.publicUrl ?? '',
  targetUrl: item?.targetUrl ?? item?.linkUrl ?? item?.url ?? '',
  caption: item?.caption ?? item?.title ?? item?.asset?.title ?? '',
  displayOrder: Number.isFinite(Number(item?.displayOrder)) ? Number(item.displayOrder) : index,
  isVisible: item?.isVisible !== false,
  mimeType: item?.mimeType ?? item?.asset?.mimeType ?? '',
  originalName: item?.originalName ?? item?.asset?.originalName ?? '',
  storedName: item?.storedName ?? item?.asset?.storedName ?? '',
  uploaderEmail: item?.uploaderEmail ?? item?.asset?.uploaderEmail ?? '',
  raw: item ?? null,
});

const collectItems = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  if (Array.isArray(data.items)) {
    return data.items;
  }

  if (Array.isArray(data.media)) {
    return data.media;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  return [];
};

const toMediaArray = (data) => collectItems(data);

const sortGalleryItems = (items) =>
  [...items].sort((left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0));

const fillMissingSlots = (media) => ({
  hero: media.hero ?? FALLBACK_HERO,
  couple: media.couple ?? FALLBACK_COUPLE,
  gallery: media.gallery?.length ? media.gallery : FALLBACK_GALLERY,
  footer: media.footer ?? FALLBACK_FOOTER,
});

export const resolvePublicInvitationMedia = (data) => {
  const media = {
    hero: null,
    couple: null,
    gallery: [],
    footer: null,
  };

  const items = collectItems(data);

  if (items.length > 0) {
    items.forEach((item, index) => {
      const normalized = normalizeMediaItem(item, item?.slot ?? 'gallery', index);

      if (normalized.isVisible === false) {
        return;
      }

      if (normalized.slot === 'hero') {
        media.hero = normalized;
        return;
      }

      if (normalized.slot === 'couple') {
        media.couple = normalized;
        return;
      }

      if (normalized.slot === 'footer') {
        media.footer = normalized;
        return;
      }

      media.gallery.push(normalized);
    });
  }

  if (data && typeof data === 'object') {
    if (!media.hero && data.hero) {
      media.hero = normalizeMediaItem(data.hero, 'hero');
    }

    if (!media.couple && data.couple) {
      media.couple = normalizeMediaItem(data.couple, 'couple');
    }

    if (!media.footer && data.footer) {
      media.footer = normalizeMediaItem(data.footer, 'footer');
    }

    if (media.gallery.length === 0) {
      if (Array.isArray(data.gallery)) {
        media.gallery = data.gallery
          .filter((item) => item?.isVisible !== false)
          .map((item, index) => normalizeMediaItem(item, 'gallery', index));
      } else if (Array.isArray(data.galleryItems)) {
        media.gallery = data.galleryItems
          .filter((item) => item?.isVisible !== false)
          .map((item, index) => normalizeMediaItem(item, 'gallery', index));
      }
    }
  }

  media.gallery = sortGalleryItems(media.gallery);

  return fillMissingSlots(media);
};

export const fetchPublicInvitationMedia = async () => {
  const response = await fetch(buildApiUrl('/api/invitation-media/public'));

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  const data = await response.json();
  writePublicInvitationMediaCache(data);
  return resolvePublicInvitationMedia(data);
};

export const getInitialPublicInvitationMedia = () => {
  const cached = readPublicInvitationMediaCache();

  if (!cached) {
    return FALLBACK_PUBLIC_INVITATION_MEDIA;
  }

  return resolvePublicInvitationMedia(cached);
};

const buildMediaFormData = ({
  file,
  slot,
  caption,
  targetUrl,
  displayOrder,
  isVisible,
  replaceExisting,
}) => {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }

  formData.append('slot', slot);
  formData.append('title', caption || '');
  formData.append('caption', caption || '');
  formData.append('targetUrl', targetUrl || '');
  formData.append('linkUrl', targetUrl || '');
  formData.append('displayOrder', String(displayOrder ?? 0));
  formData.append('isVisible', String(isVisible));

  if (replaceExisting) {
    formData.append('replaceExisting', 'true');
  }

  return formData;
};

export const fetchAdminInvitationMedia = (accessToken, slot) => {
  const query = slot ? `?slot=${encodeURIComponent(slot)}` : '';
  return adminJsonRequest(`/api/invitation-media/admin${query}`, accessToken).then((data) =>
    toMediaArray(data).map((item, index) => normalizeMediaItem(item, item?.slot ?? 'gallery', index)),
  );
};

export const createInvitationMedia = async ({
  accessToken,
  file,
  slot,
  caption,
  targetUrl,
  displayOrder = 0,
  isVisible = true,
  replaceExisting = false,
}) => {
  return adminJsonRequest('/api/invitation-media/admin/assign', accessToken, {
    method: 'POST',
    body: buildMediaFormData({
      file,
      slot,
      caption,
      targetUrl,
      displayOrder,
      isVisible,
      replaceExisting,
    }),
  });
};

export const updateInvitationMedia = async ({
  accessToken,
  id,
  caption,
  targetUrl,
  displayOrder,
  isVisible,
}) =>
  adminJsonRequest(`/api/invitation-media/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({
      caption,
      targetUrl,
      linkUrl: targetUrl,
      displayOrder,
      isVisible,
    }),
  });

export const updateInvitationMediaOrder = async ({ accessToken, id, displayOrder }) =>
  adminJsonRequest(`/api/invitation-media/${id}/order`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ displayOrder }),
  });

export const updateInvitationMediaVisibility = async ({ accessToken, id, isVisible }) =>
  adminJsonRequest(`/api/invitation-media/${id}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ isVisible }),
  });

export const deleteInvitationMedia = async ({ accessToken, id }) =>
  adminJsonRequest(`/api/invitation-media/${id}`, accessToken, {
    method: 'DELETE',
  });
