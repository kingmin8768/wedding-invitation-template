import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { approveAsset, fetchAdminAssets, updateAssetVisibility } from '../../lib/admin';

const SharedPhotoAdminPanel = ({ accessToken }) => {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setError('');
        const data = await fetchAdminAssets(accessToken, 'shared-photo');
        setPhotos(data);
      } catch (loadError) {
        setError(loadError.message);
      }
    };

    loadPhotos();
  }, [accessToken]);

  const reload = async () => {
    const data = await fetchAdminAssets(accessToken, 'shared-photo');
    setPhotos(data);
  };

  const handleApprove = async (photoId) => {
    try {
      await approveAsset(photoId, accessToken);
      await reload();
    } catch (approveError) {
      setError(approveError.message);
    }
  };

  const handleVisibility = async (photo) => {
    try {
      await updateAssetVisibility(photo.id, !photo.isVisible, accessToken);
      await reload();
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="admin-panel-stack">
      {error && <p className="admin-shell__error">{error}</p>}
      {photos.map((photo) => (
        <article key={photo.id} className="admin-list-card">
          <div className="admin-list-card__top">
            <div>
              <strong>{photo.title || photo.originalName}</strong>
              <span>{photo.uploaderEmail || '회원'}</span>
            </div>
            <div className="admin-list-card__actions">
              {photo.moderationStatus === 'pending' && (
                <button type="button" onClick={() => handleApprove(photo.id)}>
                  승인
                </button>
              )}
              <button type="button" onClick={() => handleVisibility(photo)}>
                {photo.isVisible ? '숨김' : '복원'}
              </button>
            </div>
          </div>
          <p>{photo.originalName}</p>
          <small>
            {photo.moderationStatus === 'pending'
              ? '승인 대기 중'
              : photo.isVisible
                ? '공개 노출 중'
                : '관리자 숨김 상태'}
          </small>
        </article>
      ))}
      {photos.length === 0 && <p className="admin-shell__empty">대기 중인 공유 사진이 없습니다.</p>}
    </div>
  );
};

SharedPhotoAdminPanel.propTypes = {
  accessToken: PropTypes.string.isRequired,
};

export default SharedPhotoAdminPanel;
