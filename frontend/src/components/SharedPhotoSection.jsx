import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { IMAGE_UPLOAD_HINT, optimizeImageForUpload } from '../lib/imageUpload';
import { fetchMySharedPhotos, fetchPublicSharedPhotos, uploadSharedPhoto } from '../lib/uploads';

const STATUS_LABEL = {
  approved: '공개 중',
  pending: '승인 대기',
};

const SharedPhotoSection = ({ onUploadSuccess }) => {
  const { isAuthenticated, tokens } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [myUploads, setMyUploads] = useState([]);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadPublicPhotos = async () => {
      try {
        const data = await fetchPublicSharedPhotos();
        setPhotos(data);
      } catch {
        setPhotos([]);
      }
    };

    loadPublicPhotos();
  }, []);

  useEffect(() => {
    const loadMyUploads = async () => {
      if (!tokens?.accessToken) {
        setMyUploads([]);
        return;
      }

      try {
        const data = await fetchMySharedPhotos(tokens.accessToken);
        setMyUploads(data);
      } catch {
        setMyUploads([]);
      }
    };

    loadMyUploads();
  }, [tokens?.accessToken]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file || !tokens?.accessToken) {
      setError('업로드할 사진을 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const optimizedFile = await optimizeImageForUpload(file);
      await uploadSharedPhoto({
        accessToken: tokens.accessToken,
        file: optimizedFile,
        title,
      });
      setTitle('');
      setFile(null);
      event.target.reset();
      const [updatedMyUploads, updatedPublicPhotos] = await Promise.all([
        fetchMySharedPhotos(tokens.accessToken),
        fetchPublicSharedPhotos(),
      ]);
      setMyUploads(updatedMyUploads);
      setPhotos(updatedPublicPhotos);
      onUploadSuccess?.({
        title,
      });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="shared-photo-section" data-aos="fade-up">
      <h3 className="section-title">함께 남겨주신 사진</h3>
      <p className="shared-photo-intro">
        하객분들이 남겨주신 사진은 관리자 확인 후 공개 갤러리에 반영됩니다.
      </p>

      {photos.length > 0 && (
        <div className="shared-photo-grid">
          {photos.map((photo) => (
            <img key={photo.id} src={photo.publicUrl} alt={photo.title || photo.originalName} />
          ))}
        </div>
      )}

      {isAuthenticated ? (
        <form className="shared-photo-form" onSubmit={handleSubmit}>
          <label>
            <span>사진 설명</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예식장 입구에서 찍은 사진"
            />
          </label>

          <label>
            <span>사진 파일</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <small className="admin-shell__summary-note">{IMAGE_UPLOAD_HINT}</small>
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '업로드 중...' : '사진 공유하기'}
          </button>

          {error && <p className="shared-photo-feedback shared-photo-feedback--error">{error}</p>}

          {myUploads.length > 0 && (
            <div className="shared-photo-status-list">
              {myUploads.map((upload) => (
                <div key={upload.id} className="shared-photo-status-item">
                  <span>{upload.title || upload.originalName}</span>
                  <strong>{STATUS_LABEL[upload.moderationStatus] || '숨김'}</strong>
                </div>
              ))}
            </div>
          )}
        </form>
      ) : (
        <p className="shared-photo-login-note">
          사진 공유는{' '}
          <Link
            to="/login"
            data-analytics-track="click"
            data-analytics-section="shared-photos"
            data-analytics-label="로그인"
          >
            로그인
          </Link>
          {' '}
          후 이용할 수 있습니다.
        </p>
      )}
    </div>
  );
};

SharedPhotoSection.propTypes = {
  onUploadSuccess: PropTypes.func,
};

SharedPhotoSection.defaultProps = {
  onUploadSuccess: undefined,
};

export default SharedPhotoSection;
