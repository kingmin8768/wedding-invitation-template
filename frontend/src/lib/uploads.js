import { buildApiUrl, parseApiErrorMessage } from './api';
import { buildAuthorizationHeaders } from './sessionAuth';

export const fetchPublicSharedPhotos = async () => {
  const response = await fetch(buildApiUrl('/api/assets/shared-photos'));

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  return response.json();
};

export const fetchMySharedPhotos = async (accessToken) => {
  const response = await fetch(buildApiUrl('/api/assets/mine/shared-photos'), {
    credentials: 'include',
    headers: buildAuthorizationHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  return response.json();
};

export const uploadSharedPhoto = async ({ accessToken, file, title }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);

  const response = await fetch(buildApiUrl('/api/assets/shared-photos/upload'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthorizationHeaders(accessToken),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  return response.json();
};
