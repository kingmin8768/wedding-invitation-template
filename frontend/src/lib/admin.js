import { adminJsonRequest } from './api';

export const fetchAdminGuestbook = (accessToken) =>
  adminJsonRequest('/api/guestbook/admin', accessToken);

export const fetchAdminRsvps = (accessToken) =>
  adminJsonRequest('/api/rsvp', accessToken);

export const updateGuestbookVisibility = (id, isHidden, accessToken) =>
  adminJsonRequest(`/api/guestbook/${id}/visibility`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ isHidden }),
  });

export const fetchAdminAssets = (accessToken, category = 'invitation') =>
  adminJsonRequest(`/api/assets/admin?category=${category}`, accessToken);

export const updateAssetVisibility = (id, isVisible, accessToken) =>
  adminJsonRequest(`/api/assets/${id}/visibility`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ isVisible }),
  });

export const approveAsset = (id, accessToken) =>
  adminJsonRequest(`/api/assets/${id}/approve`, accessToken, {
    method: 'PATCH',
  });

export const uploadAdminAsset = ({ file, title, category, accessToken }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('category', category);

  return adminJsonRequest('/api/assets/admin/upload', accessToken, {
    method: 'POST',
    body: formData,
  });
};
